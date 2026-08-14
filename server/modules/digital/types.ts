import type {
  InputFileV1,
  JsonObject,
  ModuleContextV1,
  StepExecutionContextV1,
  TechnologyLibraryV1,
  ToolConfigurationSnapshotV1,
  ToolHealthStatus,
} from "../../../shared/contracts/v1.js";

export const DIGITAL_ADAPTER_ID = "digital-yosys-opensta-v1";
export const DIGITAL_CAPABILITY_VERSION = "digital.workflow.v1";
export const DIGITAL_RESULT_DATA_VERSION = "digital.result-data.v1";
export const DIGITAL_PARSER_ID = "digital-result-normalizer";
export const DIGITAL_PARSER_VERSION = "1.0.0";

export type DigitalOperation = "run" | "import";

export type DigitalInputRole =
  | "rtl"
  | "gate_netlist"
  | "yosys_json"
  | "liberty"
  | "sdc"
  | "testbench"
  | "include"
  | "completed_result";

export interface DigitalInputMapping {
  rtl: InputFileV1[];
  gateNetlists: InputFileV1[];
  yosysJson: InputFileV1[];
  liberty: InputFileV1[];
  sdc: InputFileV1[];
  testbench: InputFileV1[];
  includes: InputFileV1[];
  completedResults: InputFileV1[];
  unassigned: InputFileV1[];
}

export interface DigitalRunParameters {
  design: string;
  category: string;
  architecture: string;
  topModule: string;
  processTechnology: string;
  bitWidth: number | null;
  library: string;
  corner: string;
  clockPort: string | null;
  clockPeriodNs: number | null;
  inputSlewNs: number | null;
  outputLoadPf: number | null;
  simulationTop: string | null;
}

export interface DigitalToolBinding {
  configuration: ToolConfigurationSnapshotV1;
  health: ToolHealthStatus;
  version?: string | null;
  selfTestPassed?: boolean | null;
  environment: Record<string, string>;
}

/** Runtime additions supplied by the shared tool registry without changing the frozen contract. */
export interface DigitalModuleBindings {
  toolBindings?: Record<string, DigitalToolBinding>;
  technologies?: TechnologyLibraryV1[];
}

export type DigitalModuleContext = ModuleContextV1 & DigitalModuleBindings;
export type DigitalExecutionContext = StepExecutionContextV1 & DigitalModuleBindings;

export interface DigitalPowerData extends JsonObject {
  metric: "static_liberty_leakage" | "reported_dynamic" | "reported_total" | "reported_unspecified" | "unavailable";
  staticLeakageMw: number | null;
  estimatedDynamicMw: number | null;
  totalPowerMw: number | null;
  reportedMw: number | null;
  source: string;
  caveat: string;
}

export interface DigitalResultData extends JsonObject {
  schemaVersion: typeof DIGITAL_RESULT_DATA_VERSION;
  design: JsonObject;
  metrics: JsonObject;
  timing: JsonObject;
  synthesis: JsonObject;
  simulation: JsonObject;
  power: DigitalPowerData;
  warnings: string[];
}

export interface DigitalNormalizedRow {
  architecture: string;
  category: string;
  design: string;
  topModule: string;
  bitWidth: number | null;
  processTechnology: string;
  library: string;
  corner: string;
  fmaxMhz: number | null;
  areaUm2: number | null;
  setupWnsNs: number | null;
  holdWnsNs: number | null;
  setupTnsNs: number | null;
  holdTnsNs: number | null;
  cellCount: number | null;
  cellUsage: Record<string, number>;
  power: DigitalPowerData;
  simulationExecuted: boolean;
  simulationPassed: boolean | null;
  warnings: string[];
}

export const DIGITAL_TOOL_IDS = ["yosys", "opensta", "iverilog", "vvp"] as const;
export type DigitalToolId = (typeof DIGITAL_TOOL_IDS)[number];
