import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { DraftValidationContextV1, InputFileV1, JsonObject, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import { assertExistingPathWithin, assertSafeRelativePath, workspacePath } from "./security.ts";

const execFileAsync = promisify(execFile);
export const MAX_MODEL_INSPECTION_BYTES = 16 * 1024 * 1024;
export type SpiceDialect = "ngspice" | "hspice" | "spectre" | "spectre-spice";

export type SourceDialect = "auto" | "ngspice" | "hspice" | "spectre";

/** Only an initial Translator's legacy source setting describes the uploaded root. */
export function sourceDialectForInput(parameters: JsonObject): SourceDialect {
  const allowed = ["auto", "ngspice", "hspice", "spectre"];
  const root = parameters.sourceDialect;
  if (root !== undefined && (typeof root !== "string" || !allowed.includes(root))) {
    throw new Error("Source model format must be auto, ngspice, hspice or spectre");
  }
  const operations = parameters.operations as JsonObject | undefined;
  const order = [...new Set([...(Array.isArray(parameters.operationOrder) ? parameters.operationOrder : []), "translator", "fitting", "reduction", "expansion"])];
  const first = order.find((tool) => typeof tool === "string" && ["translator", "fitting", "reduction", "expansion"].includes(tool) && operations?.[tool] === true);
  const translator = parameters.translator as JsonObject | undefined;
  const legacy = first === "translator" ? translator?.sourceDialect : undefined;
  if (legacy !== undefined && (typeof legacy !== "string" || !allowed.includes(legacy))) {
    throw new Error("Translator Source dialect must be auto, ngspice, hspice or spectre");
  }
  if (root && root !== "auto" && legacy && legacy !== "auto" && root !== legacy) {
    throw new Error(`Source model format is ${root}, but the first Translator Source dialect is ${legacy}; choose matching formats or set Translator Source dialect to auto`);
  }
  return (root && root !== "auto" ? root : legacy ?? root ?? "auto") as SourceDialect;
}

export interface SpiceModelIdentity {
  name: string;
  polarity: "nmos" | "pmos" | null;
  modelType: string;
  family?: string | null;
  hasBins?: boolean;
  binCount?: number;
  scope?: string[];
  level?: string | number | null;
  version?: string | number | null;
  section?: string | null;
  source?: string;
}

export interface SpiceInputInspection {
  dialect: SpiceDialect;
  dialectConfidence: "strong" | "extension" | "fallback";
  includeReferences: string[];
  dependencies: string[];
  models: SpiceModelIdentity[];
  warnings: string[];
  text: string | null;
}

/** Advisory upload recognition only. Model acceptance uses the configured AST inspector. */
export function includeReferences(text: string): string[] {
  const references: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(\.?(?:include|inc)|\.lib)\s+(?:"([^"]+)"|'([^']+)'|([^\s*]+))/i);
    if (!match) continue;
    const token = match[2] ?? match[3] ?? match[4] ?? "";
    if (match[1].toLowerCase() === ".lib" && !match[2] && !match[3] && !/[./\\]/.test(token)) continue;
    if (token) references.push(token);
  }
  return references;
}

export function detectSpiceDialect(relativePath: string, text: string | null): Pick<SpiceInputInspection, "dialect" | "dialectConfidence"> {
  const source = text ?? "";
  if (/^\s*simulator\s+lang\s*=\s*spectre\b/im.test(source) || /^\s*model\s+\S+\s+\S+\s*\{/im.test(source)) return { dialect: "spectre", dialectConfidence: "strong" };
  if (/^\s*\.option\s+(?:post|accurate|runlvl)\b/im.test(source) || /^\s*\.(?:protect|unprotect)\b/im.test(source)) return { dialect: "hspice", dialectConfidence: "strong" };
  if (/^\s*\.model\s+\S+\s+\S+\b/im.test(source)) return { dialect: "ngspice", dialectConfidence: "strong" };
  const extension = path.posix.extname(relativePath).toLowerCase();
  if (extension === ".scs") return { dialect: "spectre", dialectConfidence: "extension" };
  if (extension === ".sp") return { dialect: "hspice", dialectConfidence: "extension" };
  return { dialect: "ngspice", dialectConfidence: [".lib", ".model", ".cir"].includes(extension) ? "extension" : "fallback" };
}

export async function readInputText(context: DraftValidationContextV1, file: InputFileV1): Promise<string | null> {
  if (file.sizeBytes > MAX_MODEL_INSPECTION_BYTES) return null;
  try {
    const workspaceRoot = workspacePath(context.storageRoot, context.job.workspaceRelativePath);
    const inputPath = workspacePath(workspaceRoot, `input/${assertSafeRelativePath(file.relativePath)}`);
    const text = await readFile(inputPath, "utf8");
    return Buffer.byteLength(text) <= MAX_MODEL_INSPECTION_BYTES ? text : null;
  } catch {
    return null;
  }
}

export function inspectorInvocation(configuration: ToolConfigurationSnapshotV1): { executable: string; prefix: string[] } {
  if (!configuration.enabled) throw new Error("The configured Translator AST inspector is disabled");
  const executable = configuration.interpreterPath ?? configuration.executablePath;
  if (!executable || !path.isAbsolute(executable)) throw new Error("The AST inspector needs an administrator-configured absolute executable");
  const entry = configuration.entryPoint;
  if (!configuration.interpreterPath) {
    if (entry) throw new Error("An AST inspector executable cannot also specify an entry point");
    return { executable, prefix: [] };
  }
  if (!entry) throw new Error("The Translator AST inspector needs its configured entry point");
  if (/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(entry) && !entry.endsWith(".py")) return { executable, prefix: ["-m", entry] };
  if (!path.isAbsolute(entry)) throw new Error("The AST inspector script must be an administrator-configured absolute path");
  return { executable, prefix: [entry] };
}

export async function inspectModelPath(
  configuration: ToolConfigurationSnapshotV1,
  modelPath: string,
  inputRoot: string,
  environment: Record<string, string> = {},
  section?: string,
  sourceDialect: SourceDialect = "auto",
): Promise<Omit<SpiceInputInspection, "text">> {
  await assertExistingPathWithin(inputRoot, modelPath);
  const { executable, prefix } = inspectorInvocation(configuration);
  const env: NodeJS.ProcessEnv = { PATH: [path.dirname(executable), "/usr/local/bin", "/usr/bin", "/bin"].join(path.delimiter), LANG: "C.UTF-8", LC_ALL: "C.UTF-8" };
  for (const name of configuration.environmentNames) if (environment[name] !== undefined) env[name] = environment[name];
  const argv = [...prefix, "inspect", modelPath, "--dialect", sourceDialect, "--root", inputRoot, "--follow-includes", "--require-mos"];
  if (section) argv.push("--section", section);
  const { stdout } = await execFileAsync(executable, argv, {
    cwd: configuration.rootPath ?? path.dirname(modelPath), env,
    timeout: Math.min(configuration.timeoutSeconds || 30, 30) * 1000, maxBuffer: MAX_MODEL_INSPECTION_BYTES, encoding: "utf8",
  });
  const result = JSON.parse(stdout) as Partial<SpiceInputInspection>;
  if (!["ngspice", "hspice", "spectre", "spectre-spice"].includes(String(result.dialect))
    || !Array.isArray(result.models) || !result.models.length
    || result.models.some((model) => typeof model.name !== "string" || !["nmos", "pmos"].includes(String(model.polarity)))
    || !Array.isArray(result.dependencies) || result.dependencies.some((entry) => typeof entry !== "string")
    || !Array.isArray(result.includeReferences) || result.includeReferences.some((entry) => typeof entry !== "string")) {
    throw new Error("The authoritative AST inspector did not return a complete MOS model inspection");
  }
  for (const dependency of result.dependencies) await assertExistingPathWithin(inputRoot, dependency);
  return {
    dialect: result.dialect as SpiceDialect, dialectConfidence: "strong",
    models: result.models, dependencies: result.dependencies, includeReferences: result.includeReferences,
    warnings: Array.isArray(result.warnings) ? result.warnings.filter((value): value is string => typeof value === "string") : [],
  };
}

const inspectionCache = new WeakMap<DraftValidationContextV1, Map<string, Promise<SpiceInputInspection>>>();

export async function inspectInputModel(context: DraftValidationContextV1, relativePath: string): Promise<SpiceInputInspection> {
  let cache = inspectionCache.get(context);
  if (!cache) { cache = new Map(); inspectionCache.set(context, cache); }
  let inspection = cache.get(relativePath);
  if (!inspection) {
    inspection = (async () => {
      const configuration = context.job.toolConfigurations.find((entry) => entry.toolId === "translator" && entry.enabled);
      if (!configuration) throw new Error("An enabled Translator configuration is required for authoritative MOS AST inspection");
      const workspaceRoot = workspacePath(context.storageRoot, context.job.workspaceRelativePath);
      const inputRoot = workspacePath(workspaceRoot, "input");
      const modelPath = workspacePath(inputRoot, assertSafeRelativePath(relativePath));
      const runtime = context as DraftValidationContextV1 & { toolConfigurations?: Array<ToolConfigurationSnapshotV1 & { environment?: Record<string, string> }> };
      const environment = runtime.toolConfigurations?.find((entry) => entry.id === configuration.id)?.environment ?? {};
      const section = typeof context.job.parameters.sourceSection === "string" ? context.job.parameters.sourceSection.trim() : undefined;
      const result = await inspectModelPath(configuration, modelPath, inputRoot, environment, section, sourceDialectForInput(context.job.parameters));
      const available = new Set(context.files.map((entry) => entry.relativePath));
      for (const dependency of result.dependencies) {
        const relative = path.relative(inputRoot, dependency).split(path.sep).join("/");
        if (!available.has(relative)) throw new Error(`AST dependency was not uploaded: ${relative}`);
      }
      const file = context.files.find((entry) => entry.relativePath === relativePath);
      return { ...result, text: file ? await readInputText(context, file) : null };
    })();
    cache.set(relativePath, inspection);
  }
  return inspection;
}
