import type {
  InputRoleDefinitionV1,
  ParameterDefinitionV1,
  PlannedStepV1,
  ToolCapabilityV1,
  ToolConfigurationSnapshotV1,
  ToolHealthStatus,
} from "../../../shared/contracts/v1.ts";
import type { BenchmarkModuleOptions, BenchmarkToolId, SimulatorId } from "./types.ts";
import { BENCHMARK_CAPABILITY_VERSION } from "./types.ts";

const SUPPORTED_SIMULATORS = ["ngspice", "spectre", "hspice"] as const;

const spiceModelRole: InputRoleDefinitionV1 = {
  id: "primary-model",
  label: "SPICE model",
  description: "A model or library with its include tree preserved by relative path.",
  required: true,
  multiple: true,
  extensions: [".lib", ".model", ".sp", ".cir", ".scs"],
  recognizedTypes: ["spice-model", "spice-library", "spectre-model"],
};

const baseModelRole: InputRoleDefinitionV1 = {
  ...spiceModelRole,
  id: "base-model",
  label: "Optional base model",
  description: "Optional initial model; fitting can use its audited built-in BSIM4.5 template when omitted.",
  required: false,
  multiple: false,
};

const modelIncludeRole: InputRoleDefinitionV1 = {
  ...spiceModelRole,
  id: "model-include",
  label: "Included model dependency",
  description: "A model/library reached from the root model include closure; validated recursively but not launched as a second root.",
  required: false,
  multiple: true,
};

const measuredCsvRole: InputRoleDefinitionV1 = {
  id: "measured-csv",
  label: "Measured DC IV CSV",
  description: "CSV with a current column and at least one Vgs/Vds/Vbs sweep variable.",
  required: true,
  multiple: true,
  extensions: [".csv"],
  recognizedTypes: ["measured-dc-iv-csv"],
};

const sigmaRole: InputRoleDefinitionV1 = {
  id: "sigma-json",
  label: "Sigma JSON",
  description: "Optional parameter sigma map for corner and Monte Carlo expansion.",
  required: false,
  multiple: false,
  extensions: [".json"],
  recognizedTypes: ["sigma-map-json"],
};

const completedRole: InputRoleDefinitionV1 = {
  id: "completed-result",
  label: "Completed Benchmark result",
  description: "A completed REPORT.md, manifest JSON, native data, plots and logs; folder upload is recommended.",
  required: false,
  multiple: true,
  extensions: [".json", ".md", ".csv", ".txt", ".log", ".png", ".svg", ".lib", ".sp", ".scs"],
  recognizedTypes: ["benchmark-report", "benchmark-manifest", "benchmark-native-output", "artifact"],
};

function parameter(
  id: string,
  label: string,
  description: string,
  type: ParameterDefinitionV1["type"],
  defaultValue: ParameterDefinitionV1["defaultValue"],
  key: string,
  options: Partial<Omit<ParameterDefinitionV1, "id" | "label" | "description" | "type" | "defaultValue" | "mapping">> = {},
): ParameterDefinitionV1 {
  return {
    id, label, description, type, defaultValue,
    unit: null,
    required: false,
    minimum: null,
    maximum: null,
    enumValues: [],
    sweepable: false,
    toolVersionRange: null,
    mapping: { kind: "argv", key },
    ...options,
  };
}

function template(toolId: string, name: string, inputRoles: string[], outputRoles: string[]): PlannedStepV1 {
  return {
    id: toolId,
    name,
    description: `Run the configured ${name} adapter with an argv array.`,
    required: true,
    weight: 1,
    process: null,
    inputRoles,
    outputRoles,
  };
}

function configured(toolId: string, configurations: ToolConfigurationSnapshotV1[]): boolean {
  return configurations.some((configuration) =>
    configuration.toolId === toolId
    && configuration.moduleId === "benchmark"
    && configuration.enabled
    && Boolean(configuration.executablePath || configuration.interpreterPath));
}

function effectiveHealth(toolId: BenchmarkToolId, options: BenchmarkModuleOptions): { status: ToolHealthStatus; reason: string | null; version: string | null } {
  const configurations = options.configurations ?? [];
  if (!configured(toolId, configurations)) return { status: "not_configured", reason: "No enabled administrator tool configuration", version: null };
  const health = options.health?.[toolId];
  if (!health) return { status: "unavailable", reason: "The configured tool has not passed a health probe", version: null };
  const version = options.repositoryVersions?.[toolId] ?? health.version;
  if (health.status === "healthy" && health.adapterSelfTestPassed !== true) return { status: "degraded", reason: "Path/version probe passed, but the adapter minimal self-test has not passed", version };
  return { status: health.status, reason: health.reason, version };
}

function healthySimulators(options: BenchmarkModuleOptions): SimulatorId[] {
  return SUPPORTED_SIMULATORS.filter((simulator) => {
    const health = options.health?.[simulator];
    return configured(simulator, options.configurations ?? [])
      && health?.status === "healthy"
      && health.adapterSelfTestPassed === true;
  });
}

function exportToBenchmarkParameter(): ParameterDefinitionV1 {
  return {
    ...parameter(
    "exportToBenchmark",
    "Use output model as Benchmark input",
    "Add the model produced by this step to the final simulator comparison.",
    "boolean",
    true,
    "exportToBenchmark",
    ),
    mapping: { kind: "generated-config", key: "exportToBenchmark" },
  };
}

export function createBenchmarkCapabilities(options: BenchmarkModuleOptions): ToolCapabilityV1[] {
  const translatorHealth = effectiveHealth("translator", options);
  const fittingHealth = effectiveHealth("fitting", options);
  const reductionHealth = effectiveHealth("reduction", options);
  const expansionHealth = effectiveHealth("expansion", options);
  const benchmarkHealth = effectiveHealth("spice-benchmark", options);
  const simulators = healthySimulators(options);
  const common = {
    schemaVersion: "eda.capability.v1" as const,
    capabilityVersion: BENCHMARK_CAPABILITY_VERSION,
    moduleId: "benchmark" as const,
    limits: { maxFiles: 2048, maxInputBytes: 2_147_483_648 },
  };
  return [
    {
      ...common,
      toolId: "translator",
      label: "Translator",
      description: "Translate Spectre, HSPICE and ngspice model syntax.",
      health: translatorHealth.status,
      healthReason: translatorHealth.reason,
      toolVersion: translatorHealth.version,
      operations: ["translate"],
      inputRoles: [spiceModelRole, modelIncludeRole, completedRole],
      parameters: [
        parameter("sourceDialect", "Source dialect", "Dialect parsed by the real translator CLI.", "enum", "auto", "--source", { enumValues: ["auto", "spectre", "hspice", "ngspice"] }),
        parameter("targetDialect", "Target dialect", "Dialect emitted by the real translator CLI.", "enum", "ngspice", "--target", { required: true, enumValues: ["spectre", "hspice", "ngspice"] }),
        parameter("followIncludes", "Follow includes", "Resolve relative include files from the uploaded tree.", "boolean", false, "--follow-includes"),
        parameter("verify", "Verify", "Available only when the target is ngspice.", "boolean", false, "--verify"),
        parameter("plot", "Plot", "Generate verification plots for an ngspice target.", "boolean", false, "--plot"),
        parameter("maxPlots", "Maximum plots", "Upper bound for translator verification plots.", "integer", 20, "--max-plots", { minimum: 1, maximum: 200 }),
        parameter("outputName", "Output name", "Safe output filename under the job output directory.", "string", "translated.lib", "--output"),
        exportToBenchmarkParameter(),
      ],
      plannedStepTemplates: [template("translator", "Translator", ["primary-model"], ["translated-model", "translation-manifest"])],
    },
    {
      ...common,
      toolId: "fitting",
      label: "Fitting",
      description: "Measured-data fitting for DC IV only.",
      health: fittingHealth.status,
      healthReason: fittingHealth.reason,
      toolVersion: fittingHealth.version,
      operations: ["fit-dc-iv"],
      inputRoles: [measuredCsvRole, baseModelRole, modelIncludeRole, completedRole],
      parameters: [
        parameter("modelName", "Model name", "Optional card selection; auto selects a single MOS or the unique NMOS in a CMOS pair.", "string", "", "--model-name"),
        parameter("deviceType", "Device type", "Use the parsed model polarity, or validate an explicit polarity selection.", "enum", "auto", "--device-type", { enumValues: ["auto", "nmos", "pmos"] }),
        parameter("optimizer", "Optimizer", "Bounded optimizer with a measured-curve residual vector.", "enum", "least_squares_trust_region", "--optimizer", { enumValues: ["cma_es", "differential_evolution", "lbfgs_fd", "least_squares_trust_region", "nelder_mead", "nelder_mead_normalized"] }),
        parameter("lossFunction", "Loss function", "Robust signed-current and logarithmic residuals; legacy losses remain selectable.", "enum", "Loss.robust_iv_loss.robust_iv_percent", "--loss-func", { enumValues: ["Loss.robust_iv_loss.robust_iv_percent", "Loss.mape_loss.mape_percent", "Loss.log_mape_loss.log_mape_percent"] }),
        parameter("maxIterations", "Iterations", "Maximum optimizer iterations within the evaluation and time budgets.", "integer", 100, "--max-iters", { minimum: 1, maximum: 1_000_000 }),
        parameter("maxEvaluations", "Evaluation budget", "Total objective evaluations, including sensitivity and final validation.", "integer", 150, "--max-evaluations", { minimum: 1, maximum: 1_000_000 }),
        parameter("maxSeconds", "Time budget", "Maximum fitting runtime within the configured tool timeout.", "number", 120, "--max-seconds", { minimum: 1, maximum: 86400 }),
        parameter("stepTolerance", "Step tolerance", "Optimizer convergence tolerance.", "number", 1e-6, "--step-tol", { minimum: 0 }),
        parameter("targetRelativeLoss", "Target relative loss", "Stop target relative to initial loss.", "number", 0.1, "--target-rel-loss", { minimum: 0 }),
        parameter("train", "Train parameters", "Optional parameters to tune; auto selects a small identifiable DC subset from the source model.", "string-list", [], "--train"),
        parameter("fix", "Fixed parameters", "Comma-separated parameter groups to freeze.", "string-list", [], "--fix"),
        parameter("minimumBounds", "Minimum bounds", "Comma-separated PARAM=VALUE lower bounds.", "string-list", [], "--limitmin"),
        parameter("maximumBounds", "Maximum bounds", "Comma-separated PARAM=VALUE upper bounds.", "string-list", [], "--limitmax"),
        parameter("jobs", "Parallel jobs", "Objective-evaluation workers; zero lets the tool decide.", "integer", 1, "--jobs", { minimum: 0, maximum: 256 }),
        parameter("plot", "Plot", "Write initial and fitted curve comparison.", "boolean", true, "--plot"),
        parameter("outputName", "Output model", "Safe fitted model filename.", "string", "fitted.lib", "--output-model"),
        exportToBenchmarkParameter(),
      ],
      plannedStepTemplates: [template("fitting", "Fitting", ["measured-csv", "base-model"], ["fitted-model", "fit-plot", "fit-log"])],
    },
    {
      ...common,
      toolId: "reduction",
      label: "Reduction",
      description: "Parameter reduction through the real complete workflow.",
      health: reductionHealth.status,
      healthReason: reductionHealth.reason,
      toolVersion: reductionHealth.version,
      operations: ["reduce"],
      inputRoles: [spiceModelRole, modelIncludeRole, completedRole],
      parameters: [
        parameter("modelName", "Model name", "Optional card selection; multiple cards of the same polarity require a name.", "string", "", "--model-name"),
        parameter("errorTolerance", "Error tolerance", "Target normalized error tolerance.", "number", 0.05, "positional:error_tolerance", { minimum: 0 }),
        parameter("minimumParameters", "Minimum parameters", "Minimum retained parameter count.", "integer", 10, "positional:min_params", { minimum: 1 }),
        parameter("maximumIterations", "Maximum iterations", "Reduction optimizer iteration bound.", "integer", 100, "positional:max_iter", { minimum: 1 }),
        parameter("optimizationMethod", "Optimization method", "Implemented optimization backend.", "enum", "gradient_descent", "positional:opt_method", { enumValues: ["gradient_descent", "genetic", "bayesian"] }),
        parameter("reductionMethod", "Reduction method", "Audited reduction enum.", "enum", "sensitivity", "positional:red_method", { enumValues: ["sensitivity", "pruning", "pca", "lasso"] }),
        parameter("testType", "Test type", "Characterization domain used by reduction.", "enum", "dc_iv", "positional:test_type", { enumValues: ["dc_iv", "dc_transfer", "cv", "ac", "transient", "noise", "combined"] }),
        exportToBenchmarkParameter(),
      ],
      plannedStepTemplates: [template("reduction", "Reduction", ["primary-model"], ["reduced-model", "reduction-results", "reduction-manifest"])],
    },
    {
      ...common,
      toolId: "expansion",
      label: "Expansion",
      description: "Multi-step corner, IV, CV and Monte Carlo expansion.",
      health: expansionHealth.status,
      healthReason: expansionHealth.reason,
      toolVersion: expansionHealth.version,
      operations: ["generate-corners", "iv", "cv", "monte-carlo"],
      inputRoles: [spiceModelRole, modelIncludeRole, sigmaRole, completedRole],
      parameters: [
        parameter("modelName", "Model name", "Optional single model card selection.", "string", "", "--model-name"),
        parameter("nSigma", "Sigma multiplier", "T/S/F corner displacement.", "number", 3, "--n-sigma", { minimum: 0, maximum: 20 }),
        parameter("runIv", "IV", "Run IV after corner generation.", "boolean", true, "iv"),
        parameter("runCv", "CV", "Run CV after corner generation.", "boolean", false, "cv"),
        parameter("runMonteCarlo", "Monte Carlo", "Generate and characterize Monte Carlo samples.", "boolean", false, "monte-carlo"),
        parameter("samples", "Samples", "Monte Carlo sample count.", "integer", 100, "--samples", { minimum: 1, maximum: 100_000 }),
        parameter("distribution", "Distribution", "Distribution implemented by the real CLI.", "enum", "normal", "--distribution", { enumValues: ["normal", "uniform"] }),
        parameter("seed", "Seed", "Monte Carlo random seed.", "integer", 1, "--seed", { minimum: 0, maximum: 2_147_483_647 }),
        parameter("jobs", "Parallel jobs", "Corner and Monte Carlo workers.", "integer", 1, "--jobs", { minimum: 0, maximum: 256 }),
        parameter("plot", "Plot", "Generate characterization plots.", "boolean", true, "--plot"),
        exportToBenchmarkParameter(),
      ],
      plannedStepTemplates: [
        template("expansion.corners", "Generate corners", ["primary-model", "sigma-json"], ["corner-models"]),
        template("expansion.iv", "IV characterization", ["corner-models"], ["iv-data", "iv-plots"]),
        template("expansion.cv", "CV characterization", ["corner-models"], ["cv-data", "cv-plots"]),
        template("expansion.monte-carlo", "Monte Carlo", ["primary-model", "sigma-json"], ["monte-carlo-data", "monte-carlo-models"]),
      ],
    },
    {
      ...common,
      toolId: "spice-benchmark",
      label: "Benchmark",
      description: simulators.length ? "Fixed MOS benchmark using only healthy simulator adapters." : "No simulator has passed executable and native parser self-tests.",
      health: simulators.length ? benchmarkHealth.status : "unavailable",
      healthReason: simulators.length ? benchmarkHealth.reason : "No simulator adapter is currently healthy",
      toolVersion: benchmarkHealth.version,
      operations: ["benchmark"],
      inputRoles: [spiceModelRole, modelIncludeRole, completedRole],
      parameters: [
        parameter("simulators", "Simulators", "All supported simulators are listed; a selected simulator must have a healthy administrator configuration.", "string-list", simulators.length ? simulators : [], "--simulator", { required: true, enumValues: [...SUPPORTED_SIMULATORS] }),
        parameter("modes", "Analysis domains", "Domains implemented by the fixed benchmark circuit.", "string-list", ["dc", "transient", "ac", "noise"], "--modes", { required: true, enumValues: ["dc", "transient", "ac", "noise"] }),
        parameter("dpi", "Plot DPI", "Resolution of generated benchmark plots.", "integer", 300, "--dpi", { minimum: 72, maximum: 1200 }),
        parameter("logLevel", "Log level", "Benchmark logging verbosity.", "enum", "INFO", "--log-level", { enumValues: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] }),
      ],
      plannedStepTemplates: [template("spice-benchmark", "Benchmark", ["primary-model"], ["benchmark-report", "native-data", "plots"])],
    },
  ];
}
