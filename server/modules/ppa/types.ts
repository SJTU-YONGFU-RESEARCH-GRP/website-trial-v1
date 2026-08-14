import type {
  JsonObject,
  ModuleContextV1,
  StepExecutionContextV1,
  TechnologyLibraryV1,
  ToolConfigurationSnapshotV1,
  ToolHealthStatus,
} from "../../../shared/contracts/v1.ts";

export const PPA_CAPABILITY_VERSION = "ppa.workflow.v1";
export const PPA_RESULT_DATA_VERSION = "ppa.result-data.v1";
export const PPA_PARSER_ID = "result-json-ast";
export const PPA_PARSER_VERSION = "1.0.0";
export const PPA_FLOW_IDS = ["openroad-orfs", "openlane1", "librelane"] as const;
export type PpaFlowId = (typeof PPA_FLOW_IDS)[number];
export type ParserFlow = "openroad" | "openlane" | "librelane";

export interface PpaToolBinding {
  configuration: ToolConfigurationSnapshotV1;
  health: ToolHealthStatus;
  environment: Record<string, string>;
  version?: string | null;
}

export interface PpaRuntimeBindings {
  toolBindings?: Record<string, PpaToolBinding>;
  toolHealth?: Record<string, { status: ToolHealthStatus; version: string | null } | null>;
  technologies?: TechnologyLibraryV1[];
  maxSweepJobs?: number;
  runPlannedProcess?: () => Promise<{ exitCode: number; timedOut?: boolean; outputLimitExceeded?: boolean }>;
}

export type PpaModuleContext = ModuleContextV1 & PpaRuntimeBindings;
export type PpaExecutionContext = StepExecutionContextV1 & PpaRuntimeBindings;

export interface PpaRunParameters {
  flow: PpaFlowId;
  designName: string;
  topModule: string;
  clockPort: string;
  clockPeriodNs: number;
  technologyLibraryId: string | null;
  coreUtilization?: number;
  placementDensity?: number;
  threads?: number;
  sweep?: JsonObject;
  sweepPoint?: JsonObject;
}

export interface PpaParsedData extends JsonObject {
  schemaVersion: typeof PPA_RESULT_DATA_VERSION;
  flow: PpaFlowId;
  parserFlow: ParserFlow;
  normalized: JsonObject;
  evidence: JsonObject;
}
