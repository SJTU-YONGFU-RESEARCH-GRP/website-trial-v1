import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { ModuleId } from "../../../shared/contracts/v1.ts";

export function normalizeRelativePath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || normalized.length > 1024 || normalized.startsWith("/") || normalized.includes("\0") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error("path must be a non-empty relative POSIX path");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) throw new Error("path contains an unsafe segment");
  return segments.join("/");
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export class StorageService {
  private realRoot = "";
  constructor(readonly root: string) {}

  async initialize(): Promise<void> {
    await fsp.mkdir(this.root, { recursive: true, mode: 0o750 });
    this.realRoot = await fsp.realpath(this.root);
    for (const directory of ["jobs", "drafting", "publishing", "results"]) await fsp.mkdir(path.join(this.realRoot, directory), { recursive: true, mode: 0o750 });
  }

  resolve(relativePath: string): string {
    if (!this.realRoot) throw new Error("storage is not initialized");
    const normalized = normalizeRelativePath(relativePath);
    const candidate = path.resolve(this.realRoot, ...normalized.split("/"));
    if (!isWithin(this.realRoot, candidate)) throw new Error("path escapes storage root");
    return candidate;
  }

  async resolveExisting(relativePath: string): Promise<string> {
    const candidate = this.resolve(relativePath);
    const real = await fsp.realpath(candidate);
    if (!isWithin(this.realRoot, real)) throw new Error("resolved path escapes storage root");
    return real;
  }

  async safeDestination(relativePath: string): Promise<string> {
    const candidate = this.resolve(relativePath);
    await fsp.mkdir(path.dirname(candidate), { recursive: true, mode: 0o750 });
    const parent = await fsp.realpath(path.dirname(candidate));
    if (!isWithin(this.realRoot, parent)) throw new Error("destination parent escapes storage root");
    return candidate;
  }

  async createWorkspace(jobId: string): Promise<string> {
    const jobRoot = this.resolve(`jobs/${normalizeRelativePath(jobId)}`);
    await fsp.mkdir(jobRoot, { recursive: false, mode: 0o750 });
    await Promise.all(["input", "work", "output", "logs", "artifacts"].map((name) => fsp.mkdir(path.join(jobRoot, name), { mode: 0o750 })));
    return jobRoot;
  }

  async createDraftArea(): Promise<{ id: string; path: string }> {
    const id = randomUUID(); const draftPath = this.resolve(`drafting/${id}`);
    await fsp.mkdir(draftPath, { mode: 0o750 });
    return { id, path: draftPath };
  }

  async adoptDraft(draftPath: string, jobId: string): Promise<string> {
    const realDraft = await fsp.realpath(draftPath);
    if (!isWithin(this.resolve("drafting"), realDraft)) throw new Error("draft path is outside drafting root");
    const workspace = await this.createWorkspace(jobId);
    await fsp.rm(path.join(workspace, "input"), { recursive: true });
    await fsp.rename(realDraft, path.join(workspace, "input"));
    return workspace;
  }

  async writeManifest(jobId: string, manifest: unknown): Promise<void> {
    const destination = await this.safeDestination(`jobs/${jobId}/manifest.json`);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await fsp.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o640, flag: "wx" });
    await fsp.rename(temporary, destination);
  }

  async freezeInputs(jobId: string): Promise<void> {
    const root = await this.resolveExisting(`jobs/${normalizeRelativePath(jobId)}/input`); const pending = [root];
    while (pending.length) {
      const current = pending.pop()!; const entries = await fsp.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const candidate = path.join(current, entry.name); const stat = await fsp.lstat(candidate);
        if (stat.isSymbolicLink() || !stat.isFile() && !stat.isDirectory()) throw new Error("input workspace contains a symbolic link or special file");
        if (stat.isDirectory()) pending.push(candidate); else await fsp.chmod(candidate, 0o440);
      }
      await fsp.chmod(current, 0o550);
    }
  }

  async beginPublication(moduleId: string, resultId: string): Promise<string> {
    const temporary = this.resolve(`publishing/${normalizeRelativePath(moduleId)}/${normalizeRelativePath(resultId)}-${randomUUID()}`);
    await fsp.mkdir(temporary, { recursive: true, mode: 0o750 });
    return temporary;
  }

  async commitPublication(stagingPath: string, moduleId: string, resultId: string): Promise<string> {
    const realStaging = await fsp.realpath(stagingPath);
    if (!isWithin(this.resolve("publishing"), realStaging)) throw new Error("publication staging path is outside publishing root");
    const finalPath = this.resolve(`results/${normalizeRelativePath(moduleId)}/${normalizeRelativePath(resultId)}`);
    await fsp.mkdir(path.dirname(finalPath), { recursive: true, mode: 0o750 });
    if (fs.existsSync(finalPath)) throw new Error("result destination already exists");
    await fsp.rename(realStaging, finalPath);
    return finalPath;
  }

  async removePublication(moduleId: string, resultId: string): Promise<void> {
    const target = this.resolve(`results/${normalizeRelativePath(moduleId)}/${normalizeRelativePath(resultId)}`);
    await fsp.rm(target, { recursive: true, force: true });
  }

  /**
   * Worker-start recovery for a crash between filesystem rename and the result
   * database transaction. Only the worker invokes this while no other worker
   * may publish against the same SQLite database.
   */
  async reconcilePublications(expectedResultIds: Record<ModuleId, ReadonlySet<string>>): Promise<{ stagingRemoved: number; orphanResultsRemoved: number }> {
    let stagingRemoved = 0; let orphanResultsRemoved = 0;
    const publishingRoot = this.resolve("publishing");
    for (const entry of await fsp.readdir(publishingRoot, { withFileTypes: true })) {
      await fsp.rm(path.join(publishingRoot, entry.name), { recursive: true, force: true });
      stagingRemoved += 1;
    }
    for (const moduleId of ["benchmark", "digital", "ppa"] as const) {
      const moduleRoot = this.resolve(`results/${moduleId}`);
      await fsp.mkdir(moduleRoot, { recursive: true, mode: 0o750 });
      for (const entry of await fsp.readdir(moduleRoot, { withFileTypes: true })) {
        const retained = entry.isDirectory() && !entry.isSymbolicLink() && expectedResultIds[moduleId].has(entry.name);
        if (retained) continue;
        await fsp.rm(path.join(moduleRoot, entry.name), { recursive: true, force: true });
        orphanResultsRemoved += 1;
      }
    }
    return { stagingRemoved, orphanResultsRemoved };
  }

  async digest(relativePath: string): Promise<{ sizeBytes: number; sha256: string }> {
    const filePath = await this.resolveExisting(relativePath); const stat = await fsp.lstat(filePath);
    if (!stat.isFile()) throw new Error("artifact is not a regular file");
    const hash = createHash("sha256"); let sizeBytes = 0;
    await new Promise<void>((resolvePromise, reject) => {
      const stream = fs.createReadStream(filePath);
      stream.on("data", (chunk: Buffer) => { sizeBytes += chunk.length; hash.update(chunk); });
      stream.on("error", reject); stream.on("end", resolvePromise);
    });
    return { sizeBytes, sha256: hash.digest("hex") };
  }

  async usage(): Promise<{ totalBytes: number; fileCount: number; byArea: Record<string, number> }> {
    const byArea: Record<string, number> = {};
    let totalBytes = 0; let fileCount = 0;
    for (const area of ["jobs", "drafting", "publishing", "results"]) {
      const root = this.resolve(area); const pending = [root]; let bytes = 0;
      while (pending.length) {
        const current = pending.pop()!;
        for (const entry of await fsp.readdir(current, { withFileTypes: true })) {
          const candidate = path.join(current, entry.name); const stat = await fsp.lstat(candidate);
          if (stat.isSymbolicLink()) continue;
          if (stat.isDirectory()) pending.push(candidate);
          else if (stat.isFile()) { bytes += stat.size; fileCount += 1; }
        }
      }
      byArea[area] = bytes; totalBytes += bytes;
    }
    return { totalBytes, fileCount, byArea };
  }

  async cleanupJobWorkingData(jobId: string): Promise<void> {
    const workspace = await this.resolveExisting(`jobs/${normalizeRelativePath(jobId)}`);
    for (const area of ["work", "output"]) {
      const target = path.join(workspace, area);
      await fsp.rm(target, { recursive: true, force: true });
      await fsp.mkdir(target, { mode: 0o750 });
    }
  }
}
