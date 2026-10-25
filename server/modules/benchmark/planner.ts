import path from "node:path";
import type { DraftValidationContextV1, JobPlanV1, PlannedStepV1, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import { benchmarkAdapter, expansionAdapter, fittingAdapter, reductionAdapter, translatorAdapter } from "./adapters/index.ts";
import { buildNormalizationCommand, translatorOutputName } from "./adapters/translator.ts";
import { enumValue, objectAt, relativeFrom, stringList } from "./adapters/helpers.ts";
import { inspectInputModel, type SpiceDialect } from "./modelInput.ts";
import { resolveInvocation, sanitizeOutputName } from "./security.ts";
import type { BenchmarkToolAdapter, BenchmarkToolId, CommandSpec } from "./types.ts";
import { BENCHMARK_CAPABILITY_VERSION, plannedProcess } from "./types.ts";
import { benchmarkParameters, operationEnabled, roleMap } from "./validation.ts";

const ADAPTERS: Record<BenchmarkToolId, BenchmarkToolAdapter> = {
  translator: translatorAdapter, fitting: fittingAdapter, reduction: reductionAdapter,
  expansion: expansionAdapter, "spice-benchmark": benchmarkAdapter,
};

interface ModelBranch { path: string; dialect: SpiceDialect; includes: boolean; section?: string; }

function configuration(context: DraftValidationContextV1, toolId: BenchmarkToolId): ToolConfigurationSnapshotV1 {
  const result = context.job.toolConfigurations.find((entry) => entry.toolId === toolId && entry.enabled);
  if (!result) throw new Error(`${toolId} is not configured for this job`);
  return result;
}

function processStep(id: string, name: string, description: string, config: ToolConfigurationSnapshotV1, command: CommandSpec, inputRoles: string[], outputRoles: string[], weight = 1): PlannedStepV1 {
  return { id, name, description, required: true, weight, process: plannedProcess(config, command), inputRoles, outputRoles };
}

function internalStep(id: string, name: string, description: string, inputRoles: string[], outputRoles: string[]): PlannedStepV1 {
  return { id, name, description, required: true, weight: 0.25, process: null, inputRoles, outputRoles };
}

export async function buildBenchmarkPlan(context: DraftValidationContextV1): Promise<JobPlanV1> {
  const parameters = benchmarkParameters(context.job.parameters);
  const sourceSection = typeof parameters.sourceSection === "string" ? parameters.sourceSection : "";
  if (parameters.mode === "import" || context.job.operation === "import-completed-result") {
    return {
      schemaVersion: "eda.job-plan.v1", capabilityVersion: BENCHMARK_CAPABILITY_VERSION,
      steps: [
        internalStep("validate-import", "Validate completed result", "Validate report/manifest consistency without executing uploaded content.", ["completed-result"], []),
        internalStep("parse-result", "Parse completed result", "Normalize native Benchmark report and manifest data.", ["completed-result"], ["normalized-result"]),
        internalStep("publish-result", "Publish result", "Atomically publish only after parser validation succeeds.", ["normalized-result"], ["published-result"]),
      ], sweep: null, warnings: [],
    };
  }

  const roles = roleMap(context.files);
  const dependencies = new Map(context.job.toolConfigurations.map((entry) => [entry.toolId, entry]));
  const primaryModels = roles.get("primary-model") ?? [];
  const baseModel = (roles.get("base-model") ?? [])[0];
  const processingOrder = parameters.operationOrder.filter((toolId) => operationEnabled(parameters, toolId));
  const sourceModels = primaryModels.length ? primaryModels : baseModel ? [baseModel] : [];
  const exportedBenchmarkModels: ModelBranch[] = [];
  const warnings: string[] = [];
  const steps = [internalStep("validate-input", "Validate input", "Validate frozen input integrity, paths, includes and measured datasets.", [...roles.keys()], [])];
  let currentModels: ModelBranch[] = [];
  for (const source of sourceModels) {
    const inspection = await inspectInputModel(context, source);
    currentModels.push({ path: `input/${source}`, dialect: inspection.dialect, includes: inspection.includeReferences.length > 0, ...(sourceSection ? { section: sourceSection } : {}) });
  }

  const inspect = (model: ModelBranch, consumerId: string, requireCmos = false, requireBenchmarkModels = false): void => {
    const config = configuration(context, "translator");
    const id = `inspect-model.${consumerId}`;
    const cwd = `work/${id}`;
    const argv = ["inspect", relativeFrom(cwd, model.path), "--dialect", model.dialect, "--root", relativeFrom(cwd, "."), "--follow-includes", "--require-mos"];
    if (requireCmos) argv.push("--require-cmos");
    if (requireBenchmarkModels) argv.push("--require-benchmark-models");
    const command = resolveInvocation("translator", config, argv, cwd, []);
    steps.push(processStep(id, "Inspect model", `Inspect the actual MOS cards before ${consumerId}; source ${model.path}.`, config, command, ["model"], [], 0.1));
  };

  const canonical = (model: ModelBranch, consumerId: string, target: "ngspice" | "hspice" | "spectre-spice" = "ngspice", force = false): ModelBranch => {
    if (!force && model.dialect === target && !model.includes && !model.section) return model;
    const config = configuration(context, "translator");
    const id = `normalize-${consumerId}`;
    const outputDirectory = `output/canonical-${consumerId}`;
    const command = buildNormalizationCommand({ parameters, inputByRole: roles, configuration: config, stepId: id, inputModel: model.path, outputDirectory, dependencies }, target, model.section, consumerId.startsWith("benchmark."), model.dialect);
    steps.push(processStep(id, "Normalize model input", `Flatten includes and convert ${model.dialect} to ${target} syntax before ${consumerId}; retain the original stage output.`, config, command, ["model", "model-include"], ["canonical-model", "translation-manifest"]));
    warnings.push(`${model.path} is normalized to ${target} syntax for ${consumerId}; the selected stage output is retained.`);
    return { path: `${outputDirectory}/normalized.lib`, dialect: target, includes: false };
  };

  for (const toolId of processingOrder) {
    const config = configuration(context, toolId);
    const inputs: Array<ModelBranch | null> = currentModels.length ? currentModels : [null];
    const nextModels: ModelBranch[] = [];
    for (const [branchIndex, branch] of inputs.entries()) {
      const branched = inputs.length > 1;
      const stepId = branched ? `${toolId}.${branchIndex + 1}` : toolId;
      const outputDirectory = branched ? `output/${toolId}-${branchIndex + 1}` : `output/${toolId}`;
      const branchLabel = branched ? ` ${branchIndex + 1}` : "";
      if (!branch && toolId !== "fitting") throw new Error(`${toolId} requires a model from the upload or an earlier fitting stage`);
      let inputBranch = branch;
      if (inputBranch && (toolId !== "translator" || inputBranch.section)) inputBranch = canonical(inputBranch, stepId);
      if (inputBranch) inspect(inputBranch, stepId);
      const inputModel = inputBranch?.path ?? "";
      const stageParameters = toolId === "translator" && inputBranch
        ? { ...parameters, translator: { ...parameters.translator, sourceDialect: inputBranch.dialect, followIncludes: inputBranch.includes || parameters.translator.followIncludes === true } }
        : parameters;
      const adapterContext = { parameters: stageParameters, inputByRole: roles, configuration: config, stepId, inputModel, outputDirectory, dependencies };

      if (toolId === "translator") {
        const outputName = translatorOutputName(objectAt(parameters, "translator"));
        const command = ADAPTERS.translator.buildCommands(adapterContext)[0];
        steps.push(processStep(stepId, `Translate model${branchLabel}`, "Translate the current model with its actual source dialect.", config, command, ["model"], ["translated-model", "translation-manifest"]));
        nextModels.push({ path: `${outputDirectory}/${outputName}`, dialect: enumValue(parameters.translator, "targetDialect", ["ngspice", "hspice", "spectre"] as const, "ngspice"), includes: false });
      } else if (toolId === "fitting") {
        const outputName = sanitizeOutputName(parameters.fitting.outputName, "fitted.lib");
        const command = ADAPTERS.fitting.buildCommands(adapterContext)[0];
        steps.push(processStep(stepId, `Fit DC IV model${branchLabel}`, "Fit the selected real MOS model against measured DC IV, preserving companion cards.", config, command, ["measured-csv", ...(inputModel ? ["model"] : [])], ["fitted-model", "fit-plot", "fit-log"], 3));
        nextModels.push({ path: `${outputDirectory}/${outputName}`, dialect: "ngspice", includes: false });
      } else if (toolId === "reduction") {
        const command = ADAPTERS.reduction.buildCommands(adapterContext)[0];
        steps.push(processStep(stepId, `Reduce model${branchLabel}`, "Reduce the selected real MOS model without assuming NMOS polarity.", config, command, ["model"], ["reduced-model", "reduction-results", "reduction-manifest"], 3));
        nextModels.push({ path: `${outputDirectory}/reduced_model.lib`, dialect: "ngspice", includes: false });
      } else {
        const commands = ADAPTERS.expansion.buildCommands(adapterContext);
        commands.forEach((command, index) => {
          const subcommand = command.argv.find((value) => ["generate-corners", "iv", "cv", "monte-carlo"].includes(value)) ?? String(index + 1);
          const id = subcommand === "generate-corners" ? `${stepId}.corners` : `${stepId}.${subcommand}`;
          const name = subcommand === "generate-corners" ? `Generate T/S/F corners${branchLabel}` : `${subcommand === "monte-carlo" ? "Monte Carlo" : subcommand.toUpperCase()} characterization${branchLabel}`;
          steps.push(processStep(id, name, "Run one real Expansion Python subcommand.", config, command, ["model", "sigma-json"], ["expansion-output"], index === 0 ? 1 : 2));
        });
        for (const corner of ["t", "s", "f"]) nextModels.push({ path: `${outputDirectory}/models/model_${corner}.sp`, dialect: "ngspice", includes: false });
      }
    }
    if (objectAt(parameters, toolId).exportToBenchmark !== false) exportedBenchmarkModels.push(...nextModels);
    currentModels = nextModels;
  }

  const benchmarkModels = processingOrder.length ? exportedBenchmarkModels : currentModels;
  if (operationEnabled(parameters, "spice-benchmark")) {
    const config = configuration(context, "spice-benchmark");
    const requireCmos = Array.isArray(parameters.benchmark.modes) && parameters.benchmark.modes.includes("transient");
    const simulators = stringList(parameters.benchmark, "simulators", ["ngspice", "spectre", "hspice"]);
    let benchmarkIndex = 0;
    for (const model of benchmarkModels) for (const simulator of simulators) {
      benchmarkIndex += 1;
      const id = `benchmark.${benchmarkIndex}`;
      const output = `output/benchmark-${benchmarkIndex}`;
      // Spectre's unchanged fixture imports SPICE .model cards; native Spectre blocks are not accepted.
      const target = simulator === "hspice" ? "hspice" : simulator === "spectre" ? "spectre-spice" : "ngspice";
      const input = canonical(model, id, target, true);
      inspect(input, id, requireCmos, true);
      const simulatorParameters = { ...parameters, benchmark: { ...parameters.benchmark, simulators: [simulator] } };
      const command = ADAPTERS["spice-benchmark"].buildCommands({ parameters: simulatorParameters, inputByRole: roles, configuration: config, stepId: id, inputModel: input.path, outputDirectory: output, dependencies })[0];
      steps.push(processStep(id, `Benchmark ${path.posix.basename(model.path)} (${simulator})`, `Run the fixed MOS benchmark with ${simulator} on stage model ${model.path}; compatible ${target} SPICE input ${input.path}.`, config, command, ["model"], ["benchmark-report", "native-data", "plots"], 4));
    }
  }

  steps.push(
    internalStep("parse-result", "Parse result", "Parse native output and reject incomplete required artifacts.", ["tool-output"], ["normalized-result"]),
    internalStep("publish-result", "Publish result", "Atomically publish the validated result and declared artifacts.", ["normalized-result"], ["published-result"]),
  );
  return { schemaVersion: "eda.job-plan.v1", capabilityVersion: BENCHMARK_CAPABILITY_VERSION, steps, sweep: null, warnings };
}
