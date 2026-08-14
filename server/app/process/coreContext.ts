import { randomUUID } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import type { ArtifactRecordV1, StepExecutionContextV1, TechnologyLibraryV1, ToolConfigurationSnapshotV1, ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../db/repositories.ts";
import { normalizeRelativePath, StorageService } from "../storage/storage.ts";
import { SafeProcessRunner, type ProcessRunResult } from "./safeProcess.ts";

export interface CoreStepExecutionContextV1 extends StepExecutionContextV1 {
  toolConfigurations: ToolConfigurationSnapshotV1[];
  runtimeToolConfigurations: ToolConfigurationV1[];
  technology: TechnologyLibraryV1 | null;
  runPlannedProcess(): Promise<ProcessRunResult>;
}

export function attachCoreExecution(
  context: StepExecutionContextV1 & { toolConfigurations: ToolConfigurationSnapshotV1[]; technology: TechnologyLibraryV1 | null },
  repositories: Repositories, storage: StorageService, runner: SafeProcessRunner,
): CoreStepExecutionContextV1 {
  const runtimeToolConfigurations = context.toolConfigurations.map((snapshot) => {
    const configuration = repositories.tools.get(snapshot.id);
    if (!configuration || configuration.revision !== snapshot.revision) throw new Error(`frozen tool configuration is unavailable: ${snapshot.id}@${snapshot.revision}`);
    return configuration;
  });
  return Object.assign(context, {
    runtimeToolConfigurations,
    runPlannedProcess: async (): Promise<ProcessRunResult> => {
      const plannedStep = context.job.plan.steps.find((candidate) => candidate.id === context.step.stepKey);
      if (!plannedStep?.process) throw new Error(`step ${context.step.stepKey} has no planned process`);
      const snapshot = context.job.toolConfigurations.find((candidate) => candidate.id === plannedStep.process!.toolConfigurationId);
      const tool = runtimeToolConfigurations.find((candidate) => candidate.id === snapshot?.id) || null;
      if (!snapshot || !tool || tool.revision !== snapshot.revision) throw new Error("frozen tool configuration is unavailable");
      for (const input of context.job.inputManifest.files.filter((file) => file.recognizedType === "evidence-script-never-executed")) {
        if (plannedStep.process.argv.some((argument) => argument === input.relativePath || argument.endsWith(`/input/${input.relativePath}`))) throw new Error(`uploaded script is evidence-only and cannot be executed: ${input.relativePath}`);
      }
      const cwdRelative = plannedStep.process.cwdRelative === "." ? "." : normalizeRelativePath(plannedStep.process.cwdRelative); const cwd = cwdRelative === "." ? context.workspacePath : path.resolve(context.workspacePath, ...cwdRelative.split("/"));
      if (!inside(context.workspacePath, cwd)) throw new Error("planned cwd escapes workspace"); await fsp.mkdir(cwd, { recursive: true, mode: 0o750 });
      const stdoutRelative = `${context.job.workspaceRelativePath}/logs/${context.step.stepKey}.stdout.log`;
      const stderrRelative = `${context.job.workspaceRelativePath}/logs/${context.step.stepKey}.stderr.log`;
      const stdoutPath = await storage.safeDestination(stdoutRelative); const stderrPath = await storage.safeDestination(stderrRelative);
      const result = await runner.run(context.job.id, { tool, argv: plannedStep.process.argv, cwd, allowedCwdRoot: context.workspacePath, abortSignal: context.abortSignal,
        timeoutSeconds: plannedStep.process.timeoutSeconds, stdoutPath, stderrPath,
        onSpawn: (pid, pgid) => repositories.jobs.updateStep(context.step.id, "running", 0, pid, pgid),
        onOutput: async (stream, message) => context.emit({ jobId: context.job.id, stepId: context.step.id, at: context.now(), level: "info", stream, message, payload: null }),
      });
      if (result.timedOut) throw { type: "timeout", code: "TOOL_TIMEOUT", message: `step exceeded ${plannedStep.process.timeoutSeconds} seconds`, stepId: context.step.id, retryable: true, details: null };
      if (result.outputLimitExceeded) throw { type: "storage", code: "LOG_LIMIT", message: "process output exceeded the configured limit", stepId: context.step.id, retryable: false, details: null };
      for (const [stream, relativePath] of [["stdout", stdoutRelative], ["stderr", stderrRelative]] as const) {
        const digest = await storage.digest(relativePath); const artifact: ArtifactRecordV1 = { id: randomUUID(), jobId: context.job.id, resultId: null, ownerId: context.job.ownerId, moduleId: context.job.moduleId,
          stepId: context.step.id, role: `${context.step.stepKey}.${stream}`, relativePath, mediaType: "text/plain; charset=utf-8", sizeBytes: digest.sizeBytes, sha256: digest.sha256, visibility: "private", createdAt: context.now() };
        repositories.artifacts.insert(artifact);
      }
      return result;
    },
  });
}

function inside(root: string, candidate: string): boolean { const relative = path.relative(root, candidate); return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)); }
