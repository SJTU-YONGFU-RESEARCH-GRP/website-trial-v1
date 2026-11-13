import type { PpaFlowAdapter } from "./base.ts";
import { COMMON_PARAMETERS, parameter, parserStep, process, rootFile, step } from "./base.ts";

function makeValue(value: string): string { if (/[\r\n#:=]/.test(value)) throw new Error("unsafe generated Make value"); return value.replaceAll("$", "$$"); }

export const openRoadOrfsAdapter: PpaFlowAdapter = {
  id: "openroad-orfs", label: "OpenROAD ORFS", parserFlow: "openroad",
  description: "OpenROAD-flow-scripts executed through GNU Make with an adapter-generated DESIGN_CONFIG; uploaded Tcl, Make and Python are never executed.",
  parameters: [...COMMON_PARAMETERS,
    parameter("coreUtilization", "Core utilization", "ORFS CORE_UTILIZATION percentage.", "number", false, 40, "CORE_UTILIZATION", { unit: "%", minimum: 1, maximum: 95, sweepable: true, version: "ORFS 2024+" }),
    parameter("placementDensity", "Placement density", "ORFS PLACE_DENSITY fraction.", "number", false, 0.6, "PLACE_DENSITY", { minimum: 0.05, maximum: 0.99, sweepable: true, version: "ORFS 2024+" }),
    parameter("threads", "Threads", "GNU Make/OpenROAD worker limit.", "integer", false, 4, "NUM_CORES", { minimum: 1, maximum: 256, version: "ORFS 2024+" }),
  ],
  steps(configuration, parser, _technology) {
    const makefile = rootFile(configuration, "flow/Makefile");
    const base = ["-f", makefile, "DESIGN_CONFIG=work/orfs-config.mk", "WORK_HOME=work/orfs-home"];
    return [
      step("validate-input", "Validate source and technology", "Validate RTL/gate mapping, SDC data, macros, hashes and registered ORFS technology.", 3, null, ["rtl", "gate_netlist", "sdc", "include", "macro_lib", "macro_lef", "macro_gds"], []),
      step("prepare-config", "Generate ORFS design configuration", "Generate an allowlisted Make fragment inside this job; uploaded Make/Tcl/Python is evidence-only.", 3, null, ["rtl", "sdc", "macro_lib", "macro_lef", "macro_gds"], ["generated-config"]),
      step("synthesize", "ORFS synthesis", "Run the real ORFS synth target.", 15, process(configuration, [...base, "synth"]), ["generated-config", "rtl"], ["synth-results"]),
      step("floorplan", "ORFS floorplan", "Run the real ORFS floorplan target.", 11, process(configuration, [...base, "floorplan"]), ["synth-results"], ["floorplan-results"]),
      step("placement", "ORFS placement", "Run the real ORFS place target.", 14, process(configuration, [...base, "place"]), ["floorplan-results"], ["placement-results"]),
      step("cts", "ORFS clock-tree synthesis", "Run the real ORFS cts target.", 12, process(configuration, [...base, "cts"]), ["placement-results"], ["cts-results"]),
      step("routing", "ORFS routing", "Run the real ORFS route target.", 20, process(configuration, [...base, "route"]), ["cts-results"], ["routing-results"]),
      step("signoff", "ORFS final reports and signoff", "Run the real ORFS finish target to produce final timing, power, metrics and layout evidence.", 12, process(configuration, [...base, "finish"]), ["routing-results"], ["native-run"]),
      step("orfs-metadata", "Generate ORFS native metrics", "Run ORFS metadata-generate over the completed native logs/results.", 5, process(configuration, [...base, "metadata-generate"]), ["native-run"], ["orfs-metadata"]),
      step("package-native", "Package parser input", "Map audited ORFS finish metrics into the parser's OpenROAD final-report schema without inventing missing signoff data.", 3, null, ["orfs-metadata"], ["parser-input"]),
      parserStep(parser, "openroad", "work/orfs-run"),
      step("normalize", "Validate normalized PPA result", "Validate parser schema and metric provenance before publication.", 1, null, ["normalized-ast"], ["normalized-result"]),
      step("publish", "Publish atomically", "Declare final artifacts only after successful parser validation.", 1, null, ["normalized-result"], ["ppa-result"]),
    ];
  },
  generateConfig(parameters, technology, rtlPaths, sdcPath, macros) {
    const lines = [
      `export DESIGN_NAME = ${makeValue(parameters.topModule)}`,
      `export DESIGN_NICKNAME = ${makeValue(parameters.designName)}`,
      `export PLATFORM = ${makeValue(technology.technologyId)}`,
      "export FLOW_VARIANT = base",
      `export VERILOG_FILES = ${rtlPaths.map(makeValue).join(" ")}`,
      `export CLOCK_PORT = ${makeValue(parameters.clockPort)}`,
      `export CLOCK_PERIOD = ${parameters.clockPeriodNs}`,
      "export RESULTS_DIR = work/orfs-run/orfs/results",
      "export REPORTS_DIR = work/orfs-run/orfs/reports",
      "export LOG_DIR = work/orfs-run/orfs/logs",
      "export OBJECTS_DIR = work/orfs-run/orfs/objects",
    ];
    if (sdcPath) lines.push(`export SDC_FILE = ${makeValue(sdcPath)}`);
    if (parameters.coreUtilization !== undefined) lines.push(`export CORE_UTILIZATION = ${parameters.coreUtilization}`);
    if (parameters.placementDensity !== undefined) lines.push(`export PLACE_DENSITY = ${parameters.placementDensity}`);
    if (parameters.threads !== undefined) lines.push(`export NUM_CORES = ${parameters.threads}`);
    if (macros.macro_lib.length) lines.push(`export ADDITIONAL_LIBS = ${macros.macro_lib.map(makeValue).join(" ")}`);
    if (macros.macro_lef.length) lines.push(`export ADDITIONAL_LEFS = ${macros.macro_lef.map(makeValue).join(" ")}`);
    if (macros.macro_gds.length) lines.push(`export ADDITIONAL_GDS = ${macros.macro_gds.map(makeValue).join(" ")}`);
    return { relativePath: "work/orfs-config.mk", contents: `${lines.join("\n")}\n`, runDirectory: "work/orfs-run" };
  },
};
