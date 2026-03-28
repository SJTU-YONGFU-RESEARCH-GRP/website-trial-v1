import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { Config, Data, Layout } from "plotly.js";
// Pre-minified browser build — avoids Vite bundling plotly's Node-only trace helpers.
import Plotly from "plotly.js-dist-min";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  ADDER_DEMO_ROWS,
  architectureColor,
  DEMO_ARCH_ORDER,
  formatArchLabel,
  plotlySankeyPowerByBitwidth,
  rowsByBitWidthOrdered,
} from "../data/samplePpa";
import {
  DEFAULT_EXPLORE_AXES,
  SCATTER_AXIS_METRICS,
  scatterArchitectureTickAxis,
  scatterAxisExtent,
  scatterAxisHeatmapGrid,
  scatterAxisOptionLabel,
  scatterAxisRange,
  scatterAxisTitle,
  scatterAxisTreemapFlat,
  scatterAxisValue,
  syncExploreAxes,
  type ExploreAxesState,
  type ScatterAxisMetric,
} from "../data/scatterAxisMetrics";
import {
  CHART_LINE_WIDTH,
  CHART_MARKER_OUTLINE_RGB,
  getChartPalette,
  plotAxisFont,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlySceneAxis,
} from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

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

export function PlotlyPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const [exploreAxes, setExploreAxes] = useState<ExploreAxesState>(DEFAULT_EXPLORE_AXES);

  const onExploreAxisChange = (key: keyof ExploreAxesState, m: ScatterAxisMetric) => {
    setExploreAxes((prev) => syncExploreAxes(prev, key, m));
  };

  const {
    paretoData,
    paretoLayout,
    paretoConfig,
    lineData,
    lineLayout,
    lineConfig,
    barData,
    barLayout,
    barConfig,
    heatmapData,
    heatmapLayout,
    heatmapConfig,
    pieData,
    pieLayout,
    pieConfig,
    scatter3dData,
    scatter3dLayout,
    scatter3dConfig,
    treemapData,
    treemapLayout,
    treemapConfig,
    parcoordsData,
    parcoordsLayout,
    parcoordsConfig,
    sankeyData,
    sankeyLayout,
    sankeyConfig,
  } = useMemo(() => {
      const ex = exploreAxes;
      const paretoXMetric = ex.x;
      const paretoYMetric = ex.y;
      const paretoZMetric = ex.z;
      const palette = getChartPalette(theme);
      const frameX = plotlyAxisFrameX(palette);
      const frameY = plotlyAxisFrameY(palette);
      const frameYDual = plotlyAxisFrameY(palette, { mirror: false });
      const sceneAxX = plotlySceneAxis(palette, "grey");
      const sceneAxY = plotlySceneAxis(palette, "black");
      const sceneAxZ = plotlySceneAxis(palette, "grey");
      const axTitle = (label: string) => ({
        text: label,
        font: plotAxisFont(palette.rgbAxisTitle, narrow),
        standoff: narrow ? 10 : 14,
      });
      const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
      const mSize = (bw: number): number =>
        (narrow ? 4 : 0) + 8 + (bw / 64) * 10;

      const byArch = new Map<string, typeof ADDER_DEMO_ROWS>();
      for (const row of ADDER_DEMO_ROWS) {
        const list = byArch.get(row.architecture) ?? [];
        list.push(row);
        byArch.set(row.architecture, list);
      }

      const paretoDataInner: Data[] = [];
      for (const arch of DEMO_ARCH_ORDER) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        const label = formatArchLabel(arch);
        paretoDataInner.push({
          type: "scatter",
          mode: "markers",
          name: label,
          x: rows.map((r) => scatterAxisValue(paretoXMetric, r)),
          y: rows.map((r) => scatterAxisValue(paretoYMetric, r)),
          text: rows.map(
            (r) => `${label}<br>${r.bitWidth}b<br>${r.areaUm2} µm²`,
          ),
          hoverinfo: "x+y+text",
          marker: {
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            opacity: 1,
            line: { width: 1, color: CHART_MARKER_OUTLINE_RGB },
          },
        });
      }

      const ks = ADDER_DEMO_ROWS.filter((r) => r.architecture === "kogge_stone").sort(
        (a, b) => a.bitWidth - b.bitWidth,
      );
      const lineDataInner: Data[] = [
        {
          type: "scatter",
          mode: "lines",
          name: scatterAxisTitle(paretoXMetric),
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => scatterAxisValue(paretoXMetric, r)),
          yaxis: "y",
          line: { color: architectureColor("kogge_stone"), width: CHART_LINE_WIDTH },
        },
        {
          type: "scatter",
          mode: "lines",
          name: scatterAxisTitle(paretoYMetric),
          x: ks.map((r) => r.bitWidth),
          y: ks.map((r) => scatterAxisValue(paretoYMetric, r)),
          yaxis: "y2",
          line: { color: "rgb(139, 69, 19)", width: CHART_LINE_WIDTH, dash: "dot" },
        },
      ];

      const paretoPlotBg =
        theme === "dark" ? "rgb(22, 28, 38)" : "rgb(255, 255, 255)";
      const paretoXRange = scatterAxisRange(paretoXMetric);
      const paretoYRange = scatterAxisRange(paretoYMetric);
      const paretoXArchTicks =
        paretoXMetric === "architecture" ? scatterArchitectureTickAxis() : {};
      const paretoYArchTicks =
        paretoYMetric === "architecture" ? scatterArchitectureTickAxis() : {};
      const paretoTitleNarrow = plotlyBold(
        `${scatterAxisTitle(paretoXMetric)} vs ${scatterAxisTitle(paretoYMetric)}`,
      );
      const paretoTitleWide = plotlyBold(
        `Pareto-style: ${scatterAxisTitle(paretoXMetric)} vs ${scatterAxisTitle(paretoYMetric)}`,
      );

      const paretoLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 42, r: 14, t: 20, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: paretoPlotBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleNarrow,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              tickfont: axTick,
              ...paretoXArchTicks,
              ...(paretoXRange ? { range: paretoXRange } : {}),
            },
            yaxis: {
              ...frameY,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
          }
        : {
            autosize: true,
            margin: { l: 48, r: 24, t: 32, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: paretoPlotBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleWide,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              tickfont: axTick,
              ...paretoXArchTicks,
              ...(paretoXRange ? { range: paretoXRange } : {}),
            },
            yaxis: {
              ...frameY,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
          };

      const lineLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: 40, t: 20, b: 96 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Kogge-Stone scaling"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
              dtick: 32,
            },
            yaxis: {
              ...frameYDual,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              tickfont: axTick,
              side: "left",
            },
            yaxis2: {
              ...frameYDual,
              automargin: true,
              gridcolor: "rgba(0,0,0,0)",
              showgrid: false,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              overlaying: "y",
              side: "right",
            },
            showlegend: false,
          }
        : {
            autosize: true,
            margin: { l: 52, r: 52, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold("Scaling: Kogge-Stone vs bit width"),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              dtick: 32,
              tickfont: axTick,
            },
            yaxis: {
              ...frameYDual,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoXMetric)),
              side: "left",
              tickfont: axTick,
            },
            yaxis2: {
              ...frameYDual,
              automargin: true,
              gridcolor: "rgba(0,0,0,0)",
              showgrid: false,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              overlaying: "y",
              side: "right",
            },
            showlegend: false,
          };

      const commonConfig: Partial<Config> = {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        displaylogo: false,
        ...(narrow
          ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const }
          : {}),
        toImageButtonOptions: { format: "png", filename: "plotly-chart" },
      };

      const rows64 = rowsByBitWidthOrdered(64);
      const barDataInner: Data[] = [
        {
          type: "bar",
          name: "Metric @ 64b",
          x: rows64.map((r) => formatArchLabel(r.architecture)),
          y: rows64.map((r) => scatterAxisValue(paretoYMetric, r)),
          text: rows64.map((r) => String(scatterAxisValue(paretoYMetric, r))),
          textposition: "auto",
          marker: {
            color: rows64.map((r) => architectureColor(r.architecture)),
            line: { width: CHART_LINE_WIDTH, color: CHART_MARKER_OUTLINE_RGB },
          },
          hovertemplate: `%{x}<br>${scatterAxisTitle(paretoYMetric)}: %{y:.3g}<extra></extra>`,
        },
      ];

      const barLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 46, r: 14, t: 20, b: 88 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(`${scatterAxisTitle(paretoYMetric)} @ 64b (bar)`),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Architecture"),
              tickangle: -28,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
          }
        : {
            autosize: true,
            margin: { l: 52, r: 24, t: 32, b: 72 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoYMetric)} at 64-bit width (by architecture)`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Architecture"),
              tickangle: -18,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
            bargap: 0.28,
          };

      const { z: heatZ, colLabels, rowLabels } = scatterAxisHeatmapGrid(paretoZMetric);
      const heatmapDataInner: Data[] = [
        {
          type: "heatmap",
          x: colLabels,
          y: rowLabels,
          z: heatZ,
          colorscale: "Viridis",
          hovertemplate:
            `Bit width %{x}<br>%{y}<br>${scatterAxisTitle(paretoZMetric)}: %{z}<extra></extra>`,
          colorbar: {
            title: axTitle(scatterAxisTitle(paretoZMetric)),
            tickfont: axTick,
          },
        },
      ];

      const heatmapLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 72, r: 18, t: 20, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(`${scatterAxisTitle(paretoZMetric)} heatmap`),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
          }
        : {
            autosize: true,
            margin: { l: 120, r: 100, t: 32, b: 56 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoZMetric)} — architecture × bit width`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
          };

      const pieDataInner: Data[] = [
        {
          type: "pie",
          labels: rows64.map((r) => formatArchLabel(r.architecture)),
          values: rows64.map((r) => scatterAxisValue(paretoYMetric, r)),
          marker: {
            colors: rows64.map((r) => architectureColor(r.architecture)),
            line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
          },
          hole: 0.38,
          textinfo: "label+percent",
          textfont: plotAxisFont("#ffffff", narrow),
          hovertemplate:
            "%{label}<br>%{value:.3g}<br>%{percent}<extra></extra>",
        },
      ];

      const pieLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 12, r: 12, t: 20, b: 12 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(`${scatterAxisTitle(paretoYMetric)} share @ 64b`),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
          }
        : {
            autosize: true,
            margin: { l: 16, r: 16, t: 36, b: 16 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(paretoYMetric)} share at 64-bit width (donut)`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
          };

      const sceneAxisFor = (
        base: typeof sceneAxX,
        metric: ScatterAxisMetric,
      ) => {
        const r = scatterAxisRange(metric);
        return {
          ...base,
          title: axTitle(scatterAxisTitle(metric)),
          tickfont: axTick,
          ...(metric === "architecture" ? scatterArchitectureTickAxis() : {}),
          ...(r ? { range: r as [number, number] } : {}),
        };
      };

      const scatter3dDataInner: Data[] = [];
      for (const arch of DEMO_ARCH_ORDER) {
        const rows = byArch.get(arch);
        if (!rows?.length) continue;
        scatter3dDataInner.push({
          type: "scatter3d",
          mode: "markers",
          name: formatArchLabel(arch),
          x: rows.map((r) => scatterAxisValue(paretoXMetric, r)),
          y: rows.map((r) => scatterAxisValue(paretoYMetric, r)),
          z: rows.map((r) => scatterAxisValue(paretoZMetric, r)),
          text: rows.map(
            (r) => `${formatArchLabel(arch)} ${r.bitWidth}b`,
          ),
          hovertemplate:
            "%{text}<br>" +
            `${scatterAxisTitle(paretoXMetric)}: %{x}<br>` +
            `${scatterAxisTitle(paretoYMetric)}: %{y}<br>` +
            `${scatterAxisTitle(paretoZMetric)}: %{z}<extra></extra>`,
          marker: {
            size: rows.map((r) => mSize(r.bitWidth)),
            color: architectureColor(arch),
            opacity: 1,
            line: { width: 1, color: CHART_MARKER_OUTLINE_RGB },
          },
        });
      }

      const scatter3dLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 0, r: 0, t: 22, b: 0 },
            paper_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `3D: ${scatterAxisTitle(paretoXMetric)} × ${scatterAxisTitle(paretoYMetric)} × ${scatterAxisTitle(paretoZMetric)}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: sceneAxisFor(sceneAxX, paretoXMetric),
              yaxis: sceneAxisFor(sceneAxY, paretoYMetric),
              zaxis: sceneAxisFor(sceneAxZ, paretoZMetric),
            },
          }
        : {
            autosize: true,
            margin: { l: 0, r: 0, t: 34, b: 0 },
            paper_bgcolor: "transparent",
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `3D scatter: ${scatterAxisTitle(paretoXMetric)} × ${scatterAxisTitle(paretoYMetric)} × ${scatterAxisTitle(paretoZMetric)}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: "rgba(0,0,0,0)",
              xaxis: sceneAxisFor(sceneAxX, paretoXMetric),
              yaxis: sceneAxisFor(sceneAxY, paretoYMetric),
              zaxis: sceneAxisFor(sceneAxZ, paretoZMetric),
            },
          };

      const { labels: tmLabels, parents: tmParents, values: tmValues } =
        scatterAxisTreemapFlat(paretoYMetric);
      const treemapColors = [
        palette.axisBorderRgb,
        ...ADDER_DEMO_ROWS.map((r) => architectureColor(r.architecture)),
      ];
      const treemapDataInner: Data[] = [
        {
          type: "treemap",
          labels: tmLabels,
          parents: tmParents,
          values: tmValues,
          textfont: plotAxisFont("#ffffff", narrow),
          marker: { colors: treemapColors },
          hovertemplate:
            `%{label}<br>${scatterAxisTitle(paretoYMetric)}: %{value}<extra></extra>`,
        },
      ];

      const treemapLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 4, r: 4, t: narrow ? 22 : 34, b: 4 },
        paper_bgcolor: "transparent",
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(
            narrow
              ? `${scatterAxisTitle(paretoYMetric)} treemap`
              : `${scatterAxisTitle(paretoYMetric)} — hierarchy`,
          ),
          font: plotFont(palette.rgbAxisTitle),
        },
        showlegend: false,
      };

      const archIdx = (a: string): number =>
        Math.max(0, DEMO_ARCH_ORDER.indexOf(a));
      const pcColors = ADDER_DEMO_ROWS.map((r) => archIdx(r.architecture));
      const [rx0, rx1] = scatterAxisExtent(ADDER_DEMO_ROWS, paretoXMetric);
      const [ry0, ry1] = scatterAxisExtent(ADDER_DEMO_ROWS, paretoYMetric);
      const [rz0, rz1] = scatterAxisExtent(ADDER_DEMO_ROWS, paretoZMetric);

      // Parcoords trace: @types/plotly.js `Data` union omits `dimensions` / parcoords line colorscale.
      const parcoordsDataInner = [
        {
          type: "parcoords" as const,
          line: {
            color: pcColors,
            colorscale: [
              [0, architectureColor(DEMO_ARCH_ORDER[0])],
              [0.33, architectureColor(DEMO_ARCH_ORDER[1])],
              [0.66, architectureColor(DEMO_ARCH_ORDER[2])],
              [1, architectureColor(DEMO_ARCH_ORDER[3])],
            ],
            cmin: 0,
            cmax: 3,
            showscale: false,
            width: CHART_LINE_WIDTH,
          },
          dimensions: [
            {
              label: "Bit width",
              values: ADDER_DEMO_ROWS.map((r) => r.bitWidth),
              range: [32, 64],
            },
            {
              label: scatterAxisTitle(paretoXMetric),
              values: ADDER_DEMO_ROWS.map((r) => scatterAxisValue(paretoXMetric, r)),
              range: [rx0, rx1],
            },
            {
              label: scatterAxisTitle(paretoYMetric),
              values: ADDER_DEMO_ROWS.map((r) => scatterAxisValue(paretoYMetric, r)),
              range: [ry0, ry1],
            },
            {
              label: scatterAxisTitle(paretoZMetric),
              values: ADDER_DEMO_ROWS.map((r) => scatterAxisValue(paretoZMetric, r)),
              range: [rz0, rz1],
            },
          ],
        },
      ] as unknown as Data[];

      const parcoordsLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 24, r: 24, t: narrow ? 22 : 34, b: 16 },
        paper_bgcolor: "transparent",
        font: plotAxisFont(palette.rgbAxisTitle, narrow),
        title: {
          text: plotlyBold(
            narrow ? "Parallel coords" : "Parallel coordinates (all designs)",
          ),
          font: plotFont(palette.rgbAxisTitle),
        },
        showlegend: false,
      };

      const sk = plotlySankeyPowerByBitwidth();
      const sankeyNodeColors = [
        ...ADDER_DEMO_ROWS.map((r) => architectureColor(r.architecture)),
        "rgb(0, 128, 0)",
        "rgb(139, 69, 19)",
      ];
      const sankeyDataInner: Data[] = [
        {
          type: "sankey",
          arrangement: "snap",
          node: {
            label: sk.labels,
            pad: 10,
            thickness: 14,
            line: { color: palette.markerOutline, width: CHART_LINE_WIDTH },
            color: sankeyNodeColors,
          },
          link: {
            source: sk.source,
            target: sk.target,
            value: sk.value,
            color: ADDER_DEMO_ROWS.map(() => "rgba(0, 0, 255, 0.25)"),
          },
        },
      ];

      const sankeyLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 8, r: 8, t: narrow ? 22 : 34, b: 8 },
        paper_bgcolor: "transparent",
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(
            narrow ? "Sankey (power)" : "Power (mW) → bit-width pools",
          ),
          font: plotFont(palette.rgbAxisTitle),
        },
        showlegend: false,
      };

      return {
        paretoData: paretoDataInner,
        paretoLayout: paretoLayoutInner,
        paretoConfig: commonConfig,
        lineData: lineDataInner,
        lineLayout: lineLayoutInner,
        lineConfig: commonConfig,
        barData: barDataInner,
        barLayout: barLayoutInner,
        barConfig: commonConfig,
        heatmapData: heatmapDataInner,
        heatmapLayout: heatmapLayoutInner,
        heatmapConfig: commonConfig,
        pieData: pieDataInner,
        pieLayout: pieLayoutInner,
        pieConfig: commonConfig,
        scatter3dData: scatter3dDataInner,
        scatter3dLayout: scatter3dLayoutInner,
        scatter3dConfig: commonConfig,
        treemapData: treemapDataInner,
        treemapLayout: treemapLayoutInner,
        treemapConfig: commonConfig,
        parcoordsData: parcoordsDataInner,
        parcoordsLayout: parcoordsLayoutInner,
        parcoordsConfig: commonConfig,
        sankeyData: sankeyDataInner,
        sankeyLayout: sankeyLayoutInner,
        sankeyConfig: commonConfig,
      };
    }, [narrow, theme, exploreAxes]);

  const paretoRef = usePlotlyChart(paretoData, paretoLayout, paretoConfig);
  const lineRef = usePlotlyChart(lineData, lineLayout, lineConfig);
  const barRef = usePlotlyChart(barData, barLayout, barConfig);
  const heatmapRef = usePlotlyChart(heatmapData, heatmapLayout, heatmapConfig);
  const pieRef = usePlotlyChart(pieData, pieLayout, pieConfig);
  const scatter3dRef = usePlotlyChart(scatter3dData, scatter3dLayout, scatter3dConfig);
  const treemapRef = usePlotlyChart(treemapData, treemapLayout, treemapConfig);
  const parcoordsRef = usePlotlyChart(parcoordsData, parcoordsLayout, parcoordsConfig);
  const sankeyRef = usePlotlyChart(sankeyData, sankeyLayout, sankeyConfig);

  return (
    <div>
      <div className="chart-card">
        <h2>Explore metrics</h2>
        <p className="hint">
          <strong>X</strong> / <strong>Y</strong> drive the 2D scatter, dual-axis line (Kogge-Stone), bar
          @64b, donut, treemap, and parallel coordinates. <strong>Z</strong> colors the heatmap.{" "}
          <strong>3D scatter</strong> uses all three (each axis must be a different metric).
        </p>
        <div className="axis-pickers">
          <label className="axis-picker">
            X (horizontal / depth)
            <select
              value={exploreAxes.x}
              aria-label="Explore metric X"
              onChange={(e) => onExploreAxisChange("x", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Y (vertical / bar &amp; pie)
            <select
              value={exploreAxes.y}
              aria-label="Explore metric Y"
              onChange={(e) => onExploreAxisChange("y", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="axis-picker">
            Z (heatmap color)
            <select
              value={exploreAxes.z}
              aria-label="Explore metric Z"
              onChange={(e) => onExploreAxisChange("z", e.target.value as ScatterAxisMetric)}
            >
              {SCATTER_AXIS_METRICS.map((m) => (
                <option key={m} value={m}>
                  {scatterAxisOptionLabel(m)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Pinch/drag or mode-bar zoom; larger markers = wider adder (bubble-style). Uses{" "}
          <strong>X</strong> × <strong>Y</strong> from above — hover points for details.{" "}
          <code>plotly.js-dist-min</code> browser bundle.
        </p>
        <div className="plot-host">
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Dual-axis line</h2>
        <p className="hint">
          Kogge-Stone only: <strong>X</strong> metric (left axis) and <strong>Y</strong> metric (right)
          vs bit width. Pinch/drag or mode-bar zoom (<code>dataZoom</code> on ECharts).
        </p>
        <div className="plot-host">
          <div ref={lineRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Grouped bar</h2>
        <p className="hint">
          64-bit rows: <strong>Y</strong> metric by architecture. Mode bar: zoom, pan, autoscale, PNG.
        </p>
        <div className="plot-host">
          <div ref={barRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Heatmap</h2>
        <p className="hint">
          Cell color = <strong>Z</strong> metric across architecture × bit width (same grid).
        </p>
        <div className="plot-host">
          <div ref={heatmapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Donut (pie)</h2>
        <p className="hint">
          Relative <strong>Y</strong> at 64b (same slice as the bar chart).
        </p>
        <div className="plot-host plot-host--short">
          <div ref={pieRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>3D scatter</h2>
        <p className="hint">
          WebGL cloud using <strong>X</strong> × <strong>Y</strong> × <strong>Z</strong> from above. Drag to rotate; mode bar
          for PNG / reset camera.
        </p>
        <div className="plot-host plot-host--tall">
          <div ref={scatter3dRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Treemap</h2>
        <p className="hint">
          Tile size from <strong>Y</strong> metric — root → each architecture×width leaf.
        </p>
        <div className="plot-host plot-host--short">
          <div ref={treemapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Parallel coordinates</h2>
        <p className="hint">
          Bit width plus <strong>X</strong>, <strong>Y</strong>, <strong>Z</strong> axes; brush to filter designs (color =
          architecture).
        </p>
        <div className="plot-host">
          <div ref={parcoordsRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Sankey</h2>
        <p className="hint">
          Power (mW) flowing from each design into 32b vs 64b aggregate pools.
        </p>
        <div className="plot-host">
          <div ref={sankeyRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <p className="note">
        This page loads the official <strong>plotly.js-dist-min</strong> bundle (3D WebGL,
        sankey, parcoords, treemap, geo-capable, etc.) — large download, but avoids bundling
        raw <code>plotly.js</code> source through Vite (fewer Node-polyfill runtime bugs).
        For a smaller first paint elsewhere, lazy-load this route only (already done).
      </p>
    </div>
  );
}
