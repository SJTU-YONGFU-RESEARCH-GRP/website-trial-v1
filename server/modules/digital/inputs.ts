import path from "node:path";
import type { DraftValidationContextV1, InputFileV1, StructuredJobErrorV1 } from "../../../shared/contracts/v1.js";
import { DigitalAdapterError, normalizeRelativePath, structuredError } from "./helpers.js";
import type { DigitalInputMapping, DigitalInputRole } from "./types.js";

const ROLE_SET = new Set<DigitalInputRole>([
  "rtl", "gate_netlist", "yosys_json", "liberty", "sdc", "testbench", "include", "completed_result",
]);

function explicitRole(file: InputFileV1): DigitalInputRole | null {
  return file.role && ROLE_SET.has(file.role as DigitalInputRole) ? file.role as DigitalInputRole : null;
}

function inferredRole(file: InputFileV1): DigitalInputRole | null {
  const extension = path.extname(file.relativePath).toLowerCase();
  const basename = path.basename(file.relativePath).toLowerCase();
  if (extension === ".lib") return "liberty";
  if (extension === ".sdc") return "sdc";
  if ([".vh", ".svh"].includes(extension)) return "include";
  if ([".csv", ".json"].includes(extension) && /(?:result|metric|digital)/.test(basename)) return "completed_result";
  return null;
}

export function mapDigitalInputs(files: InputFileV1[]): DigitalInputMapping {
  const result: DigitalInputMapping = {
    rtl: [], gateNetlists: [], yosysJson: [], liberty: [], sdc: [], testbench: [], includes: [], completedResults: [], unassigned: [],
  };
  for (const file of files) {
    normalizeRelativePath(file.relativePath);
    const role = explicitRole(file) ?? inferredRole(file);
    if (role === "rtl") result.rtl.push(file);
    else if (role === "gate_netlist") result.gateNetlists.push(file);
    else if (role === "yosys_json") result.yosysJson.push(file);
    else if (role === "liberty") result.liberty.push(file);
    else if (role === "sdc") result.sdc.push(file);
    else if (role === "testbench") result.testbench.push(file);
    else if (role === "include") result.includes.push(file);
    else if (role === "completed_result") result.completedResults.push(file);
    else result.unassigned.push(file);
  }
  return result;
}

export function validateInputMapping(context: DraftValidationContextV1): { errors: StructuredJobErrorV1[]; warnings: string[]; mapping: DigitalInputMapping } {
  const errors: StructuredJobErrorV1[] = [];
  const warnings: string[] = [];
  let mapping: DigitalInputMapping;
  try {
    mapping = mapDigitalInputs(context.files);
  } catch (error) {
    return { errors: [structuredError(error)], warnings, mapping: mapDigitalInputs([]) };
  }
  const operation = context.job.operation === "import" ? "import" : "run";
  if (operation === "import") {
    if (mapping.completedResults.length === 0) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_IMPORT_REQUIRED", "map at least one JSON or CSV file as completed_result")));
    }
    if (mapping.completedResults.some((file) => !/[.](?:json|csv)$/i.test(file.relativePath))) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_IMPORT_EXTENSION", "completed Digital results must be JSON or CSV")));
    }
  } else {
    const designInputs = mapping.rtl.length + mapping.gateNetlists.length + mapping.yosysJson.length;
    if (designInputs === 0) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_DESIGN_INPUT_REQUIRED", "map RTL, a gate-level Verilog netlist, or a Yosys JSON netlist")));
    }
    if (mapping.rtl.length > 0 && (mapping.gateNetlists.length > 0 || mapping.yosysJson.length > 0)) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_START_POINT_AMBIGUOUS", "RTL and synthesized-netlist start points cannot be mixed in one run")));
    }
    if (mapping.gateNetlists.length > 0 && mapping.yosysJson.length > 0) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_NETLIST_AMBIGUOUS", "choose gate-level Verilog or Yosys JSON, not both")));
    }
    if (mapping.liberty.length > 1) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_LIBERTY_AMBIGUOUS", "map exactly one uploaded Liberty, or select one registered technology")));
    }
    if (mapping.liberty.length === 0 && !context.technology) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_LIBERTY_REQUIRED", "upload a Liberty file or select a registered technology library")));
    }
    if (mapping.liberty.length > 0 && context.technology) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_LIBERTY_SOURCE_AMBIGUOUS", "choose either uploaded Liberty or a registered technology library")));
    }
    if (mapping.sdc.length > 1) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_SDC_AMBIGUOUS", "only one SDC may be mapped")));
    }
    if (mapping.testbench.length > 0 && mapping.rtl.length === 0) {
      errors.push(structuredError(new DigitalAdapterError("DIGITAL_TESTBENCH_WITHOUT_RTL", "RTL simulation requires RTL sources")));
    }
  }
  const unresolved = context.files.flatMap((file) => file.unresolvedIncludes.map((include) => `${file.relativePath}: ${include}`));
  if (unresolved.length > 0) {
    errors.push({
      type: "validation",
      code: "DIGITAL_INCLUDE_UNRESOLVED",
      message: "one or more Verilog include dependencies were not uploaded",
      stepId: null,
      retryable: false,
      details: { includes: unresolved },
    });
  }
  for (const file of context.files) {
    for (const message of file.validationErrors) {
      errors.push({ type: "validation", code: "DIGITAL_INPUT_INVALID", message: `${file.relativePath}: ${message}`, stepId: null, retryable: false, details: null });
    }
  }
  if (mapping.unassigned.length > 0) warnings.push(`${mapping.unassigned.length} file(s) are not mapped and will not be passed to a tool`);
  return { errors, warnings, mapping };
}
