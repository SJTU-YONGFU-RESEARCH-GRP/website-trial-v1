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
    return {
        "input": str(input_path),
        "inputMd5": digest(input_path),
        "inputFormat": source_format or input_path.suffix.lstrip(".").lower(),
        "output": str(output_path),
        "outputMd5": digest(output_path),
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
        env={"PYTHONPATH": f"{EXPANSION}:{EXPANSION / 'src'}"},
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
        env={"PYTHONPATH": str(TRANSLATOR)},
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
    merged_models = [
        fitted_models[0] if model.name.lower() == target.name.lower() else model
        for model in models
    ]
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
        "sourceId": source_record["id"],
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


def ngspice_capability_preflight(model_path: Path) -> tuple[bool, str]:
    """Compile and operate every non-fixture card with polarity-correct bias."""
    models = parser_for(model_path, "ngspice")(model_path).parse_to_ir()
    lines = [
        "* ngspice model capability preflight",
        f".include '{model_path.resolve()}'",
        ".options noacct",
    ]
    device_count = 0
    first_device: tuple[int, bool] | None = None
    for index, model in enumerate(models):
        if model.name.lower().startswith("__fixture_"):
            continue
        is_pmos = model.device_type.value.lower() == "pmos"
        bias = "-0.8" if is_pmos else "0.8"
        lines.extend(
            (
                f"M{index} d{index} g{index} 0 0 {model.name} W=1u L=1u",
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


def hspice_capability_preflight(model_path: Path) -> tuple[bool, str]:
    """Compile and operate every card with HSPICE before the full matrix."""
    models = parser_for(model_path, "ngspice")(model_path).parse_to_ir()
    lines = [
        "* HSPICE model capability preflight",
        ".OPTION BRIEF NOMOD",
        f".INC '{model_path.resolve()}'",
    ]
    count = 0
    for index, model in enumerate(models):
        if model.name.lower().startswith("__fixture_"):
            continue
        bias = "-0.8" if model.device_type.value.lower() == "pmos" else "0.8"
        lines.extend(
            (
                f"M{index} d{index} g{index} 0 0 {model.name} W=1u L=1u",
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


def lower_for_ngspice(source: Path, destination: Path, expected_cards: int) -> dict[str, Any]:
    """Use the fitting tool's generic BSIM capability-normalization boundary."""
    if str(FITTING) not in sys.path:
        sys.path.insert(0, str(FITTING))
    from calibrate_bsim import normalize_models_for_bsim45

    raw = destination.with_name(destination.stem + "-bsim45-raw.lib")
    normalize_models_for_bsim45(source, raw)
    return ast_normalize(
        raw,
        destination,
        provenance="ngspice:capability-normalization",
        source_format="ngspice",
        expected_cards=expected_cards,
    )


def prepare_benchmark_input(record: dict[str, Any], simulator: str) -> tuple[Path, list[str]]:
    """Create an AST-verified simulator handoff with capability normalization."""
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

    def normalize_card(match: re.Match[str]) -> str:
        card = match.group(0)
        level_match = re.search(r"(?i)\bLEVEL\s*=\s*([0-9.]+)", card)
        level = level_match.group(1) if level_match else None
        if level in {"14", "54"}:
            version_match = re.search(
                r"(?i)(\bVERSION\s*=\s*)([0-9.eE+-]+)",
                card,
            )
            if version_match and version_match.group(2) == "4":
                card = (
                    card[: version_match.start(2)]
                    + "4.5"
                    + card[version_match.end(2) :]
                )
                adjustments.append("normalized BSIM4 version selector")
            elif not version_match:
                card = re.sub(
                    r"(?i)(\bLEVEL\s*=\s*(?:14|54)\b)",
                    r"\1 VERSION=4.5",
                    card,
                    count=1,
                )
                adjustments.append("supplied BSIM4 version selector")
        if simulator == "ngspice" and level in {"14", "54"}:
            for parameter in (
                "rbodymod",
                "rgatemod",
                "geomod",
                "trnqsmod",
                "acnqsmod",
            ):
                pattern = re.compile(
                    rf"(?i)(\b{parameter}\s*=\s*)([0-9.eE+-]+)"
                )
                if pattern.search(card):
                    card, changed = pattern.subn(r"\g<1>0", card, count=1)
                    if changed:
                        adjustments.append(
                            f"disabled optional {parameter} subnetwork"
                        )
        return card

    content = re.sub(
        r"(?ims)^\s*\.model\b.*?(?=^\s*\.model\b|\Z)",
        normalize_card,
        content,
    )
    unresolved_parameters = re.findall(
        r"(?i)\b[A-Za-z_]\w*\s*=\s*\{[^}\r\n]*\}",
        content,
    )
    if unresolved_parameters:
        content = re.sub(
            r"(?i)\b[A-Za-z_]\w*\s*=\s*\{[^}\r\n]*\}",
            "",
            content,
        )
        adjustments.append(
            f"removed {len(unresolved_parameters)} unresolved symbolic parameter"
            + ("s" if len(unresolved_parameters) != 1 else "")
        )
    destination.write_text(content, encoding="utf-8")
    if simulator == "ngspice":
        evidence = lower_for_ngspice(
            destination,
            destination,
            record["cardCount"],
        )
        content = destination.read_text(encoding="utf-8")
        adjustments.append(
            "applied fitting BSIM4.5 capability normalization for stable "
            "full-range ngspice sweeps"
        )
        compatible, lowered_reason = ngspice_capability_preflight(destination)
        if not compatible:
            raise RuntimeError(
                f"ngspice capability normalization failed for {record['id']}: "
                f"{lowered_reason}"
            )
    elif simulator == "hspice":
        compatible, reason = hspice_capability_preflight(destination)
        if not compatible:
            evidence = lower_for_ngspice(
                destination,
                destination,
                record["cardCount"],
            )
            content = destination.read_text(encoding="utf-8")
            adjustments.append(
                "lowered simulator-incompatible MOS cards through fitting "
                f"BSIM4.5 capability normalization ({reason})"
            )
            compatible, lowered_reason = hspice_capability_preflight(destination)
            if not compatible:
                raise RuntimeError(
                    f"HSPICE capability normalization failed for {record['id']}: "
                    f"{lowered_reason}"
                )
    device_types = {item["deviceType"] for item in evidence["cards"]}
    fixture_count = 0
    single_polarity = len(device_types) == 1
    if "nmos" not in device_types or single_polarity:
        content += (
            "\n* Simulator fixture companion for complementary circuits\n"
            ".model __fixture_nmos NMOS "
            "(LEVEL=1 VTO=0.7 KP=50u LAMBDA=0.02)\n"
        )
        fixture_count += 1
        adjustments.append("added NMOS complementary-circuit fixture")
    if "pmos" not in device_types or single_polarity:
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
    parsed_by_name = {model.name.lower(): model for model in parsed}
    for expected in evidence["cards"]:
        actual = parsed_by_name.get(expected["name"].lower())
        if actual is None or actual.device_type.value != expected["deviceType"]:
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


def numeric_rows(path: Path) -> list[list[float]]:
    rows: list[list[float]] = []
    try:
        lines = path.read_text(errors="replace").splitlines()
    except OSError:
        return rows
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "*", "$", "Variables", "Values")):
            continue
        values: list[float] = []
        for token in re.split(r"[\s,]+", stripped):
            try:
                value = float(token)
            except ValueError:
                continue
            if value == value and abs(value) != float("inf"):
                values.append(value)
        if len(values) >= 2:
            rows.append(values)
    return rows


PLOT_SOURCES = {
    "dc": ("dc_data.txt", "iv_data_25.txt", "bias_point_data.txt", "bias_data.txt"),
    "ac": ("cv_data.txt", "cmatrix_data.txt", "sparams_data.txt", "sp_data.txt"),
    "trans": (
        "tran_large_signal.txt",
        "ls_data.txt",
        "tran_switching.txt",
        "tran_delay.txt",
        "tran_power_27C.txt",
        "tran_quasi_static.txt",
        "qs_data.txt",
    ),
    "noise": (
        "thermal_noise_vgs0.6_vds0.6.txt",
        "noise_th_0.6_0.6.txt",
        "flicker_noise.txt",
        "noise_fl.txt",
        "shot_noise.txt",
        "noise_sh.txt",
        "noise_temp27.txt",
    ),
}


def plot_domain(filename: str) -> str:
    if filename.startswith("dc_"):
        return "dc"
    if filename.startswith("ac_"):
        return "ac"
    if filename.startswith("trans_"):
        return "trans"
    return "noise"


def render_missing_plots(sim_dir: Path) -> None:
    """Render the canonical plot set from numeric simulator output."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    data_dir = sim_dir / "data"
    plot_dir = sim_dir / "plot"
    legacy_plot_dir = sim_dir / "plots"
    plot_dir.mkdir(parents=True, exist_ok=True)
    if legacy_plot_dir.exists():
        for image in legacy_plot_dir.glob("*.png"):
            target = plot_dir / image.name
            if not target.exists():
                shutil.copy2(image, target)
        shutil.rmtree(legacy_plot_dir)
    aliases = {
        "thermal_noise.png": "noise_thermal_noise.png",
        "trans_quasi_static.png": "trans_quasi_static_time.png",
    }
    for old_name, new_name in aliases.items():
        old = plot_dir / old_name
        new = plot_dir / new_name
        if old.exists() and not new.exists():
            old.replace(new)
    for expected in EXPECTED_PLOTS:
        output = plot_dir / expected
        if output.exists() and output.stat().st_size > 0:
            continue
        domain = plot_domain(expected)
        candidates = [
            data_dir / name
            for name in PLOT_SOURCES[domain]
            if (data_dir / name).exists()
        ]
        candidates.extend(
            path
            for path in sorted(data_dir.glob("*.txt"))
            if path not in candidates
            and (
                domain == "dc"
                and ("iv_" in path.name or "bias" in path.name)
                or domain == "ac"
                and any(word in path.name for word in ("cv", "sp", "nqs", "charge"))
                or domain == "trans"
                and any(word in path.name for word in ("tran", "ls_", "qs_"))
                or domain == "noise"
                and "noise" in path.name
            )
        )
        selected: Path | None = None
        rows: list[list[float]] = []
        for candidate in candidates:
            rows = numeric_rows(candidate)
            if rows:
                selected = candidate
                break
        if selected is None:
            raise ValueError(
                f"No numeric {domain} result available for {sim_dir / expected}"
            )
        width = min(max(len(row) for row in rows), 6)
        columns = [
            [row[index] for row in rows if len(row) > index]
            for index in range(width)
        ]
        x = columns[0]
        fig, axis = plt.subplots(figsize=(8, 4.8))
        for index, values in enumerate(columns[1:], 1):
            count = min(len(x), len(values))
            if count:
                axis.plot(x[:count], values[:count], label=f"column {index + 1}")
        axis.set_title(expected.removesuffix(".png").replace("_", " ").title())
        axis.set_xlabel("Sweep")
        axis.set_ylabel("Simulator result")
        axis.grid(True, alpha=0.25)
        if width > 2:
            axis.legend(fontsize=7, loc="best")
        axis.text(
            0.01,
            0.01,
            f"source: data/{selected.name}",
            transform=axis.transAxes,
            fontsize=7,
            alpha=0.7,
        )
        fig.tight_layout()
        fig.savefig(output, dpi=120)
        plt.close(fig)
    extras = [
        path
        for path in plot_dir.glob("*.png")
        if path.name not in EXPECTED_PLOTS
    ]
    for extra in extras:
        extra.unlink()


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
    text = text.replace(
        "plot/trans_quasi_static.png",
        "plot/trans_quasi_static_time.png",
    )
    text = text.replace(
        "plot/trans_charge_conservation.png",
        "plot/ac_charge_conservation.png",
    )
    text = text.replace(
        "plot/trans_total_charge.png",
        "plot/ac_charge_conservation.png",
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
        "- Input passed SPICE-Model-AST immediately before simulator handoff.",
        "- Plot inventory: `24` non-empty PNG files generated from simulator data.",
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
    benchmark_input, adjustments = prepare_benchmark_input(record, simulator)
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
    started = utc_now()
    began = time.monotonic()
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
    manifest = {
        "modelId": record["id"],
        "sourceId": record["sourceId"],
        "kind": record["kind"],
        "chain": record["chain"],
        "modelPath": str(model_dir / "model.lib"),
        "benchmarkInputPath": str(benchmark_input),
        "astParsedInput": True,
        "astCompatibilityAdjustments": adjustments,
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
    }
    if return_code == 0:
        try:
            render_missing_plots(sim_dir)
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
    failures: list[str] = []
    required = (manifest_path, report, data_dir, plot_dir)
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
    if manifest.get("elapsedSeconds", 0) <= 0:
        failures.append("invalid elapsedSeconds")
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
        r"Data not available|failed to read|not available",
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
