import fs from "node:fs/promises";
import path from "node:path";
import { DigitalAdapterError, asObject, normalizeRunParameters, workspacePath } from "../helpers.js";
import { libertyPathFor } from "../scripts.js";
import type { DigitalExecutionContext, DigitalNormalizedRow, DigitalPowerData } from "../types.js";
import { parseLiberty } from "./liberty.js";

async function readText(filename: string): Promise<string> {
  try {
    return await fs.readFile(filename, "utf8");
  } catch (error) {
    throw new DigitalAdapterError("DIGITAL_OUTPUT_MISSING", `${path.basename(filename)} is missing: ${String(error)}`, "parser");
  }
}

function finite(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function reportNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const numeric = Number(match[1]);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return null;
}

function yosysTopModule(json: unknown, topModule: string): Record<string, unknown> {
  const root = asObject(json);
  const modules = asObject(root.modules);
  const direct = asObject(modules[topModule]);
  if (Object.keys(direct).length > 0) return direct;
  const escaped = asObject(modules[`\\${topModule}`]);
  if (Object.keys(escaped).length > 0) return escaped;
  throw new DigitalAdapterError("DIGITAL_MAPPED_TOP_MISSING", `mapped JSON does not contain top module ${topModule}`, "parser");
}

function cellUsageFromMappedJson(json: unknown, topModule: string): Record<string, number> {
  const cells = asObject(yosysTopModule(json, topModule).cells);
  const counts: Record<string, number> = {};
  for (const value of Object.values(cells)) {
    const cellType = asObject(value).type;
    if (typeof cellType !== "string" || !cellType) continue;
    counts[cellType] = (counts[cellType] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")));
}

function areaFromStat(json: unknown, topModule: string): number | null {
  const root = asObject(json);
  const modules = asObject(root.modules);
  for (const key of [topModule, `\\${topModule}`]) {
    const module = asObject(modules[key]);
    for (const field of ["area", "chip_area", "cell_area"]) {
      const value = finite(module[field]);
      if (value !== null && value >= 0) return value;
    }
  }
  const design = asObject(root.design);
  for (const field of ["area", "chip_area", "cell_area"]) {
    const value = finite(design[field]);
    if (value !== null && value >= 0) return value;
  }
  return null;
}

function leakagePower(
  cellUsage: Record<string, number>,
  cells: Awaited<ReturnType<typeof parseLiberty>>["cells"],
  hasLeakageUnit: boolean,
): { power: DigitalPowerData; missing: string[]; conditional: string[] } {
  const missing: string[] = [];
  const conditional: string[] = [];
  let sum = 0;
  for (const [cellType, count] of Object.entries(cellUsage)) {
    const cell = cells.get(cellType);
    if (!cell || cell.leakageMw === null) missing.push(cellType);
    else {
      sum += cell.leakageMw * count;
      if (cell.leakageSource === "conditional_average") conditional.push(cellType);
    }
  }
  if (!hasLeakageUnit || missing.length > 0) {
    const reason = !hasLeakageUnit
      ? "Liberty does not declare leakage_power_unit; static leakage was not calculated."
      : `Static leakage is unavailable because ${missing.length} mapped cell type(s) lack a usable Liberty leakage value.`;
    return {
      power: { metric: "unavailable", staticLeakageMw: null, estimatedDynamicMw: null, totalPowerMw: null, reportedMw: null, source: "Liberty", caveat: reason },
      missing,
      conditional,
    };
  }
  return {
    power: {
      metric: "static_liberty_leakage",
      staticLeakageMw: sum,
      estimatedDynamicMw: null,
      totalPowerMw: null,
      reportedMw: sum,
      source: conditional.length > 0 ? "Liberty cell_leakage_power plus averaged conditional leakage_power groups" : "Liberty cell_leakage_power",
      caveat: "Static Liberty leakage only; no activity-based dynamic or total design power was calculated.",
    },
    missing,
    conditional,
  };
}

export async function parseComputedDigitalResult(context: DigitalExecutionContext): Promise<DigitalNormalizedRow> {
  const parameters = normalizeRunParameters(context.job.parameters);
  const mappedJson = JSON.parse(await readText(workspacePath(context.workspacePath, "output", "mapped.json"))) as unknown;
  const statJson = JSON.parse(await readText(workspacePath(context.workspacePath, "output", "yosys-stat.json"))) as unknown;
  const cellUsage = cellUsageFromMappedJson(mappedJson, parameters.topModule);
  const libertyAbsolute = path.isAbsolute(libertyPathFor(context))
    ? libertyPathFor(context)
    : path.resolve(context.workspacePath, libertyPathFor(context));
  const liberty = await parseLiberty(libertyAbsolute);
  const leakage = leakagePower(cellUsage, liberty.cells, liberty.leakageUnitToMw !== null);
  let areaUm2 = areaFromStat(statJson, parameters.topModule);
  const missingArea = Object.keys(cellUsage).filter((cellType) => liberty.cells.get(cellType)?.areaUm2 === null || !liberty.cells.has(cellType));
  const libertyArea = missingArea.length === 0
    ? Object.entries(cellUsage).reduce((sum, [cellType, count]) => sum + (liberty.cells.get(cellType)?.areaUm2 ?? 0) * count, 0)
    : null;
  if (areaUm2 === null) areaUm2 = libertyArea;
  if (areaUm2 === null) throw new DigitalAdapterError("DIGITAL_AREA_UNAVAILABLE", "mapped-cell area could not be parsed from Yosys or the selected Liberty", "parser");

  const setupWns = reportNumber(await readText(workspacePath(context.workspacePath, "output", "setup-wns.rpt")), [/worst\s+slack\s+([-+0-9.eE]+)/i, /([-+0-9.eE]+)\s+slack/i]);
  const holdWns = reportNumber(await readText(workspacePath(context.workspacePath, "output", "hold-wns.rpt")), [/worst\s+slack\s+([-+0-9.eE]+)/i, /([-+0-9.eE]+)\s+slack/i]);
  const setupTns = reportNumber(await readText(workspacePath(context.workspacePath, "output", "setup-tns.rpt")), [/(?:tns|total\s+negative\s+slack)\s+([-+0-9.eE]+)/i]);
  const holdTns = reportNumber(await readText(workspacePath(context.workspacePath, "output", "hold-tns.rpt")), [/(?:tns|total\s+negative\s+slack)\s+([-+0-9.eE]+)/i]);
  const minimumPeriodReport = await readText(workspacePath(context.workspacePath, "output", "min-period.rpt"));
  let minimumPeriod = reportNumber(minimumPeriodReport, [/(?:min(?:imum)?\s+period|max\s+delay)[^0-9+-]*([-+0-9.eE]+)/i]);
  if ((minimumPeriod === null || minimumPeriod <= 0) && parameters.clockPeriodNs !== null && setupWns !== null) {
    minimumPeriod = parameters.clockPeriodNs - setupWns;
  }
  const fmaxMhz = minimumPeriod !== null && minimumPeriod > 0 ? 1000 / minimumPeriod : null;
  const simulationLogPath = workspacePath(context.workspacePath, "logs", "vvp.log");
  let simulationExecuted = false;
  let simulationPassed: boolean | null = null;
  try {
    const simulationLog = await fs.readFile(simulationLogPath, "utf8");
    simulationExecuted = true;
    simulationPassed = !/(?:^|\b)(?:FAIL|FATAL|ERROR)(?:\b|:)/im.test(simulationLog);
  } catch {
    // Simulation was not part of this plan.
  }
  const warnings = [leakage.power.caveat];
  if (leakage.conditional.length > 0) warnings.push(`Conditional leakage states were averaged for: ${leakage.conditional.join(", ")}.`);
  if (fmaxMhz === null) warnings.push("Fmax is unavailable because OpenSTA did not report a positive minimum period.");
  return {
    architecture: parameters.architecture,
    category: parameters.category,
    design: parameters.design,
    topModule: parameters.topModule,
    bitWidth: parameters.bitWidth,
    processTechnology: parameters.processTechnology,
    library: parameters.library,
    corner: parameters.corner,
    fmaxMhz,
    areaUm2,
    setupWnsNs: setupWns,
    holdWnsNs: holdWns,
    setupTnsNs: setupTns,
    holdTnsNs: holdTns,
    cellCount: Object.values(cellUsage).reduce((sum, count) => sum + count, 0),
    cellUsage,
    power: leakage.power,
    simulationExecuted,
    simulationPassed,
    warnings,
  };
}
