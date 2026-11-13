import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { InputFileV1, InputManifestV1, JsonObject, ModuleId, ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";
import type { DtcoPipelineArtifactRef } from "../../../shared/contracts/dtcoPipeline.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { ModuleRegistry } from "../../app/modules/registry.ts";
import { normalizeRelativePath, type StorageService } from "../../app/storage/storage.ts";
export type PreparedModuleInput = {relativePath:string;role:string;content?:string|Buffer;sourcePath?:string;sha256?:string;artifact?:DtcoPipelineArtifactRef};
export const sha256=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
export function toolSnapshot(tool:ToolConfigurationV1){const {environment:_environment,createdAt:_createdAt,updatedAt:_updatedAt,...snapshot}=tool;return snapshot;}
export function moduleConfigurationHash(repositories:Repositories,moduleId:ModuleId):string {
 return sha256(JSON.stringify(repositories.tools.active(moduleId).map(tool=>({tool,health:repositories.tools.latestHealth(tool.id)}))));
}
export async function verifiedPipelineArtifact(repositories:Repositories,storage:StorageService,ownerId:string,ref:DtcoPipelineArtifactRef):Promise<Buffer>{
 const artifact=repositories.artifacts.get(ref.artifactId),job=repositories.jobs.get(ref.sourceJobId);
 if(!artifact||!job||job.ownerId!==ownerId||job.status!=="succeeded"||job.resultId!==ref.resultId||artifact.ownerId!==ownerId||artifact.jobId!==job.id||artifact.resultId!==ref.resultId||artifact.relativePath!==ref.relativePath||artifact.sha256!==ref.sha256||artifact.sizeBytes!==ref.sizeBytes)throw new Error("Pipeline artifact identity/ownership does not match its completed child");
 const result=repositories.results.get(job.moduleId,ref.resultId,ownerId,false);
 if(!result||result.provenance.origin!=="computed"||result.provenance.jobId!==job.id||!result.artifactIds.includes(artifact.id))throw new Error("Pipeline artifact has no computed result provenance");
 const source=await storage.resolveExisting(artifact.relativePath),stat=await fs.stat(source);
 if(!stat.isFile()||stat.size!==ref.sizeBytes||stat.size>160*1024*1024)throw new Error("Pipeline artifact exceeds immutable file limits");
 const bytes=await fs.readFile(source);if(sha256(bytes)!==ref.sha256)throw new Error("Pipeline artifact checksum changed");return bytes;
}
/** Fence cancellation and permission changes atomically with the queue transition. */
export function enqueuePipelineChild(repositories:Repositories,jobId:string):void{
 repositories.database.transaction(()=>{
  const row=repositories.database.sqlite.prepare("SELECT r.status,r.cancel_requested,r.owner_id FROM dtco_pipeline_runs r JOIN dtco_pipeline_nodes n ON n.run_id=r.id WHERE n.job_id=?").get(jobId) as {status:string;cancel_requested:number;owner_id:string}|undefined;
  const job=repositories.jobs.get(jobId),owner=job?repositories.users.get(job.ownerId):null;
  if(!row||!["queued","running","preparing"].includes(row.status)||row.cancel_requested||!owner?.enabled||owner.deletedAt||!job||!owner.allowedModules.includes(job.moduleId))throw new Error("Pipeline cancelled or owner authorization changed before enqueue");
  repositories.jobs.start(jobId);
 });
}
/** The same validate/build/freeze/start contracts as public module drafts; inputs are server-owned only. */
export async function prepareModuleJob(repositories:Repositories,storage:StorageService,registry:ModuleRegistry,jobId:string,inputs:PreparedModuleInput[],parameters:JsonObject,expectedConfigurationHash?:string):Promise<void>{
 const job=repositories.jobs.get(jobId);if(!job||job.status!=="draft")throw new Error("Pipeline child must be a reserved draft");
 const owner=repositories.users.get(job.ownerId);if(!owner?.enabled||owner.deletedAt||!owner.allowedModules.includes(job.moduleId))throw new Error("Pipeline owner is no longer authorized for "+job.moduleId);
 if(expectedConfigurationHash&&moduleConfigurationHash(repositories,job.moduleId)!==expectedConfigurationHash)throw new Error("Pipeline tool configuration changed since submission; save/retry with the current environment");
 if(inputs.length>300)throw new Error("Pipeline input file count exceeds 300");
 const workspace=await storage.createWorkspace(job.id),files:InputFileV1[]=[],seen=new Set<string>();let totalBytes=0;
 for(const input of inputs){
  const relativePath=normalizeRelativePath(input.relativePath);if(seen.has(relativePath))throw new Error("Duplicate pipeline input");seen.add(relativePath);
  const data=input.artifact?await verifiedPipelineArtifact(repositories,storage,job.ownerId,input.artifact):input.content!==undefined?Buffer.from(input.content):await fs.readFile(input.sourcePath!);
  if(input.sha256&&sha256(data)!==input.sha256)throw new Error("Trusted pipeline input checksum changed");
  totalBytes+=data.length;if(data.length>160*1024*1024||totalBytes>256*1024*1024)throw new Error("Pipeline input byte limit exceeded");
  if(repositories.jobs.ownerInputBytes(job.ownerId)+totalBytes>owner.storageQuotaBytes)throw new Error("Pipeline input exceeds owner storage quota");
  const destination=path.join(workspace,"input",relativePath);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,data,{flag:"wx",mode:0o640});
  files.push({relativePath,sizeBytes:data.length,sha256:sha256(data),mediaType:relativePath.endsWith(".json")?"application/json":"text/plain",recognizedType:input.role,role:input.role,required:true,usedByStepIds:[],unresolvedIncludes:[],validationErrors:[]});
 }
 const manifest:InputManifestV1={schemaVersion:"eda.input-manifest.v1",files,totalBytes,fileCount:files.length,rootHint:null,createdAt:new Date().toISOString()};
 const configs=repositories.tools.active(job.moduleId),toolConfigurations=configs.map(toolSnapshot);
 const lineage=inputs.flatMap(i=>i.artifact?[i.artifact]:[]);
 const boundParameters={...parameters,dtcoPipelineInputs:JSON.parse(JSON.stringify(lineage))} as JsonObject;
 repositories.jobs.beginValidation(job.id);
 const context={moduleId:job.moduleId,storageRoot:storage.root,now:()=>new Date().toISOString(),job:{...repositories.jobs.get(job.id)!,inputManifest:manifest,parameters:boundParameters,toolConfigurations},files,technology:null,technologies:[],toolConfigurations:configs,toolHealth:Object.fromEntries(configs.map(t=>[t.id,repositories.tools.latestHealth(t.id)])),toolBindings:Object.fromEntries(configs.map(t=>{const health=repositories.tools.latestHealth(t.id);return[t.toolId,{configuration:toolSnapshot(t),health:health?.status??"not_configured",version:health?.version??null,selfTestPassed:health?.selfTestPassed??null,environment:t.environment}];}))};
 const adapter=registry.require(job.moduleId),validation=await adapter.validateDraft(context);
 if(!validation.valid||validation.errors.length)throw new Error(validation.errors.map(e=>e.code+": "+e.message).join("; ")||"Pipeline module validation failed");
 const plan=await adapter.buildPlan(context);if(!plan.steps.length||plan.sweep)throw new Error("Pipeline child requires one bounded non-sweep native plan");
 const ids=[...new Set(plan.steps.flatMap(s=>s.process?[s.process.toolConfigurationId]:[]))];
 const selected=ids.map(id=>{const t=repositories.tools.get(id),h=repositories.tools.latestHealth(id);if(!t||h?.status!=="healthy"||h.selfTestPassed!==true)throw new Error("Pipeline planned tool must pass probe and self-test");return toolSnapshot(t);});
 repositories.jobs.setDraft(job.id,manifest,boundParameters,plan.capabilityVersion,selected,Object.fromEntries(selected.map(t=>[t.toolId,repositories.tools.latestHealth(t.id)?.version??null])),{...plan,warnings:[...plan.warnings,...validation.warnings]});
 await storage.writeManifest(job.id,manifest);await storage.freezeInputs(job.id);
 if(expectedConfigurationHash&&moduleConfigurationHash(repositories,job.moduleId)!==expectedConfigurationHash)throw new Error("Pipeline tool configuration changed before enqueue");
 enqueuePipelineChild(repositories,job.id);
 repositories.jobs.appendEvent(job.id,null,"info","system","Prepared immutable DTCO pipeline child through its real module adapter",{pipelineInputs:lineage.length});
}
