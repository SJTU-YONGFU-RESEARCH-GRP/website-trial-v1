import type { PpaFlowAdapter } from "./base.ts";
import { COMMON_PARAMETERS, parameter, parserStep, process, step } from "./base.ts";

export const libreLaneAdapter: PpaFlowAdapter = {
  id: "librelane", label: "LibreLane", parserFlow: "librelane",
  description: "LibreLane CLI using an administrator-configured executable and an adapter-generated JSON design config. It remains Not configured until a real environment or container is healthy.",
  parameters: [...COMMON_PARAMETERS,
    parameter("coreUtilization", "Core utilization", "LibreLane FP_CORE_UTIL percentage.", "number", false, 50, "FP_CORE_UTIL", { unit: "%", minimum: 1, maximum: 95, sweepable: true, version: ">=2.4,<3" }),
    parameter("placementDensity", "Placement density", "LibreLane PL_TARGET_DENSITY fraction.", "number", false, 0.6, "PL_TARGET_DENSITY", { minimum: 0.05, maximum: 0.99, sweepable: true, version: ">=2.4,<3" }),
  ],
  steps(configuration, parser, technology) { return [
    step("validate-input", "Validate LibreLane source", "Validate input mappings and the registered PDK/SCL compatibility.", 5, null, ["rtl", "gate_netlist", "sdc", "include", "macro_lib", "macro_lef", "macro_gds"], []),
    step("prepare-config", "Generate LibreLane JSON configuration", "Generate a strict allowlisted JSON config; uploaded Python/Tcl/config is never executed.", 5, null, ["rtl", "sdc", "macro_lib", "macro_lef", "macro_gds"], ["generated-config"]),
    step("librelane-flow", "Run LibreLane SequentialFlow", "Execute the real LibreLane flow and retain per-step states and logs.", 78, process(configuration, ["--pdk", technology.pdk, "--scl", technology.standardCellLibrary, "--run-tag", "run", "--overwrite", "work/librelane-config.json"]), ["generated-config", "rtl"], ["native-run"]),
    parserStep(parser, "librelane", "work/runs/run"),
    step("normalize", "Validate normalized PPA result", "Validate parser schema and provenance.", 2, null, ["normalized-ast"], ["normalized-result"]),
    step("publish", "Publish atomically", "Publish only a complete validated run.", 2, null, ["normalized-result"], ["ppa-result"]),
  ]; },
  generateConfig(parameters, technology, rtlPaths, sdcPath, macros) {
    const config: Record<string, unknown> = { DESIGN_NAME: parameters.topModule, VERILOG_FILES: rtlPaths, CLOCK_PORT: parameters.clockPort, CLOCK_PERIOD: parameters.clockPeriodNs, PDK: technology.pdk, STD_CELL_LIBRARY: technology.standardCellLibrary };
    if (sdcPath) config.SDC_FILE = sdcPath;
    if (parameters.coreUtilization !== undefined) config.FP_CORE_UTIL = parameters.coreUtilization;
    if (parameters.placementDensity !== undefined) config.PL_TARGET_DENSITY = parameters.placementDensity;
    if (macros.macro_lib.length) config.EXTRA_LIBS = macros.macro_lib;
    if (macros.macro_lef.length) config.EXTRA_LEFS = macros.macro_lef;
    if (macros.macro_gds.length) config.EXTRA_GDS_FILES = macros.macro_gds;
    return { relativePath: "work/librelane-config.json", contents: `${JSON.stringify(config, null, 2)}\n`, runDirectory: "work/runs/run" };
  },
};
