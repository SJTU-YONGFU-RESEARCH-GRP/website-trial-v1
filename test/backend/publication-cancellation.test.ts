import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InputManifestV1, ModuleAdapterV1, ModuleId } from "../../shared/contracts/v1.ts";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import { SafeProcessRunner } from "../../server/app/process/safeProcess.ts";
import { StorageService } from "../../server/app/storage/storage.ts";
import { JobRunner } from "../../server/worker/runner.ts";

const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const root of roots.splice(0)) await fsp.rm(root, { recursive: true, force: true }); });

// A controlled platform fixture: it writes a real JSON artifact, without claiming native ACG validation.
describe("cancel during atomic result publication", () => {
  it.each(["parse", "adapter-publish", "collect", "copy", "rename"])("honors persisted cancellation during %s and rolls back publication", async (phase) => {
    let enter!: () => void; let resume!: () => void;
    const reached = new Promise<void>((resolve) => { enter = resolve; });
    const released = new Promise<void>((resolve) => { resume = resolve; });
    const pause = async (current: string) => { if (current === phase) { enter(); await released; } };
    class PausingStorage extends StorageService {
      override async commitPublication(staging: string, moduleId: ModuleId, resultId: string): Promise<string> {
        const final = await super.commitPublication(staging, moduleId, resultId);
        await pause("rename"); return final;
      }
    }
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-cancel-publication-")); roots.push(root);
    const storage = new PausingStorage(root); await storage.initialize();
    const database = new EdaDatabase(":memory:"); database.migrate(); const repositories = makeRepositories(database);
    const user = repositories.users.create({ username: "cancel-publication", password: "a sufficiently strong password" });
    const at = new Date().toISOString(); const manifest: InputManifestV1 = { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: at };
    const job = repositories.jobs.createDraft(user.id, "acg", "run", "platform-fixture", manifest);
    const workspace = await storage.createWorkspace(job.id);
    repositories.jobs.beginValidation(job.id);
    repositories.jobs.setDraft(job.id, manifest, {}, "test", [], {}, { schemaVersion: "eda.job-plan.v1", capabilityVersion: "test", steps: [{ id: "produce", name: "Produce", description: "", required: true, weight: 1, process: null, inputRoles: [], outputRoles: ["result"] }], sweep: null, warnings: [] });
    repositories.jobs.start(job.id);
    const adapter: ModuleAdapterV1 = {
      moduleId: "acg", capabilities: async () => [], validateDraft: async () => ({ valid: true, errors: [], warnings: [] }), buildPlan: async () => { throw new Error("unused"); },
      executeStep: async () => { await fsp.writeFile(path.join(workspace, "output/result.json"), JSON.stringify({ value: 42 })); return { exitCode: 0, outputs: {} }; },
      parseResult: async () => { await pause("parse"); return { title: "Platform fixture", summary: { value: 42 }, data: { value: 42 }, artifactRoles: ["result"], parserId: "fixture", parserVersion: "1" }; },
      publishResult: async () => { await pause("adapter-publish"); },
      collectArtifacts: async () => { await pause("collect"); return [{ role: "result", relativePath: "output/result.json", mediaType: "application/json", required: true, publish: true }]; },
    };
    if (phase === "copy") {
      const copyFile = fsp.copyFile.bind(fsp);
      vi.spyOn(fsp, "copyFile").mockImplementation(async (...args) => { await copyFile(...args); await pause("copy"); });
    }
    const registry = new ModuleRegistry(); registry.register(adapter);
    const runner = new JobRunner(repositories, registry, storage, new SafeProcessRunner());
    const running = runner.run(repositories.jobs.claim("acg")!);
    try {
      await Promise.race([reached, running.then(() => { throw new Error("job finished before cancellation checkpoint"); })]);
      // Exercise another process's database cancellation request; do not call runner.cancel().
      repositories.jobs.requestCancel(job.id);
      resume(); await running;
      expect(repositories.jobs.get(job.id)).toMatchObject({ status: "cancelled", resultId: null, error: { type: "cancelled", code: "JOB_CANCELLED" } });
      expect(repositories.results.list("acg", user.id, false)).toEqual([]);
      expect(repositories.artifacts.listJob(job.id)).toEqual([]);
      expect(await fsp.readdir(storage.resolve("publishing/acg")).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; })).toEqual([]);
      expect(await fsp.readdir(storage.resolve("results/acg")).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; })).toEqual([]);
      expect(await fsp.readFile(path.join(workspace, "output/result.json"), "utf8")).toContain("42");
    } finally { resume(); await running; database.close(); }
  });
});
