/* ═══════════════════════════════════════════════════════════════════ */
/*  BenchmarkResultsExplorer — reusable results viewer                   */
/*                                                                        */
/*  Accepts a SpiceBenchmarkManifest (static or runtime) and renders      */
/*  Overview, Data Explorer, Plot Gallery, Verification Report, and      */
/*  Artifacts. Used by both Demo Results and live workflow results.       */
/*  (goal.md §10.1)                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, useCallback } from "react";
import { EmptyState } from "../../../components/EmptyState";
import type {
  AnalysisDomain,
  ComparisonMode,
  PlotAspectMode,
  DataArtifact,
} from "../../../data/SpiceBenchmarkTypes";
import { ANALYSIS_DOMAINS } from "../../../data/SpiceBenchmarkTypes";
import { BenchmarkOverview } from "./BenchmarkOverview";
import { VerificationReport } from "./VerificationReport";
import { ArtifactBrowser } from "./ArtifactBrowser";
import type { WorkflowSummary } from "../types";
import "../../../benchmark.css";

const BASE = import.meta.env.BASE_URL || "/";

const DOMAIN_LABELS: Record<AnalysisDomain, string> = {
  overview: "Overview", dc: "DC Analysis Summary", ac: "AC Analysis Summary",
  transient: "Transient Analysis Summary", noise: "Noise Analysis Summary",
};

/* ─── Keyword matching between plots and data ─── */
function matchScore(plotName: string, dataName: string): number {
  const pn = plotName.toLowerCase().replace(/_[a-f0-9]{8}/, "");
  const dn = dataName.toLowerCase();
  let score = 0;
  const keywords = [
    ["iv_characteristics", "iv_data"], ["kcl", "kcl"], ["temperature_analysis", "iv_data"],
    ["cv_characteristics", "cv_data"], ["cv_components", "cv_data"], ["cv_multifreq", "cv_data"],
    ["nqs_effects", "nqs_effects"], ["sparameter", "sparams"],
    ["charge_conservation", "charge_conservation"], ["total_charge", "tran_charge"],
    ["switching_response", "tran_switching"], ["switching_power", "tran_switching_power"],
    ["large_signal", "tran_large_signal"], ["delay_effect", "tran_delay"],
    ["power_dissipation", "tran_power"], ["energy_consumption", "tran_power"],
    ["quasi_static", "tran_quasi_static"], ["thermal_noise", "thermal_noise"],
    ["flicker_noise", "flicker_noise"], ["shot_noise", "shot_noise"],
    ["noise_components", "noise_components"], ["noise_vs_temperature", "noise_temp"],
  ];
  for (const [pk, dk] of keywords) {
    if (pn.includes(pk) && dn.includes(dk)) score += 10;
  }
  return score;
}

function plotLabel(name: string): { title: string; detail: string } {
  const n = name.toLowerCase();
  if (n.includes("iv_characteristics") || n.includes("iv_character"))
    return { title: "IV Characteristics", detail: "Id-Vd and Id-Vg curves across bias points" };
  if (n.includes("kcl_verification")) return { title: "KCL Verification", detail: "Sum of terminal currents across operating range" };
  if (n.includes("temperature_analysis")) return { title: "Temperature Analysis", detail: "DC characteristics at -40°C to 150°C" };
  if (n.includes("cv_characteristics") || n.includes("cv_character"))
    return { title: "Capacitance-Voltage", detail: "C-V curves across frequency and bias" };
  if (n.includes("cv_components")) return { title: "C-V Components", detail: "Cgg, Cgs, Cgd decomposition" };
  if (n.includes("cv_multifreq")) return { title: "Multi-Frequency C-V", detail: "C-V at multiple frequencies" };
  if (n.includes("nqs_effects") || n.includes("cv_nqs")) return { title: "Non-Quasi-Static Effects", detail: "Phase shift and frequency dependence" };
  if (n.includes("sparameter")) return { title: "S-Parameter Analysis", detail: "S11 and S21 vs frequency" };
  if (n.includes("charge_conservation")) return { title: "Charge Conservation", detail: "Total charge error verification" };
  if (n.includes("switching_response")) return { title: "Switching Response", detail: "Input pulse → output switching waveform" };
  if (n.includes("large_signal")) return { title: "Large-Signal Transient", detail: "Full-scale switching analysis" };
  if (n.includes("delay_effect")) return { title: "Delay Effect", detail: "Propagation delay through chain" };
  if (n.includes("power_dissipation")) return { title: "Power Dissipation", detail: "Dynamic and static power vs temperature" };
  if (n.includes("energy_consumption")) return { title: "Energy Consumption", detail: "Energy per switching event" };
  if (n.includes("thermal_noise_vds")) return { title: "Thermal Noise — Vds Comparison", detail: "Noise PSD at different Vds biases" };
  if (n.includes("thermal_noise")) return { title: "Thermal Noise", detail: "Noise power spectral density" };
  if (n.includes("flicker_noise")) return { title: "Flicker (1/f) Noise", detail: "Low-frequency noise characterization" };
  if (n.includes("shot_noise")) return { title: "Shot Noise", detail: "Current shot noise level and variation" };
  if (n.includes("noise_components")) return { title: "Noise Components", detail: "Thermal + Flicker + Shot decomposition" };
  if (n.includes("noise_vs_temperature")) return { title: "Noise vs Temperature", detail: "Noise PSD across -40°C to 150°C" };
  if (n.includes("total_charge")) return { title: "Total Charge", detail: "Integrated charge vs time" };
  const base = name.replace(/_[a-f0-9]{8}\.(png|svg)$/i, "").replace(/[_-]/g, " ");
  return { title: base, detail: "" };
}

/* ─── Data cache ─── */
const dataCache = new Map<string, Record<string, string>[]>();

function useLazyData(artifact: DataArtifact | null) {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!artifact) { setRows(null); return; }
    const url = artifact.fetchUrl;
    if (!url) { setRows(null); return; }
    const fullUrl = BASE + url;
    if (dataCache.has(fullUrl)) { setRows(dataCache.get(fullUrl)!); return; }
    let cancelled = false;
    const isJson = url.endsWith(".json");
    fetch(fullUrl).then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return isJson ? r.json() : r.text(); }).then(data => {
      if (cancelled) return;
      if (isJson) {
        const parsed = data as { columns: string[]; rows: string[][] };
        const records = parsed.rows.map(row => {
          const obj: Record<string, string> = {};
          parsed.columns.forEach((c, i) => obj[c] = String(row[i] ?? ""));
          return obj;
        });
        dataCache.set(fullUrl, records);
        setRows(records);
      } else {
        const text = data as string;
        const lines = text.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) { setRows([]); return; }
        const headers = lines[0].split(",").map((h: string) => h.trim());
        const records = lines.slice(1).map((l: string) => {
          const v = l.split(",");
          const obj: Record<string, string> = {};
          headers.forEach((h: string, i: number) => obj[h] = v[i]?.trim() ?? "");
          return obj;
        });
        dataCache.set(fullUrl, records);
        setRows(records);
      }
    }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [artifact?.fetchUrl]);
  return { rows, error };
}

/* ─── Dataset card ─── */
const PAGE_SIZE = 5;

function DatasetCard({ artifact, domain }: { artifact: DataArtifact; domain: AnalysisDomain }) {
  const cols = artifact.columns ?? [];
  const { rows, error } = useLazyData(artifact);
  const [tablePage, setTablePage] = useState(0);

  const displayRows = rows && rows.length > 0 ? rows : null;
  const totalPages = displayRows ? Math.ceil(displayRows.length / PAGE_SIZE) : 0;
  const pageRows = displayRows ? displayRows.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE) : null;

  const downloadCsv = () => {
    if (!rows) return;
    const csv = [cols.join(","), ...rows.map(r => cols.map(c => r[c] ?? "").join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${artifact.name}.csv`; a.click();
  };

  return (
    <div className="chart-card benchmark-dataset-card">
      <div className="benchmark-dataset-header">
        <span className="benchmark-domain-badge">{DOMAIN_LABELS[domain]}</span>
        <code>{artifact.name}</code>
        <span className="hint">{artifact.rowCount > 0 ? `${artifact.rowCount} rows` : ""} · {artifact.size} · <code>{artifact.hash}</code></span>
        {rows && rows.length > 0 && <button className="benchmark-btn" onClick={downloadCsv}>⬇ CSV ({rows.length} rows)</button>}
      </div>
      {error && <p className="hint benchmark-error">{error}</p>}
      {displayRows && displayRows.length > 0 && (
        <div className="benchmark-table-section">
          <div className="benchmark-table-header">
            <span>Data <span className="hint">({displayRows.length} rows)</span></span>
            <div className="benchmark-pagination">
              <button className="benchmark-btn" disabled={tablePage === 0} onClick={() => setTablePage(0)}>««</button>
              <button className="benchmark-btn" disabled={tablePage === 0} onClick={() => setTablePage(p => Math.max(0, p - 1))}>«</button>
              <span className="hint">Page {tablePage + 1}/{totalPages || 1}</span>
              <button className="benchmark-btn" disabled={tablePage >= totalPages - 1} onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))}>»</button>
              <button className="benchmark-btn" disabled={tablePage >= totalPages - 1} onClick={() => setTablePage(totalPages - 1)}>»»</button>
            </div>
          </div>
          <div className="analog-table-wrap benchmark-table-wrap">
            <table className="benchmark-table">
              <thead><tr>{cols.map((c, i) => <th key={`${i}-${c}`}>{c}</th>)}</tr></thead>
              <tbody>{pageRows?.map((r, i) => <tr key={i}>{cols.map((c, j) => <td key={`${j}-${c}`}>{r[c] ?? ""}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
      {rows === null && artifact.fetchUrl && !error && <EmptyState message="Loading data…" icon="⏳" />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Props                                                            */
/* ═══════════════════════════════════════════════════════════════ */

export interface BenchmarkResultsExplorerProps {
  manifest: import("../../../data/SpiceBenchmarkTypes").SpiceBenchmarkManifest;
  /** Optional workflow context for labeling */
  workflow?: WorkflowSummary;
  /** When true, hide controls and show fixed display */
  readonly?: boolean;
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Main Component                                                   */
/* ═══════════════════════════════════════════════════════════════ */

export function BenchmarkResultsExplorer({ manifest, workflow, readonly }: BenchmarkResultsExplorerProps) {
  const runIds = Object.keys(manifest.runs);

  const [runId, setRunId] = useState(runIds[0] ?? "");
  const [analysis, setAnalysis] = useState<AnalysisDomain>("overview");
  const [plotAspect, setPlotAspect] = useState<PlotAspectMode>("flexible");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const run = manifest.runs[runId];
  const hasCompareRuns = runIds.length >= 2;
  const [compareRunId, setCompareRunId] = useState(hasCompareRuns ? runIds[1] : "");
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("single");
  const compareRun = comparisonMode !== "single" && compareRunId ? manifest.runs[compareRunId] : null;

  // Build run↔model↔suite index
  const runByModelSuite = useMemo(() => {
    const idx: Record<string, Record<string, string>> = {};
    for (const rid of runIds) {
      const r = manifest.runs[rid];
      if (!idx[r.modelId]) idx[r.modelId] = {};
      idx[r.modelId][r.netlistSuite?.suiteId ?? ""] = rid;
    }
    return idx;
  }, [manifest]);

  const [selectedModelId, setSelectedModelId] = useState(run?.modelId ?? "");
  const [selectedSuiteId, setSelectedSuiteId] = useState(run?.netlistSuite?.suiteId ?? "");

  const onModelChange = useCallback((mid: string) => {
    setSelectedModelId(mid);
    const matchingRun = runByModelSuite[mid]?.[selectedSuiteId] ?? runByModelSuite[mid]?.[""] ?? Object.values(runByModelSuite[mid] ?? {})[0];
    if (matchingRun && manifest.runs[matchingRun]) setRunId(matchingRun);
  }, [runByModelSuite, selectedSuiteId, manifest]);
  const onSuiteChange = useCallback((sid: string) => {
    setSelectedSuiteId(sid);
    const matchingRun = runByModelSuite[selectedModelId]?.[sid] ?? runByModelSuite[selectedModelId]?.[""] ?? Object.values(runByModelSuite[selectedModelId] ?? {})[0];
    if (matchingRun && manifest.runs[matchingRun]) setRunId(matchingRun);
  }, [runByModelSuite, selectedModelId, manifest]);

  useEffect(() => { if (run) { setSelectedModelId(run.modelId); setSelectedSuiteId(run.netlistSuite?.suiteId ?? ""); } }, [runId]);

  if (!run) return <div className="chart-card"><EmptyState message="No benchmark data." icon="📭" /></div>;

  // Datasets filtered by analysis
  const datasets = useMemo(() => run.dataArtifacts.filter(d => analysis === "overview" || d.domain === analysis), [run, analysis]);

  // Dataset multi-select
  const [selectedDatasetNames, setSelectedDatasetNames] = useState<string[]>([]);
  useEffect(() => { setSelectedDatasetNames(datasets.map(d => d.name)); }, [analysis, runId]);

  const toggleAllDatasets = useCallback((on: boolean) => {
    setSelectedDatasetNames(on ? datasets.map(d => d.name) : []);
  }, [datasets]);
  const toggleDataset = useCallback((name: string) => {
    setSelectedDatasetNames(prev => {
      const idx = prev.indexOf(name);
      if (idx >= 0) { const next = [...prev]; next.splice(idx, 1); return next; }
      return [...prev, name];
    });
  }, []);

  const visibleDatasets = useMemo(() => {
    const sel = new Set(selectedDatasetNames);
    return datasets.filter(d => sel.has(d.name));
  }, [datasets, selectedDatasetNames]);

  const availableDomains = useMemo(() => {
    const set = new Set<AnalysisDomain>();
    for (const d of run.dataArtifacts) set.add(d.domain);
    return ANALYSIS_DOMAINS.filter(d => d === "overview" || set.has(d));
  }, [run]);

  return (
    <div className="benchmark-page">
      {lightbox && (
        <div className="benchmark-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
          <a href={lightbox} download className="benchmark-btn benchmark-lightbox-dl">Download</a>
        </div>
      )}

      {/* ─── Controls (hidden in readonly mode) ─── */}
      {!readonly && (
        <div className="chart-card benchmark-controls">
          <h2>Explore benchmark results</h2>
          {workflow && <p className="hint">Workflow: <code>{workflow.workflowId}</code> · Status: <span className={`tr-badge tr-badge--${workflow.status}`}>{workflow.status}</span></p>}
          <div className="benchmark-controls-grid">
            <label className="axis-picker">Run<select value={runId} onChange={e => setRunId(e.target.value)}>{runIds.map(rid => <option key={rid} value={rid}>{rid}</option>)}</select></label>
            <label className="axis-picker">Model<select value={selectedModelId} onChange={e => onModelChange(e.target.value)}>
              <optgroup label="Completed runs">{manifest.modelIds.map(mid => <option key={mid} value={mid}>{mid}</option>)}</optgroup>
            </select></label>
            <label className="axis-picker">Simulator<select value={run.modelFormat} onChange={e => {
              const matching = Object.values(manifest.runs).find(r => r.modelFormat === e.target.value);
              if (matching) setRunId(matching.runId);
            }}>
              {manifest.modelFormats.map(f => {
                const runsForF = Object.values(manifest.runs).filter(r => r.modelFormat === f);
                const r0 = runsForF[0];
                return <option key={f} value={f} disabled={!r0}>{f}{r0 ? ` (${r0.simulator} v${r0.simulatorVersion})` : " — no results"}</option>;
              })}
            </select></label>
            <label className="axis-picker">Netlist Suite<select value={selectedSuiteId} onChange={e => onSuiteChange(e.target.value)}>{manifest.suiteIds.map(sid => <option key={sid} value={sid}>{sid}</option>)}</select></label>
            <label className="axis-picker">Analysis<select value={analysis} onChange={e => setAnalysis(e.target.value as AnalysisDomain)}>{availableDomains.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}</select></label>
            <label className="axis-picker">Plot aspect<select value={plotAspect} onChange={e => setPlotAspect(e.target.value as PlotAspectMode)}>{["flexible", "16:9", "4:3", "1:1"].map(a => <option key={a}>{a}</option>)}</select></label>
          </div>
          {hasCompareRuns && (
            <div className="benchmark-controls-grid" style={{ marginTop: "0.5rem" }}>
              <label className="axis-picker">Comparison<select value={comparisonMode} onChange={e => setComparisonMode(e.target.value as ComparisonMode)}>{["single", "compare_models", "compare_suites"].map(m => <option key={m} value={m}>{m}</option>)}</select></label>
              {comparisonMode !== "single" && <label className="axis-picker">Compare Run<select value={compareRunId} onChange={e => setCompareRunId(e.target.value)}>{runIds.filter(rid => rid !== runId).map(rid => <option key={rid} value={rid}>{rid}</option>)}</select></label>}
            </div>
          )}
          {/* Datasets multi-select */}
          {datasets.length > 0 && (
            <div className="benchmark-series" style={{ marginTop: "0.5rem", display: "block" }}>
              <div style={{ fontWeight: 600, fontSize: "0.78rem", marginBottom: "0.25rem" }}>Datasets to include:</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                <button className="benchmark-btn" onClick={() => toggleAllDatasets(true)}>Select all</button>
                <button className="benchmark-btn" onClick={() => toggleAllDatasets(false)}>Unselect all</button>
              </div>
              {(["dc", "ac", "transient", "noise", "overview"] as AnalysisDomain[]).map(dom => {
                const domDatasets = datasets.filter(d => d.domain === dom);
                if (domDatasets.length === 0) return null;
                return (
                  <div key={dom} style={{ marginBottom: "0.3rem" }}>
                    <div className="hint" style={{ fontWeight: 600, fontSize: "0.7rem", marginBottom: "0.15rem", color: "var(--muted)" }}>{DOMAIN_LABELS[dom]}</div>
                    <div className="benchmark-series-checkboxes">
                      {domDatasets.map(d => (
                        <label key={d.name} className="benchmark-series-item">
                          <input type="checkbox" checked={visibleDatasets.some(v => v.name === d.name)} onChange={() => toggleDataset(d.name)} />
                          {d.name} <span className="hint">({d.rowCount > 0 ? d.rowCount : "?"})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Readonly header ─── */}
      {readonly && workflow && (
        <div className="chart-card">
          <p className="hint">Workflow <code>{workflow.workflowId}</code> — Status: <span className={`tr-badge tr-badge--${workflow.status}`}>{workflow.status}</span></p>
        </div>
      )}

      {/* ─── Summary ─── */}
      <VerificationReport run={run} />

      {/* ─── Overview ─── */}
      <BenchmarkOverview run={run} />

      {/* ─── Simulator Comparison ─── */}
      {manifest.modelFormats.length > 1 && (
        <div className="chart-card benchmark-section">
          <h2>Cross-Simulator Comparison</h2>
          <p className="hint">Per-mode comparison across simulators.</p>
          <div className="tr-table-wrap" style={{ marginBottom: "0.75rem" }}>
            <table className="benchmark-table">
              <thead><tr><th>Mode</th>{manifest.modelFormats.map(f => <th key={f}>{f}</th>)}<th>Winner</th></tr></thead>
              <tbody>
                {["DC", "AC", "Transient", "Noise"].map(mode => {
                  const modeLower = mode.toLowerCase();
                  const rows = Object.values(manifest.runs).map(r => {
                    const dc = r.dataArtifacts.filter(a => a.domain === modeLower).length;
                    return { sim: r.modelFormat || r.simulator, count: dc };
                  });
                  const best = rows.reduce((a, b) => (a.count > b.count ? a : b), { sim: "", count: 0 });
                  return (
                    <tr key={mode}>
                      <td><strong>{mode}</strong></td>
                      {manifest.modelFormats.map(f => {
                        const e = rows.find(x => x.sim === f);
                        return <td key={f} style={{ textAlign: "center" }}>
                          {e && e.count > 0 ? <span style={{ color: "var(--ok)" }}>✓ {e.count} datasets</span> : <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>;
                      })}
                      <td style={{ textAlign: "center" }}>{best.count > 0 ? <span className="tr-badge tr-badge--completed">{best.sim}</span> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Artifacts ─── */}
      <ArtifactBrowser run={run} />

      {/* ─── Interleaved Data + Plots by Domain ─── */}
      {(["dc", "ac", "transient", "noise"] as AnalysisDomain[]).map(domain => {
        const domainDatasets = datasets.filter(d => d.domain === domain);
        const domainPlots = run.plotArtifacts.filter(p => p.domain === domain);
        if (domainDatasets.length === 0 && domainPlots.length === 0) return null;

        const plotDataPairs = domainPlots.filter(p => p.displayUrl).map(p => {
          const best = domainDatasets
            .map(d => ({ dataset: d, score: matchScore(p.name, d.name) }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score);
          return { plot: p, datasets: best.map(x => x.dataset) };
        });

        const matchedNames = new Set(plotDataPairs.flatMap(p => p.datasets.map(d => d.name)));
        const unmatchedDatasets = domainDatasets.filter(d => !matchedNames.has(d.name));

        return (
          <div key={domain} className="benchmark-section">
            <h2 className="benchmark-section-heading">{DOMAIN_LABELS[domain]}</h2>
            {plotDataPairs.map(({ plot, datasets: pairDatasets }) => {
              const label = plotLabel(plot.name);
              const visiblePairDatasets = pairDatasets.filter(d => visibleDatasets.some(v => v.name === d.name));
              return (
                <div key={plot.relPath} className="chart-card">
                  <h3 className="flow-subsection-title">{label.title}</h3>
                  {label.detail && <p className="hint" style={{ marginBottom: "0.5rem" }}>{label.detail}</p>}
                  <div className="benchmark-plot-card" onClick={() => setLightbox(BASE + plot.displayUrl!)} style={{ marginBottom: "0.75rem" }}>
                    <div className="benchmark-plot-img-wrap"><img src={BASE + plot.displayUrl!} alt={label.title} loading="lazy" style={{ width: "100%" }} /></div>
                  </div>
                  {visiblePairDatasets.length > 0 ? visiblePairDatasets.map(d => (
                    <DatasetCard key={d.relPath} artifact={d} domain={d.domain} />
                  )) : <EmptyState message="Dataset not selected" icon="📊" />}
                </div>
              );
            })}
            {unmatchedDatasets.filter(d => visibleDatasets.some(v => v.name === d.name)).map(d => (
              <div key={d.relPath} className="chart-card">
                <p className="hint" style={{ marginBottom: "0.25rem" }}>📄 {d.name} — no matching plot</p>
                <DatasetCard artifact={d} domain={d.domain} />
              </div>
            ))}
          </div>
        );
      })}

      {/* ─── Overview datasets ─── */}
      {analysis === "overview" && visibleDatasets.length > 0 && (
        <div className="benchmark-section">
          <h2 className="benchmark-section-heading">Overview Datasets ({visibleDatasets.length}/{datasets.length})</h2>
          {visibleDatasets.map(d => <DatasetCard key={d.relPath} artifact={d} domain={d.domain} />)}
        </div>
      )}

      {/* ─── Compare run overlay ─── */}
      {compareRun && comparisonMode !== "single" && (
        <div className="chart-card benchmark-section" id="bm-compare">
          <h2>Compare: {compareRun.runId}</h2>
          <BenchmarkOverview run={compareRun} />
        </div>
      )}
    </div>
  );
}
