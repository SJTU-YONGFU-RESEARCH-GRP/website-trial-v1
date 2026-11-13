#!/usr/bin/env python3
"""Validate and right-pad MR replay rows using README's align_artifact contract.

Native loading still verifies the netlist fingerprint, PDK and tracks. This
helper changes only short-row trailing dummy columns and placement hash lineage.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import re
import sys
import tempfile
from pathlib import Path

HASH = re.compile(r"^[0-9a-f]{16}$")
DUMMY = {"name": "dummy", "left": "dummy", "gate": "dummy", "right": "dummy",
         "nfin": 0, "width": 0.0, "vt": "SVT"}


def placement_hash(grid: dict) -> str:
    # Exact algorithm documented by native run_multirow_height_matrix.py.
    canonical = json.dumps(grid, sort_keys=True, separators=(",", ":"), allow_nan=False)
    value = 14695981039346656037
    for byte in canonical.encode("utf-8"):
        value = ((value ^ byte) * 1099511628211) & 0xffffffffffffffff
    return f"{value:016x}"


def integer(value: object, label: str, minimum: int, maximum: int) -> int:
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"{label} must be an integer between {minimum} and {maximum}")
    return value


def validate(source: object) -> dict:
    if not isinstance(source, dict) or type(source.get("schema_version")) is not int or source["schema_version"] != 1:
        raise ValueError("unsupported placement schema; expected native schema_version=1")
    for key in ("cell_name", "tech"):
        if not isinstance(source.get(key), str) or not source[key]:
            raise ValueError(f"missing placement {key}")
    for key in ("cell_fingerprint", "placement_hash"):
        if not isinstance(source.get(key), str) or not HASH.fullmatch(source[key]):
            raise ValueError(f"invalid placement {key}")
    if "parent_placement_hash" in source and source["parent_placement_hash"] != "" and (not isinstance(source["parent_placement_hash"], str) or not HASH.fullmatch(source["parent_placement_hash"])):
        raise ValueError("invalid parent_placement_hash")
    integer(source.get("track_num"), "track_num", 1, 100)
    row_count = integer(source.get("num_rows"), "num_rows", 1, 4)
    grid = source.get("grid")
    if not isinstance(grid, dict) or set(grid) != {"cell_width", "row_count", "rows"}:
        raise ValueError("grid must contain native cell_width, row_count and rows")
    width = integer(grid["cell_width"], "cell_width", 0, 1000000)
    if integer(grid["row_count"], "row_count", 1, 4) != row_count or not isinstance(grid["rows"], list) or len(grid["rows"]) != row_count:
        raise ValueError("placement row count mismatch")
    if integer(source.get("cell_width_cpp"), "cell_width_cpp", 2, 1000002) != width + 2:
        raise ValueError("placement CPP width mismatch")
    for row in grid["rows"]:
        if not isinstance(row, dict) or set(row) != {"width", "nmos", "pmos"}:
            raise ValueError("invalid placement row")
        row_width = integer(row["width"], "row width", 0, width)
        if row_count == 1 and row_width != width:
            raise ValueError("single-row width must equal cell_width")
        for kind in ("nmos", "pmos"):
            if not isinstance(row[kind], list) or len(row[kind]) != row_width:
                raise ValueError("placement row width does not match P/N column count")
            for trans in row[kind]:
                if not isinstance(trans, dict) or set(trans) != set(DUMMY):
                    raise ValueError("transistor must contain native name/left/gate/right/nfin/width/vt fields")
                for key in ("name", "left", "gate", "right"):
                    if not isinstance(trans[key], str) or not trans[key].isascii():
                        raise ValueError(f"transistor {key} must be a native ASCII string")
                integer(trans["nfin"], "nfin", -2147483648, 2147483647)
                # Native trans_json always emits the width as a JSON double.
                if type(trans["width"]) is not float or not math.isfinite(trans["width"]):
                    raise ValueError("transistor width must be a finite native JSON double")
                if trans["vt"] not in ("SVT", "LVT", "HVT"):
                    raise ValueError("invalid placement vt class")
    if placement_hash(grid) != source["placement_hash"]:
        raise ValueError("placement content hash mismatch (native README canonical JSON required)")
    return source


def align_artifact(source: dict) -> dict:
    result = copy.deepcopy(source)
    width = result["grid"]["cell_width"]
    for row in result["grid"]["rows"]:
        for kind in ("nmos", "pmos"):
            row[kind].extend(copy.deepcopy(DUMMY) for _ in range(width - row["width"]))
        row["width"] = width
    result["parent_placement_hash"] = source["placement_hash"]
    result["placement_hash"] = placement_hash(result["grid"])
    return result


def unique_object(items: list[tuple[str, object]]) -> dict:
    result: dict = {}
    for key, value in items:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(content)
    temporary.replace(path)


def prepare(input_path: Path, output_path: Path, artifacts_output: Path) -> dict:
    if input_path.resolve() == output_path.resolve():
        raise ValueError("input and prepared output paths must differ")
    raw = input_path.read_bytes()
    source = validate(json.loads(raw, object_pairs_hook=unique_object,
                                 parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f"non-finite JSON: {value}"))))
    widths = [row["width"] for row in source["grid"]["rows"]]
    changed = any(width != source["grid"]["cell_width"] for width in widths)
    derived = align_artifact(source) if changed else source
    content = (json.dumps(derived, indent=2, sort_keys=True, allow_nan=False) + "\n").encode("utf-8") if changed else raw
    sha = lambda value: hashlib.sha256(value).hexdigest()
    metadata = {"schemaVersion": "acg.replay-preparation.v1", "operation": "right_dummy_padding" if changed else "byte_copy",
                "changed": changed, "sourceSha256": sha(raw), "derivedSha256": sha(content),
                "sourcePlacementHash": source["placement_hash"], "derivedPlacementHash": derived["placement_hash"],
                "parentPlacementHash": derived.get("parent_placement_hash", ""), "cellName": source["cell_name"],
                "cellFingerprint": source["cell_fingerprint"], "technology": source["tech"], "trackNum": source["track_num"],
                "numRows": source["num_rows"], "sourceRowWidths": widths, "derivedRowWidths": [row["width"] for row in derived["grid"]["rows"]],
                "paddingColumnsPerRow": [source["grid"]["cell_width"] - width for width in widths],
                "preparedReplayPath": "output/replay/prepared-placement.json", "sourceReplayPath": "output/replay/source-placement.json", "rawUploadRetained": True,
                "nativeValidation": "Netlist/cell fingerprint, PDK and track compatibility remain enforced by native loading"}
    atomic_write(output_path, content)
    atomic_write(artifacts_output / "source-placement.json", raw)
    atomic_write(artifacts_output / "prepared-placement.json", content)
    atomic_write(artifacts_output / "preparation.json", (json.dumps(metadata, indent=2, sort_keys=True) + "\n").encode("utf-8"))
    return metadata


def self_test() -> dict:
    grid = {"cell_width": 2, "row_count": 2, "rows": [
        {"width": width, "nmos": [copy.deepcopy(DUMMY) for _ in range(width)],
         "pmos": [copy.deepcopy(DUMMY) for _ in range(width)]} for width in (2, 1)]}
    source = {"schema_version": 1, "cell_name": "self_test", "cell_fingerprint": "0000000000000000",
              "tech": "gf180", "track_num": 9, "num_rows": 2, "cell_width_cpp": 4,
              "placement_hash": "a2c3563212feeba0", "parent_placement_hash": "", "grid": grid}
    with tempfile.TemporaryDirectory(prefix="acg-replay-self-test-") as folder:
        root = Path(folder)
        original = root / "source.json"
        original.write_text(json.dumps(source, indent=2) + "\n", encoding="utf-8")
        prepared = root / "prepared.json"
        metadata = prepare(original, prepared, root / "artifacts")
        if metadata["derivedPlacementHash"] != "f74a2c24cc84e4b5" or metadata["paddingColumnsPerRow"] != [0, 1]:
            raise ValueError("replay self-test alignment/hash mismatch")
        copied = root / "copy.json"
        noop = prepare(prepared, copied, root / "copy-artifacts")
        if noop["changed"] or copied.read_bytes() != prepared.read_bytes():
            raise ValueError("replay self-test byte-copy mismatch")
    return {"status": "passed", "version": "acg.replay-preparation.v1", "wrapperSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "checks": ["original_hash", "right_dummy_padding", "derived_hash", "byte_copy"]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--artifacts-output", type=Path)
    args = parser.parse_args()
    try:
        if args.self_test:
            print(json.dumps(self_test(), sort_keys=True))
            return 0
        if not all((args.input, args.output, args.artifacts_output)):
            parser.error("--input, --output and --artifacts-output are required unless --self-test is used")
        metadata = prepare(args.input, args.output, args.artifacts_output)
        print(json.dumps(metadata, sort_keys=True))
        return 0
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(f"MR replay preparation failed: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
