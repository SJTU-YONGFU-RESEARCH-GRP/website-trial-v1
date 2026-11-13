import fs from "node:fs/promises";
import path from "node:path";
import type { ModuleAdapterV1, ParsedModuleResultV1 } from "../../../shared/contracts/v1.ts";
import { acgCapabilities } from "./capabilities.ts";
import { buildAcgPlan } from "./planner.ts";
import { executeAcgStep } from "./executor.ts";
import { listOutputs, artifactRole } from "./parser.ts";
import { validateAcgDraft } from "./validation.ts";
import type { ValidationContext } from "./types.ts";
export const acgModuleAdapter: ModuleAdapterV1 = {
  moduleId:"acg",
  capabilities:acgCapabilities,
  validateDraft:context=>validateAcgDraft(context as ValidationContext),
  buildPlan:context=>buildAcgPlan(context as ValidationContext),
  executeStep:executeAcgStep,
  async parseResult(context) {
    const result = JSON.parse(await fs.readFile(path.join(context.workspacePath,"output/acg-result.json"),"utf8")) as ParsedModuleResultV1;
    if ((!result.data.acg || !Array.isArray((result.data.acg as Record<string,unknown>).cells)) && (result.data.acgResearch as Record<string,unknown>|undefined)?.schemaVersion!=="acg.research-workflow.v1") throw new Error("Invalid ACG normalized result");
    return result;
  },
  async publishResult(_context,result) { if (!result.data.acg && !result.data.acgResearch) throw new Error("Missing ACG result"); },
  async collectArtifacts(context) {
    const files = await listOutputs(context.workspacePath,"output",context.job.operation && context.job.operation!=="run" ? 32768 : 4000);
    return files.map(relativePath=>({role:relativePath==="output/acg-result.json" ? "normalized-result" : relativePath.startsWith("output/research-workflow/") ? relativePath.includes("snapshot") ? "acg-research-snapshot" : "acg-research-report" : relativePath.startsWith("output/unified/") ? "acg-unified-report" : artifactRole(relativePath),relativePath,
      mediaType:relativePath.endsWith(".png") ? "image/png" : relativePath.endsWith(".json") ? "application/json" : relativePath.endsWith(".gds") ? "application/octet-stream" : "text/plain",
      required:relativePath==="output/acg-result.json",publish:true}));
  }
};
export default acgModuleAdapter;
