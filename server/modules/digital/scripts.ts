import path from "node:path";
import type { TechnologyLibraryV1 } from "../../../shared/contracts/v1.js";
import { DigitalAdapterError, normalizeRunParameters, quoteTcl, quoteYosys, workspacePath, writeUtf8Atomic } from "./helpers.js";
import { mapDigitalInputs } from "./inputs.js";
import type { DigitalExecutionContext } from "./types.js";

function inputRelative(relativePath: string): string {
  return `input/${relativePath.replaceAll("\\", "/")}`;
}

function selectedTechnology(context: DigitalExecutionContext): TechnologyLibraryV1 | null {
  const selectedId = typeof context.job.parameters.technologyLibraryId === "string"
    ? context.job.parameters.technologyLibraryId
    : null;
  if (!selectedId) return null;
  return context.technologies?.find((item) => item.id === selectedId) ?? null;
}

export function libertyPathFor(context: DigitalExecutionContext): string {
  const mapping = mapDigitalInputs(context.job.inputManifest.files);
  if (mapping.liberty.length === 1) return inputRelative(mapping.liberty[0].relativePath);
  const technology = selectedTechnology(context);
  if (!technology || technology.libertyPaths.length !== 1) {
    throw new DigitalAdapterError("DIGITAL_TECHNOLOGY_BINDING_MISSING", "the selected technology must expose exactly one validated Liberty path", "configuration");
  }
  const liberty = technology.libertyPaths[0];
  if (!path.isAbsolute(liberty)) {
    throw new DigitalAdapterError("DIGITAL_TECHNOLOGY_PATH_INVALID", "registered Liberty path must be absolute", "configuration");
  }
  return liberty;
}

function includeDirectories(relativePaths: string[]): string[] {
  return [...new Set(relativePaths.map((relativePath) => path.posix.dirname(inputRelative(relativePath))))];
}

export async function generateYosysScript(context: DigitalExecutionContext): Promise<string> {
  const mapping = mapDigitalInputs(context.job.inputManifest.files);
  const parameters = normalizeRunParameters(context.job.parameters);
  const liberty = libertyPathFor(context);
  const lines: string[] = [];
  if (mapping.rtl.length > 0 || mapping.gateNetlists.length > 0) {
    const sources = mapping.rtl.length > 0 ? mapping.rtl : mapping.gateNetlists;
    const includeDirs = includeDirectories(mapping.includes.map((file) => file.relativePath));
    lines.push(`read_verilog -sv ${includeDirs.map((directory) => `-I${quoteYosys(directory)}`).join(" ")} ${sources.map((file) => quoteYosys(inputRelative(file.relativePath))).join(" ")}`);
  } else if (mapping.yosysJson.length === 1) {
    lines.push(`read_json ${quoteYosys(inputRelative(mapping.yosysJson[0].relativePath))}`);
  } else {
    throw new DigitalAdapterError("DIGITAL_DESIGN_INPUT_REQUIRED", "no synthesis input is mapped");
  }
  lines.push(`hierarchy -check -top ${parameters.topModule}`);
  if (mapping.rtl.length > 0) {
    lines.push(`synth -top ${parameters.topModule} -noabc`);
    lines.push(`dfflibmap -liberty ${quoteYosys(liberty)}`);
    lines.push(`abc -liberty ${quoteYosys(liberty)}`);
  }
  lines.push("clean -purge", "check");
  lines.push(`tee -q -o ${quoteYosys("output/yosys-stat.json")} stat -json -top ${parameters.topModule} -liberty ${quoteYosys(liberty)}`);
  lines.push(`write_verilog -noattr -noexpr ${quoteYosys("output/mapped.v")}`);
  lines.push(`write_json ${quoteYosys("output/mapped.json")}`, "");
  const destination = workspacePath(context.workspacePath, "work", "synthesis.ys");
  await writeUtf8Atomic(destination, lines.join("\n"));
  return destination;
}

function generatedConstraints(parameters: ReturnType<typeof normalizeRunParameters>): string[] {
  if (parameters.clockPeriodNs === null) {
    throw new DigitalAdapterError("DIGITAL_CLOCK_REQUIRED", "clockPeriodNs is required when no SDC is uploaded");
  }
  const lines = parameters.clockPort
    ? [
      `create_clock -name digital_clock -period ${parameters.clockPeriodNs} [get_ports ${quoteTcl(parameters.clockPort)}]`,
      `set data_inputs [remove_from_collection [all_inputs] [get_ports ${quoteTcl(parameters.clockPort)}]]`,
    ]
    : [
      `create_clock -name digital_clock -period ${parameters.clockPeriodNs}`,
      "set data_inputs [all_inputs]",
    ];
  lines.push("set_input_delay 0.0 -clock digital_clock $data_inputs");
  lines.push("set_output_delay 0.0 -clock digital_clock [all_outputs]");
  if (parameters.inputSlewNs !== null) lines.push(`set_input_transition ${parameters.inputSlewNs} $data_inputs`);
  if (parameters.outputLoadPf !== null) lines.push(`set_load ${parameters.outputLoadPf} [all_outputs]`);
  return lines;
}

export async function generateOpenStaScript(context: DigitalExecutionContext): Promise<string> {
  const mapping = mapDigitalInputs(context.job.inputManifest.files);
  const parameters = normalizeRunParameters(context.job.parameters);
  const liberty = libertyPathFor(context);
  const lines = [
    `read_liberty ${quoteTcl(liberty)}`,
    `read_verilog ${quoteTcl("output/mapped.v")}`,
    `link_design ${parameters.topModule}`,
  ];
  if (mapping.sdc.length === 1) lines.push(`read_sdc ${quoteTcl("work/constraints.sdc")}`);
  else lines.push(...generatedConstraints(parameters));
  lines.push(
    `report_checks -path_delay max -format full_clock_expanded -fields {slew cap input_pins} -digits 6 -group_path_count 50 > ${quoteTcl("output/setup-checks.rpt")}`,
    `report_checks -path_delay min -format full_clock_expanded -fields {slew cap input_pins} -digits 6 -group_path_count 50 > ${quoteTcl("output/hold-checks.rpt")}`,
    `report_worst_slack -max -digits 9 > ${quoteTcl("output/setup-wns.rpt")}`,
    `report_worst_slack -min -digits 9 > ${quoteTcl("output/hold-wns.rpt")}`,
    `report_tns -max -digits 9 > ${quoteTcl("output/setup-tns.rpt")}`,
    `report_tns -min -digits 9 > ${quoteTcl("output/hold-tns.rpt")}`,
    `report_clock_min_period > ${quoteTcl("output/min-period.rpt")}`,
    "exit",
    "",
  );
  const destination = workspacePath(context.workspacePath, "work", "opensta.tcl");
  await writeUtf8Atomic(destination, lines.join("\n"));
  return destination;
}
