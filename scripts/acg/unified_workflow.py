#!/usr/bin/env python3
"""Job-confined unified ACG stages; native files and executable are never modified."""
from __future__ import annotations
import argparse
import contextlib
from concurrent.futures import ThreadPoolExecutor
import io
import json
import math
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
import threading
from types import SimpleNamespace

import research_workflow as legacy

VERSION = "acg.unified-stage.v1"
REQUEST_VERSION = "acg.unified-request.v1"
STAGES = {"comparison", "search", "report"}


def changes(base, effective):
    return {key: {"source": base.get(key), "effective": effective.get(key)}
            for key in sorted(set(base) | set(effective))
            if base.get(key) != effective.get(key)}


def bounded_int(value, label, maximum, minimum=1):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"{label} must be {minimum}..{maximum}")
    return value


def split_netlist(source: Path, cells: list[str], destination: Path):
    """Keep every global line in its original position; omit only other cell blocks."""
    text = source.read_text(encoding="utf-8", errors="strict")
    lines = text.splitlines(keepends=True)
    blocks = {}
    current = None
    start = None
    for index, line in enumerate(lines):
        stripped = line.strip()
        if re.match(r"^\.(include|inc|lib)\b", stripped, re.I):
            raise ValueError("external include/library must be frozen and flattened before unified stages")
        if re.match(r"^\.subckt\b", stripped, re.I):
            if current is not None:
                raise ValueError("nested subcircuit")
            parts = stripped.split()
            if len(parts) < 2:
                raise ValueError("subcircuit missing name")
            current = legacy.tag(parts[1])
            if current.casefold() in {name.casefold() for name in blocks}:
                raise ValueError("duplicate subcircuit")
            start = index
        elif re.match(r"^\.ends\b", stripped, re.I):
            if current is None:
                raise ValueError("unmatched .ends")
            parts = stripped.split()
            if len(parts) > 1 and parts[1].casefold() != current.casefold():
                raise ValueError(".ends name differs")
            blocks[current] = (start, index + 1)
            current = None
    if current is not None:
        raise ValueError("unterminated subcircuit")
    if set(blocks) != set(cells) or len(set(cells)) != len(cells):
        raise ValueError("uploaded subcircuit names differ from frozen cellNames")
    model_types = {}
    logical = []
    for line in lines:
        s = line.strip()
        if s.startswith("+") and logical:
            logical[-1] += " " + s[1:]
        else:
            logical.append(s)
    for line in logical:
        tokens = line.split()
        if len(tokens) >= 3 and tokens[0].lower() == ".model":
            kind = tokens[2].lower()
            if kind in {"nmos", "pmos", "nfet", "pfet"}:
                model_types[tokens[1].casefold()] = "n" if kind.startswith("n") else "p"
    all_ranges = list(blocks.values())
    destination.mkdir(parents=True, exist_ok=True)
    result = {}
    for name, (a, b) in blocks.items():
        body = []
        for line in lines[a + 1:b - 1]:
            s = line.strip()
            if s.startswith("+") and body:
                body[-1] += " " + s[1:]
            else:
                body.append(s)
        count = 0
        for s in body:
            if not s or s.startswith(("*", ";")):
                continue
            if s.startswith("."):
                if s.split()[0].lower() not in {".param", ".params", ".model"}:
                    raise ValueError(f"unsupported directive inside {name}: {s.split()[0]}")
                continue
            tokens = s.split("$", 1)[0].split()
            if len(tokens) < 6 or tokens[0][0].lower() not in {"m", "x"}:
                raise ValueError(f"unsupported non-MOS record in {name}")
            model = tokens[5].casefold()
            recognized = model in model_types or any(x in model for x in ("nmos", "pmos", "nfet", "pfet", "nch", "pch"))
            if not recognized or model in {x.casefold() for x in blocks}:
                raise ValueError(f"hierarchical or unrecognized MOS model in {name}: {tokens[5]}")
            count += 1
        if count == 0:
            raise ValueError(f"empty MOS cell: {name}")
        selected = "".join(line for index, line in enumerate(lines)
                           if not any(x <= index < y for x, y in all_ranges if (x, y) != (a, b)))
        path = destination / f"{name}.sp"
        path.write_text(selected, encoding="utf-8")
        result[name] = {"path": path, "transistors": count,
                        "sourceSha256": legacy.digest(source),
                        "splitSha256": legacy.digest(path)}
    return result


def descendants(pid):
    parents = {}
    for entry in Path("/proc").iterdir():
        if not entry.name.isdigit():
            continue
        try:
            # comm can contain spaces and ')' characters.
            rest = (entry / "stat").read_text().rsplit(")", 1)[1].split()
            parents[int(entry.name)] = int(rest[1])
        except (OSError, ValueError, IndexError):
            continue
    found = {pid}
    for _ in range(len(parents) + 1):
        more = {child for child, parent in parents.items() if parent in found}
        if more <= found:
            break
        found |= more
    return found


def terminate_tree(process, known=None):
    targets = descendants(process.pid) | (known or set())
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for pid in sorted(targets, reverse=True):
            try:
                os.kill(pid, sig)
            except ProcessLookupError:
                pass
        if sig == signal.SIGTERM:
            time.sleep(0.15)
    process.wait()


class CapturedChildren:
    """Children inherit worker process group; timeout also terminates descendants."""
    TimeoutExpired = subprocess.TimeoutExpired
    output_limit_bytes = 16 * 1024 * 1024
    parser_tail_bytes = 2 * 1024 * 1024

    def __init__(self, native_root, deadline=None):
        self.root = native_root.resolve()
        self.deadline = deadline

    def __getattr__(self, name):
        return getattr(subprocess, name)

    def run(self, command, **kwargs):
        output = Path(command[command.index("--output") + 1]).resolve()
        if not output.is_relative_to(self.root):
            raise ValueError("child output escapes stage")
        output.mkdir(parents=True, exist_ok=True)
        timeout = float(kwargs.pop("timeout"))
        if self.deadline is not None:
            timeout = min(timeout, max(0.001, self.deadline - time.monotonic()))
        kwargs.pop("capture_output", None)
        text = kwargs.pop("text", False)
        # Disk streams are bounded; parser tails cannot grow with native verbosity.
        output_cap = self.output_limit_bytes
        tail_cap = self.parser_tail_bytes
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs)
        pid, pgid = process.pid, os.getpgid(process.pid)
        exceeded = threading.Event()
        guard = threading.Lock()
        total = 0
        tails = {"stdout": bytearray(), "stderr": bytearray()}
        sizes = {"stdout": 0, "stderr": 0}
        errors = []

        def stream(pipe, name):
            nonlocal total
            try:
                with (output / f"autocell.{name}.log").open("wb") as file:
                    while True:
                        chunk = pipe.read1(65536)
                        if not chunk:
                            break
                        with guard:
                            allowed = max(0, min(len(chunk), output_cap - total))
                            total += allowed
                            if allowed < len(chunk):
                                exceeded.set()
                        retained = chunk[:allowed]
                        file.write(retained)
                        sizes[name] += len(retained)
                        tails[name].extend(retained)
                        if len(tails[name]) > tail_cap:
                            del tails[name][:-tail_cap]
            except OSError as exc:
                errors.append(str(exc))
                exceeded.set()
            finally:
                pipe.close()

        readers = [threading.Thread(target=stream, args=(process.stdout, "stdout"), daemon=True),
                   threading.Thread(target=stream, args=(process.stderr, "stderr"), daemon=True)]
        for reader in readers:
            reader.start()
        deadline = time.monotonic() + timeout
        timed_out = False
        owned = {process.pid}
        while process.poll() is None:
            owned |= descendants(process.pid)
            if exceeded.is_set() or time.monotonic() >= deadline:
                timed_out = not exceeded.is_set()
                terminate_tree(process, owned)
                break
            try:
                process.wait(timeout=min(0.05, max(0.001, deadline - time.monotonic())))
            except subprocess.TimeoutExpired:
                pass
        for reader in readers:
            reader.join(timeout=1)
        # A detached grandchild holding a pipe must not keep a completed wrapper alive.
        if any(reader.is_alive() for reader in readers):
            terminate_tree(process, owned)
            for reader in readers:
                reader.join(timeout=1)
            if any(reader.is_alive() for reader in readers):
                raise ValueError("native descendant retained capture pipe after process exit")
        if errors:
            raise OSError("native output capture failed: " + errors[0])
        stdout, stderr = bytes(tails["stdout"]), bytes(tails["stderr"])
        if text:
            stdout, stderr = stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace")
        code = 124 if timed_out else 125 if exceeded.is_set() else process.returncode
        legacy.write_json(output / "child-process.json", {
            "argv": command, "cwd": kwargs.get("cwd"), "pid": pid, "pgid": pgid,
            "timeoutSeconds": timeout, "returnCode": code,
            "timedOut": timed_out, "outputLimitExceeded": exceeded.is_set(),
            "outputLimitBytes": output_cap, "retainedStreamBytes": sizes,
            "parserTailBytes": tail_cap, "parserTailTruncated": any(v > tail_cap for v in sizes.values()),
            "inheritsWorkerProcessGroup": True})
        if timed_out:
            raise subprocess.TimeoutExpired(command, timeout, output=stdout, stderr=stderr)
        return subprocess.CompletedProcess(command, code, stdout, stderr)


def scientific_evidence(directory):
    ledgers = []
    for path in sorted(directory.rglob("*.verification.json")):
        try:
            value = legacy.read_json(path)
        except (ValueError, OSError):
            ledgers.append({"path": str(path.relative_to(directory)), "sha256": legacy.digest(path), "parseError": "INVALID_NATIVE_JSON"})
            continue
        ledgers.append({"path": str(path.relative_to(directory)), "sha256": legacy.digest(path),
                        "schemaVersion": value.get("schema_version"), "status": value.get("status"),
                        "milestones": value.get("milestones"), "gates": value.get("gates")})
    routing = []
    for path in sorted(directory.rglob("*.routing.json")):
        try:
            value = legacy.read_json(path)
        except (ValueError, OSError):
            routing.append({"path": str(path.relative_to(directory)), "sha256": legacy.digest(path), "parseError": "INVALID_NATIVE_JSON"})
            continue
        routing.append({"path": str(path.relative_to(directory)), "sha256": legacy.digest(path),
                        "outcome": value.get("outcome"), "status": value.get("status"),
                        "routing": value.get("routing"), "verification": value.get("verification")})
    gds = [{"path": str(p.relative_to(directory)), "sha256": legacy.digest(p)}
           for p in sorted(directory.rglob("*.gds"))]
    return {"verificationLedgers": ledgers, "routingReports": routing, "gds": gds,
            "layoutValidity": "NOT_ESTABLISHED_BY_METRICS"}


def validate_settings(request, base=None):
    if request.get("schemaVersion") != REQUEST_VERSION or request.get("engine") not in {"cmos", "mr", "dr"}:
        raise ValueError("unsupported unified request")
    cells = request.get("cellNames")
    if not isinstance(cells, list) or not 1 <= len(cells) <= 256:
        raise ValueError("cellNames must contain 1..256 cells")
    for name in cells:
        legacy.tag(name)
    comp = request.get("comparison", {})
    unsupported_comparison = request["engine"] == "dr" or base is not None and str(base.get("tech", "")).lower() != "gf180"
    algos = comp.get("algorithms")
    if not isinstance(algos, list) or not (0 if unsupported_comparison else 1) <= len(algos) <= 32 or len(set(algos)) != len(algos):
        raise ValueError("comparison algorithms must be unique")
    for algo in algos:
        legacy.tag(algo)
    bounded_int(comp.get("trials"), "trials", 10)
    bounded_int(comp.get("threads"), "threads", 4)
    bounded_int(comp.get("maxCols"), "maxCols", 32, 4)
    bounded_int(comp.get("timeoutSeconds"), "comparison timeoutSeconds", 86400)
    bounded_int(comp.get("totalTimeoutSeconds"), "comparison totalTimeoutSeconds", 86400000, 0 if unsupported_comparison else 1)
    rows = comp.get("rowCounts")
    if not isinstance(rows, list) or not rows or len(set(rows)) != len(rows):
        raise ValueError("rowCounts must be unique")
    for row in rows:
        bounded_int(row, "rowCount", 4)
    if len(cells) * len(algos) * len(rows) * comp["trials"] > 1000:
        raise ValueError("comparison exceeds 1000 trials")
    search = request.get("search", {})
    bounded_int(search.get("maxAttempts"), "search maxAttempts", 100)
    bounded_int(search.get("totalTimeoutSeconds"), "search totalTimeoutSeconds", 86400)
    bounded_int(search.get("attemptTimeoutSeconds"), "search attemptTimeoutSeconds", 3600)
    tracks = search.get("tracks")
    extras = search.get("extraCpp")
    for values, label, lo, hi in [(tracks, "tracks", 5, 16), (extras, "extraCpp", 0, 16)]:
        if not isinstance(values, list) or not values or values != sorted(set(values)):
            raise ValueError(f"{label} must be ascending and unique")
        for value in values:
            bounded_int(value, label, hi, lo)
    return request


def trusted_resources(request, root, stage):
    resources = request["trustedResources"]
    native = Path(resources["nativeRoot"])
    if not native.is_absolute():
        raise ValueError("nativeRoot must be absolute")
    project_name = {"cmos": "autocellgen-cmos", "mr": "autocellgen-MR", "dr": "autocellgen-DR"}[request["engine"]]
    project = native if native.name == project_name else native / "proj" / project_name
    executable = Path(resources["executable"])
    if not executable.is_absolute() or legacy.digest(executable) != resources["executableSha256"]:
        raise ValueError("native executable checksum mismatch")
    needed = (["benchmark_runner.py", "benchmark_report.py"] if stage == "comparison" and request["engine"] != "dr"
              else ["build_known_feasible_corpus.py", "benchmark_report.py"] if stage == "search" and request["engine"] == "mr" else [])
    expected = resources.get("scriptSha256", {})
    for name in needed:
        actual = legacy.digest(project / "scripts" / name)
        candidates = [value for key, value in expected.items() if Path(key).name == name]
        if not candidates or any(actual != value for value in candidates):
            raise ValueError(f"native script checksum mismatch: {name}")
    workspace = root / "work" / f"unified-{stage}" / "project"
    runtime = {}
    if needed:
        for name in ("ascii_to_gds_gdstk.py", "gds_merge_all_layers_klayout.rb"):
            source = project / "scripts" / name
            if source.is_file():
                runtime[str(source)] = (source, Path("scripts") / name)
        for ancestor in [project, *project.parents]:
            source = ancestor / "bin/ascii2gdsii.jar"
            if source.is_file():
                runtime[str(source)] = (source, Path("bin/ascii2gdsii.jar"))
                break
        frozen = resources.get("resourceSha256", {})
        if set(frozen) != set(runtime):
            raise ValueError("native runtime resource set differs from frozen request")
        for name, (source, _) in runtime.items():
            if frozen.get(name) != legacy.digest(source):
                raise ValueError("native runtime resource checksum mismatch: " + name)
        legacy.stage_resources(project, executable, workspace,
                               "algorithm-matrix" if stage == "comparison" else "known-feasible")
        for name, (source, relative) in runtime.items():
            if legacy.digest(workspace / relative) != frozen[name]:
                raise ValueError("copied runtime resource checksum mismatch")
    return project, executable, workspace, {name: legacy.digest(source) for name,(source,_) in runtime.items()}


def comparison(request, base, rules, splits, output, workspace):
    if request["engine"] == "dr" or str(base.get("tech", "")).lower() != "gf180":
        return {"status": "unsupported", "reason": "DR_NATIVE_ALGORITHM_MATRIX_UNSUPPORTED" if request["engine"] == "dr" else "NATIVE_COMPARISON_REQUIRES_GF180",
                "metrics": [], "scientificStatus": "NOT_RUN"}
    params = request["comparison"]
    if request["engine"] == "mr" and 1 in params["rowCounts"] and base.get("num_rows", 1) != 1:
        raise ValueError("native derive_configs reuses source for row 1; source num_rows must be 1")
    if request["engine"] == "cmos" and params["rowCounts"] != [1]:
        raise ValueError("CMOS supports single-row comparison only")
    runner = legacy.load_module(workspace / "scripts/benchmark_runner.py", "acg_unified_runner")
    runner.REPO_ROOT, runner.AUTOCELL = workspace, workspace / "build/bin/autocell"
    runner.NETLIST_DIR = next(iter(splits.values()))["path"].parent
    runner.RULES = rules
    native = output / "native"
    native.mkdir()
    deadline = time.monotonic() + params["totalTimeoutSeconds"]
    runner.subprocess = CapturedChildren(native, deadline)
    configdir = output / "configs"
    configdir.mkdir()
    for algo in params["algorithms"]:
        cfg = dict(base)
        cfg["placement_algorithm"] = algo
        cfg["placement_only"] = True
        legacy.write_json(configdir / f"{algo}.json", cfg)
    if request["engine"] == "mr":
        configs = runner.derive_configs(params["algorithms"], params["rowCounts"], configdir, None, configdir / "derived")
    else:
        configs = {(algo, 1): configdir / f"{algo}.json" for algo in params["algorithms"]}
    aggregate = {cell: {"transistors": item["transistors"]} for cell, item in splits.items()}
    details = []
    jobs = [(cell, item, algo, row, index)
            for cell, item in splits.items() for algo in params["algorithms"]
            for row in params["rowCounts"] for index in range(params["trials"])]

    def execute(job):
        cell, item, algo, row, index = job
        key = f"{algo}_r{row}" if request["engine"] == "mr" else algo
        effective = legacy.read_json(configs[(algo, row)])
        run_dir = native / cell / key / f"trial_{index + 1}"
        if time.monotonic() >= deadline:
            result = {"algo": key, "success": False, "timeout": False,
                      "return_code": None, "not_run": True, "reason": "GLOBAL_COMPARISON_BUDGET_EXHAUSTED"}
        else:
            result = runner.run_one(cell, item["transistors"], key, params["timeoutSeconds"],
                                    configs[(algo, row)], run_dir)
        detail = {"cell": cell, "algorithm": algo, "rowCount": row, "trialIndex": index,
                  "effectiveConfiguration": effective, "configSha256": legacy.digest(configs[(algo, row)]),
                  "configurationOverrides": changes(base, effective),
                  "reportedAlgorithm": result.get("algo_line"),
                  "minCpp": result.get("min_cpp"), "cost": result.get("cost"),
                  "hpwl": result.get("nor_hpwl"), "crossRows": result.get("cross_rows"),
                  "placementMs": result.get("placement_ms"), "wallSeconds": result.get("wall_sec"),
                  "rawTrial": result,
                  "nativeReturnCode": result.get("return_code"),
                  "timedOut": result.get("timeout", False), "notRun": result.get("not_run", False),
                  "metricsCollected": bool(result.get("success")),
                  "nativeSuccess": result.get("return_code") == 0 and not result.get("timeout", False),
                  "scientificEvidence": scientific_evidence(run_dir) if run_dir.exists() else None,
                  "nativeDirectory": str(run_dir.relative_to(output))}
        return cell, key, result, detail

    trials_by_key = {}
    with ThreadPoolExecutor(max_workers=params["threads"]) as executor:
        for cell, key, result, detail in executor.map(execute, jobs):
            trials_by_key.setdefault((cell, key), []).append(result)
            details.append(detail)
    for (cell, key), trials in trials_by_key.items():
        aggregate[cell][key] = runner.aggregate_trials(trials)
    exhausted = any(item["notRun"] for item in details)
    legacy.write_json(output / "aggregate.json", aggregate)
    report = legacy.load_module(workspace / "scripts/benchmark_report.py", "acg_unified_report")
    rc = legacy.captured_main(report, ["--input", str(output / "aggregate.json"), "--output", str(output / "REPORT.md"),
                                     "--max-cols", str(params["maxCols"])], output, "report")
    if rc:
        raise ValueError("unchanged native comparison report failed")
    partial = exhausted or any(not x["nativeSuccess"] or not x["metricsCollected"] for x in details)
    return {"status": "partial" if partial else "completed", "metrics": details, "nativeReturnCode": 1 if partial else 0,
            "requestedThreads": params["threads"], "effectiveThreads": params["threads"],
            "reason": "GLOBAL_COMPARISON_BUDGET_EXHAUSTED" if exhausted else None,
            "rawReportPaths": ["aggregate.json", "REPORT.md"],
            "scientificStatus": "PER_TRIAL_RAW_EVIDENCE",
            "warnings": ["Comparison is placement-only; source routing mode is explicitly overridden and recorded. Native metrics success does not certify GDS/routing/LVS.",
                         "Native report retains its original static narrative; structured evidence is authoritative.",
                         "Every concurrent child timeout is limited by the same stage deadline."]}


def search(request, base, rules, splits, output, workspace):
    rows = base.get("num_rows", 1)
    if request["engine"] != "mr":
        return {"status": "unsupported", "reason": "NATIVE_KNOWN_FEASIBLE_REQUIRES_MR_GF180", "cells": []}
    if str(base.get("tech", "")).lower() != "gf180" or type(rows) is not int or rows not in {1, 2, 3}:
        return {"status": "unsupported", "reason": "NATIVE_CORPUS_REQUIRES_GF180_ROWS_1_2_3", "cells": []}
    params = request["search"]
    tracks = params["tracks"]
    if rows == 1 and any(x not in {9, 12, 16} for x in tracks):
        return {"status": "unsupported", "reason": "SINGLE_ROW_CORPUS_HEIGHTS_9_12_16_ONLY", "cells": []}
    corpus = legacy.load_module(workspace / "scripts/build_known_feasible_corpus.py", "acg_unified_corpus")
    corpus.PROJECT = workspace
    native = output / "native"
    native.mkdir()
    started = time.monotonic()
    deadline = started + params["totalTimeoutSeconds"]
    corpus.subprocess = CapturedChildren(native, deadline)
    config = output / "config-base.json"
    legacy.write_json(config, base)
    cells = []
    attempts_used = 0
    for cell, item in splits.items():
        remaining = deadline - time.monotonic()
        available = params["maxAttempts"] - attempts_used
        if available <= 0 or remaining < 1:
            cells.append({"cell": cell, "status": "CAPPED_UNRESOLVED", "attemptCount": 0,
                          "terminationReason": "GLOBAL_SEARCH_BUDGET_EXHAUSTED",
                          "validationLevel": "NOT_ESTABLISHED", "lvs1": "NOT_RUN", "foundrySignoff": "NOT_RUN"})
            continue
        args = SimpleNamespace(output=native, config_base=config, rules=rules,
            autocell=workspace / "build/bin/autocell", tracks=tuple(tracks), extras=tuple(params["extraCpp"]),
            num_rows=rows, max_attempts=available, total_timeout=max(1, int(remaining)),
            attempt_timeout=min(params["attemptTimeoutSeconds"], max(1, int(remaining))))
        controller = corpus.CorpusController(args, base)
        manifest = controller.run_cell(cell, item["path"])
        attempts = manifest.get("attempts", [])
        attempts_used += len(attempts)
        details = []
        for attempt in attempts:
            effective = legacy.read_json(Path(attempt["config"]))
            details.append({**attempt, "effectiveConfiguration": effective,
                            "configSha256": legacy.digest(Path(attempt["config"])),
                            "configurationOverrides": changes(base, effective)})
        # Retain original native manifest unchanged; adapter metadata is independent.
        cells.append({"cell": cell, "status": manifest.get("status"), "attemptCount": len(attempts),
                      "attempts": details, "manifestPath": f"native/{cell}/manifest.json",
                      "witnessPath": f"native/{cell}/witness" if manifest.get("witness") else None,
                      "terminationReason": manifest.get("termination_reason"),
                      "validationLevel": "MODEL_PLACEMENT_ROUTED_GDS_LVS0" if manifest.get("status") == "RESEARCH_GDS_VALID" else "NOT_ESTABLISHED",
                      "lvs1": "NOT_RUN", "foundrySignoff": "NOT_RUN"})
    consumed = time.monotonic() - started
    return {"status": "completed" if all(c["status"] == "RESEARCH_GDS_VALID" for c in cells) else "partial",
            "cells": cells, "searchBudgetScope": "job", "consumedAttempts": attempts_used, "maxAttempts": params["maxAttempts"],
            "remainingAttempts": max(0, params["maxAttempts"] - attempts_used),
            "consumedSeconds": consumed, "remainingSeconds": max(0, params["totalTimeoutSeconds"] - consumed),
            "sharedWallBudgetSeconds": params["totalTimeoutSeconds"],
            "scientificStatus": "PER_CELL_NATIVE_WITNESS", "nativeReturnCode": 0,
            "widenSchedulePolicy": "native_includes_zero_and_safe_cap_under_max16_cpp_and_2x_base_width",
            "warnings": ["Search changes geometry, algorithms and routing policy; every effective attempt and override is recorded.",
                         "CAPPED_UNRESOLVED is not global infeasibility; witness certifies internal LVS0 only."]}


def report(request, root, output, request_sha):
    generation = legacy.read_json(legacy.confined(root, request["generationResult"]))
    earlier = {}
    for stage in ("comparison", "search"):
        path = root / "output/unified" / stage / "summary.json"
        if not path.is_file():
            raise ValueError("stage summary missing: " + stage)
        earlier[stage] = legacy.read_json(path)
        expected = {"requestSha256": request_sha, "sourceNetlistSha256": legacy.digest(legacy.confined(root, request["inputs"]["netlist"])),
                    "configSha256": legacy.digest(legacy.confined(root, request["inputs"]["configBase"])),
                    "rulesSha256": legacy.digest(legacy.confined(root, request["inputs"]["rules"]))}
        if earlier[stage].get("schemaVersion") != VERSION or earlier[stage].get("id") != stage or any(earlier[stage].get(k) != v for k,v in expected.items()):
            raise ValueError("report stage input/hash binding differs: " + stage)
        for relative, expected_hash in earlier[stage].get("evidenceSha256", {}).items():
            if legacy.digest(legacy.confined(path.parent, relative)) != expected_hash:
                raise ValueError("report evidence checksum differs: " + stage + "/" + relative)
    # Embed all normalized evidence; no conclusion is inferred from wrapper exit.
    legacy.write_json(output / "REPORT.json", {"generation": generation, **earlier, "stageInputs": request.get("stageInputs", {}),
                      "sourceNetlistSha256": legacy.digest(legacy.confined(root, request["inputs"]["netlist"]))})
    lines = ["# Unified AutoCellGen report", "",
             "Process completion, native metrics, placement/routing checks, LVS0, LVS1 and foundry PV are independent.", "",
             "## Generation", "", "```json", json.dumps(generation, indent=2, ensure_ascii=False), "```"]
    for stage, record in earlier.items():
        lines += ["", f"## {stage.title()}", "", f"Status: {record.get('status')}",
                  f"Reason: {record.get('reason') or '—'}"]
        if stage == "comparison":
            lines += ["", "| Cell | Algorithm | Rows | CPP | Cost | HPWL | Wall seconds | Exit | Timeout | Metrics |", "|---|---|---|---|---|---|---|---|---|---|"]
            for item in record.get("metrics", []):
                lines.append(f"| {item['cell']} | {item['algorithm']} | {item['rowCount']} | {item.get('minCpp')} | {item.get('cost')} | {item.get('hpwl')} | {item.get('wallSeconds')} | {item.get('nativeReturnCode')} | {item.get('timedOut')} | {item.get('metricsCollected')} |")
        else:
            lines += ["", "| Cell | Search status | Attempts | Validation |", "|---|---|---|---|"]
            for item in record.get("cells", []):
                lines.append(f"| {item['cell']} | {item['status']} | {item['attemptCount']} | {item['validationLevel']} |")
    lines += ["", "Native per-stage reports, raw ledgers, process streams and hashes are retained alongside this report.",
              "Unsupported stages are reported explicitly; no alternative engine or builtin cell is substituted."]
    (output / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    statuses = [v.get("status") for v in earlier.values()]
    data = generation.get("data", {})
    generation_stages = data.get("acgUnified", {}).get("stages", [])
    generated = next((s for s in generation_stages if s.get("id") == "generation"), None)
    if not isinstance(generated, dict) or generated.get("status") not in {"completed", "partial", "failed"}:
        raise ValueError("normalized generation stage outcome missing")
    acg = data.get("acg", {})
    cell_statuses = [c.get("status") for c in acg.get("cells", [])]
    if generated["status"] == "failed" or cell_statuses and all(s == "failed" for s in cell_statuses):
        overall = "failed"
    elif generated["status"] == "partial" or any(s in {"failed", "partial"} for s in cell_statuses) or any(s in {"partial", "failed"} for s in statuses):
        overall = "partial"
    else:
        overall = "completed"
    lines.extend(["", f"Overall scientific outcome: {overall}", f"Generation stage outcome: {generated['status']}"])
    (output / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    report_json = legacy.read_json(output / "REPORT.json")
    report_json["overallScientificStatus"] = overall
    report_json["generationStatus"] = generated["status"]
    legacy.write_json(output / "REPORT.json", report_json)
    return {"status": "partial" if overall in {"partial", "failed"} else "completed",
            "overallScientificStatus": overall, "generationStatus": generated["status"],
            "rawReportPaths": ["REPORT.md", "REPORT.json"], "stages": earlier,
            "generation": generation, "scientificStatus": "RAW_STAGE_OUTCOMES",
            "foundryCertification": False}


def run(request_path, output, root, stage):
    root = root.resolve()
    request_path = request_path.resolve()
    if not request_path.is_relative_to(root):
        raise ValueError("request outside job")
    request = legacy.read_json(request_path)
    if output.is_symlink() or output.exists() and any(output.iterdir()):
        raise ValueError("stage output must be fresh and not a symlink")
    output = output.resolve()
    if not output.is_relative_to(root / "output") or output.name != stage:
        raise ValueError("stage output must be under job output and match stage")
    if (output / "summary.json").exists():
        raise ValueError("refuse to overwrite completed stage evidence")
    output.mkdir(parents=True, exist_ok=True)
    inputs = request["inputs"]
    source = legacy.confined(root, inputs["netlist"])
    config = legacy.confined(root, inputs["configBase"])
    rules = legacy.confined(root, inputs["rules"])
    base = legacy.read_json(config)
    if not isinstance(base, dict) or not isinstance(legacy.read_json(rules), dict):
        raise ValueError("config/rules must be objects")
    request = validate_settings(request, base)
    helper_hashes = {"dispatcher": legacy.digest(Path(legacy.__file__)), "unified": legacy.digest(Path(__file__))}
    frozen_helpers = request["trustedResources"].get("helperSha256")
    if frozen_helpers is not None and frozen_helpers != helper_hashes:
        raise ValueError("unified helper checksum mismatch")
    binding = {"schemaVersion": VERSION, "id": stage, "engine": request["engine"],
               "sourceNetlistSha256": legacy.digest(source), "configSha256": legacy.digest(config),
               "rulesSha256": legacy.digest(rules), "requestSha256": legacy.digest(request_path),
               "stageInputs": request.get("stageInputs", {}), "helperSha256": helper_hashes}
    if stage == "report":
        outcome = report(request, root, output, legacy.digest(request_path))
        binding["executableSha256"] = request["trustedResources"]["executableSha256"]
        binding["scriptSha256"] = {name: sha for record in outcome["stages"].values() for name,sha in record.get("scriptSha256", {}).items()}
        binding["resourceSha256"] = {name: sha for record in outcome["stages"].values() for name,sha in record.get("resourceSha256", {}).items()}
    else:
        splits = split_netlist(source, request["cellNames"], output / "inputs/netlists")
        project, executable, workspace, runtime = trusted_resources(request, root, stage)
        binding["resourceSha256"] = runtime
        binding["splitLineage"] = {name: {key: str(value.relative_to(output)) if key == "path" else value
                                         for key, value in info.items()} for name, info in splits.items()}
        binding["executableSha256"] = legacy.digest(executable)
        used = (["benchmark_runner.py", "benchmark_report.py"] if stage == "comparison" and request["engine"] != "dr" else ["build_known_feasible_corpus.py", "benchmark_report.py"] if stage == "search" and request["engine"] == "mr" else [])
        binding["scriptSha256"] = {name: legacy.digest(project / "scripts" / name) for name in used}
        if stage == "comparison":
            outcome = comparison(request, base, rules, splits, output, workspace)
        else:
            outcome = search(request, base, rules, splits, output, workspace)
    binding.update(outcome)
    binding["outputCapturePolicy"] = {"perChildCombinedLimitBytes": CapturedChildren.output_limit_bytes, "parserTailBytesPerStream": CapturedChildren.parser_tail_bytes, "overflowNativeReturnCode": 125}
    binding["evidenceSha256"] = {str(p.relative_to(output)): legacy.digest(p)
                                for p in legacy.safe_tree(output) if p != output / "summary.json"}
    legacy.write_json(output / "summary.json", binding)
    return binding


def self_test():
    import tempfile
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        source = root / "source.sp"
        source.write_text(".param v=1\n.model customN nmos\n.model customP pmos\n.subckt mine A Y VDD VSS\nM1 Y A VSS VSS customN w=1u l=100n\n+ nf=1\nM2 Y A VDD VDD customP w=2u l=100n\n.ends mine\n")
        result = split_netlist(source, ["mine"], root / "split")
        assert result["mine"]["transistors"] == 2
        assert ".param v=1" in result["mine"]["path"].read_text()
    return {"status": "passed", "schemaVersion": VERSION, "wrapperSha256": legacy.digest(Path(__file__)),
            "checks": ["global semantics preserved", "custom MOS model and continuation counted"]}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--request", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--artifacts-root", type=Path)
    parser.add_argument("--stage", choices=sorted(STAGES))
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.self_test:
            print(json.dumps(self_test())); return 0
        if not all((args.request, args.output, args.artifacts_root, args.stage)):
            raise ValueError("request/output/artifacts-root/stage required")
        result = run(args.request, args.output, args.artifacts_root, args.stage)
        print(json.dumps({"schemaVersion": VERSION, "status": result["status"], "id": args.stage}))
        return 0
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "error", "message": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
