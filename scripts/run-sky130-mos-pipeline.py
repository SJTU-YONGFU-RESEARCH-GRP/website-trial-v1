#!/usr/bin/env python3
"""Process every logical NMOS and PMOS model in the SKY130 primitive library."""

from __future__ import annotations

import argparse
import copy
import functools
import importlib.util
import json
import os
import re
import sys
import threading
from pathlib import Path
from typing import Any


HOME = Path("/home/duhaochen")
WEBSITE = HOME / "website-trial-v1"
PRIMITIVE_ROOT = (
    HOME
    / "skywater-pdk"
    / "libraries"
    / "sky130_fd_pr"
    / "latest"
)
BASE_PIPELINE = WEBSITE / "scripts" / "run-full-collection-pipeline.py"
WORK_ROOT = HOME / "pipeline_sky130_mos"
DATA_ROOT = WEBSITE / "data" / "spice-model-benchmark"
INVENTORY_PATH = WORK_ROOT / "model-inventory.json"
AST_EVIDENCE_PATH = WORK_ROOT / "ast-evidence.json"
AUDIT_PATH = WORK_ROOT / "acceptance.json"

LOGICAL_SUFFIX = re.compile(r"\.\d+$")
MODEL_CARD = re.compile(
    r"^\s*\.model\s+(\S+)\s+(nmos|pmos)\b",
    re.IGNORECASE,
)


def load_base_pipeline():
    spec = importlib.util.spec_from_file_location(
        "sky130_shared_pipeline",
        BASE_PIPELINE,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {BASE_PIPELINE}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    module.COLLECTION = PRIMITIVE_ROOT
    module.WORK_ROOT = WORK_ROOT
    module.DATA_ROOT = DATA_ROOT
    module.INVENTORY_PATH = INVENTORY_PATH
    module.AST_EVIDENCE_PATH = AST_EVIDENCE_PATH
    module.AUDIT_PATH = AUDIT_PATH
    module.CHAINS = {
        "reduction": ("reduction",),
        "expansion_translation": ("expansion", "translation"),
        "fitting_reduction_translation": (
            "fitting",
            "reduction",
            "translation",
        ),
    }
    return module


PIPELINE = load_base_pipeline()


PDK_LIBRARY = PRIMITIVE_ROOT / "models" / "sky130.lib.spice"
PARAMETER_INCLUDE = re.compile(
    r"""(?i)^\s*\.include\s+(?:"([^"]+)"|'([^']+)'|(\S+))"""
)
PARAMETER_NAME = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")
PARAMETER_BUILTINS = {
    "abs",
    "acos",
    "asin",
    "atan",
    "cos",
    "e",
    "exp",
    "ln",
    "log",
    "max",
    "min",
    "pow",
    "sin",
    "sqrt",
    "tan",
}


def _strip_spice_inline_comment(line: str) -> str:
    """Remove a SPICE '$' comment without truncating quoted expressions."""
    quote: str | None = None
    for index, character in enumerate(line):
        if character in {"'", '"'}:
            if quote == character:
                quote = None
            elif quote is None:
                quote = character
        elif character == "$" and quote is None:
            return line[:index]
    return line


def _parse_parameter_card(
    card: str,
    *,
    source: Path,
    output: dict[str, dict[str, str]],
) -> None:
    if not card.strip():
        return
    if str(PIPELINE.AST_SRC) not in sys.path:
        sys.path.insert(0, str(PIPELINE.AST_SRC))
    from spice_ast.parsers.param_parsing import parse_param_string

    for name, value in parse_param_string(card).items():
        output[name.lower()] = {
            "name": name,
            "value": value,
            "source": str(source.resolve()),
        }


def _collect_parameter_file(
    path: Path,
    output: dict[str, dict[str, str]],
    *,
    section: str | None = None,
    seen: set[tuple[Path, str | None]] | None = None,
) -> None:
    """Follow a PDK include graph and retain actual .param assignments."""
    visited = seen if seen is not None else set()
    resolved = path.resolve()
    key = (resolved, section)
    if key in visited:
        return
    visited.add(key)
    lines = resolved.read_text(errors="replace").splitlines()
    active = section is None
    current: str | None = None

    def flush() -> None:
        nonlocal current
        if current is not None:
            _parse_parameter_card(current, source=resolved, output=output)
            current = None

    for raw_line in lines:
        raw = _strip_spice_inline_comment(raw_line)
        stripped = raw.strip()
        if section is not None and re.match(r"(?i)^\.lib\s+", stripped):
            flush()
            active = bool(
                re.match(
                    rf"(?i)^\.lib\s+{re.escape(section)}(?:\s|$)",
                    stripped,
                )
            )
            continue
        if (
            section is not None
            and active
            and re.match(r"(?i)^\.endl(?:\s|$)", stripped)
        ):
            flush()
            active = False
            continue
        if not active:
            continue
        if not stripped or stripped.startswith("*"):
            continue
        include = PARAMETER_INCLUDE.match(stripped)
        if include:
            flush()
            child_name = next(
                value for value in include.groups() if value is not None
            )
            child = (resolved.parent / child_name).resolve()
            if child.is_file():
                _collect_parameter_file(
                    child,
                    output,
                    seen=visited,
                )
            continue
        if re.match(r"(?i)^\.param(?:\s|$)", stripped):
            flush()
            current = re.sub(r"(?i)^\.param\s*", "", stripped)
            continue
        if stripped.startswith("+") and current is not None:
            current += " " + stripped[1:].strip()
            continue
        flush()
    flush()


@functools.lru_cache(maxsize=1)
def nominal_pdk_parameter_context() -> dict[str, dict[str, str]]:
    """Return the official Sky130 TT parameter environment."""
    parameters: dict[str, dict[str, str]] = {}
    _collect_parameter_file(PDK_LIBRARY, parameters, section="tt")

    # A few discrete devices are intentionally not part of sky130.lib's main
    # TT section.  Import only exact TT corner files and only fill names absent
    # from the official section; never mix in leak/wafer/FF/SS values.
    exact_tt = re.compile(r"__tt(?:_discrete)?\.corner\.spice$", re.IGNORECASE)
    for corner in sorted(PRIMITIVE_ROOT.rglob("*.corner.spice")):
        if not exact_tt.search(corner.name):
            continue
        additions: dict[str, dict[str, str]] = {}
        _collect_parameter_file(corner, additions)
        for name, declaration in additions.items():
            parameters.setdefault(name, declaration)
    return parameters


def _record_parameter_environment(
    record: dict[str, Any],
) -> dict[str, dict[str, str]]:
    parameters = {
        name: dict(declaration)
        for name, declaration in nominal_pdk_parameter_context().items()
    }
    source = Path(record["sourcePath"])
    _collect_parameter_file(source, parameters)

    # SONOS PM3 cards keep their nominal bin parameters in a same-name
    # companion file.  This is part of the PDK model, not a generated default.
    companion = source.with_name(
        source.name.replace(".pm3.spice", ".spice")
    )
    if companion != source and companion.is_file():
        _collect_parameter_file(companion, parameters)

    # Prefer the source device's exact TT corner when it is a discrete model.
    exact_tt = re.compile(r"__tt(?:_discrete)?\.corner\.spice$", re.IGNORECASE)
    for corner in sorted(source.parent.glob("*.corner.spice")):
        if exact_tt.search(corner.name):
            _collect_parameter_file(corner, parameters)
    return parameters


@functools.lru_cache(maxsize=1)
def benchmark_geometry_context() -> dict[str, dict[str, str]]:
    """Read DUT geometry from the four actual source benchmark circuits."""
    geometry: dict[str, dict[str, str]] = {}
    instance = re.compile(
        r"(?im)^\s*M\S+\s+(?:\S+\s+){4}NMOS_VTG\b([^\n]*)$"
    )
    assignment = re.compile(
        r"(?i)\b([LWM])\s*=\s*([^\s]+)"
    )
    for mode in PIPELINE.MODES:
        circuit = PIPELINE.BENCHMARK / "netlists" / f"{mode}_circuit.cir"
        match = instance.search(circuit.read_text(errors="replace"))
        if match is None:
            raise ValueError(
                f"Cannot derive DUT geometry from benchmark circuit: {circuit}"
            )
        values = {
            name.lower(): value
            for name, value in assignment.findall(match.group(1))
        }
        if "l" not in values or "w" not in values:
            raise ValueError(f"DUT L/W is missing from benchmark circuit: {circuit}")
        values.setdefault("m", "1")
        geometry[mode] = values
    signatures = {
        (values["l"].lower(), values["w"].lower(), values["m"].lower())
        for values in geometry.values()
    }
    if len(signatures) != 1:
        raise ValueError(
            f"Benchmark modes use different primary DUT geometry: {geometry}"
        )
    return geometry


def _expression_dependencies(value: str) -> set[str]:
    text = value.strip()
    if (
        len(text) >= 2
        and text[0] == text[-1]
        and text[0] in {"'", '"'}
    ):
        text = text[1:-1]
    if len(text) >= 2 and text[0] == "{" and text[-1] == "}":
        text = text[1:-1]
    return {
        item.lower()
        for item in PARAMETER_NAME.findall(text)
        if item.lower() not in PARAMETER_BUILTINS
    }


def _required_parameter_context(
    record: dict[str, Any],
    models: list[Any],
    geometry: dict[str, dict[str, str]] | None = None,
) -> tuple[list[dict[str, str]], dict[str, dict[str, str]]]:
    if str(PIPELINE.TRANSLATOR) not in sys.path:
        sys.path.insert(0, str(PIPELINE.TRANSLATOR))
    from src.writers.ngspice_writer import NgspiceWriter

    environment = _record_parameter_environment(record)
    geometry = geometry or benchmark_geometry_context()
    first_geometry = next(iter(geometry.values()))
    environment.update(
        {
            "l": {
                "name": "l",
                "value": first_geometry["l"],
                "source": "benchmark netlist DUT geometry",
            },
            "w": {
                "name": "w",
                "value": first_geometry["w"],
                "source": "benchmark netlist DUT geometry",
            },
            "mult": {
                "name": "mult",
                "value": first_geometry["m"],
                "source": "benchmark netlist DUT geometry",
            },
        }
    )
    collector = NgspiceWriter(WORK_ROOT / ".parameter-scan-unused")
    pending = [
        symbol.lower()
        for symbol in collector._collect_expression_symbols(models)
    ]
    required: set[str] = set()
    missing: set[str] = set()
    while pending:
        name = pending.pop()
        if name in required or name in PARAMETER_BUILTINS:
            continue
        declaration = environment.get(name)
        if declaration is None:
            missing.add(name)
            continue
        required.add(name)
        pending.extend(_expression_dependencies(declaration["value"]))
    if missing:
        raise ValueError(
            f"PDK TT parameter context is incomplete for {record['id']}: "
            f"{sorted(missing)}"
        )

    ordered: list[dict[str, str]] = []
    visited: set[str] = set()

    def visit(name: str) -> None:
        if name in visited or name not in required:
            return
        visited.add(name)
        declaration = environment[name]
        for dependency in sorted(_expression_dependencies(declaration["value"])):
            visit(dependency)
        ordered.append(dict(declaration))

    for name in sorted(required):
        visit(name)
    return ordered, geometry


def _format_parameter_value(value: str, simulator: str) -> str:
    text = value.strip()
    if (
        len(text) >= 2
        and text[0] == text[-1]
        and text[0] in {"'", '"'}
    ):
        text = text[1:-1].strip()
    if len(text) >= 2 and text[0] == "{" and text[-1] == "}":
        text = text[1:-1].strip()
    try:
        float(text)
        return text
    except ValueError:
        pass
    if simulator == "ngspice":
        return "{" + text + "}"
    return "'" + text + "'"


def _simulator_expression_syntax(content: str, simulator: str) -> str:
    if simulator == "ngspice":
        return content
    return re.sub(
        r"\{([^{}]+)\}",
        lambda match: "'" + match.group(1).strip() + "'",
        content,
    )


def _benchmark_selector(name: str) -> str:
    """Return the logical model-family name used for native bin selection."""
    return LOGICAL_SUFFIX.sub("", name)


def _spice_dimension(value: str) -> float:
    text = value.strip().lower()
    suffixes = {
        "meg": 1e6,
        "k": 1e3,
        "m": 1e-3,
        "u": 1e-6,
        "n": 1e-9,
        "p": 1e-12,
        "f": 1e-15,
    }
    for suffix, multiplier in suffixes.items():
        if text.endswith(suffix):
            return float(text[: -len(suffix)]) * multiplier
    return float(text)


def _select_physical_model_card(
    models: list[Any],
    geometry: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """Select one real bin deterministically for the actual DUT geometry."""
    if not models:
        raise ValueError("No source model cards are available for selection")
    families = {
        (_benchmark_selector(model.name).lower(), model.device_type.value.lower())
        for model in models
    }
    if len(families) != 1:
        raise ValueError(
            f"Sky130 benchmark record contains multiple model families: "
            f"{sorted(families)}"
        )
    first_geometry = next(iter(geometry.values()))
    length = _spice_dimension(first_geometry["l"])
    width = _spice_dimension(first_geometry["w"])
    bounded: list[tuple[Any, dict[str, float]]] = []
    for model in models:
        parameters = {
            str(name).lstrip("+").lower(): value
            for name, value in model.base_parameters.items()
        }
        try:
            bounds = {
                name: float(parameters[name])
                for name in ("lmin", "lmax", "wmin", "wmax")
            }
        except (KeyError, TypeError, ValueError):
            continue
        bounded.append((model, bounds))

    def suffix_rank(model: Any) -> int:
        match = re.search(r"\.(\d+)$", model.name)
        return int(match.group(1)) if match else -1

    if bounded:
        matching = [
            (model, bounds)
            for model, bounds in bounded
            if (
                bounds["lmin"] <= length <= bounds["lmax"]
                and bounds["wmin"] <= width <= bounds["wmax"]
            )
        ]
        if matching:
            # Prefer the most specific overlapping rectangle, then the later
            # bin at a shared boundary.  The explicit card makes all three
            # simulators use exactly the same physical parameter set.
            model, bounds = min(
                matching,
                key=lambda item: (
                    (item[1]["lmax"] - item[1]["lmin"])
                    * (item[1]["wmax"] - item[1]["wmin"]),
                    -suffix_rank(item[0]),
                ),
            )
            mode = "matched-real-bin"
        else:
            def distance(item: tuple[Any, dict[str, float]]) -> tuple[float, int]:
                model, bounds = item
                dl = max(
                    bounds["lmin"] - length,
                    0.0,
                    length - bounds["lmax"],
                ) / max(abs(length), 1e-30)
                dw = max(
                    bounds["wmin"] - width,
                    0.0,
                    width - bounds["wmax"],
                ) / max(abs(width), 1e-30)
                return dl * dl + dw * dw, suffix_rank(model)

            model, bounds = min(bounded, key=distance)
            mode = "nearest-real-bin-outside-range"
    else:
        model = models[0]
        bounds = {}
        mode = "explicit-unbinned-card"
    effective_geometry = dict(first_geometry)
    adjustment_reason = None
    if mode == "nearest-real-bin-outside-range":
        # The collection contains bare binned cards whose official wrapper
        # normally supplies a legal device geometry.  The stock benchmark
        # fixture must not exercise those cards outside their declared
        # physical range.  Select a conservative interior point
        # deterministically (longer channel, narrower device) and use that
        # exact W/L in every simulator's translated fixture.  Staying away
        # from both bin boundaries also avoids boundary-dependent selection.
        # This changes only the test fixture, never a model parameter.
        effective_geometry["l"] = (
            f"{bounds['lmin'] + 0.75 * (bounds['lmax'] - bounds['lmin']):.17g}"
        )
        effective_geometry["w"] = (
            f"{bounds['wmin'] + 0.25 * (bounds['wmax'] - bounds['wmin']):.17g}"
        )
        adjustment_reason = "stock-fixture-geometry-outside-selected-real-bin"
    return {
        "sourceModelName": model.name,
        "modelFamily": _benchmark_selector(model.name),
        "deviceType": model.device_type.value.lower(),
        "selectionMode": mode,
        "dutGeometry": dict(first_geometry),
        "effectiveDutGeometry": effective_geometry,
        "geometryAdjustmentReason": adjustment_reason,
        "selectedBinBounds": bounds,
    }


_ANALYSIS_CACHE: dict[
    tuple[str, str, str],
    tuple[list[dict[str, str]], dict[str, dict[str, str]], dict[str, Any]],
] = {}
_ANALYSIS_CACHE_LOCK = threading.Lock()


def _cached_record_analysis(
    record: dict[str, Any],
    models: list[Any],
) -> tuple[
    list[dict[str, str]],
    dict[str, dict[str, str]],
    dict[str, Any],
]:
    key = (
        record["md5"],
        str(record["sourcePath"]),
        str(record["finalModel"]),
    )
    with _ANALYSIS_CACHE_LOCK:
        cached = _ANALYSIS_CACHE.get(key)
        if cached is None:
            _, geometry = _required_parameter_context(record, models)
            selection = _select_physical_model_card(models, geometry)
            effective = {
                mode: dict(selection["effectiveDutGeometry"])
                for mode in PIPELINE.MODES
            }
            declarations, _ = _required_parameter_context(
                record,
                models,
                effective,
            )
            cached = (declarations, geometry, selection)
            _ANALYSIS_CACHE[key] = cached
        return copy.deepcopy(cached)


def prepare_sky130_benchmark_input(
    record: dict[str, Any],
    simulator: str,
) -> tuple[Path, list[str]]:
    """Create a parameter-exact PDK handoff with no guessed model values."""
    source = Path(record["finalModel"])
    destination = (
        WORK_ROOT / "benchmark-inputs" / record["md5"] / f"{simulator}.lib"
    )
    evidence = PIPELINE.ast_normalize(
        source,
        destination,
        provenance=f"{record['id']}:{simulator}:benchmark",
        source_format="ngspice",
        expected_cards=record["cardCount"],
    )
    original = PIPELINE.parser_for(
        destination,
        "ngspice",
    )(destination).parse_to_ir()
    declarations, geometry, selection = _cached_record_analysis(
        record,
        original,
    )
    selected_source_name = selection["sourceModelName"]
    selected_alias = (
        "__benchmark_selected_" + selection["deviceType"]
    )
    selection["benchmarkModelName"] = selected_alias
    effective_geometry = selection["effectiveDutGeometry"]
    aliases = {
        model.name: (
            selected_alias
            if model.name == selected_source_name
            else model.name
        )
        for model in original
    }
    if len(set(aliases.values())) != len(aliases):
        raise ValueError(
            f"Selected-card alias collision for {record['id']}: {aliases}"
        )
    content = destination.read_text(encoding="utf-8")
    content, renamed = re.subn(
        rf"(?im)^(\s*\.model\s+)"
        rf"{re.escape(selected_source_name)}(\s+)",
        rf"\g<1>{selected_alias}\2",
        content,
        count=1,
    )
    if renamed != 1:
        raise ValueError(
            f"Unable to alias selected model card {selected_source_name}"
        )
    content = _simulator_expression_syntax(content, simulator)
    parameter_lines = [
        "* Exact Sky130 PDK TT parameter context; no generated defaults",
        f"* BENCHMARK_PRIMARY_MODEL: {selected_alias}",
        (
            "* BENCHMARK_DUT_GEOMETRY_OVERRIDE: "
            f"L={effective_geometry['l']} W={effective_geometry['w']}"
        )
        if selection["geometryAdjustmentReason"]
        else "* BENCHMARK_DUT_GEOMETRY_OVERRIDE: none",
        *[
            f".param {item['name']}="
            f"{_format_parameter_value(item['value'], simulator)}"
            for item in declarations
        ],
        "",
    ]
    destination.write_text(
        "\n".join(parameter_lines) + content,
        encoding="utf-8",
    )

    parsed_handoff = PIPELINE.parser_for(
        destination,
        "ngspice",
    )(destination).parse_to_ir()
    if len(parsed_handoff) != len(original):
        raise ValueError(
            f"Benchmark handoff changed card count for {record['id']}"
        )
    for expected, actual in zip(original, parsed_handoff):
        expected_name = aliases[expected.name]
        if actual.name != expected_name:
            raise ValueError(
                f"Benchmark model-name mismatch: "
                f"{expected.name} -> {actual.name}"
            )
        actual.name = expected.name
    if (
        PIPELINE.physical_model_signature(parsed_handoff)
        != evidence["physicalModelSignature"]
    ):
        raise ValueError(
            f"Simulator syntax conversion changed model parameters for {record['id']}"
        )

    context_payload = {
        "kind": "sky130-pdk-tt",
        "guessedDefaults": False,
        "unresolvedSymbols": [],
        "geometrySource": "benchmark netlists",
        "geometry": geometry,
        "effectiveGeometry": {
            mode: dict(effective_geometry)
            for mode in PIPELINE.MODES
        },
        "parameterCount": len(declarations),
        "parameters": declarations,
        "modelNameAliases": {
            model.name: aliases[model.name]
            for model in original
        },
        "modelSelectorNames": [selected_alias],
        "modelSelection": selection,
    }
    context_payload["sha256"] = PIPELINE.hashlib.sha256(
        json.dumps(
            context_payload,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    PIPELINE.atomic_json(
        destination.with_suffix(".parameter-context.json"),
        context_payload,
    )

    if simulator == "ngspice":
        compatible, reason = PIPELINE.ngspice_capability_preflight(
            destination,
            selected_alias,
        )
    elif simulator == "hspice":
        compatible, reason = PIPELINE.hspice_capability_preflight(
            destination,
            selected_alias,
        )
    elif simulator == "spectre":
        compatible, reason = PIPELINE.spectre_capability_preflight(
            destination,
            selected_alias,
        )
    else:
        raise ValueError(f"Unsupported simulator: {simulator}")
    if not compatible:
        raise RuntimeError(
            f"{simulator} rejected the parameter-preserving model handoff for "
            f"{record['id']}: {reason or 'unknown simulator diagnostic'}. "
            "No model fallback or parameter lowering was applied."
        )

    adjustments: list[str] = []
    if selection["geometryAdjustmentReason"]:
        adjustments.append(
            "stock benchmark DUT geometry adjusted to selected real bin: "
            f"L={effective_geometry['l']}, W={effective_geometry['w']}"
        )
    device_types = {item["deviceType"] for item in evidence["cards"]}
    fixture_count = 0
    if "nmos" not in device_types:
        content = destination.read_text(encoding="utf-8")
        content += (
            "\n* Simulator fixture companion for complementary circuits\n"
            ".model __fixture_nmos NMOS "
            "(LEVEL=1 VTO=0.7 KP=50u LAMBDA=0.02)\n"
        )
        destination.write_text(content, encoding="utf-8")
        fixture_count += 1
        adjustments.append("added NMOS complementary-circuit fixture")
    if "pmos" not in device_types:
        content = destination.read_text(encoding="utf-8")
        content += (
            "\n* Simulator fixture companion for complementary circuits\n"
            ".model __fixture_pmos PMOS "
            "(LEVEL=1 VTO=-0.7 KP=25u LAMBDA=0.02)\n"
        )
        destination.write_text(content, encoding="utf-8")
        fixture_count += 1
        adjustments.append("added PMOS complementary-circuit fixture")

    parsed = PIPELINE.parser_for(
        destination,
        "ngspice",
    )(destination).parse_to_ir()
    if len(parsed) != record["cardCount"] + fixture_count:
        raise ValueError(
            f"Benchmark handoff changed card count for {record['id']}: "
            f"{record['cardCount']} + {fixture_count} fixtures -> {len(parsed)}"
        )
    source_cards = [
        model
        for model in parsed
        if not model.name.lower().startswith("__fixture_")
    ]
    for expected, actual in zip(original, source_cards):
        expected_name = aliases[expected.name]
        if actual.name != expected_name:
            raise ValueError(
                f"Fixture insertion changed model name for {record['id']}"
            )
        actual.name = expected.name
    if (
        PIPELINE.physical_model_signature(source_cards)
        != evidence["physicalModelSignature"]
    ):
        raise ValueError(
            f"Fixture insertion changed benchmark model content for {record['id']}"
        )
    return destination, sorted(set(adjustments))


PIPELINE.prepare_benchmark_input = prepare_sky130_benchmark_input


def logical_name(name: str) -> str:
    return LOGICAL_SUFFIX.sub("", name.lower())


def source_priority(path: Path) -> tuple[int, int, str]:
    name = path.name
    if name.endswith("__tt.pm3.spice"):
        rank = 0
    elif name.endswith(".pm3.spice") and "__" not in name.removesuffix(
        ".pm3.spice"
    ):
        rank = 1
    elif name.endswith("__tt.corner.spice"):
        rank = 2
    elif name.endswith(".model.spice"):
        rank = 3
    else:
        rank = 4
    return rank, len(name), path.as_posix()


def discover_logical_models() -> list[dict[str, Any]]:
    candidates: dict[tuple[str, str], set[Path]] = {}
    for source in PRIMITIVE_ROOT.rglob("*.spice"):
        relative = source.relative_to(PRIMITIVE_ROOT)
        if relative.parts[0] == "cells" and len(relative.parts) != 3:
            continue
        for line in source.read_text(errors="replace").splitlines():
            match = MODEL_CARD.match(line)
            if match is None:
                continue
            key = (logical_name(match.group(1)), match.group(2).lower())
            candidates.setdefault(key, set()).add(source.resolve())

    discovered: list[dict[str, Any]] = []
    for (name, device_type), sources in sorted(candidates.items()):
        source = sorted(sources, key=source_priority)[0]
        discovered.append(
            {
                "logicalName": name,
                "deviceType": device_type,
                "source": source,
                "candidateCount": len(sources),
            }
        )
    return discovered


def safe_identifier(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "__", name).strip("_").lower()


def parse_sources(*, force: bool = False) -> list[dict[str, Any]]:
    entries = discover_logical_models()
    source_records: list[dict[str, Any]] = []
    ast_evidence: list[dict[str, Any]] = []
    for index, entry in enumerate(entries, 1):
        identifier = safe_identifier(entry["logicalName"])
        model_work = WORK_ROOT / "models" / identifier / "original"
        selected_path = model_work / "selected.lib"
        canonical = model_work / "model.lib"
        if force and model_work.exists():
            PIPELINE.shutil.rmtree(model_work)
        model_work.mkdir(parents=True, exist_ok=True)

        source = entry["source"]
        parser = PIPELINE.parser_for(source, "ngspice")
        parsed = parser(source).parse_to_ir()
        selected = [
            model
            for model in parsed
            if logical_name(model.name) == entry["logicalName"]
            and model.device_type.value.lower() == entry["deviceType"]
        ]
        if not selected:
            raise ValueError(
                f"AST did not return {entry['logicalName']} from {source}"
            )
        if any(not model.base_parameters for model in selected):
            raise ValueError(
                f"AST returned an empty card for {entry['logicalName']}"
            )

        print(
            f"[AST] {index}/{len(entries)} {entry['deviceType']} "
            f"{entry['logicalName']} ({len(selected)} cards)",
            flush=True,
        )
        PIPELINE.write_ir(
            selected,
            selected_path,
            provenance=f"{identifier}:source-selection",
        )
        evidence = PIPELINE.ast_normalize(
            selected_path,
            canonical,
            provenance=f"{identifier}:original",
            source_format="ngspice",
            expected_cards=len(selected),
        )
        record = {
            "id": f"{identifier}__original",
            "sourceId": identifier,
            "logicalModel": entry["logicalName"],
            "deviceType": entry["deviceType"],
            "kind": "original",
            "chainId": "original",
            "chain": [],
            "toolCount": 0,
            "sourcePath": str(source),
            "sourceMd5": PIPELINE.digest(source),
            "canonicalModel": str(canonical),
            "finalModel": str(canonical),
            "md5": PIPELINE.digest(canonical),
            "cardCount": len(evidence["cards"]),
            "models": evidence["cards"],
            "stages": [],
            "completedAt": PIPELINE.utc_now(),
        }
        source_records.append(record)
        ast_evidence.append(
            {
                "id": record["id"],
                "logicalModel": entry["logicalName"],
                "deviceType": entry["deviceType"],
                "rawSource": str(source),
                "rawSourceMd5": PIPELINE.digest(source),
                "rawAstCardCount": len(parsed),
                "selectedAstCardCount": len(selected),
                **evidence,
            }
        )

    PIPELINE.atomic_json(
        AST_EVIDENCE_PATH,
        {
            "generatedAt": PIPELINE.utc_now(),
            "sourceCount": len(source_records),
            "nmosCount": sum(
                record["deviceType"] == "nmos" for record in source_records
            ),
            "pmosCount": sum(
                record["deviceType"] == "pmos" for record in source_records
            ),
            "cardCount": sum(
                record["cardCount"] for record in source_records
            ),
            "failures": [],
            "sources": ast_evidence,
        },
    )
    return source_records


PIPELINE.parse_sources = parse_sources


def image_has_curve(path: Path) -> bool:
    import numpy as np
    from PIL import Image

    with Image.open(path).convert("RGB") as image:
        width, height = image.size
        if width < 100 or height < 100:
            return False
        pixels = np.asarray(image, dtype=np.uint8)
        maximum = pixels.max(axis=2)
        minimum = pixels.min(axis=2)
        saturated = int(
            np.count_nonzero((maximum - minimum >= 35) & (maximum >= 70))
        )
    return saturated >= max(30, width * height // 20000)


def numeric_rows(path: Path) -> list[list[float]]:
    """Read finite numeric rows without inventing missing columns or values."""
    import math

    rows: list[list[float]] = []
    try:
        lines = path.read_text(errors="replace").splitlines()
    except (OSError, UnicodeError):
        return rows
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "*")):
            continue
        try:
            row = [float(value) for value in stripped.split()]
        except ValueError:
            continue
        if row and all(math.isfinite(value) for value in row):
            rows.append(row)
    return rows


def varying_numeric_data(data_dir: Path) -> bool:
    for data_file in sorted(data_dir.iterdir()):
        if not data_file.is_file():
            continue
        rows = numeric_rows(data_file)
        if len(rows) < 2:
            continue
        width = max(len(row) for row in rows)
        for column in range(1, width):
            values = [
                row[column]
                for row in rows
                if len(row) > column
            ]
            if len(values) >= 2 and max(values) != min(values):
                return True
    return False


def switching_has_three_panels(path: Path) -> bool:
    """Require visible plotted content in each of the three switching panels."""
    import numpy as np
    from PIL import Image

    with Image.open(path).convert("RGB") as image:
        pixels = np.asarray(image, dtype=np.uint8)
    height, width, _ = pixels.shape
    ink = np.any(pixels < 245, axis=2)
    for panel in range(3):
        section = ink[
            panel * height // 3:(panel + 1) * height // 3,
            width // 20:19 * width // 20,
        ]
        if int(np.count_nonzero(section)) < max(
            100,
            section.size // 1000,
        ):
            return False
    return True


def cross_simulator_plot_failures(record: dict[str, Any]) -> list[str]:
    """Require every same-name plot to use the same canvas specification."""
    from PIL import Image

    failures: list[str] = []
    for plot_name in PIPELINE.EXPECTED_PLOTS:
        dimensions: dict[str, tuple[int, int]] = {}
        for simulator in PIPELINE.SIMULATORS:
            path = (
                DATA_ROOT
                / record["md5"]
                / simulator
                / "plot"
                / plot_name
            )
            if not path.is_file():
                continue
            with Image.open(path) as image:
                dimensions[simulator] = image.size
        if (
            len(dimensions) == len(PIPELINE.SIMULATORS)
            and len(set(dimensions.values())) != 1
        ):
            failures.append(
                f"{plot_name} dimensions differ: {dimensions}"
            )
    return failures


def physical_netlist_failures(record: dict[str, Any]) -> list[str]:
    benchmark_src = PIPELINE.BENCHMARK / "src"
    if str(benchmark_src) not in sys.path:
        sys.path.insert(0, str(benchmark_src))
    from spice_model_benchmark.circuit_ast import parse_circuit

    failures: list[str] = []
    for mode in PIPELINE.MODES:
        fingerprints: dict[str, Any] = {}
        for simulator in PIPELINE.SIMULATORS:
            extension = PIPELINE.NETLIST_EXTENSIONS[simulator]
            netlist = (
                DATA_ROOT
                / record["md5"]
                / simulator
                / "netlist"
                / f"{mode}{extension}"
            )
            try:
                fingerprints[simulator] = parse_circuit(
                    netlist,
                    analysis_hint=mode,
                ).semantic_fingerprint()
            except Exception as exc:
                failures.append(
                    f"{mode} {simulator} physical parse failed: {exc}"
                )
        if len(fingerprints) == len(PIPELINE.SIMULATORS):
            if len(set(fingerprints.values())) != 1:
                failures.append(
                    f"{mode} physical setup differs across simulators"
                )
    return failures


def audit(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    expected_originals = len(discover_logical_models())
    expected_processed = expected_originals * len(PIPELINE.CHAINS)
    expected_models = expected_originals + expected_processed
    kinds = {
        "original": sum(
            record["kind"] == "original" for record in records
        ),
        "processed": sum(
            record["kind"] == "processed" for record in records
        ),
    }
    if len(records) != expected_models:
        failures.append(
            {
                "scope": "inventory",
                "reason": f"model count {len(records)} != {expected_models}",
            }
        )
    if kinds != {
        "original": expected_originals,
        "processed": expected_processed,
    }:
        failures.append(
            {"scope": "inventory", "reason": f"kind counts {kinds}"}
        )
    if len({record["md5"] for record in records}) != len(records):
        failures.append(
            {"scope": "inventory", "reason": "duplicate model md5"}
        )

    for record in records:
        model_path = Path(record["finalModel"])
        try:
            parsed = PIPELINE.parser_for(
                model_path,
                "ngspice",
            )(model_path).parse_to_ir()
            if len(parsed) != record["cardCount"]:
                failures.append(
                    {
                        "model": record["id"],
                        "reason": f"AST card count {len(parsed)}",
                    }
                )
        except Exception as exc:
            failures.append(
                {"model": record["id"], "reason": f"AST: {exc}"}
            )
            continue

        if record["kind"] == "processed":
            if not 1 <= record["toolCount"] <= 4:
                failures.append(
                    {
                        "model": record["id"],
                        "reason": "tool count outside 1..4",
                    }
                )
            if len(record["stages"]) != record["toolCount"]:
                failures.append(
                    {
                        "model": record["id"],
                        "reason": "stage evidence mismatch",
                    }
                )
            if any(not stage.get("ast") for stage in record["stages"]):
                failures.append(
                    {
                        "model": record["id"],
                        "reason": "missing stage AST evidence",
                    }
                )

        for simulator in PIPELINE.SIMULATORS:
            reasons = PIPELINE.acceptance_failures(
                record,
                simulator,
            )
            sim_dir = DATA_ROOT / record["md5"] / simulator
            plot_dir = sim_dir / "plot"
            data_dir = sim_dir / "data"
            manifest_path = sim_dir / "manifest.json"
            if manifest_path.is_file():
                manifest = json.loads(manifest_path.read_text())
                context = manifest.get("parameterContext") or {}
                if (
                    context.get("kind") != "sky130-pdk-tt"
                    or context.get("guessedDefaults") is not False
                    or context.get("unresolvedSymbols") != []
                    or not context.get("sha256")
                ):
                    reasons.append(
                        "missing exact Sky130 TT parameter-context evidence"
                    )
                handoff = Path(manifest.get("benchmarkInputPath", ""))
                if handoff.is_file() and re.search(
                    r"(?i)auto-generated parameter defaults|"
                    r"critical bsim|reasonable default",
                    handoff.read_text(errors="replace"),
                ):
                    reasons.append(
                        "benchmark handoff contains generated model defaults"
                    )
            if plot_dir.is_dir():
                bad_images = [
                    image.name
                    for image in sorted(plot_dir.glob("*.png"))
                    if not image_has_curve(image)
                ]
                if bad_images:
                    reasons.append(
                        f"plots without visible curves: {bad_images}"
                    )
                switching = plot_dir / "trans_switching_response.png"
                if switching.is_file() and not switching_has_three_panels(
                    switching
                ):
                    reasons.append(
                        "switching plot does not contain three visible panels"
                    )
            if data_dir.is_dir() and not varying_numeric_data(data_dir):
                reasons.append("numeric data has no varying dependent values")
            if reasons:
                failures.append(
                    {
                        "model": record["id"],
                        "md5": record["md5"],
                        "simulator": simulator,
                        "reasons": reasons,
                    }
                )
        physical = physical_netlist_failures(record)
        if physical:
            failures.append(
                {
                    "model": record["id"],
                    "md5": record["md5"],
                    "scope": "physical-netlists",
                    "reasons": physical,
                }
            )
        plot_spec = cross_simulator_plot_failures(record)
        if plot_spec:
            failures.append(
                {
                    "model": record["id"],
                    "md5": record["md5"],
                    "scope": "cross-simulator-plots",
                    "reasons": plot_spec,
                }
            )

    payload = {
        "generatedAt": PIPELINE.utc_now(),
        "sourceCount": expected_originals,
        "nmosCount": sum(
            record["kind"] == "original"
            and record["deviceType"] == "nmos"
            for record in records
        ),
        "pmosCount": sum(
            record["kind"] == "original"
            and record["deviceType"] == "pmos"
            for record in records
        ),
        "modelCount": len(records),
        "simulatorCount": len(PIPELINE.SIMULATORS),
        "expectedRuns": len(records) * len(PIPELINE.SIMULATORS),
        "expectedPlots": (
            len(records)
            * len(PIPELINE.SIMULATORS)
            * len(PIPELINE.EXPECTED_PLOTS)
        ),
        "failures": failures,
        "passed": not failures,
    }
    PIPELINE.atomic_json(AUDIT_PATH, payload)
    if failures:
        print(
            f"ACCEPTANCE FAILED: {len(failures)} items; see {AUDIT_PATH}",
            flush=True,
        )
    else:
        print(
            f"ACCEPTANCE PASS: {expected_originals} source models, "
            f"{len(records)} total models, {payload['expectedRuns']} "
            f"simulator runs, {payload['expectedPlots']} plots",
            flush=True,
        )
    return failures


def selected_records(
    records: list[dict[str, Any]],
    requested: list[str] | None,
) -> list[dict[str, Any]]:
    if not requested:
        return records
    wanted = set(requested)
    chosen = [
        record
        for record in records
        if record["id"] in wanted or record["sourceId"] in wanted
    ]
    found = {
        value
        for record in chosen
        for value in (record["id"], record["sourceId"])
    }
    missing = wanted - found
    if missing:
        raise ValueError(f"Unknown model identifiers: {sorted(missing)}")
    return chosen


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "stage",
        choices=("generate", "benchmark", "audit", "repair", "all"),
        nargs="?",
        default="all",
    )
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--tool-jobs",
        type=int,
        default=max(2, min(12, (os.cpu_count() or 4) // 4)),
    )
    parser.add_argument(
        "--benchmark-jobs",
        type=int,
        default=max(3, min(24, (os.cpu_count() or 4) // 2)),
    )
    parser.add_argument(
        "--simulators",
        nargs="+",
        choices=PIPELINE.SIMULATORS,
        default=list(PIPELINE.SIMULATORS),
    )
    parser.add_argument("--models", nargs="+")
    args = parser.parse_args()

    if args.stage in {"benchmark", "repair", "all"}:
        context = nominal_pdk_parameter_context()
        geometry = benchmark_geometry_context()
        print(
            f"[parameters] loaded {len(context)} exact Sky130 TT declarations; "
            f"DUT geometry={next(iter(geometry.values()))}",
            flush=True,
        )

    if args.stage in {"generate", "all"}:
        records = PIPELINE.generate_models(
            force=args.force,
            jobs=max(1, args.tool_jobs),
        )
    else:
        records = PIPELINE.load_records()
    selected = selected_records(records, args.models)

    if args.stage in {"benchmark", "all"}:
        PIPELINE.run_benchmarks(
            selected,
            simulators=tuple(args.simulators),
            force=args.force,
            jobs=max(1, args.benchmark_jobs),
        )
    if args.stage == "repair":
        affected_sources = {
            record["sourceId"]
            for record in selected
            if any(
                PIPELINE.acceptance_failures(
                    record,
                    simulator,
                    update=False,
                )
                for simulator in args.simulators
            )
        }
        if affected_sources:
            records = PIPELINE.generate_models(
                force=True,
                jobs=max(1, args.tool_jobs),
            )
            selected = [
                record
                for record in records
                if record["sourceId"] in affected_sources
            ]
            PIPELINE.run_benchmarks(
                selected,
                simulators=tuple(args.simulators),
                force=True,
                jobs=max(1, args.benchmark_jobs),
            )
    if args.stage in {"audit", "repair", "all"}:
        return 1 if audit(records) else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
