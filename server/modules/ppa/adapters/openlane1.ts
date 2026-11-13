import type { PpaFlowAdapter } from "./base.ts";
import { COMMON_PARAMETERS, parameter, parserStep, process, step } from "./base.ts";

function tcl(value: string): string { if (/[\r\n\0]/.test(value)) throw new Error("unsafe generated Tcl value"); return `{${value.replaceAll("}", "\\}")}}`; }

export const openLane1Adapter: PpaFlowAdapter = {
  id: "openlane1", label: "OpenLane 1", parserFlow: "openlane",
  description: "OpenLane 1 monolithic flow using an administrator-configured flow.tcl and an adapter-generated config.tcl. It is unavailable on this host until its runtime/container health probe succeeds.",
  parameters: [...COMMON_PARAMETERS,
    parameter("coreUtilization", "Core utilization", "OpenLane FP_CORE_UTIL percentage.", "number", false, 50, "FP_CORE_UTIL", { unit: "%", minimum: 1, maximum: 95, sweepable: true, version: "OpenLane 1.0.x" }),
    parameter("placementDensity", "Placement density", "OpenLane PL_TARGET_DENSITY fraction.", "number", false, 0.6, "PL_TARGET_DENSITY", { minimum: 0.05, maximum: 0.99, sweepable: true, version: "OpenLane 1.0.x" }),
  ],
  steps(configuration, parser) { return [
    step("validate-input", "Validate OpenLane source", "Validate source, constraints, macros and registered PDK/SCL mapping.", 5, null, ["rtl", "gate_netlist", "sdc", "include", "macro_lib", "macro_lef", "macro_gds"], []),
    step("prepare-config", "Generate OpenLane design configuration", "Generate an allowlisted config.tcl; uploaded Tcl is never sourced.", 5, null, ["rtl", "sdc", "macro_lib", "macro_lef", "macro_gds"], ["generated-config"]),
    step("openlane-flow", "Run OpenLane RTL-to-GDS flow", "Execute the real OpenLane 1 flow, whose native phases and logs remain visible in the run tree.", 78, process(configuration, ["-design", "work/openlane-design", "-tag", "run", "-overwrite"]), ["generated-config", "rtl"], ["native-run"]),
    parserStep(parser, "openlane", "work/openlane-design/runs/run"),
    step("normalize", "Validate normalized PPA result", "Validate parser schema and provenance.", 2, null, ["normalized-ast"], ["normalized-result"]),
    step("publish", "Publish atomically", "Publish only a complete validated run.", 2, null, ["normalized-result"], ["ppa-result"]),
  ]; },
  generateConfig(parameters, technology, rtlPaths, sdcPath, macros) {
    const entries: Array<[string, string | number]> = [
      ["DESIGN_NAME", parameters.topModule], ["VERILOG_FILES", rtlPaths.join(" ")], ["CLOCK_PORT", parameters.clockPort], ["CLOCK_PERIOD", parameters.clockPeriodNs],
      ["PDK", technology.pdk], ["STD_CELL_LIBRARY", technology.standardCellLibrary],
    ];
    if (sdcPath) entries.push(["BASE_SDC_FILE", sdcPath]);
    if (parameters.coreUtilization !== undefined) entries.push(["FP_CORE_UTIL", parameters.coreUtilization]);
    if (parameters.placementDensity !== undefined) entries.push(["PL_TARGET_DENSITY", parameters.placementDensity]);
    if (macros.macro_lib.length) entries.push(["EXTRA_LIBS", macros.macro_lib.join(" ")]);
    if (macros.macro_lef.length) entries.push(["EXTRA_LEFS", macros.macro_lef.join(" ")]);
    if (macros.macro_gds.length) entries.push(["EXTRA_GDS_FILES", macros.macro_gds.join(" ")]);
    return { relativePath: "work/openlane-design/config.tcl", contents: `${entries.map(([key, value]) => `set ::env(${key}) ${typeof value === "number" ? value : tcl(value)}`).join("\n")}\n`, runDirectory: "work/openlane-design/runs/run" };
  },
};
