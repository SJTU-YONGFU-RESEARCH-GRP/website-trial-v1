"""Unit contracts using unchanged native Python modules; no ACG executable is run."""
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts/acg"))
import unified_workflow as unified
import research_workflow as legacy

NATIVE = Path("/home/duhaochen/AutoCellGen_TY/proj")
NETLIST = """* supplied global semantics
.param channel=100n
.model mineN nmos (level=1)
.model mineP pmos (level=1)
.subckt custom_one A Y VDD VSS
M1 Y A VSS VSS mineN w=1u l=channel
+ nf=1
M2 Y A VDD VDD mineP w=2u l=channel
.ends custom_one
.param after=2
.subckt custom_two B Z VDD VSS
M3 Z B VSS VSS mineN w=1u l=channel
M4 Z B VDD VDD mineP w=2u l=channel
.ends custom_two
"""


class UnifiedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "work").mkdir()
        (self.root / "output").mkdir()
        self.source = self.root / "work/netlist.sp"
        self.source.write_text(NETLIST)
        self.base = {"tech": "gf180", "track_num": 9, "num_rows": 2,
                     "placement_only": True, "custom_keep": 73}
        legacy.write_json(self.root / "work/config.json", self.base)
        legacy.write_json(self.root / "work/rules.json", {"layer_m1": 34})
        self.request = {
            "schemaVersion": unified.REQUEST_VERSION, "engine": "mr",
            "inputs": {"netlist": "work/netlist.sp", "configBase": "work/config.json", "rules": "work/rules.json"},
            "cellNames": ["custom_one", "custom_two"],
            "comparison": {"algorithms": ["dp", "sa"], "trials": 2, "threads": 2, "maxCols": 4,
                           "rowCounts": [2], "timeoutSeconds": 10, "totalTimeoutSeconds": 30},
            "search": {"maxAttempts": 2, "totalTimeoutSeconds": 30, "attemptTimeoutSeconds": 2,
                       "tracks": [9, 12], "extraCpp": [0, 2, 4]},
            "generationResult": "output/acg-generation.json"}
        self.bind_native("mr")

    def bind_native(self, engine):
        project = NATIVE / {"mr": "autocellgen-MR", "cmos": "autocellgen-cmos", "dr": "autocellgen-DR"}[engine]
        executable = project / "build/bin/autocell"
        scripts = [p for p in (project / "scripts").glob("*.py") if p.name in
                   {"benchmark_runner.py", "benchmark_report.py", "build_known_feasible_corpus.py"}]
        self.request["engine"] = engine
        resources = [p for p in (project / "scripts").glob("*") if p.name in {"ascii_to_gds_gdstk.py", "gds_merge_all_layers_klayout.rb"}]
        for ancestor in [project, *project.parents]:
            jar = ancestor / "bin/ascii2gdsii.jar"
            if jar.is_file():
                resources.append(jar)
                break
        self.request["trustedResources"] = {
            "nativeRoot": str(project), "executable": str(executable), "executableSha256": legacy.digest(executable),
            "scriptSha256": {p.name: legacy.digest(p) for p in scripts},
            "resourceSha256": {str(p): legacy.digest(p) for p in resources}}

    def execute(self, stage):
        path = self.root / "work/request.json"
        legacy.write_json(path, self.request)
        return unified.run(path, self.root / "output/unified" / stage, self.root, stage)

    def fake_child(self, command, **kwargs):
        path = Path(command[command.index("--output") + 1])
        path.mkdir(parents=True, exist_ok=True)
        cfg = legacy.read_json(Path(command[command.index("--config") + 1]))
        stdout = f"ALGO_RESULT: algo={cfg['placement_algorithm']} width=3 cpp=4 cost=1.5 hpwl=2.5 candidates=1 cross_rows=2\n"
        return subprocess.CompletedProcess(command, 0, stdout, "")

    def test_split_preserves_globals_names_and_continuations(self):
        splits = unified.split_netlist(self.source, self.request["cellNames"], self.root / "splits")
        for name, item in splits.items():
            text = item["path"].read_text()
            self.assertIn(".param after=2", text)
            self.assertIn(".model mineN nmos (level=1)", text)
            self.assertEqual(item["transistors"], 2)
            self.assertEqual(text.count(".subckt"), 1)
            self.assertIn(".subckt " + name, text)
            self.assertEqual(item["sourceSha256"], legacy.digest(self.source))
        self.assertIn("+ nf=1", splits["custom_one"]["path"].read_text())

    def test_hierarchy_and_unfrozen_include_rejected(self):
        for text in (NETLIST.replace("mineN w=", "custom_two w="),
                     ".include outside.sp\n" + NETLIST):
            self.source.write_text(text)
            with self.assertRaises(ValueError):
                unified.split_netlist(self.source, self.request["cellNames"], self.root / "splits")

    def test_real_runner_matrix_arbitrary_cells_parameters_and_parallelism(self):
        active = 0
        maximum = 0
        guard = threading.Lock()
        commands = []
        def fake(observer, command, **kwargs):
            nonlocal active, maximum
            with guard:
                active += 1
                maximum = max(active, maximum)
                commands.append(command)
            time.sleep(0.025)
            result = self.fake_child(command, **kwargs)
            with guard:
                active -= 1
            return result
        with patch.object(unified.CapturedChildren, "run", fake):
            result = self.execute("comparison")
        self.assertEqual(result["status"], "completed")
        self.assertEqual(maximum, 2)
        self.assertEqual(len(commands), 8)
        self.assertEqual(len(result["metrics"]), 8)
        for metric in result["metrics"]:
            self.assertEqual(metric["effectiveConfiguration"]["custom_keep"], 73)
            self.assertEqual(metric["effectiveConfiguration"]["num_rows"], 2)
            self.assertEqual(metric["effectiveConfiguration"]["placement_only"], True)
            self.assertEqual(metric["minCpp"], 4)
            self.assertEqual(metric["hpwl"], 2.5)
            self.assertEqual(metric["reportedAlgorithm"], metric["algorithm"])
            self.assertEqual(metric["scientificEvidence"]["layoutValidity"], "NOT_ESTABLISHED_BY_METRICS")
        aggregate = legacy.read_json(self.root / "output/unified/comparison/aggregate.json")
        self.assertEqual(set(aggregate), set(self.request["cellNames"]))
        self.assertEqual(len(aggregate["custom_one"]["sa_r2"]["trials"]), 2)
        self.assertTrue((self.root / "output/unified/comparison/REPORT.md").is_file())
        self.assertEqual(result["effectiveThreads"], 2)

    def test_routed_input_comparison_is_placement_only_with_explicit_override(self):
        self.base["placement_only"] = False
        legacy.write_json(self.root / "work/config.json", self.base)
        with patch.object(unified.CapturedChildren, "run", lambda observer, command, **kwargs: self.fake_child(command, **kwargs)):
            result = self.execute("comparison")
        for metric in result["metrics"]:
            self.assertTrue(metric["effectiveConfiguration"]["placement_only"])
            self.assertEqual(metric["configurationOverrides"]["placement_only"], {"source": False, "effective": True})
        self.assertFalse(legacy.read_json(self.root / "work/config.json")["placement_only"])

    def test_runtime_resource_change_rejected_before_native(self):
        self.request["trustedResources"]["resourceSha256"] = {}
        with self.assertRaisesRegex(ValueError, "runtime resource"):
            self.execute("comparison")

    def test_nonzero_native_metrics_do_not_become_native_success(self):
        def fake(observer, command, **kwargs):
            completed = self.fake_child(command, **kwargs)
            completed.returncode = 9
            return completed
        with patch.object(unified.CapturedChildren, "run", fake):
            result = self.execute("comparison")
        self.assertEqual(result["status"], "partial")
        self.assertTrue(all(m["metricsCollected"] and not m["nativeSuccess"] for m in result["metrics"]))
        self.assertEqual(result["metrics"][0]["nativeReturnCode"], 9)

    def test_original_native_corpus_global_attempt_cap_and_override_provenance(self):
        commands = []
        def fake(observer, command, **kwargs):
            commands.append(command)
            return self.fake_child(command, **kwargs)
        with patch.object(unified.CapturedChildren, "run", fake):
            result = self.execute("search")
        self.assertEqual(len(commands), 2)
        self.assertEqual(result["consumedAttempts"], 2)
        self.assertEqual(result["searchBudgetScope"], "job")
        self.assertEqual(result["cells"][1]["terminationReason"], "GLOBAL_SEARCH_BUDGET_EXHAUSTED")
        self.assertEqual(result["status"], "partial")
        effective = result["cells"][0]["attempts"][0]["effectiveConfiguration"]
        self.assertEqual(effective["custom_keep"], 73)
        self.assertEqual(effective["placement_only"], False)
        self.assertEqual(effective["routing_algorithm"], "pathfinder_rrr")
        self.assertEqual(result["cells"][0]["validationLevel"], "NOT_ESTABLISHED")
        self.assertEqual(result["cells"][0]["lvs1"], "NOT_RUN")

    def test_dr_unsupported_zero_budget_empty_algorithms_produces_summaries(self):
        self.bind_native("dr")
        self.request["comparison"]["algorithms"] = []
        self.request["comparison"]["rowCounts"] = [1]
        self.request["comparison"]["totalTimeoutSeconds"] = 0
        self.assertEqual(self.execute("comparison")["status"], "unsupported")
        self.assertEqual(self.execute("search")["status"], "unsupported")

    def test_non_gf180_comparison_zero_budget_unsupported(self):
        self.base["tech"] = "freepdk45"
        legacy.write_json(self.root / "work/config.json", self.base)
        self.request["comparison"]["totalTimeoutSeconds"] = 0
        self.assertEqual(self.execute("comparison")["status"], "unsupported")

    def test_unsupported_four_row_search_has_no_native_child(self):
        self.base["num_rows"] = 4
        legacy.write_json(self.root / "work/config.json", self.base)
        with patch.object(unified.CapturedChildren, "run", side_effect=AssertionError("native must not run")):
            result = self.execute("search")
        self.assertEqual(result["status"], "unsupported")

    def test_script_hash_tamper_and_stale_stage_rejected(self):
        self.request["trustedResources"]["scriptSha256"]["benchmark_runner.py"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.execute("comparison")
        with self.assertRaisesRegex(ValueError, "fresh"):
            self.execute("comparison")

    def test_report_rejects_changed_native_evidence(self):
        with patch.object(unified.CapturedChildren, "run", lambda observer, command, **kwargs: self.fake_child(command, **kwargs)):
            self.execute("comparison")
            self.execute("search")
        legacy.write_json(self.root / "output/acg-generation.json", {"status": "failed", "cells": []})
        target = self.root / "output/unified/comparison/REPORT.md"
        target.write_text("tampered")
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.execute("report")

    def fake_proxy(self, observer, command, **kwargs):
        return self.fake_child(command, **kwargs)

    def test_generation_failure_remains_report_failed_scientific_outcome(self):
        self.bind_native("dr")
        self.request["comparison"]["algorithms"] = []
        self.request["comparison"]["totalTimeoutSeconds"] = 0
        self.execute("comparison")
        self.execute("search")
        legacy.write_json(self.root / "output/acg-generation.json", {
            "data": {"acgUnified": {"stages": [{"id": "generation", "status": "failed", "exitCode": 1}]},
                     "acg": {"cells": [{"name": "custom_one", "status": "failed"}], "nativeExitCode": 1}}})
        result = self.execute("report")
        self.assertEqual(result["overallScientificStatus"], "failed")
        self.assertEqual(result["status"], "partial")
        self.assertIn("Generation stage outcome: failed", (self.root / "output/unified/report/REPORT.md").read_text())

    def test_timeout_terminates_owned_descendant_and_preserves_actual_streams(self):
        native = self.root / "native"
        native.mkdir()
        code = "import subprocess,time,sys; p=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)']); print(p.pid,flush=True);time.sleep(30)"
        observer = unified.CapturedChildren(native)
        with self.assertRaises(subprocess.TimeoutExpired):
            observer.run([sys.executable, "-c", code, "--output", str(native / "case")],
                         timeout=0.15, cwd=str(self.root), capture_output=True, text=True)
        record = legacy.read_json(native / "case/child-process.json")
        self.assertTrue(record["timedOut"])
        self.assertEqual(record["pgid"], os.getpgrp())
        descendant = int((native / "case/autocell.stdout.log").read_text().strip())
        state = Path(f"/proc/{descendant}/stat")
        if state.exists():
            self.assertEqual(state.read_text().rsplit(")", 1)[1].split()[0], "Z")

    def test_child_streams_have_enforced_memory_disk_bound(self):
        native = self.root / "native"
        native.mkdir()
        observer = unified.CapturedChildren(native)
        observer.output_limit_bytes = 4096
        observer.parser_tail_bytes = 1024
        code = "import sys,time;sys.stdout.write('X'*1000000);sys.stdout.flush();time.sleep(30)"
        result = observer.run([sys.executable, "-c", code, "--output", str(native / "case")],
                              timeout=2, capture_output=True, text=True)
        record = legacy.read_json(native / "case/child-process.json")
        self.assertEqual(result.returncode, 125)
        self.assertTrue(record["outputLimitExceeded"])
        self.assertTrue(record["parserTailTruncated"])
        self.assertLessEqual(len(result.stdout), 1024)
        self.assertLessEqual((native / "case/autocell.stdout.log").stat().st_size, 4096)

    def test_dispatcher_selftest_includes_unified_hash(self):
        self.assertEqual(unified.self_test()["wrapperSha256"], legacy.digest(ROOT / "scripts/acg/unified_workflow.py"))


if __name__ == "__main__":
    unittest.main()
