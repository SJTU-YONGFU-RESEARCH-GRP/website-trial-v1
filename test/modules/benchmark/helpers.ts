import type {
  InputFileV1,
  JobPlanV1,
  JobRecordV1,
  StepExecutionContextV1,
  ToolConfigurationSnapshotV1,
} from "../../../shared/contracts/v1.ts";

export function toolConfiguration(
  toolId: string,
  options: { executable?: string; interpreter?: string; entryPoint?: string } = {},
): ToolConfigurationSnapshotV1 {
  return {
    id: `config-${toolId}`,
    toolId,
    moduleId: "benchmark",
    revision: 1,
    enabled: true,
    rootPath: null,
    executablePath: options.executable ?? null,
    interpreterPath: options.interpreter ?? null,
    entryPoint: options.entryPoint ?? null,
    workingDirectory: null,
    timeoutSeconds: 300,
    maxConcurrency: 1,
    environmentNames: [],
    versionProbeArgv: ["--help"],
    adapterId: `benchmark-${toolId}`,
    adapterVersion: "1.0.0",
    capturedAt: "2026-08-14T00:00:00.000Z",
  };
}

export function inputFile(relativePath: string, role: string, sizeBytes = 128): InputFileV1 {
  return {
    relativePath,
    sizeBytes,
    sha256: "a".repeat(64),
    mediaType: role === "measured-csv" ? "text/csv" : "text/plain",
    recognizedType: role,
    role,
    required: true,
    usedByStepIds: [],
    unresolvedIncludes: [],
    validationErrors: [],
  };
}

export function jobRecord(overrides: Partial<JobRecordV1> = {}): JobRecordV1 {
  const emptyPlan: JobPlanV1 = {
    schemaVersion: "eda.job-plan.v1",
    capabilityVersion: "benchmark.capability.v1",
    steps: [],
    sweep: null,
    warnings: [],
  };
  return {
    id: "job-1",
    ownerId: "user-1",
    moduleId: "benchmark",
    operation: "run-from-source",
    workflow: "benchmark",
    status: "ready",
    inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
    parameters: { mode: "run", operations: { benchmark: true }, translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["dc"] } },
    capabilityVersion: "benchmark.capability.v1",
    toolConfigurations: [],
    toolVersions: {},
    plan: emptyPlan,
    workspaceRelativePath: "jobs/job-1",
    currentStepId: null,
    sweepParentJobId: null,
    retryOfJobId: null,
    resultId: null,
    progress: 0,
    exitCode: null,
    error: null,
    createdAt: "2026-08-14T00:00:00.000Z",
    queuedAt: null,
    startedAt: null,
    finishedAt: null,
    updatedAt: "2026-08-14T00:00:00.000Z",
    ...overrides,
  };
}

export function executionContext(workspacePath: string, job: JobRecordV1): StepExecutionContextV1 {
  return {
    moduleId: "benchmark",
    storageRoot: workspacePath,
    now: () => "2026-08-14T00:00:00.000Z",
    job,
    step: {
      id: "step-1",
      jobId: job.id,
      ordinal: 0,
      stepKey: "parse-result",
      name: "Parse result",
      status: "running",
      progress: 0,
      processId: null,
      processGroupId: null,
      exitCode: null,
      startedAt: null,
      finishedAt: null,
      error: null,
    },
    workspacePath,
    abortSignal: new AbortController().signal,
    emit: async () => undefined,
  };
}
