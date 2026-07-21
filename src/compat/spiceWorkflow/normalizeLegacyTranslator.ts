/* ==================================================================
 *  normalizeLegacyTranslator.ts (goal.md §21)
 * ================================================================== */

import type {
  ArtifactRef,
  Provenance,
  ToolExecutionResult,
} from "./contracts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeLegacyTranslatorManifest(raw: any): {
  executions: ToolExecutionResult[];
  artifacts: Record<string, ArtifactRef>;
} {
  const provenance: Provenance = {
    origin: "existing-tool-output",
    sourceRepo: "new-spice-translator",
  };

  const executions: ToolExecutionResult[] = [];
  const artifacts: Record<string, ArtifactRef> = {};

  const runs = raw?.runs ?? raw?.translations ?? raw?.results ?? [];
  for (const run of runs ?? []) {
    const execId = run?.executionId ?? run?.id ?? `translator-${Math.random().toString(36).slice(2, 8)}`;

    // Map artifacts
    const runArtifacts = run?.artifacts ?? run?.files ?? [];
    const artifactIds: string[] = [];
    for (const a of runArtifacts ?? []) {
      const aId = `${execId}-${a.name ?? a.filename ?? "artifact"}`;
      artifacts[aId] = {
        artifactId: aId,
        name: a.name ?? a.filename ?? "artifact",
        toolId: "translator",
        kind: normalizeTranslatorArtifactKind(a.kind ?? a.type),
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
      toolId: "translator",
      status: normalizeExecStatus(run?.status),
      inputModelIds: run?.inputModelIds ?? run?.inputs ?? [],
      outputModelIds: run?.outputModelIds ?? run?.outputs ?? [],
      metrics: {
        modelsTranslated: run?.modelsTranslated ?? run?.modelCount ?? 0,
        translationStatus: run?.translationStatus ?? run?.status ?? "unknown",
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

function normalizeTranslatorArtifactKind(
  kind: unknown,
): "model" | "dataset" | "plot" | "report" | "log" | "netlist" | "metadata" | "other" {
  const k = String(kind ?? "").toLowerCase();
  if (k === "model" || k === "spice" || k === "lib" || k === "scs") return "model";
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
