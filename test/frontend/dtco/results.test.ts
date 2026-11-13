import { describe, expect, it } from "vitest";
import { filterSavedMeasurements, savedMeasurements, toggleSavedMeasurement } from "../../../src/pages/dtco/resultHelpers";
import { definition, experiment, point } from "./fixtures";
import { iteration, optimization } from "./optimizationFixtures";

describe("saved DTCO result selection", () => {
  it("keeps completed measurements across revisions, deduplicates optimizer points, and excludes failed or invalid metrics", () => {
    const run = optimization({ iterations: [iteration(1), iteration(2, { status: "failed" }), iteration(3, { metrics: { delayPs: NaN, averagePowerW: 1e-6, areaUm2: 3 } })] });
    const batch = experiment("batch", [point("duplicate", "succeeded", { resultId: "result-1" }), point("new"), point("failed", "failed"), point("invalid", "succeeded", { metrics: { delayPs: -1, averagePowerW: 1e-6, areaUm2: 3 } })]);
    batch.revision = 2;
    batch.revisions.push({ revision: 2, definition, points: batch.points, environmentHash: "same-env", createdAt: batch.createdAt });
    batch.revisions[0].points = [point("old")];
    const rows = savedMeasurements([batch], [run]);
    expect(rows.map(row => row.id)).toEqual(["result-1", "result-old", "result-new"]);
    expect(rows[0].origin).toBe("optimization");
    expect(rows[0].optimization?.iterations).toHaveLength(3);
    expect(rows.find(row => row.id === "result-old")?.label).toContain("Revision 1");
    expect(rows[0].comparisonKey).not.toBe(rows[1].comparisonKey);
  });
  it("filters names, rounds, conditions and source/scope without silently changing selection", () => {
    const rows = savedMeasurements([experiment()], [optimization({ iterations: [iteration(1), iteration(2)] })]);
    expect(filterSavedMeasurements(rows, "round 2", "extracted", "optimization").map(row => row.id)).toEqual(["result-2"]);
    expect(filterSavedMeasurements(rows, "25 °C", "schematic", "experiment")).toHaveLength(1);
    expect(toggleSavedMeasurement([], rows[0].id)).toEqual([rows[0].id]);
    expect(toggleSavedMeasurement([rows[0].id], rows[0].id)).toEqual([]);
  });
});
