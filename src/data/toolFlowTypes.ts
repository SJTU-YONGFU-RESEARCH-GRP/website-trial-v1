/* ================================================================== */
/*  Types for the /flow CFET Library Benchmark Dashboard               */
/*  Schema: manifests[] → benchmark → algorithms → cells → stages     */
/*  All demo data is deterministic — no Math.random() anywhere.        */
/* ================================================================== */

/* ─── Comparison kind ─── */
export type ComparisonKind = "algorithm" | "architecture" | "ablation";

/* ─── Visibility for public-facing artifacts ─── */
export type ArtifactVisibility = "public" | "internal" | "redacted";

/* ─── Badge status ─── */
export type BadgeStatus =
  | "completed" | "running" | "pending" | "failed"
  | "ready"     | "error"   | "done";

/* ─── Cell class for filtering/grouping ─── */
export type CellClass =
  | "inverter_buffer"
  | "combinational"
  | "arithmetic"
  | "sequential";

/* ─── Provenance metadata ─── */
export interface Provenance {
  isDemo: boolean;
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

/* ═══════════════════════════════════════════════════════════════════ */
/*  Artifact — file output with provenance & security metadata        */
/* ═══════════════════════════════════════════════════════════════════ */

export interface Artifact {
  name: string;
  relPath: string;
  size: string;
  toolKey: ToolKey;
  timestamp: string;
  status: BadgeStatus;
  /** Stage that produced this artifact. */
  stageId: string;
  /** Algorithm that produced it (or "common" for shared). */
  algorithmId: string;
  /** Cell name (or "benchmark" for shared files). */
  cellName: string;
  /** Content hash (hex). */
  hash: string;
  /** Provenance marker. */
  provenance: string;
  /** Security classification. Public websites must not expose private PDK/GDS/CDL. */
  visibility: ArtifactVisibility;
  /** Download URL or null if not available. */
  downloadUrl: string | null;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  AutoCellGen-V2 configuration snapshot                              */
/*  These are the actual knobs exposed by the tool.                    */
/* ═══════════════════════════════════════════════════════════════════ */

export interface AutoCellGenConfig {
  /** Folding style: "straight" | "snake" | "none". */
  folding_style: string;
  /** Logical partition enabling. */
  logical_partition: boolean;
  /** Branch-and-bound search depth. */
  branch_bound: number;
  /** Number of refinement solution rounds. */
  refine_sol: number;
  /** Remove symmetric solutions. */
  remove_sym: boolean;
  /** Remove dominated solutions. */
  remove_dom: boolean;
  /** Number of routing solutions to explore. */
  route_solutions: number;
  /** Route acceptance threshold. */
  route_accept: number;
  /** Minimum metal-1 pitch (in grid units — not nm unless calibrated). */
  min_m1: number;
  /** Minimum metal-2 pitch (grid units). */
  min_m2: number;
  /** Minimum metal-3 pitch (grid units). */
  min_m3: number;
  /** Metal-1 preferred direction. */
  m1_dir: "H" | "V";
  /** Metal-2 preferred direction. */
  m2_dir: "H" | "V";
  /** Enable FM optimisation during placement. */
  fm_optimization: boolean;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Technology / rules snapshot (asap7_cfet derived)                   */
/* ═══════════════════════════════════════════════════════════════════ */

export interface TechnologyRules {
  /** Process node identifier. */
  node: string;
  /** Number of metal layers available. */
  metalLayers: number;
  /** Track count per row (grid units). */
  trackCount: number;
  /** Cell height in grid rows. */
  cellHeightRows: number;
  /** BPR (bit per row) — architectural parameter. */
  bpr: number;
  /** Row structure: "single" | "double". */
  rowStructure: "single" | "double";
  /** Minimum width in grid units (not nm). */
  minWidth: number;
  /** Minimum spacing in grid units. */
  minSpacing: number;
  /** M1 pitch in grid units. */
  m1Pitch: number;
  /** M2 pitch in grid units. */
  m2Pitch: number;
  /** Supply voltage (V). */
  voltageV: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LayoutRoutingAlgorithm — kept for backwards compat                 */
/*  Now references an AutoCellGenConfig snapshot.                      */
/* ═══════════════════════════════════════════════════════════════════ */

export interface LayoutRoutingAlgorithm {
  algorithmId: string;
  algorithmName: string;
  comparisonKind: ComparisonKind;
  description: string;
  /** Snapshot of AutoCellGen configuration for this variant. */
  config: AutoCellGenConfig;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LibraryAlgorithmSummary — per-algorithm aggregate stats            */
/* ═══════════════════════════════════════════════════════════════════ */

export interface AlgorithmCoverage {
  totalCells: number;
  completedCells: number;
  layoutCompleted: number;
  pexCompleted: number;
  timingCompleted: number;
  drcClean: number;
  lvsClean: number;
}

export interface LibraryAlgorithmSummary {
  algorithmId: string;
  coverage: AlgorithmCoverage;
  /** Stats over all completed cells (may include cells the other algo failed on). */
  totalAreaUm2: number;
  totalRuntimeSec: number;
  /** Stats over common-cell intersection only (cells both algos completed). */
  commonCellCount: number;
  commonAreaUm2: number;
  commonGeomeanDelayPs: number;
  commonAvgOutputCapFF: number;
  commonRuntimeSec: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Evaluation stage info                                              */
/* ═══════════════════════════════════════════════════════════════════ */

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
/*  Width/height in grid units (config grid), NOT nm.                  */
/* ═══════════════════════════════════════════════════════════════════ */

export interface LayoutData {
  exists: true;
  cellName: string;
  algorithmId: string;
  /** Width in grid units. */
  widthGrid: number;
  /** Height in grid units. */
  heightGrid: number;
  /** Area in grid² (for relative comparison). */
  areaGrid2: number;
  utilization: number;
  transistorCount: number;
  routingStatus: string;
  runtimeSec: number;
  /** SVG layout preview — always marked as placeholder or real. */
  layoutPreviewSvg: string | null;
  /** When non-null, indicates the preview type. */
  previewType: "placeholder" | "real-png" | null;
  /** Real layout PNG (future: data URI). */
  layoutPng: string | null;
  /** Technology rules snapshot used. */
  rules: TechnologyRules;
  /** Config key that produced this layout. */
  configSummary: string;
  netlistSummary: string;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  fastercap_v2 — Parasitics data                                     */
/*  Maxwell matrix: Cii ≥ 0 (self), Cij ≤ 0 (coupling).               */
/* ═══════════════════════════════════════════════════════════════════ */

export interface NetCapEntry {
  net: string;
  /** Self-capacitance (Cii ≥ 0). */
  cSelfFF: number;
  /** Sum of |Cij| for j≠i (coupling magnitude). */
  couplingFF: number;
  /** Row sum = Cii + sum(Cij for j≠i) — not "substrate cap". */
  rowSumFF: number;
}

export interface ConductorCoupling {
  conductorFrom: string;
  conductorTo: string;
  /** Coupling capacitance Cij (stored as positive magnitude; sign is implicit). */
  capacitanceFF: number;
}

export interface MaxwellMatrix {
  conductorLabels: string[];
  /** Full matrix with proper sign convention: Cii ≥ 0, Cij ≤ 0. */
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
  /** Reference conductor for coupling, or "—" if none. */
  coupledTo: string;
  /** True when a reference conductor exists. */
  hasRef: boolean;
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
  /** Input transition (ps). */
  inputTransitionPs: number;
  /** Output load (fF). */
  outputLoadFF: number;
  /** Cell delay (ps). */
  delayPs: number;
  /** Output slew (ps). */
  slewPs: number;
}

export interface TimingData {
  exists: true;
  cellName: string;
  algorithmId: string;
  rows: TimingRow[];
  geomeanDelayPs: number;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  DeviceOpt — CFET device optimisation parameters                    */
/* ═══════════════════════════════════════════════════════════════════ */

export interface DeviceOptSolution {
  solutionId: string;
  /** CFET device geometry parameters. */
  Hsep: number;
  Tsp_drain: number;
  Hbot: number;
  Tsp_psource: number;
  Tsp_nsource: number;
  FP: number;
  GXT: number;
  gate_length: number;
  /** Electrical metrics. */
  capacitanceFF: number;
  resistanceOhm: number;
  timingPs: number;
  powerUW: number;
  /** Figure-of-merit reward (higher = better, reward mode specific). */
  reward: number;
  /** Label for meta grouping. */
  meta: string;
  /** Computed at runtime — see buildNonDominatedPareto(). */
  paretoFront: boolean;
  /** Reward mode used. */
  rewardMode: string;
}

export interface DeviceOptData {
  exists: true;
  cellName: string;
  solutions: DeviceOptSolution[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Per-algorithm cell result                                          */
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
  cellClass: CellClass;
  transistorCount: number;
  algorithmResults: AlgorithmCellResult[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LibraryBenchmark — single benchmark evaluation                     */
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
  technologyRules: TechnologyRules;
  stages: StageInfo[];
  artifacts: Artifact[];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LibraryBenchmarkManifest — top-level container for multiple runs   */
/* ═══════════════════════════════════════════════════════════════════ */

export interface LibraryBenchmarkManifest {
  manifests: BenchmarkManifestEntry[];
}

export interface BenchmarkManifestEntry {
  benchmarkId: string;
  name: string;
  technology: string;
  cellSet: string;
  toolCommitSha: string;
  configHash: string;
  rulesHash: string;
  seed: number;
  threads: number;
  timeoutSec: number;
  host: string;
  generatedAt: string;
  dataSource: string;
  visibility: ArtifactVisibility;
  comparisonKind: ComparisonKind;
  /** True when this benchmark is synthetic demo data. */
  isDemo: boolean;
  /** Reference to the actual benchmark data. */
  benchmark: LibraryBenchmark;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Demo provenance marker                                              */
/* ═══════════════════════════════════════════════════════════════════ */

export const DEMO_PROVENANCE_LABEL =
  "⚠ Deterministic synthetic demo — not real ICRD-CFET measurements.";

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helper functions                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

/** Score a cell's data completeness for a specific algorithm. */
export function cellCompleteness(cell: CellBenchmarkResult, algorithmId: string): number {
  const ar = cell.algorithmResults.find(a => a.algorithmId === algorithmId);
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

/** Get a cell result by name from a benchmark. */
export function findCell(
  benchmark: LibraryBenchmark,
  cellName: string,
): CellBenchmarkResult | null {
  return benchmark.cellResults.find((c) => c.cellName === cellName) ?? null;
}

/** Get algorithm result for a specific cell + algorithm. */
export function findAlgoResult(
  cell: CellBenchmarkResult,
  algoId: string,
): AlgorithmCellResult | null {
  return cell.algorithmResults.find((r) => r.algorithmId === algoId) ?? null;
}

/**
 * Compute the set of cells that both algorithms completed successfully.
 * Returns sorted array of cell names that have completed status for both algoIds.
 */
export function commonCompletedCells(
  cellResults: CellBenchmarkResult[],
  algoIdA: string,
  algoIdB: string,
): CellBenchmarkResult[] {
  return cellResults.filter((cr) => {
    const a = findAlgoResult(cr, algoIdA);
    const b = findAlgoResult(cr, algoIdB);
    return a?.status === "completed" && b?.status === "completed";
  });
}

/**
 * Compute non-dominated (Pareto) front.
 * A solution dominates another if it is >= in ALL objectives AND > in at least one.
 * Objectives with higherBetter=true: higher = better; false: lower = better.
 */
export function buildNonDominatedPareto<T>(
  solutions: T[],
  objectives: { key: keyof T; higherBetter: boolean }[],
): T[] {
  return solutions.filter((s, i) => {
    for (let j = 0; j < solutions.length; j++) {
      if (i === j) continue;
      const other = solutions[j];
      let dominates = true;
      let strictlyBetter = false;
      for (const obj of objectives) {
        const a = s[obj.key] as number;
        const b = other[obj.key] as number;
        if (obj.higherBetter) {
          if (b < a) { dominates = false; break; }
          if (b > a) strictlyBetter = true;
        } else {
          if (b > a) { dominates = false; break; }
          if (b < a) strictlyBetter = true;
        }
      }
      if (dominates && strictlyBetter) return false;
    }
    return true;
  });
}

/** Compute Δ% = (compare - baseline) / |baseline| * 100, handling zero. */
export function deltaPct(compare: number, baseline: number): number | null {
  if (baseline === 0 || !isFinite(baseline)) return null;
  return +(((compare - baseline) / Math.abs(baseline)) * 100).toFixed(1);
}

/** PLACEHOLDER tag for layout previews. */
export const PLACEHOLDER_TAG = "PLACEHOLDER";
