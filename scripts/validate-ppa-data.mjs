#!/usr/bin/env node
/** Validate the generated three-flow final-run AST-backed PPA web data store. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFilterFacets } from "./generate-ppa-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = path.join(root, "data", "ppa-analysis");

function fail(message) {
  throw new Error(`[validate-ppa-data] ${message}`);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) fail(`missing ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const syntheticRcFacets = buildFilterFacets(
  { flow: "openroad", pdk: "test-pdk", scl: "test-scl", design: "test-design" },
  { experiment: {}, configuration: {} },
  { clockPeriodNs: 10 },
  {
    manifest: { entry_mode: "gate" },
    concrete: {
      entry: { mode: "gate" },
      stages: { placement: true, routing: true },
      technology: { beol: { id: "RCX10", rc_scale: 10 } },
      timing: { clock_period_ns: 10 },
      comparison: { declared_variables: ["technology.beol"] },
    },
  },
);
const syntheticRcOption = syntheticRcFacets.find((facet) => facet.dimension === "techfile_rc");
if (syntheticRcOption?.value !== "RCX10|10" || !syntheticRcOption.valueLabel.includes("RCX10")) {
  fail("a newly observed RCX10 result does not become a data-backed Techfile RC option");
}

const index = readJson(path.join(store, "available-runs.json"));
if (!Array.isArray(index.runs) || index.runs.length === 0) fail("available-runs.json has no runs");
if (index.runCount !== index.runs.length) fail("runCount does not match runs.length");

const seen = new Set();
const flowCounts = new Map();
const cellInventoryFlowCounts = new Map();
const endpointSlackFlowCounts = new Map();
let ppaRuns = 0;
let normalizedEntryCount = 0;
const normalizedMetricUnion = new Set();
const filterFacetDimensions = new Map();
const filterFacetCategories = new Map();
const filterFacetDimensionCategories = new Map();
const comparableGroups = new Map();
const commonMetricUnits = new Map([
  ["area.die_um2", "um^2"],
  ["area.core_um2", "um^2"],
  ["design.logical_instances", "count"],
  ["design.utilization", "ratio"],
  ["timing.reference_setup_slack_ns", "ns"],
  ["timing.reference_hold_slack_ns", "ns"],
  ["timing.worst_setup_slack_ns", "ns"],
  ["timing.worst_hold_slack_ns", "ns"],
  ["timing.setup_violations", "count"],
  ["timing.hold_violations", "count"],
  ["timing.max_slew_violations", "count"],
  ["timing.max_cap_violations", "count"],
  ["timing.max_fanout_violations", "count"],
  ["power.internal_mw", "mW"],
  ["power.switching_mw", "mW"],
  ["power.leakage_mw", "mW"],
  ["power.total_mw", "mW"],
  ["routing.wirelength_um", "um"],
  ["routing.vias", "count"],
  ["routing.drc_errors", "count"],
]);
const summaryMetricMap = new Map([
  ["area.die_um2", "areaUm2"],
  ["area.core_um2", "coreAreaUm2"],
  ["design.logical_instances", "instances"],
  ["design.utilization", "utilization"],
  ["timing.reference_setup_slack_ns", "setupSlackNs"],
  ["timing.reference_hold_slack_ns", "holdSlackNs"],
  ["timing.worst_setup_slack_ns", "worstSetupSlackNs"],
  ["timing.worst_hold_slack_ns", "worstHoldSlackNs"],
  ["timing.setup_violations", "setupViolations"],
  ["timing.hold_violations", "holdViolations"],
  ["timing.max_slew_violations", "maxSlewViolations"],
  ["timing.max_cap_violations", "maxCapViolations"],
  ["timing.max_fanout_violations", "maxFanoutViolations"],
  ["power.internal_mw", "internalPowerMw"],
  ["power.switching_mw", "switchingPowerMw"],
  ["power.leakage_mw", "leakagePowerMw"],
  ["power.total_mw", "totalPowerMw"],
  ["routing.wirelength_um", "wirelengthUm"],
  ["routing.vias", "vias"],
  ["routing.drc_errors", "routeDrcErrors"],
]);

function sameNumber(left, right) {
  if (left === null && right === null) return true;
  if (typeof left !== "number" || typeof right !== "number") return false;
  return Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-9);
}
for (const run of index.runs) {
  if (!/^[a-f0-9]{32}$/.test(run.uid)) fail(`invalid UID: ${run.uid}`);
  if (seen.has(run.uid)) fail(`duplicate UID: ${run.uid}`);
  seen.add(run.uid);
  if (!String(run.relativePath).startsWith(`${run.flow}/`)
    && !String(run.relativePath).startsWith("dtco-benchmark/runs/")
    && !String(run.relativePath).startsWith("uploads/ppa/")) {
    fail(`${run.uid}: invalid relative source path`);
  }
  if ("evidenceStatus" in run) fail(`${run.uid}: obsolete PPA/LVS evidence tag is still present`);
  if (String(run.sourceKind).includes("lvs") || String(run.reportSchema).includes("lvs")) {
    fail(`${run.uid}: standalone LVS data is not allowed in the PPA store`);
  }
  if (String(run.relativePath).startsWith("/") || String(run.relativePath).includes("/home/")) {
    fail(`${run.uid}: source path is not portable`);
  }
  if (!/^[a-f0-9]{64}$/.test(run.sourceSha256)) fail(`${run.uid}: invalid source SHA-256`);
  if (!/^[a-f0-9]{64}$/.test(run.bundleSha256)) fail(`${run.uid}: invalid bundle SHA-256`);
  if (!["json", "csv"].includes(run.ast?.format)) fail(`${run.uid}: unsupported AST format`);
  if (!run.ast?.nodeKinds || Object.values(run.ast.nodeKinds).reduce((sum, value) => sum + value, 0) !== run.ast.nodeCount) {
    fail(`${run.uid}: AST node-kind inventory does not match node count`);
  }
  if (run.authoritativeOverallStatus !== false) fail(`${run.uid}: unsupported overall-status claim`);
  if (!Array.isArray(run.filterFacets) || run.filterFacets.length === 0) {
    fail(`${run.uid}: data-backed Report scope facets are missing`);
  }
  const runFacetKeys = new Set();
  for (const [facetIndex, facet] of run.filterFacets.entries()) {
    if (!facet || typeof facet !== "object"
      || typeof facet.category !== "string" || !facet.category
      || typeof facet.categoryLabel !== "string" || !facet.categoryLabel
      || typeof facet.categoryOrder !== "number" || !Number.isFinite(facet.categoryOrder)
      || typeof facet.dimension !== "string" || !facet.dimension
      || typeof facet.dimensionLabel !== "string" || !facet.dimensionLabel
      || typeof facet.value !== "string" || !facet.value
      || typeof facet.valueLabel !== "string" || !facet.valueLabel
      || typeof facet.dimensionOrder !== "number" || !Number.isFinite(facet.dimensionOrder)
      || typeof facet.valueOrder !== "number" || !Number.isFinite(facet.valueOrder)) {
      fail(`${run.uid}: invalid Report scope facet ${facetIndex}`);
    }
    const facetKey = `${facet.dimension}\0${facet.value}`;
    if (runFacetKeys.has(facetKey)) fail(`${run.uid}: duplicate Report scope facet ${facetKey}`);
    runFacetKeys.add(facetKey);
    const categoryLabel = filterFacetCategories.get(facet.category);
    if (categoryLabel !== undefined && categoryLabel !== facet.categoryLabel) {
      fail(`${run.uid}: inconsistent label for Report scope category ${facet.category}`);
    }
    filterFacetCategories.set(facet.category, facet.categoryLabel);
    const label = filterFacetDimensions.get(facet.dimension);
    if (label !== undefined && label !== facet.dimensionLabel) {
      fail(`${run.uid}: inconsistent label for Report scope dimension ${facet.dimension}`);
    }
    filterFacetDimensions.set(facet.dimension, facet.dimensionLabel);
    const dimensionCategory = filterFacetDimensionCategories.get(facet.dimension);
    if (dimensionCategory !== undefined && dimensionCategory !== facet.category) {
      fail(`${run.uid}: Report scope dimension ${facet.dimension} spans multiple categories`);
    }
    filterFacetDimensionCategories.set(facet.dimension, facet.category);
  }
  for (const [dimension, value] of [
    ["design", run.design],
    ["tool", run.flow],
    ["pdk", run.pdk],
    ["clock_period", run.summary.clockPeriodNs === null ? null : String(run.summary.clockPeriodNs)],
  ]) {
    if (value !== null && !run.filterFacets.some(
      (facet) => facet.dimension === dimension && facet.value === value,
    )) {
      fail(`${run.uid}: Report scope facet ${dimension} does not reflect the report manifest`);
    }
  }

  const runDir = path.join(store, run.uid);
  const manifest = readJson(path.join(runDir, "manifest.json"));
  const report = readJson(path.join(runDir, "report.json"));
  if (JSON.stringify(manifest) !== JSON.stringify(run)) fail(`${run.uid}: manifest/index mismatch`);
  if (report.manifest.uid !== run.uid) fail(`${run.uid}: report manifest mismatch`);
  if (report.ast.source !== run.relativePath || report.ast.sha256 !== run.sourceSha256) {
    fail(`${run.uid}: AST source identity mismatch`);
  }
  if (report.interpretation.schema !== run.reportSchema) fail(`${run.uid}: schema mismatch`);
  if (report.interpretation.authoritative_overall_status !== false) {
    fail(`${run.uid}: report makes an unsupported overall-status claim`);
  }
  const experiment = report.interpretation.experiment;
  if (experiment && typeof experiment === "object") {
    if (typeof experiment.variant !== "string" || !experiment.variant) {
      fail(`${run.uid}: experiment sidecar has no variant`);
    }
    if (run.variant !== experiment.variant || !sameNumber(run.techfileRcScale, experiment.techfile_rc_scale)) {
      fail(`${run.uid}: experiment variant/RC scale does not match the manifest`);
    }
  } else if (run.variant !== null || run.techfileRcScale !== null) {
    fail(`${run.uid}: manifest exposes experiment metadata without a parsed sidecar`);
  }
  const expectedSchemas = {
    openroad: new Set(["openroad.final_metrics", "dtco.normalized_metrics"]),
    openlane: new Set(["openlane.final_metrics", "dtco.normalized_metrics"]),
    librelane: new Set(["librelane.final_metrics", "librelane.terminal_state", "dtco.normalized_metrics"]),
  };
  if (!expectedSchemas[run.flow]?.has(run.reportSchema)) {
    fail(`${run.uid}: unsupported flow ${run.flow}`);
  }
  if (!run.summary.hasPpa) fail(`${run.uid}: final run is missing a PPA summary`);
  if (typeof run.summary.powerComparisonValid !== "boolean") {
    fail(`${run.uid}: power comparability is missing`);
  }
  if (!run.summary.powerComparisonValid
    && (typeof run.summary.powerComparisonReason !== "string" || !run.summary.powerComparisonReason)) {
    fail(`${run.uid}: non-comparable power has no exclusion reason`);
  }
  if (report.interpretation.all_metrics?.length !== report.interpretation.metric_count) {
    fail(`${run.uid}: lossless primary-source metric inventory is incomplete`);
  }
  if (!run.summary.referenceCorner || run.summary.setupSlackNs === null || run.summary.holdSlackNs === null) {
    fail(`${run.uid}: normalized reference-corner timing is incomplete`);
  }
  const provenance = report.interpretation.normalized_metric_provenance;
  if (!Array.isArray(provenance) || provenance.length === 0) {
    fail(`${run.uid}: normalized metric provenance is missing`);
  }
  for (const [recordIndex, record] of provenance.entries()) {
    if (!record || typeof record !== "object") fail(`${run.uid}: normalized entry ${recordIndex} is invalid`);
    if (typeof record.metric_id !== "string" || record.metric_id.length === 0) {
      fail(`${run.uid}: normalized entry ${recordIndex} has no canonical metric ID`);
    }
    if (!Object.hasOwn(record, "value")) fail(`${run.uid}: ${record.metric_id} has no normalized value field`);
    if (record.unit !== null && typeof record.unit !== "string") {
      fail(`${run.uid}: ${record.metric_id} has an invalid unit`);
    }
    normalizedMetricUnion.add(record.metric_id);
    normalizedEntryCount += 1;
  }
  const metricsById = new Map(provenance.map((record) => [record.metric_id, record]));
  for (const [metricId, unit] of commonMetricUnits) {
    const metric = metricsById.get(metricId);
    if (!metric) fail(`${run.uid}: missing comparable metric ${metricId}`);
    if (metric.unit !== unit) fail(`${run.uid}: ${metricId} unit is ${metric.unit}, expected ${unit}`);
    const summaryKey = summaryMetricMap.get(metricId);
    if (!sameNumber(metric.value, run.summary[summaryKey])) {
      fail(`${run.uid}: ${metricId} provenance value does not match summary.${summaryKey}`);
    }
  }
  const normalizedPower = metricsById.get("power.total_mw");
  const normalizedPowerComparisonValid = normalizedPower?.comparison_valid !== false;
  if (run.reportSchema === "dtco.normalized_metrics"
    && normalizedPowerComparisonValid !== run.summary.powerComparisonValid) {
    fail(`${run.uid}: normalized power comparability does not match the summary`);
  }
  const cellUsage = report.interpretation.standard_cell_usage;
  if (!cellUsage || cellUsage.schema !== "def.components.v1") {
    fail(`${run.uid}: final-DEF standard-cell inventory is missing`);
  }
  if (!Array.isArray(cellUsage.cells)) fail(`${run.uid}: standard-cell records are invalid`);
  if (cellUsage.availability === "available") {
    if (typeof cellUsage.source !== "string" || !/^[a-f0-9]{64}$/.test(cellUsage.sha256)) {
      fail(`${run.uid}: standard-cell inventory has no source identity`);
    }
    const supportingDef = report.source_bundle.supporting_sources.find(
      (source) => source.source === cellUsage.source && source.sha256 === cellUsage.sha256,
    );
    if (!supportingDef) fail(`${run.uid}: standard-cell DEF is absent from the source bundle`);
    const masterNames = new Set();
    let componentCount = 0;
    for (const record of cellUsage.cells) {
      if (typeof record.master !== "string" || record.master.length === 0 || masterNames.has(record.master)) {
        fail(`${run.uid}: invalid or duplicate standard-cell master`);
      }
      if (!Number.isInteger(record.count) || record.count <= 0 || !Number.isInteger(record.first_source_line)) {
        fail(`${run.uid}: invalid count/source line for ${record.master}`);
      }
      masterNames.add(record.master);
      componentCount += record.count;
    }
    if (componentCount !== cellUsage.declared_component_count
      || componentCount !== cellUsage.parsed_component_count
      || masterNames.size !== cellUsage.unique_master_count) {
      fail(`${run.uid}: standard-cell inventory totals are inconsistent`);
    }
    if (run.summary.cellUsageAvailable !== true
      || run.summary.finalDefComponents !== componentCount
      || run.summary.uniqueCellMasters !== masterNames.size) {
      fail(`${run.uid}: standard-cell inventory does not match manifest summary`);
    }
    cellInventoryFlowCounts.set(run.flow, (cellInventoryFlowCounts.get(run.flow) ?? 0) + 1);
  } else if (cellUsage.availability === "unavailable") {
    if (cellUsage.cells.length !== 0 || run.summary.cellUsageAvailable !== false
      || run.summary.finalDefComponents !== null || run.summary.uniqueCellMasters !== null) {
      fail(`${run.uid}: unavailable standard-cell inventory has contradictory data`);
    }
  } else {
    fail(`${run.uid}: invalid standard-cell availability state`);
  }
  const endpointSlacks = report.interpretation.timing_endpoint_slacks;
  const endpointSummary = run.summary.timingEndpointSlacks;
  if (!endpointSlacks || endpointSlacks.schema !== "opensta.endpoint-slacks.v1" || !endpointSummary) {
    fail(`${run.uid}: timing endpoint-slack inventory is missing`);
  }
  if (endpointSlacks.reference_corner !== run.summary.referenceCorner
    || endpointSummary.referenceCorner !== run.summary.referenceCorner) {
    fail(`${run.uid}: endpoint-slack reference corner does not match the normalized timing summary`);
  }
  if (endpointSlacks.availability === "available") {
    const sources = [endpointSlacks.source, endpointSlacks.setup?.source, endpointSlacks.hold?.source]
      .filter((source) => typeof source === "string");
    if (sources.length === 0) fail(`${run.uid}: endpoint slacks have no source report`);
    for (const source of sources) {
      if (!report.source_bundle.supporting_sources.some((entry) => entry.source === source)) {
        fail(`${run.uid}: endpoint source ${source} is absent from the source bundle`);
      }
    }
    for (const analysis of ["setup", "hold"]) {
      const distribution = endpointSlacks[analysis];
      const summaryValues = endpointSummary[`${analysis}SlackNs`];
      const summaryCount = endpointSummary[`${analysis}EndpointCount`];
      const summaryViolations = endpointSummary[`${analysis}ViolationCount`];
      if (!Array.isArray(distribution?.endpoints) || distribution.endpoints.length === 0) {
        fail(`${run.uid}: ${analysis} endpoint distribution is empty`);
      }
      const names = new Set();
      const values = [];
      for (const record of distribution.endpoints) {
        if (typeof record.endpoint !== "string" || !record.endpoint || names.has(record.endpoint)
          || typeof record.slack_ns !== "number" || !Number.isFinite(record.slack_ns)) {
          fail(`${run.uid}: invalid or duplicate ${analysis} endpoint record`);
        }
        const expectedStatus = record.slack_ns < 0 ? "violated" : "met";
        if (record.status !== expectedStatus) fail(`${run.uid}: ${analysis} endpoint status contradicts slack`);
        names.add(record.endpoint);
        values.push(record.slack_ns);
      }
      const violations = values.filter((value) => value < 0).length;
      if (distribution.endpoint_count !== values.length || distribution.violation_count !== violations
        || summaryCount !== values.length || summaryViolations !== violations
        || JSON.stringify(summaryValues) !== JSON.stringify(values)) {
        fail(`${run.uid}: ${analysis} endpoint summary is inconsistent`);
      }
      const aggregate = analysis === "setup" ? run.summary.setupSlackNs : run.summary.holdSlackNs;
      if (Math.abs(Math.min(...values) - aggregate) > 0.02) {
        fail(`${run.uid}: ${analysis} endpoint minimum does not corroborate reference slack`);
      }
    }
    if (endpointSummary.availability !== "available" || endpointSummary.reason !== null) {
      fail(`${run.uid}: available endpoint summary is contradictory`);
    }
    endpointSlackFlowCounts.set(run.flow, (endpointSlackFlowCounts.get(run.flow) ?? 0) + 1);
  } else if (endpointSlacks.availability === "unavailable") {
    if (typeof endpointSlacks.reason !== "string" || !endpointSlacks.reason
      || endpointSummary.availability !== "unavailable" || typeof endpointSummary.reason !== "string"
      || endpointSummary.setupEndpointCount !== 0 || endpointSummary.holdEndpointCount !== 0
      || endpointSummary.setupSlackNs.length !== 0 || endpointSummary.holdSlackNs.length !== 0) {
      fail(`${run.uid}: unavailable endpoint distribution has contradictory data`);
    }
  } else {
    fail(`${run.uid}: invalid timing endpoint availability state`);
  }
  const power = run.summary.powerBreakdownMw;
  const componentTotal = [power.internal, power.switching, power.leakage]
    .filter((value) => typeof value === "number")
    .reduce((sum, value) => sum + value, 0);
  if (Math.abs(componentTotal - run.summary.totalPowerMw) > Math.max(1e-6, run.summary.totalPowerMw * 1e-4)) {
    fail(`${run.uid}: total power is inconsistent with normalized components`);
  }
  if (run.flow === "openlane") {
    if (run.reportSchema === "openlane.final_metrics"
      && (run.ast.format !== "csv" || report.ast.standard_json !== null)) {
      fail(`${run.uid}: native OpenLane primary source is not represented as a CSV AST`);
    }
    if (run.reportSchema === "dtco.normalized_metrics"
      && (run.ast.format !== "json" || report.ast.standard_json !== true)) {
      fail(`${run.uid}: normalized OpenLane primary source is not represented as a JSON AST`);
    }
    if (report.interpretation.completion?.implementation_complete !== true) {
      fail(`${run.uid}: incomplete OpenLane run was published`);
    }
    const reported = report.interpretation.design?.reported_die_area_um2_from_csv;
    if (run.reportSchema === "openlane.final_metrics" && run.pdk.startsWith("gf180")
      && !(typeof reported === "number" && reported > run.summary.areaUm2)) {
      fail(`${run.uid}: GF180 OpenLane DBU correction is not evidenced`);
    }
  } else if (run.ast.format !== "json") {
    fail(`${run.uid}: JSON-backed flow has a non-JSON primary AST`);
  }
  ppaRuns += 1;
  const comparisonKey = `${run.pdk}\0${run.scl ?? ""}\0${run.design}`;
  const group = comparableGroups.get(comparisonKey) ?? new Set();
  group.add(run.flow);
  comparableGroups.set(comparisonKey, group);
  const serialized = JSON.stringify(report);
  if (serialized.includes("/home/duhaochen") || serialized.includes("/Users/")) {
    fail(`${run.uid}: report leaks an absolute user path`);
  }
  flowCounts.set(run.flow, (flowCounts.get(run.flow) ?? 0) + 1);
}

for (const flow of ["openroad", "openlane", "librelane"]) {
  if (!flowCounts.get(flow)) fail(`no ${flow} reports were generated`);
  if (!cellInventoryFlowCounts.get(flow)) fail(`no ${flow} report has a final-DEF cell inventory`);
  if (!endpointSlackFlowCounts.get(flow)) fail(`no ${flow} report has a complete timing endpoint distribution`);
}
for (const dimension of [
  "design",
  "design_input",
  "tool",
  "pdk",
  "scl",
  "techfile_rc",
  "cell_model",
  "pvt",
  "clock_period",
  "floorplan_target",
  "seed",
  "swept_input",
]) {
  if (!filterFacetDimensions.has(dimension)) {
    fail(`Report scope catalog is missing dimension ${dimension}`);
  }
}
for (const category of ["design", "technology", "implementation", "experiment"]) {
  if (!filterFacetCategories.has(category)) {
    fail(`Report scope catalog is missing category ${category}`);
  }
}
if (filterFacetCategories.size !== 4) {
  fail(`Report scope must expose exactly four categories, found ${filterFacetCategories.size}`);
}
for (const obsoleteDimension of [
  "rtl_revision",
  "gate_netlist",
  "physical_layout",
  "sdc",
  "starting_point",
  "layout",
  "netlist",
  "methodology",
]) {
  if (filterFacetDimensions.has(obsoleteDimension)) {
    fail(`Report scope still exposes overlapping dimension ${obsoleteDimension}`);
  }
}
if (ppaRuns === 0) fail("no PPA-capable reports were generated");
for (const metricId of [...commonMetricUnits.keys(), "area.instance_um2", "design.physical_instances"]) {
  if (!normalizedMetricUnion.has(metricId)) fail(`normalized metric union is missing ${metricId}`);
}
const storedRunDirs = fs.readdirSync(store, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^[a-f0-9]{32}$/.test(entry.name))
  .map((entry) => entry.name);
if (storedRunDirs.length !== index.runCount || storedRunDirs.some((uid) => !seen.has(uid))) {
  fail("data store contains stale or unindexed report directories");
}
const pendingJson = [store];
while (pendingJson.length > 0) {
  const current = pendingJson.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const candidate = path.join(current, entry.name);
    if (entry.isDirectory()) pendingJson.push(candidate);
    else if (entry.isFile() && entry.name.endsWith(".json")) {
      if (/lvs/i.test(fs.readFileSync(candidate, "utf8"))) {
        fail(`${path.relative(store, candidate)} still contains LVS data`);
      }
    }
  }
}
const gf180Uart = comparableGroups.get("gf180mcuD\0gf180mcu_fd_sc_mcu9t5v0\0uart");
if (!gf180Uart || !["openroad", "openlane", "librelane"].every((flow) => gf180Uart.has(flow))) {
  fail("no directly comparable gf180mcuD/9t5v0 UART triplet was generated");
}

console.log(
  `[validate-ppa-data] ${index.runCount} reports validated; ${ppaRuns} PPA-capable; `
    + `${normalizedEntryCount} normalized entries across ${normalizedMetricUnion.size} canonical IDs; `
    + `${[...cellInventoryFlowCounts.values()].reduce((sum, count) => sum + count, 0)} final-DEF cell inventories; `
    + `${[...endpointSlackFlowCounts.values()].reduce((sum, count) => sum + count, 0)} endpoint distributions; `
    + [...flowCounts].map(([flow, count]) => `${flow}: ${count}`).join(", "),
);
