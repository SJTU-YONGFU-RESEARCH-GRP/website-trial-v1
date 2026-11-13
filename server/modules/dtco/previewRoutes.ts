import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import type { ArtifactRecordV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { SafeProcessRunner } from "../../app/process/safeProcess.ts";
import { allowPublicRunner, assertOwnerOrAdmin } from "../../app/auth/guards.ts";
import { ApiError } from "../../app/api/errors.ts";
const rendererPath = fileURLToPath(new URL("../../../scripts/acg/render.py", import.meta.url));
const digest = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
const invalid = () => new ApiError(422, "DTCO_PREVIEW_INVALID", "The retained GDS could not be rendered safely.");
/** Per-app bounded memory cache. Never writes to retained job/result artifacts. */
export class DtcoGdsPreviewService {
  private readonly cache = new Map<string, Buffer>();
  private readonly pending = new Map<string, Promise<Buffer>>();
  private readonly abort = new AbortController();
  private tail: Promise<void> = Promise.resolve();
  constructor(private readonly repositories: Repositories, private readonly storage: StorageService, private readonly runner = new SafeProcessRunner(250)) {}
  async close(): Promise<void> { this.abort.abort(); await Promise.allSettled(this.pending.values()); this.cache.clear(); }
  async preview(artifact: ArtifactRecordV1): Promise<Buffer> {
    if (this.abort.signal.aborted) throw new ApiError(503, "DTCO_PREVIEW_UNAVAILABLE", "Preview service is closing.");
    let source: Buffer;
    try {
      const filename = await this.storage.resolveExisting(artifact.relativePath);
      const stat = await fs.stat(filename);
      if (!stat.isFile() || stat.size <= 0 || stat.size > 16 * 1024 * 1024 || stat.size !== artifact.sizeBytes) throw invalid();
      source = await fs.readFile(filename);
      if (digest(source) !== artifact.sha256) throw invalid();
    } catch { throw invalid(); }
    const tool = this.repositories.tools.active("acg").find(item => item.toolId === "acg-renderer");
    const health = tool && this.repositories.tools.latestHealth(tool.id);
    if (!tool?.interpreterPath || !tool.entryPoint || health?.status !== "healthy" || health.selfTestPassed !== true)
      throw new ApiError(503, "DTCO_PREVIEW_UNAVAILABLE", "The configured GDS preview renderer is unavailable.");
    let script: Buffer, interpreterHash: string;
    try {
      const entry = await fs.realpath(path.resolve(tool.rootPath ?? "", tool.entryPoint));
      if (entry !== await fs.realpath(rendererPath)) throw invalid();
      script = await fs.readFile(entry);
      interpreterHash = digest(await fs.readFile(await fs.realpath(tool.interpreterPath)));
    } catch { throw new ApiError(503, "DTCO_PREVIEW_UNAVAILABLE", "The trusted GDS preview renderer is unavailable."); }
    const key = digest(JSON.stringify([artifact.sha256, digest(script), interpreterHash, tool.id, tool.revision]));
    const cached = this.cache.get(key);
    if (cached) return cached;
    const pending = this.pending.get(key);
    if (pending) return pending;
    if (this.pending.size >= 8) throw new ApiError(503, "DTCO_PREVIEW_BUSY", "The layout preview queue is full. Try again shortly.");
    const computation = this.tail.then(() => {
      if (this.abort.signal.aborted) throw new ApiError(503, "DTCO_PREVIEW_UNAVAILABLE", "Preview service is closing.");
      return this.render(source, script, tool);
    }).then(bytes => {
      if (this.cache.size >= 16) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, bytes); return bytes;
    });
    this.tail = computation.then(() => {}, () => {});
    this.pending.set(key, computation);
    try { return await computation; } finally { this.pending.delete(key); }
  }
  private async render(source: Buffer, script: Buffer, tool: NonNullable<ReturnType<Repositories["tools"]["get"]>>): Promise<Buffer> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "eda-dtco-preview-"));
    try {
      await fs.chmod(directory, 0o700);
      await fs.mkdir(path.join(directory, "input"), { mode: 0o700 });
      await fs.writeFile(path.join(directory, "input/layout.gds"), source, { mode: 0o600 });
      await fs.writeFile(path.join(directory, "render.py"), script, { mode: 0o600 });
      const result = await this.runner.run(directory, {
        tool: { ...tool, entryPoint: path.join(directory, "render.py"), environment: {}, environmentNames: [] },
        argv: ["--input", "input", "--output", "preview"], cwd: directory, allowedCwdRoot: directory,
        timeoutSeconds: 20, maxOutputBytes: 1024 * 1024, abortSignal: this.abort.signal,
      });
      if (result.exitCode !== 0 || result.timedOut || result.outputLimitExceeded) throw invalid();
      const manifest = JSON.parse(await fs.readFile(path.join(directory, "preview/manifest.json"), "utf8"));
      const item = manifest.results?.[0];
      if (manifest.results?.length !== 1 || item?.status !== "available" || item.gdsPath !== "input/layout.gds" || item.previewPath !== "preview/layout.png" || item.sourceSha256 !== digest(source)) throw invalid();
      const filename = path.join(directory, "preview/layout.png"), stat = await fs.lstat(filename);
      if (!stat.isFile() || stat.size > 4 * 1024 * 1024) throw invalid();
      const bytes = await fs.readFile(filename);
      if (!bytes.subarray(0, 8).equals(pngSignature)) throw invalid();
      return bytes;
    } catch (error) { if (error instanceof ApiError) throw error; throw invalid(); }
    finally { await fs.rm(directory, { recursive: true, force: true }); }
  }
}
export function registerDtcoPreviewRoutes(app: FastifyInstance, repositories: Repositories, storage: StorageService): void {
  const service = new DtcoGdsPreviewService(repositories, storage);
  app.addHook("onClose", async () => service.close());
  app.get("/api/dtco/artifacts/:artifactId/preview", { preHandler: [allowPublicRunner(repositories)] }, async (request, reply) => {
    const artifact = repositories.artifacts.get(String((request.params as { artifactId: string }).artifactId));
    if (!artifact || artifact.moduleId !== "dtco" || !artifact.relativePath.endsWith(".gds")) throw new ApiError(404, "NOT_FOUND", "DTCO GDS artifact not found.");
    if (artifact.visibility !== "published") {
      assertOwnerOrAdmin(request, artifact.ownerId);
      if (request.edaUser?.role === "admin" && request.edaUser.id !== artifact.ownerId) repositories.audit.write(request.edaUser.id, "artifact.admin_preview", "artifact", artifact.id, { ownerId: artifact.ownerId }, request.ip, request.headers["user-agent"] || null);
    }
    const bytes = await service.preview(artifact);
    return reply.type("image/png").header("Cache-Control", "private, max-age=300").header("Content-Disposition", "inline; filename=layout.png").send(bytes);
  });
}
