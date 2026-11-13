/* ==================================================================
 *  Expansion Adapter (goal.md §20.6)
 * ================================================================== */

import type { ToolAdapter } from "./toolAdapter";
import type { ToolInvocation, ToolExecutionResult } from "./contracts";

export interface ExpansionParams {
  modelName: string;
  nSigma: number;
  generateTSF: boolean;
  runIv: boolean;
  runCv: boolean;
  monteCarlo: boolean;
  mcSamples: number;
  distribution: "normal" | "uniform" | "lognormal";
  seed: number;
  plot: boolean;
  sigmaJson?: Record<string, number>;
  mcNSigma?: number;
  jobs?: number;
  vdsAt?: number;
  vgsAt?: number;
  histogramBins?: number;
  outputDirectoryKey?: string;
}

export const EXPANSION_ADAPTER_VERSION = "1.0.0";

export const expansionAdapter: ToolAdapter<ExpansionParams> = {
  toolId: "expansion",
  adapterVersion: EXPANSION_ADAPTER_VERSION,

  validate(inputModels, params) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (inputModels.length === 0) {
      errors.push("At least one input model is required.");
    }
    if (!params.modelName.trim()) {
      errors.push("modelName is required.");
    }
    if (params.nSigma <= 0) {
      errors.push("nSigma must be > 0.");
    }
    if (params.monteCarlo && params.mcSamples <= 0) {
      errors.push("mcSamples must be > 0 when Monte Carlo is enabled.");
    }
    if (params.monteCarlo && params.seed < 0) {
      errors.push("seed must be non-negative.");
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  buildInvocation(context, inputModels, params) {
    const inputPath = `<workspace>/input/${inputModels[0]?.filename ?? "input.sp"}`;
    const outputDir = `<workspace>/${params.outputDirectoryKey || context.outputDirectoryKey}`;

    const argv: string[] = [
      "./run_expansion.sh",
      inputPath,
      "--out-dir",
      outputDir,
      "--model-name",
      params.modelName,
      "--n-sigma",
      String(params.nSigma),
    ];

    if (params.plot) {
      argv.push("--plot");
    } else {
      argv.push("--no-plot");
    }

    if (params.monteCarlo) {
      argv.push(
        "--monte-carlo",
        "--mc-samples",
        String(params.mcSamples),
        "--mc-distribution",
        params.distribution,
        "--mc-seed",
        String(params.seed),
      );
    }

    if (params.jobs !== undefined) {
      argv.push("--jobs", String(params.jobs));
    }

    // Sigma JSON: referenced as artifact, not inlined in argv
    // (goal.md §20.6: "argv uses path reference, not full JSON")

    const invocation: ToolInvocation<ExpansionParams> = {
      invocationId: context.invocationId,
      toolId: "expansion",
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
      toolId: "expansion",
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
