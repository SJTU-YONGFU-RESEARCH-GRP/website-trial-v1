import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { Config, Data, Layout } from "plotly.js";
// Pre-minified browser build — avoids Vite bundling plotly's Node-only trace helpers.
import Plotly from "plotly.js-dist-min";
import { TechnologySelector } from "../components/TechnologySelector";
import { DigitalWorkflowPanel } from "./digital";
import { digitalChartRows, listDigitalResults } from "../api/digital/client";
import { READ_ONLY_DEMO } from "../api/client";

/** Plot container shape: flexible heights vs fixed aspect for export / mobile shells. */
export type PlotAspectMode = "flexible" | "16:9" | "4:3" | "1:1";

type DigitalChartId = "pareto" | "scatter3d" | "heatmap" | "treemap" | "pie" | "bar";

type LocalControlKey =
  | "bitWidth"
  | "barDonutBaseline"
  | "x"
  | "y"
  | "z"
  | "numericScaleX"
  | "numericScaleY"
  | "numericScaleZ";

type LocalControlSpec = {
  baseline?: boolean;
  bitWidth?: boolean;
  x?: boolean;
  y?: boolean;
  z?: boolean;
  scaleX?: boolean;
  scaleY?: boolean;
  scaleZ?: boolean;
  aspect?: boolean;
};

const DIGITAL_CHART_IDS: readonly DigitalChartId[] = [
  "pareto",
  "scatter3d",
  "heatmap",
  "treemap",
  "pie",
  "bar",
] as const;

const DEFAULT_CHART_ASPECT_MODES: Record<DigitalChartId, PlotAspectMode> = {
  pareto: "flexible",
  scatter3d: "flexible",
  heatmap: "flexible",
  treemap: "flexible",
  pie: "flexible",
  bar: "flexible",
};

const SCATTER3D_INITIAL_CAMERA = {
  center: { x: 0, y: 0, z: 0 },
  eye: { x: 1.25, y: 1.25, z: 1.25 },
  up: { x: 0, y: 0, z: 1 },
};

function resetScatter3dCamera(el: HTMLDivElement): void {
  void Plotly.relayout(
    el,
    { "scene.camera": SCATTER3D_INITIAL_CAMERA } as unknown as Partial<Layout>,
  );
}

const PLOT_ASPECT_OPTIONS: readonly { value: PlotAspectMode; label: string }[] = [
  { value: "flexible", label: "Flexible (screen height)" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
] as const;

function plotHostAspectClass(mode: PlotAspectMode): string {
  if (mode === "16:9") return "plot-host--aspect-16x9";
  if (mode === "4:3") return "plot-host--aspect-4x3";
  if (mode === "1:1") return "plot-host--aspect-1x1";
  return "";
}
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  type DesignRow,
  DESIGN_ROWS,
  architectureColor,
  seriesRgbByIndex,
  designArchOrderForRows,
  designBitWidthsForRows,
  designRowsForCategory,
  designRowsForTechnologies,
  designTechnologiesForRows,
  formatArchLabel,
} from "../data/design";
import {
  BAR_DONUT_BASELINE_OPTIONS,
  DEFAULT_EXPLORE_AXES,
  DESIGN_CATEGORIES,
  designCategoryChartTitle,
  designCategoryDefaultLabel,
  metricSupportsLogScale,
  NUMERIC_SCALE_OPTIONS,
  plotlyAxisTypeForMetric,
  SCATTER_AXIS_METRICS,
  scatterArchitectureTickAxis,
  scatter2dPointHoverHtml,
  scatter3dPointHoverHtml,
  scatterAxisOptionLabel,
  scatterAxisRange,
  scatterAxisTitle,
  scatterAxisValue,
  scene3dAxisTickHideEnds,
  syncExploreAxes,
  type BarDonutBaselineMode,
  type ExploreAxesState,
  type DesignCategoryId,
  type ExploreAxisKey,
  type NumericScaleMode,
  type ScatterAxisMetric,
} from "../data/scatterAxisMetrics";
import {
  CHART_LINE_WIDTH,
  CHART_MARKER_OUTLINE_RGB,
  CHART_SCATTER3D_MARKER_LINE_WIDTH,
  CHART_SCATTER_MARKER_LINE_WIDTH,
  chartAxisFontSizePx,
  chartScatterMarkerStrokeRgb,
  getChartPalette,
  plotInsetBackground,
  plotAxisFont,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlyHeatmapColorscale,
  plotlyHoverLabel,
  plotlySceneAxis,
} from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
  onDoubleClick?: (el: HTMLDivElement) => void,
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

    const handleDoubleClick = () => onDoubleClick?.(el);
    if (onDoubleClick) el.addEventListener("dblclick", handleDoubleClick, true);

    return () => {
      cancelled = true;
      ro.disconnect();
      if (onDoubleClick) el.removeEventListener("dblclick", handleDoubleClick, true);
      void Plotly.purge(el);
    };
  }, [data, layout, config, onDoubleClick]);

  return ref;
}

export function PlotlyPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const [exploreAxes, setExploreAxes] = useState<ExploreAxesState>(DEFAULT_EXPLORE_AXES);
  const [selectedTechnologyUids, setSelectedTechnologyUids] = useState<string[]>([
    DEFAULT_EXPLORE_AXES.technologyUid,
  ]);
  const [chartAspectModes, setChartAspectModes] = useState<Record<DigitalChartId, PlotAspectMode>>(
    DEFAULT_CHART_ASPECT_MODES,
  );
  const [pieZoomPercent, setPieZoomPercent] = useState(100);
  const [exploreArchitectureSelection, setExploreArchitectureSelection] = useState<string[]>([]);
  const [chartOverrides, setChartOverrides] = useState<
    Partial<Record<DigitalChartId, Partial<ExploreAxesState>>>
  >({});
  const [dynamicRows, setDynamicRows] = useState<DesignRow[]>([]);
  useEffect(() => {
    if (READ_ONLY_DEMO) return;
    let active = true;
    void listDigitalResults().then((results) => { if (active) setDynamicRows(digitalChartRows(results)); }).catch(() => { /* Static legacy rows remain available when the API is offline. */ });
    return () => { active = false; };
  }, []);
  const allDesignRows = useMemo(() => {
    const rows = [...DESIGN_ROWS]; const keys = new Set(rows.map((row) => `${row.category ?? ""}\0${row.architecture}\0${row.bitWidth}\0${row.processNode}`));
    for (const row of dynamicRows) {
      const key = `${row.category ?? ""}\0${row.architecture}\0${row.bitWidth}\0${row.processNode}`;
      if (!keys.has(key)) { rows.push(row); keys.add(key); }
    }
    return rows;
  }, [dynamicRows]);

  const updateGlobalExploreAxes = (
    updater: (previous: ExploreAxesState) => ExploreAxesState,
  ): void => {
    setExploreAxes(updater);
    setChartOverrides({});
  };

  const chartAxesById = useMemo(() => {
    const resolved = {} as Record<DigitalChartId, ExploreAxesState>;
    for (const chartId of DIGITAL_CHART_IDS) {
      resolved[chartId] = { ...exploreAxes, ...chartOverrides[chartId] };
    }
    return resolved;
  }, [chartOverrides, exploreAxes]);

  const setChartControl = <K extends LocalControlKey,>(
    chartId: DigitalChartId,
    key: K,
    value: ExploreAxesState[K],
  ): void => {
    setChartOverrides((previous) => ({
      ...previous,
      [chartId]: { ...previous[chartId], [key]: value },
    }));
  };

  const setChartMetric = (
    chartId: DigitalChartId,
    key: ExploreAxisKey,
    metric: ScatterAxisMetric,
  ): void => {
    const synchronized = syncExploreAxes(chartAxesById[chartId], key, metric);
    setChartOverrides((previous) => ({
      ...previous,
      [chartId]: {
        ...previous[chartId],
        x: synchronized.x,
        y: synchronized.y,
        z: synchronized.z,
      },
    }));
  };

  const resetChartControls = (chartId: DigitalChartId): void => {
    setChartOverrides((previous) => {
      const next = { ...previous };
      delete next[chartId];
      return next;
    });
    setChartAspectModes((previous) => ({ ...previous, [chartId]: "flexible" }));
  };

  /** Backend hierarchy: Technology UID -> category -> architecture -> bit width. */
  const technologyOptions = useMemo(
    () => [...designTechnologiesForRows(allDesignRows)].sort((left, right) =>
      left.uid.localeCompare(right.uid, "en"),
    ),
    [allDesignRows],
  );
  const selectedTechnologiesForExplore = useMemo(() => {
    const selected = new Set(selectedTechnologyUids);
    return technologyOptions.filter((technology) => selected.has(technology.uid));
  }, [selectedTechnologyUids, technologyOptions]);
  const selectedTechnologyNodeSet = useMemo(
    () => new Set(selectedTechnologiesForExplore.map((technology) => technology.processNode)),
    [selectedTechnologiesForExplore],
  );
  const technologyRowsForExplore = useMemo(
    () => designRowsForTechnologies(allDesignRows, [...selectedTechnologyNodeSet]),
    [allDesignRows, selectedTechnologyNodeSet],
  );
  const categoryOptionsForTechnology = useMemo(() => {
    const ids = [...new Set(technologyRowsForExplore.map((row) => row.category || "uncategorized"))];
    return ids.map((id) => ({ id, label: DESIGN_CATEGORIES.find((category) => category.id === id)?.label ?? designCategoryDefaultLabel(id) }));
  }, [technologyRowsForExplore]);
  const categoryForUi = categoryOptionsForTechnology.some((category) => category.id === exploreAxes.category)
    ? exploreAxes.category
    : categoryOptionsForTechnology[0]?.id ?? DESIGN_CATEGORIES[0].id;
  const categoryRowsForExplore = useMemo(
    () => designRowsForCategory(technologyRowsForExplore, categoryForUi),
    [technologyRowsForExplore, categoryForUi],
  );
  const exploreCategoryArchOrder = useMemo(
    () => designArchOrderForRows(categoryRowsForExplore),
    [categoryRowsForExplore],
  );
  const exploreEffectiveArchOrder = useMemo(() => {
    const full = exploreCategoryArchOrder;
    if (exploreArchitectureSelection.length === 0) return full;
    const sel = new Set(exploreArchitectureSelection);
    const filtered = full.filter((a) => sel.has(a));
    return filtered.length > 0 ? filtered : full;
  }, [exploreCategoryArchOrder, exploreArchitectureSelection]);

  useEffect(() => {
    setExploreArchitectureSelection([...exploreCategoryArchOrder]);
  }, [categoryForUi, exploreCategoryArchOrder]);

  const bitWidthOptions = useMemo(
    () => designBitWidthsForRows(categoryRowsForExplore),
    [categoryRowsForExplore],
  );
  const bitWidthForUi = bitWidthOptions.includes(exploreAxes.bitWidth)
    ? exploreAxes.bitWidth
    : bitWidthOptions[0] ?? exploreAxes.bitWidth;
  /** Keep every child selection valid beneath the selected Technology directory set. */
  useEffect(() => {
    const validUids = technologyOptions.map((technology) => technology.uid);
    setSelectedTechnologyUids((previous) => {
      const validSet = new Set(validUids);
      const resolved = previous.filter((uid) => validSet.has(uid));
      return resolved.length === previous.length
        && resolved.every((uid, index) => uid === previous[index])
        ? previous
        : resolved;
    });
    setExploreAxes((prev) => {
      const primaryTechnologyUid = selectedTechnologiesForExplore[0]?.uid ?? "";
      const bwOk = bitWidthOptions.length > 0 && bitWidthOptions.includes(prev.bitWidth);
      const category = categoryOptionsForTechnology.some((option) => option.id === prev.category)
        ? prev.category
        : categoryForUi;
      const bitWidth = bwOk ? prev.bitWidth : bitWidthOptions[0] ?? prev.bitWidth;
      if (
        primaryTechnologyUid === prev.technologyUid
        && category === prev.category
        && bitWidth === prev.bitWidth
      ) {
        return prev;
      }
      return { ...prev, technologyUid: primaryTechnologyUid, category, bitWidth };
    });
  }, [
    bitWidthOptions,
    categoryForUi,
    categoryOptionsForTechnology,
    selectedTechnologiesForExplore,
    technologyOptions,
  ]);

  const updateTechnologySelection = (uids: string[]): void => {
    const requested = new Set(uids);
    const next = technologyOptions
      .filter((technology) => requested.has(technology.uid))
      .map((technology) => technology.uid);
    setSelectedTechnologyUids(next);
    updateGlobalExploreAxes((previous) => ({ ...previous, technologyUid: next[0] ?? "" }));
  };
  const barSectionHeading =
    chartAxesById.bar.barDonutBaseline === "architecture" ? "Bar chart" : "Grouped bar";

  const toggleExploreArchitecture = (arch: string, next: boolean) => {
    setExploreArchitectureSelection((prev) => {
      const resolved =
        prev.length === 0 ? [...exploreCategoryArchOrder] : [...prev];
      const sel = new Set(resolved);
      if (next) {
        sel.add(arch);
      } else {
        if (sel.size <= 1) return resolved;
        sel.delete(arch);
      }
      return exploreCategoryArchOrder.filter((a) => sel.has(a));
    });
  };

  const renderChartDataScope = (
    chartId: DigitalChartId,
    spec: LocalControlSpec,
  ): JSX.Element => {
    const axes = chartAxesById[chartId];
    const resolvedBitWidth = bitWidthOptions.includes(axes.bitWidth)
      ? axes.bitWidth
      : bitWidthForUi;
    const usesAllBitWidths = chartId === "heatmap"
      || chartId === "treemap"
      || Boolean(spec.baseline && axes.barDonutBaseline === "bitWidth");
    const architectureSet = new Set(exploreEffectiveArchOrder);
    const selectedRows = categoryRowsForExplore.filter(
      (row) => architectureSet.has(row.architecture)
        && (usesAllBitWidths || row.bitWidth === resolvedBitWidth),
    );
    const selectedTechnologyNodes = new Set(selectedRows.map((row) => row.processNode));
    const scopeTechnologies = selectedTechnologiesForExplore.filter((technology) =>
      selectedTechnologyNodes.has(technology.processNode),
    );
    const scopeArchitectureCount = new Set(selectedRows.map((row) => row.architecture)).size;
    const scopeBitWidths = designBitWidthsForRows(selectedRows);

    return (
      <div className="chart-data-scope" aria-label={`Data scope for ${chartId} plot`}>
        <div className="explore-data-path">
          <span>Backend paths ({scopeTechnologies.length} available)</span>
          <div className="explore-data-path__list">
            {scopeTechnologies.map((technology) => {
              const widths = designBitWidthsForRows(
                selectedRows.filter((row) => row.processNode === technology.processNode),
              );
              const widthFolder = widths.length === 1
                ? `w${widths[0]}`
                : `{${widths.map((width) => `w${width}`).join(",")}}`;
              return (
                <code key={technology.uid}>
                  data/digital-technologies/{technology.uid}
                  /results/{categoryForUi}/&lt;architecture&gt;/{widthFolder}
                </code>
              );
            })}
          </div>
        </div>
        <div className="explore-data-union" aria-live="polite">
          <strong>Data union</strong>
          <span>
            {selectedRows.length} result rows from {scopeTechnologies.length} selected technology{" "}
            {scopeTechnologies.length === 1 ? "directory" : "directories"};{" "}
            {scopeArchitectureCount} architectures and {scopeBitWidths.length} bit widths in this plot.
          </span>
        </div>
      </div>
    );
  };

  const renderLocalControls = (chartId: DigitalChartId, spec: LocalControlSpec): JSX.Element => {
    const axes = chartAxesById[chartId];
    if (categoryRowsForExplore.length === 0) {
      return (
        <div className="chart-local-controls" aria-label="No data for this chart">
          <p className="chart-local-controls__empty">
            No Technology selected. Select one or more Technology UIDs above to enable this plot.
          </p>
          {renderChartDataScope(chartId, spec)}
        </div>
      );
    }
    const baselineOptions = chartId === "pareto" || chartId === "scatter3d"
      ? BAR_DONUT_BASELINE_OPTIONS.filter((option) => option.value !== "technology")
      : BAR_DONUT_BASELINE_OPTIONS;
    const baselineValue = baselineOptions.some((option) => option.value === axes.barDonutBaseline)
      ? axes.barDonutBaseline
      : baselineOptions[0].value;
    const hasOverride = chartOverrides[chartId] !== undefined
      || chartAspectModes[chartId] !== "flexible";
    return (
      <div className="chart-local-controls" aria-label="Controls for this chart only">
        <div className="chart-local-controls__header">
          <span>
            Plot filters <small>· only variables used by this plot are shown</small>
          </span>
          <button
            type="button"
            className="chart-local-controls__reset"
            disabled={!hasOverride}
            onClick={() => resetChartControls(chartId)}
          >
            Reset this plot
          </button>
        </div>
        <div className="axis-pickers chart-local-controls__pickers">
          {spec.baseline && (
            <label className="axis-picker">
              Baseline
              <select
                value={baselineValue}
                onChange={(event) =>
                  setChartControl(
                    chartId,
                    "barDonutBaseline",
                    event.target.value as BarDonutBaselineMode,
                  )
                }
              >
                {baselineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {spec.bitWidth && (!spec.baseline || axes.barDonutBaseline !== "bitWidth") && (
            <label className="axis-picker">
              Bit width
              <select
                value={bitWidthOptions.includes(axes.bitWidth) ? axes.bitWidth : bitWidthForUi}
                onChange={(event) => setChartControl(chartId, "bitWidth", Number(event.target.value))}
              >
                {bitWidthOptions.map((bitWidth) => (
                  <option key={bitWidth} value={bitWidth}>
                    {bitWidth}b
                  </option>
                ))}
              </select>
            </label>
          )}
          {(["x", "y", "z"] as const).map((axisKey) => {
            if (!spec[axisKey]) return null;
            return (
              <label key={axisKey} className="axis-picker">
                {axisKey.toUpperCase()} metric
                <select
                  value={axes[axisKey]}
                  onChange={(event) =>
                    setChartMetric(chartId, axisKey, event.target.value as ScatterAxisMetric)
                  }
                >
                  {SCATTER_AXIS_METRICS.map((metric) => (
                    <option key={metric} value={metric}>
                      {scatterAxisOptionLabel(metric)}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          {(["X", "Y", "Z"] as const).map((axisName) => {
            const enabled = spec[`scale${axisName}` as "scaleX" | "scaleY" | "scaleZ"];
            const metric = axes[axisName.toLocaleLowerCase() as "x" | "y" | "z"];
            if (!enabled || !metricSupportsLogScale(metric)) return null;
            const key = `numericScale${axisName}` as
              | "numericScaleX"
              | "numericScaleY"
              | "numericScaleZ";
            return (
              <label key={key} className="axis-picker">
                {axisName} scale
                <select
                  value={axes[key]}
                  onChange={(event) =>
                    setChartControl(chartId, key, event.target.value as NumericScaleMode)
                  }
                >
                  {NUMERIC_SCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          {spec.aspect && (
            <label className="axis-picker">
              Plot aspect
              <select
                value={chartAspectModes[chartId]}
                aria-label={`Plot aspect for ${chartId}`}
                onChange={(event) =>
                  setChartAspectModes((previous) => ({
                    ...previous,
                    [chartId]: event.target.value as PlotAspectMode,
                  }))
                }
              >
                {PLOT_ASPECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {renderChartDataScope(chartId, spec)}
      </div>
    );
  };

  const {
    paretoData,
    paretoLayout,
    paretoConfig,
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
    flexibleHeatmapHostPx,
    flexibleTreemapHostPx,
    flexiblePieHostPx,
    flexibleBarHostPx,
  } = useMemo(() => {
      const paretoEx = chartAxesById.pareto;
      const scatter3dEx = chartAxesById.scatter3d;
      const heatmapEx = chartAxesById.heatmap;
      const treemapEx = chartAxesById.treemap;
      const pieEx = chartAxesById.pie;
      const barEx = chartAxesById.bar;
      const normalizedScale = (value: NumericScaleMode): NumericScaleMode =>
        value === "log" ? "log" : "linear";
      const paretoXMetric = paretoEx.x;
      const paretoYMetric = paretoEx.y;
      const paretoScaleX = normalizedScale(paretoEx.numericScaleX);
      const paretoScaleY = normalizedScale(paretoEx.numericScaleY);
      const scatter3dXMetric = scatter3dEx.x;
      const scatter3dYMetric = scatter3dEx.y;
      const scatter3dZMetric = scatter3dEx.z;
      const scatter3dScaleX = normalizedScale(scatter3dEx.numericScaleX);
      const scatter3dScaleY = normalizedScale(scatter3dEx.numericScaleY);
      const scatter3dScaleZ = normalizedScale(scatter3dEx.numericScaleZ);
      const heatmapZMetric = heatmapEx.z;
      const heatmapScaleZ = normalizedScale(heatmapEx.numericScaleZ);
      const treemapYMetric = treemapEx.y;
      const treemapScaleY = normalizedScale(treemapEx.numericScaleY);
      const pieYMetric = pieEx.y;
      const barYMetric = barEx.y;
      const barScaleY = normalizedScale(barEx.numericScaleY);
      const paretoXAxisType = plotlyAxisTypeForMetric(paretoXMetric, paretoScaleX);
      const paretoYAxisType = plotlyAxisTypeForMetric(paretoYMetric, paretoScaleY);
      const barValueAxisType = plotlyAxisTypeForMetric(barYMetric, barScaleY);
      const barHoverYToken =
        barScaleY === "log" && metricSupportsLogScale(barYMetric)
          ? "%{customdata:.3g}"
          : "%{y:.3g}";
      const barYWithLog = (raw: number[]): { y: number[]; customdata?: number[] } => {
        if (barScaleY !== "log" || !metricSupportsLogScale(barYMetric)) {
          return { y: raw };
        }
        return {
          y: raw.map((v) => Math.max(v, 1e-30)),
          customdata: raw,
        };
      };
      const category = categoryForUi;
      const categoryRowsAll = designRowsForCategory(technologyRowsForExplore, category);
      if (categoryRowsAll.length === 0) {
        const emptyPalette = getChartPalette(theme);
        const emptySurface = plotInsetBackground(theme);
        const emptyLayout: Partial<Layout> = {
          autosize: true,
          margin: { l: 16, r: 16, t: 16, b: 16 },
          paper_bgcolor: emptySurface,
          plot_bgcolor: emptySurface,
          xaxis: { visible: false, fixedrange: true },
          yaxis: { visible: false, fixedrange: true },
          annotations: [
            {
              text: "Select at least one Technology to display data.",
              x: 0.5,
              y: 0.5,
              xref: "paper",
              yref: "paper",
              showarrow: false,
              font: plotFont(emptyPalette.rgbAxisTitle),
            },
          ],
        };
        const emptyConfig: Partial<Config> = {
          responsive: true,
          displayModeBar: false,
          displaylogo: false,
        };
        return {
          paretoData: [],
          paretoLayout: emptyLayout,
          paretoConfig: emptyConfig,
          barData: [],
          barLayout: emptyLayout,
          barConfig: emptyConfig,
          heatmapData: [],
          heatmapLayout: emptyLayout,
          heatmapConfig: emptyConfig,
          pieData: [],
          pieLayout: emptyLayout,
          pieConfig: emptyConfig,
          scatter3dData: [],
          scatter3dLayout: emptyLayout,
          scatter3dConfig: emptyConfig,
          treemapData: [],
          treemapLayout: emptyLayout,
          treemapConfig: emptyConfig,
          flexibleHeatmapHostPx: 320,
          flexibleTreemapHostPx: 320,
          flexiblePieHostPx: 320,
          flexibleBarHostPx: 320,
        };
      }
      const effectiveArchOrder = exploreEffectiveArchOrder;
      const categoryRowsFiltered = categoryRowsAll.filter((r) =>
        effectiveArchOrder.includes(r.architecture),
      );
      const categoryBitWidths = designBitWidthsForRows(categoryRowsAll);
      const categoryTechnologyNodeSet = new Set(categoryRowsAll.map((row) => row.processNode));
      const categoryTechnologies = selectedTechnologiesForExplore.filter((technology) =>
        categoryTechnologyNodeSet.has(technology.processNode),
      );
      const categoryTechnologyNodes = categoryTechnologies.map((technology) => technology.processNode);
      const technologyLabelByNode = new Map(
        categoryTechnologies.map((technology) => [technology.processNode, technology.displayName]),
      );
      const technologySelectionTitle = categoryTechnologyNodes.length === 1
        ? categoryTechnologyNodes[0]
        : `${categoryTechnologyNodes.length} selected technologies`;
      const resolveBitWidth = (candidate: number): number =>
        (categoryBitWidths as readonly number[]).includes(candidate)
          ? candidate
          : categoryBitWidths[0];
      const paretoBitWidth = resolveBitWidth(paretoEx.bitWidth);
      const scatter3dBitWidth = resolveBitWidth(scatter3dEx.bitWidth);
      const pieBitWidth = resolveBitWidth(pieEx.bitWidth);
      const barBitWidth = resolveBitWidth(barEx.bitWidth);
      const resolveBaseline = (candidate: BarDonutBaselineMode): BarDonutBaselineMode =>
        candidate === "bitWidth" || candidate === "technology" ? candidate : "architecture";
      const paretoBaseline = resolveBaseline(paretoEx.barDonutBaseline);
      const scatter3dBaseline = resolveBaseline(scatter3dEx.barDonutBaseline);
      const pieBaseline = resolveBaseline(pieEx.barDonutBaseline);
      const barBaseline = resolveBaseline(barEx.barDonutBaseline);
      const rowsForBaseline = (
        baseline: BarDonutBaselineMode,
        bitWidth: number,
      ): DesignRow[] =>
        baseline === "bitWidth"
          ? categoryRowsFiltered
          : categoryRowsFiltered.filter((r) => r.bitWidth === bitWidth);
      const paretoRows = rowsForBaseline(paretoBaseline, paretoBitWidth);
      const scatter3dRows = rowsForBaseline(scatter3dBaseline, scatter3dBitWidth);
      const rowsFiltered = categoryRowsFiltered;
      const sliceTitle = (baseline: BarDonutBaselineMode, bitWidth: number): string =>
        baseline === "bitWidth"
          ? `(${technologySelectionTitle})`
          : `(${technologySelectionTitle} · ${bitWidth}b)`;
      const palette = getChartPalette(theme);
      const scatterMarkerStroke = chartScatterMarkerStrokeRgb(theme);
      const plotSurfaceBg = plotInsetBackground(theme);
      const hoverLabel = plotlyHoverLabel(palette, narrow);
      const frameX = plotlyAxisFrameX(palette);
      const frameY = plotlyAxisFrameY(palette);
      const sceneAxX = plotlySceneAxis(palette, "grey");
      const sceneAxY = plotlySceneAxis(palette, "black");
      const sceneAxZ = plotlySceneAxis(palette, "grey");
      const axTitle = (label: string) => ({
        text: label,
        font: plotAxisFont(palette.rgbAxisTitle, narrow),
        standoff: narrow ? 10 : 14,
      });
      const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
      /** Uniform marker size (px) for 2D/3D scatters; bit width stays in hover text only. */
      const scatterMarkerSize = 12;

      const rowsByArchitecture = (rows: readonly DesignRow[]): Map<string, DesignRow[]> => {
        const grouped = new Map<string, DesignRow[]>();
        for (const row of rows) {
          const list = grouped.get(row.architecture) ?? [];
          list.push(row);
          grouped.set(row.architecture, list);
        }
        return grouped;
      };
      const paretoByArch = rowsByArchitecture(paretoRows);
      const scatter3dByArch = rowsByArchitecture(scatter3dRows);

      const paretoDataInner: Data[] = [];
      for (const arch of effectiveArchOrder) {
        const rows = paretoByArch.get(arch);
        if (!rows?.length) continue;
        const label = formatArchLabel(arch);
        paretoDataInner.push({
          type: "scatter",
          mode: "markers",
          name: label,
          x: rows.map((r) => scatterAxisValue(paretoXMetric, r, effectiveArchOrder)),
          y: rows.map((r) => scatterAxisValue(paretoYMetric, r, effectiveArchOrder)),
          text: rows.map((r) => scatter2dPointHoverHtml(r)),
          hovertemplate: "%{text}<extra></extra>",
          marker: {
            size: scatterMarkerSize,
            color: architectureColor(arch),
            opacity: 1,
            line: { width: CHART_SCATTER_MARKER_LINE_WIDTH, color: scatterMarkerStroke },
          },
        });
      }

      const paretoXRange = scatterAxisRange(paretoXMetric, effectiveArchOrder);
      const paretoYRange = scatterAxisRange(paretoYMetric, effectiveArchOrder);
      const paretoXArchTicks =
        paretoXMetric === "architecture" ? scatterArchitectureTickAxis(effectiveArchOrder) : {};
      const paretoYArchTicks =
        paretoYMetric === "architecture" ? scatterArchitectureTickAxis(effectiveArchOrder) : {};
      const paretoSliceTitle = sliceTitle(paretoBaseline, paretoBitWidth);
      const categoryChartTitle = designCategoryChartTitle(category);
      const paretoTitleText = `${categoryChartTitle}: ${scatterAxisTitle(paretoYMetric)} Vs ${scatterAxisTitle(paretoXMetric)} ${paretoSliceTitle}`;
      const paretoTitleNarrow = plotlyBold(paretoTitleText);
      const paretoTitleWide = plotlyBold(paretoTitleText);

      const paretoLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 42, r: 14, t: 20, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleNarrow,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              zeroline: false,
              type: paretoXAxisType,
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
              zeroline: false,
              type: paretoYAxisType,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 48, r: 24, t: 32, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: paretoTitleWide,
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            xaxis: {
              ...frameX,
              zeroline: false,
              type: paretoXAxisType,
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
              zeroline: false,
              type: paretoYAxisType,
              layer: "below traces",
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(scatterAxisTitle(paretoYMetric)),
              tickfont: axTick,
              ...paretoYArchTicks,
              ...(paretoYRange ? { range: paretoYRange } : {}),
            },
            hovermode: "closest",
            hoverlabel: hoverLabel,
          };

      const commonConfig: Partial<Config> = {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        doubleClick: "reset",
        displaylogo: false,
        ...(narrow
          ? { modeBarButtonsToRemove: ["lasso2d", "select2d"] as const }
          : {}),
        toImageButtonOptions: { format: "png", filename: "plotly-chart" },
      };

      /** Pie traces default to a tiny modebar (often only PNG); restore 2D + pie hover like other charts. */
      const pieChartConfig: Partial<Config> = {
        ...commonConfig,
        modeBarButtonsToAdd: [
          "zoom2d",
          "pan2d",
          "zoomIn2d",
          "zoomOut2d",
          "autoScale2d",
          "resetScale2d",
          "hoverClosestPie",
        ],
      };

      const nonZoomModeBarButtons: NonNullable<Config["modeBarButtonsToRemove"]> = [
        "zoom2d",
        "pan2d",
        "zoomIn2d",
        "zoomOut2d",
        "autoScale2d",
        "resetScale2d",
        "select2d",
        "lasso2d",
      ];
      const heatmapChartConfig: Partial<Config> = {
        ...commonConfig,
        scrollZoom: false,
        doubleClick: false,
        modeBarButtonsToRemove: nonZoomModeBarButtons,
      };
      const barChartConfig: Partial<Config> = {
        ...commonConfig,
        scrollZoom: false,
        doubleClick: false,
        modeBarButtonsToRemove: nonZoomModeBarButtons,
      };

      const categoryRowIndex = new Map(
        categoryRowsFiltered.map((row) => [
          `${row.processNode}\u0000${row.architecture}\u0000${row.bitWidth}`,
          row,
        ]),
      );

      const metricAtArchBwProc = (
        metric: ScatterAxisMetric,
        arch: string,
        bw: number,
        proc: string,
      ): number => {
        const row = categoryRowIndex.get(`${proc}\u0000${arch}\u0000${bw}`);
        return row ? scatterAxisValue(metric, row, effectiveArchOrder) : Number.NaN;
      };

      const sumMetricAt = (metric: ScatterAxisMetric, proc: string, bw: number): number =>
        effectiveArchOrder.reduce((sum, arch) => {
          const value = metricAtArchBwProc(metric, arch, bw, proc);
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);

      const pieSliceColors = (count: number): string[] =>
        Array.from({ length: count }, (_, i) => seriesRgbByIndex(i));

      const barRowsAtBw = categoryRowsFiltered.filter((row) => row.bitWidth === barBitWidth);
      const pieRowsAtBw = categoryRowsFiltered.filter((row) => row.bitWidth === pieBitWidth);
      const barGrouped = barBaseline !== "architecture" || categoryTechnologyNodes.length > 1;
      const barHorizontal = barBaseline === "architecture" && effectiveArchOrder.length > 12;

      const barLine = { width: CHART_LINE_WIDTH, color: CHART_MARKER_OUTLINE_RGB };

      /** In-bar value copy: short numeric string, then wrapped with Plotly HTML bold. */
      const formatBarInsideValue = (v: number): string => {
        if (!Number.isFinite(v)) return "—";
        if (barYMetric === "bitWidth" || barYMetric === "architecture") {
          return String(Math.round(v));
        }
        return Number.parseFloat(v.toPrecision(3)).toString();
      };

      /** Grouped/single bar: white inside colored bars; theme color when Plotly places labels outside (`textposition: auto`). */
      const barInsideTextFont = { ...plotAxisFont("#ffffff", narrow), weight: "bold" as const };
      const barOutsideTextFont = { ...plotAxisFont(palette.rgbAxisTitle, narrow), weight: "bold" as const };

      let barDataInner: Data[];
      let barXTitle: string;
      let barTitleNarrow: string;
      let barTitleWide: string;

      if (barBaseline === "architecture") {
        const architectureLabels = effectiveArchOrder.map(formatArchLabel);
        const availableTechnologyNodes = categoryTechnologyNodes.filter((proc) =>
          barRowsAtBw.some((row) => row.processNode === proc),
        );
        barDataInner = availableTechnologyNodes.map((proc, technologyIndex) => {
          const rawBarY = effectiveArchOrder.map((arch) =>
            metricAtArchBwProc(barYMetric, arch, barBitWidth, proc),
          );
          const { y: barYArch, customdata: barCdArch } = barYWithLog(rawBarY);
          const technologyLabel = technologyLabelByNode.get(proc) ?? proc;
          const markerColor = availableTechnologyNodes.length === 1
            ? effectiveArchOrder.map(architectureColor)
            : seriesRgbByIndex(technologyIndex);
          return {
            type: "bar" as const,
            ...(barHorizontal ? { orientation: "h" as const } : {}),
            name: technologyLabel,
            ...(barHorizontal
              ? { x: barYArch, y: architectureLabels }
              : { x: architectureLabels, y: barYArch }),
            ...(barCdArch ? { customdata: barCdArch } : {}),
            text: rawBarY.map((value) => plotlyBold(formatBarInsideValue(value))),
            textposition: "auto",
            insidetextfont: barInsideTextFont,
            outsidetextfont: barOutsideTextFont,
            marker: { color: markerColor, line: barLine },
            hovertemplate: barHorizontal
              ? `<b>%{y}</b><br><b>Technology:</b> ${technologyLabel}<br><b>${scatterAxisTitle(barYMetric)}:</b> %{x:.3g}<extra></extra>`
              : `<b>%{x}</b><br><b>Technology:</b> ${technologyLabel}<br><b>${scatterAxisTitle(barYMetric)}:</b> ${barHoverYToken}<extra></extra>`,
          } as unknown as Data;
        });
        barXTitle = barHorizontal ? scatterAxisTitle(barYMetric) : "Architecture";
        barTitleNarrow = `${scatterAxisTitle(barYMetric)} @ ${barBitWidth}b (bar)`;
        barTitleWide = `${scatterAxisTitle(barYMetric)} at ${barBitWidth}-bit width (selected technologies × architecture)`;
      } else if (barBaseline === "bitWidth") {
        const xCat = categoryBitWidths.map((bw) => `${bw}b`);
        barDataInner = categoryTechnologyNodes.flatMap((proc, technologyIndex) =>
          effectiveArchOrder
            .filter((arch) => categoryBitWidths.some((bw) => Number.isFinite(
              metricAtArchBwProc(barYMetric, arch, bw, proc),
            )))
            .map((arch, architectureIndex) => {
              const architectureLabel = formatArchLabel(arch);
              const technologyLabel = technologyLabelByNode.get(proc) ?? proc;
              const rawY = categoryBitWidths.map((bw) =>
                metricAtArchBwProc(barYMetric, arch, bw, proc),
              );
              const { y: yPlot, customdata: cd } = barYWithLog(rawY);
              return {
                type: "bar" as const,
                name: `${technologyLabel} · ${architectureLabel}`,
                x: xCat,
                y: yPlot,
                ...(cd ? { customdata: cd } : {}),
                text: rawY.map((v) => plotlyBold(formatBarInsideValue(v))),
                textposition: "auto",
                insidetextfont: barInsideTextFont,
                outsidetextfont: barOutsideTextFont,
                marker: {
                  color: seriesRgbByIndex(technologyIndex * effectiveArchOrder.length + architectureIndex),
                  line: barLine,
                },
                hovertemplate:
                  `<b>${architectureLabel}</b><br><b>Technology:</b> ${technologyLabel}<br>%{x}<br><b>${scatterAxisTitle(barYMetric)}:</b> ${barHoverYToken}<extra></extra>`,
              } as Data;
            }),
        );
        barXTitle = "Bit width";
        barTitleNarrow = `${scatterAxisTitle(barYMetric)} vs bit width · ${technologySelectionTitle}`;
        barTitleWide = `${scatterAxisTitle(barYMetric)} by bit width (${technologySelectionTitle})`;
      } else {
        const xCat = [...categoryTechnologyNodes];
        barDataInner = effectiveArchOrder.map((arch) => {
          const label = formatArchLabel(arch);
          const rawY = categoryTechnologyNodes.map((proc) =>
            metricAtArchBwProc(barYMetric, arch, barBitWidth, proc),
          );
          const { y: yPlot, customdata: cd } = barYWithLog(rawY);
          return {
            type: "bar" as const,
            name: label,
            x: xCat,
            y: yPlot,
            ...(cd ? { customdata: cd } : {}),
            text: rawY.map((v) => plotlyBold(formatBarInsideValue(v))),
            textposition: "auto",
            insidetextfont: barInsideTextFont,
            outsidetextfont: barOutsideTextFont,
            marker: {
              color: architectureColor(arch),
              line: barLine,
            },
            hovertemplate:
              `<b>${label}</b><br>%{x}<br><b>${scatterAxisTitle(barYMetric)}:</b> ${barHoverYToken}<extra></extra>`,
          } as Data;
        });
        barXTitle = "Technology";
        barTitleNarrow = `${scatterAxisTitle(barYMetric)} vs technology @ ${barBitWidth}b`;
        barTitleWide = `${scatterAxisTitle(barYMetric)} by technology (bit-width baseline ${barBitWidth}b)`;
      }

      const barLegendWide = barGrouped
        ? {
            orientation: "v" as const,
            yanchor: "top" as const,
            y: 1,
            xanchor: "left" as const,
            x: 1.01,
            font: { ...plotAxisFont(palette.rgbAxisTitle, narrow), size: chartAxisFontSizePx(narrow) - 1 },
          }
        : undefined;

      const barLegendNarrow = barGrouped
        ? {
            orientation: "h" as const,
            yanchor: "top" as const,
            y: -0.22,
            xanchor: "center" as const,
            x: 0.5,
            font: { ...plotAxisFont(palette.rgbAxisTitle, narrow), size: 9 },
          }
        : undefined;

      const barMarginRight = barGrouped ? (narrow ? 12 : 220) : narrow ? 14 : 24;
      const barMarginBottom = barHorizontal ? 56 : barGrouped ? (narrow ? 140 : 72) : narrow ? 88 : 72;
      const barMarginLeft = barHorizontal ? (narrow ? 142 : 220) : narrow ? 46 : 52;

      const barLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: barMarginLeft, r: barMarginRight, t: 20, b: barMarginBottom },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(barTitleNarrow),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: barGrouped,
            ...(barGrouped && barLegendNarrow
              ? { legend: barLegendNarrow, barmode: "group" as const }
              : {}),
            xaxis: {
              ...frameX,
              fixedrange: true,
              ...(barHorizontal ? { type: barValueAxisType } : {}),
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(barXTitle),
              tickangle: barHorizontal ? 0 : barBaseline === "technology" ? -42 : -28,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              fixedrange: true,
              ...(barHorizontal
                ? { autorange: "reversed" as const }
                : { type: barValueAxisType }),
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(barHorizontal ? "Architecture" : scatterAxisTitle(barYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: barMarginLeft, r: barMarginRight, t: 32, b: barMarginBottom },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(barTitleWide),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: barGrouped,
            ...(barGrouped && barLegendWide
              ? { legend: barLegendWide, barmode: "group" as const, bargroupgap: 0.08 }
              : {}),
            xaxis: {
              ...frameX,
              fixedrange: true,
              ...(barHorizontal ? { type: barValueAxisType } : {}),
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle(barXTitle),
              tickangle: barHorizontal ? 0 : barBaseline === "technology" ? -35 : -18,
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              fixedrange: true,
              ...(barHorizontal
                ? { autorange: "reversed" as const }
                : { type: barValueAxisType }),
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle(barHorizontal ? "Architecture" : scatterAxisTitle(barYMetric)),
              tickfont: axTick,
            },
            hovermode: "x unified",
            bargap: barGrouped ? 0.18 : 0.28,
            hoverlabel: hoverLabel,
          };

      let pieDataInner: Data[];
      let pieTitleNarrow: string;
      let pieTitleWide: string;
      const pieHighDensity = pieBaseline === "architecture" && pieRowsAtBw.length > 10;

      /** Inside slices: white on saturated fills. Outside (Plotly auto): theme axis title color on paper/plot bg. */
      const pieInsideTextFont = plotAxisFont("#ffffff", narrow);
      const pieOutsideTextFont = plotAxisFont(palette.rgbAxisTitle, narrow);

      if (pieBaseline === "architecture") {
        pieDataInner = [
          {
            type: "pie",
            domain: { x: pieHighDensity ? [0, narrow ? 0.52 : 0.65] : [0, 1], y: [0, 1] },
            labels: pieRowsAtBw.map((r) =>
              categoryTechnologyNodes.length > 1
                ? `${r.processNode} · ${formatArchLabel(r.architecture)}`
                : formatArchLabel(r.architecture),
            ),
            values: pieRowsAtBw.map((r) => scatterAxisValue(pieYMetric, r, effectiveArchOrder)),
            marker: {
              colors: pieRowsAtBw.map((r, index) =>
                categoryTechnologyNodes.length > 1 ? seriesRgbByIndex(index) : architectureColor(r.architecture),
              ),
              line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
            },
            hole: 0.38,
            textinfo: pieHighDensity ? "percent" : "label+percent",
            insidetextfont: pieInsideTextFont,
            outsidetextfont: pieOutsideTextFont,
            hovertemplate:
              "<b>%{label}</b><br><b>Value:</b> %{value:.3g}<br><b>Share:</b> %{percent}<extra></extra>",
          },
        ];
        pieTitleNarrow = `${scatterAxisTitle(pieYMetric)} share @ ${pieBitWidth}b`;
        pieTitleWide = `${scatterAxisTitle(pieYMetric)} share at ${pieBitWidth}-bit width (${technologySelectionTitle})`;
      } else if (pieBaseline === "bitWidth") {
        const technologyWidthSlices = categoryTechnologyNodes.flatMap((proc) =>
          categoryBitWidths
            .filter((bw) => categoryRowsFiltered.some((row) => row.processNode === proc && row.bitWidth === bw))
            .map((bw) => ({
              label: categoryTechnologyNodes.length > 1 ? `${proc} · ${bw}b` : `${bw}b`,
              value: sumMetricAt(pieYMetric, proc, bw),
            })),
        );
        const pieLabels = technologyWidthSlices.map((slice) => slice.label);
        const pieValues = technologyWidthSlices.map((slice) => slice.value);
        pieDataInner = [
          {
            type: "pie",
            domain: { x: [0, 1], y: [0, 1] },
            labels: pieLabels,
            values: pieValues,
            marker: {
              colors: pieSliceColors(pieLabels.length),
              line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
            },
            hole: 0.38,
            textinfo: "label+percent",
            insidetextfont: pieInsideTextFont,
            outsidetextfont: pieOutsideTextFont,
            hovertemplate:
              "<b>%{label}</b><br><b>Σ architectures:</b> %{value:.3g}<br><b>Share:</b> %{percent}<extra></extra>",
          },
        ];
        pieTitleNarrow = `Σ ${scatterAxisTitle(pieYMetric)} by bit width`;
        pieTitleWide = `${scatterAxisTitle(pieYMetric)} pooled across architectures (${technologySelectionTitle})`;
      } else {
        const technologySlices = categoryTechnologyNodes
          .filter((proc) => categoryRowsFiltered.some(
            (row) => row.processNode === proc && row.bitWidth === pieBitWidth,
          ))
          .map((proc) => ({ proc, value: sumMetricAt(pieYMetric, proc, pieBitWidth) }));
        const pieLabels = technologySlices.map(({ proc }) => technologyLabelByNode.get(proc) ?? proc);
        const pieValues = technologySlices.map(({ value }) => value);
        pieDataInner = [
          {
            type: "pie",
            domain: { x: [0, 1], y: [0, 1] },
            labels: pieLabels,
            values: pieValues,
            marker: {
              colors: pieSliceColors(pieLabels.length),
              line: { color: CHART_MARKER_OUTLINE_RGB, width: CHART_LINE_WIDTH },
            },
            hole: 0.38,
            textinfo: "label+percent",
            insidetextfont: pieInsideTextFont,
            outsidetextfont: pieOutsideTextFont,
            hovertemplate:
              "<b>%{label}</b><br><b>Σ architectures:</b> %{value:.3g}<br><b>Share:</b> %{percent}<extra></extra>",
          },
        ];
        pieTitleNarrow = `Σ ${scatterAxisTitle(pieYMetric)} by technology @ ${pieBitWidth}b`;
        pieTitleWide = `${scatterAxisTitle(pieYMetric)} pooled across architectures @ ${pieBitWidth}b`;
      }

      /**
       * Donut traces sit on Plotly's cartesian subplot; default pie layouts often fix axis ranges, which
       * disables box/scroll zoom. Hidden axes with `fixedrange: false` match Pareto scatter interaction.
       */
      const pieZoomLayout: Partial<Layout> = {
        dragmode: "zoom",
        xaxis: {
          visible: false,
          fixedrange: false,
          showgrid: false,
          zeroline: false,
        },
        yaxis: {
          visible: false,
          fixedrange: false,
          showgrid: false,
          zeroline: false,
          scaleanchor: "x",
          scaleratio: 1,
        },
      };

      const pieLayoutInner: Partial<Layout> = narrow
        ? {
            ...pieZoomLayout,
            autosize: true,
            margin: { l: 12, r: pieHighDensity ? 170 : 12, t: 20, b: 12 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(pieTitleNarrow),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: pieHighDensity,
            ...(pieHighDensity
              ? {
                  legend: {
                    orientation: "v" as const,
                    x: 1.01,
                    xanchor: "left" as const,
                    y: 1,
                    yanchor: "top" as const,
                    font: { ...plotAxisFont(palette.rgbAxisTitle, narrow), size: 9 },
                  },
                }
              : {}),
            hoverlabel: hoverLabel,
          }
        : {
            ...pieZoomLayout,
            autosize: true,
            margin: { l: 16, r: pieHighDensity ? 260 : 16, t: 36, b: 16 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(pieTitleWide),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: pieHighDensity,
            ...(pieHighDensity
              ? {
                  legend: {
                    orientation: "v" as const,
                    x: 1.01,
                    xanchor: "left" as const,
                    y: 1,
                    yanchor: "top" as const,
                    font: { ...plotAxisFont(palette.rgbAxisTitle, narrow), size: 10 },
                  },
                }
              : {}),
            hoverlabel: hoverLabel,
          };

      const heatmapRows = categoryTechnologyNodes.flatMap((proc) =>
        effectiveArchOrder
          .filter((arch) => categoryRowsFiltered.some(
            (row) => row.processNode === proc && row.architecture === arch,
          ))
          .map((arch) => ({ proc, arch })),
      );
      const colLabels = categoryBitWidths.map((bw) => `${bw}`);
      const rowLabels = heatmapRows.map(({ proc, arch }) =>
        categoryTechnologyNodes.length > 1
          ? `${proc} · ${formatArchLabel(arch)}`
          : formatArchLabel(arch),
      );
      const heatZ = heatmapRows.map(({ proc, arch }) =>
        categoryBitWidths.map((bw) => metricAtArchBwProc(heatmapZMetric, arch, bw, proc)),
      );
      const heatmapLogZ =
        heatmapScaleZ === "log" && metricSupportsLogScale(heatmapZMetric);
      const heatZPlot = heatmapLogZ
        ? heatZ.map((row) => row.map((v) => (v > 0 ? Math.log10(v) : Number.NaN)))
        : heatZ;
      const heatmapZTitle = heatmapLogZ
        ? `${scatterAxisTitle(heatmapZMetric)} (log₁₀)`
        : scatterAxisTitle(heatmapZMetric);
      const heatmapDataInner: Data[] = [
        {
          type: "heatmap",
          x: colLabels,
          y: rowLabels,
          z: heatZPlot,
          customdata: heatZ,
          colorscale: plotlyHeatmapColorscale(palette, theme),
          hovertemplate:
            `<b>Bit width %{x}</b><br><b>%{y}</b><br><b>${scatterAxisTitle(heatmapZMetric)}:</b> %{customdata}<extra></extra>`,
          colorbar: {
            title: axTitle(heatmapZTitle),
            tickfont: axTick,
          },
        },
      ];

      const heatmapLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            dragmode: false,
            margin: { l: 72, r: 18, t: 20, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(heatmapZMetric)} heatmap${heatmapLogZ ? " (log₁₀ color)" : ""}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              fixedrange: true,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              fixedrange: true,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            dragmode: false,
            margin: { l: 120, r: 100, t: 32, b: 56 },
            paper_bgcolor: plotSurfaceBg,
            plot_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(
                `${scatterAxisTitle(heatmapZMetric)} — architecture × bit width${heatmapLogZ ? " (log₁₀ color)" : ""}`,
              ),
              font: plotFont(palette.rgbAxisTitle),
            },
            xaxis: {
              ...frameX,
              fixedrange: true,
              automargin: true,
              gridcolor: palette.axisGridGreyRgb,
              title: axTitle("Bit width"),
              tickfont: axTick,
            },
            yaxis: {
              ...frameY,
              fixedrange: true,
              automargin: true,
              gridcolor: palette.axisGridBlackRgb,
              title: axTitle("Architecture"),
              tickfont: axTick,
            },
            hoverlabel: hoverLabel,
          };

      const sceneAxisFor = (
        base: typeof sceneAxX,
        metric: ScatterAxisMetric,
        scale: NumericScaleMode,
      ) => ({
        ...base,
        title: axTitle(scatterAxisTitle(metric)),
        tickfont: axTick,
        ...scene3dAxisTickHideEnds(
          metric,
          scatter3dRows,
          6,
          effectiveArchOrder,
          categoryBitWidths,
          scale,
        ),
        type: plotlyAxisTypeForMetric(metric, scale),
      });

      const scatter3dDataInner: Data[] = [];
      for (const arch of effectiveArchOrder) {
        const rows = scatter3dByArch.get(arch);
        if (!rows?.length) continue;
        scatter3dDataInner.push({
          type: "scatter3d",
          mode: "markers",
          name: formatArchLabel(arch),
          x: rows.map((r) => scatterAxisValue(scatter3dXMetric, r, effectiveArchOrder)),
          y: rows.map((r) => scatterAxisValue(scatter3dYMetric, r, effectiveArchOrder)),
          z: rows.map((r) => scatterAxisValue(scatter3dZMetric, r, effectiveArchOrder)),
          text: rows.map((r) => scatter3dPointHoverHtml(r)),
          hovertemplate: "%{text}<extra></extra>",
          marker: {
            size: scatterMarkerSize,
            color: architectureColor(arch),
            opacity: 1,
            line: { width: CHART_SCATTER3D_MARKER_LINE_WIDTH, color: scatterMarkerStroke },
          },
        });
      }

      const scatter3dSliceTitle = sliceTitle(scatter3dBaseline, scatter3dBitWidth);
      const scatter3dTitleText = `${categoryChartTitle}: ${scatterAxisTitle(scatter3dXMetric)} × ${scatterAxisTitle(scatter3dYMetric)} × ${scatterAxisTitle(scatter3dZMetric)} ${scatter3dSliceTitle}`;

      const scatter3dLayoutInner: Partial<Layout> = narrow
        ? {
            autosize: true,
            margin: { l: 0, r: 0, t: 22, b: 0 },
            paper_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(scatter3dTitleText),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: plotSurfaceBg,
              camera: SCATTER3D_INITIAL_CAMERA,
              aspectmode: "cube",
              aspectratio: { x: 1, y: 1, z: 1.15 },
              xaxis: sceneAxisFor(sceneAxX, scatter3dXMetric, scatter3dScaleX),
              yaxis: sceneAxisFor(sceneAxY, scatter3dYMetric, scatter3dScaleY),
              zaxis: sceneAxisFor(sceneAxZ, scatter3dZMetric, scatter3dScaleZ),
            },
            hoverlabel: hoverLabel,
          }
        : {
            autosize: true,
            margin: { l: 0, r: 0, t: 34, b: 0 },
            paper_bgcolor: plotSurfaceBg,
            font: plotFont(palette.rgbAxisTitle),
            title: {
              text: plotlyBold(scatter3dTitleText),
              font: plotFont(palette.rgbAxisTitle),
            },
            showlegend: false,
            scene: {
              bgcolor: plotSurfaceBg,
              camera: SCATTER3D_INITIAL_CAMERA,
              aspectmode: "cube",
              aspectratio: { x: 1, y: 1, z: 1.15 },
              xaxis: sceneAxisFor(sceneAxX, scatter3dXMetric, scatter3dScaleX),
              yaxis: sceneAxisFor(sceneAxY, scatter3dYMetric, scatter3dScaleY),
              zaxis: sceneAxisFor(sceneAxZ, scatter3dZMetric, scatter3dScaleZ),
            },
            hoverlabel: hoverLabel,
          };

      const treemapLeaves = rowsFiltered.map((row) => ({
        row,
        value: scatterAxisValue(treemapYMetric, row, effectiveArchOrder),
      }));
      const treemapTechnologyValues = categoryTechnologyNodes.map((proc) =>
        treemapLeaves
          .filter(({ row }) => row.processNode === proc)
          .reduce((sum, leaf) => sum + leaf.value, 0),
      );
      const treemapTotal = treemapTechnologyValues.reduce((sum, value) => sum + value, 0);
      const tmIds = [
        "design",
        ...categoryTechnologyNodes.map((proc) => `technology/${proc}`),
        ...treemapLeaves.map(({ row }) =>
          `technology/${row.processNode}/${row.architecture}/w${row.bitWidth}`,
        ),
      ];
      const tmLabels = [
        "Design",
        ...categoryTechnologyNodes.map((proc) => technologyLabelByNode.get(proc) ?? proc),
        ...treemapLeaves.map(({ row }) => `${formatArchLabel(row.architecture)} · ${row.bitWidth}b`),
      ];
      const tmParents = [
        "",
        ...categoryTechnologyNodes.map(() => "design"),
        ...treemapLeaves.map(({ row }) => `technology/${row.processNode}`),
      ];
      const tmValues = [
        treemapTotal,
        ...treemapTechnologyValues,
        ...treemapLeaves.map(({ value }) => value),
      ];
      const treemapLog =
        treemapScaleY === "log" && metricSupportsLogScale(treemapYMetric);
      const tmValuesPlot =
        treemapLog && treemapLeaves.length > 0
          ? (() => {
              const logarithms = treemapLeaves.map(({ value }) => Math.log10(Math.max(value, 1e-30)));
              const minimum = Math.min(...logarithms);
              const shift = minimum <= 0 ? -minimum + 1e-6 : 0;
              const leafWeights = logarithms.map((value) => value + shift);
              const technologyWeights = categoryTechnologyNodes.map((proc) =>
                leafWeights.reduce(
                  (sum, weight, index) =>
                    sum + (treemapLeaves[index].row.processNode === proc ? weight : 0),
                  0,
                ),
              );
              return [
                technologyWeights.reduce((sum, value) => sum + value, 0),
                ...technologyWeights,
                ...leafWeights,
              ];
            })()
          : tmValues;
      const treemapColors = [
        palette.axisBorderRgb,
        ...categoryTechnologyNodes.map((_, index) => seriesRgbByIndex(index)),
        ...rowsFiltered.map((r) => architectureColor(r.architecture)),
      ];
      const treemapDataInner: Data[] = [
        {
          type: "treemap",
          branchvalues: "total",
          domain: { x: [0, 1], y: [0, 1] },
          ids: tmIds,
          labels: tmLabels,
          parents: tmParents,
          values: tmValuesPlot,
          customdata: tmValues,
          tiling: { packing: "squarify", pad: 2 },
          textfont: plotAxisFont("#ffffff", narrow),
          marker: { colors: treemapColors },
          hovertemplate: treemapLog
            ? `<b>%{label}</b><br><b>${scatterAxisTitle(treemapYMetric)} (raw):</b> %{customdata:.3g}<br><b>Positive log₁₀ area weight:</b> %{value:.3g}<extra></extra>`
            : `<b>%{label}</b><br><b>${scatterAxisTitle(treemapYMetric)}:</b> %{customdata}<extra></extra>`,
        } as Data,
      ];

      const treemapTitleBase = narrow
        ? `${scatterAxisTitle(treemapYMetric)} treemap`
        : `${scatterAxisTitle(treemapYMetric)} — hierarchy`;
      const treemapTitleText = treemapLog ? `${treemapTitleBase} (log₁₀-weighted areas)` : treemapTitleBase;

      const treemapLayoutInner: Partial<Layout> = {
        autosize: true,
        margin: { l: 4, r: 4, t: narrow ? 22 : 34, b: 4 },
        paper_bgcolor: plotSurfaceBg,
        plot_bgcolor: plotSurfaceBg,
        font: plotFont(palette.rgbAxisTitle),
        title: {
          text: plotlyBold(treemapTitleText),
          font: plotFont(palette.rgbAxisTitle),
        },
        showlegend: false,
        hoverlabel: hoverLabel,
      };

      const flexibleHeatmapHostPx = Math.min(1100, Math.max(300, 236 + heatmapRows.length * 28));
      const treemapLeafCount = rowsFiltered.length;
      const flexibleTreemapHostPx = Math.min(
        960,
        Math.max(280, 208 + Math.min(treemapLeafCount, 72) * 13),
      );
      const flexiblePieHostPx = pieHighDensity
        ? Math.min(900, Math.max(480, 120 + pieRowsAtBw.length * 18))
        : 360;
      const flexibleBarHostPx = barHorizontal
        ? Math.min(1240, Math.max(440, 145 + effectiveArchOrder.length * 27))
        : 440;

      return {
        paretoData: paretoDataInner,
        paretoLayout: paretoLayoutInner,
        paretoConfig: commonConfig,
        barData: barDataInner,
        barLayout: barLayoutInner,
        barConfig: barChartConfig,
        heatmapData: heatmapDataInner,
        heatmapLayout: heatmapLayoutInner,
        heatmapConfig: heatmapChartConfig,
        pieData: pieDataInner,
        pieLayout: pieLayoutInner,
        pieConfig: pieChartConfig,
        scatter3dData: scatter3dDataInner,
        scatter3dLayout: scatter3dLayoutInner,
        scatter3dConfig: commonConfig,
        treemapData: treemapDataInner,
        treemapLayout: treemapLayoutInner,
        treemapConfig: commonConfig,
        flexibleHeatmapHostPx,
        flexibleTreemapHostPx,
        flexiblePieHostPx,
        flexibleBarHostPx,
      };
    }, [
      categoryForUi,
      chartAxesById,
      exploreAxes,
      exploreEffectiveArchOrder,
      narrow,
      selectedTechnologiesForExplore,
      technologyRowsForExplore,
      theme,
    ]);

  const paretoRef = usePlotlyChart(paretoData, paretoLayout, paretoConfig);
  const scatter3dRef = usePlotlyChart(
    scatter3dData,
    scatter3dLayout,
    scatter3dConfig,
    resetScatter3dCamera,
  );
  const heatmapRef = usePlotlyChart(heatmapData, heatmapLayout, heatmapConfig);
  const treemapRef = usePlotlyChart(treemapData, treemapLayout, treemapConfig);
  const pieRef = usePlotlyChart(pieData, pieLayout, pieConfig);
  const barRef = usePlotlyChart(barData, barLayout, barConfig);

  const aspectExtraFor = (chartId: DigitalChartId): string =>
    plotHostAspectClass(chartAspectModes[chartId]);
  const heatmapHostPlotStyle: CSSProperties = {
    minHeight: flexibleHeatmapHostPx,
    ...(chartAspectModes.heatmap === "flexible" ? { height: flexibleHeatmapHostPx } : {}),
  };
  const treemapHostPlotStyle: CSSProperties = {
    minHeight: flexibleTreemapHostPx,
    ...(chartAspectModes.treemap === "flexible" ? { height: flexibleTreemapHostPx } : {}),
  };
  const pieHostPlotStyle: CSSProperties = {
    width: `${pieZoomPercent}%`,
    minHeight: flexiblePieHostPx * (pieZoomPercent / 100),
    ...(chartAspectModes.pie === "flexible"
      ? { height: flexiblePieHostPx * (pieZoomPercent / 100) }
      : {}),
  };
  const barHostPlotStyle: CSSProperties = {
    minHeight: flexibleBarHostPx,
    ...(chartAspectModes.bar === "flexible" ? { height: flexibleBarHostPx } : {}),
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      for (const r of [paretoRef, scatter3dRef, heatmapRef, treemapRef, pieRef, barRef]) {
        const el = r.current;
        if (el) void Plotly.Plots.resize(el);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    chartAspectModes,
    flexibleHeatmapHostPx,
    flexibleTreemapHostPx,
    flexiblePieHostPx,
    flexibleBarHostPx,
  ]);

  return (
    <div>
      <DigitalWorkflowPanel />
      <div className="chart-card">
        <h2>Explore metrics</h2>
        <div className="hint-block">
          <p className="hint">
            This panel defines the shared dataset scope: <strong>Technology UID</strong> → <strong>Category</strong> →{" "}
            <strong>Architecture</strong>. Select one or more technologies by MD5 UID; Category and Architecture are
            the union of their available results.
          </p>
          <p className="hint">
            Bit width, backend paths, data-union counts, baseline, metrics, numeric scales, and Plot aspect now live
            inside each plot. A plot exposes only controls that alter that plot; changing one plot never changes another.
          </p>
        </div>
        <div className="axis-pickers">
          <div className="explore-data-hierarchy" aria-label="Backend data hierarchy">
            <TechnologySelector
              technologies={technologyOptions}
              selectedUids={selectedTechnologiesForExplore.map((technology) => technology.uid)}
              onChange={updateTechnologySelection}
            />
            <label className="axis-picker explore-data-hierarchy__level">
              Category
              <select
                value={categoryForUi}
                aria-label="Dataset category"
                disabled={categoryOptionsForTechnology.length === 0}
                onChange={(e) =>
                  updateGlobalExploreAxes((p) => ({
                    ...p,
                    category: e.target.value as DesignCategoryId,
                  }))
                }
              >
                {categoryOptionsForTechnology.length === 0 ? (
                  <option value={categoryForUi}>No category available</option>
                ) : null}
                {categoryOptionsForTechnology.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="explore-data-hierarchy__level">
              <span className="explore-data-hierarchy__label">Architecture</span>
              <div
                className="explore-arch-filter"
                role="group"
                aria-label="Architectures to include beneath the selected Technologies and category"
              >
                  <div className="explore-arch-filter__header">
                    <span className="explore-arch-filter__title">Architectures to include</span>
                    <div className="explore-arch-filter__actions">
                      <button
                        type="button"
                        className="explore-arch-filter__action"
                        aria-label="Include all architectures in charts"
                        disabled={exploreCategoryArchOrder.length === 0}
                        onClick={() =>
                          setExploreArchitectureSelection([...exploreCategoryArchOrder])
                        }
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="explore-arch-filter__action"
                        aria-label="Include only the first architecture in folder order"
                        disabled={exploreCategoryArchOrder.length === 0}
                        onClick={() => {
                          const first = exploreCategoryArchOrder[0];
                          if (first !== undefined) {
                            setExploreArchitectureSelection([first]);
                          }
                        }}
                      >
                        Unselect all
                      </button>
                    </div>
                  </div>
                  <p className="explore-arch-filter__hint">
                    These entries correspond to architecture folders beneath the selected category. Uncheck to
                    hide architectures from Pareto, 3D, heatmap, treemap, donut, and bar charts. At least one
                    architecture stays selected. <strong>Unselect all</strong> keeps the first folder entry.
                  </p>
                  <div className="explore-arch-filter__list">
                    {exploreCategoryArchOrder.length === 0 ? (
                      <p className="explore-arch-filter__empty">No architectures available.</p>
                    ) : null}
                    {exploreCategoryArchOrder.map((arch) => {
                      const checked =
                        exploreArchitectureSelection.length === 0 ||
                        exploreArchitectureSelection.includes(arch);
                      return (
                        <label key={arch} className="explore-arch-filter__item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleExploreArchitecture(arch, e.target.checked)}
                          />
                          <span>{formatArchLabel(arch)}</span>
                        </label>
                      );
                    })}
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Pinch/drag or mode-bar zoom. Points follow <strong>Bar / donut / scatter baseline</strong>: compare
          architectures across selected technologies at one width, sweep their available bit widths, or compare
          selected technologies at one width. Hover for the exact technology and result.{" "}
        </p>
        {renderLocalControls("pareto", {
          baseline: true,
          bitWidth: true,
          x: true,
          y: true,
          scaleX: true,
          scaleY: true,
          aspect: true,
        })}
        <div className={`plot-host ${aspectExtraFor("pareto")}`.trim()}>
          <div ref={paretoRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>3D scatter</h2>
        <p className="hint">
          WebGL cloud using this plot&apos;s <strong>X</strong> × <strong>Y</strong> × <strong>Z</strong> and Baseline
          filters. Drag to rotate; use the mode bar for PNG/reset camera. Double-click the plot to restore the
          initial camera.
        </p>
        {renderLocalControls("scatter3d", {
          baseline: true,
          bitWidth: true,
          x: true,
          y: true,
          z: true,
          scaleX: true,
          scaleY: true,
          scaleZ: true,
          aspect: true,
        })}
        <div className={`plot-host plot-host--3d ${aspectExtraFor("scatter3d")}`.trim()}>
          <div ref={scatter3dRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Heatmap</h2>
        <p className="hint">
          Cell color = <strong>Z</strong> metric across selected technology × architecture × bit width.
          Zoom and pan are disabled because every matrix cell is already visible.
        </p>
        {renderLocalControls("heatmap", { z: true, scaleZ: true, aspect: true })}
        <div className={`plot-host ${aspectExtraFor("heatmap")}`.trim()} style={heatmapHostPlotStyle}>
          <div ref={heatmapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Treemap</h2>
        <p className="hint">
          Tile size from <strong>Y</strong> metric — root → selected technology → architecture×width leaf.
        </p>
        {renderLocalControls("treemap", { y: true, scaleY: true, aspect: true })}
        <div
          className={[
            "plot-host",
            chartAspectModes.treemap !== "flexible" && "plot-host--short",
            aspectExtraFor("treemap"),
          ]
            .filter(Boolean)
            .join(" ")}
          style={treemapHostPlotStyle}
        >
          <div ref={treemapRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      <div className="chart-card">
        <h2>Donut (pie)</h2>
        <p className="hint">
          Shares follow <strong>Bar / donut baseline</strong>: technology×architecture results at one width, pooled Σ{" "}
          <strong>Y</strong> across architecture for each available technology×bit-width pair, or one pooled slice per
          selected technology at a fixed width.
          Dense architecture slices use a complete legend and a taller frame. Use <strong>Chart zoom</strong> to enlarge
          the complete donut and its labels from 75% to 200%; the scrollable frame keeps everything reachable.
        </p>
        {renderLocalControls("pie", { baseline: true, bitWidth: true, y: true, aspect: true })}
        <div className="donut-zoom-toolbar" aria-label="Donut chart zoom">
          <span>Chart zoom</span>
          <button
            type="button"
            aria-label="Zoom donut chart out"
            disabled={pieZoomPercent <= 75}
            onClick={() => setPieZoomPercent((value) => Math.max(75, value - 25))}
          >
            −
          </button>
          <output>{pieZoomPercent}%</output>
          <button
            type="button"
            aria-label="Zoom donut chart in"
            disabled={pieZoomPercent >= 200}
            onClick={() => setPieZoomPercent((value) => Math.min(200, value + 25))}
          >
            +
          </button>
          <button
            type="button"
            disabled={pieZoomPercent === 100}
            onClick={() => setPieZoomPercent(100)}
          >
            Reset
          </button>
        </div>
        <div className="donut-zoom-shell">
          <div
            className={`plot-host plot-host--short ${aspectExtraFor("pie")}`.trim()}
            style={pieHostPlotStyle}
          >
            <div ref={pieRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>
      <div className="chart-card">
        <h2>{barSectionHeading}</h2>
        <p className="hint">
          Its <strong>Baseline</strong> selects grouped technology bars per architecture at the chosen width, grouped
          technology×architecture traces across bit widths, or architectures grouped across selected technologies.
          Values are this plot&apos;s <strong>Y</strong>. The mode bar keeps PNG export,
          while zoom and pan are disabled; large architecture sets switch to readable
          horizontal bars.
        </p>
        {renderLocalControls("bar", {
          baseline: true,
          bitWidth: true,
          y: true,
          scaleY: true,
          aspect: true,
        })}
        <div className={`plot-host ${aspectExtraFor("bar")}`.trim()} style={barHostPlotStyle}>
          <div ref={barRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}
