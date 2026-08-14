import type { ParameterDefinitionV1, ToolCapabilityV1, ToolHealthStatus } from "../../../shared/contracts/v1.js";
import { CAPABILITY_SCHEMA_VERSION } from "../../../shared/contracts/v1.js";
import type { DigitalModuleContext, DigitalToolId } from "./types.js";
import { DIGITAL_CAPABILITY_VERSION } from "./types.js";

function health(context: DigitalModuleContext, toolId: DigitalToolId): { status: ToolHealthStatus; reason: string | null; version: string | null } {
  const binding = context.toolBindings?.[toolId];
  if (!binding) return { status: "not_configured", reason: "No administrator-owned tool configuration and successful health probe are available.", version: null };
  if (!binding.configuration.enabled) return { status: "unavailable", reason: "The administrator disabled this tool configuration.", version: null };
  if (!binding.configuration.executablePath) return { status: "not_configured", reason: "Executable path is not configured.", version: null };
  return { status: binding.health, reason: binding.health === "healthy" ? null : `Latest health check: ${binding.health}.`, version: null };
}

function parameter(
  id: string,
  label: string,
  description: string,
  type: ParameterDefinitionV1["type"],
  required: boolean,
  defaultValue: ParameterDefinitionV1["defaultValue"],
  mappingKey = id,
  unit: string | null = null,
  minimum: number | null = null,
  maximum: number | null = null,
): ParameterDefinitionV1 {
  return {
    id, label, description, type, unit, required, defaultValue, minimum, maximum,
    enumValues: [], sweepable: false, toolVersionRange: null,
    mapping: { kind: "generated-config", key: mappingKey },
  };
}

const METADATA_PARAMETERS: ParameterDefinitionV1[] = [
  parameter("design", "Design", "Stable experiment/design name.", "string", true, ""),
  parameter("category", "Category", "Chart category, for example adders or voter.", "string", true, ""),
  parameter("architecture", "Architecture", "Architecture or implementation variant being compared.", "string", true, ""),
  parameter("topModule", "Top module", "Verilog top resolved by Yosys and OpenSTA.", "string", true, ""),
  parameter("processTechnology", "Process / technology", "Technology label stored with the normalized result.", "string", true, ""),
  parameter("bitWidth", "Width", "Optional experiment width or equivalent numeric variable.", "integer", false, null, "bitWidth", null, 1, 1048576),
  parameter("library", "Library", "Standard-cell library name.", "string", true, ""),
  parameter("corner", "Corner", "Liberty timing corner.", "string", true, ""),
];

const TIMING_PARAMETERS: ParameterDefinitionV1[] = [
  parameter("clockPort", "Clock port", "Optional real clock port. Leave blank to create a virtual clock.", "string", false, null),
  parameter("clockPeriodNs", "Clock period", "Required when no SDC is uploaded.", "number", false, null, "create_clock.period", "ns", 0.000001, 1e9),
  parameter("inputSlewNs", "Input slew", "Optional generated pre-layout input transition.", "number", false, null, "set_input_transition", "ns", 0.000001, 1e6),
  parameter("outputLoadPf", "Output load", "Optional generated output capacitive load.", "number", false, null, "set_load", "pF", 0, 1e9),
];

function baseCapability(
  context: DigitalModuleContext,
  toolId: DigitalToolId,
  label: string,
  description: string,
  operations: string[],
  parameters: ParameterDefinitionV1[],
): ToolCapabilityV1 {
  const state = health(context, toolId);
  return {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    capabilityVersion: DIGITAL_CAPABILITY_VERSION,
    toolId,
    moduleId: "digital",
    label,
    description,
    health: state.status,
    healthReason: state.reason,
    toolVersion: state.version,
    operations,
    inputRoles: [],
    parameters,
    plannedStepTemplates: [],
    limits: { shell: false, arbitraryScripts: false },
  };
}

export function digitalCapabilities(context: DigitalModuleContext): ToolCapabilityV1[] {
  const yosys = baseCapability(
    context,
    "yosys",
    "Yosys synthesis and mapping",
    "Reads RTL, gate-level Verilog, or Yosys JSON; resolves top hierarchy, maps against one registered/uploaded Liberty, and reports mapped-cell area.",
    ["hierarchy", "synthesis", "technology-mapping", "mapped-area"],
    [...METADATA_PARAMETERS],
  );
  yosys.inputRoles = [
    { id: "rtl", label: "RTL/source", description: "Verilog or supported SystemVerilog source.", required: false, multiple: true, extensions: [".v", ".sv"], recognizedTypes: ["verilog", "systemverilog"] },
    { id: "gate_netlist", label: "Gate-level netlist", description: "Previously synthesized Verilog start point.", required: false, multiple: true, extensions: [".v"], recognizedTypes: ["verilog-netlist"] },
    { id: "yosys_json", label: "Yosys JSON", description: "Yosys design JSON start point.", required: false, multiple: false, extensions: [".json"], recognizedTypes: ["yosys-json"] },
    { id: "liberty", label: "Liberty", description: "Uploaded Liberty; mutually exclusive with registered technology selection.", required: false, multiple: false, extensions: [".lib"], recognizedTypes: ["liberty"] },
    { id: "include", label: "Include/header", description: "Verilog include/header files; relative paths are retained.", required: false, multiple: true, extensions: [".v", ".sv", ".vh", ".svh"], recognizedTypes: ["verilog-include"] },
  ];

  const opensta = baseCapability(
    context,
    "opensta",
    "OpenSTA pre-layout timing",
    "Reads the mapped netlist and selected Liberty, then applies uploaded SDC or an adapter-generated clock/slew/load constraint file.",
    ["pre-layout-sta"],
    TIMING_PARAMETERS,
  );
  opensta.inputRoles = [
    { id: "sdc", label: "SDC", description: "Optional user constraint data read by OpenSTA. Uploaded Tcl is never executed.", required: false, multiple: false, extensions: [".sdc"], recognizedTypes: ["sdc"] },
  ];

  const iverilog = baseCapability(
    context,
    "iverilog",
    "Icarus Verilog compile",
    "Optional RTL/testbench compilation with a fixed SystemVerilog-2012 argv contract.",
    ["rtl-simulation-compile"],
    [parameter("simulationTop", "Simulation top", "Testbench top module passed to Icarus.", "string", false, null, "-s")],
  );
  iverilog.inputRoles = [
    { id: "testbench", label: "Testbench", description: "Optional Verilog/SystemVerilog testbench.", required: false, multiple: true, extensions: [".v", ".sv"], recognizedTypes: ["verilog-testbench"] },
  ];

  return [
    yosys,
    opensta,
    iverilog,
    baseCapability(context, "vvp", "VVP simulation runtime", "Runs only the compiled simulation image generated by Icarus.", ["rtl-simulation-run"], []),
  ];
}
