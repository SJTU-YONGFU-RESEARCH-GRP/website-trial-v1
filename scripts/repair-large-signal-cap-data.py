#!/usr/bin/env python3
"""Backfill the shared large-signal-cap data artifact for completed runs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from spice_model_benchmark.data_reader import DataReader
from spice_model_benchmark.large_signal_capacitance import (
    derive_transient_large_signal_caps,
)
from spice_model_benchmark.logger import Logger


SIMULATORS = ("hspice", "ngspice", "spectre")


def is_displayable(manifest: dict) -> bool:
    return (
        manifest.get("status") == "completed"
        and manifest.get("returnCode") == 0
        and manifest.get("benchmarkFixtureMode")
        == "fixed-simulator-native"
        and manifest.get("netlistAstUsed") is False
        and manifest.get("parameterPreservingInput") is True
        and manifest.get("modelFallbackApplied") is False
        and not manifest.get("internalFailureMarkers")
    )


def repair_run(run_dir: Path, logger: Logger) -> None:
    reader = DataReader(logger, output_dir=str(run_dir))
    charge = reader.read_trans_charge_conservation_data(str(run_dir))
    if charge is None or any(value is None for value in charge):
        raise RuntimeError(f"missing normalized transient charge data: {run_dir}")
    derive_transient_large_signal_caps(
        *charge,
        run_dir / "data" / "large_signal_caps.txt",
    )


def data_inventory(run_dir: Path) -> tuple[str, ...]:
    data_dir = run_dir / "data"
    return tuple(
        sorted(
            entry.name
            for entry in data_dir.iterdir()
            if entry.is_file() and entry.stat().st_size > 0
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data-root",
        type=Path,
        default=(
            Path(__file__).resolve().parents[1]
            / "data"
            / "spice-model-benchmark"
        ),
    )
    args = parser.parse_args()
    data_root = args.data_root.resolve()
    logger = Logger(log_level="ERROR")
    repaired: list[Path] = []
    inventories: dict[str, dict[str, tuple[str, ...]]] = {}

    for model_dir in sorted(data_root.iterdir()):
        if not model_dir.is_dir() or len(model_dir.name) != 32:
            continue
        for simulator in SIMULATORS:
            run_dir = model_dir / simulator
            manifest_path = run_dir / "manifest.json"
            if not manifest_path.is_file():
                continue
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if not is_displayable(manifest):
                continue
            repair_run(run_dir, logger)
            repaired.append(run_dir)
            inventories.setdefault(model_dir.name, {})[simulator] = (
                data_inventory(run_dir)
            )

    for md5, simulator_inventories in inventories.items():
        unique = set(simulator_inventories.values())
        if len(unique) != 1:
            details = {
                simulator: list(inventory)
                for simulator, inventory in simulator_inventories.items()
            }
            raise RuntimeError(
                f"data inventory mismatch after repair for {md5}: {details}"
            )

    print(
        f"repaired_runs={len(repaired)} "
        f"models={len(inventories)} "
        f"data_files_per_run="
        f"{len(next(iter(next(iter(inventories.values())).values())))}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
