import { submitPhysicalSelection, selectionCompleteness } from "./selectionPhysical.ts";
import type { SelectionResult } from "../../../shared/contracts/dtcoSelection.ts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { allowPublicRunner, assertOwnerOrAdmin, csrfGuardOrPublicRunner } from "../../app/auth/guards.ts";
import { ApiError } from "../../app/api/errors.ts";
import { success } from "../../app/api/http.ts";
import { isSelectionJob, selectionOptions, selectionSnapshot, submitSelection } from "./selection.ts";

export function registerDtcoSelectionRoutes(app:FastifyInstance,repositories:Repositories,storage:StorageService){
 const read=[allowPublicRunner(repositories),async(request:FastifyRequest)=>{if(request.edaUser!.role!=="admin"&&!request.edaUser!.allowedModules.includes("dtco"))throw new ApiError(403,"MODULE_FORBIDDEN","DTCO permission required");}];
 const write=[...read,csrfGuardOrPublicRunner(repositories)];
 const owned=(request:FastifyRequest)=>{const job=repositories.jobs.get((request.params as {id:string}).id);if(!job||job.moduleId!=="dtco"||!isSelectionJob(job))throw new ApiError(404,"NOT_FOUND","Selection run not found");assertOwnerOrAdmin(request,job.ownerId);return job;};
 app.get("/api/dtco/selection/options",{preHandler:read},async()=>success(await selectionOptions(repositories)));
 app.post("/api/dtco/selection/runs",{preHandler:write},async(request,reply)=>{const job=await submitSelection(repositories,storage,request.edaUser!.id,request.body);reply.code(201);return success(job);});
 app.get("/api/dtco/selection/runs",{preHandler:read},async request=>success(repositories.jobs.list({moduleId:"dtco",...(request.edaUser!.role==="admin"?{}:{ownerId:request.edaUser!.id}),limit:200}).filter(isSelectionJob)));
 app.get("/api/dtco/selection/runs/:id",{preHandler:read},async request=>{const job=owned(request),record=job.resultId?repositories.results.get("dtco",job.resultId,job.ownerId,false):null;return success({job,result:record?.data.dtcoSelection??null,artifacts:repositories.artifacts.listJob(job.id),completeness:selectionCompleteness(job,(record?.data.dtcoSelection??null) as unknown as SelectionResult|null)});});
 app.post("/api/dtco/selection/runs/:id/complete-layout",{preHandler:write},async(request,reply)=>{const previous=owned(request);const next=await submitPhysicalSelection(repositories,storage,previous.ownerId,selectionSnapshot(previous).request,previous);reply.code(201);return success(next);});
 app.post("/api/dtco/selection/runs/:id/retry",{preHandler:write},async(request,reply)=>{const previous=owned(request);if(!["failed","cancelled","interrupted"].includes(previous.status))throw new ApiError(409,"DTCO_SELECTION_NOT_RETRYABLE","Only failed, cancelled or interrupted runs can be retried");
  const snapshot=selectionSnapshot(previous),source=snapshot.source?repositories.jobs.get(snapshot.source.jobId):null;
  if(snapshot.source&&!source)throw new ApiError(409,"DTCO_SELECTION_SOURCE_INVALID","Original completion source is unavailable");
  const next=source?await submitPhysicalSelection(repositories,storage,previous.ownerId,snapshot.request,source):await submitSelection(repositories,storage,previous.ownerId,snapshot.request);
  repositories.database.sqlite.prepare("UPDATE jobs SET retry_of_job_id=? WHERE id=?").run(previous.id,next.id);
  reply.code(201);return success(repositories.jobs.get(next.id));});
}
