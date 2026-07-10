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
} from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { LibraryAlgorithmSummary, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";

interface LibrarySummaryCardProps {
  summaries: LibraryAlgorithmSummary[];
  algorithms: LayoutRoutingAlgorithm[];
}

const METRICS: { key: keyof LibraryAlgorithmSummary; label: string; unit: string; scale: number }[] = [
  { key: "successRate", label: "Success Rate", unit: "%", scale: 100 },
  { key: "totalAreaUm2", label: "Total Area", unit: "µm²", scale: 1 },
  { key: "geomeanDelayPs", label: "Geo. Mean Delay", unit: "ps", scale: 1 },
  { key: "avgOutputCapFF", label: "Avg Output Cap", unit: "fF", scale: 1 },
  { key: "totalRuntimeSec", label: "Total Runtime", unit: "s", scale: 1 },
];

export function LibrarySummaryCard({
  summaries,
  algorithms,
}: LibrarySummaryCardProps): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const plotSurfaceBg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const axTitle = (label: string) => ({
    text: label,
    font: plotAxisFont(palette.rgbAxisTitle, narrow),
    standoff: narrow ? 10 : 14,
  });
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  const algoColors = ["#0071e3", "#ff9f0a"];

  const chartData = useMemo(() => {
    if (summaries.length === 0) return null;

    const traces: Data[] = summaries.map((s, i) => {
      const values = METRICS.map((m) => +(s[m.key] as number * m.scale).toFixed(1));
      return {
        type: "bar",
        name: algorithms.find((a) => a.algorithmId === s.algorithmId)?.algorithmName ?? s.algorithmId,
        x: METRICS.map((m) => m.label),
        y: values,
        marker: { color: algoColors[i % algoColors.length] },
        text: values.map((v) => `${v}`),
        textposition: "outside",
        hovertemplate: `%{fullData.name}<br>%{x}: %{y}<extra></extra>`,
      } as unknown as Data;
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
        text: plotlyBold("Library-Level Algorithm Comparison"),
        font: plotFont(palette.rgbAxisTitle),
      },
      barmode: "group",
      showlegend: true,
      legend: narrow
        ? { orientation: "h", yanchor: "top", y: -0.28, xanchor: "center", x: 0.5, font: { ...axTick, size: 9 } }
        : { orientation: "v", yanchor: "top", y: 1, xanchor: "left", x: 1.02, font: axTick },
      xaxis: {
        ...frameX,
        automargin: true,
        tickfont: axTick,
        title: axTitle("Metric"),
      },
      yaxis: {
        ...frameY,
        automargin: true,
        gridcolor: palette.axisGridGreyRgb,
        tickfont: axTick,
      },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };

    return { data: traces, layout };
  }, [summaries, algorithms, narrow, palette, plotSurfaceBg, axTick, axTitle, hoverLabel, frameX, frameY]);

  const chartRef = usePlotlyChart(
    chartData?.data ?? [],
    chartData?.layout ?? {},
    {
      responsive: true,
      displayModeBar: false,
      displaylogo: false,
      doubleClick: "reset",
    } satisfies Partial<Config>,
  );

  return (
    <div className="chart-card">
      <h2>Library Summary</h2>
      <p className="hint">
        Grouped bar chart comparing algorithm performance across all library metrics.
      </p>
      {chartData ? (
        <div className="plot-host plot-host--short">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      ) : (
        <p className="hint" style={{ padding: "1rem 0" }}>No summary data available.</p>
      )}
    </div>
  );
}
