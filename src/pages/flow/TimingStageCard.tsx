import { useMemo } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { useTheme } from "../../theme/ThemeContext";
import { getChartPalette, plotInsetBackground, plotAxisFont, plotFont, plotlyAxisFrameX, plotlyAxisFrameY, plotlyBold, plotlyHoverLabel } from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { CellBenchmarkResult, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";
import { findAlgoResult, deltaPct, commonCompletedCells } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface Props {
  cellResult: CellBenchmarkResult | null;
  algorithms: LayoutRoutingAlgorithm[];
  baselineAlgoId: string;
  compareAlgoId: string;
  cellResults: CellBenchmarkResult[];
}

export function TimingStageCard({ cellResult, algorithms, baselineAlgoId, compareAlgoId, cellResults }: Props): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const bg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  const baselineR = cellResult ? findAlgoResult(cellResult, baselineAlgoId) : null;
  const compareR = cellResult && compareAlgoId ? findAlgoResult(cellResult, compareAlgoId) : null;
  const blTim = baselineR?.timing ?? null;
  const cpTim = compareR?.timing ?? null;
  const baselineAlgo = algorithms.find((a) => a.algorithmId === baselineAlgoId);
  const compareAlgo = algorithms.find((a) => a.algorithmId === compareAlgoId);

  // Common-cell library geomean
  const libraryStats = useMemo(() => {
    const common = commonCompletedCells(cellResults, baselineAlgoId, compareAlgoId);
    let bSum = 0, cSum = 0, count = 0;
    for (const cell of common) {
      const br = findAlgoResult(cell, baselineAlgoId);
      const cr = findAlgoResult(cell, compareAlgoId);
      if (br?.timing && cr?.timing) { bSum += Math.log(br.timing.geomeanDelayPs); cSum += Math.log(cr.timing.geomeanDelayPs); count++; }
    }
    return { commonCount: common.length, libGeoB: bSum>0?+Math.exp(bSum/count).toFixed(2):0, libGeoC: cSum>0?+Math.exp(cSum/count).toFixed(2):0 };
  }, [cellResults, baselineAlgoId, compareAlgoId]);

  // Per-arc Δ% table
  const arcDeltas = useMemo(() => {
    if (!blTim || !cpTim) return [];
    // Group by input transition
    const uniqueSlews = [...new Set(blTim.rows.map((r) => r.inputTransitionPs))].sort((a,b)=>a-b);
    return uniqueSlews.map((slew) => {
      const bRows = blTim.rows.filter((r) => r.inputTransitionPs === slew);
      const loadAvg = (_d: number) => {
        const loads = bRows.map((r) => r.outputLoadFF);
        const avgB = loads.reduce((s,l)=>{const br=bRows.find(r=>r.outputLoadFF===l);return s+(br?.delayPs??0);},0)/loads.length;
        return avgB;
      };
      return { slewPs: slew, blAvgDelay: +loadAvg(0).toFixed(1), cpAvgDelay: +loadAvg(1).toFixed(1) };
    });
  }, [blTim, cpTim]);

  // Delay scatter: comparison of delay across the full slew/load grid
  const chartData = useMemo(() => {
    if (!blTim) return null;
    const traces: Data[] = [];
    if (blTim.rows.length > 0) {
      const loads = [...new Set(blTim.rows.map((r) => r.outputLoadFF))].sort((a,b)=>a-b);
      const bName = baselineAlgo?.algorithmName ?? baselineAlgoId;
      const cName = compareAlgo?.algorithmName ?? compareAlgoId;
      const bByLoad = loads.map((lf) => blTim.rows.filter((r) => r.outputLoadFF === lf).map((r) => r.delayPs));
      const cByLoad = loads.map((lf) => cpTim?.rows.filter((r) => r.outputLoadFF === lf).map((r) => r.delayPs) ?? []);

      traces.push({
        type: "scatter", mode: "lines+markers",
        name: `${bName} (${blTim.cellName})`,
        x: loads, y: bByLoad.map((arr) => arr.reduce((s,v)=>s+v,0)/arr.length),
        line: { color: "#0071e3" }, marker: { size: 8 },
        hovertemplate: `<b>${bName}</b><br>Load: %{x} fF<br>Delay: %{y:.1f} ps<extra></extra>`,
      } as unknown as Data);

      if (cpTim && cByLoad.some((a) => a.length > 0)) {
        traces.push({
          type: "scatter", mode: "lines+markers",
          name: `${cName} (${cpTim.cellName})`,
          x: loads, y: cByLoad.map((arr) => arr.length > 0 ? arr.reduce((s,v)=>s+v,0)/arr.length : null),
          line: { color: "#ff9f0a" }, marker: { size: 8 },
          hovertemplate: `<b>${cName}</b><br>Load: %{x} fF<br>Delay: %{y:.1f} ps<extra></extra>`,
        } as unknown as Data);
      }
    }

    const layout: Partial<Layout> = {
      autosize: true, margin: narrow ? { l: 52, r: 16, t: 36, b: 48 } : { l: 60, r: 24, t: 40, b: 52 },
      paper_bgcolor: bg, plot_bgcolor: bg,
      font: plotFont(palette.rgbAxisTitle),
      title: { text: plotlyBold(`Delay vs. Load — ${blTim.cellName}`), font: plotFont(palette.rgbAxisTitle) },
      xaxis: { ...frameX, title: { text: "Output Load (fF)", font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick, type: "log" },
      yaxis: { ...frameY, title: { text: "Delay (ps)", font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick, gridcolor: palette.axisGridGreyRgb },
      showlegend: true, legend: narrow ? { orientation:"h", y: -0.3 } : { orientation:"v", x: 1.02 },
      hovermode: "closest", hoverlabel: hoverLabel,
    };
    return { data: traces, layout };
  }, [blTim, cpTim, narrow, palette, bg, axTick, hoverLabel, frameX, frameY, baselineAlgo, compareAlgo]);

  const chartRef = usePlotlyChart(chartData?.data ?? [], chartData?.layout ?? {}, { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>);

  return (
    <div className="chart-card">
      <h2>Timing Characterization: libcharx</h2>
      <p className="hint">
        Delay overlay for same pin arc across algorithms. Per-arc Δ% and common-cell library stats.
        {libraryStats.commonCount > 0 && <> Common-cell library geo-mean: baseline {libraryStats.libGeoB} ps, compare {libraryStats.libGeoC} ps (Δ = {deltaPct(libraryStats.libGeoC, libraryStats.libGeoB)?.toFixed(1)}%).</>}
      </p>
      {!blTim ? (
        <EmptyState message="No timing data for this cell" icon="⏱" />
      ) : (
        <>
          {chartData && (
            <div className="plot-host plot-host--short">
              <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
            </div>
          )}

          {/* Per-cell geo-mean Δ% */}
          <div style={{marginTop:"0.5rem",padding:"0.5rem 0.75rem",background:"var(--surface2,#f0f4f8)",borderRadius:"6px"}}>
            <strong>{cellResult?.cellName ?? "—"}:</strong>{" "}
            Baseline geo-mean = {blTim.geomeanDelayPs} ps
            {cpTim && <> | Compare geo-mean = {cpTim.geomeanDelayPs} ps | Δ% = {deltaPct(cpTim.geomeanDelayPs, blTim.geomeanDelayPs)?.toFixed(1)}%</>}
          </div>

          {/* Per-arc table */}
          {arcDeltas.length > 0 && (
            <div className="analog-table-wrap" style={{marginTop:"0.5rem"}}>
              <table className="analog-table">
                <thead><tr><th>Input Slew (ps)</th><th>Baseline Avg Delay (ps)</th><th>Compare Avg Delay (ps)</th><th>Δ%</th></tr></thead>
                <tbody>
                  {arcDeltas.map((a) => (
                    <tr key={a.slewPs}><td>{a.slewPs}</td><td>{a.blAvgDelay}</td><td>{a.cpAvgDelay}</td><td>{deltaPct(a.cpAvgDelay, a.blAvgDelay)?.toFixed(1)}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
