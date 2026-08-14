import type { DraftValidationContextV1, InputFileV1, StructuredJobErrorV1, TechnologyLibraryV1 } from "../../../shared/contracts/v1.ts";
import { ppaFlowAdapters } from "./adapters/index.ts";
import { normalizeParameters, objectValue, PpaAdapterError } from "./helpers.ts";
import { expandSweep } from "./sweep.ts";
import type { PpaRuntimeBindings } from "./types.ts";

export interface PpaInputMap { rtl: InputFileV1[]; gate: InputFileV1[]; sdc: InputFileV1[]; include: InputFileV1[]; macro_lib: InputFileV1[]; macro_lef: InputFileV1[]; macro_gds: InputFileV1[]; completed_run: InputFileV1[]; ignored: InputFileV1[]; }
const ROLES = new Set(["rtl", "gate_netlist", "sdc", "include", "macro_lib", "macro_lef", "macro_gds", "completed_run", "ignore"]);
const GENERATED_CONFIG_PATH = /^[A-Za-z0-9_.+@%/-]+$/;

export function mapPpaInputs(files: readonly InputFileV1[]): PpaInputMap {
  const mapped: PpaInputMap = { rtl: [], gate: [], sdc: [], include: [], macro_lib: [], macro_lef: [], macro_gds: [], completed_run: [], ignored: [] };
  for (const file of files) {
    if (!file.role || !ROLES.has(file.role)) { mapped.ignored.push(file); continue; }
    if (file.role === "gate_netlist") mapped.gate.push(file);
    else if (file.role === "ignore") mapped.ignored.push(file);
    else if (file.role === "rtl") mapped.rtl.push(file);
    else if (file.role === "sdc") mapped.sdc.push(file);
    else if (file.role === "include") mapped.include.push(file);
    else if (file.role === "macro_lib") mapped.macro_lib.push(file);
    else if (file.role === "macro_lef") mapped.macro_lef.push(file);
    else if (file.role === "macro_gds") mapped.macro_gds.push(file);
    else if (file.role === "completed_run") mapped.completed_run.push(file);
  }
  return mapped;
}

function error(value: unknown): StructuredJobErrorV1 {
  if (value instanceof PpaAdapterError) return { type: value.kind, code: value.code, message: value.message, stepId: null, retryable: false, details: null };
  return { type: "validation", code: "PPA_VALIDATION_FAILED", message: value instanceof Error ? value.message : String(value), stepId: null, retryable: false, details: null };
}

function contextBindings(context: DraftValidationContextV1): PpaRuntimeBindings {
  return context as DraftValidationContextV1 & PpaRuntimeBindings;
}

export function selectedTechnology(context: DraftValidationContextV1): TechnologyLibraryV1 | null {
  return context.technology ?? contextBindings(context).technologies?.find((technology) => technology.id === context.job.parameters.technologyLibraryId) ?? null;
}

export async function validatePpaDraft(context: DraftValidationContextV1): Promise<{ valid: boolean; errors: StructuredJobErrorV1[]; warnings: string[] }> {
  const errors: StructuredJobErrorV1[] = []; const warnings: string[] = []; const mapping = mapPpaInputs(context.files);
  try {
    const parameters = normalizeParameters(context.job.parameters); const adapter = ppaFlowAdapters[parameters.flow];
    const importMode = /import/i.test(context.job.operation);
    if (importMode) {
      if (!mapping.completed_run.length) throw new PpaAdapterError("PPA_COMPLETED_RUN_REQUIRED", "map at least one completed-run result/evidence file");
    } else {
      if (!mapping.rtl.length && !mapping.gate.length) throw new PpaAdapterError("PPA_SOURCE_REQUIRED", "map RTL or a supported gate-level netlist");
      if (mapping.rtl.length && mapping.gate.length) throw new PpaAdapterError("PPA_START_POINT_AMBIGUOUS", "choose either RTL or gate-level start point, not both");
      if (mapping.sdc.length > 1) throw new PpaAdapterError("PPA_SDC_MULTIPLE", "only one SDC may be mapped");
      const technology = selectedTechnology(context);
      if (!technology?.enabled) throw new PpaAdapterError("PPA_TECHNOLOGY_REQUIRED", "select an enabled registered technology", "configuration");
      if (!technology.allowedAdapterIds.includes(parameters.flow)) throw new PpaAdapterError("PPA_TECHNOLOGY_NOT_ALLOWED", `${technology.technologyId} does not allow ${parameters.flow}`, "configuration");
      for (const file of [...mapping.rtl, ...mapping.gate, ...mapping.sdc, ...mapping.include, ...mapping.macro_lib, ...mapping.macro_lef, ...mapping.macro_gds]) {
        if (!GENERATED_CONFIG_PATH.test(file.relativePath)) throw new PpaAdapterError("PPA_CONFIG_PATH_UNSAFE", `${file.relativePath} cannot be represented safely in a generated flow configuration`);
      }
      const flowBinding = contextBindings(context).toolBindings?.[parameters.flow];
      if (!flowBinding || flowBinding.health !== "healthy" || flowBinding.selfTestPassed !== true) throw new PpaAdapterError("PPA_FLOW_UNAVAILABLE", `${parameters.flow} must pass its adapter minimal self-test before RTL-to-GDS can run`, "configuration");
    }
    const parserBinding = contextBindings(context).toolBindings?.["ppa-result-parser"];
    if (!parserBinding || parserBinding.health !== "healthy" || parserBinding.selfTestPassed !== true) throw new PpaAdapterError("PPA_PARSER_UNAVAILABLE", "ppa-result-parser must pass its parser self-test before use", "configuration");
    const maximum = contextBindings(context).maxSweepJobs ?? Number(objectValue(ppaFlowAdapters[parameters.flow]).maxSweepJobs ?? 256);
    expandSweep(context.job.parameters, adapter.parameters, maximum);
    for (const file of context.files) {
      if (file.validationErrors.length) throw new PpaAdapterError("PPA_INPUT_INVALID", `${file.relativePath}: ${file.validationErrors.join("; ")}`);
      if (file.unresolvedIncludes.length) errors.push({ type: "validation", code: "PPA_INCLUDE_UNRESOLVED", message: `${file.relativePath}: unresolved include ${file.unresolvedIncludes.join(", ")}`, stepId: null, retryable: false, details: null });
      if (file.recognizedType === "evidence-script-never-executed") warnings.push(`${file.relativePath} is retained as evidence and will never be executed.`);
    }
  } catch (caught) { errors.push(error(caught)); }
  return { valid: errors.length === 0, errors, warnings };
}
