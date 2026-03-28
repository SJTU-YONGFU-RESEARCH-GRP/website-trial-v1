/**
 * Selectable quantities for 2D Pareto / exploration scatter (numeric or architecture index).
 */

import {
  type AdderDemoRow,
  ADDER_DEMO_ROWS,
  DEMO_ARCH_ORDER,
  DEMO_BIT_WIDTHS,
  formatArchLabel,
  PPA_ROOT_LABEL,
} from "./samplePpa";

export type ScatterAxisMetric = "fmaxMhz" | "powerMw" | "areaUm2" | "bitWidth" | "architecture";

export const SCATTER_AXIS_METRICS: readonly ScatterAxisMetric[] = [
  "fmaxMhz",
  "powerMw",
  "areaUm2",
  "bitWidth",
  "architecture",
] as const;

const META: Record<ScatterAxisMetric, { label: string; unit: string }> = {
  fmaxMhz: { label: "Fmax", unit: "MHz" },
  powerMw: { label: "Power", unit: "mW" },
  areaUm2: { label: "Area", unit: "µm²" },
  bitWidth: { label: "Bit width", unit: "b" },
  architecture: { label: "Architecture", unit: "" },
};

/** Human-readable axis title (axis name on charts). */
export function scatterAxisTitle(metric: ScatterAxisMetric): string {
  const { label, unit } = META[metric];
  return unit ? `${label} (${unit})` : label;
}

/** Short label for HTML `<option>` text. */
export function scatterAxisOptionLabel(metric: ScatterAxisMetric): string {
  return scatterAxisTitle(metric);
}

/** Numeric value used for the given row on a linear / value axis. */
export function scatterAxisValue(metric: ScatterAxisMetric, row: AdderDemoRow): number {
  if (metric === "architecture") {
    return DEMO_ARCH_ORDER.indexOf(row.architecture);
  }
  return row[metric];
}

/** String for tooltips / axis labels (architecture index → display name). */
export function scatterAxisDisplayValue(metric: ScatterAxisMetric, value: number): string {
  if (metric === "architecture") {
    const i = Math.round(value);
    const arch = DEMO_ARCH_ORDER[i];
    return arch ? formatArchLabel(arch) : String(value);
  }
  return String(value);
}

/** Suggested [min, max] for axis; omit to let the library autorange. */
export function scatterAxisRange(
  metric: ScatterAxisMetric,
): [number, number] | undefined {
  if (metric === "architecture") {
    return [-0.5, DEMO_ARCH_ORDER.length - 0.5];
  }
  return undefined;
}

/** Plotly tickvals / ticktext when an axis encodes architecture index. */
export function scatterArchitectureTickAxis(): {
  tickmode: "array";
  tickvals: number[];
  ticktext: string[];
} {
  return {
    tickmode: "array",
    tickvals: DEMO_ARCH_ORDER.map((_, i) => i),
    ticktext: DEMO_ARCH_ORDER.map(formatArchLabel),
  };
}

/** X / Y / Z selections for charts that share explore axes (all three must differ). */
export type ExploreAxesState = {
  x: ScatterAxisMetric;
  y: ScatterAxisMetric;
  z: ScatterAxisMetric;
};

export const DEFAULT_EXPLORE_AXES: ExploreAxesState = {
  x: "fmaxMhz",
  y: "powerMw",
  z: "areaUm2",
};

/**
 * Updates one explore axis and reassigns duplicates so `x`, `y`, and `z` stay distinct.
 */
export function syncExploreAxes(
  prev: ExploreAxesState,
  key: keyof ExploreAxesState,
  m: ScatterAxisMetric,
): ExploreAxesState {
  const next: ExploreAxesState =
    key === "x" ? { ...prev, x: m } : key === "y" ? { ...prev, y: m } : { ...prev, z: m };
  let { x, y, z } = next;
  const pick = (avoid: Set<ScatterAxisMetric>): ScatterAxisMetric => {
    const found = SCATTER_AXIS_METRICS.find((k) => !avoid.has(k));
    return found ?? SCATTER_AXIS_METRICS[0];
  };
  if (x === y) y = pick(new Set([x, z]));
  if (x === z) z = pick(new Set([x, y]));
  if (y === z) z = pick(new Set([x, y]));
  if (x === y) y = pick(new Set([x, z]));
  return { x, y, z };
}

/** Heatmap cell values: rows = architectures, cols = bit widths. */
export function scatterAxisHeatmapGrid(metric: ScatterAxisMetric): {
  z: number[][];
  colLabels: string[];
  rowLabels: string[];
} {
  const z = DEMO_ARCH_ORDER.map((arch) =>
    DEMO_BIT_WIDTHS.map((bw) => {
      const row = ADDER_DEMO_ROWS.find((r) => r.architecture === arch && r.bitWidth === bw);
      return row ? scatterAxisValue(metric, row) : 0;
    }),
  );
  return {
    z,
    colLabels: DEMO_BIT_WIDTHS.map((bw) => `${bw}`),
    rowLabels: DEMO_ARCH_ORDER.map(formatArchLabel),
  };
}

/** Min/max for parallel-coords or autorange; expands degenerate ranges. */
export function scatterAxisExtent(rows: readonly AdderDemoRow[], metric: ScatterAxisMetric): [number, number] {
  const vals = rows.map((r) => scatterAxisValue(metric, r));
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  return [lo, hi];
}

/** Plotly icicle/treemap flat encoding from a chosen leaf value metric. */
export function scatterAxisTreemapFlat(metric: ScatterAxisMetric): {
  labels: string[];
  parents: string[];
  values: number[];
} {
  const root = PPA_ROOT_LABEL;
  const leafLabels = ADDER_DEMO_ROWS.map(
    (r) => `${formatArchLabel(r.architecture)} · ${r.bitWidth}b`,
  );
  const labels = [root, ...leafLabels];
  const parents = ["", ...ADDER_DEMO_ROWS.map(() => root)];
  const leafVals = ADDER_DEMO_ROWS.map((r) => scatterAxisValue(metric, r));
  const sum = leafVals.reduce((s, v) => s + v, 0);
  const values = [sum, ...leafVals];
  return { labels, parents, values };
}
