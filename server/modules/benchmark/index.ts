import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CollectedArtifactV1,
  DraftValidationContextV1,
  JsonObject,
  ModuleAdapterV1,
  ModuleContextV1,
  ParsedModuleResultV1,
  StepExecutionContextV1,
  ToolCapabilityV1,
} from "../../../shared/contracts/v1.ts";
import { createBenchmarkCapabilities } from "./capabilities.ts";
import { parseBenchmarkResult, walkArtifacts } from "./parsers.ts";
import { buildBenchmarkPlan } from "./planner.ts";
import { spawnWithoutShell } from "./process.ts";
import { assertSafeRelativePath, workspacePath } from "./security.ts";
import type { BenchmarkModuleOptions, BenchmarkToolId } from "./types.ts";
import { validateBenchmarkDraft } from "./validation.ts";

function jsonSafe(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export class BenchmarkModuleAdapter implements ModuleAdapterV1 {
  readonly moduleId = "benchmark" as const;
  readonly #options: BenchmarkModuleOptions;

  constructor(options: BenchmarkModuleOptions = {}) {
    this.#options = options;
  }

  #runtimeOptions(context: object): BenchmarkModuleOptions {
    const runtime = context as {
      toolConfigurations?: Array<{ id: string; toolId: string; moduleId: "benchmark"; enabled: boolean; executablePath: string | null; interpreterPath: string | null; entryPoint: string | null; environment?: Record<string, string> }>;
      toolHealth?: Record<string, { status: "healthy" | "degraded" | "unavailable" | "not_configured"; version: string | null; message?: string; selfTestPassed?: boolean | null } | null>;
      toolBindings?: Record<string, { configuration: { id: string; toolId: string }; health: "healthy" | "degraded" | "unavailable" | "not_configured"; environment?: Record<string, string> }>;
    };
    const configurations = (runtime.toolConfigurations ?? Object.values(runtime.toolBindings ?? {}).map((binding) => binding.configuration)) as BenchmarkModuleOptions["configurations"];
    const health = { ...(this.#options.health ?? {}) };
    for (const configuration of configurations ?? []) {
      const check = runtime.toolHealth?.[configuration.id];
      const binding = runtime.toolBindings?.[configuration.toolId];
      if (check || binding) {
        health[configuration.toolId as keyof typeof health] = {
          status: check?.status ?? binding?.health ?? "not_configured",
          version: check?.version ?? null,
          reason: check?.message ?? null,
          adapterSelfTestPassed: check?.selfTestPassed === true,
        };
      }
    }
    const environment = { ...(this.#options.environment ?? {}) };
    for (const [toolId, binding] of Object.entries(runtime.toolBindings ?? {})) {
      if (binding.environment) environment[toolId as BenchmarkToolId] = binding.environment;
    }
    return {
      ...this.#options,
      configurations: configurations?.length ? configurations : this.#options.configurations,
      health,
      environment,
    };
  }

  async capabilities(context: ModuleContextV1): Promise<ToolCapabilityV1[]> {
    return createBenchmarkCapabilities(this.#runtimeOptions(context));
  }

  async validateDraft(context: DraftValidationContextV1) {
    return validateBenchmarkDraft(context, this.#runtimeOptions(context));
  }

  async buildPlan(context: DraftValidationContextV1) {
    const validation = await this.validateDraft(context);
    if (!validation.valid) {
      throw new Error(validation.errors.map((error) => `${error.code}: ${error.message}`).join("\n"));
    }
    return buildBenchmarkPlan(context);
  }

  async executeStep(context: StepExecutionContextV1): Promise<{ exitCode: number; outputs: JsonObject }> {
    const planned = context.job.plan.steps.find((entry) => entry.id === context.step.stepKey);
    if (!planned) throw new Error(`Unknown Benchmark step ${context.step.stepKey}`);
    if (!planned.process) return { exitCode: 0, outputs: { internalStep: planned.id } };

    const coreContext = context as StepExecutionContextV1 & { runPlannedProcess?: () => Promise<{ exitCode: number; signal: NodeJS.Signals | null; timedOut: boolean; outputLimitExceeded: boolean }> };
    if (coreContext.runPlannedProcess) {
      const startedAt = Date.now();
      const result = await coreContext.runPlannedProcess();
      return { exitCode: result.exitCode, outputs: { signal: result.signal, timedOut: result.timedOut, outputLimitExceeded: result.outputLimitExceeded, wallTimeMs: Date.now() - startedAt } };
    }

    const configuration = context.job.toolConfigurations.find((entry) => entry.id === planned.process?.toolConfigurationId);
    if (!configuration || !configuration.enabled) throw new Error(`Tool configuration snapshot is unavailable for ${planned.id}`);
    const expectedExecutable = configuration.interpreterPath ?? configuration.executablePath;
    if (!expectedExecutable || planned.process.executableDisplay !== expectedExecutable || !path.isAbsolute(expectedExecutable)) {
      throw new Error(`Executable mismatch for ${planned.id}`);
    }
    if (planned.process.argv.some((argument) => argument.includes("\0"))) throw new Error("A planned argument contains a NUL byte");

    const cwdRelative = assertSafeRelativePath(planned.process.cwdRelative, "planned cwd");
    const cwd = workspacePath(context.workspacePath, cwdRelative);
    const home = workspacePath(context.workspacePath, "work/home");
    const temporary = workspacePath(context.workspacePath, "work/tmp");
    await Promise.all([
      mkdir(cwd, { recursive: true }),
      mkdir(workspacePath(context.workspacePath, "output"), { recursive: true }),
      mkdir(workspacePath(context.workspacePath, "logs"), { recursive: true }),
      mkdir(home, { recursive: true }),
      mkdir(temporary, { recursive: true }),
    ]);

    const toolId = configuration.toolId as BenchmarkToolId;
    const runtimeOptions = this.#runtimeOptions(context);
    const configuredEnvironment = runtimeOptions.environment?.[toolId] ?? {};
    const environment: NodeJS.ProcessEnv = {
      PATH: context.job.toolConfigurations
        .flatMap((entry) => entry.executablePath ? [path.dirname(entry.executablePath)] : [])
        .concat(["/usr/local/bin", "/usr/bin", "/bin"])
        .filter((entry, index, values) => values.indexOf(entry) === index)
        .join(path.delimiter),
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      HOME: home,
      TMPDIR: temporary,
    };
    for (const name of configuration.environmentNames) {
      const value = configuredEnvironment[name];
      if (value !== undefined) environment[name] = value;
    }

    const spawner = runtimeOptions.spawnProcess ?? spawnWithoutShell;
    const expectedModule = ({ reduction: "bmr.cli", expansion: "model_expansion", "spice-benchmark": "spice_model_benchmark.cli" } as Partial<Record<BenchmarkToolId, string>>)[toolId];
    const standaloneArgv = configuration.interpreterPath
      ? configuration.entryPoint === expectedModule
        ? ["-m", expectedModule, ...planned.process.argv]
        : configuration.entryPoint
          ? [configuration.entryPoint, ...planned.process.argv]
          : expectedModule
            ? ["-m", expectedModule, ...planned.process.argv]
            : planned.process.argv
      : planned.process.argv;
    const startedAt = Date.now();
    const result = await spawner({
      executable: expectedExecutable,
      argv: standaloneArgv,
      cwd,
      env: environment,
      timeoutSeconds: planned.process.timeoutSeconds,
      abortSignal: context.abortSignal,
      onStdout: async (message) => context.emit({ jobId: context.job.id, stepId: context.step.id, at: context.now(), level: "info", stream: "stdout", message, payload: null }),
      onStderr: async (message) => context.emit({ jobId: context.job.id, stepId: context.step.id, at: context.now(), level: "warning", stream: "stderr", message, payload: null }),
    });
    if (result.timedOut) throw new Error(`${planned.name} timed out after ${planned.process.timeoutSeconds} seconds`);
    if (context.abortSignal.aborted) throw new Error(`${planned.name} was cancelled`);
    if (result.exitCode !== 0) throw new Error(`${planned.name} exited with code ${result.exitCode}`);
    return { exitCode: 0, outputs: { stdoutBytes: result.stdoutBytes, stderrBytes: result.stderrBytes, wallTimeMs: Date.now() - startedAt } };
  }

  async parseResult(context: StepExecutionContextV1): Promise<ParsedModuleResultV1> {
    return parseBenchmarkResult(context);
  }

  async publishResult(context: StepExecutionContextV1, result: ParsedModuleResultV1): Promise<void> {
    if (!result.title.trim() || !jsonSafe(result.summary) || !jsonSafe(result.data) || !result.parserId || !result.parserVersion) {
      throw new Error("Benchmark result failed normalized publish validation");
    }
    const artifactDirectory = workspacePath(context.workspacePath, "artifacts");
    await mkdir(artifactDirectory, { recursive: true });
    const temporary = workspacePath(context.workspacePath, `artifacts/.normalized-result-${context.job.id}.tmp`);
    const finalPath = workspacePath(context.workspacePath, "artifacts/normalized-result.json");
    await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporary, finalPath);
  }

  async collectArtifacts(context: StepExecutionContextV1): Promise<CollectedArtifactV1[]> {
    const result = [
      ...await walkArtifacts(workspacePath(context.workspacePath, "output"), "output"),
      ...await walkArtifacts(workspacePath(context.workspacePath, "artifacts"), "artifacts"),
    ];
    return result.map((artifact) => ({
      role: artifact.role,
      relativePath: artifact.relativePath,
      mediaType: artifact.mediaType,
      required: artifact.required,
      publish: artifact.publish,
    }));
  }
}

export function createBenchmarkModule(options: BenchmarkModuleOptions = {}): ModuleAdapterV1 {
  return new BenchmarkModuleAdapter(options);
}

export { benchmarkAdapter } from "./adapters/benchmark.ts";
export { expansionAdapter } from "./adapters/expansion.ts";
export { fittingAdapter } from "./adapters/fitting.ts";
export { reductionAdapter } from "./adapters/reduction.ts";
export { translatorAdapter } from "./adapters/translator.ts";
export { createBenchmarkCapabilities } from "./capabilities.ts";
export { parseBenchmarkResult } from "./parsers.ts";
export { buildBenchmarkPlan } from "./planner.ts";
export { validateBenchmarkDraft } from "./validation.ts";
