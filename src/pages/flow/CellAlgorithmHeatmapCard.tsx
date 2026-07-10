import { useMemo, useState } from "react";
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
import type { CellBenchmarkResult, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";

interface CellAlgorithmHeatmapCardProps {
  cellResults: CellBenchmarkResult[];
  algorithms: LayoutRoutingAlgorithm[];
}

type Metric = "areaUm2" | "delayPs" | "capFF";

const METRICS: { key: Metric; label: string }[] = [
  { key: "areaUm2", label: "Area (µm²)" },
  { key: "delayPs", label: "Geo. Delay (ps)" },
  { key: "capFF", label: "Avg Cap (fF)" },
];

function cellMetric(cr: CellBenchmarkResult, algoId: string, metric: Metric): number | null {
  const ar = cr.algorithmResults.find((a) => a.algorithmId === algoId);
  if (!ar || ar.status === "failed") return null;
  if (metric === "areaUm2") return ar.layout?.areaUm2 ?? null;
  if (metric === "delayPs") return ar.timing?.geomeanDelayPs ?? null;
  return ar.parasitics
    ? +(ar.parasitics.netCaps.reduce((s, n) => s + n.cTotalFF, 0) / ar.parasitics.netCaps.length).toFixed(1)
    : null;
}

export function CellAlgorithmHeatmapCard({
  cellResults,
  algorithms,
}: CellAlgorithmHeatmapCardProps): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const plotSurfaceBg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  const [selectedMetric, setSelectedMetric] = useState<Metric>("areaUm2");

  const chartData = useMemo(() => {
    if (cellResults.length === 0 || algorithms.length === 0) return null;

    const algoIds = algorithms.map((a) => a.algorithmId);
    const cellNames = cellResults.map((c) => c.cellName);

    const z = cellResults.map((cr) =>
      algoIds.map((aid) => {
        const v = cellMetric(cr, aid, selectedMetric);
        return v !== null ? v : null;
      }),
    );

    const trace: Data = {
      type: "heatmap",
      z,
      x: algoIds.map((aid) => algorithms.find((a) => a.algorithmId === aid)?.algorithmName ?? aid),
      y: cellNames,
      colorscale: "Viridis",
      hovertemplate: "Cell: %{y}<br>Algo: %{x}<br>Value: %{z}<extra></extra>",
    } as unknown as Data;

    const layout: Partial<Layout> = {
      autosize: true,
      margin: narrow
        ? { l: 64, r: 12, t: 44, b: 44 }
        : { l: 80, r: 20, t: 52, b: 56 },
      paper_bgcolor: plotSurfaceBg,
      plot_bgcolor: plotSurfaceBg,
      font: plotFont(palette.rgbAxisTitle),
      title: {
        text: plotlyBold(`Cell × Algorithm — ${METRICS.find((m) => m.key === selectedMetric)?.label}`),
        font: plotFont(palette.rgbAxisTitle),
      },
      xaxis: {
        ...frameX,
        automargin: true,
        tickfont: axTick,
        side: "bottom",
      },
      yaxis: {
        ...frameY,
        automargin: true,
        tickfont: axTick,
        autorange: "reversed",
      },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };

    return { data: [trace], layout };
  }, [cellResults, algorithms, selectedMetric, narrow, palette, plotSurfaceBg, axTick, hoverLabel, frameX, frameY]);

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
      <h2>Cell × Algorithm Heatmap</h2>
      <p className="hint">
        Per-cell metric values across algorithms. Darker = higher magnitude.
      </p>
      <div style={{ marginBottom: "0.5rem" }}>
        <label className="axis-picker" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          Metric:
          <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value as Metric)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
      </div>
      {chartData ? (
        <div className="plot-host plot-host--short">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      ) : (
        <p className="hint" style={{ padding: "1rem 0" }}>No data for heatmap.</p>
      )}
    </div>
  );
}
