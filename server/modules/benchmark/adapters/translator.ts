import type { JsonObject } from "../../../../shared/contracts/v1.ts";
import type { SpiceDialect } from "../modelInput.ts";
import type { AdapterPlanContext, BenchmarkToolAdapter, CommandSpec } from "../types.ts";
import { resolveInvocation, sanitizeOutputName } from "../security.ts";
import { booleanValue, enumValue, integerValue, objectAt, relativeFrom } from "./helpers.ts";

export function translatorOutputName(parameters: JsonObject): string {
  const target = enumValue(parameters, "targetDialect", ["spectre", "hspice", "ngspice"] as const, "ngspice");
  return sanitizeOutputName(parameters.outputName, target === "spectre" ? "translated.scs" : "translated.lib");
}

/** Hidden fixture conversion; public Translator targets remain the three native dialects. */
export function buildNormalizationCommand(context: AdapterPlanContext, target: "ngspice" | "hspice" | "spectre-spice", section?: string, benchmarkPrimaryNmos = false, source: SpiceDialect | "auto" = "auto"): CommandSpec {
  const cwd = `work/${context.stepId}`;
  const output = `${context.outputDirectory}/normalized.lib`;
  const argv = ["translate", relativeFrom(cwd, context.inputModel), "--output", relativeFrom(cwd, output), "--source", source, "--target", target, "--include-root", relativeFrom(cwd, "."), "--follow-includes"];
  if (section) argv.push("--section", section);
  if (benchmarkPrimaryNmos) argv.push("--benchmark-primary-nmos");
  return resolveInvocation("translator", context.configuration, argv, cwd, [output, `${context.outputDirectory}/model_manifest.json`]);
}

export const translatorAdapter: BenchmarkToolAdapter = {
  toolId: "translator",
  label: "Translator",
  description: "Translate one SPICE model between the audited Spectre, HSPICE and ngspice dialects.",
  buildCommands(context) {
    const parameters = objectAt(context.parameters, "translator");
    const cwd = `work/${context.stepId}`;
    const source = enumValue(parameters, "sourceDialect", ["auto", "spectre", "hspice", "ngspice"] as const, "auto");
    const target = enumValue(parameters, "targetDialect", ["spectre", "hspice", "ngspice"] as const, "ngspice");
    const outputName = translatorOutputName(parameters);
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
      "--include-root", relativeFrom(cwd, "."),
    ];
    if (typeof parameters.section === "string" && parameters.section.trim()) argv.push("--section", parameters.section.trim());
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
