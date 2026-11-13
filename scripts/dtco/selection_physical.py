#!/usr/bin/env python3
"""Exact-assignment GF180 standard-cell engineering place and route."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import resource
import subprocess
import sys
import time

VERSION = "dtco.cell-selection.physical.v1"
SCOPE = "GF180 7-track 6LM engineering placement and detailed routing; pre-layout STA remains separate"
LIMITATIONS = [
    "Router DRC and connectivity checks are not foundry signoff DRC/LVS.",
    "No CTS, signal buffering, resizing, synthesis, extraction, or post-route timing is performed.",
    "Clock is routed as an ordinary signal; pre-layout timing does not include routed parasitics.",
    "No well-tap, filler, seal-ring, pad-ring, antenna, or density signoff.",
]
def digest(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def dump(p, value):
    Path(p).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")

def safe(root, relative):
    if not isinstance(relative, str) or Path(relative).is_absolute():
        raise ValueError("Expected a workspace-relative path")
    p = root / relative
    if p.is_symlink() or not p.resolve().is_relative_to(root):
        raise ValueError("Artifact escaped workspace")
    return p

def quoted(value):
    value = str(value)
    if any(c in value for c in "{}\r\n\\"):
        raise ValueError("Unsafe Tcl path")
    return "{" + value + "}"

def limits():
    resource.setrlimit(resource.RLIMIT_AS, (8 * 1024**3, 8 * 1024**3))
    resource.setrlimit(resource.RLIMIT_FSIZE, (128 * 1024**2, 128 * 1024**2))

def run(argv, cwd, log, deadline, per_candidate=120):
    remaining = min(per_candidate, deadline - time.monotonic())
    if remaining <= 0:
        raise TimeoutError("Physical job time budget exhausted")
    env = {"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": str(cwd),
           "QT_QPA_PLATFORM": "offscreen", "OMP_NUM_THREADS": "1", "LANG": "C.UTF-8"}
    with Path(log).open("wb") as out:
        proc = subprocess.Popen(argv, cwd=cwd, stdout=out, stderr=subprocess.STDOUT,
                                env=env, preexec_fn=limits)
        try:
            code = proc.wait(timeout=remaining)
        except BaseException:
            proc.kill()
            proc.wait()
            raise
    if code:
        raise RuntimeError(Path(log).name + " exited " + str(code))

def parse_mapped(text):
    top = re.search(r"\bmodule\s+(\w+)\s*\(([^)]*)\)", text)
    if not top:
        raise ValueError("Mapped module missing")
    instances = {}
    nets = {}
    for cell, name, pins in re.findall(r"(gf180mcu_fd_sc_mcu7t5v0__\w+)\s+(\w+)\s*\((.*?)\);", text, re.S):
        if name in instances:
            raise ValueError("Duplicate mapped instance")
        instances[name] = cell
        for pin, net in re.findall(r"\.(\w+)\s*\(\s*(\w+)\s*\)", pins):
            nets.setdefault(net, {"pins": set(), "ports": set()})["pins"].add(name + "/" + pin)
    ports = [v.strip() for v in top.group(2).split(",") if v.strip()]
    for port in ports:
        if not re.fullmatch(r"[A-Za-z_]\w*", port):
            raise ValueError("Unconnected mapped primary port")
        nets.setdefault(port, {"pins": set(), "ports": set()})["ports"].add(port)
    if not instances or len(instances) > 256:
        raise ValueError("Mapped instance count outside bounds")
    return top.group(1), instances, nets

def audit_database(p, expected_instances, expected_nets):
    instances, nets, stats, ports = {}, {}, {}, {}
    for line in Path(p).read_text().splitlines():
        fields = line.split("\t")
        if fields[0] == "instance":
            instances[fields[1]] = fields[2]
        elif fields[0] == "net":
            nets[fields[1]] = {"wire": fields[2] == "1", "disconnected": fields[3] == "1",
                              "pins": set(filter(None, fields[4].split(","))),
                              "ports": set(filter(None, fields[5].split(",")))}
        elif fields[0] == "port":
            ports[fields[1]] = int(fields[2])
        elif fields[0] == "drc":
            stats["routeDrcCount"] = int(fields[1])
    if instances != expected_instances:
        raise ValueError("Physical flow changed functional instance assignment")
    unrouted = 0
    for name, expected in expected_nets.items():
        actual = nets.get(name)
        if not actual or actual["pins"] != expected["pins"] or actual["ports"] != expected["ports"]:
            raise ValueError("Mapped pin/net connectivity changed: " + name)
        if actual["disconnected"] or (len(actual["pins"]) + len(actual["ports"]) > 1 and not actual["wire"]):
            unrouted += 1
    expected_ports = {port for net in expected_nets.values() for port in net["ports"]}
    if any(ports.get(port, 0) < 1 for port in expected_ports):
        raise ValueError("Primary port has no physical pin geometry")
    if set(nets) - set(expected_nets) - {"VDD", "VSS"}:
        raise ValueError("Unexpected signal nets")
    for name in ("VDD", "VSS"):
        expected_pins = {instance + "/" + name for instance in instances}
        if name not in nets or nets[name]["pins"] != expected_pins:
            raise ValueError("Power pin net binding missing")
    if stats.get("routeDrcCount") != 0 or unrouted:
        raise ValueError("Routing has DRC violations or unrouted nets")
    return {"exactAssignment": True, "logicalConnectivity": True, "routeComplete": True,
            "routeDrcCount": 0, "drcViolations": 0, "unroutedNets": unrouted, "legalPlacement": True,
            "powerGridConnected": True, "powerConnected": True, "functionalInstances": instances,
            "addedFunctionalInstances": 0, "placedPrimaryPorts": len(expected_ports), "signalNets": len(expected_nets),
            "routerConnectivity": "TritonRoute per-iteration connectivity checker",
            "foundryDrc": "not_run", "lvs": "not_run"}

def tcl_program(runtime, top, width, height):
    tech, lef = quoted(runtime["techLefPath"]), quoted(runtime["cellLefPath"])
    lines = [
        "read_lef " + tech, "read_lef " + lef,
        "read_liberty ../../../../input/selection-library.lib",
        "read_verilog ../mapped.v", "link_design " + top, "read_sdc ../constraints.sdc",
        "initialize_floorplan -die_area {0 0 %g %g} -core_area {10 10 %g %g} -site GF018hv5v_mcu_sc7" % (width, height, width-10, height-10),
        "make_tracks",
        "add_global_connection -net VDD -inst_pattern .* -pin_pattern ^VDD$ -power",
        "add_global_connection -net VSS -inst_pattern .* -pin_pattern ^VSS$ -ground",
        "global_connect",
        "set_wire_rc -signal -resistance 0.000225636 -capacitance 0.000135357",
        "set_wire_rc -clock -resistance 0.000225636 -capacitance 0.000135357",
        "global_placement -density 0.3 -skip_io",
        "place_pins -hor_layers Metal3 -ver_layers Metal2", "detailed_placement",
        "check_placement -verbose",
        "set_voltage_domain -name CORE -power VDD -ground VSS",
        "define_pdn_grid -name block -voltage_domains CORE -pins Metal5",
        "add_pdn_stripe -grid block -layer Metal1 -width 0.600 -pitch 3.92 -offset 0 -followpins",
        "add_pdn_stripe -grid block -layer Metal4 -width 4.480 -spacing 0.56 -pitch 44.8 -offset 22.4",
        "add_pdn_stripe -grid block -layer Metal5 -width 4.480 -pitch 89.6 -offset 44.8",
        "add_pdn_connect -grid block -layers {Metal1 Metal4} -max_columns 5 -ongrid {Metal2 Metal3 Metal4} -split_cuts {Metal3 0.128}",
        "add_pdn_connect -grid block -layers {Metal4 Metal5}",
        "pdngen", "check_power_grid -net VDD", "check_power_grid -net VSS",
        "set_routing_layers -signal Metal2-Metal5",
        "set_global_routing_layer_adjustment Metal2-Metal5 0.3",
        "global_route -guide_file routed.guide -congestion_iterations 30",
        "detailed_route -output_drc route-drc.rpt -output_maze route-maze.log -droute_end_iter 32",
        "check_placement -verbose", "check_power_grid -net VDD", "check_power_grid -net VSS",
        "set report [open database.tsv w]",
        'puts $report "drc\\t[detailed_route_num_drvs]"',
        "set block [ord::get_db_block]",
        'foreach inst [$block getInsts] { puts $report "instance\\t[$inst getName]\\t[[$inst getMaster] getName]" }',
        "foreach port [$block getBTerms] {",
        " set boxes 0; foreach pin [$port getBPins] { incr boxes [llength [$pin getBoxes]] }",
        ' puts $report "port\\t[$port getName]\\t$boxes"', "}",
        "foreach net [$block getNets] {",
        " set pins {}; set ports {}",
        ' foreach pin [$net getITerms] { lappend pins "[[$pin getInst] getName]/[[$pin getMTerm] getName]" }',
        " foreach port [$net getBTerms] { lappend ports [$port getName] }",
        ' puts $report "net\\t[$net getName]\\t[expr {[$net getWire] != \"NULL\"}]\\t[expr {[$net isDisconnected] ? 1 : 0}]\\t[join [lsort $pins] ,]\\t[join [lsort $ports] ,]"',
        "}", "close $report",
        "if {[detailed_route_num_drvs] != 0} { error {Nonzero router DRC} }",
        "write_def routed.def", "write_db routed.odb", "write_verilog -include_pwr_gnd routed.v",
        "puts PHYSICAL_COMPLETE", "exit",
    ]
    return "\n".join(lines) + "\n"

def validate_runtime(runtime):
    required = ["openroadPath", "klayoutPath", "techLefPath", "cellLefPath", "klayoutTechPath", "layerMapPath"]
    hashes = {**runtime.get("assetHashes", {}), **runtime.get("toolHashes", {})}
    for key in required:
        p = Path(runtime[key])
        if not p.is_absolute() or not p.is_file() or hashes.get(str(p)) != digest(p):
            raise ValueError("Physical runtime file identity mismatch: " + key)
    if not runtime.get("cellGdsPaths"):
        raise ValueError("Physical cell GDS set missing")
    for source in runtime["cellGdsPaths"]:
        if hashes.get(source) != digest(source) or Path(source).read_bytes().startswith(b"version https://git-lfs"):
            raise ValueError("Cell GDS absent or checksum changed")
    return hashes

def execute(workspace):
    root = Path(workspace).resolve()
    runtime = json.loads(safe(root, "input/selection-physical-runtime.json").read_text())
    identities = validate_runtime(runtime)
    result_path = safe(root, "output/selection/result.json")
    timing = json.loads(result_path.read_text())
    evaluations = timing["evaluations"]
    if not 1 <= len(evaluations) <= 256:
        raise ValueError("Evaluation count outside bounds")
    total = runtime.get("limits", {}).get("totalTimeoutSeconds", runtime.get("totalTimeoutSeconds", 1800))
    if not isinstance(total, (int, float)) or not 1 <= total <= 1800:
        raise ValueError("Invalid physical time budget")
    per_candidate = runtime.get("limits", {}).get("perCandidateTimeoutSeconds", runtime.get("perCandidateTimeoutSeconds", 120))
    if not isinstance(per_candidate, (int, float)) or not 1 <= per_candidate <= 120:
        raise ValueError("Invalid candidate time budget")
    deadline = time.monotonic() + total
    output = {"schemaVersion": VERSION, "status": "complete", "sourceTimingSha256": digest(result_path),
              "scope": SCOPE, "limitations": LIMITATIONS, "layerStack": "GF180 6LM_1TM_9K 7t",
              "toolchain": {"identities": identities, "helperSha256": digest(__file__),
                            "streamHelperSha256": digest(Path(__file__).parent / "physical" / "stream.py")},
              "evaluations": []}
    for evaluation in evaluations:
        ident = evaluation["id"]
        if not re.fullmatch(r"eval-\d{4}", ident):
            raise ValueError("Unsafe evaluation identifier")
        relative = "output/selection/" + ident + "/physical"
        folder = safe(root, relative)
        folder.mkdir(exist_ok=False)
        native_netlist = safe(root, evaluation["artifacts"]["netlist"])
        constraints = safe(root, evaluation["artifacts"]["constraints"])
        if native_netlist.parent != folder.parent or constraints.parent != folder.parent:
            raise ValueError("Candidate source paths differ from canonical layout")
        record = {"id": ident, "status": "failed", "scope": SCOPE,
                  "sourceNetlistSha256": digest(native_netlist), "sourceTimingSha256": output["sourceTimingSha256"],
                  "sourceConstraintsSha256": digest(constraints), "assignment": evaluation["assignment"],
                  "artifacts": {}, "checks": {}, "hashes": {}}
        try:
            candidate_deadline = min(deadline, time.monotonic() + per_candidate)
            top, instances, nets = parse_mapped(native_netlist.read_text())
            if instances != evaluation["cells"]:
                raise ValueError("Timing result and mapped cells differ")
            selected = []
            for cell in sorted(set(instances.values())):
                matches = [p for p in runtime["cellGdsPaths"] if Path(p).name == cell + ".gds"]
                if len(matches) != 1:
                    raise ValueError("Physical GDS master missing: " + cell)
                selected.append(matches[0])
            # A fixed minimum die accommodates a connected PDN even for tiny circuits.
            width = max(140, math.ceil(math.sqrt(float(evaluation["areaUm2"]) / 0.15) + 20))
            (folder / "run.tcl").write_text(tcl_program(runtime, top, width, width))
            run([runtime["openroadPath"], "-exit", "-no_init", "-threads", "1", "run.tcl"],
                folder, folder / "openroad.log", candidate_deadline, per_candidate)
            log = (folder / "openroad.log").read_text()
            if "PHYSICAL_COMPLETE" not in log or "[ERROR" in log or "checkConnectivity error" in log:
                raise ValueError("Native physical checks did not finish")
            checks = audit_database(folder / "database.tsv", instances, nets)
            dump(folder / "stream-input.json", {"runtime": runtime, "top": top,
                 "instances": instances, "cellGdsPaths": selected})
            stream = Path(__file__).parent / "physical" / "stream.py"
            run([runtime["klayoutPath"], "-b", "-r", str(stream), "-rd",
                 "physical_config=" + str(folder / "stream-input.json")],
                folder, folder / "stream.log", candidate_deadline, per_candidate)
            stream_checks = json.loads((folder / "stream-validation.json").read_text())
            checks.update(stream_checks)
            if checks.get("missingMasters") != 0 or not checks.get("routedGeometry"):
                raise ValueError("Final circuit GDS validation failed")
            dump(folder / "validation.json", checks)
            record["checks"] = checks
            record["status"] = "succeeded"
            record["artifacts"] = {key: relative + "/" + name for key, name in {
                "gdsPath": "routed.gds", "defPath": "routed.def", "odbPath": "routed.odb",
                "previewPath": "preview.png", "routeReportPath": "route-drc.rpt",
                "validationPath": "validation.json", "databasePath": "database.tsv",
                "openroadLogPath": "openroad.log", "streamLogPath": "stream.log",
                "scriptPath": "run.tcl", "routedNetlistPath": "routed.v"}.items()}
        except Exception as error:
            record["reason"] = str(error)
            output["status"] = "incomplete"
        record["hashes"] = {relative + "/" + p.name: digest(p) for p in sorted(folder.iterdir()) if p.is_file()}
        output["evaluations"].append(record)
        dump(root / "output/selection/physical-result.json", output)
    return 0 if output["status"] == "complete" else 1

def main():
    parser = argparse.ArgumentParser()
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
        return execute(args.workspace)
    except Exception as error:
        print("Physical flow failed: " + str(error), file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
