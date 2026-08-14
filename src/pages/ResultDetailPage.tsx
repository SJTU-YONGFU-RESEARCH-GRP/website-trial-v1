import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ModuleId, ResultRecordV1 } from "../../shared/contracts/v1";
import { apiRequest } from "../api/client";

export function ResultDetailPage(): JSX.Element {
  const { module, resultId } = useParams();
  const moduleId = (["benchmark", "digital", "ppa"] as string[]).includes(module ?? "") ? module as ModuleId : null;
  const [result, setResult] = useState<ResultRecordV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!moduleId || !resultId) { setError("Invalid result route."); return; }
    let active = true;
    void apiRequest<ResultRecordV1>(`/results/${moduleId}/${encodeURIComponent(resultId)}`).then((response) => { if (active) setResult(response.data); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, [moduleId, resultId]);
  if (error) return <section className="chart-card"><h2>Result unavailable</h2><p className="hint">{error}</p><Link to={moduleId === "digital" ? "/plotly" : `/${moduleId ?? ""}`}>Back</Link></section>;
  if (!result) return <section className="chart-card"><p className="hint">Loading result…</p></section>;
  return <div className="result-detail-page">
    <section className="chart-card result-detail-hero"><div><span className="result-detail-eyebrow">{result.moduleId} result · {result.lifecycle}</span><h2>{result.title}</h2><p>{result.provenance.origin} · {new Date(result.createdAt).toLocaleString()}</p></div><Link to={result.moduleId === "digital" ? "/plotly" : `/${result.moduleId}`}>Back to {result.moduleId}</Link></section>
    <section className="chart-card"><h2>Summary</h2><JsonTable value={result.summary} /></section>
    <section className="chart-card"><h2>Provenance</h2><JsonTable value={result.provenance as unknown as Record<string, unknown>} /></section>
    <section className="chart-card"><h2>Normalized result</h2><pre className="result-detail-json">{JSON.stringify(result.data, null, 2)}</pre></section>
    {result.artifactIds.length ? <section className="chart-card"><h2>Artifacts</h2><div className="result-detail-artifacts">{result.artifactIds.map((id) => <a key={id} href={`/api/artifacts/${encodeURIComponent(id)}/download`}>{id}</a>)}</div></section> : null}
  </div>;
}

function JsonTable({ value }: { value: Record<string, unknown> }): JSX.Element {
  return <dl className="result-detail-table">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key}</dt><dd>{item !== null && typeof item === "object" ? <code>{JSON.stringify(item)}</code> : String(item ?? "—")}</dd></div>)}</dl>;
}
