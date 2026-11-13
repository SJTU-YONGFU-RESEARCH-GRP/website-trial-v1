import type { SelectionEvaluation, SelectionRun, SelectionResult } from "../../../shared/contracts/dtcoSelection";
import type { DtcoSavedMeasurement } from "./resultHelpers";
import { measurementMode } from "./resultHelpers";
import { selectionFeasible } from "./selectionHelpers";
export interface DtcoSavedSelectionEvaluation {
  id: string; name: string; label: string; origin: "selection"; sourceId: string; jobId: string;
  persistedResultId: string | null; mode: "liberty"; scope: string; conditions: string; sizing: string;
  sourceIdentity: string; comparisonKey: string; run: SelectionRun; evaluation: SelectionEvaluation;
}
export type DtcoSavedResult = DtcoSavedMeasurement | DtcoSavedSelectionEvaluation;
export function isSelectionResult(row: DtcoSavedResult): row is DtcoSavedSelectionEvaluation { return row.origin === "selection"; }
export function completeSelectionResult(result: SelectionResult | null): boolean {
  return Boolean(result && result.schemaVersion === "dtco.cell-selection.result.v2" && result.completeness?.status === "complete" && result.evaluations.length && result.evaluations.every(row => row.physical?.status === "succeeded" && row.physical.artifacts.gdsPath));
}
/** Stable serialization keeps equivalent request objects compatible regardless of JSON key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => JSON.stringify(key) + ":" + canonical(child)).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}
export function selectionSavedResults(runs: SelectionRun[]): DtcoSavedSelectionEvaluation[] {
  const rows = new Map<string, DtcoSavedSelectionEvaluation>();
  for (const run of runs) {
    if (run.job.status !== "succeeded" || !run.result || !completeSelectionResult(run.result)) continue;
    const result = run.result, request = result.request, constraints = request.constraints;
    const snapshot = run.job.parameters.dtcoSelectionSnapshot;
    const trusted = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot.trusted : undefined;
    const environment = Array.isArray(trusted) ? trusted.map(item => item && typeof item === "object" && !Array.isArray(item) ? item.sha256 : null).filter(item => typeof item === "string").sort() : [];
    for (const evaluation of result.evaluations) {
      const id = "selection:" + (run.job.resultId ?? run.job.id) + ":" + evaluation.id;
      const tags = [evaluation.id === result.baselineEvaluationId ? "baseline" : "", evaluation.id === result.bestEvaluationId && selectionFeasible(evaluation) ? "retained best" : "", evaluation.status].filter(Boolean);
      rows.set(id, {
        id, name: request.name, label: "Evaluation " + evaluation.index + " · " + tags.join(" · "),
        origin: "selection", sourceId: run.job.id, jobId: run.job.id, persistedResultId: run.job.resultId ?? null,
        mode: "liberty", scope: result.scope,
        conditions: result.library.corner + " · period " + constraints.clockPeriodNs + " ns · input delay " + constraints.inputDelayNs + " ns · output delay " + constraints.outputDelayNs + " ns · slew " + constraints.inputSlewNs + " ns · load " + constraints.outputLoadPf + " pF · setup uncertainty " + constraints.clockUncertaintyNs + " ns · hold uncertainty " + constraints.holdUncertaintyNs + " ns",
        sizing: Object.entries(evaluation.assignment).map(([instance, drive]) => instance + ": X" + drive + (evaluation.cells[instance] ? " · " + evaluation.cells[instance] : "")).join("; "),
        sourceIdentity: result.library.id + " · SHA256 " + result.library.sha256 + " · job " + run.job.id + " · evaluation " + evaluation.id,
        comparisonKey: canonical(["liberty-opensta", request.circuit, result.library.id, result.library.sha256, result.library.corner, result.library.units, constraints, evaluation.timingKind, result.scope, environment]),
        run, evaluation,
      });
    }
  }
  return [...rows.values()];
}
export function filterSavedResults(rows: DtcoSavedResult[], query: string, mode: string, origin: string): DtcoSavedResult[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(row => {
    if (mode && row.mode !== mode || origin && row.origin !== origin) return false;
    const category = isSelectionResult(row) ? "Standard-cell selection Liberty OpenSTA " + row.evaluation.status + " " + JSON.stringify(row.evaluation.assignment) + " " + JSON.stringify(row.evaluation.cells) : row.origin === "optimization" ? "Automatic optimization" : "Batch experiment";
    const scopeLabel = isSelectionResult(row) ? "Pre-layout Liberty / OpenSTA" : measurementMode(row.mode);
    return [row.id, row.name, row.label, row.conditions, row.sizing, row.sourceIdentity, row.scope, scopeLabel, category].join(" ").toLowerCase().includes(needle);
  });
}
