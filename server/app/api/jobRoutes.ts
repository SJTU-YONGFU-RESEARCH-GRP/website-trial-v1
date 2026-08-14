import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { JobStatus, ModuleId } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../db/repositories.ts";
import { StorageService } from "../storage/storage.ts";
import type { WorkerSupervisor } from "../../worker/index.ts";
import { assertOwnerOrAdmin, csrfGuard, requireUser } from "../auth/guards.ts";
import { ApiError } from "./errors.ts";
import { sendList, success } from "./http.ts";

const TERMINAL = new Set<JobStatus>(["succeeded", "failed", "cancelled", "interrupted"]);

export function registerJobRoutes(app: FastifyInstance, repositories: Repositories, storage: StorageService, workers: WorkerSupervisor | null): void {
  app.post("/api/jobs/:jobId/start", { preHandler: [requireUser, csrfGuard(repositories)], schema: { tags: ["jobs"] } }, async (request) => {
    const job = ownedJob(request, repositories); if (job.status !== "ready") throw new ApiError(409, "JOB_NOT_READY", "job must pass preflight before Start");
    const active = repositories.jobs.list({ ownerId: job.ownerId, limit: 200 }).filter((item) => item.status === "queued" || item.status === "running").length;
    if (active >= request.edaUser!.maxConcurrentJobs) throw new ApiError(429, "USER_CONCURRENCY", "user concurrency limit reached");
    const queued = repositories.jobs.start(job.id); repositories.jobs.appendEvent(job.id, null, "info", "system", "Job queued");
    repositories.audit.write(request.edaUser!.id, "job.start", "job", job.id, { moduleId: job.moduleId }); return success(queued);
  });

  app.get("/api/jobs", { preHandler: [requireUser], schema: { tags: ["jobs"] } }, async (request, reply) => {
    const query = request.query as { moduleId?: ModuleId; status?: JobStatus; ownerId?: string; cursor?: string; limit?: string };
    const ownerId = request.edaUser!.role === "admin" ? query.ownerId : request.edaUser!.id;
    const rows = repositories.jobs.list({ ownerId, moduleId: query.moduleId, status: query.status, cursor: query.cursor, limit: Number(query.limit || 50) });
    return sendList(reply, rows, rows.length ? rows.at(-1)!.updatedAt : null);
  });

  app.get("/api/jobs/:jobId", { preHandler: [requireUser], schema: { tags: ["jobs"] } }, async (request) => {
    const job = ownedJob(request, repositories); return success({ job, steps: repositories.jobs.steps(job.id), artifacts: repositories.artifacts.listJob(job.id), latestEvents: repositories.jobs.events(job.id, 0, 100) });
  });

  app.get("/api/jobs/:jobId/events", { preHandler: [requireUser], schema: { tags: ["jobs"] } }, async (request, reply) => {
    const job = ownedJob(request, repositories); const query = request.query as { after?: string; stream?: string };
    const lastHeader = request.headers["last-event-id"]; const after = Number(query.after || (typeof lastHeader === "string" ? lastHeader : 0));
    const wantsStream = query.stream !== "false" && request.headers.accept?.includes("text/event-stream");
    if (!wantsStream) return success(repositories.jobs.events(job.id, Number.isFinite(after) ? after : 0));
    reply.hijack(); const response = reply.raw; response.statusCode = 200;
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8"); response.setHeader("Cache-Control", "no-cache, no-transform"); response.setHeader("Connection", "keep-alive"); response.flushHeaders();
    let cursor = Number.isFinite(after) ? after : 0; let closed = false; request.raw.once("close", () => { closed = true; });
    while (!closed) {
      const events = repositories.jobs.events(job.id, cursor);
      for (const event of events) { cursor = event.id; response.write(`id: ${event.id}\nevent: job-event\ndata: ${JSON.stringify(event)}\n\n`); }
      const current = repositories.jobs.get(job.id);
      if (current && TERMINAL.has(current.status) && !events.length) { response.write(`event: end\ndata: ${JSON.stringify({ status: current.status })}\n\n`); response.end(); break; }
      if (!events.length) response.write(": keepalive\n\n");
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
    }
  });

  app.post("/api/jobs/:jobId/cancel", { preHandler: [requireUser, csrfGuard(repositories)], schema: { tags: ["jobs"] } }, async (request) => {
    const job = ownedJob(request, repositories);
    if (job.status === "queued" || job.status === "running") { repositories.jobs.requestCancel(job.id); workers?.cancel(job.id); }
    else throw new ApiError(409, "JOB_NOT_CANCELLABLE", `job in ${job.status} state cannot be cancelled`);
    repositories.jobs.appendEvent(job.id, null, "warning", "system", "Cancellation requested"); repositories.audit.write(request.edaUser!.id, "job.cancel", "job", job.id);
    return success(repositories.jobs.get(job.id));
  });

  app.post("/api/jobs/:jobId/retry", { preHandler: [requireUser, csrfGuard(repositories)], schema: { tags: ["jobs"] } }, async (request, reply) => {
    const old = ownedJob(request, repositories); if (!TERMINAL.has(old.status)) throw new ApiError(409, "JOB_NOT_RETRYABLE", "only terminal jobs can be retried");
    const retry = repositories.jobs.createDraft(old.ownerId, old.moduleId, old.operation, old.workflow, old.inputManifest);
    const workspace = await storage.createWorkspace(retry.id); await fsp.cp(await storage.resolveExisting(`${old.workspaceRelativePath}/input`), path.join(workspace, "input-copy"), { recursive: true, errorOnExist: true });
    await fsp.rm(path.join(workspace, "input"), { recursive: true }); await fsp.rename(path.join(workspace, "input-copy"), path.join(workspace, "input"));
    repositories.jobs.setDraft(retry.id, old.inputManifest, old.parameters, old.capabilityVersion, old.toolConfigurations, old.toolVersions, old.plan);
    await storage.writeManifest(retry.id, old.inputManifest); repositories.jobs.linkRetry(retry.id, old.id); repositories.jobs.start(retry.id);
    repositories.jobs.appendEvent(retry.id, null, "info", "system", `Retry of ${old.id}`); repositories.audit.write(request.edaUser!.id, "job.retry", "job", old.id, { retryJobId: retry.id });
    reply.code(201); return success(repositories.jobs.get(retry.id));
  });

  app.get("/api/jobs/:jobId/artifacts", { preHandler: [requireUser], schema: { tags: ["artifacts"] } }, async (request) => { const job = ownedJob(request, repositories); return success(repositories.artifacts.listJob(job.id)); });
  app.get("/api/artifacts/:artifactId/download", { schema: { tags: ["artifacts"] } }, async (request, reply) => {
    const artifact = repositories.artifacts.get(String((request.params as { artifactId?: string }).artifactId || "")); if (!artifact) throw new ApiError(404, "NOT_FOUND", "artifact not found");
    if (artifact.visibility !== "published") {
      assertOwnerOrAdmin(request, artifact.ownerId);
      if (request.edaUser?.role === "admin" && request.edaUser.id !== artifact.ownerId) repositories.audit.write(request.edaUser.id, "artifact.admin_download", "artifact", artifact.id, { ownerId: artifact.ownerId }, request.ip, request.headers["user-agent"] || null);
    }
    const filePath = await storage.resolveExisting(artifact.relativePath); reply.type(artifact.mediaType).header("Content-Disposition", `attachment; filename="${path.basename(filePath).replaceAll('"', "")}"`); return reply.send(fs.createReadStream(filePath));
  });
}

function ownedJob(request: Parameters<typeof assertOwnerOrAdmin>[0], repositories: Repositories) {
  const id = String((request.params as { jobId?: string }).jobId || ""); const job = repositories.jobs.get(id);
  if (!job) throw new ApiError(404, "NOT_FOUND", "job not found"); assertOwnerOrAdmin(request, job.ownerId); return job;
}
