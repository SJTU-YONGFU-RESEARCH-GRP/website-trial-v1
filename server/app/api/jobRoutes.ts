import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";
import type { FastifyInstance } from "fastify";
import type { DraftValidationContextV1, JobPlanV1, JobRecordV1, JobStatus, JsonObject, JsonPrimitive, ModuleId, ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";
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
    if (job.plan.sweep) {
      const sweepJobs = await materializeSweepJobs(job, repositories, storage, app);
      for (const sweepJob of sweepJobs) repositories.jobs.appendEvent(sweepJob.id, null, "info", "system", `Sweep point queued (${sweepJobs.indexOf(sweepJob) + 1}/${sweepJobs.length})`, { sweepParentJobId: job.id });
      repositories.audit.write(request.edaUser!.id, "job.sweep_start", "job", job.id, { moduleId: job.moduleId, runCount: sweepJobs.length });
      return success(repositories.jobs.get(job.id));
    }
    const queued = repositories.jobs.start(job.id); repositories.jobs.appendEvent(job.id, null, "info", "system", "Job queued");
    repositories.audit.write(request.edaUser!.id, "job.start", "job", job.id, { moduleId: job.moduleId }); return success(queued);
  });

  app.get("/api/jobs", { preHandler: [requireUser], schema: { tags: ["jobs"] } }, async (request, reply) => {
    const query = request.query as { moduleId?: ModuleId; status?: JobStatus; ownerId?: string; cursor?: string; limit?: string; from?: string; to?: string };
    const ownerId = request.edaUser!.role === "admin" ? query.ownerId : request.edaUser!.id;
    const rows = repositories.jobs.list({ ownerId, moduleId: query.moduleId, status: query.status, cursor: query.cursor, limit: Number(query.limit || 50), from: query.from, to: query.to });
    return sendList(reply, rows, rows.length ? rows.at(-1)!.updatedAt : null);
  });

  app.get("/api/jobs/:jobId", { preHandler: [requireUser], schema: { tags: ["jobs"] } }, async (request) => {
    const job = ownedJob(request, repositories);
    const sweepRoot = job.sweepParentJobId ?? (job.parameters.sweepDefinition ? job.id : null);
    return success({ job, steps: repositories.jobs.steps(job.id), artifacts: repositories.artifacts.listJob(job.id), latestEvents: repositories.jobs.events(job.id, 0, 100), sweepJobs: sweepRoot ? repositories.jobs.listSweep(sweepRoot) : [] });
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

  app.post("/api/jobs/:jobId/clone", { preHandler: [requireUser, csrfGuard(repositories)], schema: { tags: ["jobs"] } }, async (request, reply) => {
    const old = ownedJob(request, repositories);
    const clone = repositories.jobs.createDraft(old.ownerId, old.moduleId, old.operation, old.workflow, old.inputManifest);
    const workspace = await storage.createWorkspace(clone.id);
    await fsp.cp(await storage.resolveExisting(`${old.workspaceRelativePath}/input`), path.join(workspace, "input-copy"), { recursive: true, errorOnExist: true });
    await fsp.rm(path.join(workspace, "input"), { recursive: true });
    await fsp.rename(path.join(workspace, "input-copy"), path.join(workspace, "input"));
    repositories.jobs.updateDraftContent(clone.id, old.inputManifest, old.parameters);
    await storage.writeManifest(clone.id, old.inputManifest);
    repositories.jobs.appendEvent(clone.id, null, "info", "system", `Cloned inputs and parameters from ${old.id}; preflight must run again`);
    repositories.audit.write(request.edaUser!.id, "job.clone", "job", old.id, { cloneJobId: clone.id });
    reply.code(201); return success(repositories.jobs.get(clone.id));
  });

  app.get("/api/jobs/:jobId/manifest", { preHandler: [requireUser], schema: { tags: ["artifacts"] } }, async (request, reply) => {
    const job = ownedJob(request, repositories);
    reply.type("application/json").header("Content-Disposition", `attachment; filename=\"${job.id}-input-manifest.json\"`);
    return `${JSON.stringify(job.inputManifest, null, 2)}\n`;
  });

  app.get("/api/jobs/:jobId/artifacts", { preHandler: [requireUser], schema: { tags: ["artifacts"] } }, async (request) => { const job = ownedJob(request, repositories); return success(repositories.artifacts.listJob(job.id)); });
  app.get("/api/jobs/:jobId/artifacts.zip", { preHandler: [requireUser], schema: { tags: ["artifacts"] } }, async (request, reply) => {
    const job = ownedJob(request, repositories); const artifacts = repositories.artifacts.listJob(job.id);
    const output = new PassThrough(); const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.once("error", (error: Error) => output.destroy(error)); archive.pipe(output);
    archive.append(`${JSON.stringify({ job, artifacts }, null, 2)}\n`, { name: "job.json" });
    for (const artifact of artifacts) {
      try { archive.file(await storage.resolveExisting(artifact.relativePath), { name: `artifacts/${artifact.role}/${path.basename(artifact.relativePath)}` }); }
      catch { archive.append(`Missing retained artifact: ${artifact.relativePath}\n`, { name: `missing/${artifact.id}.txt` }); }
    }
    void archive.finalize();
    reply.type("application/zip").header("Content-Disposition", `attachment; filename=\"${job.id}-artifacts.zip\"`); return reply.send(output);
  });
  app.get("/api/artifacts/:artifactId/download", { schema: { tags: ["artifacts"] } }, async (request, reply) => {
    const artifact = repositories.artifacts.get(String((request.params as { artifactId?: string }).artifactId || "")); if (!artifact) throw new ApiError(404, "NOT_FOUND", "artifact not found");
    if (artifact.visibility !== "published") {
      assertOwnerOrAdmin(request, artifact.ownerId);
      if (request.edaUser?.role === "admin" && request.edaUser.id !== artifact.ownerId) repositories.audit.write(request.edaUser.id, "artifact.admin_download", "artifact", artifact.id, { ownerId: artifact.ownerId }, request.ip, request.headers["user-agent"] || null);
    }
    const filePath = await storage.resolveExisting(artifact.relativePath); reply.type(artifact.mediaType).header("Content-Disposition", `attachment; filename="${path.basename(filePath).replaceAll('"', "")}"`); return reply.send(fs.createReadStream(filePath));
  });
}

async function materializeSweepJobs(job: JobRecordV1, repositories: Repositories, storage: StorageService, app: FastifyInstance): Promise<JobRecordV1[]> {
  const sweep = job.plan.sweep;
  if (!sweep) return [repositories.jobs.start(job.id)];
  const points = cartesianPoints(sweep.dimensions);
  if (points.length !== sweep.runCount || !points.length) throw new ApiError(409, "SWEEP_PLAN_INVALID", "validated sweep dimensions no longer match the planned run count");
  const adapter = app.eda.registry.require(job.moduleId);
  const configuredTools = job.toolConfigurations.map((snapshot) => repositories.tools.get(snapshot.id)).filter((tool): tool is ToolConfigurationV1 => Boolean(tool));
  if (configuredTools.length !== job.toolConfigurations.length) throw new ApiError(409, "TOOL_CONFIGURATION_MISSING", "a frozen sweep tool configuration is no longer available");
  const technologyId = typeof job.parameters.technologyLibraryId === "string" ? job.parameters.technologyLibraryId : null;
  const technology = technologyId ? repositories.technologies.list().find((item) => item.id === technologyId) ?? null : null;
  const toolBindings = Object.fromEntries(configuredTools.map((tool) => {
    const snapshot = job.toolConfigurations.find((item) => item.id === tool.id)!;
    return [tool.toolId, { configuration: snapshot, health: "healthy", version: job.toolVersions[tool.toolId] ?? null, selfTestPassed: true, environment: tool.environment }];
  }));
  const childItems: Array<{ id: string; parameters: JsonObject; plan: JobPlanV1 }> = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const parameters = { ...job.parameters, ...point, sweep: {}, sweepDefinition: job.parameters.sweep ?? sweep.dimensions, sweepPoint: point, sweepIndex: index + 1, sweepRunCount: points.length } as JsonObject;
    const childJob = { ...job, parameters, plan: { ...job.plan, sweep: null } };
    const context = { moduleId: job.moduleId, storageRoot: storage.root, now: () => new Date().toISOString(), job: childJob, files: job.inputManifest.files,
      technology, toolConfigurations: configuredTools, toolHealth: {}, toolBindings, technologies: technology ? [technology] : [] } as DraftValidationContextV1;
    const plan = await adapter.buildPlan(context);
    if (plan.sweep || !plan.steps.length) throw new ApiError(409, "SWEEP_CHILD_PLAN_INVALID", `sweep point ${index + 1} did not produce one executable child plan`);
    childItems.push({ id: index === 0 ? job.id : randomUUID(), parameters, plan });
  }
  const parentInput = await storage.resolveExisting(`${job.workspaceRelativePath}/input`);
  const prepared: string[] = [];
  try {
    for (const child of childItems.slice(1)) {
      const workspace = await storage.createWorkspace(child.id); prepared.push(workspace);
      await fsp.rm(path.join(workspace, "input"), { recursive: true, force: true });
      await fsp.cp(parentInput, path.join(workspace, "input"), { recursive: true, errorOnExist: true, preserveTimestamps: true });
      await storage.writeManifest(child.id, job.inputManifest);
    }
    return repositories.jobs.materializeSweep(job.id, childItems[0]!.parameters, childItems[0]!.plan, childItems.slice(1));
  } catch (error) {
    await Promise.all(prepared.map((workspace) => fsp.rm(workspace, { recursive: true, force: true })));
    throw error;
  }
}

function cartesianPoints(dimensions: Record<string, JsonPrimitive[]>): JsonObject[] {
  let points: JsonObject[] = [{}];
  for (const [id, values] of Object.entries(dimensions)) points = points.flatMap((point) => values.map((value) => ({ ...point, [id]: value })));
  return points;
}

function ownedJob(request: Parameters<typeof assertOwnerOrAdmin>[0], repositories: Repositories) {
  const id = String((request.params as { jobId?: string }).jobId || ""); const job = repositories.jobs.get(id);
  if (!job) throw new ApiError(404, "NOT_FOUND", "job not found"); assertOwnerOrAdmin(request, job.ownerId); return job;
}
