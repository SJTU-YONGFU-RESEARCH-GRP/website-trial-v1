import type { ResultRecordV1 } from "../../../shared/contracts/v1";
import { record } from "./helpers";

export interface GeneratedCellGroup {
  key: string;
  name: string;
  cells: Record<string, unknown[]>;
}
/** Exact case-sensitive identity; unnamed cells are isolated, duplicates are retained explicitly. */
export function generatedCellGroups(results: ResultRecordV1[]): GeneratedCellGroup[] {
  const groups = new Map<string, GeneratedCellGroup>();
  for (const result of results) {
    const cells = record(result.data.acg).cells;
    if (!Array.isArray(cells)) continue;
    cells.forEach((cell, index) => {
      const name = record(cell).cellName;
      const identified = typeof name === "string" && name.length > 0;
      const key = JSON.stringify(identified ? ["cell", name] : ["unidentified", result.id, index]);
      let group = groups.get(key);
      if (!group) { group = { key, name: identified ? name : `Unidentified cell · ${result.id} · record ${index + 1}`, cells: {} }; groups.set(key, group); }
      (group.cells[result.id] ??= []).push(cell);
    });
  }
  return [...groups.values()];
}

export type ResearchPhase = "comparison" | "search" | "report";
const OPERATIONS = { comparison: "algorithm-matrix", search: "known-feasible", report: "algorithm-report" } as const;
/** Preserve both populations if a retained result contains unified and legacy evidence. */
export function resultResearchSections(result: ResultRecordV1, phase: ResearchPhase): Array<{ origin: string; value: Record<string, unknown>; stage?: string }> {
  const unified = record(result.data.acgUnified), legacy = record(result.data.acgResearch);
  const summary = record(unified[phase]);
  const sections: Array<{ origin: string; value: Record<string, unknown>; stage?: string }> = [];
  if (Object.keys(summary).length) sections.push({ origin: "Unified workflow", stage: phase, value: { ...summary, engine: summary.engine ?? unified.engine, operation: OPERATIONS[phase] } });
  if (legacy.operation === OPERATIONS[phase]) sections.push({ origin: "Legacy research", value: legacy });
  return sections;
}
