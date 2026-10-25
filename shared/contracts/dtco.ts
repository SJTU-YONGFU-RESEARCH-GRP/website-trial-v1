import type { JobStatus, JsonObject, StructuredJobErrorV1 } from "./v1.ts";

/** Schematic transient electrical measurements plus independently generated layout area. */
export interface DtcoExperimentDefinition {
  name: string;
  circuitId: string;
  technologyId: string;
  modelVersion: string;
  temperaturesC: number[];
  voltagesV: number[];
  layoutIds: string[];
  loadFf: number;
  inputSlewPs: number;
  periodNs: number;
  design?: DtcoDesign;
  electricalMode?: "schematic" | "extracted";
}
export interface DtcoPointCoordinates { temperatureC: number; voltageV: number; layoutId: string; }
export interface DtcoOption { id: string; label: string; available: boolean; reason: string | null; }
export interface DtcoModelOption extends DtcoOption { technologyId: string; sourceHash: string; }
export interface DtcoOptions {
  ownerId?: string;
  publicRunner?: boolean;
  circuits: DtcoOption[];
  technologies: DtcoOption[];
  models: DtcoModelOption[];
  layouts: DtcoOption[];
  available: boolean;
  unavailableReason: string | null;
  tools: Array<{ id: string; available: boolean; version: string | null; reason: string | null }>;
  defaults: DtcoExperimentDefinition;
  maxPoints: number;
  environmentHash: string;
  metricScope: string;
  optimization?: DtcoOptimizationOptions;
  designBounds?: { nmosWidthUm: { min: number; max: number; step: number }; pmosWidthUm: { min: number; max: number; step: number } };
  electricalModes?: DtcoOption[];
}
export type DtcoPointStatus = "unsubmitted" | "preparing" | "preparation_failed" | JobStatus;
export interface DtcoAttempt {
  id: string;
  number: number;
  jobId: string;
  resultId: string | null;
  status: DtcoPointStatus;
  progress: number;
  currentStepId: string | null;
  error: StructuredJobErrorV1 | null;
  metrics: JsonObject | null;
  createdAt: string;
  updatedAt: string;
}
export interface DtcoPoint extends DtcoPointCoordinates {
  id: string;
  revision: number;
  key: string;
  status: DtcoPointStatus;
  progress: number;
  currentStepId: string | null;
  jobId: string | null;
  resultId: string | null;
  error: StructuredJobErrorV1 | null;
  metrics: JsonObject | null;
  attempts: DtcoAttempt[];
}
export interface DtcoRevision {
  revision: number;
  definition: DtcoExperimentDefinition;
  environmentHash: string;
  createdAt: string;
  points: DtcoPoint[];
}
export interface DtcoExperiment {
  id: string;
  ownerId: string;
  revision: number;
  definition: DtcoExperimentDefinition;
  createdAt: string;
  updatedAt: string;
  points: DtcoPoint[];
  revisions: DtcoRevision[];
}
export interface DtcoSubmitResponse {
  experiment: DtcoExperiment;
  submitted: string[];
  skipped: string[];
  failed: Array<{ pointId: string; message: string }>;
}

/** Fixed channel length is 0.28 um. Widths are applied to generated layout and SPICE. */
export interface DtcoDesign { nmosWidthUm: number; pmosWidthUm: number; }
export interface DtcoOptimizationAxis { min: number; max: number; initial: number; step: number; }
export type DtcoObjectiveMetric = "delayPs" | "averagePowerW" | "areaUm2" | "balanced";
export interface DtcoOptimizationDefinition {
  name: string;
  circuitId: string;
  technologyId: string;
  modelVersion: string;
  temperatureC: number;
  voltageV: number;
  layoutIds: string[];
  loadFf: number;
  inputSlewPs: number;
  periodNs: number;
  axes: { nmosWidthUm: DtcoOptimizationAxis; pmosWidthUm: DtcoOptimizationAxis };
  objective: { metric: DtcoObjectiveMetric; weights?: { delay: number; power: number; area: number }; target?: number };
  maxIterations: number;
  minRelativeImprovement: number;
  patience: number;
}
export interface DtcoOptimizationOptions {
  available: boolean;
  reason: string | null;
  defaults: DtcoOptimizationDefinition;
  widthGridUm: number;
  bounds: { nmosWidthUm: { min: number; max: number }; pmosWidthUm: { min: number; max: number } };
  layoutIds: string[];
  maxIterations: number;
}

export interface DtcoMeasuredMetrics { delayPs: number; averagePowerW: number; areaUm2: number; }
export interface DtcoOptimizationCandidate { design: DtcoDesign; layoutId: string; }
export type DtcoOptimizationStatus = "draft" | "running" | "stopping" | "paused" | "completed" | "cancelled";
export type DtcoOptimizationStopReason = "max_iterations" | "patience" | "target_reached" | "search_exhausted" | "user_stopped" | "execution_failed" | "environment_changed" | null;
export interface DtcoOptimizationIteration {
  id: string;
  number: number;
  revision: number;
  pointId: string;
  candidate: DtcoOptimizationCandidate;
  baseIterationId: string | null;
  rationale: string;
  status: DtcoPointStatus;
  progress: number;
  jobId: string | null;
  resultId: string | null;
  attemptId: string | null;
  metrics: DtcoMeasuredMetrics | null;
  score: number | null;
  relativeImprovement: number | null;
  accepted: boolean | null;
  significantImprovement: boolean | null;
  feasible: boolean | null;
  provenance: JsonObject | null;
  error: StructuredJobErrorV1 | null;
  createdAt: string;
  evaluatedAt: string | null;
  attempts: DtcoAttempt[];
}

export interface DtcoOptimization {
  id: string;
  ownerId: string;
  version: number;
  status: DtcoOptimizationStatus;
  allowedActions: Array<"start" | "stop" | "resume">;
  definition: DtcoOptimizationDefinition;
  experimentId: string;
  environmentHash: string;
  bestIterationId: string | null;
  bestScore: number | null;
  stopReason: DtcoOptimizationStopReason;
  iterations: DtcoOptimizationIteration[];
  createdAt: string;
  updatedAt: string;
}
export interface DtcoOptimizationCreateRequest { clientRequestId: string; definition: DtcoOptimizationDefinition; }
export interface DtcoOptimizationResumeRequest { iterationId: string; attemptId: string; }
