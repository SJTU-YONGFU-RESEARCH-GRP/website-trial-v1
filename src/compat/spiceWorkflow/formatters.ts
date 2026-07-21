/* ==================================================================
 *  Formatters (goal.md §19.1–§19.2)
 *
 *  Pure display helpers.  Data-layer values are always numeric or
 *  null; these functions turn them into human-readable strings.
 * ================================================================== */

import type { DataOrigin } from "./contracts";

/* ─── Origin badge text ─── */
export function formatOrigin(origin: DataOrigin): string {
  switch (origin) {
    case "existing-tool-output":
      return "Existing output";
    case "derived-static-demo":
      return "Derived demo";
    case "synthetic-demo":
      return "Synthetic demo";
    case "user-local":
      return "Local only";
    case "unavailable":
      return "Not available";
  }
}

/* ─── Numeric formatters ─── */
export function formatMs(ms: number | null): string {
  if (ms === null) return "Not available";
  if (ms < 1_000) return `${ms.toFixed(0)} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

export function formatMB(mb: number | null): string {
  if (mb === null) return "Not available";
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "Not available";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null) return "Not available";
  return `${(ratio * 100).toFixed(2)}%`;
}

export function formatDelta(
  baseline: number | null,
  candidate: number | null,
): { absolute: string; percent: string } {
  if (baseline === null || candidate === null) {
    return { absolute: "N/A", percent: "N/A" };
  }
  const delta = candidate - baseline;
  const pct = baseline !== 0 ? ((delta / baseline) * 100).toFixed(1) : "N/A";
  return {
    absolute: delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2),
    percent: pct === "N/A" ? "N/A" : `${delta >= 0 ? "+" : ""}${pct}%`,
  };
}

/* ─── Length-safe filename ─── */
export function truncateFilename(name: string, maxLen = 40): string {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0) {
    const extPart = name.slice(ext);
    const base = name.slice(0, ext);
    return base.slice(0, maxLen - extPart.length - 3) + "..." + extPart;
  }
  return name.slice(0, maxLen - 3) + "...";
}
