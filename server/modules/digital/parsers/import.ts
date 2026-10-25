import fs from "node:fs/promises";
import path from "node:path";
import { DigitalAdapterError, asObject, optionalPositiveInteger, optionalString, requiredMetadata } from "../helpers.js";
import type { DigitalNormalizedRow, DigitalPowerData } from "../types.js";

function parseCsv(text: string): Record<string, string>[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value.trim())) records.push(record);
      record = [];
      field = "";
    } else field += character;
  }
  if (quoted) throw new DigitalAdapterError("DIGITAL_CSV_INVALID", "unterminated quoted CSV field", "parser");
  record.push(field.replace(/\r$/, ""));
  if (record.some((value) => value.trim())) records.push(record);
  if (records.length < 2) throw new DigitalAdapterError("DIGITAL_CSV_EMPTY", "CSV must contain a header and at least one result row", "parser");
  const headers = records[0].map((value) => value.trim());
  if (new Set(headers).size !== headers.length || headers.some((value) => !value)) {
    throw new DigitalAdapterError("DIGITAL_CSV_HEADER_INVALID", "CSV headers must be unique and non-empty", "parser");
  }
  return records.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function finiteRequired(value: unknown, label: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) throw new DigitalAdapterError("DIGITAL_IMPORT_METRIC_INVALID", `${label} must be a finite non-negative number`, "parser");
  return numeric;
}

function finiteOptional(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function importedPower(record: Record<string, unknown>, powerMw: number): DigitalPowerData {
  const normalized = optionalString(record.powerMetric)?.toLowerCase() ?? "";
  if (/static|leakage/.test(normalized)) {
    return { metric: "static_liberty_leakage", staticLeakageMw: powerMw, estimatedDynamicMw: null, totalPowerMw: null, reportedMw: powerMw, source: optionalString(record.powerMetric) ?? "Imported static leakage", caveat: "Static leakage only; this is not dynamic or total design power." };
  }
  if (/dynamic|switching|activity|vcd/.test(normalized) && !/total/.test(normalized)) {
    return { metric: "reported_dynamic", staticLeakageMw: null, estimatedDynamicMw: powerMw, totalPowerMw: null, reportedMw: powerMw, source: optionalString(record.powerMetric) ?? "Imported dynamic power", caveat: "Imported dynamic-power value; static leakage and total power were not inferred." };
  }
  if (/total/.test(normalized)) {
    return { metric: "reported_total", staticLeakageMw: null, estimatedDynamicMw: null, totalPowerMw: powerMw, reportedMw: powerMw, source: optionalString(record.powerMetric) ?? "Imported total power", caveat: "Imported total-power value; its activity and analysis method are retained as reported." };
  }
  return { metric: "reported_unspecified", staticLeakageMw: null, estimatedDynamicMw: null, totalPowerMw: null, reportedMw: powerMw, source: "Imported powerMw without powerMetric", caveat: "Power semantics are unspecified; this value is not treated as leakage, dynamic, or total power." };
}

export function normalizeImportedRecord(value: unknown): DigitalNormalizedRow {
  const record = asObject(value);
  const architecture = requiredMetadata(record.architecture, "architecture");
  const processTechnology = requiredMetadata(record.processNode ?? record.processTechnology, "processNode");
  const bitWidth = optionalPositiveInteger(record.bitWidth, "bitWidth");
  if (bitWidth === null) throw new DigitalAdapterError("DIGITAL_IMPORT_FIELD_REQUIRED", "bitWidth is required", "parser");
  const fmaxMhz = finiteRequired(record.fmaxMhz, "fmaxMhz");
  const areaUm2 = finiteRequired(record.areaUm2, "areaUm2");
  const powerMw = finiteRequired(record.powerMw, "powerMw");
  const power = importedPower(record, powerMw);
  const warnings = power.metric === "reported_unspecified" ? [power.caveat] : [];
  return {
    architecture,
    category: optionalString(record.category) ?? "imported",
    design: optionalString(record.design) ?? architecture,
    topModule: optionalString(record.topModule) ?? "unknown",
    bitWidth,
    processTechnology,
    library: optionalString(record.library ?? record.standardCellLibrary) ?? "unspecified",
    corner: optionalString(record.corner) ?? "unspecified",
    fmaxMhz,
    areaUm2,
    setupWnsNs: finiteOptional(record.setupWnsNs),
    holdWnsNs: finiteOptional(record.holdWnsNs),
    setupTnsNs: finiteOptional(record.setupTnsNs),
    holdTnsNs: finiteOptional(record.holdTnsNs),
    cellCount: finiteOptional(record.cellCount),
    cellUsage: {},
    power,
    simulationExecuted: false,
    simulationPassed: null,
    warnings,
  };
}

function jsonRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const object = asObject(value);
  if (Array.isArray(object.rows)) return object.rows;
  return [value];
}

export async function parseCompletedDigitalFiles(filenames: string[]): Promise<DigitalNormalizedRow[]> {
  const rows: DigitalNormalizedRow[] = [];
  for (const filename of filenames) {
    const text = await fs.readFile(filename, "utf8");
    const extension = path.extname(filename).toLowerCase();
    let records: unknown[];
    if (extension === ".json") {
      try {
        records = jsonRecords(JSON.parse(text));
      } catch (error) {
        throw new DigitalAdapterError("DIGITAL_JSON_INVALID", `${path.basename(filename)}: ${String(error)}`, "parser");
      }
    } else if (extension === ".csv") records = parseCsv(text);
    else throw new DigitalAdapterError("DIGITAL_IMPORT_EXTENSION", `${path.basename(filename)} is not JSON or CSV`, "parser");
    rows.push(...records.map(normalizeImportedRecord));
  }
  if (rows.length === 0) throw new DigitalAdapterError("DIGITAL_IMPORT_EMPTY", "no Digital result rows were found", "parser");
  return rows;
}
