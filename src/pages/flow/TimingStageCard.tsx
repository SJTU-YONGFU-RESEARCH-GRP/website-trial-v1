import { useMemo } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { useTheme } from "../../theme/ThemeContext";
import {
  getChartPalette,
  plotInsetBackground,
  plotAxisFont,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlyHoverLabel,
  chartScatterMarkerStrokeRgb,
} from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { AlgorithmCellResult, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface TimingStageCardProps {
  results: AlgorithmCellResult[];
  algorithms: LayoutRoutingAlgorithm[];
  selectedCell: string;
}

export function TimingStageCard({
  results,
  algorithms,
  selectedCell,
}: TimingStageCardProps): JSX.Element {
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
    toImageButtonOptions: { format: "png", filename: "flow-timing-chart" },
  };

  const completed = results.filter((r) => r.timing);
  const algoColors = ["#0071e3", "#ff9f0a", "#30d158", "#bf5af2", "#ff375f"];

  const chartData = useMemo(() => {
    if (completed.length === 0) return null;

    const loadsSet = new Set<number>();
    completed.forEach((r) => r.timing!.rows.forEach((row) => loadsSet.add(row.outputLoadFF)));
    const loads = [...loadsSet].sort((a, b) => a - b);

    const delayTraces: Data[] = [];

    completed.forEach((r, ai) => {
      const algo = algorithms.find((a) => a.algorithmId === r.algorithmId);
      const color = algoColors[ai % algoColors.length];
      const tim = r.timing!;

      loads.forEach((load, li) => {
        const pts = tim.rows.filter((row) => row.outputLoadFF === load);
        if (pts.length === 0) return;
        const dash = li === 0 ? "solid" : li === 1 ? "dash" : "dot";
        delayTraces.push({
          type: "scatter",
          mode: "lines+markers",
          name: `${algo?.algorithmName ?? r.algorithmId} @ CL=${load}fF`,
          x: pts.map((p) => p.inputTransitionPs),
          y: pts.map((p) => p.delayPs),
          marker: {
            size: 7,
            color,
            line: { width: 1, color: scatterMarkerStroke },
            symbol: li === 0 ? "circle" : li === 1 ? "diamond" : "square",
          },
          line: {
            shape: "spline",
            color,
            width: 2,
            dash,
          },
          hovertemplate: `<b>${selectedCell}</b> ${algo?.algorithmName ?? r.algorithmId}<br>Input slew: %{x} ps<br>Delay: %{y:.1f} ps<extra></extra>`,
        } as unknown as Data);
      });
    });

    const layout: Partial<Layout> = {
      autosize: true,
      margin: narrow
        ? { l: 46, r: 14, t: 24, b: 52 }
        : { l: 54, r: 24, t: 32, b: 56 },
      paper_bgcolor: plotSurfaceBg,
      plot_bgcolor: plotSurfaceBg,
      font: plotFont(palette.rgbAxisTitle),
      title: {
        text: plotlyBold(`${selectedCell} — delay vs input slew (overlaid by algorithm)`),
        font: plotFont(palette.rgbAxisTitle),
      },
      showlegend: !narrow,
      legend: narrow
        ? {
            orientation: "h",
            yanchor: "top",
            y: -0.35,
            xanchor: "center",
            x: 0.5,
            font: { ...axTick, size: 8 },
            itemsizing: "constant",
          }
        : {
            orientation: "v",
            yanchor: "top",
            y: 1,
            xanchor: "left",
            x: 1.02,
            font: axTick,
          },
      xaxis: {
        ...frameX,
        automargin: true,
        gridcolor: palette.axisGridGreyRgb,
        title: axTitle("Input transition (ps)"),
        tickfont: axTick,
      },
      yaxis: {
        ...frameY,
        automargin: true,
        gridcolor: palette.axisGridBlackRgb,
        title: axTitle("Delay (ps)"),
        tickfont: axTick,
      },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };

    return { data: delayTraces, layout };
  }, [completed, algorithms, selectedCell, narrow, palette, plotSurfaceBg, axTick, axTitle, hoverLabel, frameX, frameY, scatterMarkerStroke]);

  const chartRef = usePlotlyChart(
    chartData?.data ?? [],
    chartData?.layout ?? {},
    commonConfig,
  );

  return (
    <div className="chart-card">
      <h2>Timing Characterization: libcharx</h2>
      <p className="hint">
        libcharx generates NLDM lookup tables. Charts overlay delay vs input
        transition curves across algorithms. <code>{selectedCell}</code>
      </p>

      {completed.length === 0 ? (
        <EmptyState message="No timing data for this cell" icon="⏱" />
      ) : (
        <>
          <div className="plot-host">
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
          </div>

          {/* Combined timing table */}
          <div className="analog-table-wrap" style={{ marginTop: "0.5rem" }}>
            <table className="analog-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Input slew (ps)</th>
                  <th>Output load (fF)</th>
                  <th>Delay (ps)</th>
                  <th>Output slew (ps)</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((r) => {
                  const algo = algorithms.find((a) => a.algorithmId === r.algorithmId);
                  return r.timing!.rows.map((row, i) => (
                    <tr key={`${r.algorithmId}-${i}`}>
                      <td><code>{algo?.algorithmName ?? r.algorithmId}</code></td>
                      <td>{row.inputTransitionPs}</td>
                      <td>{row.outputLoadFF.toFixed(1)}</td>
                      <td>{row.delayPs.toFixed(1)}</td>
                      <td>{row.slewPs.toFixed(1)}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* Geomean delay summary */}
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {completed.map((r) => {
              const algo = algorithms.find((a) => a.algorithmId === r.algorithmId);
              return (
                <div key={r.algorithmId} className="flow-pex-quality__item flow-pex-quality__item--pass" style={{ padding: "0.3rem 0.6rem" }}>
                  <strong>{algo?.algorithmName ?? r.algorithmId}</strong>:
                  {" "}GM delay = {r.timing!.geomeanDelayPs.toFixed(1)} ps
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
