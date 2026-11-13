#!/usr/bin/env python3
"""Auditable, bounded cell sizing using frozen GF180 Liberty and native OpenSTA."""
from __future__ import annotations
import argparse
from decimal import Decimal
import ast
import hashlib
import itertools
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import time

VERSION = "dtco.cell-selection.result.v1"
LIBRARY_ID = "gf180mcu-7t5v0-tt"
LIBRARY_SHA = "08070623e53cd1db9abf74c6719510ebc11d8587895c0543016a28e025da0108"
PREFIX = "gf180mcu_fd_sc_mcu7t5v0__"
FAMILIES = {
    "INV": ("inv", ["I"], "ZN"),
    "NAND": ("nand2", ["A1", "A2"], "ZN"),
    "NOR": ("nor2", ["A1", "A2"], "ZN"),
    "AND": ("and2", ["A1", "A2"], "Z"),
    "DFF": ("dffq", ["D"], "Q"),
}
IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,63}$")
RESERVED = set("module endmodule input output wire reg assign always initial begin end if else for generate endgenerate parameter localparam inout supply0 supply1 tri integer real time event function endfunction task endtask case endcase default posedge negedge or and not nand nor xor xnor buf tran".split())
LIMITATIONS = [
    "Frozen GF180 MCU 7-track 5V TT 25C 5.0V corner only; no multicorner signoff.",
    "Native min/max timing uses the same TT Liberty; no separate fast/slow libraries.",
    "Ideal clock, zero interconnect RC, no placement/routing or extracted parasitics.",
    "Area is the sum of Liberty cell areas, not placed layout or die area.",
    "Path delay is the worst constrained endpoint data arrival excluding external input delay; register paths include clock-to-Q.",
    "Performance maximizes worst constrained max/setup slack at the fixed requested period; timing budget is period minus that slack, not a silicon clock limit.",
    "Electrical feasibility includes native max slew, max capacitance, min period and min pulse width checks.",
    "Input delay applies equally to earliest/latest arrivals; output minimum delay is zero.",
    "Search is bounded to 480 seconds total and 30 seconds per native STA child; incomplete trials stay unknown.",
    "No silicon frequency, power, clock-tree, variation, SI, or DRC signoff claim.",
    "Boolean/flip-flop equivalence is established by frozen cell model signatures; graph topology is unchanged.",
]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def number(value, name, low=0, high=10000, strict=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(name + " must be finite")
    if value < low or value > high or (strict and value == low):
        raise ValueError(name + " outside supported bounds")
    return value

def name(value):
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value) or value in RESERVED:
        raise ValueError("invalid or reserved HDL identifier: " + repr(value))
    return value

def names(values, label, minimum=0):
    if not isinstance(values, list) or not minimum <= len(values) <= 256:
        raise ValueError("invalid " + label + " count")
    for value in values:
        name(value)
    if len(set(values)) != len(values):
        raise ValueError("duplicate " + label)
    return values

def validate_request(r):
    if not isinstance(r, dict) or r.get("schemaVersion") != "dtco.cell-selection.request.v1":
        raise ValueError("unsupported request schema")
    if not isinstance(r.get("name"), str) or not 1 <= len(r["name"].strip()) <= 120:
        raise ValueError("name must be a nonempty label up to 120 characters")
    if r.get("libraryId") != LIBRARY_ID or r.get("objective") not in ("area", "performance", "balanced"):
        raise ValueError("unsupported library or objective")
    budget = r.get("maxEvaluations")
    if isinstance(budget, bool) or not isinstance(budget, int) or not 1 <= budget <= 256:
        raise ValueError("maxEvaluations must be integer 1..256")
    c = r["circuit"]
    name(c["name"])
    inputs = names(c["inputs"], "inputs")
    outputs = names(c["outputs"], "outputs", 1)
    clock = c.get("clock")
    if clock is not None:
        name(clock)
    if set(inputs) & set(outputs) or clock in outputs:
        raise ValueError("input, output and clock ports must be disjoint")
    data_inputs = [x for x in inputs if x != clock]
    instances = c["instances"]
    if not isinstance(instances, list) or not 1 <= len(instances) <= 256:
        raise ValueError("instance count must be 1..256")
    ids, drivers = set(), {}
    for inst in instances:
        iid = name(inst["id"])
        family = inst.get("family")
        if iid in ids or family not in FAMILIES:
            raise ValueError("duplicate instance or unsupported family")
        ids.add(iid)
        pins = inst["inputs"]
        if not isinstance(pins, list) or len(pins) != len(FAMILIES[family][1]):
            raise ValueError("wrong pin count")
        for pin in pins:
            name(pin)
            if pin == clock:
                raise ValueError("clock may only drive DFF CLK")
        out = name(inst["output"])
        if out in drivers or out in inputs or out == clock:
            raise ValueError("multiple drivers or driven input port")
        drivers[out] = inst
        drives = inst["allowedDrives"]
        if not isinstance(drives, list) or not drives or len(drives) > 3 or len(set(drives)) != len(drives):
            raise ValueError("invalid drive domain")
        if any(isinstance(d, bool) or not isinstance(d, int) or d not in (1, 2, 4) for d in drives):
            raise ValueError("supported drives are 1,2,4")
        if type(inst["initialDrive"]) is not int or inst["initialDrive"] not in drives:
            raise ValueError("initialDrive outside allowedDrives")
        if "locked" in inst and not isinstance(inst["locked"], bool):
            raise ValueError("locked must be boolean")
    if ids & (set(inputs) | set(outputs) | set(drivers) | ({clock} if clock else set())):
        raise ValueError("instance and net identifiers must not collide")
    nets = set(data_inputs) | set(drivers)
    if any(n not in nets for i in instances for n in i["inputs"]) or any(n not in drivers for n in outputs):
        raise ValueError("unresolved net or undriven output")
    sequential = any(i["family"] == "DFF" for i in instances)
    if sequential != (clock is not None):
        raise ValueError("DFF circuits need exactly one clock; combinational circuits have no clock")
    visiting, visited = set(), set()
    def visit(net):
        if net not in drivers or drivers[net]["family"] == "DFF":
            return
        if net in visiting:
            raise ValueError("combinational cycle")
        if net in visited:
            return
        visiting.add(net)
        for incoming in drivers[net]["inputs"]:
            visit(incoming)
        visiting.remove(net)
        visited.add(net)
    for net in drivers:
        visit(net)
    meaningful = set()
    def trace(net):
        if net not in drivers or net in meaningful:
            return
        meaningful.add(net)
        for incoming in drivers[net]["inputs"]:
            trace(incoming)
    for net in outputs:
        trace(net)
    if set(drivers) != meaningful:
        raise ValueError("every instance must influence an output")
    cons = r["constraints"]
    for key in ("clockPeriodNs", "inputDelayNs", "outputDelayNs", "inputSlewNs", "outputLoadPf", "clockUncertaintyNs", "holdUncertaintyNs"):
        number(cons[key], key, strict=key in ("clockPeriodNs", "inputSlewNs"))
    if cons["inputSlewNs"] > 4 or cons["outputLoadPf"] > 1:
        raise ValueError("slew/load outside supported library experiment range")
    return r

def groups(text, kind):
    """Return named Liberty groups with balanced bodies (frozen trusted library)."""
    pattern = re.compile(r"\b" + kind + r"\s*\(([^)]*)\)\s*\{")
    for match in pattern.finditer(text):
        depth, end = 1, match.end()
        for brace in re.finditer(r"[{}]", text[match.end():]):
            depth += 1 if brace.group() == "{" else -1
            if depth == 0:
                end = match.end() + brace.start()
                break
        if depth:
            raise ValueError("unbalanced Liberty group")
        yield match.group(1).strip().strip('"'), text[match.end():end]

def attr(body, key):
    match = re.search(r"\b" + re.escape(key) + r'\s*:\s*("[^"]*"|[^;]+)\s*;', body)
    if not match:
        raise ValueError("missing Liberty attribute " + key)
    return match.group(1).strip().strip('"')

def truth(expression, pins):
    # Parse only a tiny expression grammar; never execute Liberty text.
    tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*|[!&|^()]", expression)
    if "".join(tokens) != re.sub(r"\s+", "", expression):
        raise ValueError("unsupported Boolean expression")
    def evaluate(env):
        position = 0
        def parse(level=0):
            nonlocal position
            if level == 3:
                token = tokens[position]
                position += 1
                if token == "!":
                    return not parse(3)
                if token == "(":
                    result = parse()
                    if tokens[position] != ")":
                        raise ValueError("invalid Boolean expression")
                    position += 1
                    return result
                if token not in env:
                    raise ValueError("unexpected Boolean variable")
                return env[token]
            result = parse(level + 1)
            operator = ("|", "^", "&")[level]
            while position < len(tokens) and tokens[position] == operator:
                position += 1
                rhs = parse(level + 1)
                result = (result or rhs) if operator == "|" else (result != rhs) if operator == "^" else (result and rhs)
            return result
        result = parse()
        if position != len(tokens):
            raise ValueError("trailing Boolean expression")
        return int(result)
    return [evaluate(dict(zip(pins, bits))) for bits in itertools.product((False, True), repeat=len(pins))]

def load_library(path):
    if sha(path) != LIBRARY_SHA:
        raise ValueError("frozen Liberty SHA256 mismatch")
    text = path.read_text()
    if attr(text, "time_unit") != "1ns" or not re.search(r"capacitive_load_unit\s*\(\s*1\s*,\s*pf\s*\)", text):
        raise ValueError("unsupported Liberty units")
    if attr(text, "nom_temperature") != "25" or attr(text, "nom_voltage") != "5":
        raise ValueError("incorrect TT operating conditions")
    wanted = {PREFIX + base + "_" + str(d): (family, d) for family, (base, _, _) in FAMILIES.items() for d in (1, 2, 4)}
    cells = {}
    # Locate only exact requested cells; never parse another drive as a prefix match.
    for cell_name, (family, drive) in wanted.items():
        match = re.search(r"\bcell\s*\(\s*" + re.escape(cell_name) + r"\s*\)\s*\{", text)
        if match is None:
            continue
        _, body = next(groups(text[match.start():], "cell"))
        pins = dict(groups(body, "pin"))
        _, inputs, output = FAMILIES[family]
        expected = set(inputs + [output] + (["CLK"] if family == "DFF" else []))
        if set(pins) != expected:
            raise ValueError("unexpected signal pin set " + cell_name)
        if any(attr(pins[p], "direction") != "input" for p in expected - {output}) or attr(pins[output], "direction") != "output":
            raise ValueError("incorrect pin direction")
        area = number(float(attr(body, "area")), "area", strict=True)
        out_arcs = list(groups(pins[output], "timing"))
        if family == "DFF":
            ff = list(groups(body, "ff"))
            if len(ff) != 1 or attr(ff[0][1], "clocked_on") != "CLK" or attr(ff[0][1], "next_state") != "D":
                raise ValueError("incompatible flip-flop")
            state = ff[0][0].split(",")[0].strip()
            if truth(attr(pins[output], "function"), [state]) != [0, 1]:
                raise ValueError("incompatible DFF output")
            if not any(attr(a, "related_pin") == "CLK" and attr(a, "timing_type") == "rising_edge" for _, a in out_arcs):
                raise ValueError("missing positive edge CLK->Q arc")
            arcs = list(groups(pins["D"], "timing"))
            for kind in ("setup_rising", "hold_rising"):
                if not any(attr(a, "related_pin") == "CLK" and attr(a, "timing_type") == kind for _, a in arcs):
                    raise ValueError("missing DFF " + kind)
            signature = {"clockedOn": "CLK", "nextState": "D", "outputState": state}
        else:
            expected_signature = {"INV": [1, 0], "NAND": [1, 1, 1, 0], "NOR": [1, 0, 0, 0], "AND": [0, 0, 0, 1]}[family]
            signature = truth(attr(pins[output], "function"), inputs)
            if signature != expected_signature:
                raise ValueError("cell truth table mismatch")
            for pin in inputs:
                if not any(attr(a, "related_pin") == pin and "cell_rise" in a and "cell_fall" in a for _, a in out_arcs):
                    raise ValueError("missing combinational timing arc")
        cells[(family, drive)] = {"name": cell_name, "family": family, "drive": drive, "areaUm2": area, "inputPins": inputs, "outputPin": output, "signature": signature}
    return cells

def regular(root, relative):
    path = root / relative
    if path.is_symlink() or not path.is_file() or root not in path.resolve().parents:
        raise ValueError("input must be a regular file within workspace")
    return path

def dump(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")

def tcl_path(path):
    value = str(path)
    if any(x in value for x in "{}\n\r"):
        raise ValueError("unsupported workspace path")
    return "{" + value + "}"

def netlist(c, assignment, cells):
    ports = list(c["inputs"])
    if c["clock"] is not None and c["clock"] not in ports:
        ports.append(c["clock"])
    text = ["module " + c["name"] + "(" + ",".join(ports + c["outputs"]) + ");"]
    text += ["input " + ",".join(ports) + ";"] if ports else []
    text += ["output " + ",".join(c["outputs"]) + ";"]
    internal = [i["output"] for i in c["instances"] if i["output"] not in c["outputs"]]
    if internal:
        text += ["wire " + ",".join(internal) + ";"]
    for inst in c["instances"]:
        cell = cells[(inst["family"], assignment[inst["id"]])]
        mapping = list(zip(cell["inputPins"], inst["inputs"])) + [(cell["outputPin"], inst["output"])]
        if inst["family"] == "DFF":
            mapping.append(("CLK", c["clock"]))
        text += [cell["name"] + " " + inst["id"] + " (" + ",".join("." + p + "(" + n + ")" for p, n in mapping) + ");"]
    return "\n".join(text + ["endmodule", ""])

def constraints(r):
    c, k = r["circuit"], r["constraints"]
    clock = "[get_ports " + c["clock"] + "]" if c["clock"] else ""
    lines = ["create_clock -name core_clk -period " + str(k["clockPeriodNs"]) + (" " + clock if clock else "")]
    lines += ["set_clock_uncertainty -setup " + str(k["clockUncertaintyNs"]) + " [get_clocks core_clk]",
              "set_clock_uncertainty -hold " + str(k["holdUncertaintyNs"]) + " [get_clocks core_clk]",
              "set_clock_transition " + str(k["inputSlewNs"]) + " [get_clocks core_clk]"]
    inputs = [p for p in c["inputs"] if p != c["clock"]]
    if inputs:
        ports = "[get_ports {" + " ".join(inputs) + "}]"
        lines += ["set_input_delay -max -clock core_clk " + str(k["inputDelayNs"]) + " " + ports,
                  "set_input_delay -min -clock core_clk " + str(k["inputDelayNs"]) + " " + ports,
                  "set_input_transition " + str(k["inputSlewNs"]) + " " + ports]
    outputs = "[get_ports {" + " ".join(c["outputs"]) + "}]"
    lines += ["set_output_delay -max -clock core_clk " + str(k["outputDelayNs"]) + " " + outputs,
              "set_output_delay -min -clock core_clk 0 " + outputs,
              "set_load " + str(k["outputLoadPf"]) + " " + outputs]
    return "\n".join(lines) + "\n"

def read_checks(path, kind, sequential=False):
    data = json.loads(path.read_text())
    checks = data.get("checks")
    if not isinstance(checks, list):
        raise ValueError("invalid native timing JSON")
    result = []
    for check in checks:
        if check.get("path_type") != kind or "slack" not in check or not check.get("source_path"):
            continue
        for field in ("slack", "data_arrival_time", "required_time"):
            number(check[field], "native " + field, -1e6, 1e6)
        if sequential and (not check.get("source_clock") or not check.get("target_clock") or not check.get("startpoint", "").endswith("/Q") or not check.get("endpoint", "").endswith("/D")):
            continue
        result.append(check)
    return result

def assignment_area(instances, assignment, cells):
    # Liberty areas are finite decimal values. Sum them exactly before the one
    # JSON-number conversion so permutation cannot disturb an equal-area tie.
    return float(sum((Decimal(str(cells[(inst["family"], assignment[inst["id"]])]["areaUm2"]))
                      for inst in instances), Decimal(0)))

def evaluate(root, r, library, runtime, cells, assignment, index, timeout=30):
    directory = root / "output" / "selection" / ("eval-" + str(index).zfill(4))
    directory.mkdir(parents=True, exist_ok=False)
    files = {key: directory / filename for key, filename in {
        "netlist": "mapped.v", "constraints": "constraints.sdc", "setupReport": "setup.json",
        "holdReport": "hold.json", "maxReport": "max.json", "minReport": "min.json",
        "log": "opensta.log", "script": "run.tcl", "provenance": "provenance.json",
        "electricalReport": "electrical.txt", "coverageReport": "coverage.txt"}.items()}
    files["netlist"].write_text(netlist(r["circuit"], assignment, cells))
    files["constraints"].write_text(constraints(r))
    sequential = r["circuit"]["clock"] is not None
    script = ["read_liberty " + tcl_path(library), "read_verilog " + tcl_path(files["netlist"]),
              "link_design " + r["circuit"]["name"], "read_sdc " + tcl_path(files["constraints"])]
    for kind, key in (("max", "maxReport"), ("min", "minReport")):
        script += ["report_checks -path_delay " + kind + " -group_path_count 2048 -endpoint_path_count 1 -format json -digits 12 > " + tcl_path(files[key])]
    for kind, key in (("max", "setupReport"), ("min", "holdReport")):
        selection = " -from [all_registers -clock_pins] -to [all_registers -data_pins]" if sequential else ""
        script += ["report_checks" + selection + " -path_delay " + kind + " -group_path_count 2048 -endpoint_path_count 1 -format json -digits 12 > " + tcl_path(files[key])]
    script += ["check_setup -unconstrained_endpoints -loops -no_clock > " + tcl_path(files["coverageReport"]),
               "report_check_types -violators -max_slew -max_capacitance -min_period -min_pulse_width -digits 12 > " + tcl_path(files["electricalReport"]), "exit"]
    files["script"].write_text("\n".join(script) + "\n")
    mapping = {i["id"]: cells[(i["family"], assignment[i["id"]])]["name"] for i in r["circuit"]["instances"]}
    result = {"id": directory.name, "index": index, "assignment": dict(assignment), "cells": mapping,
              "areaUm2": assignment_area(r["circuit"]["instances"], assignment, cells),
              "pathDelayNs": None, "setupSlackNs": None, "holdSlackNs": None,
              "maxSlackNs": None, "minSlackNs": None, "timingBudgetNs": None, "timingKind": "sequential" if sequential else "combinational",
              "feasible": False, "status": "unknown", "reason": "", "artifacts": {k: str(p.relative_to(root)) for k, p in files.items()}}
    try:
        # No shell and no new session: children inherit the worker process group for cancellation.
        with files["log"].open("w") as log:
            child = subprocess.run([runtime["openstaPath"], "-no_init", "-exit", str(files["script"])],
                                   stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                                   cwd=directory, timeout=timeout, check=False)
        log_text = files["log"].read_text()
        if child.returncode != 0 or re.search(r"(^|\n)Error:", log_text):
            raise ValueError("native STA failed; inspect opensta.log")
        coverage = files["coverageReport"].read_text().strip()
        if coverage:
            raise ValueError("native timing coverage check failed: " + coverage[:400])
        all_max = read_checks(files["maxReport"], "max")
        all_min = read_checks(files["minReport"], "min")
        if not all_max or not all_min:
            raise ValueError("missing constrained min/max paths")
        result["maxSlackNs"] = min(p["slack"] for p in all_max) * 1e9
        result["minSlackNs"] = min(p["slack"] for p in all_min) * 1e9
        result["timingBudgetNs"] = r["constraints"]["clockPeriodNs"] - result["maxSlackNs"]
        setup = read_checks(files["setupReport"], "max", sequential)
        hold = read_checks(files["holdReport"], "min", sequential)
        if not setup or (sequential and not hold):
            raise ValueError("missing actual constrained DFF-to-DFF setup/hold paths" if sequential else "missing constrained combinational path")
        if sequential:
            result["setupSlackNs"] = min(p["slack"] for p in setup) * 1e9
            result["holdSlackNs"] = min(p["slack"] for p in hold) * 1e9
        # Arrival includes clock-to-Q on sequential paths; ideal launch edge is at zero.
        result["pathDelayNs"] = max(p["data_arrival_time"] - (p["source_path"][0]["arrival"] if "/" not in p["startpoint"] else 0) for p in all_max) * 1e9
        slacks = [result["maxSlackNs"], result["minSlackNs"]]
        if sequential:
            slacks += [result["setupSlackNs"], result["holdSlackNs"]]
        result["feasible"] = all(s >= 0 for s in slacks) and "VIOLATED" not in files["electricalReport"].read_text()
        result["status"] = "feasible" if result["feasible"] else "timing_violation"
        result["reason"] = "All observed constrained min/max paths meet timing" if result["feasible"] else "Negative constrained setup/max or hold/min slack, or native electrical/clock violation"
    except (OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        result["reason"] = str(error)
    provenance = {"librarySha256": sha(library), "openstaSha256": runtime["openstaSha256"],
                  "files": {str(p.relative_to(root)): sha(p) for p in files.values() if p.is_file()},
                  "assignment": assignment, "equivalence": "same graph and same validated Boolean/positive-edge DFF signature"}
    dump(files["provenance"], provenance)
    return result

def select(root):
    root = Path(root).resolve()
    request_path = regular(root, "input/selection-request.json")
    library = regular(root, "input/selection-library.lib")
    runtime_path = regular(root, "input/selection-runtime.json")
    r = validate_request(json.loads(request_path.read_text()))
    runtime = json.loads(runtime_path.read_text())
    executable = Path(runtime["openstaPath"])
    if not executable.is_absolute() or not executable.is_file() or sha(executable) != runtime["openstaSha256"]:
        raise ValueError("native STA executable provenance mismatch")
    cells = load_library(library)
    insts = r["circuit"]["instances"]
    domains = []
    for inst in insts:
        domain = [inst["initialDrive"]] if inst.get("locked", False) else sorted(inst["allowedDrives"])
        if any((inst["family"], d) not in cells for d in domain):
            raise ValueError("requested family/drive absent from frozen library")
        domains.append(domain)
    space = math.prod(len(d) for d in domains)
    evaluations, cache = [], {}
    deadline = time.monotonic() + 480
    class SearchTimeBudget(Exception):
        pass
    baseline = tuple(i["initialDrive"] for i in insts)
    def timing_reference():
        # Once a complete timing observation exists, every balanced comparison
        # uses that same first observation, including when baseline STA failed.
        return next((value for value in evaluations
                     if value["status"] != "unknown"
                     and isinstance(value.get("timingBudgetNs"), (int, float))
                     and math.isfinite(value["timingBudgetNs"])
                     and value["timingBudgetNs"] > 0), None)
    def score(e):
        if e["status"] == "unknown":
            return (2, math.inf, math.inf, e["id"])
        if not e["feasible"]:
            violation = -sum(min(0, e[k] or 0) for k in ("maxSlackNs", "minSlackNs", "setupSlackNs", "holdSlackNs"))
            return (1, violation, e["areaUm2"], e["id"])
        area, delay = e["areaUm2"], e["pathDelayNs"]
        if r["objective"] == "area":
            return (0, area, delay, e["id"])
        if r["objective"] == "performance":
            return (0, -e["maxSlackNs"], area, delay, e["id"])
        base = evaluations[0] if evaluations else e
        area0 = base["areaUm2"]
        timing = e["timingBudgetNs"]
        reference = timing_reference()
        if reference is None or timing <= 0:
            raise ValueError("no positive known constrained timing budget")
        timing0 = reference["timingBudgetNs"]
        return (0, .5 * area / area0 + .5 * timing / timing0, area, e["id"])
    def observe(values):
        if values not in cache:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise SearchTimeBudget()
            assignment = {i["id"]: d for i, d in zip(insts, values)}
            cache[values] = evaluate(root, r, library, runtime, cells, assignment, len(evaluations), min(30, remaining))
            evaluations.append(cache[values])
        return cache[values]
    observe(baseline)
    method = "exhaustive" if space <= r["maxEvaluations"] else "coordinate_descent"
    termination = "space_exhausted"
    try:
        if method == "exhaustive":
            for values in itertools.product(*domains):
                observe(values)
        else:
            current = baseline
            termination = "local_optimum"
            while len(evaluations) < r["maxEvaluations"]:
                previous = current
                for position, domain in enumerate(domains):
                    best = current
                    for drive in domain:
                        candidate = current[:position] + (drive,) + current[position + 1:]
                        if candidate not in cache and len(evaluations) >= r["maxEvaluations"]:
                            termination = "evaluation_budget"
                            break
                        if score(observe(candidate)) < score(observe(best)):
                            best = candidate
                    current = best
                if current == previous:
                    break
            if len(evaluations) >= r["maxEvaluations"]:
                termination = "evaluation_budget"
    except SearchTimeBudget:
        termination = "time_budget"
    feasible = [e for e in evaluations if e["feasible"]]
    best = min(feasible, key=score) if feasible else None
    reference = timing_reference()
    normalization = ({"areaEvaluationId": evaluations[0]["id"],
                      "timingEvaluationId": reference["id"] if reference else None,
                      "areaUm2": evaluations[0]["areaUm2"],
                      "timingBudgetNs": reference["timingBudgetNs"] if reference else None}
                     if r["objective"] == "balanced" else None)
    result = {"schemaVersion": VERSION, "status": "ok" if best else "inconclusive" if any(e["status"] == "unknown" for e in evaluations) else "no_feasible_candidate",
              "bestEvaluationId": best["id"] if best else None, "baselineEvaluationId": evaluations[0]["id"],
              "evaluations": evaluations, "search": {"method": method, "spaceSize": space if space <= 9007199254740991 else str(space), "evaluated": len(evaluations), "termination": "incomplete_evidence" if any(e["status"] == "unknown" for e in evaluations) else termination},
              "library": {"id": LIBRARY_ID, "sha256": LIBRARY_SHA, "corner": "TT 25C 5.0V", "cellCount": 229,
                          "units": {"time": "ns", "capacitance": "pF", "area": "um2"}, "cells": list(cells.values())},
              "scope": "Pre-layout single-corner ideal-clock native OpenSTA cell sizing",
              "limitations": LIMITATIONS, "request": r,
              "provenance": {"requestSha256": sha(request_path), "runtimeSha256": sha(runtime_path),
                             "engineSha256": sha(Path(__file__)), "openstaSha256": runtime["openstaSha256"]},
              "rationale": {"objective": r["objective"], "normalization": normalization, "feasibility": "Constrained min/max slack >= 0; sequential needs observed DFF-to-DFF setup and hold",
                            "ranking": "Area then delay" if r["objective"] == "area" else "Highest global max/setup slack, then area and path delay" if r["objective"] == "performance" else "Equal normalized baseline area and constrained timing budget (period minus global max slack); first known positive timing budget is the fixed timing reference",
                            "optimality": "Global over requested domains" if method == "exhaustive" and termination == "space_exhausted" and all(e["status"] != "unknown" for e in evaluations) else "Search has incomplete timing evidence; no global optimum claim" if any(e["status"] == "unknown" for e in evaluations) else "Bounded partial search; global optimum not guaranteed",
                            "perInstance": [{"id": i["id"], "family": i["family"], "baselineDrive": i["initialDrive"], "selectedDrive": best["assignment"][i["id"]] if best else None,
                                             "reason": "Locked by request" if i.get("locked") else "Ranked feasible assignment preserving pin/function signature"} for i in insts]}}
    output = root / "output" / "selection"
    output.mkdir(parents=True, exist_ok=True)
    dump(output / "result.json", result)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace")
    parser.add_argument("--version", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.version:
        print(VERSION)
        return 0
    if not args.workspace:
        parser.error("--workspace required")
    try:
        result = select(args.workspace)
        if args.self_test and (result["status"] != "ok" or not any(e["setupSlackNs"] is not None and e["holdSlackNs"] is not None for e in result["evaluations"])):
            raise ValueError("self-test requires feasible native DFF-to-DFF setup and hold evidence")
        print(json.dumps({"schemaVersion": VERSION, "status": result["status"], "evaluated": result["search"]["evaluated"], "bestEvaluationId": result["bestEvaluationId"]}))
        return 0
    except (ValueError, KeyError, TypeError, OSError, IndexError, json.JSONDecodeError) as error:
        print("Cell selection failed: " + str(error), file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
