import { useCallback, useEffect, useMemo, useState } from "react";
import type { Config, Data, Layout, PlotMouseEvent } from "plotly.js";
import { architectureColor, seriesRgbByIndex } from "../../data/design";
import {
  availablePpaMetrics,
  finitePpaNumber,
  formatPpaMetricValue,
  isPpaRunInvalid,
  ppaMetric,
  ppaMetricAxisTitle,
  ppaParetoFrontier,
  ppaTrendSeriesKey,
  type PpaMetricDefinition,
} from "../../data/ppaMetricRegistry";
import type { PpaRunManifest } from "../../data/ppaTypes";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import { useTheme } from "../../theme/ThemeContext";
import {
  CHART_LINE_WIDTH,
  CHART_SCATTER_MARKER_LINE_WIDTH,
  chartScatterMarkerStrokeRgb,
  getChartPalette,
  plotAxisFont,
  plotFont,
  plotInsetBackground,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyHoverLabel,
} from "../../theme/chartPalette";

interface Props {
  runs: readonly PpaRunManifest[];
  onInspectRun: (uid: string) => void;
}

interface TrendPoint {
  run: PpaRunManifest;
  x: number;
  y: number;
  category: string;
  invalid: boolean;
}

interface BuiltChart {
  data: Data[];
  layout: Partial<Layout>;
  pointCount: number;
  seriesCount: number;
}

const FAILURE_COLOR = seriesRgbByIndex(0);
const PARETO_COLOR = seriesRgbByIndex(1);

const SWEEP_INPUT_KEYS = [
  "target_frequency_mhz", "clock_period_ns", "width", "block_width", "operations",
  "pipeline_stages", "voltage_v", "temperature_c", "rc_scale",
] as const;
const PERFORMANCE_KEYS = ["wns_ns", "fmax_mhz", "tns_ns", "hold_slack_ns"] as const;
const TRADEOFF_X_KEYS = ["cell_area_um2", "total_power_mw", "wire_length_um", "placement_density_pct"] as const;
const TRADEOFF_Y_KEYS = ["fmax_mhz", "wns_ns", "total_power_mw", "cell_area_um2"] as const;

function numericValue(metric: PpaMetricDefinition, run: PpaRunManifest): number | null {
  return finitePpaNumber(metric.value(run));
}

function categoryValue(metric: PpaMetricDefinition | null, run: PpaRunManifest): string {
  if (!metric) return "All runs";
  const value = metric.value(run);
  return typeof value === "string" && value.trim() ? value : "Unspecified";
}

function categoryColor(category: string, index: number, metric: PpaMetricDefinition | null): string {
  return metric?.key === "architecture" ? architectureColor(category) : seriesRgbByIndex(index);
}

function escapePlotlyText(value: unknown): string {
  return String(value ?? "N/A")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function metricText(key: string, run: PpaRunManifest): string {
  const definition = ppaMetric(key);
  return definition ? formatPpaMetricValue(definition, definition.value(run)) : "N/A";
}

function tooltipData(
  point: TrendPoint,
  xMetric: PpaMetricDefinition,
  yMetric: PpaMetricDefinition,
): string[] {
  const { run } = point;
  const architecture = categoryValue(ppaMetric("architecture"), run);
  const operator = categoryValue(ppaMetric("operator"), run);
  return [
    run.uid,
    run.runName,
    formatPpaMetricValue(xMetric, point.x),
    formatPpaMetricValue(yMetric, point.y),
    architecture,
    operator,
    metricText("target_frequency_mhz", run),
    categoryValue(ppaMetric("pvt"), run),
    categoryValue(ppaMetric("rc_corner"), run),
    run.tool || run.flow,
    metricText("wns_ns", run),
    metricText("fmax_mhz", run),
    metricText("cell_area_um2", run),
    metricText("total_power_mw", run),
    point.invalid ? "Timing/physical checks failed" : "Eligible",
  ].map(escapePlotlyText);
}

const HOVER_TEMPLATE = [
  "<b>%{customdata[1]}</b>",
  "UID %{customdata[0]}",
  "<b>X:</b> %{customdata[2]}",
  "<b>Y:</b> %{customdata[3]}",
  "<b>Architecture:</b> %{customdata[4]}",
  "<b>Operator:</b> %{customdata[5]}",
  "<b>Target frequency:</b> %{customdata[6]}",
  "<b>PVT / RC:</b> %{customdata[7]} / %{customdata[8]}",
  "<b>Flow:</b> %{customdata[9]}",
  "<b>WNS / Fmax:</b> %{customdata[10]} / %{customdata[11]}",
  "<b>Cell area / power:</b> %{customdata[12]} / %{customdata[13]}",
  "<b>Status:</b> %{customdata[14]}",
  "<extra>%{fullData.name}</extra>",
].join("<br>");

function numericRange(values: readonly number[]): [number, number] | undefined {
  if (values.length === 0) return undefined;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum;
  const padding = span > 0 ? span * 0.06 : Math.max(Math.abs(minimum) * 0.06, 1);
  return [minimum - padding, maximum + padding];
}

function defaultMetric(
  options: readonly PpaMetricDefinition[],
  preferred: string,
): PpaMetricDefinition {
  return options.find((candidate) => candidate.key === preferred)
    ?? options[0]
    ?? ppaMetric(preferred)
    ?? (() => { throw new Error(`Unknown PPA metric ${preferred}`); })();
}

function groupedMetricOptions(options: readonly PpaMetricDefinition[]): Array<[string, PpaMetricDefinition[]]> {
  const groups = new Map<string, PpaMetricDefinition[]>();
  for (const option of options) {
    const values = groups.get(option.group) ?? [];
    values.push(option);
    groups.set(option.group, values);
  }
  return [...groups.entries()];
}

function MetricSelect({
  label,
  value,
  options,
  onChange,
  includeNone = false,
}: {
  label: string;
  value: string;
  options: readonly PpaMetricDefinition[];
  onChange: (value: string) => void;
  includeNone?: boolean;
}): JSX.Element {
  return (
    <label className="axis-picker ppa-trend-axis-picker">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {includeNone ? <option value="none">None</option> : null}
        {groupedMetricOptions(options).map(([group, definitions]) => (
          <optgroup key={group} label={group}>
            {definitions.map((definition) => (
              <option key={definition.key} value={definition.key}>{ppaMetricAxisTitle(definition)}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function useValidMetricSelection(
  selected: string,
  setSelected: (value: string) => void,
  options: readonly PpaMetricDefinition[],
  preferred: string,
): void {
  useEffect(() => {
    if (options.length === 0 || options.some((option) => option.key === selected)) return;
    setSelected(defaultMetric(options, preferred).key);
  }, [options, preferred, selected, setSelected]);
}

function makeBaseLayout(
  xMetric: PpaMetricDefinition,
  yMetric: PpaMetricDefinition,
  theme: "light" | "dark",
  narrow: boolean,
  xRange?: [number, number],
): Partial<Layout> {
  const palette = getChartPalette(theme);
  const surface = plotInsetBackground(theme);
  const axisFont = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const titleFont = plotAxisFont(palette.rgbAxisTitle, narrow);
  return {
    autosize: true,
    paper_bgcolor: surface,
    plot_bgcolor: surface,
    font: plotFont(palette.rgbAxisTitle),
    hoverlabel: plotlyHoverLabel(palette, narrow),
    margin: { l: narrow ? 68 : 92, r: 30, t: 30, b: narrow ? 130 : 118 },
    showlegend: true,
    hovermode: "closest",
    legend: {
      orientation: "h",
      x: 0,
      y: -0.2,
      xanchor: "left",
      yanchor: "top",
      font: { family: "Arial, sans-serif", size: narrow ? 10 : 11, color: palette.rgbAxisTick },
      tracegroupgap: 4,
    },
    xaxis: {
      ...plotlyAxisFrameX(palette),
      automargin: true,
      gridcolor: palette.axisGridGreyRgb,
      tickfont: axisFont,
      title: { text: ppaMetricAxisTitle(xMetric), font: titleFont },
      range: xRange,
    },
    yaxis: {
      ...plotlyAxisFrameY(palette),
      automargin: true,
      gridcolor: palette.axisGridBlackRgb,
      tickfont: axisFont,
      title: { text: ppaMetricAxisTitle(yMetric), font: titleFont },
      zeroline: false,
    },
    shapes: yMetric.key === "wns_ns" ? [{
      type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 0, y1: 0,
      line: { color: FAILURE_COLOR, width: 2, dash: "dash" }, layer: "above",
    }] : [],
    annotations: yMetric.key === "wns_ns" ? [{
      x: 1, y: 0, xref: "paper", yref: "y", text: "Timing closure · WNS = 0",
      showarrow: false, xanchor: "right", yshift: 12,
      font: { family: "Arial, sans-serif", size: narrow ? 10 : 12, color: FAILURE_COLOR },
    }] : [],
  };
}

function buildTrendChart(
  runs: readonly PpaRunManifest[],
  xMetric: PpaMetricDefinition,
  yMetric: PpaMetricDefinition,
  colorMetric: PpaMetricDefinition | null,
  theme: "light" | "dark",
  narrow: boolean,
  xRange?: [number, number],
): BuiltChart {
  const points = runs.flatMap((run): TrendPoint[] => {
    const x = numericValue(xMetric, run);
    const y = numericValue(yMetric, run);
    if (x === null || y === null) return [];
    return [{ run, x, y, category: categoryValue(colorMetric, run), invalid: isPpaRunInvalid(run) }];
  });
  const categories = [...new Set(points.map((point) => point.category))].sort((left, right) => left.localeCompare(right, "en"));
  const colorByCategory = new Map(categories.map((category, index) => [category, categoryColor(category, index, colorMetric)]));
  const grouped = new Map<string, TrendPoint[]>();
  for (const point of points) {
    const key = ppaTrendSeriesKey(point.run, xMetric);
    const entries = grouped.get(key) ?? [];
    entries.push(point);
    grouped.set(key, entries);
  }
  const legendShown = new Set<string>();
  const traces: Data[] = [];
  for (const entries of grouped.values()) {
    entries.sort((left, right) => left.x - right.x || left.run.uid.localeCompare(right.run.uid, "en"));
    const category = entries[0]?.category ?? "All runs";
    const uniqueX = new Set(entries.map((point) => point.x));
    const connect = entries.length > 1 && uniqueX.size === entries.length;
    const color = colorByCategory.get(category) ?? seriesRgbByIndex(0);
    const showlegend = !legendShown.has(category);
    legendShown.add(category);
    traces.push({
      type: "scatter",
      mode: connect ? "lines+markers" : "markers",
      name: category,
      legendgroup: category,
      showlegend,
      x: entries.map((point) => point.x),
      y: entries.map((point) => point.y),
      customdata: entries.map((point) => tooltipData(point, xMetric, yMetric)),
      line: { color, width: CHART_LINE_WIDTH },
      marker: {
        color,
        size: 12,
        symbol: entries.map((point) => point.invalid ? "x" : "circle"),
        line: {
          color: entries.map((point) => point.invalid ? FAILURE_COLOR : chartScatterMarkerStrokeRgb(theme)),
          width: CHART_SCATTER_MARKER_LINE_WIDTH,
        },
      },
      hovertemplate: HOVER_TEMPLATE,
      connectgaps: false,
    } as Data);
  }
  return {
    data: traces,
    layout: makeBaseLayout(xMetric, yMetric, theme, narrow, xRange),
    pointCount: points.length,
    seriesCount: grouped.size,
  };
}

function powerComparable(run: PpaRunManifest, metric: PpaMetricDefinition): boolean {
  return metric.group !== "Power" || run.summary.powerComparisonValid;
}

function buildTradeoffChart(
  runs: readonly PpaRunManifest[],
  xMetric: PpaMetricDefinition,
  yMetric: PpaMetricDefinition,
  colorMetric: PpaMetricDefinition | null,
  theme: "light" | "dark",
  narrow: boolean,
): BuiltChart & { paretoCount: number; invalidCount: number; bubblePower: boolean } {
  const points = runs.flatMap((run): TrendPoint[] => {
    const x = numericValue(xMetric, run);
    const y = numericValue(yMetric, run);
    if (x === null || y === null) return [];
    return [{ run, x, y, category: categoryValue(colorMetric, run), invalid: isPpaRunInvalid(run) }];
  });
  const categories = [...new Set(points.map((point) => point.category))].sort((left, right) => left.localeCompare(right, "en"));
  const colorByCategory = new Map(categories.map((category, index) => [category, categoryColor(category, index, colorMetric)]));
  const powerValues = points.map((point) => numericValue(ppaMetric("total_power_mw")!, point.run)).filter((value): value is number => value !== null && value >= 0);
  const bubblePower = powerValues.length > 0;
  const minPower = bubblePower ? Math.min(...powerValues) : 0;
  const maxPower = bubblePower ? Math.max(...powerValues) : 0;
  const bubbleSize = (run: PpaRunManifest) => {
    const power = numericValue(ppaMetric("total_power_mw")!, run);
    if (power === null || maxPower <= minPower) return 16;
    return 10 + Math.sqrt((power - minPower) / (maxPower - minPower)) * 20;
  };
  const traces = categories.map((category) => {
    const entries = points.filter((point) => point.category === category);
    const color = colorByCategory.get(category) ?? seriesRgbByIndex(0);
    return {
      type: "scatter",
      mode: "markers",
      name: category,
      legendgroup: category,
      x: entries.map((point) => point.x),
      y: entries.map((point) => point.y),
      customdata: entries.map((point) => tooltipData(point, xMetric, yMetric)),
      marker: {
        color,
        size: entries.map((point) => bubblePower ? bubbleSize(point.run) : 14),
        symbol: entries.map((point) => point.invalid ? "x" : "circle"),
        opacity: 0.82,
        line: {
          color: entries.map((point) => point.invalid ? FAILURE_COLOR : chartScatterMarkerStrokeRgb(theme)),
          width: CHART_SCATTER_MARKER_LINE_WIDTH,
        },
      },
      hovertemplate: HOVER_TEMPLATE,
    } as Data;
  });
  const eligible = points.filter((point) => !point.invalid
    && powerComparable(point.run, xMetric)
    && powerComparable(point.run, yMetric));
  const frontier = ppaParetoFrontier(
    eligible.map((point) => ({ item: point, x: point.x, y: point.y })),
    xMetric.direction ?? "lower",
    yMetric.direction ?? "higher",
  );
  if (frontier.length > 0) {
    traces.push({
      type: "scatter",
      mode: "lines+markers",
      name: "Pareto frontier",
      legendgroup: "pareto-frontier",
      x: frontier.map((point) => point.x),
      y: frontier.map((point) => point.y),
      customdata: frontier.map((point) => tooltipData(point.item, xMetric, yMetric)),
      line: { color: PARETO_COLOR, width: CHART_LINE_WIDTH, dash: "solid" },
      marker: {
        color: PARETO_COLOR,
        size: 12,
        symbol: "diamond",
        line: { color: chartScatterMarkerStrokeRgb(theme), width: CHART_SCATTER_MARKER_LINE_WIDTH },
      },
      hovertemplate: HOVER_TEMPLATE.replace("<extra>", "<b>Pareto optimal</b><br><extra>"),
    } as Data);
  }
  return {
    data: traces,
    layout: makeBaseLayout(xMetric, yMetric, theme, narrow),
    pointCount: points.length,
    seriesCount: categories.length,
    paretoCount: frontier.length,
    invalidCount: points.filter((point) => point.invalid).length,
    bubblePower,
  };
}

const PLOT_CONFIG: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  displayModeBar: true,
  scrollZoom: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
  toImageButtonOptions: { format: "png", filename: "ppa-trend", scale: 2 },
};

export function PpaTrendExplorer({ runs, onInspectRun }: Props): JSX.Element {
  const { theme } = useTheme();
  const narrow = useNarrowScreen(640);
  const [trendXKey, setTrendXKey] = useState("target_frequency_mhz");
  const [trendYKey, setTrendYKey] = useState("wns_ns");
  const [trendColorKey, setTrendColorKey] = useState("flow");
  const [sweepXKey, setSweepXKey] = useState("target_frequency_mhz");
  const [sweepPerformanceKey, setSweepPerformanceKey] = useState("wns_ns");
  const [sweepColorKey, setSweepColorKey] = useState("flow");
  const [tradeXKey, setTradeXKey] = useState("cell_area_um2");
  const [tradeYKey, setTradeYKey] = useState("fmax_mhz");
  const [tradeColorKey, setTradeColorKey] = useState("architecture");

  const inputOptions = useMemo(() => availablePpaMetrics(runs, "input", SWEEP_INPUT_KEYS), [runs]);
  const outputOptions = useMemo(() => availablePpaMetrics(runs, "output"), [runs]);
  const categoryOptions = useMemo(() => availablePpaMetrics(runs, "category"), [runs]);
  const performanceOptions = useMemo(() => availablePpaMetrics(runs, "output", PERFORMANCE_KEYS), [runs]);
  const tradeXOptions = useMemo(() => availablePpaMetrics(runs, "output", TRADEOFF_X_KEYS), [runs]);
  const tradeYOptions = useMemo(() => availablePpaMetrics(runs, "output", TRADEOFF_Y_KEYS), [runs]);

  useValidMetricSelection(trendXKey, setTrendXKey, inputOptions, "target_frequency_mhz");
  useValidMetricSelection(trendYKey, setTrendYKey, outputOptions, "wns_ns");
  useValidMetricSelection(sweepXKey, setSweepXKey, inputOptions, "target_frequency_mhz");
  useValidMetricSelection(sweepPerformanceKey, setSweepPerformanceKey, performanceOptions, "wns_ns");
  useValidMetricSelection(tradeXKey, setTradeXKey, tradeXOptions, "cell_area_um2");
  useValidMetricSelection(tradeYKey, setTradeYKey, tradeYOptions, "fmax_mhz");

  useEffect(() => {
    if (trendColorKey !== "none" && !categoryOptions.some((option) => option.key === trendColorKey)) {
      setTrendColorKey(categoryOptions.find((option) => option.key === "flow")?.key ?? "none");
    }
    if (sweepColorKey !== "none" && !categoryOptions.some((option) => option.key === sweepColorKey)) {
      setSweepColorKey(categoryOptions.find((option) => option.key === "flow")?.key ?? "none");
    }
    if (!categoryOptions.some((option) => option.key === tradeColorKey)) {
      setTradeColorKey(categoryOptions.find((option) => option.key === "architecture")?.key
        ?? categoryOptions.find((option) => option.key === "flow")?.key
        ?? categoryOptions[0]?.key
        ?? "none");
    }
  }, [categoryOptions, sweepColorKey, tradeColorKey, trendColorKey]);

  const trendX = defaultMetric(inputOptions, trendXKey);
  const trendY = defaultMetric(outputOptions, trendYKey);
  const trendColor = trendColorKey === "none" ? null : ppaMetric(trendColorKey);
  const sweepX = defaultMetric(inputOptions, sweepXKey);
  const sweepPerformance = defaultMetric(performanceOptions, sweepPerformanceKey);
  const sweepPower = ppaMetric("total_power_mw")!;
  const sweepArea = ppaMetric("cell_area_um2")!;
  const sweepColor = sweepColorKey === "none" ? null : ppaMetric(sweepColorKey);
  const tradeX = defaultMetric(tradeXOptions, tradeXKey);
  const tradeY = defaultMetric(tradeYOptions, tradeYKey);
  const tradeColor = tradeColorKey === "none" ? null : ppaMetric(tradeColorKey);

  const xRange = useMemo(() => numericRange(runs.flatMap((run) => {
    const value = numericValue(sweepX, run);
    return value === null ? [] : [value];
  })), [runs, sweepX]);

  const charts = useMemo(() => ({
    trend: buildTrendChart(runs, trendX, trendY, trendColor, theme, narrow),
    sweepPerformance: buildTrendChart(runs, sweepX, sweepPerformance, sweepColor, theme, narrow, xRange),
    sweepPower: buildTrendChart(runs, sweepX, sweepPower, sweepColor, theme, narrow, xRange),
    sweepArea: buildTrendChart(runs, sweepX, sweepArea, sweepColor, theme, narrow, xRange),
    tradeoff: buildTradeoffChart(runs, tradeX, tradeY, tradeColor, theme, narrow),
  }), [narrow, runs, sweepArea, sweepColor, sweepPerformance, sweepPower, sweepX, theme, tradeColor, tradeX, tradeY, trendColor, trendX, trendY, xRange]);

  const handlePointClick = useCallback((event: PlotMouseEvent) => {
    const customdata = event.points[0]?.customdata;
    const uid = Array.isArray(customdata) && typeof customdata[0] === "string" ? customdata[0] : null;
    if (uid && runs.some((run) => run.uid === uid)) onInspectRun(uid);
  }, [onInspectRun, runs]);

  const trendRef = usePlotlyChart(charts.trend.data, charts.trend.layout, PLOT_CONFIG, handlePointClick);
  const sweepPerformanceRef = usePlotlyChart(charts.sweepPerformance.data, charts.sweepPerformance.layout, PLOT_CONFIG, handlePointClick);
  const sweepPowerRef = usePlotlyChart(charts.sweepPower.data, charts.sweepPower.layout, PLOT_CONFIG, handlePointClick);
  const sweepAreaRef = usePlotlyChart(charts.sweepArea.data, charts.sweepArea.layout, PLOT_CONFIG, handlePointClick);
  const tradeoffRef = usePlotlyChart(charts.tradeoff.data, charts.tradeoff.layout, PLOT_CONFIG, handlePointClick);

  const flows = new Set(runs.map((run) => run.flow)).size;
  const processes = new Set(runs.map((run) => `${run.pdk}\0${run.scl ?? ""}`)).size;
  const timingClosed = runs.filter((run) => {
    const wns = numericValue(ppaMetric("wns_ns")!, run);
    return wns !== null && wns >= 0;
  }).length;
  const invalid = runs.filter(isPpaRunInvalid).length;

  return (
    <section className="chart-card ppa-trend-explorer">
      <header className="ppa-trend-header">
        <div>
          <span className="ppa-eyebrow">Selected-run analysis</span>
          <h2>PPA Trend Explorer</h2>
          <p className="hint">
            Trends use only the reports checked under Matching reports. The same selection drives the detailed comparison below.
          </p>
        </div>
        <div className="ppa-trend-filtered-summary" aria-label="Selected runs summary">
          <strong>{runs.length.toLocaleString()} selected runs</strong>
          <span>{flows} flow{flows === 1 ? "" : "s"} · {processes} process variant{processes === 1 ? "" : "s"}</span>
          <span>{timingClosed} timing closed · {invalid} failed/invalid</span>
        </div>
      </header>

      {runs.length === 0 ? (
        <div className="ppa-empty ppa-trend-empty">Check at least one report under Matching reports to explore its PPA trends.</div>
      ) : null}

      {runs.length > 0 ? (
        <section className="ppa-trend-panel" aria-labelledby="ppa-input-trend-title">
          <header className="ppa-trend-panel__header">
            <div>
              <h3 id="ppa-input-trend-title">Input Trend</h3>
              <p>Choose one experimental input and one backend result.</p>
            </div>
          </header>
          <div className="axis-pickers ppa-trend-controls">
            <MetricSelect label="X Axis" value={trendX.key} options={inputOptions} onChange={setTrendXKey} />
            <MetricSelect label="Y Axis" value={trendY.key} options={outputOptions} onChange={setTrendYKey} />
            <MetricSelect label="Color By" value={trendColorKey} options={categoryOptions} onChange={setTrendColorKey} includeNone />
          </div>
          <p className="ppa-trend-note">
            {charts.trend.pointCount} points · {charts.trend.seriesCount} exact-condition series. Lines appear only when all critical conditions except X match and X values are unique.
          </p>
          {charts.trend.pointCount > 0 ? (
            <div className="plot-host ppa-trend-plot"><div ref={trendRef} /></div>
          ) : <div className="ppa-empty ppa-trend-empty">No selected run contains both selected axis metrics.</div>}
        </section>
      ) : null}

      {runs.length > 0 ? (
        <section className="ppa-trend-panel" aria-labelledby="ppa-sweep-title">
          <header className="ppa-trend-panel__header">
            <div>
              <h3 id="ppa-sweep-title">PPA Sweep</h3>
              <p>Read Performance, Power, and Area against one shared input axis.</p>
            </div>
          </header>
          <div className="axis-pickers ppa-trend-controls">
            <MetricSelect label="Input Variable" value={sweepX.key} options={inputOptions} onChange={setSweepXKey} />
            <MetricSelect label="Performance" value={sweepPerformance.key} options={performanceOptions} onChange={setSweepPerformanceKey} />
            <MetricSelect label="Color By" value={sweepColorKey} options={categoryOptions} onChange={setSweepColorKey} includeNone />
          </div>
          <p className="ppa-trend-note">
            Shared numeric X range · red × marks failed or timing-violating runs · click any point to open its existing report detail.
          </p>
          <div className="ppa-sweep-stack">
            {([
              ["Performance", charts.sweepPerformance, sweepPerformanceRef],
              ["Power · Total Power", charts.sweepPower, sweepPowerRef],
              ["Area · Cell Area", charts.sweepArea, sweepAreaRef],
            ] as const).map(([title, chart, chartRef]) => (
              <section key={title} className="ppa-sweep-chart">
                <h3>{title}</h3>
                {chart.pointCount > 0 ? (
                  <div className="plot-host plot-host--short ppa-trend-plot"><div ref={chartRef} /></div>
                ) : <div className="ppa-empty ppa-trend-empty">No selected run contains this input/output metric pair.</div>}
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {runs.length > 0 ? (
        <section className="ppa-trend-panel" aria-labelledby="ppa-tradeoff-title">
          <header className="ppa-trend-panel__header">
            <div>
              <h3 id="ppa-tradeoff-title">PPA Trade-off</h3>
              <p>Compare design cost and performance with the eligible Pareto frontier.</p>
            </div>
          </header>
          <div className="axis-pickers ppa-trend-controls">
            <MetricSelect label="X Axis" value={tradeX.key} options={tradeXOptions} onChange={setTradeXKey} />
            <MetricSelect label="Y Axis" value={tradeY.key} options={tradeYOptions} onChange={setTradeYKey} />
            <MetricSelect label="Color By" value={tradeColorKey} options={categoryOptions} onChange={setTradeColorKey} />
          </div>
          <p className="ppa-trend-note">
            {charts.tradeoff.pointCount} points · {charts.tradeoff.paretoCount} Pareto-optimal · {charts.tradeoff.invalidCount} excluded from the frontier.
            {charts.tradeoff.bubblePower ? " Bubble area represents Total Power." : " Total Power is unavailable, so markers use a fixed size."}
          </p>
          {charts.tradeoff.pointCount > 0 ? (
            <div className="plot-host ppa-trend-plot ppa-tradeoff-plot"><div ref={tradeoffRef} /></div>
          ) : <div className="ppa-empty ppa-trend-empty">No selected run contains both selected trade-off metrics.</div>}
        </section>
      ) : null}
    </section>
  );
}
