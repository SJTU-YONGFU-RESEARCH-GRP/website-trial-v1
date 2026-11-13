import type { JsonObject, ResultRecordV1 } from "../../../shared/contracts/v1.ts";

export const DTCO_FREQUENCY_PROTOCOL_VERSION = "dtco.transient-toggle.v2";
export const SUPERSEDED_FREQUENCY_REASON = "This frequency measurement used a superseded protocol with an incorrect active-input observation window. Rerun characterization with the current protocol; the historical raw artifacts remain available.";
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};

/** Read-only scientific invalidation. Stored records and downloadable raw evidence are never changed. */
export function normalizeDtcoFrequencyResult(result: ResultRecordV1): ResultRecordV1 {
  if (result.moduleId !== "dtco") return result;
  const dtco = object(result.data.dtco), frequency = object(dtco.frequency), metrics = object(dtco.metrics);
  if (frequency.protocolVersion === DTCO_FREQUENCY_PROTOCOL_VERSION || (frequency.status === "superseded_protocol" && metrics.maxFrequencyHz === null && result.summary.maxFrequencyHz === null)) return result;
  if (!Object.keys(frequency).length && metrics.maxFrequencyHz === undefined && result.summary.maxFrequencyHz === undefined) return result;
  const provenance = object(dtco.provenance);
  const diagnostics: JsonObject = {
    status: "superseded_protocol", reason: SUPERSEDED_FREQUENCY_REASON,
    protocolVersion: frequency.protocolVersion ?? null, reportedStatus: frequency.status ?? null,
    reportedMaximumVerifiedToggleFrequencyHz: frequency.maximumVerifiedToggleFrequencyHz ?? null,
    reportedLowestVerifiedFailFrequencyHz: frequency.lowestVerifiedFailFrequencyHz ?? null,
    reportedBracketWidthHz: frequency.bracketWidthHz ?? null,
    reportedMetricMaxFrequencyHz: metrics.maxFrequencyHz ?? result.summary.maxFrequencyHz ?? null,
    evidencePath: frequency.evidencePath ?? "output/dtco/frequency.json",
  };
  const notice = { frequencyStatus: "superseded_protocol", frequencyReason: SUPERSEDED_FREQUENCY_REASON };
  return { ...result, summary: { ...result.summary, maxFrequencyHz: null, ...notice }, data: { ...result.data,
    dtco: { ...dtco, metrics: { ...metrics, maxFrequencyHz: null, ...notice },
      frequency: { ...frequency, status: "superseded_protocol", reason: SUPERSEDED_FREQUENCY_REASON,
        maximumVerifiedToggleFrequencyHz: null, lowestVerifiedFailFrequencyHz: null, bracketWidthHz: null, toleranceMet: false },
      provenance: { ...provenance, frequencyProtocolDiagnostics: diagnostics } } } };
}
