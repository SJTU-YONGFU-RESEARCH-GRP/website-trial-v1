import type { BenchmarkToolAdapter, CommandSpec } from "../types.ts";
import { resolveInvocation } from "../security.ts";
import { booleanValue, enumValue, integerValue, modelName, numberValue, objectAt, relativeFrom } from "./helpers.ts";

function commonCharacterizationArgs(cwd: string, output: string, inputModel: string, parameters: ReturnType<typeof objectAt>): string[] {
  const argv = [
    "--model", relativeFrom(cwd, inputModel),
    "--corners-dir", relativeFrom(cwd, `${output}/models`),
    "--work-dir", relativeFrom(cwd, `${output}/work`),
    "--out-dir", relativeFrom(cwd, output),
    "--summary-path", relativeFrom(cwd, `${output}/SUMMARY.md`),
    "--jobs", String(integerValue(parameters, "jobs", 1, 0, 256)),
  ];
  const name = modelName(parameters);
  if (name) argv.push("--model-name", name);
  if (booleanValue(parameters, "plot", true)) argv.push("--plot");
  return argv;
}

export const expansionAdapter: BenchmarkToolAdapter = {
  toolId: "expansion",
  label: "Expansion",
  description: "Generate T/S/F corners, then independently run IV, CV and Monte Carlo characterization.",
  buildCommands(context) {
    const parameters = objectAt(context.parameters, "expansion");
    const cwd = `work/${context.stepId}`;
    const output = context.outputDirectory;
    const sigmaFile = (context.inputByRole.get("sigma-json") ?? [])[0];
    const nSigma = numberValue(parameters, "nSigma", 3, Number.MIN_VALUE, 20);
    const commands: CommandSpec[] = [];
    const cornersArgv = [
      "generate-corners",
      relativeFrom(cwd, context.inputModel),
      "--out-dir", relativeFrom(cwd, output),
      "--n-sigma", String(nSigma),
    ];
    if (sigmaFile) cornersArgv.push("--sigma-json", relativeFrom(cwd, `input/${sigmaFile}`));
    commands.push(resolveInvocation(this.toolId, context.configuration, cornersArgv, cwd, [
      `${output}/models/model_t.sp`, `${output}/models/model_s.sp`, `${output}/models/model_f.sp`,
    ]));

    if (booleanValue(parameters, "runIv", true)) {
      commands.push(resolveInvocation(this.toolId, context.configuration, ["iv", ...commonCharacterizationArgs(cwd, output, context.inputModel, parameters)], cwd, [`${output}/SUMMARY.md`]));
    }
    if (booleanValue(parameters, "runCv")) {
      commands.push(resolveInvocation(this.toolId, context.configuration, ["cv", ...commonCharacterizationArgs(cwd, output, context.inputModel, parameters)], cwd, [`${output}/SUMMARY.md`]));
    }
    if (booleanValue(parameters, "runMonteCarlo")) {
      const argv = [
        "monte-carlo",
        relativeFrom(cwd, context.inputModel),
        "--out-dir", relativeFrom(cwd, output),
        "--summary-path", relativeFrom(cwd, `${output}/SUMMARY.md`),
        "--samples", String(integerValue(parameters, "samples", 100, 1, 100_000)),
        "--n-sigma", String(nSigma),
        "--distribution", enumValue(parameters, "distribution", ["normal", "uniform"] as const, "normal"),
        "--seed", String(integerValue(parameters, "seed", 1, 0, 2_147_483_647)),
        "--jobs", String(integerValue(parameters, "jobs", 1, 0, 256)),
        "--work-dir", relativeFrom(cwd, `${output}/work`),
        "--corners-dir", relativeFrom(cwd, `${output}/models`),
      ];
      const name = modelName(parameters);
      if (name) argv.push("--model-name", name);
      if (sigmaFile) argv.push("--sigma-json", relativeFrom(cwd, `input/${sigmaFile}`));
      if (booleanValue(parameters, "plot", true)) argv.push("--plot");
      commands.push(resolveInvocation(this.toolId, context.configuration, argv, cwd, [`${output}/SUMMARY.md`]));
    }
    return commands;
  },
};
