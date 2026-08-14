import type { BenchmarkToolAdapter } from "../types.ts";
import { resolveInvocation } from "../security.ts";
import { booleanValue, enumValue, integerValue, numberValue, objectAt, relativeFrom } from "./helpers.ts";

export const reductionAdapter: BenchmarkToolAdapter = {
  toolId: "reduction",
  label: "Reduction",
  description: "Reduce a BSIM parameter set with the audited complete workflow.",
  buildCommands(context) {
    const parameters = objectAt(context.parameters, "reduction");
    const cwd = `work/${context.stepId}`;
    if (booleanValue(parameters, "usePrebuiltNetlist")) {
      throw new Error("Prebuilt-netlist reduction is disabled until its adapter self-test passes");
    }
    const argv = [
      "complete",
      relativeFrom(cwd, context.inputModel),
      relativeFrom(cwd, context.outputDirectory),
      String(numberValue(parameters, "errorTolerance", 0.05, 0)),
      String(integerValue(parameters, "minimumParameters", 10, 1)),
      String(integerValue(parameters, "maximumIterations", 100, 1)),
      enumValue(parameters, "optimizationMethod", ["gradient_descent", "genetic", "bayesian", "particle_swarm"] as const, "gradient_descent"),
      enumValue(parameters, "reductionMethod", ["sensitivity", "pruning", "pca", "lasso"] as const, "sensitivity"),
      enumValue(parameters, "testType", ["dc_iv", "dc_transfer", "cv", "ac", "transient", "noise", "combined"] as const, "dc_iv"),
      enumValue(parameters, "deviceType", ["nmos", "pmos"] as const, "nmos"),
      "false",
    ];
    return [resolveInvocation(this.toolId, context.configuration, argv, cwd, [
      `${context.outputDirectory}/reduction_results.json`,
      `${context.outputDirectory}/reduced_model.lib`,
      `${context.outputDirectory}/model_manifest.json`,
    ])];
  },
};
