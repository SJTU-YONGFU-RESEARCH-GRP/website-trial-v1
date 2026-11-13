import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DtcoGdsPreviewService } from "../../server/modules/dtco/previewRoutes.ts";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";
import { SafeProcessRunner } from "../../server/app/process/safeProcess.ts";
const roots: string[] = [];
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const png = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from("test-image")]);
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });
async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dtco-preview-test-")); roots.push(root);
  const app = await createEdaApp({ config: loadConfig({ EDA_STORAGE_ROOT: root }), startWorkers: false, serveFrontend: false, logger: false });
  const repos = app.eda.repositories;
  const owner = repos.users.create({ username: "preview-owner", password: "strong-password" });
  const other = repos.users.create({ username: "preview-other", password: "strong-password" });
  const session = repos.sessions.create(owner.id, 1), otherSession = repos.sessions.create(other.id, 1);
  const tool = repos.tools.save({ toolId: "acg-renderer", moduleId: "acg", adapterId: "acg", adapterVersion: "1", enabled: true, executablePath: null, interpreterPath: process.execPath, rootPath: process.cwd(), entryPoint: "scripts/acg/render.py", workingDirectory: null, timeoutSeconds: 30, maxConcurrency: 1, environment: {}, environmentNames: [], versionProbeArgv: [] });
  repos.tools.addHealth({ id: randomUUID(), toolConfigurationId: tool.id, status: "healthy", version: "1", checkedAt: new Date().toISOString(), durationMs: 1, message: "test", missingDependencies: [], selfTestPassed: true });
  const manifest: any = { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: new Date().toISOString() };
  const job = repos.jobs.createDraft(owner.id, "dtco", "run", "test", manifest);
  const source = Buffer.from("GDS-test-source"), relative = "jobs/" + job.id + "/layout.gds";
  await fs.mkdir(path.dirname(app.eda.storage.resolve(relative)), { recursive: true });
  await fs.writeFile(app.eda.storage.resolve(relative), source);
  const artifact: any = { id: randomUUID(), jobId: job.id, resultId: null, ownerId: owner.id, moduleId: "dtco", stepId: null, role: "dtco-evidence", relativePath: relative, mediaType: "application/octet-stream", sizeBytes: source.length, sha256: sha(source), visibility: "private", createdAt: new Date().toISOString() };
  repos.artifacts.insert(artifact);
  return { app, artifact, headers: { cookie: "eda_session=" + session.sessionId }, otherHeaders: { cookie: "eda_session=" + otherSession.sessionId } };
}
function successfulRenderer() {
  return vi.spyOn(SafeProcessRunner.prototype, "run").mockImplementation(async (_key, options) => {
    const input = await fs.readFile(path.join(options.cwd, "input/layout.gds"));
    await fs.mkdir(path.join(options.cwd, "preview"));
    await fs.writeFile(path.join(options.cwd, "preview/layout.png"), png);
    await fs.writeFile(path.join(options.cwd, "preview/manifest.json"), JSON.stringify({ results: [{ status: "available", gdsPath: "input/layout.gds", previewPath: "preview/layout.png", sourceSha256: sha(input) }] }));
    return { exitCode: 0, signal: null, processId: 1, processGroupId: 1, timedOut: false, outputLimitExceeded: false };
  });
}
describe("DTCO retained GDS preview", () => {
  it("serves only authorized actual DTCO GDS and caches successful rendering", async () => {
    const { app, artifact, headers, otherHeaders } = await setup(); const run = successfulRenderer();
    try {
      const url = "/api/dtco/artifacts/" + artifact.id + "/preview";
      expect((await app.inject({ url, headers: otherHeaders })).statusCode).toBe(404);
      expect((await app.inject({ url: "/api/dtco/artifacts/missing/preview", headers })).statusCode).toBe(404);
      const first = await app.inject({ url, headers }); expect(first.statusCode).toBe(200); expect(first.headers["content-type"]).toBe("image/png"); expect(first.rawPayload).toEqual(png);
      expect((await app.inject({ url, headers })).statusCode).toBe(200); expect(run).toHaveBeenCalledTimes(1);
      await fs.writeFile(app.eda.storage.resolve(artifact.relativePath), "changed");
      expect((await app.inject({ url, headers })).statusCode).toBe(422);
    } finally { await app.close(); }
  });
  it("rejects path escape, symlink escape and changed artifact content before rendering", async () => {
    const { app, artifact } = await setup(); const run = successfulRenderer();
    try {
      const service = new DtcoGdsPreviewService(app.eda.repositories, app.eda.storage);
      await expect(service.preview({ ...artifact, relativePath: "../outside.gds" })).rejects.toMatchObject({ statusCode: 422 });
      await fs.symlink("/etc/passwd", app.eda.storage.resolve("escape.gds"));
      await expect(service.preview({ ...artifact, relativePath: "escape.gds" })).rejects.toMatchObject({ statusCode: 422 });
      await expect(service.preview({ ...artifact, sha256: "0".repeat(64) })).rejects.toMatchObject({ statusCode: 422 });
      expect(run).not.toHaveBeenCalled(); service.close();
    } finally { await app.close(); }
  });
  it("deduplicates equal requests, bounds concurrent rendering, and cleans failed workspaces", async () => {
    const { app, artifact } = await setup();
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let work = "";
    const run = vi.spyOn(SafeProcessRunner.prototype, "run").mockImplementation(async (_key, options) => {
      work = options.cwd; await gate;
      return { exitCode: 1, signal: null, processId: 1, processGroupId: 1, timedOut: true, outputLimitExceeded: false };
    });
    const service = new DtcoGdsPreviewService(app.eda.repositories, app.eda.storage);
    try {
      const a = service.preview(artifact), b = service.preview(artifact);
      const outcomes = Promise.allSettled([a, b]);
      await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1), { timeout: 5000 });
      const changed = Buffer.from("other-source"); await fs.writeFile(app.eda.storage.resolve("other.gds"), changed);
      const second = service.preview({ ...artifact, relativePath: "other.gds", sha256: sha(changed), sizeBytes: changed.length });
      const secondOutcome = Promise.allSettled([second]);
      release(); expect((await outcomes).every(r => r.status === "rejected")).toBe(true);
      expect((await secondOutcome)[0]?.status).toBe("rejected");
      await expect(fs.stat(work)).rejects.toThrow(); expect(run).toHaveBeenCalledTimes(2);
    } finally { release(); service.close(); await app.close(); }
  });
});
