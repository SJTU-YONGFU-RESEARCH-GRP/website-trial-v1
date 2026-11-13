import type { JobStatus, JsonObject, StructuredJobErrorV1 } from "./v1.ts";
import type { DtcoPipelineRunSummary } from "./dtcoPipeline.ts";

export type DtcoProcessCorner = "tt" | "ss" | "ff" | "fs" | "sf";
export type DtcoElectricalMode = "schematic" | "extracted";
export interface DtcoNumericBounds { min: number; max: number; step?: number; }
export interface DtcoDimensionOverride { widthUm?: number; lengthUm?: number; lockWidth?: boolean; lockLength?: boolean; }
export interface DtcoSource { kind: "builtin" | "standard-cell"; id: string; sha256: string; }
export interface DtcoDeviceFamilyProfile {
  id: string; polarity: "nmos" | "pmos"; modelName: string;
  widthUm: DtcoNumericBounds; lengthUm: DtcoNumericBounds;
  pdkBounds?: { widthUm: DtcoNumericBounds; lengthUm: DtcoNumericBounds };
  toolBounds?: { widthUm?: DtcoNumericBounds; lengthUm?: DtcoNumericBounds };
  dimensionBins?: Array<{ widthUm: DtcoNumericBounds; lengthUm: DtcoNumericBounds }>;
  boundsProvenance?: { kind: "model-bin-intersection"; sourceId: string; sourceHash: string; ruleSources: Array<{id:string;sha256:string}>; caveat:string };
}
export interface DtcoTechnologyProfile extends DtcoOption {
  modelIds: string[]; deviceFamilies: DtcoDeviceFamilyProfile[];
  operatingBounds: { supplyVoltageV: DtcoNumericBounds; temperatureC: DtcoNumericBounds; groundVoltageV?: DtcoNumericBounds };
}
export interface DtcoModelProfile extends DtcoModelOption {
  modelId: string; deviceFamilyIds: string[]; cornerSections: Partial<Record<DtcoProcessCorner, string>>; source: DtcoSource;
  operatingBounds?: { supplyVoltageV?: DtcoNumericBounds; temperatureC?: DtcoNumericBounds };
}
export interface DtcoCircuitDevice {
  id: string; familyId: string; widthUm: number; lengthUm: number;
  nodes: string[]; lockWidth?: boolean; lockLength?: boolean;
  multiplicity?: number; fingers?: number; sourceInstancePath?: string; lockModel?: boolean; lockBody?: boolean;
}
export interface DtcoCircuitGroup { id: string; deviceIds: string[]; }
export interface DtcoCharacterizationArc { id: string; input: string; output: string; transition: "inverting" | "noninverting"; fixedInputs?: Record<string, 0 | 1>; }
export interface DtcoCircuitProfile extends DtcoOption {
  technologyIds: string[]; modelIds: string[]; source: DtcoSource; subcircuit: string; ports: string[];
  sizingModes: Array<"custom" | "fixed">; devices: DtcoCircuitDevice[]; groups: DtcoCircuitGroup[];
  arcs: DtcoCharacterizationArc[]; layoutIds: string[]; electricalModes: DtcoElectricalMode[];
  metricScopes: Partial<Record<DtcoElectricalMode, string>>;
  layoutToolBounds?: { nmosWidthUm?: DtcoNumericBounds; pmosWidthUm?: DtcoNumericBounds; lengthUm?: DtcoNumericBounds };
  truthTable?: Array<{inputs:Record<string,0|1>;output:0|1}>;
  availableMetrics?: Array<"delayPs" | "averagePowerW" | "areaUm2">;
}
export interface DtcoResolvedDevice extends DtcoCircuitDevice {}
export interface DtcoOperatingCondition { temperatureC: number; voltageV: number; groundVoltageV: number; processCorner: DtcoProcessCorner; }
export interface DtcoResolvedInputs {
  catalogHash: string; technologyId: string; modelVersion: string; circuitId: string; sourceHashes: Record<string, string>;
  cornerSection: string; operating: DtcoOperatingCondition; devices: DtcoResolvedDevice[]; arcId: string;
}

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
  electricalMode?: DtcoElectricalMode;
  groundVoltagesV?: number[];
  processCorners?: DtcoProcessCorner[];
  sizingMode?: "custom" | "fixed";
  deviceOverrides?: Record<string, DtcoDimensionOverride>;
  groupOverrides?: Record<string, DtcoDimensionOverride>;
  characterizationArcId?: string;
  workflow?: "direct" | "integrated";
}
export interface DtcoPointCoordinates { temperatureC: number; voltageV: number; layoutId: string; groundVoltageV?: number; processCorner?: DtcoProcessCorner; }
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
  integrations?: { available: boolean; reasons: string[] };
  catalogVersion?: string;
  catalogHash?: string;
  technologyProfiles?: DtcoTechnologyProfile[];
  modelProfiles?: DtcoModelProfile[];
  circuitProfiles?: DtcoCircuitProfile[];
  designBounds?: { nmosWidthUm: { min: number; max: number; step: number }; pmosWidthUm: { min: number; max: number; step: number } };
  electricalModes?: DtcoOption[];
}
export type DtcoPointStatus = "unsubmitted" | "preparing" | "preparation_failed" | JobStatus;
export interface DtcoAttempt {
  pipeline?: DtcoPipelineRunSummary;
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
export type DtcoObjectiveMetric = "delayPs" | "averagePowerW" | "areaUm2" | "maxFrequencyHz" | "balanced";
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
  /** Keys: voltageV, groundVoltageV, temperatureC, device:<id>:widthUm/lengthUm, group:<id>:widthUm/lengthUm. */
  parameterAxes?: Record<string, DtcoOptimizationAxis>;
  groundVoltageV?: number;
  processCorners?: DtcoProcessCorner[];
  electricalMode?: DtcoElectricalMode;
  sizingMode?: "custom" | "fixed";
  deviceOverrides?: Record<string, DtcoDimensionOverride>;
  groupOverrides?: Record<string, DtcoDimensionOverride>;
  characterizationArcId?: string;
  workflow?: "direct" | "integrated";
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

/** maxFrequencyHz is an actually bracketed cell toggle measurement, never reciprocal propagation delay or chip Fmax. */
export interface DtcoMeasuredMetrics { delayPs: number; averagePowerW: number; areaUm2: number | null; maxFrequencyHz?: number | null; }
export interface DtcoOptimizationCandidate { design: DtcoDesign; layoutId: string; parameters?: Record<string, number>; processCorner?: DtcoProcessCorner; }
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
