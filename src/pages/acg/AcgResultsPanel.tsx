import { useEffect, useMemo, useRef, useState } from "react";
import type { ResultRecordV1 } from "../../../shared/contracts/v1";
import { getAcgResearchSources, listAcgResults } from "../../api/acg/client";
import { useAuth } from "../../auth/AuthContext";
import { resultForFinishedJob } from "./unifiedHelpers";
import { AcgResultSelector, toggleAcgResult } from "./AcgResultSelector";
import { AcgResultComparison } from "./AcgResultComparison";
import { AcgFullResultsComparison } from "./AcgFullResultsComparison";
import { acgBaselineId, retainAcgResults } from "./comparison";

export function AcgResultsPanel({ revision, finishedJob }: { revision: number; finishedJob?: import("../../../shared/contracts/v1").JobRecordV1 | null }): JSX.Element {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultRecordV1[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preferredBaseline, setPreferredBaseline] = useState<string | null>(null);
  const [executionOwnerId, setExecutionOwnerId] = useState<string | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusResultId, setFocusResultId] = useState<string | null>(null);
  const locatedJobId = useRef<string | null>(null);
  useEffect(() => {
    let active = true; setExecutionOwnerId(undefined);
    void getAcgResearchSources().then(value => { if (active) setExecutionOwnerId(value.ownerId); }).catch(() => {});
    return () => { active = false; };
  }, [user?.id, revision]);
  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    void listAcgResults().then(items => {
      if (!active) return;
      setResults(items);
      const completed = finishedJob && locatedJobId.current !== finishedJob.id ? resultForFinishedJob(items, finishedJob) : undefined;
      setSelectedIds(ids => retainAcgResults(ids, items, completed?.id));
      if (completed && finishedJob) { locatedJobId.current = finishedJob.id; setFocusResultId(completed.id); }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision, refresh, finishedJob]);
  const selected = useMemo(() => selectedIds.flatMap(id => { const result = results.find(row => row.id === id); return result ? [result] : []; }), [results, selectedIds]);
  const baselineId = acgBaselineId(selected.map(result => result.id), preferredBaseline);
  // If the baseline disappears, reset to selection order; reselecting it must not revive an old preference.
  useEffect(() => { if (preferredBaseline && !selectedIds.includes(preferredBaseline)) setPreferredBaseline(null); }, [selectedIds, preferredBaseline]);
  return <>
    <section className="chart-card acg-history"><header className="acg-heading"><div><span className="digital-eyebrow">Results</span><h2>AutoCellGen run history</h2><p>Select exact runs to compare side by side. Compare every selected result’s cells, layouts, evidence and downloads below.</p></div><div className="workflow-file-actions"><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? "Refreshing…" : "Refresh results"}</button></div></header>
      {error ? <p className="acg-notice is-error" role="alert">Results unavailable: {error}</p> : null}
      {loading ? <p role="status">Loading results…</p> : null}
      {!loading && !results.length && !error ? <p className="acg-empty">No completed ACG results yet. Configure inputs and start a workflow from Input.</p> : null}
      {results.length ? <AcgResultSelector results={results} selectedIds={selectedIds} onToggle={id => { setSelectedIds(ids => toggleAcgResult(ids, id)); setFocusResultId(null); }} onClear={() => { setSelectedIds([]); setPreferredBaseline(null); setFocusResultId(null); }} /> : null}
      {results.length && !selected.length ? <p className="acg-empty">Select results to compare their metrics, cells and layout.</p> : null}
    </section>
    {selected.length ? <AcgResultComparison results={selected} baselineId={baselineId} onBaseline={setPreferredBaseline} /> : null}
    {selected.length ? <AcgFullResultsComparison results={selected} revision={revision} refresh={refresh} canInspectJob={result => user?.role === "admin" || Boolean((user?.id ?? executionOwnerId) && result.ownerId === (user?.id ?? executionOwnerId))} focusResultId={focusResultId} onFocused={() => setFocusResultId(null)} /> : null}
  </>;
}
