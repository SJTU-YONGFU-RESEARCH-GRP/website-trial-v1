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
