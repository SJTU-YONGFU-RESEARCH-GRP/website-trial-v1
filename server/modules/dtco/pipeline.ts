import type { DtcoPipelineRunSummary } from "../../../shared/contracts/dtcoPipeline.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { ModuleRegistry } from "../../app/modules/registry.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import type { StructuredJobErrorV1 } from "../../../shared/contracts/v1.ts";
import { DtcoPipelineRepository, readPipelineSummary, pipelineError, type PipelineContext } from "./pipelineRepository.ts";
import { moduleConfigurationHash, verifiedPipelineArtifact } from "./preparedModuleJob.ts";
import { preparePipelineNode } from "./pipelineNative.ts";
import { validatePoint, getDtcoPipelineEnvironmentFingerprint } from "./environment.ts";
export { isIntegratedAttemptComplete, readPipelineSummary } from "./pipelineRepository.ts";
const registries=new WeakMap<Repositories,ModuleRegistry>();
export function configureDtcoPipeline(repositories:Repositories,registry:ModuleRegistry){registries.set(repositories,registry);}
export function getDtcoIntegrationReadiness(repositories:Repositories):{available:boolean;reasons:string[]}{
 const requirements=[["benchmark","translator"],["ppa","libcharx"],["digital","yosys"],["digital","opensta"]] as const,reasons:string[]=[];
 for(const[moduleId,toolId]of requirements){const tool=repositories.tools.active(moduleId).find(t=>t.toolId===toolId),health=tool?repositories.tools.latestHealth(tool.id):null;
  if(!tool||health?.status!=="healthy"||health.selfTestPassed!==true)reasons.push(toolId+" must be configured and pass its real self-test");}
 const registry=registries.get(repositories);if(!registry)reasons.push("Integrated worker registry is unavailable");
 else for(const moduleId of ["benchmark","dtco","ppa","digital"] as const){try{registry.require(moduleId);}catch{reasons.push(moduleId+" adapter is unavailable");}}
 return {available:reasons.length===0,reasons};
}
export type PipelineNodePreparer=typeof preparePipelineNode;
export class DtcoPipelineService {
 readonly repository:DtcoPipelineRepository;
 constructor(readonly repositories:Repositories,readonly storage:StorageService,readonly registry=registries.get(repositories),private readonly prepare:PipelineNodePreparer=preparePipelineNode){this.repository=new DtcoPipelineRepository(repositories);if(registry)configureDtcoPipeline(repositories,registry);}
 async startForAttempt(context:PipelineContext):Promise<void>{
  if(!this.registry)throw new Error("Integrated module registry is unavailable");
  const user=this.repositories.users.get(context.experiment.ownerId);
  if(!user?.enabled||user.deletedAt||(["benchmark","dtco","ppa","digital"] as const).some(m=>!user.allowedModules.includes(m)))throw new Error("Integrated DTCO requires authorization for Benchmark, DTCO, PPA and Digital");
  const readiness=getDtcoIntegrationReadiness(this.repositories);if(!readiness.available)throw new Error(readiness.reasons.join("; "));
  validatePoint(context.experiment.definition,context.point);
  if(context.point.layoutId==="schematic-only")throw new Error("Integrated PPA requires an actual generated or fixed-library GDS; choose a supported layout");
  const configurations=Object.fromEntries((["benchmark","dtco","ppa","digital","acg"] as const).map(m=>[m,moduleConfigurationHash(this.repositories,m)]));
  configurations.dtcoEnvironment=await getDtcoPipelineEnvironmentFingerprint(this.repositories,context.experiment.definition);
  if(configurations.dtcoEnvironment!==context.experiment.revisions.find(revision=>revision.revision===context.point.revision)?.environmentHash)throw new Error("DTCO environment changed before pipeline reservation; save a new revision");
  const stored={...context,experiment:{...context.experiment,points:[],revisions:[]},point:{...context.point,attempts:[]},configurations};
  this.repository.reserve(stored);
  // The durable graph now owns preparation; legacy startup recovery must not fail its blocked draft.
  this.repositories.dtco.finishPreparation(context.attempt.id);
  this.repositories.jobs.appendEvent(context.attempt.jobId,null,"info","system","Integrated graph durably reserved; Benchmark translator must finish before DTCO preparation",{attemptId:context.attempt.id});
 }
 getPipelineForAttempt(id:string){return readPipelineSummary(this.repositories.database,id);}
 cancel(jobId:string){return this.repository.requestCancel(jobId);}
 async advance(cancelRunning?:(jobId:string)=>void):Promise<void>{
  if(!this.registry)return;
  for(const row of this.repository.active()){
   const run=readPipelineSummary(this.repositories.database,String(row.attempt_id))!;const context=JSON.parse(String(row.context_json)) as PipelineContext&{configurations:Record<string,string>};
   if(Number(row.cancel_requested)===1){this.stopRun(run,"cancelled",pipelineError("Integrated point cancellation requested","DTCO_PIPELINE_CANCELLED"),cancelRunning);continue;}
   const user=this.repositories.users.get(String(row.owner_id));
   if(!user?.enabled||user.deletedAt||run.nodes.some(n=>!user.allowedModules.includes(n.moduleId))){this.stopRun(run,"failed",pipelineError("Owner module permission was revoked","DTCO_PIPELINE_FORBIDDEN"),cancelRunning);continue;}
   const node=run.nodes.find(n=>n.status!=="succeeded");if(!node){this.repository.finish(run.id,"succeeded");continue;}
   const job=this.repositories.jobs.get(node.jobId)!;
   if(["failed","cancelled","interrupted"].includes(job.status)){
    this.repository.setNode(node.id,job.status,job.error);this.stopRun(run,job.status,job.error??pipelineError("Child "+node.kind+" "+job.status),cancelRunning);continue;
   }
   if(job.status==="succeeded"){
    try{
     const artifacts=this.repositories.artifacts.listJob(job.id).filter(a=>a.resultId===job.resultId).map(a=>({sourceJobId:job.id,resultId:job.resultId!,artifactId:a.id,relativePath:a.relativePath,sha256:a.sha256,sizeBytes:a.sizeBytes}));
     if(!artifacts.length)throw new Error("Child completed without published artifacts");
     for(const ref of artifacts)await verifiedPipelineArtifact(this.repositories,this.storage,job.ownerId,ref);
     this.repository.setNode(node.id,"succeeded",null,artifacts);this.repository.touch(run.id);
    }catch(error){this.stopRun(run,"failed",pipelineError(error instanceof Error?error.message:String(error),"DTCO_PIPELINE_PROVENANCE"),cancelRunning);}
    continue;
   }
   if(["queued","running"].includes(job.status)){this.repository.setNode(node.id,job.status);this.repository.touch(run.id);continue;}
   if(node.status!=="blocked")continue;
   if(!this.repository.claim(node.id))continue;
   try{
    await this.prepare(this.repositories,this.storage,this.registry,context,run,node,context.configurations);
    this.repository.setNode(node.id,this.repositories.jobs.get(job.id)!.status);this.repository.touch(run.id);
   }catch(error){
    const cancellation=this.repositories.database.sqlite.prepare("SELECT cancel_requested FROM dtco_pipeline_runs WHERE id=?").get(run.id) as {cancel_requested:number}|undefined;
    if(cancellation?.cancel_requested){this.stopRun(run,"cancelled",pipelineError("Integrated point cancellation requested","DTCO_PIPELINE_CANCELLED"),cancelRunning);continue;}
    const current=this.repositories.jobs.get(job.id)!;
    if(["queued","running","succeeded"].includes(current.status)){this.repository.setNode(node.id,current.status);continue;}
    const failure=pipelineError(error instanceof Error?error.message:String(error),"DTCO_PIPELINE_PREPARATION_FAILED");
    this.repository.setNode(node.id,"failed",failure);this.stopRun(run,"failed",failure,cancelRunning);
   }
  }
 }
 private stopRun(run:DtcoPipelineRunSummary,status:string,error:StructuredJobErrorV1,cancelRunning?: (jobId:string)=>void){
  this.repository.finish(run.id,status,error);
  for(const node of run.nodes){
   const job=this.repositories.jobs.get(node.jobId)!;
   if(job.status==="queued"||job.status==="running"){this.repositories.jobs.requestCancel(job.id);cancelRunning?.(job.id);}
   else if(["draft","validating","ready"].includes(job.status))this.repositories.database.sqlite.prepare("UPDATE jobs SET status=?,error_json=?,finished_at=?,updated_at=? WHERE id=? AND status IN ('draft','validating','ready')")
    .run(status==="cancelled"?"cancelled":status==="interrupted"?"interrupted":"failed",JSON.stringify(error),new Date().toISOString(),new Date().toISOString(),job.id);
   if(node.status!=="succeeded")this.repository.setNode(node.id,status,error);
  }
 }
}
export class DtcoPipelineCoordinator {
 private active=false;private stopping=false;
 constructor(readonly service:DtcoPipelineService,private readonly cancelRunning?:(id:string)=>void){}
 requestStop(){this.stopping=true;}
 async tick(){if(this.active||this.stopping)return;this.active=true;try{await this.service.advance(this.cancelRunning);}finally{this.active=false;}}
}
