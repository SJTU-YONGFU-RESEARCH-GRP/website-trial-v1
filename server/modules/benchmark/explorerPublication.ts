import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile, lstat } from "node:fs/promises";
import path from "node:path";
import type { JobRecordV1, StepExecutionContextV1 } from "../../../shared/contracts/v1.ts";
import { benchmarkParameters, operationEnabled } from "./validation.ts";
import { assertExistingPathWithin, workspacePath } from "./security.ts";

export function benchmarkOutputPath(job: JobRecordV1, stepId: string): string | null {
  const process = job.plan.steps.find((step) => step.id === stepId)?.process;
  if (!process) return null;
  const index = process.argv.indexOf("--output-dir");
  if (index < 0 || !process.argv[index + 1]) return null;
  const relative = path.posix.normalize(path.posix.join(process.cwdRelative, process.argv[index + 1]));
  return relative.startsWith("output/") ? relative : null;
}

export function modelLineage(job: JobRecordV1, modelPath: string): { sourcePath: string; stage: string; chain: string[] } {
  let sourcePath = modelPath;
  // Canonical handoff is an implementation step. Follow its real Translator
  // argv back to the original/selected stage model without relabeling it.
  for (let count = 0; count < job.plan.steps.length; count++) {
    const normalization = job.plan.steps.find((step) => /^(normalize-|normalize-input\.)/.test(step.id)
      && step.process?.expectedOutputs?.includes(sourcePath));
    if (!normalization?.process) break;
    const argv = normalization.process.argv;
    const index = argv.indexOf("translate");
    if (index < 0 || !argv[index + 1]) break;
    sourcePath = path.posix.normalize(path.posix.join(normalization.process.cwdRelative, argv[index + 1]));
  }
  const stage = sourcePath.startsWith("input/") ? "original"
    : sourcePath.split("/")[1]?.replace(/-\d+$/, "") ?? "processed";
  const parameters = benchmarkParameters(job.parameters);
  const order: string[] = parameters.operationOrder.filter((toolId) => operationEnabled(parameters, toolId));
  const stageIndex = order.indexOf(stage);
  const chain = stage === "original" ? [] : stageIndex >= 0 ? order.slice(0, stageIndex + 1) : [stage];
  return { sourcePath, stage, chain };
}

/** These files remain private inside the worker's existing atomic publication. */
export async function retainExplorerModels(context: StepExecutionContextV1): Promise<void> {
  for (const step of context.job.plan.steps.filter((entry) => /^benchmark\.\d+$/.test(entry.id))) {
    const output = benchmarkOutputPath(context.job, step.id);
    if (!output) continue;
    const simulatorIndex = step.process!.argv.indexOf("--simulator");
    const simulator = step.process!.argv[simulatorIndex + 1];
    if (!["ngspice", "spectre", "hspice"].includes(simulator)) continue;
    const fixture = JSON.parse(await readFile(workspacePath(context.workspacePath, `${output}/${simulator}/native-fixture-manifest.json`), "utf8"));
    if (typeof fixture.modelFile !== "string") continue;
    const model = await assertExistingPathWithin(context.workspacePath, fixture.modelFile);
    const plannedInput = step.process!.argv[simulatorIndex - 1];
    if (!plannedInput || plannedInput.startsWith("--")) throw new Error("Benchmark planned model input is missing");
    const expectedModel = await assertExistingPathWithin(context.workspacePath, path.resolve(context.workspacePath, step.process!.cwdRelative, plannedInput));
    if (model !== expectedModel) throw new Error("Native fixture model does not match the planned Benchmark model input");
    const metadata = await lstat(model);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("Explorer model must be a regular workspace file");
    const relativeModel = path.relative(context.workspacePath, model).split(path.sep).join("/");
    const lineage = modelLineage(context.job, relativeModel);
    const directory = workspacePath(context.workspacePath, `artifacts/explorer/${step.id}`);
    await mkdir(directory, { recursive: true, mode: 0o750 });
    await copyFile(model, path.join(directory, "model.lib"));
    const bytes = await readFile(model);
    await writeFile(path.join(directory, "model.json"), JSON.stringify({
      schemaVersion: "benchmark.explorer-model.v1", stepId: step.id, benchmarkOutput: output,
      benchmarkInputPath: relativeModel, ...lineage,
      modelMd5: createHash("md5").update(bytes).digest("hex"),
      modelSha256: createHash("sha256").update(bytes).digest("hex"),
    }, null, 2), { mode: 0o600 });
  }
}
