import { useCallback, useEffect, useMemo, useState } from "react";
import type { JobRecordV1, JobStatus, ModuleId, UserRecordV1 } from "../../shared/contracts/v1";
import { useSearchParams } from "react-router-dom";
import { interruptAdminJob, listAdminJobs, listAdminUsers } from "../api/admin";
import { cancelJob, cleanJobWorkspace, diagnosticBundleUrl, retryJob } from "../api/jobs";
import { formatDate, shortId, StatusBadge } from "../jobs";
import { AdminNotice } from "./AdminNotice";

const MODULES: Array<ModuleId | ""> = ["", "benchmark", "digital", "ppa"];
const STATUSES: Array<JobStatus | ""> = ["", "draft", "validating", "ready", "queued", "running", "succeeded", "failed", "cancelled", "interrupted"];
const TERMINAL = new Set(["succeeded", "failed", "cancelled", "interrupted"]);

export function JobsPanel(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<JobRecordV1[]>([]);
  const [users, setUsers] = useState<UserRecordV1[]>([]);
  const [moduleId, setModuleId] = useState<ModuleId | "">("");
  const [status, setStatus] = useState<JobStatus | "">("");
  const [ownerId, setOwnerId] = useState(searchParams.get("ownerId") || "");
  const [tool, setTool] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const [nextJobs, nextUsers] = await Promise.all([listAdminJobs({ moduleId: moduleId || undefined, status: status || undefined, ownerId: ownerId || undefined, limit: 200 }), listAdminUsers()]); setJobs(nextJobs); setUsers(nextUsers); setError(null); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
  }, [moduleId, ownerId, status]);
  useEffect(() => { void load(); }, [load]);
  const tools = useMemo(() => [...new Set(jobs.flatMap((job) => job.toolConfigurations.map((entry) => entry.toolId)))].sort(), [jobs]);
  const visible = tool ? jobs.filter((job) => job.toolConfigurations.some((entry) => entry.toolId === tool)) : jobs;
  const username = (id: string) => users.find((user) => user.id === id)?.username || shortId(id);
  async function act(id: string, name: string, operation: () => Promise<unknown>): Promise<void> { setBusy(id); setError(null); setMessage(null); try { await operation(); setMessage(`${name} completed for ${shortId(id)}.`); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); } finally { setBusy(null); } }
  return <section className="admin-section"><header><div><h2>Jobs</h2><p>Inspect every owner, frozen tool snapshot, state transition, and diagnostic artifact.</p></div><button onClick={() => { void load(); }} type="button">Refresh</button></header><AdminNotice error={error} message={message} />
    <div className="admin-filters"><label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value as ModuleId | "")}>{MODULES.map((value) => <option value={value} key={value || "all"}>{value || "All modules"}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as JobStatus | "")}>{STATUSES.map((value) => <option value={value} key={value || "all"}>{value || "All statuses"}</option>)}</select></label><label>User<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}><option value="">All users</option>{users.map((user) => <option value={user.id} key={user.id}>{user.username}</option>)}</select></label><label>Tool<select value={tool} onChange={(event) => setTool(event.target.value)}><option value="">All tools</option>{tools.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><span>{visible.length} jobs</span></div>
    <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Job</th><th>User</th><th>Flow</th><th>Tools</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{visible.map((job) => <tr key={job.id}><td><a href={`/jobs/${job.id}`}><code>{shortId(job.id)}</code></a></td><td>{username(job.ownerId)}</td><td>{job.moduleId}<small>{job.operation} · {job.workflow}</small></td><td>{job.toolConfigurations.map((entry) => entry.toolId).join(", ") || "—"}</td><td><StatusBadge status={job.status} /><small>{Math.round(job.progress * 100)}%</small></td><td>{formatDate(job.updatedAt)}</td><td><div className="admin-row-actions"><a href={`/jobs/${job.id}`}>Logs</a>{(job.status === "queued" || job.status === "running") ? <button disabled={busy === job.id} type="button" onClick={() => { void act(job.id, "cancel", () => cancelJob(job.id)); }}>Cancel</button> : null}{job.status === "running" ? <button disabled={busy === job.id} type="button" onClick={() => { void act(job.id, "interrupt", () => interruptAdminJob(job.id)); }}>Interrupt</button> : null}{TERMINAL.has(job.status) ? <button disabled={busy === job.id} type="button" onClick={() => { void act(job.id, "retry", () => retryJob(job.id)); }}>Retry</button> : null}<a href={diagnosticBundleUrl(job.id)}>Diagnostic</a>{TERMINAL.has(job.status) ? <button className="admin-danger" disabled={busy === job.id} type="button" onClick={() => { if (window.confirm("Delete this retained workspace? Result and audit records are not removed.")) void act(job.id, "workspace cleanup", () => cleanJobWorkspace(job.id)); }}>Clean workspace</button> : null}</div></td></tr>)}</tbody></table></div>
  </section>;
}
