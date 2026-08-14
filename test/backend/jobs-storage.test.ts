import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { InputManifestV1 } from "../../shared/contracts/v1.ts";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";
import { normalizeRelativePath, StorageService } from "../../server/app/storage/storage.ts";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fsp.rm(root, { recursive: true, force: true }))); });
const manifest: InputManifestV1 = { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: new Date().toISOString() };

describe("job state and storage", () => {
  it("enforces the state machine, isolates module claims, and recovers stale running rows", () => {
    const database = new EdaDatabase(":memory:"); database.migrate(); const repositories = makeRepositories(database);
    const user = repositories.users.create({ username: "worker-user", password: "a sufficiently strong password" });
    const benchmark = repositories.jobs.createDraft(user.id, "benchmark", "run", "test", manifest);
    const digital = repositories.jobs.createDraft(user.id, "digital", "run", "test", manifest);
    for (const job of [benchmark, digital]) {
      repositories.jobs.beginValidation(job.id);
      repositories.jobs.setDraft(job.id, manifest, {}, "test-v1", [], {}, { schemaVersion: "eda.job-plan.v1", capabilityVersion: "test-v1", steps: [{ id: "execute", name: "Execute", description: "", required: true, weight: 1, process: null, inputRoles: [], outputRoles: [] }], sweep: null, warnings: [] });
      repositories.jobs.start(job.id);
    }
    expect(repositories.jobs.claim("benchmark")?.id).toBe(benchmark.id);
    expect(repositories.jobs.get(digital.id)?.status).toBe("queued");
    expect(() => repositories.jobs.transition(digital.id, "succeeded")).toThrow(/invalid job transition/);
    expect(repositories.jobs.recoverRunning()).toBe(1); expect(repositories.jobs.get(benchmark.id)?.status).toBe("interrupted");
    database.close();
  });

  it("contains paths and atomically renames publications", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-storage-test-")); roots.push(root);
    const storage = new StorageService(root); await storage.initialize(); await storage.createWorkspace("job-safe");
    expect(() => normalizeRelativePath("../escape")).toThrow(); expect(() => storage.resolve("/etc/passwd")).toThrow();
    await fsp.writeFile(storage.resolve("jobs/job-safe/output/result.txt"), "real output");
    const staging = await storage.beginPublication("digital", "result-safe"); await fsp.writeFile(path.join(staging, "result.txt"), "real output");
    const finalPath = await storage.commitPublication(staging, "digital", "result-safe");
    expect(await fsp.readFile(path.join(finalPath, "result.txt"), "utf8")).toBe("real output");
    await expect(fsp.access(staging)).rejects.toThrow();
  });

  it("reconciles stale staging and a crash-orphaned final result on worker startup", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-storage-recovery-")); roots.push(root);
    const storage = new StorageService(root); await storage.initialize();
    const staging = await storage.beginPublication("digital", "not-committed");
    await fsp.writeFile(path.join(staging, "partial.txt"), "partial");
    const renamed = await storage.beginPublication("digital", "orphan-result");
    await fsp.writeFile(path.join(renamed, "result.txt"), "complete but not committed");
    await storage.commitPublication(renamed, "digital", "orphan-result");
    const retained = await storage.beginPublication("digital", "retained-result");
    await fsp.writeFile(path.join(retained, "result.txt"), "committed");
    await storage.commitPublication(retained, "digital", "retained-result");
    const outcome = await storage.reconcilePublications({ benchmark: new Set(), digital: new Set(["retained-result"]), ppa: new Set() });
    expect(outcome).toEqual({ stagingRemoved: 1, orphanResultsRemoved: 1 });
    await expect(fsp.access(staging)).rejects.toThrow();
    await expect(fsp.access(storage.resolve("results/digital/orphan-result"))).rejects.toThrow();
    expect(await fsp.readFile(storage.resolve("results/digital/retained-result/result.txt"), "utf8")).toBe("committed");
  });
});
