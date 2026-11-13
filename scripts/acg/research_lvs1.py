#!/usr/bin/env python3
"""Run native GF180 research extracted connectivity on proved MR routed GDS.

This is internal research LVS1, not foundry LVS or DRC certification.
"""
import argparse
import json
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time

import pv

STATUSES = {"PASS", "FAIL", "TOOL_ERROR", "NOT_CHECKED"}
CHECK = "LVS1_EXTRACTED_CONNECTIVITY"


def trusted_files(engine_root):
    root = Path(engine_root).resolve()
    if (root / "proj/autocellgen-MR").is_dir():
        root = root / "proj/autocellgen-MR"
    paths = [root / "scripts/lvs1/run_lvs1.py", root / "scripts/lvs1/extract_connectivity.rb",
             root / "config/lvs1/gf180_research.json"]
    for filename in paths:
        if not filename.is_file() or filename.is_symlink() or root not in filename.resolve().parents:
            raise ValueError("trusted MR research asset missing or unsafe: " + str(filename))
    technology = pv.read_json(paths[2])
    if technology.get("technology") != "gf180-research-connectivity":
        raise ValueError("trusted GF180 research technology required")
    return paths


def dependencies(engine_root):
    paths = trusted_files(engine_root)
    executable = shutil.which("klayout")
    if not executable:
        raise ValueError("KLayout executable is not configured on PATH")
    probe = subprocess.run([executable, "-v"], capture_output=True, text=True, timeout=10)
    if probe.returncode != 0 or "KLayout" not in probe.stdout + probe.stderr:
        raise ValueError("KLayout executable version probe failed")
    return paths


def candidate_inputs(root, candidate, cell_name):
    gds, ledger = pv.verified_candidate(root, candidate, "mr", cell_name)
    if not str(candidate.get("gdsPath", "")).startswith("output/native/") or not str(candidate.get("verificationPath", "")).startswith("output/native/"):
        raise ValueError("research LVS1 requires original native output artifacts")
    if candidate.get("gdsSha256") != pv.digest(gds) or candidate.get("verificationSha256") != pv.digest(ledger):
        raise ValueError("inspected native candidate checksum changed")
    native = pv.read_json(ledger)
    if native.get("cell_name") != cell_name or native.get("hard_gate_pass") is not True:
        raise ValueError("native routed ledger cell or hard gate mismatch")
    if ledger != gds.with_suffix(".verification.json"):
        raise ValueError("routed candidate must use its own native verification sidecar")
    manifest_path = pv.confined(root, pv.relative(root, gds.with_suffix(".lvs1_manifest.json")))
    if candidate.get("lvs1ManifestSha256") != pv.digest(manifest_path):
        raise ValueError("inspected LVS1 manifest checksum changed")
    manifest = pv.read_json(manifest_path)
    if manifest.get("schema_version") not in (1, 2) or manifest.get("technology") != "gf180" or manifest.get("mode") != "routed":
        raise ValueError("native routed GF180 LVS1 manifest required")
    if not isinstance(manifest.get("topcell"), str) or not manifest["topcell"]:
        raise ValueError("native LVS1 manifest must identify its GDS top cell")
    return gds, ledger, manifest_path


def classify(summary, code, timed_out, ledger):
    raw = summary.get("status")
    if timed_out or raw not in STATUSES or summary.get("ledger_error"):
        return "TOOL_ERROR"
    if raw == "TOOL_ERROR":
        return raw
    expected_exit = {"PASS": 0, "FAIL": 2, "NOT_CHECKED": 1}[raw]
    if code != expected_exit or summary.get("pass") is not (raw == "PASS"):
        return "TOOL_ERROR"
    if not summary.get("evidence_hash") or pv.check_status(ledger, CHECK) != raw:
        return "TOOL_ERROR"
    return raw


def run(args):
    root = Path(args.artifacts_root).resolve()
    if not root.is_dir() or args.timeout_seconds < 1:
        raise ValueError("workspace and positive timeout required")
    manifest_path = pv.confined(root, args.manifest)
    config_path = pv.confined(root, args.config)
    manifest = pv.read_json(manifest_path)
    config = pv.read_json(config_path)
    if manifest.get("schemaVersion") != "acg.native.v1" or manifest.get("engine") != "mr" or manifest.get("mode") != "routed" or config.get("tech") != "gf180" or config.get("placement_only") is not False:
        raise ValueError("research LVS1 supports MR routed GF180 only")
    output = pv.confined(root, args.output, exists=False)
    if output.exists():
        raise ValueError("research LVS1 output must be fresh; stale evidence is not reusable")
    cells = manifest.get("cells")
    if not isinstance(cells, list) or not cells:
        raise ValueError("nonempty native cells manifest required")
    prepared, seen = [], set()
    for cell in cells:
        name = cell.get("cellName") if isinstance(cell, dict) else None
        if not isinstance(name, str) or not name or name in seen:
            raise ValueError("cell names must be nonempty and unique")
        seen.add(name)
        candidates = cell.get("routedCandidates")
        if not isinstance(candidates, list):
            raise ValueError("routedCandidates must be a list")
        prepared.append((name, [candidate_inputs(root, candidate, name) for candidate in candidates]))
    driver, extractor, technology = dependencies(args.engine_root)
    output.mkdir(parents=True)
    report = {"schemaVersion": "acg.research-lvs1.v1", "scope": "gf180-research-connectivity",
              "foundryCertification": False, "sourceManifestSha256": pv.digest(manifest_path),
              "configSha256": pv.digest(config_path), "driverSha256": pv.digest(driver),
              "extractorSha256": pv.digest(extractor), "technologySha256": pv.digest(technology),
              "processCompleted": False, "cells": []}
    for cell_index, (name, candidates) in enumerate(prepared):
        record = {"cellName": name, "candidates": [], "evidencePaths": []}
        for index, (gds, native_ledger, lvs1_manifest) in enumerate(candidates):
            directory = output / ("cell-%04d-candidate-%04d" % (cell_index, index))
            directory.mkdir()
            ledger = directory / "verification.json"
            shutil.copyfile(native_ledger, ledger)
            log = directory / "driver.log"
            command = [sys.executable, str(driver), "--gds", str(gds), "--manifest", str(lvs1_manifest),
                       "--tech", str(technology), "--out-dir", str(directory),
                       "--timeout", str(args.timeout_seconds), "--verification-ledger", str(ledger)]
            source_hashes = [(file, pv.digest(file)) for file in (gds, native_ledger, lvs1_manifest)]
            started = time.monotonic()
            code, timed_out = pv.invoke(command, log, args.timeout_seconds + 10)
            summary_path = directory / "lvs1_summary.json"
            summary_valid = summary_path.is_file()
            try:
                summary = pv.read_json(summary_path) if summary_path.is_file() else {}
                merged = pv.read_json(ledger)
                if not isinstance(summary, dict) or not isinstance(merged, dict) or not isinstance(merged.get("layers"), list):
                    raise ValueError("native summary/ledger contract is malformed")
                status = classify(summary, code, timed_out, merged)
            except (ValueError, OSError, json.JSONDecodeError):
                summary, merged, status, summary_valid = {}, {}, "TOOL_ERROR", False
            # Native summaries bind absolute source filenames; all source hashes
            # must also still match the immutable inspect-native snapshot.
            if (summary.get("gds") != str(gds) or summary.get("manifest") != str(lvs1_manifest)
                    or summary.get("technology") != str(technology)
                    or any(pv.digest(file) != expected for file, expected in [
                        (driver, report["driverSha256"]), (extractor, report["extractorSha256"]),
                        (technology, report["technologySha256"])] + source_hashes)):
                status = "TOOL_ERROR"
            if status == "TOOL_ERROR":
                # A completed wrapper error must also close the combined hard
                # gate, even when timeout prevented the native ledger update.
                if not isinstance(merged, dict) or not isinstance(merged.get("layers"), list):
                    merged = pv.read_json(native_ledger)
                layer = next((x for x in merged["layers"] if x.get("id") == "L4"), None)
                if layer is None:
                    layer = {"id": "L4", "name": "GDS_INTEGRITY", "checks": []}
                    merged["layers"].append(layer)
                check = next((x for x in layer["checks"] if x.get("name") == CHECK), None)
                if check is None:
                    check = {"name": CHECK}
                    layer["checks"].append(check)
                check.update(status="TOOL_ERROR", policy="HARD", required_now=True, coverage="NONE",
                             message="Research wrapper could not confirm valid completed native evidence")
                layer.update(status="TOOL_ERROR", policy="HARD", required_now=True, coverage="PARTIAL")
                merged.update(hard_gate_pass=False, overall_status="TOOL_ERROR")
                merged["pass"] = False
                merged["certifications"] = [x for x in merged.get("certifications", []) if not str(x).startswith("RESEARCH_LVS1_VALID@")]
                pv.write_json(ledger, merged)
            paths = [pv.relative(root, p) for p in sorted(directory.rglob("*")) if p.is_file() and not p.is_symlink()]
            item = {"status": status, "exitCode": code, "timedOut": timed_out,
                    "durationSeconds": round(time.monotonic() - started, 3),
                    "gdsPath": pv.relative(root, gds), "gdsSha256": pv.digest(gds),
                    "manifestPath": pv.relative(root, lvs1_manifest), "manifestSha256": pv.digest(lvs1_manifest),
                    "nativeLedgerPath": pv.relative(root, native_ledger), "nativeLedgerSha256": pv.digest(native_ledger),
                    "ledgerPath": pv.relative(root, ledger), "ledgerSha256": pv.digest(ledger),
                    "logPath": pv.relative(root, log),
                    "summaryPath": pv.relative(root, summary_path) if summary_valid else None,
                    "evidenceHash": summary.get("evidence_hash"), "errors": summary.get("errors", []),
                    "combinedHardGatePass": merged.get("hard_gate_pass") is True,
                    "evidencePaths": paths, "evidenceSha256": {p: pv.digest(root / p) for p in paths}}
            record["candidates"].append(item)
            record["evidencePaths"].extend(paths)
        record["status"] = pv.overall([item["status"] for item in record["candidates"]])
        report["cells"].append(record)
        pv.write_json(output / "summary.json", report)
    report["overallStatus"] = pv.overall([cell["status"] for cell in report["cells"]])
    report["processCompleted"] = True
    pv.write_json(output / "summary.json", report)
    print(json.dumps({"summaryPath": pv.relative(root, output / "summary.json"), "overallStatus": report["overallStatus"]}))
    # Completed verification states remain publishable, including TOOL_ERROR.
    # Wrapper/configuration failures or worker cancellation still fail process.
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true", help="Probe native research assets and KLayout; no PDK needed")
    parser.add_argument("--engine-root", required=True)
    parser.add_argument("--manifest")
    parser.add_argument("--config")
    parser.add_argument("--output")
    parser.add_argument("--artifacts-root", default=".")
    parser.add_argument("--timeout-seconds", type=int, default=120)
    args = parser.parse_args()
    signal.signal(signal.SIGTERM, pv.cancelled)
    signal.signal(signal.SIGINT, pv.cancelled)
    try:
        if args.self_test:
            driver, extractor, technology = dependencies(args.engine_root)
            print(json.dumps({"healthy": True, "version": "acg.research-lvs1.v1", "wrapperSha256": pv.digest(Path(__file__)),
                              "dependenciesOnly": True, "foundryCertification": False,
                              "driverSha256": pv.digest(driver), "extractorSha256": pv.digest(extractor),
                              "technologySha256": pv.digest(technology)}))
            return 0
        if not all((args.manifest, args.config, args.output)):
            parser.error("--manifest, --config and --output are required")
        return run(args)
    except (ValueError, OSError, ImportError, json.JSONDecodeError, subprocess.TimeoutExpired) as error:
        print("ACG research LVS1 error: " + str(error), file=sys.stderr)
        return 1
    finally:
        pv.stop_child()


if __name__ == "__main__":
    raise SystemExit(main())
