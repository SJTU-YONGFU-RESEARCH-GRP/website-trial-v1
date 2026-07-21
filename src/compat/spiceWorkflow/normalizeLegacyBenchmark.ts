/* ==================================================================
 *  normalizeLegacyBenchmark.ts (goal.md §21)
 *
 *  Maps the existing generatedSpiceBenchmarkManifest into the unified
 *  WorkflowScenario / DomainBenchmarkResult contracts.
 * ================================================================== */

import type {
  DomainBenchmarkResult,
  ArtifactRef,
  Provenance,
  SimulatorId,
  AnalysisDomain,
} from "./contracts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeLegacyBenchmarkManifest(raw: any): {
  results: DomainBenchmarkResult[];
  artifacts: Record<string, ArtifactRef>;
} {
  const provenance: Provenance = {
    origin: "existing-tool-output",
    sourceRepo: "spice_model_benchmark",
  };

  const results: DomainBenchmarkResult[] = [];
  const artifacts: Record<string, ArtifactRef> = {};

  // Extract runs from legacy manifest structure
  const runs = raw?.runs ?? raw?.benchmarks ?? [];
  for (const run of runs ?? []) {
    const modelId = String(run?.model ?? run?.modelId ?? "unknown");
    const simulator = normalizeSimulator(run?.simulator);
    const runId = run?.runId ?? run?.name ?? `${modelId}-${simulator}`;

    for (const domain of (run?.domains ?? run?.analyses ?? [])) {
      const domainName = normalizeDomain(domain?.domain ?? domain?.name ?? domain);

      const result: DomainBenchmarkResult = {
        resultId: `${runId}-${domainName}`,
        modelId,
        simulator,
        simulatorVersion: run?.simulatorVersion ?? null,
        domain: domainName,
        status: normalizeStatus(domain?.status ?? run?.status),
        resources: {
          wallTimeMs: coerceToNull(domain?.wallTimeMs ?? domain?.elapsedMs ?? run?.elapsedMs),
          peakRssMB: coerceToNull(domain?.peakRssMB ?? domain?.memoryMB ?? run?.peakRssMB),
          source: provenance.origin,
        },
        keyMetrics: domain?.keyMetrics ?? domain?.metrics ?? {},
        datasetArtifactIds: [],
        plotArtifactIds: [],
        provenance: { ...provenance },
      };

      // Map dataset artifacts
      for (const ds of domain?.datasets ?? domain?.data ?? []) {
        const aId = `${runId}-ds-${ds.name ?? ds.filename ?? "data"}`;
        artifacts[aId] = {
          artifactId: aId,
          name: ds.name ?? ds.filename ?? "dataset",
          toolId: "benchmark",
          modelId,
          domain: domainName,
          kind: "dataset",
          format: ds.format ?? "csv",
          sizeBytes: coerceToNull(ds.sizeBytes ?? ds.size),
          hash: ds.hash ?? ds.sha256 ?? null,
          fetchUrl: ds.url ?? ds.path ?? null,
          visibility: "public",
          provenance: { ...provenance },
        };
        result.datasetArtifactIds.push(aId);
      }

      // Map plot artifacts
      for (const plot of domain?.plots ?? run?.plots ?? []) {
        const pId = `${runId}-plot-${plot.name ?? plot.filename ?? "plot"}`;
        artifacts[pId] = {
          artifactId: pId,
          name: plot.name ?? plot.filename ?? "plot",
          toolId: "benchmark",
          modelId,
          domain: domainName,
          kind: "plot",
          format: plot.format ?? "png",
          sizeBytes: coerceToNull(plot.sizeBytes ?? plot.size),
          hash: plot.hash ?? null,
          displayUrl: plot.url ?? plot.path ?? null,
          fetchUrl: plot.url ?? plot.path ?? null,
          visibility: "public",
          provenance: { ...provenance },
        };
        result.plotArtifactIds.push(pId);
      }

      results.push(result);
    }
  }

  // Map top-level artifacts
  const topArtifacts = raw?.artifacts ?? raw?.files ?? [];
  for (const a of topArtifacts ?? []) {
    const aId = `benchmark-artifact-${a.name ?? a.filename ?? "file"}`;
    artifacts[aId] = {
      artifactId: aId,
      name: a.name ?? a.filename ?? "artifact",
      toolId: "benchmark",
      kind: normalizeArtifactKind(a.kind ?? a.type),
      format: a.format ?? "unknown",
      sizeBytes: coerceToNull(a.sizeBytes ?? a.size),
      hash: a.hash ?? a.sha256 ?? null,
      fetchUrl: a.url ?? a.path ?? null,
      visibility: "public",
      provenance: { ...provenance },
    };
  }

  return { results, artifacts };
}

/* ─── Normalizers ─── */

function normalizeSimulator(sim: unknown): SimulatorId {
  const s = String(sim ?? "").toLowerCase();
  if (s.includes("spectre")) return "spectre";
  if (s.includes("hspice")) return "hspice";
  return "ngspice";
}

function normalizeDomain(domain: unknown): AnalysisDomain {
  const d = String(domain ?? "").toLowerCase();
  if (d.includes("ac")) return "ac";
  if (d.includes("tran")) return "transient";
  if (d.includes("noise")) return "noise";
  return "dc";
}

function normalizeStatus(status: unknown): "pass" | "fail" | "partial" | "unavailable" {
  const s = String(status ?? "").toLowerCase();
  if (s === "pass" || s === "passed" || s === "success") return "pass";
  if (s === "fail" || s === "failed" || s === "error") return "fail";
  if (s === "partial") return "partial";
  return "unavailable";
}

function normalizeArtifactKind(
  kind: unknown,
): "model" | "dataset" | "plot" | "report" | "log" | "netlist" | "metadata" | "other" {
  const k = String(kind ?? "").toLowerCase();
  if (k === "model" || k === "spice" || k === "lib") return "model";
  if (k === "dataset" || k === "data" || k === "csv") return "dataset";
  if (k === "plot" || k === "png" || k === "svg" || k === "image") return "plot";
  if (k === "report" || k === "md" || k === "markdown") return "report";
  if (k === "log" || k === "txt") return "log";
  if (k === "netlist" || k === "cir" || k === "sp") return "netlist";
  if (k === "metadata" || k === "json") return "metadata";
  return "other";
}

function coerceToNull(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return null;
  return n;
}
