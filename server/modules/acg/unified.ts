import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import type {JobPlanV1,JsonObject,ParsedModuleResultV1,PlannedStepV1} from "../../../shared/contracts/v1.ts";
import {ACG_RESEARCH_ALGORITHMS} from "../../../shared/acgResearch.ts";
import {AcgError,fail,object,regular,ready,projectRoot,writeJson,type ValidationContext,type AcgExecutionContext} from "./types.ts";
import {resolveInputs} from "./validation.ts";
import {inspectNative} from "./parser.ts";
export const UNIFIED_SCHEMA="acg.unified.v1";
export const UNIFIED_DEFAULTS={algorithms:["dp","sa"],trials:1,threads:1,maxCols:8,searchMaxAttempts:6,searchTotalBudgetSeconds:180,searchPerAttemptSeconds:30,searchTrackNums:[9,12,16],searchExtraCpp:[0,2,4]};
export const UNIFIED_LIMITS={maxMatrixRuns:1000,maxCells:256,maxTrials:10,maxThreads:4,maxSearchAttempts:100,maxSearchBudgetSeconds:86400,maxSearchPerAttemptSeconds:3600,searchBudgetScope:"job"};
const hash=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
const jsonHash=(value:unknown)=>hash(JSON.stringify(value,null,2)+"\n");
const labels={generation:"Layout generation",comparison:"Same-input algorithm comparison",search:"Bounded MR feasible search",report:"Unified evidence report"};
export type UnifiedSettings=typeof UNIFIED_DEFAULTS;
export function normalizeUnifiedSettings(value:unknown,engine:string):UnifiedSettings {
 const raw=value===undefined?{}:object(value);
 for(const key of Object.keys(raw))if(!(key in UNIFIED_DEFAULTS))fail("ACG_UNIFIED_PARAMETER","Unsupported unified parameter: "+key);
 const result={...UNIFIED_DEFAULTS,...raw} as UnifiedSettings;
 const ranges={trials:[1,10],threads:[1,4],maxCols:[4,32],searchMaxAttempts:[1,100],searchTotalBudgetSeconds:[1,86400],searchPerAttemptSeconds:[1,3600]} as const;
 for(const [key,[min,max]] of Object.entries(ranges)){const v=result[key as keyof UnifiedSettings];if(typeof v!=="number"||!Number.isSafeInteger(v)||v<min||v>max)fail("ACG_UNIFIED_PARAMETER",key+" must be an integer in "+min+".."+max);}
 if(!Array.isArray(result.algorithms)||result.algorithms.length>14||new Set(result.algorithms).size!==result.algorithms.length||result.algorithms.some(x=>typeof x!=="string"||!(engine==="dr"?ACG_RESEARCH_ALGORITHMS.mr:ACG_RESEARCH_ALGORITHMS[engine as "mr"|"cmos"]??[]).includes(x))||engine!=="dr"&&!result.algorithms.length)fail("ACG_UNIFIED_ALGORITHM","Select unique supported comparison algorithms");
 for(const [key,min,max] of [["searchTrackNums",5,16],["searchExtraCpp",0,16]] as const){const a=result[key];if(!Array.isArray(a)||!a.length||a.length>17||a.some((x,i)=>!Number.isSafeInteger(x)||x<min||x>max||i>0&&x<=a[i-1]!))fail("ACG_UNIFIED_PARAMETER",key+" must be unique ascending integers in "+min+".."+max);}
 return result;
}
type Snapshot={settings:UnifiedSettings;request:JsonObject;budget:JsonObject;helperHashes:Record<string,string>;helperPaths:Record<string,string>;snapshotHash?:string};
async function resolveUnified(context:ValidationContext):Promise<Snapshot>{
 const resolved=await resolveInputs(context),settings=normalizeUnifiedSettings(context.job.parameters.unified,resolved.parameters.engine);
 if(resolved.cellNames.length>UNIFIED_LIMITS.maxCells)fail("ACG_UNIFIED_CELLS","Unified flow supports at most 256 uploaded cells");
 if(resolved.parameters.engine==="dr"&&resolved.config.enable_double_row===true&&Number(resolved.config.track_num)<6)fail("ACG_DR_ROWS_TRACKS","DR double-row generation requires at least 6 effective routing tracks");
 const helper=context.job.toolConfigurations.find(t=>t.toolId==="acg-research"&&t.enabled);
 if(!helper||!ready(context,helper)||!helper.entryPoint||!helper.rootPath)throw new AcgError("ACG_UNIFIED_TOOL","Healthy trusted acg-research helper is required","configuration");
 const entry=path.isAbsolute(helper.entryPoint)?helper.entryPoint:path.join(helper.rootPath,helper.entryPoint);
 const helperPaths={dispatcher:entry,unified:path.join(path.dirname(entry),"unified_workflow.py")};
 const helperHashes:Record<string,string>={};
 for(const [key,filename] of Object.entries(helperPaths)){const stat=await fs.lstat(filename);if(!stat.isFile()||stat.isSymbolicLink())fail("ACG_UNIFIED_TOOL","Unified helper must be a regular trusted file");helperHashes[key]=hash(await fs.readFile(filename));}
 const version=context.toolHealth?.[helper.id]?.version??context.toolBindings?.[helper.toolId]?.version;
 if(!version?.includes("sha256:"+helperHashes.dispatcher)||!version.includes("unifiedSha256:"+helperHashes.unified))throw new AcgError("ACG_UNIFIED_TOOL","Unified helper must pass self-test for both current source checksums","configuration");
 const native=resolved.configuration,project=await projectRoot(native,resolved.parameters.engine);
 const scripts:Record<string,string>={};
 if(resolved.parameters.engine!=="dr")for(const name of ["benchmark_runner.py","benchmark_report.py",...(resolved.parameters.engine==="mr"?["build_known_feasible_corpus.py"]:[])])scripts[name]=hash(await fs.readFile(await regular(project,"scripts/"+name)));
 const resourceSha256:Record<string,string>={};
 if(resolved.parameters.engine!=="dr"){
  for(const name of ["ascii_to_gds_gdstk.py","gds_merge_all_layers_klayout.rb"]){const filename=path.join(project,"scripts",name);try{await fs.lstat(filename);}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")continue;throw error;}resourceSha256[filename]=hash(await fs.readFile(await regular(project,"scripts/"+name)));}
  for(let ancestor=project;;ancestor=path.dirname(ancestor)){const filename=path.join(ancestor,"bin/ascii2gdsii.jar");try{await fs.lstat(filename);resourceSha256[filename]=hash(await fs.readFile(await regular(ancestor,"bin/ascii2gdsii.jar")));break;}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}if(path.dirname(ancestor)===ancestor)break;}
 }
 const timeoutSeconds=Math.min(resolved.parameters.timeoutSeconds??native.timeoutSeconds,native.timeoutSeconds);
 const comparable=resolved.parameters.engine!=="dr"&&resolved.config.tech==="gf180";
 if(settings.threads>Math.max(1,native.maxConcurrency??1))fail("ACG_UNIFIED_CONCURRENCY","Comparison threads exceed administrator native concurrency "+(native.maxConcurrency??1));
 const searchable=resolved.parameters.engine==="mr"&&resolved.config.tech==="gf180"&&Number(resolved.config.num_rows??1)<=3;
 if(searchable&&Number(resolved.config.num_rows??1)===1&&settings.searchTrackNums.some(t=>![9,12,16].includes(t)))fail("ACG_UNIFIED_SEARCH_TRACKS","Single-row GF180 search supports tracks 9, 12, 16");
 const comparisonMaximumRuns=comparable?resolved.cellNames.length*settings.algorithms.length*settings.trials:0;
 if(comparisonMaximumRuns>1000)fail("ACG_UNIFIED_BUDGET","Comparison exceeds 1000 native runs");
 const comparisonUpperBoundSeconds=comparisonMaximumRuns*timeoutSeconds;
 const budget={comparisonMaximumRuns,comparisonUpperBoundSeconds,searchMaximumAttempts:searchable?settings.searchMaxAttempts:0,searchUpperBoundSeconds:searchable?settings.searchTotalBudgetSeconds:0,totalUpperBoundSeconds:timeoutSeconds+comparisonUpperBoundSeconds+(searchable?settings.searchTotalBudgetSeconds:0)+120,searchBudgetScope:"job"};
 if(comparisonUpperBoundSeconds+30>helper.timeoutSeconds||Number(budget.searchUpperBoundSeconds)+30>helper.timeoutSeconds)fail("ACG_UNIFIED_BUDGET","A stage serial upper bound exceeds administrator helper timeout "+helper.timeoutSeconds);
 const request={schemaVersion:"acg.unified-request.v1",engine:resolved.parameters.engine,trustedResources:{nativeRoot:native.rootPath,executable:native.executablePath,executableSha256:hash(await fs.readFile(native.executablePath!)),scriptSha256:scripts,resourceSha256,helperSha256:helperHashes},inputs:{netlist:"work/netlist.sp",configBase:"work/config.json",rules:"work/rules.json"},cellNames:resolved.cellNames,comparison:{algorithms:settings.algorithms,trials:settings.trials,rowCounts:[resolved.parameters.engine==="mr"?Number(resolved.config.num_rows??1):1],threads:settings.threads,maxCols:settings.maxCols,timeoutSeconds,totalTimeoutSeconds:comparisonUpperBoundSeconds},search:{maxAttempts:settings.searchMaxAttempts,totalTimeoutSeconds:settings.searchTotalBudgetSeconds,attemptTimeoutSeconds:settings.searchPerAttemptSeconds,tracks:settings.searchTrackNums,extraCpp:settings.searchExtraCpp},stageInputs:{shared:["netlist","effective-config","effective-rules"],generationOnlyRoles:["placement","port-verilog","port-metadata","source-diagnostic"].filter(role=>resolved.mapping[role as keyof typeof resolved.mapping]),generationOnlyParameters:["widenPolicy","widenExtraCpp","routabilityPipeline"].filter(key=>resolved.parameters[key as keyof typeof resolved.parameters]!==undefined),researchSemantics:"Comparison/search regenerate placement from the original netlist and effective config/rules; generation replay/ports/diagnostic and CLI widening are not reapplied."},generationResult:"output/acg-generation.json",sourceNetlistSha256:resolved.mapping.netlist!.sha256,configSha256:jsonHash(resolved.config),rulesSha256:jsonHash(resolved.rules),budget};
 return {settings,request:request as unknown as JsonObject,budget,helperHashes,helperPaths};
}
export async function validateUnifiedDraft(context:ValidationContext){
 try{const snapshot=await resolveUnified(context);return {valid:true,errors:[],warnings:["All four stages are automatic. Unsupported native stages remain explicit.","Search uses a shared job budget; capped search does not prove infeasibility.","Comparison process budget: "+snapshot.budget.comparisonUpperBoundSeconds+" seconds; search job budget: "+snapshot.budget.searchUpperBoundSeconds+" seconds."]};}
 catch(error){const e=error instanceof AcgError?error:new AcgError("ACG_UNIFIED_PREFLIGHT",error instanceof Error?error.message:String(error));return {valid:false,errors:[{type:e.type,code:e.code,message:e.message,stepId:null,retryable:true,details:null}],warnings:[]};}
}
export async function buildUnifiedPlan(context:ValidationContext,buildNative:(context:ValidationContext)=>Promise<JobPlanV1>):Promise<JobPlanV1>{
 const snapshot=await resolveUnified(context),plan=await buildNative(context),helper=context.job.toolConfigurations.find(t=>t.toolId==="acg-research")!;
 const normalize=plan.steps.find(t=>t.id==="normalize")!;normalize.id="generation-normalize";normalize.name="Preserve generation evidence before comparison and search";
 plan.steps.find(t=>t.id==="generate")!.required=false;
 plan.steps.splice(plan.steps.findIndex(s=>s.id==="prepare")+1,0,{id:"unified-prepare",name:"Freeze unified helper inputs",description:"Verify helper and native sources",required:true,weight:1,process:null,inputRoles:["netlist","native-config","native-rules"],outputRoles:["acg-report"]});
 for(const id of ["comparison","search","report"] as const){const timeout=id==="comparison"?Number(snapshot.budget.comparisonUpperBoundSeconds)+30:id==="search"?Number(snapshot.budget.searchUpperBoundSeconds)+30:60;
 const step:PlannedStepV1={id:"unified-"+id,name:labels[id],description:labels[id],required:true,weight:1,inputRoles:["netlist","native-config","native-rules"],outputRoles:["acg-unified-report"],process:{toolConfigurationId:helper.id,executableDisplay:"acg-research",argv:["--request","work/unified-request.json","--output","output/unified/"+id,"--artifacts-root",".","--stage",id],cwdRelative:".",environmentNames:helper.environmentNames,timeoutSeconds:Math.max(30,timeout),expectedOutputs:["output/unified/"+id+"/summary.json"]}};plan.steps.push(step);}
 plan.steps.push({id:"unified-normalize",name:"Assemble one unified result",description:"Verify all stage evidence and retain generation data",required:true,weight:1,process:null,inputRoles:["acg-unified-report","normalized-result"],outputRoles:["normalized-result"]});
 const processUpperBoundSeconds=plan.steps.reduce((total,step)=>total+(step.process?.timeoutSeconds??0),0);snapshot.budget.processUpperBoundSeconds=processUpperBoundSeconds;snapshot.budget.totalUpperBoundSeconds=processUpperBoundSeconds;snapshot.budget.boundScope="sum of planned process timeouts; in-process parsing and queue time excluded";snapshot.request.budget=snapshot.budget;
 plan.capabilityVersion=UNIFIED_SCHEMA;plan.warnings.push(String(object(snapshot.request.stageInputs).researchSemantics),"Automatic generation, comparison, bounded search and report share the original upload checksum.","Search attempt and time budgets are shared across the job; native partial outcomes remain explicit.","Planned process timeout upper bound: "+snapshot.budget.totalUpperBoundSeconds+" seconds; queue time and in-process parsing are additional.");
 (plan as JobPlanV1&{acgUnifiedSnapshot:unknown}).acgUnifiedSnapshot={...snapshot,snapshotHash:hash(JSON.stringify(snapshot))};return plan;
}
function frozen(context:AcgExecutionContext):Snapshot{
 const value=(context.job.plan as unknown as {acgUnifiedSnapshot:Snapshot}).acgUnifiedSnapshot;if(!value)throw new AcgError("ACG_UNIFIED_SNAPSHOT","Missing frozen unified snapshot","configuration");
 const {snapshotHash,...snapshot}=value;if(hash(JSON.stringify(snapshot))!==snapshotHash)throw new AcgError("ACG_UNIFIED_SNAPSHOT","Frozen unified snapshot changed","configuration");return snapshot;
}
async function stageSummary(root:string,id:string,snapshot:Snapshot):Promise<JsonObject>{
 const prefix="output/unified/"+id+"/",summary=object(JSON.parse(await fs.readFile(await regular(root,prefix+"summary.json"),"utf8")));
 if(summary.schemaVersion!=="acg.unified-stage.v1"||summary.id!==id||summary.engine!==snapshot.request.engine||!["completed","partial","unsupported","failed"].includes(String(summary.status))||summary.sourceNetlistSha256!==snapshot.request.sourceNetlistSha256||summary.configSha256!==snapshot.request.configSha256||summary.rulesSha256!==snapshot.request.rulesSha256||summary.requestSha256!==jsonHash(snapshot.request))throw new AcgError("ACG_UNIFIED_EVIDENCE","Stage source/status binding differs: "+id,"parser");
 const resources=object(snapshot.request.trustedResources),scripts=object(resources.scriptSha256);
 if(JSON.stringify(object(summary.helperSha256))!==JSON.stringify(snapshot.helperHashes))throw new AcgError("ACG_UNIFIED_EVIDENCE","Stage helper binding differs: "+id,"parser");
 if(summary.executableSha256!==resources.executableSha256)throw new AcgError("ACG_UNIFIED_EVIDENCE","Stage executable binding differs: "+id,"parser");
 const expectedResources=object(resources.resourceSha256);for(const[filename,digest]of Object.entries(object(summary.resourceSha256)))if(expectedResources[filename]!==digest)throw new AcgError("ACG_UNIFIED_EVIDENCE","Stage conversion resource binding differs: "+id,"parser");
 const actualScripts=object(summary.scriptSha256);for(const[name,digest]of Object.entries(actualScripts))if(scripts[name]!==digest)throw new AcgError("ACG_UNIFIED_EVIDENCE","Stage native script binding differs: "+id,"parser");
 if(summary.status!=="unsupported")for(const name of id==="comparison"?["benchmark_runner.py","benchmark_report.py"]:id==="search"?["build_known_feasible_corpus.py","benchmark_report.py"]:[])if(actualScripts[name]!==scripts[name])throw new AcgError("ACG_UNIFIED_EVIDENCE","Consumed native script missing: "+id,"parser");
 if(summary.status!=="unsupported"&&["comparison","search"].includes(id))for(const[filename,digest]of Object.entries(expectedResources))if(object(summary.resourceSha256)[filename]!==digest)throw new AcgError("ACG_UNIFIED_EVIDENCE","Consumed conversion resource missing: "+id,"parser");
 const evidence=object(summary.evidenceSha256);
 if(summary.rawReportPaths!==undefined&&(!Array.isArray(summary.rawReportPaths)||summary.rawReportPaths.some(p=>typeof p!=="string"||!Object.hasOwn(evidence,p))))throw new AcgError("ACG_UNIFIED_EVIDENCE","Report path lacks bound evidence: "+id,"parser");
 for(const [relative,digest] of Object.entries(evidence)){if(!relative||relative.includes("\\")||path.posix.isAbsolute(relative)||relative.split("/").some(part=>part===".."||part==="."||part==="")||typeof digest!=="string"||!/^[a-f0-9]{64}$/.test(digest)||hash(await fs.readFile(await regular(root,prefix+relative)))!==digest)throw new AcgError("ACG_UNIFIED_EVIDENCE","Stage artifact checksum differs: "+id,"parser");}
 return summary;
}
type NativeExecutor=(context:AcgExecutionContext)=>Promise<{exitCode:number;outputs:JsonObject}>;
export async function executeUnifiedStep(context:AcgExecutionContext,nativeExecute:NativeExecutor):Promise<{exitCode:number;outputs:JsonObject}>{
 const snapshot=frozen(context),root=context.workspacePath,key=context.step.stepKey;
 const runNative=(stepKey=key)=>nativeExecute({...context,job:{...context.job,operation:"run"},step:{...context.step,stepKey}} as AcgExecutionContext);
 if(key==="generate"){const result=await runNative();await writeJson(path.join(root,"work/unified-generation-exit.json"),{exitCode:result.exitCode});return {...result,outputs:{...result.outputs,unifiedRecoverable:result.exitCode!==0}};}
 if(key==="unified-prepare"){
  for(const [id,filename] of Object.entries(snapshot.helperPaths))if(hash(await fs.readFile(filename))!==snapshot.helperHashes[id])throw new AcgError("ACG_UNIFIED_HASH","Helper source changed after preflight","configuration");
  const resources=object(snapshot.request.trustedResources);if(hash(await fs.readFile(String(resources.executable)))!==resources.executableSha256)throw new AcgError("ACG_UNIFIED_HASH","Native executable changed after preflight","configuration");
  const project=await projectRoot({rootPath:String(resources.nativeRoot)} as never,String(snapshot.request.engine) as never);
  for(const[name,digest]of Object.entries(object(resources.scriptSha256)))if(hash(await fs.readFile(await regular(project,"scripts/"+name)))!==digest)throw new AcgError("ACG_UNIFIED_HASH","Native script changed after preflight","configuration");
  for(const[filename,digest]of Object.entries(object(resources.resourceSha256)))if(hash(await fs.readFile(await regular(path.dirname(filename),path.basename(filename))))!==digest)throw new AcgError("ACG_UNIFIED_HASH","Native conversion resource changed after preflight","configuration");
  for(const [relative,digest] of [["work/netlist.sp",snapshot.request.sourceNetlistSha256],["work/config.json",snapshot.request.configSha256],["work/rules.json",snapshot.request.rulesSha256]])if(hash(await fs.readFile(await regular(root,String(relative))))!==digest)throw new AcgError("ACG_UNIFIED_HASH","Staged source changed after preflight","storage");
  await writeJson(path.join(root,"work/unified-request.json"),snapshot.request);return {exitCode:0,outputs:{budget:snapshot.budget}};
 }
 if(key==="generation-normalize"){
  const input=JSON.parse(await fs.readFile(await regular(root,"work/acg-inputs.json"),"utf8")),exit=JSON.parse(await fs.readFile(await regular(root,"work/unified-generation-exit.json"),"utf8")).exitCode;
  const native=await inspectNative(root,input.parameters,input.cellNames);
  const usable=native.cells.every(cell=>cell.validGdsCount>0||cell.routing.status==="failed"||cell.placement.status==="failed");
  const verificationSkipped=exit!==0&&context.job.plan.steps.some(s=>["research-lvs1","official-pv"].includes(s.id));
  if(usable&&!verificationSkipped)await runNative("normalize");
  else await writeJson(path.join(root,"output/acg-result.json"),{title:"AutoCellGen "+native.engine.toUpperCase(),summary:{engine:native.engine,mode:native.mode,cellNames:native.cells.map(c=>c.cellName),cellCount:native.cells.length},data:{acg:{...native,configuration:input.parameters,processStatus:exit===0?"succeeded":"failed",previewStatus:"unavailable",diagnostics:["Generation did not provide complete normalized products; detailed native evidence remains retained."]}},artifactRoles:["acg-gds","acg-report"],parserId:"acg-native",parserVersion:"1.0.0"});
  const result=JSON.parse(await fs.readFile(await regular(root,"output/acg-result.json"),"utf8"));result.data.acg.processStatus=exit===0?"succeeded":"failed";result.data.acg.nativeExitCode=exit;
  const hasProducts=native.cells.some(c=>c.validGdsCount>0||c.placement.candidates.length>0||c.routedCandidates.length>0);
  const status=exit===0&&usable&&native.cells.every(c=>c.status==="complete")?"completed":hasProducts?"partial":"failed";
  result.data.acgUnified={schemaVersion:UNIFIED_SCHEMA,sourceNetlistSha256:snapshot.request.sourceNetlistSha256,budget:snapshot.budget,stageInputs:snapshot.request.stageInputs,stages:[{id:"generation",label:labels.generation,status,exitCode:exit,evidencePaths:["output/acg-native.json","output/acg-generation.json"],...(status!=="completed"?{reason:"Native generation did not complete every requested cell"}:{})}]};
  await writeJson(path.join(root,"output/acg-native.json"),native);await writeJson(path.join(root,"output/acg-generation.json"),result);return {exitCode:0,outputs:{status,nativeExitCode:exit}};
 }
 if(key.startsWith("unified-")&&["comparison","search","report"].includes(key.slice(8))){if(!context.runPlannedProcess)throw new AcgError("ACG_RUNTIME","Shared process runner is required","configuration");const result=await context.runPlannedProcess();if(result.exitCode===0)await stageSummary(root,key.slice(8),snapshot);return {exitCode:result.exitCode,outputs:{processId:result.processId,processGroupId:result.processGroupId}};}
 if(key==="unified-normalize"){
  const result=JSON.parse(await fs.readFile(await regular(root,"output/acg-generation.json"),"utf8")) as ParsedModuleResultV1;
  const unified=object(result.data.acgUnified),stages=unified.stages as JsonObject[];
  for(const id of ["comparison","search","report"] as const){const summary=await stageSummary(root,id,snapshot);unified[id]=summary;stages.push({id,label:labels[id],status:summary.status!,...(summary.reason?{reason:summary.reason}:{}),evidencePaths:["output/unified/"+id+"/summary.json",...Object.keys(object(summary.evidenceSha256)).map(p=>"output/unified/"+id+"/"+p)]});}
  result.summary={...result.summary,operation:"unified",stageStatuses:Object.fromEntries(stages.map(s=>[String(s.id),s.status])),status:stages.some(s=>["failed","partial"].includes(String(s.status)))?"partial":"completed"};result.parserId="acg-unified";result.parserVersion=UNIFIED_SCHEMA;await writeJson(path.join(root,"output/acg-result.json"),result);return {exitCode:0,outputs:{status:result.summary.status!}};
 }
 if(["render","inspect-native","research-lvs1","official-pv"].includes(key)){
  const generation=JSON.parse(await fs.readFile(await regular(root,"work/unified-generation-exit.json"),"utf8"));
  if(generation.exitCode!==0){await context.emit({jobId:context.job.id,stepId:context.step.id,at:context.now(),level:"warning",stream:"progress",message:"Generation failed; dependent "+key+" not run",payload:{nativeExitCode:generation.exitCode}});return {exitCode:0,outputs:{status:"not_run",reason:"generation_failed"}};}
 }
 return runNative();
}
