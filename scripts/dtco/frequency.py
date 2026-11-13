"""Bounded transient toggle-frequency search for combinational-cell arcs.

The simulator runner is injected by the caller so production can use its tracked
process runner. Simulator failures remain unknown observations, never electrical
failures. Frequencies describe verified cell toggling, not a chip clock limit.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
import json
import hashlib
import math
import re
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence


@dataclass(frozen=True)
class ExpectedLevel:
    """Expected output after an input edge; deadline_s is an absolute time."""
    edge_time_s: float
    deadline_s: float
    high: bool


@dataclass
class ArcWaveform:
    name: str
    time_s: Sequence[float]
    output_v: Sequence[float]
    expected: Sequence[ExpectedLevel]
    waveform_path: Optional[str] = None


@dataclass
class PointObservation:
    """Output from one simulator run. Keep simulator state separate from physics."""
    simulator_status: str
    arcs: Sequence[ArcWaveform] = field(default_factory=list)
    log_path: Optional[str] = None
    deck_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SweepConfig:
    min_frequency_hz: float
    max_frequency_hz: float
    tolerance_hz: float
    max_runs: int
    evidence_dir: Path
    conditions: Dict[str, Any] = field(default_factory=dict)
    coarse_points: int = 5
    low_fraction: float = 0.2
    high_fraction: float = 0.8


@dataclass
class PointResult:
    frequency_hz: float
    simulator_status: str
    electrical_status: str
    reason: str
    arcs: List[Dict[str, Any]]
    log_path: Optional[str] = None
    deck_path: Optional[str] = None
    waveform_paths: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SweepResult:
    status: str
    metric: str
    scope: str
    maximum_verified_toggle_frequency_hz: Optional[float]
    lowest_verified_fail_frequency_hz: Optional[float]
    bracket_width_hz: Optional[float]
    tolerance_met: bool
    upper_bound_not_found: bool
    conditions: Dict[str, Any]
    points: List[PointResult]
    stop_reason: Optional[str] = None
    evidence_path: Optional[str] = None


class SweepError(ValueError):
    pass


FREQUENCY_PROTOCOL = "dtco.transient-toggle.v2"


def _finite_positive(value: float, name: str) -> float:
    value = float(value)
    if not math.isfinite(value) or value <= 0:
        raise SweepError(name + " must be finite and positive")
    return value


def _interpolate(times: Sequence[float], values: Sequence[float], t: float) -> float:
    if t < times[0] or t > times[-1]:
        raise SweepError("waveform does not cover settling deadline")
    lo, hi = 0, len(times) - 1
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if times[mid] <= t:
            lo = mid
        else:
            hi = mid
    if times[lo] == t:
        return float(values[lo])
    if times[hi] == t:
        return float(values[hi])
    ratio = (t - times[lo]) / (times[hi] - times[lo])
    return float(values[lo]) + ratio * (float(values[hi]) - float(values[lo]))


def _guarded_window(edge: float, deadline: float, next_edge: float) -> tuple[float, float]:
    if (not all(math.isfinite(value) for value in (edge, deadline, next_edge))
            or deadline < edge or next_edge <= edge):
        raise SweepError("invalid expected edge window")
    interval = next_edge - edge
    margin = min(max((deadline - edge) * 0.1, 1e-15), interval * 0.1)
    return next_edge - margin, margin


def _logic_hold_window(times: Sequence[float], values: Sequence[float],
                        edge: float, deadline: float, next_edge: float,
                        expected_high: bool, low_threshold: float,
                        high_threshold: float) -> tuple[bool, float]:
    """Validate an input at/after its deadline through the guarded next edge."""
    end, _margin = _guarded_window(edge, deadline, next_edge)
    if end < deadline:
        return False, end
    if deadline < times[0] or end > times[-1]:
        raise SweepError("waveform does not cover active input settling/hold window")
    samples = [_interpolate(times, values, deadline)]
    samples.extend(value for time, value in zip(times, values) if deadline < time <= end)
    if end > deadline:
        samples.append(_interpolate(times, values, end))
    passed = (all(value >= high_threshold for value in samples) if expected_high
              else all(value <= low_threshold for value in samples))
    return passed, end


def classify_arc_waveform(arc: ArcWaveform, vdd_v: float, vss_v: float,
                          low_fraction: float = 0.2,
                          high_fraction: float = 0.8) -> Dict[str, Any]:
    """Check every truth-table output interval after its settling deadline."""
    vdd_v, vss_v = float(vdd_v), float(vss_v)
    span = vdd_v - vss_v
    if not math.isfinite(vdd_v) or not math.isfinite(vss_v) or not math.isfinite(span) or span <= 0:
        raise SweepError("actual VDD and VSS must be finite, with VDD > VSS")
    if (not math.isfinite(low_fraction) or not math.isfinite(high_fraction)
            or not 0 <= low_fraction < high_fraction <= 1):
        raise SweepError("invalid output logic thresholds")
    times, values = list(map(float, arc.time_s)), list(map(float, arc.output_v))
    if len(times) < 2 or len(times) != len(values):
        raise SweepError("waveform needs matching time/output samples")
    if any(not math.isfinite(x) for x in times + values):
        raise SweepError("waveform contains nonfinite samples")
    if any(b <= a for a, b in zip(times, times[1:])):
        raise SweepError("waveform time is not strictly increasing")
    if not arc.expected:
        raise SweepError("no active truth-table intervals were supplied")
    low, high = vss_v + low_fraction * span, vss_v + high_fraction * span
    checks = []
    previous_edge = None
    for index, expected in enumerate(arc.expected):
        edge, deadline = float(expected.edge_time_s), float(expected.deadline_s)
        if not math.isfinite(edge) or not math.isfinite(deadline) or deadline < edge:
            raise SweepError("invalid expected edge or settling deadline")
        if (previous_edge is not None and edge <= previous_edge) or edge < times[0] or edge > times[-1]:
            raise SweepError("expected edges are unordered or outside waveform coverage")
        prior_edge = previous_edge
        previous_edge = edge
        next_edge = float(arc.expected[index + 1].edge_time_s) if index + 1 < len(arc.expected) else None
        if next_edge is not None:
            end, _margin = _guarded_window(edge, deadline, next_edge)
        elif prior_edge is not None:
            interval = edge - prior_edge
            end, _margin = _guarded_window(edge, deadline, edge + interval)
            end = min(times[-1], end)
        else:
            end = times[-1]
        if end < deadline:
            checks.append({"edgeTimeS": edge, "deadlineS": deadline,
                           "expected": "high" if expected.high else "low",
                           "status": "fail", "reason": "settling_deadline_after_next_edge"})
            continue
        if deadline < times[0] or end > times[-1]:
            raise SweepError("waveform does not cover expected interval")
        # Check the deadline and the entire settled interval, including its endpoint.
        interval_samples = [v for t, v in zip(times, values) if deadline < t <= end]
        observed = [_interpolate(times, values, deadline)]
        observed.extend(interval_samples)
        if end > deadline:
            observed.append(_interpolate(times, values, end))
        if expected.high:
            passed = all(v >= high for v in observed)
            reason = None if passed else "output_not_valid_high_after_deadline"
        else:
            passed = all(v <= low for v in observed)
            reason = None if passed else "output_not_valid_low_after_deadline"
        checks.append({"edgeTimeS": edge, "deadlineS": deadline,
                       "expected": "high" if expected.high else "low",
                       "status": "pass" if passed else "fail", "reason": reason})
    failed = [item for item in checks if item["status"] == "fail"]
    return {"name": arc.name, "status": "fail" if failed else "pass",
            "reason": failed[0]["reason"] if failed else None,
            "checks": checks, "waveformPath": arc.waveform_path}


def classify_observation(observation: PointObservation, vdd_v: float, vss_v: float,
                         low_fraction: float = 0.2,
                         high_fraction: float = 0.8) -> Dict[str, Any]:
    status = observation.simulator_status.lower()
    if status != "ok":
        reason = {"timeout": "simulator_timeout", "cancelled": "simulator_cancelled",
                  "error": "simulator_error"}.get(status, "simulator_status_" + status)
        return {"status": "unknown", "reason": reason, "arcs": []}
    if not observation.arcs:
        return {"status": "unknown", "reason": "no_waveforms", "arcs": []}
    arcs = []
    for arc in observation.arcs:
        try:
            arcs.append(classify_arc_waveform(arc, vdd_v, vss_v, low_fraction, high_fraction))
        except (ValueError, TypeError, OverflowError) as exc:
            arcs.append({"name": arc.name, "status": "unknown",
                         "reason": "waveform_invalid:" + str(exc),
                         "waveformPath": arc.waveform_path, "checks": []})
    states = {arc["status"] for arc in arcs}
    # A frequency is classifiable only when every required arc has valid evidence.
    # Unknown source stimulus or waveform metadata must never become a cell failure.
    if "unknown" in states:
        return {"status": "unknown",
                "reason": next(a["reason"] for a in arcs if a["status"] == "unknown"),
                "arcs": arcs}
    if "fail" in states:
        return {"status": "fail", "reason": next(a["reason"] for a in arcs if a["status"] == "fail"), "arcs": arcs}
    return {"status": "pass", "reason": "all_active_arcs_pass", "arcs": arcs}
def _validate_config(config: SweepConfig) -> None:
    lo = _finite_positive(config.min_frequency_hz, "min_frequency_hz")
    hi = _finite_positive(config.max_frequency_hz, "max_frequency_hz")
    tol = _finite_positive(config.tolerance_hz, "tolerance_hz")
    if lo >= hi or tol >= hi - lo:
        raise SweepError("frequency bounds/tolerance are inconsistent")
    if type(config.max_runs) is not int or type(config.coarse_points) is not int:
        raise SweepError("max_runs and coarse_points must be integers")
    if not 2 <= config.coarse_points <= config.max_runs:
        raise SweepError("max_runs and coarse_points must be positive and coarse_points <= max_runs")
    vdd = config.conditions.get("voltageV")
    vss = config.conditions.get("groundVoltageV")
    try:
        vdd, vss = float(vdd), float(vss)
    except (TypeError, ValueError):
        raise SweepError("conditions must provide actual voltageV and groundVoltageV")
    if not math.isfinite(vdd) or not math.isfinite(vss) or vdd <= vss:
        raise SweepError("actual voltageV and groundVoltageV must be finite, with VDD > VSS")
    try:
        temperature = float(config.conditions["temperatureC"])
    except (KeyError, TypeError, ValueError):
        raise SweepError("conditions must provide actual temperatureC")
    if not math.isfinite(temperature):
        raise SweepError("actual temperatureC must be finite")
    corner = config.conditions.get("corner")
    if not isinstance(corner, str) or not corner.strip():
        raise SweepError("conditions must provide a nonempty actual corner")
    if (not math.isfinite(config.low_fraction) or not math.isfinite(config.high_fraction)
            or not 0 <= config.low_fraction < config.high_fraction <= 1):
        raise SweepError("invalid output logic thresholds")


def _write_evidence(config: SweepConfig, result: SweepResult) -> None:
    config.evidence_dir.mkdir(parents=True, exist_ok=True)
    target = config.evidence_dir / "frequency-sweep.json"
    payload = asdict(result)
    payload["protocol_version"] = FREQUENCY_PROTOCOL
    payload["evidence_path"] = str(target)
    target.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    result.evidence_path = str(target)


def run_frequency_sweep(
    config: SweepConfig,
    run_point: Callable[[float, Path], PointObservation],
    should_cancel: Optional[Callable[[], bool]] = None,
) -> SweepResult:
    """Run a bounded coarse-to-fine sweep using the caller's tracked simulator."""
    _validate_config(config)
    config.evidence_dir.mkdir(parents=True, exist_ok=True)
    cache: Dict[float, PointResult] = {}
    low, high = float(config.min_frequency_hz), float(config.max_frequency_hz)
    cancelled = False

    def sample(frequency: float) -> Optional[PointResult]:
        nonlocal cancelled
        frequency = float(frequency)
        if frequency in cache:
            return cache[frequency]
        if len(cache) >= config.max_runs:
            return None
        if should_cancel is not None and should_cancel():
            cancelled = True
            return None
        point_dir = config.evidence_dir / ("point-" + format(frequency, ".17g") + "hz")
        point_dir.mkdir(parents=True, exist_ok=True)
        try:
            observation = run_point(frequency, point_dir)
            if not isinstance(observation, PointObservation):
                raise TypeError("run_point must return PointObservation")
        except Exception as exc:
            observation = PointObservation("error", metadata={"runnerError": str(exc)})
        vdd, vss = float(config.conditions["voltageV"]), float(config.conditions["groundVoltageV"])
        classified = classify_observation(observation, vdd, vss, config.low_fraction, config.high_fraction)
        point = PointResult(
            frequency_hz=frequency,
            simulator_status=observation.simulator_status,
            electrical_status=classified["status"], reason=classified["reason"],
            arcs=classified["arcs"], log_path=observation.log_path,
            deck_path=observation.deck_path,
            waveform_paths=[a.waveform_path for a in observation.arcs if a.waveform_path],
            metadata=dict(observation.metadata),
        )
        cache[frequency] = point
        return point

    coarse = [low + (high - low) * i / (config.coarse_points - 1)
              for i in range(config.coarse_points)]
    stop_reason = None
    for frequency in coarse:
        if sample(frequency) is None:
            stop_reason = "cancelled" if cancelled else "run_budget_exhausted"
            break

    ordered = sorted(cache.values(), key=lambda point: point.frequency_hz)
    if ordered and ordered[0].electrical_status == "unknown" and stop_reason is None:
        stop_reason = "minimum_frequency_unknown"
    if (ordered and ordered[-1].frequency_hz == high
            and ordered[-1].electrical_status == "unknown" and stop_reason is None):
        stop_reason = "maximum_frequency_unknown"
    pass_points = [p for p in ordered if p.electrical_status == "pass"]
    fail_points = [p for p in ordered if p.electrical_status == "fail"]
    highest_pass = max(pass_points, key=lambda p: p.frequency_hz) if pass_points else None
    lowest_fail = min(fail_points, key=lambda p: p.frequency_hz) if fail_points else None
    if highest_pass and lowest_fail and highest_pass.frequency_hz > lowest_fail.frequency_hz:
        stop_reason = "non_monotonic_pass_fail_observations"
    elif ordered and ordered[0].electrical_status == "fail":
        stop_reason = "minimum_frequency_failed"
    elif highest_pass and lowest_fail:
        # Do not interpolate across unknown simulator/waveform outcomes.
        gap = [p for p in ordered if highest_pass.frequency_hz < p.frequency_hz < lowest_fail.frequency_hz
               and p.electrical_status == "unknown"]
        if gap:
            stop_reason = "unknown_observation_inside_bracket"
        while stop_reason is None and lowest_fail.frequency_hz - highest_pass.frequency_hz > config.tolerance_hz:
            mid = (highest_pass.frequency_hz + lowest_fail.frequency_hz) / 2.0
            point = sample(mid)
            if point is None:
                stop_reason = "cancelled" if cancelled else "run_budget_exhausted"
                break
            if point.electrical_status == "unknown":
                stop_reason = "unknown_observation_inside_bracket"
                break
            if point.electrical_status == "pass":
                highest_pass = point
            else:
                lowest_fail = point
    upper_not_found = bool(highest_pass and lowest_fail is None and highest_pass.frequency_hz == high)
    if stop_reason == "cancelled":
        state = "cancelled"
    elif stop_reason == "non_monotonic_pass_fail_observations":
        state = "non_monotonic"
    elif stop_reason in ("minimum_frequency_failed", "minimum_frequency_unknown",
                         "maximum_frequency_unknown", "unknown_observation_inside_bracket"):
        state = "indeterminate"
    elif highest_pass is None:
        state = "no_verified_pass"
    elif lowest_fail is None:
        state = "upper_bound_not_found" if upper_not_found else "indeterminate"
    elif lowest_fail.frequency_hz - highest_pass.frequency_hz <= config.tolerance_hz:
        state = "bracketed"
    else:
        state = "incomplete"
    valid_ordered_bracket = bool(
        highest_pass and lowest_fail
        and highest_pass.frequency_hz <= lowest_fail.frequency_hz
        and state != "non_monotonic"
    )
    width = (lowest_fail.frequency_hz - highest_pass.frequency_hz
             if valid_ordered_bracket else None)
    result = SweepResult(
        status=state, metric="maximum_verified_toggle_frequency",
        scope="combinational_cell_arc_toggle; not chip_clock_Fmax",
        maximum_verified_toggle_frequency_hz=highest_pass.frequency_hz if highest_pass else None,
        lowest_verified_fail_frequency_hz=lowest_fail.frequency_hz if lowest_fail else None,
        bracket_width_hz=width,
        tolerance_met=bool(width is not None and 0 <= width <= config.tolerance_hz),
        upper_bound_not_found=upper_not_found, conditions=dict(config.conditions),
        points=sorted(cache.values(), key=lambda point: point.frequency_hz),
        stop_reason=stop_reason,
    )
    _write_evidence(config, result)
    return result
def _load_frequency_rows(filename: Path, columns: int) -> List[List[float]]:
    rows: List[List[float]] = []
    with filename.open(encoding="utf-8", errors="strict") as source:
        for line in source:
            tokens = line.split()
            if not tokens or tokens[0].lower() in ("time", "scale"):
                continue
            if len(tokens) != columns:
                raise SweepError("unexpected frequency waveform column count")
            if len(rows) >= 1_000_000:
                raise SweepError("frequency waveform exceeds row limit")
            try:
                row = [float(token) for token in tokens]
            except ValueError as exc:
                raise SweepError("frequency waveform contains nonnumeric sample") from exc
            if any(not math.isfinite(value) for value in row):
                raise SweepError("frequency waveform contains nonfinite sample")
            rows.append(row)
    if len(rows) < 2 or any(b[0] <= a[0] for a, b in zip(rows, rows[1:])):
        raise SweepError("frequency waveform is empty or time is not strictly increasing")
    return rows


def evaluate_round(root: Path, round_index: int) -> Dict[str, Any]:
    """Classify a retained frequency round and append adaptive bounded-search state.

    The native safe runner owns all simulator calls. This evaluator only reads the
    round request, native waveforms/logs/decks, and frozen measurement metadata.
    """
    root = Path(root).resolve()
    if type(round_index) is not int or not 0 <= round_index < 16:
        raise SweepError("frequency round index must be an integer in [0, 15]")
    output = root / "output" / "dtco"
    request_path = output / ("frequency-round-" + str(round_index) + ".json")
    if not request_path.is_file() or request_path.is_symlink():
        raise SweepError("frequency round request is missing or unsafe")
    request = json.loads(request_path.read_text(encoding="utf-8"))
    if request.get("protocolVersion") != FREQUENCY_PROTOCOL:
        raise SweepError("frequency request uses a superseded or unknown protocol")
    measurement_path = root / "input" / "measurement.json"
    measurement = json.loads(measurement_path.read_text(encoding="utf-8"))
    conditions = {
        "voltageV": measurement["voltageV"],
        "groundVoltageV": measurement.get("groundVoltageV", 0.0),
        "temperatureC": measurement["temperatureC"],
        "corner": measurement.get("processCorner", "tt"),
        "loadFf": measurement.get("loadFf"),
        "inputSlewPs": measurement.get("inputSlewPs"),
    }
    state_path = output / "frequency-state.json"
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {
        "schemaVersion": "dtco.frequency-state.v1", "protocolVersion": FREQUENCY_PROTOCOL,
        "rounds": [], "conditions": conditions,
        "minFrequencyHz": request.get("minFrequencyHz"), "maxFrequencyHz": request.get("maxFrequencyHz"), "toleranceHz": request.get("toleranceHz"),
        "metric": "maximum_verified_toggle_frequency", "scope": "combinational_cell_arc_toggle; not chip_clock_Fmax",
    }
    if state.get("protocolVersion") != FREQUENCY_PROTOCOL:
        raise SweepError("frequency state uses a superseded or unknown protocol")
    if request.get("status") == "skipped":
        result = {"round": round_index, "protocolVersion": FREQUENCY_PROTOCOL,
                  "status": "skipped", "reason": request.get("reason", "search_complete"),
                  "frequencyHz": request.get("frequencyHz"), "arcs": []}
        state["rounds"] = [r for r in state.get("rounds", []) if r.get("round") != round_index] + [result]
        state["rounds"].sort(key=lambda r: r["round"])
        request_path.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        state_path.write_text(json.dumps(state, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        summary_path = output / "frequency.json"
        summary = json.loads(summary_path.read_text(encoding="utf-8")) if summary_path.is_file() else {
            "schemaVersion": "dtco.frequency.v1", "metric": state["metric"], "scope": state["scope"],
            "status": state.get("searchStatus", "indeterminate"),
            "maximumVerifiedToggleFrequencyHz": state.get("highestPassHz"),
            "lowestVerifiedFailFrequencyHz": state.get("lowestFailHz"),
            "bracketWidthHz": state.get("bracketWidthHz"),
            "toleranceMet": state.get("toleranceMet", False),
            "upperBoundNotFound": state.get("upperBoundNotFound", False), "conditions": conditions,
            "statePath": "output/dtco/frequency-state.json",
        }
        summary["protocolVersion"] = FREQUENCY_PROTOCOL
        summary["rounds"] = state["rounds"]
        summary_path.write_text(json.dumps(summary, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        return result
    frequency = _finite_positive(request.get("frequencyHz"), "round frequency")
    arcs_request = request.get("arcs")
    if not isinstance(arcs_request, list) or not arcs_request:
        raise SweepError("frequency round must include all sensitized arcs")
    vdd, vss = float(conditions["voltageV"]), float(conditions["groundVoltageV"])
    period = 1.0 / frequency
    slew = _finite_positive(float(measurement["inputSlewPs"]) * 1e-12, "input slew")
    inputs = measurement["inputs"]
    truth = measurement.get("truthTable")
    if not isinstance(truth, list) or not truth:
        raise SweepError("frozen truth table is required for frequency classification")
    truth_map = {tuple(sorted(row["inputs"].items())): int(row["output"]) for row in truth}
    results = []
    for item in arcs_request:
        name = str(item["id"])
        arc_result: Dict[str, Any]
        provenance: Dict[str, Any] = {}
        try:
            if not name or len(name) > 200 or "/" in name or "\\" in name:
                raise SweepError("unsafe frequency arc identifier")
            file_id = name if re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", name) else re.sub(r"[^A-Za-z0-9_.-]", "_", name)[:70] + "-" + hashlib.sha256(name.encode()).hexdigest()[:16]
            waveform_path = _safe_relative(output, item["waveformPath"])
            log_path = _safe_relative(output, item["logPath"])
            deck_path = _safe_relative(output, item["deckPath"])
            process_path = output / ("frequency-run-" + str(round_index) + "-" + file_id + ".json")
            if not process_path.is_file() or process_path.is_symlink():
                raise RuntimeError("simulator_process_evidence_missing")
            process = json.loads(process_path.read_text(encoding="utf-8"))
            provenance = {
                "waveformPath": str(waveform_path.relative_to(root)),
                "logPath": str(log_path.relative_to(root)),
                "deckPath": str(deck_path.relative_to(root)),
                "simulatorExitCode": process.get("exitCode"),
                "processEvidencePath": str(process_path.relative_to(root)),
            }
            for field, evidence_path in (("waveformSha256", waveform_path),
                                         ("logSha256", log_path),
                                         ("deckSha256", deck_path),
                                         ("processEvidenceSha256", process_path)):
                if evidence_path.is_file() and not evidence_path.is_symlink():
                    provenance[field] = digest_file(evidence_path)
            if process.get("exitCode") != 0:
                raise RuntimeError("simulator_exit_code_" + str(process.get("exitCode")))
            log = log_path.read_text(encoding="utf-8", errors="replace")
            if re.search(r"^\s*(?:Error|Fatal|run simulation\(s\) aborted)", log, re.M | re.I):
                raise RuntimeError("simulator_error")
            rows = _load_frequency_rows(waveform_path, len(inputs) + 3)
            fixed = item["fixedInputs"]
            active = item["input"]
            if active not in inputs or any(pin not in inputs for pin in fixed):
                raise SweepError("arc stimulus pins are absent from the frozen input columns")
            expected = []
            deadlines = []
            # Eight full cycles provide repeated active output intervals. The
            # same input slew is held constant at every tested frequency.
            for edge_index in range(16):
                edge = edge_index * period / 2.0
                value = 1 if edge_index % 2 == 0 else 0
                vector = dict(fixed)
                vector[active] = value
                output_level = truth_map[tuple(sorted(vector.items()))]
                deadline = edge + max(2.0 * slew, 0.1 * period)
                deadlines.append(deadline)
                expected.append(ExpectedLevel(edge, deadline, bool(output_level)))
            times = [row[0] for row in rows]
            span = vdd - vss
            low_threshold, high_threshold = vss + 0.2 * span, vss + 0.8 * span
            stimulus_failure = None
            for pin, bit in fixed.items():
                column = inputs.index(pin) + 1
                values = [row[column] for row in rows]
                valid = all(value <= low_threshold for value in values) if bit == 0 else all(value >= high_threshold for value in values)
                if not valid:
                    stimulus_failure = {"name": name, "status": "unknown",
                        "reason": "sensitizing_input_logic_level_invalid:" + pin,
                        "waveformPath": str(waveform_path.relative_to(root)), "checks": []}
                    break
            if stimulus_failure is None:
                column = inputs.index(active) + 1
                input_values = [row[column] for row in rows]
                for edge_index, deadline in enumerate(deadlines):
                    edge = edge_index * period / 2.0
                    next_edge = ((edge_index + 1) * period / 2.0 if edge_index < 15
                                 else 8.0 * period)
                    bit = 1 if edge_index % 2 == 0 else 0
                    valid, end = _logic_hold_window(times, input_values, edge, deadline,
                                                    next_edge, bool(bit), low_threshold,
                                                    high_threshold)
                    if end < deadline:
                        stimulus_failure = {"name": name, "status": "unknown",
                            "reason": "active_input_settling_window_unavailable",
                            "waveformPath": str(waveform_path.relative_to(root)),
                            "checks": [{"edgeTimeS": edge, "deadlineS": deadline,
                                        "holdEndS": end, "expected": "high" if bit else "low",
                                        "status": "unknown"}]}
                        break
                    if not valid:
                        stimulus_failure = {"name": name, "status": "unknown",
                            "reason": "active_input_logic_level_invalid_after_deadline",
                            "waveformPath": str(waveform_path.relative_to(root)),
                            "checks": [{"edgeTimeS": edge, "deadlineS": deadline,
                                        "holdEndS": end, "expected": "high" if bit else "low",
                                        "status": "unknown"}]}
                        break
            arc = ArcWaveform(name, times, [row[len(inputs) + 1] for row in rows],
                              expected, str(waveform_path))
            classified = stimulus_failure or classify_arc_waveform(arc, vdd, vss)
            classified.update(input=active, transition=item.get("transition"), fixedInputs=fixed,
                              **provenance)
            arc_result = classified
        except RuntimeError as exc:
            arc_result = {"name": name, "status": "unknown", "reason": str(exc),
                          "waveformPath": item.get("waveformPath"), "logPath": item.get("logPath"),
                          "deckPath": item.get("deckPath"), "checks": [], **provenance}
        except (OSError, ValueError, KeyError, TypeError, IndexError) as exc:
            arc_result = {"name": name, "status": "unknown", "reason": "evidence_invalid:" + str(exc),
                          "waveformPath": item.get("waveformPath"), "logPath": item.get("logPath"),
                          "deckPath": item.get("deckPath"), "checks": [], **provenance}
        results.append(arc_result)
    states = {item["status"] for item in results}
    # Unknown stimulus/evidence on any required arc invalidates the whole point.
    status = "unknown" if "unknown" in states else "fail" if "fail" in states else "pass"
    reason = next((item.get("reason") for item in results
                   if item["status"] == status and item.get("reason")),
                  "all_active_arcs_pass" if status == "pass" else status)
    round_result = {"round": round_index, "protocolVersion": FREQUENCY_PROTOCOL,
                    "frequencyHz": frequency, "status": status, "reason": reason,
                    "arcs": results, "conditions": conditions}
    state["rounds"] = [r for r in state.get("rounds", []) if r.get("round") != round_index] + [round_result]
    state["rounds"].sort(key=lambda r: r["round"])
    evaluated = sorted([r for r in state["rounds"] if r.get("status") in ("pass", "fail")],
                       key=lambda r: r["frequencyHz"])
    passes = [r for r in evaluated if r["status"] == "pass"]
    fails = [r for r in evaluated if r["status"] == "fail"]
    highest = max(passes, key=lambda r: r["frequencyHz"]) if passes else None
    lowest = min(fails, key=lambda r: r["frequencyHz"]) if fails else None
    unknowns = [r for r in state["rounds"] if r.get("status") == "unknown"]
    inverted = bool(highest and lowest and highest["frequencyHz"] > lowest["frequencyHz"])
    unknown_in_bounds = bool(highest and lowest and any(highest["frequencyHz"] < r.get("frequencyHz", -1) < lowest["frequencyHz"] for r in unknowns))
    if unknowns:
        next_frequency = None
        search_status = "indeterminate"
    elif inverted:
        next_frequency = None
        search_status = "non_monotonic"
    elif highest and lowest:
        width = lowest["frequencyHz"] - highest["frequencyHz"]
        next_frequency = (highest["frequencyHz"] + lowest["frequencyHz"]) / 2 if width > _finite_positive(state.get("toleranceHz", 1.0), "frequency tolerance") else None
        search_status = "bracketed" if next_frequency is None else "searching"
    elif highest and not lowest:
        maximum = _finite_positive(state.get("maxFrequencyHz"), "maximum frequency")
        next_frequency = maximum if highest["frequencyHz"] < maximum else None
        search_status = "searching" if next_frequency else "upper_bound_not_found"
    elif lowest and not highest:
        minimum = _finite_positive(state.get("minFrequencyHz"), "minimum frequency")
        next_frequency = minimum if lowest["frequencyHz"] > minimum else None
        search_status = "searching" if next_frequency else "no_verified_pass"
    else:
        next_frequency = None
        search_status = "indeterminate"
    state.update({"protocolVersion": FREQUENCY_PROTOCOL,
                  "rounds": state["rounds"], "highestPassHz": highest["frequencyHz"] if highest else None,
                  "lowestFailHz": lowest["frequencyHz"] if lowest else None,
                  "bracketWidthHz": (lowest["frequencyHz"] - highest["frequencyHz"]) if highest and lowest and not inverted else None,
                  "nextFrequencyHz": next_frequency, "searchStatus": search_status,
                  "toleranceMet": bool(highest and lowest and not inverted and
                                       lowest["frequencyHz"] - highest["frequencyHz"] <= state["toleranceHz"]),
                  "upperBoundNotFound": bool(highest and not lowest and search_status == "upper_bound_not_found")})
    state_path.write_text(json.dumps(state, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    summary = {"schemaVersion": "dtco.frequency.v1", "protocolVersion": FREQUENCY_PROTOCOL,
               "metric": state["metric"], "scope": state["scope"],
               "status": state["searchStatus"], "maximumVerifiedToggleFrequencyHz": state["highestPassHz"],
               "lowestVerifiedFailFrequencyHz": state["lowestFailHz"], "bracketWidthHz": state["bracketWidthHz"], "toleranceMet": state["toleranceMet"],
               "upperBoundNotFound": state["upperBoundNotFound"], "conditions": conditions,
               "rounds": state["rounds"], "statePath": "output/dtco/frequency-state.json"}
    (output / "frequency.json").write_text(json.dumps(summary, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    return round_result


def _safe_relative(root: Path, relative: str) -> Path:
    if not isinstance(relative, str) or relative.startswith("/") or "\\" in relative or any(p in ("", ".", "..") for p in relative.split("/")):
        raise SweepError("unsafe frequency evidence path")
    path = root / relative
    if path.is_symlink() or not path.is_file() or root not in path.resolve().parents:
        raise SweepError("frequency evidence must be a regular file inside the DTCO output")
    return path


def digest_file(filename: Path) -> str:
    return hashlib.sha256(filename.read_bytes()).hexdigest()


__all__ = [
    "ArcWaveform", "ExpectedLevel", "PointObservation", "PointResult",
    "SweepConfig", "SweepError", "SweepResult", "classify_arc_waveform",
    "classify_observation", "evaluate_round", "run_frequency_sweep",
]
