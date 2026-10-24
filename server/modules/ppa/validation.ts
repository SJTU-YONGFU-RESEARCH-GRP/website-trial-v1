import fs from "node:fs/promises";
import path from "node:path";
import type { DraftValidationContextV1, InputFileV1, StructuredJobErrorV1, TechnologyLibraryV1 } from "../../../shared/contracts/v1.ts";
import { adapterIdForTool } from "../../../shared/toolCatalog.ts";
import { ppaFlowAdapters } from "./adapters/index.ts";
import { normalizeParameters, objectValue, PpaAdapterError, workspacePath } from "./helpers.ts";
import { sanitizePpaSdc } from "./security.ts";
import { MAX_ACTIVE_SOURCE_TEXT_BYTES, SourceSecurityError, validateHdlSource } from "../../app/storage/sourceSecurity.ts";
import { expandSweep } from "./sweep.ts";
import type { PpaRuntimeBindings } from "./types.ts";

export interface PpaInputMap { rtl: InputFileV1[]; gate: InputFileV1[]; sdc: InputFileV1[]; include: InputFileV1[]; macro_lib: InputFileV1[]; macro_lef: InputFileV1[]; macro_gds: InputFileV1[]; completed_run: InputFileV1[]; ignored: InputFileV1[]; }
const ROLES = new Set(["rtl", "gate_netlist", "sdc", "include", "macro_lib", "macro_lef", "macro_gds", "completed_run", "ignore"]);
const GENERATED_CONFIG_PATH = /^[A-Za-z0-9_.+@%/-]+$/;
const ROLE_EXTENSIONS: Record<string, ReadonlySet<string>> = {
  rtl: new Set([".v", ".sv"]), gate_netlist: new Set([".v", ".sv"]), sdc: new Set([".sdc"]),
  include: new Set([".v", ".sv", ".vh", ".svh"]), macro_lib: new Set([".lib"]),
  macro_lef: new Set([".lef"]), macro_gds: new Set([".gds"]),
};

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
      const adapterId = adapterIdForTool(parameters.flow);
      if (!adapterId || !technology.allowedAdapterIds.includes(adapterId)) throw new PpaAdapterError("PPA_TECHNOLOGY_NOT_ALLOWED", `${technology.technologyId} does not allow ${adapterId ?? parameters.flow}`, "configuration");
      for (const file of [...mapping.rtl, ...mapping.gate, ...mapping.sdc, ...mapping.include, ...mapping.macro_lib, ...mapping.macro_lef, ...mapping.macro_gds]) {
        if (!GENERATED_CONFIG_PATH.test(file.relativePath)) throw new PpaAdapterError("PPA_CONFIG_PATH_UNSAFE", `${file.relativePath} cannot be represented safely in a generated flow configuration`);
        const allowed = file.role ? ROLE_EXTENSIONS[file.role] : undefined;
        if (allowed && !allowed.has(path.posix.extname(file.relativePath).toLowerCase())) throw new PpaAdapterError("PPA_ROLE_EXTENSION_MISMATCH", `${file.relativePath} cannot be mapped as ${file.role}`);
      }
      const flowBinding = contextBindings(context).toolBindings?.[parameters.flow];
      if (!flowBinding || flowBinding.health !== "healthy" || flowBinding.selfTestPassed !== true) throw new PpaAdapterError("PPA_FLOW_UNAVAILABLE", `${parameters.flow} must pass its adapter minimal self-test before RTL-to-GDS can run`, "configuration");
      const availablePaths = new Set(context.files.map((file) => file.relativePath)); const jobRoot = path.resolve(context.storageRoot, context.job.workspaceRelativePath);
      const byPath = new Map(context.files.map((file) => [file.relativePath, file]));
      const pending = [...mapping.rtl, ...mapping.gate, ...mapping.include]; const inspected = new Set<string>();
      while (pending.length) {
        const file = pending.shift()!; if (inspected.has(file.relativePath)) continue; inspected.add(file.relativePath);
        if (file.sizeBytes > MAX_ACTIVE_SOURCE_TEXT_BYTES) throw new PpaAdapterError("PPA_HDL_TOO_LARGE_TO_VALIDATE", `${file.relativePath} exceeds the 16 MiB safety-inspection limit`);
        const source = await fs.readFile(workspacePath(jobRoot, `input/${file.relativePath}`), "utf8");
        try {
          for (const dependency of validateHdlSource(file.relativePath, source, availablePaths)) {
            const target = byPath.get(dependency); if (target && !inspected.has(dependency)) pending.push(target);
          }
        }
        catch (cause) { throw new PpaAdapterError(`PPA_${cause instanceof SourceSecurityError ? cause.code : "HDL_UNREADABLE"}`, cause instanceof Error ? cause.message : String(cause)); }
      }
      for (const file of mapping.sdc) {
        const source = await fs.readFile(workspacePath(jobRoot, `input/${file.relativePath}`), "utf8");
        try {
          sanitizePpaSdc(source);
        } catch (cause) {
          throw new PpaAdapterError("PPA_SDC_UNSAFE", `${file.relativePath}: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      }
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
