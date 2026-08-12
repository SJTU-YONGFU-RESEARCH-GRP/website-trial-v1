import { useMemo, useState } from "react";
import type { Config, Data, Layout } from "plotly.js";
import type { PpaRunManifest } from "../../data/ppaTypes";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import { useTheme } from "../../theme/ThemeContext";
import {
  getChartPalette,
  plotAxisFont,
  plotFont,
  plotInsetBackground,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyHeatmapColorscale,
  plotlyHoverLabel,
} from "../../theme/chartPalette";

interface Props {
  runs: readonly PpaRunManifest[];
}

interface MetricSpec {
  key: "performance" | "power" | "area";
  title: string;
  axisTitle: string;
  direction: "max" | "min";
  value: (run: PpaRunManifest) => number | null;
  comparable?: (run: PpaRunManifest) => boolean;
  hoverFormat: string;
  hoverUnit: string;
}

const BEST_COLOR = "#248a3d";
const BASELINE_COLOR = "#0071e3";
const CANDIDATE_COLOR = "#ff9500";
const NOT_COMPARABLE_COLOR = "#8e8e93";
const HISTOGRAM_COLORS = [
  "#0071e3", "#ff9500", "#34c759", "#af52de", "#ff3b30", "#5ac8fa",
  "#ff2d55", "#5856d6", "#30b0c7", "#a2845e", "#64d2ff", "#bf5af2",
] as const;

type TimingAnalysis = "setup" | "hold";

const METRICS: readonly MetricSpec[] = [
  {
    key: "performance",
    title: "Performance · post-route Fmax",
    axisTitle: "Fmax (MHz)",
    direction: "max",
    value: (run) => run.summary.fmaxHz === null ? null : run.summary.fmaxHz / 1e6,
    hoverFormat: ".7g",
    hoverUnit: "MHz",
  },
  {
    key: "power",
    title: "Power · reference total",
    axisTitle: "Total power (mW)",
    direction: "min",
    value: (run) => run.summary.totalPowerMw,
    comparable: (run) => run.summary.powerComparisonValid,
    hoverFormat: ".7g",
    hoverUnit: "mW",
  },
  {
    key: "area",
    title: "Area · normalized die footprint",
    axisTitle: "Die area (µm²)",
    direction: "min",
    value: (run) => run.summary.areaUm2,
    hoverFormat: ",.2f",
    hoverUnit: "µm²",
  },
];

function compactRun(run: PpaRunManifest): string {
  return `${run.flow} · ${run.variant ?? run.uid.slice(0, 6)}`;
}

function designVariant(run: PpaRunManifest): string {
  return `${run.design}${run.variant ? ` · ${run.variant}` : ""}`;
}

function technology(run: PpaRunManifest): string {
  return `${run.flow} · ${run.pdk}${run.scl ? ` · ${run.scl}` : ""}`;
}

function cornerLabel(corner: string): string {
  if (corner === "typical") return "Typical";
  const rcMatch = corner.match(/^rc_(min|max|nom)_worst_library$/);
  if (rcMatch) return `RC ${rcMatch[1]} · worst library`;
  const fullMatch = corner.match(/^(?:(max|min|nom)_)?(ff|ss|tt)_([np]?\d+)C_(\d+)v(\d+)$/i);
  if (!fullMatch) return corner.replaceAll("_", " · ");
  const [, analysis, process, rawTemperature, volts, millivolts] = fullMatch;
  const temperature = rawTemperature.startsWith("n")
    ? `−${Number(rawTemperature.slice(1))}`
    : rawTemperature.startsWith("p")
      ? `${Number(rawTemperature.slice(1))}`
      : `${Number(rawTemperature)}`;
  return `${analysis ? `${analysis} · ` : ""}${process.toLowerCase()} · ${temperature}°C · ${volts}.${millivolts} V`;
}

function sameValue(value: number, best: number): boolean {
  return Math.abs(value - best) <= Math.max(1, Math.abs(best)) * 1e-10;
}

function deltaLabel(value: number, baseline: number | null): string {
  if (baseline === null) return "N/A";
  const delta = value - baseline;
  const absolute = `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toLocaleString(undefined, { maximumSignificantDigits: 6 })}`;
  if (baseline === 0) return `${absolute} (percent N/A)`;
  const percent = (delta / Math.abs(baseline)) * 100;
  return `${absolute} · ${percent > 0 ? "+" : percent < 0 ? "−" : ""}${Math.abs(percent).toLocaleString(undefined, { maximumSignificantDigits: 5 })}%`;
}

function niceHistogramStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 0.1;
  const exponent = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return niceFraction * exponent;
}

export function PpaCharts({ runs }: Props): JSX.Element {
  const { theme } = useTheme();
  const narrow = useNarrowScreen(640);
  const [timingAnalysis, setTimingAnalysis] = useState<TimingAnalysis>("setup");
  const charts = useMemo(() => {
    const palette = getChartPalette(theme);
    const surface = plotInsetBackground(theme);
    const commonLayout: Partial<Layout> = {
      autosize: true,
      paper_bgcolor: surface,
      plot_bgcolor: surface,
      font: plotFont(palette.rgbAxisTitle),
      hoverlabel: plotlyHoverLabel(palette, narrow),
      margin: { l: narrow ? 58 : 84, r: 28, t: 18, b: narrow ? 126 : 94 },
      showlegend: false,
    };
    const axisX = {
      ...plotlyAxisFrameX(palette),
      automargin: true,
      gridcolor: palette.axisGridGreyRgb,
      tickfont: plotAxisFont(palette.axisValueLabelRgb, narrow),
    };
    const axisY = {
      ...plotlyAxisFrameY(palette),
      automargin: true,
      gridcolor: palette.axisGridBlackRgb,
      tickfont: plotAxisFont(palette.axisValueLabelRgb, narrow),
    };
    const compactTickFont = {
      family: "Arial, sans-serif",
      size: narrow ? 10 : 12,
      color: palette.axisValueLabelRgb,
    };
    const compactTitleFont = {
      family: "Arial, sans-serif",
      size: narrow ? 12 : 14,
      color: palette.rgbAxisTitle,
    };

    const metricCharts = Object.fromEntries(METRICS.map((metric) => {
      const baseline = runs.length > 0 && (metric.comparable?.(runs[0]) ?? true)
        ? metric.value(runs[0])
        : null;
      const values = runs
        .map((run, index) => ({
          run,
          index,
          value: metric.value(run),
          comparable: metric.comparable?.(run) ?? true,
        }))
        .filter((entry): entry is { run: PpaRunManifest; index: number; value: number; comparable: boolean } =>
          entry.value !== null && Number.isFinite(entry.value));
      const comparableValues = values.filter((entry) => entry.comparable);
      const best = comparableValues.length === 0
        ? null
        : metric.direction === "max"
          ? Math.max(...comparableValues.map((entry) => entry.value))
          : Math.min(...comparableValues.map((entry) => entry.value));
      const data: Data[] = values.length === 0 ? [] : [{
        type: "bar",
        x: values.map(({ run }) => compactRun(run)),
        y: values.map(({ value }) => value),
        customdata: values.map(({ run, index, value, comparable }) => [
          technology(run),
          designVariant(run),
          comparable ? deltaLabel(value, baseline) : "Not comparable",
          index === 0 ? "Baseline" : "Candidate",
          comparable && best !== null && sameValue(value, best) ? "Best" : "",
          comparable ? "" : run.summary.powerComparisonReason ?? "Excluded from cross-run ranking",
        ]),
        marker: {
          color: values.map(({ index, value, comparable }) =>
            !comparable
              ? NOT_COMPARABLE_COLOR
              : best !== null && sameValue(value, best)
                ? BEST_COLOR
                : index === 0 ? BASELINE_COLOR : CANDIDATE_COLOR),
          line: { color: palette.axisBorderRgb, width: 1.5 },
        },
        text: values.map(({ value, comparable }) =>
          !comparable
            ? "Not comparable"
            : best !== null && sameValue(value, best)
              ? `Best · ${value.toLocaleString(undefined, { maximumSignificantDigits: 5 })}`
              : ""),
        textposition: "outside",
        cliponaxis: false,
        hovertemplate: [
          "<b>%{customdata[0]}</b>",
          "%{customdata[1]}",
          `<b>${metric.title}:</b> %{y:${metric.hoverFormat}} ${metric.hoverUnit}`,
          "<b>vs baseline:</b> %{customdata[2]}",
          "%{customdata[3]} %{customdata[4]}",
          "%{customdata[5]}",
          "<extra></extra>",
        ].join("<br>"),
      } as Data];
      const layout: Partial<Layout> = {
        ...commonLayout,
        xaxis: { ...axisX, title: { text: "Selected result" }, tickangle: narrow ? -38 : -16 },
        yaxis: { ...axisY, title: { text: metric.axisTitle }, rangemode: "tozero" },
        bargap: Math.min(0.58, Math.max(0.2, 0.62 - values.length * 0.025)),
      };
      return [metric.key, { data, layout, count: values.length }];
    })) as Record<MetricSpec["key"], { data: Data[]; layout: Partial<Layout>; count: number }>;

    const slackRuns = runs.filter((run) =>
      run.summary.setupSlackNs !== null || run.summary.holdSlackNs !== null);
    const slackLabels = slackRuns.map(compactRun);
    const slackData: Data[] = slackRuns.length === 0 ? [] : [
      {
        type: "bar",
        orientation: "h",
        name: "Setup slack",
        x: slackRuns.map((run) => run.summary.setupSlackNs),
        y: slackLabels,
        customdata: slackRuns.map((run) => `${technology(run)}<br>UID ${run.uid}`),
        marker: { color: BASELINE_COLOR, line: { color: palette.axisBorderRgb, width: 1 } },
        hovertemplate: "<b>%{customdata}</b><br>Setup slack: %{x:.7g} ns<extra></extra>",
      } as Data,
      {
        type: "bar",
        orientation: "h",
        name: "Hold slack",
        x: slackRuns.map((run) => run.summary.holdSlackNs),
        y: slackLabels,
        customdata: slackRuns.map((run) => `${technology(run)}<br>UID ${run.uid}`),
        marker: { color: CANDIDATE_COLOR, line: { color: palette.axisBorderRgb, width: 1 } },
        hovertemplate: "<b>%{customdata}</b><br>Hold slack: %{x:.7g} ns<extra></extra>",
      } as Data,
    ];
    const slackLayout: Partial<Layout> = {
      ...commonLayout,
      margin: { l: narrow ? 132 : 205, r: 32, t: 48, b: 72 },
      barmode: "group",
      bargap: 0.24,
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: 1.15,
        font: compactTickFont,
      },
      xaxis: {
        ...axisX,
        title: { text: "Time slack (ns)", font: compactTitleFont },
        tickfont: compactTickFont,
        zeroline: true,
        zerolinecolor: palette.axisBorderRgb,
        zerolinewidth: 2,
      },
      yaxis: {
        ...axisY,
        title: { text: "Selected result", font: compactTitleFont },
        tickfont: compactTickFont,
        autorange: "reversed",
      },
    };

    const endpointRuns = runs.map((run, index) => {
      const endpointSummary = run.summary.timingEndpointSlacks;
      const values = timingAnalysis === "setup" ? endpointSummary.setupSlackNs : endpointSummary.holdSlackNs;
      return { run, index, values };
    });
    const availableEndpointRuns = endpointRuns.filter(({ values }) => values.length > 0);
    const missingEndpointRuns = endpointRuns.filter(({ values }) => values.length === 0).map(({ run }) => run);
    const allEndpointSlacks = availableEndpointRuns.flatMap(({ values }) => values);
    const rawMinimum = allEndpointSlacks.length > 0 ? Math.min(...allEndpointSlacks) : 0;
    const rawMaximum = allEndpointSlacks.length > 0 ? Math.max(...allEndpointSlacks) : 0;
    const histogramRange = Math.max(rawMaximum - rawMinimum, Math.abs(rawMaximum), Math.abs(rawMinimum), 1e-6);
    const histogramStep = niceHistogramStep(histogramRange / 32);
    const histogramStart = rawMinimum >= 0
      ? -histogramStep
      : Math.floor(rawMinimum / histogramStep) * histogramStep;
    const histogramEnd = rawMaximum <= 0
      ? histogramStep
      : Math.ceil(rawMaximum / histogramStep) * histogramStep;
    const histogramData: Data[] = availableEndpointRuns.map(({ run, index, values }) => ({
      type: "histogram",
      name: compactRun(run),
      x: values,
      opacity: 0.56,
      xbins: { start: histogramStart, end: histogramEnd, size: histogramStep },
      marker: {
        color: HISTOGRAM_COLORS[index % HISTOGRAM_COLORS.length],
        line: { color: palette.axisBorderRgb, width: 0.8 },
      },
      meta: [technology(run), run.uid, timingAnalysis],
      hovertemplate: [
        "<b>%{meta[0]}</b>",
        "UID %{meta[1]}",
        `<b>${timingAnalysis === "setup" ? "Setup" : "Hold"} slack bin:</b> %{x:.5g} ns`,
        "<b>Timing endpoints:</b> %{y}",
        "<extra>%{fullData.name}</extra>",
      ].join("<br>"),
    } as Data));
    const histogramLayout: Partial<Layout> = {
      ...commonLayout,
      margin: { l: narrow ? 62 : 88, r: 32, t: narrow ? 100 : 78, b: 78 },
      barmode: "overlay",
      bargap: 0.06,
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: 1.16,
        font: compactTickFont,
      },
      xaxis: {
        ...axisX,
        title: { text: `${timingAnalysis === "setup" ? "Setup" : "Hold"} slack (ns)`, font: compactTitleFont },
        tickfont: compactTickFont,
        range: [histogramStart, histogramEnd],
        zeroline: false,
      },
      yaxis: {
        ...axisY,
        title: { text: "Timing endpoint count", font: compactTitleFont },
        tickfont: compactTickFont,
        rangemode: "tozero",
      },
      shapes: histogramData.length === 0 ? [] : [
        {
          type: "rect", xref: "x", yref: "paper", x0: histogramStart, x1: 0, y0: 0, y1: 1,
          fillcolor: "rgba(255, 59, 48, 0.08)", line: { width: 0 }, layer: "below",
        },
        {
          type: "rect", xref: "x", yref: "paper", x0: 0, x1: histogramEnd, y0: 0, y1: 1,
          fillcolor: "rgba(52, 199, 89, 0.07)", line: { width: 0 }, layer: "below",
        },
        {
          type: "line", xref: "x", yref: "paper", x0: 0, x1: 0, y0: 0, y1: 1,
          line: { color: palette.axisBorderRgb, width: 2 }, layer: "above",
        },
      ],
      annotations: histogramData.length === 0 ? [] : [
        {
          x: (histogramStart + 0) / 2, y: 1, xref: "x", yref: "paper", text: "Violation",
          showarrow: false, yshift: 12, font: { ...compactTickFont, color: "#d70015" },
        },
        {
          x: histogramEnd / 2, y: 1, xref: "x", yref: "paper", text: "Meets timing",
          showarrow: false, yshift: 12, font: { ...compactTickFont, color: "#248a3d" },
        },
      ],
    };

    const timingRuns = runs.filter((run) => Object.keys(run.summary.cornerSetupSlackNs).length > 0);
    const corners = [...new Set(timingRuns.flatMap((run) => Object.keys(run.summary.cornerSetupSlackNs)))].sort();
    const timingLabels = timingRuns.map(compactRun);
    const cornerRaw = corners.map((corner) => timingRuns.map((run) => run.summary.cornerSetupSlackNs[corner]));
    const heatmapData: Data[] = timingRuns.length === 0 ? [] : [{
      type: "heatmap",
      x: timingLabels,
      y: corners.map(cornerLabel),
      z: cornerRaw,
      customdata: corners.map((corner) => timingRuns.map((run) =>
        `${technology(run)}<br>UID ${run.uid}<br>${corner}`)),
      colorscale: plotlyHeatmapColorscale(palette, theme),
      colorbar: {
        title: { text: "Setup slack (ns)", font: compactTitleFont },
        tickfont: compactTickFont,
        thickness: 14,
      },
      hovertemplate: "<b>%{customdata}</b><br>Setup slack: %{z:.5g} ns<extra></extra>",
    } as Data];
    const heatmapLayout: Partial<Layout> = {
      ...commonLayout,
      margin: { l: narrow ? 158 : 235, r: narrow ? 42 : 105, t: 18, b: narrow ? 105 : 86 },
      xaxis: {
        ...axisX,
        title: { text: "Selected result", font: compactTitleFont },
        tickfont: compactTickFont,
        tickangle: narrow ? -30 : -12,
        fixedrange: true,
      },
      yaxis: {
        ...axisY,
        title: { text: "Timing corner", font: compactTitleFont },
        tickfont: compactTickFont,
        fixedrange: true,
      },
    };

    const config: Partial<Config> = {
      responsive: true,
      displaylogo: false,
      displayModeBar: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
      toImageButtonOptions: { format: "png", filename: "ppa-comparison", scale: 2 },
    };
    return {
      metricCharts,
      slackCount: slackRuns.length,
      slackData,
      slackLayout,
      endpointRunCount: availableEndpointRuns.length,
      endpointCount: allEndpointSlacks.length,
      missingEndpointRuns,
      histogramData,
      histogramLayout,
      timingCount: timingRuns.length,
      cornerCount: corners.length,
      heatmapData,
      heatmapLayout,
      config,
    };
  }, [narrow, runs, theme, timingAnalysis]);

  const performanceRef = usePlotlyChart(charts.metricCharts.performance.data, charts.metricCharts.performance.layout, charts.config);
  const powerRef = usePlotlyChart(charts.metricCharts.power.data, charts.metricCharts.power.layout, charts.config);
  const areaRef = usePlotlyChart(charts.metricCharts.area.data, charts.metricCharts.area.layout, charts.config);
  const slackRef = usePlotlyChart(charts.slackData, charts.slackLayout, charts.config);
  const histogramRef = usePlotlyChart(charts.histogramData, charts.histogramLayout, charts.config);
  const heatmapRef = usePlotlyChart(charts.heatmapData, charts.heatmapLayout, charts.config);
  const metricRefs = { performance: performanceRef, power: powerRef, area: areaRef };

  return (
    <div className="ppa-chart-grid">
      {METRICS.map((metric) => (
        <section key={metric.key} className="chart-card ppa-chart-card">
          <h2>{metric.title}</h2>
          <p className="hint">First selected result is the baseline; hover shows absolute and percentage delta. Green marks the best selected value.</p>
          {charts.metricCharts[metric.key].count > 0 ? (
            <div className="plot-host ppa-plot-host"><div ref={metricRefs[metric.key]} /></div>
          ) : <div className="ppa-empty">No selected report contains this metric.</div>}
        </section>
      ))}
      <section className="chart-card ppa-chart-card">
        <h2>Setup / hold time slack</h2>
        <p className="hint">Reference setup and hold slack on a shared time axis. The zero line is the timing boundary.</p>
        {charts.slackCount > 0 ? (
          <div
            className="plot-host ppa-plot-host ppa-plot-host--slack"
            style={{ height: `${Math.max(390, 175 + charts.slackCount * 44)}px` }}
          >
            <div ref={slackRef} />
          </div>
        ) : <div className="ppa-empty">No selected report contains setup or hold slack.</div>}
      </section>
      <section className="chart-card ppa-chart-card">
        <div className="ppa-histogram-heading">
          <div>
            <h2>Timing Slack Histogram</h2>
            <p className="hint">Every constrained endpoint/corner sample retained by the selected final timing reports. Zero separates violations from samples that meet timing.</p>
          </div>
          <div className="ppa-timing-analysis" role="group" aria-label="Timing slack analysis">
            {(["setup", "hold"] as const).map((analysis) => (
              <button
                key={analysis}
                type="button"
                className={timingAnalysis === analysis ? "is-active" : ""}
                aria-pressed={timingAnalysis === analysis}
                onClick={() => setTimingAnalysis(analysis)}
              >
                {analysis === "setup" ? "Setup" : "Hold"}
              </button>
            ))}
          </div>
        </div>
        {charts.endpointRunCount > 0 ? (
          <>
            <div className="ppa-histogram-status">
              {charts.endpointCount.toLocaleString()} endpoint/corner samples · {charts.endpointRunCount.toLocaleString()} selected results
            </div>
            <div className="plot-host ppa-plot-host ppa-plot-host--histogram"><div ref={histogramRef} /></div>
            {charts.missingEndpointRuns.length > 0 && (
              <div className="ppa-histogram-missing">
                Full endpoint reports were not retained for: {charts.missingEndpointRuns.map(compactRun).join("; ")}.
              </div>
            )}
          </>
        ) : <div className="ppa-empty">No selected result retains a complete final-reference endpoint report.</div>}
      </section>
      <section className="chart-card ppa-chart-card">
        <h2>Timing corners</h2>
        <p className="hint">Setup slack across every timing corner retained by the selected final reports.</p>
        {charts.timingCount > 0 ? (
          <div
            className="plot-host ppa-plot-host ppa-plot-host--heatmap"
            style={{ height: `${Math.max(520, 180 + charts.cornerCount * 31)}px` }}
          >
            <div ref={heatmapRef} />
          </div>
        ) : <div className="ppa-empty">No selected report contains timing-corner data.</div>}
      </section>
    </div>
  );
}
