#!/usr/bin/env python3
"""Run optional, administrator-configured GF180 official PV on verified candidates."""
import argparse
import hashlib
import importlib
import json
import os
import re
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time

STATUSES = {"PASS", "FAIL", "TOOL_ERROR", "UNSUPPORTED", "NOT_CHECKED"}
CHILD = None


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def confined(root, raw, exists=True):
    if not isinstance(raw, str) or not raw or Path(raw).is_absolute():
        raise ValueError("artifact paths must be nonempty workspace-relative paths")
    path = (root / raw).resolve()
    if path == root or root not in path.parents:
        raise ValueError("artifact path escapes workspace")
    if exists and not path.is_file():
        raise ValueError("artifact is not a regular file: " + raw)
    return path


def relative(root, path):
    return path.resolve().relative_to(root).as_posix()


def native_driver(engine_root):
    root = Path(engine_root).resolve()
    if (root / "proj/autocellgen-MR").is_dir():
        root = root / "proj/autocellgen-MR"
    driver = root / "scripts/pv/run_pv.py"
    if not driver.is_file() or driver.is_symlink():
        raise ValueError("trusted MR engine root has no regular scripts/pv/run_pv.py")
    return driver


def dependencies(engine_root):
    driver = native_driver(engine_root)
    for name in ("docopt", "klayout.db", "gdstk"):
        importlib.import_module(name)
    if not shutil.which("klayout"):
        raise ValueError("KLayout executable is not configured on PATH")
    raw = os.environ.get("AUTOCELLGEN_PV_GF180_ROOT")
    if not raw or not Path(raw).is_absolute():
        raise ValueError("administrator must configure absolute AUTOCELLGEN_PV_GF180_ROOT")
    pdk = Path(raw).resolve()
    for part in ("drc", "lvs"):
        directory = pdk / "libs.tech/klayout" / part
        if not (directory / ("run_" + part + ".py")).is_file() or not (directory / "rule_decks").is_dir():
            raise ValueError("configured GF180 official runner/decks missing: " + part)
    return driver


def check_status(ledger, name):
    return next((check.get("status") for layer in ledger.get("layers", [])
                 for check in layer.get("checks", []) if check.get("name") == name), None)


def verified_candidate(root, candidate, engine="mr", cell_name=None):
    if not isinstance(candidate, dict) or candidate.get("routeStatus") != "succeeded":
        raise ValueError("PV requires a successfully routed candidate")
    gds = confined(root, candidate.get("gdsPath"))
    if engine in ("cmos", "dr"):
        evidence = candidate.get("routeEvidence", {})
        if evidence.get("engine") != engine or evidence.get("cellName") != cell_name:
            raise ValueError("native route evidence engine/cell mismatch")
        summary = confined(root, evidence.get("path"))
        if evidence.get("sha256") != digest(summary) or evidence.get("gdsSha256") != digest(gds):
            raise ValueError("native route evidence hash mismatch")
        line = evidence.get("matchedLine")
        if not isinstance(line, str):
            raise ValueError("native routed summary line required")
        active, matches = None, 0
        for current in summary.read_text(encoding="utf-8").splitlines():
            header = re.fullmatch(r"\s*(?:\(\d+\)\s*)?Cell name\s*:\s*(.+?)\s*", current)
            if header:
                active = header.group(1)
            if active == cell_name and current.strip() == line.strip():
                matches += 1
        # New native summaries identify the actual emitted candidate explicitly:
        # display Solution can differ from the underlying sequence-diverse index.
        parts = line.strip().split("; GDS_FILE=")
        if len(parts) > 2:
            raise ValueError("ambiguous native GDS_FILE evidence")
        route_line = parts[0]
        match = re.fullmatch(r"Width (\d+)(?: \(([^()]+) (\d+)\))?, Solution (\d+)(?: \(Cost = [^()]*\))?: (?:M[12] routable(?: \(Usage [^()]+\))?|Routable via auto-widen), Routing time: .+", route_line)
        if matches != 1 or not match:
            raise ValueError("native summary does not prove this cell routed successfully")
        width, tag, pad, solution = match.groups()
        suffix = "_" + tag + pad if tag is not None else ""
        if len(parts) == 2:
            expected = parts[1]
            # Explicit evidence must be a native candidate basename for this
            # exact cell/width; traversal and debug/placement names are excluded.
            pattern = re.escape(cell_name + "_w" + width + "_") + r"\d+" + re.escape(suffix) + r"\.gds"
            if not re.fullmatch(pattern, expected):
                raise ValueError("unsafe or mismatched native GDS_FILE evidence")
        else:
            expected = cell_name + "_w" + width + "_" + solution + suffix + ".gds"
        if gds.name != expected:
            raise ValueError("native routed summary and GDS candidate do not match")
        return gds, None
    if engine != "mr":
        raise ValueError("unsupported native engine")
    ledger_path = confined(root, candidate.get("verificationPath"))
    ledger = read_json(ledger_path)
    if candidate.get("gdsSha256") is not None and candidate["gdsSha256"] != digest(gds) or candidate.get("verificationSha256") is not None and candidate["verificationSha256"] != digest(ledger_path):
        raise ValueError("inspected MR native candidate checksum changed")
    if cell_name is not None and ledger.get("cell_name") is not None and ledger["cell_name"] != cell_name:
        raise ValueError("native verification ledger cell mismatch")
    if ledger.get("schema_version") != 2:
        raise ValueError("native verification ledger must use schema v2")
    if check_status(ledger, "ROUTING_OUTCOME") != "PASS" or check_status(ledger, "GDS_PROJECTION") != "PASS":
        raise ValueError("native routing/GDS evidence does not pass; debug GDS cannot enter PV")
    return gds, ledger_path


def topcell(gds):
    import gdstk
    cells = gdstk.read_gds(str(gds)).top_level()
    if len(cells) != 1:
        raise ValueError("official PV requires exactly one GDS top cell")
    return cells[0].name


def stop_child():
    global CHILD
    if CHILD is not None:
        try:
            os.killpg(CHILD.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            CHILD.wait(timeout=2)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(CHILD.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            CHILD.wait()
        # The leader may exit on TERM while its descendants ignore TERM.
        # Reap the entire remaining group even when wait() already returned.
        try:
            os.killpg(CHILD.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        CHILD = None


def cancelled(signum, frame):
    stop_child()
    raise SystemExit(128 + signum)


def invoke(command, log, timeout):
    global CHILD
    # The wrapper receives the worker process-group signal and forwards it to
    # this isolated group, including official runner/KLayout descendants.
    timed_out = False
    with log.open("wb") as stream:
        CHILD = subprocess.Popen(command, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = CHILD.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            stop_child()
            code = 124
        finally:
            stop_child()
    return code, timed_out


def classify(summary, exit_code, timed_out):
    if timed_out or summary.get("ledger_error") or summary.get("overall_status") == "TOOL_ERROR":
        return "TOOL_ERROR"
    drc, lvs = summary.get("drc", {}), summary.get("lvs", {})
    statuses = [drc.get("status"), lvs.get("status")]
    if any(status not in STATUSES for status in statuses):
        return "TOOL_ERROR"
    if statuses == ["PASS", "PASS"]:
        return "PASS" if exit_code == 0 and summary.get("pass") is True and summary.get("overall_status") == "PASS" else "TOOL_ERROR"
    if "TOOL_ERROR" in statuses or exit_code not in (0, 2):
        return "TOOL_ERROR"
    for status in ("FAIL", "UNSUPPORTED", "NOT_CHECKED"):
        if status in statuses:
            return status
    return "TOOL_ERROR"


def overall(statuses):
    if not statuses:
        return "NOT_CHECKED"
    for status in ("TOOL_ERROR", "FAIL", "UNSUPPORTED", "NOT_CHECKED"):
        if status in statuses:
            return status
    return "PASS"


def run(args):
    root = Path(args.artifacts_root).resolve()
    if not root.is_dir() or args.timeout_seconds < 1:
        raise ValueError("workspace and positive timeout are required")
    manifest_path = confined(root, args.manifest)
    netlist = confined(root, args.netlist)
    output = confined(root, args.output, exists=False)
    if output.exists():
        raise ValueError("PV output must be fresh; stale evidence is not reusable")
    manifest = read_json(manifest_path)
    engine = manifest.get("engine")
    if engine not in ("cmos", "dr", "mr"):
        raise ValueError("native manifest engine must be cmos, dr or mr")
    cells = manifest.get("cells")
    if manifest.get("schemaVersion") != "acg.native.v1" or not isinstance(cells, list) or not cells:
        raise ValueError("nonempty acg.native.v1 cells manifest required")
    prepared, seen = [], set()
    for cell in cells:
        name = cell.get("cellName") if isinstance(cell, dict) else None
        if not isinstance(name, str) or not name or name in seen:
            raise ValueError("cell names must be nonempty and unique")
        seen.add(name)
        candidates = cell.get("routedCandidates")
        if not isinstance(candidates, list):
            raise ValueError("routedCandidates must be a list")
        prepared.append((name, [(candidate, *verified_candidate(root, candidate, engine, name)) for candidate in candidates]))
    driver = dependencies(args.engine_root)
    output.mkdir(parents=True)
    report = {"schemaVersion": "acg.pv.v1", "officialPdk": "gf180", "cells": [],
              "sourceManifestSha256": digest(manifest_path), "netlistSha256": digest(netlist),
              "driverSha256": digest(driver), "processCompleted": False}
    for cell_index, (name, candidates) in enumerate(prepared):
        record = {"cellName": name, "candidates": [], "evidencePaths": []}
        for index, (candidate, gds, native_ledger) in enumerate(candidates):
            directory = output / ("cell-%04d-candidate-%04d" % (cell_index, index))
            directory.mkdir()
            ledger = directory / "verification.json"
            if native_ledger is not None:
                shutil.copyfile(native_ledger, ledger)
            # Without a native ledger, isolate the GDS in the fresh run folder.
            # Native default ledger inference then cannot modify source artifacts,
            # and omitting the flag avoids a nonexistent-ledger TOOL_ERROR.
            driver_gds = gds
            if native_ledger is None:
                driver_gds = directory / gds.name
                shutil.copyfile(gds, driver_gds)
            log = directory / "driver.log"
            command = [sys.executable, str(driver), "--pdk", "gf180", "--gds", str(driver_gds),
                       "--netlist", str(netlist), "--cell", name, "--topcell", topcell(gds),
                       "--run-dir", str(directory), "--checks", "drc,lvs",
                       "--timeout-seconds", str(args.timeout_seconds)]
            if native_ledger is not None:
                command.extend(["--verification-ledger", str(ledger)])
            started = time.monotonic()
            summary_path = directory / "pv_summary.json"
            prerequisite = check_status(read_json(native_ledger), "LVS1_EXTRACTED_CONNECTIVITY") if native_ledger else None
            if prerequisite is not None and prerequisite != "PASS":
                reason = "Required research LVS1 is " + str(prerequisite) + "; official checks were not run"
                log.write_text(reason + "\n", encoding="utf-8")
                summary = {"drc": {"status": "NOT_CHECKED", "message": reason}, "lvs": {"status": "NOT_CHECKED", "message": reason},
                           "overall_status": "NOT_CHECKED", "pass": False, "gds_hash": "sha256:" + digest(gds)}
                write_json(summary_path, summary)
                code, timed_out = 0, False
            else:
                code, timed_out = invoke(command, log, args.timeout_seconds + 10)
                summary = read_json(summary_path) if summary_path.is_file() else {}
            status = classify(summary, code, timed_out)
            if summary.get("gds_hash") != "sha256:" + digest(gds):
                status = "TOOL_ERROR"
            merged = read_json(ledger) if native_ledger is not None and ledger.is_file() else {}
            if status == "PASS" and (not summary.get("deck_hash") or not summary.get("evidence_hash") or (native_ledger is not None and (check_status(merged, "FOUNDRY_DRC") != "PASS" or check_status(merged, "FOUNDRY_LVS") != "PASS"))):
                status = "TOOL_ERROR"
            paths = [relative(root, p) for p in sorted(directory.rglob("*")) if p.is_file() and not p.is_symlink()]
            item = {"status": status, "exitCode": code, "timedOut": timed_out,
                    "durationSeconds": round(time.monotonic() - started, 3),
                    "gdsPath": relative(root, gds), "gdsSha256": digest(gds),
                    "nativeLedgerPath": relative(root, native_ledger) if native_ledger else None, "nativeLedgerSha256": digest(native_ledger) if native_ledger else None,
                    "routeEvidence": candidate.get("routeEvidence"), "combinedLedgerUnavailable": native_ledger is None,
                    "ledgerPath": relative(root, ledger) if native_ledger and ledger.is_file() else None, "ledgerSha256": digest(ledger) if native_ledger and ledger.is_file() else None,
                    "logPath": relative(root, log), "summaryPath": relative(root, summary_path) if summary_path.is_file() else None,
                    "officialDrc": summary.get("drc", {"status": "TOOL_ERROR"}),
                    "officialLvs": summary.get("lvs", {"status": "TOOL_ERROR"}),
                    "combinedHardGatePass": merged.get("hard_gate_pass") is True if native_ledger else None,
                    "deckHash": summary.get("deck_hash"), "evidenceHash": summary.get("evidence_hash"),
                    "evidencePaths": paths, "evidenceSha256": {p: digest(root / p) for p in paths}}
            record["candidates"].append(item)
            record["evidencePaths"].extend(paths)
        record["status"] = overall([item["status"] for item in record["candidates"]])
        # Preserve per-candidate evidence rather than implying one summary is
        # representative of every candidate.
        record["officialDrc"] = {"status": overall([item["officialDrc"].get("status", "TOOL_ERROR") for item in record["candidates"]])}
        record["officialLvs"] = {"status": overall([item["officialLvs"].get("status", "TOOL_ERROR") for item in record["candidates"]])}
        report["cells"].append(record)
        write_json(output / "summary.json", report)
    report["overallStatus"] = overall([cell["status"] for cell in report["cells"]])
    report["processCompleted"] = True
    write_json(output / "summary.json", report)
    print(json.dumps({"summaryPath": relative(root, output / "summary.json"), "overallStatus": report["overallStatus"]}))
    return 1 if report["overallStatus"] == "TOOL_ERROR" else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true", help="Check configured official runners, decks and Python/KLayout dependencies")
    parser.add_argument("--engine-root", required=True)
    parser.add_argument("--manifest")
    parser.add_argument("--netlist")
    parser.add_argument("--output")
    parser.add_argument("--artifacts-root", default=".")
    parser.add_argument("--timeout-seconds", type=int, default=1800)
    args = parser.parse_args()
    signal.signal(signal.SIGTERM, cancelled)
    signal.signal(signal.SIGINT, cancelled)
    try:
        if args.self_test:
            driver = dependencies(args.engine_root)
            print(json.dumps({"healthy": True, "dependenciesOnly": True, "officialPdk": "gf180", "driverSha256": digest(driver), "officialRunnerThreads": 4}))
            return 0
        if not all((args.manifest, args.netlist, args.output)):
            parser.error("--manifest, --netlist and --output are required")
        return run(args)
    except (ValueError, OSError, ImportError, json.JSONDecodeError) as error:
        print("ACG official PV error: " + str(error), file=sys.stderr)
        return 1
    finally:
        stop_child()


if __name__ == "__main__":
    raise SystemExit(main())
