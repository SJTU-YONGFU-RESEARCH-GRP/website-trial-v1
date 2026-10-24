const SDC_COMMANDS = new Set([
  "create_clock", "set_input_delay", "set_output_delay", "set_clock_uncertainty",
  "set_input_transition", "set_load", "set_false_path", "set_multicycle_path",
  "set_max_delay", "set_min_delay", "set_clock_groups",
]);
const SDC_QUERIES = new Set([
  "get_ports", "get_pins", "get_clocks", "get_cells", "get_nets",
  "all_inputs", "all_outputs", "all_registers",
]);

/** Parse and regenerate the conservative SDC subset accepted by PPA source runs. */
export function sanitizePpaSdc(source: string): string {
  const accepted: string[] = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/[;\0`$]/.test(line) || line.endsWith("\\")) throw new Error(`unsafe SDC syntax on line ${index + 1}`);
    const command = /^(\S+)/.exec(line)?.[1] ?? "";
    if (!SDC_COMMANDS.has(command)) throw new Error(`unsupported SDC command ${command || "<empty>"} on line ${index + 1}`);
    for (const match of line.matchAll(/\[([^\[\]]+)\]/g)) {
      const query = match[1].trim().split(/\s+/, 1)[0];
      if (!SDC_QUERIES.has(query)) throw new Error(`unsafe SDC query ${query} on line ${index + 1}`);
    }
    const withoutAllowed = line.replaceAll(/\[[^\[\]]+\]/g, "");
    if (withoutAllowed.includes("[") || withoutAllowed.includes("]")) throw new Error(`nested or unmatched SDC query on line ${index + 1}`);
    accepted.push(line);
  }
  if (!accepted.length) throw new Error("SDC contains no supported constraints");
  return `${accepted.join("\n")}\n`;
}
