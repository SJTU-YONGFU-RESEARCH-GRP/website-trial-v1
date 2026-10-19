import path from "node:path";
import type {
  DraftValidationContextV1,
  InputFileV1,
  JsonObject,
  ParameterDefinitionV1,
  StructuredJobErrorV1,
} from "../../../shared/contracts/v1.ts";
import { createBenchmarkCapabilities } from "./capabilities.ts";
import { includeReferences, inspectInputModel, sourceDialectForInput, MAX_MODEL_INSPECTION_BYTES, readInputText, type SpiceInputInspection } from "./modelInput.ts";
import { assertSafeRelativePath, isUnsafeSpiceText } from "./security.ts";
import type { BenchmarkModuleOptions, BenchmarkRunParameters, BenchmarkToolId } from "./types.ts";

const MODEL_EXTENSIONS = new Set([".lib", ".model", ".sp", ".cir", ".scs"]);
const CURRENT_COLUMNS = new Set(["i", "id", "ids", "draincurrent", "current"]);
const VOLTAGE_COLUMNS = new Set(["vgs", "vds", "vbs"]);
const NODE_VOLTAGE_COLUMNS = new Set(["vd", "vg", "vs", "vb"]);
const PROCESSING_TOOL_ORDER = ["translator", "fitting", "reduction", "expansion"] as const;

function validationError(code: string, message: string, details: JsonObject | null = null): StructuredJobErrorV1 {
  return { type: "validation", code, message, stepId: null, retryable: false, details };
}

function configurationError(code: string, message: string): StructuredJobErrorV1 {
  return { type: "configuration", code, message, stepId: null, retryable: true, details: null };
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

// Expansion's load_sigma_map accepts Python float-compatible JSON primitives.
function sigmaNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return Number(value);
  if (typeof value === "string") {
    const text = value.trim().replace(/\p{Decimal_Number}/gu, (digit) => {
      const code = digit.codePointAt(0)!;
      let first = code;
      while (first > 0 && /\p{Decimal_Number}/u.test(String.fromCodePoint(first - 1))) first--;
      return String((code - first) % 10);
    });
    if (/^[+-]?(?:inf(?:inity)?|nan)$/i.test(text)) return Number.NaN;
    if (/^[+-]?(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?$/.test(text)) {
      return Number(text.replaceAll("_", ""));
    }
  }
  throw new Error("sigma and slow_dir must be numeric");
}

function validateSigmaMap(parsed: unknown): void {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Sigma JSON must be an object");
  const normalized = new Map<string, [number, number]>();
  for (const [key, value] of Object.entries(parsed)) {
    let sigma: unknown;
    let direction: unknown;
    if (Array.isArray(value) && value.length === 2) {
      [sigma, direction] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)
      && Object.keys(value).every((field) => field === "sigma" || field === "slow_dir")) {
      const entry = value as Record<string, unknown>;
      sigma = Object.hasOwn(entry, "sigma") ? entry.sigma : 0.1;
      direction = Object.hasOwn(entry, "slow_dir") ? entry.slow_dir : 1;
    } else {
      throw new Error(`Invalid sigma configuration for ${key}: use [sigma, slow_dir] or {sigma, slow_dir}`);
    }
    // The CLI uppercases before validating, so the last case-equivalent key wins.
    normalized.set(key.toUpperCase(), [sigmaNumber(sigma), sigmaNumber(direction)]);
  }
  const structural = new Set(["LEVEL", "VERSION", "TYPE", "BINUNIT", "LMIN", "LMAX", "WMIN", "WMAX"]);
  for (const [key, [sigma, direction]] of normalized) {
    if (structural.has(key)) throw new Error(`Cannot vary structural parameter ${key}`);
    if (!Number.isFinite(sigma) || sigma < 0 || ![-1, 1].includes(direction)) {
      throw new Error(`Invalid sigma configuration for ${key}: sigma must be finite and non-negative; slow_dir must be -1 or 1`);
    }
  }
}

export function benchmarkParameters(value: JsonObject): BenchmarkRunParameters {
  const mode = value.mode === "import" ? "import" : "run";
  const requestedOrder = Array.isArray(value.operationOrder)
    ? value.operationOrder.filter((item): item is typeof PROCESSING_TOOL_ORDER[number] => typeof item === "string" && PROCESSING_TOOL_ORDER.includes(item as typeof PROCESSING_TOOL_ORDER[number]))
    : [];
  const operationOrder = [...new Set([...requestedOrder, ...PROCESSING_TOOL_ORDER])];
  return {
    mode,
    ...(value.sourceDialect !== undefined ? { sourceDialect: value.sourceDialect } : {}),
    ...(typeof value.sourceSection === "string" && value.sourceSection.trim() ? { sourceSection: value.sourceSection.trim() } : {}),
    operations: asObject(value.operations),
    operationOrder,
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

function analyzeIncludes(file: InputFileV1, text: string, availablePaths: Set<string>): { missing: string[]; dependencies: string[] } {
  const missing: string[] = [];
  const dependencies: string[] = [];
  for (const include of includeReferences(text)) {
    if (!include || path.posix.isAbsolute(include) || include.startsWith("~") || include.split("/").includes("..")) {
      missing.push(include || "<empty>");
      continue;
    }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.relativePath), include));
    if (!availablePaths.has(resolved)) missing.push(include);
    else dependencies.push(resolved);
  }
  return { missing, dependencies };
}

async function validateCsv(
  context: DraftValidationContextV1,
  file: InputFileV1,
  mapping: JsonObject,
): Promise<StructuredJobErrorV1[]> {
  const text = await readInputText(context, file);
  if (text === null) return [validationError("benchmark.csv_unreadable", `Cannot inspect ${file.relativePath} as a measured CSV`)];
  const rows = text.split(/\r?\n/).filter((line) => line.trim());
  if (rows.length < 2) return [validationError("benchmark.csv_empty", `${file.relativePath} must contain a header and data rows`)];
  const headers = splitCsvLine(rows[0]).map((header) => header.trim().toLowerCase());
  if (!headers.some((header) => CURRENT_COLUMNS.has(header))) {
    return [validationError("benchmark.csv_current_column", `${file.relativePath} needs I, id, ids, draincurrent or current`)];
  }
  const voltageIndexes = headers.map((header, index) => VOLTAGE_COLUMNS.has(header) || NODE_VOLTAGE_COLUMNS.has(header) ? index : -1).filter((index) => index >= 0);
  const sweepVariableIndex = headers.indexOf("sweep_var");
  const sweepValueIndex = headers.indexOf("sweep_value");
  const hasExplicitSweepColumns = sweepVariableIndex >= 0 && sweepValueIndex >= 0;
  if (!voltageIndexes.length && !hasExplicitSweepColumns) {
    return [validationError("benchmark.csv_sweep_column", `${file.relativePath} needs at least one of Vgs, Vds or Vbs`)];
  }
  const currentIndex = headers.findIndex((header) => CURRENT_COLUMNS.has(header));
  const inspectedIndexes = [...new Set([...voltageIndexes, ...(hasExplicitSweepColumns ? [sweepValueIndex] : [])])];
  for (const [rowIndex, row] of rows.slice(1).entries()) {
    const cells = splitCsvLine(row);
    if (cells.length !== headers.length || [currentIndex, ...inspectedIndexes].some((index) => !cells[index]?.trim() || !Number.isFinite(Number(cells[index])))) {
      return [validationError("benchmark.csv_nonfinite_value", `${file.relativePath} row ${rowIndex + 2} needs finite measured current and bias values in every declared column`)];
    }
  }
  const columnValues = new Map<number, Set<string>>(inspectedIndexes.map((index) => [index, new Set<string>()]));
  for (const row of rows.slice(1)) {
    const cells = splitCsvLine(row);
    for (const index of inspectedIndexes) {
      const value = cells[index];
      if (value !== undefined && value !== "") columnValues.get(index)?.add(value);
    }
  }
  const explicitSweepValid = hasExplicitSweepColumns
    && (columnValues.get(sweepValueIndex)?.size ?? 0) > 1
    && rows.slice(1).some((row) => ["vgs", "vds", "vbs"].includes((splitCsvLine(row)[sweepVariableIndex] ?? "").toLowerCase()));
  if (![...voltageIndexes].some((index) => (columnValues.get(index)?.size ?? 0) > 1) && !explicitSweepValid) {
    return [validationError("benchmark.csv_no_sweep", `${file.relativePath} has no varying Vgs/Vds/Vbs column`)];
  }
  const hasFixedColumn = voltageIndexes.some((index) => (columnValues.get(index)?.size ?? 0) === 1);
  const mappingValue = mapping[file.relativePath];
  const mapped = asObject(mappingValue);
  const hasMappedBias = ["vgs", "vds", "vbs"].some((key) => typeof mapped[key] === "number");
  if (!hasFixedColumn && !hasMappedBias) {
    return [validationError("benchmark.csv_fixed_bias", `${file.relativePath} needs a fixed bias column or dataset mapping`)];
  }
  return [];
}

function selectedTools(parameters: BenchmarkRunParameters): BenchmarkToolId[] {
  return [...parameters.operationOrder.filter((toolId) => operationEnabled(parameters, toolId)), "spice-benchmark" as const]
    .filter((toolId) => operationEnabled(parameters, toolId));
}

function validateParameterValue(definition: ParameterDefinitionV1, value: unknown): string | null {
  if (value === undefined || value === null) return definition.required ? `${definition.label} is required` : null;
  if (definition.type === "boolean") return typeof value === "boolean" ? null : `${definition.label} must be boolean`;
  if (definition.type === "string") return typeof value === "string" ? null : `${definition.label} must be text`;
  if (definition.type === "enum") {
    return typeof value === "string" && definition.enumValues.includes(value) ? null : `${definition.label} contains an unsupported value`;
  }
  if (definition.type === "string-list" || definition.type === "number-list") {
    if (!Array.isArray(value)) return `${definition.label} must be a list`;
    const expected = definition.type === "string-list" ? "string" : "number";
    if (value.some((entry) => typeof entry !== expected || expected === "number" && !Number.isFinite(entry))) return `${definition.label} contains an invalid list item`;
    if (definition.enumValues.length && value.some((entry) => !definition.enumValues.includes(entry as never))) return `${definition.label} contains an unsupported value`;
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return `${definition.label} must be a finite number`;
  if (definition.type === "integer" && !Number.isInteger(value)) return `${definition.label} must be an integer`;
  if (definition.minimum !== null && value < definition.minimum || definition.maximum !== null && value > definition.maximum) return `${definition.label} is outside capability bounds`;
  return null;
}

function validateSelectedParameters(parameters: BenchmarkRunParameters, tools: BenchmarkToolId[], options: BenchmarkModuleOptions): StructuredJobErrorV1[] {
  const capabilities = createBenchmarkCapabilities(options);
  const errors: StructuredJobErrorV1[] = [];
  for (const toolId of tools) {
    const capability = capabilities.find((entry) => entry.toolId === toolId);
    if (!capability) continue;
    const values = toolId === "spice-benchmark" ? parameters.benchmark : asObject(parameters[toolId]);
    const allowed = new Set(capability.parameters.map((definition) => definition.id));
    if (toolId === "fitting") allowed.add("datasetMapping");
    for (const key of Object.keys(values)) {
      if (!allowed.has(key)) errors.push(validationError(
        "benchmark.parameter_unknown",
        `${capability.label}: unsupported parameter ${key}`,
        { toolId, parameterId: key },
      ));
    }
    for (const definition of capability.parameters) {
      const message = validateParameterValue(definition, values[definition.id]);
      if (message) errors.push(validationError("benchmark.parameter_invalid", `${capability.label}: ${message}`, { toolId, parameterId: definition.id }));
    }
  }
  return errors;
}

export async function validateBenchmarkDraft(
  context: DraftValidationContextV1,
  options: BenchmarkModuleOptions,
): Promise<{ valid: boolean; errors: StructuredJobErrorV1[]; warnings: string[] }> {
  const errors: StructuredJobErrorV1[] = [];
  try { sourceDialectForInput(context.job.parameters); } catch (error) {
    errors.push(validationError("benchmark.source_dialect_invalid", error instanceof Error ? error.message : String(error)));
  }
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
    if (file.unresolvedIncludes.length && !["primary-model", "base-model", "model-include"].includes(file.role ?? "")) {
      errors.push(validationError("benchmark.unresolved_include", `${file.relativePath} has unresolved include(s): ${file.unresolvedIncludes.join(", ")}`));
    }
  }

  const parameters = benchmarkParameters(context.job.parameters);
  const roles = roleMap(context.files);
  const sourceSection = context.job.parameters.sourceSection;
  if (sourceSection !== undefined && (typeof sourceSection !== "string" || sourceSection.trim() && !/^[A-Za-z0-9_$][A-Za-z0-9_$.-]{0,127}$/.test(sourceSection.trim()))) {
    errors.push(validationError("benchmark.source_section_invalid", "Source section must be a library-section name of at most 128 characters"));
  }
  if (parameters.mode === "import" || context.job.operation === "import-completed-result") {
    const completed = roles.get("completed-result") ?? context.files.map((file) => file.relativePath);
    if (!completed.some((file) => /(?:^|\/)(?:report\.md|model_manifest\.json|native-fixture-manifest\.json|manifest\.json)$/i.test(file))) {
      errors.push(validationError("benchmark.import_manifest_missing", "Completed-result import requires REPORT.md or a recognized manifest JSON"));
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  const modelFiles = context.files.filter((file) => file.role === "primary-model" || file.role === "base-model");
  const inspections = new Map<string, SpiceInputInspection>();
  const availablePaths = new Set(context.files.map((file) => file.relativePath));
  const filesByPath = new Map(context.files.map((file) => [file.relativePath, file]));
  const pending = [...modelFiles]; const inspected = new Set<string>();
  while (pending.length) {
    const file = pending.shift()!; if (inspected.has(file.relativePath)) continue; inspected.add(file.relativePath);
    if (!MODEL_EXTENSIONS.has(path.posix.extname(file.relativePath).toLowerCase())) {
      errors.push(validationError("benchmark.model_extension", `${file.relativePath} is not an accepted SPICE model extension`));
      continue;
    }
    const text = await readInputText(context, file);
    if (text !== null) {
      const danger = isUnsafeSpiceText(text);
      if (danger) errors.push(validationError("benchmark.unsafe_spice", `${file.relativePath}: ${danger}`));
      // Advisory discovery can accelerate safety scans; only the AST decides include semantics.
      const { dependencies } = analyzeIncludes(file, text, availablePaths);
      for (const dependency of dependencies) {
        const target = filesByPath.get(dependency); if (target && !inspected.has(dependency)) pending.push(target);
      }
    } else if (file.sizeBytes > MAX_MODEL_INSPECTION_BYTES) errors.push(validationError("benchmark.model_too_large_to_validate", `${file.relativePath} exceeds the ${MAX_MODEL_INSPECTION_BYTES / (1024 * 1024)} MiB safety-inspection limit`));
    else errors.push(validationError("benchmark.model_unreadable", `${file.relativePath} could not be inspected safely`));
  }

  const tools = selectedTools(parameters);
  const suppliedOrder = context.job.parameters.operationOrder;
  const rawOrder = suppliedOrder ?? [];
  if (!Array.isArray(rawOrder) || rawOrder.some((entry) => typeof entry !== "string" || !PROCESSING_TOOL_ORDER.includes(entry as typeof PROCESSING_TOOL_ORDER[number]))) {
    errors.push(validationError("benchmark.operation_order_invalid", "Processing order must contain only Translator, Fitting, Reduction and Expansion"));
  } else if (suppliedOrder !== undefined) {
    const requested = rawOrder as string[];
    if (new Set(requested).size !== requested.length) errors.push(validationError("benchmark.operation_order_duplicate", "Each selected processing tool must occur exactly once in the order"));
    const enabled = PROCESSING_TOOL_ORDER.filter((toolId) => operationEnabled(parameters, toolId));
    if (enabled.some((toolId) => !requested.includes(toolId)) || requested.some((toolId) => !enabled.includes(toolId as typeof PROCESSING_TOOL_ORDER[number]))) {
      errors.push(validationError("benchmark.operation_order_mismatch", "Processing order must contain every selected processing tool exactly once and no unselected tool"));
    }
  }
  errors.push(...validateSelectedParameters(parameters, tools, options));
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
  if (!fitting && primary.length + base.length === 0) errors.push(validationError("benchmark.model_required", "A primary SPICE model is required"));
  if (processing.length && primary.length + base.length > 1) {
    errors.push(validationError("benchmark.processing_single_model", "Processing workflows accept one source model; upload multiple models only for direct Benchmark comparison"));
  }
  if (primary.length + base.length === 0 && processing.length && processing[0] !== "fitting") {
    errors.push(validationError("benchmark.chain_model_missing", "The first processing tool requires an uploaded model; only Fitting can start from measured data alone"));
  }
  if (!tools.length) errors.push(validationError("benchmark.workflow_empty", "Select at least one processing tool or Benchmark"));
  if (operationEnabled(parameters, "spice-benchmark") && processing.length
    && !processing.some((toolId) => asObject(parameters[toolId]).exportToBenchmark !== false)) {
    errors.push(validationError("benchmark.output_model_required", "Select at least one processing-step output model as a Benchmark input"));
  }
  const requestedModes = Array.isArray(parameters.benchmark.modes)
    ? parameters.benchmark.modes.filter((mode): mode is string => typeof mode === "string")
    : [];
  const translatorIndex = processing.indexOf("translator");
  const translator = parameters.translator;
  if (translatorIndex >= 0) {
    if (translator.targetDialect !== undefined && translator.targetDialect !== "ngspice" && translator.verify === true) {
      errors.push(validationError("benchmark.translator_verify_target", "Translator verification is available only for an ngspice target"));
    }
    if (translator.targetDialect !== undefined && translator.targetDialect !== "ngspice" && translator.plot === true) {
      errors.push(validationError("benchmark.translator_plot_target", "Translator verification plots are available only for an ngspice target"));
    }
  }

  const inspectorConfiguration = context.job.toolConfigurations.find((entry) => entry.toolId === "translator" && entry.enabled);
  const inspectorHealth = options.health?.translator;
  if (modelFiles.length && (!inspectorConfiguration || inspectorHealth?.status !== "healthy" || inspectorHealth.adapterSelfTestPassed !== true)) {
    errors.push(configurationError("benchmark.input_normalizer_unavailable", "Authoritative MOS inspection and model normalization require a healthy configured Translator adapter"));
  } else {
    for (const file of modelFiles) {
      if (file.sizeBytes > MAX_MODEL_INSPECTION_BYTES || !inspected.has(file.relativePath)) continue;
      try {
        const inspection = await inspectInputModel(context, file.relativePath);
        inspections.set(file.relativePath, inspection);
        warnings.push(...inspection.warnings.map((warning) => `${file.relativePath}: ${warning}`));
        for (const dependency of inspection.dependencies) {
          const inputRoot = path.resolve(context.storageRoot, context.job.workspaceRelativePath, "input");
          const relative = path.relative(inputRoot, dependency).split(path.sep).join("/");
          const dependencyFile = filesByPath.get(relative);
          if (!dependencyFile) continue;
          const text = await readInputText(context, dependencyFile);
          if (text === null) errors.push(validationError("benchmark.model_unreadable", `${relative} could not be safety-inspected`));
          else {
            const danger = isUnsafeSpiceText(text);
            if (danger) errors.push(validationError("benchmark.unsafe_spice", `${relative}: ${danger}`));
          }
        }
      } catch (error) {
        errors.push(validationError("benchmark.model_ast_invalid", `${file.relativePath}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  if (operationEnabled(parameters, "spice-benchmark")) {
    for (const file of modelFiles) {
      const inspection = inspections.get(file.relativePath);
      if (!inspection) continue;
      if (!inspection.models.some((model) => model.polarity === "nmos")) {
        errors.push(validationError("benchmark.fixture_nmos_required", `${file.relativePath}: the unchanged Benchmark DC/AC/noise fixtures use positive NMOS biases and require an actual NMOS card; PMOS-only models cannot be benchmarked by this fixture`));
      }
      if (inspection.models.some((model) => model.hasBins === true || (model.binCount ?? 0) > 0)) {
        errors.push(validationError("benchmark.fixture_binning_unsupported", `${file.relativePath}: the fixed Benchmark fixture has no bin or geometry selector; provide an explicit regular MOS card extraction`));
      }
      if (inspection.models.some((model) => (model.scope?.length ?? 0) > 0)) {
        errors.push(validationError("benchmark.fixture_scope_unsupported", `${file.relativePath}: the fixed Benchmark fixture cannot instantiate subcircuit-scoped MOS cards; provide an explicit regular MOS card extraction`));
      }
      if (["nmos", "pmos"].some((polarity) => inspection.models.filter((model) => model.polarity === polarity).length > 1)) {
        errors.push(validationError("benchmark.fixture_model_selection_ambiguous", `${file.relativePath}: the fixed Benchmark fixture requires at most one NMOS and one PMOS card; provide an explicitly selected model library`));
      }
    }
  }

  if (operationEnabled(parameters, "spice-benchmark") && requestedModes.includes("transient")) {
    for (const file of modelFiles) {
      const inspection = inspections.get(file.relativePath);
      if (inspection && (!inspection.models.some((model) => model.polarity === "nmos") || !inspection.models.some((model) => model.polarity === "pmos"))) {
        errors.push(validationError("benchmark.transient_cmos_pair_required", `${file.relativePath} must contain real NMOS and PMOS cards for the fixed transient CMOS benchmark`));
      }
    }
    if (!modelFiles.length) errors.push(validationError("benchmark.transient_cmos_pair_required", "The fixed transient CMOS benchmark requires a real uploaded NMOS and PMOS pair"));
  }

  const firstInspection = inspections.get(modelFiles[0]?.relativePath ?? "");
  const firstTool = processing[0];
  if (firstTool === "translator" && firstInspection && translator.sourceDialect !== undefined && translator.sourceDialect !== "auto" && translator.sourceDialect !== firstInspection.dialect) {
    errors.push(validationError("benchmark.translator_source_mismatch", `Translator Source dialect is ${String(translator.sourceDialect)}, but the AST recognizes ${firstInspection.dialect}`));
  }
  if (firstInspection && ["fitting", "reduction"].includes(firstTool ?? "")) {
    const selected = asObject(parameters[firstTool!]);
    const name = typeof selected.modelName === "string" ? selected.modelName.trim() : "";
    const models = firstInspection.models;
    if (name && !models.some((model) => model.name.toLowerCase() === name.toLowerCase())) {
      errors.push(validationError("benchmark.model_selection_missing", `${firstTool}: selected model ${name} is absent from the parsed source`));
    } else if (!name && (models.filter((model) => model.polarity === "nmos").length > 1 || models.filter((model) => model.polarity === "pmos").length > 1)) {
      errors.push(validationError("benchmark.model_selection_ambiguous", `${firstTool}: specify a model name when multiple MOS cards have the same polarity`));
    }
  }

  if (fitting) {
    const optimizer = parameters.fitting.optimizer ?? "least_squares_trust_region";
    const loss = parameters.fitting.lossFunction ?? "Loss.robust_iv_loss.robust_iv_percent";
    if (optimizer === "least_squares_trust_region" && loss !== "Loss.robust_iv_loss.robust_iv_percent") {
      errors.push(validationError("benchmark.fitting_residual_loss_required", "Least-squares requires the robust residual-vector loss; choose a scalar optimizer for a legacy scalar loss"));
    }
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
        validateSigmaMap(parsed);
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
    const modes = requestedModes;
    if (!modes.length) errors.push(configurationError("benchmark.mode_required", "Select at least one Benchmark analysis domain"));
    for (const mode of modes) if (!["dc", "transient", "ac", "noise"].includes(mode)) errors.push(validationError("benchmark.mode_invalid", `Unsupported Benchmark analysis domain: ${mode}`));
  }

  return { valid: errors.length === 0, errors, warnings };
}
