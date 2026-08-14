import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DraftValidationContextV1,
  InputFileV1,
  JsonObject,
  StructuredJobErrorV1,
} from "../../../shared/contracts/v1.ts";
import { assertSafeRelativePath, isUnsafeSpiceText, workspacePath } from "./security.ts";
import type { BenchmarkModuleOptions, BenchmarkRunParameters, BenchmarkToolId } from "./types.ts";

const MODEL_EXTENSIONS = new Set([".lib", ".model", ".sp", ".cir", ".scs"]);
const CURRENT_COLUMNS = new Set(["i", "id", "ids", "draincurrent", "current"]);
const VOLTAGE_COLUMNS = new Set(["vgs", "vds", "vbs"]);
const MAX_VALIDATION_TEXT_BYTES = 16 * 1024 * 1024;

function validationError(code: string, message: string, details: JsonObject | null = null): StructuredJobErrorV1 {
  return { type: "validation", code, message, stepId: null, retryable: false, details };
}

function configurationError(code: string, message: string): StructuredJobErrorV1 {
  return { type: "configuration", code, message, stepId: null, retryable: true, details: null };
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

export function benchmarkParameters(value: JsonObject): BenchmarkRunParameters {
  const mode = value.mode === "import" ? "import" : "run";
  return {
    mode,
    operations: asObject(value.operations),
    translator: asObject(value.translator),
    fitting: asObject(value.fitting),
    reduction: asObject(value.reduction),
    expansion: asObject(value.expansion),
    benchmark: asObject(value.benchmark),
  };
}

export function roleMap(files: InputFileV1[]): Map<string, string[]> {
  const roles = new Map<string, string[]>();
  for (const file of files) {
    if (!file.role) continue;
    const paths = roles.get(file.role) ?? [];
    paths.push(file.relativePath);
    roles.set(file.role, paths);
  }
  return roles;
}

export function operationEnabled(parameters: BenchmarkRunParameters, toolId: BenchmarkToolId): boolean {
  const key = toolId === "spice-benchmark" ? "benchmark" : toolId;
  const value = parameters.operations[key];
  return toolId === "spice-benchmark" ? value !== false : value === true;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

async function readInputText(context: DraftValidationContextV1, file: InputFileV1): Promise<string | null> {
  if (file.sizeBytes > MAX_VALIDATION_TEXT_BYTES) return null;
  try {
    const workspaceRoot = workspacePath(context.storageRoot, context.job.workspaceRelativePath);
    const inputPath = workspacePath(workspaceRoot, `input/${assertSafeRelativePath(file.relativePath)}`);
    return await readFile(inputPath, "utf8");
  } catch {
    return null;
  }
}

function unresolvedIncludes(file: InputFileV1, text: string, availablePaths: Set<string>): string[] {
  const missing: string[] = [];
  const expression = /^\s*\.(?:include|inc|lib)\s+(?:"([^"]+)"|'([^']+)'|([^\s*]+))/gim;
  for (const match of text.matchAll(expression)) {
    const include = match[1] ?? match[2] ?? match[3] ?? "";
    if (!include || path.posix.isAbsolute(include) || include.startsWith("~") || include.split("/").includes("..")) {
      missing.push(include || "<empty>");
      continue;
    }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.relativePath), include));
    if (!availablePaths.has(resolved)) missing.push(include);
  }
  return missing;
}

async function validateCsv(
  context: DraftValidationContextV1,
  file: InputFileV1,
  mapping: JsonObject,
): Promise<StructuredJobErrorV1[]> {
  const text = await readInputText(context, file);
  if (text === null) return [validationError("benchmark.csv_unreadable", `Cannot inspect ${file.relativePath} as a measured CSV`)];
  const rows = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 10_001);
  if (rows.length < 2) return [validationError("benchmark.csv_empty", `${file.relativePath} must contain a header and data rows`)];
  const headers = splitCsvLine(rows[0]).map((header) => header.trim().toLowerCase());
  if (!headers.some((header) => CURRENT_COLUMNS.has(header))) {
    return [validationError("benchmark.csv_current_column", `${file.relativePath} needs I, id, ids, draincurrent or current`)];
  }
  const voltageIndexes = headers.map((header, index) => VOLTAGE_COLUMNS.has(header) ? index : -1).filter((index) => index >= 0);
  if (!voltageIndexes.length) {
    return [validationError("benchmark.csv_sweep_column", `${file.relativePath} needs at least one of Vgs, Vds or Vbs`)];
  }
  const columnValues = new Map<number, Set<string>>(voltageIndexes.map((index) => [index, new Set<string>()]));
  for (const row of rows.slice(1)) {
    const cells = splitCsvLine(row);
    for (const index of voltageIndexes) {
      const value = cells[index];
      if (value !== undefined && value !== "") columnValues.get(index)?.add(value);
    }
  }
  if (![...columnValues.values()].some((values) => values.size > 1)) {
    return [validationError("benchmark.csv_no_sweep", `${file.relativePath} has no varying Vgs/Vds/Vbs column`)];
  }
  const hasFixedColumn = [...columnValues.values()].some((values) => values.size === 1);
  const mappingValue = mapping[file.relativePath];
  const mapped = asObject(mappingValue);
  const hasMappedBias = ["vgs", "vds", "vbs"].some((key) => typeof mapped[key] === "number");
  if (!hasFixedColumn && !hasMappedBias) {
    return [validationError("benchmark.csv_fixed_bias", `${file.relativePath} needs a fixed bias column or dataset mapping`)];
  }
  return [];
}

function selectedTools(parameters: BenchmarkRunParameters): BenchmarkToolId[] {
  return (["translator", "fitting", "reduction", "expansion", "spice-benchmark"] as const)
    .filter((toolId) => operationEnabled(parameters, toolId));
}

export async function validateBenchmarkDraft(
  context: DraftValidationContextV1,
  options: BenchmarkModuleOptions,
): Promise<{ valid: boolean; errors: StructuredJobErrorV1[]; warnings: string[] }> {
  const errors: StructuredJobErrorV1[] = [];
  const warnings: string[] = [];
  const paths = new Set<string>();
  for (const file of context.files) {
    try {
      const normalized = assertSafeRelativePath(file.relativePath, "uploaded path");
      if (paths.has(normalized)) errors.push(validationError("benchmark.duplicate_path", `Duplicate uploaded path: ${normalized}`));
      paths.add(normalized);
    } catch (error) {
      errors.push(validationError("benchmark.unsafe_path", error instanceof Error ? error.message : String(error)));
    }
    if (file.validationErrors.length) {
      errors.push(validationError("benchmark.upload_validation", `${file.relativePath}: ${file.validationErrors.join("; ")}`));
    }
    if (file.unresolvedIncludes.length) {
      errors.push(validationError("benchmark.unresolved_include", `${file.relativePath} has unresolved include(s): ${file.unresolvedIncludes.join(", ")}`));
    }
  }

  const parameters = benchmarkParameters(context.job.parameters);
  const roles = roleMap(context.files);
  if (parameters.mode === "import" || context.job.operation === "import-completed-result") {
    const completed = roles.get("completed-result") ?? context.files.map((file) => file.relativePath);
    if (!completed.some((file) => /(?:^|\/)(?:report\.md|model_manifest\.json|native-fixture-manifest\.json|manifest\.json)$/i.test(file))) {
      errors.push(validationError("benchmark.import_manifest_missing", "Completed-result import requires REPORT.md or a recognized manifest JSON"));
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  const modelFiles = context.files.filter((file) => file.role === "primary-model" || file.role === "base-model");
  const availablePaths = new Set(context.files.map((file) => file.relativePath));
  for (const file of modelFiles) {
    if (!MODEL_EXTENSIONS.has(path.posix.extname(file.relativePath).toLowerCase())) {
      errors.push(validationError("benchmark.model_extension", `${file.relativePath} is not an accepted SPICE model extension`));
      continue;
    }
    const text = await readInputText(context, file);
    if (text !== null) {
      const danger = isUnsafeSpiceText(text);
      if (danger) errors.push(validationError("benchmark.unsafe_spice", `${file.relativePath}: ${danger}`));
      const missing = unresolvedIncludes(file, text, availablePaths);
      if (missing.length) errors.push(validationError("benchmark.unresolved_include", `${file.relativePath} has unresolved include(s): ${missing.join(", ")}`));
    }
  }

  const tools = selectedTools(parameters);
  for (const toolId of tools) {
    const configuration = context.job.toolConfigurations.find((entry) => entry.toolId === toolId && entry.enabled);
    const health = options.health?.[toolId];
    if (!configuration) errors.push(configurationError("benchmark.tool_not_configured", `${toolId} has no enabled job configuration snapshot`));
    else if (health?.status !== "healthy" || health.adapterSelfTestPassed !== true) errors.push(configurationError("benchmark.tool_unavailable", `${toolId} must pass its adapter minimal self-test before use`));
  }

  const processing = tools.filter((tool) => tool !== "spice-benchmark");
  const primary = roles.get("primary-model") ?? [];
  const base = roles.get("base-model") ?? [];
  const fitting = operationEnabled(parameters, "fitting");
  if (!fitting && primary.length === 0) errors.push(validationError("benchmark.model_required", "A primary SPICE model is required"));
  if (processing.length && primary.length + base.length > 1) {
    errors.push(validationError("benchmark.processing_single_model", "Processing workflows accept one source model; upload multiple models only for direct Benchmark comparison"));
  }
  if (operationEnabled(parameters, "translator") && primary.length !== 1) {
    errors.push(validationError("benchmark.translator_input", "Translator requires exactly one primary model"));
  }
  if ((operationEnabled(parameters, "reduction") || operationEnabled(parameters, "expansion")) && primary.length + base.length === 0 && !fitting) {
    errors.push(validationError("benchmark.chain_model_missing", "Reduction and Expansion require a model from the upload or an earlier fitting step"));
  }

  if (fitting) {
    const ngspiceConfiguration = context.job.toolConfigurations.find((entry) => entry.toolId === "ngspice" && entry.enabled && entry.executablePath);
    const ngspiceHealth = options.health?.ngspice;
    if (!ngspiceConfiguration || ngspiceHealth?.status !== "healthy" || ngspiceHealth.adapterSelfTestPassed !== true) {
      errors.push(configurationError("benchmark.fitting_ngspice_unavailable", "Fitting requires ngspice with a healthy fitting-adapter self-test"));
    }
    const csvFiles = context.files.filter((file) => file.role === "measured-csv");
    if (!csvFiles.length) errors.push(validationError("benchmark.csv_required", "Fitting requires at least one measured DC IV CSV"));
    const mapping = asObject(parameters.fitting.datasetMapping);
    for (const csvFile of csvFiles) errors.push(...await validateCsv(context, csvFile, mapping));
  }

  if (operationEnabled(parameters, "expansion")) {
    const sigmaFiles = context.files.filter((file) => file.role === "sigma-json");
    if (sigmaFiles.length > 1) errors.push(validationError("benchmark.sigma_count", "Expansion accepts at most one sigma JSON"));
    for (const file of sigmaFiles) {
      const text = await readInputText(context, file);
      try {
        const parsed = JSON.parse(text ?? "") as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
        if (Object.values(parsed as Record<string, unknown>).some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
          throw new Error("sigma values must be finite non-negative numbers");
        }
      } catch (error) {
        errors.push(validationError("benchmark.sigma_json", `${file.relativePath}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  if (operationEnabled(parameters, "spice-benchmark")) {
    const benchmark = parameters.benchmark;
    const simulators = Array.isArray(benchmark.simulators) ? benchmark.simulators.filter((item): item is string => typeof item === "string") : [];
    if (!simulators.length) errors.push(configurationError("benchmark.simulator_required", "Select at least one healthy simulator"));
    for (const simulator of simulators) {
      if (!["ngspice", "spectre", "hspice"].includes(simulator)) {
        errors.push(validationError("benchmark.simulator_invalid", `Unsupported simulator: ${simulator}`));
        continue;
      }
      const config = context.job.toolConfigurations.find((entry) => entry.toolId === simulator && entry.enabled);
      const health = options.health?.[simulator as "ngspice" | "spectre" | "hspice"];
      if (!config || health?.status !== "healthy" || health.adapterSelfTestPassed !== true) {
        errors.push(configurationError("benchmark.simulator_unavailable", `${simulator} has not passed executable and benchmark-adapter self-tests`));
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
