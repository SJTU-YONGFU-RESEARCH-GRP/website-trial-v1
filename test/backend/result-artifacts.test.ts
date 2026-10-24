import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { ArtifactRecordV1, InputManifestV1, ResultRecordV1 } from "../../shared/contracts/v1.ts";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";
import { createDefaultModuleRegistry } from "../../server/app/modules/defaultRegistry.ts";

function zipFiles(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(end).toBeGreaterThanOrEqual(0);
  let offset = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    expect(buffer.readUInt32LE(offset)).toBe(0x02014b50);
    const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString();
    const local = buffer.readUInt32LE(offset + 42);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    expect(files.has(name)).toBe(false);
    files.set(name, method === 8 ? inflateRawSync(buffer.subarray(start, start + size)) : buffer.subarray(start, start + size));
    offset += 46 + nameLength + extra + comment;
  }
  return files;
}

describe("result-scoped artifact ACL and ZIP", () => {
  it("allows published readers metadata/downloads without private job logs and retains per-cell paths", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-result-artifacts-"));
    const app = await createEdaApp({ config: loadConfig({ NODE_ENV: "test", EDA_STORAGE_ROOT: root }), registry: createDefaultModuleRegistry(), startWorkers: false, serveFrontend: false, logger: false });
    try {
      const repo = app.eda.repositories, at = new Date().toISOString();
      const owner = repo.users.create({ username: "artifact-owner", password: "strong test password" });
      const reader = repo.users.create({ username: "artifact-reader", password: "strong test password" });
      const admin = repo.users.create({ username: "artifact-admin", password: "strong test password", role: "admin" });
      const auth = (id: string) => ({ cookie: "eda_session=" + repo.sessions.create(id, 1).sessionId });
      const ownerHeaders = auth(owner.id), readerHeaders = auth(reader.id), adminHeaders = auth(admin.id);
      const manifest: InputManifestV1 = { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: at };
      const job = repo.jobs.createDraft(owner.id, "acg", "run", "test", manifest);
      const result: ResultRecordV1 = { schemaVersion: "eda.result.v1", id: "retained-result", moduleId: "acg", ownerId: owner.id, lifecycle: "private", title: "Two cells", summary: {}, data: { acg: { cells: [] } },
        provenance: { origin: "computed", jobId: job.id, ownerId: owner.id, inputManifestSha256: "", parameters: {}, capabilityVersion: "test", toolConfigurations: [], toolVersions: {}, parserId: "test", parserVersion: "1", createdAt: at },
        artifactIds: ["cell-a", "cell-b", "same-path"], createdAt: at, updatedAt: at, publishedAt: null };
      repo.results.insert(result);
      const add = async (id: string, relativePath: string, text: string, resultId: string | null) => {
        const destination = app.eda.storage.resolve(relativePath); await fsp.mkdir(path.dirname(destination), { recursive: true }); await fsp.writeFile(destination, text);
        const artifact: ArtifactRecordV1 = { id, jobId: job.id, resultId, ownerId: owner.id, moduleId: "acg", stepId: null, role: "verification", relativePath, mediaType: "text/plain", sizeBytes: Buffer.byteLength(text), sha256: createHash("sha256").update(text).digest("hex"), visibility: "private", createdAt: at };
        repo.artifacts.insert(artifact);
      };
      await add("cell-a", "results/acg/retained-result/output/pv/A/report.json", "cell A", result.id);
      await add("cell-b", "results/acg/retained-result/output/pv/B/report.json", "cell B", result.id);
      await add("same-path", "results/acg/retained-result/output/pv/A/report.json", "cell A", result.id);
      await add("private-log", "jobs/" + job.id + "/logs/native.stdout.log", "PRIVATE JOB LOG", null);
      const base = "/api/results/acg/" + result.id;
      for (const suffix of ["/artifacts", "/artifacts.zip"]) {
        expect((await app.inject({ method: "GET", url: base + suffix, headers: readerHeaders })).statusCode).toBe(404);
        expect((await app.inject({ method: "GET", url: base + suffix, headers: ownerHeaders })).statusCode).toBe(200);
        expect((await app.inject({ method: "GET", url: base + suffix, headers: adminHeaders })).statusCode).toBe(200);
      }
      repo.results.patchLifecycle("acg", result.id, "published");
      const metadata = await app.inject({ method: "GET", url: base + "/artifacts", headers: readerHeaders });
      expect(metadata.statusCode).toBe(200); expect(metadata.json().data.map((a: ArtifactRecordV1) => a.id)).toEqual(["cell-a", "cell-b", "same-path"]);
      expect(metadata.body).not.toContain("private-log");
      expect((await app.inject({ method: "GET", url: "/api/jobs/" + job.id, headers: readerHeaders })).statusCode).toBe(404);
      expect((await app.inject({ method: "GET", url: "/api/jobs/" + job.id + "/artifacts.zip", headers: readerHeaders })).statusCode).toBe(404);
      expect((await app.inject({ method: "GET", url: "/api/artifacts/cell-a/download", headers: readerHeaders })).body).toBe("cell A");
      const response = await app.inject({ method: "GET", url: base + "/artifacts.zip", headers: readerHeaders });
      expect(response.statusCode).toBe(200); expect(response.headers["content-type"]).toBe("application/zip");
      const zip = zipFiles(response.rawPayload), prefix = "artifacts/results/acg/retained-result/output/pv/";
      expect(zip.get(prefix + "A/report.json")?.toString()).toBe("cell A");
      expect(zip.get(prefix + "B/report.json")?.toString()).toBe("cell B");
      expect(zip.get(prefix + "A/report~1.json")?.toString()).toBe("cell A");
      expect(zip.has("result.json")).toBe(true); expect(zip.has("job.json")).toBe(false);
      expect([...zip.values()].some((data) => data.includes("PRIVATE JOB LOG"))).toBe(false);
      const jobZip = zipFiles((await app.inject({ method: "GET", url: "/api/jobs/" + job.id + "/artifacts.zip", headers: ownerHeaders })).rawPayload);
      expect(jobZip.get(prefix + "A/report.json")?.toString()).toBe("cell A");
      expect(jobZip.get(prefix + "B/report.json")?.toString()).toBe("cell B");
      for (const lifecycle of ["unpublished", "deleted"] as const) {
        repo.results.patchLifecycle("acg", result.id, lifecycle);
        for (const suffix of ["/artifacts", "/artifacts.zip"]) expect((await app.inject({ method: "GET", url: base + suffix, headers: readerHeaders })).statusCode).toBe(404);
        expect((await app.inject({ method: "GET", url: "/api/artifacts/cell-a/download", headers: readerHeaders })).statusCode).toBe(404);
      }
    } finally { await app.close(); await fsp.rm(root, { recursive: true, force: true }); }
  });
});
