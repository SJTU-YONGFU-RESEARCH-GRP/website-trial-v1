/* ================================================================== */
/*  Types for the /flow Library Benchmark Dashboard                     */
/*  Schema: LibraryBenchmark → algorithms[] → cellResults[]             */
/*  Every module is optional — a cell may lack any stage's data.        */
/*  No Math.random() — all demo data is deterministic.                  */
/* ================================================================== */

/* ─── Badge — centralised status type ─── */
export type BadgeStatus =
  | "completed" | "running" | "pending" | "failed"
  | "ready"     | "error"   | "done";

/* ─── Provenance — every demo datum carries a marker ─── */
export interface Provenance {
  isDemo: true;
  source: string;
  provenance: string;
}

/* ─── Tool keys ─── */
export type ToolKey =
  | "AutoCellGen-V2"
  | "fastercap_v2"
  | "libcharx"
  | "DeviceOpt"
  | "layout2timing_flow";

/* ─── Artifact ─── */
export interface Artifact {
  name: string;
  relPath: string;
  size: string;
  toolKey: ToolKey;
  timestamp: string;
  status: BadgeStatus;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Library Benchmark — top-level entity                               */
/* ═══════════════════════════════════════════════════════════════════ */

/** A layout/routing algorithm variant to compare. */
export interface LayoutRoutingAlgorithm {
  algorithmId: string;
  algorithmName: string;
  placementAlgorithm: string;
  routingAlgorithm: string;
  description: string;
}

/** Aggregated library-level summary for one algorithm. */
export interface LibraryAlgorithmSummary {
  algorithmId: string;
  totalCells: number;
  completedCells: number;
  successRate: number;
  totalAreaUm2: number;
  geomeanDelayPs: number;
  avgOutputCapFF: number;
  totalRuntimeSec: number;
  drcCleanCells: number;
  lvsCleanCells: number;
  pexCompletedCells: number;
  timingCompletedCells: number;
}

/** Orchestrator config / manifest for the evaluation flow. */
export interface OrchestratorConfig {
  designKit: string;
  technology: string;
  voltageV: number;
  trackHeight: number;
  cellHeightNm: number;
}

/** Evaluation stage info. */
export interface StageInfo {
  id: string;
  name: string;
  tool: ToolKey;
  status: BadgeStatus;
  duration: string;
  order: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  AutoCellGen V2 — Layout data                                       */
/* ═══════════════════════════════════════════════════════════════════ */

export interface LayoutData {
  exists: true;
  cellName: string;
  algorithmId: string;
  widthNm: number;
  heightNm: number;
  areaUm2: number;
  utilization: number;
  transistorCount: number;
  trackCount: number;
  routingStatus: string;           /* e.g. "routed", "partially-routed", "failed" */
  runtimeSec: number;
  layoutPreviewSvg: string | null; /* data URI placeholder or null */
  layoutPng: string | null;       /* future real layout PNG */
  rules: {
    minWidthNm: number;
    minSpacingNm: number;
    metalLayers: number;
  };
  configSummary: string;
  netlistSummary: string;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  fastercap_v2 — Parasitics data                                     */
/* ═══════════════════════════════════════════════════════════════════ */

export interface NetCapEntry {
  net: string;
  cTotalFF: number;
  couplingFF: number;
  cSubFF: number;
}

export interface ConductorCoupling {
  conductorFrom: string;
  conductorTo: string;
  capacitanceFF: number;
}

export interface MaxwellMatrix {
  conductorLabels: string[];
  matrixFF: number[][];
}

export interface QualityCheck {
  check: string;
  value: number;
  unit: string;
  pass: boolean;
}

export interface NetMapEntry {
  conductor: string;
  net: string;
  layer: string;
}

export interface AnnotatedCdlEntry {
  net: string;
  piCapsFF: number;
  coupledTo: string;
}

export interface ParasiticsData {
  exists: true;
  cellName: string;
  algorithmId: string;
  netCaps: NetCapEntry[];
  maxwellMatrix: MaxwellMatrix;
  conductorCouplings: ConductorCoupling[];
  qualityChecks: QualityCheck[];
  netMap: NetMapEntry[];
  annotatedCdl: AnnotatedCdlEntry[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  libcharx — Timing data                                             */
/* ═══════════════════════════════════════════════════════════════════ */

export interface TimingRow {
  inputTransitionPs: number;
  outputLoadFF: number;
  delayPs: number;
  slewPs: number;
}

export interface TimingData {
  exists: true;
  cellName: string;
  algorithmId: string;
  rows: TimingRow[];
  /** Per-cell geomean delay across all rows (for library aggregate). */
  geomeanDelayPs: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  DeviceOpt — Standalone CFET device optimisation                    */
/* ═══════════════════════════════════════════════════════════════════ */

export interface DeviceOptSolution {
  solutionId: string;
  tinPs: number;
  tsPs: number;
  toutPs: number;
  tMaxPs: number;
  reward: number;
  parameters: {
    widthUm: number;
    lengthNm: number;
    fingers: number;
  };
  capacitanceFF: number;
  resistanceOhm: number;
  meta: string;
  paretoFront: boolean;
}

export interface DeviceOptData {
  exists: true;
  cellName: string;
  solutions: DeviceOptSolution[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Per-algorithm cell result — aggregates layout / pex / timing       */
/* ═══════════════════════════════════════════════════════════════════ */

export interface AlgorithmCellResult {
  algorithmId: string;
  status: BadgeStatus;
  layout: LayoutData | null;
  parasitics: ParasiticsData | null;
  timing: TimingData | null;
  artifacts: Artifact[];
  failedStage: string | null;
  errorSummary: string | null;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CellBenchmarkResult — one cell, results across all algorithms      */
/* ═══════════════════════════════════════════════════════════════════ */

export interface CellBenchmarkResult {
  cellName: string;
  algorithmResults: AlgorithmCellResult[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LibraryBenchmark — root entity                                     */
/* ═══════════════════════════════════════════════════════════════════ */

export interface LibraryBenchmark {
  id: string;
  name: string;
  technology: string;
  libraryName: string;
  cellCount: number;
  algorithms: LayoutRoutingAlgorithm[];
  cellResults: CellBenchmarkResult[];
  summaries: LibraryAlgorithmSummary[];
  orchestratorConfig: OrchestratorConfig;
  stages: StageInfo[];
  artifacts: Artifact[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helper functions                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

/** Score a cell's data completeness for the baseline algorithm specifically. */
export function cellCompleteness(cell: CellBenchmarkResult, baselineAlgoId: string): number {
  const ar = cell.algorithmResults.find(a => a.algorithmId === baselineAlgoId);
  if (!ar) return 0;
  let score = 0;
  if (ar.layout) score += 10;
  if (ar.parasitics) score += 10;
  if (ar.timing) score += 10;
  score += ar.artifacts.length;
  return score;
}

/** Pick the cell with the highest data completeness re a specific algorithm. */
export function pickDefaultCell(
  cells: CellBenchmarkResult[],
  algorithmId: string,
): CellBenchmarkResult | null {
  if (cells.length === 0) return null;
  return cells.reduce((best, c) =>
    cellCompleteness(c, algorithmId) > cellCompleteness(best, algorithmId) ? c : best,
  );
}

/** Get a cell result by name. */
export function findCell(
  benchmark: LibraryBenchmark,
  cellName: string,
): CellBenchmarkResult | null {
  return benchmark.cellResults.find((c) => c.cellName === cellName) ?? null;
}

/** Deterministic label for delta display. */
export const DEMO_PROVENANCE: Provenance = {
  isDemo: true,
  source: "mock",
  provenance: "Deterministic demo data for static display. Replace with real tool output.",
};

/** Metric labels for dropdown selector. */
export const HEATMAP_METRICS = [
  { key: "area_delta_pct", label: "Area Δ%" },
  { key: "delay_delta_pct", label: "Delay Δ%" },
  { key: "cap_delta_pct", label: "Cap Δ%" },
  { key: "runtime_delta_pct", label: "Runtime Δ%" },
] as const;

export type HeatmapMetricKey = (typeof HEATMAP_METRICS)[number]["key"];
