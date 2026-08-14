/* ==================================================================
 *  selectors.ts (goal.md §24)
 *
 *  Derived selectors computed from WorkflowScenario + UI state.
 *  Pure functions — no React dependency.
 * ================================================================== */

import type {
  WorkflowScenario,
  ModelArtifact,
  Provenance,
  DomainBenchmarkResult,
  SimulatorId,
  AnalysisDomain,
  ToolId,
} from "../../compat/spiceWorkflow/contracts";
import { DEFAULT_OPERATION_ORDER } from "../../compat/spiceWorkflow/toolCatalog";

/* ─── Model selectors ─── */
export function getModelById(
  scenario: WorkflowScenario | null,
  modelId: string | null,
): ModelArtifact | undefined {
  if (!scenario || !modelId) return undefined;
  return scenario.models[modelId];
}

export function getDefaultInputModel(scenario: WorkflowScenario): ModelArtifact | undefined {
  return scenario.models[scenario.defaultInputModelId];
}

export function getDefaultCandidateModel(scenario: WorkflowScenario): ModelArtifact | undefined {
  return scenario.models[scenario.defaultCandidateModelId];
}

/** Linearize model lineage from a leaf to root. */
export function getModelLineage(
  scenario: WorkflowScenario,
  leafModelId: string,
): ModelArtifact[] {
  const lineage: ModelArtifact[] = [];
  let current: ModelArtifact | undefined = scenario.models[leafModelId];
  while (current) {
    lineage.push(current);
    current = current.parentModelId
      ? scenario.models[current.parentModelId]
      : undefined;
  }
  return lineage.reverse();
}

/** All persistent models in a scenario (exclude temporary/compatibility). */
export function getPersistentModels(scenario: WorkflowScenario): ModelArtifact[] {
  return Object.values(scenario.models).filter((m) => m.persistent && !m.temporary);
}

/** All selectable models for comparison. */
export function getSelectableModels(scenario: WorkflowScenario): ModelArtifact[] {
  return Object.values(scenario.models).filter((m) => !m.temporary);
}

/* ─── Result selectors ─── */
export function getResultsForModel(
  scenario: WorkflowScenario,
  modelId: string,
): DomainBenchmarkResult[] {
  return scenario.benchmarkResults.filter((r) => r.modelId === modelId);
}

export function getResultsForSimulator(
  scenario: WorkflowScenario,
  simulator: SimulatorId,
): DomainBenchmarkResult[] {
  return scenario.benchmarkResults.filter((r) => r.simulator === simulator);
}

export function getResultForCell(
  scenario: WorkflowScenario,
  modelId: string,
  simulator: SimulatorId,
  domain: AnalysisDomain,
): DomainBenchmarkResult | undefined {
  return scenario.benchmarkResults.find(
    (r) => r.modelId === modelId && r.simulator === simulator && r.domain === domain,
  );
}

/** Aggregate per-simulator status summary. */
export function getSimulatorSummary(
  results: DomainBenchmarkResult[],
  simulator: SimulatorId,
): {
  total: number;
  pass: number;
  fail: number;
  partial: number;
  unavailable: number;
  totalTimeMs: number | null;
  peakMemoryMB: number | null;
} {
  const simResults = results.filter((r) => r.simulator === simulator);
  const summary = {
    total: simResults.length,
    pass: 0,
    fail: 0,
    partial: 0,
    unavailable: 0,
    totalTimeMs: null as number | null,
    peakMemoryMB: null as number | null,
  };

  for (const r of simResults) {
    switch (r.status) {
      case "pass":
        summary.pass++;
        break;
      case "fail":
        summary.fail++;
        break;
      case "partial":
        summary.partial++;
        break;
      case "unavailable":
        summary.unavailable++;
        break;
    }
    if (r.resources.wallTimeMs !== null) {
      summary.totalTimeMs = (summary.totalTimeMs ?? 0) + r.resources.wallTimeMs;
    }
    if (r.resources.peakRssMB !== null) {
      summary.peakMemoryMB =
        summary.peakMemoryMB === null
          ? r.resources.peakRssMB
          : Math.max(summary.peakMemoryMB, r.resources.peakRssMB);
    }
  }

  return summary;
}

/** Compute operation-based pipeline steps for display. */
export function getEffectivePipeline(
  enabledToolIds: Set<ToolId>,
): { toolId: ToolId; label: string; order: number }[] {
  const steps: { toolId: ToolId; label: string; order: number }[] = [];
  let order = 0;

  for (const toolId of DEFAULT_OPERATION_ORDER) {
    if (enabledToolIds.has(toolId)) {
      steps.push({ toolId, label: getToolLabel(toolId), order: order++ });
    }
  }

  // Benchmark always comes last
  steps.push({ toolId: "benchmark", label: "Benchmark", order });

  return steps;
}

function getToolLabel(toolId: ToolId): string {
  switch (toolId) {
    case "translator":
      return "Convert";
    case "fitting":
      return "Calibrate";
    case "reduction":
      return "Reduce";
    case "expansion":
      return "Expand";
    case "benchmark":
      return "Benchmark";
  }
}

/* ─── Cross-model comparison helpers ─── */
export interface ModelComparisonKPI {
  label: string;
  baseline: number | null;
  candidate: number | null;
  absoluteDelta: string;
  percentDelta: string;
  lowerIsBetter: boolean | null;
}

export function computeModelComparisonKPIs(
  baseline: ModelArtifact,
  candidate: ModelArtifact,
  baselineResults: DomainBenchmarkResult[],
  candidateResults: DomainBenchmarkResult[],
): ModelComparisonKPI[] {
  const baselineTime = sumTime(baselineResults);
  const candidateTime = sumTime(candidateResults);
  const baselineMem = maxMem(baselineResults);
  const candidateMem = maxMem(candidateResults);
  const baselinePass = passRate(baselineResults);
  const candidatePass = passRate(candidateResults);

  return [
    {
      label: "Parameter Count",
      baseline: baseline.parameterCount,
      candidate: candidate.parameterCount,
      absoluteDelta: deltaAbs(baseline.parameterCount, candidate.parameterCount),
      percentDelta: deltaPct(baseline.parameterCount, candidate.parameterCount),
      lowerIsBetter: true,
    },
    {
      label: "File Size",
      baseline: baseline.byteSize,
      candidate: candidate.byteSize,
      absoluteDelta: deltaAbs(baseline.byteSize, candidate.byteSize),
      percentDelta: deltaPct(baseline.byteSize, candidate.byteSize),
      lowerIsBetter: true,
    },
    {
      label: "Total Time",
      baseline: baselineTime,
      candidate: candidateTime,
      absoluteDelta: deltaAbs(baselineTime, candidateTime),
      percentDelta: deltaPct(baselineTime, candidateTime),
      lowerIsBetter: true,
    },
    {
      label: "Peak Memory",
      baseline: baselineMem,
      candidate: candidateMem,
      absoluteDelta: deltaAbs(baselineMem, candidateMem),
      percentDelta: deltaPct(baselineMem, candidateMem),
      lowerIsBetter: true,
    },
    {
      label: "Verification Pass Rate",
      baseline: baselinePass,
      candidate: candidatePass,
      absoluteDelta: deltaAbs(baselinePass, candidatePass),
      percentDelta: deltaPct(baselinePass, candidatePass),
      lowerIsBetter: false,
    },
  ];
}

function sumTime(results: DomainBenchmarkResult[]): number | null {
  let sum = 0;
  let hasValue = false;
  for (const r of results) {
    if (r.resources.wallTimeMs !== null) {
      sum += r.resources.wallTimeMs;
      hasValue = true;
    }
  }
  return hasValue ? sum : null;
}

function maxMem(results: DomainBenchmarkResult[]): number | null {
  let max: number | null = null;
  for (const r of results) {
    if (r.resources.peakRssMB !== null) {
      max = max === null ? r.resources.peakRssMB : Math.max(max, r.resources.peakRssMB);
    }
  }
  return max;
}

function passRate(results: DomainBenchmarkResult[]): number | null {
  if (results.length === 0) return null;
  const passed = results.filter((r) => r.status === "pass").length;
  return passed / results.length;
}

function deltaAbs(a: number | null, b: number | null): string {
  if (a === null || b === null) return "N/A";
  const d = b - a;
  return d >= 0 ? `+${d.toFixed(2)}` : d.toFixed(2);
}

function deltaPct(a: number | null, b: number | null): string {
  if (a === null || b === null || a === 0) return "N/A";
  const pct = ((b - a) / a) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/* ─── Benchmark Plot Resolution (goal2.md §6.5) ─── */

export interface ResolvedBenchmarkPlot {
  artifactId: string;
  comparisonKey: string;
  title: string;
  displayUrl: string;
  downloadUrl: string | null;
  modelId: string;
  simulator: SimulatorId;
  domain: AnalysisDomain;
  provenance: Provenance;
}

export interface BenchmarkPlotPair {
  comparisonKey: string;
  title: string;
  simulator: SimulatorId;
  domain: AnalysisDomain;
  baseline: ResolvedBenchmarkPlot | null;
  candidate: ResolvedBenchmarkPlot | null;
}

import { canonicalizeBenchmarkPlotKey, PLOT_CATALOG } from "./benchmarkPlotCatalog";

/** Resolve all plot artifacts from benchmark results for a given model. */
function resolveModelPlots(
  scenario: WorkflowScenario,
  modelId: string,
): ResolvedBenchmarkPlot[] {
  const plots: ResolvedBenchmarkPlot[] = [];
  const results = scenario.benchmarkResults.filter((r) => r.modelId === modelId);

  for (const r of results) {
    for (const aId of r.plotArtifactIds) {
      const artifact = scenario.artifacts[aId];
      if (!artifact || artifact.kind !== "plot") continue;
      if (!artifact.displayUrl) continue;

      const comparisonKey = artifact.comparisonKey
        ?? canonicalizeBenchmarkPlotKey(artifact.name, artifact.domain ?? r.domain);

      const title = artifact.title
        ?? PLOT_CATALOG.find((e) => e.comparisonKey === comparisonKey)?.title
        ?? artifact.name;

      plots.push({
        artifactId: artifact.artifactId,
        comparisonKey,
        title,
        displayUrl: artifact.displayUrl,
        downloadUrl: artifact.fetchUrl ?? null,
        modelId,
        simulator: r.simulator,
        domain: r.domain,
        provenance: artifact.provenance,
      });
    }
  }

  return plots;
}

/** Pair baseline and candidate plots by (simulator, domain, comparisonKey). */
export function resolveBenchmarkPlotPairs(
  scenario: WorkflowScenario,
  baselineModelId: string | null,
  candidateModelId: string | null,
  selectedSimulators: SimulatorId[],
  selectedDomains: AnalysisDomain[],
): BenchmarkPlotPair[] {
  if (!baselineModelId || !candidateModelId) return [];

  const baselinePlots = resolveModelPlots(scenario, baselineModelId);
  const candidatePlots = resolveModelPlots(scenario, candidateModelId);

  const baselineByKey = new Map<string, ResolvedBenchmarkPlot>();
  for (const p of baselinePlots) {
    const key = `${p.simulator}|${p.domain}|${p.comparisonKey}`;
    baselineByKey.set(key, p);
  }

  const candidateByKey = new Map<string, ResolvedBenchmarkPlot>();
  for (const p of candidatePlots) {
    const key = `${p.simulator}|${p.domain}|${p.comparisonKey}`;
    candidateByKey.set(key, p);
  }

  const pairs: BenchmarkPlotPair[] = [];
  const seenKeys = new Set<string>();

  // Prioritize catalog order
  for (const entry of PLOT_CATALOG) {
    if (!selectedDomains.includes(entry.domain)) continue;
    for (const sim of selectedSimulators) {
      const key = `${sim}|${entry.domain}|${entry.comparisonKey}`;
      if (seenKeys.has(key)) continue;
      const baseline = baselineByKey.get(key) ?? null;
      const candidate = candidateByKey.get(key) ?? null;
      if (baseline || candidate) {
        seenKeys.add(key);
        pairs.push({ comparisonKey: entry.comparisonKey, title: entry.title, simulator: sim, domain: entry.domain, baseline, candidate });
      }
    }
  }

  // Add any remaining unmatched
  for (const [key, baseline] of baselineByKey) {
    if (seenKeys.has(key)) continue;
    const [sim, domain, compKey] = key.split("|");
    const candidate = candidateByKey.get(key) ?? null;
    if (!selectedSimulators.includes(sim as SimulatorId) || !selectedDomains.includes(domain as AnalysisDomain)) continue;
    seenKeys.add(key);
    pairs.push({ comparisonKey: compKey, title: baseline.title, simulator: sim as SimulatorId, domain: domain as AnalysisDomain, baseline, candidate });
  }
  for (const [key, candidate] of candidateByKey) {
    if (seenKeys.has(key)) continue;
    const [sim, domain, compKey] = key.split("|");
    if (!selectedSimulators.includes(sim as SimulatorId) || !selectedDomains.includes(domain as AnalysisDomain)) continue;
    seenKeys.add(key);
    pairs.push({ comparisonKey: compKey, title: candidate.title, simulator: sim as SimulatorId, domain: domain as AnalysisDomain, baseline: null, candidate });
  }

  return pairs;
}

/* ─── Multi-Model Plot Resolution (goal3.md) ─── */

export interface MultiModelPlotGroup {
  comparisonKey: string;
  title: string;
  simulator: SimulatorId;
  domain: AnalysisDomain;
  /** modelId → plot (null if unavailable for that model) */
  plots: Map<string, ResolvedBenchmarkPlot | null>;
}

/** Resolve plots for N models, grouped by (domain, comparisonKey, simulator). */
export function resolveMultiModelPlots(
  scenario: WorkflowScenario,
  modelIds: string[],
  selectedSimulators: SimulatorId[],
  selectedDomains: AnalysisDomain[],
): MultiModelPlotGroup[] {
  if (modelIds.length === 0 || selectedSimulators.length === 0 || selectedDomains.length === 0) {
    return [];
  }

  // Resolve plots for each model → keyed by `${sim}|${domain}|${comparisonKey}`
  const modelPlotMaps = new Map<string, Map<string, ResolvedBenchmarkPlot>>();
  for (const mid of modelIds) {
    const plots = resolveModelPlots(scenario, mid);
    const map = new Map<string, ResolvedBenchmarkPlot>();
    for (const p of plots) {
      map.set(`${p.simulator}|${p.domain}|${p.comparisonKey}`, p);
    }
    modelPlotMaps.set(mid, map);
  }

  const groups: MultiModelPlotGroup[] = [];
  const seenKeys = new Set<string>();

  // Prioritize catalog order
  for (const entry of PLOT_CATALOG) {
    if (!selectedDomains.includes(entry.domain)) continue;
    for (const sim of selectedSimulators) {
      const key = `${sim}|${entry.domain}|${entry.comparisonKey}`;
      if (seenKeys.has(key)) continue;
      const plots = new Map<string, ResolvedBenchmarkPlot | null>();
      let hasAny = false;
      for (const mid of modelIds) {
        const p = modelPlotMaps.get(mid)?.get(key) ?? null;
        plots.set(mid, p);
        if (p) hasAny = true;
      }
      if (hasAny) {
        seenKeys.add(key);
        groups.push({ comparisonKey: entry.comparisonKey, title: entry.title, simulator: sim, domain: entry.domain, plots });
      }
    }
  }

  // Add any remaining unmatched
  for (const [mid, plotMap] of modelPlotMaps) {
    for (const [key, plot] of plotMap) {
      if (seenKeys.has(key)) continue;
      const [sim, domain, compKey] = key.split("|");
      if (!selectedSimulators.includes(sim as SimulatorId) || !selectedDomains.includes(domain as AnalysisDomain)) continue;
      seenKeys.add(key);
      const plots = new Map<string, ResolvedBenchmarkPlot | null>();
      for (const mid2 of modelIds) {
        plots.set(mid2, mid2 === mid ? plot : (modelPlotMaps.get(mid2)?.get(key) ?? null));
      }
      groups.push({ comparisonKey: compKey, title: plot.title, simulator: sim as SimulatorId, domain: domain as AnalysisDomain, plots });
    }
  }

  return groups;
}
