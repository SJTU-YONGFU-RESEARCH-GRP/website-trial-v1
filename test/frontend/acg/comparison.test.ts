import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ResultRecordV1 } from "../../../shared/contracts/v1";
import { AcgResultComparison } from "../../../src/pages/acg/AcgResultComparison";
import { toggleAcgResult } from "../../../src/pages/acg/AcgResultSelector";
import { acgBaselineId, acgComparisonRows, acgDeltaText, acgNumericDelta, comparisonValueText, retainAcgResults, type ComparisonValue } from "../../../src/pages/acg/comparison";

function result(id: string, data: object, technology: string | null = "gf180", engine = "mr"): ResultRecordV1 {
  return { id, title: id, data, summary: { technology }, lifecycle: "private", provenance: { parameters: { engine } } } as unknown as ResultRecordV1;
}
function generation(id: string, cells: object[], technology: string | null = "gf180"): ResultRecordV1 {
  return result(id, { acg: { cells, technology } }, technology);
}
const cell = (name: string, metrics: object) => ({ cellName: name, metrics });
const trial = (cell: string, algorithm: string, trialIndex: number, metrics: object = {}) => ({ cell, algorithm, trialIndex, rowCount: 1, ...metrics });
const numeric = (value: unknown, extra: Partial<ComparisonValue> = {}): ComparisonValue => ({ value, unit: "CPP", semantic: "placement-width", context: "gf180", ...extra });

describe("ACG horizontal comparison contract", () => {
  it("unions cells and metrics from later selections without summing or taking the first cell", () => {
    const a = generation("a", [cell("INV", { placementWidthCpp: 3 }), cell("NAND", { placementWidthCpp: 8 })]);
    const b = generation("b", [cell("NAND", { routedWidthCpp: 9, widthSource: "routed_candidate" }), cell("NOR", { customStatus: "partial" })]);
    const rows = acgComparisonRows([a, b]);
    expect(rows.find(row => row.scope === "Generation · INV" && row.label === "Placement width")?.values).toEqual({ a: expect.objectContaining({ value: 3 }) });
    expect(rows.find(row => row.scope === "Generation · NAND" && row.label === "Routed width")?.values.b.value).toBe(9);
    expect(rows.find(row => row.scope === "Generation · NOR" && row.label === "custom Status")?.values.b.value).toBe("partial");
    expect(rows.some(row => row.scope === "Generation · NAND" && row.values.a?.value === 8)).toBe(true);
    expect(rows.some(row => row.values.a?.value === 11)).toBe(false);
    expect(acgComparisonRows([a]).some(row => row.scope.includes("NOR"))).toBe(false);
  });
  it("keeps missing, null, zero, false and statuses distinct", () => {
    const rows = acgComparisonRows([generation("a", [cell("INV", { minCpp: null, nativeSuccess: false, widthSource: "placement" })]), generation("b", [cell("INV", { minCpp: 0, note: "timeout" })])]);
    const width = rows.find(row => row.label === "Minimum placement width")!;
    expect(comparisonValueText(width.values.a)).toBe("Unavailable");
    expect(comparisonValueText(width.values.b)).toBe("0");
    expect(comparisonValueText(undefined)).toBe("—");
    expect(comparisonValueText({ value: false })).toBe("No");
    expect(acgNumericDelta(width.values.b, width.values.a)).toBeNull();
    expect(acgNumericDelta({ value: "timeout" }, { value: "passed" })).toBeNull();
  });
  it("keeps cell outcome metadata separate from a metric with the same field name", () => {
    const rows = acgComparisonRows([generation("a", [{ cellName: "INV", status: "partial", metrics: { status: "CAPPED_UNRESOLVED" } }])]);
    expect(rows.find(row => row.label === "Cell status")?.values.a.value).toBe("partial");
    expect(rows.find(row => row.label === "status")?.values.a.value).toBe("CAPPED_UNRESOLVED");
    expect(rows.some(row => row.values.a?.ambiguous)).toBe(false);
  });
  it("normalizes only evidenced width semantics and does not compare unknown width with routed width", () => {
    const rows = acgComparisonRows([
      generation("a", [cell("INV", { widthCpp: 4, widthSource: "placement" })]),
      generation("b", [cell("INV", { widthCpp: 5, placementWidthCpp: 4, routedWidthCpp: 5, widthSource: "routed_candidate" })]),
      generation("c", [cell("INV", { widthCpp: 6 })]),
    ]);
    const placed = rows.find(row => row.label === "Placement width")!;
    expect(placed.values.a.value).toBe(4);
    expect(placed.values.b.value).toBe(4);
    expect(acgNumericDelta(placed.values.b, placed.values.a)).toEqual({ absolute: 0, percent: 0 });
    expect(rows.filter(row => row.label === "Routed width")).toHaveLength(1);
    expect(rows.find(row => row.label === "width Cpp")?.values.c.semantic).toBeUndefined();
  });
  it("matches legacy and unified algorithm trials by cell, requested algorithm, rows and zero-based trial index", () => {
    const a = result("a", { acgResearch: { operation: "algorithm-matrix", metrics: [trial("INV", "dp_r1", 0, { requestedAlgorithm: "dp", placementMs: 10 }), trial("INV", "sa_r1", 0, { requestedAlgorithm: "sa", placementMs: 30 })] } });
    const b = result("b", { acgUnified: { comparison: { metrics: [trial("INV", "sa", 0, { placementMs: 25 }), trial("INV", "dp", 0, { placementMs: 12 }), trial("INV", "dp", 1, { placementMs: 99 })] } } });
    const rows = acgComparisonRows([a, b]).filter(row => row.label === "Placement time");
    expect(rows).toHaveLength(3);
    expect(rows[0].scope).toBe("Algorithm comparison · INV · dp · rows 1 · trial 0");
    expect(acgNumericDelta(rows[0].values.b, rows[0].values.a)).toEqual({ absolute: 2, percent: 20 });
    expect(acgNumericDelta(rows[1].values.b, rows[1].values.a)?.absolute).toBe(-5);
    expect(rows[2].values.a).toBeUndefined();
  });
  it("aligns legacy report trial copies with unified comparison while keeping report outcomes separate", () => {
    const metrics = [trial("INV", "dp", 0, { placementMs: 10 })];
    const rows = acgComparisonRows([result("a", { acgResearch: { operation: "algorithm-report", metrics } }), result("b", { acgUnified: { comparison: { metrics }, report: { status: "complete" }, stages: [{ id: "report", status: "succeeded" }] } })]);
    const time = rows.find(row => row.label === "Placement time")!;
    expect(Object.keys(time.values)).toEqual(["a", "b"]);
    expect(acgNumericDelta(time.values.b, time.values.a)).toEqual({ absolute: 0, percent: 0 });
    expect(rows.filter(row => row.values.b?.ambiguous)).toHaveLength(0);
  });
  it("isolates invalid trial/row keys rather than aligning malformed scopes", () => {
    const metrics = [trial("INV", "dp", -1, { placementMs: 10 }), trial("INV", "dp", 0, { rowCount: Infinity, placementMs: 10 }), trial("INV", "dp", 0, { rowCount: 1.5, placementMs: 10 })];
    const rows = acgComparisonRows(["a", "b"].map(id => result(id, { acgResearch: { metrics } }))).filter(row => row.label === "Placement time");
    expect(rows).toHaveLength(6);
    expect(rows.every(row => Object.keys(row.values).length === 1)).toBe(true);
  });
  it("separates different row counts, case-sensitive cells and incomplete trial identities", () => {
    const a = result("a", { acgResearch: { metrics: [trial("INV", "dp", 0, { placementMs: 10 }), { cell: "INV", placementMs: 20 }] } });
    const b = result("b", { acgResearch: { metrics: [trial("inv", "dp", 0, { placementMs: 30 }), trial("INV", "dp", 0, { rowCount: 2, placementMs: 40 }), { cell: "INV", placementMs: 50 }] } });
    const rows = acgComparisonRows([a, b]).filter(row => row.label === "Placement time");
    expect(rows).toHaveLength(5);
    expect(rows.every(row => Object.keys(row.values).length === 1)).toBe(true);
  });
  it("marks duplicate cell and trial scopes as ambiguous instead of picking a value", () => {
    const a = generation("a", [cell("INV", { placementWidthCpp: 3 }), cell("INV", { placementWidthCpp: 5 })]);
    const row = acgComparisonRows([a]).find(row => row.label === "Placement width")!;
    expect(row.values.a.ambiguous).toBe(true);
    expect(comparisonValueText(row.values.a)).toContain("[3,5]");
    expect(acgNumericDelta(row.values.a, numeric(3))).toBeNull();
  });
  it("includes search outcomes and later-only unified stage metrics without treating status as success", () => {
    const a = result("a", { acgResearch: { operation: "known-feasible", generationConfiguration: { base: { technology: "gf180" } }, cells: [{ cell: "INV", attemptCount: 2, consumedSeconds: 5, status: "CAPPED_UNRESOLVED" }] } });
    const b = result("b", { acgUnified: { stages: [{ id: "search", status: "failed" }], search: { cells: [{ cell: "INV", attemptCount: 3, consumedSeconds: 6, lvs1: "NOT_RUN" }] } } });
    const rows = acgComparisonRows([a, b]);
    const attempts = rows.find(row => row.scope === "Feasible search · INV" && row.label === "Search attempts")!;
    expect(acgNumericDelta(attempts.values.b, attempts.values.a)).toEqual({ absolute: 1, percent: 50 });
    expect(rows.some(row => row.values.b?.value === "failed")).toBe(true);
    expect(rows.some(row => row.values.a?.value === "CAPPED_UNRESOLVED")).toBe(true);
    expect(rows.find(row => row.label === "lvs1")?.values.a).toBeUndefined();
  });
  it("refuses technology, unit, semantic and engine-specific native cost mismatches", () => {
    for (const extra of [{ unit: "nm" }, { semantic: "routed-width" }, { context: "asap7" }, { unit: undefined }, { semantic: undefined }, { context: undefined }]) {
      expect(acgNumericDelta(numeric(5, extra), numeric(4))).toBeNull();
    }
    const rows = acgComparisonRows([generation("a", [cell("INV", { placementWidthCpp: 3 })]), generation("b", [cell("INV", { placementWidthCpp: 4 })], "asap7"), generation("c", [cell("INV", { placementWidthCpp: 5 })], null)]);
    const width = rows.find(row => row.label === "Placement width")!;
    expect(acgNumericDelta(width.values.b, width.values.a)).toBeNull();
    expect(acgNumericDelta(width.values.c, width.values.a)).toBeNull();
    const costRows = acgComparisonRows(["mr", "cmos"].map((engine, index) => result(String(index), { acgResearch: { metrics: [trial("INV", "dp", 0, { cost: 10 + index })] } }, "gf180", engine)));
    const cost = costRows.find(row => row.label === "Placement cost")!;
    expect(acgNumericDelta(cost.values["1"], cost.values["0"])).toBeNull();
  });
  it.each([[12, 10, 2, 20], [8, 10, -2, -20], [10, 10, 0, 0], [-8, -10, 2, 20], [2, 0, 2, null], [0, 0, 0, null]])("computes finite signed delta %s vs %s", (value, baseline, absolute, percent) => {
    expect(acgNumericDelta(numeric(value), numeric(baseline))).toEqual({ absolute, percent });
  });
  it("does not coerce numeric-looking strings or allow nonfinite inputs and overflow", () => {
    for (const value of [null, undefined, "4", true, Infinity, -Infinity, NaN]) expect(acgNumericDelta(numeric(value), numeric(3))).toBeNull();
    expect(acgNumericDelta(numeric(Number.MAX_VALUE), numeric(-Number.MAX_VALUE))).toBeNull();
    expect(acgNumericDelta(numeric(1), numeric(Number.MIN_VALUE))).toEqual({ absolute: 1, percent: null });
    expect(acgDeltaText({ absolute: 2, percent: null }, "CPP")).toBe("Δ +2 CPP (percentage unavailable)");
    expect(acgDeltaText({ absolute: -2, percent: -20 }, "CPP")).toBe("Δ -2 CPP (-20%)");
  });
  it("shows undeclared numeric metrics without inventing a delta; respects explicit metric declarations", () => {
    const rows = acgComparisonRows([generation("a", [cell("INV", { custom: 1, customTyped: { value: 3, unit: "nm", semantic: "wire-length" } })]), generation("b", [cell("INV", { custom: 2, customTyped: { value: 4, unit: "nm", semantic: "wire-length" } })])]);
    const unknown = rows.find(row => row.label === "custom")!, declared = rows.find(row => row.label === "custom Typed")!;
    expect(acgNumericDelta(unknown.values.b, unknown.values.a)).toBeNull();
    expect(acgNumericDelta(declared.values.b, declared.values.a)?.absolute).toBe(1);
  });
  it("compares parser-defined scalar GDS counts without requiring cell.metrics", () => {
    const a = result("a", { acg: { technology: "gf180", cells: [{ cellName: "INV", validGdsCount: 1, status: "partial", unknownCounter: 1 }] } }, null);
    const b = result("b", { acg: { technology: "gf180", cells: [{ cellName: "INV", validGdsCount: 2, status: "complete", unknownCounter: 2 }] } }, null);
    const rows = acgComparisonRows([a, b]);
    const count = rows.find(row => row.label === "Valid GDS count")!;
    expect(count.scope).toBe("Generation · INV");
    expect(acgNumericDelta(count.values.b, count.values.a)).toEqual({ absolute: 1, percent: 100 });
    expect(acgDeltaText(acgNumericDelta(count.values.b, count.values.a)!, count.values.b.unit!)).toBe("Δ +1 count (+100%)");
    const metadata = rows.find(row => row.label === "Cell unknown Counter")!;
    expect(acgNumericDelta(metadata.values.b, metadata.values.a)).toBeNull();
    expect(rows.find(row => row.label === "Cell status")?.values.b.value).toBe("complete");
  });
  it("keeps count absence/null/zero and technology compatibility distinct across scalar and metric locations", () => {
    const results = [
      generation("a", [{ cellName: "INV", validGdsCount: 0 }]),
      generation("b", [cell("INV", { validGdsCount: 2 })]),
      generation("c", [{ cellName: "INV", validGdsCount: null }]),
      generation("d", [{ cellName: "INV" }]),
      generation("e", [{ cellName: "INV", validGdsCount: 2 }], "asap7"),
    ];
    const count = acgComparisonRows(results).find(row => row.label === "Valid GDS count")!;
    expect(acgNumericDelta(count.values.b, count.values.a)).toEqual({ absolute: 2, percent: null });
    expect(count.values.d).toBeUndefined();
    expect(comparisonValueText(count.values.c)).toBe("Unavailable");
    expect(acgNumericDelta(count.values.c, count.values.a)).toBeNull();
    expect(acgNumericDelta(count.values.e, count.values.a)).toBeNull();
  });
  it("unions real-shaped root search job metrics added by a later result without inventing cell totals", () => {
    const a = generation("a", [cell("INV", { placementWidthCpp: 3 })]);
    const job = { consumedSeconds: 9.227107977960259, consumedAttempts: 2, remainingAttempts: 4, remainingSeconds: 170.77289202203974, maxAttempts: 6, sharedWallBudgetSeconds: 180 };
    const b = result("b", { acgUnified: { search: { ...job, searchBudgetScope: "job", nativeReturnCode: 0, cells: [{ cell: "INV", attemptCount: 1 }, { cell: "NAND", attemptCount: 1 }] } } });
    const rows = acgComparisonRows([a, b]);
    for (const [key, value] of Object.entries(job)) {
      const row = rows.find(row => row.id === JSON.stringify(["Feasible search · Job", key]))!;
      expect(row.values.b.value).toBe(value);
      expect(row.values.a).toBeUndefined();
      expect(row.values.b.unit).toBe(key.includes("Seconds") ? "s" : "count");
    }
    expect(rows.filter(row => row.label === "Search consumed time")).toHaveLength(1);
    expect(rows.find(row => row.id === JSON.stringify(["Feasible search", "metadata.searchBudgetScope"]))?.values.b.value).toBe("job");
    const code = rows.find(row => row.id === JSON.stringify(["Feasible search", "metadata.nativeReturnCode"]))!;
    expect(code.values.b.semantic).toBeUndefined();
    expect(acgComparisonRows([a]).some(row => row.scope === "Feasible search · Job")).toBe(false);
  });
  it("aligns explicit legacy corpus job counters with unified root counters while retaining cell scopes", () => {
    const a = result("a", { acgResearch: { operation: "known-feasible", cells: [], generationConfiguration: { base: { technology: "gf180" } }, corpus: { consumedAttempts: 1, consumedSeconds: 4, remainingAttempts: 5, cells: [{ cell: "INV", attemptCount: 1, consumedSeconds: 3 }] } } });
    const b = result("b", { acgUnified: { search: { consumedAttempts: 2, consumedSeconds: 6, remainingAttempts: 4, cells: [{ cell: "INV", attemptCount: 2, consumedSeconds: 5 }] } } });
    const rows = acgComparisonRows([a, b]);
    for (const [key, absolute] of [["consumedAttempts", 1], ["remainingAttempts", -1], ["consumedSeconds", 2]] as const) {
      const row = rows.find(row => row.id === JSON.stringify(["Feasible search · Job", key]))!;
      expect(acgNumericDelta(row.values.b, row.values.a)?.absolute).toBe(absolute);
    }
    const cellTime = rows.find(row => row.id === JSON.stringify(["Feasible search · INV", "consumedSeconds"]))!;
    expect(cellTime.values.a.value).toBe(3);
    expect(cellTime.values.b.value).toBe(5);
    expect(rows.filter(row => row.label === "Search consumed time")).toHaveLength(2);
  });
  it("keeps other top-level numeric evidence in the union and separates thread/exit metadata from metrics", () => {
    const typed = (value: number) => ({ value, unit: "count", semantic: "evaluated-layouts" });
    const make = (id: string, n: number) => result(id, { acgUnified: { comparison: { evaluatedLayouts: n, typedCounter: typed(n), requestedThreads: n, nativeReturnCode: n }, report: { evaluatedReports: n } } });
    const rows = acgComparisonRows([make("a", 1), make("b", 2)]);
    for (const [scope, key] of [["Algorithm comparison · Phase", "evaluatedLayouts"], ["Workflow report evidence · Phase", "evaluatedReports"]]) {
      const row = rows.find(row => row.id === JSON.stringify([scope, key]))!;
      expect(Object.keys(row.values)).toEqual(["a", "b"]);
      expect(acgNumericDelta(row.values.b, row.values.a)).toBeNull();
    }
    const typedRow = rows.find(row => row.label === "typed Counter")!;
    expect(acgNumericDelta(typedRow.values.b, typedRow.values.a)).toEqual({ absolute: 1, percent: 100 });
    for (const key of ["requestedThreads", "nativeReturnCode"]) {
      const row = rows.find(row => row.id === JSON.stringify(["Algorithm comparison", "metadata." + key]))!;
      expect(row.label).toContain("Metadata");
      expect(acgNumericDelta(row.values.b, row.values.a)).toBeNull();
    }
  });
  it("marks conflicting duplicate job observations ambiguous instead of choosing a root or corpus value", () => {
    const rows = acgComparisonRows([result("a", { acgResearch: { operation: "known-feasible", consumedAttempts: 1, corpus: { consumedAttempts: 2 } } })]);
    const row = rows.find(row => row.id === JSON.stringify(["Feasible search · Job", "consumedAttempts"]))!;
    expect(row.values.a.ambiguous).toBe(true);
    expect(acgNumericDelta(row.values.a, numeric(1))).toBeNull();
  });
  it("renders actual result columns, baseline and later-only metric rows", () => {
    const results = [generation("a", [cell("INV", { placementWidthCpp: 3 })]), generation("b", [cell("INV", { placementWidthCpp: 4, uniqueStatus: "partial" })])];
    const html = renderToStaticMarkup(createElement(AcgResultComparison, { results, baselineId: "a", onBaseline() {} }));
    expect(html.match(/scope="col"/g)).toHaveLength(3);
    expect(html).toContain("Multi Row · Baseline");
    expect(html).toContain("Δ +1 CPP (+33.3333%)");
    expect(html).toContain("unique Status");
    expect(html).toContain("Not recorded in this result");
    expect(html).toContain("Baseline result");
    expect(html).toContain("Comparison scope");
  });
});
describe("ACG comparison selection transitions", () => {
  const rows = [result("a", {}), result("b", {}), result("c", {})];
  it("retains selection order when result list refreshes or filters change", () => {
    const selected = toggleAcgResult(toggleAcgResult([], "b"), "a");
    expect(retainAcgResults(selected, [...rows].reverse())).toEqual(["b", "a"]);
    expect(acgBaselineId(selected, null)).toBe("b");
    expect(acgBaselineId(selected, "a")).toBe("a");
    expect(toggleAcgResult(selected, "b")).toEqual(["a"]);
    expect(acgBaselineId(["a"], "b")).toBe("a");
    expect(acgBaselineId([], "b")).toBeNull();
  });
  it("adds a just-finished result once, preserves other valid selections and removes stale IDs", () => {
    expect(retainAcgResults(["b", "gone"], rows, "a")).toEqual(["b", "a"]);
    expect(retainAcgResults(["b", "a"], rows, "a")).toEqual(["b", "a"]);
    expect(retainAcgResults(["b", "gone"], rows, "missing")).toEqual(["b"]);
    expect(retainAcgResults([], rows)).toEqual([]);
  });
});
