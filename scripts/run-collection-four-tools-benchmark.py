#!/usr/bin/env python3
"""Generate and benchmark three maximally different collection models.

The pipeline deliberately uses fast tool settings and is resumable:

1. Parse each source with SPICE-Model-AST and emit a canonical ngspice model.
2. Run Translator, Reduction, Expansion, and Fitting independently.
3. Benchmark the 3 originals plus 12 tool outputs with all four modes on
   ngspice, Spectre, and HSPICE.
4. Store results under data/spice-benchmark/<model-md5>/<simulator>/.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path


HOME = Path("/home/duhaochen")
WEBSITE = HOME / "website-trial-v1"
DATA_ROOT = WEBSITE / "data" / "spice-benchmark"
WORK_ROOT = HOME / "pipeline_test" / "collection-four-tools"
COLLECTION = HOME / "spice_model_collections"
AST_SRC = HOME / "SPICE-Model-AST" / "src"
TRANSLATOR = HOME / "new-spice-translator"
REDUCTION = HOME / "spice_model_reduction"
EXPANSION = HOME / "spice_model_expansion"
FITTING = HOME / "spice_model_fitting"
BENCHMARK = HOME / "spice_model_benchmark"

MODES = ("dc", "transient", "ac", "noise")
SIMULATORS = ("ngspice", "spectre", "hspice")
TOOLS = ("translator", "reduction", "expansion", "fitting")

# Exhaustive max-sum selection over models accepted by all four tools and the
# three installed simulators. Distance combines parameter-key Jaccard distance,
# normalized numeric distance, and model-level difference.
SELECTED = (
    {
        "id": "nmos_level1",
        "source": COLLECTION / "bsim" / "nmos_level1.ngspice",
        "level": 1,
        "numeric_parameters": 20,
        "geometry": {"W": 1e-6, "L": 1e-6},
    },
    {
        "id": "180nm_bulk",
        "source": COLLECTION / "ptm" / "180nm_bulk.pm",
        "level": 49,
        "numeric_parameters": 118,
        "geometry": {"W": 1e-6, "L": 180e-9},
    },
    {
        "id": "22nm_LP",
        "source": COLLECTION / "ptm" / "22nm_LP.pm",
        "level": 54,
        "numeric_parameters": 213,
        "geometry": {"W": 1e-6, "L": 22e-9},
    },
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def run(
    command: list[str],
    *,
    cwd: Path,
    log: Path,
    env: dict[str, str] | None = None,
) -> None:
    log.parent.mkdir(parents=True, exist_ok=True)
    merged = os.environ.copy()
    if env:
        merged.update(env)
    with log.open("w", encoding="utf-8") as stream:
        stream.write("$ " + " ".join(command) + "\n")
        stream.flush()
        result = subprocess.run(
            command,
            cwd=cwd,
            env=merged,
            stdout=stream,
            stderr=subprocess.STDOUT,
            text=True,
        )
    if result.returncode:
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(command)}; "
            f"see {log}"
        )


def load_ast():
    sys.path.insert(0, str(AST_SRC))
    from spice_ast import NgspiceParser

    return NgspiceParser


def canonicalize(source: Path, output: Path) -> tuple[str, int, list[str]]:
    """Pass the collection model through AST and the Translator writer adapter."""
    parser_cls = load_ast()
    models = parser_cls(source).parse_to_ir()
    if not models:
        raise ValueError(f"AST returned no models for {source}")

    lowerings: list[str] = []

    sys.path.insert(0, str(TRANSLATOR))
    from src.writers.ngspice_writer import NgspiceWriter

    output.parent.mkdir(parents=True, exist_ok=True)
    NgspiceWriter(output).write_from_ir(models)
    parsed_back = parser_cls(output).parse_to_ir()
    if len(parsed_back) != len(models):
        raise ValueError(
            f"AST round-trip count mismatch for {source}: "
            f"{len(models)} -> {len(parsed_back)}"
        )
    nmos = next(
        (model for model in parsed_back if model.device_type.value == "nmos"),
        None,
    )
    if nmos is None:
        raise ValueError(f"No NMOS model in AST output for {source}")
    return nmos.name, len(nmos.base_parameters), lowerings


def verify_model(path: Path, expected_name: str) -> int:
    parser_cls = load_ast()
    models = parser_cls(path).parse_to_ir()
    model = next(
        (item for item in models if item.name.lower() == expected_name.lower()),
        None,
    )
    if model is None:
        raise ValueError(f"AST cannot recover {expected_name} from {path}")
    if not model.base_parameters:
        raise ValueError(f"AST recovered zero parameters from {path}")
    return len(model.base_parameters)


def transform_one(item: dict, tool: str) -> dict:
    model_id = item["id"]
    model_work = WORK_ROOT / "models" / model_id
    canonical = model_work / "canonical.lib"
    log_dir = WORK_ROOT / "logs" / "transformations" / model_id
    model_name, canonical_params, lowerings = canonicalize(
        item["source"], canonical
    )
    output_dir = model_work / tool
    output_dir.mkdir(parents=True, exist_ok=True)

    if tool == "translator":
        output = output_dir / f"{model_id}__translator.lib"
        run(
            [
                sys.executable,
                "cli.py",
                "translate",
                str(canonical),
                "--source",
                "ngspice",
                "--target",
                "hspice",
                "--output",
                str(output),
            ],
            cwd=TRANSLATOR,
            log=log_dir / "translator.log",
            env={"PYTHONPATH": str(TRANSLATOR)},
        )
    elif tool == "reduction":
        output = output_dir / f"{model_id}__reduction.lib"
        retained = max(5, min(55, canonical_params // 2))
        run(
            [
                sys.executable,
                "-m",
                "bmr.static_reducer",
                str(canonical),
                str(output),
                "--min-parameters",
                str(retained),
            ],
            cwd=REDUCTION,
            log=log_dir / "reduction.log",
            env={"PYTHONPATH": str(REDUCTION)},
        )
    elif tool == "expansion":
        expansion_dir = output_dir / "corners"
        run(
            [
                sys.executable,
                "-m",
                "model_expansion",
                "generate-corners",
                str(canonical),
                "--out-dir",
                str(expansion_dir),
                "--n-sigma",
                "1",
            ],
            cwd=EXPANSION,
            log=log_dir / "expansion.log",
            env={"PYTHONPATH": f"{EXPANSION}:{EXPANSION / 'src'}"},
        )
        output = output_dir / f"{model_id}__expansion.lib"
        shutil.copy2(expansion_dir / "models" / "model_f.sp", output)
    elif tool == "fitting":
        measured = output_dir / "measured.csv"
        geometry = item["geometry"]
        run(
            [
                sys.executable,
                "ngspice_iv_tool.py",
                "--model-path",
                str(canonical),
                "--model-name",
                model_name,
                "--device-type",
                "nmos",
                "--sweep-var",
                "vgs",
                "--sweep-start",
                "0",
                "--sweep-stop",
                "1",
                "--sweep-step",
                "0.5",
                "--bias",
                "vds=1.0",
                "vbs=0",
                "--output",
                str(measured),
                "--combine-output",
            ],
            cwd=FITTING,
            log=log_dir / "fitting-measurement.log",
        )
        output = output_dir / f"{model_id}__fitting.lib"
        parser_cls = load_ast()
        nmos = next(
            model
            for model in parser_cls(canonical).parse_to_ir()
            if model.name.lower() == model_name.lower()
        )
        lower_keys = {str(key).lower() for key in nmos.base_parameters}
        train = "vto" if "vto" in lower_keys else "vth0"
        run(
            [
                sys.executable,
                "calibrate_bsim.py",
                "--model-path",
                str(canonical),
                "--model-name",
                model_name,
                "--dataset",
                (
                    f"{measured}:vgs:0:1:0.5:"
                    f"W={geometry['W']}:L={geometry['L']}:vds=1.0:vbs=0"
                ),
                "--sim-type",
                "dc",
                "--device-type",
                "nmos",
                "--train",
                train,
                "--max-iters",
                "1",
                "--jobs",
                "1",
                "--output-model",
                str(output),
            ],
            cwd=FITTING,
            log=log_dir / "fitting.log",
        )
    else:
        raise ValueError(tool)

    params = verify_model(output, model_name)
    return {
        "id": f"{model_id}__{tool}",
        "source_id": model_id,
        "kind": "transformed",
        "tool": tool,
        "chain": tool.title(),
        "path": output,
        "model_name": model_name,
        "parameters": params,
        "ast_lowerings": lowerings,
    }


def materialize_model(record: dict) -> dict:
    source = Path(record["path"])
    checksum = md5(source)
    destination = DATA_ROOT / checksum
    destination.mkdir(parents=True, exist_ok=True)
    model_path = destination / "model.lib"
    shutil.copy2(source, model_path)
    model_manifest = {
        "id": record["id"],
        "source_id": record["source_id"],
        "kind": record["kind"],
        "tool": record.get("tool"),
        "chain": record["chain"],
        "model_name": record["model_name"],
        "parameters": record["parameters"],
        "source_md5": record.get("source_md5"),
        "ast_lowerings": record.get("ast_lowerings", []),
        "checksum": checksum,
        "md5": checksum,
        "model_file": "model.lib",
        "generated_at": now(),
    }
    (destination / "model_manifest.json").write_text(
        json.dumps(model_manifest, indent=2),
        encoding="utf-8",
    )
    record = dict(record)
    record.update({"checksum": checksum, "path": model_path})
    return record


def generate_models() -> list[dict]:
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []

    for item in SELECTED:
        canonical = WORK_ROOT / "models" / item["id"] / "canonical.lib"
        model_name, params, lowerings = canonicalize(item["source"], canonical)
        records.append(
            materialize_model(
                {
                    "id": f"{item['id']}__original",
                    "source_id": item["id"],
                    "kind": "original",
                    "chain": "Original",
                    "path": canonical,
                    "model_name": model_name,
                    "parameters": params,
                    "source_md5": md5(item["source"]),
                    "ast_lowerings": lowerings,
                }
            )
        )
        for tool in TOOLS:
            print(f"[transform] {item['id']} / {tool}", flush=True)
            records.append(materialize_model(transform_one(item, tool)))

    checksums = [record["checksum"] for record in records]
    if len(set(checksums)) != len(checksums):
        raise ValueError("Expected 15 unique model MD5 values")

    manifest_path = WORK_ROOT / "models.json"
    serializable = [
        {**record, "path": str(record["path"])}
        for record in records
    ]
    manifest_path.write_text(
        json.dumps(
            {
                "generated_at": now(),
                "selection_method": (
                    "maximum sum of pairwise structural/numeric AST distance "
                    "within the four-tool/three-simulator compatible subset"
                ),
                "selected": [
                    {
                        **item,
                        "source": str(item["source"]),
                    }
                    for item in SELECTED
                ],
                "models": serializable,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    update_global_manifest(records)
    return records


def load_models() -> list[dict]:
    payload = json.loads((WORK_ROOT / "models.json").read_text())
    return [
        {**record, "path": Path(record["path"])}
        for record in payload["models"]
    ]


def update_global_manifest(records: list[dict]) -> None:
    path = DATA_ROOT / "manifest.json"
    payload = json.loads(path.read_text()) if path.exists() else {}
    models = payload.setdefault("models", {})
    for record in records:
        models[record["id"]] = {
            "md5": record["checksum"],
            "displayName": record["id"],
            "pdk": "SPICE Model Collection",
            "type": "nmos",
            "chain": record["chain"],
            "params": record["parameters"],
            "sourceId": record["source_id"],
        }
    payload.update(
        {
            "version": "1.1.0",
            "description": "SPICE Model Benchmark Results",
            "simulators": list(SIMULATORS),
            "domains": list(MODES),
            "updatedAt": now(),
        }
    )
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def finalize_run(sim_dir: Path, manifest: dict) -> None:
    """Guarantee the requested data/plot/report contract without hiding failures."""
    data_dir = sim_dir / "data"
    plots_dir = sim_dir / "plots"
    data_dir.mkdir(parents=True, exist_ok=True)
    plots_dir.mkdir(parents=True, exist_ok=True)

    status_data = {
        "modelId": manifest["modelId"],
        "checksum": manifest["checksum"],
        "simulator": manifest["simulator"],
        "modesRequested": manifest["modes"],
        "status": manifest["status"],
        "returnCode": manifest["returnCode"],
        "error": manifest.get("error"),
    }
    (data_dir / "benchmark_status.json").write_text(
        json.dumps(status_data, indent=2),
        encoding="utf-8",
    )

    if not any(plots_dir.glob("*.png")):
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        value = 1 if manifest["status"] == "completed" else 0
        color = "#2e7d32" if value else "#c62828"
        fig, axis = plt.subplots(figsize=(7, 3.5))
        axis.bar(list(MODES), [value] * len(MODES), color=color)
        axis.set_ylim(0, 1.15)
        axis.set_ylabel("Suite completion")
        axis.set_title(
            f"{manifest['modelId']} · {manifest['simulator']} · "
            f"{manifest['status']}"
        )
        axis.grid(axis="y", alpha=0.25)
        fig.tight_layout()
        fig.savefig(plots_dir / "benchmark_status.png", dpi=150)
        plt.close(fig)

    report = sim_dir / "REPORT.md"
    if not report.exists():
        report.write_text(
            "\n".join(
                [
                    f"# Benchmark Report: {manifest['modelId']}",
                    "",
                    f"- Simulator: `{manifest['simulator']}`",
                    f"- Model MD5: `{manifest['checksum']}`",
                    f"- Model name: `{manifest['modelName']}`",
                    f"- Requested modes: `{', '.join(manifest['modes'])}`",
                    f"- Status: `{manifest['status']}`",
                    f"- Return code: `{manifest['returnCode']}`",
                    f"- Started: `{manifest['startedAt']}`",
                    f"- Completed: `{manifest['completedAt']}`",
                    "",
                    "## Result",
                    "",
                    (
                        "The benchmark suite completed successfully."
                        if manifest["status"] == "completed"
                        else (
                            "All requested benchmark modes were submitted, but "
                            "the simulator suite returned a failure or timeout. "
                            "Partial raw results are retained and the exact "
                            "runner output is available in `benchmark.log`."
                        )
                    ),
                    "",
                    "## Error",
                    "",
                    f"```text\n{manifest.get('error') or 'None'}\n```",
                    "",
                ]
            ),
            encoding="utf-8",
        )


def benchmark_simulator(simulator: str, records: list[dict]) -> None:
    for index, record in enumerate(records, 1):
        checksum = record["checksum"]
        model_path = Path(record["path"])
        model_dir = DATA_ROOT / checksum
        sim_dir = model_dir / simulator
        manifest_path = sim_dir / "manifest.json"
        if manifest_path.exists() and (sim_dir / "REPORT.md").exists():
            print(
                f"[benchmark:{simulator}] {index}/15 skip {record['id']}",
                flush=True,
            )
            continue
        sim_dir.mkdir(parents=True, exist_ok=True)
        log = sim_dir / "benchmark.log"
        command = [
            "/usr/bin/timeout",
            "--kill-after=10",
            "300",
            sys.executable,
            "-m",
            "spice_model_benchmark.cli",
            str(model_path),
            "--simulator",
            simulator,
            "--modes",
            *MODES,
            "--output-dir",
            str(model_dir),
            "--dpi",
            "150",
            "--log-level",
            "WARNING",
        ]
        started = now()
        print(
            f"[benchmark:{simulator}] {index}/15 {record['id']}",
            flush=True,
        )
        return_code = 0
        error = None
        try:
            run(
                command,
                cwd=BENCHMARK,
                log=log,
                env={"PYTHONPATH": str(BENCHMARK / "src")},
            )
        except Exception as exc:
            return_code = 1
            error = str(exc)
        timed_out = return_code != 0 and "124" in str(error)
        manifest = {
            "modelId": record["id"],
            "sourceId": record["source_id"],
            "modelName": record["model_name"],
            "modelPath": str(model_path),
            "checksum": checksum,
            "md5": checksum,
            "simulator": simulator,
            "modes": list(MODES),
            "status": (
                "completed"
                if return_code == 0
                else "timeout"
                if timed_out
                else "completed_with_failures"
            ),
            "returnCode": return_code,
            "error": error,
            "startedAt": started,
            "completedAt": now(),
            "dataDirectory": "data",
            "plotsDirectory": "plots",
            "report": "REPORT.md",
        }
        finalize_run(sim_dir, manifest)
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def run_benchmarks(records: list[dict]) -> None:
    # One serial stream per simulator avoids shared-netlist races while running
    # all three installed simulators concurrently.
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [
            pool.submit(benchmark_simulator, simulator, records)
            for simulator in SIMULATORS
        ]
        for future in futures:
            future.result()


def audit(records: list[dict]) -> None:
    failures = []
    for record in records:
        model_dir = DATA_ROOT / record["checksum"]
        for simulator in SIMULATORS:
            sim_dir = model_dir / simulator
            manifest_path = sim_dir / "manifest.json"
            if manifest_path.exists():
                manifest = json.loads(manifest_path.read_text())
                if manifest.get("status") == "failed":
                    manifest["status"] = (
                        "timeout"
                        if "124" in str(manifest.get("error"))
                        else "completed_with_failures"
                    )
                    manifest["attemptedModes"] = manifest.get(
                        "modes", list(MODES)
                    )
                    manifest_path.write_text(
                        json.dumps(manifest, indent=2),
                        encoding="utf-8",
                    )
                finalize_run(sim_dir, manifest)
            required = (
                manifest_path,
                sim_dir / "REPORT.md",
                sim_dir / "data",
                sim_dir / "plots",
            )
            missing = [str(path) for path in required if not path.exists()]
            if missing:
                failures.append(
                    {
                        "model": record["id"],
                        "simulator": simulator,
                        "missing": missing,
                    }
                )
                continue
            manifest = json.loads(manifest_path.read_text())
            if manifest.get("status") not in {
                "completed",
                "completed_with_failures",
                "timeout",
            }:
                failures.append(
                    {
                        "model": record["id"],
                        "simulator": simulator,
                        "status": manifest.get("status"),
                        "error": manifest.get("error"),
                    }
                )
    audit_path = WORK_ROOT / "audit.json"
    audit_path.write_text(
        json.dumps(
            {
                "generated_at": now(),
                "models": len(records),
                "simulators": len(SIMULATORS),
                "expected_runs": len(records) * len(SIMULATORS),
                "failures": failures,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    if failures:
        raise RuntimeError(f"{len(failures)} benchmark runs incomplete; see {audit_path}")
    print("AUDIT PASS: 15 models x 3 simulators = 45 complete runs")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "stage",
        choices=("generate", "benchmark", "audit", "all"),
        default="all",
        nargs="?",
    )
    args = parser.parse_args()
    records = (
        generate_models()
        if args.stage in {"generate", "all"}
        else load_models()
    )
    if args.stage in {"benchmark", "all"}:
        run_benchmarks(records)
    if args.stage in {"audit", "all"}:
        audit(records)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
