import type { JsonObject } from "../../../../shared/contracts/v1.ts";
import type { BenchmarkToolAdapter } from "../types.ts";
import { resolveInvocation, sanitizeOutputName } from "../security.ts";
import {
  booleanValue,
  entries,
  enumValue,
  integerValue,
  modelName,
  numberValue,
  objectAt,
  relativeFrom,
  stringList,
  stringValue,
} from "./helpers.ts";

const OPTIMIZERS = [
  "cma_es",
  "differential_evolution",
  "lbfgs_fd",
  "least_squares_trust_region",
  "nelder_mead",
  "nelder_mead_normalized",
] as const;

const LOSSES = ["Loss.mape_loss.mape_percent", "Loss.log_mape_loss.log_mape_percent"] as const;

function datasetArgument(path: string, mapping: JsonObject | undefined): string {
  if (!mapping) return path;
  const sweep = stringValue(mapping, "sweep", "");
  if (!sweep) return path;
  if (!["vgs", "vds", "vbs"].includes(sweep.toLowerCase())) throw new Error("Fitting sweep must be vgs, vds or vbs");
  const start = numberValue(mapping, "start", 0);
  const stop = numberValue(mapping, "stop", 1.8);
  const step = numberValue(mapping, "step", 0.01, Number.MIN_VALUE);
  const pieces = [path, sweep.toLowerCase(), String(start), String(stop), String(step)];
  for (const key of ["W", "L", "vgs", "vds", "vbs", "temp"] as const) {
    const raw = mapping[key];
    if (typeof raw === "number" && Number.isFinite(raw)) pieces.push(`${key}=${raw}`);
  }
  return pieces.join(":");
}

function appendBounds(argv: string[], parameters: JsonObject, key: string, flag: "--limitmin" | "--limitmax"): void {
  const raw = parameters[key];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*=[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(item)) {
        throw new Error(`${key} entries must use PARAM=VALUE`);
      }
      argv.push(flag, item);
    }
    return;
  }
  for (const [parameter, value] of entries(parameters, key)) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${key} bound for ${parameter} must be numeric`);
    argv.push(flag, `${parameter}=${value}`);
  }
}

export const fittingAdapter: BenchmarkToolAdapter = {
  toolId: "fitting",
  label: "Fitting",
  description: "Fit a BSIM model against measured DC IV CSV datasets.",
  buildCommands(context) {
    const parameters = objectAt(context.parameters, "fitting");
    const cwd = `work/${context.stepId}`;
    const outputName = sanitizeOutputName(parameters.outputName, "fitted.lib");
    const output = `${context.outputDirectory}/${outputName}`;
    const datasets = context.inputByRole.get("measured-csv") ?? [];
    if (!datasets.length) throw new Error("Fitting requires at least one measured CSV dataset");
    const mappingsValue = parameters.datasetMapping;
    const mappings = mappingsValue && typeof mappingsValue === "object" && !Array.isArray(mappingsValue)
      ? mappingsValue as JsonObject
      : {};
    const argv = ["--sim-type", "dc"];
    for (const dataset of datasets) {
      const workspaceDataset = `input/${dataset}`;
      const mapping = mappings[dataset];
      argv.push("--dataset", datasetArgument(relativeFrom(cwd, workspaceDataset), mapping && typeof mapping === "object" && !Array.isArray(mapping) ? mapping as JsonObject : undefined));
    }
    if (context.inputModel) argv.push("--model-path", relativeFrom(cwd, context.inputModel));
    const ngspice = context.dependencies?.get("ngspice")?.executablePath;
    if (!ngspice) throw new Error("Fitting requires a healthy configured ngspice executable");
    argv.push("--ngspice", ngspice);
    const name = modelName(parameters);
    if (name) argv.push("--model-name", name);
    argv.push(
      "--device-type", enumValue(parameters, "deviceType", ["nmos", "pmos"] as const, "nmos"),
      "--optimizer", enumValue(parameters, "optimizer", OPTIMIZERS, "nelder_mead"),
      "--loss-func", enumValue(parameters, "lossFunction", LOSSES, LOSSES[0]),
      "--max-iters", String(integerValue(parameters, "maxIterations", 100, 1, 1_000_000)),
      "--step-tol", String(numberValue(parameters, "stepTolerance", 1e-6, Number.MIN_VALUE)),
      "--target-rel-loss", String(numberValue(parameters, "targetRelativeLoss", 0.1, 0)),
      "--jobs", String(integerValue(parameters, "jobs", 1, 0, 256)),
      "--output-model", relativeFrom(cwd, output),
    );
    for (const group of stringList(parameters, "fix")) argv.push("--fix", group);
    for (const group of stringList(parameters, "train")) argv.push("--train", group);
    appendBounds(argv, parameters, "minimumBounds", "--limitmin");
    appendBounds(argv, parameters, "maximumBounds", "--limitmax");
    if (booleanValue(parameters, "plot", true)) argv.push("--plot");
    return [resolveInvocation(this.toolId, context.configuration, argv, cwd, [output])];
  },
};
