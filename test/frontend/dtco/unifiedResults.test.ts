import { describe, expect, it } from "vitest";
import { filterSavedResults, isSelectionResult, selectionSavedResults } from "../../../src/pages/dtco/unifiedResultHelpers";
import { savedMeasurements } from "../../../src/pages/dtco/resultHelpers";
import { selectionRun, evaluation } from "./selectionFixtures";
import { experiment } from "./fixtures";
describe("unified DTCO saved results", () => {
  it("archives timing-only and incomplete physical evidence without losing failed timing candidates", () => {
    const legacy = selectionRun("legacy"), incomplete = selectionRun("incomplete"), complete = selectionRun("complete");
    legacy.result!.schemaVersion = "dtco.cell-selection.result.v1";
    incomplete.result = structuredClone(incomplete.result); incomplete.result!.evaluations[0].physical!.status = "failed";
    expect(selectionSavedResults([legacy, incomplete, complete])).toHaveLength(2);
    expect(selectionSavedResults([complete])[1].evaluation.feasible).toBe(false);
  });
  it("keeps each completed run evaluation distinct and deduplicates replayed runs", () => {
    const a = selectionRun("job-a"), b = selectionRun("job-b");
    a.job.resultId = "persisted-a"; b.job.resultId = "persisted-b";
    const rows = selectionSavedResults([a, b, a]);
    expect(rows).toHaveLength(4);
    expect(rows[0].id).toBe("selection:persisted-a:eval-0");
    expect(rows[2].id).toBe("selection:persisted-b:eval-0");
    expect(rows[0].persistedResultId).toBe("persisted-a");
    expect(rows[0].jobId).toBe("job-a");
    expect(rows[0].run).toBe(a);
    expect(rows[0].evaluation).toBe(a.result!.evaluations[0]);
    expect(selectionSavedResults([{ ...a, job: { ...a.job, status: "running" } }, { ...b, result: null }])).toEqual([]);
  });
  it("preserves missing timing and failing evidence without promoting an unknown best", () => {
    const run = selectionRun();
    run.result!.evaluations = [evaluation({ feasible: false, status: "unknown", pathDelayNs: null, maxSlackNs: null }), evaluation({ id: "failed", index: 1, feasible: false, status: "infeasible", holdSlackNs: -.2 })];
    const rows = selectionSavedResults([run]);
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toContain("baseline");
    expect(rows[0].label).not.toContain("retained best");
    expect(rows[0].evaluation.pathDelayNs).toBeNull();
    expect(rows[1].evaluation.holdSlackNs).toBe(-.2);
    expect("metrics" in rows[0]).toBe(false);
    expect(rows[0].conditions).toContain("period 20 ns");
    expect(rows[0].conditions).toContain("load 0.01 pF");
  });
  it("filters one mixed collection by source, scope, assignment and native cell", () => {
    const rows = [...savedMeasurements([experiment()], []), ...selectionSavedResults([selectionRun()])];
    expect(filterSavedResults(rows, "", "liberty", "")).toHaveLength(2);
    expect(filterSavedResults(rows, "standard-cell", "", "selection")).toHaveLength(2);
    expect(filterSavedResults(rows, "native_inv_1", "liberty", "selection")).toHaveLength(2);
    expect(filterSavedResults(rows, "infeasible", "", "selection")).toHaveLength(1);
    expect(filterSavedResults(rows, "", "schematic", "experiment")).toHaveLength(1);
    expect(isSelectionResult(rows[0])).toBe(false);
    expect(isSelectionResult(rows[1])).toBe(true);
  });
  it("groups matching native scopes and separates library, circuit and constraint changes", () => {
    const a = selectionRun("a"), b = selectionRun("b");
    b.result = structuredClone(b.result);
    const key = (run: ReturnType<typeof selectionRun>) => selectionSavedResults([run])[0].comparisonKey;
    expect(key(a)).toBe(key(b));
    b.result!.request.constraints.outputLoadPf = .02; expect(key(a)).not.toBe(key(b));
    b.result = structuredClone(a.result); b.result!.library.sha256 = "different"; expect(key(a)).not.toBe(key(b));
    b.result = structuredClone(a.result); b.result!.request.circuit.instances[0].output = "different"; expect(key(a)).not.toBe(key(b));
    b.result = structuredClone(a.result); b.result!.scope = "different"; expect(key(a)).not.toBe(key(b));
    b.result = structuredClone(a.result); b.result!.request.constraints = Object.fromEntries(Object.entries(b.result!.request.constraints).reverse()) as typeof b.result.request.constraints;
    expect(key(a)).toBe(key(b));
  });
});
