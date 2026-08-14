import { mkdir, rename, writeFile } from "node:fs/promises";
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
import { validateFrozenBenchmarkInputs, workspacePath } from "./security.ts";
import type { BenchmarkModuleOptions } from "./types.ts";
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
      toolBindings?: Record<string, { configuration: { id: string; toolId: string }; health: "healthy" | "degraded" | "unavailable" | "not_configured" }>;
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
    return {
      ...this.#options,
      configurations: configurations?.length ? configurations : this.#options.configurations,
      health,
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
    if (!planned.process) {
      if (planned.id === "validate-input" || planned.id === "validate-import") await validateFrozenBenchmarkInputs(context.workspacePath, context.job.inputManifest.files);
      return { exitCode: 0, outputs: { internalStep: planned.id } };
    }

    const coreContext = context as StepExecutionContextV1 & { runPlannedProcess?: () => Promise<{ exitCode: number; signal: NodeJS.Signals | null; timedOut: boolean; outputLimitExceeded: boolean }> };
    if (!coreContext.runPlannedProcess) throw new Error("Benchmark execution requires the shared safe process runtime");
    const startedAt = Date.now();
    const result = await coreContext.runPlannedProcess();
    return { exitCode: result.exitCode, outputs: { signal: result.signal, timedOut: result.timedOut, outputLimitExceeded: result.outputLimitExceeded, wallTimeMs: Date.now() - startedAt } };
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
