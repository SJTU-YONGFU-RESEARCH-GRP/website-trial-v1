/* ==================================================================
 *  normalizeLegacyExpansion.ts (goal.md §21)
 * ================================================================== */

import type {
  ArtifactRef,
  Provenance,
  ToolExecutionResult,
} from "./contracts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeLegacyExpansionManifest(raw: any): {
  executions: ToolExecutionResult[];
  artifacts: Record<string, ArtifactRef>;
} {
  const provenance: Provenance = {
    origin: "existing-tool-output",
    sourceRepo: "spice_model_expansion",
  };

  const executions: ToolExecutionResult[] = [];
  const artifacts: Record<string, ArtifactRef> = {};

  const runs = raw?.runs ?? raw?.expansions ?? raw?.results ?? [];
  for (const run of runs ?? []) {
    const execId = run?.executionId ?? run?.id ?? `expansion-${Math.random().toString(36).slice(2, 8)}`;

    const runArtifacts = run?.artifacts ?? run?.files ?? [];
    const artifactIds: string[] = [];
    for (const a of runArtifacts ?? []) {
      const aId = `${execId}-${a.name ?? a.filename ?? "artifact"}`;
      artifacts[aId] = {
        artifactId: aId,
        name: a.name ?? a.filename ?? "artifact",
        toolId: "expansion",
        kind: normalizeExpansionArtifactKind(a.kind ?? a.type),
        format: a.format ?? "unknown",
        sizeBytes: coerceToNullNum(a.sizeBytes ?? a.size),
        hash: a.hash ?? a.sha256 ?? null,
        fetchUrl: a.url ?? a.path ?? null,
        visibility: "public",
        provenance: { ...provenance },
      };
      artifactIds.push(aId);
    }

    const execution: ToolExecutionResult = {
      executionId: execId,
      toolId: "expansion",
      status: normalizeExecStatus(run?.status),
      inputModelIds: run?.inputModelIds ?? run?.inputs ?? [],
      outputModelIds: run?.outputModelIds ?? run?.outputs ?? [],
      metrics: {
        sourceTT: run?.sourceTT ?? run?.sourceModel ?? null,
        nSigma: run?.nSigma ?? run?.n_sigma ?? 3,
        devices: run?.devices ?? run?.deviceCount ?? 0,
        coverage: run?.coverage ?? null,
        mcSamples: run?.mcSamples ?? run?.monteCarloSamples ?? 0,
        distribution: run?.distribution ?? "normal",
        seed: run?.seed ?? null,
        perCornerMetrics: run?.perCornerMetrics ?? run?.cornerMetrics ?? null,
        ...(run?.metrics ?? {}),
      },
      artifactIds,
      warnings: run?.warnings ?? [],
      errors: run?.errors ?? [],
      invocationId: execId,
      provenance: { ...provenance },
    };

    executions.push(execution);
  }

  return { executions, artifacts };
}

function normalizeExpansionArtifactKind(
  kind: unknown,
): "model" | "dataset" | "plot" | "report" | "log" | "netlist" | "metadata" | "other" {
  const k = String(kind ?? "").toLowerCase();
  if (k === "model" || k === "spice" || k === "lib" || k === "sp") return "model";
  if (k === "dataset" || k === "csv") return "dataset";
  if (k === "plot" || k === "png" || k === "svg") return "plot";
  if (k === "report" || k === "md" || k === "summary") return "report";
  if (k === "log" || k === "txt") return "log";
  if (k === "metadata" || k === "json") return "metadata";
  return "other";
}

function normalizeExecStatus(status: unknown): "completed" | "partial" | "failed" | "unavailable" {
  const s = String(status ?? "").toLowerCase();
  if (s === "completed" || s === "success" || s === "succeeded" || s === "pass") return "completed";
  if (s === "partial") return "partial";
  if (s === "failed" || s === "fail" || s === "error") return "failed";
  return "unavailable";
}

function coerceToNullNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return null;
  return n;
}
