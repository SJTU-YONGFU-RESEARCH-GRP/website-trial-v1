/* ==================================================================
 *  Benchmark Adapter (goal.md §20.7)
 *
 *  This adapter builds the benchmark matrix but does NOT launch
 *  simulators.  It normalizes legacy manifests and builds comparison
 *  selector data from unified contracts.
 * ================================================================== */

import type {
  ModelArtifact,
  DomainBenchmarkResult,
  SimulatorId,
  AnalysisDomain,
} from "./contracts";

export interface BenchmarkMatrixRequest {
  models: ModelArtifact[];
  simulators: SimulatorId[];
  domains: AnalysisDomain[];
}

export interface BenchmarkMatrixCell {
  modelId: string;
  simulator: SimulatorId;
  domain: AnalysisDomain;
  required: boolean;
}

export const BENCHMARK_ADAPTER_VERSION = "1.0.0";

/** Build the full model × simulator × domain matrix. */
export function buildBenchmarkMatrix(
  request: BenchmarkMatrixRequest,
): BenchmarkMatrixCell[] {
  const matrix: BenchmarkMatrixCell[] = [];
  for (const model of request.models) {
    for (const sim of request.simulators) {
      for (const domain of request.domains) {
        matrix.push({
          modelId: model.modelId,
          simulator: sim,
          domain,
          required: !model.temporary,
        });
      }
    }
  }
  return matrix;
}

/** Find matching benchmark result for a matrix cell. */
export function findBenchmarkResult(
  cell: BenchmarkMatrixCell,
  results: DomainBenchmarkResult[],
): DomainBenchmarkResult | undefined {
  return results.find(
    (r) =>
      r.modelId === cell.modelId &&
      r.simulator === cell.simulator &&
      r.domain === cell.domain,
  );
}

/** Group results by model for cross-model comparison. */
export function groupResultsByModel(
  results: DomainBenchmarkResult[],
): Map<string, DomainBenchmarkResult[]> {
  const map = new Map<string, DomainBenchmarkResult[]>();
  for (const r of results) {
    const existing = map.get(r.modelId);
    if (existing) {
      existing.push(r);
    } else {
      map.set(r.modelId, [r]);
    }
  }
  return map;
}

/** Group results by simulator for cross-simulator comparison. */
export function groupResultsBySimulator(
  results: DomainBenchmarkResult[],
): Map<SimulatorId, DomainBenchmarkResult[]> {
  const map = new Map<SimulatorId, DomainBenchmarkResult[]>();
  for (const r of results) {
    const existing = map.get(r.simulator);
    if (existing) {
      existing.push(r);
    } else {
      map.set(r.simulator, [r]);
    }
  }
  return map;
}

/** Aggregate resource metrics per simulator across all domains. */
export function aggregateSimulatorResources(
  results: DomainBenchmarkResult[],
  simulator: SimulatorId,
): { totalTimeMs: number | null; maxMemoryMB: number | null } {
  const simResults = results.filter((r) => r.simulator === simulator);
  let totalTimeMs: number | null = null;
  let maxMemoryMB: number | null = null;

  for (const r of simResults) {
    if (r.resources.wallTimeMs !== null) {
      totalTimeMs = (totalTimeMs ?? 0) + r.resources.wallTimeMs;
    }
    if (r.resources.peakRssMB !== null) {
      maxMemoryMB =
        maxMemoryMB === null
          ? r.resources.peakRssMB
          : Math.max(maxMemoryMB, r.resources.peakRssMB);
    }
  }

  return { totalTimeMs, maxMemoryMB };
}
