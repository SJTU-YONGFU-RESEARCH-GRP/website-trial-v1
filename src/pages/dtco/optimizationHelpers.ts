import type { DtcoOptimization, DtcoOptimizationDefinition, DtcoOptimizationOptions, DtcoOptimizationIteration, DtcoOptions } from "../../../shared/contracts/dtco";

import { catalogProfiles, operatingBounds, validateCatalogDimensions } from "./catalogHelpers";
import { frequencyRerunReason } from "./frequencyProtocol";
import { searchParameters } from "./DtcoSearchAxes";

export const objectiveLabels = { delayPs: "Measured propagation delay (ps)", averagePowerW: "Power (W)", areaUm2: "Physical area (µm²)", maxFrequencyHz: "Performance · maximum verified cell toggle frequency (Hz)", balanced: "Balanced normalized delay / power / area" };
export const isOptimizationActive = (run: DtcoOptimization) => run.status === "running" || run.status === "stopping";
export function resumableIteration(run: DtcoOptimization): DtcoOptimizationIteration | undefined {
  if (!run.allowedActions.includes("resume") || run.status !== "paused" || run.stopReason === "environment_changed") return undefined;
  const last = run.iterations.at(-1);
  return last?.attemptId && ["failed", "preparation_failed", "interrupted", "cancelled"].includes(last.status) ? last : undefined;
}
export function validateOptimization(value: DtcoOptimizationDefinition, options: DtcoOptimizationOptions, catalog?: DtcoOptions): string | null {
  const finite = (n: number) => Number.isFinite(n);
  if (!value.name.trim()) return "Enter an optimization name.";
  if (!value.parameterAxes) for (const key of ["nmosWidthUm", "pmosWidthUm"] as const) {
    const axis = value.axes[key], bound = options.bounds[key];
    if (![axis.min, axis.max, axis.initial, axis.step].every(finite)) return "Enter finite width bounds, initial values, and steps.";
    if (axis.min < bound.min || axis.max > bound.max || axis.min > axis.max || axis.initial < axis.min || axis.initial > axis.max || axis.step <= 0) return `${key === "nmosWidthUm" ? "NMOS" : "PMOS"} width bounds or initial value are invalid.`;
    if (![axis.min, axis.max, axis.initial, axis.step].every(n => Math.abs(n / options.widthGridUm - Math.round(n / options.widthGridUm)) < 1e-7)) return `Widths and steps must use the ${options.widthGridUm} µm grid.`;
  }
  if (!Number.isInteger(value.maxIterations) || value.maxIterations < 1 || value.maxIterations > options.maxIterations) return `Maximum rounds must be 1–${options.maxIterations}, including the baseline.`;
  if (!Number.isInteger(value.patience) || value.patience < 1 || value.patience > options.maxIterations) return "Patience must be a positive whole number within the round limit.";
  if (!finite(value.minRelativeImprovement) || value.minRelativeImprovement < 0 || value.minRelativeImprovement >= 1) return "Relative improvement must be at least 0 and less than 100%.";
  if (value.objective.target !== undefined && (!finite(value.objective.target) || value.objective.target <= 0)) return "The optional objective target must be positive.";
  const profile = catalog ? catalogProfiles(catalog, value) : undefined;
  const operating = catalog ? operatingBounds(catalog, value) : undefined;
  const temperature = operating?.temperatureC ?? { min: -40, max: 125 }, supply = operating?.supplyVoltageV ?? { min: 2.7, max: 3.6 };
  if (!finite(value.temperatureC) || value.temperatureC < temperature.min || value.temperatureC > temperature.max || !finite(value.voltageV) || value.voltageV - (value.groundVoltageV ?? 0) < supply.min || value.voltageV - (value.groundVoltageV ?? 0) > supply.max) return "Temperature or VDD minus VSS is outside the technology operating bounds.";
  if (catalog) {
    const dimensionError = validateCatalogDimensions(catalog, value);
    if (dimensionError) return dimensionError;
    const parameters = searchParameters(value, catalog);
    for (const [key, axis] of Object.entries(value.parameterAxes ?? {})) {
      const parameter = parameters.find(item => item.key === key);
      if (!parameter) return "Unknown search parameter: " + key;
      if (![axis.min, axis.max, axis.initial, axis.step].every(finite) || axis.min > axis.max || axis.initial < axis.min || axis.initial > axis.max || axis.step <= 0 || axis.min < parameter.min - 1e-9 || axis.max > parameter.max + 1e-9) return parameter.label + " axis is outside its effective bounds.";
      if (parameter.locked && (axis.min !== parameter.value || axis.max !== parameter.value)) return parameter.label + " is locked by the source or sizing configuration.";
      if (parameter.grid && ![axis.min, axis.max, axis.initial, axis.step].every(n => Math.abs(n / parameter.grid! - Math.round(n / parameter.grid!)) < 1e-7)) return parameter.label + " axis must use the advertised grid.";
    }
    if (value.layoutIds.some(id => id !== "fixed-library" && id !== "schematic-only")) {
      const lengthAxes = Object.entries(value.parameterAxes ?? {}).filter(([key]) => key.endsWith(":lengthUm"));
      if (lengthAxes.some(([, axis]) => axis.min !== axis.max)) return "Native layout channel length must remain fixed and common to every device; independent length search is unavailable.";
      const lengths = parameters.filter(item => item.key.startsWith("device:") && item.key.endsWith(":lengthUm")).map(item => {
        const group = profile?.circuit?.groups.find(group => group.deviceIds.some(id => item.key === "device:" + id + ":lengthUm") && value.parameterAxes?.["group:" + group.id + ":lengthUm"]);
        return value.parameterAxes?.[item.key]?.initial ?? (group ? value.parameterAxes?.["group:" + group.id + ":lengthUm"]?.initial : undefined) ?? item.value;
      });
      if (lengths.some(length => Math.abs(length - lengths[0]) > 1e-9)) return "Native layout search candidates require one common channel length for every device.";
    }
    const vdd = value.parameterAxes?.voltageV ?? { min: value.voltageV, max: value.voltageV };
    const vss = value.parameterAxes?.groundVoltageV ?? { min: value.groundVoltageV ?? 0, max: value.groundVoltageV ?? 0 };
    if (vdd.min - vss.max < supply.min - 1e-9 || vdd.max - vss.min > supply.max + 1e-9) return "Every VDD minus VSS combination must stay within the selected model supply bounds.";
    if (value.processCorners && value.processCorners.length !== 1) return "Optimization requires one fixed manufacturing corner; use an experiment to compare corners.";
    if (!value.processCorners?.length && profile?.model || value.processCorners?.some(corner => profile?.model && !profile.model.cornerSections[corner])) return "Select process corners supported by the chosen model.";
  }
  if (!finite(value.loadFf) || value.loadFf < .1 || value.loadFf > 1000 || !finite(value.inputSlewPs) || value.inputSlewPs < 1 || value.inputSlewPs > 10000 || !finite(value.periodNs) || value.periodNs < 1 || value.periodNs > 1000) return "Load, slew, or period is outside the supported range.";
  if (value.inputSlewPs / 1000 >= value.periodNs / 4) return "Input slew must be less than one quarter of the period.";
  if (4 * value.periodNs / Math.min(value.inputSlewPs / 20000, value.periodNs / 10000) > 1_000_000) return "This configuration exceeds 1,000,000 transient steps. Increase slew or shorten period.";
  if (!value.layoutIds.length || value.layoutIds.some(id => !(profile?.circuit?.layoutIds ?? options.layoutIds).includes(id))) return "Choose a supported extracted layout.";
  if ((value.objective.metric === "areaUm2" || value.objective.metric === "balanced") && profile?.circuit?.availableMetrics && !profile.circuit.availableMetrics.includes("areaUm2")) return "This circuit has no measured area capability; select power or performance.";
  if (value.objective.metric === "balanced" && value.objective.weights && Object.values(value.objective.weights).some(n => !finite(n) || n <= 0)) return "Balanced objective weights must be positive.";
  return null;
}
export function measuredIterations(iterations: DtcoOptimizationIteration[]): DtcoOptimizationIteration[] {
  return iterations.filter(row => row.status === "succeeded" && (row.feasible !== false || row.error?.code === "DTCO_FREQUENCY_SUPERSEDED_PROTOCOL" && Boolean(frequencyRerunReason(row))) && row.metrics && [row.metrics.delayPs, row.metrics.averagePowerW].every(n => typeof n === "number" && Number.isFinite(n) && n > 0) && (row.metrics.areaUm2 === null || typeof row.metrics.areaUm2 === "number" && Number.isFinite(row.metrics.areaUm2) && row.metrics.areaUm2 > 0));
}
