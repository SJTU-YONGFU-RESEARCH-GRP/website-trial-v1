import { DigitalAdapterError } from "./helpers.js";

const SDC_COMMANDS = new Set([
  "create_clock",
  "set_input_delay",
  "set_output_delay",
  "set_input_transition",
  "set_load",
  "set_clock_uncertainty",
  "set_false_path",
  "set_multicycle_path",
  "set_max_delay",
  "set_min_delay",
]);

const SDC_BRACKET_COMMANDS = new Set([
  "get_ports",
  "get_clocks",
  "all_inputs",
  "all_outputs",
  "all_clocks",
  "remove_from_collection",
]);

/** Parse the deliberately small SDC subset accepted by the Digital adapter. */
export function sanitizeDigitalSdc(source: string, displayName = "SDC"): string {
  if (/\\\r?\n/.test(source)) {
    throw new DigitalAdapterError("DIGITAL_SDC_UNSUPPORTED", "SDC line continuations are not accepted; place each command on one line");
  }
  const output: string[] = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes(";") || line.includes("\0") || /\$[A-Za-z_{]/.test(line)) {
      throw new DigitalAdapterError("DIGITAL_SDC_UNSAFE", `${displayName}:${index + 1}: Tcl separators and variable substitution are forbidden`);
    }
    const command = /^([A-Za-z_][A-Za-z0-9_]*)\b/.exec(line)?.[1];
    if (!command || !SDC_COMMANDS.has(command)) {
      throw new DigitalAdapterError("DIGITAL_SDC_COMMAND_UNSUPPORTED", `${displayName}:${index + 1}: unsupported SDC command ${command ?? "<unknown>"}`);
    }
    for (const bracket of line.matchAll(/\[\s*([A-Za-z_][A-Za-z0-9_]*)\b/g)) {
      if (!SDC_BRACKET_COMMANDS.has(bracket[1])) {
        throw new DigitalAdapterError("DIGITAL_SDC_UNSAFE", `${displayName}:${index + 1}: unsafe Tcl command substitution ${bracket[1]}`);
      }
    }
    output.push(line);
  }
  if (output.length === 0) throw new DigitalAdapterError("DIGITAL_SDC_EMPTY", `${displayName} contains no supported constraints`);
  return `${output.join("\n")}\n`;
}
