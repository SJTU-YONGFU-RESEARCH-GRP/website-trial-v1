import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { JobDetailV1, JobResultV1 } from "../../api/jobs";
import { DtcoLayoutPreview } from "./DtcoLayoutPreview";
import { apiRequest } from "../../api/client";
import { ArtifactList, EventLog, JobProgress } from "../../jobs";

export function DtcoJobDetails({ jobId }: { jobId: string }): JSX.Element {
  const [detail, setDetail] = useState<JobDetailV1 | null>(null);
  const [result, setResult] = useState<JobResultV1 | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultRetry, setResultRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setDetail(null); setResult(null); setError(null);
    const refresh = async () => {
      try {
        const next = (await apiRequest<JobDetailV1>(`/jobs/${encodeURIComponent(jobId)}`, { signal: controller.signal })).data;
        if (controller.signal.aborted) return;
        setDetail(next); setError(null);
        if (["succeeded", "failed", "cancelled", "interrupted"].includes(next.job.status)) return;
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      }
      if (!controller.signal.aborted) timer = setTimeout(() => { void refresh(); }, 2000);
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [jobId]);
  useEffect(() => {
    if (!detail?.job.resultId) return;
    const controller = new AbortController();
    setResultError(null);
    void apiRequest<JobResultV1>(`/results/dtco/${encodeURIComponent(detail.job.resultId)}`, { signal: controller.signal }).then(next => {
      if (!controller.signal.aborted) setResult(next.data);
    }).catch(reason => { if (!controller.signal.aborted) setResultError(reason instanceof Error ? reason.message : String(reason)); });
    return () => controller.abort();
  }, [detail?.job.resultId, resultRetry]);
  return <div className="dtco-job-detail" aria-label="Selected job details">
    <p><Link to={`/jobs/${encodeURIComponent(jobId)}`}>Open full job, execution plan, and provenance</Link> · <a href={`/api/jobs/${encodeURIComponent(jobId)}/manifest`}>Input manifest</a> · <a href={`/api/jobs/${encodeURIComponent(jobId)}/artifacts.zip`}>Download all artifacts</a></p>
    {resultError ? <p className="jobs-notice jobs-notice--error" role="alert">Measured result could not be loaded: {resultError} <button type="button" className="jobs-secondary-button" onClick={() => setResultRetry(current => current + 1)}>Reload measured result</button></p> : null}
    {error ? <p className="jobs-notice jobs-notice--error" role="alert">{error}</p> : null}
    {detail ? <><JobProgress job={detail.job} steps={detail.steps} /><EventLog events={detail.latestEvents} liveState={["succeeded", "failed", "cancelled", "interrupted"].includes(detail.job.status) ? "complete" : "polling"} /><DtcoLayoutPreview data={result?.data ?? null} artifacts={detail.artifacts} resultId={result?.id ?? null} /><ArtifactList artifacts={detail.artifacts} /></> : <p>Loading job details…</p>}
  </div>;
}
