import { describe, expect, it } from "vitest";
import { parseSelectionCircuit, selectionFeasible, selectionMetric, selectionName, toggleSelectionDrive, validateSelection } from "../../../src/pages/dtco/selectionHelpers";
import { evaluation, selectionJob, selectionRequest, sequentialRequest } from "./selectionFixtures";
describe("standard-cell selection input and timing evidence", () => {
  it("validates generic combinational and sequential graphs", () => {
    expect(validateSelection(selectionRequest)).toBeNull(); expect(validateSelection(sequentialRequest)).toBeNull();
    expect(parseSelectionCircuit(JSON.stringify(selectionRequest.circuit))).toEqual(selectionRequest.circuit);
  });
  it("keeps at least one allowed drive and restores a legal baseline", () => {
    let request = toggleSelectionDrive(selectionRequest, "u_nand", 1);
    expect(request.circuit.instances[0].initialDrive).toBe(2);
    request = toggleSelectionDrive(toggleSelectionDrive(request, "u_nand", 4), "u_nand", 2);
    expect(request.circuit.instances[0].allowedDrives).toEqual([2]);
    expect(selectionRequest.circuit.instances[0].initialDrive).toBe(1);
  });
  it("rejects illegal baseline, budgets, bounds and graph sizes", () => {
    const invalid = structuredClone(selectionRequest); invalid.circuit.instances[0].initialDrive = 8;
    expect(validateSelection(invalid)).toContain("baseline");
    expect(validateSelection({ ...selectionRequest, maxEvaluations: 257 })).toContain("256");
    expect(validateSelection({ ...selectionRequest, constraints: { ...selectionRequest.constraints, inputSlewNs: NaN } })).toContain("inputSlewNs");
    const large = structuredClone(selectionRequest); large.circuit.instances = Array.from({length: 257}, () => large.circuit.instances[0]);
    expect(validateSelection(large)).toContain("256");
    expect(() => parseSelectionCircuit('{"name":"bad","inputs":[],"outputs":[],"clock":null,"instances":[{}]}')).toThrow();
  });
  it("accepts combinational timing without claiming DFF setup/hold", () => { expect(selectionFeasible(evaluation())).toBe(true); });
  it("rejects missing, failing, nonfinite or contradictory timing evidence", () => {
    for (const override of [{maxSlackNs:null},{minSlackNs:null},{maxSlackNs:-.01},{minSlackNs:NaN},{status:"incomplete_evidence"},{feasible:false}]) expect(selectionFeasible(evaluation(override))).toBe(false);
    expect(selectionFeasible(evaluation({ timingKind: "sequential", setupSlackNs: 1, holdSlackNs: null }))).toBe(false);
    expect(selectionFeasible(evaluation({ timingKind: "sequential", setupSlackNs: 1, holdSlackNs: .01 }))).toBe(true);
  });
  it("preserves the sign and magnitude of narrow timing margins", () => {
    expect(selectionMetric(.0002084)).toBe("0.0002084");
    expect(selectionMetric(-.0002084)).toBe("-0.0002084");
    expect(selectionMetric(-1e-8)).toBe("-1.000e-8");
    expect(selectionMetric(null)).toBe("Unknown");
  });
  it("matches native request constraint limits and rejects values just outside", () => {
    const limits = { clockPeriodNs: 10000, inputDelayNs: 10000, outputDelayNs: 10000, inputSlewNs: 4, outputLoadPf: 1, clockUncertaintyNs: 10000, holdUncertaintyNs: 10000 };
    for (const [key,max] of Object.entries(limits)) {
      expect(validateSelection({ ...selectionRequest, constraints: { ...selectionRequest.constraints, [key]: max } })).toBeNull();
      expect(validateSelection({ ...selectionRequest, constraints: { ...selectionRequest.constraints, [key]: max + .0001 } })).toContain(key);
      expect(validateSelection({ ...selectionRequest, constraints: { ...selectionRequest.constraints, [key]: -.0001 } })).toContain(key);
    }
    for (const key of ["clockPeriodNs","inputSlewNs"]) expect(validateSelection({ ...selectionRequest, constraints: { ...selectionRequest.constraints, [key]: 0 } })).toContain(key);
  });
  it("accepts maximum graph and identifier sizes, rejects overflow and duplicate drive domains", () => {
    const request = structuredClone(selectionRequest);
    request.circuit.name = "x".repeat(64);
    request.circuit.inputs = ["a", ...Array.from({length:255},(_,i) => "p_"+i)];
    request.circuit.instances = Array.from({length:256},(_,i) => ({id:"u_"+i,family:"INV",inputs:[i ? "n_"+(i-1) : "a"],output:i===255 ? "y" : "n_"+i,allowedDrives:[1,2,4],initialDrive:1}));
    expect(validateSelection(request)).toBeNull();
    expect(validateSelection({ ...request, circuit: {...request.circuit,name:"x".repeat(65)} })).toContain("64");
    expect(validateSelection({ ...request, circuit: {...request.circuit,inputs:[...request.circuit.inputs,"overflow"]} })).toContain("256");
    request.circuit.instances[0].allowedDrives = [1,1];
    expect(validateSelection(request)).toContain("unique legal drives");
  });
  it("supports a separate clock and closed sequential feedback, rejects a driven clock", () => {
    const request = structuredClone(sequentialRequest);
    request.circuit.inputs = ["d"];
    expect(validateSelection(request)).toBeNull();
    request.circuit.inputs = [];
    request.circuit.instances = [{id:"u_feedback",family:"DFF",inputs:["q"],output:"q",allowedDrives:[1,2],initialDrive:1}];
    expect(validateSelection(request)).toBeNull();
    request.circuit.instances[0].output = "clk";
    expect(validateSelection(request)).toContain("Multiple drivers");
  });
  it("renders unknown measurements explicitly and extracts frozen run name", () => {
    expect(selectionMetric(null)).toBe("Unknown"); expect(selectionMetric(Infinity)).toBe("Unknown"); expect(selectionMetric(0)).toBe("0.000");
    expect(selectionName(selectionJob())).toBe(selectionRequest.name);
  });
});
