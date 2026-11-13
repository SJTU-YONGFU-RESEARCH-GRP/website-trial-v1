/* ==================================================================
 *  Fitting Adapter (goal.md §20.4)
 * ================================================================== */

import type { ToolAdapter } from "./toolAdapter";
import type { ToolInvocation, ToolExecutionResult } from "./contracts";

export interface FittingDatasetSpec {
  spec: string; // e.g. "measured_idvg.csv:vgs:0:3.3:0.01:vds=0.05:vbs=0:temp=27"
}

export type FittingOptimizer =
  | "nelder_mead"
  | "normalized_nelder_mead"
  | "lbfgs_fd"
  | "differential_evolution"
  | "trust_region_ls";

export interface FittingParams {
  modelName: string;
  deviceType: "nmos" | "pmos";
  simType: "dc";
  datasets: FittingDatasetSpec[];
  optimizer: FittingOptimizer;
  maxIterations: number;
  targetRelativeLoss: number;
  outputFilename: string;
  plot: boolean;
  trainParameters: string[];
  fixedParameters: string[];
  lowerBounds: Record<string, number>;
  upperBounds: Record<string, number>;
  stepTolerance?: number;
  jobs?: number;
}

export const FITTING_ADAPTER_VERSION = "1.0.0";

export const fittingAdapter: ToolAdapter<FittingParams> = {
  toolId: "fitting",
  adapterVersion: FITTING_ADAPTER_VERSION,

  validate(inputModels, params) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (inputModels.length === 0) {
      errors.push("At least one input model is required.");
    }
    if (params.simType !== "dc") {
      errors.push("Only DC simulation is currently supported.");
    }
    if (params.datasets.length === 0) {
      errors.push("At least one dataset is required for calibration.");
    }
    if (params.maxIterations <= 0) {
      errors.push("maxIterations must be > 0.");
    }
    if (params.targetRelativeLoss <= 0) {
      errors.push("targetRelativeLoss must be > 0.");
    }
    if (!params.modelName.trim()) {
      errors.push("modelName is required.");
    }

    // Train/fix conflict: train takes precedence per tool behavior
    const trainSet = new Set(params.trainParameters);
    for (const p of params.fixedParameters) {
      if (trainSet.has(p)) {
        warnings.push(
          `Parameter "${p}" is in both train and fix; train takes precedence.`,
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  buildInvocation(context, inputModels, params) {
    const inputPath = `<workspace>/input/${inputModels[0]?.filename ?? "input.lib"}`;
    const outputPath = `<workspace>/${context.outputDirectoryKey}/${params.outputFilename || "calibrated.lib"}`;

    const argv: string[] = [
      "python",
      "calibrate_bsim.py",
      "--model-path",
      inputPath,
      "--model-name",
      params.modelName,
      "--device-type",
      params.deviceType,
      "--sim-type",
      "dc",
      ...params.datasets.flatMap((d) => ["--dataset", d.spec]),
      "--optimizer",
      params.optimizer,
      "--max-iters",
      String(params.maxIterations),
      "--target-rel-loss",
      String(params.targetRelativeLoss),
      "--output-model",
      outputPath,
    ];

    if (params.plot) argv.push("--plot");
    for (const p of params.trainParameters) argv.push("--train", p);
    for (const p of params.fixedParameters) argv.push("--fix", p);
    for (const [k, v] of Object.entries(params.lowerBounds)) {
      argv.push("--limitmin", `${k}=${v}`);
    }
    for (const [k, v] of Object.entries(params.upperBounds)) {
      argv.push("--limitmax", `${k}=${v}`);
    }
    if (params.stepTolerance !== undefined) {
      argv.push("--step-tolerance", String(params.stepTolerance));
    }
    if (params.jobs !== undefined) {
      argv.push("--jobs", String(params.jobs));
    }

    const invocation: ToolInvocation<FittingParams> = {
      invocationId: context.invocationId,
      toolId: "fitting",
      adapterVersion: context.adapterVersion,
      inputModelIds: inputModels.map((m) => m.modelId),
      outputModelIds: [],
      params,
      argv,
      workingDirectoryKey: context.workingDirectoryKey,
      outputDirectoryKey: context.outputDirectoryKey,
      environment: {},
      temporary: false,
    };

    return invocation;
  },

  normalizeFixture(raw, context): ToolExecutionResult {
    const data = (raw ?? {}) as Record<string, unknown>;
    return {
      executionId: context.executionId,
      toolId: "fitting",
      status: "completed",
      inputModelIds: (data.inputModelIds as string[]) ?? [],
      outputModelIds: (data.outputModelIds as string[]) ?? [],
      metrics: (data.metrics as Record<string, unknown>) ?? {},
      artifactIds: (data.artifactIds as string[]) ?? [],
      warnings: (data.warnings as string[]) ?? [],
      errors: [],
      invocationId: context.executionId,
      provenance: context.provenance,
    };
  },
};
