import { useCallback, useEffect, useMemo, useState } from "react";
import { listPpaResults } from "../api/ppa";
import { dynamicPpaRuns } from "../api/ppa/results";
import { loadPpaRunIndex } from "../data/ppaDataLoader";
import type { PpaRunIndex } from "../data/ppaTypes";
import { PpaCharts } from "./ppa/PpaCharts";
import { PpaNormalizedComparison } from "./ppa/PpaNormalizedComparison";
import { PpaReportDetail } from "./ppa/PpaReportDetail";
import { PpaRunSelector } from "./ppa/PpaRunSelector";
import { PpaSummary } from "./ppa/PpaSummary";
import { PpaTrendExplorer } from "./ppa/PpaTrendExplorer";
import { PpaWorkflowPanel } from "./ppa/PpaWorkflowPanel";
import "../ppa.css";

function number(value: number | null, options?: Intl.NumberFormatOptions): string {
  return value === null ? "N/A" : value.toLocaleString(undefined, options);
}

export function PpaPage(): JSX.Element {
  const [index, setIndex] = useState<PpaRunIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [filteredRuns, setFilteredRuns] = useState<readonly PpaRunIndex["runs"][number][]>([]);
  const [dynamicLoadWarning, setDynamicLoadWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([loadPpaRunIndex(), listPpaResults()])
      .then(([legacyResult, dynamicResult]) => {
        if (cancelled) return;
        if (legacyResult.status === "rejected") throw legacyResult.reason;
        const dynamicRuns = dynamicResult.status === "fulfilled" ? dynamicPpaRuns(dynamicResult.value) : [];
        const known = new Set(legacyResult.value.runs.map((run) => run.uid));
        const merged = [...legacyResult.value.runs, ...dynamicRuns.filter((run) => !known.has(run.uid))];
        const value = { ...legacyResult.value, runs: merged, runCount: merged.length, flows: [...new Set(merged.map((run) => run.flow))], pdks: [...new Set(merged.map((run) => run.pdk))], designs: [...new Set(merged.map((run) => run.design))] };
        setIndex(value); setFilteredRuns(value.runs);
        setDynamicLoadWarning(dynamicResult.status === "rejected" ? "Dynamic PPA results are temporarily unavailable; bundled legacy results remain visible." : null);
        setSelectedUids([]);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { cancelled = true; };
  }, []);

  const selectedRuns = useMemo(() => {
    if (!index) return [];
    const byUid = new Map(index.runs.map((run) => [run.uid, run]));
    return selectedUids.flatMap((uid) => {
      const run = byUid.get(uid);
      return run ? [run] : [];
    });
  }, [index, selectedUids]);
  const activeRun = activeUid && index ? index.runs.find((run) => run.uid === activeUid) ?? null : null;

  useEffect(() => {
    if (activeUid && !selectedUids.includes(activeUid)) setActiveUid(null);
  }, [activeUid, selectedUids]);

  const inspectTrendRun = useCallback((uid: string) => {
    setSelectedUids((previous) => previous.includes(uid) ? previous : [...previous, uid]);
    setActiveUid(uid);
    window.setTimeout(() => document.getElementById("ppa-report-detail")?.scrollIntoView({ behavior: "smooth" }), 0);
  }, []);
  const handleFilteredRuns = useCallback((runs: readonly PpaRunIndex["runs"][number][]) => setFilteredRuns(runs), []);
  const uploadCard = <PpaWorkflowPanel />;

  if (error) {
    return (
      <div className="ppa-page">
        {uploadCard}
        <div className="chart-card ppa-error"><h2>PPA data error</h2><p>{error}</p></div>
      </div>
    );
  }
  if (!index) {
    return (
      <div className="ppa-page">
        {uploadCard}
        <div className="chart-card ppa-loading">Loading three-backend final-run AST index…</div>
      </div>
    );
  }

  return (
    <div className="ppa-page">
      {uploadCard}
      {dynamicLoadWarning ? <p className="digital-callout digital-callout--warning">{dynamicLoadWarning}</p> : null}
      <section className="chart-card ppa-hero">
        <div>
          <span className="ppa-eyebrow">OpenROAD + OpenLane + LibreLane · final-run AST evidence</span>
          <h2>PPA Evidence Explorer</h2>
          <p className="hint">
            Content-addressed final-run reports with one normalized metric contract. JSON remains lossless for
            OpenROAD and LibreLane; OpenLane uses a source-located CSV AST plus final DEF and native STA reports.
          </p>
        </div>
        <dl className="ppa-dataset-meta">
          <div><dt>Index</dt><dd>{index.runCount} reports</dd></div>
          <div><dt>Generated from source state</dt><dd>{new Date(index.generatedAt).toLocaleString()}</dd></div>
          <div><dt>Parser</dt><dd><code>{index.parser}</code></dd></div>
        </dl>
      </section>

      <section className="chart-card">
        <h2>Report scope</h2>
        <p className="hint">
          First narrow candidates by input variables inferred from the report manifests, then check the exact
          reports used by KPIs, plots, the full normalized-entry comparison, and the summary table. A new tool,
          RC scale, PVT corner, or source revision appears here automatically when it first occurs in the data.
        </p>
        <PpaRunSelector
          runs={index.runs}
          selectedUids={selectedUids}
          onChange={setSelectedUids}
          onFilteredRunsChange={handleFilteredRuns}
        />
      </section>

      <PpaTrendExplorer runs={filteredRuns} onInspectRun={inspectTrendRun} />
      <PpaSummary runs={selectedRuns} />
      <PpaNormalizedComparison runs={selectedRuns} />
      <PpaCharts runs={selectedRuns} />

      <section className="chart-card">
        <h2>Selected report summary</h2>
        <p className="hint">
          Reference timing uses each run's nominal/typical comparison corner; “worst” is the minimum slack across
          every retained corner. N/A means the final run did not retain that evidence.
        </p>
        <div className="ppa-table-scroll">
          <table className="ppa-table ppa-run-table">
            <thead>
              <tr>
                <th>UID / run</th>
                <th>Flow / technology</th>
                <th>Final AST</th>
                <th>Area</th>
                <th>Logic cells</th>
                <th>Power</th>
                <th>Reference / worst slack</th>
                <th>Routing</th>
                <th>Checks</th>
                <th>AST coverage</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {selectedRuns.map((run) => (
                <tr key={run.uid} className={activeUid === run.uid ? "is-active" : ""}>
                  <td>
                    <code>{run.uid}</code>
                    <small>{run.design}{run.variant ? ` · ${run.variant}` : ""}</small>
                  </td>
                  <td>
                    <strong>{run.flow}</strong>
                    <small>{run.pdk}{run.scl ? ` · ${run.scl}` : ""}</small>
                  </td>
                  <td>
                    {run.ast.format.toUpperCase()}
                    <small>{run.scope}</small>
                  </td>
                  <td>
                    {number(run.summary.areaUm2, { maximumFractionDigits: 2 })}
                    <small>die µm² · core {number(run.summary.coreAreaUm2, { maximumFractionDigits: 1 })}</small>
                    <small>util {number(run.summary.utilization === null ? null : run.summary.utilization * 100, { maximumFractionDigits: 2 })}%</small>
                  </td>
                  <td>{number(run.summary.instances)}<small>logical / non-physical</small></td>
                  <td>
                    {number(run.summary.totalPowerMw, { maximumSignificantDigits: 6 })}<small>mW</small>
                    {!run.summary.powerComparisonValid
                      ? <small title={run.summary.powerComparisonReason ?? undefined}>cross-run comparison unavailable</small>
                      : null}
                  </td>
                  <td>
                    {number(run.summary.setupSlackNs, { maximumSignificantDigits: 6 })} / {number(run.summary.holdSlackNs, { maximumSignificantDigits: 6 })}
                    <small>reference ns · {run.summary.referenceCorner ?? "N/A"}</small>
                    <small>worst {number(run.summary.worstSetupSlackNs, { maximumSignificantDigits: 6 })} / {number(run.summary.worstHoldSlackNs, { maximumSignificantDigits: 6 })} ns</small>
                  </td>
                  <td>
                    {number(run.summary.wirelengthUm, { maximumFractionDigits: 0 })}
                    <small>µm wire · {number(run.summary.vias)} vias</small>
                  </td>
                  <td>
                    route {number(run.summary.routeDrcErrors)} · Magic {number(run.summary.magicDrcErrors)}
                    <small>cap/fanout {number(run.summary.maxCapViolations)} / {number(run.summary.maxFanoutViolations)}</small>
                  </td>
                  <td>
                    {run.ast.nodeCount.toLocaleString()} nodes
                    <small>{run.ast.rootKind} · depth {run.ast.maxDepth}</small>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ppa-inspect-button"
                      onClick={() => {
                        setActiveUid(run.uid);
                        window.setTimeout(() => document.getElementById("ppa-report-detail")?.scrollIntoView({ behavior: "smooth" }), 0);
                      }}
                    >
                      Inspect AST
                    </button>
                  </td>
                </tr>
              ))}
              {selectedRuns.length === 0 ? (
                <tr><td colSpan={11} className="ppa-empty">Select at least one AST report above.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {activeRun ? <PpaReportDetail run={activeRun} onClose={() => setActiveUid(null)} /> : null}
    </div>
  );
}
