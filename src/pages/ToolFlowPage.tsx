import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { Config, Data, Layout } from "plotly.js";
import Plotly from "plotly.js-dist-min";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { useTheme } from "../theme/ThemeContext";
import {
  CHART_MARKER_OUTLINE_RGB,
  CHART_LINE_WIDTH,
  chartScatterMarkerStrokeRgb,
  getChartPalette,
  plotInsetBackground,
  plotAxisFont,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlyHoverLabel,
  chartAxisFontSizePx,
} from "../theme/chartPalette";
import type {
  SimpleRun,
  StageInfo,
  LayoutCellMetric,
  PexNetCap,
  TimingChar,
  DeviceOptPoint,
  FlowArtifact,
} from "../data/flowToolData";
import {
  FLOW_RUNS,
  FLOW_CASES,
  CURRENT_STAGES,
  LAYOUT_METRICS,
  PEX_RESULTS,
  TIMING_CHARS,
  DEVICE_OPT_POINTS,
  FLOW_ARTIFACTS,
} from "../data/flowToolData";

/* ─── Plotly hook (same pattern as PlotlyPage) ─── */
function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const plot = Plotly.newPlot(el, data, layout, config);
    void plot.then(() => {
      if (cancelled) return;
      void Plotly.Plots.resize(el);
    });

    const ro = new ResizeObserver(() => {
      if (el && !cancelled) void Plotly.Plots.resize(el);
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      void Plotly.purge(el);
    };
  }, [data, layout, config]);

  return ref;
}

/* ─── Status badge ─── */
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: "Done",  cls: "flow-badge--done" },
  running:   { label: "Run…", cls: "flow-badge--run" },
  pending:   { label: "—",     cls: "flow-badge--idle" },
  failed:    { label: "Fail", cls: "flow-badge--fail" },
  ready:     { label: "Ready", cls: "flow-badge--done" },
  error:     { label: "Error", cls: "flow-badge--fail" },
  done:      { label: "Done",  cls: "flow-badge--done" },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { label: status, cls: "flow-badge--idle" };
  return <span className={`flow-badge ${s.cls}`}>{s.label}</span>;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  ToolFlowPage                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
export function ToolFlowPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const plotSurfaceBg = plotInsetBackground(theme);
  const scatterMarkerStroke = chartScatterMarkerStrokeRgb(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const axTitle = (label: string) => ({
    text: label,
    font: plotAxisFont(palette.rgbAxisTitle, narrow),
    standoff: narrow ? 10 : 14,
  });
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);
  const commonConfig: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    scrollZoom: true,
    doubleClick: "reset",
    displaylogo: false,
    ...(narrow ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const } : {}),
    toImageButtonOptions: { format: "png", filename: "flow-tool-chart" },
  };

  /* ─── state: selected run & cell ─── */
  const [selectedRunId, setSelectedRunId] = useState(FLOW_RUNS[0]?.id ?? "");
  const [selectedCell, setSelectedCell] = useState(FLOW_CASES[0] ?? "");
  const selectedRun = FLOW_RUNS.find((r) => r.id === selectedRunId);
  const stageCount = CURRENT_STAGES.filter((s) => s.status === "done").length;

  /* ─── Card 6: timing chart (delay/slew vs input transition, grouped by load) ─── */
  const timingChartData = useMemo(() => {
    const filtered = TIMING_CHARS.filter((t) => t.cell === selectedCell);
    const loads = [...new Set(filtered.map((t) => t.outputLoadFF))].sort((a, b) => a - b);
    const colors = ["#0071e3", "#ff9f0a", "#30d158", "#bf5af2", "#ff375f"];

    const delayTraces: Data[] = loads.map((load, i) => {
      const pts = filtered.filter((t) => t.outputLoadFF === load);
      return {
        type: "scatter",
        mode: "markers+lines",
        name: `Delay @ CL=${load}fF`,
        x: pts.map((t) => t.inputTransitionPs),
        y: pts.map((t) => t.delayPs),
        marker: {
          size: 8,
          color: colors[i % colors.length],
          line: { width: 1, color: scatterMarkerStroke },
        },
        line: { shape: "spline", color: colors[i % colors.length], width: 2 },
        hovertemplate: `<b>${selectedCell}</b><br>Input slew: %{x} ps<br>Delay: %{y:.1f} ps<extra></extra>`,
      } as Data;
    });

    const layout: Partial<Layout> = {
      autosize: true,
      margin: narrow ? { l: 46, r: 14, t: 24, b: 52 } : { l: 54, r: 24, t: 32, b: 56 },
      paper_bgcolor: plotSurfaceBg,
      plot_bgcolor: plotSurfaceBg,
      font: plotFont(palette.rgbAxisTitle),
      title: {
        text: plotlyBold(`${selectedCell} — delay vs input slew`),
        font: plotFont(palette.rgbAxisTitle),
      },
      showlegend: !narrow,
      legend: narrow
        ? { orientation: "h", yanchor: "top", y: -0.28, xanchor: "center", x: 0.5, font: { ...axTick, size: 9 } }
        : { orientation: "v", yanchor: "top", y: 1, xanchor: "left", x: 1.02, font: axTick },
      xaxis: { ...frameX, automargin: true, gridcolor: palette.axisGridGreyRgb, title: axTitle("Input transition (ps)"), tickfont: axTick },
      yaxis: { ...frameY, automargin: true, gridcolor: palette.axisGridBlackRgb, title: axTitle("Delay (ps)"), tickfont: axTick },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };
    return { data: delayTraces, layout };
  }, [narrow, theme, selectedCell, plotSurfaceBg, scatterMarkerStroke, axTick, axTitle, hoverLabel, frameX, frameY, palette]);

  const timingChartRef = usePlotlyChart(timingChartData.data, timingChartData.layout, commonConfig);

  /* ─── Card 7: device opt chart (area vs delay, Pareto highlighted) ─── */
  const deviceOptData = useMemo(() => {
    const paretoPts = DEVICE_OPT_POINTS.filter((p) => p.paretoFront);
    const nonParetoPts = DEVICE_OPT_POINTS.filter((p) => !p.paretoFront);

    const traces: Data[] = [
      {
        type: "scatter",
        mode: "markers",
        name: "Swept points",
        x: nonParetoPts.map((p) => p.areaUm2),
        y: nonParetoPts.map((p) => p.delayPs),
        marker: {
          size: 7,
          color: palette.axisGridBlackRgb,
          opacity: 0.45,
          line: { width: 1, color: scatterMarkerStroke },
        },
        hovertemplate: `<b>Device sweep</b><br>Area: %{x:.3f} µm²<br>Delay: %{y:.1f} ps<extra></extra>`,
      } as Data,
      {
        type: "scatter",
        mode: "markers+lines",
        name: "Pareto front",
        x: paretoPts.map((p) => p.areaUm2),
        y: paretoPts.map((p) => p.delayPs),
        marker: {
          size: 11,
          color: "#ff9f0a",
          line: { width: 2, color: "#ffffff" },
        },
        line: { shape: "spline", color: "#ff9f0a", width: 2, dash: "dot" },
        hovertemplate: `<b>Pareto optimal</b><br>Area: %{x:.3f} µm²<br>Delay: %{y:.1f} ps<br>Power: %{customdata:.1f} µW<extra></extra>`,
        customdata: paretoPts.map((p) => p.powerUW),
      } as Data,
    ];

    const layout: Partial<Layout> = {
      autosize: true,
      margin: narrow ? { l: 46, r: 14, t: 24, b: 52 } : { l: 54, r: 24, t: 32, b: 56 },
      paper_bgcolor: plotSurfaceBg,
      plot_bgcolor: plotSurfaceBg,
      font: plotFont(palette.rgbAxisTitle),
      title: {
        text: plotlyBold("DeviceOpt — area vs delay (Pareto front)"),
        font: plotFont(palette.rgbAxisTitle),
      },
      showlegend: true,
      legend: narrow
        ? { orientation: "h", yanchor: "top", y: -0.28, xanchor: "center", x: 0.5, font: { ...axTick, size: 9 } }
        : { orientation: "v", yanchor: "top", y: 1, xanchor: "left", x: 1.02, font: axTick },
      xaxis: { ...frameX, automargin: true, gridcolor: palette.axisGridGreyRgb, title: axTitle("Area (µm²)"), tickfont: axTick },
      yaxis: { ...frameY, automargin: true, gridcolor: palette.axisGridBlackRgb, title: axTitle("Delay (ps)"), tickfont: axTick },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };
    return { data: traces, layout };
  }, [narrow, theme, plotSurfaceBg, scatterMarkerStroke, axTick, axTitle, hoverLabel, frameX, frameY, palette]);

  const deviceOptRef = usePlotlyChart(deviceOptData.data, deviceOptData.layout, commonConfig);

  /* ─── re-layout on narrow change ─── */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      for (const r of [timingChartRef, deviceOptRef]) {
        const el = r.current;
        if (el) void Plotly.Plots.resize(el);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [narrow, timingChartRef, deviceOptRef]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  Render                                                         */
  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ─── Card 1: Overview ─── */}
      <div className="chart-card">
        <h2>End-to-End Flow Overview</h2>
        <p className="hint" style={{ marginBottom: "0.35rem" }}>
          This page tracks the full standard-cell characterization flow: from <strong>layout generation</strong>{" "}
          (AutoCellGen-V2) through <strong>parasitic extraction</strong> (fastercap_v2) and{" "}
          <strong>timing characterization</strong> (libcharx) to <strong>device optimization</strong> (DeviceOpt).
        </p>
        <div className="flow-flowchart">
          <div className="flow-flowchart__step flow-step--done">
            <span className="flow-step__icon">📐</span>
            <span className="flow-step__label">Layout Gen</span>
            <span className="flow-step__sub">AutoCellGen</span>
          </div>
          <div className="flow-flowchart__arrow">→</div>
          <div className="flow-flowchart__step flow-step--done">
            <span className="flow-step__icon">⚡</span>
            <span className="flow-step__label">Parasitic Extr.</span>
            <span className="flow-step__sub">fastercap_v2</span>
          </div>
          <div className="flow-flowchart__arrow">→</div>
          <div className="flow-flowchart__step flow-step--done">
            <span className="flow-step__icon">⏱</span>
            <span className="flow-step__label">Timing Char.</span>
            <span className="flow-step__sub">libcharx</span>
          </div>
          <div className="flow-flowchart__arrow">→</div>
          <div className="flow-flowchart__step flow-step--done">
            <span className="flow-step__icon">🎯</span>
            <span className="flow-step__label">Device Opt.</span>
            <span className="flow-step__sub">DeviceOpt</span>
          </div>
        </div>
      </div>

      {/* ─── Card 2: Run Selector / Case Selector ─── */}
      <div className="chart-card">
        <h2>Run Selector / Case Selector</h2>
        <div className="flow-selector-grid">
          <label className="axis-picker">
            Design run
            <select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
              {FLOW_RUNS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Cell / case
            <select value={selectedCell} onChange={(e) => setSelectedCell(e.target.value)}>
              {FLOW_CASES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="flow-run-info">
            Status: <Badge status={selectedRun?.status ?? "pending"} />
            <span className="flow-run-date">{selectedRun?.createdAt}</span>
          </div>
        </div>
      </div>

      {/* ─── Card 3: Stage Timeline ─── */}
      <div className="chart-card">
        <h2>Stage Timeline</h2>
        <p className="hint">Progress: {stageCount} / {CURRENT_STAGES.length} stages completed</p>
        <div className="flow-timeline">
          {CURRENT_STAGES.map((s) => (
            <div key={s.id} className={`flow-timeline__item flow-timeline__item--${s.status}`}>
              <div className="flow-timeline__dot" />
              <div className="flow-timeline__body">
                <div className="flow-timeline__header">
                  <span className="flow-timeline__name">{s.name}</span>
                  <Badge status={s.status} />
                </div>
                <span className="flow-timeline__tool">{s.tool}</span>
                {s.duration !== "—" && <span className="flow-timeline__duration">{s.duration}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Card 4: AutoCellGen ─── */}
      <div className="chart-card">
        <h2>Layout Generation: AutoCellGen-V2</h2>
        <p className="hint">
          Standard-cell layout metrics for the selected run on Sky130 technology (12-track, 2.72 µm height).
          Cell width varies by drive strength and logic complexity.
        </p>
        <div className="analog-table-wrap">
          <table className="analog-table">
            <thead>
              <tr>
                <th>Cell</th>
                <th>Width (nm)</th>
                <th>Height (nm)</th>
                <th>Area (µm²)</th>
                <th>Utilization</th>
                <th>Transistors</th>
              </tr>
            </thead>
            <tbody>
              {LAYOUT_METRICS.map((m) => (
                <tr key={m.cellName}>
                  <td><code>{m.cellName}</code></td>
                  <td>{m.widthNm}</td>
                  <td>{m.heightNm}</td>
                  <td>{m.areaUm2.toFixed(2)}</td>
                  <td>{(m.utilization * 100).toFixed(0)}%</td>
                  <td>{m.transistorCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Card 5: fastercap_v2 ─── */}
      <div className="chart-card">
        <h2>Parasitic Extraction: fastercap_v2</h2>
        <p className="hint">
          Maxwell capacitance matrix results for the annotated layout. Total net capacitance includes
          coupling to adjacent nets and substrate.
        </p>
        <div className="analog-table-wrap">
          <table className="analog-table">
            <thead>
              <tr>
                <th>Net</th>
                <th>Total (fF)</th>
                <th>Coupling (fF)</th>
                <th>Substrate (fF)</th>
                <th>Coupling ratio</th>
              </tr>
            </thead>
            <tbody>
              {PEX_RESULTS.map((n) => (
                <tr key={n.net}>
                  <td><code>{n.net}</code></td>
                  <td>{n.cTotalFF.toFixed(2)}</td>
                  <td>{n.couplingFF.toFixed(2)}</td>
                  <td>{n.cSubFF.toFixed(2)}</td>
                  <td>{(n.couplingFF / n.cTotalFF * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Card 6: libcharx ─── */}
      <div className="chart-card">
        <h2>Timing Characterization: libcharx</h2>
        <p className="hint">
          Delay vs input transition sweep for <code>{selectedCell}</code> at multiple output loads.
          libcharx generates NLDM lookup tables for each cell in Liberty format.
        </p>
        <div className="plot-host">
          <div ref={timingChartRef} style={{ width: "100%", height: "100%" }} />
        </div>
        <p className="hint" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
          Select a different cell above to update the chart. Full timing tables (delay + output slew)
          are shown below.
        </p>
        <div className="analog-table-wrap" style={{ marginTop: "0.5rem" }}>
          <table className="analog-table">
            <thead>
              <tr>
                <th>Cell</th>
                <th>Input slew (ps)</th>
                <th>Output load (fF)</th>
                <th>Delay (ps)</th>
                <th>Output slew (ps)</th>
              </tr>
            </thead>
            <tbody>
              {TIMING_CHARS.filter((t) => t.cell === selectedCell).map((t, i) => (
                <tr key={i}>
                  <td><code>{t.cell}</code></td>
                  <td>{t.inputTransitionPs}</td>
                  <td>{t.outputLoadFF.toFixed(1)}</td>
                  <td>{t.delayPs.toFixed(1)}</td>
                  <td>{t.slewPs.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Card 7: DeviceOpt ─── */}
      <div className="chart-card">
        <h2>Device Optimization: DeviceOpt</h2>
        <p className="hint">
          Geometry sweep results for <code>{selectedCell}</code>. Orange points mark the Pareto-optimal
          frontier of area vs delay; each point corresponds to a (width, length) combination.
        </p>
        <div className="plot-host">
          <div ref={deviceOptRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* ─── Card 8: Artifact Table ─── */}
      <div className="chart-card">
        <h2>Artifact Table</h2>
        <p className="hint">
          Generated files for run <code>{selectedRunId}</code>, organized by flow stage.
        </p>
        <div className="analog-table-wrap">
          <table className="analog-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Tool</th>
                <th>Size</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {FLOW_ARTIFACTS.map((a, i) => (
                <tr key={i}>
                  <td><code>{a.name}</code></td>
                  <td>{a.tool}</td>
                  <td>{a.size}</td>
                  <td>{a.timestamp}</td>
                  <td><Badge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
