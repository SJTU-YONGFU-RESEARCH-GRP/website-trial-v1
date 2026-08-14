import path from "node:path";
import type {
  DraftValidationContextV1,
  JobPlanV1,
  PlannedStepV1,
  ToolConfigurationSnapshotV1,
} from "../../../shared/contracts/v1.ts";
import { benchmarkAdapter, expansionAdapter, fittingAdapter, reductionAdapter, translatorAdapter } from "./adapters/index.ts";
import { objectAt } from "./adapters/helpers.ts";
import { sanitizeOutputName } from "./security.ts";
import type { BenchmarkToolAdapter, BenchmarkToolId, CommandSpec } from "./types.ts";
import { BENCHMARK_CAPABILITY_VERSION, plannedProcess } from "./types.ts";
import { benchmarkParameters, operationEnabled, roleMap } from "./validation.ts";

const ADAPTERS: Record<BenchmarkToolId, BenchmarkToolAdapter> = {
  translator: translatorAdapter,
  fitting: fittingAdapter,
  reduction: reductionAdapter,
  expansion: expansionAdapter,
  "spice-benchmark": benchmarkAdapter,
};

function configuration(context: DraftValidationContextV1, toolId: BenchmarkToolId): ToolConfigurationSnapshotV1 {
  const result = context.job.toolConfigurations.find((entry) => entry.toolId === toolId && entry.enabled);
  if (!result) throw new Error(`${toolId} is not configured for this job`);
  return result;
}

function processStep(
  id: string,
  name: string,
  description: string,
  config: ToolConfigurationSnapshotV1,
  command: CommandSpec,
  inputRoles: string[],
  outputRoles: string[],
  weight = 1,
): PlannedStepV1 {
  return { id, name, description, required: true, weight, process: plannedProcess(config, command), inputRoles, outputRoles };
}

function internalStep(id: string, name: string, description: string, inputRoles: string[], outputRoles: string[]): PlannedStepV1 {
  return { id, name, description, required: true, weight: 0.25, process: null, inputRoles, outputRoles };
}

export async function buildBenchmarkPlan(context: DraftValidationContextV1): Promise<JobPlanV1> {
  const parameters = benchmarkParameters(context.job.parameters);
  if (parameters.mode === "import" || context.job.operation === "import-completed-result") {
    return {
      schemaVersion: "eda.job-plan.v1",
      capabilityVersion: BENCHMARK_CAPABILITY_VERSION,
      steps: [
        internalStep("validate-import", "Validate completed result", "Validate report/manifest consistency without executing uploaded content.", ["completed-result"], []),
        internalStep("parse-result", "Parse completed result", "Normalize native Benchmark report and manifest data.", ["completed-result"], ["normalized-result"]),
        internalStep("publish-result", "Publish result", "Atomically publish only after parser validation succeeds.", ["normalized-result"], ["published-result"]),
      ],
      sweep: null,
      warnings: [],
    };
  }

  const roles = roleMap(context.files);
  const dependencies = new Map(context.job.toolConfigurations.map((entry) => [entry.toolId, entry]));
  const primaryModels = roles.get("primary-model") ?? [];
  const baseModel = (roles.get("base-model") ?? [])[0];
  let currentModel = primaryModels[0] ? `input/${primaryModels[0]}` : baseModel ? `input/${baseModel}` : "";
  const steps: PlannedStepV1[] = [
    internalStep("validate-input", "Validate input", "Validate paths, includes, SPICE directives, CSV datasets and parameters.", [...roles.keys()], []),
  ];

  if (operationEnabled(parameters, "translator")) {
    const config = configuration(context, "translator");
    const outputName = sanitizeOutputName(objectAt(parameters, "translator").outputName, "translated.lib");
    const commands = ADAPTERS.translator.buildCommands({ parameters, inputByRole: roles, configuration: config, stepId: "translator", inputModel: currentModel, outputDirectory: "output/translator", dependencies });
    steps.push(processStep("translator", "Translate model", "Translate the uploaded model with the audited CLI.", config, commands[0], ["primary-model"], ["translated-model", "translation-manifest"]));
    currentModel = `output/translator/${outputName}`;
  }

  if (operationEnabled(parameters, "fitting")) {
    const config = configuration(context, "fitting");
    const outputName = sanitizeOutputName(objectAt(parameters, "fitting").outputName, "fitted.lib");
    const commands = ADAPTERS.fitting.buildCommands({ parameters, inputByRole: roles, configuration: config, stepId: "fitting", inputModel: currentModel, outputDirectory: "output/fitting", dependencies });
    steps.push(processStep("fitting", "Fit DC IV model", "Fit the model against measured DC IV CSV datasets.", config, commands[0], ["measured-csv", ...(currentModel ? ["model"] : [])], ["fitted-model", "fit-plot", "fit-log"], 3));
    currentModel = `output/fitting/${outputName}`;
  }

  if (operationEnabled(parameters, "reduction")) {
    const config = configuration(context, "reduction");
    const commands = ADAPTERS.reduction.buildCommands({ parameters, inputByRole: roles, configuration: config, stepId: "reduction", inputModel: currentModel, outputDirectory: "output/reduction", dependencies });
    steps.push(processStep("reduction", "Reduce model", "Run the complete reduction workflow.", config, commands[0], ["model"], ["reduced-model", "reduction-results", "reduction-manifest"], 3));
    currentModel = "output/reduction/reduced_model.lib";
  }

  let benchmarkModels: string[] = currentModel ? [currentModel] : primaryModels.map((model) => `input/${model}`);
  if (operationEnabled(parameters, "expansion")) {
    const config = configuration(context, "expansion");
    const commands = ADAPTERS.expansion.buildCommands({ parameters, inputByRole: roles, configuration: config, stepId: "expansion", inputModel: currentModel, outputDirectory: "output/expansion", dependencies });
    commands.forEach((command, index) => {
      const subcommand = command.argv.find((value) => ["generate-corners", "iv", "cv", "monte-carlo"].includes(value)) ?? String(index + 1);
      const id = subcommand === "generate-corners" ? "expansion.corners" : `expansion.${subcommand}`;
      const name = subcommand === "generate-corners" ? "Generate T/S/F corners" : `${subcommand === "monte-carlo" ? "Monte Carlo" : subcommand.toUpperCase()} characterization`;
      steps.push(processStep(id, name, "Run one real Expansion Python subcommand.", config, command, ["model", "sigma-json"], ["expansion-output"], index === 0 ? 1 : 2));
    });
    benchmarkModels = ["output/expansion/models/model_t.sp", "output/expansion/models/model_s.sp", "output/expansion/models/model_f.sp"];
  } else if (!steps.some((step) => ["translator", "fitting", "reduction"].includes(step.id))) {
    benchmarkModels = primaryModels.map((model) => `input/${model}`);
  }

  if (operationEnabled(parameters, "spice-benchmark")) {
    const config = configuration(context, "spice-benchmark");
    benchmarkModels.forEach((model, index) => {
      const id = `benchmark.${index + 1}`;
      const output = `output/benchmark-${index + 1}`;
      const command = ADAPTERS["spice-benchmark"].buildCommands({ parameters, inputByRole: roles, configuration: config, stepId: id, inputModel: model, outputDirectory: output, dependencies })[0];
      steps.push(processStep(id, `Benchmark ${path.posix.basename(model)}`, "Run the fixed MOS benchmark with healthy simulator adapters.", config, command, ["model"], ["benchmark-report", "native-data", "plots"], 4));
    });
  }

  steps.push(
    internalStep("parse-result", "Parse result", "Parse native output and reject incomplete required artifacts.", ["tool-output"], ["normalized-result"]),
    internalStep("publish-result", "Publish result", "Atomically publish the validated result and declared artifacts.", ["normalized-result"], ["published-result"]),
  );
  return {
    schemaVersion: "eda.job-plan.v1",
    capabilityVersion: BENCHMARK_CAPABILITY_VERSION,
    steps,
    sweep: null,
    warnings: [],
  };
}
