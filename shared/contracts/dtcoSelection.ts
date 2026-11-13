import type { ArtifactRecordV1, JobRecordV1, JsonObject } from "./v1.ts";

export type SelectionFamily = "INV" | "NAND" | "NOR" | "AND" | "DFF";
export interface SelectionInstance {
  id: string; family: SelectionFamily; inputs: string[]; output: string;
  allowedDrives: number[]; initialDrive: number; locked?: boolean;
}
export interface SelectionRequest {
  schemaVersion: "dtco.cell-selection.request.v1";
  name: string; libraryId: string; objective: "area" | "performance" | "balanced";
  circuit: { name: string; inputs: string[]; outputs: string[]; clock: string | null; instances: SelectionInstance[] };
  constraints: { clockPeriodNs: number; inputDelayNs: number; outputDelayNs: number; inputSlewNs: number; outputLoadPf: number; clockUncertaintyNs: number; holdUncertaintyNs: number };
  maxEvaluations: number;
}
export interface SelectionPhysicalEvidence {
  status: "succeeded" | "failed";
  scope: string;
  sourceNetlistSha256: string;
  artifacts: { gdsPath: string; defPath: string; previewPath?: string; routeReportPath: string; validationPath: string; [key: string]: string | undefined };
  checks: JsonObject;
  assignment?: Record<string, number>;
  sourceConstraintsSha256?: string;
  hashes: Record<string, string>;
}
export interface SelectionCompleteness {
  status: "complete" | "timing-only" | "pending" | "failed";
  missingStages: string[];
  sourceJobId?: string;
  sourceResultId?: string;
}
export interface SelectionEvaluation {
  id: string; index: number; assignment: Record<string, number>; cells: Record<string, string>;
  areaUm2: number; pathDelayNs: number | null; setupSlackNs: number | null; holdSlackNs: number | null;
  maxSlackNs?: number | null; minSlackNs?: number | null; timingKind?: "combinational" | "sequential";
  feasible: boolean; status: string; reason: string | null;
  artifacts: Record<string, string>;
  physical?: SelectionPhysicalEvidence;
}
export interface SelectionResult {
  schemaVersion: "dtco.cell-selection.result.v1" | "dtco.cell-selection.result.v2";
  completeness?: SelectionCompleteness;
  status: "ok" | "no_feasible_candidate" | "inconclusive"; bestEvaluationId: string | null; baselineEvaluationId: string;
  evaluations: SelectionEvaluation[];
  search: { method: string; spaceSize: number | string; evaluated: number; termination: string };
  library: { id: string; sha256: string; corner: string; units: Record<string, unknown>; cells: unknown };
  scope: string; limitations: string[]; request: SelectionRequest;
}
export interface SelectionOptions {
  available: boolean; reason: string | null;
  libraries: Array<{ id: string; label: string; sha256: string }>;
  examples: Array<{ id: string; label: string; request: SelectionRequest }>;
  defaults: SelectionRequest;
}
export interface SelectionRun { job: JobRecordV1; result: SelectionResult | null; artifacts: ArtifactRecordV1[]; completeness?: SelectionCompleteness; }
export type DtcoSelectionRequest = SelectionRequest;
export type DtcoSelectionResult = SelectionResult;
export type DtcoSelectionOptions = SelectionOptions;
export type DtcoSelectionRun = SelectionRun;
