import path from "node:path";
import type { ParameterDefinitionV1, PlannedProcessV1, PlannedStepV1, TechnologyLibraryV1, ToolConfigurationSnapshotV1 } from "../../../../shared/contracts/v1.ts";
import { configuredTool, normalizeParameters } from "../helpers.ts";
import type { PpaFlowId, PpaModuleContext, ParserFlow } from "../types.ts";

export interface PpaFlowAdapter {
  id: PpaFlowId;
  label: string;
  parserFlow: ParserFlow;
  description: string;
  parameters: ParameterDefinitionV1[];
  steps(configuration: ToolConfigurationSnapshotV1, parser: ToolConfigurationSnapshotV1, technology: TechnologyLibraryV1, context: { job: { parameters: Record<string, never>; toolConfigurations: ToolConfigurationSnapshotV1[] } }): PlannedStepV1[];
  generateConfig(parameters: ReturnType<typeof normalizeParameters>, technology: TechnologyLibraryV1, rtlPaths: string[], sdcPath: string | null, macroPaths: Record<string, string[]>): { relativePath: string; contents: string; runDirectory: string };
}

export function parameter(id: string, label: string, description: string, type: ParameterDefinitionV1["type"], required: boolean, defaultValue: ParameterDefinitionV1["defaultValue"], key: string, options: { unit?: string; minimum?: number; maximum?: number; enumValues?: ParameterDefinitionV1["enumValues"]; sweepable?: boolean; version?: string } = {}): ParameterDefinitionV1 {
  return { id, label, description, type, required, defaultValue, unit: options.unit ?? null, minimum: options.minimum ?? null, maximum: options.maximum ?? null, enumValues: options.enumValues ?? [], sweepable: options.sweepable ?? false, toolVersionRange: options.version ?? null, mapping: { kind: "generated-config", key } };
}

export const COMMON_PARAMETERS: ParameterDefinitionV1[] = [
  parameter("designName", "Design name", "Stable run and result name.", "string", true, "", "DESIGN_NAME"),
  parameter("topModule", "Top module", "Verilog top module.", "string", true, "", "DESIGN_NAME"),
  parameter("clockPort", "Clock port", "Clock input used by the backend-generated constraint.", "string", true, "clk", "CLOCK_PORT"),
  parameter("clockPeriodNs", "Clock period", "Target period. Sweep points become independent child plans.", "number", true, 10, "CLOCK_PERIOD", { unit: "ns", minimum: 0.001, maximum: 1_000_000, sweepable: true }),
];

export const INPUT_ROLES = [
  { id: "rtl", label: "RTL/source", description: "Verilog or SystemVerilog source.", required: false, multiple: true, extensions: [".v", ".sv"], recognizedTypes: ["verilog", "systemverilog"] },
  { id: "gate_netlist", label: "Gate-level netlist", description: "Flow-supported synthesized netlist start point.", required: false, multiple: true, extensions: [".v"], recognizedTypes: ["verilog"] },
  { id: "sdc", label: "SDC", description: "Constraint data parsed conservatively; never executed as uploaded Tcl.", required: false, multiple: false, extensions: [".sdc"], recognizedTypes: ["sdc"] },
  { id: "include", label: "Include/header", description: "RTL includes with preserved relative paths.", required: false, multiple: true, extensions: [".v", ".sv", ".vh", ".svh"], recognizedTypes: ["verilog", "systemverilog", "text"] },
  { id: "macro_lib", label: "Macro Liberty", description: "Optional macro timing model.", required: false, multiple: true, extensions: [".lib"], recognizedTypes: ["liberty"] },
  { id: "macro_lef", label: "Macro LEF", description: "Optional macro abstract view.", required: false, multiple: true, extensions: [".lef"], recognizedTypes: ["lef"] },
  { id: "macro_gds", label: "Macro GDS", description: "Optional macro layout view.", required: false, multiple: true, extensions: [".gds"], recognizedTypes: ["gdsii"] },
  { id: "completed_run", label: "Completed run evidence", description: "Native run tree, normalized metrics, final DEF, STA, SPEF and logs.", required: false, multiple: true, extensions: [".json", ".csv", ".def", ".rpt", ".spef", ".log"], recognizedTypes: ["json", "csv", "def", "spef", "text"] },
] as const;

export function process(tool: ToolConfigurationSnapshotV1, argv: string[], cwdRelative = "."): PlannedProcessV1 {
  return { toolConfigurationId: tool.id, executableDisplay: tool.interpreterPath ?? tool.executablePath ?? tool.toolId, argv, cwdRelative, environmentNames: tool.environmentNames, timeoutSeconds: tool.timeoutSeconds };
}

export function step(id: string, name: string, description: string, weight: number, processSpec: PlannedProcessV1 | null, inputRoles: string[], outputRoles: string[]): PlannedStepV1 {
  return { id, name, description, required: true, weight, process: processSpec, inputRoles, outputRoles };
}

export function parserStep(parser: ToolConfigurationSnapshotV1, flow: ParserFlow, runDirectory: string): PlannedStepV1 {
  return step("parse-native", "Parse native final reports", "Run the administrator-configured result_json_ast.py and retain its source provenance.", 8, process(parser, ["run", "--flow", flow, "--include-all", runDirectory]), ["native-run"], ["normalized-ast", "parser-log"]);
}

export function flowConfiguration(context: PpaModuleContext, flow: PpaFlowId): ToolConfigurationSnapshotV1 | null {
  return context.toolBindings?.[flow]?.configuration ?? null;
}

export function requireFlowTool(context: { job: { toolConfigurations: ToolConfigurationSnapshotV1[] } }, flow: PpaFlowId): ToolConfigurationSnapshotV1 { return configuredTool(context, flow); }
export function requireParser(context: { job: { toolConfigurations: ToolConfigurationSnapshotV1[] } }): ToolConfigurationSnapshotV1 { return configuredTool(context, "ppa-result-parser"); }
export function rootFile(configuration: ToolConfigurationSnapshotV1, relative: string): string {
  if (!configuration.rootPath || !path.isAbsolute(configuration.rootPath)) throw new Error(`${configuration.toolId} requires an absolute administrator-owned rootPath`);
  return path.join(configuration.rootPath, ...relative.split("/"));
}
