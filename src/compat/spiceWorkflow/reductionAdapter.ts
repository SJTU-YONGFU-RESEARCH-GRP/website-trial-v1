/* ==================================================================
 *  Reduction Adapter (goal.md §20.5)
 * ================================================================== */

import type { ToolAdapter } from "./toolAdapter";
import type { ToolInvocation, ToolExecutionResult } from "./contracts";

export type OptimizationMethod =
  | "gradient_descent"
  | "genetic_algorithm"
  | "bayesian_optimization";

export type ReductionMethod =
  | "sensitivity"
  | "parameter_pruning"
  | "lasso";

export type ReductionTestType =
  | "dc_iv"
  | "dc_transfer"
  | "cv"
  | "ac"
  | "combined";

export interface ReductionParams {
  errorTolerance: number;
  minParameters: number;
  maxIterations: number;
  optimizationMethod: OptimizationMethod;
  reductionMethod: ReductionMethod;
  testType: ReductionTestType;
  deviceType: "nmos" | "pmos" | "unknown";
  usePrebuiltNetlist: boolean;
  initialKeepRatio?: number;
  sensitivityThreshold?: number;
  reductionStages?: number;
  workerCount?: number;
  outputDirectoryKey?: string;
}

export const REDUCTION_ADAPTER_VERSION = "1.0.0";

export const reductionAdapter: ToolAdapter<ReductionParams> = {
  toolId: "reduction",
  adapterVersion: REDUCTION_ADAPTER_VERSION,

  validate(inputModels, params) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (inputModels.length === 0) {
      errors.push("At least one input model is required.");
    }
    if (params.errorTolerance <= 0) {
      errors.push("errorTolerance must be > 0.");
    }
    if (params.minParameters < 1) {
      errors.push("minParameters must be >= 1.");
    }
    if (params.maxIterations <= 0) {
      errors.push("maxIterations must be > 0.");
    }
    if (params.minParameters > (inputModels[0]?.parameterCount ?? Infinity)) {
      warnings.push("minParameters exceeds input model parameter count.");
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  buildInvocation(context, inputModels, params) {
    const inputPath = `<workspace>/input/${inputModels[0]?.filename ?? "input.lib"}`;
    const outputDir = `<workspace>/${params.outputDirectoryKey || context.outputDirectoryKey}`;

    const argv: string[] = [
      "python",
      "-m",
      "bmr.cli",
      "complete",
      inputPath,
      outputDir,
      String(params.errorTolerance),
      String(params.minParameters),
      String(params.maxIterations),
      params.optimizationMethod,
      params.reductionMethod,
      params.testType,
      params.deviceType,
      String(params.usePrebuiltNetlist),
    ];

    if (params.workerCount !== undefined) {
      argv.push("--workers", String(params.workerCount));
    }

    const invocation: ToolInvocation<ReductionParams> = {
      invocationId: context.invocationId,
      toolId: "reduction",
      adapterVersion: context.adapterVersion,
      inputModelIds: inputModels.map((m) => m.modelId),
      outputModelIds: [],
      params,
      argv,
      workingDirectoryKey: context.workingDirectoryKey,
      outputDirectoryKey: params.outputDirectoryKey || context.outputDirectoryKey,
      environment: {},
      temporary: false,
    };

    return invocation;
  },

  normalizeFixture(raw, context): ToolExecutionResult {
    const data = (raw ?? {}) as Record<string, unknown>;
    return {
      executionId: context.executionId,
      toolId: "reduction",
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
