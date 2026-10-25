import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { allowPublicRunner, assertOwnerOrAdmin, csrfGuardOrPublicRunner, PUBLIC_RUNNER_USERNAME } from "../../app/auth/guards.ts";
import { ApiError } from "../../app/api/errors.ts";
import { success } from "../../app/api/http.ts";
import { DtcoOptimizationService } from "./optimizationService.ts";

export function registerDtcoRoutes(app: FastifyInstance, repositories: Repositories, storage: StorageService): void {
  const optimization = new DtcoOptimizationService(repositories,storage);
  const service = optimization.dtco;
  const editable = (experimentId: string): void => { if (repositories.dtcoOptimizations.managedExperiment(experimentId)) throw new ApiError(409,"DTCO_OPTIMIZATION_MANAGED","use the optimization controls for this managed experiment"); };
  const read = [allowPublicRunner(repositories), async (request: FastifyRequest) => {
    if (request.edaUser!.role !== "admin" && !request.edaUser!.allowedModules.includes("dtco")) throw new ApiError(403,"MODULE_FORBIDDEN","this user is not allowed to use DTCO");
  }];
  const write = [...read,csrfGuardOrPublicRunner(repositories)];
  const owned = (request: FastifyRequest, id: string) => {
    const experiment = repositories.dtco.get(id);
    if (!experiment) throw new ApiError(404,"NOT_FOUND","experiment not found");
    assertOwnerOrAdmin(request,experiment.ownerId); return experiment;
  };
  app.get("/api/dtco/options",{preHandler:read},async request => success({ ...await optimization.options(), ownerId:request.edaUser!.id, publicRunner:request.edaUser!.username === PUBLIC_RUNNER_USERNAME }));
  app.get("/api/dtco/experiments",{preHandler:read},async request => success(repositories.dtco.list(request.edaUser!.id,request.edaUser!.role === "admin")));
  app.post("/api/dtco/experiments",{preHandler:write},async (request,reply) => { const result = await service.save(request.edaUser!.id,request.body); reply.code(201); return success(result); });
  app.get("/api/dtco/experiments/:id",{preHandler:read},async request => success(owned(request,(request.params as {id:string}).id)));
  app.put("/api/dtco/experiments/:id",{preHandler:write},async request => { const experiment = owned(request,(request.params as {id:string}).id); editable(experiment.id); return success(await service.save(experiment.ownerId,request.body,experiment.id)); });
  app.post("/api/dtco/experiments/:id/submit",{preHandler:write},async request => { const experiment = owned(request,(request.params as {id:string}).id); editable(experiment.id); return success(await service.submit(experiment.id)); });
  app.post("/api/dtco/points/:pointId/retry",{preHandler:write},async request => {
    const pointId = (request.params as {pointId:string}).pointId;
    const experiment = repositories.dtco.experimentForPoint(pointId);
    if (!experiment) throw new ApiError(404,"NOT_FOUND","point not found");
    assertOwnerOrAdmin(request,experiment.ownerId); editable(experiment.id);
    const attemptId = (request.body as {attemptId?:unknown} | undefined)?.attemptId;
    if (typeof attemptId !== "string" || !attemptId) throw new ApiError(400,"DTCO_ATTEMPT_REQUIRED","retry requires the failed attemptId for idempotence");
    const point = experiment.points.find(item => item.id === pointId);
    if (point && point.attempts.at(-1)?.id !== attemptId) return success({ experiment, submitted: [], skipped: [pointId], failed: [] });
    if (!point || !["failed","interrupted","cancelled","preparation_failed"].includes(point.status)) throw new ApiError(409,"DTCO_POINT_NOT_RETRYABLE","only failed points in the current revision can be retried");
    return success(await service.submit(experiment.id,pointId,attemptId));
  });
}
