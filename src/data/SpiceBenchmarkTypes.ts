/* ================================================================== */
/*  SPICE Model Benchmark Types                                         */
/*  Schema: manifest → runs[] → models + netlistSuites + results       */
/* ================================================================== */

/* ─── Analysis domains ─── */
export type AnalysisDomain = "overview" | "dc" | "ac" | "transient" | "noise";

export const ANALYSIS_DOMAINS: AnalysisDomain[] = ["overview","dc","ac","transient","noise"];

/* ─── Simulator / model format ─── */
export type ModelFormat = "ngspice" | "hspice" | "spectre";

/* ─── Comparison mode ─── */
export type ComparisonMode = "single" | "compare_models" | "compare_suites";

/* ─── Verification test result ─── */
export type VerificationStatus = "pass" | "fail" | "unavailable";

/* ─── Run status ─── */
export type RunStatus = "completed" | "partial" | "failed" | "example";

/* ─── Netlist suite — 4 analysis-specific circuits ─── */
export interface NetlistSuite {
  suiteId: string;
  suiteName: string;
  /** Paths relative to run root */
  dcCircuit: string;
  acCircuit: string;
  transientCircuit: string;
  noiseCircuit: string;
}

/* ─── Model entry ─── */
export interface ModelEntry {
  modelId: string;
  modelName: string;
  modelPath: string;
  modelFormat: ModelFormat;
  deviceName: string;
  deviceType: string;
}

/* ─── Data artifact — a single data file in a run ─── */
export interface DataArtifact {
  name: string;
  relPath: string;
  domain: AnalysisDomain;
  format: "csv" | "txt" | "raw" | "json" | "dat" | "raw_binary";
  size: string;
  hash: string;
  /** Column headers parsed at generation time; null for .raw */
  columns: string[] | null;
  /** Row count, or -1 for large/raw files. */
  rowCount: number;
  /** Public JSON URL for lazy fetch (normalized data, served from public/). */
  fetchUrl: string | null;
  /** Public raw CSV/TXT URL. */
  rawUrl?: string | null;
  /** Numeric column names. */
  numericColumns?: string[];
  /** Group-by column info. */
  groups?: { byColumn: string; uniqueValues: string[] } | null;
  /** Extra metadata. */
  metadata?: Record<string, unknown>;
  /** Unique artifact key: relPath. */
  artifactId?: string;
}

/* ─── Plot artifact — a plot image in the run ─── */
export interface PlotArtifact {
  name: string;
  relPath: string;
  domain: AnalysisDomain;
  format: "png" | "svg";
  size: string;
  /** Public URL for display (copied to public/benchmark/...). */
  displayUrl: string | null;
}

/* ─── Report summary ─── */
export interface ReportSummary {
  reportPath?: string;
  reportMarkdown: string;
  simulator: string;
  simulatorVersion: string;
  overallStatus: VerificationStatus;
  /** Parsed verification tests from the report. */
  verificationTests?: VerificationTest[];
}

/* ─── Verification test ─── */
export interface VerificationTest {
  testId: string;
  domain: AnalysisDomain;
  name: string;
  status: VerificationStatus;
  detail: string;
}

/* ─── Other artifact (reports, logs, netlists, unknown) ─── */
export interface OtherArtifact {
  name: string; relPath: string; size: string; hash: string;
  kind: "report" | "log" | "netlist" | "other";
  format?: string; report?: ReportSummary;
}

/* ─── Benchmark run — one evaluation ─── */
export interface BenchmarkRun {
  runId: string;
  status: RunStatus;
  pdkId: string;
  modelId: string;
  modelPath: string;
  modelFormat: ModelFormat;
  deviceName: string;
  netlistSuite: NetlistSuite;
  modes: string[];
  simulator: string;
  simulatorVersion: string;
  generatedAt: string;
  commitSha: string;
  metadataSource: string;
  reportSummary: ReportSummary;
  verificationTests: VerificationTest[];
  dataArtifacts: DataArtifact[];
  plotArtifacts: PlotArtifact[];
  otherArtifacts: OtherArtifact[];
  reportPath: string;
}

/* ─── Top-level manifest ─── */
export interface SpiceBenchmarkManifest {
  generatedAt: string;
  repoUrl: string;
  /** All runs keyed by runId */
  runs: Record<string, BenchmarkRun>;
  /** Unique model IDs across all runs */
  modelIds: string[];
  /** Map modelId -> ModelEntry */
  models: Record<string, ModelEntry>;
  /** Unique netlist suite IDs across all runs */
  suiteIds: string[];
  /** Map suiteId -> NetlistSuite */
  netlistSuites: Record<string, NetlistSuite>;
  /** Unique model format values */
  modelFormats: ModelFormat[];
  /** Models/netlists available but not yet run */
  availableModels: number;
}

/* ─── Cross-simulator comparison ─── */
export interface SimulatorComparisonEntry {
  mode: string;           // DC, AC, Transient, Noise
  simulator: string;      // ngspice, spectre, hspice
  status: "pass" | "fail" | "partial" | "not_run";
  durationSec?: number;   // execution time in seconds
  peakMemoryMB?: number;  // peak memory in MB
  dataFileCount?: number;
  plotCount?: number;
}

/* ─── Helper types for page state ─── */

export type NumericScaleMode = "linear" | "log";

export type PlotAspectMode = "flexible" | "16:9" | "4:3" | "1:1";

export interface SpiceExploreState {
  runId: string;
  modelId: string;
  modelFormat: ModelFormat | "";
  suiteId: string;
  analysis: AnalysisDomain;
  datasetId: string;
  seriesSelection: string[];
  comparisonMode: ComparisonMode;
  xColumn: string;
  yColumn: string;
  zColumn: string;
  chartType: "scatter" | "scatter3d" | "line" | "heatmap" | "bar";
  numericScaleX: NumericScaleMode;
  numericScaleY: NumericScaleMode;
  numericScaleZ: NumericScaleMode;
  plotAspect: PlotAspectMode;
}

/* ─── Defaults ─── */
export const DEFAULT_SPICE_EXPLORE_STATE: SpiceExploreState = {
  runId: "",
  modelId: "",
  modelFormat: "",
  suiteId: "",
  analysis: "overview",
  datasetId: "",
  seriesSelection: [],
  comparisonMode: "single",
  xColumn: "",
  yColumn: "",
  zColumn: "",
  chartType: "scatter",
  numericScaleX: "linear",
  numericScaleY: "linear",
  numericScaleZ: "linear",
  plotAspect: "flexible",
};
