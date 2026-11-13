"""Native OpenSTA regression evidence for generic combinational/sequential sizing."""
import copy
import importlib.util
import itertools
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("selection", Path(__file__).with_name("selection.py"))
selection = importlib.util.module_from_spec(spec)
spec.loader.exec_module(selection)
LIB = Path("/home/duhaochen/website-trial-v1/data/digital-technologies/16bef11f7368a98382ba22ba1ba16ab0/library/timing.lib")
EVIDENCE = Path("/home/duhaochen/AI-Core-Workshop/evidence/dtco-cell-selection/engine")

def instance(iid, family, inputs, output, drives=(1, 2), initial=1, locked=False):
    return {"id": iid, "family": family, "inputs": inputs, "output": output,
            "allowedDrives": list(drives), "initialDrive": initial, "locked": locked}

def request(sequential=False):
    circuit = {"name": "sizing_graph", "inputs": ["a", "b"], "outputs": ["y"], "clock": None,
               "instances": [instance("u0", "NAND", ["a", "b"], "n0"),
                             instance("u1", "NOR", ["a", "n0"], "n1"),
                             instance("u2", "INV", ["n1"], "n2"),
                             instance("u3", "AND", ["n0", "n2"], "y")]}
    if sequential:
        circuit = {"name": "sequential_chain", "inputs": ["a", "clk"], "outputs": ["y"], "clock": "clk",
                   "instances": [instance("ff0", "DFF", ["a"], "q"),
                                 instance("gate", "INV", ["q"], "n"),
                                 instance("ff1", "DFF", ["n"], "y")]}
    return {"schemaVersion": "dtco.cell-selection.request.v1", "name": "Native selection experiment",
            "libraryId": selection.LIBRARY_ID, "objective": "area", "maxEvaluations": 16, "circuit": circuit,
            "constraints": {"clockPeriodNs": 10, "inputDelayNs": .1, "outputDelayNs": .1,
                            "inputSlewNs": .1, "outputLoadPf": .02, "clockUncertaintyNs": .05,
                            "holdUncertaintyNs": 0}}

class ValidationTests(unittest.TestCase):
    def test_graph_rejections(self):
        bad = []
        r = request(); r["circuit"]["instances"][0]["inputs"][0] = "missing"; bad.append(r)
        r = request(); r["circuit"]["instances"][0]["inputs"][0] = "n1"; bad.append(r)
        r = request(); r["circuit"]["instances"][1]["output"] = "n0"; bad.append(r)
        r = request(); r["circuit"]["instances"].append(instance("dead", "INV", ["a"], "unused")); bad.append(r)
        r = request(); r["circuit"]["instances"][0]["allowedDrives"] = [3]; bad.append(r)
        r = request(); r["constraints"]["clockPeriodNs"] = float("nan"); bad.append(r)
        r = request(); r["circuit"]["name"] = "top;exec evil"; bad.append(r)
        r = request(); r["maxEvaluations"] = True; bad.append(r)
        r = request(True); r["circuit"]["instances"][0]["inputs"] = ["clk"]; bad.append(r)
        r = request(True); r["circuit"]["clock"] = None; bad.append(r)
        for r in bad:
            with self.subTest(request=r):
                with self.assertRaises(ValueError):
                    selection.validate_request(r)

    def test_feedback_and_human_label(self):
        r = request(True)
        r["circuit"]["instances"][0]["inputs"] = ["y"]
        self.assertEqual(selection.validate_request(r), r)

    def test_truth_tables(self):
        self.assertEqual(selection.truth("(!(A1&A2))", ["A1", "A2"]), [1, 1, 1, 0])
        self.assertEqual(selection.truth("(!A1&!A2)", ["A1", "A2"]), [1, 0, 0, 0])
        with self.assertRaises(ValueError):
            selection.truth("__import__('os')", ["I"])

    def test_missing_timing_stays_unknown(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "checks.json"
            path.write_text('{"checks":[]}')
            self.assertEqual(selection.read_checks(path, "max"), [])

@unittest.skipUnless(LIB.is_file() and Path("/usr/local/bin/sta").is_file(), "native frozen GF180/OpenSTA environment required")
class NativeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cells = selection.load_library(LIB)
        cls.runtime = {"openstaPath": "/usr/local/bin/sta", "openstaSha256": selection.sha(Path("/usr/local/bin/sta"))}
        EVIDENCE.mkdir(parents=True, exist_ok=True)
        cls.session = Path(tempfile.mkdtemp(prefix="regression-", dir=EVIDENCE))
        print("\nNative evidence: " + str(cls.session), flush=True)

    def run_native(self, label, r):
        root = self.session / label
        (root / "input").mkdir(parents=True)
        selection.dump(root / "input/selection-request.json", r)
        selection.dump(root / "input/selection-runtime.json", self.runtime)
        shutil.copyfile(LIB, root / "input/selection-library.lib")
        with patch.object(selection, "load_library", return_value=self.cells):
            result = selection.select(root)
        for evaluation in result["evaluations"]:
            for artifact in evaluation["artifacts"].values():
                self.assertTrue((root / artifact).is_file(), artifact)
            provenance = json.loads((root / evaluation["artifacts"]["provenance"]).read_text())
            for relative, digest in provenance["files"].items():
                self.assertEqual(selection.sha(root / relative), digest)
        return result

    def test_01_sequential_area_and_performance(self):
        r = request(True); r["maxEvaluations"] = 8
        area = self.run_native("sequential-area", r)
        self.assertEqual(area["status"], "ok")
        r["objective"] = "performance"
        for inst in r["circuit"]["instances"]:
            inst["initialDrive"] = 2
        performance = self.run_native("sequential-performance", r)
        best_area = next(e for e in area["evaluations"] if e["id"] == area["bestEvaluationId"])
        best_perf = next(e for e in performance["evaluations"] if e["id"] == performance["bestEvaluationId"])
        baseline_perf = performance["evaluations"][0]
        self.assertNotEqual(baseline_perf["assignment"], best_perf["assignment"])
        self.assertTrue(any(best_perf["assignment"][i] != baseline_perf["assignment"][i] for i in ("ff0", "ff1")))
        self.assertGreater(best_perf["maxSlackNs"], baseline_perf["maxSlackNs"])
        self.assertGreaterEqual(best_perf["maxSlackNs"], best_area["maxSlackNs"])
        for result in (area, performance):
            self.assertEqual(result["search"]["evaluated"], 8)
            for e in result["evaluations"]:
                self.assertIsNotNone(e["setupSlackNs"])
                self.assertIsNotNone(e["holdSlackNs"])
                if e["feasible"]:
                    self.assertGreaterEqual(e["setupSlackNs"], 0)
                    self.assertGreaterEqual(e["holdSlackNs"], 0)

    def test_02_independent_setup_and_hold_failures(self):
        r = request(True)
        for i in r["circuit"]["instances"]:
            i["locked"] = True
        setup = copy.deepcopy(r); setup["constraints"]["clockPeriodNs"] = .5
        hold = copy.deepcopy(r); hold["constraints"]["holdUncertaintyNs"] = 5
        setup_result = self.run_native("setup-impossible", setup)
        hold_result = self.run_native("hold-impossible", hold)
        for result in (setup_result, hold_result):
            self.assertEqual(result["status"], "no_feasible_candidate")
            self.assertIsNone(result["bestEvaluationId"])
        self.assertLess(setup_result["evaluations"][0]["setupSlackNs"], 0)
        self.assertGreater(setup_result["evaluations"][0]["holdSlackNs"], 0)
        self.assertGreater(hold_result["evaluations"][0]["setupSlackNs"], 0)
        self.assertLess(hold_result["evaluations"][0]["holdSlackNs"], 0)

    def test_03_combinational_four_families(self):
        r = request()
        r["maxEvaluations"] = 4
        result = self.run_native("combinational-four-families", r)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["search"]["method"], "coordinate_descent")
        self.assertLessEqual(result["search"]["evaluated"], 4)
        for e in result["evaluations"]:
            self.assertIsNone(e["setupSlackNs"])
            self.assertIsNone(e["holdSlackNs"])
            self.assertGreater(e["pathDelayNs"], 0)
        self.assertEqual(result["evaluations"][0]["assignment"], {i["id"]: 1 for i in r["circuit"]["instances"]})

    def test_04_large_graph_budget_locks_and_drive_four(self):
        r = request()
        instances, previous = [], "a"
        for index in range(12):
            output = "y" if index == 11 else "n" + str(index)
            instances.append(instance("u" + str(index), "INV", [previous], output, drives=(1, 2, 4), initial=2, locked=index == 0))
            previous = output
        r["circuit"]["inputs"] = ["a"]
        r["circuit"]["instances"] = instances
        r["objective"] = "balanced"
        r["maxEvaluations"] = 7
        result = self.run_native("large-12-instances", r)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["search"]["evaluated"], 7)
        self.assertEqual(result["search"]["termination"], "evaluation_budget")
        self.assertTrue(all(e["assignment"]["u0"] == 2 for e in result["evaluations"]))
        self.assertTrue(any(4 in e["assignment"].values() for e in result["evaluations"]))

    def test_05_no_register_path_is_inconclusive(self):
        r = request(True)
        r["circuit"]["instances"] = [instance("ff0", "DFF", ["a"], "y", drives=(1,))]
        result = self.run_native("missing-register-path", r)
        self.assertEqual(result["status"], "inconclusive")
        self.assertEqual(result["evaluations"][0]["status"], "unknown")
        self.assertIsNone(result["evaluations"][0]["setupSlackNs"])
        self.assertIsNone(result["bestEvaluationId"])

    def test_06_electrical_violation_not_feasible(self):
        r = request()
        r["circuit"]["inputs"] = ["a"]
        r["circuit"]["instances"] = [instance("inv", "INV", ["a"], "y", drives=(1,))]
        r["constraints"]["outputLoadPf"] = 1
        result = self.run_native("max-capacitance-violation", r)
        self.assertEqual(result["status"], "no_feasible_candidate")
        self.assertFalse(result["evaluations"][0]["feasible"])


class SearchBudgetTests(unittest.TestCase):
    def run_mock(self, r, ticks, observations=None):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "input").mkdir()
            selection.dump(root / "input/selection-request.json", r)
            (root / "input/selection-library.lib").write_text("frozen fixture")
            executable = root / "native"; executable.write_text("not executed")
            selection.dump(root / "input/selection-runtime.json", {"openstaPath": str(executable), "openstaSha256": selection.sha(executable)})
            cells = {(family, drive): {"name": family + str(drive), "areaUm2": drive} for family in selection.FAMILIES for drive in (1, 2, 4)}
            def observation(root, request, library, runtime, cells, assignment, index, timeout):
                result = {"id": "eval-" + str(index), "index": index, "assignment": assignment, "areaUm2": 1,
                          "pathDelayNs": 1, "setupSlackNs": None, "holdSlackNs": None,
                          "maxSlackNs": 1, "minSlackNs": 1, "timingBudgetNs": 1, "feasible": True, "status": "feasible"}
                if observations is not None:
                    result.update(observations[index])
                return result
            with patch.object(selection, "load_library", return_value=cells), patch.object(selection, "evaluate", side_effect=observation), patch.object(selection.time, "monotonic", side_effect=ticks):
                return selection.select(root)

    def test_balanced_unknown_baseline_uses_one_recorded_timing_reference(self):
        r = request()
        r["objective"] = "balanced"
        r["maxEvaluations"] = 3
        r["circuit"]["inputs"] = ["a"]
        r["circuit"]["instances"] = [instance("inv", "INV", ["a"], "y", drives=(1, 2, 4))]
        result = self.run_mock(r, [0, 0, 0, 0], [
            {"areaUm2": 10, "timingBudgetNs": None, "maxSlackNs": None,
             "status": "unknown", "feasible": False},
            {"areaUm2": 8, "timingBudgetNs": 8, "maxSlackNs": 2},
            {"areaUm2": 9, "timingBudgetNs": 1, "maxSlackNs": 9},
        ])
        # Candidate-dependent normalization incorrectly prefers the smaller,
        # much slower X2. A common denominator correctly selects X4.
        self.assertEqual(result["bestEvaluationId"], "eval-2")
        self.assertEqual(result["evaluations"][2]["assignment"]["inv"], 4)
        self.assertEqual(result["rationale"]["normalization"], {
            "areaEvaluationId": "eval-0", "timingEvaluationId": "eval-1",
            "areaUm2": 10, "timingBudgetNs": 8})
        self.assertEqual(result["search"]["termination"], "incomplete_evidence")

    def test_performance_prefers_global_setup_margin_over_path_delay(self):
        r = request()
        r["objective"] = "performance"
        r["maxEvaluations"] = 3
        r["circuit"]["inputs"] = ["a"]
        r["circuit"]["instances"] = [instance("inv", "INV", ["a"], "y", drives=(1, 2, 4))]
        result = self.run_mock(r, [0, 0, 0, 0], [
            {"areaUm2": 10, "timingBudgetNs": 8, "maxSlackNs": 2, "pathDelayNs": .1},
            {"areaUm2": 11, "timingBudgetNs": 2, "maxSlackNs": 8, "pathDelayNs": 1},
            {"areaUm2": 9, "timingBudgetNs": 3, "maxSlackNs": 7, "pathDelayNs": .05},
        ])
        self.assertEqual(result["bestEvaluationId"], "eval-1")
        self.assertIsNone(result["rationale"]["normalization"])

    def test_frozen_liberty_area_sum_is_order_invariant_without_rounding_tolerance(self):
        r = request(True)
        cells = {("DFF", 1): {"areaUm2": 63.6608}, ("DFF", 2): {"areaUm2": 68.0512},
                 ("INV", 1): {"areaUm2": 8.7808}, ("INV", 2): {"areaUm2": 13.1712}}
        for drives in ((1, 2, 1), (2, 1, 1)):
            assignment = dict(zip(("ff0", "gate", "ff1"), drives))
            for instances in (r["circuit"]["instances"], list(reversed(r["circuit"]["instances"]))):
                self.assertEqual(selection.assignment_area(instances, assignment, cells), 140.4928)
        cells[("INV", 2)]["areaUm2"] = 8.7809
        self.assertLess(selection.assignment_area([{"id": "gate", "family": "INV"}], {"gate": 1}, cells),
                        selection.assignment_area([{"id": "gate", "family": "INV"}], {"gate": 2}, cells))

    def test_equal_area_joint_candidates_use_delay_then_evaluation_id(self):
        r = request(True)
        r["maxEvaluations"] = 8
        for inst in r["circuit"]["instances"]:
            inst["initialDrive"] = 2
        cells = {("DFF", 1): {"areaUm2": 63.6608}, ("DFF", 2): {"areaUm2": 68.0512},
                 ("INV", 1): {"areaUm2": 8.7808}, ("INV", 2): {"areaUm2": 13.1712}}
        order = [(2, 2, 2)] + [d for d in itertools.product((1, 2), repeat=3) if d != (2, 2, 2)]
        observations = []
        for drives in order:
            assignment = dict(zip(("ff0", "gate", "ff1"), drives))
            feasible = drives in ((1, 2, 1), (2, 1, 1))
            observations.append({"areaUm2": selection.assignment_area(r["circuit"]["instances"], assignment, cells),
                                 "pathDelayNs": .9621000000000001, "maxSlackNs": .005558 if feasible else -1,
                                 "feasible": feasible, "status": "feasible" if feasible else "timing_violation"})
        result = self.run_mock(r, [0] * 9, observations)
        self.assertEqual(result["evaluations"][3]["assignment"], {"ff0": 1, "gate": 2, "ff1": 1})
        self.assertEqual(result["evaluations"][5]["assignment"], {"ff0": 2, "gate": 1, "ff1": 1})
        self.assertEqual(result["evaluations"][3]["areaUm2"], result["evaluations"][5]["areaUm2"])
        self.assertEqual(result["bestEvaluationId"], "eval-3")
        observations[5]["pathDelayNs"] = .9
        result = self.run_mock(r, [0] * 9, observations)
        self.assertEqual(result["bestEvaluationId"], "eval-5")

    def test_deadline_retains_baseline_without_claiming_global_optimum(self):
        r = request()
        result = self.run_mock(r, [0, 0, 500])
        self.assertEqual(result["search"]["termination"], "time_budget")
        self.assertEqual(result["search"]["evaluated"], 1)
        self.assertEqual(result["bestEvaluationId"], result["baselineEvaluationId"])
        self.assertNotIn("Global over", result["rationale"]["optimality"])

    def test_large_search_space_is_exact_decimal_string(self):
        r = request()
        instances, previous = [], "a"
        for index in range(60):
            output = "y" if index == 59 else "n" + str(index)
            instances.append(instance("u" + str(index), "INV", [previous], output, drives=(1, 2, 4)))
            previous = output
        r["circuit"]["instances"] = instances
        r["circuit"]["inputs"] = ["a"]
        r["maxEvaluations"] = 1
        result = self.run_mock(r, [0, 0])
        self.assertEqual(result["search"]["spaceSize"], str(3 ** 60))
        self.assertEqual(result["search"]["evaluated"], 1)

if __name__ == "__main__":
    unittest.main(verbosity=2)
