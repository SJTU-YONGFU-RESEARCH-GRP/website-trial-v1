/* ==================================================================
 *  normalizeLegacyReduction.ts (goal.md §21)
 * ================================================================== */

import type {
  ArtifactRef,
  Provenance,
  ToolExecutionResult,
} from "./contracts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeLegacyReductionManifest(raw: any): {
  executions: ToolExecutionResult[];
  artifacts: Record<string, ArtifactRef>;
} {
  const provenance: Provenance = {
    origin: "existing-tool-output",
    sourceRepo: "spice_model_reduction",
  };

  const executions: ToolExecutionResult[] = [];
  const artifacts: Record<string, ArtifactRef> = {};

  const runs = raw?.runs ?? raw?.reductions ?? raw?.results ?? [];
  for (const run of runs ?? []) {
    const execId = run?.executionId ?? run?.id ?? `reduction-${Math.random().toString(36).slice(2, 8)}`;

    const runArtifacts = run?.artifacts ?? run?.files ?? [];
    const artifactIds: string[] = [];
    for (const a of runArtifacts ?? []) {
      const aId = `${execId}-${a.name ?? a.filename ?? "artifact"}`;
      artifacts[aId] = {
        artifactId: aId,
        name: a.name ?? a.filename ?? "artifact",
        toolId: "reduction",
        kind: normalizeReductionArtifactKind(a.kind ?? a.type),
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
      toolId: "reduction",
      status: normalizeExecStatus(run?.status),
      inputModelIds: run?.inputModelIds ?? run?.inputs ?? [],
      outputModelIds: run?.outputModelIds ?? run?.outputs ?? [],
      metrics: {
        originalParameterCount: run?.originalParameterCount ?? run?.originalParams ?? 0,
        reducedParameterCount: run?.reducedParameterCount ?? run?.reducedParams ?? 0,
        reductionRatio: run?.reductionRatio ?? null,
        validationError: run?.validationError ?? run?.error ?? null,
        tolerance: run?.tolerance ?? run?.errorTolerance ?? null,
        withinTolerance: run?.withinTolerance ?? null,
        runtime: run?.runtime ?? run?.elapsedMs ?? null,
        iterations: run?.iterations ?? run?.maxIterations ?? 0,
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

function normalizeReductionArtifactKind(
  kind: unknown,
): "model" | "dataset" | "plot" | "report" | "log" | "netlist" | "metadata" | "other" {
  const k = String(kind ?? "").toLowerCase();
  if (k === "model" || k === "spice" || k === "lib") return "model";
  if (k === "plot" || k === "png" || k === "svg") return "plot";
  if (k === "report" || k === "md" || k === "summary" || k === "json") return "report";
  if (k === "log" || k === "txt") return "log";
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
