import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BenchmarkModuleAdapter } from "../../../server/modules/benchmark/index.ts";
import type { SpawnRequest } from "../../../server/modules/benchmark/types.ts";
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

  it("executes an immutable planned argv array through the injected process boundary", async () => {
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
    const spawnProcess = vi.fn(async (_request: SpawnRequest) => ({ exitCode: 0, signal: null, timedOut: false, stdoutBytes: 12, stderrBytes: 0 }));
    const adapter = new BenchmarkModuleAdapter({ spawnProcess });
    const result = await adapter.executeStep(context);
    expect(result.exitCode).toBe(0);
    expect(spawnProcess).toHaveBeenCalledOnce();
    const request = spawnProcess.mock.calls[0][0];
    expect(request.executable).toBe("/usr/bin/python3");
    expect(request.argv).toEqual(["/opt/translator/cli.py", ...process.argv]);
    expect(request.env.HOME).toBe(path.join(workspace, "work/home"));
  });
});
