#!/usr/bin/env python3
"""Generate comparable adder synthesis/STA/PPA data for local open PDKs.

Outputs are self-contained under:
  data/digital-technologies/<technology-md5>/results/adders/<arch>/w<N>/

The frontend row is `result.json`; RTL, mapped netlist, tool scripts, and logs
live beside it so every plotted point is auditable and reproducible.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "data" / "digital-technologies"
TOP = "adder_top"
ARCHITECTURES = (
    "ripple_carry_adder",
    "carry_lookahead_adder",
    "kogge_stone_adder",
    "carry_select_adder",
)


@dataclass(frozen=True)
class Technology:
    process_node: str
    display_name: str
    canonical: str
    pdk: str
    library_name: str
    corner: str
    source_path: Path
    upstream: str
    gf180_fragment_root: Path | None = None

    @property
    def uid(self) -> str:
        identity = json.dumps(
            {
                "schemaVersion": 1,
                "processNode": self.process_node,
                "canonicalTechnology": self.canonical,
                "isNamedPdk": True,
            },
            separators=(",", ":"),
        )
        return hashlib.md5(identity.encode("utf-8")).hexdigest()


TECHNOLOGIES = {
    "freepdk45": Technology(
        process_node="freepdk45",
        display_name="FreePDK45",
        canonical="45nm",
        pdk="FreePDK45",
        library_name="gscl45nm",
        corner="typical",
        source_path=Path("/home/duhaochen/LibCharX/libraries/FREEPDK45/gscl45nm.lib"),
        upstream="FreePDK45 / NCSU Generic 45nm Standard Cell Library",
    ),
    "gf180": Technology(
        process_node="gf180",
        display_name="GF180MCU 7T",
        canonical="180nm",
        pdk="GF180MCU",
        library_name="gf180mcu_fd_sc_mcu7t5v0",
        corner="tt_025C_5v00",
        source_path=Path(
            "/home/duhaochen/LibCharX/libraries/gf180mcu/"
            "gf180mcu_fd_sc_mcu7t5v0/liberty/"
            "gf180mcu_fd_sc_mcu7t5v0__tt_025C_5v00.lib"
        ),
        upstream="GlobalFoundries GF180MCU open PDK",
        gf180_fragment_root=Path(
            "/home/duhaochen/LibCharX/libraries/gf180mcu/"
            "gf180mcu_fd_sc_mcu7t5v0/cells"
        ),
    ),
    "ihpsg13g2": Technology(
        process_node="ihpsg13g2",
        display_name="IHP SG13G2",
        canonical="130nm",
        pdk="IHP-Open-PDK SG13G2",
        library_name="sg13g2_stdcell",
        corner="typ_1p20V_25C",
        source_path=Path(
            "/home/duhaochen/spice_model_benchmark/models/IHP-Open-PDK/"
            "ihp-sg13g2/libs.ref/sg13g2_stdcell/lib/"
            "sg13g2_stdcell_typ_1p20V_25C.lib"
        ),
        upstream="IHP Open PDK SG13G2 standard-cell library",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(command: list[str], cwd: Path, log_path: Path | None = None) -> str:
    completed = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if log_path is not None:
        log_path.write_text(completed.stdout, encoding="utf-8")
    if completed.returncode != 0:
        raise RuntimeError(
            f"command failed ({completed.returncode}): {' '.join(command)}\n{completed.stdout[-5000:]}"
        )
    return completed.stdout


def tool_version(command: list[str]) -> str:
    return run(command, ROOT).strip().splitlines()[0]


def compile_gf180_liberty(technology: Technology, destination: Path) -> Path:
    """Assemble GF180's library header and per-cell Liberty fragments."""
    assert technology.gf180_fragment_root is not None
    header = technology.source_path.read_text(encoding="utf-8")
    before_close, separator, tail = header.rpartition("}")
    if not separator or tail.strip():
        raise ValueError(f"unexpected GF180 Liberty header shape: {technology.source_path}")
    fragments = sorted(
        technology.gf180_fragment_root.glob(
            "*/*__tt_025C_5v00.lib"
        )
    )
    if not fragments:
        raise FileNotFoundError("no GF180 TT/25C/5V cell Liberty fragments found")
    with destination.open("w", encoding="utf-8") as stream:
        stream.write(before_close.rstrip())
        stream.write("\n\n")
        for fragment in fragments:
            stream.write(fragment.read_text(encoding="utf-8").strip())
            stream.write("\n\n")
        stream.write("}\n")
    return destination


def materialize_liberty(technology: Technology, temp_dir: Path) -> Path:
    if not technology.source_path.is_file():
        raise FileNotFoundError(technology.source_path)
    if technology.gf180_fragment_root is not None:
        return compile_gf180_liberty(technology, temp_dir / "gf180mcu_tt_5v.lib")
    return technology.source_path.resolve()


def ripple_rtl(width: int) -> str:
    lines = [
        f"module {TOP}(input [{width - 1}:0] a, b, input cin, output [{width - 1}:0] sum, output cout);",
        f"  wire [{width}:0] carry;",
        "  assign carry[0] = cin;",
    ]
    for bit in range(width):
        lines.append(
            f"  assign {{carry[{bit + 1}], sum[{bit}]}} = a[{bit}] + b[{bit}] + carry[{bit}];"
        )
    lines.extend((f"  assign cout = carry[{width}];", "endmodule", ""))
    return "\n".join(lines)


def carry_lookahead_rtl(width: int) -> str:
    lines = [
        f"module {TOP}(input [{width - 1}:0] a, b, input cin, output [{width - 1}:0] sum, output cout);",
        f"  wire [{width - 1}:0] p = a ^ b;",
        f"  wire [{width - 1}:0] g = a & b;",
        f"  wire [{width}:0] carry;",
        "  assign carry[0] = cin;",
    ]
    for bit in range(width):
        terms = [f"g[{source}]" + "".join(f" & p[{p}]" for p in range(bit, source, -1)) for source in range(bit, -1, -1)]
        terms.append("cin" + "".join(f" & p[{p}]" for p in range(bit, -1, -1)))
        lines.append(f"  assign carry[{bit + 1}] = " + " | ".join(f"({term})" for term in terms) + ";")
    lines.extend(("  assign sum = p ^ carry[%d:0];" % (width - 1), f"  assign cout = carry[{width}];", "endmodule", ""))
    return "\n".join(lines)


def kogge_stone_rtl(width: int) -> str:
    stages = math.ceil(math.log2(width))
    lines = [
        f"module {TOP}(input [{width - 1}:0] a, b, input cin, output [{width - 1}:0] sum, output cout);",
        f"  wire [{width - 1}:0] p0 = a ^ b;",
        f"  wire [{width - 1}:0] g0 = a & b;",
    ]
    previous = 0
    for stage in range(1, stages + 1):
        distance = 1 << (stage - 1)
        lines.extend((f"  wire [{width - 1}:0] p{stage};", f"  wire [{width - 1}:0] g{stage};"))
        for bit in range(width):
            if bit < distance:
                lines.extend((f"  assign p{stage}[{bit}] = p{previous}[{bit}];", f"  assign g{stage}[{bit}] = g{previous}[{bit}];"))
            else:
                lines.extend((
                    f"  assign p{stage}[{bit}] = p{previous}[{bit}] & p{previous}[{bit - distance}];",
                    f"  assign g{stage}[{bit}] = g{previous}[{bit}] | (p{previous}[{bit}] & g{previous}[{bit - distance}]);",
                ))
        previous = stage
    lines.extend((f"  wire [{width}:0] carry;", "  assign carry[0] = cin;"))
    for bit in range(width):
        lines.append(f"  assign carry[{bit + 1}] = g{previous}[{bit}] | (p{previous}[{bit}] & cin);")
    lines.extend((f"  assign sum = p0 ^ carry[{width - 1}:0];", f"  assign cout = carry[{width}];", "endmodule", ""))
    return "\n".join(lines)


def carry_select_rtl(width: int, block_size: int = 4) -> str:
    lines = [
        f"module {TOP}(input [{width - 1}:0] a, b, input cin, output [{width - 1}:0] sum, output cout);",
    ]
    blocks = math.ceil(width / block_size)
    lines.append(f"  wire [{blocks}:0] block_carry;")
    lines.append("  assign block_carry[0] = cin;")
    for block in range(blocks):
        lo = block * block_size
        hi = min(width, lo + block_size) - 1
        size = hi - lo + 1
        lines.extend((
            f"  wire [{size}:0] candidate0_{block};",
            f"  wire [{size}:0] candidate1_{block};",
            f"  assign candidate0_{block} = {{1'b0, a[{hi}:{lo}]}} + {{1'b0, b[{hi}:{lo}]}};",
            f"  assign candidate1_{block} = {{1'b0, a[{hi}:{lo}]}} + {{1'b0, b[{hi}:{lo}]}} + 1'b1;",
            f"  assign sum[{hi}:{lo}] = block_carry[{block}] ? candidate1_{block}[{size - 1}:0] : candidate0_{block}[{size - 1}:0];",
            f"  assign block_carry[{block + 1}] = block_carry[{block}] ? candidate1_{block}[{size}] : candidate0_{block}[{size}];",
        ))
    lines.extend((f"  assign cout = block_carry[{blocks}];", "endmodule", ""))
    return "\n".join(lines)


RTL_GENERATORS = {
    "ripple_carry_adder": ripple_rtl,
    "carry_lookahead_adder": carry_lookahead_rtl,
    "kogge_stone_adder": kogge_stone_rtl,
    "carry_select_adder": carry_select_rtl,
}


def testbench(width: int) -> str:
    mask = (1 << width) - 1
    return f"""`timescale 1ns/1ps
module tb;
  reg [{width - 1}:0] a, b;
  reg cin;
  wire [{width - 1}:0] sum;
  wire cout;
  reg [{width}:0] expected;
  integer i;
  {TOP} dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));
  initial begin
    for (i = 0; i < 128; i = i + 1) begin
      a = (i * 17 + 3) & {width}'h{mask:x};
      b = (i * 29 + 11) & {width}'h{mask:x};
      cin = i & 1;
      #1;
      expected = a + b + cin;
      if ({{cout, sum}} !== expected) begin
        $display("FAIL vector=%0d a=%h b=%h cin=%b got=%b_%h expected=%h", i, a, b, cin, cout, sum, expected);
        $finish_and_return(1);
      end
    end
    $display("PASS vectors=128 width={width}");
    $finish;
  end
endmodule
"""


def matching_brace(text: str, opening: int) -> int:
    depth = 0
    in_string = False
    escaped = False
    for index in range(opening, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index
    raise ValueError("unbalanced Liberty braces")


def liberty_cells(liberty: Path) -> tuple[dict[str, dict[str, float | None]], float]:
    text = liberty.read_text(encoding="utf-8", errors="replace")
    unit_match = re.search(r"leakage_power_unit\s*:\s*\"?\s*([0-9.eE+-]+)\s*(pW|nW|uW|mW|W)\s*\"?", text)
    if unit_match:
        unit_value = float(unit_match.group(1))
        unit_factor = {"pW": 1e-9, "nW": 1e-6, "uW": 1e-3, "mW": 1.0, "W": 1e3}[unit_match.group(2)]
        leakage_to_mw = unit_value * unit_factor
    else:
        leakage_to_mw = 0.0
    cell_pattern = re.compile(r"(?m)^\s*cell\s*\(\s*\"?([^\"\)\s]+)\"?\s*\)\s*\{")
    cells: dict[str, dict[str, float | None]] = {}
    for match in cell_pattern.finditer(text):
        opening = text.find("{", match.start())
        body = text[opening + 1 : matching_brace(text, opening)]
        area_match = re.search(r"(?m)^\s*area\s*:\s*([0-9.eE+-]+)\s*;", body)
        direct = re.search(r"(?m)^\s*cell_leakage_power\s*:\s*([0-9.eE+-]+)\s*;", body)
        leakage: float | None = float(direct.group(1)) if direct else None
        if leakage is None:
            values = [
                float(value)
                for value in re.findall(
                    r"leakage_power\s*\(\s*\)\s*\{[^{}]*?\bvalue\s*:\s*\"?([0-9.eE+-]+)\"?\s*;[^{}]*?\}",
                    body,
                    flags=re.DOTALL,
                )
            ]
            if values:
                leakage = sum(values) / len(values)
        cells[match.group(1)] = {
            "area": float(area_match.group(1)) if area_match else None,
            "leakage_mw": leakage * leakage_to_mw if leakage is not None and leakage_to_mw else None,
        }
    if not cells:
        raise ValueError(f"no cells parsed from {liberty}")
    return cells, leakage_to_mw


def cell_counts(mapped_json: Path) -> dict[str, int]:
    design = json.loads(mapped_json.read_text(encoding="utf-8"))
    cells = design["modules"][TOP]["cells"]
    counts: dict[str, int] = {}
    for cell in cells.values():
        cell_type = str(cell["type"])
        counts[cell_type] = counts.get(cell_type, 0) + 1
    return dict(sorted(counts.items()))


def parse_area(report: str) -> float:
    matches = re.findall(r"Chip area for module ['\\]*adder_top[':]+\s*([0-9.eE+-]+)", report)
    if not matches:
        matches = re.findall(r"Chip area for module .*?:\s*([0-9.eE+-]+)", report)
    if len(matches) != 1:
        raise ValueError(f"unable to parse one chip-area value: {matches}")
    return float(matches[0])


def parse_critical_path(report: str) -> dict[str, Any]:
    paths = []
    for block in re.split(r"(?=^Startpoint:)", report, flags=re.MULTILINE):
        start = re.search(r"^Startpoint:\s*(.+)$", block, re.MULTILINE)
        end = re.search(r"^Endpoint:\s*(.+)$", block, re.MULTILINE)
        arrival = re.search(r"^\s*([-+0-9.eE]+)\s+data arrival time\s*$", block, re.MULTILINE)
        if start and end and arrival:
            paths.append(
                {
                    "startpoint": start.group(1).strip(),
                    "endpoint": end.group(1).strip(),
                    "arrivalNs": float(arrival.group(1)),
                }
            )
    if not paths:
        raise ValueError("OpenSTA emitted no constrained timing path")
    return max(paths, key=lambda path: path["arrivalNs"])


def write_manifest(technology: Technology, liberty: Path, tools: dict[str, str]) -> None:
    directory = STORE / technology.uid
    directory.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schemaVersion": 1,
        "uid": technology.uid,
        "processNode": technology.process_node,
        "displayName": technology.display_name,
        "canonicalTechnology": technology.canonical,
        "isNamedPdk": True,
        "identity": {
            "schemaVersion": 1,
            "processNode": technology.process_node,
            "canonicalTechnology": technology.canonical,
            "isNamedPdk": True,
        },
        "pdk": technology.pdk,
        "standardCellLibrary": technology.library_name,
        "corner": technology.corner,
        "upstream": technology.upstream,
        "localLibertySource": str(technology.source_path),
        "materializedLibertySha256": sha256(liberty),
        "flow": {
            "architectures": list(ARCHITECTURES),
            "widths": [4, 8, 16, 32],
            "constraints": {"inputSlewNs": 0.05, "outputLoadPf": 0.01},
            "tools": tools,
            "metricPolicy": {
                "fmaxMhz": "1000 / OpenSTA combinational critical-path arrival_ns",
                "areaUm2": "Yosys stat -liberty mapped-cell area",
                "powerMw": "sum of Liberty cell leakage; conditional leakage groups averaged per cell",
            },
        },
    }
    (directory / "technology.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )


def run_point(
    technology: Technology,
    liberty: Path,
    cells: dict[str, dict[str, float | None]],
    architecture: str,
    width: int,
    tools: dict[str, str],
) -> None:
    out_dir = STORE / technology.uid / "results" / "adders" / architecture / f"w{width}"
    out_dir.mkdir(parents=True, exist_ok=True)
    rtl_path = out_dir / "rtl.v"
    tb_path = out_dir / "testbench.v"
    rtl_path.write_text(RTL_GENERATORS[architecture](width), encoding="utf-8")
    tb_path.write_text(testbench(width), encoding="utf-8")

    simulation_binary = out_dir / "rtl-sim.out"
    run(
        ["iverilog", "-g2012", "-s", "tb", "-o", str(simulation_binary), str(rtl_path), str(tb_path)],
        out_dir,
        out_dir / "iverilog-compile.log",
    )
    simulation_log = run(["vvp", str(simulation_binary)], out_dir, out_dir / "rtl-simulation.log")
    simulation_binary.unlink(missing_ok=True)
    if "PASS vectors=128" not in simulation_log:
        raise RuntimeError(f"RTL simulation did not pass: {out_dir}")

    mapped_v = out_dir / "mapped.v"
    mapped_json = out_dir / "mapped.json"
    stat_report = out_dir / "area.rpt"
    yosys_script = out_dir / "synthesis.ys"
    yosys_script.write_text(
        "\n".join(
            (
                f"read_verilog {rtl_path}",
                f"hierarchy -check -top {TOP}",
                f"synth -top {TOP} -noabc",
                f"abc -liberty {liberty}",
                "clean -purge",
                "check",
                f"tee -o {stat_report} stat -liberty {liberty}",
                f"write_verilog -noattr -noexpr {mapped_v}",
                f"write_json {mapped_json}",
                "",
            )
        ),
        encoding="utf-8",
    )
    run(["yosys", "-ql", str(out_dir / "synthesis.log"), str(yosys_script)], out_dir)
    area_um2 = parse_area(stat_report.read_text(encoding="utf-8"))
    counts = cell_counts(mapped_json)

    sta_script = out_dir / "sta.tcl"
    sta_script.write_text(
        "\n".join(
            (
                f"read_liberty {liberty}",
                f"read_verilog {mapped_v}",
                f"link_design {TOP}",
                "create_clock -name vclk -period 100.0",
                "set_input_delay 0.0 -clock vclk [all_inputs]",
                "set_input_transition 0.05 [all_inputs]",
                "set_output_delay 0.0 -clock vclk [all_outputs]",
                "set_load 0.01 [all_outputs]",
                "report_checks -path_delay max -format full -fields {slew cap input_pins} -digits 6 -group_path_count 20",
                "exit",
                "",
            )
        ),
        encoding="utf-8",
    )
    sta_log = run(["sta", str(sta_script)], out_dir, out_dir / "sta.log")
    if re.search(r"^(?:% )?Error:", sta_log, re.MULTILINE):
        raise RuntimeError(f"OpenSTA error in {out_dir / 'sta.log'}")
    critical = parse_critical_path(sta_log)
    delay_ns = float(critical["arrivalNs"])
    if delay_ns <= 0:
        raise ValueError(f"non-positive critical path for {out_dir}: {delay_ns}")

    missing_leakage = []
    leakage_mw = 0.0
    calculated_area = 0.0
    missing_area = []
    for cell_type, count in counts.items():
        attributes = cells.get(cell_type)
        if attributes is None or attributes["area"] is None:
            missing_area.append(cell_type)
        else:
            calculated_area += float(attributes["area"]) * count
        if attributes is None or attributes["leakage_mw"] is None:
            missing_leakage.append(cell_type)
        else:
            leakage_mw += float(attributes["leakage_mw"]) * count
    if missing_area:
        raise ValueError(f"mapped cells missing Liberty area: {missing_area}")
    if abs(calculated_area - area_um2) > max(1e-6, area_um2 * 1e-6):
        raise ValueError(f"area cross-check failed: stat={area_um2} parsed={calculated_area}")
    if missing_leakage:
        raise ValueError(f"mapped cells missing Liberty leakage: {missing_leakage}")

    result = {
        "architecture": architecture,
        "designFamily": "core_adders",
        "category": "adders",
        "bitWidth": width,
        "processNode": technology.process_node,
        "canonicalTechnology": technology.canonical,
        "isNamedPdk": True,
        "fmaxMhz": round(1000.0 / delay_ns, 6),
        "powerMw": float(f"{leakage_mw:.12g}"),
        "areaUm2": round(area_um2, 6),
        "flow": {
            "schemaVersion": 1,
            "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
            "technologyUid": technology.uid,
            "pdk": technology.pdk,
            "standardCellLibrary": technology.library_name,
            "corner": technology.corner,
            "libertySha256": sha256(liberty),
            "tools": tools,
            "rtlSimulation": {"status": "pass", "vectors": 128, "log": "rtl-simulation.log"},
            "synthesis": {
                "status": "pass",
                "numCells": sum(counts.values()),
                "numCellsByType": counts,
                "mappedNetlist": "mapped.v",
                "mappedJson": "mapped.json",
                "log": "synthesis.log",
            },
            "sta": {
                "status": "pass",
                "criticalPathDelayNs": delay_ns,
                "fmaxEstimateMhz": round(1000.0 / delay_ns, 6),
                **critical,
                "constraints": {"virtualClockPeriodNs": 100.0, "inputSlewNs": 0.05, "outputLoadPf": 0.01},
                "log": "sta.log",
            },
            "ppa": {
                "areaUm2": round(area_um2, 6),
                "leakagePowerMw": float(f"{leakage_mw:.12g}"),
                "powerMetric": "Liberty static cell leakage sum",
                "missingLeakageCells": [],
            },
            "notes": [
                "Timing is pre-layout combinational OpenSTA using a virtual clock, common input slew, and common output load.",
                "Area is the mapped standard-cell area from the selected Liberty; routing area is not included.",
                "powerMw is static Liberty leakage only; dynamic power requires activity/VCD and physical parasitics.",
            ],
        },
    }
    (out_dir / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(
        f"{technology.process_node:10s} {architecture:24s} w{width:<2d} "
        f"cells={sum(counts.values()):4d} delay={delay_ns:9.6f}ns "
        f"area={area_um2:10.4f}um^2 leakage={leakage_mw:.6g}mW"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--technologies",
        nargs="+",
        choices=(*TECHNOLOGIES.keys(), "all"),
        default=["all"],
    )
    parser.add_argument("--widths", nargs="+", type=int, default=[4, 8, 16, 32])
    parser.add_argument("--architectures", nargs="+", choices=ARCHITECTURES, default=list(ARCHITECTURES))
    args = parser.parse_args()
    if any(width <= 0 for width in args.widths):
        parser.error("widths must be positive")
    selected = list(TECHNOLOGIES) if "all" in args.technologies else args.technologies
    for executable in ("yosys", "sta", "iverilog", "vvp"):
        if shutil.which(executable) is None:
            raise FileNotFoundError(f"required executable not found: {executable}")
    tools = {
        "yosys": tool_version(["yosys", "-V"]),
        "opensta": tool_version(["sta", "-version"]),
        "iverilog": tool_version(["iverilog", "-V"]),
    }
    with tempfile.TemporaryDirectory(prefix="digital-pdk-ppa-") as temp_name:
        temp_dir = Path(temp_name)
        for name in selected:
            technology = TECHNOLOGIES[name]
            source_liberty = materialize_liberty(technology, temp_dir)
            library_dir = STORE / technology.uid / "library"
            library_dir.mkdir(parents=True, exist_ok=True)
            liberty = library_dir / "timing.lib"
            shutil.copyfile(source_liberty, liberty)
            cells, leakage_scale = liberty_cells(liberty)
            if leakage_scale == 0:
                raise ValueError(f"{liberty}: missing leakage_power_unit")
            write_manifest(technology, liberty, tools)
            for architecture in args.architectures:
                for width in args.widths:
                    run_point(technology, liberty, cells, architecture, width, tools)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
