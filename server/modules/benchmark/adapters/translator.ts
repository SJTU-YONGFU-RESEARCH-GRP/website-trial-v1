import type { BenchmarkToolAdapter } from "../types.ts";
import { resolveInvocation, sanitizeOutputName } from "../security.ts";
import { booleanValue, enumValue, integerValue, objectAt, relativeFrom } from "./helpers.ts";

export const translatorAdapter: BenchmarkToolAdapter = {
  toolId: "translator",
  label: "Translator",
  description: "Translate one SPICE model between the audited Spectre, HSPICE and ngspice dialects.",
  buildCommands(context) {
    const parameters = objectAt(context.parameters, "translator");
    const cwd = `work/${context.stepId}`;
    const source = enumValue(parameters, "sourceDialect", ["spectre", "hspice", "ngspice"] as const, "ngspice");
    const target = enumValue(parameters, "targetDialect", ["spectre", "hspice", "ngspice"] as const, "ngspice");
    const defaultExtension = target === "spectre" ? ".scs" : ".lib";
    const outputName = sanitizeOutputName(parameters.outputName, `translated${defaultExtension}`);
    const output = `${context.outputDirectory}/${outputName}`;
    const argv = [
      "translate",
      relativeFrom(cwd, context.inputModel),
      "--output",
      relativeFrom(cwd, output),
      "--source",
      source,
      "--target",
      target,
    ];
    if (booleanValue(parameters, "followIncludes")) argv.push("--follow-includes");
    if (booleanValue(parameters, "verify")) {
      if (target !== "ngspice") throw new Error("Translator verification is available only for an ngspice target");
      argv.push("--verify");
    }
    if (booleanValue(parameters, "plot")) {
      if (target !== "ngspice") throw new Error("Translator plots are available only for an ngspice target");
      argv.push("--plot", "--max-plots", String(integerValue(parameters, "maxPlots", 20, 1, 200)));
    }
    return [resolveInvocation(this.toolId, context.configuration, argv, cwd, [
      output,
      `${context.outputDirectory}/model_manifest.json`,
    ])];
  },
};
