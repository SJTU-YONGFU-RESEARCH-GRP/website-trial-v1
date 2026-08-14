import fs from "node:fs/promises";
import path from "node:path";
import type {
  CollectedArtifactV1,
  DraftValidationContextV1,
  ModuleAdapterV1,
  ModuleContextV1,
  ParsedModuleResultV1,
  StepExecutionContextV1,
} from "../../../shared/contracts/v1.js";
import { digitalCapabilities } from "./capabilities.js";
import { executeDigitalStep } from "./executor.js";
import { normalizeRunParameters, structuredError, workspacePath } from "./helpers.js";
import { validateInputMapping } from "./inputs.js";
import { validateParsedDigitalResult } from "./parsers/result.js";
import { buildDigitalPlan } from "./planner.js";
import type { DigitalExecutionContext, DigitalModuleBindings, DigitalModuleContext } from "./types.js";
import { DIGITAL_ADAPTER_ID } from "./types.js";

async function existingArtifact(context: StepExecutionContextV1, role: string, relativePath: string, mediaType: string, required: boolean, publish = true): Promise<CollectedArtifactV1 | null> {
  try {
    const stat = await fs.stat(path.resolve(context.workspacePath, relativePath));
    if (!stat.isFile()) return null;
    return { role, relativePath, mediaType, required, publish };
  } catch {
    return null;
  }
}

export const digitalModuleAdapter: ModuleAdapterV1 = {
  moduleId: "digital",

  async capabilities(context: ModuleContextV1) {
    return digitalCapabilities(context as DigitalModuleContext);
  },

  async validateDraft(context: DraftValidationContextV1) {
    const validation = await validateInputMapping(context);
    if (context.job.operation !== "import") {
      try {
        const parameters = normalizeRunParameters(context.job.parameters);
        if (validation.mapping.sdc.length === 0 && parameters.clockPeriodNs === null) {
          validation.errors.push({ type: "validation", code: "DIGITAL_CLOCK_REQUIRED", message: "upload one SDC or provide clockPeriodNs", stepId: null, retryable: false, details: null });
        }
        if (context.technology && !context.technology.allowedAdapterIds.includes(DIGITAL_ADAPTER_ID)) {
          validation.errors.push({ type: "configuration", code: "DIGITAL_TECHNOLOGY_NOT_ALLOWED", message: `technology ${context.technology.technologyId} does not allow ${DIGITAL_ADAPTER_ID}`, stepId: null, retryable: false, details: null });
        }
      } catch (error) {
        validation.errors.push(structuredError(error));
      }
      for (const toolId of ["yosys", "opensta", ...(validation.mapping.testbench.length > 0 ? ["iverilog", "vvp"] : [])]) {
        const configuration = context.job.toolConfigurations.find((item) => item.toolId === toolId);
        const binding = (context as DraftValidationContextV1 & DigitalModuleBindings).toolBindings?.[toolId];
        if (!configuration?.enabled || !configuration.executablePath) {
          validation.errors.push({ type: "configuration", code: "DIGITAL_TOOL_NOT_CONFIGURED", message: `${toolId} is unavailable; ask an administrator to configure and probe it`, stepId: null, retryable: false, details: null });
        } else if (binding?.health !== "healthy" || binding.selfTestPassed !== true) {
          validation.errors.push({ type: "configuration", code: "DIGITAL_TOOL_SELF_TEST_REQUIRED", message: `${toolId} must pass its adapter minimal self-test before it can run`, stepId: null, retryable: false, details: null });
        }
      }
    }
    return { valid: validation.errors.length === 0, errors: validation.errors, warnings: validation.warnings };
  },

  async buildPlan(context: DraftValidationContextV1) {
    return buildDigitalPlan(context);
  },

  async executeStep(context: StepExecutionContextV1) {
    try {
      return await executeDigitalStep(context as DigitalExecutionContext);
    } catch (error) {
      throw structuredError(error, context.step.id);
    }
  },

  async parseResult(context: StepExecutionContextV1): Promise<ParsedModuleResultV1> {
    const filename = workspacePath(context.workspacePath, "output", "digital-result.json");
    const result = JSON.parse(await fs.readFile(filename, "utf8")) as ParsedModuleResultV1;
    validateParsedDigitalResult(result);
    return result;
  },

  async publishResult(_context: StepExecutionContextV1, result: ParsedModuleResultV1) {
    validateParsedDigitalResult(result);
  },

  async collectArtifacts(context: StepExecutionContextV1) {
    const specifications: Array<[string, string, string, boolean, boolean?]> = [
      ["normalized-result", "output/digital-result.json", "application/json", true],
      ["mapped-verilog", "output/mapped.v", "text/x-verilog", false],
      ["mapped-json", "output/mapped.json", "application/json", false],
      ["yosys-stat", "output/yosys-stat.json", "application/json", false],
      ["setup-timing", "output/setup-checks.rpt", "text/plain", false],
      ["hold-timing", "output/hold-checks.rpt", "text/plain", false],
      ["minimum-period", "output/min-period.rpt", "text/plain", false],
      ["yosys-script", "work/synthesis.ys", "text/plain", false],
      ["opensta-script", "work/opensta.tcl", "text/plain", false],
      ["sanitized-sdc", "work/constraints.sdc", "text/plain", false],
      ["yosys-log", "logs/yosys.log", "text/plain", false],
      ["opensta-log", "logs/opensta.log", "text/plain", false],
      ["simulation-log", "logs/vvp.log", "text/plain", false],
    ];
    const artifacts = await Promise.all(specifications.map(([role, relativePath, mediaType, required, publish]) => existingArtifact(context, role, relativePath, mediaType, required, publish)));
    return artifacts.filter((artifact): artifact is CollectedArtifactV1 => artifact !== null);
  },
};

export default digitalModuleAdapter;
