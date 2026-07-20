import { useEffect, useMemo, useState, useCallback } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { usePlotlyChart } from "../hooks/usePlotlyChart";
import { SPICE_BENCHMARK_MANIFEST } from "../data/generatedSpiceBenchmarkManifest";
import type {
  BenchmarkRun, AnalysisDomain, ComparisonMode,
  PlotAspectMode, DataArtifact,
} from "../data/SpiceBenchmarkTypes";
import { ANALYSIS_DOMAINS } from "../data/SpiceBenchmarkTypes";
import { EmptyState } from "./flow/EmptyState";
import "../benchmark.css";

const BASE = import.meta.env.BASE_URL || "/";

const DOMAIN_LABELS: Record<AnalysisDomain, string> = { overview: "Overview", dc: "DC Analysis Summary", ac: "AC Analysis Summary", transient: "Transient Analysis Summary", noise: "Noise Analysis Summary" };

/** Match a data filename to a plot by keyword overlap. Returns scores (higher = better match). */
function matchScore(plotName: string, dataName: string): number {
  const pn = plotName.toLowerCase().replace(/_[a-f0-9]{8}/, "");
  const dn = dataName.toLowerCase();
  let score = 0;
  const keywords = [
    ["iv_characteristics","iv_data"],["kcl","kcl"],["temperature_analysis","iv_data"],
    ["cv_characteristics","cv_data"],["cv_components","cv_data"],["cv_multifreq","cv_data"],
    ["nqs_effects","nqs_effects"],["sparameter","sparams"],
    ["charge_conservation","charge_conservation"],["total_charge","tran_charge"],
    ["switching_response","tran_switching"],["switching_power","tran_switching_power"],
    ["large_signal","tran_large_signal"],["delay_effect","tran_delay"],
    ["power_dissipation","tran_power"],["energy_consumption","tran_power"],
    ["quasi_static","tran_quasi_static"],["thermal_noise","thermal_noise"],
    ["flicker_noise","flicker_noise"],["shot_noise","shot_noise"],
    ["noise_components","noise_components"],["noise_vs_temperature","noise_temp"],
  ];
  for (const [pk, dk] of keywords) {
    if (pn.includes(pk) && dn.includes(dk)) score += 10;
  }
  // Same domain? +5
  return score;
}

/** Map plot filename to human-readable label derived from test types. */
function plotLabel(name: string): { title: string; detail: string } {
  const n = name.toLowerCase();
  if (n.includes("iv_characteristics")||n.includes("iv_character")) return {title:"IV Characteristics",detail:"Id-Vd and Id-Vg curves across bias points"};
  if (n.includes("kcl_verification")) return {title:"KCL Verification",detail:"Sum of terminal currents across operating range"};
  if (n.includes("temperature_analysis")) return {title:"Temperature Analysis",detail:"DC characteristics at -40°C to 150°C"};
  if (n.includes("cv_characteristics")||n.includes("cv_character")) return {title:"Capacitance-Voltage",detail:"C-V curves across frequency and bias"};
  if (n.includes("cv_components")) return {title:"C-V Components",detail:"Cgg, Cgs, Cgd decomposition"};
  if (n.includes("cv_multifreq")) return {title:"Multi-Frequency C-V",detail:"C-V at multiple frequencies"};
  if (n.includes("nqs_effects")||n.includes("cv_nqs")) return {title:"Non-Quasi-Static Effects",detail:"Phase shift and frequency dependence"};
  if (n.includes("sparameter")) return {title:"S-Parameter Analysis",detail:"S11 and S21 vs frequency"};
  if (n.includes("charge_conservation")) return {title:"Charge Conservation",detail:"Total charge error verification"};
  if (n.includes("switching_response")) return {title:"Switching Response",detail:"Input pulse → output switching waveform"};
  if (n.includes("large_signal_transient")||n.includes("large_signal")) return {title:"Large-Signal Transient",detail:"Full-scale switching analysis"};
  if (n.includes("delay_effect")) return {title:"Delay Effect",detail:"Propagation delay through chain"};
  if (n.includes("power_dissipation")) return {title:"Power Dissipation",detail:"Dynamic and static power vs temperature"};
  if (n.includes("energy_consumption")) return {title:"Energy Consumption",detail:"Energy per switching event"};
  if (n.includes("quasi_static_iv")||n.includes("quasi_static_time")) return {title:"Quasi-Static Analysis",detail:"I-V and time-domain quasi-static response"};
  if (n.includes("thermal_noise_vds")) return {title:"Thermal Noise — Vds Comparison",detail:"Noise PSD at different Vds biases"};
  if (n.includes("thermal_noise")) return {title:"Thermal Noise",detail:"Noise power spectral density"};
  if (n.includes("flicker_noise")) return {title:"Flicker (1/f) Noise",detail:"Low-frequency noise characterization"};
  if (n.includes("shot_noise")) return {title:"Shot Noise",detail:"Current shot noise level and variation"};
  if (n.includes("noise_components")) return {title:"Noise Components",detail:"Thermal + Flicker + Shot decomposition"};
  if (n.includes("noise_vs_temperature")) return {title:"Noise vs Temperature",detail:"Noise PSD across -40°C to 150°C"};
  if (n.includes("total_charge")) return {title:"Total Charge",detail:"Integrated charge vs time"};
  // Fallback: clean up the hash suffix
  const base = name.replace(/_[a-f0-9]{8}\.(png|svg)$/i,"").replace(/[_-]/g," ");
  return {title:base,detail:""};
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Data cache (lazy fetch)                                             */
/* ═══════════════════════════════════════════════════════════════════ */

const dataCache = new Map<string, Record<string, string>[]>();

function useLazyData(artifact: DataArtifact | null): { rows: Record<string, string>[] | null; error: string | null } {
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
        // Normalized JSON: { columns: string[], rows: string[][] }
        const parsed = data as { columns: string[]; rows: string[][] };
        const records = parsed.rows.map(row => {
          const obj: Record<string, string> = {};
          parsed.columns.forEach((c, i) => obj[c] = String(row[i] ?? ""));
          return obj;
        });
        dataCache.set(fullUrl, records);
        setRows(records);
      } else {
        // Raw CSV/TXT fallback
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

/* ═══════════════════════════════════════════════════════════════════ */
/*  KPI Donut Chart                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function KpiDonut({ pass, fail, na }: { pass: number; fail: number; na: number }) {
  const ref = usePlotlyChart(
    [{ type: "pie", values: [pass, fail, na], labels: ["Pass", "Fail", "N/A"], hole: 0.55, marker: { colors: ["var(--ok,#22c55e)", "var(--fail,#ef4444)", "var(--muted,#94a3b8)"] }, textinfo: "label+value" } as Data],
    { autosize: true, margin: { l: 4, r: 4, t: 4, b: 4 }, showlegend: false, paper_bgcolor: "transparent", plot_bgcolor: "transparent" } as Partial<Layout>,
    { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>,
  );
  return <div className="plot-host plot-host--short"><div ref={ref} style={{ width: "100%", height: "100%" }} /></div>;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Overview Section                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function OverviewSection({ run }: { run: BenchmarkRun }) {
  const ns = run.netlistSuite;
  const ts = run.verificationTests;
  const passCount = ts.filter(t => t.status === "pass").length;
  const failCount = ts.filter(t => t.status === "fail").length;
  const naCount = ts.filter(t => t.status === "unavailable").length;

  return (
    <div className="chart-card benchmark-section" id="bm-overview">
      <h2>Overview — {run.runId} <span className="hint">({run.dataArtifacts.length} datasets, {run.plotArtifacts.length} plots)</span></h2>
      {run.status === "example" && <p className="hint benchmark-demo-warn">⚠ Example result — not real fabrication data</p>}
      <div className="benchmark-overview-grid">
        <div className="benchmark-overview-kpis">
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Model</div><div className="flow-kpi-card__value">{run.modelId}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Format</div><div className="flow-kpi-card__value">{run.modelFormat}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Device</div><div className="flow-kpi-card__value">{run.deviceName || "—"}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Simulator</div><div className="flow-kpi-card__value">{run.simulator} {run.simulatorVersion}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Generated</div><div className="flow-kpi-card__value benchmark-date">{run.generatedAt?.slice(0, 10) || "—"}</div></div>
        </div>
        <div className="benchmark-overview-donut">
          <KpiDonut pass={passCount} fail={failCount} na={naCount} />
        </div>
        <div className="benchmark-overview-nets">
          <h3 className="flow-subsection-title">Netlist Suite</h3>
          <table className="benchmark-table"><tbody>
            <tr><td>DC</td><td><code>{ns.dcCircuit || "—"}</code></td></tr>
            <tr><td>AC</td><td><code>{ns.acCircuit || "—"}</code></td></tr>
            <tr><td>Transient</td><td><code>{ns.transientCircuit || "—"}</code></td></tr>
            <tr><td>Noise</td><td><code>{ns.noiseCircuit || "—"}</code></td></tr>
          </tbody></table>
        </div>
      </div>
      <p className="hint">Modes: {run.modes.join(", ") || "—"} · Commit: <code>{run.commitSha?.slice(0, 8) || "—"}</code> · Pass: {passCount} · Fail: {failCount} · N/A: {naCount}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  BenchmarkDatasetCard — one per dataset                              */
/* ═══════════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 5;

function BenchmarkDatasetCard({ artifact, domain }: { artifact: DataArtifact; domain: AnalysisDomain }) {
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

      {/* Paginated data table — no inline chart */}
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
              <thead><tr>{cols.map((c,i) => <th key={`${i}-${c}`}>{c}</th>)}</tr></thead>
              <tbody>{pageRows?.map((r, i) => <tr key={i}>{cols.map((c,j) => <td key={`${j}-${c}`}>{r[c] ?? ""}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
      {rows === null && artifact.fetchUrl && !error && (
        <EmptyState message="Loading data…" icon="⏳" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Plot Gallery (no tabs, 2-col grid)                                  */
/* ═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════ */
/*  Verification Section                                                */
/* ═══════════════════════════════════════════════════════════════════ */

function VerificationSection({ run }: { run: BenchmarkRun }) {
  const ts = run.verificationTests;
  const passCount = ts.filter(t => t.status === "pass").length;
  const failCount = ts.filter(t => t.status === "fail").length;
  const naCount = ts.filter(t => t.status === "unavailable").length;

  return (
    <div className="chart-card benchmark-section" id="bm-verify">
      <h2>Summary</h2>

      {/* Centered KPI cards */}
      <div className="benchmark-verify-summary" style={{justifyContent:"center"}}>
        <div className="flow-kpi-card" style={{textAlign:"center"}}><div className="flow-kpi-card__label">Total</div><div className="flow-kpi-card__value">{ts.length}</div></div>
        <div className="flow-kpi-card" style={{textAlign:"center"}}><div className="flow-kpi-card__label">✓ Pass</div><div className="flow-kpi-card__value" style={{color:"var(--ok,#22c55e)"}}>{passCount}</div></div>
        <div className="flow-kpi-card" style={{textAlign:"center"}}><div className="flow-kpi-card__label">✗ Fail</div><div className="flow-kpi-card__value" style={{color:"var(--fail,#ef4444)"}}>{failCount}</div></div>
        <div className="flow-kpi-card" style={{textAlign:"center"}}><div className="flow-kpi-card__label">N/A</div><div className="flow-kpi-card__value" style={{color:"var(--muted)"}}>{naCount}</div></div>
      </div>

      {/* Per-domain test table with ✓/✗ symbols */}
      {ts.length > 0 && (
        <div className="benchmark-table-wrap" style={{marginBottom:"0.75rem"}}>
          <table className="benchmark-table">
            <thead><tr><th>Test Type</th><th>Status</th><th>Domain</th><th>Key Findings</th></tr></thead>
            <tbody>
              {ts.map(t => (
                <tr key={t.testId}>
                  <td><strong>{t.name}</strong></td>
                  <td style={{fontSize:"1rem",textAlign:"center"}}>
                    {t.status === "pass" ? <span title="Pass" style={{color:"var(--ok,#22c55e)"}}>✓</span>
                     : t.status === "fail" ? <span title="Fail" style={{color:"var(--fail,#ef4444)"}}>✗</span>
                     : <span title="Unavailable" style={{color:"var(--muted)"}}>—</span>}
                  </td>
                  <td><span className="benchmark-domain-badge" style={{fontSize:"0.6rem"}}>{t.domain}</span></td>
                  <td className="benchmark-test-detail">{t.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Artifact Table                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════ */
/*  Cross-Simulator Comparison                                          */
/* ═══════════════════════════════════════════════════════════════════ */

function SimulatorComparisonSection({ runs, modelFormats }: { runs: BenchmarkRun[]; modelFormats: string[] }) {
  if (runs.length < 2 && modelFormats.length <= 1) return null;

  // Build comparison matrix: mode × simulator
  const modes = ["DC","AC","Transient","Noise"];
  const comparisonData: {mode:string; simulator:string; status:string; durationSec?:number; peakMemoryMB?:number; dataFiles:number; plotCount:number}[] = [];

  for (const run of runs) {
    const sim = run.modelFormat || run.simulator;
    // Count artifacts per mode
    const dcData = run.dataArtifacts.filter(a => a.domain==="dc").length;
    const acData = run.dataArtifacts.filter(a => a.domain==="ac").length;
    const trData = run.dataArtifacts.filter(a => a.domain==="transient").length;
    const noData = run.dataArtifacts.filter(a => a.domain==="noise").length;
    const dcPlots = run.plotArtifacts.filter(a => a.domain==="dc").length;
    const acPlots = run.plotArtifacts.filter(a => a.domain==="ac").length;
    const trPlots = run.plotArtifacts.filter(a => a.domain==="transient").length;
    const noPlots = run.plotArtifacts.filter(a => a.domain==="noise").length;

    // Extract timing from data artifacts metadata
    const runtime = run.dataArtifacts.reduce((sum, a) => sum + ((a.metadata as any)?.durationSec || 0), 0) || undefined;

    comparisonData.push({mode:"DC",simulator:sim,status:dcData>0?"pass":"not_run",durationSec:runtime,dataFiles:dcData,plotCount:dcPlots});
    comparisonData.push({mode:"AC",simulator:sim,status:acData>0?"pass":"not_run",dataFiles:acData,plotCount:acPlots});
    comparisonData.push({mode:"Transient",simulator:sim,status:trData>0?"pass":"not_run",dataFiles:trData,plotCount:trPlots});
    comparisonData.push({mode:"Noise",simulator:sim,status:noData>0?"pass":"not_run",dataFiles:noData,plotCount:noPlots});
  }

  // Add known-but-not-run simulators
  for (const fmt of modelFormats) {
    const hasRun = runs.some(r => (r.modelFormat||r.simulator) === fmt);
    if (!hasRun) {
      for (const m of modes) {
        comparisonData.push({mode:m,simulator:fmt,status:"not_run",dataFiles:0,plotCount:0});
      }
    }
  }

  return (
    <div className="chart-card benchmark-section">
      <h2>Cross-Simulator Comparison</h2>
      <p className="hint">Per-mode comparison across simulators. Time and memory data populated when benchmarks run with instrumentation.</p>

      {/* Status matrix */}
      <div className="tr-table-wrap" style={{marginBottom:"0.75rem"}}>
        <table className="benchmark-table">
          <thead><tr><th>Mode</th>{modelFormats.map(f => <th key={f} style={{textAlign:"center"}}>{f}</th>)}<th style={{textAlign:"center"}}>Winner</th></tr></thead>
          <tbody>
            {modes.map(mode => {
              const entries = comparisonData.filter(c => c.mode===mode);
              const best = entries.filter(e => e.status==="pass").sort((a,b) => (a.durationSec||999) - (b.durationSec||999))[0];
              return (
                <tr key={mode}>
                  <td><strong>{mode}</strong></td>
                  {modelFormats.map(fmt => {
                    const e = entries.find(x => x.simulator===fmt);
                    if (!e || e.status==="not_run") return <td key={fmt} style={{textAlign:"center",color:"var(--muted)"}}>—</td>;
                    return (
                      <td key={fmt} style={{textAlign:"center"}}>
                        <span style={{color:e.status==="pass"?"var(--ok,#22c55e)":"var(--fail,#ef4444)"}}>
                          {e.status==="pass"?"✓":"✗"}
                        </span>
                        <span className="hint" style={{fontSize:"0.65rem",display:"block"}}>
                          {e.dataFiles} data · {e.plotCount} plots
                          {e.durationSec ? ` · ${e.durationSec}s` : ""}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{textAlign:"center",fontSize:"0.75rem"}}>
                    {best ? <span className="tr-badge tr-badge--completed">{best.simulator}</span> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Performance comparison placeholder */}
      <h3 className="flow-subsection-title">Performance Comparison</h3>
      <p className="hint">
        Cross-simulator execution time and peak memory comparison.
        <strong> Current data:</strong> only ngspice results available ({runs.filter(r=>r.status==="completed").length} runs).
        {modelFormats.filter(f=>!runs.some(r=>(r.modelFormat||r.simulator)===f)).length > 0 &&
          <> <strong>Pending:</strong> {modelFormats.filter(f=>!runs.some(r=>(r.modelFormat||r.simulator)===f)).join(", ")} benchmarks not yet executed.</>
        }
      </p>
      <div className="tr-table-wrap">
        <table className="benchmark-table">
          <thead><tr><th>Simulator</th><th>DC</th><th>AC</th><th>Transient</th><th>Noise</th><th>Total Time</th><th>Peak Memory</th></tr></thead>
          <tbody>
            {modelFormats.map(fmt => {
              const simRuns = runs.filter(r => (r.modelFormat||r.simulator) === fmt);
              if (simRuns.length === 0) {
                return (
                  <tr key={fmt}>
                    <td><code>{fmt}</code> <span className="tr-badge tr-badge--partial">not run</span></td>
                    <td colSpan={6} style={{color:"var(--muted)",fontSize:"0.75rem"}}>
                      Netlists configured — run <code>spice-benchmark --simulator {fmt}</code> to populate
                    </td>
                  </tr>
                );
              }
              const r = simRuns[0];
              const dcN = r.dataArtifacts.filter(a=>a.domain==="dc").length;
              const acN = r.dataArtifacts.filter(a=>a.domain==="ac").length;
              const trN = r.dataArtifacts.filter(a=>a.domain==="transient").length;
              const noN = r.dataArtifacts.filter(a=>a.domain==="noise").length;
              return (
                <tr key={fmt}>
                  <td><code>{fmt}</code> <span className="tr-badge tr-badge--completed">v{r.simulatorVersion}</span></td>
                  <td className="tr-num">{dcN} files</td>
                  <td className="tr-num">{acN} files</td>
                  <td className="tr-num">{trN} files</td>
                  <td className="tr-num">{noN} files</td>
                  <td className="tr-num">— s</td>
                  <td className="tr-num">— MB</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArtifactSection({ run }: { run: BenchmarkRun }) {
  const all = [...run.dataArtifacts.map(a => ({ ...a, kind: "data" as const })), ...run.plotArtifacts.map(p => ({ ...p, kind: "plot" as const }))];
  return (
    <div className="chart-card benchmark-section" id="bm-artifacts">
      <h2>Artifacts — {run.runId} <span className="hint">({all.length} files)</span></h2>
      <div className="benchmark-table-wrap" style={{ maxHeight: "400px", overflowY: "auto" }}>
        <table className="benchmark-table"><thead><tr><th>Name</th><th>Kind</th><th>Domain</th><th>Format</th><th>Size</th><th>Rows</th><th>Hash</th></tr></thead><tbody>
          {all.map((a, i) => <tr key={i}><td><code>{a.name}</code></td><td>{a.kind}</td><td>{a.domain}</td><td>{a.format}</td><td>{a.size}</td><td>{"rowCount" in a ? (a.rowCount > 0 ? a.rowCount : "—") : "—"}</td><td style={{ fontSize: "0.65rem" }}><code>{("hash" in a ? a.hash : a.name.slice(0, 8))}</code></td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SpiceBenchmarkPage (single continuous layout, no tabs)              */
/* ═══════════════════════════════════════════════════════════════════ */

export function SpiceBenchmarkPage() {
  const manifest = SPICE_BENCHMARK_MANIFEST;
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

  // Build run↔model↔suite index for reverse lookup
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

  // When model or suite changes, find matching run
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

  // Sync selectedModelId/selectedSuiteId when runId changes externally
  useEffect(() => { if (run) { setSelectedModelId(run.modelId); setSelectedSuiteId(run.netlistSuite?.suiteId ?? ""); } }, [runId]);

  if (!run) return <div className="chart-card"><EmptyState message="No benchmark data. Run generate:spice-benchmark first." icon="📭" /></div>;

  // Datasets filtered by analysis
  const datasets = useMemo(() => {
    return run.dataArtifacts.filter(d => analysis === "overview" || d.domain === analysis);
  }, [run, analysis]);

  // Top-level dataset selection — defaults to all datasets for current analysis
  const [selectedDatasetNames, setSelectedDatasetNames] = useState<string[]>([]);
  // When analysis/run changes, select all datasets
  useEffect(() => {
    setSelectedDatasetNames(datasets.map(d => d.name));
  }, [analysis, runId]);

  const toggleAllDatasets = useCallback((on: boolean) => {
    setSelectedDatasetNames(on ? datasets.map(d => d.name) : []);
  }, [datasets]);

  const toggleDataset = useCallback((name: string) => {
    setSelectedDatasetNames(prev => {
      const idx = prev.indexOf(name);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      } else {
        return [...prev, name];
      }
    });
  }, []);

  const visibleDatasets = useMemo(() => {
    const sel = new Set(selectedDatasetNames);
    return datasets.filter(d => sel.has(d.name));
  }, [datasets, selectedDatasetNames]);

  // Derive available analysis domains (only show those with data)
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
      {/* ─── Top Controls Card (Explore metrics style) ─── */}
      <div className="chart-card benchmark-controls">
        <h2>Explore benchmark results</h2>
        <p className="hint">Select a run, model, and analysis domain. Datasets, plots, and verification results update automatically.</p>
        <div className="benchmark-controls-grid">
          <label className="axis-picker">Run<select value={runId} onChange={e => setRunId(e.target.value)}>{runIds.map(rid => <option key={rid} value={rid}>{rid}</option>)}</select></label>
          <label className="axis-picker">Model<select value={selectedModelId} onChange={e => onModelChange(e.target.value)}>
            <optgroup label="Completed runs">{manifest.modelIds.map(mid => <option key={mid} value={mid}>{mid}</option>)}</optgroup>
            <optgroup label="Available but not run"><option value="" disabled>{(manifest.availableModels||0)} model(s) configured — run benchmarks to populate</option></optgroup>
          </select></label>
          <label className="axis-picker">Simulator<select value={run.modelFormat} onChange={e => {
            const matching = Object.values(manifest.runs).find(r => r.modelFormat === e.target.value);
            if (matching) setRunId(matching.runId);
          }}>
            {manifest.modelFormats.map(f => {
              const runsForF = Object.values(manifest.runs).filter(r => r.modelFormat === f);
              const r0 = runsForF[0];
              return <option key={f} value={f} disabled={!r0}>{f}{r0 ? ` (${r0.simulator} v${r0.simulatorVersion}, ${runsForF.length} runs)` : " — no results yet"}</option>;
            })}
          </select></label>
          <label className="axis-picker">Netlist Suite<select value={selectedSuiteId} onChange={e => onSuiteChange(e.target.value)}>{manifest.suiteIds.map(sid => <option key={sid} value={sid}>{sid}</option>)}</select></label>
          <label className="axis-picker">Analysis<select value={analysis} onChange={e => setAnalysis(e.target.value as AnalysisDomain)}>{availableDomains.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}</select></label>
          <label className="axis-picker">Plot aspect<select value={plotAspect} onChange={e => setPlotAspect(e.target.value as PlotAspectMode)}>{["flexible","16:9","4:3","1:1"].map(a => <option key={a}>{a}</option>)}</select></label>
        </div>
        {hasCompareRuns && (
          <div className="benchmark-controls-grid" style={{ marginTop: "0.5rem" }}>
            <label className="axis-picker">Comparison<select value={comparisonMode} onChange={e => setComparisonMode(e.target.value as ComparisonMode)}>{["single","compare_models","compare_suites"].map(m => <option key={m} value={m}>{m}</option>)}</select></label>
            {comparisonMode !== "single" && <label className="axis-picker">Compare Run<select value={compareRunId} onChange={e => setCompareRunId(e.target.value)}>{runIds.filter(rid => rid !== runId).map(rid => <option key={rid} value={rid}>{rid}</option>)}</select></label>}
          </div>
        )}

        {/* Datasets to include — top-level multi-select */}
        {datasets.length > 0 && (
          <div className="benchmark-series" style={{marginTop:"0.5rem",display:"block"}}>
            <div style={{fontWeight:600,fontSize:"0.78rem",marginBottom:"0.25rem"}}>Datasets to include:</div>
            <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.3rem"}}>
              <button className="benchmark-btn" onClick={() => toggleAllDatasets(true)}>Select all</button>
              <button className="benchmark-btn" onClick={() => toggleAllDatasets(false)}>Unselect all</button>
            </div>
            {/* Datasets grouped by domain */}
            {(["dc","ac","transient","noise","overview"] as AnalysisDomain[]).map(dom => {
              const domDatasets = datasets.filter(d => d.domain === dom);
              if (domDatasets.length === 0) return null;
              return (
                <div key={dom} style={{marginBottom:"0.3rem"}}>
                  <div className="hint" style={{fontWeight:600,fontSize:"0.7rem",marginBottom:"0.15rem",color:"var(--muted)"}}>{DOMAIN_LABELS[dom]}</div>
                  <div className="benchmark-series-checkboxes">
                    {domDatasets.map(d => (
                      <label key={d.name} className="benchmark-series-item">
                        <input type="checkbox" checked={visibleDatasets.some(v => v.name === d.name)} onChange={() => toggleDataset(d.name)} />
                        {d.name}
                        <span className="hint">({d.rowCount > 0 ? d.rowCount : "?"})</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
        )}
        <p className="hint benchmark-datasets-summary">{visibleDatasets.length}/{datasets.length} dataset(s) shown for {DOMAIN_LABELS[analysis]} · {run.plotArtifacts.filter(p => analysis === "overview" || p.domain === analysis).length} plot(s)</p>

        {/* Simulator status overview */}
        {manifest.modelFormats.length > 1 && (
          <div className="benchmark-series" style={{marginTop:"0.5rem",display:"block"}}>
            <div style={{fontWeight:600,fontSize:"0.78rem",marginBottom:"0.25rem"}}>Simulator Status:</div>
            {manifest.modelFormats.map(f => {
              const runsForFormat = Object.values(manifest.runs).filter(r => r.modelFormat === f);
              const hasResults = runsForFormat.length > 0;
              return (
                <span key={f} style={{marginRight:"0.75rem",fontSize:"0.75rem"}}>
                  <span className={`tr-badge tr-badge--${hasResults ? "completed" : "partial"}`} style={{marginRight:"0.25rem"}}>{f}</span>
                  {hasResults ? `${runsForFormat.length} run(s) complete` : "no results yet"}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Summary ─── */}
      <VerificationSection run={run} />

      {/* ─── Overview ─── */}
      <OverviewSection run={run} />

      {/* ─── Cross-Simulator Comparison ─── */}
      <SimulatorComparisonSection runs={Object.values(manifest.runs)} modelFormats={manifest.modelFormats} />

      {/* ─── Artifacts ─── */}
      <ArtifactSection run={run} />

      {/* ─── Interleaved Data + Plots by Domain ─── */}
      {(["dc","ac","transient","noise"] as AnalysisDomain[]).map(domain => {
        const domainDatasets = datasets.filter(d => d.domain === domain);
        const domainPlots = run.plotArtifacts.filter(p => p.domain === domain);
        if (domainDatasets.length === 0 && domainPlots.length === 0) return null;

        // Match each plot to its best dataset(s)
        const plotDataPairs = domainPlots.filter(p => p.displayUrl).map(p => {
          const best = domainDatasets
            .map(d => ({dataset:d, score: matchScore(p.name, d.name)}))
            .filter(x => x.score > 0)
            .sort((a,b) => b.score - a.score);
          return { plot: p, datasets: best.map(x => x.dataset) };
        });

        // Datasets not matched to any plot
        const matchedNames = new Set(plotDataPairs.flatMap(p => p.datasets.map(d => d.name)));
        const unmatchedDatasets = domainDatasets.filter(d => !matchedNames.has(d.name));

        return (
          <div key={domain} className="benchmark-section">
            <h2 className="benchmark-section-heading">{DOMAIN_LABELS[domain]}</h2>

            {/* Plot + its matched data */}
            {plotDataPairs.map(({plot, datasets: pairDatasets}) => {
              const label = plotLabel(plot.name);
              const visiblePairDatasets = pairDatasets.filter(d => visibleDatasets.some(v => v.name === d.name));
              return (
                <div key={plot.relPath} className="chart-card">
                  {/* Plot — full width */}
                  <h3 className="flow-subsection-title">{label.title}</h3>
                  {label.detail && <p className="hint" style={{marginBottom:"0.5rem"}}>{label.detail}</p>}
                  <div className="benchmark-plot-card" onClick={() => setLightbox(BASE + plot.displayUrl!)} style={{marginBottom:"0.75rem"}}>
                    <div className="benchmark-plot-img-wrap"><img src={BASE + plot.displayUrl!} alt={label.title} loading="lazy" style={{width:"100%"}} /></div>
                  </div>
                  {/* Data below plot */}
                  {visiblePairDatasets.length > 0 ? visiblePairDatasets.map(d => (
                    <BenchmarkDatasetCard key={d.relPath} artifact={d} domain={d.domain} />
                  )) : (
                    <EmptyState message="Dataset not selected — enable in Datasets to include above" icon="📊" />
                  )}
                </div>
              );
            })}

            {/* Unmatched datasets (no corresponding plot) */}
            {unmatchedDatasets.filter(d => visibleDatasets.some(v => v.name === d.name)).map(d => (
              <div key={d.relPath} className="chart-card">
                <p className="hint" style={{marginBottom:"0.25rem"}}>📄 {d.name} — no matching plot</p>
                <BenchmarkDatasetCard artifact={d} domain={d.domain} />
              </div>
            ))}
          </div>
        );
      })}

      {/* ─── Overview datasets (only when analysis=overview) ─── */}
      {analysis === "overview" && visibleDatasets.length > 0 && (
        <div className="benchmark-section">
          <h2 className="benchmark-section-heading">Overview Datasets ({visibleDatasets.length}/{datasets.length})</h2>
          {visibleDatasets.map(d => (
            <BenchmarkDatasetCard key={d.relPath} artifact={d} domain={d.domain} />
          ))}
        </div>
      )}

      {/* ─── Compare run overlay ─── */}
      {compareRun && comparisonMode !== "single" && (
        <div className="chart-card benchmark-section" id="bm-compare">
          <h2>Compare: {compareRun.runId}</h2>
          <OverviewSection run={compareRun} />
        </div>
      )}
    </div>
  );
}
