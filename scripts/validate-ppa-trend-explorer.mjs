import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const index = JSON.parse(read("data/ppa-analysis/available-runs.json"));
const registrySource = read("src/data/ppaMetricRegistry.ts");
const componentSource = read("src/pages/ppa/PpaTrendExplorer.tsx");
const chartsSource = read("src/pages/ppa/PpaCharts.tsx");
const pageSource = read("src/pages/PpaPage.tsx");

const compiledRegistry = ts.transpileModule(registrySource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const registry = await import(`data:text/javascript;base64,${Buffer.from(compiledRegistry).toString("base64")}`);

const {
  availablePpaMetrics,
  finitePpaNumber,
  isPpaRunInvalid,
  ppaMetric,
  ppaParetoFrontier,
  ppaTrendSeriesKey,
} = registry;

assert.equal(index.runCount, index.runs.length, "PPA index run count mismatch");
assert(index.runs.length >= 30, "trend validation needs the complete multi-run dataset");
assert.equal(finitePpaNumber(" 12.5 "), 12.5, "numeric strings must be accepted");
assert.equal(finitePpaNumber("NaN"), null, "NaN strings must be rejected");
assert.equal(finitePpaNumber(Infinity), null, "Infinity must be rejected");
assert.equal(finitePpaNumber(undefined), null, "undefined must be rejected");

const inputKeys = availablePpaMetrics(index.runs, "input").map((metric) => metric.key);
const outputKeys = availablePpaMetrics(index.runs, "output").map((metric) => metric.key);
const categoryKeys = availablePpaMetrics(index.runs, "category").map((metric) => metric.key);
for (const key of ["target_frequency_mhz", "clock_period_ns", "voltage_v", "temperature_c", "rc_scale"]) {
  assert(inputKeys.includes(key), `real input metric ${key} is not available`);
}
for (const key of ["width", "block_width", "operations", "pipeline_stages"]) {
  assert(!inputKeys.includes(key), `no-data input metric ${key} must stay out of the selector`);
}
for (const key of [
  "fmax_mhz", "wns_ns", "tns_ns", "hold_slack_ns", "cell_area_um2", "core_area_um2",
  "die_area_um2", "cell_count", "placement_density_pct", "total_power_mw", "internal_power_mw",
  "switching_power_mw", "leakage_power_mw", "wire_length_um", "via_count", "drc_violations", "ir_drop_mv",
]) {
  assert(outputKeys.includes(key), `real output metric ${key} is not available`);
}
for (const key of ["flow", "design", "pdk", "scl", "pvt", "rc_corner", "cell_model"]) {
  assert(categoryKeys.includes(key), `real category metric ${key} is not available`);
}
assert(!categoryKeys.includes("architecture"), "architecture must not be offered without source data");
assert(!categoryKeys.includes("operator"), "operator must not be offered without source data");

const clockPeriods = [...new Set(index.runs.map((run) => ppaMetric("clock_period_ns").value(run)))].sort((a, b) => a - b);
assert.deepEqual(clockPeriods, [8, 10, 12, 24], "numeric inputs must sort numerically");
const sky130Runs = index.runs.filter((run) => run.pdk.startsWith("sky130"));
assert(sky130Runs.length >= 30, "dozens-of-selected-runs fixture is missing");
assert(sky130Runs.every((run) => finitePpaNumber(ppaMetric("target_frequency_mhz").value(run)) !== null
  && finitePpaNumber(ppaMetric("wns_ns").value(run)) !== null), "Target Frequency → WNS is not drawable after a broad filter");
const targetFrequency = ppaMetric("target_frequency_mhz");
const clockRun = index.runs[0];
const changedClockRun = {
  ...clockRun,
  summary: { ...clockRun.summary, clockPeriodNs: 8 },
  filterFacets: clockRun.filterFacets.map((facet) => facet.dimension === "clock_period"
    ? { ...facet, value: "8", valueLabel: "8 ns" }
    : facet),
};
assert.equal(
  ppaTrendSeriesKey(clockRun, targetFrequency),
  ppaTrendSeriesKey(changedClockRun, targetFrequency),
  "the selected X variable must be removed from the line-series signature",
);
const rcRun = index.runs.find((run) => run.filterFacets.some((facet) => facet.dimension === "techfile_rc"));
assert(rcRun, "RC sweep run missing");
const changedRcRun = {
  ...rcRun,
  techfileRcScale: 123,
  filterFacets: rcRun.filterFacets.map((facet) => facet.dimension === "techfile_rc"
    ? { ...facet, value: "synthetic|123", valueLabel: "RC ×123" }
    : facet),
};
assert.notEqual(
  ppaTrendSeriesKey(rcRun, targetFrequency),
  ppaTrendSeriesKey(changedRcRun, targetFrequency),
  "non-X RC conditions must split trend series",
);
assert.equal(
  ppaTrendSeriesKey(rcRun, ppaMetric("rc_scale")),
  ppaTrendSeriesKey(changedRcRun, ppaMetric("rc_scale")),
  "RC scale must be removed when it is the selected X variable",
);

const syntheticPareto = ppaParetoFrontier([
  { item: "balanced", x: 10, y: 100 },
  { item: "dominated", x: 12, y: 90 },
  { item: "small", x: 8, y: 80 },
  { item: "fast", x: 15, y: 120 },
], "lower", "higher");
assert.deepEqual(syntheticPareto.map((point) => point.item), ["small", "balanced", "fast"], "Pareto dominance is incorrect");

const area = ppaMetric("cell_area_um2");
const fmax = ppaMetric("fmax_mhz");
const areaFmaxPoints = index.runs.flatMap((run) => {
  const x = finitePpaNumber(area.value(run));
  const y = finitePpaNumber(fmax.value(run));
  return x === null || y === null || isPpaRunInvalid(run) ? [] : [{ item: run.uid, x, y }];
});
const areaFmaxFrontier = ppaParetoFrontier(areaFmaxPoints, "lower", "higher");
assert(areaFmaxPoints.length > 0, "Area-Fmax has no eligible points");
assert(areaFmaxFrontier.length > 0, "Area-Fmax Pareto frontier is empty");
assert(areaFmaxFrontier.length <= areaFmaxPoints.length, "Pareto frontier exceeds source points");
const failedRuns = index.runs.filter(isPpaRunInvalid);
assert(failedRuns.length > 0, "timing/physical failed-run styling has no real fixture");
assert(areaFmaxFrontier.every((point) => !failedRuns.some((run) => run.uid === point.item)), "failed run entered Pareto frontier");
const cellAreaCount = index.runs.filter((run) => finitePpaNumber(area.value(run)) !== null).length;
assert(cellAreaCount > 0 && cellAreaCount < index.runs.length, "partial-metric fixture is missing");

for (const text of ["Input Trend", "PPA Sweep", "PPA Trade-off", "Timing closure · WNS = 0", "Pareto frontier"]) {
  assert(componentSource.includes(text), `Trend Explorer is missing ${text}`);
}
for (const text of [
  "Run ID/name", "Architecture", "Operator", "Target frequency", "PVT / RC", "Flow",
  "WNS / Fmax", "Cell area / power",
]) {
  const sourceText = text === "Run ID/name" ? "UID %{customdata[0]}" : text;
  assert(componentSource.includes(sourceText), `trend tooltip is missing ${text}`);
}
assert(componentSource.includes('useState("target_frequency_mhz")'), "Target Frequency is not a default input");
assert(componentSource.includes('useState("wns_ns")'), "WNS is not a default performance metric");
assert(componentSource.includes('useState("cell_area_um2")'), "Cell Area is not the default trade-off X metric");
assert(componentSource.includes('useState("fmax_mhz")'), "Fmax is not the default trade-off Y metric");
assert(componentSource.includes('useState("architecture")'), "Architecture is not the preferred trade-off color");
assert(componentSource.includes('symbol: entries.map((point) => point.invalid ? "x" : "circle")'), "failed runs lack distinct marker styling");
assert(componentSource.includes('scrollZoom: true'), "Plotly zoom is not enabled");
assert(componentSource.includes("No selected run contains"), "metric-pair empty states are missing");
assert(componentSource.includes("buildTrendChart(runs"), "charts are not built from the selected run array");
assert(pageSource.includes("runs={selectedRuns}"), "Trend Explorer is not wired to checked reports");
assert((pageSource.match(/runs=\{selectedRuns\}/g) ?? []).length >= 4, "existing selected-run detail components were not preserved");
assert(pageSource.indexOf("<PpaTrendExplorer") < pageSource.indexOf("<PpaSummary"), "Trend Explorer must precede detailed selected-run comparison");
assert.equal((componentSource.match(/\{runs\.length > 0 \? \(/g) ?? []).length, 3, "all three trend sections must render simultaneously");
assert(!componentSource.includes('role="tablist"') && !componentSource.includes('role="tabpanel"'), "trend sections must not be mutually exclusive tabs");
assert(!componentSource.includes("<span>01</span>") && !componentSource.includes("<span>02</span>") && !componentSource.includes("<span>03</span>"), "numbered trend-section labels must stay removed");
assert(componentSource.includes('y: -0.2') && componentSource.includes('yanchor: "top"'), "legend must sit below the plot instead of covering data");
assert(componentSource.includes('from "../../data/design"') && componentSource.includes("seriesRgbByIndex(index)"), "Trend Explorer must reuse the Digital series palette");
assert(componentSource.includes("CHART_SCATTER_MARKER_LINE_WIDTH") && componentSource.includes("CHART_LINE_WIDTH"), "Trend Explorer must reuse Digital marker and line styling");
assert(chartsSource.includes('from "../../data/design"') && chartsSource.includes("seriesRgbByIndex(index)"), "selected-run PPA charts must reuse the Digital series palette");
assert(!componentSource.includes('"#0071e3"') && !chartsSource.includes('"#0071e3"'), "legacy PPA chart colors must stay removed");

console.log([
  `[validate-ppa-trend-explorer] ${index.runs.length} selectable-run fixtures`,
  `${inputKeys.length} available inputs`,
  `${outputKeys.length} outputs`,
  `${failedRuns.length} failed/invalid runs`,
  `${areaFmaxFrontier.length} Area-Fmax Pareto points`,
].join("; "));
