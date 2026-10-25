import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { allowPublicRunner, assertOwnerOrAdmin, csrfGuardOrPublicRunner } from "../../app/auth/guards.ts";
import { ApiError } from "../../app/api/errors.ts";
import { success } from "../../app/api/http.ts";
import { DtcoOptimizationService } from "./optimizationService.ts";
export function registerDtcoOptimizationRoutes(app:FastifyInstance,repositories:Repositories,storage:StorageService):void{
  const service=new DtcoOptimizationService(repositories,storage);
  const read=[allowPublicRunner(repositories),async(request:FastifyRequest)=>{
    if(request.edaUser!.role!=="admin"&&!request.edaUser!.allowedModules.includes("dtco"))throw new ApiError(403,"MODULE_FORBIDDEN","this user is not allowed to use DTCO");
  }],write=[...read,csrfGuardOrPublicRunner(repositories)];
  const owned=(request:FastifyRequest)=>{
    const run=repositories.dtcoOptimizations.get((request.params as {id:string}).id);
    if(!run)throw new ApiError(404,"NOT_FOUND","optimization not found");
    assertOwnerOrAdmin(request,run.ownerId);return run;
  };
  app.get("/api/dtco/optimizations",{preHandler:read},async request=>success(repositories.dtcoOptimizations.list(request.edaUser!.id,request.edaUser!.role==="admin")));
  app.post("/api/dtco/optimizations",{preHandler:write},async(request,reply)=>{
    const body=request.body as {clientRequestId?:unknown;definition?:unknown}|undefined;
    const run=await service.create(request.edaUser!.id,body?.clientRequestId,body?.definition);reply.code(201);return success(run);
  });
  app.get("/api/dtco/optimizations/:id",{preHandler:read},async request=>success(owned(request)));
  app.post("/api/dtco/optimizations/:id/start",{preHandler:write},async request=>success(await service.start(owned(request).id)));
  app.post("/api/dtco/optimizations/:id/stop",{preHandler:write},async request=>success(repositories.dtcoOptimizations.stop(owned(request).id)));
  app.post("/api/dtco/optimizations/:id/resume",{preHandler:write},async request=>{
    const run=owned(request),body=request.body as {iterationId?:unknown;attemptId?:unknown}|undefined;
    if(typeof body?.iterationId!=="string"||typeof body.attemptId!=="string"||!body.iterationId||!body.attemptId)throw new ApiError(400,"DTCO_ATTEMPT_REQUIRED","resume requires the current failed iterationId and attemptId");
    return success(await service.resume(run.id,body.iterationId,body.attemptId));
  });
}
