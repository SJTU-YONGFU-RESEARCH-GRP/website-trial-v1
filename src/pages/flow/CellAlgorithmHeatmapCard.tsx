import { useMemo, useState } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { useTheme } from "../../theme/ThemeContext";
import { getChartPalette, plotInsetBackground, plotAxisFont, plotFont, plotlyAxisFrameX, plotlyAxisFrameY, plotlyBold, plotlyHoverLabel } from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { CellBenchmarkResult, LayoutRoutingAlgorithm, CellClass } from "../../data/toolFlowTypes";
import { findAlgoResult, commonCompletedCells, deltaPct } from "../../data/toolFlowTypes";

interface Props {
  cellResults: CellBenchmarkResult[];
  algorithms: LayoutRoutingAlgorithm[];
  baselineAlgoId: string;
  compareAlgoId: string;
  cellClassFilter: CellClass | "all";
}

type Metric = "area" | "delay" | "cap" | "runtime" | "success";

const METRICS: { key: Metric; label: string; lowerIsBetter: boolean }[] = [
  { key: "area", label: "Area Δ%", lowerIsBetter: true },
  { key: "delay", label: "Delay Δ%", lowerIsBetter: true },
  { key: "cap", label: "Cap Δ%", lowerIsBetter: true },
  { key: "runtime", label: "Runtime Δ%", lowerIsBetter: true },
  { key: "success", label: "Success", lowerIsBetter: false },
];

function cellMetricDelta(cr: CellBenchmarkResult, baselineId: string, compareId: string, metric: Metric): number | null {
  const br = findAlgoResult(cr, baselineId);
  const cr2 = findAlgoResult(cr, compareId);
  if (metric === "success") return (cr2?.status === "completed" ? 1 : 0) - (br?.status === "completed" ? 1 : 0);
  if (!br || !cr2) return null;
  if (br.status === "failed" || cr2.status === "failed") return null;
  if (metric === "area") {
    if (!br.layout || !cr2.layout) return null;
    return deltaPct(cr2.layout.areaGrid2, br.layout.areaGrid2);
  }
  if (metric === "delay") {
    if (!br.timing || !cr2.timing) return null;
    return deltaPct(cr2.timing.geomeanDelayPs, br.timing.geomeanDelayPs);
  }
  if (metric === "cap") {
    if (!br.parasitics || !cr2.parasitics) return null;
    const bAvg = br.parasitics.netCaps.reduce((s,n)=>s+n.cSelfFF,0)/br.parasitics.netCaps.length;
    const cAvg = cr2.parasitics.netCaps.reduce((s,n)=>s+n.cSelfFF,0)/cr2.parasitics.netCaps.length;
    return deltaPct(cAvg, bAvg);
  }
  if (metric === "runtime") {
    if (!br.layout || !cr2.layout) return null;
    return deltaPct(cr2.layout.runtimeSec, br.layout.runtimeSec);
  }
  return null;
}

export function CellAlgorithmHeatmapCard({ cellResults, algorithms, baselineAlgoId, compareAlgoId, cellClassFilter }: Props): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const bg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);
  const [metric, setMetric] = useState<Metric>("delay");

  const filtered = useMemo(() => {
    if (cellClassFilter === "all") return cellResults;
    return cellResults.filter((c) => c.cellClass === cellClassFilter);
  }, [cellResults, cellClassFilter]);

  const commonNames = useMemo(() => {
    const common = commonCompletedCells(filtered, baselineAlgoId, compareAlgoId);
    return new Set(common.map((c) => c.cellName));
  }, [filtered, baselineAlgoId, compareAlgoId]);

  const chartData = useMemo(() => {
    if (!compareAlgoId || filtered.length === 0) return null;
    const cells = filtered;
    const cellNames = cells.map((c) => c.cellName);
    const algoLabel = algorithms.find((a) => a.algorithmId === compareAlgoId)?.algorithmName ?? compareAlgoId;
    const z = [cells.map((cr) => cellMetricDelta(cr, baselineAlgoId, compareAlgoId, metric))];

    // Custom colorscale: diverging green→gray→red, centered at 0
    const trace: Data = {
      type: "heatmap",
      z,
      x: cellNames,
      y: ["Δ%"],
      colorscale: [
        [0, "#22c55e"],     // green (improvement)
        [0.3, "#a3e635"],
        [0.5, "#6b7280"],   // gray (neutral)
        [0.7, "#f87171"],
        [1, "#ef4444"],     // red (regression)
      ],
      zmin: -20,
      zmax: 20,
      zauto: false,
      hovertemplate: "Cell: %{x}<br>Δ%: %{z:.1f}%<br>Marker: %{customdata}<extra></extra>",
      customdata: cells.map((cr) => {
        const br = findAlgoResult(cr, baselineAlgoId);
        const cr2 = findAlgoResult(cr, compareAlgoId);
        const common = commonNames.has(cr.cellName) ? "" : " (not common)";
        if (br?.status === "failed") return `Baseline FAIL${common}`;
        if (cr2?.status === "failed") return `Compare FAIL${common}`;
        return `OK${common}`;
      }),
    } as unknown as Data;

    const titleText = `Δ% Heatmap — ${algoLabel} vs Baseline (${metric})`;
    const layout: Partial<Layout> = {
      autosize: true,
      margin: narrow ? { l: 64, r: 12, t: 44, b: 80 } : { l: 80, r: 20, t: 52, b: 80 },
      paper_bgcolor: bg, plot_bgcolor: bg,
      font: plotFont(palette.rgbAxisTitle),
      title: { text: plotlyBold(titleText), font: plotFont(palette.rgbAxisTitle) },
      xaxis: { ...frameX, automargin: true, tickfont: axTick, side: "bottom", tickangle: -45 },
      yaxis: { ...frameY, automargin: true, tickfont: axTick },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };
    return { data: [trace], layout };
  }, [filtered, algorithms, compareAlgoId, baselineAlgoId, metric, narrow, palette, bg, axTick, hoverLabel, frameX, frameY, commonNames]);

  const chartRef = usePlotlyChart(chartData?.data ?? [], chartData?.layout ?? {}, {
    responsive: true, displayModeBar: false, displaylogo: false, doubleClick: "reset",
  } satisfies Partial<Config>);

  return (
    <div className="chart-card">
      <h2>Cell × Algorithm Δ% Heatmap</h2>
      <p className="hint">
        <span style={{color:"#22c55e"}}>Green</span> = improvement,{" "}
        <span style={{color:"#ef4444"}}>red</span> = regression,{" "}
        <span style={{color:"#6b7280"}}>gray</span> = neutral, missing = not in common intersection.
        All Δ% computed relative to baseline. Only common-cell intersection cells shown with valid data.
      </p>
      <div style={{marginBottom:"0.5rem",display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center"}}>
        <label className="axis-picker" style={{display:"inline-flex",alignItems:"center",gap:"0.4rem"}}>
          Metric:
          <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
            {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
        <span className="hint" style={{fontSize:"0.8rem"}}>
          Common cells: {commonNames.size}/{filtered.length}
        </span>
      </div>
      {!compareAlgoId ? (
        <p className="hint" style={{padding:"1rem 0"}}>Select a comparison algorithm to view the heatmap.</p>
      ) : chartData ? (
        <div className="plot-host plot-host--short">
          <div ref={chartRef} style={{width:"100%",height:"100%"}} />
        </div>
      ) : (
        <p className="hint" style={{padding:"1rem 0"}}>No data for heatmap.</p>
      )}
    </div>
  );
}
