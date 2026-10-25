import { createHash, randomUUID } from "node:crypto";
import type { DtcoMeasuredMetrics, DtcoOptimization, DtcoOptimizationCandidate, DtcoOptimizationDefinition, DtcoOptimizationIteration, DtcoOptimizationStopReason } from "../../../shared/contracts/dtco.ts";
import type { JsonObject, StructuredJobErrorV1 } from "../../../shared/contracts/v1.ts";
import type { EdaDatabase } from "../../app/db/database.ts";
import type { DtcoRepository } from "./repository.ts";
import { ApiError } from "../../app/api/errors.ts";
import { candidateKey, experimentDefinition, initialCandidate, initialState, nextCandidate, objectiveScore, type SearchState } from "./optimizationAlgorithm.ts";
type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
const retryable = new Set(["failed","interrupted","cancelled","preparation_failed"]);
interface Evaluation {
  metrics: DtcoMeasuredMetrics; score: number; relativeImprovement: number | null;
  accepted: boolean; significantImprovement: boolean; feasible: boolean; provenance: JsonObject;
}
export class DtcoOptimizationRepository {
  constructor(private readonly db: EdaDatabase, private readonly dtco: DtcoRepository) {}
  managedExperiment(experimentId: string): boolean {
    return Boolean(this.db.sqlite.prepare("SELECT 1 FROM dtco_optimizations WHERE experiment_id=?").get(experimentId));
  }
  list(ownerId: string, admin = false): DtcoOptimization[] {
    return (this.db.sqlite.prepare("SELECT id FROM dtco_optimizations WHERE owner_id=? OR ?=1 ORDER BY updated_at DESC,id LIMIT 100").all(ownerId,Number(admin)) as Row[]).map(row=>this.get(String(row.id))!);
  }
  activeIds(): string[] {
    return (this.db.sqlite.prepare("SELECT id FROM dtco_optimizations WHERE status IN ('running','stopping') ORDER BY updated_at,id LIMIT 100").all() as Row[]).map(row=>String(row.id));
  }
  get(id: string): DtcoOptimization | null {
    const row = this.row(id); if (!row) return null;
    const experiment = this.dtco.get(String(row.experiment_id))!;
    const points = new Map(experiment.revisions.flatMap(revision=>revision.points).map(point=>[point.id,point]));
    const iterations = (this.db.sqlite.prepare("SELECT * FROM dtco_optimization_iterations WHERE optimization_id=? ORDER BY number").all(id) as Row[]).map(item=>{
      const point = points.get(String(item.point_id))!;
      const evaluation = item.evaluation_json ? JSON.parse(String(item.evaluation_json)) as Evaluation : null;
      return { id:String(item.id),number:Number(item.number),revision:Number(item.revision),pointId:point.id,
        candidate:JSON.parse(String(item.candidate_json)) as DtcoOptimizationCandidate,baseIterationId:item.base_iteration_id ? String(item.base_iteration_id):null,rationale:String(item.rationale),
        status:point.status,progress:point.progress,jobId:point.jobId,resultId:point.resultId,attemptId:point.attempts.at(-1)?.id||null,
        metrics:evaluation?.metrics||null,score:evaluation?.score??null,relativeImprovement:evaluation?.relativeImprovement??null,
        accepted:evaluation?.accepted??null,significantImprovement:evaluation?.significantImprovement??null,feasible:evaluation?.feasible??(item.error_json?false:null),
        provenance:evaluation?.provenance||null,error:item.error_json ? JSON.parse(String(item.error_json)) as StructuredJobErrorV1 : point.error,
        attempts:point.attempts,createdAt:String(item.created_at),evaluatedAt:item.evaluated_at ? String(item.evaluated_at):null } satisfies DtcoOptimizationIteration;
    });
    const status = row.status as DtcoOptimization["status"], stopReason = row.stop_reason as DtcoOptimizationStopReason;
    const latest = iterations.at(-1);
    return {id,ownerId:String(row.owner_id),version:Number(row.version),status,
      allowedActions:status==="draft"?["start"]:status==="running"?["stop"]:status==="paused"&&stopReason!=="environment_changed"&&latest?.attemptId&&retryable.has(latest.status)?["resume"]:[],
      definition:JSON.parse(String(row.definition_json)) as DtcoOptimizationDefinition,experimentId:experiment.id,environmentHash:String(row.environment_hash),
      bestIterationId:row.best_iteration_id?String(row.best_iteration_id):null,bestScore:row.best_score===null?null:Number(row.best_score),stopReason,
      iterations,createdAt:String(row.created_at),updatedAt:String(row.updated_at)};
  }
  create(ownerId: string, clientRequestId: string, definition: DtcoOptimizationDefinition, environmentHash: string): DtcoOptimization {
    const requestHash = createHash("sha256").update(JSON.stringify(definition)).digest("hex");
    return this.db.transaction(()=>{
      const existing = this.db.sqlite.prepare("SELECT id,request_hash FROM dtco_optimizations WHERE owner_id=? AND client_request_id=?").get(ownerId,clientRequestId) as Row|undefined;
      if(existing) {
        if(existing.request_hash!==requestHash) throw new ApiError(409,"DTCO_REQUEST_REUSED","clientRequestId was already used for a different definition");
        return this.get(String(existing.id))!;
      }
      const experiment = this.dtco.saveWithinTransaction(ownerId,experimentDefinition(definition,initialCandidate(definition)),environmentHash);
      const id=randomUUID(),at=now();
      this.db.sqlite.prepare("INSERT INTO dtco_optimizations(id,owner_id,client_request_id,request_hash,definition_json,experiment_id,environment_hash,status,state_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'draft',?,?,?)")
        .run(id,ownerId,clientRequestId,requestHash,JSON.stringify(definition),experiment.id,environmentHash,JSON.stringify(initialState(definition)),at,at);
      return this.get(id)!;
    });
  }
  start(id: string, environmentHash: string): DtcoOptimization {
    return this.db.transaction(()=>{
      const run=this.get(id)!; if(run.status!=="draft") return run;
      this.db.sqlite.prepare("UPDATE dtco_optimizations SET status='running',environment_hash=?,version=version+1,updated_at=? WHERE id=? AND status='draft'").run(environmentHash,now(),id);
      this.appendCandidate(run,initialCandidate(run.definition),null,"Baseline physical design; all later decisions use its measured result.",initialState(run.definition),environmentHash);
      return this.get(id)!;
    });
  }
  stop(id: string): DtcoOptimization {
    return this.db.transaction(()=>{
      const run=this.get(id)!;
      if(run.status==="draft"||run.status==="paused") this.finish(id,"cancelled","user_stopped");
      else if(run.status==="running") this.db.sqlite.prepare("UPDATE dtco_optimizations SET status='stopping',version=version+1,updated_at=? WHERE id=?").run(now(),id);
      return this.get(id)!;
    });
  }
  resume(id: string, iterationId: string, attemptId: string): DtcoOptimization {
    return this.db.transaction(()=>{
      const run=this.get(id)!,latest=run.iterations.at(-1);
      // Replayed controls can never create another attempt.
      if(run.status==="running"||run.status==="stopping"||run.status==="completed"||run.status==="cancelled") return run;
      if(run.status!=="paused"||run.stopReason==="environment_changed"||latest?.id!==iterationId||latest.attemptId!==attemptId||!retryable.has(latest.status)) throw new ApiError(409,"DTCO_OPTIMIZATION_NOT_RESUMABLE","resume requires the current failed iteration and attempt");
      const state=this.state(id); state.retryAttemptId=attemptId;
      this.db.sqlite.prepare("UPDATE dtco_optimization_iterations SET evaluation_json=NULL,error_json=NULL,evaluated_at=NULL WHERE id=?").run(iterationId);
      this.db.sqlite.prepare("UPDATE dtco_optimizations SET status='running',stop_reason=NULL,state_json=?,version=version+1,updated_at=? WHERE id=?").run(JSON.stringify(state),now(),id);
      return this.get(id)!;
    });
  }
  retryToken(id: string): string | undefined { return this.state(id).retryAttemptId; }
  clearRetryToken(id: string, token: string): void {
    this.db.transaction(()=>{ const state=this.state(id); if(state.retryAttemptId!==token)return;delete state.retryAttemptId;this.db.sqlite.prepare("UPDATE dtco_optimizations SET state_json=? WHERE id=?").run(JSON.stringify(state),id); });
  }
  pause(id: string, iterationId: string, error: StructuredJobErrorV1, reason: "execution_failed"|"environment_changed"="execution_failed"): void {
    this.db.transaction(()=>{
      const run=this.get(id)!;
      if(!["running","stopping"].includes(run.status)||run.iterations.at(-1)?.id!==iterationId)return;
      this.db.sqlite.prepare("UPDATE dtco_optimization_iterations SET error_json=?,evaluated_at=? WHERE id=? AND evaluated_at IS NULL").run(JSON.stringify(error),now(),iterationId);
      if(run.status==="stopping")this.finish(id,"cancelled","user_stopped");
      else this.finish(id,"paused",reason);
    });
  }
  finishStopped(id: string): void {
    this.db.transaction(()=>{if(this.get(id)?.status==="stopping")this.finish(id,"cancelled","user_stopped");});
  }
  consume(id: string, iterationId: string, metrics: DtcoMeasuredMetrics, provenance: JsonObject): void {
    this.db.transaction(()=>{
      const run=this.get(id)!,iteration=run.iterations.at(-1);
      if(!["running","stopping"].includes(run.status)||iteration?.id!==iterationId||iteration.evaluatedAt)return;
      const baseline=run.iterations.find(item=>item.metrics)?.metrics||metrics;
      const score=objectiveScore(run.definition,metrics,baseline);
      if(!Number.isFinite(score)||score<=0)throw new Error("objective score must be finite and positive");
      const accepted=run.bestScore===null||score<run.bestScore;
      const relative=run.bestScore===null?null:(run.bestScore-score)/run.bestScore;
      const significant=run.bestScore===null||(accepted&&relative!>=run.definition.minRelativeImprovement);
      const evaluation:Evaluation={metrics,score,relativeImprovement:relative,accepted,significantImprovement:significant,feasible:true,provenance};
      const at=now();
      this.db.sqlite.prepare("UPDATE dtco_optimization_iterations SET evaluation_json=?,error_json=NULL,evaluated_at=? WHERE id=?").run(JSON.stringify(evaluation),at,iterationId);
      const state=this.state(id);if(accepted)state.cursor=0;
      const noImprovement=significant?0:Number(this.row(id)!.no_improvement)+1;
      this.db.sqlite.prepare("UPDATE dtco_optimizations SET best_iteration_id=?,best_score=?,no_improvement=?,state_json=?,version=version+1,updated_at=? WHERE id=?")
        .run(accepted?iterationId:run.bestIterationId,accepted?score:run.bestScore,noImprovement,JSON.stringify(state),at,id);
      if(run.status==="stopping"){this.finish(id,"cancelled","user_stopped");return;}
      if(run.definition.objective.target!==undefined&&(accepted?score:run.bestScore)!<=run.definition.objective.target){this.finish(id,"completed","target_reached");return;}
      if(run.iterations.length>=run.definition.maxIterations){this.finish(id,"completed","max_iterations");return;}
      if(noImprovement>=run.definition.patience){this.finish(id,"completed","patience");return;}
      const best=accepted?iteration:run.iterations.find(item=>item.id===run.bestIterationId)!;
      const proposed=nextCandidate(run.definition,best.candidate,state,new Set(run.iterations.map(item=>candidateKey(item.candidate))));
      if(!proposed){this.finish(id,"completed","search_exhausted");return;}
      this.appendCandidate(run,proposed.candidate,best.id,proposed.rationale,proposed.state,run.environmentHash);
    });
  }
  private appendCandidate(run: DtcoOptimization, candidate: DtcoOptimizationCandidate, baseId: string|null, rationale: string, state: SearchState, environmentHash: string): void {
    const experiment=this.dtco.saveWithinTransaction(run.ownerId,experimentDefinition(run.definition,candidate),environmentHash,run.experimentId);
    const point=experiment.points[0]!,number=run.iterations.length+1;
    this.db.sqlite.prepare("INSERT INTO dtco_optimization_iterations(id,optimization_id,number,candidate_key,candidate_json,revision,point_id,base_iteration_id,rationale,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(randomUUID(),run.id,number,candidateKey(candidate),JSON.stringify(candidate),experiment.revision,point.id,baseId,rationale,now());
    this.db.sqlite.prepare("UPDATE dtco_optimizations SET state_json=?,version=version+1,updated_at=? WHERE id=?").run(JSON.stringify(state),now(),run.id);
  }
  private row(id: string): Row | undefined {return this.db.sqlite.prepare("SELECT * FROM dtco_optimizations WHERE id=?").get(id) as Row|undefined;}
  private state(id: string): SearchState {return JSON.parse(String(this.row(id)!.state_json)) as SearchState;}
  private finish(id: string,status: DtcoOptimization["status"],reason: DtcoOptimizationStopReason): void {
    this.db.sqlite.prepare("UPDATE dtco_optimizations SET status=?,stop_reason=?,version=version+1,updated_at=? WHERE id=?").run(status,reason,now(),id);
  }
}
