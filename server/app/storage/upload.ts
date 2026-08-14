import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { MultipartFile, MultipartValue } from "@fastify/multipart";
import type { InputFileV1, InputManifestV1, ModuleId } from "../../../shared/contracts/v1.ts";
import { normalizeRelativePath } from "./storage.ts";

export interface UploadLimits { maxFiles: number; maxFileBytes: number; maxTotalBytes: number; }
const TEXT_EXTENSIONS = new Set([".v", ".sv", ".vh", ".sdc", ".lib", ".lef", ".def", ".spef", ".sp", ".cir", ".scs", ".model", ".csv", ".json", ".yaml", ".yml", ".txt", ".rpt", ".log", ".tcl", ".py", ".sh", ".mk"]);
const NEVER_EXECUTE = new Set([".sh", ".py", ".tcl", ".mk"]);
export class UploadValidationError extends Error { readonly statusCode = 400; }

function relativePathForPart(part: MultipartFile): string {
  if (part.fieldname.startsWith("file:")) {
    try { return normalizeRelativePath(Buffer.from(part.fieldname.slice(5), "base64url").toString("utf8")); }
    catch { throw new UploadValidationError("invalid encoded relative path"); }
  }
  try { return normalizeRelativePath(part.filename); } catch (error) { throw new UploadValidationError(error instanceof Error ? error.message : String(error)); }
}

function recognize(relativePath: string, mediaType: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  const types: Record<string, string> = { ".v": "verilog", ".sv": "systemverilog", ".lib": "liberty", ".sdc": "sdc", ".lef": "lef", ".def": "def", ".gds": "gdsii", ".spef": "spef", ".sp": "spice", ".cir": "spice", ".scs": "spectre", ".model": "spice-model", ".csv": "csv", ".json": "json", ".gz": "gzip", ".zip": "zip" };
  return types[extension] || (mediaType.startsWith("text/") ? "text" : "binary");
}

function validateSignature(relativePath: string, prefix: Buffer): string[] {
  const extension = path.extname(relativePath).toLowerCase(); const errors: string[] = [];
  if (extension === ".gz" && !(prefix[0] === 0x1f && prefix[1] === 0x8b)) errors.push("gzip extension does not match file signature");
  if (extension === ".zip" && prefix.subarray(0, 4).toString("binary") !== "PK\u0003\u0004") errors.push("zip extension does not match file signature");
  if (extension === ".png" && !prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) errors.push("PNG extension does not match file signature");
  if (TEXT_EXTENSIONS.has(extension) && (prefix.includes(0) || prefix.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])))) errors.push("text extension does not match binary file signature");
  return errors;
}

function includeTargets(text: string): string[] {
  const targets: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const spice = /^\s*\.include\s+(?:"([^"]+)"|'([^']+)'|([^\s;]+))/i.exec(line);
    const verilog = /^\s*`include\s+"([^"]+)"/.exec(line);
    const value = spice?.[1] || spice?.[2] || spice?.[3] || verilog?.[1];
    if (value) targets.push(value.replaceAll("\\", "/"));
  }
  return targets;
}

export async function streamMultipartDraft(
  parts: AsyncIterable<MultipartFile | MultipartValue>, draftPath: string, moduleId: ModuleId, limits: UploadLimits,
): Promise<{ manifest: InputManifestV1; fields: Record<string, string> }> {
  const files: InputFileV1[] = []; const fields: Record<string, string> = {}; const seen = new Set<string>();
  const includes = new Map<string, string[]>(); let totalBytes = 0;
  for await (const part of parts) {
    if (part.type === "field") {
      if (typeof part.value === "string" && part.value.length <= 64 * 1024) fields[part.fieldname] = part.value;
      continue;
    }
    if (files.length >= limits.maxFiles) throw new UploadValidationError(`file count exceeds ${limits.maxFiles}`);
    const relativePath = relativePathForPart(part);
    if (seen.has(relativePath)) throw new UploadValidationError(`duplicate normalized path: ${relativePath}`);
    seen.add(relativePath);
    const destination = path.join(draftPath, ...relativePath.split("/"));
    await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
    const hash = createHash("sha256"); let sizeBytes = 0; const prefixChunks: Buffer[] = []; let prefixBytes = 0;
    const textualChunks: Buffer[] = []; let textualBytes = 0;
    const output = fs.createWriteStream(destination, { flags: "wx", mode: 0o640 });
    try {
      for await (const rawChunk of part.file) {
        const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
        sizeBytes += chunk.length; totalBytes += chunk.length;
        if (sizeBytes > limits.maxFileBytes) throw new UploadValidationError(`${relativePath} exceeds per-file limit`);
        if (totalBytes > limits.maxTotalBytes) throw new UploadValidationError("upload exceeds total byte limit");
        hash.update(chunk);
        if (prefixBytes < 4096) { const selected = chunk.subarray(0, 4096 - prefixBytes); prefixChunks.push(selected); prefixBytes += selected.length; }
        if (TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase()) && textualBytes < 2 * 1024 * 1024) { textualChunks.push(chunk); textualBytes += chunk.length; }
        if (!output.write(chunk)) await new Promise<void>((resolvePromise) => output.once("drain", resolvePromise));
      }
      await new Promise<void>((resolvePromise, reject) => output.end((error?: Error | null) => error ? reject(error) : resolvePromise()));
    } catch (error) { output.destroy(); await fsp.rm(destination, { force: true }); throw error; }
    if (sizeBytes === 0) throw new UploadValidationError(`${relativePath} is empty`);
    const extension = path.extname(relativePath).toLowerCase(); const validationErrors = validateSignature(relativePath, Buffer.concat(prefixChunks));
    const recognizedType = NEVER_EXECUTE.has(extension) ? "evidence-script-never-executed" : recognize(relativePath, part.mimetype);
    const targetList = textualChunks.length ? includeTargets(Buffer.concat(textualChunks).toString("utf8")) : [];
    includes.set(relativePath, targetList);
    files.push({ relativePath, sizeBytes, sha256: hash.digest("hex"), mediaType: part.mimetype || "application/octet-stream", recognizedType, role: null, required: false, usedByStepIds: [], unresolvedIncludes: [], validationErrors });
  }
  if (!files.length) throw new UploadValidationError("at least one file is required");
  for (const file of files) {
    const base = path.posix.dirname(file.relativePath);
    file.unresolvedIncludes = (includes.get(file.relativePath) || []).filter((target) => {
      try { return !seen.has(normalizeRelativePath(path.posix.join(base, target))); } catch { return true; }
    });
  }
  return { manifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes, fileCount: files.length, rootHint: fields.rootHint || null, createdAt: new Date().toISOString() }, fields: { ...fields, moduleId } };
}
