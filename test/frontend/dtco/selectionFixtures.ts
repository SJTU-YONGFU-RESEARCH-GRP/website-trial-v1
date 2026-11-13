import type { SelectionEvaluation, SelectionOptions, SelectionRequest, SelectionResult, SelectionRun } from "../../../shared/contracts/dtcoSelection";
import type { JobRecordV1 } from "../../../shared/contracts/v1";
export const selectionRequest: SelectionRequest = {
  schemaVersion: "dtco.cell-selection.request.v1", name: "Combinational selection", libraryId: "gf180mcu-7t5v0-tt", objective: "area",
  circuit: { name: "selection_comb", inputs: ["a","b","c"], outputs: ["y"], clock: null, instances: [
    { id: "u_nand", family: "NAND", inputs: ["a","b"], output: "n1", allowedDrives: [1,2,4], initialDrive: 1 },
    { id: "u_nor", family: "NOR", inputs: ["n1","c"], output: "n2", allowedDrives: [1,2,4], initialDrive: 1 },
    { id: "u_inv", family: "INV", inputs: ["n2"], output: "n3", allowedDrives: [1,2,4], initialDrive: 1 },
    { id: "u_and", family: "AND", inputs: ["n3","a"], output: "y", allowedDrives: [1,2,4], initialDrive: 1 },
  ] },
  constraints: { clockPeriodNs: 20, inputDelayNs: 0, outputDelayNs: 0, inputSlewNs: .1, outputLoadPf: .01, clockUncertaintyNs: 0, holdUncertaintyNs: 0 }, maxEvaluations: 32,
};
export const sequentialRequest: SelectionRequest = { ...structuredClone(selectionRequest), name: "DFF INV DFF", circuit: { name: "selection_seq", inputs: ["d","clk"], outputs: ["q"], clock: "clk", instances: [
  { id: "launch", family: "DFF", inputs: ["d"], output: "n1", allowedDrives: [1,2,4], initialDrive: 1 },
  { id: "logic_u", family: "INV", inputs: ["n1"], output: "n2", allowedDrives: [1,2,4], initialDrive: 1 },
  { id: "capture", family: "DFF", inputs: ["n2"], output: "q", allowedDrives: [1,2,4], initialDrive: 1 },
] } };
export const selectionOptions: SelectionOptions = { available: true, reason: null, libraries: [{ id: selectionRequest.libraryId, label: "GF180 MCU 7-track 5 V typical", sha256: "frozen-liberty-hash" }], defaults: selectionRequest, examples: [{ id: "combinational", label: "NAND NOR INV AND", request: selectionRequest }, { id: "sequential", label: "DFF INV DFF", request: sequentialRequest }] };
export function evaluation(extra: Partial<SelectionEvaluation> = {}): SelectionEvaluation {
  return { id: "eval-0", index: 0, assignment: { u_nand: 1, u_nor: 1, u_inv: 1, u_and: 1 }, cells: { u_inv: "native_inv_1" }, areaUm2: 4, pathDelayNs: 2, setupSlackNs: null, holdSlackNs: null, maxSlackNs: 18, minSlackNs: 1, timingKind: "combinational", feasible: true, status: "feasible", reason: null, artifacts: {}, physical: {status:"succeeded",scope:"Placed and routed circuit GDS; pre-layout STA timing retained",sourceNetlistSha256:"fixture-netlist-hash",artifacts:{gdsPath:"output/physical/circuit.gds",defPath:"output/physical/circuit.def",routeReportPath:"output/physical/route.json",validationPath:"output/physical/validation.json"},checks:{placement:"passed",unroutedNets:0},hashes:{}}, ...extra };
}
export function selectionJob(id = "selection-1", status: JobRecordV1["status"] = "succeeded"): JobRecordV1 {
  return { id, status, parameters: { dtcoSelectionSnapshot: { request: JSON.parse(JSON.stringify(selectionRequest)) } }, progress: status === "succeeded" ? 1 : .25, currentStepId: "selection-search", error: null, createdAt: "2026-11-07T01:00:00Z", updatedAt: "2026-11-07T01:00:00Z" } as JobRecordV1;
}
export function selectionResult(extra: Partial<SelectionResult> = {}): SelectionResult {
  return { schemaVersion: "dtco.cell-selection.result.v2", completeness:{status:"complete",missingStages:[]}, status: "ok", baselineEvaluationId: "eval-0", bestEvaluationId: "eval-0", evaluations: [evaluation(), evaluation({ id: "eval-1", index: 1, feasible: false, status: "infeasible", maxSlackNs: -1 })], search: { method: "exhaustive", spaceSize: 81, evaluated: 2, termination: "budget" }, library: { id: selectionRequest.libraryId, sha256: "frozen-liberty-hash", corner: "TT 25 C 5 V", units: {}, cells: {} }, scope: "Pre-layout Liberty OpenSTA", limitations: ["No routed wires"], request: selectionRequest, ...extra };
}
export function selectionRun(id = "selection-1"): SelectionRun { return { job: selectionJob(id), result: selectionResult(), artifacts: [] }; }
