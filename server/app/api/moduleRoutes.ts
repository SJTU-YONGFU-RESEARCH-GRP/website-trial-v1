import { randomUUID } from "node:crypto";
import fsp from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import type { JsonObject, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import type { ServerConfig } from "../config.ts";
import type { Repositories } from "../db/repositories.ts";
import { ModuleRegistry, parseModuleId } from "../modules/registry.ts";
import { StorageService } from "../storage/storage.ts";
import { streamMultipartDraft } from "../storage/upload.ts";
import { csrfGuard, requireUser } from "../auth/guards.ts";
import { ApiError } from "./errors.ts";
import { success } from "./http.ts";

function snapshot(tool: ReturnType<Repositories["tools"]["get"]>): ToolConfigurationSnapshotV1 {
  if (!tool) throw new ApiError(409, "TOOL_CONFIGURATION_MISSING", "planned tool configuration does not exist");
  const { environment: _environment, createdAt: _createdAt, updatedAt: _updatedAt, ...value } = tool;
  return value;
}

export function registerModuleRoutes(app: FastifyInstance, repositories: Repositories, registry: ModuleRegistry, storage: StorageService, config: ServerConfig): void {
  app.get("/api/modules/:module/capabilities", { schema: { tags: ["modules"], params: { type: "object", required: ["module"], properties: { module: { enum: ["benchmark", "digital", "ppa"] } } } } }, async (request) => {
    const moduleId = parseModuleId((request.params as { module?: string }).module); const adapter = registry.get(moduleId);
    const toolConfigurations = repositories.tools.active(moduleId); const technologies = repositories.technologies.list(true);
    const capabilities = adapter ? await adapter.capabilities({ moduleId, storageRoot: storage.root, now: () => new Date().toISOString(), toolConfigurations, toolHealth: Object.fromEntries(toolConfigurations.map((tool) => [tool.id, repositories.tools.latestHealth(tool.id)])), toolBindings: runtimeBindings(repositories, toolConfigurations), technologies } as never) : [];
    return success({ moduleId, capabilities, technologies: repositories.technologies.list(true), maxSweepJobs: config.maxSweepJobs, configured: Boolean(adapter), unavailableReason: adapter ? null : `${moduleId} backend module is not registered` });
  });

  app.post("/api/modules/:module/drafts", { preHandler: [requireUser, csrfGuard(repositories)], schema: { tags: ["drafts"], consumes: ["multipart/form-data"], params: { type: "object", required: ["module"], properties: { module: { enum: ["benchmark", "digital", "ppa"] } } } } }, async (request, reply) => {
    const moduleId = parseModuleId((request.params as { module?: string }).module);
    if (!request.edaUser!.allowedModules.includes(moduleId)) throw new ApiError(403, "MODULE_FORBIDDEN", "this user is not allowed to run this module");
    if (!request.isMultipart()) throw new ApiError(415, "MULTIPART_REQUIRED", "draft uploads require multipart/form-data");
    const draft = await storage.createDraftArea();
    try {
      const uploaded = await streamMultipartDraft(request.parts(), draft.path, moduleId, config.upload);
      if (repositories.jobs.ownerInputBytes(request.edaUser!.id) + uploaded.manifest.totalBytes > request.edaUser!.storageQuotaBytes) throw new ApiError(413, "STORAGE_QUOTA", "upload exceeds the user's storage quota");
      const operation = uploaded.fields.operation?.trim() || "run"; const workflow = uploaded.fields.workflow?.trim() || "default";
      if (operation.length > 128 || workflow.length > 128) throw new ApiError(400, "DRAFT_FIELDS_INVALID", "operation or workflow is too long");
      const jobId = randomUUID(); const job = repositories.jobs.createDraft(request.edaUser!.id, moduleId, operation, workflow, uploaded.manifest, jobId);
      await storage.adoptDraft(draft.path, jobId); await storage.writeManifest(jobId, uploaded.manifest);
      repositories.jobs.appendEvent(jobId, null, "info", "system", `Uploaded ${uploaded.manifest.fileCount} files`, { totalBytes: uploaded.manifest.totalBytes });
      repositories.audit.write(request.edaUser!.id, "job.draft_created", "job", jobId, { moduleId, operation, workflow });
      reply.code(201); return success({ job, recognition: uploaded.manifest });
    } catch (error) { await fsp.rm(draft.path, { recursive: true, force: true }); throw error; }
  });

  app.patch("/api/jobs/:jobId/draft", { preHandler: [requireUser, csrfGuard(repositories)], schema: { tags: ["drafts"], body: { type: "object", additionalProperties: false, properties: { fileRoles: { type: "object", additionalProperties: { type: "string" } }, parameters: { type: "object" }, technologyLibraryId: { type: ["string", "null"] } } } } }, async (request) => {
    const jobId = String((request.params as { jobId?: string }).jobId || ""); const job = repositories.jobs.get(jobId);
    if (!job || job.ownerId !== request.edaUser!.id && request.edaUser!.role !== "admin") throw new ApiError(404, "NOT_FOUND", "job not found");
    if (job.status !== "draft") throw new ApiError(409, "DRAFT_IMMUTABLE", "only draft jobs may be validated");
    const body = (request.body || {}) as { fileRoles?: Record<string, string>; parameters?: JsonObject; technologyLibraryId?: string | null };
    const manifest = structuredClone(job.inputManifest);
    for (const file of manifest.files) if (body.fileRoles?.[file.relativePath]) file.role = body.fileRoles[file.relativePath]!;
    const unsafeFile = manifest.files.find((file) => file.validationErrors.length);
    if (unsafeFile) throw new ApiError(400, "INPUT_SIGNATURE_INVALID", `${unsafeFile.relativePath}: ${unsafeFile.validationErrors.join("; ")}`);
    repositories.jobs.beginValidation(jobId);
    try {
      const adapter = registry.require(job.moduleId); const technology = body.technologyLibraryId ? repositories.technologies.list().find((entry) => entry.id === body.technologyLibraryId) || null : null;
      if (body.technologyLibraryId && !technology) throw new ApiError(409, "TECHNOLOGY_NOT_FOUND", "selected technology library does not exist");
      const parameters = { ...(body.parameters || {}), ...(technology ? { technologyLibraryId: technology.id, technologyRevision: technology.revision } : {}) } as JsonObject;
      const toolConfigurations = repositories.tools.active(job.moduleId); const validatingJob = { ...repositories.jobs.get(jobId)!, inputManifest: manifest, parameters, toolConfigurations: toolConfigurations.map(snapshot) };
      const context = { moduleId: job.moduleId, storageRoot: storage.root, now: () => new Date().toISOString(), job: validatingJob, files: manifest.files, technology, toolConfigurations, toolHealth: Object.fromEntries(toolConfigurations.map((tool) => [tool.id, repositories.tools.latestHealth(tool.id)])), toolBindings: runtimeBindings(repositories, toolConfigurations), technologies: technology ? [technology] : [] } as const;
      const validation = await adapter.validateDraft(context);
      if (!validation.valid || validation.errors.length) throw validation.errors[0] || new Error("draft validation failed");
      const plan = await adapter.buildPlan(context); if (!plan.steps.length) throw new ApiError(409, "EMPTY_PLAN", "module returned an empty execution plan");
      if (plan.sweep && (plan.sweep.runCount > plan.sweep.maxRunCount || plan.sweep.runCount > config.maxSweepJobs)) throw new ApiError(409, "SWEEP_LIMIT", "sweep exceeds the validated run limit");
      const ids = [...new Set(plan.steps.map((step) => step.process?.toolConfigurationId).filter((id): id is string => Boolean(id)))];
      for (const id of ids) {
        const state = repositories.tools.latestHealth(id);
        if (state?.status !== "healthy") throw new ApiError(409, "TOOL_UNHEALTHY", `planned tool ${id} has no successful current health probe`, { status: state?.status || "not_configured" });
      }
      const tools = ids.map((id) => snapshot(repositories.tools.get(id))); const versions = Object.fromEntries(tools.map((tool) => [tool.toolId, repositories.tools.latestHealth(tool.id)?.version || null]));
      const ready = repositories.jobs.setDraft(jobId, manifest, parameters, plan.capabilityVersion, tools, versions, { ...plan, warnings: [...plan.warnings, ...validation.warnings] });
      await storage.writeManifest(jobId, ready.inputManifest); await storage.freezeInputs(jobId); repositories.jobs.appendEvent(jobId, null, "success", "system", "Draft validation succeeded; inputs are immutable");
      return success(ready);
    } catch (error) {
      const structured = typeof error === "object" && error && "type" in error ? error : { type: "validation", code: "PREFLIGHT_FAILED", message: error instanceof Error ? error.message : String(error), stepId: null, retryable: true, details: null };
      repositories.jobs.returnToDraft(jobId, structured); throw error;
    }
  });
}

function runtimeBindings(repositories: Repositories, tools: Array<NonNullable<ReturnType<Repositories["tools"]["get"]>>>) {
  return Object.fromEntries(tools.map((tool) => { const latest = repositories.tools.latestHealth(tool.id); return [tool.toolId, { configuration: snapshot(tool), health: latest?.status || "not_configured", version: latest?.version || null, selfTestPassed: latest?.selfTestPassed ?? null, environment: tool.environment }]; }));
}
