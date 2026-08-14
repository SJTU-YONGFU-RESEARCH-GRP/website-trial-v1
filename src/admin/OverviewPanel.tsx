import { useEffect, useState } from "react";
import type { ModuleId } from "../../shared/contracts/v1";
import { getAdminOverview, type AdminOverviewV1 } from "../api/admin";
import { formatBytes, formatDate, JobTable, StatusBadge } from "../jobs";
import { AdminNotice } from "./AdminNotice";

const MODULES: ModuleId[] = ["benchmark", "digital", "ppa"];

export function OverviewPanel(): JSX.Element {
  const [overview, setOverview] = useState<AdminOverviewV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getAdminOverview()
      .then((next) => { setOverview(next); setError(null); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : String(requestError)));
  }, []);
  const jobStatus = overview?.jobStatus || {};
  return <section className="admin-section"><header><div><h2>Overview</h2><p>Current persisted state across users, independent queues, tools, and storage.</p></div><span>Updated {formatDate(new Date().toISOString())}</span></header><AdminNotice error={error} />
    <div className="admin-metric-grid"><Metric label="Users" value={String(overview?.userCount ?? 0)} detail="non-deleted accounts" /><Metric label="Queued" value={String(jobStatus.queued ?? 0)} detail="waiting for worker" /><Metric label="Running" value={String(jobStatus.running ?? 0)} detail="active processes" /><Metric label="Failed" value={String(jobStatus.failed ?? 0)} detail="retained for diagnosis" tone={jobStatus.failed ? "bad" : undefined} /><Metric label="Succeeded" value={String(jobStatus.succeeded ?? 0)} detail="completed jobs" /><Metric label="Storage" value={formatBytes(overview?.storage.totalBytes ?? 0)} detail={`${overview?.storage.fileCount ?? 0} retained files`} /></div>
    <div className="admin-overview-grid"><article className="admin-card"><h3>Module queues & results</h3>{MODULES.map((moduleId) => { const queue = overview?.moduleQueues[moduleId] || { queued: 0, running: 0 }; return <div className="admin-queue-row" key={moduleId}><strong>{moduleId}</strong><span>{queue.queued} queued</span><span>{queue.running} running</span><span>{overview?.resultCounts[moduleId] ?? 0} results</span></div>; })}</article>
      <article className="admin-card"><h3>Tool health</h3>{overview?.tools.length ? overview.tools.map((tool) => <div className="admin-health-row" key={tool.id}><div><strong>{tool.toolId}</strong><small>{tool.moduleId} · {tool.health?.version || "version unavailable"}</small></div><StatusBadge status={tool.health?.status || (tool.enabled ? "not_configured" : "unavailable")} /></div>) : <p>No tool configurations.</p>}</article></div>
    <article className="admin-card"><h3>Storage by area</h3>{Object.entries(overview?.storage.byArea || {}).map(([area, bytes]) => <div className="admin-queue-row" key={area}><strong>{area}</strong><span>{formatBytes(bytes)}</span></div>)}</article>
    <article className="admin-card"><h3>Recent failed or interrupted jobs</h3><JobTable jobs={overview?.recentFailures || []} showOwner /></article>
  </section>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "bad" }): JSX.Element {
  return <article className={`admin-metric ${tone ? `admin-metric--${tone}` : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
