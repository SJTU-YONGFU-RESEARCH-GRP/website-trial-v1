import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DataUploadError, loadUploadJob, type UploadJob } from "../uploads/uploadClient";
import { UPLOAD_DATASET_CONFIG } from "../uploads/uploadConfig";
import "../upload-processing.css";

const DATASET_ROUTES = {
  benchmark: "/benchmark",
  digital: "/plotly",
  ppa: "/ppa",
} as const;

function timeLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString();
}

export function UploadProcessingPage(): JSX.Element {
  const { jobId = "" } = useParams();
  const [job, setJob] = useState<UploadJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const refresh = async (): Promise<void> => {
      try {
        const next = await loadUploadJob(jobId);
        if (cancelled) return;
        setJob(next);
        setError(null);
        if (next.status === "queued" || next.status === "processing") {
          timer = window.setTimeout(() => void refresh(), 700);
        }
      } catch (reason) {
        if (cancelled) return;
        const message = reason instanceof DataUploadError
          ? `${reason.code ? `${reason.code}: ` : ""}${reason.message}`
          : reason instanceof Error ? reason.message : String(reason);
        setError(message);
      }
    };
    void refresh();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [jobId]);

  const config = job ? UPLOAD_DATASET_CONFIG[job.dataset] : null;
  const elapsed = useMemo(() => {
    if (!job) return "—";
    const milliseconds = new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime();
    return Number.isFinite(milliseconds) ? `${Math.max(0, milliseconds / 1000).toFixed(1)} s` : "—";
  }, [job]);

  if (error) {
    return (
      <div className="upload-processing-page">
        <section className="chart-card upload-processing-error">
          <h2>Backend processing unavailable</h2>
          <p>{error}</p>
          <Link to="/">Return home</Link>
        </section>
      </div>
    );
  }

  if (!job || !config) {
    return <div className="upload-processing-page"><section className="chart-card">Loading backend job…</section></div>;
  }

  return (
    <div className="upload-processing-page">
      <section className="chart-card upload-processing-hero">
        <div>
          <span className="upload-processing-eyebrow">Backend processing</span>
          <h2>{job.result?.recognition.tool ?? job.tool}</h2>
          <p>{config.processing}</p>
        </div>
        <Link className="upload-processing-back" to={DATASET_ROUTES[job.dataset]}>Back to {job.dataset}</Link>
      </section>

      <section className="chart-card upload-processing-status">
        <div className="upload-processing-status__heading">
          <div>
            <span className={`upload-processing-pill upload-processing-pill--${job.status}`}>{job.status}</span>
            <strong>{job.stage}</strong>
          </div>
          <strong>{job.progress}%</strong>
        </div>
        <progress max={100} value={job.progress} aria-label={`Backend progress ${job.progress}%`} />
        <dl className="upload-processing-metadata">
          <div><dt>Tool group</dt><dd>{config.tool}</dd></div>
          <div><dt>Dataset</dt><dd>{job.dataset}</dd></div>
          <div><dt>Upload UID</dt><dd><code>{job.uploadId}</code></dd></div>
          <div><dt>Job ID</dt><dd><code>{job.jobId}</code></dd></div>
          <div><dt>Started</dt><dd>{new Date(job.createdAt).toLocaleString()}</dd></div>
          <div><dt>Elapsed</dt><dd>{elapsed}</dd></div>
        </dl>
        {job.error ? <div className="upload-processing-failure" role="alert"><strong>{job.error.code}</strong><span>{job.error.message}</span></div> : null}
      </section>

      {job.result ? (
        <section className="chart-card upload-processing-recognition">
          <span className="upload-processing-eyebrow">Recognized content</span>
          <h2>{job.result.recognition.summary}</h2>
          <dl>
            <div><dt>Tool</dt><dd>{job.result.recognition.tool}</dd></div>
            <div><dt>Format</dt><dd>{job.result.recognition.format}</dd></div>
            {job.result.recognition.details.map((detail) => <div key={detail}><dt>Detected</dt><dd>{detail}</dd></div>)}
            <div><dt>Published records</dt><dd>{job.result.recordCount.toLocaleString()}</dd></div>
          </dl>
        </section>
      ) : null}

      <section className="chart-card upload-processing-log-card">
        <div className="upload-processing-log-heading">
          <div>
            <span className="upload-processing-eyebrow">Live backend log</span>
            <h2>Processing timeline</h2>
          </div>
          <span>{job.logs.length} events</span>
        </div>
        <ol className="upload-processing-log">
          {job.logs.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className={`upload-processing-log__${entry.level}`}>
              <time dateTime={entry.at}>{timeLabel(entry.at)}</time>
              <span>{entry.message}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
