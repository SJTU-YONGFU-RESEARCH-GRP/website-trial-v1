import path from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { JobStatus, ModuleId, ResultLifecycle, TechnologyLibraryV1, ToolConfigurationV1, UserRole } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../db/repositories.ts";
import type { ToolHealthService } from "../tools/health.ts";
import { csrfGuard, requireAdmin } from "../auth/guards.ts";
import { ApiError } from "./errors.ts";
import { sendList, success } from "./http.ts";

export function registerAdminRoutes(app: FastifyInstance, repositories: Repositories, health: ToolHealthService): void {
  const guarded = [requireAdmin, csrfGuard(repositories)];
  app.get("/api/admin/users", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (_request, reply) => sendList(reply, repositories.users.list()));
  app.post("/api/admin/users", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request, reply) => {
    const body = request.body as { username?: string; password?: string; role?: UserRole; allowedModules?: ModuleId[]; maxConcurrentJobs?: number; storageQuotaBytes?: number };
    if (!body?.username || !body.password) throw new ApiError(400, "USER_INVALID", "username and password are required");
    const user = repositories.users.create({ ...body, username: body.username, password: body.password }); auditRequest(repositories, request, "user.create", "user", user.id, { username: user.username }); reply.code(201); return success(user);
  });
  app.patch("/api/admin/users/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const id = String((request.params as { id?: string }).id || ""); const user = repositories.users.patch(id, request.body as never);
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

  app.get("/api/admin/jobs", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (request, reply) => {
    const query = request.query as { ownerId?: string; moduleId?: ModuleId; status?: JobStatus; limit?: string };
    return sendList(reply, repositories.jobs.list({ ownerId: query.ownerId, moduleId: query.moduleId, status: query.status, limit: Number(query.limit || 100) }));
  });
  app.patch("/api/admin/jobs/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const id = String((request.params as { id?: string }).id || ""); const job = repositories.jobs.get(id); if (!job) throw new ApiError(404, "NOT_FOUND", "job not found");
    const body = request.body as { status?: "cancelled" | "interrupted" };
    if (body.status === "cancelled" && job.status === "queued") repositories.jobs.transition(id, "cancelled");
    else if (body.status === "interrupted" && job.status === "running") repositories.jobs.transition(id, "interrupted");
    else throw new ApiError(409, "ADMIN_JOB_TRANSITION", "requested administrator transition is not valid");
    auditRequest(repositories, request, "job.admin_update", "job", id, { status: body.status }); return success(repositories.jobs.get(id));
  });

  app.get("/api/admin/results", { preHandler: [requireAdmin], schema: { tags: ["admin"] } }, async (request, reply) => {
    const query = request.query as { moduleId?: ModuleId; lifecycle?: ResultLifecycle; limit?: string }; const modules = query.moduleId ? [query.moduleId] : ["benchmark", "digital", "ppa"] as ModuleId[];
    return sendList(reply, modules.flatMap((moduleId) => repositories.results.list(moduleId, request.edaUser!.id, true, query.lifecycle, Number(query.limit || 100))));
  });
  app.patch("/api/admin/results/:module/:id", { preHandler: guarded, schema: { tags: ["admin"] } }, async (request) => {
    const params = request.params as { module?: ModuleId; id?: string }; const body = request.body as { lifecycle?: ResultLifecycle };
    if (!params.module || !["benchmark", "digital", "ppa"].includes(params.module) || !body.lifecycle || !["private", "published", "unpublished", "deleted"].includes(body.lifecycle)) throw new ApiError(400, "RESULT_PATCH_INVALID", "module and lifecycle are required");
    repositories.results.patchLifecycle(params.module, String(params.id || ""), body.lifecycle); auditRequest(repositories, request, "result.lifecycle", "result", String(params.id || ""), { moduleId: params.module, lifecycle: body.lifecycle });
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
  const body = value as Omit<ToolConfigurationV1, "id" | "revision" | "createdAt" | "updatedAt" | "capturedAt">;
  for (const candidate of [body.rootPath, body.executablePath, body.interpreterPath, body.workingDirectory]) if (candidate && !path.isAbsolute(candidate)) throw new ApiError(400, "TOOL_PATH_INVALID", "tool paths must be absolute");
  if (process.env.NODE_ENV !== "test" && [body.rootPath, body.executablePath, body.interpreterPath].some((candidate) => candidate?.includes("test/fixtures/fake-tools"))) throw new ApiError(400, "FAKE_TOOL_FORBIDDEN", "test fake tools cannot be configured outside NODE_ENV=test");
  if (!body.toolId || !body.moduleId || !body.adapterId || !Array.isArray(body.versionProbeArgv) || !Array.isArray(body.environmentNames) || !body.environment || typeof body.environment !== "object") throw new ApiError(400, "TOOL_CONFIG_INVALID", "toolId, moduleId, adapterId, environment allowlist and versionProbeArgv are required");
  if (!(["benchmark", "digital", "ppa"] as string[]).includes(body.moduleId) || !Number.isSafeInteger(body.timeoutSeconds) || body.timeoutSeconds <= 0 || !Number.isSafeInteger(body.maxConcurrency) || body.maxConcurrency <= 0) throw new ApiError(400, "TOOL_CONFIG_INVALID", "module, timeout and concurrency are invalid");
  if (!body.environmentNames.every((name) => /^[A-Z_][A-Z0-9_]*$/.test(name)) || Object.keys(body.environment).some((name) => !body.environmentNames.includes(name))) throw new ApiError(400, "TOOL_ENV_INVALID", "environment values must use configured allowlisted names");
  return repositories.tools.save(body);
}

function validateTechnology(value: unknown): Omit<TechnologyLibraryV1, "id" | "revision" | "createdAt" | "updatedAt"> {
  const technology = value as Omit<TechnologyLibraryV1, "id" | "revision" | "createdAt" | "updatedAt">;
  if (!technology.technologyId || !technology.pdk || !technology.standardCellLibrary || !Array.isArray(technology.libertyPaths) || !Array.isArray(technology.cellLefPaths) || !Array.isArray(technology.allowedAdapterIds)) throw new ApiError(400, "TECHNOLOGY_INVALID", "technology identity and path lists are required");
  const paths = [...technology.libertyPaths, ...technology.cellLefPaths, ...(technology.techLefPath ? [technology.techLefPath] : [])];
  if (paths.some((candidate) => !path.isAbsolute(candidate))) throw new ApiError(400, "TECHNOLOGY_PATH_INVALID", "technology file paths must be absolute");
  return technology;
}

function auditRequest(repositories: Repositories, request: FastifyRequest, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>) {
  repositories.audit.write(request.edaUser!.id, action, targetType, targetId, details as never, request.ip, request.headers["user-agent"] || null);
}
