import { useEffect, useState } from "react";
import type { ResultRecordV1 } from "../../shared/contracts/v1";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { cancelJob, cloneJob, getJobResult, preflightClonedJob, retryJob, startReadyJob } from "../api/jobs";
import { useAuth } from "../auth/AuthContext";
import { ArtifactList, EventLog, formatBytes, formatDate, formatJson, JobProgress, shortId, useJobDetail } from "../jobs";
import "../jobs.css";

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "interrupted"]);

export function JobDetailPage(): JSX.Element {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { detail, loading, error, liveState, refresh } = useJobDetail(jobId);
  const [result, setResult] = useState<ResultRecordV1 | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!detail?.job.resultId) { setResult(null); return; }
    void getJobResult(detail.job.moduleId, detail.job.resultId).then(setResult).catch(() => setResult(null));
  }, [detail?.job.moduleId, detail?.job.resultId]);

  async function perform(name: string, operation: () => Promise<{ id: string }>, followNewJob = false): Promise<void> {
    setAction(name); setActionError(null);
    try {
      const next = await operation();
      if (followNewJob) navigate(`/jobs/${next.id}`);
      else await refresh();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally { setAction(null); }
  }

  if (authLoading) return <div className="jobs-page"><p>Checking session…</p></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`} replace />;
  if (loading && !detail) return <div className="jobs-page"><p>Loading job…</p></div>;
  if (!detail) return <div className="jobs-page"><div className="jobs-notice jobs-notice--error">{error || "Job not found."}</div></div>;
  const { job, steps, artifacts } = detail;
  const elapsedStart = job.startedAt ? new Date(job.startedAt).valueOf() : null;
  const elapsedEnd = job.finishedAt ? new Date(job.finishedAt).valueOf() : Date.now();
  const elapsedSeconds = elapsedStart === null ? null : Math.max(0, Math.round((elapsedEnd - elapsedStart) / 1000));

  return (
    <div className="jobs-page">
      <header className="jobs-page__header jobs-page__header--detail">
        <div><Link className="jobs-back-link" to="/jobs">← My Jobs</Link><p className="jobs-eyebrow">{job.moduleId} / {job.operation}</p><h1 title={job.id}>Job {shortId(job.id)}</h1><p>Created {formatDate(job.createdAt)} · capability {job.capabilityVersion}</p></div>
        <div className="jobs-action-row">
          <a className="jobs-secondary-button" href={`/api/jobs/${encodeURIComponent(job.id)}/manifest`}>Input manifest</a>
          <a className="jobs-secondary-button" href={`/api/jobs/${encodeURIComponent(job.id)}/artifacts.zip`}>All artifacts</a>
          {job.status === "draft" ? <button className="jobs-primary-button" type="button" disabled={Boolean(action)} onClick={() => { void perform("preflight", () => preflightClonedJob(job)); }}>{action === "preflight" ? "Validating…" : "Run preflight"}</button> : null}
          {job.status === "ready" ? <button className="jobs-primary-button" type="button" disabled={Boolean(action)} onClick={() => { void perform("start", () => startReadyJob(job.id)); }}>{action === "start" ? "Starting…" : "Start"}</button> : null}
          {(job.status === "queued" || job.status === "running") ? <button className="jobs-danger-button" type="button" disabled={Boolean(action)} onClick={() => { void perform("cancel", () => cancelJob(job.id)); }}>{action === "cancel" ? "Cancelling…" : "Cancel"}</button> : null}
          {TERMINAL.has(job.status) ? <button className="jobs-secondary-button" type="button" disabled={Boolean(action)} onClick={() => { void perform("retry", () => retryJob(job.id), true); }}>{action === "retry" ? "Creating retry…" : "Retry"}</button> : null}
          <button className="jobs-secondary-button" type="button" disabled={Boolean(action)} onClick={() => { void perform("clone", () => cloneJob(job.id), true); }}>{action === "clone" ? "Cloning…" : "Clone"}</button>
        </div>
      </header>
      {actionError ? <div className="jobs-notice jobs-notice--error" role="alert">{actionError}</div> : null}
      {error ? <div className="jobs-notice jobs-notice--warning" role="status">Live refresh failed: {error}</div> : null}
      <JobProgress job={job} steps={steps} />
      <section className="jobs-card"><div className="jobs-card__heading"><div><h2>Execution metadata</h2><p>Frozen identity and runtime configuration for reproducibility.</p></div></div><dl className="jobs-definition-grid"><div><dt>Owner</dt><dd><code>{job.ownerId}</code></dd></div><div><dt>Module / workflow</dt><dd>{job.moduleId} · {job.workflow}</dd></div><div><dt>Workspace</dt><dd><code>{job.workspaceRelativePath}</code></dd></div><div><dt>Result ID</dt><dd><code>{job.resultId || "—"}</code></dd></div><div><dt>Current step</dt><dd><code>{job.currentStepId || "—"}</code></dd></div><div><dt>Elapsed</dt><dd>{elapsedSeconds === null ? "Not started" : `${elapsedSeconds}s`}</dd></div><div><dt>Retry of</dt><dd><code>{job.retryOfJobId || "—"}</code></dd></div><div><dt>Sweep parent</dt><dd><code>{job.sweepParentJobId || "—"}</code></dd></div><div><dt>Tool versions</dt><dd><code>{formatJson(job.toolVersions)}</code></dd></div><div><dt>Parameters</dt><dd><code>{formatJson(job.parameters)}</code></dd></div></dl></section>
      {job.error ? <section className="jobs-card jobs-error-card"><h2>Failure</h2><strong>{job.error.code}</strong><p>{job.error.message}</p><dl><div><dt>Type</dt><dd>{job.error.type}</dd></div><div><dt>Retryable</dt><dd>{job.error.retryable ? "Yes" : "No"}</dd></div><div><dt>Exit code</dt><dd>{job.exitCode ?? "—"}</dd></div></dl>{job.error.details ? <pre>{formatJson(job.error.details)}</pre> : null}</section> : null}
      <EventLog events={detail.latestEvents} liveState={liveState} />
      <section className="jobs-card"><div className="jobs-card__heading"><div><h2>Input manifest</h2><p>{job.inputManifest.fileCount} files · {formatBytes(job.inputManifest.totalBytes)}</p></div><code>{job.inputManifest.schemaVersion}</code></div>
        <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Path</th><th>Role</th><th>Type</th><th>Size</th><th>SHA-256</th><th>Used by</th></tr></thead><tbody>{job.inputManifest.files.map((file) => <tr key={file.relativePath}><td><code>{file.relativePath}</code>{file.validationErrors.map((message) => <small className="jobs-error" key={message}>{message}</small>)}{file.unresolvedIncludes.map((include) => <small className="jobs-warning" key={include}>Missing include: {include}</small>)}</td><td>{file.role || "Unmapped"}{file.required ? " · required" : ""}</td><td>{file.recognizedType}</td><td>{formatBytes(file.sizeBytes)}</td><td><code title={file.sha256}>{file.sha256.slice(0, 14)}…</code></td><td>{file.usedByStepIds.join(", ") || "—"}</td></tr>)}</tbody></table></div>
      </section>
      <section className="jobs-card"><div className="jobs-card__heading"><div><h2>Frozen execution plan</h2><p>Executable, argument array, input mapping, and timeout captured at preflight.</p></div><strong>{job.plan.steps.length} steps</strong></div>
        <ol className="jobs-plan">{job.plan.steps.map((step) => <li key={step.id}><div><strong>{step.name}</strong><p>{step.description}</p></div><dl><div><dt>Inputs</dt><dd>{step.inputRoles.join(", ") || "—"}</dd></div><div><dt>Outputs</dt><dd>{step.outputRoles.join(", ") || "—"}</dd></div>{step.process ? <><div><dt>Executable</dt><dd><code>{step.process.executableDisplay}</code></dd></div><div><dt>Arguments</dt><dd><code>{JSON.stringify(step.process.argv)}</code></dd></div><div><dt>Working directory</dt><dd><code>{step.process.cwdRelative}</code></dd></div><div><dt>Timeout</dt><dd>{step.process.timeoutSeconds}s</dd></div></> : <div><dt>Process</dt><dd>Internal parser/publisher step</dd></div>}</dl></li>)}</ol>
        {job.plan.warnings.map((warning) => <p className="jobs-notice jobs-notice--warning" key={warning}>{warning}</p>)}
      </section>
      <ArtifactList artifacts={artifacts} />
      <section className="jobs-card"><div className="jobs-card__heading"><div><h2>Result & provenance</h2><p>Published only after required steps and parser validation succeed.</p></div>{result ? <Link className="jobs-link" to={`/results/${result.moduleId}/${result.id}`}>Open result</Link> : null}</div>
        {result ? <><dl className="jobs-definition-grid"><div><dt>Lifecycle</dt><dd>{result.lifecycle}</dd></div><div><dt>Origin</dt><dd>{result.provenance.origin}</dd></div><div><dt>Parser</dt><dd>{result.provenance.parserId} {result.provenance.parserVersion}</dd></div><div><dt>Manifest hash</dt><dd><code>{result.provenance.inputManifestSha256}</code></dd></div><div><dt>Tool versions</dt><dd><code>{formatJson(result.provenance.toolVersions)}</code></dd></div><div><dt>Parameters</dt><dd><code>{formatJson(result.provenance.parameters)}</code></dd></div></dl></> : <p className="jobs-empty">This job has no published or private result record yet.</p>}
      </section>
    </div>
  );
}
