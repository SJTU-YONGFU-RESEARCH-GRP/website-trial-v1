import type { DtcoOptimization, DtcoOptimizationDefinition, DtcoOptimizationOptions, DtcoOptimizationIteration } from "../../../shared/contracts/dtco";

export const objectiveLabels = { delayPs: "Measured propagation delay (ps)", averagePowerW: "Power (W)", areaUm2: "GDS boundary area (µm²)", balanced: "Balanced normalized delay / power / area" };
export const isOptimizationActive = (run: DtcoOptimization) => run.status === "running" || run.status === "stopping";
export function resumableIteration(run: DtcoOptimization): DtcoOptimizationIteration | undefined {
  if (!run.allowedActions.includes("resume") || run.status !== "paused" || run.stopReason === "environment_changed") return undefined;
  const last = run.iterations.at(-1);
  return last?.attemptId && ["failed", "preparation_failed", "interrupted", "cancelled"].includes(last.status) ? last : undefined;
}
export function validateOptimization(value: DtcoOptimizationDefinition, options: DtcoOptimizationOptions): string | null {
  const finite = (n: number) => Number.isFinite(n);
  if (!value.name.trim()) return "Enter an optimization name.";
  for (const key of ["nmosWidthUm", "pmosWidthUm"] as const) {
    const axis = value.axes[key], bound = options.bounds[key];
    if (![axis.min, axis.max, axis.initial, axis.step].every(finite)) return "Enter finite width bounds, initial values, and steps.";
    if (axis.min < bound.min || axis.max > bound.max || axis.min > axis.max || axis.initial < axis.min || axis.initial > axis.max || axis.step <= 0) return `${key === "nmosWidthUm" ? "NMOS" : "PMOS"} width bounds or initial value are invalid.`;
    if (![axis.min, axis.max, axis.initial, axis.step].every(n => Math.abs(n / options.widthGridUm - Math.round(n / options.widthGridUm)) < 1e-7)) return `Widths and steps must use the ${options.widthGridUm} µm grid.`;
  }
  if (!Number.isInteger(value.maxIterations) || value.maxIterations < 1 || value.maxIterations > options.maxIterations) return `Maximum rounds must be 1–${options.maxIterations}, including the baseline.`;
  if (!Number.isInteger(value.patience) || value.patience < 1 || value.patience > options.maxIterations) return "Patience must be a positive whole number within the round limit.";
  if (!finite(value.minRelativeImprovement) || value.minRelativeImprovement < 0 || value.minRelativeImprovement >= 1) return "Relative improvement must be at least 0 and less than 100%.";
  if (value.objective.target !== undefined && (!finite(value.objective.target) || value.objective.target <= 0)) return "The optional objective target must be positive.";
  if (!finite(value.temperatureC) || value.temperatureC < -40 || value.temperatureC > 125 || !finite(value.voltageV) || value.voltageV < 2.7 || value.voltageV > 3.6) return "Temperature must be −40 to 125 °C and voltage 2.7 to 3.6 V.";
  if (!finite(value.loadFf) || value.loadFf < .1 || value.loadFf > 1000 || !finite(value.inputSlewPs) || value.inputSlewPs < 1 || value.inputSlewPs > 10000 || !finite(value.periodNs) || value.periodNs < 1 || value.periodNs > 1000) return "Load, slew, or period is outside the supported range.";
  if (value.inputSlewPs / 1000 >= value.periodNs / 4) return "Input slew must be less than one quarter of the period.";
  if (4 * value.periodNs / Math.min(value.inputSlewPs / 20000, value.periodNs / 10000) > 1_000_000) return "This configuration exceeds 1,000,000 transient steps. Increase slew or shorten period.";
  if (!value.layoutIds.length || value.layoutIds.some(id => !options.layoutIds.includes(id))) return "Choose a supported extracted layout.";
  if (value.objective.metric === "balanced" && value.objective.weights && Object.values(value.objective.weights).some(n => !finite(n) || n <= 0)) return "Balanced objective weights must be positive.";
  return null;
}
export function measuredIterations(iterations: DtcoOptimizationIteration[]): DtcoOptimizationIteration[] {
  return iterations.filter(row => row.status === "succeeded" && row.feasible !== false && row.metrics && [row.metrics.delayPs, row.metrics.averagePowerW, row.metrics.areaUm2].every(n => typeof n === "number" && Number.isFinite(n) && n > 0));
}
