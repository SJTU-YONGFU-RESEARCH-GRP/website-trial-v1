import type { JsonObject, ResultRecordV1 } from "../../../shared/contracts/v1";
import type { AcgEngine, AcgUnifiedParameters } from "../../api/acg/client";
import { record } from "./helpers";

export const UNIFIED_FIELD_LABELS: Record<string, string> = {
  trials: "Trials per algorithm", threads: "Comparison worker threads", maxCols: "Report maximum columns (CPP)",
  searchMaxAttempts: "Search attempt limit", searchTotalBudgetSeconds: "Search total workflow budget (seconds)", searchPerAttemptSeconds: "Search per-attempt timeout (seconds)",
  searchTrackNums: "Search track values", searchExtraCpp: "Search extra width values (CPP)",
};
export const UNIFIED_BOUNDS: Record<string, [number, number]> = { trials: [1,10], threads: [1,4], maxCols: [4,32], searchMaxAttempts: [1,100], searchTotalBudgetSeconds: [1,86400], searchPerAttemptSeconds: [1,3600] };
const DEFAULTS: AcgUnifiedParameters = { algorithms: ["dp","sa"], trials: 1, threads: 1, maxCols: 8, searchMaxAttempts: 6, searchTotalBudgetSeconds: 180, searchPerAttemptSeconds: 30, searchTrackNums: [9,12,16], searchExtraCpp: [0,2,4] };
export function unifiedDefaults(engine: AcgEngine, capabilityDefaults?: unknown): Record<string, string> {
  const values = { ...DEFAULTS, ...record(capabilityDefaults) };
  return Object.fromEntries(Object.entries(values).filter(([key]) => key in DEFAULTS).map(([key,value]) => [key, key === "algorithms" && engine === "dr" ? "" : Array.isArray(value) ? value.join(", ") : String(value)]));
}
function integer(text: string, key: string, bounds: [number,number]): number {
  const value = Number(text);
  if (!text?.trim() || !Number.isInteger(value) || value < bounds[0] || value > bounds[1]) throw new Error(`${UNIFIED_FIELD_LABELS[key] ?? key} must be an integer from ${bounds[0]} to ${bounds[1]}.`);
  return value;
}
function numberList(text: string, key: string, bounds: [number,number]): number[] {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (!parts.length) throw new Error(`${UNIFIED_FIELD_LABELS[key]} requires at least one value.`);
  const values = parts.map(part => integer(part, key, bounds));
  if (new Set(values).size !== values.length) throw new Error(`${UNIFIED_FIELD_LABELS[key]} requires distinct values.`);
  return values.sort((a,b) => a-b);
}
export function unifiedParameters(engine: AcgEngine, fields: Record<string,string>, allowedAlgorithms: string[], maxThreads = 4): AcgUnifiedParameters {
  const algorithms = engine === "dr" ? [] : (fields.algorithms ?? "").split(/[\s,]+/).filter(Boolean);
  if (engine !== "dr" && (!algorithms.length || new Set(algorithms).size !== algorithms.length || algorithms.some(value => !allowedAlgorithms.includes(value)))) throw new Error("Choose distinct comparison algorithms supported by this engine.");
  const numbers = Object.fromEntries(Object.entries(UNIFIED_BOUNDS).map(([key,bounds]) => [key, integer(fields[key] ?? "", key, key === "threads" ? [1, Math.min(4,maxThreads)] : bounds)]));
  return { algorithms, ...numbers, searchTrackNums: numberList(fields.searchTrackNums ?? "", "searchTrackNums", [5,16]), searchExtraCpp: numberList(fields.searchExtraCpp ?? "", "searchExtraCpp", [0,16]) } as AcgUnifiedParameters;
}
export function resultForFinishedJob(results: ResultRecordV1[], job: { id: string; resultId: string | null }): ResultRecordV1 | undefined {
  return results.find(item => item.id === job.resultId) ?? results.find(item => item.provenance.jobId === job.id);
}
export function unifiedStageSections(value: unknown): Array<{ key: string; label: string; summary: JsonObject }> {
  const unified = record(value);
  return [["comparison","Algorithm comparison"],["search","Known-feasible search"],["report","Comparison report"]].flatMap(([key,label]) => {
    const summary = record(unified[key]);
    return Object.keys(summary).length ? [{ key, label, summary: summary as JsonObject }] : [];
  });
}

export function unifiedArtifactPath(stage: string, path: string): string {
  return /^(?:output|results)\//.test(path) ? path : `output/unified/${stage}/${path.replace(/^\.\//, "")}`;
}
