import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Data, Layout, Config } from "plotly.js";
import Plotly from "plotly.js-basic-dist";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { ADDER_DEMO_ROWS, architectureColor } from "../data/samplePpa";
import { getChartPalette } from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
): RefObject<HTMLDivElement | null> {
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

export function PlotlyPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();

  const { paretoData, paretoLayout, paretoConfig, lineData, lineLayout, lineConfig } =
    useMemo(() => {
      const palette = getChartPalette(theme);
      const mSize = (bw: number): number =>
        (narrow ? 4 : 0) + 8 + (bw / 64) * 10;

      const byArch = new Map<string, typeof ADDER_DEMO_ROWS>();
      for (const row of ADDER_DEMO_ROWS) {
        const list = byArch.get(row.architecture) ?? [];
        list.push(row);
        byArch.set(row.architecture, list);
      }

      const paretoDataInner: Data[] = [];
      for (const [arch, rows] of byArch) {
        paretoDataInner.push({
          type: "scatter",
          mode: "markers",
          name: arch,
          x: rows.map((r) => r.fmaxMhz),
          y: rows.map((r) => r.powerMw),
          text: rows.map(
            (r) => `${arch}<br>${r.bitWidth}b<br>${r.areaUm2} µm²`,
          ),
          hoverinfo: "text+x+y",
          marker: {
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            line: { width: 1, color: palette.markerOutline },
          },
        });
      }

      const ks = ADDER_DEMO_ROWS.filter((r) => r.architecture === "kogge_stone").sort(
        (a, b) => a.bitWidth - b.bitWidth,
      );
      const lineDataInner: Data[] = [
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Kogge-Stone Fmax",
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => r.fmaxMhz),
          yaxis: "y",
          line: { color: architectureColor("kogge_stone"), width: 2 },
        },
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Kogge-Stone area",
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => r.areaUm2),
          yaxis: "y2",
          line: { color: palette.accentOrange, width: 2, dash: "dot" },
        },
      ];

      const paretoLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 42, r: 14, t: 20, b: 92 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "Fmax vs power (demo)",
              font: { size: 12, color: palette.text },
            },
            xaxis: {
              title: { text: "Fmax (MHz)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
            },
            yaxis: {
              title: { text: "Power (mW)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
            },
            legend: {
              orientation: "h",
              yanchor: "top",
              y: -0.15,
              x: 0.5,
              xanchor: "center",
              font: { size: 9, color: palette.textMuted },
            },
            hovermode: "closest",
          }
        : {
            autosize: true,
            margin: { l: 48, r: 24, t: 32, b: 48 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "Pareto-style: Fmax vs power (demo data)",
              font: { size: 14, color: palette.text },
            },
            xaxis: {
              title: "Fmax (MHz)",
              gridcolor: palette.grid,
              tickfont: { color: palette.textMuted },
            },
            yaxis: {
              title: "Power (mW)",
              gridcolor: palette.grid,
              tickfont: { color: palette.textMuted },
            },
            legend: {
              orientation: "h",
              yanchor: "bottom",
              y: -0.28,
              x: 0.5,
              xanchor: "center",
              font: { color: palette.textMuted, size: 11 },
            },
            hovermode: "closest",
          };

      const lineLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: 40, t: 20, b: 96 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 10 },
            title: {
              text: "Kogge-Stone scaling",
              font: { size: 12, color: palette.text },
            },
            xaxis: {
              title: { text: "Bit width", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
              dtick: 32,
            },
            yaxis: {
              title: { text: "Fmax (MHz)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              gridcolor: palette.grid,
              side: "left",
            },
            yaxis2: {
              title: { text: "Area (µm²)", font: { size: 10 } },
              tickfont: { size: 9, color: palette.textMuted },
              overlaying: "y",
              side: "right",
              gridcolor: "transparent",
              showgrid: false,
            },
            legend: {
              orientation: "h",
              yanchor: "top",
              y: -0.2,
              x: 0.5,
              xanchor: "center",
              font: { size: 9, color: palette.textMuted },
            },
          }
        : {
            autosize: true,
            margin: { l: 52, r: 52, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: palette.text, size: 11 },
            title: {
              text: "Scaling: Kogge-Stone vs bit width",
              font: { size: 14, color: palette.text },
            },
            xaxis: {
              title: "Bit width",
              gridcolor: palette.grid,
              dtick: 32,
              tickfont: { color: palette.textMuted },
            },
            yaxis: {
              title: "Fmax (MHz)",
              gridcolor: palette.grid,
              side: "left",
              tickfont: { color: palette.textMuted },
            },
            yaxis2: {
              title: "Area (µm²)",
              overlaying: "y",
              side: "right",
              gridcolor: "transparent",
              showgrid: false,
            },
            legend: {
              orientation: "h",
              yanchor: "bottom",
              y: -0.32,
              x: 0.5,
              xanchor: "center",
              font: { color: palette.textMuted, size: 11 },
            },
          };

      const commonConfig: Partial<Config> = {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        displaylogo: false,
        ...(narrow
          ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const }
          : {}),
        toImageButtonOptions: { format: "png" },
      };

      return {
        paretoData: paretoDataInner,
        paretoLayout: paretoLayoutInner,
        paretoConfig: commonConfig,
        lineData: lineDataInner,
        lineLayout: lineLayoutInner,
        lineConfig: {
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          displaylogo: false,
          ...(narrow
            ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const }
            : {}),
        },
      };
    }, [narrow, theme]);

  const paretoRef = usePlotlyChart(paretoData, paretoLayout, paretoConfig);
  const lineRef = usePlotlyChart(lineData, lineLayout, lineConfig);

  return (
    <div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Pinch/zoom on mobile. Larger markers = wider adder (bubble-style). Uses{" "}
          <code>plotly.js-basic-dist</code> (cartesian only — smaller than full Plotly).
        </p>
        <div className="plot-host">
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Dual-axis line</h2>
        <p className="hint">Fmax (left) and area (right) vs bit width.</p>
        <div className="plot-host">
          <div ref={lineRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <p className="note">
        Plotly.js: rich interactions; this demo uses the <strong>basic</strong> bundle
        (no 3D/geo). For maps/3D you need the full <code>plotly.js</code> package — larger
        download and slower builds.
      </p>
    </div>
  );
}
