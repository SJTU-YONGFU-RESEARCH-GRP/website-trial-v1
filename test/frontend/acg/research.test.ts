import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ArtifactRecordV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { researchDefaults, researchParameters, researchSourceResults, researchWitnessArtifacts, researchMatrixBudget } from "../../../src/pages/acg/researchHelpers";
import { acgMetricEntries, acgWidthEvidence } from "../../../src/pages/acg/helpers";
import { AcgResearchResults } from "../../../src/pages/acg/AcgResearchResults";

describe("Staged ACG research workflows", () => {
  it("serializes MR algorithm matrix rows and native trial bounds", () => {
    expect(researchParameters("algorithm-matrix", "mr", researchDefaults("algorithm-matrix", "mr"))).toEqual({ engine: "mr", cells: ["inv_x1"], algorithms: ["dp", "sa"], rowCounts: [1, 2, 3], trials: 1, threads: 1, maxCols: 8 });
  });
  it("limits CMOS comparison to its actual single-row native runner", () => {
    expect(researchParameters("algorithm-matrix", "cmos", researchDefaults("algorithm-matrix", "cmos")).rowCounts).toEqual([1]);
    expect(() => researchParameters("algorithm-matrix", "cmos", { ...researchDefaults("algorithm-matrix", "cmos"), rowCounts: "2" })).toThrow(/Rows/);
  });
  it("rejects a matrix exceeding the total native run bound", () => {
    expect(() => researchParameters("algorithm-matrix", "mr", { ...researchDefaults("algorithm-matrix", "mr"), cells: "inv_x1,nand2_x1,aoi21_x1,mux2_x1,ldnq_x1,xor2_x1,mux4_x1,addh_x1,fdp_x1,oai222_x1,maj3_x1,fsdp_x1,mux8_x1,xor4_x1,addf_x1", trials: "10", rowCounts: "1,2,3,4" })).toThrow(/1200 runs/);
  });
  it("rejects duplicate, fractional and nonfinite research values", () => {
    for (const rowCounts of ["1,1", "1.5", "Infinity"]) expect(() => researchParameters("algorithm-matrix", "mr", { ...researchDefaults("algorithm-matrix", "mr"), rowCounts })).toThrow();
  });
  it("builds report-only parameters without a native cell-run request", () => {
    expect(researchParameters("algorithm-report", "mr", { ...researchDefaults("algorithm-report", "mr"), sourceResultId: "owned-result" })).toEqual({ engine: "mr", maxCols: 8, sourceResultId: "owned-result" });
  });
  it("preserves an owned continuation selector without claiming budget reset", () => {
    const output = researchParameters("known-feasible", "mr", { ...researchDefaults("known-feasible", "mr"), resumeResultId: "prior" });
    expect(output).toMatchObject({ resumeResultId: "prior", maxAttempts: 30, totalTimeoutSeconds: 3600, attemptTimeoutSeconds: 900, tracks: [9, 12, 16], extraCpp: [0, 2, 4, 8, 16] });
  });
  it("validates single-row track choices but supports native multi-row track bounds", () => {
    const defaults = researchDefaults("known-feasible", "mr");
    expect(() => researchParameters("known-feasible", "mr", { ...defaults, tracks: "5" })).toThrow();
    expect(researchParameters("known-feasible", "mr", { ...defaults, numRows: "2", tracks: "16,5,9" }).tracks).toEqual([5, 9, 16]);
  });
  it("does not expose another owner's result as a continuation source", () => {
    const results = [{ id: "a", ownerId: "alice", data: { acgResearch: { operation: "known-feasible" } } }, { id: "b", ownerId: "bob", data: { acgResearch: { operation: "known-feasible" } } }, { id: "c", ownerId: "alice", data: { acgResearch: { operation: "algorithm-matrix" } } }] as unknown as ResultRecordV1[];
    expect(researchSourceResults(results, "alice", "known-feasible").map(result => result.id)).toEqual(["a"]);
    expect(researchSourceResults(results, "alice", "algorithm-report").map(result => result.id)).toEqual(["c"]);
    expect(researchSourceResults(results, undefined, "known-feasible")).toEqual([]);
  });
  it("moves width evidence paths out of metric tiles and retains the underlying records", () => {
    const metrics = { widthCpp: 5, widthSource: "routed_candidate", widthEvidencePaths: ["output/proof.json", "", null, "output/proof.json"] };
    expect(acgMetricEntries(metrics)).toContainEqual(["Width source", "Proven routed candidate"]);
    expect(acgMetricEntries(metrics).some(([label]) => label === "Width evidence")).toBe(false);
    expect(acgWidthEvidence(metrics)).toEqual(["output/proof.json"]);
    expect(metrics.widthEvidencePaths).toHaveLength(4);
  });
  it("does not turn a completed capped corpus into a feasibility or foundry pass", () => {
    const markup = renderToStaticMarkup(createElement(AcgResearchResults, { value: { operation: "known-feasible", engine: "mr", status: "partial", processCompleted: true, foundryCertification: false, cells: [{ cell: "INV", status: "capped", terminationReason: "max_attempts", attemptCount: 3, validationLevel: "NOT_CHECKED" }] }, artifacts: [] }));
    expect(markup).toContain("capped"); expect(markup).toContain("max_attempts"); expect(markup).toContain("Not certified"); expect(markup).toContain("No recorded witness"); expect(markup).not.toContain("is-passed");
  });
  it("shows native trial outcome separately from process completion and links actual report artifacts", () => {
    const artifacts = [{ id: "report", relativePath: "output/report.md" }] as ArtifactRecordV1[];
    const markup = renderToStaticMarkup(createElement(AcgResearchResults, { value: { operation: "algorithm-report", engine: "cmos", status: "completed", processCompleted: true, foundryCertification: false, rawReportPaths: ["output/report.md"], metrics: [{ cell: "inv_x1", nativeSuccess: false, processCompleted: true, metricsCollected: false }] }, artifacts }));
    expect(markup).toContain("native Success"); expect(markup).toContain("false"); expect(markup).toContain("/api/artifacts/report/download"); expect(markup).toContain("static captions");
  });
});

describe("Research witness output ownership", () => {
  it("links only the explicit witness subtree under the uniquely evidenced report root", () => {
    const artifacts = [{ id: "index", relativePath: "results/acg/r/output/research/native/index.json" }, { id: "a", relativePath: "results/acg/r/output/research/native/INV/witness/INV.gds" }, { id: "b", relativePath: "results/acg/r/output/research/native/BUF/witness/BUF.gds" }] as ArtifactRecordV1[];
    expect(researchWitnessArtifacts("native/INV/witness", ["native/index.json"], artifacts).map(item => item.id)).toEqual(["a"]);
    expect(researchWitnessArtifacts("../native/INV/witness", ["native/index.json"], artifacts)).toEqual([]);
    expect(researchWitnessArtifacts("native/INV/witness", [], artifacts)).toEqual([]);
  });
  it("withholds witness binding when duplicate retained report suffixes are ambiguous", () => {
    const artifacts = [{ id: "a", relativePath: "output/native/index.json" }, { id: "b", relativePath: "original-snapshot/native/index.json" }] as ArtifactRecordV1[];
    expect(researchWitnessArtifacts("native/INV/witness", ["native/index.json"], artifacts)).toEqual([]);
  });
});

describe("README comparison budget", () => {
  it("accepts the documented 225-run matrix and reports native timeout sum separately", () => {
    const params = researchParameters("algorithm-matrix", "mr", { ...researchDefaults("algorithm-matrix", "mr"), cells: "inv_x1,nand2_x1,aoi21_x1,mux2_x1,ldnq_x1,xor2_x1,mux4_x1,addh_x1,fdp_x1,oai222_x1,maj3_x1,fsdp_x1,mux8_x1,xor4_x1,addf_x1", algorithms: "dp,sa,greedy_min,hc_fi,ga" });
    expect(researchMatrixBudget(params).runCount).toBe(225);
    expect(researchMatrixBudget(params).nativeTimeoutSumSeconds).toBeGreaterThan(0);
    expect(researchMatrixBudget(params).nativeTimeoutSumSeconds).toBeLessThan(86400);
  });
});

it("filters trusted execution-owner sources by exact engine and operation", () => {
  const results = [{ id: "owned", ownerId: "effective-runner", data: { acgResearch: { operation: "algorithm-matrix", engine: "mr" } } }, { id: "wrong-engine", ownerId: "effective-runner", data: { acgResearch: { operation: "algorithm-matrix", engine: "cmos" } } }, { id: "foreign", ownerId: "other", data: { acgResearch: { operation: "algorithm-matrix", engine: "mr" } } }] as unknown as ResultRecordV1[];
  expect(researchSourceResults(results, "effective-runner", "algorithm-report", "mr").map(item => item.id)).toEqual(["owned"]);
});
it("defers retained generation and report configuration until its disclosure opens", () => {
  const markup = renderToStaticMarkup(createElement(AcgResearchResults, { value: { operation: "algorithm-report", parameters: { maxCols: 8 }, generationConfiguration: { technology: "GF180" }, configurationMetadata: { source: "frozen" }, metrics: [] }, artifacts: [] }));
  expect(markup).toContain("Normalized configuration and budget");
  expect(markup).not.toContain("GF180"); expect(markup).not.toContain("<pre>");
});
