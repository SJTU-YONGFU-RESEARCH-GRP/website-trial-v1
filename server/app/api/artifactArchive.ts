import { PassThrough } from "node:stream";
import path from "node:path";
import { ZipArchive } from "archiver";
import type { ArtifactRecordV1 } from "../../../shared/contracts/v1.ts";
import { normalizeRelativePath, type StorageService } from "../storage/storage.ts";

/** Keep full retained paths, including cell directories, without ambiguous ZIP entries. */
export async function artifactArchive(storage: StorageService, artifacts: ArtifactRecordV1[], manifestName: string, manifest: unknown): Promise<PassThrough> {
  const output = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.once("error", (error: Error) => output.destroy(error));
  archive.pipe(output);
  archive.append(`${JSON.stringify(manifest, null, 2)}\n`, { name: manifestName });
  const used = new Set<string>([manifestName.toLowerCase()]);
  for (const artifact of artifacts) {
    try {
      const relative = normalizeRelativePath(artifact.relativePath);
      const source = await storage.resolveExisting(relative);
      const preferred = `artifacts/${relative}`;
      let name = preferred;
      let suffix = 1;
      while (used.has(name.toLowerCase())) {
        const extension = path.posix.extname(preferred);
        name = preferred.slice(0, preferred.length - extension.length) + `~${suffix++}` + extension;
      }
      used.add(name.toLowerCase());
      archive.file(source, { name });
    } catch {
      // Artifact paths/IDs are DB values, but keep missing-file entries extraction-safe too.
      const safeId = artifact.id.replace(/[^A-Za-z0-9_.-]/g, "_") || "unknown";
      let name = `missing/${safeId}.txt`; let suffix = 1;
      while (used.has(name.toLowerCase())) name = `missing/${safeId}~${suffix++}.txt`;
      used.add(name.toLowerCase());
      archive.append(`Missing retained artifact: ${artifact.relativePath}\n`, { name });
    }
  }
  void archive.finalize();
  return output;
}
