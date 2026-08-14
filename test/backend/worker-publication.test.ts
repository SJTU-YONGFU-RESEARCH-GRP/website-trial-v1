import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { InputManifestV1, ModuleAdapterV1, StepExecutionContextV1, ToolConfigurationSnapshotV1 } from "../../shared/contracts/v1.ts";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import type { CoreStepExecutionContextV1 } from "../../server/app/process/coreContext.ts";
import { SafeProcessRunner } from "../../server/app/process/safeProcess.ts";
import { StorageService } from "../../server/app/storage/storage.ts";
import { JobRunner } from "../../server/worker/runner.ts";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fsp.rm(root, { recursive: true, force: true }))); });

describe("worker execution and atomic publication", () => {
  it("runs the frozen argv, retains logs, and records imported provenance", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-worker-test-")); roots.push(root);
    const storage = new StorageService(root); await storage.initialize(); const database = new EdaDatabase(":memory:"); database.migrate(); const repositories = makeRepositories(database);
    const user = repositories.users.create({ username: "publication-user", password: "a sufficiently strong password" }); const at = new Date().toISOString();
    const tool = repositories.tools.save({ toolId: "node-test", moduleId: "digital", enabled: true, rootPath: null, executablePath: process.execPath, interpreterPath: null, entryPoint: null,
      workingDirectory: null, timeoutSeconds: 5, maxConcurrency: 1, environmentNames: ["TEST_MARKER"], environment: { TEST_MARKER: "frozen-environment" }, versionProbeArgv: ["--version"], adapterId: "digital-test", adapterVersion: "1" });
    const { environment: _environment, createdAt: _created, updatedAt: _updated, ...snapshot } = tool;
    const manifest: InputManifestV1 = { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: at };
    const job = repositories.jobs.createDraft(user.id, "digital", "import-completed-result", "completed-result", manifest); await storage.createWorkspace(job.id);
    repositories.jobs.beginValidation(job.id);
    repositories.jobs.setDraft(job.id, manifest, {}, "test-capability", [snapshot as ToolConfigurationSnapshotV1], { "node-test": process.version }, { schemaVersion: "eda.job-plan.v1", capabilityVersion: "test-capability",
      steps: [{ id: "execute", name: "Execute", description: "test executable", required: true, weight: 1, process: { toolConfigurationId: tool.id, executableDisplay: "node-test", argv: ["-e", "require('node:fs').writeFileSync('../output/result.json',JSON.stringify({value:42}))"], cwdRelative: "work", environmentNames: ["TEST_MARKER"], timeoutSeconds: 5 }, inputRoles: [], outputRoles: ["result"] }], sweep: null, warnings: [] });
    repositories.jobs.start(job.id);
    let sawEnvironment = false;
    const adapter: ModuleAdapterV1 = {
      moduleId: "digital", capabilities: async () => [], validateDraft: async () => ({ valid: true, errors: [], warnings: [] }), buildPlan: async () => { throw new Error("not used"); },
      executeStep: async (context: StepExecutionContextV1) => { const core = context as CoreStepExecutionContextV1; sawEnvironment = core.runtimeToolConfigurations[0]?.environment.TEST_MARKER === "frozen-environment"; const result = await core.runPlannedProcess(); return { exitCode: result.exitCode, outputs: {} }; },
      parseResult: async () => ({ title: "Imported real output", summary: { value: 42 }, data: { value: 42 }, artifactRoles: ["result"], parserId: "test-parser", parserVersion: "1" }), publishResult: async () => {},
      collectArtifacts: async () => [{ role: "result", relativePath: "output/result.json", mediaType: "application/json", required: true, publish: true }],
    };
    const registry = new ModuleRegistry(); registry.register(adapter); const claimed = repositories.jobs.claim("digital")!;
    await new JobRunner(repositories, registry, storage, new SafeProcessRunner(100)).run(claimed);
    const finished = repositories.jobs.get(job.id)!; expect(finished.status).toBe("succeeded"); expect(sawEnvironment).toBe(true);
    const result = repositories.results.get("digital", finished.resultId!, user.id, false)!; expect(result.provenance.origin).toBe("imported"); expect(result.provenance.toolVersions["node-test"]).toBe(process.version);
    const artifacts = repositories.artifacts.listJob(job.id); expect(artifacts.map((item) => item.role)).toEqual(expect.arrayContaining(["execute.stdout", "execute.stderr", "result"]));
    expect(await fsp.readFile(storage.resolve(`results/digital/${result.id}/output/result.json`), "utf8")).toContain("42"); database.close();
  });

  it("removes a final directory when storage fails immediately after its atomic rename", async () => {
    class RenameThenFailStorage extends StorageService {
      override async commitPublication(stagingPath: string, moduleId: string, resultId: string): Promise<string> {
        await super.commitPublication(stagingPath, moduleId, resultId);
        throw new Error("injected failure after rename");
      }
    }
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-publish-rename-failure-")); roots.push(root);
    const storage = new RenameThenFailStorage(root); await storage.initialize();
    const database = new EdaDatabase(":memory:"); database.migrate(); const repositories = makeRepositories(database);
    const user = repositories.users.create({ username: "rename-failure-user", password: "a sufficiently strong password" });
    const at = new Date().toISOString(); const manifest: InputManifestV1 = { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: at };
    const job = repositories.jobs.createDraft(user.id, "digital", "run", "publication-failure", manifest); const workspace = await storage.createWorkspace(job.id);
    repositories.jobs.beginValidation(job.id);
    repositories.jobs.setDraft(job.id, manifest, {}, "test-capability", [], {}, { schemaVersion: "eda.job-plan.v1", capabilityVersion: "test-capability",
      steps: [{ id: "produce", name: "Produce", description: "write real output", required: true, weight: 1, process: null, inputRoles: [], outputRoles: ["result"] }], sweep: null, warnings: [] });
    repositories.jobs.start(job.id);
    const adapter: ModuleAdapterV1 = {
      moduleId: "digital", capabilities: async () => [], validateDraft: async () => ({ valid: true, errors: [], warnings: [] }), buildPlan: async () => { throw new Error("not used"); },
      executeStep: async () => { await fsp.writeFile(path.join(workspace, "output", "result.json"), JSON.stringify({ value: 42 })); return { exitCode: 0, outputs: {} }; },
      parseResult: async () => ({ title: "Result", summary: { value: 42 }, data: { value: 42 }, artifactRoles: ["result"], parserId: "test-parser", parserVersion: "1" }),
      publishResult: async () => {}, collectArtifacts: async () => [{ role: "result", relativePath: "output/result.json", mediaType: "application/json", required: true, publish: true }],
    };
    const registry = new ModuleRegistry(); registry.register(adapter);
    await new JobRunner(repositories, registry, storage, new SafeProcessRunner(100)).run(repositories.jobs.claim("digital")!);
    expect(repositories.jobs.get(job.id)).toMatchObject({ status: "failed", resultId: null });
    expect(repositories.results.list("digital", user.id, false)).toEqual([]);
    expect(await fsp.readdir(storage.resolve("results/digital"))).toEqual([]);
    database.close();
  });
});
