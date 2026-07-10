import { useMemo } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { useTheme } from "../../theme/ThemeContext";
import {
  getChartPalette,
  plotInsetBackground,
  plotAxisFont,
  plotFont,
  plotlyBold,
  plotlyHoverLabel,
} from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { DeviceOptData } from "../../data/toolFlowTypes";
import { Badge } from "./Badge";
import { EmptyState } from "./EmptyState";

interface DeviceOptCardProps {
  deviceOpt: DeviceOptData | null;
}

export function DeviceOptCard({ deviceOpt }: DeviceOptCardProps): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const plotSurfaceBg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const axTitle = (label: string) => ({
    text: label,
    font: plotAxisFont(palette.rgbAxisTitle, narrow),
    standoff: narrow ? 12 : 16,
  });
  const hoverLabel = plotlyHoverLabel(palette, narrow);

  const chartData = useMemo(() => {
    if (!deviceOpt) return null;

    const paretoPts = deviceOpt.solutions.filter((s) => s.paretoFront);
    const nonParetoPts = deviceOpt.solutions.filter((s) => !s.paretoFront);

    const traces: Data[] = [
      {
        type: "scatter3d",
        mode: "markers",
        name: "Swept points",
        x: nonParetoPts.map((s) => s.tinPs),
        y: nonParetoPts.map((s) => s.tsPs),
        z: nonParetoPts.map((s) => s.toutPs),
        marker: {
          size: 5,
          color: palette.axisGridBlackRgb,
          opacity: 0.45,
          line: { width: 0.5, color: palette.axisValueLabelRgb },
        },
        hovertemplate:
          `<b>%{text}</b><br>` +
          `tin: %{x} ps<br>ts: %{y} ps<br>tout: %{z} ps<br>` +
          `reward: %{customdata[0]:.2f}<extra></extra>`,
        text: nonParetoPts.map((s) => s.solutionId),
        customdata: nonParetoPts.map((s) => [s.reward]),
      } as unknown as Data,
      {
        type: "scatter3d",
        mode: "markers+lines",
        name: "Pareto front",
        x: paretoPts.map((s) => s.tinPs),
        y: paretoPts.map((s) => s.tsPs),
        z: paretoPts.map((s) => s.toutPs),
        marker: {
          size: 8,
          color: "#ff9f0a",
          line: { width: 1.5, color: "#ffffff" },
        },
        line: {
          color: "#ff9f0a",
          width: 3,
          dash: "dot",
        },
        hovertemplate:
          `<b>%{text}</b><br>` +
          `tin: %{x} ps<br>ts: %{y} ps<br>tout: %{z} ps<br>` +
          `reward: %{customdata[0]:.2f}<br>` +
          `W/L/F: %{customdata[1]}<extra></extra>`,
        text: paretoPts.map((s) => s.solutionId),
        customdata: paretoPts.map((s) => [
          s.reward,
          `${s.parameters.widthUm}/${s.parameters.lengthNm}/${s.parameters.fingers}`,
        ]),
      } as unknown as Data,
    ];

    const sceneLayout: Partial<Layout> = {
      autosize: true,
      margin: { l: 0, r: 0, t: 28, b: 0 },
      paper_bgcolor: plotSurfaceBg,
      font: plotFont(palette.rgbAxisTitle),
      title: {
        text: plotlyBold(
          `DeviceOpt — 3D Pareto (tin×ts×tout) — ${deviceOpt.cellName}`,
        ),
        font: plotFont(palette.rgbAxisTitle),
      },
      showlegend: true,
      legend: narrow
        ? {
            orientation: "h",
            yanchor: "top",
            y: -0.1,
            xanchor: "center",
            x: 0.5,
            font: { ...axTick, size: 9 },
          }
        : {
            orientation: "v",
            yanchor: "top",
            y: 1,
            xanchor: "left",
            x: 1.02,
            font: axTick,
          },
      scene: {
        xaxis: {
          title: axTitle("tin (ps)"),
          gridcolor: palette.axisGridGreyRgb,
          tickfont: axTick,
        },
        yaxis: {
          title: axTitle("ts (ps)"),
          gridcolor: palette.axisGridGreyRgb,
          tickfont: axTick,
        },
        zaxis: {
          title: axTitle("tout (ps)"),
          gridcolor: palette.axisGridGreyRgb,
          tickfont: axTick,
        },
        camera: {
          eye: { x: 1.8, y: 1.8, z: 1.2 },
        },
        bgcolor: plotSurfaceBg,
      },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };

    return { data: traces, layout: sceneLayout };
  }, [deviceOpt, narrow, palette, plotSurfaceBg, axTick, axTitle, hoverLabel]);

  const chartRef = usePlotlyChart(
    chartData?.data ?? [],
    chartData?.layout ?? {},
    {
      responsive: true,
      displayModeBar: true,
      scrollZoom: true,
      doubleClick: "reset",
      displaylogo: false,
      ...(narrow
        ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const }
        : {}),
      toImageButtonOptions: {
        format: "png",
        filename: "flow-deviceopt-3d",
      },
    } satisfies Partial<Config>,
  );

  return (
    <div className="chart-card">
      <h2>Device Optimization: DeviceOpt</h2>
      <p className="hint">
        Independent multi‑objective sweep over transistor dimensions (tin, ts,
        tout). Pareto‑optimal points (orange) form the 3D frontier. Each
        solution corresponds to a (width, length, finger) configuration.
      </p>

      {!deviceOpt ? (
        <EmptyState message="No device optimization data available" icon="🎯" />
      ) : (
        <>
          <div className="plot-host plot-host--3d">
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
          </div>

          <div className="analog-table-wrap" style={{ marginTop: "0.5rem" }}>
            <table className="analog-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>tin (ps)</th>
                  <th>ts (ps)</th>
                  <th>tout (ps)</th>
                  <th>Reward</th>
                  <th>W/L/F</th>
                  <th>C (fF)</th>
                  <th>R (Ω)</th>
                  <th>Pareto</th>
                  <th>Meta</th>
                </tr>
              </thead>
              <tbody>
                {deviceOpt.solutions.map((s) => (
                  <tr
                    key={s.solutionId}
                    className={
                      s.paretoFront ? "flow-devopt-row--pareto" : undefined
                    }
                  >
                    <td><code>{s.solutionId}</code></td>
                    <td>{s.tinPs.toFixed(1)}</td>
                    <td>{s.tsPs.toFixed(1)}</td>
                    <td>{s.toutPs.toFixed(1)}</td>
                    <td>{s.reward.toFixed(3)}</td>
                    <td>
                      {s.parameters.widthUm}/{s.parameters.lengthNm}/
                      {s.parameters.fingers}
                    </td>
                    <td>{s.capacitanceFF.toFixed(2)}</td>
                    <td>{s.resistanceOhm}</td>
                    <td>
                      {s.paretoFront ? (
                        <Badge status="done" />
                      ) : (
                        <span className="flow-badge flow-badge--idle">—</span>
                      )}
                    </td>
                    <td><code>{s.meta}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
