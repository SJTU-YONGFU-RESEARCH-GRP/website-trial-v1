import type { DtcoExperimentDefinition, DtcoMeasuredMetrics, DtcoOptimizationCandidate, DtcoOptimizationDefinition } from "../../../shared/contracts/dtco.ts";

export const WIDTH_GRID = 0.05;
export const AXES = ["nmosWidthUm", "pmosWidthUm"] as const;
export interface SearchState { cursor: number; steps: Record<string, number>; retryAttemptId?: string; }
export const candidateKey = (candidate: DtcoOptimizationCandidate): string => JSON.stringify(candidate);
export const initialCandidate = (definition: DtcoOptimizationDefinition): DtcoOptimizationCandidate => ({
  design: { nmosWidthUm: definition.axes.nmosWidthUm.initial, pmosWidthUm: definition.axes.pmosWidthUm.initial }, layoutId: definition.layoutIds[0]!,
  ...(definition.parameterAxes?{parameters:Object.fromEntries(Object.entries(definition.parameterAxes).sort(([a],[b])=>a.localeCompare(b)).map(([key,axis])=>[key,axis.initial]))}:{}),
  ...(definition.processCorners?{processCorner:definition.processCorners[0]!}:{}),
});
export const initialState = (definition: DtcoOptimizationDefinition): SearchState => ({
  cursor: 0, steps: Object.fromEntries(Object.entries(definition.parameterAxes??definition.axes).map(([key,axis])=>[key,axis.step])),
});
export function experimentDefinition(definition: DtcoOptimizationDefinition, candidate: DtcoOptimizationCandidate): DtcoExperimentDefinition {
  const result:DtcoExperimentDefinition={ name: definition.name, circuitId: definition.circuitId, technologyId: definition.technologyId, modelVersion: definition.modelVersion,
    temperaturesC: [definition.temperatureC], voltagesV: [definition.voltageV], layoutIds: [candidate.layoutId],
    loadFf: definition.loadFf, inputSlewPs: definition.inputSlewPs, periodNs: definition.periodNs,
    ...(definition.parameterAxes?{}:{design:candidate.design}), electricalMode: definition.electricalMode??"extracted" };
  for(const key of ["sizingMode","deviceOverrides","groupOverrides","characterizationArcId","workflow"] as const)
    if(definition[key]!==undefined)Object.assign(result,{[key]:structuredClone(definition[key])});
  if(definition.groundVoltageV!==undefined)result.groundVoltagesV=[definition.groundVoltageV];
  if(candidate.processCorner)result.processCorners=[candidate.processCorner];
  for(const [key,value] of Object.entries(candidate.parameters??{})) {
    if(key==="voltageV")result.voltagesV=[value];
    else if(key==="groundVoltageV")result.groundVoltagesV=[value];
    else if(key==="temperatureC")result.temperaturesC=[value];
    else {
      const match=/^(device|group):(.+):(widthUm|lengthUm)$/.exec(key);
      if(!match)throw new Error("Unsupported optimization parameter "+key);
      const target=match[1]==="device"?"deviceOverrides":"groupOverrides";
      const overrides=result[target]??{};result[target]=overrides;
      overrides[match[2]!]={...overrides[match[2]!],[match[3]!]:value};
    }
  }
  return result;
}
export function objectiveScore(definition: DtcoOptimizationDefinition, metrics: DtcoMeasuredMetrics, baseline: DtcoMeasuredMetrics): number {
  if (definition.objective.metric !== "balanced") { const value=metrics[definition.objective.metric];if(value===null||value===undefined)throw new Error("Objective metric is unavailable");return definition.objective.metric==="maxFrequencyHz"?1/value:value; }
  if(metrics.areaUm2===null||baseline.areaUm2===null)throw new Error("Balanced objective requires measured area");
  const weights = definition.objective.weights || { delay: 1, power: 1, area: 1 };
  const total = weights.delay + weights.power + weights.area;
  return (weights.delay * metrics.delayPs / baseline.delayPs + weights.power * metrics.averagePowerW / baseline.averagePowerW + weights.area * metrics.areaUm2 / baseline.areaUm2) / total;
}
export function nextCandidate(definition: DtcoOptimizationDefinition, best: DtcoOptimizationCandidate, input: SearchState, visited: Set<string>):
  { candidate: DtcoOptimizationCandidate; state: SearchState; rationale: string } | null {
  const state: SearchState = { ...input, steps: { ...input.steps } };
  const generic=definition.parameterAxes!==undefined;
  const axes=Object.entries(definition.parameterAxes??definition.axes).filter(([,axis])=>axis.min<axis.max).sort(([a],[b])=>a.localeCompare(b));
  const layouts=definition.layoutIds.filter(id=>id!==best.layoutId);
  const count=axes.length*2+layouts.length;
  if(!count)return null;
  for(let guard=0;guard<1024;guard++) {
    if(state.cursor>=count) {
      let changed=false;
      for(const [key,axis] of axes) {
        const grid=generic?axis.step:WIDTH_GRID;
        const next=Math.max(grid,Math.floor(((state.steps[key]??axis.step)/2+1e-9)/grid)*grid);
        if(Math.abs(next-(state.steps[key]??axis.step))>1e-9)changed=true;
        state.steps[key]=next;
      }
      if(!changed)return null;
      state.cursor=0;
    }
    const index=state.cursor++;
    let candidate:DtcoOptimizationCandidate,rationale:string;
    if(index<axes.length*2) {
      const [key,axis]=axes[Math.floor(index/2)]!,sign=index%2===0?1:-1,step=state.steps[key]??axis.step;
      const current=generic?best.parameters![key]!:best.design[key as keyof typeof best.design];
      const value=Number((current+sign*step).toPrecision(12));
      if(value<axis.min-1e-9||value>axis.max+1e-9)continue;
      candidate=generic?{...best,parameters:{...best.parameters,[key]:value}}:{...best,design:{...best.design,[key]:value}};
      rationale="Probe "+key+" "+(sign>0?"+":"-")+step+" around the best measured candidate; reverse direction after an unsuccessful probe.";
    } else {
      const layoutId=layouts[index-axes.length*2]!;
      candidate={...best,layoutId};rationale="Evaluate layout "+layoutId+" around the best measured candidate.";
    }
    if(visited.has(candidateKey(candidate)))continue;
    return {candidate,state,rationale};
  }
  return null;
}
