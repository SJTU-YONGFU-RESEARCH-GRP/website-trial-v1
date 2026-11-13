import { useEffect, useRef, useState } from "react";
import type { JobRecordV1 } from "../../../shared/contracts/v1";
import { Link } from "react-router-dom";
import { cancelJob } from "../../api/jobs";
import { EventLog, JobProgress, useJobDetail } from "../../jobs";
import "../../jobs.css";
const TERMINAL = new Set(["succeeded", "failed", "cancelled", "interrupted"]);
export function AcgRunMonitor({ jobId, readOnly, onFinished }: { jobId: string; readOnly: boolean; onFinished(job?: JobRecordV1): void }): JSX.Element {
  const { detail, error, liveState, refresh } = useJobDetail(jobId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const notified = useRef(false);
  useEffect(() => {
    if (detail && TERMINAL.has(detail.job.status) && !notified.current) { notified.current = true; onFinished(detail.job); }
  }, [detail, onFinished]);
  const cancel = async () => {
    setBusy(true); setActionError(null);
    try { await cancelJob(jobId); await refresh(); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  return <section className="acg-run-monitor" aria-label="ACG execution">
    <div className="acg-heading"><div><span className="digital-eyebrow">Run</span><h3>Execution progress</h3></div><Link to={`/jobs/${encodeURIComponent(jobId)}`}>Open full job</Link></div>
    {error ? <p className="acg-notice is-error" role="alert">Live refresh failed: {error}</p> : null}
    {actionError ? <p className="acg-notice is-error" role="alert">{actionError}</p> : null}
    {detail ? <><JobProgress job={detail.job} steps={detail.steps} />
      <div className="acg-actions workflow-file-actions"><strong>Status: {detail.job.status}</strong>{["queued", "running"].includes(detail.job.status) ? <button type="button" disabled={busy || readOnly} onClick={() => void cancel()}>{busy ? "Cancelling…" : "Cancel run"}</button> : null}</div>
      {detail.job.error ? <p className="acg-notice is-error">{detail.job.error.code}: {detail.job.error.message}</p> : null}
      <EventLog events={detail.latestEvents} liveState={liveState} />
    </> : <p>Loading execution…</p>}
  </section>;
}
