import { useCallback, useEffect, useState } from "react";
import type { JobRecordV1, JobStatus, ModuleId } from "../../shared/contracts/v1";
import { Navigate } from "react-router-dom";
import { listJobs } from "../api/jobs";
import { useAuth } from "../auth/AuthContext";
import { JobTable } from "../jobs";
import "../jobs.css";

const STATUSES: Array<JobStatus | ""> = ["", "draft", "validating", "ready", "queued", "running", "succeeded", "failed", "cancelled", "interrupted"];
const MODULES: Array<ModuleId | ""> = ["", "benchmark", "digital", "ppa"];

export function JobsPage(): JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<JobRecordV1[]>([]);
  const [moduleId, setModuleId] = useState<ModuleId | "">("");
  const [status, setStatus] = useState<JobStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setJobs(await listJobs({ moduleId: moduleId || undefined, status: status || undefined, from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to).toISOString() : undefined, limit: 100 }));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(false);
    }
  }, [from, moduleId, status, to]);

  useEffect(() => { if (user) void load(); }, [load, user]);
  if (authLoading) return <div className="jobs-page"><p>Checking session…</p></div>;
  if (!user) return <Navigate to="/login?next=/jobs" replace />;

  return (
    <div className="jobs-page">
      <header className="jobs-page__header"><div><p className="jobs-eyebrow">Private workspace</p><h1>My Jobs</h1><p>Persistent runs, imported reports, logs, and generated artifacts.</p></div><button type="button" className="jobs-secondary-button" onClick={() => { void load(); }} disabled={loading}>Refresh</button></header>
      <section className="jobs-card jobs-filter-bar" aria-label="Job filters">
        <label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value as ModuleId | "")}>{MODULES.map((value) => <option value={value} key={value || "all"}>{value || "All modules"}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as JobStatus | "")}>{STATUSES.map((value) => <option value={value} key={value || "all"}>{value || "All statuses"}</option>)}</select></label>
        <label>From<input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>To<input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <span className="jobs-filter-summary">{loading ? "Loading…" : `${jobs.length} jobs`}</span>
      </section>
      {error ? <div className="jobs-notice jobs-notice--error" role="alert">{error}<button type="button" onClick={() => { void load(); }}>Try again</button></div> : null}
      <section className="jobs-card"><JobTable jobs={jobs} /></section>
    </div>
  );
}
