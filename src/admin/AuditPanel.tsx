import { useEffect, useMemo, useState } from "react";
import type { AuditLogV1 } from "../../shared/contracts/v1";
import { listAuditLogs } from "../api/admin";
import { formatDate, formatJson, shortId } from "../jobs";
import { AdminNotice } from "./AdminNotice";

export function AuditPanel(): JSX.Element {
  const [logs, setLogs] = useState<AuditLogV1[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void listAuditLogs(500).then(setLogs).catch((requestError) => setError(requestError instanceof Error ? requestError.message : String(requestError))); }, []);
  const visible = useMemo(() => { const needle = search.toLowerCase(); return logs.filter((entry) => !needle || entry.action.toLowerCase().includes(needle) || entry.targetType.toLowerCase().includes(needle) || entry.targetId?.toLowerCase().includes(needle) || entry.actorUserId?.toLowerCase().includes(needle)); }, [logs, search]);
  return <section className="admin-section"><header><div><h2>Audit</h2><p>Append-only security and administrator action history.</p></div><input aria-label="Search audit log" placeholder="Search action, target, or actor" value={search} onChange={(event) => setSearch(event.target.value)} /></header><AdminNotice error={error} /><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th><th>Client</th><th>Details</th></tr></thead><tbody>{visible.map((entry) => <tr key={entry.id}><td>{formatDate(entry.at)}</td><td><strong>{entry.action}</strong></td><td><code title={entry.actorUserId || "system"}>{entry.actorUserId ? shortId(entry.actorUserId) : "system"}</code></td><td>{entry.targetType}<small><code title={entry.targetId || ""}>{entry.targetId ? shortId(entry.targetId) : "—"}</code></small></td><td>{entry.ipAddress || "—"}<small title={entry.userAgent || ""}>{entry.userAgent ? `${entry.userAgent.slice(0, 52)}${entry.userAgent.length > 52 ? "…" : ""}` : "—"}</small></td><td><details><summary>JSON</summary><pre>{formatJson(entry.details)}</pre></details></td></tr>)}</tbody></table></div></section>;
}

