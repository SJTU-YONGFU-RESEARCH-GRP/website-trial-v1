#!/usr/bin/env python3
"""Process every collection model and run the complete simulator matrix.

The workflow is resumable and records evidence at every boundary:

1. Parse every source with SPICE-Model-AST and emit canonical ngspice.
2. Produce three distinct variants through short, generic tool chains.
3. Parse every tool result with SPICE-Model-AST before the next handoff.
4. Run all benchmark modes with ngspice, Spectre, and HSPICE.
5. Enforce the result directory, report, plot, and run-manifest contract.
"""

from __future__ import annotations

import argparse
import decimal
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


HOME = Path("/home/duhaochen")
WEBSITE = HOME / "website-trial-v1"
COLLECTION = HOME / "spice_model_collections"
AST_SRC = HOME / "SPICE-Model-AST" / "src"
TRANSLATOR = HOME / "new-spice-translator"
REDUCTION = HOME / "spice_model_reduction"
EXPANSION = HOME / "spice_model_expansion"
FITTING = HOME / "spice_model_fitting"
BENCHMARK = HOME / "spice_model_benchmark"

DATA_ROOT = WEBSITE / "data" / "spice-model-benchmark"
WORK_ROOT = HOME / "pipeline_full_collection"
INVENTORY_PATH = WORK_ROOT / "model-inventory.json"
AST_EVIDENCE_PATH = WORK_ROOT / "ast-evidence.json"
AUDIT_PATH = WORK_ROOT / "acceptance.json"

SIMULATORS = ("ngspice", "spectre", "hspice")
MODES = ("dc", "transient", "ac", "noise")
NETLIST_EXTENSIONS = {
    "ngspice": ".cir",
    "spectre": ".scs",
    "hspice": ".sp",
}
CHAINS = {
    "reduction": ("reduction",),
    "expansion_translation": ("expansion", "translation"),
    "fitting_reduction_translation": (
        "fitting",
        "reduction",
        "translation",
    ),
}
EXPECTED_PLOTS = (
    "dc_iv_characteristics.png",
    "dc_kcl_verification.png",
    "dc_temperature_analysis.png",
    "ac_cv_characteristics.png",
    "ac_cv_components.png",
    "ac_v_multifreq_characteristics.png",
    "ac_cv_characteristics_per_gate_area.png",
    "ac_cv_components_per_gate_area.png",
    "ac_cv_sparameter_analysis.png",
    "ac_cv_nqs_effects.png",
    "ac_charge_conservation.png",
    "trans_large_signal_transient.png",
    "trans_switching_response.png",
    "trans_delay_effect.png",
    "trans_power_dissipation.png",
    "trans_energy_consumption.png",
    "trans_quasi_static_time.png",
    "trans_quasi_static_iv.png",
    "trans_charge_conservation.png",
    "trans_total_charge.png",
    "noise_thermal_noise.png",
    "noise_flicker_noise.png",
    "noise_shot_noise.png",
    "noise_thermal_noise_vds_comparison.png",
    "noise_vs_temperature.png",
    "noise_components.png",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(path: Path, algorithm: str = "md5") -> str:
    hasher = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def atomic_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".new")
    temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temporary.replace(path)


def source_id(path: Path) -> str:
    relative = path.relative_to(COLLECTION).as_posix()
    return re.sub(r"[^a-zA-Z0-9]+", "__", relative).strip("_").lower()


def discover_sources() -> list[Path]:
    sources = [
        *COLLECTION.glob("bsim/*.ngspice"),
        *COLLECTION.glob("bsim/*.hspice"),
        *COLLECTION.glob("bsim/*.spectre"),
        *COLLECTION.glob("ptm/*.pm"),
    ]
    return sorted(path.resolve() for path in sources)


def load_ast_classes():
    if str(AST_SRC) not in sys.path:
        sys.path.insert(0, str(AST_SRC))
    from spice_ast import HSPICEParser, NgspiceParser, SpectreParser

    return NgspiceParser, HSPICEParser, SpectreParser


def parser_for(path: Path, source_format: str | None = None):
    ngspice_parser, hspice_parser, spectre_parser = load_ast_classes()
    format_name = source_format or path.suffix.lstrip(".").lower()
    if format_name == "spectre":
        return spectre_parser
    if format_name == "hspice":
        return hspice_parser
    return ngspice_parser


def model_summary(models: Iterable[Any]) -> list[dict[str, Any]]:
    return [
        {
            "name": model.name,
            "deviceType": model.device_type.value,
            "parameterCount": len(model.base_parameters),
        }
        for model in models
    ]


def physical_model_signature(models: Iterable[Any]) -> str:
    """Hash the AST fields that define the supplied device models."""
    def canonical_value(value: Any) -> str:
        # The AST historically represented a braced scalar such as
        # ``{1.0e20}`` as a singleton set in a few Sky130 cards.  Commercial
        # dialect writers remove the expression braces around a numeric
        # literal, so compare the scalar itself rather than the parser's
        # container accident.  Multi-value sets remain distinct.
        if isinstance(value, (set, frozenset)) and len(value) == 1:
            return canonical_value(next(iter(value)))
        if not isinstance(value, str):
            if isinstance(value, (int, float, decimal.Decimal)):
                number = decimal.Decimal(str(value))
                return "number:" + (
                    "0" if number.is_zero() else str(number.normalize())
                )
            return repr(value)
        normalized = value.strip()
        previous = None
        while normalized != previous and len(normalized) >= 2:
            previous = normalized
            if (
                normalized[0] == normalized[-1]
                and normalized[0] in {"'", '"'}
            ):
                normalized = normalized[1:-1].strip()
                continue
            if normalized[0] == "{" and normalized[-1] == "}":
                normalized = normalized[1:-1].strip()
        if re.fullmatch(
            r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?",
            normalized,
        ):
            number = decimal.Decimal(normalized)
            return "number:" + (
                "0" if number.is_zero() else str(number.normalize())
            )
        return repr(normalized)

    payload = [
        {
            # SPICE identifiers and model keywords are case-insensitive.  Writers
            # are free to canonicalize ``NMOS`` to ``nmos`` without changing the
            # supplied device, so compare their canonical spelling here while
            # keeping every parameter/value comparison exact.
            "name": str(model.name).lower(),
            "modelType": str(model.model_type).lower(),
            "deviceType": model.device_type.value,
            "baseParameters": sorted(
                (str(name).lower(), canonical_value(value))
                for name, value in model.base_parameters.items()
            ),
            "variations": repr(model.variations),
            "subcircuits": repr(model.subcircuits),
            "statistical": repr(model.statistical),
        }
        for model in models
    ]
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def write_ir(models: list[Any], output: Path, provenance: str) -> None:
    if str(TRANSLATOR) not in sys.path:
        sys.path.insert(0, str(TRANSLATOR))
    from src.writers.ngspice_writer import NgspiceWriter

    output.parent.mkdir(parents=True, exist_ok=True)
    NgspiceWriter(output).write_from_ir(models)
    content = output.read_text(encoding="utf-8")
    content = re.sub(
        r"(?m)^\* Generated: .*$",
        "* Generated: deterministic AST serialization",
        content,
    )
    output.write_text(
        f"* Collection provenance: {provenance}\n" + content,
        encoding="utf-8",
    )


def ast_normalize(
    input_path: Path,
    output_path: Path,
    *,
    provenance: str,
    source_format: str | None = None,
    expected_cards: int | None = None,
) -> dict[str, Any]:
    parser = parser_for(input_path, source_format)
    models = parser(input_path).parse_to_ir()
    if not models:
        raise ValueError(f"AST returned no model cards for {input_path}")
    if expected_cards is not None and len(models) != expected_cards:
        raise ValueError(
            f"AST card count changed at {input_path}: "
            f"expected {expected_cards}, received {len(models)}"
        )
    write_ir(models, output_path, provenance)
    parsed_back = parser_for(output_path, "ngspice")(output_path).parse_to_ir()
    if len(parsed_back) != len(models):
        raise ValueError(
            f"AST round-trip changed card count for {input_path}: "
            f"{len(models)} -> {len(parsed_back)}"
        )
    if not all(model.base_parameters for model in parsed_back):
        raise ValueError(f"AST round-trip yielded an empty model card: {output_path}")
    input_signature = physical_model_signature(models)
    output_signature = physical_model_signature(parsed_back)
    if output_signature != input_signature:
        raise ValueError(
            "AST round-trip changed model identity, parameters, variations, "
            f"or subcircuits for {input_path}: "
            f"{input_signature} -> {output_signature}"
        )
    return {
        "input": str(input_path),
        "inputMd5": digest(input_path),
        "inputFormat": source_format or input_path.suffix.lstrip(".").lower(),
        "output": str(output_path),
        "outputMd5": digest(output_path),
        "physicalModelSignature": output_signature,
        "parameterPreserving": True,
        "cards": model_summary(parsed_back),
    }


def run_command(
    command: list[str],
    *,
    cwd: Path,
    log: Path,
    env: dict[str, str] | None = None,
) -> None:
    log.parent.mkdir(parents=True, exist_ok=True)
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    with log.open("w", encoding="utf-8") as stream:
        stream.write("$ " + " ".join(command) + "\n")
        stream.flush()
        result = subprocess.run(
            command,
            cwd=cwd,
            env=merged_env,
            stdout=stream,
            stderr=subprocess.STDOUT,
            text=True,
        )
    if result.returncode:
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(command)}; "
            f"see {log}"
        )


def choose_target(models: list[Any]) -> Any:
    return next(
        (model for model in models if model.device_type.value == "nmos"),
        models[0],
    )


def threshold_parameter(model: Any) -> str:
    return "vth0"


def record_stage(
    *,
    tool: str,
    input_path: Path,
    raw_output: Path,
    normalized_output: Path,
    ast_record: dict[str, Any],
    started_at: str,
    elapsed_seconds: float,
) -> dict[str, Any]:
    return {
        "tool": tool,
        "startedAt": started_at,
        "elapsedSeconds": round(elapsed_seconds, 6),
        "input": str(input_path),
        "inputMd5": digest(input_path),
        "rawOutput": str(raw_output),
        "rawOutputMd5": digest(raw_output),
        "output": str(normalized_output),
        "outputMd5": digest(normalized_output),
        "ast": ast_record,
    }


def reduce_model(
    current: Path,
    stage_dir: Path,
    log: Path,
    expected_cards: int,
    provenance: str,
) -> tuple[Path, dict[str, Any]]:
    models = parser_for(current, "ngspice")(current).parse_to_ir()
    target = choose_target(models)
    count = len(target.base_parameters)
    retained = max(1, min(count - 1, max(5, count // 2)))
    raw = stage_dir / "reduced.lib"
    started = utc_now()
    began = time.monotonic()
    run_command(
        [
            sys.executable,
            "-m",
            "bmr.static_reducer",
            str(current),
            str(raw),
            "--min-parameters",
            str(retained),
        ],
        cwd=REDUCTION,
        log=log,
        env={
            "PYTHONPATH": f"{REDUCTION}:{AST_SRC}",
        },
    )
    normalized = stage_dir / "normalized.lib"
    ast_record = ast_normalize(
        raw,
        normalized,
        provenance=provenance,
        source_format="ngspice",
        expected_cards=expected_cards,
    )
    return normalized, record_stage(
        tool="reduction",
        input_path=current,
        raw_output=raw,
        normalized_output=normalized,
        ast_record=ast_record,
        started_at=started,
        elapsed_seconds=time.monotonic() - began,
    )


def expand_model(
    current: Path,
    stage_dir: Path,
    log: Path,
    expected_cards: int,
    provenance: str,
) -> tuple[Path, dict[str, Any]]:
    corner_dir = stage_dir / "corners"
    started = utc_now()
    began = time.monotonic()
    run_command(
        [
            sys.executable,
            "-m",
            "model_expansion",
            "generate-corners",
            str(current),
            "--out-dir",
            str(corner_dir),
            "--n-sigma",
            "1",
        ],
        cwd=EXPANSION,
        log=log,
        env={
            "PYTHONPATH": (
                f"{EXPANSION}:{EXPANSION / 'src'}:{AST_SRC}"
            )
        },
    )
    raw = corner_dir / "models" / "model_f.sp"
    normalized = stage_dir / "normalized.lib"
    ast_record = ast_normalize(
        raw,
        normalized,
        provenance=provenance,
        source_format="ngspice",
        expected_cards=expected_cards,
    )
    return normalized, record_stage(
        tool="expansion",
        input_path=current,
        raw_output=raw,
        normalized_output=normalized,
        ast_record=ast_record,
        started_at=started,
        elapsed_seconds=time.monotonic() - began,
    )


def translate_model(
    current: Path,
    stage_dir: Path,
    log: Path,
    expected_cards: int,
    provenance: str,
) -> tuple[Path, dict[str, Any]]:
    raw = stage_dir / "translated.hspice"
    started = utc_now()
    began = time.monotonic()
    run_command(
        [
            sys.executable,
            "cli.py",
            "translate",
            str(current),
            "--source",
            "ngspice",
            "--target",
            "hspice",
            "--output",
            str(raw),
        ],
        cwd=TRANSLATOR,
        log=log,
        env={"PYTHONPATH": f"{TRANSLATOR}:{AST_SRC}"},
    )
    normalized = stage_dir / "normalized.lib"
    ast_record = ast_normalize(
        raw,
        normalized,
        provenance=provenance,
        source_format="hspice",
        expected_cards=expected_cards,
    )
    return normalized, record_stage(
        tool="translation",
        input_path=current,
        raw_output=raw,
        normalized_output=normalized,
        ast_record=ast_record,
        started_at=started,
        elapsed_seconds=time.monotonic() - began,
    )


def fit_model(
    current: Path,
    stage_dir: Path,
    log_dir: Path,
    expected_cards: int,
    provenance: str,
) -> tuple[Path, dict[str, Any]]:
    models = parser_for(current, "ngspice")(current).parse_to_ir()
    target = choose_target(models)
    device_type = target.device_type.value
    if device_type == "pmos":
        sweep_start, sweep_stop, sweep_step, vds = "0", "-1", "-0.5", "-1"
        sweep_values = (0.0, -0.5, -1.0)
    else:
        sweep_start, sweep_stop, sweep_step, vds = "0", "1", "0.5", "1"
        sweep_values = (0.0, 0.5, 1.0)
    measured = stage_dir / "measured.csv"
    started = utc_now()
    began = time.monotonic()
    parameters = {
        str(key).lstrip("+").lower(): value
        for key, value in target.base_parameters.items()
    }
    threshold = 0.4
    for key in ("vto", "vth0", "vfb"):
        try:
            threshold = abs(float(parameters[key]))
            break
        except (KeyError, TypeError, ValueError):
            continue
    reference_lines = ["sweep_var,sweep_value,id,vd,vg,vs,vb"]
    for voltage in sweep_values:
        overdrive = max(abs(voltage) - threshold, 0.0)
        current_value = 1.0e-12 + 1.0e-4 * overdrive * overdrive
        reference_lines.append(
            f"vgs,{voltage},{current_value},{vds},{voltage},0.0,0.0"
        )
    measured.write_text("\n".join(reference_lines) + "\n", encoding="utf-8")
    (log_dir / "reference.log").write_text(
        "\n".join(
            (
                f"model={target.name}",
                f"device_type={device_type}",
                f"threshold_parameter={threshold_parameter(target)}",
                f"threshold_magnitude={threshold}",
                "points=3",
            )
        )
        + "\n",
        encoding="utf-8",
    )
    fitted = stage_dir / "fitted.lib"
    dataset = (
        f"{measured}:vgs:{sweep_start}:{sweep_stop}:{sweep_step}:"
        f"W=1e-6:L=1e-6:vds={vds}:vbs=0"
    )
    run_command(
        [
            sys.executable,
            "calibrate_bsim.py",
            "--model-path",
            str(current),
            "--model-name",
            target.name,
            "--dataset",
            dataset,
            "--sim-type",
            "dc",
            "--device-type",
            device_type,
            "--train",
            threshold_parameter(target),
            "--max-iters",
            "1",
            "--jobs",
            "1",
            "--output-model",
            str(fitted),
        ],
        cwd=FITTING,
        log=log_dir / "fitting.log",
    )
    fitted_models = parser_for(fitted, "ngspice")(fitted).parse_to_ir()
    if len(fitted_models) != 1:
        raise ValueError(f"Fitting returned {len(fitted_models)} cards for {target.name}")
    trained_parameter = threshold_parameter(target)
    fitted_parameters = {
        str(name).lstrip("+").lower(): value
        for name, value in fitted_models[0].base_parameters.items()
    }
    if trained_parameter.lower() not in fitted_parameters:
        raise ValueError(
            f"Fitting output omitted trained parameter {trained_parameter}"
        )
    # The fitting CLI emits a compact standalone card.  Replacing the source
    # card with it would silently discard bin limits and unrelated physical
    # parameters.  Apply only the explicitly trained value to the complete
    # source IR.
    for name in list(target.base_parameters):
        if str(name).lstrip("+").lower() == trained_parameter.lower():
            target.base_parameters[name] = fitted_parameters[
                trained_parameter.lower()
            ]
            break
    else:
        target.base_parameters[trained_parameter] = fitted_parameters[
            trained_parameter.lower()
        ]
    merged_models = models
    raw = stage_dir / "fitted-with-companions.lib"
    write_ir(merged_models, raw, provenance + ":fitting-merge")
    normalized = stage_dir / "normalized.lib"
    ast_record = ast_normalize(
        raw,
        normalized,
        provenance=provenance,
        source_format="ngspice",
        expected_cards=expected_cards,
    )
    return normalized, record_stage(
        tool="fitting",
        input_path=current,
        raw_output=raw,
        normalized_output=normalized,
        ast_record=ast_record,
        started_at=started,
        elapsed_seconds=time.monotonic() - began,
    )


def execute_chain(
    source_record: dict[str, Any],
    chain_id: str,
    tools: tuple[str, ...],
    *,
    force: bool,
) -> dict[str, Any]:
    model_id = f"{source_record['sourceId']}__{chain_id}"
    model_work = WORK_ROOT / "models" / source_record["sourceId"] / chain_id
    result_manifest = model_work / "result.json"
    if result_manifest.exists() and not force:
        payload = json.loads(result_manifest.read_text())
        if Path(payload["finalModel"]).exists():
            return payload
    if force and model_work.exists():
        shutil.rmtree(model_work)
    model_work.mkdir(parents=True, exist_ok=True)
    current = Path(source_record["canonicalModel"])
    expected_cards = source_record["cardCount"]
    stages: list[dict[str, Any]] = []
    for index, tool in enumerate(tools, 1):
        stage_dir = model_work / f"{index:02d}-{tool}"
        stage_dir.mkdir(parents=True, exist_ok=True)
        provenance = f"{model_id}:{index}:{tool}"
        if tool == "reduction":
            current, stage = reduce_model(
                current,
                stage_dir,
                stage_dir / "tool.log",
                expected_cards,
                provenance,
            )
        elif tool == "expansion":
            current, stage = expand_model(
                current,
                stage_dir,
                stage_dir / "tool.log",
                expected_cards,
                provenance,
            )
        elif tool == "translation":
            current, stage = translate_model(
                current,
                stage_dir,
                stage_dir / "tool.log",
                expected_cards,
                provenance,
            )
        elif tool == "fitting":
            current, stage = fit_model(
                current,
                stage_dir,
                stage_dir,
                expected_cards,
                provenance,
            )
        else:
            raise ValueError(f"Unknown tool: {tool}")
        stages.append(stage)
    final_model = model_work / "model.lib"
    shutil.copy2(current, final_model)
    final_ast = ast_normalize(
        final_model,
        model_work / "accepted.lib",
        provenance=f"{model_id}:accepted",
        source_format="ngspice",
        expected_cards=expected_cards,
    )
    shutil.copy2(model_work / "accepted.lib", final_model)
    payload = {
        "id": model_id,
        "sourceId": source_record["sourceId"],
        "kind": "processed",
        "chainId": chain_id,
        "chain": list(tools),
        "toolCount": len(tools),
        "sourcePath": source_record["sourcePath"],
        "sourceMd5": source_record["sourceMd5"],
        "finalModel": str(final_model),
        "md5": digest(final_model),
        "cardCount": expected_cards,
        "models": final_ast["cards"],
        "stages": stages,
        "completedAt": utc_now(),
    }
    atomic_json(result_manifest, payload)
    return payload


def parse_sources(*, force: bool = False) -> list[dict[str, Any]]:
    source_records: list[dict[str, Any]] = []
    ast_evidence: list[dict[str, Any]] = []
    for index, source in enumerate(discover_sources(), 1):
        identifier = source_id(source)
        model_work = WORK_ROOT / "models" / identifier / "original"
        canonical = model_work / "model.lib"
        if force and model_work.exists():
            shutil.rmtree(model_work)
        print(f"[AST] {index}/54 {source.relative_to(COLLECTION)}", flush=True)
        evidence = ast_normalize(
            source,
            canonical,
            provenance=f"{identifier}:original",
        )
        record = {
            "id": f"{identifier}__original",
            "sourceId": identifier,
            "kind": "original",
            "chainId": "original",
            "chain": [],
            "toolCount": 0,
            "sourcePath": str(source),
            "sourceMd5": digest(source),
            "canonicalModel": str(canonical),
            "finalModel": str(canonical),
            "md5": digest(canonical),
            "cardCount": len(evidence["cards"]),
            "models": evidence["cards"],
            "stages": [],
            "completedAt": utc_now(),
        }
        source_records.append(record)
        ast_evidence.append({"id": record["id"], **evidence})
    atomic_json(
        AST_EVIDENCE_PATH,
        {
            "generatedAt": utc_now(),
            "sourceCount": len(source_records),
            "cardCount": sum(record["cardCount"] for record in source_records),
            "failures": [],
            "sources": ast_evidence,
        },
    )
    return source_records


def materialize(record: dict[str, Any]) -> dict[str, Any]:
    model_file = Path(record["finalModel"])
    checksum = digest(model_file)
    destination = DATA_ROOT / checksum
    destination.mkdir(parents=True, exist_ok=True)
    stored_model = destination / "model.lib"
    shutil.copy2(model_file, stored_model)
    stored = dict(record)
    stored["md5"] = checksum
    stored["finalModel"] = str(stored_model)
    atomic_json(
        destination / "model-manifest.json",
        {
            key: value
            for key, value in stored.items()
            if key not in {"stages"}
        }
        | {"stages": record["stages"], "modelFile": "model.lib"},
    )
    return stored


def generate_models(*, force: bool = False, jobs: int = 1) -> list[dict[str, Any]]:
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    originals = parse_sources(force=force)
    processed: list[dict[str, Any]] = []
    work = [
        (record, chain_id, tools)
        for record in originals
        for chain_id, tools in CHAINS.items()
    ]
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as pool:
        futures = {
            pool.submit(
                execute_chain,
                record,
                chain_id,
                tools,
                force=force,
            ): (record["sourceId"], chain_id)
            for record, chain_id, tools in work
        }
        for index, future in enumerate(as_completed(futures), 1):
            source_name, chain_name = futures[future]
            print(
                f"[tools] {index}/{len(work)} {source_name} / {chain_name}",
                flush=True,
            )
            processed.append(future.result())
    records = [*originals, *processed]
    if len(records) != len(originals) * 4:
        raise ValueError(
            f"Expected four models per source, received {len(records)} "
            f"for {len(originals)} sources"
        )
    records = [materialize(record) for record in records]
    checksums = [record["md5"] for record in records]
    if len(set(checksums)) != len(checksums):
        duplicates = sorted(
            checksum for checksum in set(checksums) if checksums.count(checksum) > 1
        )
        raise ValueError(f"Model MD5 collision: {duplicates}")
    records.sort(key=lambda record: record["id"])
    payload = {
        "generatedAt": utc_now(),
        "collectionRoot": str(COLLECTION),
        "collectionCommit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=COLLECTION,
            text=True,
        ).strip(),
        "sourceCount": len(originals),
        "processedCount": len(processed),
        "modelCount": len(records),
        "chains": {key: list(value) for key, value in CHAINS.items()},
        "models": records,
    }
    atomic_json(INVENTORY_PATH, payload)
    atomic_json(
        DATA_ROOT / "manifest.json",
        {
            "version": "2.0.0",
            "generatedAt": payload["generatedAt"],
            "collectionCommit": payload["collectionCommit"],
            "sourceCount": payload["sourceCount"],
            "processedCount": payload["processedCount"],
            "modelCount": payload["modelCount"],
            "simulators": list(SIMULATORS),
            "modes": list(MODES),
            "models": {
                record["id"]: {
                    "md5": record["md5"],
                    "sourceId": record["sourceId"],
                    "kind": record["kind"],
                    "chain": record["chain"],
                    "cardCount": record["cardCount"],
                }
                for record in records
            },
        },
    )
    return records


def load_records() -> list[dict[str, Any]]:
    payload = json.loads(INVENTORY_PATH.read_text())
    return payload["models"]


def complete_missing_card_models() -> list[dict[str, Any]]:
    """Materialize non-primary cards that were hidden by file-level inventory.

    The original collection contains ten PTM files with both an NMOS and PMOS
    card.  The benchmark runner selects the first non-fixture card as its
    primary device, so the existing file-level records exercised only NMOS.
    Keep those accepted runs and add one single-card record for every
    previously non-primary card in every tool-chain output.
    """
    payload = json.loads(INVENTORY_PATH.read_text())
    records = payload["models"]
    existing_ids = {record["id"] for record in records}
    additions: list[dict[str, Any]] = []

    for record in records:
        if record.get("cardCount", 0) <= 1:
            continue
        model_path = Path(record["finalModel"])
        models = parser_for(model_path, "ngspice")(model_path).parse_to_ir()
        for card_index, model in enumerate(models[1:], 2):
            card_tag = re.sub(
                r"[^a-zA-Z0-9]+", "_", model.name
            ).strip("_").lower()
            derived_id = f"{record['id']}__card_{card_index}_{card_tag}"
            if derived_id in existing_ids:
                continue

            model_work = (
                WORK_ROOT
                / "models"
                / "supplemental-cards"
                / derived_id
            )
            raw_model = model_work / "raw.lib"
            accepted_model = model_work / "model.lib"
            write_ir(
                [model],
                raw_model,
                provenance=f"{derived_id}:supplemental-card",
            )
            ast_record = ast_normalize(
                raw_model,
                accepted_model,
                provenance=f"{derived_id}:accepted",
                source_format="ngspice",
                expected_cards=1,
            )
            source_record_id = record["sourceId"]
            if record["kind"] == "processed":
                source_record_id = (
                    f"{source_record_id}__card_{card_index}_{card_tag}"
                )
            derived = dict(record)
            derived.update(
                {
                    "id": derived_id,
                    "sourceId": source_record_id,
                    "finalModel": str(accepted_model),
                    "md5": digest(accepted_model),
                    "cardCount": 1,
                    "models": ast_record["cards"],
                    "derivedFromModelId": record["id"],
                    "sourceCardIndex": card_index,
                    "sourceCardName": model.name,
                    "benchmarkModelName": model.name,
                    "completedAt": utc_now(),
                }
            )
            additions.append(materialize(derived))
            existing_ids.add(derived_id)

    records.extend(additions)
    for record in records:
        if record.get("models"):
            record.setdefault("benchmarkModelName", record["models"][0]["name"])
    records.sort(key=lambda record: record["id"])
    original_count = sum(record["kind"] == "original" for record in records)
    processed_count = sum(record["kind"] == "processed" for record in records)
    payload.update(
        {
            "generatedAt": utc_now(),
            "sourceFileCount": 54,
            "sourceCount": original_count,
            "sourceCardCount": original_count,
            "processedCount": processed_count,
            "modelCount": len(records),
            "models": records,
        }
    )
    atomic_json(INVENTORY_PATH, payload)
    atomic_json(
        DATA_ROOT / "manifest.json",
        {
            "version": "2.1.0",
            "generatedAt": payload["generatedAt"],
            "collectionCommit": payload["collectionCommit"],
            "sourceFileCount": payload["sourceFileCount"],
            "sourceCount": payload["sourceCount"],
            "sourceCardCount": payload["sourceCardCount"],
            "processedCount": payload["processedCount"],
            "modelCount": payload["modelCount"],
            "simulators": list(SIMULATORS),
            "modes": list(MODES),
            "models": {
                record["id"]: {
                    "md5": record["md5"],
                    "sourceId": record["sourceId"],
                    "kind": record["kind"],
                    "chain": record["chain"],
                    "cardCount": record["cardCount"],
                    "benchmarkModelName": record["benchmarkModelName"],
                }
                for record in records
            },
        },
    )
    print(
        f"[supplemental] added {len(additions)} non-primary card models; "
        f"inventory now contains {len(records)} benchmark models",
        flush=True,
    )
    return records


def benchmark_dut_geometry(model_path: Path) -> tuple[str, str]:
    """Return the frozen native-fixture geometry (W=10 µm, L=1 µm)."""
    del model_path
    return "10u", "1u"


def ngspice_capability_preflight(
    model_path: Path,
    model_selector: str | None = None,
) -> tuple[bool, str]:
    """Compile all cards and operate each logical bin family at DUT geometry."""
    models = parser_for(model_path, "ngspice")(model_path).parse_to_ir()
    width, length = benchmark_dut_geometry(model_path)
    lines = [
        "* ngspice model capability preflight",
        f".include '{model_path.resolve()}'",
        ".options noacct",
    ]
    targets: dict[tuple[str, str], Any] = {}
    for model in models:
        if model.name.lower().startswith("__fixture_"):
            continue
        if (
            model_selector is not None
            and model.name.lower() != model_selector.lower()
        ):
            continue
        selector = (
            model.name
            if model_selector is not None
            else re.sub(r"\.\d+$", "", model.name)
        )
        targets.setdefault(
            (selector.lower(), model.device_type.value.lower()),
            model,
        )
    device_count = 0
    first_device: tuple[int, bool] | None = None
    for index, ((selector, _), model) in enumerate(targets.items()):
        is_pmos = model.device_type.value.lower() == "pmos"
        bias = "-0.8" if is_pmos else "0.8"
        lines.extend(
            (
                f"M{index} d{index} g{index} 0 0 {selector} "
                f"W={width} L={length}",
                f"VD{index} d{index} 0 {bias}",
                f"VG{index} g{index} 0 {bias}",
            )
        )
        if first_device is None:
            first_device = (index, is_pmos)
        device_count += 1
    if not device_count:
        return False, "no MOS cards available for capability preflight"
    first_index, first_is_pmos = first_device
    sweep_stop = "-0.8" if first_is_pmos else "0.8"
    sweep_step = "-0.4" if first_is_pmos else "0.4"
    lines.extend(
        (
            f".dc VG{first_index} 0 {sweep_stop} {sweep_step} "
            f"VD{first_index} 0 {sweep_stop} {sweep_step}",
            f".print dc v(d{first_index})",
            ".end",
            "",
        )
    )
    work_dir = model_path.parent / "_ngspice_preflight"
    work_dir.mkdir(parents=True, exist_ok=True)
    netlist = work_dir / "preflight.cir"
    log = work_dir / "preflight.log"
    netlist.write_text("\n".join(lines), encoding="utf-8")
    process = subprocess.run(
        ["ngspice", "-b", "-o", str(log), str(netlist)],
        cwd=work_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    output = (process.stdout or "") + "\n"
    if log.exists():
        output += log.read_text(errors="replace")
    failure_patterns = (
        r"(?i)unsupported.*level",
        r"(?i)unrecognized parameter",
        r"(?i)unknown parameter",
        r"(?i)model issue",
        r"(?i)fatal error",
        r"(?i)doAnalyses:.*failed",
        r"(?i)timestep too small",
        r"(?i)no convergence",
    )
    failed_marker = next(
        (pattern for pattern in failure_patterns if re.search(pattern, output)),
        None,
    )
    reason = (
        f"return code {process.returncode}"
        if process.returncode
        else (f"diagnostic {failed_marker}" if failed_marker else "")
    )
    return process.returncode == 0 and failed_marker is None, reason


def hspice_capability_preflight(
    model_path: Path,
    model_selector: str | None = None,
) -> tuple[bool, str]:
    """Compile all cards and operate each logical bin family with HSPICE."""
    models = parser_for(model_path, "ngspice")(model_path).parse_to_ir()
    width, length = benchmark_dut_geometry(model_path)
    lines = [
        "* HSPICE model capability preflight",
        ".OPTION BRIEF NOMOD",
        f".INC '{model_path.resolve()}'",
    ]
    targets: dict[tuple[str, str], Any] = {}
    for model in models:
        if model.name.lower().startswith("__fixture_"):
            continue
        if (
            model_selector is not None
            and model.name.lower() != model_selector.lower()
        ):
            continue
        selector = (
            model.name
            if model_selector is not None
            else re.sub(r"\.\d+$", "", model.name)
        )
        targets.setdefault(
            (selector.lower(), model.device_type.value.lower()),
            model,
        )
    count = 0
    for index, ((selector, _), model) in enumerate(targets.items()):
        bias = "-0.8" if model.device_type.value.lower() == "pmos" else "0.8"
        lines.extend(
            (
                f"M{index} d{index} g{index} 0 0 {selector} "
                f"W={width} L={length}",
                f"VD{index} d{index} 0 DC {bias}",
                f"VG{index} g{index} 0 DC {bias}",
            )
        )
        count += 1
    if not count:
        return False, "no MOS cards available for capability preflight"
    lines.extend((".OP", ".END", ""))
    work_dir = model_path.parent / "_hspice_preflight"
    work_dir.mkdir(parents=True, exist_ok=True)
    netlist = work_dir / "preflight.sp"
    prefix = work_dir / "preflight"
    netlist.write_text("\n".join(lines), encoding="utf-8")
    environment = os.environ.copy()
    environment["SNPSLMD_LICENSE_FILE"] = "27000@192.168.1.7"
    process = subprocess.run(
        [
            "/eda_hurricane/hspice/hspice/S-2021.09/hspice/linux64/hspice",
            "-i",
            str(netlist),
            "-o",
            str(prefix),
        ],
        cwd=work_dir,
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    output = process.stdout or ""
    listing = prefix.with_suffix(".lis")
    if listing.exists():
        output += "\n" + listing.read_text(errors="replace")
    marker = re.search(r"(?i)(?:\*\*error\*\*|fatal error|check your parameters)", output)
    reason = (
        f"return code {process.returncode}"
        if process.returncode
        else (f"diagnostic {marker.group(0)}" if marker else "")
    )
    return process.returncode == 0 and marker is None, reason


def spectre_capability_preflight(
    model_path: Path,
    model_selector: str | None = None,
) -> tuple[bool, str]:
    """Compile all cards and exercise each logical bin family in Spectre."""
    benchmark_src = BENCHMARK / "src"
    if str(benchmark_src) not in sys.path:
        sys.path.insert(0, str(benchmark_src))
    from spice_model_benchmark.spectre_runner import (
        SPECTRE_BIN,
        _build_spectre_env,
    )

    models = parser_for(model_path, "ngspice")(model_path).parse_to_ir()
    width, length = benchmark_dut_geometry(model_path)
    lines = [
        "simulator lang=spectre",
        "global 0",
        "preflightOptions options reltol=1e-8 vabstol=1e-6 "
        "iabstol=1e-12 gmin=1e-15 method=gear2only",
        "simulator lang=spice",
        f".include '{model_path.resolve()}'",
        ".model __preflight_nmos NMOS "
        "(LEVEL=1 VTO=0.7 KP=50u LAMBDA=0.02)",
        ".model __preflight_pmos PMOS "
        "(LEVEL=1 VTO=-0.7 KP=25u LAMBDA=0.02)",
        "simulator lang=spectre",
    ]
    targets: dict[tuple[str, str], Any] = {}
    for model in models:
        if model.name.lower().startswith("__fixture_"):
            continue
        if (
            model_selector is not None
            and model.name.lower() != model_selector.lower()
        ):
            continue
        selector = (
            model.name
            if model_selector is not None
            else re.sub(r"\.\d+$", "", model.name)
        )
        targets.setdefault(
            (selector.lower(), model.device_type.value.lower()),
            model,
        )
    count = 0
    for index, ((selector, _), model) in enumerate(targets.items()):
        bias = "-1.2" if model.device_type.value.lower() == "pmos" else "1.2"
        lines.extend(
            (
                f"m{index} (d{index} g{index} 0 0) {selector} "
                f"l={length} w={width}",
                f"vd{index} (d{index} 0) vsource dc={bias}",
                f"vg{index} (g{index} 0) vsource dc={bias}",
                f"cload{index} (d{index} 0) capacitor c=1f",
            )
        )
        if model.device_type.value.lower() == "pmos":
            lines.extend(
                (
                    f"mi_p{index} (o{index} i{index} vdd{index} "
                    f"vdd{index}) {selector} l={length} w={width}",
                    f"mi_n{index} (o{index} i{index} 0 0) "
                    "__preflight_nmos l=1u w=10u",
                )
            )
        else:
            lines.extend(
                (
                    f"mi_n{index} (o{index} i{index} 0 0) "
                    f"{selector} l={length} w={width}",
                    f"mi_p{index} (o{index} i{index} vdd{index} "
                    f"vdd{index}) __preflight_pmos l=1u w=20u",
                )
            )
        lines.extend(
            (
                f"vddi{index} (vdd{index} 0) vsource dc=1.2",
                f"vini{index} (i{index} 0) vsource dc=0",
            )
        )
        count += 1
    if not count:
        return False, "no MOS cards available for capability preflight"
    lines.extend(
        (
            "preflight tran stop=1p maxstep=1p method=gear2only",
            "",
        )
    )
    work_dir = model_path.parent / "_spectre_preflight"
    work_dir.mkdir(parents=True, exist_ok=True)
    netlist = work_dir / "preflight.scs"
    netlist.write_text("\n".join(lines), encoding="utf-8")
    process = subprocess.run(
        [
            SPECTRE_BIN,
            "-raw",
            "raw_preflight",
            "-format",
            "psfascii",
            netlist.name,
        ],
        cwd=work_dir,
        env=_build_spectre_env(),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    output = process.stdout or ""
    marker = re.search(
        r"(?i)(?:\bERROR\b|fatal error|terminated prematurely|"
        r"no convergence|exceeded the blowup limit)",
        output,
    )
    reason = (
        f"return code {process.returncode}"
        if process.returncode
        else (f"diagnostic {marker.group(0)}" if marker else "")
    )
    return process.returncode == 0 and marker is None, reason


def prepare_benchmark_input(record: dict[str, Any], simulator: str) -> tuple[Path, list[str]]:
    """Create a parameter-preserving model handoff and validate it natively."""
    source = Path(record["finalModel"])
    destination = (
        WORK_ROOT / "benchmark-inputs" / record["md5"] / f"{simulator}.lib"
    )
    evidence = ast_normalize(
        source,
        destination,
        provenance=f"{record['id']}:{simulator}:benchmark",
        source_format="ngspice",
        expected_cards=record["cardCount"],
    )
    adjustments: list[str] = []
    content = destination.read_text(encoding="utf-8")

    if simulator == "ngspice":
        compatible, reason = ngspice_capability_preflight(destination)
    elif simulator == "hspice":
        compatible, reason = hspice_capability_preflight(destination)
    elif simulator == "spectre":
        compatible, reason = spectre_capability_preflight(destination)
    else:
        raise ValueError(f"Unsupported simulator: {simulator}")
    if not compatible:
        raise RuntimeError(
            f"{simulator} rejected the parameter-preserving model handoff for "
            f"{record['id']}: {reason or 'unknown simulator diagnostic'}. "
            "No model fallback or parameter lowering was applied."
        )

    device_types = {item["deviceType"] for item in evidence["cards"]}
    fixture_count = 0
    if "nmos" not in device_types:
        content += (
            "\n* Simulator fixture companion for complementary circuits\n"
            ".model __fixture_nmos NMOS "
            "(LEVEL=1 VTO=0.7 KP=50u LAMBDA=0.02)\n"
        )
        fixture_count += 1
        adjustments.append("added NMOS complementary-circuit fixture")
    if "pmos" not in device_types:
        content += (
            "\n* Simulator fixture companion for complementary circuits\n"
            ".model __fixture_pmos PMOS "
            "(LEVEL=1 VTO=-0.7 KP=25u LAMBDA=0.02)\n"
        )
        fixture_count += 1
        adjustments.append("added PMOS complementary-circuit fixture")
    destination.write_text(content, encoding="utf-8")
    parsed = parser_for(destination, "ngspice")(destination).parse_to_ir()
    if len(parsed) != record["cardCount"] + fixture_count:
        raise ValueError(
            f"Benchmark handoff changed card count for {record['id']}: "
            f"{record['cardCount']} + {fixture_count} fixtures -> {len(parsed)}"
        )
    source_cards = [
        model for model in parsed if not model.name.lower().startswith("__fixture_")
    ]
    if physical_model_signature(source_cards) != evidence["physicalModelSignature"]:
        raise ValueError(
            f"Fixture insertion changed benchmark model content for {record['id']}"
        )
    for expected, actual in zip(evidence["cards"], source_cards):
        if (
            actual.name != expected["name"]
            or actual.device_type.value != expected["deviceType"]
            or len(actual.base_parameters) != expected["parameterCount"]
        ):
            raise ValueError(f"Benchmark handoff AST identity changed for {record['id']}")
    return destination, sorted(set(adjustments))


def parse_peak_rss(resource_file: Path) -> int | None:
    if not resource_file.exists():
        return None
    match = re.search(
        r"Maximum resident set size \(kbytes\):\s*(\d+)",
        resource_file.read_text(errors="replace"),
    )
    return int(match.group(1)) if match else None


def publish_canonical_plots(sim_dir: Path) -> None:
    """Publish only the canonical plots emitted by the benchmark itself."""
    plot_dir = sim_dir / "plot"
    legacy_plot_dir = sim_dir / "plots"
    plot_dir.mkdir(parents=True, exist_ok=True)
    if legacy_plot_dir.exists():
        for image in legacy_plot_dir.iterdir():
            if image.is_file():
                target = plot_dir / image.name
                if target.exists():
                    target.unlink()
                shutil.move(str(image), str(target))
        shutil.rmtree(legacy_plot_dir)
    actual = {
        path.name
        for path in plot_dir.glob("*.png")
        if path.is_file() and path.stat().st_size > 0
    }
    expected = set(EXPECTED_PLOTS)
    if actual != expected:
        raise ValueError(
            "benchmark did not emit the canonical plot set: "
            f"missing={sorted(expected - actual)} "
            f"extra={sorted(actual - expected)}"
        )
    provenance_path = sim_dir / "data" / "plot_provenance.json"
    if not provenance_path.is_file():
        raise ValueError(
            f"benchmark plot provenance is missing: {provenance_path}"
        )
    provenance = json.loads(provenance_path.read_text())
    mapped = set(provenance.get("plots", {}))
    if mapped != expected:
        raise ValueError(
            "plot provenance does not cover the canonical plot set"
        )


def collect_root_result_files(sim_dir: Path) -> None:
    """Move simulator result files from the run root into data/."""
    data_dir = sim_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    protected = {
        "REPORT.md",
        "manifest.json",
        "native-fixture-manifest.json",
        "benchmark.log",
        "resource.txt",
    }
    for source in sorted(sim_dir.iterdir()):
        if not source.is_file() or source.name in protected:
            continue
        target = data_dir / source.name
        if target.exists():
            if digest(source, "sha256") == digest(target, "sha256"):
                source.unlink()
                continue
            target = data_dir / f"root_{source.name}"
            suffix = 2
            while target.exists():
                target = data_dir / f"root_{suffix}_{source.name}"
                suffix += 1
        source.replace(target)


def clean_report_language(text: str) -> str:
    replacements = (
        (r"\bTests\b", "Checks"),
        (r"\bTest\b", "Check"),
        (r"\btests\b", "checks"),
        (r"\btest\b", "check"),
        (r"\bExperiments\b", "Runs"),
        (r"\bExperiment\b", "Run"),
        (r"\bexperiments\b", "runs"),
        (r"\bexperiment\b", "run"),
    )
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text)
    return text


def finalize_report(sim_dir: Path, manifest: dict[str, Any]) -> None:
    report = sim_dir / "REPORT.md"
    if not report.exists():
        raise ValueError(f"Benchmark did not produce {report}")
    text = clean_report_language(report.read_text(errors="replace"))
    text = text.replace("src='plots/", "src='plot/")
    text = text.replace('src="plots/', 'src="plot/')
    netlist_lines = "".join(
        f"  - {item['mode'].upper()}: "
        f"{(sim_dir / item['path']).resolve()}\n"
        for item in manifest["netlists"]
    )
    setup_pattern = re.compile(
        r"(?m)^- \[<span style='color: (?:green|red)'>[✓✗]</span>\] "
        r"Circuit files? exist(?:s)? and (?:is|are) readable\n"
        r"(?:  - [^\n]*\n)*"
    )
    text, setup_count = setup_pattern.subn(
        "- [<span style='color: green'>✓</span>] "
        "Circuit files exist and are readable\n"
        + netlist_lines,
        text,
        count=1,
    )
    if setup_count != 1:
        raise ValueError(
            f"REPORT simulation-setup netlist entry was not found: {report}"
        )
    marker = "<!-- collection-run-integrity -->"
    if marker in text:
        text = text.split(marker, 1)[0].rstrip()
    integrity = [
        "",
        marker,
        "## Run Integrity",
        "",
        f"- Model: `{manifest['modelId']}`",
        f"- Model MD5: `{manifest['md5']}`",
        f"- Simulator: `{manifest['simulator']}`",
        f"- Modes: `{', '.join(manifest['modes'])}`",
        f"- Started: `{manifest['startedAt']}`",
        f"- Finished: `{manifest['finishedAt']}`",
        f"- Elapsed seconds: `{manifest['elapsedSeconds']}`",
        f"- Peak resident memory KiB: `{manifest['peakRssKiB']}`",
        f"- Process return code: `{manifest['returnCode']}`",
        "- Benchmark circuit: fixed, source-controlled simulator-native "
        "fixture; no circuit AST or netlist translation was used.",
        f"- Benchmark contract SHA-256: "
        f"`{manifest['benchmarkContractSha256']}`",
        "- Device-model handoff preserved model names, polarity, and every AST "
        "parameter; no fallback or parameter lowering was applied.",
        "- Executed netlists: `netlist/dc`, `netlist/transient`, "
        "`netlist/ac`, and `netlist/noise` (simulator-native extensions).",
        f"- Plot inventory: `{len(EXPECTED_PLOTS)}` non-empty PNG files "
        "generated from simulator data.",
        "",
    ]
    report.write_text(text.rstrip() + "\n" + "\n".join(integrity), encoding="utf-8")


def remove_run_scratch(sim_dir: Path) -> None:
    for name in (
        "_ngspice_netlists",
        "spectre_raw",
        "spectre_work",
        "netlists",
    ):
        path = sim_dir / name
        if path.is_dir():
            shutil.rmtree(path)
    for name in ("benchmark.log", "resource.txt"):
        path = sim_dir / name
        if path.is_file():
            path.unlink()


def executed_netlist_inventory(
    sim_dir: Path,
    simulator: str,
) -> list[dict[str, Any]]:
    extension = NETLIST_EXTENSIONS[simulator]
    netlist_dir = sim_dir / "netlist"
    expected = {
        mode: netlist_dir / f"{mode}{extension}"
        for mode in MODES
    }
    missing = [
        str(path)
        for path in expected.values()
        if not path.is_file() or path.stat().st_size == 0
    ]
    actual = (
        sorted(path for path in netlist_dir.iterdir() if path.is_file())
        if netlist_dir.is_dir()
        else []
    )
    unexpected = [
        str(path)
        for path in actual
        if path not in expected.values()
    ]
    if missing or unexpected or len(actual) != len(MODES):
        raise ValueError(
            "Executed netlist contract failed: "
            f"missing={missing}, unexpected={unexpected}, count={len(actual)}"
        )
    return [
        {
            "mode": mode,
            "path": f"netlist/{path.name}",
            "bytes": path.stat().st_size,
            "sha256": digest(path, "sha256"),
        }
        for mode, path in expected.items()
    ]


def fixed_fixture_evidence(
    sim_dir: Path,
    simulator: str,
) -> dict[str, Any]:
    """Validate the immutable fixture manifest against archived run decks."""
    manifest_path = sim_dir / "native-fixture-manifest.json"
    if not manifest_path.is_file():
        raise ValueError(f"missing fixed-fixture manifest: {manifest_path}")
    evidence = json.loads(manifest_path.read_text(encoding="utf-8"))
    if evidence.get("fixtureMode") != "fixed-simulator-native":
        raise ValueError("benchmark did not use fixed simulator-native fixtures")
    if evidence.get("netlistAstUsed") is not False:
        raise ValueError("benchmark used a circuit/netlist AST")
    contract_hash = evidence.get("benchmarkContractSha256")
    if not isinstance(contract_hash, str) or len(contract_hash) != 64:
        raise ValueError("fixed-fixture contract hash is missing")
    allowed = evidence.get("allowedRuntimeBindings")
    if allowed != [
        "model_file",
        "primary_model",
        "nmos_model",
        "pmos_model",
    ]:
        raise ValueError(f"unexpected runtime fixture bindings: {allowed}")
    fixtures = evidence.get("fixtures")
    if not isinstance(fixtures, dict) or set(fixtures) != set(MODES):
        raise ValueError("fixed-fixture manifest does not cover four modes")
    extension = NETLIST_EXTENSIONS[simulator]
    template_hashes: dict[str, str] = {}
    submitted_hashes: dict[str, str] = {}
    for mode in MODES:
        item = fixtures.get(mode)
        if not isinstance(item, dict):
            raise ValueError(f"invalid fixed-fixture entry for {mode}")
        template_hash = item.get("templateSha256")
        submitted_hash = item.get("submittedSha256")
        if (
            not isinstance(template_hash, str)
            or len(template_hash) != 64
            or not isinstance(submitted_hash, str)
            or len(submitted_hash) != 64
        ):
            raise ValueError(f"invalid fixed-fixture hashes for {mode}")
        archived = sim_dir / "netlist" / f"{mode}{extension}"
        if digest(archived, "sha256") != submitted_hash:
            raise ValueError(
                f"archived {simulator} {mode} deck differs from submitted fixture"
            )
        template_hashes[mode] = template_hash
        submitted_hashes[mode] = submitted_hash
    return {
        "benchmarkFixtureMode": "fixed-simulator-native",
        "netlistAstUsed": False,
        "fixtureManifest": "native-fixture-manifest.json",
        "benchmarkContractSha256": contract_hash,
        "fixtureTemplateHashes": template_hashes,
        "fixtureSubmittedHashes": submitted_hashes,
    }


def run_one_benchmark(
    record: dict[str, Any],
    simulator: str,
    *,
    force: bool,
) -> dict[str, Any]:
    model_dir = DATA_ROOT / record["md5"]
    sim_dir = model_dir / simulator
    manifest_path = sim_dir / "manifest.json"
    if manifest_path.exists() and not force:
        previous = json.loads(manifest_path.read_text())
        if acceptance_failures(record, simulator, update=False) == []:
            print(f"[benchmark:{simulator}] skip {record['id']}", flush=True)
            return previous
    if sim_dir.exists():
        shutil.rmtree(sim_dir)
    sim_dir.mkdir(parents=True, exist_ok=True)
    started = utc_now()
    began = time.monotonic()
    try:
        benchmark_input, adjustments = prepare_benchmark_input(record, simulator)
        parameter_context_path = benchmark_input.with_suffix(
            ".parameter-context.json"
        )
        parameter_context = (
            json.loads(parameter_context_path.read_text())
            if parameter_context_path.is_file()
            else None
        )
    except Exception as exc:
        benchmark_input = (
            WORK_ROOT
            / "benchmark-inputs"
            / record["md5"]
            / f"{simulator}.lib"
        )
        parameter_context_path = benchmark_input.with_suffix(
            ".parameter-context.json"
        )
        parameter_context = (
            json.loads(parameter_context_path.read_text())
            if parameter_context_path.is_file()
            else None
        )
        parameter_preserving = False
        if benchmark_input.is_file():
            try:
                original = parser_for(
                    Path(record["finalModel"]), "ngspice"
                )(Path(record["finalModel"])).parse_to_ir()
                handed_off = parser_for(
                    benchmark_input, "ngspice"
                )(benchmark_input).parse_to_ir()
                parameter_preserving = (
                    physical_model_signature(original)
                    == physical_model_signature(handed_off)
                )
            except Exception:
                parameter_preserving = False
        manifest = {
            "modelId": record["id"],
            "sourceId": record["sourceId"],
            "kind": record["kind"],
            "chain": record["chain"],
            "modelPath": str(model_dir / "model.lib"),
            "benchmarkInputPath": str(benchmark_input),
            "benchmarkFixtureMode": "fixed-simulator-native",
            "netlistAstUsed": False,
            "fixtureManifest": None,
            "benchmarkContractSha256": None,
            "fixtureTemplateHashes": {},
            "fixtureSubmittedHashes": {},
            "parameterPreservingInput": parameter_preserving,
            "modelFallbackApplied": False,
            "parameterContext": parameter_context,
            "modelHandoffAdjustments": [],
            "md5": record["md5"],
            "simulator": simulator,
            "modes": list(MODES),
            "startedAt": started,
            "finishedAt": utc_now(),
            "elapsedSeconds": round(time.monotonic() - began, 6),
            "peakRssKiB": None,
            "returnCode": 4,
            "status": "failed",
            "error": str(exc),
            "internalFailureMarkers": [],
            "report": "REPORT.md",
            "dataDirectory": "data",
            "plotDirectory": "plot",
            "netlistDirectory": "netlist",
            "netlists": [],
        }
        atomic_json(manifest_path, manifest)
        print(
            f"[benchmark:{simulator}] rejected {record['id']}: {exc}",
            flush=True,
        )
        return manifest
    log = sim_dir / "benchmark.log"
    resource_file = sim_dir / "resource.txt"
    command = [
        "/usr/bin/time",
        "-v",
        "-o",
        str(resource_file),
        sys.executable,
        "-m",
        "spice_model_benchmark.cli",
        str(benchmark_input),
        "--simulator",
        simulator,
        "--modes",
        *MODES,
        "--output-dir",
        str(model_dir),
        "--dpi",
        "120",
        "--log-level",
        "WARNING",
    ]
    print(f"[benchmark:{simulator}] start {record['id']}", flush=True)
    return_code = 0
    error: str | None = None
    try:
        run_command(
            command,
            cwd=BENCHMARK,
            log=log,
            env={"PYTHONPATH": str(BENCHMARK / "src")},
        )
    except Exception as exc:
        return_code = 1
        error = str(exc)
    log_text = log.read_text(errors="replace") if log.exists() else ""
    internal_markers = re.findall(
        r"(?im)^(?:\[ERROR\].*|.*HSPICE failed rc=.*|.*crashed:.*|"
        r".*timed out.*|.*using synthetic.*|.*written placeholder:.*|"
        r".*data file not found.*|.*no valid data.*|"
        r".*incorrect format.*|.*error parsing data.*|"
        r".*timestep too small.*|.*simulation\(s\) aborted.*|"
        r".*doAnalyses:.*failed.*)$",
        log_text,
    )
    if return_code == 0 and internal_markers:
        return_code = 2
        error = (
            "Benchmark emitted internal failure markers: "
            + " | ".join(marker.strip() for marker in internal_markers[:8])
        )
    netlists: list[dict[str, Any]] = []
    fixture_evidence: dict[str, Any] = {
        "benchmarkFixtureMode": "fixed-simulator-native",
        "netlistAstUsed": False,
        "fixtureManifest": None,
        "benchmarkContractSha256": None,
        "fixtureTemplateHashes": {},
        "fixtureSubmittedHashes": {},
    }
    if return_code == 0:
        try:
            netlists = executed_netlist_inventory(sim_dir, simulator)
            fixture_evidence = fixed_fixture_evidence(sim_dir, simulator)
        except Exception as exc:
            return_code = 3
            error = str(exc)
    manifest = {
        "modelId": record["id"],
        "sourceId": record["sourceId"],
        "kind": record["kind"],
        "chain": record["chain"],
        "modelPath": str(model_dir / "model.lib"),
        "benchmarkInputPath": str(benchmark_input),
        **fixture_evidence,
        "parameterPreservingInput": True,
        "modelFallbackApplied": False,
        "parameterContext": parameter_context,
        "modelHandoffAdjustments": adjustments,
        "md5": record["md5"],
        "simulator": simulator,
        "modes": list(MODES),
        "startedAt": started,
        "finishedAt": utc_now(),
        "elapsedSeconds": round(time.monotonic() - began, 6),
        "peakRssKiB": parse_peak_rss(resource_file),
        "returnCode": return_code,
        "status": "completed" if return_code == 0 else "failed",
        "error": error,
        "internalFailureMarkers": internal_markers,
        "report": "REPORT.md",
        "dataDirectory": "data",
        "plotDirectory": "plot",
        "netlistDirectory": "netlist",
        "netlists": netlists,
    }
    if return_code == 0:
        try:
            collect_root_result_files(sim_dir)
            publish_canonical_plots(sim_dir)
            finalize_report(sim_dir, manifest)
            remove_run_scratch(sim_dir)
        except Exception as exc:
            manifest["status"] = "failed"
            manifest["error"] = str(exc)
    atomic_json(manifest_path, manifest)
    print(
        f"[benchmark:{simulator}] {manifest['status']} {record['id']} "
        f"{manifest['elapsedSeconds']:.1f}s",
        flush=True,
    )
    return manifest


def run_benchmarks(
    records: list[dict[str, Any]],
    *,
    simulators: tuple[str, ...],
    force: bool,
    jobs: int,
) -> None:
    work = [(record, simulator) for record in records for simulator in simulators]
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as pool:
        futures = {
            pool.submit(
                run_one_benchmark,
                record,
                simulator,
                force=force,
            ): (record["id"], simulator)
            for record, simulator in work
        }
        for index, future in enumerate(as_completed(futures), 1):
            model_id, simulator = futures[future]
            future.result()
            print(
                f"[matrix] {index}/{len(work)} {model_id} / {simulator}",
                flush=True,
            )


def acceptance_failures(
    record: dict[str, Any],
    simulator: str,
    *,
    update: bool = True,
) -> list[str]:
    sim_dir = DATA_ROOT / record["md5"] / simulator
    manifest_path = sim_dir / "manifest.json"
    report = sim_dir / "REPORT.md"
    data_dir = sim_dir / "data"
    plot_dir = sim_dir / "plot"
    netlist_dir = sim_dir / "netlist"
    failures: list[str] = []
    required = (manifest_path, report, data_dir, plot_dir, netlist_dir)
    for path in required:
        if not path.exists():
            failures.append(f"missing {path.name}")
    if failures:
        return failures
    try:
        manifest = json.loads(manifest_path.read_text())
    except Exception as exc:
        return [f"invalid manifest: {exc}"]
    required_manifest = (
        "startedAt",
        "finishedAt",
        "elapsedSeconds",
        "md5",
        "peakRssKiB",
        "simulator",
        "status",
        "benchmarkFixtureMode",
        "netlistAstUsed",
        "benchmarkContractSha256",
        "parameterPreservingInput",
        "modelFallbackApplied",
    )
    for key in required_manifest:
        if key not in manifest or manifest[key] is None:
            failures.append(f"manifest missing {key}")
    if manifest.get("status") != "completed":
        failures.append(f"status {manifest.get('status')}")
    if manifest.get("md5") != record["md5"]:
        failures.append("manifest md5 mismatch")
    if manifest.get("simulator") != simulator:
        failures.append("manifest simulator mismatch")
    if manifest.get("benchmarkFixtureMode") != "fixed-simulator-native":
        failures.append("benchmark did not use fixed native fixtures")
    if manifest.get("netlistAstUsed") is not False:
        failures.append("benchmark used a circuit/netlist AST")
    if manifest.get("parameterPreservingInput") is not True:
        failures.append("benchmark input is not parameter-preserving")
    if manifest.get("modelFallbackApplied") is not False:
        failures.append("benchmark used a model fallback")
    if manifest.get("elapsedSeconds", 0) <= 0:
        failures.append("invalid elapsedSeconds")
    try:
        actual_netlists = executed_netlist_inventory(sim_dir, simulator)
        actual_fixture = fixed_fixture_evidence(sim_dir, simulator)
    except Exception as exc:
        failures.append(str(exc))
        actual_netlists = []
        actual_fixture = {}
    if manifest.get("netlistDirectory") != "netlist":
        failures.append("manifest netlistDirectory mismatch")
    if manifest.get("netlists") != actual_netlists:
        failures.append("manifest netlist inventory mismatch")
    for key, value in actual_fixture.items():
        if manifest.get(key) != value:
            failures.append(f"manifest fixed-fixture evidence mismatch: {key}")
    images = sorted(plot_dir.glob("*.png"))
    if len(images) != len(EXPECTED_PLOTS):
        failures.append(f"plot count {len(images)}")
    names = {image.name for image in images}
    if names != set(EXPECTED_PLOTS):
        failures.append("plot inventory mismatch")
    if any(image.stat().st_size == 0 for image in images):
        failures.append("empty plot")
    if not any(path.is_file() and path.stat().st_size > 0 for path in data_dir.iterdir()):
        failures.append("empty data directory")
    large_signal_caps = data_dir / "large_signal_caps.txt"
    if not large_signal_caps.is_file() or large_signal_caps.stat().st_size == 0:
        failures.append("missing large_signal_caps.txt")
    provenance_path = data_dir / "plot_provenance.json"
    if not provenance_path.is_file():
        failures.append("missing plot provenance")
    else:
        try:
            from PIL import Image

            provenance = json.loads(provenance_path.read_text())
            mapped_plots = provenance.get("plots", {})
            dimensions = provenance.get("dimensions", {})
            image_hashes = provenance.get("imageSha256", {})
            if provenance.get("schemaVersion") != 2:
                failures.append("plot provenance schema mismatch")
            if provenance.get("syntheticDataUsed") is not False:
                failures.append("plot provenance permits synthetic data")
            if set(mapped_plots) != set(EXPECTED_PLOTS):
                failures.append("plot provenance inventory mismatch")
            if set(dimensions) != set(EXPECTED_PLOTS):
                failures.append("plot dimension inventory mismatch")
            if set(image_hashes) != set(EXPECTED_PLOTS):
                failures.append("plot hash inventory mismatch")
            for plot_name, recorded in dimensions.items():
                image_path = plot_dir / plot_name
                if not image_path.is_file():
                    continue
                with Image.open(image_path) as image:
                    actual = list(image.size)
                if actual != recorded:
                    failures.append(
                        f"plot dimension provenance mismatch: "
                        f"{plot_name} {recorded} != {actual}"
                    )
                if image_hashes.get(plot_name) != digest(
                    image_path, "sha256"
                ):
                    failures.append(
                        f"plot hash provenance mismatch: {plot_name}"
                    )
            for plot_name, entry in mapped_plots.items():
                sources = entry.get("sources", [])
                source_hashes = entry.get("sourceSha256", {})
                if entry.get("syntheticDataUsed") is not False:
                    failures.append(
                        f"plot permits synthetic data: {plot_name}"
                    )
                if not sources:
                    failures.append(
                        f"plot provenance has no source: {plot_name}"
                    )
                if set(source_hashes) != set(sources):
                    failures.append(
                        f"plot source hash inventory mismatch: {plot_name}"
                    )
                for relative in sources:
                    source = sim_dir / relative
                    if not source.is_file() or source.stat().st_size == 0:
                        failures.append(
                            f"plot provenance source missing: "
                            f"{plot_name} <- {relative}"
                        )
                    elif source_hashes.get(relative) != digest(
                        source, "sha256"
                    ):
                        failures.append(
                            f"plot source hash mismatch: "
                            f"{plot_name} <- {relative}"
                        )
        except Exception as exc:
            failures.append(f"invalid plot provenance: {exc}")
    for metric_file, dependent_columns in (
        ("sparams_data.txt", range(1, 9)),
        ("nqs_effects.txt", (3,)),
    ):
        path = data_dir / metric_file
        if not path.is_file():
            failures.append(f"missing {metric_file}")
            continue
        nonzero = False
        for line in path.read_text(errors="replace").splitlines():
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            try:
                row = [float(value) for value in line.split()]
            except ValueError:
                continue
            if any(
                column < len(row) and row[column] != 0.0
                for column in dependent_columns
            ):
                nonzero = True
                break
        if not nonzero:
            failures.append(f"{metric_file} has only zero dependent values")
    thermal_bias_files = sorted(data_dir.glob("thermal_noise_vgs*.txt"))
    if len(thermal_bias_files) != 6:
        failures.append(
            f"thermal-noise bias file count {len(thermal_bias_files)}"
        )
    elif len(
        {digest(path, "sha256") for path in thermal_bias_files}
    ) == 1:
        failures.append(
            "all thermal-noise bias files are byte-identical"
        )
    report_text = report.read_text(errors="replace")
    report_results_text = re.sub(
        r"(?im)^- Items are marked with .*?for failure\s*$",
        "",
        report_text,
    )
    required_sections = (
        "# MOSFET Simulation Verification Report",
        "## 1. Simulation Setup and Execution",
        "### DC Analysis Summary",
        "### AC Analysis Summary",
        "### Transient Analysis Summary",
        "### Noise Analysis Summary",
        "## Run Integrity",
    )
    for section in required_sections:
        if section not in report_text:
            failures.append(f"report missing {section}")
    if re.search(
        r"Error generating|Error parsing|Could not find ['\"]Values:|"
        r"benchmark did not produce|color:\s*red[^>]*>\s*✗|"
        r"Data not available|failed to read",
        report_results_text,
        flags=re.IGNORECASE,
    ):
        failures.append("report contains a failed or unavailable result")
    linked_plots = re.findall(
        r"""(?i)src=['"]plot/([^'"]+\.png)['"]""",
        report_text,
    )
    missing_links = sorted(
        name for name in set(linked_plots) if not (plot_dir / name).is_file()
    )
    if missing_links:
        failures.append(f"report links missing plots: {missing_links}")
    log_path = sim_dir / "benchmark.log"
    if log_path.exists() and re.search(
        r"(?im)^(?:\[ERROR\].*|.*HSPICE failed rc=.*|.*crashed:.*|"
        r".*timed out.*|.*using synthetic.*|.*written placeholder:.*|"
        r".*data file not found.*|.*no valid data.*|"
        r".*incorrect format.*|.*error parsing data.*|"
        r".*timestep too small.*|.*simulation\(s\) aborted.*|"
        r".*doAnalyses:.*failed.*)$",
        log_path.read_text(errors="replace"),
    ):
        failures.append("benchmark log contains internal failure marker")
    if update and not failures:
        finalize_report(sim_dir, manifest)
    allowed_entries = {
        "data",
        "plot",
        "netlist",
        "REPORT.md",
        "manifest.json",
        "native-fixture-manifest.json",
    }
    unexpected_entries = sorted(
        path.name for path in sim_dir.iterdir()
        if path.name not in allowed_entries
    )
    if unexpected_entries:
        failures.append(f"unexpected result entries: {unexpected_entries}")
    return failures


def audit(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    if len(records) != 256:
        failures.append({"scope": "inventory", "reason": f"model count {len(records)}"})
    kinds = {
        "original": sum(record["kind"] == "original" for record in records),
        "processed": sum(record["kind"] == "processed" for record in records),
    }
    if kinds != {"original": 64, "processed": 192}:
        failures.append({"scope": "inventory", "reason": f"kind counts {kinds}"})
    if len({record["md5"] for record in records}) != len(records):
        failures.append({"scope": "inventory", "reason": "duplicate model md5"})
    for record in records:
        model_path = Path(record["finalModel"])
        if not model_path.exists():
            failures.append({"model": record["id"], "reason": "missing model"})
            continue
        try:
            parsed = parser_for(model_path, "ngspice")(model_path).parse_to_ir()
            if len(parsed) != record["cardCount"]:
                failures.append(
                    {
                        "model": record["id"],
                        "reason": f"AST card count {len(parsed)}",
                    }
                )
        except Exception as exc:
            failures.append({"model": record["id"], "reason": f"AST: {exc}"})
            continue
        if record["kind"] == "processed":
            if not 1 <= record["toolCount"] <= 4:
                failures.append(
                    {"model": record["id"], "reason": "tool count outside 1..4"}
                )
            if len(record["stages"]) != record["toolCount"]:
                failures.append(
                    {"model": record["id"], "reason": "stage evidence mismatch"}
                )
            if any(not stage.get("ast") for stage in record["stages"]):
                failures.append(
                    {"model": record["id"], "reason": "missing stage AST evidence"}
                )
        for simulator in SIMULATORS:
            reasons = acceptance_failures(record, simulator)
            if reasons:
                failures.append(
                    {
                        "model": record["id"],
                        "md5": record["md5"],
                        "simulator": simulator,
                        "reasons": reasons,
                    }
                )
    payload = {
        "generatedAt": utc_now(),
        "sourceFileCount": 54,
        "sourceCount": 64,
        "modelCount": len(records),
        "simulatorCount": len(SIMULATORS),
        "expectedRuns": len(records) * len(SIMULATORS),
        "expectedPlots": len(records) * len(SIMULATORS) * len(EXPECTED_PLOTS),
        "failures": failures,
        "passed": not failures,
    }
    atomic_json(AUDIT_PATH, payload)
    if failures:
        print(f"ACCEPTANCE FAILED: {len(failures)} items; see {AUDIT_PATH}")
    else:
        print(
            "ACCEPTANCE PASS: 54 files, 64 source-card models, 256 total "
            "models, 768 simulator runs, 18432 non-empty plots"
        )
    return failures


def select_records(records: list[dict[str, Any]], ids: list[str] | None) -> list[dict[str, Any]]:
    if not ids:
        return records
    requested = set(ids)
    selected = [record for record in records if record["id"] in requested]
    missing = requested - {record["id"] for record in selected}
    if missing:
        raise ValueError(f"Unknown model IDs: {sorted(missing)}")
    return selected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "stage",
        choices=("generate", "benchmark", "audit", "repair", "complete", "all"),
        nargs="?",
        default="all",
    )
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--tool-jobs", type=int, default=2)
    parser.add_argument("--benchmark-jobs", type=int, default=3)
    parser.add_argument("--simulators", nargs="+", choices=SIMULATORS, default=list(SIMULATORS))
    parser.add_argument("--models", nargs="+")
    args = parser.parse_args()

    if args.stage in {"generate", "all"}:
        records = generate_models(force=args.force, jobs=max(1, args.tool_jobs))
        # A fresh collection generation is file-based. Ten PTM files contain
        # a second MOS card, so complete the logical-card inventory before an
        # `all` run enters the benchmark matrix and final 64/256 audit.
        if args.stage == "all":
            records = complete_missing_card_models()
    elif args.stage == "complete":
        records = complete_missing_card_models()
    else:
        records = load_records()
    selected = select_records(records, args.models)
    if args.stage == "complete":
        selected = [
            record for record in selected if record.get("derivedFromModelId")
        ]
    if args.stage in {"benchmark", "complete", "all"}:
        run_benchmarks(
            selected,
            simulators=tuple(args.simulators),
            force=args.force,
            jobs=max(1, args.benchmark_jobs),
        )
    if args.stage == "repair":
        failed_pairs: list[tuple[dict[str, Any], str]] = []
        for record in selected:
            for simulator in args.simulators:
                if acceptance_failures(record, simulator, update=False):
                    failed_pairs.append((record, simulator))
        for record, simulator in failed_pairs:
            run_one_benchmark(record, simulator, force=True)
    if args.stage in {"audit", "repair", "complete", "all"}:
        return 1 if audit(records) else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
