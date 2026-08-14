import { useCallback, useEffect, useState } from "react";
import type { ModuleId, ResultLifecycle, ResultRecordV1, UserRecordV1 } from "../../shared/contracts/v1";
import { useSearchParams } from "react-router-dom";
import { listAdminResults, listAdminUsers, updateResultLifecycle } from "../api/admin";
import { formatDate, formatJson, shortId, StatusBadge } from "../jobs";
import { AdminNotice } from "./AdminNotice";

const MODULES: Array<ModuleId | ""> = ["", "benchmark", "digital", "ppa"];
const LIFECYCLES: Array<ResultLifecycle | ""> = ["", "private", "published", "unpublished", "deleted"];

export function ResultsPanel(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<ResultRecordV1[]>([]);
  const [users, setUsers] = useState<UserRecordV1[]>([]);
  const [moduleId, setModuleId] = useState<ModuleId | "">("");
  const [lifecycle, setLifecycle] = useState<ResultLifecycle | "">("");
  const [ownerId, setOwnerId] = useState(searchParams.get("ownerId") || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [nextResults, nextUsers] = await Promise.all([listAdminResults({ moduleId: moduleId || undefined, lifecycle: lifecycle || undefined, ownerId: ownerId || undefined, limit: 200 }), listAdminUsers()]);
      setResults(nextResults); setUsers(nextUsers); setError(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
  }, [lifecycle, moduleId, ownerId]);
  useEffect(() => { void load(); }, [load]);
  async function transition(result: ResultRecordV1, next: ResultLifecycle): Promise<void> {
    setBusy(result.id); setError(null); setMessage(null);
    try { await updateResultLifecycle(result.moduleId, result.id, next); setMessage(`${result.title} is now ${next}.`); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(null); }
  }
  const visible = results;
  return <section className="admin-section"><header><div><h2>Results</h2><p>Control visibility without rewriting immutable data or provenance.</p></div></header><AdminNotice error={error} message={message} /><div className="admin-filters"><label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value as ModuleId | "")}>{MODULES.map((value) => <option value={value} key={value || "all"}>{value || "All modules"}</option>)}</select></label><label>Lifecycle<select value={lifecycle} onChange={(event) => setLifecycle(event.target.value as ResultLifecycle | "")}>{LIFECYCLES.map((value) => <option value={value} key={value || "all"}>{value || "All states"}</option>)}</select></label><label>Owner<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}><option value="">All users</option>{users.map((user) => <option value={user.id} key={user.id}>{user.username}</option>)}</select></label><span>{visible.length} results</span></div>
    <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Result</th><th>Module</th><th>Lifecycle</th><th>Provenance</th><th>Tools</th><th>Artifacts</th><th>Created</th><th>Actions</th></tr></thead><tbody>{visible.map((result) => <tr key={`${result.moduleId}:${result.id}`}><td><strong>{result.title}</strong><code title={result.id}>{shortId(result.id)}</code><a href={`/results/${result.moduleId}/${result.id}`}>Open result</a></td><td>{result.moduleId}</td><td><StatusBadge status={result.lifecycle} /></td><td>{result.provenance.origin}<small>parser {result.provenance.parserId} {result.provenance.parserVersion}</small><details><summary>Input hash & parameters</summary><code>{result.provenance.inputManifestSha256}</code><pre>{formatJson(result.provenance.parameters)}</pre></details></td><td><pre>{formatJson(result.provenance.toolVersions)}</pre></td><td>{result.artifactIds.length ? result.artifactIds.map((artifactId, index) => <a href={`/api/artifacts/${encodeURIComponent(artifactId)}/download`} key={artifactId}>Artifact {index + 1}</a>) : "—"}</td><td>{formatDate(result.createdAt)}</td><td><div className="admin-row-actions"><button type="button" disabled={busy === result.id || result.lifecycle === "published"} onClick={() => { void transition(result, "published"); }}>Publish</button><button type="button" disabled={busy === result.id || result.lifecycle === "unpublished"} onClick={() => { void transition(result, "unpublished"); }}>Unpublish</button><button className="admin-danger" type="button" disabled={busy === result.id || result.lifecycle === "deleted"} onClick={() => { if (window.confirm("Mark this result deleted? Its audit trail remains.")) void transition(result, "deleted"); }}>Delete</button></div></td></tr>)}</tbody></table></div>
  </section>;
}
