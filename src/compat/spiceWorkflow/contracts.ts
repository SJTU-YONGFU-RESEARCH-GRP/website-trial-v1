/* ==================================================================
 *  Unified SPICE Workflow Contracts (goal.md §19)
 *
 *  This file defines the canonical data model for the Benchmark
 *  Workspace.  All adapters, normalizers, fixtures, and UI
 *  components consume these types so that legacy manifests, static
 *  demos, and future backend responses share one vocabulary.
 * ================================================================== */

/* ─── Identifiers ─── */
export type ToolId =
  | "translator"
  | "fitting"
  | "reduction"
  | "expansion"
  | "benchmark";

export type ProcessingToolId = "translator" | "reduction" | "expansion" | "fitting";

export type SimulatorId = "ngspice" | "spectre" | "hspice";

export type SpiceDialect = SimulatorId | "auto" | "unknown";

export type AnalysisDomain =
  | "dc"
  | "ac"
  | "transient"
  | "noise";

export type ModelVariant =
  | "input"
  | "translated"
  | "calibrated"
  | "reduced"
  | "corner-typical"
  | "corner-slow"
  | "corner-fast"
  | "monte-carlo-sample"
  | "compatibility-copy";

export type DataOrigin =
  | "existing-tool-output"
  | "derived-static-demo"
  | "synthetic-demo"
  | "user-local"
  | "unavailable";

export type ResultStatus =
  | "configured"
  | "completed"
  | "partial"
  | "failed"
  | "unavailable";

/* ─── Provenance ─── */
export interface Provenance {
  origin: DataOrigin;
  sourceRepo?: string;
  sourceRef?: string;
  sourceCommit?: string;
  sourcePath?: string;
  generatedAt?: string;
  adapterId?: string;
  adapterVersion?: string;
  fixtureId?: string;
  note?: string;
}

/* ─── Model Artifact ─── */
export interface ModelArtifact {
  modelId: string;
  parentModelId: string | null;
  filename: string;
  displayName: string;
  variant: ModelVariant;
  dialect: SpiceDialect;
  modelNames: string[];
  deviceClass:
    | "mos"
    | "bjt"
    | "diode"
    | "resistor"
    | "capacitor"
    | "unknown";
  deviceType?: "nmos" | "pmos" | "npn" | "pnp" | "unknown";
  modelFamily?: string;
  content?: string;
  contentUrl?: string | null;
  byteSize: number | null;
  parameterCount: number | null;
  checksum: string | null;
  generatedBy: ToolId | "user";
  /** Human-readable operation chain derived from model lineage, e.g. "Input → Translator → Fitting" */
  operationChain?: string;
  /** PDK source, e.g. "FreePDK45", "SkyWater130", "ASAP7" */
  pdkSource?: string;
  persistent: boolean;
  temporary: boolean;
  provenance: Provenance;
}

/* ─── Artifact Ref ─── */
export interface ArtifactRef {
  artifactId: string;
  name: string;
  toolId: ToolId;
  modelId?: string;
  domain?: AnalysisDomain;
  kind:
    | "model"
    | "dataset"
    | "plot"
    | "report"
    | "log"
    | "netlist"
    | "metadata"
    | "other";
  format: string;
  sizeBytes: number | null;
  hash: string | null;
  displayUrl?: string | null;
  fetchUrl?: string | null;
  visibility: "public" | "local" | "redacted";
  provenance: Provenance;
  /** Stable semantic key for cross-model plot pairing (goal2.md §6.6) */
  comparisonKey?: string;
  /** Human-readable plot title */
  title?: string;
}

/* ─── Resource Metrics ─── */
export interface ResourceMetrics {
  wallTimeMs: number | null;
  cpuTimeMs?: number | null;
  peakRssMB: number | null;
  source: DataOrigin;
}

/* ─── Agreement Metrics ─── */
export interface AgreementMetrics {
  normalizedRmse: number | null;
  maxRelativeError: number | null;
  correlation: number | null;
  alignedPointCount: number | null;
  tolerance?: number | null;
}

/* ─── Domain Benchmark Result ─── */
export interface DomainBenchmarkResult {
  resultId: string;
  modelId: string;
  simulator: SimulatorId;
  simulatorVersion: string | null;
  domain: AnalysisDomain;
  status: "pass" | "fail" | "partial" | "unavailable";
  resources: ResourceMetrics;
  agreement?: AgreementMetrics;
  keyMetrics: Record<string, number | string | null>;
  datasetArtifactIds: string[];
  plotArtifactIds: string[];
  provenance: Provenance;
}

/* ─── Tool Invocation ─── */
export interface ToolInvocation<TParams = Record<string, unknown>> {
  invocationId: string;
  toolId: ToolId;
  adapterVersion: string;
  inputModelIds: string[];
  outputModelIds: string[];
  params: TParams;
  argv: string[];
  workingDirectoryKey: string;
  outputDirectoryKey: string;
  environment: Record<string, string>;
  temporary: boolean;
}

/* ─── Tool Execution Result ─── */
export interface ToolExecutionResult<TMetrics = Record<string, unknown>> {
  executionId: string;
  toolId: ToolId;
  status: ResultStatus;
  inputModelIds: string[];
  outputModelIds: string[];
  metrics: TMetrics;
  artifactIds: string[];
  warnings: string[];
  errors: string[];
  invocationId: string;
  provenance: Provenance;
}

/* ─── Workflow Operation ─── */
export interface WorkflowOperation<TParams = Record<string, unknown>> {
  operationId: string;
  toolId: Exclude<ToolId, "benchmark">;
  enabled: boolean;
  order: number;
  params: TParams;
}

/* ─── Workflow Scenario (top-level) ─── */
export interface WorkflowScenario {
  schemaVersion: string;
  scenarioId: string;
  title: string;
  description: string;
  status: ResultStatus;
  models: Record<string, ModelArtifact>;
  operations: WorkflowOperation[];
  invocations: Record<string, ToolInvocation>;
  executions: Record<string, ToolExecutionResult>;
  benchmarkResults: DomainBenchmarkResult[];
  artifacts: Record<string, ArtifactRef>;
  /** Per-model+simulator structured report data (REPORT.md) */
  reports?: Record<string, ReportStructure>;
  /** Per-model manifest data */
  manifests?: Record<string, ModelManifest>;
  defaultInputModelId: string;
  defaultCandidateModelId: string;
  defaultSimulators: SimulatorId[];
  defaultDomains: AnalysisDomain[];
  provenance: Provenance;
}

/* ─── Runtime Interface (future-proof boundary) ─── */
export interface WorkflowPreviewRequest {
  inputModelId: string | null;
  localModel: ModelArtifact | null;
  operations: WorkflowOperation[];
  selectedSimulators: SimulatorId[];
  selectedDomains: AnalysisDomain[];
  baselineModelId: string | null;
  candidateModelId: string | null;
  referenceSimulator: SimulatorId;
}

export interface WorkflowPreview {
  effectiveSteps: ToolId[];
  compatibilityNodes: ToolInvocation[];
  benchmarkMatrix: {
    modelId: string;
    simulators: SimulatorId[];
    domains: AnalysisDomain[];
  }[];
  warnings: string[];
}

export interface WorkflowRuntime {
  preview(request: WorkflowPreviewRequest): Promise<WorkflowPreview>;
  loadResult(scenarioId: string): Promise<WorkflowScenario>;
}

/* ─── REPORT.md Structured Data ─── */

export type ReportStatus = "pass" | "fail" | "in-progress" | "unavailable";

export interface ReportEntry {
  /** Human-readable test name, e.g. "IV data file is generated" */
  testType: string;
  status: ReportStatus;
  keyFindings: string | null;
  /** Optional nested sub-details */
  children?: ReportEntry[];
}

export interface ReportSubSection {
  title: string;
  entries: ReportEntry[];
  /** Optional plot image paths for this subsection */
  plots?: string[];
}

export interface ReportSection {
  /** e.g. "DC Analysis", "Transient Analysis" */
  title: string;
  /** Top-level entries before subsections */
  entries?: ReportEntry[];
  subsections: ReportSubSection[];
}

export interface ReportStructure {
  scenarioTitle: string;
  generatedAt: string;
  simulationSetup: ReportEntry[];
  summary: {
    dc: ReportEntry[];
    transient: ReportEntry[];
    ac: ReportEntry[];
    noise: ReportEntry[];
  };
  sections: ReportSection[];
}

export interface ModelManifest {
  modelId: string;
  displayName: string;
  checksum: string;
  deviceType: "nmos" | "pmos" | "unknown";
  modelFamily: string;
  pdkSource: string;
  operationChain: string;
  parameterCount: number;
  simulators: SimulatorId[];
  reportGeneratedAt: string;
  /** Simulator represented by this per-run manifest. */
  simulator?: SimulatorId;
  simulatorVersion?: string | null;
  /** Benchmark run metadata. Missing values remain null in the UI. */
  runId?: string | null;
  status?: "pass" | "fail" | "partial" | "unavailable";
  benchmarkStartedAt?: string | null;
  benchmarkEndedAt?: string | null;
  wallTimeMs?: number | null;
  peakRssMB?: number | null;
}

/* ─── Unit conventions (goal.md §19.2) ───
 *
 *  time     → ms
 *  memory   → MB
 *  voltage  → V
 *  current  → A
 *  cap.     → F
 *  freq.    → Hz
 *  temp.    → °C
 *  file sz  → bytes
 *  ratio    → 0–1
 *
 *  All unknown numeric values MUST be `null` – never 0, -1, or "N/A".
 */
