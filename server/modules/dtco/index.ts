import fs from "node:fs/promises";
import path from "node:path";
import type { ModuleAdapterV1, ParsedModuleResultV1 } from "../../../shared/contracts/v1.ts";
import { listOutputs, artifactRole } from "../acg/parser.ts";
import { DTCO_VERSION, METRIC_SCOPE } from "./environment.ts";
import { frozenSnapshot, buildDtcoPlan } from "./planner.ts";
import { executeDtcoStep } from "./executor.ts";
import type { ValidationContext } from "../acg/types.ts";
export const dtcoModuleAdapter:ModuleAdapterV1={
 moduleId:"dtco",
 async capabilities(){return [{schemaVersion:"eda.capability.v1",capabilityVersion:DTCO_VERSION,toolId:"dtco-composite",moduleId:"dtco",label:"DTCO inverter exploration",description:METRIC_SCOPE,health:"not_configured",healthReason:"Use DTCO options for administrator tool/model availability",toolVersion:null,operations:["run"],inputRoles:[],parameters:[],plannedStepTemplates:[],limits:{arbitraryScripts:false,extractedRc:false,maxPoints:64}}];},
 async validateDraft(context){try{frozenSnapshot(context.job);await buildDtcoPlan(context as ValidationContext);return {valid:true,errors:[],warnings:[METRIC_SCOPE]};}catch(error){return {valid:false,errors:[{type:"validation",code:"DTCO_PREFLIGHT",message:error instanceof Error?error.message:String(error),stepId:null,retryable:true,details:null}],warnings:[]};}},
 buildPlan:context=>buildDtcoPlan(context as ValidationContext),
 executeStep:executeDtcoStep,
 async parseResult(context){const data=JSON.parse(await fs.readFile(path.join(context.workspacePath,"output/dtco-result.json"),"utf8")) as ParsedModuleResultV1;if((data.data.dtco as any)?.schemaVersion!=="dtco.result.v1")throw new Error("Missing DTCO normalized result");return data;},
 async publishResult(_context,result){if(!result.data.dtco)throw new Error("Missing DTCO measurements");},
 async collectArtifacts(context){return (await listOutputs(context.workspacePath,"output",10000)).map(relativePath=>({role:relativePath==="output/dtco-result.json"?"normalized-result":relativePath.startsWith("output/dtco/")?"dtco-evidence":artifactRole(relativePath),relativePath,mediaType:relativePath.endsWith(".json")?"application/json":relativePath.endsWith(".gds")?"application/octet-stream":relativePath.endsWith(".png")?"image/png":"text/plain",required:relativePath==="output/dtco-result.json",publish:true}));}
};
export default dtcoModuleAdapter;
