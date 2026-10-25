import type { JsonObject, ParsedModuleResultV1 } from "../../../../shared/contracts/v1.js";
import { DIGITAL_PARSER_ID, DIGITAL_PARSER_VERSION, DIGITAL_RESULT_DATA_VERSION } from "../types.js";
import type { DigitalNormalizedRow } from "../types.js";

function rowData(row: DigitalNormalizedRow): JsonObject {
  return {
    schemaVersion: DIGITAL_RESULT_DATA_VERSION,
    design: {
      name: row.design,
      category: row.category,
      architecture: row.architecture,
      topModule: row.topModule,
      bitWidth: row.bitWidth,
      processTechnology: row.processTechnology,
      library: row.library,
      corner: row.corner,
    },
    metrics: {
      fmaxMhz: row.fmaxMhz,
      areaUm2: row.areaUm2,
      powerMw: row.power.reportedMw,
      powerMetric: row.power.metric,
    },
    timing: {
      setupWnsNs: row.setupWnsNs,
      holdWnsNs: row.holdWnsNs,
      setupTnsNs: row.setupTnsNs,
      holdTnsNs: row.holdTnsNs,
    },
    synthesis: {
      cellCount: row.cellCount,
      cellUsage: row.cellUsage,
      areaScope: "mapped_standard_cells_pre_layout",
    },
    simulation: {
      executed: row.simulationExecuted,
      passed: row.simulationPassed,
    },
    power: row.power,
    warnings: row.warnings,
  };
}

export function parsedDigitalResult(rows: DigitalNormalizedRow[], title: string): ParsedModuleResultV1 {
  const computed = rows.filter((row) => row.power.metric === "static_liberty_leakage").length;
  const unspecified = rows.filter((row) => row.power.metric === "reported_unspecified").length;
  return {
    title,
    summary: {
      rowCount: rows.length,
      staticLeakageRows: computed,
      unspecifiedPowerRows: unspecified,
      powerPolicy: "Power fields retain their explicit scope; static Liberty leakage is never relabeled as total power.",
    },
    data: {
      schemaVersion: DIGITAL_RESULT_DATA_VERSION,
      rows: rows.map(rowData),
    },
    artifactRoles: ["normalized-result", "mapped-verilog", "mapped-json", "yosys-stat", "timing-reports", "tool-logs", "input-manifest"],
    parserId: DIGITAL_PARSER_ID,
    parserVersion: DIGITAL_PARSER_VERSION,
  };
}

export function validateParsedDigitalResult(result: ParsedModuleResultV1): void {
  const rows = result.data.rows;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Digital result must contain at least one normalized row");
  for (const value of rows) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Digital result row must be an object");
    const record = value as Record<string, unknown>;
    const metrics = record.metrics as Record<string, unknown> | undefined;
    const power = record.power as Record<string, unknown> | undefined;
    if (!metrics || !power || typeof power.metric !== "string") throw new Error("Digital result row is missing metrics or power semantics");
    if (power.metric === "static_liberty_leakage" && typeof power.staticLeakageMw !== "number") throw new Error("static leakage row is missing staticLeakageMw");
    if (power.metric === "static_liberty_leakage" && power.totalPowerMw !== null) throw new Error("static leakage must not populate totalPowerMw");
  }
}
