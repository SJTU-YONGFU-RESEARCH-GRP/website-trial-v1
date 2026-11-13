import { restoreSelectionSource, SELECTION_PHYSICAL_VERSION } from "./selectionPhysical.ts";
import fs from "node:fs/promises";
import path from "node:path";
import type { ModuleAdapterV1, ParsedModuleResultV1 } from "../../../shared/contracts/v1.ts";
import { listOutputs, artifactRole } from "../acg/parser.ts";
import { DTCO_VERSION, METRIC_SCOPE } from "./environment.ts";
import { frozenSnapshot, buildDtcoPlan } from "./planner.ts";
import { executeDtcoStep } from "./executor.ts";
import type { ValidationContext } from "../acg/types.ts";
import { isSelectionJob, selectionSnapshot, buildSelectionPlan, verifySelectionSnapshot, parseSelectionResult } from "./selection.ts";
export const dtcoModuleAdapter:ModuleAdapterV1={
 moduleId:"dtco",
 async capabilities(){return [{schemaVersion:"eda.capability.v1",capabilityVersion:DTCO_VERSION,toolId:"dtco-composite",moduleId:"dtco",label:"DTCO inverter exploration",description:METRIC_SCOPE,health:"not_configured",healthReason:"Use DTCO options for administrator tool/model availability",toolVersion:null,operations:["run"],inputRoles:[],parameters:[],plannedStepTemplates:[],limits:{arbitraryScripts:false,extractedRc:false,maxPoints:64}}];},
 async validateDraft(context){try{if(isSelectionJob(context.job)){selectionSnapshot(context.job);buildSelectionPlan(context.job);return {valid:true,errors:[],warnings:[]};}frozenSnapshot(context.job);await buildDtcoPlan(context as ValidationContext);return {valid:true,errors:[],warnings:[METRIC_SCOPE]};}catch(error){return {valid:false,errors:[{type:"validation",code:"DTCO_PREFLIGHT",message:error instanceof Error?error.message:String(error),stepId:null,retryable:true,details:null}],warnings:[]};}},
 buildPlan:context=>isSelectionJob(context.job)?Promise.resolve(buildSelectionPlan(context.job)):buildDtcoPlan(context as ValidationContext),
 executeStep:async context=>{if(!isSelectionJob(context.job))return executeDtcoStep(context);await verifySelectionSnapshot(context);if(context.step.stepKey==="selection-restore")return restoreSelectionSource(context);const run=(context as any).runPlannedProcess;if(!run)throw new Error("Safe planned process runner required");const result=await run();return {exitCode:result.exitCode,outputs:{processId:result.processId,processGroupId:result.processGroupId}};},
 async parseResult(context){if(isSelectionJob(context.job))return parseSelectionResult(context);const data=JSON.parse(await fs.readFile(path.join(context.workspacePath,"output/dtco-result.json"),"utf8")) as ParsedModuleResultV1;if((data.data.dtco as any)?.schemaVersion!=="dtco.result.v1")throw new Error("Missing DTCO normalized result");return data;},
 async publishResult(_context,result){if(!result.data.dtco&&!result.data.dtcoSelection)throw new Error("Missing DTCO measurements");},
 async collectArtifacts(context){if(isSelectionJob(context.job))return (await listOutputs(context.workspacePath,"output/selection",selectionSnapshot(context.job).schemaVersion===SELECTION_PHYSICAL_VERSION?16384:4096)).map(relativePath=>({role:relativePath===(selectionSnapshot(context.job).schemaVersion===SELECTION_PHYSICAL_VERSION?"output/selection/complete-result.json":"output/selection/result.json")?"normalized-result":"dtco-selection-evidence",relativePath,mediaType:relativePath.endsWith(".json")?"application/json":relativePath.endsWith(".gds")?"application/octet-stream":relativePath.endsWith(".png")?"image/png":relativePath.endsWith(".odb")?"application/octet-stream":"text/plain",required:relativePath===(selectionSnapshot(context.job).schemaVersion===SELECTION_PHYSICAL_VERSION?"output/selection/complete-result.json":"output/selection/result.json"),publish:true}));return (await listOutputs(context.workspacePath,"output",10000)).map(relativePath=>({role:relativePath==="output/dtco-result.json"?"normalized-result":relativePath.startsWith("output/dtco/")?"dtco-evidence":artifactRole(relativePath),relativePath,mediaType:relativePath.endsWith(".json")?"application/json":relativePath.endsWith(".gds")?"application/octet-stream":relativePath.endsWith(".png")?"image/png":"text/plain",required:relativePath==="output/dtco-result.json",publish:true}));}
};
export default dtcoModuleAdapter;
