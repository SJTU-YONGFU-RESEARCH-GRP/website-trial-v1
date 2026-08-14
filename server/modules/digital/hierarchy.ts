import fs from "node:fs/promises";
import { DigitalAdapterError, normalizeRunParameters, workspacePath, writeUtf8Atomic } from "./helpers.js";
import { mapDigitalInputs } from "./inputs.js";
import type { DigitalExecutionContext } from "./types.js";

function stripVerilogComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
}

export async function resolveHierarchy(context: DigitalExecutionContext): Promise<Record<string, unknown>> {
  const parameters = normalizeRunParameters(context.job.parameters);
  const mapping = mapDigitalInputs(context.job.inputManifest.files);
  const modules = new Set<string>();
  const sources = [...mapping.rtl, ...mapping.gateNetlists, ...mapping.includes];
  for (const file of sources) {
    const text = stripVerilogComments(await fs.readFile(workspacePath(context.workspacePath, "input", file.relativePath), "utf8"));
    for (const match of text.matchAll(/\bmodule\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/g)) modules.add(match[1]);
  }
  if (mapping.yosysJson.length === 1) {
    const json = JSON.parse(await fs.readFile(workspacePath(context.workspacePath, "input", mapping.yosysJson[0].relativePath), "utf8")) as { modules?: Record<string, unknown> };
    for (const name of Object.keys(json.modules ?? {})) modules.add(name.replace(/^\\/, ""));
  }
  if (!modules.has(parameters.topModule)) {
    throw new DigitalAdapterError("DIGITAL_TOP_NOT_FOUND", `top module ${parameters.topModule} was not found; discovered: ${[...modules].sort().join(", ") || "none"}`);
  }
  const manifest = { topModule: parameters.topModule, modules: [...modules].sort(), sourceFiles: sources.map((file) => file.relativePath) };
  await writeUtf8Atomic(workspacePath(context.workspacePath, "work", "hierarchy.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
