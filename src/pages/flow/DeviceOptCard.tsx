import { useMemo, useState } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { useTheme } from "../../theme/ThemeContext";
import { getChartPalette, plotInsetBackground, plotAxisFont, plotFont, plotlyAxisFrameX, plotlyAxisFrameY, plotlyBold, plotlyHoverLabel } from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { DeviceOptData } from "../../data/toolFlowTypes";
import { DEMO_PROVENANCE_LABEL } from "../../data/toolFlowTypes";

interface Props { deviceOpt: DeviceOptData; }

type ViewMode = "2d_cap_res" | "2d_cap_del" | "2d_res_del" | "3d";

const MODE_LABELS: Record<ViewMode, string> = {
  "2d_cap_res": "C vs R", "2d_cap_del": "C vs Delay", "2d_res_del": "R vs Delay", "3d": "3D Frontier",
};

export function DeviceOptCard({ deviceOpt }: Props): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const bg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  const [mode, setMode] = useState<ViewMode>("2d_cap_del");
  const [xKey, setXKey] = useState<"capacitanceFF"|"resistanceOhm"|"timingPs">("capacitanceFF");
  const [yKey, setYKey] = useState<"capacitanceFF"|"resistanceOhm"|"timingPs"|"powerUW">("timingPs");

  const sols = deviceOpt.solutions;
  const paretoIds = new Set(sols.filter((s) => s.paretoFront).map((s) => s.solutionId));

  const chartData = useMemo(() => {
    if (sols.length === 0) return null;

    const nonPareto = sols.filter((s) => !s.paretoFront);
    const paretoSols = sols.filter((s) => s.paretoFront);

    const xVals = (a: typeof sols) => a.map((s) => s[xKey]);
    const yVals = (a: typeof sols) => a.map((s) => s[yKey]);
    const zVals = (a: typeof sols) => {
      const zKey = (["capacitanceFF", "resistanceOhm", "timingPs", "powerUW"] as const).find((k) => k !== xKey && k !== yKey) ?? "powerUW";
      return a.map((s) => s[zKey]);
    };

    const traces: Data[] = [];

    if (mode === "3d") {
      traces.push({
        type: "scatter3d", mode: "markers",
        name: "Dominated",
        x: xVals(nonPareto), y: yVals(nonPareto), z: zVals(nonPareto),
        marker: { color: "#94a3b8", size: 4, opacity: 0.6 },
        text: nonPareto.map((s) => `${s.solutionId} (${s.meta})`),
        hovertemplate: "%{text}<br>Hsep=%{x:.0f} Tsp_drain=%{y:.0f}<br>%{z.name}=%{z:.2f}<extra></extra>",
      } as unknown as Data);
      traces.push({
        type: "scatter3d", mode: "markers",
        name: "Pareto-optimal",
        x: xVals(paretoSols), y: yVals(paretoSols), z: zVals(paretoSols),
        marker: { color: "#ff9f0a", size: 8, line: { color: "#000", width: 1 } },
        text: paretoSols.map((s) => `${s.solutionId} (${s.meta})`),
        hovertemplate: "%{text}<br>Hsep=%{x:.0f}<extra></extra>",
      } as unknown as Data);
    } else {
      traces.push({
        type: "scatter", mode: "markers",
        name: "Dominated",
        x: xVals(nonPareto), y: yVals(nonPareto),
        marker: { color: "#94a3b8", size: 8, opacity: 0.6 },
        text: nonPareto.map((s) => s.solutionId),
        hovertemplate: "%{text} (%{x:.2f}, %{y:.2f})<extra></extra>",
      } as unknown as Data);
      traces.push({
        type: "scatter", mode: "markers",
        name: "Pareto-optimal",
        x: xVals(paretoSols), y: yVals(paretoSols),
        marker: { color: "#ff9f0a", size: 11, line: { color: "#000", width: 1 } },
        text: paretoSols.map((s) => s.solutionId),
        hovertemplate: "%{text} (%{x:.2f}, %{y:.2f})<extra></extra>",
      } as unknown as Data);
    }

    const layout: Partial<Layout> = {
      autosize: true,
      margin: narrow ? { l: 52, r: 16, t: 36, b: 48 } : { l: 60, r: 24, t: 40, b: 52 },
      paper_bgcolor: bg, plot_bgcolor: bg,
      font: plotFont(palette.rgbAxisTitle),
      title: { text: plotlyBold(`DeviceOpt — Pareto Frontier (${MODE_LABELS[mode]})`), font: plotFont(palette.rgbAxisTitle) },
      showlegend: true,
      legend: narrow ? { orientation:"h", y: -0.3 } : { orientation:"v", x: 1.02 },
      hovermode: "closest", hoverlabel: hoverLabel,
    };

    if (mode === "3d") {
      (layout as any).scene = {
        xaxis: { title: xKey, gridcolor: palette.axisGridGreyRgb },
        yaxis: { title: yKey, gridcolor: palette.axisGridGreyRgb },
        zaxis: { title: "3rd obj", gridcolor: palette.axisGridGreyRgb },
        bgcolor: bg,
      };
    } else {
      layout.xaxis = { ...frameX, title: { text: xKey, font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick };
      layout.yaxis = { ...frameY, title: { text: yKey, font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick, gridcolor: palette.axisGridGreyRgb };
    }

    return { data: traces, layout };
  }, [sols, mode, xKey, yKey, narrow, palette, bg, axTick, hoverLabel, frameX, frameY]);

  const chartRef = usePlotlyChart(chartData?.data ?? [], chartData?.layout ?? {}, { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>);

  // Parameter table
  const params = ["Hsep","Tsp_drain","Hbot","Tsp_psource","Tsp_nsource","FP","GXT","gate_length"] as const;

  return (
    <div className="chart-card">
      <h2>Upstream Device Optimization: DeviceOpt</h2>
      <p className="hint">
        CFET device geometry sweep across {sols.length} solutions. Pareto optimality is computed programmatically (non-dominated set
        for minimizing C, R, delay). {paretoIds.size}/{sols.length} solutions on Pareto front.
        {DEMO_PROVENANCE_LABEL}
      </p>

      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.5rem"}}>
        <label className="axis-picker" style={{display:"inline-flex",alignItems:"center",gap:"0.3rem"}}>
          View: <select value={mode} onChange={(e) => setMode(e.target.value as ViewMode)}>
            {Object.entries(MODE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="axis-picker" style={{display:"inline-flex",alignItems:"center",gap:"0.3rem"}}>
          X: <select value={xKey} onChange={(e) => setXKey(e.target.value as any)}>
            {(["capacitanceFF","resistanceOhm","timingPs","powerUW"] as const).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="axis-picker" style={{display:"inline-flex",alignItems:"center",gap:"0.3rem"}}>
          Y: <select value={yKey} onChange={(e) => setYKey(e.target.value as any)}>
            {(["capacitanceFF","resistanceOhm","timingPs","powerUW"] as const).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      </div>

      {chartData && (
        <div className="plot-host plot-host--tall">
          <div ref={chartRef} style={{ width:"100%", height:"100%" }} />
        </div>
      )}

      {/* Pareto solutions detail table */}
      <div className="analog-table-wrap" style={{marginTop:"0.5rem"}}>
        <table className="analog-table">
          <thead>
            <tr>
              <th>ID</th><th>Meta</th>
              {params.map((p) => <th key={p}>{p}</th>)}
              <th>C (fF)</th><th>R (Ω)</th><th>Delay (ps)</th><th>Power (µW)</th><th>Reward</th><th>Pareto</th>
            </tr>
          </thead>
          <tbody>
            {sols.map((s) => (
              <tr key={s.solutionId} style={{fontWeight: s.paretoFront ? 700 : 400, opacity: s.paretoFront ? 1 : 0.7}}>
                <td><code>{s.solutionId}</code></td>
                <td>{s.meta}</td>
                {params.map((p) => <td key={p}>{s[p]}</td>)}
                <td>{s.capacitanceFF}</td>
                <td>{s.resistanceOhm}</td>
                <td>{s.timingPs}</td>
                <td>{s.powerUW}</td>
                <td>{s.reward.toFixed(4)}</td>
                <td>{s.paretoFront ? "✓ Pareto" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
