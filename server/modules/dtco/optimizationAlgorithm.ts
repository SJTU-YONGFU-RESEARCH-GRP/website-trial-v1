import type { DtcoExperimentDefinition, DtcoMeasuredMetrics, DtcoOptimizationCandidate, DtcoOptimizationDefinition } from "../../../shared/contracts/dtco.ts";

export const WIDTH_GRID = 0.05;
export const AXES = ["nmosWidthUm", "pmosWidthUm"] as const;
export interface SearchState { cursor: number; steps: { nmosWidthUm: number; pmosWidthUm: number }; retryAttemptId?: string; }
export const candidateKey = (candidate: DtcoOptimizationCandidate): string => JSON.stringify(candidate);
export const initialCandidate = (definition: DtcoOptimizationDefinition): DtcoOptimizationCandidate => ({
  design: { nmosWidthUm: definition.axes.nmosWidthUm.initial, pmosWidthUm: definition.axes.pmosWidthUm.initial }, layoutId: definition.layoutIds[0]!,
});
export const initialState = (definition: DtcoOptimizationDefinition): SearchState => ({
  cursor: 0, steps: { nmosWidthUm: definition.axes.nmosWidthUm.step, pmosWidthUm: definition.axes.pmosWidthUm.step },
});
export function experimentDefinition(definition: DtcoOptimizationDefinition, candidate: DtcoOptimizationCandidate): DtcoExperimentDefinition {
  return { name: definition.name, circuitId: definition.circuitId, technologyId: definition.technologyId, modelVersion: definition.modelVersion,
    temperaturesC: [definition.temperatureC], voltagesV: [definition.voltageV], layoutIds: [candidate.layoutId],
    loadFf: definition.loadFf, inputSlewPs: definition.inputSlewPs, periodNs: definition.periodNs,
    design: candidate.design, electricalMode: "extracted" };
}
export function objectiveScore(definition: DtcoOptimizationDefinition, metrics: DtcoMeasuredMetrics, baseline: DtcoMeasuredMetrics): number {
  if (definition.objective.metric !== "balanced") return metrics[definition.objective.metric];
  const weights = definition.objective.weights || { delay: 1, power: 1, area: 1 };
  const total = weights.delay + weights.power + weights.area;
  return (weights.delay * metrics.delayPs / baseline.delayPs + weights.power * metrics.averagePowerW / baseline.averagePowerW + weights.area * metrics.areaUm2 / baseline.areaUm2) / total;
}
export function nextCandidate(definition: DtcoOptimizationDefinition, best: DtcoOptimizationCandidate, input: SearchState, visited: Set<string>):
  { candidate: DtcoOptimizationCandidate; state: SearchState; rationale: string } | null {
  const state: SearchState = { ...input, steps: { ...input.steps } };
  // Four directions around the measured incumbent; shrink only after a complete unsuccessful neighborhood.
  for (let guard = 0; guard < 128; guard++) {
    if (state.cursor >= 4) {
      const next = Object.fromEntries(AXES.map(axis => [axis, Math.max(WIDTH_GRID, Math.floor((state.steps[axis] / 2 + 1e-9) / WIDTH_GRID) * WIDTH_GRID)])) as SearchState["steps"];
      if (AXES.every(axis => Math.abs(next[axis] - state.steps[axis]) < 1e-9)) return null;
      state.steps = next; state.cursor = 0;
    }
    const directionIndex = state.cursor++;
    const axis = AXES[Math.floor(directionIndex / 2)]!;
    const sign = directionIndex % 2 === 0 ? 1 : -1;
    const bounds = definition.axes[axis];
    const value = Number((best.design[axis] + sign * state.steps[axis]).toFixed(8));
    if (value < bounds.min - 1e-9 || value > bounds.max + 1e-9) continue;
    const candidate = { design: { ...best.design, [axis]: value }, layoutId: best.layoutId };
    if (visited.has(candidateKey(candidate))) continue;
    return { candidate, state, rationale: "Probe " + axis + " " + (sign > 0 ? "+" : "-") + state.steps[axis].toFixed(2) + " um around the best measured candidate; reverse direction after an unsuccessful probe." };
  }
  return null;
}
