import type { JsonObject, ResultRecordV1 } from "../../../shared/contracts/v1";
import type { AcgResearchOperation } from "../../api/acg/client";
import { record } from "./helpers";
import { nativeCellTimeout } from "../../../shared/acgResearch";

export const RESEARCH_LABELS: Record<AcgResearchOperation, string> = {
  "algorithm-matrix": "Algorithm comparison",
  "algorithm-report": "Comparison report",
  "known-feasible": "Known-feasible search",
};
export function researchStrings(value: string, label: string): string[] {
  const items = value.split(/[\s,]+/).filter(Boolean);
  if (!items.length || new Set(items).size !== items.length) throw new Error(`${label} requires distinct values.`);
  return items;
}
function integer(value: string, label: string, min: number, max: number): number {
  const number = Number(value);
  if (!value.trim() || !Number.isInteger(number) || number < min || number > max) throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  return number;
}
function numbers(value: string, label: string, min: number, max: number): number[] {
  const values = researchStrings(value, label).map(item => integer(item, label, min, max));
  if (new Set(values).size !== values.length) throw new Error(`${label} requires distinct numbers.`);
  return values;
}
export function researchParameters(operation: AcgResearchOperation, engine: "cmos" | "mr", fields: Record<string, string>): JsonObject {
  const output: JsonObject = { engine };
  if (operation === "algorithm-report") {
    output.maxCols = integer(fields.maxCols, "Maximum columns", 4, 32);
    if (fields.sourceResultId) output.sourceResultId = fields.sourceResultId;
    return output;
  }
  output.cells = researchStrings(fields.cells, "Cells");
  if ((output.cells as string[]).length > 15) throw new Error("Select at most 15 cells.");
  if (operation === "algorithm-matrix") {
    output.algorithms = researchStrings(fields.algorithms, "Algorithms");
    output.rowCounts = numbers(fields.rowCounts, "Rows", 1, engine === "mr" ? 4 : 1);
    output.trials = integer(fields.trials, "Trials", 1, 10);
    output.threads = integer(fields.threads, "Threads", 1, 4);
    output.maxCols = integer(fields.maxCols, "Maximum columns", 4, 32);
    const runs = (output.cells as string[]).length * (output.algorithms as string[]).length * (output.rowCounts as number[]).length * (output.trials as number);
    if (runs > 1000) throw new Error(`The matrix has ${runs} runs; the limit is 1000.`);
  } else {
    if (engine !== "mr") throw new Error("Known-feasible search requires MR.");
    output.numRows = integer(fields.numRows, "Rows", 1, 3);
    output.tracks = numbers(fields.tracks, "Tracks", output.numRows === 1 ? 9 : 5, 16).sort((a, b) => a - b);
    if (output.numRows === 1 && (output.tracks as number[]).some(track => ![9, 12, 16].includes(track))) throw new Error("Single-row search supports 9, 12 or 16 tracks.");
    output.extraCpp = numbers(fields.extraCpp, "Extra width", 0, 16).sort((a, b) => a - b);
    output.maxAttempts = integer(fields.maxAttempts, "Attempt budget", 1, 100);
    output.totalTimeoutSeconds = integer(fields.totalTimeoutSeconds, "Total timeout", 1, 86400);
    output.attemptTimeoutSeconds = integer(fields.attemptTimeoutSeconds, "Attempt timeout", 1, 3600);
    if (fields.resumeResultId) output.resumeResultId = fields.resumeResultId;
  }
  return output;
}
export function researchDefaults(operation: AcgResearchOperation, engine: "cmos" | "mr"): Record<string, string> {
  return { cells: "inv_x1", algorithms: "dp, sa", rowCounts: engine === "mr" ? "1, 2, 3" : "1", trials: "1", threads: "1", maxCols: "8", numRows: "1", tracks: "9, 12, 16", extraCpp: "0, 2, 4, 8, 16", maxAttempts: "30", totalTimeoutSeconds: "3600", attemptTimeoutSeconds: "900", sourceResultId: "", resumeResultId: "", operation };
}
export function researchSourceResults(results: ResultRecordV1[], ownerId: string | undefined, operation: AcgResearchOperation, engine?: "cmos" | "mr"): ResultRecordV1[] {
  const expected = operation === "algorithm-report" ? "algorithm-matrix" : "known-feasible";
  return results.filter(result => ownerId !== undefined && result.ownerId === ownerId && record(result.data.acgResearch).operation === expected && (engine === undefined || record(result.data.acgResearch).engine === engine));
}

/** Resolve a witness directory through a uniquely retained report root, never a basename. */
export function researchWitnessArtifacts(path: string, reportPaths: string[], artifacts: import("../../../shared/contracts/v1").ArtifactRecordV1[]): import("../../../shared/contracts/v1").ArtifactRecordV1[] {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some(part => !part || part === "." || part === "..")) return [];
  const roots = new Set<string>();
  for (const reportPath of reportPaths) {
    const matches = artifacts.filter(artifact => artifact.relativePath === reportPath || artifact.relativePath.endsWith("/" + reportPath));
    if (matches.length === 1) roots.add(matches[0].relativePath.slice(0, -reportPath.length));
  }
  if (roots.size !== 1) return [];
  const prefix = [...roots][0] + path;
  return artifacts.filter(artifact => artifact.relativePath === prefix || artifact.relativePath.startsWith(prefix + "/"));
}

/** Native per-cell timeout sum excludes scheduler overhead and is not elapsed time. */
export function researchMatrixBudget(parameters: JsonObject): { runCount: number; nativeTimeoutSumSeconds: number } {
  const cells = parameters.cells as string[];
  const factor = (parameters.algorithms as string[]).length * (parameters.rowCounts as number[]).length * (parameters.trials as number);
  return { runCount: cells.length * factor, nativeTimeoutSumSeconds: cells.reduce((sum, cell) => sum + nativeCellTimeout(cell), 0) * factor };
}
