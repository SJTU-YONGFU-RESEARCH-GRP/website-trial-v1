import type { PpaReportFacet, PpaRunManifest } from "./ppaTypes";

export type PpaMetricRole = "input" | "output" | "category";
export type PpaMetricType = "numeric" | "categorical";
export type PpaMetricDirection = "higher" | "lower";
export type PpaMetricGroup = "Timing" | "Area" | "Power" | "Physical" | "Experiment" | "Identity";
export type PpaMetricValue = number | string | null;

export interface PpaMetricDefinition {
  key: string;
  label: string;
  role: PpaMetricRole;
  type: PpaMetricType;
  group: PpaMetricGroup;
  unit: string | null;
  direction?: PpaMetricDirection;
  sourceDimensions?: readonly string[];
  value: (run: PpaRunManifest) => PpaMetricValue;
}

export interface PpaParetoPoint<T> {
  item: T;
  x: number;
  y: number;
}

export function finitePpaNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function facet(run: PpaRunManifest, ...dimensions: string[]): PpaReportFacet | null {
  return run.filterFacets?.find((candidate) => dimensions.includes(candidate.dimension)) ?? null;
}

function facetLabel(run: PpaRunManifest, ...dimensions: string[]): string | null {
  return facet(run, ...dimensions)?.valueLabel ?? null;
}

function facetNumber(run: PpaRunManifest, ...dimensions: string[]): number | null {
  const value = facet(run, ...dimensions)?.value;
  if (value === undefined) return null;
  return finitePpaNumber(value.split("|")[0]);
}

export interface PpaPvtValue {
  process: string | null;
  voltage: number | null;
  temperature: number | null;
  label: string | null;
}

export function ppaPvtValue(run: PpaRunManifest): PpaPvtValue {
  const pvt = facet(run, "pvt");
  if (!pvt) return { process: null, voltage: null, temperature: null, label: null };
  const [process, voltage, temperature] = pvt.value.split("|");
  return {
    process: process || null,
    voltage: finitePpaNumber(voltage),
    temperature: finitePpaNumber(temperature),
    label: pvt.valueLabel,
  };
}

export function ppaTrendSeriesKey(run: PpaRunManifest, xMetric: PpaMetricDefinition): string {
  const excluded = new Set(xMetric.sourceDimensions ?? []);
  const pvt = ppaPvtValue(run);
  const parts = [
    `design=${run.design}`,
    `flow=${run.flow}`,
    `pdk=${run.pdk}`,
    `scl=${run.scl ?? ""}`,
  ];
  const stableDimensions = [
    "architecture", "operator", "design_input", "techfile_rc", "cell_model", "pvt",
    "floorplan_target", "width", "bit_width", "block_width", "operations",
    "number_of_operations", "pipeline_stages", "stages", "clock_period",
  ];
  for (const dimension of stableDimensions) {
    if (excluded.has(dimension)) continue;
    const value = facet(run, dimension)?.value;
    if (value !== undefined) parts.push(`${dimension}=${value}`);
  }
  if (xMetric.key === "voltage_v") {
    parts.push(`pvt-process=${pvt.process ?? ""}`, `pvt-temperature=${pvt.temperature ?? ""}`);
  } else if (xMetric.key === "temperature_c") {
    parts.push(`pvt-process=${pvt.process ?? ""}`, `pvt-voltage=${pvt.voltage ?? ""}`);
  }
  return parts.join("|");
}

function totalDrc(run: PpaRunManifest): number | null {
  const route = finitePpaNumber(run.summary.routeDrcErrors);
  const magic = finitePpaNumber(run.summary.magicDrcErrors);
  if (route === null && magic === null) return null;
  return (route ?? 0) + (magic ?? 0);
}

const metric = (definition: PpaMetricDefinition): PpaMetricDefinition => definition;

export const PPA_METRIC_REGISTRY: readonly PpaMetricDefinition[] = [
  metric({
    key: "target_frequency_mhz", label: "Target Frequency", role: "input", type: "numeric",
    group: "Experiment", unit: "MHz", direction: "higher", sourceDimensions: ["clock_period"],
    value: (run) => {
      const period = finitePpaNumber(run.summary.clockPeriodNs);
      return period !== null && period > 0 ? 1000 / period : null;
    },
  }),
  metric({
    key: "clock_period_ns", label: "Clock Period", role: "input", type: "numeric",
    group: "Experiment", unit: "ns", direction: "lower", sourceDimensions: ["clock_period"],
    value: (run) => finitePpaNumber(run.summary.clockPeriodNs),
  }),
  metric({
    key: "width", label: "Width", role: "input", type: "numeric", group: "Experiment", unit: "bits",
    direction: "lower", sourceDimensions: ["width", "bit_width"],
    value: (run) => facetNumber(run, "width", "bit_width"),
  }),
  metric({
    key: "block_width", label: "Block Width", role: "input", type: "numeric", group: "Experiment", unit: "bits",
    direction: "lower", sourceDimensions: ["block_width"], value: (run) => facetNumber(run, "block_width"),
  }),
  metric({
    key: "operations", label: "Number of Operations", role: "input", type: "numeric", group: "Experiment", unit: "ops",
    direction: "lower", sourceDimensions: ["operations", "number_of_operations"],
    value: (run) => facetNumber(run, "operations", "number_of_operations"),
  }),
  metric({
    key: "pipeline_stages", label: "Pipeline Stages", role: "input", type: "numeric", group: "Experiment", unit: "stages",
    direction: "lower", sourceDimensions: ["pipeline_stages", "stages"],
    value: (run) => facetNumber(run, "pipeline_stages", "stages"),
  }),
  metric({
    key: "voltage_v", label: "Voltage", role: "input", type: "numeric", group: "Experiment", unit: "V",
    direction: "higher", sourceDimensions: ["pvt"], value: (run) => ppaPvtValue(run).voltage,
  }),
  metric({
    key: "temperature_c", label: "Temperature", role: "input", type: "numeric", group: "Experiment", unit: "°C",
    direction: "lower", sourceDimensions: ["pvt"], value: (run) => ppaPvtValue(run).temperature,
  }),
  metric({
    key: "rc_scale", label: "RC Scale", role: "input", type: "numeric", group: "Experiment", unit: "×",
    direction: "lower", sourceDimensions: ["techfile_rc"],
    value: (run) => finitePpaNumber(run.techfileRcScale)
      ?? finitePpaNumber(facet(run, "techfile_rc")?.value.split("|").at(-1)),
  }),

  metric({ key: "fmax_mhz", label: "Fmax", role: "output", type: "numeric", group: "Timing", unit: "MHz", direction: "higher", value: (run) => {
    const hz = finitePpaNumber(run.summary.fmaxHz);
    return hz === null ? null : hz / 1e6;
  } }),
  metric({ key: "wns_ns", label: "Worst Slack / WNS", role: "output", type: "numeric", group: "Timing", unit: "ns", direction: "higher", value: (run) => finitePpaNumber(run.summary.worstSetupSlackNs) ?? finitePpaNumber(run.summary.setupSlackNs) }),
  metric({ key: "tns_ns", label: "TNS", role: "output", type: "numeric", group: "Timing", unit: "ns", direction: "higher", value: (run) => finitePpaNumber(run.summary.setupTnsNs) }),
  metric({ key: "hold_slack_ns", label: "Hold Slack", role: "output", type: "numeric", group: "Timing", unit: "ns", direction: "higher", value: (run) => finitePpaNumber(run.summary.worstHoldSlackNs) ?? finitePpaNumber(run.summary.holdSlackNs) }),
  metric({ key: "cell_area_um2", label: "Cell Area", role: "output", type: "numeric", group: "Area", unit: "µm²", direction: "lower", value: (run) => finitePpaNumber(run.summary.instanceAreaUm2) }),
  metric({ key: "core_area_um2", label: "Core Area", role: "output", type: "numeric", group: "Area", unit: "µm²", direction: "lower", value: (run) => finitePpaNumber(run.summary.coreAreaUm2) }),
  metric({ key: "die_area_um2", label: "Die Area", role: "output", type: "numeric", group: "Area", unit: "µm²", direction: "lower", value: (run) => finitePpaNumber(run.summary.areaUm2) }),
  metric({ key: "cell_count", label: "Cell Count", role: "output", type: "numeric", group: "Area", unit: "cells", direction: "lower", value: (run) => finitePpaNumber(run.summary.instances) }),
  metric({ key: "placement_density_pct", label: "Placement Density", role: "output", type: "numeric", group: "Area", unit: "%", direction: "lower", value: (run) => {
    const utilization = finitePpaNumber(run.summary.utilization);
    return utilization === null ? null : utilization * 100;
  } }),
  metric({ key: "total_power_mw", label: "Total Power", role: "output", type: "numeric", group: "Power", unit: "mW", direction: "lower", value: (run) => finitePpaNumber(run.summary.totalPowerMw) }),
  metric({ key: "internal_power_mw", label: "Internal Power", role: "output", type: "numeric", group: "Power", unit: "mW", direction: "lower", value: (run) => finitePpaNumber(run.summary.internalPowerMw) }),
  metric({ key: "switching_power_mw", label: "Switching Power", role: "output", type: "numeric", group: "Power", unit: "mW", direction: "lower", value: (run) => finitePpaNumber(run.summary.switchingPowerMw) }),
  metric({ key: "leakage_power_mw", label: "Leakage Power", role: "output", type: "numeric", group: "Power", unit: "mW", direction: "lower", value: (run) => finitePpaNumber(run.summary.leakagePowerMw) }),
  metric({ key: "wire_length_um", label: "Wire Length", role: "output", type: "numeric", group: "Physical", unit: "µm", direction: "lower", value: (run) => finitePpaNumber(run.summary.wirelengthUm) }),
  metric({ key: "via_count", label: "Via Count", role: "output", type: "numeric", group: "Physical", unit: "vias", direction: "lower", value: (run) => finitePpaNumber(run.summary.vias) }),
  metric({ key: "drc_violations", label: "DRC Violations", role: "output", type: "numeric", group: "Physical", unit: "violations", direction: "lower", value: totalDrc }),
  metric({ key: "ir_drop_mv", label: "Worst IR Drop", role: "output", type: "numeric", group: "Physical", unit: "mV", direction: "lower", value: (run) => {
    const volts = finitePpaNumber(run.summary.worstIrDropV);
    return volts === null ? null : volts * 1000;
  } }),

  metric({ key: "architecture", label: "Architecture", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["architecture"], value: (run) => facetLabel(run, "architecture") }),
  metric({ key: "operator", label: "Operator", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["operator"], value: (run) => facetLabel(run, "operator") }),
  metric({ key: "flow", label: "Flow", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["tool"], value: (run) => run.tool || run.flow }),
  metric({ key: "design", label: "Design", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["design"], value: (run) => run.design }),
  metric({ key: "pdk", label: "PDK", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["pdk"], value: (run) => run.pdk }),
  metric({ key: "scl", label: "Standard-cell Library", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["scl"], value: (run) => run.scl }),
  metric({ key: "pvt", label: "PVT", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["pvt"], value: (run) => ppaPvtValue(run).label }),
  metric({ key: "rc_corner", label: "RC Corner", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["techfile_rc"], value: (run) => facetLabel(run, "techfile_rc") ?? (run.techfileRcScale === null ? null : `RC ×${run.techfileRcScale}`) }),
  metric({ key: "cell_model", label: "Cell Model", role: "category", type: "categorical", group: "Identity", unit: null, sourceDimensions: ["cell_model"], value: (run) => facetLabel(run, "cell_model") }),
];

const REGISTRY_BY_KEY = new Map(PPA_METRIC_REGISTRY.map((definition) => [definition.key, definition]));

export function ppaMetric(key: string): PpaMetricDefinition | null {
  return REGISTRY_BY_KEY.get(key) ?? null;
}

export function availablePpaMetrics(
  runs: readonly PpaRunManifest[],
  role: PpaMetricRole,
  allowedKeys?: readonly string[],
): PpaMetricDefinition[] {
  const allowed = allowedKeys ? new Set(allowedKeys) : null;
  return PPA_METRIC_REGISTRY.filter((definition) => definition.role === role
    && (!allowed || allowed.has(definition.key))
    && runs.some((run) => definition.value(run) !== null));
}

export function ppaMetricAxisTitle(definition: PpaMetricDefinition): string {
  return definition.unit ? `${definition.label} (${definition.unit})` : definition.label;
}

export function formatPpaMetricValue(definition: PpaMetricDefinition, value: PpaMetricValue): string {
  if (value === null) return "N/A";
  if (typeof value === "string") return value;
  const formatted = value.toLocaleString(undefined, { maximumSignificantDigits: 7 });
  return definition.unit ? `${formatted} ${definition.unit}` : formatted;
}

export function isPpaRunInvalid(run: PpaRunManifest): boolean {
  const wns = finitePpaNumber(run.summary.worstSetupSlackNs) ?? finitePpaNumber(run.summary.setupSlackNs);
  const drc = totalDrc(run);
  const flowErrors = finitePpaNumber(run.summary.flowErrors);
  const status = run.summary.completionStatus?.toLocaleLowerCase() ?? "";
  return run.summary.hasPpa !== true
    || (wns !== null && wns < 0)
    || (drc !== null && drc > 0)
    || (flowErrors !== null && flowErrors > 0)
    || /fail|error|invalid|incomplete/.test(status);
}

function atLeastAsGood(value: number, other: number, direction: PpaMetricDirection): boolean {
  return direction === "higher" ? value >= other : value <= other;
}

function strictlyBetter(value: number, other: number, direction: PpaMetricDirection): boolean {
  return direction === "higher" ? value > other : value < other;
}

export function ppaParetoFrontier<T>(
  points: readonly PpaParetoPoint<T>[],
  xDirection: PpaMetricDirection,
  yDirection: PpaMetricDirection,
): PpaParetoPoint<T>[] {
  return points
    .filter((candidate, candidateIndex) => !points.some((challenger, challengerIndex) => (
      candidateIndex !== challengerIndex
      && atLeastAsGood(challenger.x, candidate.x, xDirection)
      && atLeastAsGood(challenger.y, candidate.y, yDirection)
      && (strictlyBetter(challenger.x, candidate.x, xDirection)
        || strictlyBetter(challenger.y, candidate.y, yDirection))
    )))
    .sort((left, right) => left.x - right.x || left.y - right.y);
}
