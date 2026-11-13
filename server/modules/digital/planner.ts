import path from "node:path";
import type { DraftValidationContextV1, JobPlanV1, PlannedProcessV1, PlannedStepV1, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.js";
import { DigitalAdapterError, normalizeRunParameters } from "./helpers.js";
import { mapDigitalInputs } from "./inputs.js";
import { DIGITAL_CAPABILITY_VERSION } from "./types.js";
import type { DigitalToolId } from "./types.js";

function tool(context: DraftValidationContextV1, toolId: DigitalToolId): ToolConfigurationSnapshotV1 {
  const configuration = context.job.toolConfigurations.find((item) => item.toolId === toolId);
  if (!configuration?.enabled || !configuration.executablePath) {
    throw new DigitalAdapterError("DIGITAL_TOOL_NOT_CONFIGURED", `${toolId} is required but is not configured`, "configuration");
  }
  if (!path.isAbsolute(configuration.executablePath)) {
    throw new DigitalAdapterError("DIGITAL_EXECUTABLE_NOT_ABSOLUTE", `${toolId} executable path must be absolute`, "configuration");
  }
  return configuration;
}

function process(configuration: ToolConfigurationSnapshotV1, argv: string[]): PlannedProcessV1 {
  return {
    toolConfigurationId: configuration.id,
    executableDisplay: configuration.executablePath ?? configuration.toolId,
    argv,
    cwdRelative: ".",
    environmentNames: configuration.environmentNames,
    timeoutSeconds: configuration.timeoutSeconds,
  };
}

function step(
  id: string,
  name: string,
  description: string,
  weight: number,
  processSpec: PlannedProcessV1 | null,
  inputRoles: string[],
  outputRoles: string[],
): PlannedStepV1 {
  return { id, name, description, required: true, weight, process: processSpec, inputRoles, outputRoles };
}

export function buildDigitalPlan(context: DraftValidationContextV1): JobPlanV1 {
  const mapping = mapDigitalInputs(context.files);
  if (context.job.operation === "import") {
    return {
      schemaVersion: "eda.job-plan.v1",
      capabilityVersion: DIGITAL_CAPABILITY_VERSION,
      steps: [
        step("validate-input", "Validate completed result", "Validate JSON/CSV structure and power semantics without executing imported content.", 20, null, ["completed_result"], []),
        step("normalize", "Normalize Digital result", "Convert every imported row to the shared Digital Result schema.", 60, null, ["completed_result"], ["normalized-result"]),
        step("publish", "Publish atomically", "Publish only after every normalized row passes schema validation.", 20, null, ["normalized-result"], ["digital-result"]),
      ],
      sweep: null,
      warnings: [],
    };
  }

  const parameters = normalizeRunParameters(context.job.parameters);
  const yosys = tool(context, "yosys");
  const opensta = tool(context, "opensta");
  const steps: PlannedStepV1[] = [
    step("validate-input", "Input validation", "Validate mappings, unresolved includes, metadata, constraint source, and selected tool/technology configuration.", 5, null, ["rtl", "gate_netlist", "yosys_json", "liberty", "sdc", "include"], []),
    step("resolve-hierarchy", "Resolve hierarchy and top", `Resolve and require top module ${parameters.topModule}.`, 5, null, ["rtl", "gate_netlist", "yosys_json"], ["hierarchy-manifest"]),
  ];
  if (mapping.testbench.length > 0) {
    const iverilog = tool(context, "iverilog");
    const vvp = tool(context, "vvp");
    const sources = [...mapping.rtl, ...mapping.testbench].map((file) => `input/${file.relativePath}`);
    const includeDirectories = [...new Set(mapping.includes.map((file) => `input/${path.posix.dirname(file.relativePath)}`))];
    steps.push(
      step(
        "simulation-compile",
        "Compile RTL simulation",
        "Compile mapped RTL and testbench files with Icarus Verilog; uploaded programs/scripts are never executed.",
        10,
        process(iverilog, ["-g2012", "-s", parameters.simulationTop ?? parameters.topModule, ...includeDirectories.flatMap((directory) => ["-I", directory]), "-o", "work/simulation.vvp", ...sources]),
        ["rtl", "testbench", "include"],
        ["simulation-image", "simulation-compile-log"],
      ),
      step("simulation-run", "Run RTL simulation", "Run the Icarus-produced VVP image.", 10, process(vvp, ["work/simulation.vvp"]), ["simulation-image"], ["simulation-log"]),
    );
  }
  steps.push(
    step("synthesis", "Yosys synthesis and mapping", "Execute the backend-generated Yosys script; source input cannot provide tool commands.", 30, process(yosys, ["-ql", "logs/yosys.log", "work/synthesis.ys"]), ["rtl", "gate_netlist", "yosys_json", "liberty", "include"], ["mapped-verilog", "mapped-json", "yosys-stat", "yosys-log"]),
    step("timing", "OpenSTA pre-layout timing", "Execute the backend-generated OpenSTA script with selected Liberty and SDC/generated constraints.", 25, process(opensta, ["work/opensta.tcl"]), ["mapped-verilog", "liberty", "sdc"], ["timing-reports", "opensta-log"]),
    step("normalize", "Normalize area, timing, and static leakage", "Parse native reports and label power strictly as static Liberty leakage.", 10, null, ["mapped-json", "yosys-stat", "timing-reports", "liberty"], ["normalized-result"]),
    step("publish", "Publish atomically", "Publish the normalized result and retained evidence only after parser validation succeeds.", 5, null, ["normalized-result"], ["digital-result"]),
  );
  return {
    schemaVersion: "eda.job-plan.v1",
    capabilityVersion: DIGITAL_CAPABILITY_VERSION,
    steps,
    sweep: null,
    warnings: ["Power is static Liberty leakage only. No dynamic or total power is produced by this workflow."],
  };
}
