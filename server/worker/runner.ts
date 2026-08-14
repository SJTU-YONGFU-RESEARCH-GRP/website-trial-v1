import { createHash, randomUUID } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import type {
  ArtifactRecordV1, CollectedArtifactV1, JobRecordV1, JsonObject,
  ModuleId, ResultRecordV1, StepExecutionContextV1, StructuredJobErrorV1,
} from "../../shared/contracts/v1.ts";
import type { Repositories } from "../app/db/repositories.ts";
import { ModuleRegistry } from "../app/modules/registry.ts";
import { normalizeRelativePath, StorageService } from "../app/storage/storage.ts";
import { attachCoreExecution } from "../app/process/coreContext.ts";
import { SafeProcessRunner } from "../app/process/safeProcess.ts";

function errorRecord(error: unknown, stepId: string | null): StructuredJobErrorV1 {
  if (typeof error === "object" && error && "type" in error && "code" in error) return error as StructuredJobErrorV1;
  return { type: "internal", code: "WORKER_ERROR", message: error instanceof Error ? error.message : String(error), stepId, retryable: false, details: null };
}

export class JobRunner {
  private readonly controllers = new Map<string, AbortController>();
  constructor(private readonly repositories: Repositories, private readonly registry: ModuleRegistry, private readonly storage: StorageService, private readonly processes: SafeProcessRunner) {}

  cancel(jobId: string): boolean {
    const controller = this.controllers.get(jobId); if (!controller) return false;
    controller.abort(); return true;
  }

  async run(job: JobRecordV1): Promise<void> {
    const controller = new AbortController(); this.controllers.set(job.id, controller);
    const cancelPoll = setInterval(() => { if (this.repositories.jobs.isCancelRequested(job.id)) controller.abort(); }, 250);
    let currentStepId: string | null = null;
    try {
      const adapter = this.registry.require(job.moduleId);
      await this.repositories.jobs.appendEvent(job.id, null, "info", "system", "Worker claimed job");
      const workspacePath = await this.storage.resolveExisting(job.workspaceRelativePath);
      const technologyId = typeof job.parameters.technologyLibraryId === "string" ? job.parameters.technologyLibraryId : null;
      const technology = technologyId ? this.repositories.technologies.list().find((item) => item.id === technologyId) || null : null;
      const runtimeTools = job.toolConfigurations.map((snapshot) => this.repositories.tools.get(snapshot.id)).filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));
      const toolBindings = Object.fromEntries(runtimeTools.map((tool) => [tool.toolId, { configuration: job.toolConfigurations.find((snapshot) => snapshot.id === tool.id)!, health: this.repositories.tools.latestHealth(tool.id)?.status || "not_configured", environment: tool.environment }]));
      const stepRows = this.repositories.jobs.steps(job.id);
      if (!stepRows.length) throw { type: "configuration", code: "EMPTY_PLAN", message: "validated plan has no steps", stepId: null, retryable: false, details: null } satisfies StructuredJobErrorV1;
      let lastContext: StepExecutionContextV1 | null = null;
      for (const step of stepRows) {
        currentStepId = step.id;
        if (controller.signal.aborted) throw { type: "cancelled", code: "JOB_CANCELLED", message: "job cancelled", stepId: step.id, retryable: true, details: null } satisfies StructuredJobErrorV1;
        this.repositories.jobs.updateStep(step.id, "running", 0);
        const baseContext = {
          moduleId: job.moduleId, storageRoot: this.storage.root, now: () => new Date().toISOString(), job, step, workspacePath, abortSignal: controller.signal,
          emit: async (event) => { this.repositories.jobs.appendEvent(job.id, event.stepId, event.level, event.stream, event.message, event.payload); },
          toolConfigurations: job.toolConfigurations, technology, toolBindings, technologies: technology ? [technology] : [],
        } as StepExecutionContextV1 & { toolConfigurations: typeof job.toolConfigurations; technology: typeof technology; toolBindings: typeof toolBindings; technologies: typeof technology[] };
        const context = attachCoreExecution(baseContext, this.repositories, this.storage, this.processes);
        lastContext = context;
        await context.emit({ jobId: job.id, stepId: step.id, at: context.now(), level: "info", stream: "progress", message: `Starting ${step.name}`, payload: { progress: 0 } });
        const result = await adapter.executeStep(context);
        if (controller.signal.aborted) throw { type: "cancelled", code: "JOB_CANCELLED", message: "job cancelled", stepId: step.id, retryable: true, details: null } satisfies StructuredJobErrorV1;
        if (result.exitCode !== 0) throw { type: "tool_exit", code: "TOOL_EXIT_NONZERO", message: `${step.name} exited with code ${result.exitCode}`, stepId: step.id, retryable: false, details: result.outputs } satisfies StructuredJobErrorV1;
        this.repositories.jobs.updateStep(step.id, "succeeded", 1, null, null, result.exitCode);
        await context.emit({ jobId: job.id, stepId: step.id, at: context.now(), level: "success", stream: "progress", message: `Completed ${step.name}`, payload: { progress: 1 } });
      }
      if (!lastContext) throw new Error("missing final step context");
      if (controller.signal.aborted) throw { type: "cancelled", code: "JOB_CANCELLED", message: "job cancelled before result publication", stepId: currentStepId, retryable: true, details: null } satisfies StructuredJobErrorV1;
      const parsed = await adapter.parseResult(lastContext);
      await adapter.publishResult(lastContext, parsed);
      const declarations = await adapter.collectArtifacts(lastContext);
      await this.publish(job, parsed, declarations, workspacePath);
    } catch (error) {
      const structured = errorRecord(error, currentStepId);
      if (currentStepId) {
        const step = this.repositories.jobs.steps(job.id).find((row) => String(row.id) === currentStepId);
        if (step && step.status === "running") this.repositories.jobs.updateStep(currentStepId, structured.type === "cancelled" ? "cancelled" : "failed", 0, null, null, null, structured);
      }
      const current = this.repositories.jobs.get(job.id);
      if (current?.status === "running") this.repositories.jobs.transition(job.id, structured.type === "cancelled" ? "cancelled" : "failed", { error: structured });
      this.repositories.jobs.appendEvent(job.id, currentStepId, "error", "system", structured.message, { code: structured.code });
    } finally { clearInterval(cancelPoll); this.controllers.delete(job.id); }
  }

  private async publish(job: JobRecordV1, parsed: { title: string; summary: JsonObject; data: JsonObject; artifactRoles: string[]; parserId: string; parserVersion: string }, declarations: CollectedArtifactV1[], workspacePath: string): Promise<void> {
    if (declarations.length > 4096) throw { type: "storage", code: "ARTIFACT_COUNT_LIMIT", message: "result declares more than 4096 artifacts", stepId: job.currentStepId, retryable: false, details: null };
    const resultId = randomUUID(); const staging = await this.storage.beginPublication(job.moduleId, resultId); const artifacts: ArtifactRecordV1[] = [];
    try {
      for (const declaration of declarations) {
        const relative = normalizeRelativePath(declaration.relativePath); const source = path.resolve(workspacePath, ...relative.split("/"));
        if (!within(workspacePath, source)) throw new Error("artifact path escapes workspace");
        let stat;
        try { stat = await fsp.lstat(source); } catch (error) { if (!declaration.required) continue; throw error; }
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`artifact is not a regular file: ${relative}`);
        const destination = path.join(staging, ...relative.split("/")); await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o750 }); await fsp.copyFile(source, destination);
        const content = await fsp.readFile(destination); const artifactId = randomUUID();
        artifacts.push({ id: artifactId, jobId: job.id, resultId, ownerId: job.ownerId, moduleId: job.moduleId, stepId: job.currentStepId, role: declaration.role,
          relativePath: `results/${job.moduleId}/${resultId}/${relative}`, mediaType: declaration.mediaType, sizeBytes: content.length,
          sha256: createHash("sha256").update(content).digest("hex"), visibility: "private", createdAt: new Date().toISOString() });
      }
      await fsp.writeFile(path.join(staging, "manifest.json"), `${JSON.stringify({ resultId, jobId: job.id, moduleId: job.moduleId, artifacts }, null, 2)}\n`, { flag: "wx", mode: 0o640 });
      const owner = this.repositories.users.get(job.ownerId); const newBytes = artifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0);
      if (!owner || this.repositories.jobs.ownerInputBytes(job.ownerId) + this.repositories.artifacts.ownerBytes(job.ownerId) + newBytes > owner.storageQuotaBytes) throw { type: "storage", code: "STORAGE_QUOTA", message: "result artifacts exceed the user's storage quota", stepId: job.currentStepId, retryable: false, details: null };
      await this.storage.commitPublication(staging, job.moduleId, resultId);
      const at = new Date().toISOString();
      const origin = /(?:^|[-_.])(import|completed)(?:$|[-_.])/i.test(job.operation) || /import completed result/i.test(job.workflow) ? "imported" : "computed";
      const record: ResultRecordV1 = { schemaVersion: "eda.result.v1", id: resultId, moduleId: job.moduleId, ownerId: job.ownerId, lifecycle: "private", title: parsed.title,
        summary: parsed.summary, data: parsed.data, provenance: { origin, jobId: job.id, ownerId: job.ownerId,
          inputManifestSha256: createHash("sha256").update(JSON.stringify(job.inputManifest)).digest("hex"), parameters: job.parameters, capabilityVersion: job.capabilityVersion,
          toolConfigurations: job.toolConfigurations, toolVersions: job.toolVersions, parserId: parsed.parserId, parserVersion: parsed.parserVersion, createdAt: at },
        artifactIds: artifacts.map((artifact) => artifact.id), createdAt: at, updatedAt: at, publishedAt: null };
      try {
        this.repositories.jobs.transaction(() => { this.repositories.results.insert(record); for (const artifact of artifacts) this.repositories.artifacts.insert(artifact); this.repositories.jobs.transition(job.id, "succeeded", { resultId }); });
      } catch (error) { await this.storage.removePublication(job.moduleId, resultId); throw error; }
      this.repositories.jobs.appendEvent(job.id, null, "success", "artifact", "Result published atomically", { resultId });
    } catch (error) { await fsp.rm(staging, { recursive: true, force: true }); throw error; }
  }
}

function within(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export class ModuleQueueWorker {
  private timer: NodeJS.Timeout | null = null; private stopped = true; private active = 0;
  constructor(readonly moduleId: ModuleId, private readonly concurrency: number, private readonly jobs: Repositories["jobs"], private readonly runner: JobRunner) {}
  start(): void { if (!this.stopped) return; this.stopped = false; this.timer = setInterval(() => void this.tick(), 250); void this.tick(); }
  async stop(): Promise<void> { this.stopped = true; if (this.timer) clearInterval(this.timer); while (this.active) await new Promise((resolvePromise) => setTimeout(resolvePromise, 20)); }
  private async tick(): Promise<void> {
    while (!this.stopped && this.active < this.concurrency) {
      const job = this.jobs.claim(this.moduleId); if (!job) return;
      this.active += 1; void this.runner.run(job).finally(() => { this.active -= 1; void this.tick(); });
    }
  }
}
