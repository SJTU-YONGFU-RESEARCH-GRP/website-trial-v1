import { describe, expect, it } from "vitest";
import { frequencyRerunReason } from "../../../src/pages/dtco/frequencyProtocol";
import { savedMeasurements } from "../../../src/pages/dtco/resultHelpers";
import { experiment, point } from "./fixtures";
import { iteration, optimization } from "./optimizationFixtures";
describe("historical frequency protocol warnings", () => {
  const reason = "The old input measurement window was invalid.";
  const diagnostics = { status: "superseded_protocol", reason };
  it("reads explicit result, provenance and point-metric invalidation without treating missing frequency as invalid", () => {
    expect(frequencyRerunReason({ frequency: diagnostics })).toBe(reason);
    expect(frequencyRerunReason({ provenance: { frequencyProtocolDiagnostics: diagnostics } })).toBe(reason);
    expect(frequencyRerunReason({ frequencyStatus: "superseded_protocol", frequencyReason: reason })).toBe(reason);
    for (const value of [null, {}, { frequency: { status: "bracketed", protocolVersion: "dtco.transient-toggle.v2" } }, { maxFrequencyHz: null }]) expect(frequencyRerunReason(value)).toBeNull();
  });
  it("retains successful historical results and download identity while passing the rerun reason to comparison", () => {
    const measured = iteration(1, { metrics: { delayPs: 20, averagePowerW: 1e-6, areaUm2: 3, maxFrequencyHz: null }, score: null, accepted: null, feasible: false, error: { type: "configuration", code: "DTCO_FREQUENCY_SUPERSEDED_PROTOCOL", message: reason, stepId: null, retryable: false, details: null }, provenance: { frequencyProtocolDiagnostics: diagnostics } });
    const oldPoint = point("old", "succeeded", { metrics: { delayPs: 20, averagePowerW: 1e-6, areaUm2: 3, maxFrequencyHz: null, frequencyStatus: "superseded_protocol", frequencyReason: reason } });
    const rows = savedMeasurements([experiment("batch", [oldPoint])], [optimization({ iterations: [measured], bestIterationId: null, bestScore: null })]);
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.frequencyRerunReason === reason && row.metrics.maxFrequencyHz === null && row.jobId)).toBe(true);
  });
});
