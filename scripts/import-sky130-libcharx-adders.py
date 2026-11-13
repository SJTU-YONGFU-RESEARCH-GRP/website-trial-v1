#!/usr/bin/env python3
"""Import the verified LibCharX SKY130 8-bit adder experiment into Digital.

The source experiment already contains formal proofs, Yosys mapped area, and
OpenSTA critical paths for five equivalent 8-bit architectures.  Digital also
requires ``powerMw``.  This importer derives a transparent representative
transition-power proxy from the middle LibCharX NLDM slew/load point, averaged
across each cell's characterized rise/fall arcs and summed by mapped cell count.
It is deliberately not presented as activity-based whole-design power.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "data" / "digital-technologies"
DEFAULT_SOURCE = Path("/home/duhaochen/LibCharX/characterization/sky130_adders")
PROCESS_NODE = "sky130hd_libcharx"
CANONICAL_TECHNOLOGY = "130nm"
DISPLAY_NAME = "SKY130 HD · LibCharX"

TOP_TO_ARCHITECTURE = {
    "adder8_ripple": "ripple_carry_adder",
    "adder8_kogge_stone": "kogge_stone_adder",
    "adder8_carry_select": "carry_select_adder",
    "adder8_carry_skip": "carry_skip_adder",
    "adder8_alternating_polarity": "alternating_polarity_adder",
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def technology_uid() -> str:
    identity = json.dumps(
        {
            "schemaVersion": 1,
            "processNode": PROCESS_NODE,
            "canonicalTechnology": CANONICAL_TECHNOLOGY,
            "isNamedPdk": True,
        },
        separators=(",", ":"),
    )
    return hashlib.md5(identity.encode("utf-8")).hexdigest()


def required_file(path: Path) -> Path:
    if not path.is_file() or path.stat().st_size == 0:
        raise FileNotFoundError(f"required non-empty source artifact: {path}")
    return path


def representative_cell_power_w(characterization_rows: list[dict[str, Any]]) -> dict[str, float]:
    """Average rise/fall power at the middle 3×3 NLDM point for every cell."""
    powers: dict[str, float] = {}
    for cell in characterization_rows:
        values: list[float] = []
        for arc in cell.get("timing", []):
            for table_name in ("rise_power", "fall_power"):
                table = arc.get(table_name, {}).get("values", [])
                if len(table) < 2 or len(table[1]) < 2:
                    raise ValueError(
                        f"{cell.get('cell_name')}/{table_name}: expected a 3×3 NLDM table"
                    )
                value = float(table[1][1])
                if not math.isfinite(value) or value <= 0:
                    raise ValueError(
                        f"{cell.get('cell_name')}/{table_name}: invalid middle-point power {value}"
                    )
                values.append(value)
        if not values:
            raise ValueError(f"{cell.get('cell_name')}: no characterized power tables")
        powers[str(cell["cell_name"])] = sum(values) / len(values)
    return powers


def copy_artifact(source: Path, destination: Path) -> None:
    required_file(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    args = parser.parse_args()
    source = args.source.resolve()
    results_dir = source / "results"
    application = source / "application"
    reports = application / "reports"

    liberty_source = required_file(results_dir / "libcharx_adder_test.lib")
    characterization_result_path = required_file(results_dir / "results.json")
    characterization_manifest_path = required_file(results_dir / "run_manifest.json")
    synthesis_path = required_file(reports / "synthesis_summary.json")
    timing_path = required_file(reports / "timing_summary.json")
    verification_path = required_file(reports / "verification_summary.json")
    synthesis = read_json(synthesis_path)
    timing = read_json(timing_path)
    verification = read_json(verification_path)
    characterization_manifest = read_json(characterization_manifest_path)
    characterization_rows = read_json(characterization_result_path)

    if verification.get("status") != "PASS":
        raise ValueError("source verification_summary.json is not PASS")
    if set(synthesis.get("architectures", {})) != set(TOP_TO_ARCHITECTURE):
        raise ValueError("synthesis summary does not contain the expected five adders")
    if set(timing.get("architectures", {})) != set(TOP_TO_ARCHITECTURE):
        raise ValueError("timing summary does not contain the expected five adders")
    expected_liberty_hash = str(synthesis["liberty_sha256"])
    if sha256(liberty_source) != expected_liberty_hash:
        raise ValueError("source Liberty hash does not match synthesis summary")
    if str(timing["liberty_sha256"]) != expected_liberty_hash:
        raise ValueError("timing and synthesis summaries used different Liberty files")

    cell_power_w = representative_cell_power_w(characterization_rows)
    uid = technology_uid()
    resource = STORE / uid
    liberty_destination = resource / "library" / "timing.lib"
    copy_artifact(liberty_source, liberty_destination)
    generated_at = datetime.now(timezone.utc).isoformat()
    constraints = timing["constraints"]

    technology = {
        "schemaVersion": 1,
        "uid": uid,
        "processNode": PROCESS_NODE,
        "displayName": DISPLAY_NAME,
        "canonicalTechnology": CANONICAL_TECHNOLOGY,
        "isNamedPdk": True,
        "identity": {
            "schemaVersion": 1,
            "processNode": PROCESS_NODE,
            "canonicalTechnology": CANONICAL_TECHNOLOGY,
            "isNamedPdk": True,
        },
        "pdk": "SKY130A",
        "standardCellLibrary": "sky130_fd_sc_hd · LibCharX adder-cell subset",
        "corner": "tt_025C_1v80",
        "upstream": "LibCharX characterization/sky130_adders closed-loop experiment",
        "sourceExperiment": "LibCharX/characterization/sky130_adders",
        "materializedLibertySha256": sha256(liberty_destination),
        "flow": {
            "architectures": list(TOP_TO_ARCHITECTURE.values()),
            "widths": [8],
            "constraints": {
                "inputSlewNs": constraints["input_slew_ns"],
                "outputLoadPf": constraints["output_load_pf"],
                "virtualClockPeriodNs": constraints["virtual_clock_period_ns"],
            },
            "tools": {
                "libcharx": "source run manifest with 538/538 successful simulations",
                "yosys": synthesis["yosys_version"],
                "opensta": timing["opensta_version"],
            },
            "metricPolicy": {
                "fmaxMhz": "1000 / existing OpenSTA combinational critical-path arrival_ns",
                "areaUm2": "existing Yosys stat -liberty mapped-cell area",
                "powerMw": (
                    "representative LibCharX transition-power proxy: middle 3x3 slew/load point, "
                    "mean rise/fall characterized power per cell, summed by mapped cell count"
                ),
            },
            "verification": {
                "status": "PASS",
                "method": "Yosys SAT for RTL and mapped-netlist equivalence",
            },
        },
    }
    write_json(resource / "technology.json", technology)

    shared_rtl = application / "rtl"
    for top, architecture in TOP_TO_ARCHITECTURE.items():
        synth = synthesis["architectures"][top]
        sta = timing["architectures"][top]
        delay_ns = float(sta["arrival_ns"])
        area_um2 = float(synth["area"])
        counts = {str(name): int(count) for name, count in synth["cell_types"].items()}
        missing_power = sorted(set(counts) - set(cell_power_w))
        if missing_power:
            raise ValueError(f"{top}: no LibCharX power data for cells {missing_power}")
        power_mw = 1000.0 * sum(cell_power_w[name] * count for name, count in counts.items())
        if delay_ns <= 0 or area_um2 <= 0 or power_mw <= 0:
            raise ValueError(f"{top}: non-positive PPA result")

        point = resource / "results" / "adders" / architecture / "w8"
        source_rtl = required_file(Path(synth["source"]))
        mapped_v = required_file(Path(synth["mapped_verilog"]))
        mapped_json = required_file(Path(synth["mapped_json"]))
        yosys_log = required_file(Path(synth["yosys_log"]))
        area_report = required_file(Path(synth["stat_report"]))
        sta_log = required_file(Path(sta["sta_log"]))
        copy_artifact(source_rtl, point / "rtl.v")
        copy_artifact(shared_rtl / "adder_primitives.v", point / "adder_primitives.v")
        copy_artifact(shared_rtl / "cells_blackbox.v", point / "cells_blackbox.v")
        copy_artifact(shared_rtl / "cells_functional.v", point / "cells_functional.v")
        copy_artifact(mapped_v, point / "mapped.v")
        copy_artifact(mapped_json, point / "mapped.json")
        copy_artifact(
            application / "generated_scripts" / f"{top}.ys",
            point / "synthesis.ys",
        )
        copy_artifact(yosys_log, point / "synthesis.log")
        copy_artifact(area_report, point / "area.rpt")
        copy_artifact(
            application / "generated_scripts" / f"{top}_sta.tcl",
            point / "sta.tcl",
        )
        copy_artifact(sta_log, point / "sta.log")

        result = {
            "architecture": architecture,
            "designFamily": "libcharx_sky130_adders",
            "category": "adders",
            "bitWidth": 8,
            "processNode": PROCESS_NODE,
            "canonicalTechnology": CANONICAL_TECHNOLOGY,
            "isNamedPdk": True,
            "fmaxMhz": round(1000.0 / delay_ns, 6),
            "powerMw": float(f"{power_mw:.12g}"),
            "areaUm2": round(area_um2, 6),
            "flow": {
                "schemaVersion": 1,
                "importedAtUtc": generated_at,
                "technologyUid": uid,
                "sourceExperiment": "LibCharX/characterization/sky130_adders",
                "pdk": "SKY130A",
                "standardCellLibrary": "sky130_fd_sc_hd · LibCharX adder-cell subset",
                "corner": "tt_025C_1v80",
                "libertySha256": expected_liberty_hash,
                "characterization": {
                    "status": "pass",
                    "simulator": "ngspice",
                    "simulationCalls": int(characterization_manifest["runtime"]["totals"]["simulation_calls"]),
                    "simulationSuccesses": int(characterization_manifest["runtime"]["totals"]["simulation_successes"]),
                    "nldmGrid": "3x3",
                    "representativeInputSlewNs": constraints["input_slew_ns"],
                    "representativeOutputLoadPf": constraints["output_load_pf"],
                },
                "formalVerification": {
                    "status": "pass",
                    "method": "Yosys SAT exhaustive equivalence",
                    "rtlAndMappedNetlist": True,
                },
                "synthesis": {
                    "status": "pass",
                    "numCells": int(synth["cell_count"]),
                    "numCellsByType": counts,
                    "mappedNetlist": "mapped.v",
                    "mappedJson": "mapped.json",
                    "log": "synthesis.log",
                },
                "sta": {
                    "status": "pass",
                    "criticalPathDelayNs": delay_ns,
                    "fmaxEstimateMhz": round(1000.0 / delay_ns, 6),
                    "startpoint": sta["startpoint"],
                    "endpoint": sta["endpoint"],
                    "slackNs": sta["slack_ns"],
                    "constraints": {
                        "virtualClockPeriodNs": constraints["virtual_clock_period_ns"],
                        "inputSlewNs": constraints["input_slew_ns"],
                        "outputLoadPf": constraints["output_load_pf"],
                    },
                    "log": "sta.log",
                },
                "ppa": {
                    "areaUm2": round(area_um2, 6),
                    "representativeTransitionPowerMw": float(f"{power_mw:.12g}"),
                    "powerMetric": "LibCharX middle-point mean rise/fall transition-power proxy",
                    "cellRepresentativePowerW": {
                        name: float(f"{cell_power_w[name]:.12g}") for name in counts
                    },
                },
                "notes": [
                    "This is the existing verified 8-bit closed-loop experiment; no synthetic widths were added.",
                    "Timing is pre-layout OpenSTA with the LibCharX-generated Liberty and common constraints.",
                    "Area is mapped standard-cell area and excludes routing.",
                    "powerMw is a representative transition-power proxy, not activity/VCD-based total design power or leakage.",
                ],
            },
        }
        write_json(point / "result.json", result)
        print(
            f"{architecture:28s} w8 cells={synth['cell_count']:3d} "
            f"fmax={result['fmaxMhz']:9.3f}MHz area={area_um2:9.4f}um^2 "
            f"power_proxy={power_mw:8.5f}mW"
        )

    evidence = resource / "evidence"
    evidence_sources = {
        "README.md": source / "README.md",
        "characterization-run-manifest.json": characterization_manifest_path,
        "characterization-results.json": characterization_result_path,
        "synthesis-summary.json": synthesis_path,
        "timing-summary.json": timing_path,
        "verification-summary.json": verification_path,
        "comparison.csv": reports / "comparison.csv",
        "final-report.md": reports / "final_report.md",
        "formal-rtl.log": application / "formal.log",
        "formal-mapped.log": application / "formal_mapped.log",
    }
    for destination_name, source_path in evidence_sources.items():
        copy_artifact(source_path, evidence / destination_name)

    print(f"Imported SKY130 LibCharX resource {uid} with 5 verified 8-bit points")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
