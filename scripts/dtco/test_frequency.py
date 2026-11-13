"""Focused synthetic tests for bounded DTCO frequency classification."""
import math
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from frequency import (
    ArcWaveform, ExpectedLevel, PointObservation, SweepConfig, FREQUENCY_PROTOCOL,
    _logic_hold_window, classify_arc_waveform, classify_observation, evaluate_round,
    run_frequency_sweep,
)


def synthetic_arc(high_voltage=1.8, settle=0.1):
    return ArcWaveform(
        name="A->Y rising output",
        time_s=[0.0, 0.1, 0.5, 0.6, 1.0],
        output_v=[0.0, 0.0, 0.0, high_voltage, high_voltage],
        expected=[
            ExpectedLevel(edge_time_s=0.0, deadline_s=0.1, high=False),
            ExpectedLevel(edge_time_s=0.5, deadline_s=0.5 + settle, high=True),
        ],
        waveform_path="point/waveform.txt",
    )


def config(folder, maximum=10.0, budget=16, tolerance=0.1):
    return SweepConfig(
        min_frequency_hz=1.0, max_frequency_hz=maximum,
        tolerance_hz=tolerance, max_runs=budget, evidence_dir=Path(folder),
        conditions={"voltageV": 1.8, "groundVoltageV": 0.0,
                    "temperatureC": 25, "corner": "tt"},
        coarse_points=4,
    )


class FrequencyTests(unittest.TestCase):
    def test_valid_output_and_all_expected_intervals_pass(self):
        result = classify_arc_waveform(synthetic_arc(), 1.8, 0.0)
        self.assertEqual(result["status"], "pass")
        self.assertEqual(len(result["checks"]), 2)

    def test_mid_rail_after_deadline_fails_logic_levels(self):
        arc = synthetic_arc(high_voltage=0.7)
        result = classify_arc_waveform(arc, 1.8, 0.0)
        self.assertEqual(result["status"], "fail")
        self.assertEqual(result["reason"], "output_not_valid_high_after_deadline")

    def test_simulator_error_is_unknown_not_electrical_fail(self):
        result = classify_observation(PointObservation("error"), 1.8, 0.0)
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(result["reason"], "simulator_error")

    def test_input_logic_is_checked_only_after_deadline_through_guarded_hold_end(self):
        # At 2.25 GHz, T/2 is about 222 ps. The 200 ps deadline leaves
        # only a short but valid source/output hold interval before the next edge.
        period = 1.0 / 2.25e9
        edge, deadline, next_edge = 0.0, 200e-12, period / 2
        end = next_edge - 20e-12
        times = [0.0, 80e-12, deadline, end, next_edge]
        values = [0.0, 2.738, 3.4, 3.4, 3.4]
        passed, actual_end = _logic_hold_window(
            times, values, edge, deadline, next_edge, True, 0.68, 2.72,
        )
        self.assertTrue(passed)
        self.assertAlmostEqual(actual_end, end)
        # A source that has not reached valid logic at the deadline is invalid
        # measurement input, not an electrical failure of the cell.
        invalid, _ = _logic_hold_window(
            times, [0.0, 2.738, 2.70, 2.70, 2.70],
            edge, deadline, next_edge, True, 0.68, 2.72,
        )
        self.assertFalse(invalid)

    def test_empty_input_hold_window_is_not_a_cell_failure(self):
        passed, end = _logic_hold_window(
            [0.0, 1.0], [0.0, 3.4], 0.0, 0.2, 0.18, True, 0.68, 2.72,
        )
        self.assertFalse(passed)
        self.assertLess(end, 0.2)

    def test_unknown_required_arc_takes_precedence_over_another_arc_failure(self):
        invalid = ArcWaveform("invalid metadata", [0.0, 1.0], [0.0, 1.8], [
            ExpectedLevel(0.8, 0.9, True), ExpectedLevel(0.2, 0.3, False)])
        result = classify_observation(
            PointObservation("ok", [synthetic_arc(0.7), invalid]), 1.8, 0.0,
        )
        self.assertEqual(result["status"], "unknown")
        self.assertTrue(result["reason"].startswith("waveform_invalid:"))

    def test_larger_rc_load_lowers_measured_toggle_threshold(self):
        def sweep_for_tau(tau_s, evidence_dir):
            cfg = SweepConfig(
                min_frequency_hz=20e6, max_frequency_hz=3e9,
                tolerance_hz=10e6, max_runs=16, evidence_dir=Path(evidence_dir),
                conditions={"voltageV": 1.8, "groundVoltageV": 0.0,
                            "temperatureC": 25, "corner": "toy-rc"},
                coarse_points=5,
            )

            def runner(frequency, point_dir):
                period = 1.0 / frequency
                stop = period * 8.25
                settle = tau_s * math.log(5.0)  # RC 80/20 threshold crossing.
                expected = [
                    ExpectedLevel(i * period / 2, i * period / 2 + max(200e-12, period * 0.1),
                                  high=(i % 2 == 0))
                    for i in range(16)
                ]
                times = sorted(set(
                    [stop * i / 4000 for i in range(4001)] +
                    [i * period / 2 + settle for i in range(16)]
                ))
                output = []
                for time in times:
                    settled_edges = [i for i in range(16) if i * period / 2 + settle <= time]
                    output.append(1.8 if settled_edges and settled_edges[-1] % 2 == 0 else 0.0)
                return PointObservation("ok", [
                    ArcWaveform("RC output", times, output, expected),
                ])

            return run_frequency_sweep(cfg, runner)

        with tempfile.TemporaryDirectory() as base:
            light = sweep_for_tau(100e-12, Path(base) / "light")
            heavy = sweep_for_tau(200e-12, Path(base) / "heavy")
        self.assertEqual(light.status, "bracketed")
        self.assertEqual(heavy.status, "bracketed")
        self.assertGreater(light.maximum_verified_toggle_frequency_hz,
                           heavy.maximum_verified_toggle_frequency_hz + 150e6)

    def test_sweep_brackets_highest_verified_pass_within_tolerance(self):
        with tempfile.TemporaryDirectory() as folder:
            def runner(frequency, point_dir):
                arc = synthetic_arc() if frequency <= 6.0 else synthetic_arc(0.7)
                return PointObservation("ok", arcs=[arc], deck_path=str(point_dir / "frozen.sp"))
            result = run_frequency_sweep(config(folder), runner)
            self.assertEqual(result.status, "bracketed")
            self.assertTrue(result.tolerance_met)
            self.assertLessEqual(result.bracket_width_hz, 0.1)
            self.assertLessEqual(result.maximum_verified_toggle_frequency_hz, 6.0)
            self.assertGreater(result.lowest_verified_fail_frequency_hz, 6.0)
            self.assertEqual(result.metric, "maximum_verified_toggle_frequency")
            self.assertTrue(Path(result.evidence_path).is_file())
            self.assertLessEqual(len(result.points), 16)
    def test_passing_maximum_is_reported_as_unbounded(self):
        with tempfile.TemporaryDirectory() as folder:
            result = run_frequency_sweep(
                config(folder),
                lambda frequency, point_dir: PointObservation("ok", arcs=[synthetic_arc()]),
            )
            self.assertEqual(result.status, "upper_bound_not_found")
            self.assertTrue(result.upper_bound_not_found)
            self.assertIsNone(result.lowest_verified_fail_frequency_hz)

    def test_unknown_inside_bracket_stops_without_calling_it_a_fail(self):
        with tempfile.TemporaryDirectory() as folder:
            def runner(frequency, point_dir):
                if frequency == 7.0:
                    return PointObservation("timeout")
                return PointObservation("ok", arcs=[synthetic_arc() if frequency < 6
                                                     else synthetic_arc(0.7)])
            result = run_frequency_sweep(config(folder), runner)
            self.assertEqual(result.status, "indeterminate")
            self.assertEqual(result.stop_reason, "unknown_observation_inside_bracket")
            self.assertTrue(any(point.electrical_status == "unknown" for point in result.points))

    def test_cancel_and_run_budget_are_reported(self):
        with tempfile.TemporaryDirectory() as folder:
            calls = []
            runner = lambda frequency, path: (calls.append(frequency) or
                                               PointObservation("ok", [synthetic_arc()]))
            cancelled = run_frequency_sweep(
                config(folder), runner, should_cancel=lambda: len(calls) >= 2)
            self.assertEqual(cancelled.status, "cancelled")
            self.assertEqual(cancelled.stop_reason, "cancelled")
            self.assertLessEqual(len(calls), 2)

        with tempfile.TemporaryDirectory() as folder:
            limited = run_frequency_sweep(
                config(folder, budget=4, tolerance=0.01),
                lambda frequency, path: PointObservation(
                    "ok", [synthetic_arc() if frequency <= 6 else synthetic_arc(0.7)]),
            )
            self.assertEqual(limited.status, "incomplete")
            self.assertEqual(limited.stop_reason, "run_budget_exhausted")
            self.assertEqual(len(limited.points), 4)

    def test_non_monotonic_measurements_do_not_create_a_bracket(self):
        with tempfile.TemporaryDirectory() as folder:
            def runner(frequency, path):
                passed = frequency in (1.0, 7.0)
                return PointObservation("ok", [synthetic_arc() if passed else synthetic_arc(0.7)])
            result = run_frequency_sweep(config(folder), runner)
            self.assertEqual(result.status, "non_monotonic")
            self.assertIsNone(result.bracket_width_hz)
            self.assertFalse(result.tolerance_met)

    def test_bad_rails_and_unordered_edges_are_unknown_or_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            invalid = config(folder)
            invalid.conditions["voltageV"] = float("inf")
            with self.assertRaises(ValueError):
                run_frequency_sweep(invalid, lambda f, p: PointObservation("ok"))
        arc = ArcWaveform("bad metadata", [0.0, 1.0], [0.0, 1.8], [
            ExpectedLevel(0.7, 0.8, True), ExpectedLevel(0.2, 0.3, False)])
        classified = classify_observation(PointObservation("ok", [arc]), 1.8, 0.0)
        self.assertEqual(classified["status"], "unknown")

    @unittest.skipUnless(shutil.which("ngspice"), "ngspice is not installed")
    def test_real_ngspice_rc_period_sweep(self):
        evidence_env = os.environ.get("DTCO_FREQUENCY_EVIDENCE_DIR")
        if evidence_env:
            evidence = Path(evidence_env)
            evidence.mkdir(parents=True, exist_ok=True)
        else:
            evidence = Path(tempfile.mkdtemp(prefix="dtco-ngspice-frequency-"))
            self.addCleanup(shutil.rmtree, str(evidence), ignore_errors=True)
        cfg = SweepConfig(
            min_frequency_hz=100e6, max_frequency_hz=500e6,
            tolerance_hz=10e6, max_runs=10, evidence_dir=evidence,
            conditions={"voltageV": 1.8, "groundVoltageV": 0.0,
                        "temperatureC": 27, "corner": "toy-rc"},
            coarse_points=4,
        )

        def runner(frequency, point_dir):
            period = 1.0 / frequency
            tr = max(1e-12, period / 100.0)
            deck = point_dir / "rc.cir"
            waveform = point_dir / "waveform.txt"
            log = point_dir / "ngspice.log"
            deck.write_text(
                "* RC input-to-output transient frequency fixture\n"
                "V1 in 0 PULSE(0 1.8 {delay} {tr} {tr} {width} {period})\n"
                "R1 in out 1k\nC1 out 0 1p\n"
                ".control\ntran {step} {stop}\nwrdata waveform.txt v(in) v(out)\nquit\n.endc\n.end\n".format(
                    delay=period / 2, tr=tr, width=period / 2, period=period,
                    step=period / 200, stop=period * 6,
                ),
                encoding="utf-8",
            )
            try:
                completed = subprocess.run(
                    ["ngspice", "-b", str(deck)], cwd=str(point_dir),
                    capture_output=True, text=True, timeout=10, check=False,
                )
            except subprocess.TimeoutExpired as exc:
                log.write_text(str(exc), encoding="utf-8")
                return PointObservation("timeout", log_path=str(log), deck_path=str(deck))
            log.write_text(completed.stdout + completed.stderr, encoding="utf-8")
            if completed.returncode != 0 or not waveform.is_file():
                return PointObservation("error", log_path=str(log), deck_path=str(deck))
            rows = [[float(token) for token in line.split()]
                    for line in waveform.read_text().splitlines() if line.split()]
            times, output = [row[0] for row in rows], [row[3] for row in rows]
            expected = [ExpectedLevel(0.0, period * 0.1, False)]
            for edge_index in range(1, 12):
                edge = edge_index * period / 2
                expected.append(ExpectedLevel(edge, edge + period * 0.4,
                                              high=(edge_index % 2 == 1)))
            arc = ArcWaveform("RC input-to-output toggle", times, output, expected,
                              waveform_path=str(waveform))
            return PointObservation("ok", [arc], str(log), str(deck),
                                    {"periodS": period, "runner": "ngspice -b"})

        result = run_frequency_sweep(cfg, runner)
        self.assertEqual(result.status, "bracketed")
        self.assertTrue(result.tolerance_met)
        self.assertLess(result.maximum_verified_toggle_frequency_hz,
                        result.lowest_verified_fail_frequency_hz)
        self.assertTrue(any(p.electrical_status == "pass" for p in result.points))
        self.assertTrue(any(p.electrical_status == "fail" for p in result.points))
        self.assertTrue(Path(result.evidence_path).is_file())


    def test_round_evaluator_reads_real_waveform_evidence_and_updates_next_bound(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            output = root / "output" / "dtco"
            output.mkdir(parents=True)
            (root / "input").mkdir()
            measurement = {
                "voltageV": 1.8, "groundVoltageV": 0.1, "temperatureC": 27,
                "processCorner": "tt", "loadFf": 2.0, "inputSlewPs": 10.0,
                "inputs": ["A"], "truthTable": [
                    {"inputs": {"A": 0}, "output": 1},
                    {"inputs": {"A": 1}, "output": 0},
                ],
            }
            (root / "input" / "measurement.json").write_text(
                __import__("json").dumps(measurement), encoding="utf-8")
            frequency = 100.0
            period = 1 / frequency
            rows = []
            for index in range(1601):
                time = period * 8 * index / 1600
                input_value = 1 if (index // 100) % 2 == 0 else 0
                output_value = 0.1 if input_value else 1.8
                rows.append((time, 0.1 + input_value * 1.7, output_value, 0.0))
            waveform = output / "frequency-0-A-Y.txt"
            waveform.write_text("\n".join(" ".join(map(str, row)) for row in rows) + "\n", encoding="utf-8")
            log, deck = output / "frequency-0-A-Y.log", output / "frequency-0-A-Y.cir"
            log.write_text("No. of Data Rows : 1601\\n", encoding="utf-8")
            deck.write_text("VIN A 0 PULSE(0.1 1.8 0 1e-11 1e-11 0.00499 0.01)\\n", encoding="utf-8")
            (output / "frequency-run-0-A-Y.json").write_text(
                "{\"exitCode\":0,\"processId\":1}", encoding="utf-8")
            request = {
                "protocolVersion": FREQUENCY_PROTOCOL,
                "status": "pending", "frequencyHz": frequency,
                "minFrequencyHz": 25.0, "maxFrequencyHz": 400.0, "toleranceHz": 5.0,
                "arcs": [{"id": "A-Y", "input": "A", "output": "Y", "transition": "inverting",
                          "fixedInputs": {}, "waveformPath": waveform.name,
                          "logPath": log.name, "deckPath": deck.name}],
            }
            (output / "frequency-round-0.json").write_text(
                __import__("json").dumps(request), encoding="utf-8")
            result = evaluate_round(root, 0)
            self.assertEqual(result["status"], "pass", result)
            self.assertEqual(result["arcs"][0]["status"], "pass")
            state = __import__("json").loads((output / "frequency-state.json").read_text())
            self.assertEqual(state["highestPassHz"], frequency)
            self.assertEqual(state["nextFrequencyHz"], 400.0)
            self.assertEqual(state["conditions"]["groundVoltageV"], 0.1)
            self.assertEqual(state["conditions"]["loadFf"], 2.0)

            for suffix in ("txt", "log", "cir"):
                source = output / ("frequency-0-A-Y." + suffix)
                target = output / ("frequency-1-A-Y." + suffix)
                target.write_bytes(source.read_bytes())
            (output / "frequency-run-1-A-Y.json").write_text(
                "{\"exitCode\":1,\"processId\":2}", encoding="utf-8")
            request["frequencyHz"] = 400.0
            request["arcs"][0].update(
                waveformPath="frequency-1-A-Y.txt", logPath="frequency-1-A-Y.log",
                deckPath="frequency-1-A-Y.cir")
            (output / "frequency-round-1.json").write_text(
                __import__("json").dumps(request), encoding="utf-8")
            failed = evaluate_round(root, 1)
            self.assertEqual(failed["status"], "unknown")
            self.assertEqual(failed["arcs"][0]["reason"], "simulator_exit_code_1")
            failed_arc = failed["arcs"][0]
            self.assertEqual(failed_arc["status"], "unknown")
            self.assertEqual(failed_arc["simulatorExitCode"], 1)
            self.assertEqual(failed_arc["processEvidencePath"], "output/dtco/frequency-run-1-A-Y.json")
            for field in ("waveformSha256", "logSha256", "deckSha256", "processEvidenceSha256"):
                self.assertRegex(failed_arc[field], r"^[0-9a-f]{64}$")
            state = __import__("json").loads((output / "frequency-state.json").read_text())
            self.assertEqual(state["searchStatus"], "indeterminate")


if __name__ == "__main__":
    unittest.main()
