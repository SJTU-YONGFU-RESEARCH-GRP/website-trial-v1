import { useEffect, useMemo, useState, useCallback } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { useTheme } from "../theme/ThemeContext";
import {
  getChartPalette, plotInsetBackground, plotAxisFont, plotFont,
  plotlyAxisFrameX, plotlyAxisFrameY, plotlyBold, plotlyHoverLabel,
} from "../theme/chartPalette";
import { usePlotlyChart } from "../hooks/usePlotlyChart";
import { SPICE_BENCHMARK_MANIFEST } from "../data/generatedSpiceBenchmarkManifest";
import type {
  BenchmarkRun, AnalysisDomain, ComparisonMode,
  NumericScaleMode, PlotAspectMode, DataArtifact,
} from "../data/SpiceBenchmarkTypes";
import { ANALYSIS_DOMAINS } from "../data/SpiceBenchmarkTypes";
import { EmptyState } from "./flow/EmptyState";
import "../benchmark.css";

const BASE = import.meta.env.BASE_URL || "/";

const DOMAIN_LABELS: Record<AnalysisDomain, string> = { overview: "Overview", dc: "DC", ac: "AC", transient: "Transient", noise: "Noise" };
const DOMAIN_DEFAULT_X: Record<AnalysisDomain, string[]> = {
  overview: [], dc: ["Vds", "Vgs", "vds", "vgs", "Vds(V)", "Vbias"], ac: ["freq(Hz)", "freq", "frequency", "Vgs(V)"],
  transient: ["time(s)", "time", "t(s)"], noise: ["freq(Hz)", "freq", "frequency"],
};
const DOMAIN_DEFAULT_Y: Record<AnalysisDomain, string[]> = {
  overview: [], dc: ["Id(A)", "Id", "Ids(A)", "gm(A/V)", "I(V)"], ac: ["Cgg(F)", "Cgd(F)", "Cgs(F)", "mag"],
  transient: ["Vout(V)", "Vout", "Vin(V)", "Iin(A)", "power(W)"], noise: ["Sid(A^2/Hz)", "Svg(V^2/Hz)", "Sv(V^2/Hz)"],
};
const DOMAIN_CHART: Record<AnalysisDomain, string> = { overview: "scatter", dc: "scatter", ac: "scatter", transient: "line", noise: "scatter" };

function pickDefault(cols: string[], candidates: string[]): string {
  for (const c of candidates) { if (cols.includes(c)) return c; }
  return cols[0] ?? "";
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

const PAGE_SIZE = 50;

function BenchmarkDatasetCard({ artifact, domain, plotAspect }: { artifact: DataArtifact; domain: AnalysisDomain; plotAspect: PlotAspectMode }) {
  const aspectCls = plotAspect === "16:9" ? "plot-host--aspect-16x9" : plotAspect === "4:3" ? "plot-host--aspect-4x3" : plotAspect === "1:1" ? "plot-host--aspect-1x1" : "";
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const bg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  const cols = artifact.columns ?? [];
  const { rows, error } = useLazyData(artifact);

  const [xCol, setXCol] = useState("");
  const [yCols, setYCols] = useState<string[]>([]);
  const [chartType, setChartType] = useState("scatter");
  const [xScale, setXScale] = useState<NumericScaleMode>("linear");
  const [yScale, setYScale] = useState<NumericScaleMode>("linear");
  const [tablePage, setTablePage] = useState(0);

  // Auto-configure defaults when data loads
  useEffect(() => {
    if (cols.length === 0) return;
    const dx = DOMAIN_DEFAULT_X[domain] ?? [];
    const dy = DOMAIN_DEFAULT_Y[domain] ?? [];
    setXCol(pickDefault(cols, dx));
    setYCols([pickDefault(cols, dy)]);
    setChartType(DOMAIN_CHART[domain] ?? "scatter");
    if (domain === "noise" || (cols[0] && /freq/i.test(cols[0]))) setXScale("log");
    if (domain === "noise") setYScale("log");
  }, [artifact.name, domain]);

  // Build chart
  const chart = useMemo(() => {
    if (!rows || !xCol || yCols.length === 0) return null;
    const xVals = rows.map(r => +r[xCol]);

    if (chartType === "scatter" || chartType === "line") {
      const traces: Data[] = yCols.map(yc => {
        const yVals = rows.map(r => +r[yc]);
        return { type: "scatter", mode: chartType === "line" ? "lines+markers" : "markers", x: xVals, y: yVals, name: yc,
          marker: { size: 5 }, line: { width: 1.5 },
          hovertemplate: `${xCol}: %{x}<br>${yc}: %{y}<extra></extra>` } as Data;
      });
      return {
        data: traces,
        layout: {
          autosize: true, margin: narrow ? { l: 48, r: 12, t: 24, b: 44 } : { l: 56, r: 20, t: 28, b: 48 },
          paper_bgcolor: bg, plot_bgcolor: bg, font: plotFont(palette.rgbAxisTitle),
          title: { text: plotlyBold(`${artifact.name}`), font: plotFont(palette.rgbAxisTitle) },
          xaxis: { ...frameX, title: xCol, tickfont: axTick, type: xScale === "log" ? "log" : "linear" },
          yaxis: { ...frameY, title: yCols.join(" / "), tickfont: axTick, type: yScale === "log" ? "log" : "linear", gridcolor: palette.axisGridGreyRgb },
          showlegend: yCols.length > 1, legend: narrow ? { orientation: "h", y: -0.3 } : { x: 1.02 },
          hovermode: "closest", hoverlabel: hoverLabel,
        } as Partial<Layout>,
      };
    }
    if (chartType === "heatmap" && cols.length >= 3) {
      const zVals = yCols.map(yc => rows.map(r => +r[yc]));
      return {
        data: [{ type: "heatmap", z: zVals, x: xVals.map(String), y: yCols, colorscale: "Viridis",
          hovertemplate: `${xCol}: %{x}<br>%{y}: %{z}<extra></extra>` } as Data],
        layout: {
          autosize: true, margin: narrow ? { l: 56, r: 12, t: 24, b: 64 } : { l: 72, r: 20, t: 28, b: 68 },
          paper_bgcolor: bg, plot_bgcolor: bg, font: plotFont(palette.rgbAxisTitle),
          title: { text: plotlyBold(`${artifact.name} — heatmap`), font: plotFont(palette.rgbAxisTitle) },
          xaxis: { ...frameX, title: xCol, tickfont: axTick },
          yaxis: { ...frameY, tickfont: axTick, autorange: "reversed" as const },
          hovermode: "closest", hoverlabel: hoverLabel,
        } as Partial<Layout>,
      };
    }
    return null;
  }, [rows, xCol, yCols, chartType, xScale, yScale, narrow, palette, bg, axTick, hoverLabel, frameX, frameY]);

  const chartRef = usePlotlyChart(chart?.data ?? [], chart?.layout ?? {}, { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>);

  const displayRows = rows && rows.length > 0 ? rows : null;
  const totalPages = displayRows ? Math.ceil(displayRows.length / PAGE_SIZE) : 0;
  const pageRows = displayRows ? displayRows.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE) : null;

  const downloadCsv = () => {
    if (!rows) return;
    const csv = [cols.join(","), ...rows.map(r => cols.map(c => r[c] ?? "").join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${artifact.name}.csv`; a.click();
  };

  const toggleYCol = (col: string) => setYCols(prev => {
    const next = prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col];
    return next.length === 0 ? prev : next;
  });

  return (
    <div className="chart-card benchmark-dataset-card">
      <div className="benchmark-dataset-header">
        <span className="benchmark-domain-badge">{DOMAIN_LABELS[domain]}</span>
        <code>{artifact.name}</code>
        <span className="hint">{artifact.rowCount > 0 ? `${artifact.rowCount} rows` : ""} · {artifact.size} · <code>{artifact.hash}</code></span>
        {rows && rows.length > 0 && <button className="benchmark-btn" onClick={downloadCsv}>⬇ CSV ({rows.length} rows)</button>}
      </div>

      {/* Controls */}
      <div className="benchmark-dataset-controls">
        <label className="axis-picker">X<select value={xCol} onChange={e => setXCol(e.target.value)}>{cols.map((c,i) => <option key={`${i}-${c}`}>{c}</option>)}</select></label>
        <label className="axis-picker">Chart<select value={chartType} onChange={e => setChartType(e.target.value)}>{["scatter","line","bar","heatmap"].map(t => <option key={t}>{t}</option>)}</select></label>
        <label className="axis-picker">X scale<select value={xScale} onChange={e => setXScale(e.target.value as NumericScaleMode)}>{["linear","log"].map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="axis-picker">Y scale<select value={yScale} onChange={e => setYScale(e.target.value as NumericScaleMode)}>{["linear","log"].map(s => <option key={s}>{s}</option>)}</select></label>
      </div>

      {/* Y series multi-select */}
      {cols.length > 1 && (
        <div className="benchmark-series">
          <span className="hint">Y series:</span>
          <div className="benchmark-series-checkboxes">
            {cols.filter(c => c !== xCol).map((c,i) => (
              <label key={`${i}-${c}`} className="benchmark-series-item"><input type="checkbox" checked={yCols.includes(c)} onChange={() => toggleYCol(c)} />{c}</label>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {chart ? (
        <div className={`plot-host plot-host--tall ${aspectCls}`}>
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      ) : rows === null && artifact.fetchUrl ? (
        <EmptyState message="Loading data…" icon="⏳" />
      ) : rows && rows.length === 0 ? (
        <EmptyState message="No data rows" icon="📭" />
      ) : artifact.fetchUrl ? (
        <EmptyState message="Select X and Y columns to plot" icon="📊" />
      ) : (
        <EmptyState message={`${artifact.format} — download available (no inline chart)`} icon="📁" />
      )}
      {error && <p className="hint benchmark-error">{error}</p>}

      {/* Paginated data table */}
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
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{pageRows?.map((r, i) => <tr key={i}>{cols.map(c => <td key={c}>{r[c] ?? ""}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Plot Gallery (no tabs, 2-col grid)                                  */
/* ═══════════════════════════════════════════════════════════════════ */

function PlotGallery({ run }: { run: BenchmarkRun }) {
  const narrow = useNarrowScreen(640);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const m = new Map<AnalysisDomain, typeof run.plotArtifacts>();
    for (const p of run.plotArtifacts) { const list = m.get(p.domain) ?? []; list.push(p); m.set(p.domain, list); }
    return m;
  }, [run.plotArtifacts]);

  if (run.plotArtifacts.length === 0) return <div className="chart-card benchmark-section" id="bm-gallery"><h2>Original Plots</h2><EmptyState message="No plot images in this run" icon="🖼" /></div>;

  return (
    <div className="chart-card benchmark-section" id="bm-gallery">
      {lightbox && (
        <div className="benchmark-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
          <a href={lightbox} download className="benchmark-btn benchmark-lightbox-dl">Download</a>
        </div>
      )}
      <h2>Original Plots <span className="hint">({run.plotArtifacts.length} total)</span></h2>
      {[...grouped.entries()].map(([domain, plots]) => (
        <div key={domain} className="benchmark-plot-group">
          <h3 className="flow-subsection-title">{DOMAIN_LABELS[domain]} — {plots.length} plots</h3>
          <div className={`benchmark-plot-grid ${narrow ? "benchmark-plot-grid--1col" : "benchmark-plot-grid--2col"}`}>
            {plots.map(p => p.displayUrl ? (
              <div key={p.relPath} className="benchmark-plot-card" onClick={() => setLightbox(BASE + p.displayUrl)}>
                <div className="benchmark-plot-img-wrap">
                  <img src={BASE + p.displayUrl} alt={p.name} loading="lazy" />
                </div>
                <div className="benchmark-plot-info">
                  <span>{p.name}</span>
                  <span className="hint">{p.size}</span>
                </div>
              </div>
            ) : (
              <div key={p.relPath} className="benchmark-plot-card benchmark-plot-card--empty">{p.name}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Verification Section                                                */
/* ═══════════════════════════════════════════════════════════════════ */

function VerificationSection({ run }: { run: BenchmarkRun }) {
  const ts = run.verificationTests;
  const passCount = ts.filter(t => t.status === "pass").length;
  const failCount = ts.filter(t => t.status === "fail").length;
  const naCount = ts.filter(t => t.status === "unavailable").length;
  const allPass = failCount === 0 && passCount > 0;

  return (
    <div className="chart-card benchmark-section" id="bm-verify">
      <h2>
        REPORT.md — {run.runId}{" "}
        {allPass ? <span style={{color:"var(--ok,#22c55e)"}}>All ✓ ({passCount} tests)</span>
         : failCount > 0 ? <span style={{color:"var(--fail,#ef4444)"}}>✗ {failCount} failures</span>
         : <span style={{color:"var(--muted)"}}>No results</span>}
      </h2>

      {/* Test status cards with ✓/✗ symbols */}
      <div className="benchmark-verify-summary">
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">Total</div><div className="flow-kpi-card__value">{ts.length}</div></div>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">✓ Pass</div><div className="flow-kpi-card__value" style={{color:"var(--ok,#22c55e)"}}>{passCount}</div></div>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">✗ Fail</div><div className="flow-kpi-card__value" style={{color:"var(--fail,#ef4444)"}}>{failCount}</div></div>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">N/A</div><div className="flow-kpi-card__value" style={{color:"var(--muted)"}}>{naCount}</div></div>
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

      {/* Raw REPORT.md — always visible */}
      {run.reportSummary.reportMarkdown && (
        <details className="benchmark-report-raw" open>
          <summary>Full REPORT.md</summary>
          <pre>{run.reportSummary.reportMarkdown}</pre>
        </details>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Artifact Table                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

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
  // When analysis changes, reset to all datasets
  useEffect(() => {
    setSelectedDatasetNames(datasets.map(d => d.name));
  }, [analysis, runId]);

  const toggleAllDatasets = useCallback((on: boolean) => {
    setSelectedDatasetNames(on ? [] : datasets.map(d => d.name));
  }, [datasets]);

  const toggleDataset = useCallback((name: string) => {
    setSelectedDatasetNames(prev => {
      const next = prev.length === 0 ? [...datasets.map(d => d.name)] : [...prev];
      const idx = next.indexOf(name);
      if (idx >= 0) {
        if (next.length <= 1) return next;
        next.splice(idx, 1);
      } else {
        next.push(name);
      }
      return next;
    });
  }, [datasets]);

  const visibleDatasets = useMemo(() => {
    const sel = selectedDatasetNames.length === 0 ? new Set(datasets.map(d => d.name)) : new Set(selectedDatasetNames);
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
      {/* ─── Top Controls Card (Explore metrics style) ─── */}
      <div className="chart-card benchmark-controls">
        <h2>Explore benchmark results</h2>
        <p className="hint">Select a run, model, and analysis domain. Datasets, plots, and verification results update automatically.</p>
        <div className="benchmark-controls-grid">
          <label className="axis-picker">Run<select value={runId} onChange={e => setRunId(e.target.value)}>{runIds.map(rid => <option key={rid} value={rid}>{rid}</option>)}</select></label>
          <label className="axis-picker">Model<select value={selectedModelId} onChange={e => onModelChange(e.target.value)}>
            <optgroup label="Completed runs">{manifest.modelIds.map(mid => <option key={mid} value={mid}>{mid}</option>)}</optgroup>
            <optgroup label="Available but not run"><option value="" disabled>{(manifest.availableModels||0)} model(s) configured</option></optgroup>
          </select></label>
          <label className="axis-picker">Format<span className="benchmark-readonly">{run.modelFormat}</span></label>
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
          <div className="benchmark-series" style={{marginTop:"0.5rem"}}>
            <span className="hint">Datasets to include:</span>
            <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.2rem"}}>
              <button className="benchmark-btn" onClick={() => toggleAllDatasets(true)}>Select all</button>
              <button className="benchmark-btn" onClick={() => toggleAllDatasets(false)}>Unselect all</button>
            </div>
            <div className="benchmark-series-checkboxes" style={{maxHeight:"150px",overflowY:"auto"}}>
              {datasets.map(d => (
                <label key={d.name} className="benchmark-series-item">
                  <input type="checkbox" checked={visibleDatasets.some(v => v.name === d.name)} onChange={() => toggleDataset(d.name)} />
                  <span className="benchmark-domain-badge" style={{fontSize:"0.6rem",padding:"0.05rem 0.25rem"}}>{DOMAIN_LABELS[d.domain]}</span>
                  {d.name}
                  <span className="hint">({d.rowCount > 0 ? d.rowCount : "?"} rows)</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <p className="hint benchmark-datasets-summary">{visibleDatasets.length}/{datasets.length} dataset(s) shown for {DOMAIN_LABELS[analysis]} · {run.plotArtifacts.filter(p => analysis === "overview" || p.domain === analysis).length} plot(s)</p>
      </div>

      {/* ─── REPORT.md — top priority ─── */}
      <VerificationSection run={run} />

      {/* ─── Original Plots ─── */}
      <PlotGallery run={run} />

      {/* ─── Overview ─── */}
      <OverviewSection run={run} />

      {/* ─── Interactive Datasets ─── */}
      <div className="benchmark-section" id="bm-datasets">
        <h2 className="benchmark-section-heading">Interactive Datasets — {DOMAIN_LABELS[analysis]} ({visibleDatasets.length}/{datasets.length})</h2>
        {visibleDatasets.length === 0 ? (
          <div className="chart-card"><EmptyState message={`No datasets selected for ${DOMAIN_LABELS[analysis]}. Use checkboxes above to select datasets to display.`} icon="📊" /></div>
        ) : (
          visibleDatasets.map(d => (
            <BenchmarkDatasetCard key={d.relPath} artifact={d} domain={analysis === "overview" ? d.domain : analysis} plotAspect={plotAspect} />
          ))
        )}
      </div>

      {/* ─── Artifacts ─── */}
      <ArtifactSection run={run} />

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
