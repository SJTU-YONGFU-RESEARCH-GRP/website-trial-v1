import type { DtcoExperiment, DtcoExperimentDefinition, DtcoMeasuredMetrics, DtcoOptimization, DtcoOptimizationIteration } from "../../../shared/contracts/dtco";
import type { JsonObject } from "../../../shared/contracts/v1";
import type { DtcoPipelineEntry } from "./DtcoPipelineResults";
import { dtcoScope, measuredPoints, pointLabel } from "./helpers";
import { frequencyRerunReason } from "./frequencyProtocol";
import { measuredIterations } from "./optimizationHelpers";

export interface DtcoSavedMeasurement {
  id: string; name: string; label: string; origin: "optimization" | "experiment"; sourceId: string; jobId: string | null;
  mode: "schematic" | "extracted"; scope: string; conditions: string; sizing?: string; sourceIdentity: string; comparisonKey: string;
  metrics: DtcoMeasuredMetrics; requested: unknown; provenance: JsonObject | null; frequencyRerunReason?: string | null;
  optimization?: DtcoOptimization; iteration?: DtcoOptimizationIteration;
}
export const measurementMode = (mode: DtcoSavedMeasurement["mode"]) => mode === "extracted" ? "Extracted capacitance" : "Schematic SPICE";
export function sizingLabel(definition: Pick<DtcoExperimentDefinition, "sizingMode" | "design" | "deviceOverrides" | "groupOverrides">) {
  const values = [definition.sizingMode === "fixed" ? "Fixed library dimensions" : "Custom sizing"];
  if (definition.design) values.push("N " + definition.design.nmosWidthUm + " µm / P " + definition.design.pmosWidthUm + " µm");
  for (const kind of ["deviceOverrides", "groupOverrides"] as const) for (const [id, override] of Object.entries(definition[kind] ?? {})) values.push((kind === "groupOverrides" ? "group " : "") + id + ": " + Object.entries(override).map(([key, value]) => key + "=" + value).join(", "));
  return values.join(" · ");
}
function conditions(temperature: number, voltage: number, ground: number, corner: string, definition: { loadFf: number; inputSlewPs: number; periodNs: number }) {
  return temperature + " °C / VDD " + voltage + " V / VSS " + ground + " V / " + corner.toUpperCase() + " / load " + definition.loadFf + " fF / slew " + definition.inputSlewPs + " ps / period " + definition.periodNs + " ns";
}
export function savedMeasurements(experiments: DtcoExperiment[], optimizations: DtcoOptimization[]): DtcoSavedMeasurement[] {
  const rows = new Map<string, DtcoSavedMeasurement>();
  for (const run of optimizations) for (const iteration of measuredIterations(run.iterations)) {
    if (!iteration.resultId) continue;
    const definition = run.definition, parameters = iteration.candidate.parameters ?? {}, mode = definition.electricalMode ?? "extracted";
    const operating = conditions(parameters.temperatureC ?? definition.temperatureC, parameters.voltageV ?? definition.voltageV, parameters.groundVoltageV ?? definition.groundVoltageV ?? 0, iteration.candidate.processCorner ?? definition.processCorners?.[0] ?? "tt", definition);
    const sizing = sizingLabel({ ...definition, design: definition.parameterAxes ? undefined : iteration.candidate.design }) + (Object.keys(parameters).length ? " · " + Object.entries(parameters).filter(([key]) => key.startsWith("device:") || key.startsWith("group:")).map(([key, value]) => key + "=" + value).join(" · ") : "");
    const scope = typeof iteration.provenance?.metricScope === "string" ? iteration.provenance.metricScope : dtcoScope({ electricalMode: mode });
    rows.set(iteration.resultId, { id: iteration.resultId, name: definition.name, label: "Round " + iteration.number + " · " + iteration.candidate.layoutId,
      origin: "optimization", sourceId: run.id, jobId: iteration.jobId, mode, scope, conditions: operating, sizing,
      comparisonKey: JSON.stringify([definition.circuitId, definition.technologyId, definition.modelVersion, run.environmentHash, operating, mode, definition.characterizationArcId ?? "", definition.workflow ?? "direct"]),
      sourceIdentity: definition.circuitId + " · " + definition.technologyId + " · " + definition.modelVersion + " · environment " + run.environmentHash,
      frequencyRerunReason: frequencyRerunReason(iteration), metrics: iteration.metrics!, requested: { definition, candidate: iteration.candidate }, provenance: iteration.provenance, optimization: run, iteration });
  }
  for (const experiment of experiments) {
    const revisions = [...experiment.revisions.filter(revision => revision.revision !== experiment.revision), {
      revision: experiment.revision, definition: experiment.definition, points: experiment.points,
      environmentHash: experiment.revisions.find(revision => revision.revision === experiment.revision)?.environmentHash ?? "",
    }];
    for (const revision of revisions) for (const { point, delayPs, powerUw, areaUm2 } of measuredPoints(revision.points)) {
      if (!point.resultId || rows.has(point.resultId)) continue;
      const definition = revision.definition, mode = definition.electricalMode ?? "schematic";
      const operating = conditions(point.temperatureC, point.voltageV, point.groundVoltageV ?? 0, point.processCorner ?? "tt", definition);
      rows.set(point.resultId, { id: point.resultId, name: definition.name,
        label: "Revision " + revision.revision + " · " + pointLabel(point), origin: "experiment", sourceId: experiment.id, jobId: point.jobId,
        mode, scope: dtcoScope(definition), conditions: operating, sizing: sizingLabel(definition),
        comparisonKey: JSON.stringify([definition.circuitId, definition.technologyId, definition.modelVersion, revision.environmentHash, operating, mode, definition.characterizationArcId ?? "", definition.workflow ?? "direct"]),
        sourceIdentity: definition.circuitId + " · " + definition.technologyId + " · " + definition.modelVersion + " · environment " + revision.environmentHash,
        frequencyRerunReason: frequencyRerunReason(point.metrics), metrics: { delayPs, averagePowerW: powerUw / 1e6, areaUm2, maxFrequencyHz: typeof point.metrics?.maxFrequencyHz === "number" ? point.metrics.maxFrequencyHz : null }, requested: { definition, point }, provenance: null });
    }
  }
  return [...rows.values()];
}
export function savedPipelineAttempts(experiments: DtcoExperiment[], optimizations: DtcoOptimization[]): DtcoPipelineEntry[] {
  const entries = new Map<string, DtcoPipelineEntry>();
  for (const experiment of experiments) for (const revision of [...experiment.revisions, { revision: experiment.revision, points: experiment.points }]) for (const point of revision.points) for (const attempt of point.attempts) if (attempt.pipeline) entries.set(attempt.pipeline.id, { label: experiment.definition.name + " · revision " + revision.revision + " · " + pointLabel(point) + " · attempt " + attempt.number, pipeline: attempt.pipeline });
  for (const run of optimizations) for (const iteration of run.iterations) for (const attempt of iteration.attempts) if (attempt.pipeline) entries.set(attempt.pipeline.id, { label: run.definition.name + " · round " + iteration.number + " · attempt " + attempt.number, pipeline: attempt.pipeline });
  return [...entries.values()];
}
export function filterSavedMeasurements(rows: DtcoSavedMeasurement[], query: string, mode: string, origin: string): DtcoSavedMeasurement[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(row => (!mode || row.mode === mode) && (!origin || row.origin === origin) &&
    [row.id, row.name, row.label, row.conditions, row.sizing, row.sourceIdentity, measurementMode(row.mode)].join(" ").toLowerCase().includes(needle));
}
export function toggleSavedMeasurement(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
}
