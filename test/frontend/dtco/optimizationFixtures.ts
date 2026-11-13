import type { DtcoOptimization, DtcoOptimizationDefinition, DtcoOptimizationIteration, DtcoOptimizationOptions } from "../../../shared/contracts/dtco";
export const optimizationDefinition: DtcoOptimizationDefinition = {
  name: "Real inverter optimization", circuitId: "gf180-inverter", technologyId: "gf180mcuA", modelVersion: "gf180-typical-hash",
  temperatureC: 25, voltageV: 3.3, loadFf: 5, inputSlewPs: 100, periodNs: 10, layoutIds: ["mr-sa-12t-pex"],
  axes: { nmosWidthUm: { min: .7, max: 1.3, initial: 1, step: .3 }, pmosWidthUm: { min: 1.4, max: 2.6, initial: 2, step: .3 } },
  objective: { metric: "delayPs" }, maxIterations: 6, minRelativeImprovement: .01, patience: 4,
};
export const optimizationOptions: DtcoOptimizationOptions = {
  available: true, reason: null, defaults: optimizationDefinition, widthGridUm: .05,
  bounds: { nmosWidthUm: { min: .7, max: 1.3 }, pmosWidthUm: { min: 1.4, max: 2.6 } }, layoutIds: ["mr-sa-12t-pex"], maxIterations: 64,
};
export function iteration(number: number, extra: Partial<DtcoOptimizationIteration> = {}): DtcoOptimizationIteration {
  return { id: `round-${number}`, number, revision: number, pointId: `p${number}`,
    candidate: { design: { nmosWidthUm: 1, pmosWidthUm: 2 }, layoutId: "mr-sa-12t-pex" }, baseIterationId: number > 1 ? "round-1" : null,
    rationale: number === 1 ? "Initial measured baseline" : "Bounded neighbor of retained best", status: "succeeded", progress: 1,
    jobId: `job-${number}`, resultId: `result-${number}`, attemptId: `attempt-${number}`, attempts: [],
    metrics: { delayPs: 20, averagePowerW: 1e-6, areaUm2: 3 }, score: 20, relativeImprovement: 0, accepted: true, significantImprovement: true, feasible: true,
    provenance: { metricScope: "Post-layout transient; no extracted wire resistance or signoff" }, error: null,
    createdAt: "2026-10-25T00:00:00Z", evaluatedAt: "2026-10-25T00:00:01Z", ...extra };
}
export function optimization(extra: Partial<DtcoOptimization> = {}): DtcoOptimization {
  return { id: "opt-1", ownerId: "test-owner", version: 1, status: "draft", allowedActions: ["start"], definition: optimizationDefinition,
    experimentId: "opt-exp", environmentHash: "real-env", bestIterationId: null, bestScore: null, stopReason: null,
    iterations: [], createdAt: "2026-10-25T00:00:00Z", updatedAt: "2026-10-25T00:00:00Z", ...extra };
}
