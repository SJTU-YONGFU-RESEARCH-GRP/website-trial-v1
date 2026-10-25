import fs from "node:fs/promises";
import type { CollectedArtifactV1, DraftValidationContextV1, ModuleAdapterV1, ModuleContextV1, ParsedModuleResultV1, StepExecutionContextV1 } from "../../../shared/contracts/v1.ts";
import { ppaCapabilities } from "./capabilities.ts";
import { executePpaStep, findNativeArtifacts } from "./executor.ts";
import { workspacePath } from "./helpers.ts";
import { validatePpaParsedResult } from "./parser.ts";
import { buildPpaPlan } from "./planner.ts";
import type { PpaExecutionContext, PpaModuleContext } from "./types.ts";
import { validatePpaDraft } from "./validation.ts";

function mediaType(filename: string): string { return filename.endsWith(".json") ? "application/json" : filename.endsWith(".csv") ? "text/csv" : filename.endsWith(".gds") ? "application/octet-stream" : "text/plain"; }

export const ppaModuleAdapter: ModuleAdapterV1 = {
  moduleId: "ppa",
  async capabilities(context: ModuleContextV1) { return ppaCapabilities(context as PpaModuleContext); },
  async validateDraft(context: DraftValidationContextV1) { return validatePpaDraft(context); },
  async buildPlan(context: DraftValidationContextV1) { return buildPpaPlan(context); },
  async executeStep(context: StepExecutionContextV1) { return executePpaStep(context as PpaExecutionContext); },
  async parseResult(context: StepExecutionContextV1): Promise<ParsedModuleResultV1> {
    const prefix = context.step.stepKey.includes(":") ? `${context.step.stepKey.slice(0, context.step.stepKey.indexOf(":"))}/` : "";
    const filename = workspacePath(context.workspacePath, `${prefix}output/ppa-result.json`); const result = JSON.parse(await fs.readFile(filename, "utf8")); validatePpaParsedResult(result); return result;
  },
  async publishResult(_context: StepExecutionContextV1, result: ParsedModuleResultV1) { validatePpaParsedResult(result); },
  async collectArtifacts(context: StepExecutionContextV1) {
    const files = await findNativeArtifacts(context.workspacePath);
    return files.filter((file) => file.startsWith("output/") || file.startsWith("work/") || file.startsWith("logs/") || /^run-\d+\/(?:output|work|logs)\//.test(file)).map((relativePath): CollectedArtifactV1 => ({ role: relativePath.endsWith("output/ppa-result.json") ? "normalized-result" : relativePath.includes("parse-native.stdout") ? "parser-log" : "native-run", relativePath, mediaType: mediaType(relativePath), required: relativePath.endsWith("output/ppa-result.json"), publish: true }));
  },
};

export { libreLaneAdapter, openLane1Adapter, openRoadOrfsAdapter, ppaFlowAdapters } from "./adapters/index.ts";
export { ppaCapabilities } from "./capabilities.ts";
export { buildPpaPlan, buildPpaSweepChildPlans } from "./planner.ts";
export { expandSweep } from "./sweep.ts";
export { validatePpaDraft } from "./validation.ts";
export default ppaModuleAdapter;
