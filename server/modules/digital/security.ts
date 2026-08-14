import fs from "node:fs/promises";
import path from "node:path";
import { DigitalAdapterError, normalizeRelativePath, sha256File, workspacePath, writeUtf8Atomic } from "./helpers.js";
import { MAX_ACTIVE_SOURCE_TEXT_BYTES, SourceSecurityError, validateHdlSource } from "../../app/storage/sourceSecurity.js";
import type { DigitalExecutionContext } from "./types.js";
import { mapDigitalInputs } from "./inputs.js";
import { sanitizeDigitalSdc } from "./sdc.js";

export async function validateWorkspaceInputs(context: DigitalExecutionContext): Promise<void> {
  const inputRoot = workspacePath(context.workspacePath, "input");
  const resolvedRoot = await fs.realpath(inputRoot);
  const seen = new Set<string>();
  for (const file of context.job.inputManifest.files) {
    const relative = normalizeRelativePath(file.relativePath);
    if (seen.has(relative)) throw new DigitalAdapterError("DIGITAL_INPUT_DUPLICATE", `duplicate input path ${relative}`);
    seen.add(relative);
    const filename = workspacePath(context.workspacePath, "input", relative);
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new DigitalAdapterError("DIGITAL_INPUT_NOT_REGULAR", `${relative} is not a regular file`);
    const real = await fs.realpath(filename);
    if (!real.startsWith(`${resolvedRoot}${path.sep}`)) throw new DigitalAdapterError("DIGITAL_INPUT_ESCAPE", `${relative} escapes the job input directory`);
    if (stat.size !== file.sizeBytes) throw new DigitalAdapterError("DIGITAL_INPUT_SIZE_CHANGED", `${relative} no longer matches its frozen manifest`, "storage");
    if (await sha256File(filename) !== file.sha256) throw new DigitalAdapterError("DIGITAL_INPUT_HASH_CHANGED", `${relative} no longer matches its frozen SHA-256`, "storage");
    if (file.unresolvedIncludes.length > 0) throw new DigitalAdapterError("DIGITAL_INCLUDE_UNRESOLVED", `${relative} has unresolved includes: ${file.unresolvedIncludes.join(", ")}`);
  }
  const mapping = mapDigitalInputs(context.job.inputManifest.files); const availablePaths = new Set(context.job.inputManifest.files.map((file) => normalizeRelativePath(file.relativePath)));
  const byPath = new Map(context.job.inputManifest.files.map((file) => [normalizeRelativePath(file.relativePath), file]));
  const pending = [...mapping.rtl, ...mapping.gateNetlists, ...mapping.testbench, ...mapping.includes]; const inspected = new Set<string>();
  while (pending.length) {
    const input = pending.shift()!; if (inspected.has(input.relativePath)) continue; inspected.add(input.relativePath);
    if (input.sizeBytes > MAX_ACTIVE_SOURCE_TEXT_BYTES) throw new DigitalAdapterError("DIGITAL_HDL_TOO_LARGE_TO_VALIDATE", `${input.relativePath} exceeds the 16 MiB safety-inspection limit`);
    const source = await fs.readFile(workspacePath(context.workspacePath, "input", input.relativePath), "utf8");
    try {
      for (const dependency of validateHdlSource(input.relativePath, source, availablePaths)) {
        const target = byPath.get(dependency); if (target && !inspected.has(dependency)) pending.push(target);
      }
    }
    catch (error) {
      if (error instanceof SourceSecurityError) throw new DigitalAdapterError(`DIGITAL_${error.code}`, error.message);
      throw error;
    }
  }
}

/** Parse a conservative SDC subset and regenerate it in work/. The uploaded file is never sourced directly. */
export async function materializeSafeSdc(context: DigitalExecutionContext): Promise<string | null> {
  const mapping = mapDigitalInputs(context.job.inputManifest.files);
  if (mapping.sdc.length === 0) return null;
  const input = mapping.sdc[0];
  const text = await fs.readFile(workspacePath(context.workspacePath, "input", input.relativePath), "utf8");
  const output = sanitizeDigitalSdc(text, input.relativePath);
  const destination = workspacePath(context.workspacePath, "work", "constraints.sdc");
  await writeUtf8Atomic(destination, output);
  return destination;
}
