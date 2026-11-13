/* ==================================================================
 *  Translator Adapter (goal.md §20.3)
 * ================================================================== */

import type { ToolAdapter } from "./toolAdapter";
import type { ToolInvocation, ToolExecutionResult, SpiceDialect } from "./contracts";

export interface TranslatorParams {
  sourceDialect: SpiceDialect;
  targetDialect: SpiceDialect;
  followIncludes: boolean;
  verify: boolean;
  plot: boolean;
  maxPlots: number;
  preserveComments: boolean;
  outputFilename?: string;
}

export const TRANSLATOR_ADAPTER_VERSION = "1.0.0";

export const translatorAdapter: ToolAdapter<TranslatorParams> = {
  toolId: "translator",
  adapterVersion: TRANSLATOR_ADAPTER_VERSION,

  validate(inputModels, params) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (inputModels.length === 0) {
      errors.push("At least one input model is required.");
    }
    if (params.sourceDialect === params.targetDialect) {
      errors.push("Source and target dialect must be different.");
    }
    if (params.sourceDialect === "auto" || params.sourceDialect === "unknown") {
      warnings.push("Source dialect is auto/unknown; translation may be ambiguous.");
    }
    if (params.targetDialect === "auto" || params.targetDialect === "unknown") {
      errors.push("Target dialect must be a concrete format.");
    }
    if (params.maxPlots < 0) {
      errors.push("maxPlots must be >= 0.");
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  buildInvocation(context, inputModels, params) {
    const inputPath = `<workspace>/input/${inputModels[0]?.filename ?? "input.sp"}`;
    const ext = params.targetDialect === "spectre" ? "scs" : "lib";
    const outputName = params.outputFilename ?? `translated.${ext}`;
    const outputPath = `<workspace>/${context.outputDirectoryKey}/${outputName}`;

    const argv: string[] = [
      "./cli.py",
      "translate",
      inputPath,
      "--source",
      params.sourceDialect,
      "--target",
      params.targetDialect,
      "--output",
      outputPath,
    ];

    if (params.followIncludes) argv.push("--follow-includes");
    if (params.verify) argv.push("--verify");
    if (params.plot) argv.push("--plot");
    argv.push("--max-plots", String(params.maxPlots));
    if (params.preserveComments) argv.push("--preserve-comments");

    const invocation: ToolInvocation<TranslatorParams> = {
      invocationId: context.invocationId,
      toolId: "translator",
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
      toolId: "translator",
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
