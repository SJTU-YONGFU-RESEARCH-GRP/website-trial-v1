import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { JobDetailV1 } from "../../api/jobs";
import { apiRequest } from "../../api/client";
import { ArtifactList, EventLog, JobProgress } from "../../jobs";

export function DtcoJobDetails({ jobId }: { jobId: string }): JSX.Element {
  const [detail, setDetail] = useState<JobDetailV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setDetail(null); setError(null);
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
  return <div className="dtco-job-detail" aria-label="Selected job details">
    <p><Link to={`/jobs/${encodeURIComponent(jobId)}`}>Open full job, execution plan, and provenance</Link> · <a href={`/api/jobs/${encodeURIComponent(jobId)}/manifest`}>Input manifest</a> · <a href={`/api/jobs/${encodeURIComponent(jobId)}/artifacts.zip`}>Download all artifacts</a></p>
    {error ? <p className="jobs-notice jobs-notice--error" role="alert">{error}</p> : null}
    {detail ? <><JobProgress job={detail.job} steps={detail.steps} /><EventLog events={detail.latestEvents} liveState={["succeeded", "failed", "cancelled", "interrupted"].includes(detail.job.status) ? "complete" : "polling"} /><ArtifactList artifacts={detail.artifacts} /></> : <p>Loading job details…</p>}
  </div>;
}
