import type { DraftValidationContextV1, JobPlanV1, JsonObject, PlannedStepV1, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import { ppaFlowAdapters } from "./adapters/index.ts";
import { parserStep, requireFlowTool, requireParser, step } from "./adapters/base.ts";
import { normalizeParameters } from "./helpers.ts";
import { expandSweep } from "./sweep.ts";
import { selectedTechnology } from "./validation.ts";
import type { PpaRuntimeBindings } from "./types.ts";
import { PPA_CAPABILITY_VERSION } from "./types.ts";

function prefixStep(pointIndex: number, item: PlannedStepV1): PlannedStepV1 {
  const prefix = `run-${String(pointIndex + 1).padStart(4, "0")}`;
  return { ...item, id: `${prefix}:${item.id}`, name: `${item.name} · sweep ${pointIndex + 1}`, process: item.process ? { ...item.process, cwdRelative: prefix } : null };
}

export function buildPpaPlan(context: DraftValidationContextV1): JobPlanV1 {
  const parameters = normalizeParameters(context.job.parameters); const adapter = ppaFlowAdapters[parameters.flow];
  const runtime = context as DraftValidationContextV1 & PpaRuntimeBindings;
  const maxRunCount = runtime.maxSweepJobs ?? 256; const sweep = expandSweep(context.job.parameters, adapter.parameters, maxRunCount);
  const parser = requireParser(context); const importMode = /import/i.test(context.job.operation);
  if (importMode) return {
    schemaVersion: "eda.job-plan.v1", capabilityVersion: PPA_CAPABILITY_VERSION,
    steps: [
      step("validate-input", "Validate completed run", "Validate native result files and preserve their directory structure without executing uploaded scripts.", 15, null, ["completed_run"], []),
      step("prepare-import", "Stage completed run evidence", "Create an immutable parser view of the uploaded run tree.", 10, null, ["completed_run"], ["native-run"]),
      parserStep(parser, adapter.parserFlow, "work/import-run"),
      step("normalize", "Validate normalized PPA result", "Validate result_json_ast output and provenance.", 60, null, ["normalized-ast"], ["normalized-result"]),
      step("publish", "Publish atomically", "Publish only after complete parser validation.", 5, null, ["normalized-result"], ["ppa-result"]),
    ], sweep: null, warnings: ["Imported executable scripts/configuration are evidence-only and are never run."],
  };
  const technology = selectedTechnology(context); if (!technology) throw new Error("technology is required");
  const flowTool = requireFlowTool(context, parameters.flow);
  const buildPoint = (point: JsonObject): PlannedStepV1[] => {
    const pointContext = { ...context, job: { ...context.job, parameters: { ...context.job.parameters, ...point, sweepPoint: point }, toolConfigurations: context.job.toolConfigurations } };
    return adapter.steps(flowTool, parser, technology, pointContext as never);
  };
  const points = sweep.points.length === 1 && !Object.keys(sweep.dimensions).length ? buildPoint({}) : sweep.points.flatMap((point, index) => buildPoint(point).map((item) => prefixStep(index, item)));
  return { schemaVersion: "eda.job-plan.v1", capabilityVersion: PPA_CAPABILITY_VERSION, steps: points,
    sweep: Object.keys(sweep.dimensions).length ? { dimensions: sweep.dimensions, runCount: sweep.runCount, maxRunCount } : null,
    warnings: Object.keys(sweep.dimensions).length ? ["Each Cartesian sweep point has a distinct prefixed execution plan and workspace. Core queue integration may materialize these plans as independent child jobs."] : [],
  };
}

export function buildPpaSweepChildPlans(context: DraftValidationContextV1): Array<{ parameters: JsonObject; plan: JobPlanV1 }> {
  const parameters = normalizeParameters(context.job.parameters); const adapter = ppaFlowAdapters[parameters.flow]; const runtime = context as DraftValidationContextV1 & PpaRuntimeBindings;
  const sweep = expandSweep(context.job.parameters, adapter.parameters, runtime.maxSweepJobs ?? 256);
  return sweep.points.map((point) => {
    const child = { ...context, job: { ...context.job, parameters: { ...context.job.parameters, ...point, sweep: {}, sweepPoint: point } } };
    return { parameters: child.job.parameters, plan: buildPpaPlan(child) };
  });
}

export function plannedToolIds(plan: JobPlanV1): string[] { return [...new Set(plan.steps.flatMap((item) => item.process ? [item.process.toolConfigurationId] : []))]; }
export function toolSnapshot(configurations: ToolConfigurationSnapshotV1[], id: string): ToolConfigurationSnapshotV1 | null { return configurations.find((tool) => tool.id === id) ?? null; }
