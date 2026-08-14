import fs from "node:fs/promises";
import path from "node:path";
import { DigitalAdapterError, normalizeRelativePath, sha256File, workspacePath, writeUtf8Atomic } from "./helpers.js";
import type { DigitalExecutionContext } from "./types.js";
import { mapDigitalInputs } from "./inputs.js";

const SDC_COMMANDS = new Set([
  "create_clock",
  "set_input_delay",
  "set_output_delay",
  "set_input_transition",
  "set_load",
  "set_clock_uncertainty",
  "set_false_path",
  "set_multicycle_path",
  "set_max_delay",
  "set_min_delay",
]);
const SDC_BRACKET_COMMANDS = new Set([
  "get_ports", "get_clocks", "all_inputs", "all_outputs", "all_clocks", "remove_from_collection",
]);

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
  const mapping = mapDigitalInputs(context.job.inputManifest.files);
  for (const testbench of mapping.testbench) {
    const source = await fs.readFile(workspacePath(context.workspacePath, "input", testbench.relativePath), "utf8");
    if (/\$system\s*\(|\bimport\s+["']DPI|\bexport\s+["']DPI/i.test(source)) {
      throw new DigitalAdapterError("DIGITAL_TESTBENCH_UNSAFE", `${testbench.relativePath} uses an external-process or DPI primitive that is forbidden`);
    }
  }
}

/** Parse a conservative SDC subset and regenerate it in work/. The uploaded file is never sourced directly. */
export async function materializeSafeSdc(context: DigitalExecutionContext): Promise<string | null> {
  const mapping = mapDigitalInputs(context.job.inputManifest.files);
  if (mapping.sdc.length === 0) return null;
  const input = mapping.sdc[0];
  const text = await fs.readFile(workspacePath(context.workspacePath, "input", input.relativePath), "utf8");
  if (/\\\r?\n/.test(text)) throw new DigitalAdapterError("DIGITAL_SDC_UNSUPPORTED", "SDC line continuations are not accepted; place each command on one line");
  const output: string[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes(";") || line.includes("\0") || /\$[A-Za-z_{]/.test(line)) {
      throw new DigitalAdapterError("DIGITAL_SDC_UNSAFE", `${input.relativePath}:${index + 1}: Tcl separators and variable substitution are forbidden`);
    }
    const command = /^([A-Za-z_][A-Za-z0-9_]*)\b/.exec(line)?.[1];
    if (!command || !SDC_COMMANDS.has(command)) {
      throw new DigitalAdapterError("DIGITAL_SDC_COMMAND_UNSUPPORTED", `${input.relativePath}:${index + 1}: unsupported SDC command ${command ?? "<unknown>"}`);
    }
    for (const bracket of line.matchAll(/\[\s*([A-Za-z_][A-Za-z0-9_]*)\b/g)) {
      if (!SDC_BRACKET_COMMANDS.has(bracket[1])) {
        throw new DigitalAdapterError("DIGITAL_SDC_UNSAFE", `${input.relativePath}:${index + 1}: unsafe Tcl command substitution ${bracket[1]}`);
      }
    }
    output.push(line);
  }
  if (output.length === 0) throw new DigitalAdapterError("DIGITAL_SDC_EMPTY", `${input.relativePath} contains no supported constraints`);
  const destination = workspacePath(context.workspacePath, "work", "constraints.sdc");
  await writeUtf8Atomic(destination, `${output.join("\n")}\n`);
  return destination;
}
