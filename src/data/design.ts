/** Synthetic design-metric rows for Pareto / scaling charts (not real silicon). */

import type { DesignRow } from "./designTypes";
import {
  DESIGN_FAMILIES,
  DESIGN_ROWS,
  type DesignFamilyId,
} from "./generatedDesignRows";

export type { DesignRow } from "./designTypes";
export type { DesignFamilyId } from "./generatedDesignRows";
export { DESIGN_FAMILIES, DESIGN_ROWS };

/** Rows whose `designFamily` matches (empty if field missing). */
export function designRowsForFamily(
  rows: readonly DesignRow[],
  family: DesignFamilyId,
): DesignRow[] {
  return rows.filter((r) => r.designFamily === family);
}

/** Architectures in first-seen order within the given row set. */
export function designArchOrderForRows(rows: readonly DesignRow[]): string[] {
  return uniqueArchitecturesInOrder(rows);
}

/** Sorted unique bit widths in the given row set. */
export function designBitWidthsForRows(rows: readonly DesignRow[]): number[] {
  return uniqueBitWidthsSorted(rows);
}

/** First-seen order of architectures across combined JSON datasets. */
function uniqueArchitecturesInOrder(rows: readonly DesignRow[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of rows) {
    if (!seen.has(r.architecture)) {
      seen.add(r.architecture);
      order.push(r.architecture);
    }
  }
  return order;
}

/** Sorted unique bit widths present in the data. */
function uniqueBitWidthsSorted(rows: readonly DesignRow[]): number[] {
  return [...new Set(rows.map((r) => r.bitWidth))].sort((a, b) => a - b);
}

/** Named PDKs sort after numeric nm labels. */
const PDK_ORDER_TAIL = new Set(["gf180", "sky130", "ihpsg13g2"]);

function uniqueProcessNodesSorted(rows: readonly DesignRow[]): string[] {
  const labels = [...new Set(rows.map((r) => r.processNode))];
  const numeric = labels.filter((l) => !PDK_ORDER_TAIL.has(l));
  const pdks = labels.filter((l) => PDK_ORDER_TAIL.has(l));
  numeric.sort((a, b) => {
    const na = parseInt(a.replace(/nm$/i, ""), 10);
    const nb = parseInt(b.replace(/nm$/i, ""), 10);
    return na - nb;
  });
  pdks.sort();
  return [...numeric, ...pdks];
}

/** Default process slice for 2D grids that need a single corner. */
export const DEFAULT_PROCESS_NODE = "7nm";

/** Rows matching one process node (or PDK label). */
export function designRowsForProcess(
  rows: readonly DesignRow[],
  processNode: string = DEFAULT_PROCESS_NODE,
): DesignRow[] {
  return rows.filter((r) => r.processNode === processNode);
}

/** Single row for (architecture, bit width, process), if present in merged data. */
export function findDesignRow(
  architecture: string,
  bitWidth: number,
  processNode: string,
): DesignRow | undefined {
  return DESIGN_ROWS.find(
    (r) =>
      r.architecture === architecture &&
      r.bitWidth === bitWidth &&
      r.processNode === processNode,
  );
}

/** Explicit colors where helpful; other architectures get a stable hash color. */
const colors: Record<string, string> = {
  rca: "rgb(0, 0, 255)",
  cla: "rgb(0, 128, 0)",
  carry_skip: "rgb(0, 139, 139)",
  carry_select: "rgb(255, 140, 0)",
  ling: "rgb(70, 130, 180)",
  cell_majority: "rgb(255, 0, 0)",
  tmr_vote: "rgb(128, 0, 128)",
  cascaded_vote: "rgb(199, 21, 133)",
  weighted_vote: "rgb(220, 20, 60)",
  tree_vote: "rgb(178, 34, 34)",
  iterative_cordic: "rgb(46, 139, 87)",
  pipeline_cordic: "rgb(25, 25, 112)",
  unfolded_cordic: "rgb(72, 61, 139)",
  bit_serial_cordic: "rgb(105, 105, 105)",
  merged_alu_cordic: "rgb(0, 100, 0)",
};

function hashHue(arch: string): number {
  let h = 0;
  for (let i = 0; i < arch.length; i += 1) {
    h = (h * 31 + arch.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function architectureColor(arch: string): string {
  const known = colors[arch];
  if (known) return known;
  const hue = hashHue(arch);
  return `hsl(${hue}, 55%, 45%)`;
}

/** Stable row order for matrices and grouped bars (first appearance in merged JSON order). */
export const DESIGN_ARCH_ORDER: readonly string[] = uniqueArchitecturesInOrder(DESIGN_ROWS);

export const DESIGN_BIT_WIDTHS: readonly number[] = uniqueBitWidthsSorted(DESIGN_ROWS);

export const DESIGN_PROCESS_NODES: readonly string[] = uniqueProcessNodesSorted(DESIGN_ROWS);

/** Human-readable label for legend / category axes (e.g. `kogge_stone` → Kogge Stone). */
export function formatArchLabel(arch: string): string {
  return arch
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Rows for a single bit width and process, ordered by `archOrder`. */
export function rowsByBitWidthOrderedIn(
  familyRows: readonly DesignRow[],
  archOrder: readonly string[],
  bitWidth: number,
  processNode: string = DEFAULT_PROCESS_NODE,
): DesignRow[] {
  const slice = designRowsForProcess(familyRows, processNode);
  const byArch = new Map(
    slice.filter((r) => r.bitWidth === bitWidth).map((r) => [r.architecture, r]),
  );
  return archOrder.map((a) => byArch.get(a)).filter((r): r is DesignRow => r != null);
}

/** Rows for a single bit width and process, ordered by `DESIGN_ARCH_ORDER` (all families). */
export function rowsByBitWidthOrdered(
  bitWidth: number,
  processNode: string = DEFAULT_PROCESS_NODE,
): DesignRow[] {
  return rowsByBitWidthOrderedIn(DESIGN_ROWS, DESIGN_ARCH_ORDER, bitWidth, processNode);
}

/**
 * Fmax (MHz) grid: rows = architectures (`DESIGN_ARCH_ORDER`), columns = `DESIGN_BIT_WIDTHS`.
 */
export function fmaxMhzHeatmapGrid(
  processNode: string = DEFAULT_PROCESS_NODE,
): { z: number[][]; colLabels: string[]; rowLabels: string[] } {
  const slice = designRowsForProcess(DESIGN_ROWS, processNode);
  const z: number[][] = DESIGN_ARCH_ORDER.map((arch) =>
    DESIGN_BIT_WIDTHS.map((bw) => {
      const row = slice.find((r) => r.architecture === arch && r.bitWidth === bw);
      return row?.fmaxMhz ?? 0;
    }),
  );
  return {
    z,
    colLabels: DESIGN_BIT_WIDTHS.map((bw) => `${bw}`),
    rowLabels: DESIGN_ARCH_ORDER.map(formatArchLabel),
  };
}

/** Root label shared by hierarchy charts (treemap / sunburst). */
export const DESIGN_ROOT_LABEL = "Synthetic design";

/**
 * Plotly treemap / sunburst flat encoding: root + one leaf per design.
 * Values default to die area (µm²); use `powerMw` for power-weighted tiles.
 */
export function designTreemapFlat(
  valueKey: "areaUm2" | "powerMw" = "areaUm2",
  processNode: string = DEFAULT_PROCESS_NODE,
): { labels: string[]; parents: string[]; values: number[] } {
  const slice = designRowsForProcess(DESIGN_ROWS, processNode);
  const root = DESIGN_ROOT_LABEL;
  const leafLabels = slice.map(
    (r) => `${formatArchLabel(r.architecture)} · ${r.bitWidth}b`,
  );
  const labels = [root, ...leafLabels];
  const parents = ["", ...slice.map(() => root)];
  const sum = slice.reduce((s, r) => s + r[valueKey], 0);
  const values = [sum, ...slice.map((r) => r[valueKey])];
  return { labels, parents, values };
}

/**
 * Synthetic whiskers around 64b power for boxplot examples (illustrative only).
 */
export function syntheticPowerBoxByArch64(
  processNode: string = DEFAULT_PROCESS_NODE,
): {
  categories: string[];
  stats: [number, number, number, number, number][];
} {
  const rows = rowsByBitWidthOrdered(64, processNode);
  return {
    categories: rows.map((r) => formatArchLabel(r.architecture)),
    stats: rows.map((r) => {
      const m = r.powerMw;
      return [m * 0.82, m * 0.92, m, m * 1.08, m * 1.18] as [
        number,
        number,
        number,
        number,
        number,
      ];
    }),
  };
}

/** Normalized 0–100 radar axes @ 64b — Fmax, power, area. */
export function radarMetrics64Normalized(
  processNode: string = DEFAULT_PROCESS_NODE,
): {
  indicators: { name: string; max: number }[];
  series: { name: string; value: [number, number, number]; color: string }[];
} {
  const rows = rowsByBitWidthOrdered(64, processNode);
  const maxF = Math.max(...rows.map((r) => r.fmaxMhz));
  const maxP = Math.max(...rows.map((r) => r.powerMw));
  const maxA = Math.max(...rows.map((r) => r.areaUm2));
  return {
    indicators: [
      { name: "Fmax (%)", max: 100 },
      { name: "Power (%)", max: 100 },
      { name: "Area (%)", max: 100 },
    ],
    series: rows.map((r) => ({
      name: formatArchLabel(r.architecture),
      value: [
        (r.fmaxMhz / maxF) * 100,
        (r.powerMw / maxP) * 100,
        (r.areaUm2 / maxA) * 100,
      ] as [number, number, number],
      color: architectureColor(r.architecture),
    })),
  };
}

/** Funnel stages sorted by Fmax (MHz), for throughput-style analytics charts. */
export function funnelStepsByFmax(processNode: string = DEFAULT_PROCESS_NODE): {
  name: string;
  value: number;
  architecture: string;
}[] {
  return [...designRowsForProcess(DESIGN_ROWS, processNode)]
    .sort((a, b) => b.fmaxMhz - a.fmaxMhz)
    .map((r) => ({
      name: `${formatArchLabel(r.architecture)} ${r.bitWidth}b`,
      value: r.fmaxMhz,
      architecture: r.architecture,
    }));
}
