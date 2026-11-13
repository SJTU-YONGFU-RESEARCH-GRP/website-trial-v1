const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const FREQUENCY_RERUN_LABEL = "Frequency measurement needs rerun";
const fallbackReason = "This historical measurement used a superseded frequency protocol. Its frequency and optimization claims are unavailable; rerun with the current protocol.";
/** Read only explicit server invalidation; absent frequency alone is not evidence of a superseded protocol. */
export function frequencyRerunReason(value: unknown): string | null {
  const object = record(value);
  if (!object) return null;
  const frequency = record(object.frequency);
  const diagnostics = record(object.frequencyProtocolDiagnostics) ?? record(record(object.provenance)?.frequencyProtocolDiagnostics);
  const invalid = object.frequencyStatus === "superseded_protocol" || object.status === "superseded_protocol" || frequency?.status === "superseded_protocol" || diagnostics?.status === "superseded_protocol";
  if (!invalid) return null;
  const reason = object.frequencyReason ?? object.reason ?? frequency?.reason ?? diagnostics?.reason;
  return typeof reason === "string" && reason.trim() ? reason : fallbackReason;
}
export function FrequencyProtocolNotice({ value }: { value: unknown }): JSX.Element | null {
  const reason = frequencyRerunReason(value);
  return reason ? <p className="jobs-notice jobs-notice--warning" role="note"><strong>{FREQUENCY_RERUN_LABEL}.</strong> {reason} Historical workflow status and raw artifact downloads are retained.</p> : null;
}
