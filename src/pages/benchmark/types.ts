/* ================================================================== */
/*  Benchmark Workflow Types — unified workspace for Translator,       */
/*  Fitting, Reduction, Expansion, and Benchmark operations.           */
/*  Aligned with goal.md Sections 6 & 10.                              */
/* ================================================================== */

/* ─── Operation keys ─── */
export type OperationKey = "translate" | "fit" | "reduce" | "expand";

/* ─── Workflow / Step status ─── */
export type WorkflowStatus =
  | "created"
  | "queued"
  | "running"
  | "partial"
  | "succeeded"
  | "failed"
  | "cancelling"
  | "cancelled";

export type StepStatus =
  | "pending"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled";

/* ─── SPICE formats ─── */
export type SpiceFormat = "ngspice" | "hspice" | "spectre";
export type SourceFormat = SpiceFormat | "auto";

/* ─── Device type ─── */
export type DeviceType = "nmos" | "pmos" | "other";

/* ─── Event types for SSE stream ─── */
export type WorkflowEventType =
  | "workflow.queued"
  | "workflow.started"
  | "step.started"
  | "step.progress"
  | "step.log"
  | "artifact.created"
  | "step.succeeded"
  | "step.failed"
  | "workflow.partial"
  | "workflow.succeeded"
  | "workflow.failed"
  | "workflow.cancelled";

export interface WorkflowEvent {
  workflowId: string;
  sequence: number;
  eventType: WorkflowEventType;
  stepId?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Model Artifact (goal.md §6.2)                                       */
/* ═══════════════════════════════════════════════════════════════════ */

export type ModelKind =
  | "original"
  | "canonical"
  | "fitted"
  | "reduced"
  | "corner"
  | "mc_sample"
  | "export";

export interface ModelArtifact {
  modelId: string;
  kind: ModelKind;
  parentModelIds: string[];
  format: SpiceFormat;
  modelName: string;
  deviceType: DeviceType;
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  tags: string[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Tool Step Result (goal.md §6.3)                                     */
/* ═══════════════════════════════════════════════════════════════════ */

export interface ToolStepResult {
  schemaVersion: string;
  stepId: string;
  tool: string;
  toolVersion: string;
  toolCommit: string;
  status: "succeeded" | "failed" | "partial";
  startedAt: string;
  finishedAt: string;
  inputs: string[];
  outputs: string[];
  metrics: Record<string, number | boolean | string>;
  artifacts: StepArtifact[];
  warnings: StepWarning[];
  error: StepError | null;
}

export interface StepArtifact {
  name: string;
  relPath: string;
  kind: "model" | "data" | "plot" | "report" | "log";
  format: string;
  sizeBytes: number;
  sha256: string;
}

export interface StepWarning {
  code: string;
  message: string;
  detail?: string;
}

export interface StepError {
  code: string;
  message: string;
  detail?: string;
  recoverable: boolean;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Workflow Request — operations config (goal.md §6.1)                */
/* ═══════════════════════════════════════════════════════════════════ */

export interface TranslateConfig {
  enabled: boolean;
  exportTargets: SpiceFormat[];
  followIncludes: boolean;
  strict: boolean;
}

export interface FittingDataset {
  uploadId: string;
  spec: "auto" | "idvg" | "idvd" | "custom";
  sweep?: string;
  bias?: string;
  w?: number;
  l?: number;
  temp?: number;
}

export interface FittingConfig {
  enabled: boolean;
  simType: "dc";
  datasets: FittingDataset[];
  optimizer: "nelder_mead" | "cg" | "bfgs" | "powell";
  loss: string;
  train: string[];
  fix: string[];
  bounds: Record<string, { min: number; max: number }>;
  maxIters: number;
  targetRelLoss: number;
  jobs: number;
  /** Advanced: staged configuration */
  stages?: FittingStage[];
}

export interface FittingStage {
  stage: number;
  train: string[];
  iterations: number;
  tolerance: number;
}

export interface ReductionConfig {
  enabled: boolean;
  targetErrorTolerance: number;
  minParameters: number;
  maxIterations: number;
  optimizationMethod: "genetic" | "simulated_annealing" | "gradient";
  reductionMethod: "sensitivity" | "principal_component" | "correlation";
  testType: "dc_iv" | "ac_cv" | "both";
  deviceType: DeviceType;
  seed: number;
}

export interface MonteCarloConfig {
  enabled: boolean;
  samples: number;
  distribution: "normal" | "uniform" | "lognormal";
  seed: number;
}

export interface ExpansionConfig {
  enabled: boolean;
  nSigma: number;
  corners: ("t" | "s" | "f")[];
  runIv: boolean;
  runCv: boolean;
  monteCarlo: MonteCarloConfig;
  sigmaMap?: Record<string, number>;
}

export type BenchmarkScope = "final_only" | "baseline_and_final" | "all_stages";

export interface BenchmarkConfig {
  modes: ("dc" | "ac" | "transient" | "noise")[];
  simulators: string[];
  scope: BenchmarkScope;
  dpi: number;
  benchmarkMonteCarloSamples: number;
  concurrencyLimit?: number;
}

export interface WorkflowRequest {
  schemaVersion: string;
  input: {
    sourceFormat: SourceFormat;
    modelName: string | null;
    deviceType: DeviceType | "auto";
  };
  operations: {
    translate: TranslateConfig;
    fit: FittingConfig;
    reduce: ReductionConfig;
    expand: ExpansionConfig;
  };
  benchmark: BenchmarkConfig;
  retentionDays: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Preflight Result                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

export interface PreflightModelCard {
  modelName: string;
  deviceType: DeviceType;
  level?: string;
  version?: string;
  parameters?: number;
}

export interface OperationCapability {
  available: boolean;
  reason?: string;
}

export interface PreflightResult {
  sourceFormat: SpiceFormat;
  modelCards: PreflightModelCard[];
  modelName: string;
  deviceType: DeviceType;
  level?: string;
  version?: string;
  includeFiles: string[];
  capabilities: Record<OperationKey, OperationCapability>;
  risks: string[];
  fileHash: string;
  fileCount: number;
  totalSizeBytes: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Capabilities                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

export interface ToolCapability {
  version: string;
  commit: string;
  available: boolean;
}

export interface ServerCapabilities {
  serviceVersion: string;
  tools: Record<string, ToolCapability>;
  supportedFormats: SpiceFormat[];
  optimizers: string[];
  reductionMethods: string[];
  simulators: string[];
  spectreAvailable: boolean;
  queueLimits: { maxConcurrent: number; maxPerUser: number };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Toolchain Lock (goal.md §12.1)                                      */
/* ═══════════════════════════════════════════════════════════════════ */

export interface ToolchainEntry {
  repo: string;
  commit: string;
  image: string;
}

export interface ToolchainLock {
  translator: ToolchainEntry;
  fitting: ToolchainEntry;
  reduction: ToolchainEntry;
  expansion: ToolchainEntry;
  benchmark: ToolchainEntry;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Execution DAG / Plan                                                */
/* ═══════════════════════════════════════════════════════════════════ */

export type StepKey =
  | "preflight"
  | "canonicalize"
  | "fit"
  | "reduce"
  | "expand"
  | "benchmark"
  | "export"
  | "finalize";

export interface DAGStep {
  stepKey: StepKey;
  label: string;
  tool: string;
  inputs: string[];
  outputs: string[];
  dependsOn: StepKey[];
}

export interface ExecutionPlan {
  canonicalOrder: StepKey[];
  dag: DAGStep[];
  estimatedModels: number;
  benchmarkRuns: number;
  resourceLimits: string;
  retentionDays: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Workflow Step — runtime state                                       */
/* ═══════════════════════════════════════════════════════════════════ */

export interface WorkflowStep {
  stepKey: StepKey;
  stepId: string;
  status: StepStatus;
  attempt: number;
  startedAt: string | null;
  finishedAt: string | null;
  result: ToolStepResult | null;
  error: StepError | null;
  logUrl?: string;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Workflow Summary / Detail                                           */
/* ═══════════════════════════════════════════════════════════════════ */

export interface WorkflowSummary {
  workflowId: string;
  status: WorkflowStatus;
  owner: string;
  createdAt: string;
  updatedAt: string;
  currentStep: StepKey | null;
  modelName: string;
  operations: OperationKey[];
}

export interface WorkflowDetail extends WorkflowSummary {
  request: WorkflowRequest;
  preflight: PreflightResult | null;
  plan: ExecutionPlan;
  steps: WorkflowStep[];
  models: ModelArtifact[];
  lineage: ModelLineageNode[];
  environment: Record<string, string>;
  toolchainLock: ToolchainLock;
  manifestUrl?: string;
  benchmarkManifestUrl?: string;
  eventsUrl: string;
  finishedAt: string | null;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Workflow List / Filter                                              */
/* ═══════════════════════════════════════════════════════════════════ */

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkflowFilter {
  status?: WorkflowStatus;
  owner?: string;
  page?: number;
  pageSize?: number;
  sort?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Model Lineage (goal.md §10.5)                                       */
/* ═══════════════════════════════════════════════════════════════════ */

export interface ModelLineageNode {
  modelId: string;
  modelName: string;
  kind: ModelKind;
  format: SpiceFormat;
  parentModelIds: string[];
  stepKey: StepKey;
  sha256: string;
  benchmarkRunIds: string[];
}

export interface ParameterDiff {
  parameter: string;
  oldValue: number | null;
  newValue: number;
  delta: number;
  deltaPct: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Workflow submission request (multipart)                             */
/* ═══════════════════════════════════════════════════════════════════ */

export interface WorkflowSubmitResponse {
  workflowId: string;
  status: "queued";
  statusUrl: string;
  eventsUrl: string;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Upload progress                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

export interface UploadProgress {
  file: string;
  loaded: number;
  total: number;
  percent: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Page-level state                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

export type WorkspaceTab = "new" | "runs" | "demo";

export interface WorkspaceUIState {
  activeTab: WorkspaceTab;
  /** Multi-step builder */
  step: "upload" | "select" | "configure" | "review" | "run";
  /** Opened accordion sections in configure */
  expandedOps: Set<OperationKey>;
  /** Active run id in Runs tab */
  activeRunId: string | null;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Default values for forms                                            */
/* ═══════════════════════════════════════════════════════════════════ */

export const DEFAULT_TRANSLATE_CONFIG: TranslateConfig = {
  enabled: false,
  exportTargets: ["ngspice"],
  followIncludes: true,
  strict: false,
};

export const DEFAULT_FITTING_CONFIG: FittingConfig = {
  enabled: false,
  simType: "dc",
  datasets: [],
  optimizer: "nelder_mead",
  loss: "Loss.mape_loss.mape_percent",
  train: ["vth0", "k1", "k2", "nfactor"],
  fix: [],
  bounds: {},
  maxIters: 50,
  targetRelLoss: 0.3,
  jobs: 1,
};

export const DEFAULT_REDUCTION_CONFIG: ReductionConfig = {
  enabled: false,
  targetErrorTolerance: 0.05,
  minParameters: 10,
  maxIterations: 100,
  optimizationMethod: "genetic",
  reductionMethod: "sensitivity",
  testType: "dc_iv",
  deviceType: "nmos",
  seed: 42,
};

export const DEFAULT_EXPANSION_CONFIG: ExpansionConfig = {
  enabled: false,
  nSigma: 3,
  corners: ["t", "s", "f"],
  runIv: true,
  runCv: true,
  monteCarlo: {
    enabled: false,
    samples: 100,
    distribution: "normal",
    seed: 42,
  },
};

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  modes: ["dc", "ac", "transient", "noise"],
  simulators: ["ngspice"],
  scope: "baseline_and_final",
  dpi: 300,
  benchmarkMonteCarloSamples: 0,
};

export const DEFAULT_WORKFLOW_REQUEST: WorkflowRequest = {
  schemaVersion: "1.0",
  input: {
    sourceFormat: "auto",
    modelName: null,
    deviceType: "auto",
  },
  operations: {
    translate: DEFAULT_TRANSLATE_CONFIG,
    fit: DEFAULT_FITTING_CONFIG,
    reduce: DEFAULT_REDUCTION_CONFIG,
    expand: DEFAULT_EXPANSION_CONFIG,
  },
  benchmark: DEFAULT_BENCHMARK_CONFIG,
  retentionDays: 30,
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Preset definitions                                                  */
/* ═══════════════════════════════════════════════════════════════════ */

export type ReductionPreset = "conservative" | "balanced" | "aggressive";

export const REDUCTION_PRESETS: Record<ReductionPreset, Partial<ReductionConfig>> = {
  conservative: {
    targetErrorTolerance: 0.01,
    minParameters: 30,
    maxIterations: 200,
    reductionMethod: "sensitivity",
  },
  balanced: {
    targetErrorTolerance: 0.05,
    minParameters: 15,
    maxIterations: 100,
    reductionMethod: "sensitivity",
  },
  aggressive: {
    targetErrorTolerance: 0.1,
    minParameters: 5,
    maxIterations: 50,
    reductionMethod: "correlation",
  },
};

export type FittingPreset = "threshold" | "mobility" | "output" | "custom";

export const FITTING_PRESETS: Record<Exclude<FittingPreset, "custom">, Partial<FittingConfig>> = {
  threshold: {
    train: ["vth0", "k1", "nfactor"],
  },
  mobility: {
    train: ["u0", "ua", "ub", "uc"],
  },
  output: {
    train: ["k2", "vsat", "a0", "ags", "b0", "b1"],
  },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helper: execution order (goal.md §3)                                */
/* ═══════════════════════════════════════════════════════════════════ */

export const CANONICAL_ORDER: StepKey[] = [
  "preflight",
  "canonicalize",
  "fit",
  "reduce",
  "expand",
  "benchmark",
  "export",
  "finalize",
];

/** Compute the actual step sequence for a given request. */
export function buildEffectiveSteps(
  ops: WorkflowRequest["operations"],
  sourceFormat: SourceFormat,
): StepKey[] {
  const steps: StepKey[] = ["preflight"];
  if (sourceFormat !== "ngspice") steps.push("canonicalize");
  if (ops.fit.enabled) steps.push("fit");
  if (ops.reduce.enabled) steps.push("reduce");
  if (ops.expand.enabled) steps.push("expand");
  steps.push("benchmark");
  if (ops.translate.enabled) steps.push("export");
  steps.push("finalize");
  return steps;
}

/** Human-readable labels for each step. */
export const STEP_LABELS: Record<StepKey, string> = {
  preflight: "Preflight",
  canonicalize: "Canonicalize",
  fit: "Fitting",
  reduce: "Reduction",
  expand: "Expansion",
  benchmark: "Benchmark",
  export: "Export",
  finalize: "Finalize",
};

/** Which tool corresponds to each step. */
export const STEP_TOOL: Record<StepKey, string> = {
  preflight: "spice_model_benchmark",
  canonicalize: "new-spice-translator",
  fit: "spice_model_fitting",
  reduce: "spice_model_reduction",
  expand: "spice_model_expansion",
  benchmark: "spice_model_benchmark",
  export: "new-spice-translator",
  finalize: "spice_model_benchmark",
};
