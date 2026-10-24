import type { DtcoExperiment, DtcoExperimentDefinition, DtcoOptions, DtcoPoint } from "../../../shared/contracts/dtco";
export const definition: DtcoExperimentDefinition = {
  name: "GF180 inverter sweep", circuitId: "gf180-inverter", technologyId: "gf180mcuA", modelVersion: "gf180-typical-hash",
  temperaturesC: [25], voltagesV: [3.3], layoutIds: ["mr-dp-9t"], loadFf: 5, inputSlewPs: 100, periodNs: 10,
};
const option = (id: string) => ({ id, label: id, available: true, reason: null });
export const options: DtcoOptions = {
  circuits: [option(definition.circuitId)], technologies: [option(definition.technologyId)],
  models: [{ ...option(definition.modelVersion), technologyId: definition.technologyId, sourceHash: "real-model-hash" }],
  layouts: [option("mr-dp-9t"), option("mr-sa-12t")], available: true, unavailableReason: null, tools: [],
  defaults: definition, maxPoints: 64, environmentHash: "real-environment-hash", metricScope: "schematic",
};
export function point(id: string, status: DtcoPoint["status"] = "succeeded", extra: Partial<DtcoPoint> = {}): DtcoPoint {
  return { id, revision: 1, key: id, temperatureC: 25, voltageV: 3.3, layoutId: "mr-dp-9t", status, progress: status === "succeeded" ? 1 : 0,
    currentStepId: null, jobId: `job-${id}`, resultId: status === "succeeded" ? `result-${id}` : null, error: null,
    metrics: status === "succeeded" ? { delayPs: 20, averagePowerW: 1e-6, areaUm2: 3 } : null,
    attempts: [{ id: `attempt-${id}`, number: 1, jobId: `job-${id}`, resultId: null, status, progress: 0, currentStepId: null, error: null, metrics: null, createdAt: "2026-10-24T00:00:00Z", updatedAt: "2026-10-24T00:00:00Z" }], ...extra };
}
export function experiment(id = "exp-1", points: DtcoPoint[] = [point("p1")], input = definition): DtcoExperiment {
  return { id, ownerId: "test-owner", revision: 1, definition: input, createdAt: "2026-10-24T00:00:00Z", updatedAt: "2026-10-24T00:00:00Z", points,
    revisions: [{ revision: 1, definition: input, createdAt: "2026-10-24T00:00:00Z", environmentHash: options.environmentHash, points }] };
}
