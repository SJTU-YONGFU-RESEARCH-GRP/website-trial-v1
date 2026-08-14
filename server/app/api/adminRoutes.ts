import path from "node:path";
import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { JobStatus, ModuleId, ResultLifecycle, TechnologyLibraryV1, ToolConfigurationV1, UserRole } from "../../../shared/contracts/v1.ts";
import { TECHNOLOGY_ADAPTER_IDS, TOOL_CATALOG } from "../../../shared/toolCatalog.ts";
import type { Repositories } from "../db/repositories.ts";
import type { ToolHealthService } from "../tools/health.ts";
import type { StorageService } from "../storage/storage.ts";
import type { WorkerSupervisor } from "../../worker/index.ts";
import { csrfGuard, requireAdmin } from "../auth/guards.ts";
import { ApiError } from "./errors.ts";
import { sendList, success } from "./http.ts";

export function registerAdminRoutes(app: FastifyInstance, repositories: Repositories, health: ToolHealthService, storage: StorageService, workers: WorkerSupervisor | null): void {
  const guarded = [requireAdmin, csrfGuard(repositories)];
  app.get("/api/admin/overview", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async () => {
    const sqlite = app.eda.database.sqlite;
    const userCount = Number((sqlite.prepare("SELECT COUNT(*) count FROM users WHERE deleted_at IS NULL").get() as { count: number }).count);
    const jobStatus = Object.fromEntries((sqlite.prepare("SELECT status,COUNT(*) count FROM jobs GROUP BY status").all() as Array<{ status: string; count: number }>).map((row) => [row.status, Number(row.count)]));
    const moduleQueues = Object.fromEntries((sqlite.prepare("SELECT module_id,SUM(status='queued') queued,SUM(status='running') running FROM jobs GROUP BY module_id").all() as Array<{ module_id: string; queued: number; running: number }>).map((row) => [row.module_id, { queued: Number(row.queued), running: Number(row.running) }]));
    const resultCounts = Object.fromEntries((["benchmark", "digital", "ppa"] as ModuleId[]).map((moduleId) => [moduleId, Number((sqlite.prepare(`SELECT COUNT(*) count FROM ${moduleId}_results WHERE lifecycle!='deleted'`).get() as { count: number }).count)]));
    const tools = repositories.tools.list().map((tool) => ({ id: tool.id, toolId: tool.toolId, moduleId: tool.moduleId, enabled: tool.enabled, health: repositories.tools.latestHealth(tool.id) }));
    return success({ userCount, jobStatus, moduleQueues, resultCounts, tools, storage: await storage.usage(), recentFailures: [...repositories.jobs.list({ status: "failed", limit: 10 }), ...repositories.jobs.list({ status: "interrupted", limit: 10 })].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 10) });
  });
  app.get("/api/admin/storage", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async () => success(await storage.usage()));
  app.get("/api/admin/users", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (request, reply) => {
    const search = String((request.query as { search?: string }).search || "").trim().toLowerCase();
    const rows = repositories.users.list(500).filter((user) => !search || user.username.toLowerCase().includes(search)); return sendList(reply, rows);
  });
  app.post("/api/admin/users", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request, reply) => {
    const body = request.body as { username?: string; password?: string; role?: UserRole; allowedModules?: ModuleId[]; maxConcurrentJobs?: number; storageQuotaBytes?: number };
    if (typeof body?.username !== "string" || typeof body.password !== "string") throw new ApiError(400, "USER_INVALID", "username and password are required");
    let user;
    try { user = repositories.users.create({ ...body, username: body.username, password: body.password }); }
    catch (error) { throw new ApiError(/unique/i.test(error instanceof Error ? error.message : "") ? 409 : 400, "USER_INVALID", error instanceof Error ? error.message : String(error)); }
    auditRequest(repositories, request, "user.create", "user", user.id, { username: user.username }); reply.code(201); return success(user);
  });
  app.patch("/api/admin/users/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const id = String((request.params as { id?: string }).id || ""); if (!repositories.users.get(id)) throw new ApiError(404, "NOT_FOUND", "user not found");
    if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) throw new ApiError(400, "USER_INVALID", "user patch must be an object");
    const patch = request.body as { password?: string; enabled?: boolean; delete?: boolean }; let user;
    try { user = repositories.users.patch(id, patch as never); } catch (error) { throw new ApiError(400, "USER_INVALID", error instanceof Error ? error.message : String(error)); }
    if (patch.password || patch.enabled === false || patch.delete) repositories.sessions.revokeUser(id);
    auditRequest(repositories, request, "user.update", "user", id, { fields: Object.keys((request.body || {}) as object) }); return success(user);
  });

  app.get("/api/admin/tools", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (_request, reply) => sendList(reply, repositories.tools.list()));
  app.post("/api/admin/tools", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request, reply) => {
    const tool = saveTool(repositories, request.body); auditRequest(repositories, request, "tool.create", "tool_configuration", tool.id, { toolId: tool.toolId, revision: tool.revision }); reply.code(201); return success(tool);
  });
  app.patch("/api/admin/tools/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const old = repositories.tools.get(String((request.params as { id?: string }).id || "")); if (!old) throw new ApiError(404, "NOT_FOUND", "tool configuration not found");
    const body = { ...old, ...(request.body as object), id: undefined }; const tool = saveTool(repositories, body); auditRequest(repositories, request, "tool.update", "tool_configuration", tool.id, { previousId: old.id, revision: tool.revision }); return success(tool);
  });
  app.post("/api/admin/tools/:id/probe", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const tool = repositories.tools.get(String((request.params as { id?: string }).id || "")); if (!tool) throw new ApiError(404, "NOT_FOUND", "tool configuration not found");
    const result = await health.probe(tool); auditRequest(repositories, request, "tool.probe", "tool_configuration", tool.id, { status: result.status }); return success(result);
  });
  app.post("/api/admin/tools/:id/check", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const tool = repositories.tools.get(String((request.params as { id?: string }).id || "")); if (!tool) throw new ApiError(404, "NOT_FOUND", "tool configuration not found");
    const result = await health.checkPaths(tool); auditRequest(repositories, request, "tool.check_path", "tool_configuration", tool.id, { ok: result.ok }); return success(result);
  });
  app.post("/api/admin/tools/:id/self-test", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const tool = repositories.tools.get(String((request.params as { id?: string }).id || "")); if (!tool) throw new ApiError(404, "NOT_FOUND", "tool configuration not found");
    const result = await health.selfTest(tool); auditRequest(repositories, request, "tool.self_test", "tool_configuration", tool.id, { status: result.status, passed: result.selfTestPassed }); return success(result);
  });

  app.get("/api/admin/jobs", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (request, reply) => {
    const query = request.query as { ownerId?: string; moduleId?: ModuleId; status?: JobStatus; limit?: string };
    return sendList(reply, repositories.jobs.list({ ownerId: query.ownerId, moduleId: query.moduleId, status: query.status, limit: Number(query.limit || 100) }));
  });
  app.patch("/api/admin/jobs/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const id = String((request.params as { id?: string }).id || ""); const job = repositories.jobs.get(id); if (!job) throw new ApiError(404, "NOT_FOUND", "job not found");
    const body = request.body as { status?: "cancelled" | "interrupted" };
    if (body.status === "cancelled" && (job.status === "queued" || job.status === "running")) { repositories.jobs.requestCancel(id); workers?.cancel(id); }
    else if (body.status === "interrupted" && job.status === "running") {
      if (workers?.cancel(id)) throw new ApiError(409, "JOB_PROCESS_ACTIVE", "active process cancellation was requested; wait for the cancelled terminal state");
      repositories.jobs.transition(id, "interrupted", { error: { type: "internal", code: "ADMIN_INTERRUPTED", message: "administrator marked stale running job interrupted", stepId: job.currentStepId, retryable: true, details: null } });
    }
    else throw new ApiError(409, "ADMIN_JOB_TRANSITION", "requested administrator transition is not valid");
    auditRequest(repositories, request, "job.admin_update", "job", id, { status: body.status }); return success(repositories.jobs.get(id));
  });
  app.post("/api/admin/jobs/:id/cleanup", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const id = String((request.params as { id?: string }).id || ""); const job = repositories.jobs.get(id); if (!job) throw new ApiError(404, "NOT_FOUND", "job not found");
    if (!["succeeded", "failed", "cancelled", "interrupted"].includes(job.status)) throw new ApiError(409, "JOB_NOT_TERMINAL", "only terminal job work/output directories may be cleaned");
    await storage.cleanupJobWorkingData(id); auditRequest(repositories, request, "job.cleanup", "job", id, { preserved: ["input", "logs", "artifacts", "manifest.json"] }); return success({ cleaned: true, jobId: id });
  });
  app.get("/api/admin/jobs/:id/diagnostics.zip", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (request, reply) => {
    const id = String((request.params as { id?: string }).id || ""); const job = repositories.jobs.get(id); if (!job) throw new ApiError(404, "NOT_FOUND", "job not found");
    const output = new PassThrough(); const archive = new ZipArchive({ zlib: { level: 6 } }); archive.once("error", (error: Error) => output.destroy(error)); archive.pipe(output);
    const details = { job, steps: repositories.jobs.steps(id), events: repositories.jobs.events(id, 0, 2_000), artifacts: repositories.artifacts.listJob(id) };
    archive.append(`${JSON.stringify(details, null, 2)}\n`, { name: "diagnostics.json" });
    try { archive.file(await storage.resolveExisting(`${job.workspaceRelativePath}/manifest.json`), { name: "manifest.json" }); } catch { /* An interrupted upload may not have a manifest. */ }
    try { archive.directory(await storage.resolveExisting(`${job.workspaceRelativePath}/logs`), "logs"); } catch { /* No logs before execution. */ }
    void archive.finalize(); auditRequest(repositories, request, "job.diagnostics_download", "job", id, { ownerId: job.ownerId });
    reply.type("application/zip").header("Content-Disposition", `attachment; filename=\"${id}-diagnostics.zip\"`); return reply.send(output);
  });

  app.get("/api/admin/results", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (request, reply) => {
    const query = request.query as { moduleId?: ModuleId; lifecycle?: ResultLifecycle; ownerId?: string; limit?: string }; const modules = query.moduleId ? [query.moduleId] : ["benchmark", "digital", "ppa"] as ModuleId[];
    return sendList(reply, modules.flatMap((moduleId) => repositories.results.list(moduleId, request.edaUser!.id, true, query.lifecycle, Number(query.limit || 100), query.ownerId)));
  });
  app.patch("/api/admin/results/:module/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const params = request.params as { module?: ModuleId; id?: string }; const body = request.body as { lifecycle?: ResultLifecycle };
    if (!params.module || !["benchmark", "digital", "ppa"].includes(params.module) || !body.lifecycle || !["private", "published", "unpublished", "deleted"].includes(body.lifecycle)) throw new ApiError(400, "RESULT_PATCH_INVALID", "module and lifecycle are required");
    const resultId = String(params.id || ""); if (!repositories.results.get(params.module, resultId, request.edaUser!.id, true)) throw new ApiError(404, "NOT_FOUND", "result not found");
    repositories.results.patchLifecycle(params.module, resultId, body.lifecycle); auditRequest(repositories, request, "result.lifecycle", "result", resultId, { moduleId: params.module, lifecycle: body.lifecycle });
    return success(repositories.results.get(params.module, String(params.id || ""), request.edaUser!.id, true));
  });

  app.get("/api/admin/technologies", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (_request, reply) => sendList(reply, repositories.technologies.list()));
  app.post("/api/admin/technologies", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request, reply) => {
    const technology = repositories.technologies.save(validateTechnology(request.body)); auditRequest(repositories, request, "technology.create", "technology", technology.id, { technologyId: technology.technologyId }); reply.code(201); return success(technology);
  });
  app.patch("/api/admin/technologies/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const old = repositories.technologies.list().find((item) => item.id === String((request.params as { id?: string }).id || "")); if (!old) throw new ApiError(404, "NOT_FOUND", "technology not found");
    const { id: _id, revision: _revision, createdAt: _createdAt, updatedAt: _updatedAt, ...base } = old; const technology = repositories.technologies.save(validateTechnology({ ...base, ...(request.body as object) }));
    auditRequest(repositories, request, "technology.update", "technology", technology.id, { previousId: old.id, revision: technology.revision }); return success(technology);
  });
  app.get("/api/admin/audit", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (request, reply) => sendList(reply, repositories.audit.list(Number((request.query as { limit?: string }).limit || 100))));
}

function saveTool(repositories: Repositories, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "TOOL_CONFIG_INVALID", "tool configuration must be an object");
  const body = value as Omit<ToolConfigurationV1, "id" | "revision" | "createdAt" | "updatedAt" | "capturedAt">;
  const catalog = TOOL_CATALOG.find((entry) => entry.toolId === body?.toolId);
  const configuredPaths = [body?.rootPath, body?.executablePath, body?.interpreterPath];
  const testFixture = process.env.NODE_ENV === "test" && configuredPaths.some((candidate) => candidate?.includes("test/fixtures/fake-tools"));
  if (!catalog && !testFixture) throw new ApiError(400, "TOOL_NOT_AUDITED", "toolId is not present in the server-owned adapter catalog");
  for (const candidate of [body.rootPath, body.executablePath, body.interpreterPath, body.workingDirectory]) if (candidate && !path.isAbsolute(candidate)) throw new ApiError(400, "TOOL_PATH_INVALID", "tool paths must be absolute");
  if (process.env.NODE_ENV !== "test" && [body.rootPath, body.executablePath, body.interpreterPath].some((candidate) => candidate?.includes("test/fixtures/fake-tools"))) throw new ApiError(400, "FAKE_TOOL_FORBIDDEN", "test fake tools cannot be configured outside NODE_ENV=test");
  if (!body.toolId || !body.moduleId || !body.adapterId || !Array.isArray(body.versionProbeArgv) || !Array.isArray(body.environmentNames) || !body.environment || typeof body.environment !== "object") throw new ApiError(400, "TOOL_CONFIG_INVALID", "toolId, moduleId, adapterId, environment allowlist and versionProbeArgv are required");
  if (!(["benchmark", "digital", "ppa"] as string[]).includes(body.moduleId) || !Number.isSafeInteger(body.timeoutSeconds) || body.timeoutSeconds <= 0 || !Number.isSafeInteger(body.maxConcurrency) || body.maxConcurrency <= 0) throw new ApiError(400, "TOOL_CONFIG_INVALID", "module, timeout and concurrency are invalid");
  if (!catalog) return repositories.tools.save(body);
  if (body.moduleId !== catalog.moduleId || body.adapterId !== catalog.adapterId || body.adapterVersion !== catalog.adapterVersion) throw new ApiError(400, "TOOL_ADAPTER_CONTRACT_INVALID", "module and adapter identity are fixed by the server-owned tool catalog");
  if (JSON.stringify(body.versionProbeArgv) !== JSON.stringify(catalog.versionProbeArgv)) throw new ApiError(400, "TOOL_PROBE_CONTRACT_INVALID", "version probe arguments are fixed by the audited adapter");
  const testEnvironmentNames = testFixture ? ["FAKE_EDA_TOOL", "FAKE_EDA_MODE"] : [];
  const allowedEnvironment = new Set<string>([...catalog.allowedEnvironmentNames, ...testEnvironmentNames]);
  if (!body.environmentNames.every((name) => allowedEnvironment.has(name)) || Object.keys(body.environment).some((name) => !allowedEnvironment.has(name)) || Object.values(body.environment).some((entry) => typeof entry !== "string")) throw new ApiError(400, "TOOL_ENV_INVALID", "environment values must use the adapter-owned allowlist");
  return repositories.tools.save({
    ...body,
    moduleId: catalog.moduleId,
    adapterId: catalog.adapterId,
    adapterVersion: catalog.adapterVersion,
    versionProbeArgv: [...catalog.versionProbeArgv],
    environmentNames: [...catalog.allowedEnvironmentNames, ...testEnvironmentNames],
  });
}

function validateTechnology(value: unknown): Omit<TechnologyLibraryV1, "id" | "revision" | "createdAt" | "updatedAt"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "TECHNOLOGY_INVALID", "technology configuration must be an object");
  const technology = value as Omit<TechnologyLibraryV1, "id" | "revision" | "createdAt" | "updatedAt">;
  const identifier = /^[A-Za-z0-9][A-Za-z0-9_.+-]{0,127}$/; const label = /^[A-Za-z0-9][A-Za-z0-9_.+ -]{0,127}$/;
  if (!identifier.test(technology.technologyId) || !identifier.test(technology.pdk) || !identifier.test(technology.standardCellLibrary) || !label.test(technology.processNode) || !identifier.test(technology.corner)
    || !Array.isArray(technology.libertyPaths) || !technology.libertyPaths.length || !Array.isArray(technology.cellLefPaths) || !Array.isArray(technology.allowedAdapterIds) || typeof technology.enabled !== "boolean") {
    throw new ApiError(400, "TECHNOLOGY_INVALID", "technology identity, Liberty paths, adapter list, and enabled state are invalid");
  }
  if (technology.voltage !== null && (typeof technology.voltage !== "number" || !Number.isFinite(technology.voltage) || technology.voltage <= 0)) throw new ApiError(400, "TECHNOLOGY_INVALID", "technology voltage must be a positive finite number or null");
  if (technology.rcCorner !== null && !identifier.test(technology.rcCorner)) throw new ApiError(400, "TECHNOLOGY_INVALID", "RC corner is invalid");
  const paths = [...technology.libertyPaths, ...technology.cellLefPaths, ...(technology.techLefPath ? [technology.techLefPath] : [])];
  if (paths.some((candidate) => typeof candidate !== "string" || !path.isAbsolute(candidate))) throw new ApiError(400, "TECHNOLOGY_PATH_INVALID", "technology file paths must be absolute");
  if (new Set(paths).size !== paths.length) throw new ApiError(400, "TECHNOLOGY_PATH_INVALID", "technology file paths must not be duplicated");
  const knownAdapters = new Set<string>(TECHNOLOGY_ADAPTER_IDS);
  if (!technology.allowedAdapterIds.length || technology.allowedAdapterIds.some((adapterId) => !knownAdapters.has(adapterId))) throw new ApiError(400, "TECHNOLOGY_ADAPTER_INVALID", "technology adapters must come from the audited server catalog");
  technology.allowedAdapterIds = [...new Set(technology.allowedAdapterIds)];
  return technology;
}

function auditRequest(repositories: Repositories, request: FastifyRequest, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>) {
  repositories.audit.write(request.edaUser!.id, action, targetType, targetId, details as never, request.ip, request.headers["user-agent"] || null);
}
