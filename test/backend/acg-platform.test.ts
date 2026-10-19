import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MODULE_IDS, type InputManifestV1, type ResultRecordV1 } from "../../shared/contracts/v1.ts";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";
import { migration001 } from "../../server/migrations/001_initial.ts";
import { migration002 } from "../../server/migrations/002_cancellation.ts";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";
import { StorageService } from "../../server/app/storage/storage.ts";
import { createDefaultModuleRegistry } from "../../server/app/modules/defaultRegistry.ts";

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await fsp.rm(root, { recursive: true, force: true }); });
function oldDatabase(): EdaDatabase {
  const db = new EdaDatabase(":memory:");
  db.sqlite.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT;");
  for (const migration of [migration001, migration002]) {
    db.sqlite.exec(migration.sql);
    db.sqlite.prepare("INSERT INTO schema_migrations VALUES (?,?,?)").run(migration.version, migration.name, "2026-10-06T00:00:00Z");
  }
  return db;
}
function record(id: string, ownerId: string, lifecycle: "private" | "published" = "private"): ResultRecordV1 {
  const at = new Date().toISOString();
  return { schemaVersion: "eda.result.v1", id, moduleId: "acg", ownerId, lifecycle, title: id, summary: { engine: "cmos" }, data: { acg: { cells: [] } },
    provenance: { origin: "computed", jobId: null, ownerId, inputManifestSha256: "", parameters: {}, capabilityVersion: "test", toolConfigurations: [], toolVersions: {}, parserId: "platform-test", parserVersion: "1", createdAt: at },
    artifactIds: [], createdAt: at, updatedAt: at, publishedAt: lifecycle === "published" ? at : null };
}

describe("ACG shared platform integration", () => {
  it("migrates old core data idempotently and grants only the existing public runner", () => {
    const database = oldDatabase(); const repositories = makeRepositories(database);
    const publicUser = repositories.users.create({ username: "public-runner", password: "strong existing password", allowedModules: ["benchmark", "digital", "ppa"] });
    const restricted = repositories.users.create({ username: "restricted-user", password: "strong existing password", allowedModules: ["digital"] });
    const at = new Date().toISOString(); const manifest: InputManifestV1 = { schemaVersion: "eda.input-manifest.v1", files: [], fileCount: 0, totalBytes: 0, rootHint: null, createdAt: at };
    repositories.users.patch(publicUser.id, { enabled: false });
    const oldJob = repositories.jobs.createDraft(restricted.id, "digital", "run", "preserved", manifest);
    const before = JSON.stringify(repositories.jobs.get(oldJob.id)); const restrictedBefore = JSON.stringify(repositories.users.get(restricted.id));
    const oldSchemas = database.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name!='schema_migrations' ORDER BY name").all();
    database.migrate(); database.migrate();
    expect(JSON.stringify(repositories.jobs.get(oldJob.id))).toBe(before);
    expect(JSON.stringify(repositories.users.get(restricted.id))).toBe(restrictedBefore);
    expect(repositories.users.get(publicUser.id)?.allowedModules).toEqual(MODULE_IDS);
    expect(repositories.users.get(publicUser.id)?.enabled).toBe(false);
    expect(database.sqlite.prepare("SELECT COUNT(*) count FROM schema_migrations").get()?.count).toBe(3);
    for (const old of oldSchemas) expect(database.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name=?").get(String(old.name))?.sql).toBe(old.sql);
    expect(() => database.sqlite.prepare("INSERT INTO acg_results VALUES (?,?,?,?,?,?,?)").run("invalid", publicUser.id, "bogus", "{}", at, at, null)).toThrow(/CHECK/);
    const fresh = repositories.users.create({ username: "fresh-user", password: "strong existing password" });
    expect(fresh.allowedModules).toEqual(MODULE_IDS);
    expect(() => repositories.users.patch(fresh.id, { allowedModules: ["invalid" as never] })).toThrow("invalid allowed module");
    database.close();
  });

  it("registers the actual ACG adapter, uploads ACG drafts and protects result ownership", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "acg-platform-api-")); roots.push(root);
    const app = await createEdaApp({ config: loadConfig({ NODE_ENV: "test", EDA_STORAGE_ROOT: root }), registry: createDefaultModuleRegistry(), startWorkers: false, serveFrontend: false, logger: false });
    try {
      const capabilities = await app.inject({ method: "GET", url: "/api/modules/acg/capabilities" });
      expect(capabilities.statusCode, capabilities.body).toBe(200); expect(capabilities.json().data.configured).toBe(true);
      expect((await app.inject({ method: "GET", url: "/api/health" })).json().data.queues).toEqual(MODULE_IDS);
      const boundary = "acg-platform"; const name = Buffer.from("cells/input.sp").toString("base64url");
      const body = Buffer.from("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file:" + name + "\"; filename=\"input.sp\"\r\nContent-Type: text/plain\r\n\r\n.subckt INV A Y VDD VSS\n.ends\n\r\n--" + boundary + "--\r\n");
      const upload = await app.inject({ method: "POST", url: "/api/modules/acg/drafts", headers: { "content-type": "multipart/form-data; boundary=" + boundary }, payload: body });
      expect(upload.statusCode, upload.body).toBe(201); const job = upload.json().data.job;
      expect(job.moduleId).toBe("acg"); expect(job.inputManifest.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
      expect((await app.inject({ method: "GET", url: "/api/jobs?moduleId=acg" })).body).toContain(job.id);
      const other = app.eda.repositories.users.create({ username: "private-owner", password: "strong existing password" });
      app.eda.repositories.results.insert(record("public-result", other.id, "published"));
      app.eda.repositories.results.insert(record("private-result", other.id));
      expect((await app.inject({ method: "GET", url: "/api/acg/results" })).body).toContain("public-result");
      expect((await app.inject({ method: "GET", url: "/api/acg/results" })).body).not.toContain("private-result");
      expect((await app.inject({ method: "GET", url: "/api/results/acg/private-result" })).statusCode).toBe(404);
      const session = app.eda.repositories.sessions.create(other.id, 1);
      expect((await app.inject({ method: "GET", url: "/api/results/acg/private-result", headers: { cookie: "eda_session=" + session.sessionId } })).statusCode).toBe(200);
      expect((await app.inject({ method: "GET", url: "/api/results/invalid/public-result" })).statusCode).toBe(400);
      expect((await app.inject({ method: "GET", url: "/api/jobs?moduleId=invalid" })).statusCode).toBe(400);
      const admin = app.eda.repositories.users.create({ username: "platform-admin", password: "strong existing password", role: "admin" });
      const adminSession = app.eda.repositories.sessions.create(admin.id, 1); const headers = { cookie: "eda_session=" + adminSession.sessionId };
      expect((await app.inject({ method: "GET", url: "/api/admin/results?moduleId=acg", headers })).body).toContain("private-result");
      expect((await app.inject({ method: "GET", url: "/api/admin/overview", headers })).json().data.resultCounts.acg).toBe(2);
      expect((await app.inject({ method: "GET", url: "/api/admin/results?moduleId=invalid", headers })).statusCode).toBe(400);
    } finally { await app.close(); }
  });

  it("reconciles ACG publications with the same durable ownership rules", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "acg-platform-storage-")); roots.push(root);
    const storage = new StorageService(root); await storage.initialize();
    for (const id of ["retained", "orphan"]) { const folder = storage.resolve("results/acg/" + id); await fsp.mkdir(folder, { recursive: true }); await fsp.writeFile(path.join(folder, "evidence.txt"), id); }
    const expected = Object.fromEntries(MODULE_IDS.map((module) => [module, new Set<string>(module === "acg" ? ["retained"] : [])])) as Record<typeof MODULE_IDS[number], Set<string>>;
    expect(await storage.reconcilePublications(expected)).toEqual({ stagingRemoved: 0, orphanResultsRemoved: 1 });
    expect(await fsp.readFile(storage.resolve("results/acg/retained/evidence.txt"), "utf8")).toBe("retained");
    expect(await fsp.readdir(storage.resolve("results/acg"))).toEqual(["retained"]);
    expect(loadConfig({}).queueConcurrency.acg).toBe(1);
    expect(loadConfig({ EDA_ACG_CONCURRENCY: "2" }).queueConcurrency.acg).toBe(2);
  });
});
