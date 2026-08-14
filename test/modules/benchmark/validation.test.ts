import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DraftValidationContextV1 } from "../../../shared/contracts/v1.ts";
import { BenchmarkModuleAdapter } from "../../../server/modules/benchmark/index.ts";
import { inputFile, jobRecord, toolConfiguration } from "./helpers.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixtureContext(csv: string): Promise<DraftValidationContextV1> {
  const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-validation-"));
  temporaryDirectories.push(storageRoot);
  const inputRoot = path.join(storageRoot, "jobs/job-1/input");
  await mkdir(inputRoot, { recursive: true });
  await writeFile(path.join(inputRoot, "measured.csv"), csv);
  const files = [inputFile("measured.csv", "measured-csv", Buffer.byteLength(csv))];
  const job = jobRecord({
    inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(csv), fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
    parameters: {
      mode: "run", operations: { fitting: true, benchmark: false }, translator: {}, reduction: {}, expansion: {}, benchmark: {},
      fitting: { datasetMapping: { "measured.csv": { sweep: "vgs", start: 0, stop: 1.8, step: 0.1, vds: 1.8 } } },
    },
    toolConfigurations: [
      toolConfiguration("fitting", { interpreter: "/usr/bin/python3", entryPoint: "/opt/fitting/calibrate_bsim.py" }),
      toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
    ],
  });
  return { moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job, files, technology: null };
}

describe("Benchmark preflight validation", () => {
  it("accepts measured DC IV CSV with a sweep and mapped fixed bias", async () => {
    const context = await fixtureContext("Vgs,id\n0,0\n0.5,0.0001\n1.0,0.001\n");
    const adapter = new BenchmarkModuleAdapter({ health: {
      fitting: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const result = await adapter.validateDraft(context);
    expect(result.valid).toBe(true);
  });

  it("rejects a CSV without an accepted current column", async () => {
    const context = await fixtureContext("Vgs,gm\n0,0\n1,1\n");
    const adapter = new BenchmarkModuleAdapter({ health: {
      fitting: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const result = await adapter.validateDraft(context);
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("benchmark.csv_current_column");
  });

  it("builds a real multi-step Expansion DAG followed by Benchmark", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-plan-"));
    temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input");
    await mkdir(inputRoot, { recursive: true });
    await writeFile(path.join(inputRoot, "model.lib"), ".model dut nmos level=54\n");
    const files = [inputFile("model.lib", "primary-model")];
    const job = jobRecord({
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: 128, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      parameters: {
        mode: "run", operations: { expansion: true, benchmark: true }, translator: {}, fitting: {}, reduction: {},
        expansion: { runIv: true, runCv: true, runMonteCarlo: true },
        benchmark: { simulators: ["ngspice"], modes: ["dc", "ac"] },
      },
      toolConfigurations: [
        toolConfiguration("expansion", { interpreter: "/usr/bin/python3", entryPoint: "model_expansion" }),
        toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" }),
        toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
      ],
    });
    const context: DraftValidationContextV1 = { moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job, files, technology: null };
    const adapter = new BenchmarkModuleAdapter({ health: {
      expansion: { status: "healthy", version: "0.1.0", reason: null, adapterSelfTestPassed: true },
      "spice-benchmark": { status: "healthy", version: "1.0.0", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const plan = await adapter.buildPlan(context);
    expect(plan.steps.map((step) => step.id)).toEqual(expect.arrayContaining([
      "validate-input", "expansion.corners", "expansion.iv", "expansion.cv", "expansion.monte-carlo",
      "benchmark.1", "benchmark.2", "benchmark.3", "parse-result", "publish-result",
    ]));
    expect(plan.steps.filter((step) => step.id.startsWith("expansion.") && step.process)).toHaveLength(4);
  });
});
