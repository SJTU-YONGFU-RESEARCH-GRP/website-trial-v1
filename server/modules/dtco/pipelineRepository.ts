import { randomUUID } from "node:crypto";
import type { DtcoAttempt, DtcoExperiment, DtcoPoint } from "../../../shared/contracts/dtco.ts";
import type { DtcoPipelineRunSummary, DtcoPipelineNodeKind } from "../../../shared/contracts/dtcoPipeline.ts";
import type { EdaDatabase } from "../../app/db/database.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StructuredJobErrorV1, InputManifestV1 } from "../../../shared/contracts/v1.ts";
export type PipelineContext = { experiment: DtcoExperiment; point: DtcoPoint; attempt: DtcoAttempt };
type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
export const pipelineError = (message:string,code="DTCO_PIPELINE_FAILED"):StructuredJobErrorV1 =>
 ({type:"configuration",code,message,stepId:null,retryable:true,details:null});
export function readPipelineSummary(db:EdaDatabase, attemptId:string):DtcoPipelineRunSummary|null {
 const run=db.sqlite.prepare("SELECT * FROM dtco_pipeline_runs WHERE attempt_id=?").get(attemptId) as Row|undefined;
 if(!run)return null;
 const nodes=(db.sqlite.prepare("SELECT n.*,j.module_id,j.status job_status,j.result_id,j.progress,j.current_step_id,j.error_json job_error FROM dtco_pipeline_nodes n JOIN jobs j ON j.id=n.job_id WHERE n.run_id=? ORDER BY n.ordinal").all(String(run.id)) as Row[]).map(n=>({
  id:String(n.id),kind:n.kind as DtcoPipelineNodeKind,moduleId:n.module_id as "benchmark"|"dtco"|"ppa"|"digital",jobId:String(n.job_id),
  resultId:n.result_id===null?null:String(n.result_id),status:n.status as DtcoPipelineRunSummary["nodes"][number]["status"],
  progress:Number(n.progress),currentStepId:n.current_step_id===null?null:String(n.current_step_id),artifacts:JSON.parse(String(n.artifacts_json)),
  error:n.error_json?JSON.parse(String(n.error_json)):n.job_error?JSON.parse(String(n.job_error)):null,
 }));
 const current=nodes.find(n=>n.status!=="succeeded");
 return {id:String(run.id),attemptId,status:run.status as DtcoPipelineRunSummary["status"],currentNodeId:current?.id??null,
  progress:nodes.reduce((s,n)=>s+(n.status==="succeeded"?1:n.progress),0)/4,provenanceVerified:Number(run.provenance_verified)===1,
  error:run.error_json?JSON.parse(String(run.error_json)):null,nodes,createdAt:String(run.created_at),updatedAt:String(run.updated_at)};
}
export function isIntegratedAttemptComplete(attempt:{pipeline?:DtcoPipelineRunSummary}):boolean {
 return Boolean(attempt.pipeline?.status==="succeeded"&&attempt.pipeline.provenanceVerified&&attempt.pipeline.nodes.length===4&&attempt.pipeline.nodes.every(n=>n.status==="succeeded"&&n.resultId&&n.artifacts.length));
}
export class DtcoPipelineRepository {
 constructor(readonly repositories:Repositories){}
 get db(){return this.repositories.database;}
 reserve(context:PipelineContext):DtcoPipelineRunSummary {
  return this.db.transaction(()=>{
   const existing=readPipelineSummary(this.db,context.attempt.id);if(existing)return existing;
   const id=randomUUID(),at=now(),manifest:InputManifestV1={schemaVersion:"eda.input-manifest.v1",files:[],fileCount:0,totalBytes:0,rootHint:null,createdAt:at};
   this.db.sqlite.prepare("INSERT INTO dtco_pipeline_runs(id,attempt_id,owner_id,dtco_job_id,context_json,status,created_at,updated_at) VALUES (?,?,?,?,?,'queued',?,?)")
    .run(id,context.attempt.id,context.experiment.ownerId,context.attempt.jobId,JSON.stringify(context),at,at);
   for(const [ordinal,kind]of (["benchmark","dtco","ppa","digital"] as const).entries()){
    const jobId=kind==="dtco"?context.attempt.jobId:randomUUID();
    if(kind!=="dtco")this.repositories.jobs.createDraft(context.experiment.ownerId,kind,kind==="ppa"?"characterize-cell":"run","dtco-integrated",manifest,jobId);
    this.db.sqlite.prepare("INSERT INTO dtco_pipeline_nodes(id,run_id,ordinal,kind,job_id,status) VALUES (?,?,?,?,?,'blocked')").run(randomUUID(),id,ordinal,kind,jobId);
   }
   this.db.sqlite.prepare("UPDATE dtco_attempts SET preparation_status='prepared',updated_at=? WHERE id=?").run(at,context.attempt.id);
   return readPipelineSummary(this.db,context.attempt.id)!;
  });
 }
 active():Row[]{return this.db.sqlite.prepare("SELECT * FROM dtco_pipeline_runs WHERE status IN ('queued','running','preparing') ORDER BY created_at,id LIMIT 128").all() as Row[];}
 claim(nodeId:string):boolean{return this.db.sqlite.prepare("UPDATE dtco_pipeline_nodes SET status='preparing' WHERE id=? AND status='blocked'").run(nodeId).changes===1;}
 setNode(id:string,status:string,error:StructuredJobErrorV1|null=null,artifacts?:unknown):void{
  this.db.sqlite.prepare("UPDATE dtco_pipeline_nodes SET status=?,error_json=?,artifacts_json=COALESCE(?,artifacts_json) WHERE id=?")
   .run(status,error?JSON.stringify(error):null,artifacts?JSON.stringify(artifacts):null,id);
 }
 finish(id:string,status:string,error:StructuredJobErrorV1|null=null):void{
  this.db.sqlite.prepare("UPDATE dtco_pipeline_runs SET status=?,error_json=?,provenance_verified=?,updated_at=? WHERE id=? AND status IN ('queued','running','preparing') AND (?<>'succeeded' OR cancel_requested=0)")
   .run(status,error?JSON.stringify(error):null,Number(status==="succeeded"),now(),id,status);
 }
 touch(id:string):void{this.db.sqlite.prepare("UPDATE dtco_pipeline_runs SET status='running',updated_at=? WHERE id=? AND status='queued'").run(now(),id);}
 requestCancel(jobId:string):boolean{
  const run=this.db.sqlite.prepare("SELECT r.id FROM dtco_pipeline_runs r JOIN dtco_pipeline_nodes n ON n.run_id=r.id WHERE n.job_id=? AND r.status IN ('queued','running','preparing')").get(jobId) as Row|undefined;
  if(!run)return false;this.db.sqlite.prepare("UPDATE dtco_pipeline_runs SET cancel_requested=1,updated_at=? WHERE id=?").run(now(),String(run.id));return true;
 }
 recover():void{
  for(const run of this.active()){
   const preparing=this.db.sqlite.prepare("SELECT id FROM dtco_pipeline_nodes WHERE run_id=? AND status='preparing'").get(String(run.id)) as Row|undefined;
   if(preparing){const error=pipelineError("Server restarted during immutable child preparation; retry the whole point.","DTCO_PIPELINE_PREPARATION_INTERRUPTED");this.setNode(String(preparing.id),"interrupted",error);this.db.sqlite.prepare("UPDATE jobs SET status=\'interrupted\',error_json=?,finished_at=?,updated_at=? WHERE id=(SELECT job_id FROM dtco_pipeline_nodes WHERE id=?) AND status IN (\'draft\',\'validating\',\'ready\')").run(JSON.stringify(error),now(),now(),String(preparing.id));}
  }
 }
}
