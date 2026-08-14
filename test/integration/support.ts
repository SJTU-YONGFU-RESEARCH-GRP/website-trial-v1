import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type {
  CollectedArtifactV1,
  DraftValidationContextV1,
  JobPlanV1,
  JobRecordV1,
  ModuleAdapterV1,
  ModuleContextV1,
  ModuleId,
  ParsedModuleResultV1,
  StepExecutionContextV1,
  ToolCapabilityV1,
  ToolConfigurationSnapshotV1,
} from "../../shared/contracts/v1.ts";
import { TOOL_CATALOG_BY_ID } from "../../shared/toolCatalog.ts";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig, type ServerConfig } from "../../server/app/config.ts";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import type { CoreStepExecutionContextV1 } from "../../server/app/process/coreContext.ts";

export const FAKE_TOOL = path.resolve("test/fixtures/fake-tools/fake-eda-tool.mjs");
export const TEST_PASSWORD = "integration-only-correct-horse-battery-staple";

export interface SessionHeaders {
  cookie: string;
  csrf: string;
  userId: string;
}

export interface TestEnvironment {
  app: FastifyInstance;
  root: string;
  config: ServerConfig;
  close(): Promise<void>;
}

export class ExecutableFixtureAdapter implements ModuleAdapterV1 {
  readonly moduleId: ModuleId;
  readonly toolId: string;

  constructor(moduleId: ModuleId) {
    this.moduleId = moduleId;
    this.toolId = `fixture-${moduleId}`;
  }

  async capabilities(context: ModuleContextV1): Promise<ToolCapabilityV1[]> {
    const extended = context as ModuleContextV1 & {
      toolConfigurations?: ToolConfigurationSnapshotV1[];
      toolHealth?: Record<string, { status?: ToolCapabilityV1["health"] } | null>;
    };
    const configuration = extended.toolConfigurations?.find((item) => item.toolId === this.toolId);
    const health = configuration ? extended.toolHealth?.[configuration.id]?.status ?? "not_configured" : "not_configured";
    return [{
      schemaVersion: "eda.capability.v1",
      capabilityVersion: `fixture.${this.moduleId}.v1`,
      toolId: this.toolId,
      moduleId: this.moduleId,
      label: `${this.moduleId} integration executable`,
      description: "Test-only real child process adapter.",
      health,
      healthReason: health === "healthy" ? null : "configure and probe the test executable",
      toolVersion: null,
      operations: ["run", "import"],
      inputRoles: [{ id: "source", label: "Source", description: "Fixture source", required: true, multiple: true, extensions: [".txt", ".v"], recognizedTypes: ["text", "verilog"] }],
      parameters: [{ id: "sweepValues", label: "Sweep", description: "Fixture sweep cardinality", type: "number-list", unit: null, required: false, defaultValue: [], minimum: null, maximum: null, enumValues: [], sweepable: true, toolVersionRange: null, mapping: { kind: "argv", key: "--sweep" } }],
      plannedStepTemplates: [],
      limits: { maxSweepJobs: 256 },
    }];
  }

  async validateDraft(context: DraftValidationContextV1) {
    const configuration = context.job.toolConfigurations.find((item) => item.toolId === this.toolId);
    const errors = [];
    if (!configuration?.executablePath) {
      errors.push({ type: "configuration", code: "FIXTURE_TOOL_MISSING", message: `${this.toolId} is not configured`, stepId: null, retryable: false, details: null } as const);
    }
    if (!context.files.length) {
      errors.push({ type: "validation", code: "FIXTURE_INPUT_MISSING", message: "at least one source is required", stepId: null, retryable: false, details: null } as const);
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  async buildPlan(context: DraftValidationContextV1): Promise<JobPlanV1> {
    const configuration = context.job.toolConfigurations.find((item) => item.toolId === this.toolId);
    if (!configuration) throw new Error(`${this.toolId} is not configured`);
    const sweepValues = Array.isArray(context.job.parameters.sweepValues) ? context.job.parameters.sweepValues : [];
    return {
      schemaVersion: "eda.job-plan.v1",
      capabilityVersion: `fixture.${this.moduleId}.v1`,
      steps: [{
        id: "execute",
        name: `Execute ${this.moduleId}`,
        description: "Spawn the configured executable with an immutable argv array.",
        required: true,
        weight: 1,
        process: {
          toolConfigurationId: configuration.id,
          executableDisplay: configuration.executablePath || this.toolId,
          argv: ["--output", "output/fake-result.json", "--module", this.moduleId],
          cwdRelative: ".",
          environmentNames: configuration.environmentNames,
          timeoutSeconds: configuration.timeoutSeconds,
        },
        inputRoles: ["source"],
        outputRoles: ["normalized-result"],
      }],
      sweep: sweepValues.length ? { dimensions: { sweepValues }, runCount: sweepValues.length, maxRunCount: 256 } : null,
      warnings: [],
    };
  }

  async executeStep(context: StepExecutionContextV1) {
    const result = await (context as CoreStepExecutionContextV1).runPlannedProcess();
    return { exitCode: result.exitCode, outputs: { timedOut: result.timedOut, outputLimitExceeded: result.outputLimitExceeded } };
  }

  async parseResult(context: StepExecutionContextV1): Promise<ParsedModuleResultV1> {
    const file = path.join(context.workspacePath, "output", "fake-result.json");
    const value = JSON.parse(await fs.readFile(file, "utf8")) as { schemaVersion?: string; status?: string; tool?: string };
    if (value.schemaVersion !== "fake.eda.v1" || value.status !== "succeeded") throw new Error("fixture parser rejected incomplete output");
    return {
      title: `${this.moduleId} executable result`,
      summary: { status: value.status, tool: value.tool ?? this.toolId },
      data: { status: value.status, moduleId: this.moduleId },
      artifactRoles: ["normalized-result"],
      parserId: "integration-fixture-parser",
      parserVersion: "1.0.0",
    };
  }

  async publishResult(): Promise<void> {}

  async collectArtifacts(): Promise<CollectedArtifactV1[]> {
    return [{ role: "normalized-result", relativePath: "output/fake-result.json", mediaType: "application/json", required: true, publish: true }];
  }
}

export async function makeEnvironment(options: {
  root?: string;
  startWorkers?: boolean;
  upload?: { maxFiles?: number; maxFileBytes?: number; maxTotalBytes?: number };
  modules?: ModuleId[];
  databasePath?: string;
  registry?: ModuleRegistry;
} = {}): Promise<TestEnvironment> {
  const root = options.root ?? await fs.mkdtemp(path.join(os.tmpdir(), "eda-integration-"));
  const config = loadConfig({
    NODE_ENV: "test",
    EDA_STORAGE_ROOT: root,
    EDA_DATABASE_PATH: options.databasePath ?? path.join(root, "eda.sqlite"),
    EDA_SESSION_COOKIE: "eda_test_session",
    EDA_COOKIE_SECURE: "false",
    EDA_CANCEL_GRACE_MS: "100",
    EDA_BENCHMARK_CONCURRENCY: "1",
    EDA_DIGITAL_CONCURRENCY: "1",
    EDA_PPA_CONCURRENCY: "1",
    EDA_MAX_UPLOAD_FILES: String(options.upload?.maxFiles ?? 16),
    EDA_MAX_UPLOAD_FILE_BYTES: String(options.upload?.maxFileBytes ?? 1024 * 1024),
    EDA_MAX_UPLOAD_TOTAL_BYTES: String(options.upload?.maxTotalBytes ?? 2 * 1024 * 1024),
  });
  const registry = options.registry ?? new ModuleRegistry();
  if (!options.registry) for (const moduleId of options.modules ?? ["benchmark", "digital", "ppa"]) registry.register(new ExecutableFixtureAdapter(moduleId));
  const app = await createEdaApp({ config, registry, startWorkers: options.startWorkers ?? true, serveFrontend: false, logger: false });
  return {
    app,
    root,
    config,
    close: async () => {
      await app.close();
      await makeWritable(root);
      if (!options.root) await fs.rm(root, { recursive: true, force: true });
    },
  };
}

async function makeWritable(root: string): Promise<void> {
  let entries: Array<import("node:fs").Dirent>;
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return; }
  await fs.chmod(root, 0o750).catch(() => undefined);
  for (const entry of entries) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) await makeWritable(candidate);
    else await fs.chmod(candidate, 0o640).catch(() => undefined);
  }
}

export async function login(app: FastifyInstance, username: string, password = TEST_PASSWORD): Promise<SessionHeaders> {
  const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password } });
  if (response.statusCode !== 200) throw new Error(`login failed: ${response.statusCode} ${response.body}`);
  const body = response.json().data;
  const header = response.headers["set-cookie"];
  const cookie = (Array.isArray(header) ? header[0] : header)?.split(";")[0];
  if (!cookie) throw new Error("login response did not set a session cookie");
  return { cookie, csrf: body.csrfToken, userId: body.user.id };
}

export async function configureFixtureTool(app: FastifyInstance, admin: SessionHeaders, moduleId: ModuleId, mode = "success", timeoutSeconds = 5) {
  return configureTestTool(app, admin, { toolId: `fixture-${moduleId}`, moduleId, fakeKind: moduleId, mode, timeoutSeconds, adapterId: `fixture-${moduleId}-adapter` });
}

export async function configureTestTool(app: FastifyInstance, admin: SessionHeaders, input: { toolId: string; moduleId: ModuleId; fakeKind?: string; mode?: string; timeoutSeconds?: number; adapterId: string }) {
  const catalog = TOOL_CATALOG_BY_ID[input.toolId];
  const response = await app.inject({
    method: "POST",
    url: "/api/admin/tools",
    headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
    payload: {
      toolId: input.toolId,
      moduleId: input.moduleId,
      enabled: true,
      rootPath: path.dirname(FAKE_TOOL),
      executablePath: FAKE_TOOL,
      interpreterPath: null,
      entryPoint: null,
      workingDirectory: null,
      timeoutSeconds: input.timeoutSeconds ?? 5,
      maxConcurrency: 1,
      environmentNames: ["FAKE_EDA_TOOL", "FAKE_EDA_MODE"],
      environment: { FAKE_EDA_TOOL: input.fakeKind ?? input.toolId, FAKE_EDA_MODE: input.mode ?? "success" },
      versionProbeArgv: catalog ? [...catalog.versionProbeArgv] : ["--version"],
      adapterId: catalog?.adapterId ?? input.adapterId,
      adapterVersion: catalog?.adapterVersion ?? "1.0.0",
    },
  });
  if (response.statusCode !== 201) throw new Error(`tool create failed: ${response.statusCode} ${response.body}`);
  const tool = response.json().data;
  const probe = await app.inject({ method: "POST", url: `/api/admin/tools/${tool.id}/probe`, headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf } });
  if (probe.statusCode !== 200 || probe.json().data.status !== "healthy") throw new Error(`tool probe failed: ${probe.statusCode} ${probe.body}`);
  if (catalog) {
    const selfTest = await app.inject({ method: "POST", url: `/api/admin/tools/${tool.id}/self-test`, headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf } });
    if (selfTest.statusCode !== 200 || selfTest.json().data.selfTestPassed !== true) throw new Error(`tool self-test failed: ${selfTest.statusCode} ${selfTest.body}`);
  }
  return tool;
}

export function multipart(files: Array<{ relativePath: string; contents: string | Buffer; mediaType?: string }>, fields: Record<string, string> = {}): { boundary: string; payload: Buffer } {
  const boundary = `eda-boundary-${Math.random().toString(16).slice(2)}`;
  const chunks: Buffer[] = [];
  const add = (value: string | Buffer) => chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
  for (const [name, value] of Object.entries(fields)) {
    add(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  for (const file of files) {
    const encoded = Buffer.from(file.relativePath).toString("base64url");
    const filename = path.posix.basename(file.relativePath).replaceAll('"', "");
    add(`--${boundary}\r\nContent-Disposition: form-data; name="file:${encoded}"; filename="${filename}"\r\nContent-Type: ${file.mediaType ?? "text/plain"}\r\n\r\n`);
    add(file.contents);
    add("\r\n");
  }
  add(`--${boundary}--\r\n`);
  return { boundary, payload: Buffer.concat(chunks) };
}

export async function createReadyDraft(app: FastifyInstance, session: SessionHeaders, moduleId: ModuleId, parameters: Record<string, unknown> = {}): Promise<JobRecordV1> {
  const body = multipart([{ relativePath: "source/input.txt", contents: `${moduleId} source\n` }], { operation: "run", workflow: "integration" });
  const upload = await app.inject({ method: "POST", url: `/api/modules/${moduleId}/drafts`, headers: { cookie: session.cookie, "x-csrf-token": session.csrf, "content-type": `multipart/form-data; boundary=${body.boundary}` }, payload: body.payload });
  if (upload.statusCode !== 201) throw new Error(`draft upload failed: ${upload.statusCode} ${upload.body}`);
  const draft = upload.json().data.job as JobRecordV1;
  const preflight = await app.inject({ method: "PATCH", url: `/api/jobs/${draft.id}/draft`, headers: { cookie: session.cookie, "x-csrf-token": session.csrf }, payload: { fileRoles: { "source/input.txt": "source" }, parameters } });
  if (preflight.statusCode !== 200) throw new Error(`preflight failed: ${preflight.statusCode} ${preflight.body}`);
  return preflight.json().data as JobRecordV1;
}

export async function startJob(app: FastifyInstance, session: SessionHeaders, jobId: string): Promise<JobRecordV1> {
  const response = await app.inject({ method: "POST", url: `/api/jobs/${jobId}/start`, headers: { cookie: session.cookie, "x-csrf-token": session.csrf } });
  if (response.statusCode !== 200) throw new Error(`start failed: ${response.statusCode} ${response.body}`);
  return response.json().data as JobRecordV1;
}

export async function waitForJob(app: FastifyInstance, session: SessionHeaders, jobId: string, statuses: JobRecordV1["status"][] = ["succeeded", "failed", "cancelled", "interrupted"], timeoutMs = 8_000): Promise<JobRecordV1> {
  const deadline = Date.now() + timeoutMs;
  do {
    const response = await app.inject({ method: "GET", url: `/api/jobs/${jobId}`, headers: { cookie: session.cookie } });
    if (response.statusCode !== 200) throw new Error(`job read failed: ${response.statusCode} ${response.body}`);
    const job = response.json().data.job as JobRecordV1;
    if (statuses.includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 30));
  } while (Date.now() < deadline);
  throw new Error(`timed out waiting for job ${jobId}`);
}
