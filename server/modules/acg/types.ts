import fs from "node:fs/promises";
import path from "node:path";
import type { DraftValidationContextV1, JsonObject, ModuleContextV1, StepExecutionContextV1, StructuredJobErrorV1, ToolConfigurationSnapshotV1, ToolHealthCheckV1 } from "../../../shared/contracts/v1.ts";
import type { CoreStepExecutionContextV1 } from "../../app/process/coreContext.ts";
export const ACG_VERSION = "acg.adapter.v1";
export const ENGINES = ["cmos", "dr", "mr"] as const;
export type Engine = typeof ENGINES[number];
export interface Parameters {
  engine: Engine; mode: "placement" | "routed"; presetId: string | null; numRows?: number; algorithm?: string;
  seed?: number; trackNum?: number; candidateCount?: number; timeoutSeconds?: number;
  verification?: "none" | "research" | "foundry"; widenPolicy?: string; widenExtraCpp?: number; sourceDiagnostic?: string; routabilityPipeline?: boolean; configOverrides: JsonObject;
}
export interface Preset { id: string; label: string; engine: Engine; technology: string; trackNum: number; numRows: number; modes: string[]; configFilename: string; rulesFilename: string; description: string; }
export type AcgContext = ModuleContextV1 & {
  toolConfigurations?: ToolConfigurationSnapshotV1[];
  toolHealth?: Record<string, ToolHealthCheckV1 | null>;
  toolBindings?: Record<string, { configuration: ToolConfigurationSnapshotV1; health: string; version?: string | null; selfTestPassed?: boolean | null }>;
};
export type AcgExecutionContext = StepExecutionContextV1 & Partial<CoreStepExecutionContextV1>;
export function ready(context: AcgContext, configuration: ToolConfigurationSnapshotV1): boolean {
  const probe=context.toolHealth?.[configuration.id]; const binding=context.toolBindings?.[configuration.toolId];
  return configuration.enabled && (probe?.status ?? binding?.health)==="healthy" && (probe?.selfTestPassed ?? binding?.selfTestPassed)===true;
}
export class AcgError extends Error {
  constructor(readonly code: string, message: string, readonly type: StructuredJobErrorV1["type"] = "validation") { super(message); }
}
export function fail(code: string, message: string): never { throw new AcgError(code, message); }
export function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("ACG_JSON_OBJECT", "Configuration must be a JSON object");
  return value as JsonObject;
}
export function safePath(root: string, relative: string): string {
  if (!relative || relative.includes("\0") || relative.includes("\\") || path.isAbsolute(relative) || relative.split("/").some(x => !x || x === ".." || x === ".")) fail("ACG_PATH_UNSAFE", "Unsafe relative path");
  return path.resolve(root, relative);
}
export async function regular(root: string, relative: string): Promise<string> {
  const filename = safePath(root, relative); const metadata = await fs.lstat(filename);
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail("ACG_INPUT_UNSAFE", "Input must be a regular file");
  const resolved = await fs.realpath(filename); const resolvedRoot = await fs.realpath(root);
  if (!resolved.startsWith(resolvedRoot + path.sep)) fail("ACG_INPUT_UNSAFE", "Input escapes workspace");
  return resolved;
}
export async function writeJson(filename: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filename), { recursive: true }); await fs.writeFile(filename, JSON.stringify(value, null, 2) + "\n", { mode: 0o640 });
}
export function tool(context: { job: { toolConfigurations: ToolConfigurationSnapshotV1[] } }, engine: Engine): ToolConfigurationSnapshotV1 {
  const value = context.job.toolConfigurations.find(x => x.toolId === "acg-" + engine);
  if (!value?.enabled || !value.executablePath || !path.isAbsolute(value.executablePath) || value.interpreterPath) throw new AcgError("ACG_TOOL_UNAVAILABLE", "A trusted native acg-" + engine + " executable is required", "configuration");
  return value;
}
export async function projectRoot(configuration: ToolConfigurationSnapshotV1, engine: Engine): Promise<string> {
  if (!configuration.rootPath || !path.isAbsolute(configuration.rootPath)) throw new AcgError("ACG_ROOT_UNAVAILABLE", "Administrator tool root is required", "configuration");
  const root = configuration.rootPath;
  if (await fs.stat(path.join(root, "config")).then(x => x.isDirectory()).catch(() => false)) return root;
  return path.join(root, "proj", engine === "cmos" ? "autocellgen-cmos" : engine === "dr" ? "autocellgen-DR" : "autocellgen-MR");
}
export type ValidationContext = DraftValidationContextV1 & AcgContext;
