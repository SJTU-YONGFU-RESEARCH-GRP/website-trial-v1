import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BenchmarkModuleAdapter } from "../../../server/modules/benchmark/index.ts";
import { executionContext, jobRecord, toolConfiguration } from "./helpers.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Benchmark execution and native result import", () => {
  it("imports completed native reports without executing uploaded content", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "benchmark-import-"));
    temporaryDirectories.push(workspace);
    await mkdir(path.join(workspace, "input/ngspice"), { recursive: true });
    await writeFile(path.join(workspace, "input/ngspice/REPORT.md"), [
      "# MOSFET Simulation Verification Report",
      "Version: ngspice-46+",
      "## DC Analysis",
      "- [✓] Simulation runs without errors",
    ].join("\n"));
    await writeFile(path.join(workspace, "input/ngspice/manifest.json"), JSON.stringify({ simulator: "ngspice", wallTimeSeconds: 1.25 }));
    const job = jobRecord({
      operation: "import-completed-result",
      workflow: "completed-result-import",
      parameters: { mode: "import", operations: { benchmark: false }, translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: {} },
    });
    const context = executionContext(workspace, job);
    const adapter = new BenchmarkModuleAdapter();
    const result = await adapter.parseResult(context);
    expect(result.summary.origin).toBe("imported");
    expect(result.summary.reportCount).toBe(1);
    expect(result.artifactRoles).toContain("benchmark-report");
    await adapter.publishResult(context, result);
    const artifacts = await adapter.collectArtifacts(context);
    expect(artifacts.some((artifact) => artifact.relativePath === "artifacts/normalized-result.json")).toBe(true);
  });

  it("executes an immutable planned argv array only through the shared process boundary", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "benchmark-execute-"));
    temporaryDirectories.push(workspace);
    const configuration = toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" });
    const process = {
      toolConfigurationId: configuration.id,
      executableDisplay: "/usr/bin/python3",
      argv: ["translate", "../../input/model.lib", "--output", "../../output/model.lib"],
      cwdRelative: "work/translator",
      environmentNames: [],
      timeoutSeconds: 30,
    };
    const job = jobRecord({
      plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "benchmark.capability.v1", steps: [{ id: "translator", name: "Translate", description: "", required: true, weight: 1, process, inputRoles: [], outputRoles: [] }], sweep: null, warnings: [] },
      toolConfigurations: [configuration],
    });
    const context = executionContext(workspace, job);
    context.step.stepKey = "translator";
    const runPlannedProcess = vi.fn(async () => ({ exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false }));
    Object.assign(context, { runPlannedProcess });
    const adapter = new BenchmarkModuleAdapter();
    const result = await adapter.executeStep(context);
    expect(result.exitCode).toBe(0);
    expect(runPlannedProcess).toHaveBeenCalledOnce();
  });

  it("rechecks the frozen Benchmark input SHA-256 before any tool step", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "benchmark-input-integrity-")); temporaryDirectories.push(workspace);
    await mkdir(path.join(workspace, "input"), { recursive: true }); await writeFile(path.join(workspace, "input/model.lib"), "b");
    const file = { relativePath: "model.lib", sizeBytes: 1, sha256: createHash("sha256").update("a").digest("hex"), mediaType: "text/plain", recognizedType: "spice", role: "primary-model", required: true, usedByStepIds: [], unresolvedIncludes: [], validationErrors: [] };
    const job = jobRecord({ inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [file], totalBytes: 1, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "benchmark.capability.v1", steps: [{ id: "validate-input", name: "Validate", description: "", required: true, weight: 1, process: null, inputRoles: [], outputRoles: [] }], sweep: null, warnings: [] } });
    const context = executionContext(workspace, job); context.step.stepKey = "validate-input";
    await expect(new BenchmarkModuleAdapter().executeStep(context)).rejects.toThrow(/SHA-256 changed/);
  });

  it("accepts computed output only when every planned simulator and mode has a report and native fixture", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "benchmark-complete-")); temporaryDirectories.push(workspace);
    const writeSimulator = async (simulator: string): Promise<void> => {
      const directory = path.join(workspace, `output/benchmark-1/${simulator}`);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, "REPORT.md"), [
        "# MOSFET Simulation Verification Report",
        `Version: ${simulator}-test`,
        "## 3. DC Analysis",
        "- [<span style='color: green'>✓</span>] DC complete",
        "## 4. AC Analysis",
        "- [<span style='color: green'>✓</span>] AC complete",
      ].join("\n"));
      await writeFile(path.join(directory, "native-fixture-manifest.json"), JSON.stringify({
        simulator,
        fixtures: { dc: { submitted: "dc" }, ac: { submitted: "ac" } },
      }));
    };
    await writeSimulator("ngspice");
    await writeSimulator("spectre");
    const benchmarkConfiguration = toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "benchmark.cli" });
    const job = jobRecord({
      parameters: { mode: "run", operations: { benchmark: true }, translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice", "spectre"], modes: ["dc", "ac"] } },
      toolConfigurations: [benchmarkConfiguration],
      plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "benchmark.capability.v1", steps: [{
        id: "benchmark.1", name: "Benchmark", description: "", required: true, weight: 1,
        process: { toolConfigurationId: benchmarkConfiguration.id, executableDisplay: "/usr/bin/python3", argv: ["model.lib", "--output-dir", "../../output/benchmark-1"], cwdRelative: "work/benchmark.1", environmentNames: [], timeoutSeconds: 30 },
        inputRoles: ["model"], outputRoles: ["benchmark-report"],
      }], sweep: null, warnings: [] },
    });
    const result = await new BenchmarkModuleAdapter().parseResult(executionContext(workspace, job));
    expect(result.summary.reportCount).toBe(2);
    expect(result.summary.simulators).toEqual(["ngspice", "spectre"]);
  });

  it("publishes three simulator-specific steps without requiring the root-parameter cross product", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "benchmark-split-complete-")); temporaryDirectories.push(workspace);
    const simulators = ["ngspice", "spectre", "hspice"];
    const benchmarkConfiguration = toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "benchmark.cli" });
    await mkdir(path.join(workspace, "input"), { recursive: true });
    for (const [index, simulator] of simulators.entries()) {
      const model = path.join(workspace, `input/model-${index + 1}.lib`);
      await writeFile(model, `.model actual_nmos NMOS level=${simulator === "hspice" ? 54 : 14} vth0=0.7\n`);
      const directory = path.join(workspace, `output/benchmark-${index + 1}/${simulator}`);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, "REPORT.md"), "# MOSFET Simulation Verification Report\n## DC Analysis\n- [✓] DC complete\n");
      await writeFile(path.join(directory, "native-fixture-manifest.json"), JSON.stringify({ simulator, modelFile: model, fixtures: { dc: { submitted: "dc" } } }));
    }
    const job = jobRecord({
      parameters: { mode: "run", operations: { benchmark: true }, benchmark: { simulators, modes: ["dc", "transient", "ac", "noise"] } },
      toolConfigurations: [benchmarkConfiguration],
      plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "benchmark.capability.v1", steps: simulators.map((simulator, index) => ({
        id: `benchmark.${index + 1}`, name: "Benchmark", description: "", required: true, weight: 1,
        process: { toolConfigurationId: benchmarkConfiguration.id, executableDisplay: "/usr/bin/python3",
          argv: [`../../input/model-${index + 1}.lib`, "--simulator", simulator, "--modes", "dc", "--output-dir", `../../output/benchmark-${index + 1}`, "--dpi", "300"],
          cwdRelative: `work/benchmark.${index + 1}`, environmentNames: [], timeoutSeconds: 30,
          expectedOutputs: [`output/benchmark-${index + 1}/${simulator}/REPORT.md`, `output/benchmark-${index + 1}/${simulator}/native-fixture-manifest.json`] },
        inputRoles: ["model"], outputRoles: ["benchmark-report"],
      })), sweep: null, warnings: [] },
    });
    const adapter = new BenchmarkModuleAdapter(); const context = executionContext(workspace, job);
    const result = await adapter.parseResult(context);
    expect(result.summary.reportCount).toBe(3); expect(result.summary.simulators).toEqual(simulators);
    await adapter.publishResult(context, result);
    const artifacts = await adapter.collectArtifacts(context);
    expect(artifacts.filter((artifact) => /^artifacts\/explorer\/benchmark\.\d+\/model\.json$/.test(artifact.relativePath))).toHaveLength(3);
    expect(artifacts.some((artifact) => artifact.relativePath === "artifacts/normalized-result.json")).toBe(true);
    await rm(path.join(workspace, "output/benchmark-3/hspice/REPORT.md"));
    await expect(adapter.parseResult(context)).rejects.toThrow(/benchmark\.3\/hspice: REPORT\.md is missing/);
  });

  it("rejects computed output when any selected simulator or analysis mode is missing", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "benchmark-incomplete-")); temporaryDirectories.push(workspace);
    const directory = path.join(workspace, "output/benchmark-1/ngspice");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "REPORT.md"), "# Report\n## DC Analysis\n- [✓] complete\n");
    await writeFile(path.join(directory, "native-fixture-manifest.json"), JSON.stringify({ simulator: "ngspice", fixtures: { dc: {} } }));
    const benchmarkConfiguration = toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "benchmark.cli" });
    const job = jobRecord({
      parameters: { mode: "run", operations: { benchmark: true }, translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice", "spectre"], modes: ["dc", "ac"] } },
      toolConfigurations: [benchmarkConfiguration],
      plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "benchmark.capability.v1", steps: [{
        id: "benchmark.1", name: "Benchmark", description: "", required: true, weight: 1,
        process: { toolConfigurationId: benchmarkConfiguration.id, executableDisplay: "/usr/bin/python3", argv: ["model.lib", "--output-dir", "../../output/benchmark-1"], cwdRelative: "work/benchmark.1", environmentNames: [], timeoutSeconds: 30 },
        inputRoles: ["model"], outputRoles: ["benchmark-report"],
      }], sweep: null, warnings: [] },
    });
    await expect(new BenchmarkModuleAdapter().parseResult(executionContext(workspace, job))).rejects.toThrow(/spectre: REPORT\.md is missing|ngspice\/ac/);
  });
});
