import type { DtcoExperimentDefinition, DtcoOptions, DtcoPoint } from "../../../shared/contracts/dtco";

export const DTCO_SCOPE = "Schematic SPICE delay/power + generated layout area; no extracted parasitics or foundry signoff. Layout differences affect area only in this mode.";
export interface DtcoForm {
  name: string; circuitId: string; technologyId: string; modelVersion: string;
  temperatures: string; voltages: string; layoutIds: string[];
  loadFf: string; inputSlewPs: string; periodNs: string;
}
export function definitionToForm(definition: DtcoExperimentDefinition): DtcoForm {
  return { ...definition, temperatures: definition.temperaturesC.join(", "), voltages: definition.voltagesV.join(", "),
    layoutIds: [...definition.layoutIds], loadFf: String(definition.loadFf),
    inputSlewPs: String(definition.inputSlewPs), periodNs: String(definition.periodNs) };
}
function numbers(text: string, label: string): number[] {
  if (!text.trim()) throw new Error(`Enter at least one ${label}.`);
  const values = text.split(",").map(value => value.trim());
  if (values.some(value => value === "" || !Number.isFinite(Number(value)))) throw new Error(`Use comma-separated finite numbers for ${label}.`);
  return [...new Set(values.map(Number))];
}
export function parseDtcoForm(form: DtcoForm, options: DtcoOptions): { definition: DtcoExperimentDefinition | null; count: number; error: string | null } {
  try {
    const temperaturesC = numbers(form.temperatures, "temperature");
    const voltagesV = numbers(form.voltages, "voltage");
    const layoutIds = [...new Set(form.layoutIds)];
    const count = temperaturesC.length * voltagesV.length * layoutIds.length;
    if (!layoutIds.length) throw new Error("Select at least one layout.");
    if (count > options.maxPoints) return { definition: null, count, error: `Choose at most ${options.maxPoints} combinations.` };
    if (!form.name.trim()) return { definition: null, count, error: "Enter an experiment name." };
    const supported = (values: DtcoOptions["layouts"], value: string) => values.some(option => option.id === value && option.available);
    if (!supported(options.circuits, form.circuitId) || !supported(options.technologies, form.technologyId)
      || !supported(options.models.filter(model => model.technologyId === form.technologyId), form.modelVersion)
      || !layoutIds.every(layout => supported(options.layouts, layout))) {
      return { definition: null, count, error: "This configuration contains an unavailable circuit, technology, model, or layout." };
    }
    if (temperaturesC.some(value => value < -40 || value > 125)) return { definition: null, count, error: "Temperature must be between −40 and 125 °C." };
    if (voltagesV.some(value => value < 2.7 || value > 3.6)) return { definition: null, count, error: "Voltage must be between 2.7 and 3.6 V." };
    const loadFf = Number(form.loadFf), inputSlewPs = Number(form.inputSlewPs), periodNs = Number(form.periodNs);
    if (![form.loadFf, form.inputSlewPs, form.periodNs].every(value => value.trim()) || ![loadFf, inputSlewPs, periodNs].every(value => Number.isFinite(value) && value > 0)) {
      return { definition: null, count, error: "Load, input slew, and period must be positive finite numbers." };
    }
    if (loadFf < 0.1 || loadFf > 1000 || inputSlewPs < 1 || inputSlewPs > 10000 || periodNs < 1 || periodNs > 1000) return { definition: null, count, error: "Use load 0.1–1000 fF, slew 1–10000 ps, and period 1–1000 ns." };
    if (inputSlewPs / 1000 >= periodNs / 4) return { definition: null, count, error: "Input slew must be less than one quarter of the period." };
    const transientSteps = 4 * periodNs / Math.min(inputSlewPs / 20000, periodNs / 10000);
    if (transientSteps > 1_000_000) return { definition: null, count, error: "This period and slew require more than 1,000,000 transient steps. Increase input slew or shorten the period." };
    return { count, error: null, definition: { name: form.name.trim(), circuitId: form.circuitId, technologyId: form.technologyId, modelVersion: form.modelVersion,
      temperaturesC, voltagesV, layoutIds, loadFf, inputSlewPs, periodNs } };
  } catch (error) { return { definition: null, count: 0, error: error instanceof Error ? error.message : String(error) }; }
}
export const isActivePoint = (point: Pick<DtcoPoint, "status">): boolean => ["preparing", "draft", "validating", "ready", "queued", "running"].includes(point.status);
export const canRetryPoint = (point: Pick<DtcoPoint, "status">): boolean => ["failed", "interrupted", "cancelled", "preparation_failed"].includes(point.status);
export function pointLabel(point: Pick<DtcoPoint, "temperatureC" | "voltageV" | "layoutId">): string {
  return `${point.temperatureC} °C / ${point.voltageV} V / ${point.layoutId}`;
}
export interface DtcoMeasuredPoint { point: DtcoPoint; delayPs: number; powerUw: number; areaUm2: number; }
export function measuredPoints(points: readonly DtcoPoint[]): DtcoMeasuredPoint[] {
  return points.flatMap(point => {
    if (point.status !== "succeeded" || !point.metrics) return [];
    const { delayPs, averagePowerW, areaUm2 } = point.metrics;
    if (![delayPs, averagePowerW, areaUm2].every(value => typeof value === "number" && Number.isFinite(value) && value > 0)) return [];
    return [{ point, delayPs: delayPs as number, powerUw: (averagePowerW as number) * 1e6, areaUm2: areaUm2 as number }];
  });
}
export function selectedMeasurements(points: readonly DtcoMeasuredPoint[], omitted: ReadonlySet<string>, filters: { temperature: string; voltage: string; layout: string }): DtcoMeasuredPoint[] {
  return points.filter(({ point }) => !omitted.has(point.id)
    && (!filters.temperature || String(point.temperatureC) === filters.temperature)
    && (!filters.voltage || String(point.voltageV) === filters.voltage)
    && (!filters.layout || point.layoutId === filters.layout));
}
export function relativeChange(value: number, baseline: number): string {
  const percent = ((value / baseline) - 1) * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
}
