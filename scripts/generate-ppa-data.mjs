#!/usr/bin/env node
/**
 * Build a content-addressed web data store from normalized final-run ASTs for
 * OpenROAD, OpenLane, and LibreLane.
 *
 * Primary sources:
 *   OpenROAD: metrics.json (packaged final summary)
 *   OpenLane:  reports/metrics.csv, corroborated by final DEF/native reports
 *   LibreLane: final/metrics.json or a complete terminal state_out.json
 *
 * Output:
 *   data/ppa-analysis/available-runs.json
 *   data/ppa-analysis/<md5>/manifest.json
 *   data/ppa-analysis/<md5>/report.json
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const resultsRoot = path.resolve(process.env.PPA_RESULTS_ROOT || path.join(projectRoot, "..", "results"));
const parserPath = path.resolve(
  process.env.PPA_AST_PARSER
    || path.join(projectRoot, "..", "rtl2gds-copilot-orchestrator", "scripts", "result_json_ast.py"),
);
const publishedOutputRoot = path.join(projectRoot, "data", "ppa-analysis");
const outputRoot = path.join(projectRoot, "data", `.ppa-analysis-stage-${process.pid}`);
const uploadedPpaRoot = path.join(projectRoot, "data", "uploads", "ppa");

function fail(message) {
  throw new Error(`[generate-ppa-data] ${message}`);
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.isFile()) files.push(candidate);
    }
  }
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

function classifyPrimary(filePath) {
  const relativePath = path.relative(resultsRoot, filePath).split(path.sep).join("/");
  let match = relativePath.match(/^dtco-benchmark\/runs\/([^/]+)\/normalized-metrics\.json$/);
  if (match) {
    const runDir = path.dirname(filePath);
    const manifestPath = path.join(runDir, "manifest.json");
    const statusPath = path.join(runDir, "status.json");
    if (!fs.existsSync(manifestPath) || !fs.existsSync(statusPath)) return null;
    const normalized = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    const concrete = manifest.scenario?.concrete;
    const flowAliases = {
      "openroad-flow-scripts": "openroad",
      openroad: "openroad",
      openlane: "openlane",
      librelane: "librelane",
    };
    const flow = flowAliases[manifest.flow];
    const reportedMetrics = Array.isArray(normalized.metrics) ? normalized.metrics : [];
    const reportedValues = (metricId) => reportedMetrics
      .filter((metric) => metric?.id === metricId)
      .map((metric) => finite(metric?.value))
      .filter((value) => value !== null);
    // Publication requires a complete observed P/P/A result.  Comparability is
    // a separate property: an experiment may legitimately report power while
    // declaring that power unsuitable for cross-variant ranking (for example,
    // when a characterized cell has timing arcs but no power arcs).
    const hasFullObservedPpa = reportedValues("area.design.die.area").length > 0
      && reportedValues("power.total").length > 0
      && (reportedValues("timing.fmax").length > 0 || reportedValues("timing.setup.ws").length > 0);
    const validMethodology = manifest.entry_mode === "physical"
      ? status.physical_freeze_audit?.status === "VALID"
      : manifest.entry_mode === "gate"
        ? status.gate_bypass_audit?.status === "VALID" && status.final_extraction_audit?.status === "VALID"
        : manifest.entry_mode === "rtl"
          ? status.synthesis_audit?.status === "VALID" && status.final_extraction_audit?.status === "VALID"
          : false;
    if (normalized.schema_version !== "dtco-normalized-metrics.v1"
      || normalized.status !== "success" || status.status !== "COMPLETED"
      || !validMethodology || !["openroad", "openlane", "librelane"].includes(flow)
      || !hasFullObservedPpa
      || !concrete?.technology?.pdk || !concrete?.design?.name) {
      return null;
    }
    return {
      flow,
      pdk: concrete.technology.pdk,
      scl: concrete.technology.standard_cell_library ?? null,
      design: concrete.design.name,
      runName: manifest.run_id ?? match[1],
      runRelativeDir: relativePath.replace(/\/normalized-metrics\.json$/, ""),
      priority: 4,
      sourceProfile: "dtco-normalized",
    };
  }
  match = relativePath.match(
    /^librelane\/([^/]+)\/([^/]+)\/([^/]+)\/(RUN_[^/]+)\/final\/metrics\.json$/,
  );
  if (match) {
    return {
      flow: "librelane",
      pdk: match[1],
      scl: match[2],
      design: match[3],
      runName: match[4],
      runRelativeDir: relativePath.replace(/\/final\/metrics\.json$/, ""),
      priority: 3,
    };
  }
  match = relativePath.match(
    /^librelane\/([^/]+)\/([^/]+)\/([^/]+)\/(RUN_[^/]+)\/[0-9]+-[^/]+\/state_out\.json$/,
  );
  if (match) {
    return {
      flow: "librelane",
      pdk: match[1],
      scl: match[2],
      design: match[3],
      runName: match[4],
      runRelativeDir: relativePath.replace(/\/[0-9]+-[^/]+\/state_out\.json$/, ""),
      priority: 1,
    };
  }
  match = relativePath.match(
    /^openlane\/([^/]+)\/([^/]+)\/(RUN_[^/]+)\/reports\/metrics\.csv$/,
  );
  if (match) {
    return {
      flow: "openlane",
      pdk: match[1],
      scl: null,
      design: match[2],
      runName: match[3],
      runRelativeDir: relativePath.replace(/\/reports\/metrics\.csv$/, ""),
      priority: 3,
    };
  }
  match = relativePath.match(
    /^openroad\/([^/]+)\/([^/]+)\/([^/]+)\/(RUN_[^/]+)\/metrics\.json$/,
  );
  if (match) {
    return {
      flow: "openroad",
      pdk: match[1],
      scl: match[2],
      design: match[3],
      runName: match[4],
      runRelativeDir: relativePath.replace(/\/metrics\.json$/, ""),
      priority: 3,
    };
  }
  return null;
}

function discoverRuns() {
  const byRun = new Map();
  for (const filePath of walkFiles(resultsRoot)) {
    const identity = classifyPrimary(filePath);
    if (!identity) continue;
    const key = `${identity.flow}\0${identity.runRelativeDir}`;
    const previous = byRun.get(key);
    if (!previous || identity.priority > previous.priority) {
      byRun.set(key, identity);
    }
  }
  if (fs.existsSync(uploadedPpaRoot)) {
    for (const entry of fs.readdirSync(uploadedPpaRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9]{32}$/.test(entry.name)) continue;
      const receiptPath = path.join(uploadedPpaRoot, entry.name, "receipt.json");
      if (!fs.existsSync(receiptPath)) continue;
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      if (receipt.schemaVersion !== "eda-upload-receipt.v1" || receipt.dataset !== "ppa") continue;
      if (!["openroad", "openlane", "librelane"].includes(receipt.flow)) {
        fail(`${receiptPath}: invalid uploaded PPA flow`);
      }
      const suffix = receipt.runRelativeDir === "." ? "" : `/${receipt.runRelativeDir}`;
      const identity = {
        flow: receipt.flow,
        pdk: receipt.pdk,
        scl: receipt.scl ?? null,
        design: receipt.design,
        runName: receipt.runName,
        runRelativeDir: `uploads/ppa/${entry.name}/source${suffix}`,
        publicRunRelativeDir: `uploads/ppa/${entry.name}/source${suffix}`,
        absoluteRunDir: path.join(uploadedPpaRoot, entry.name, "source", ...(suffix ? receipt.runRelativeDir.split("/") : [])),
        priority: 5,
        sourceProfile: "uploaded-ppa",
      };
      byRun.set(`${identity.flow}\0${identity.runRelativeDir}`, identity);
    }
  }
  return [...byRun.values()].sort((left, right) =>
    left.flow.localeCompare(right.flow, "en")
    || left.runRelativeDir.localeCompare(right.runRelativeDir, "en"),
  );
}

function interpret(identity) {
  const runDir = identity.absoluteRunDir
    ?? path.join(resultsRoot, ...identity.runRelativeDir.split("/"));
  const execution = spawnSync(
    "python3",
    [parserPath, "run", runDir, "--flow", identity.flow, "--include-all"],
    { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 },
  );
  if (execution.status !== 0) {
    if (identity.flow === "librelane" && identity.priority === 1) return null;
    fail(`${identity.runRelativeDir}: parser failed: ${execution.stderr.trim() || `exit ${execution.status}`}`);
  }
  try {
    return JSON.parse(execution.stdout);
  } catch (error) {
    fail(`${identity.runRelativeDir}: parser emitted invalid JSON: ${error}`);
  }
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function titleFromToken(value) {
  return String(value)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function conciseNumber(value) {
  return Number(value).toLocaleString("en", { maximumSignificantDigits: 8 });
}

function readScenarioContext(runDir) {
  const manifestPath = path.join(runDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const concrete = manifest?.scenario?.concrete;
    if (!concrete || typeof concrete !== "object") return null;
    return { manifest, concrete };
  } catch {
    return null;
  }
}

const facetCategories = {
  design: { label: "Design & constraints", order: 10 },
  technology: { label: "Technology", order: 20 },
  implementation: { label: "Implementation", order: 30 },
  experiment: { label: "Experiment definition", order: 40 },
};

const facetDimensions = {
  design: { category: "design", label: "Design", order: 10 },
  design_input: { category: "design", label: "Design input", order: 20 },
  clock_period: { category: "design", label: "Clock period", order: 30 },
  pdk: { category: "technology", label: "PDK", order: 10 },
  scl: { category: "technology", label: "Standard-cell library", order: 20 },
  techfile_rc: { category: "technology", label: "Techfile RC", order: 30 },
  cell_model: { category: "technology", label: "Cell model", order: 40 },
  pvt: { category: "technology", label: "PVT", order: 50 },
  tool: { category: "implementation", label: "Tools", order: 10 },
  floorplan_target: { category: "implementation", label: "Floorplan target", order: 20 },
  seed: { category: "implementation", label: "Seed", order: 30 },
  swept_input: { category: "experiment", label: "Swept input", order: 10 },
};

export function buildFilterFacets(identity, interpretation, summary, scenarioContext) {
  const facets = [];
  const seen = new Set();
  const add = (dimension, value, valueLabel = value, valueOrder = 100) => {
    const normalizedValue = textValue(value);
    const normalizedLabel = textValue(valueLabel);
    const definition = facetDimensions[dimension];
    if (!definition || !normalizedValue || !normalizedLabel) return;
    const category = facetCategories[definition.category];
    const key = `${dimension}\0${normalizedValue}`;
    if (seen.has(key)) return;
    seen.add(key);
    facets.push({
      category: definition.category,
      categoryLabel: category.label,
      categoryOrder: category.order,
      dimension,
      dimensionLabel: definition.label,
      value: normalizedValue,
      valueLabel: normalizedLabel,
      dimensionOrder: definition.order,
      valueOrder: finite(valueOrder) ?? 100,
    });
  };

  const flowLabels = {
    openroad: "OpenROAD / ORFS",
    openlane: "OpenLane",
    librelane: "LibreLane",
  };
  const flowOrder = { openroad: 10, openlane: 20, librelane: 30 };
  add("design", identity.design, identity.design, 100);
  add("tool", identity.flow, flowLabels[identity.flow] ?? titleFromToken(identity.flow), flowOrder[identity.flow] ?? 100);
  add("pdk", identity.pdk, identity.pdk, 100);
  add("scl", identity.scl, identity.scl, 100);

  const concrete = scenarioContext?.concrete;
  const inputContract = scenarioContext?.manifest?.input_contract ?? {};
  const entryMode = textValue(concrete?.entry?.mode)
    ?? textValue(scenarioContext?.manifest?.entry_mode)
    ?? textValue(interpretation.configuration?.entry_mode);
  const entryLabels = {
    rtl: "RTL",
    gate: "Gate-level netlist",
    physical: "Routed physical design",
  };
  const entryOrder = { rtl: 10, gate: 20, physical: 30 };
  const rtlArtifacts = Array.isArray(inputContract.rtl)
    ? inputContract.rtl.filter((artifact) => textValue(artifact?.sha256) !== null)
    : [];
  const artifactIdentity = (artifact, fallbackName) => {
    const artifactHash = textValue(artifact?.sha256);
    if (artifactHash === null) return null;
    const artifactName = textValue(artifact?.path)
      ? path.basename(String(artifact.path).replaceAll("\\", "/"))
      : fallbackName;
    return { hash: artifactHash, name: artifactName };
  };
  let designInput = null;
  if (entryMode === "rtl" && rtlArtifacts.length > 0) {
    const rtlHash = createHash("sha256")
      .update(JSON.stringify(rtlArtifacts.map((artifact) => artifact.sha256).sort()))
      .digest("hex");
    designInput = { hash: rtlHash, name: identity.design };
  } else if (entryMode === "gate") {
    designInput = artifactIdentity(inputContract.reference_netlist, "gate netlist");
  } else if (entryMode === "physical") {
    designInput = artifactIdentity(inputContract.physical_reference?.def, "DEF");
  }
  if (entryMode !== null) {
    const entryLabel = entryLabels[entryMode] ?? titleFromToken(entryMode);
    add(
      "design_input",
      `${entryMode}|${designInput?.hash ?? "not-recorded"}`,
      designInput
        ? `${entryLabel} · ${designInput.name} · ${designInput.hash.slice(0, 8)}`
        : `${entryLabel} · identity not recorded`,
      entryOrder[entryMode] ?? 100,
    );
  }
  const technology = concrete?.technology ?? {};
  const beol = technology.beol ?? {};
  const experiment = interpretation.experiment ?? {};
  const beolId = textValue(beol.id) ?? textValue(experiment.variant);
  const rcScale = finite(beol.rc_scale) ?? finite(experiment.techfile_rc_scale);
  if (beolId !== null || rcScale !== null) {
    const rcValue = `${beolId ?? "rc"}|${rcScale ?? "unspecified"}`;
    let rcLabel;
    if (beolId?.toLocaleLowerCase() === "original") {
      rcLabel = "Original RC";
    } else if (beolId !== null && rcScale !== null) {
      rcLabel = `${beolId} · RC ×${conciseNumber(rcScale)}`;
    } else if (beolId !== null) {
      rcLabel = beolId;
    } else {
      rcLabel = `RC ×${conciseNumber(rcScale)}`;
    }
    add("techfile_rc", rcValue, rcLabel, beolId?.toLocaleLowerCase() === "original" ? -1 : rcScale ?? 100);
  }

  const cellId = textValue(technology.cell?.id);
  add("cell_model", cellId, cellId, /baseline|original/i.test(cellId ?? "") ? -1 : 100);

  const pvt = technology.pvt;
  if (pvt && typeof pvt === "object") {
    const corner = textValue(pvt.corner);
    const voltage = finite(pvt.voltage_v);
    const temperature = finite(pvt.temperature_c);
    const pvtParts = [
      corner?.toLocaleUpperCase(),
      voltage === null ? null : `${conciseNumber(voltage)} V`,
      temperature === null ? null : `${conciseNumber(temperature)} °C`,
    ].filter(Boolean);
    const pvtOrder = { tt: 10, ff: 20, ss: 30 };
    if (pvtParts.length > 0) {
      add(
        "pvt",
        [corner ?? "", voltage ?? "", temperature ?? ""].join("|"),
        pvtParts.join(" · "),
        pvtOrder[corner?.toLocaleLowerCase()] ?? 100,
      );
    }
  }

  const clockPeriod = finite(concrete?.timing?.clock_period_ns) ?? finite(summary.clockPeriodNs);
  if (clockPeriod !== null) {
    add("clock_period", String(clockPeriod), `${conciseNumber(clockPeriod)} ns`, clockPeriod);
  }

  const coreUtilization = finite(inputContract.core_utilization_percent);
  const coreAspectRatio = finite(inputContract.core_aspect_ratio);
  const coreMargin = finite(inputContract.core_margin_um);
  if ([coreUtilization, coreAspectRatio, coreMargin].some((value) => value !== null)) {
    const floorplanParts = [
      coreUtilization === null ? null : `${conciseNumber(coreUtilization)}% utilization`,
      coreAspectRatio === null ? null : `AR ${conciseNumber(coreAspectRatio)}`,
      coreMargin === null ? null : `${conciseNumber(coreMargin)} µm margin`,
    ].filter(Boolean);
    add(
      "floorplan_target",
      [coreUtilization ?? "", coreAspectRatio ?? "", coreMargin ?? ""].join("|"),
      floorplanParts.join(" · "),
      coreUtilization ?? 100,
    );
  }

  const seed = finite(concrete?.execution?.seed);
  if (seed !== null) add("seed", String(seed), String(seed), seed);

  const sweptInputLabels = {
    "technology.beol": "Techfile RC",
    "technology.cell": "Cell model",
    "technology.pvt": "PVT",
    "timing.clock_period_ns": "Clock period",
  };
  for (const [index, variable] of (concrete?.comparison?.declared_variables ?? []).entries()) {
    if (typeof variable !== "string" || !variable) continue;
    add("swept_input", variable, sweptInputLabels[variable] ?? titleFromToken(variable), index);
  }

  return facets.sort((left, right) => left.categoryOrder - right.categoryOrder
    || left.dimensionOrder - right.dimensionOrder
    || left.valueOrder - right.valueOrder
    || left.valueLabel.localeCompare(right.valueLabel, "en"));
}

function stripLvsData(parsed) {
  const interpretation = parsed.interpretation ?? {};
  if (interpretation.signoff_indicators) {
    delete interpretation.signoff_indicators.lvs_errors;
    delete interpretation.signoff_indicators.lvs_clean;
  }
  for (const key of [
    "lvs_clean_inference",
    "bad_nets",
    "bad_elements",
    "library_cell_pin_comparisons",
    "top_cell",
    "nets",
    "devices",
    "pins",
  ]) delete interpretation[key];
  if (Array.isArray(interpretation.all_metrics)) {
    interpretation.all_metrics = interpretation.all_metrics.filter(
      (metric) => !String(metric.name ?? "").toLowerCase().includes("lvs"),
    );
    interpretation.metric_count = interpretation.all_metrics.length;
    interpretation.metrics_by_category = interpretation.all_metrics.reduce((counts, metric) => {
      const category = metric.category ?? "<none>";
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});
  }
  if (Array.isArray(interpretation.normalized_metric_provenance)) {
    interpretation.normalized_metric_provenance = interpretation.normalized_metric_provenance.filter(
      (record) => ![record?.metric_id, record?.source_field, record?.source]
        .some((value) => String(value ?? "").toLowerCase().includes("lvs")),
    );
  }
  if (Array.isArray(interpretation.all_ast_leaves)) delete interpretation.all_ast_leaves;
  if (Array.isArray(interpretation.boundaries)) {
    interpretation.boundaries = interpretation.boundaries.filter(
      (boundary) => !String(boundary).toLowerCase().includes("lvs"),
    );
  }
  if (Array.isArray(parsed.source_bundle?.supporting_sources)) {
    parsed.source_bundle.supporting_sources = parsed.source_bundle.supporting_sources.filter(
      (source) => !String(source.source ?? "").toLowerCase().includes("lvs"),
    );
  }
}

function portablePublishedPaths(value) {
  // Reports frequently retain machine-local configuration paths as ordinary
  // metric values. Keep the value shape and suffix while removing workstation
  // identity from the web artifact. This applies recursively to every flow and
  // every string field; source hashes still identify the untouched native file.
  if (Array.isArray(value)) return value.map((item) => portablePublishedPaths(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, portablePublishedPaths(item)]),
    );
  }
  if (typeof value !== "string") return value;
  return value
    .replaceAll("\\", "/")
    .replace(/\/home\/[^/]+\//g, "<home>/")
    .replace(/\/Users\/[^/]+\//g, "<home>/");
}

function ppaSummary(interpretation) {
  const design = interpretation.design ?? {};
  const timing = interpretation.timing_aggregate ?? {};
  const power = interpretation.power_mw ?? {};
  const routing = interpretation.routing ?? {};
  const signoff = interpretation.signoff_indicators ?? {};
  const irDrop = interpretation.ir_drop ?? {};
  const cellUsage = interpretation.standard_cell_usage ?? {};
  const endpointSlacks = interpretation.timing_endpoint_slacks ?? {};
  const setupEndpointSlacks = Array.isArray(endpointSlacks.setup?.endpoints)
    ? endpointSlacks.setup.endpoints.map((record) => finite(record?.slack_ns)).filter((value) => value !== null)
    : [];
  const holdEndpointSlacks = Array.isArray(endpointSlacks.hold?.endpoints)
    ? endpointSlacks.hold.endpoints.map((record) => finite(record?.slack_ns)).filter((value) => value !== null)
    : [];
  const area = finite(design.die_area_um2);
  const totalPower = finite(power.total);
  const powerComparability = interpretation.metric_comparability?.["power.total_mw"];
  const powerComparisonValid = powerComparability?.comparison_valid !== false;
  const powerComparisonReason = typeof powerComparability?.exclusion_reason === "string"
    ? powerComparability.exclusion_reason
    : null;
  const referenceSetup = finite(timing.reference_setup_slack_ns);
  const referenceHold = finite(timing.reference_hold_slack_ns);
  return {
    hasPpa: area !== null && totalPower !== null,
    areaUm2: area,
    coreAreaUm2: finite(design.core_area_um2),
    instanceAreaUm2: finite(design.instance_area_um2),
    utilization: finite(design.utilization),
    instances: finite(design.instances),
    physicalInstances: finite(design.physical_instances),
    macros: finite(design.macros),
    ioCount: finite(design.io_count),
    totalPowerMw: totalPower,
    powerComparisonValid,
    powerComparisonReason,
    internalPowerMw: finite(power.internal),
    switchingPowerMw: finite(power.switching),
    leakagePowerMw: finite(power.leakage),
    referenceCorner: typeof timing.reference_corner === "string" ? timing.reference_corner : null,
    setupSlackNs: referenceSetup,
    holdSlackNs: referenceHold,
    worstSetupSlackNs: finite(timing.setup_worst_slack_ns),
    worstHoldSlackNs: finite(timing.hold_worst_slack_ns),
    setupTnsNs: finite(timing.setup_tns_ns),
    holdTnsNs: finite(timing.hold_tns_ns),
    clockPeriodNs: finite(timing.clock_period_ns ?? interpretation.configuration?.clock_period_ns),
    criticalPathNs: finite(timing.critical_path_ns),
    fmaxHz: finite(timing.fmax_hz),
    fmaxMethod: typeof timing.fmax_method === "string" ? timing.fmax_method : null,
    setupViolations: finite(timing.setup_violation_count),
    holdViolations: finite(timing.hold_violation_count),
    maxSlewViolations: finite(timing.max_slew_violation_count),
    maxCapViolations: finite(timing.max_cap_violation_count),
    maxFanoutViolations: finite(timing.max_fanout_violation_count),
    wirelengthUm: finite(routing.wirelength_um),
    vias: finite(routing.vias),
    nets: finite(routing.nets),
    routeDrcErrors: finite(routing.detailed_route_drc_errors),
    antennaViolations: finite(routing.antenna_violation_count),
    flowErrors: finite(signoff.flow_errors),
    flowWarnings: finite(signoff.flow_warnings),
    magicDrcErrors: finite(signoff.magic_drc_errors),
    averageIrDropV: finite(irDrop.average_v),
    worstIrDropV: finite(irDrop.worst_v),
    cellUsageAvailable: cellUsage.availability === "available",
    finalDefComponents: finite(cellUsage.parsed_component_count),
    uniqueCellMasters: finite(cellUsage.unique_master_count),
    metricCount: finite(interpretation.metric_count),
    cornerSetupSlackNs: Object.fromEntries(
      Object.entries(timing.corners ?? {}).map(([corner, metrics]) => [
        corner,
        finite(metrics?.setup_slack_ns),
      ]),
    ),
    timingEndpointSlacks: {
      availability: endpointSlacks.availability === "available" ? "available" : "unavailable",
      referenceCorner: typeof endpointSlacks.reference_corner === "string" ? endpointSlacks.reference_corner : null,
      reason: typeof endpointSlacks.reason === "string" ? endpointSlacks.reason : null,
      setupEndpointCount: setupEndpointSlacks.length,
      holdEndpointCount: holdEndpointSlacks.length,
      setupViolationCount: finite(endpointSlacks.setup?.violation_count) ?? 0,
      holdViolationCount: finite(endpointSlacks.hold?.violation_count) ?? 0,
      setupSlackNs: setupEndpointSlacks,
      holdSlackNs: holdEndpointSlacks,
    },
    powerBreakdownMw: {
      internal: finite(power.internal),
      switching: finite(power.switching),
      leakage: finite(power.leakage),
    },
    metricsByCategory: interpretation.metrics_by_category ?? {},
    completionStatus: interpretation.completion?.status ?? null,
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  if (!fs.existsSync(resultsRoot)) fail(`results root does not exist: ${resultsRoot}`);
  if (!fs.existsSync(parserPath)) fail(`AST parser does not exist: ${parserPath}`);

  const sources = discoverRuns();
  if (sources.length === 0) fail(`no supported report JSON found under ${resultsRoot}`);

  const generated = [];
  for (const baseIdentity of sources) {
    let parsed = interpret(baseIdentity);
    if (parsed === null) continue;
    if (baseIdentity.flow === "openlane" && parsed.interpretation.completion?.implementation_complete !== true) {
      continue;
    }
    const absoluteRunDir = baseIdentity.absoluteRunDir
      ?? path.join(resultsRoot, ...baseIdentity.runRelativeDir.split("/"));
    const scenarioContext = readScenarioContext(absoluteRunDir);
    stripLvsData(parsed);
    parsed = portablePublishedPaths(parsed);
    const primarySource = parsed.source_bundle?.primary_source;
    if (typeof primarySource !== "string") fail(`${baseIdentity.runRelativeDir}: parser omitted primary source`);
    const publicRunRelativeDir = baseIdentity.publicRunRelativeDir ?? baseIdentity.runRelativeDir;
    const relativePath = `${publicRunRelativeDir}/${primarySource}`;
    parsed.ast.source = relativePath;
    const interpretation = parsed.interpretation;
    const experiment = interpretation.experiment ?? {};
    const sourceSha256 = parsed.ast.sha256;
    const bundleSha256 = createHash("sha256")
      .update(JSON.stringify([
        [relativePath, sourceSha256],
        ...(parsed.source_bundle.supporting_sources ?? []).map((source) => [source.source, source.sha256]),
      ]))
      .digest("hex");
    const identity = {
      ...baseIdentity,
      scl: baseIdentity.scl ?? interpretation.configuration?.standard_cell_library ?? null,
      variant: typeof experiment.variant === "string" ? experiment.variant : null,
      techfileRcScale: finite(experiment.techfile_rc_scale),
      sourceKind: interpretation.schema === "openlane.final_metrics"
        ? "final-metrics-csv"
        : interpretation.schema === "dtco.normalized_metrics"
          ? "normalized-metrics-json"
        : interpretation.schema === "librelane.terminal_state"
          ? "terminal-state-json"
          : "final-metrics-json",
      relativePath,
    };
    delete identity.priority;
    delete identity.runRelativeDir;
    delete identity.sourceProfile;
    delete identity.publicRunRelativeDir;
    delete identity.absoluteRunDir;
    const uid = createHash("md5")
      .update(`ppa-analysis-v3\0${identity.relativePath}\0${bundleSha256}`)
      .digest("hex");
    const summary = ppaSummary(interpretation);
    const filterFacets = buildFilterFacets(identity, interpretation, summary, scenarioContext);
    const manifest = {
      schemaVersion: "1.3.0",
      uid,
      ...identity,
      filterFacets,
      sourceSha256,
      bundleSha256,
      reportSchema: interpretation.schema,
      tool: interpretation.tool,
      scope: interpretation.scope,
      authoritativeOverallStatus: interpretation.authoritative_overall_status === true,
      ast: {
        format: parsed.ast.format,
        bytesUtf8: parsed.ast.bytes_utf8,
        rootKind: parsed.ast.root_kind,
        nodeCount: parsed.ast.node_count_including_keys,
        leafCount: parsed.ast.leaf_count_including_keys,
        maxDepth: parsed.ast.max_depth,
        standardJson: parsed.ast.standard_json,
        nonFiniteNumberNodes: parsed.ast.non_finite_number_nodes,
        duplicateKeyGroups: parsed.ast.duplicate_key_groups,
        nodeKinds: parsed.ast.node_kinds,
      },
      summary,
      sourceBundle: parsed.source_bundle,
      reportPath: `${uid}/report.json`,
    };
    generated.push({
      manifest,
      report: { schemaVersion: "1.3.0", manifest, ...parsed },
      sourceAbsolutePath: path.join(absoluteRunDir, ...primarySource.split("/")),
    });
  }

  generated.sort((left, right) => {
    const a = left.manifest;
    const b = right.manifest;
    return a.flow.localeCompare(b.flow, "en")
      || a.pdk.localeCompare(b.pdk, "en")
      || String(a.scl ?? "").localeCompare(String(b.scl ?? ""), "en")
      || a.design.localeCompare(b.design, "en")
      || b.runName.localeCompare(a.runName, "en");
  });

  const generatedAt = new Date(
    Math.max(...generated.map(({ sourceAbsolutePath }) => {
      return fs.statSync(sourceAbsolutePath).mtimeMs;
    })),
  ).toISOString();
  fs.rmSync(outputRoot, { recursive: true, force: true });
  for (const entry of generated) {
    const runDir = path.join(outputRoot, entry.manifest.uid);
    writeJson(path.join(runDir, "manifest.json"), entry.manifest);
    writeJson(path.join(runDir, "report.json"), entry.report);
  }
  writeJson(path.join(outputRoot, "available-runs.json"), {
    schemaVersion: "1.3.0",
    generatedAt,
    sourceRoot: "results",
    parser: "rtl2gds-copilot-orchestrator/scripts/result_json_ast.py run",
    runCount: generated.length,
    flows: [...new Set(generated.map(({ manifest }) => manifest.flow))].sort(),
    pdks: [...new Set(generated.map(({ manifest }) => manifest.pdk))].sort(),
    designs: [...new Set(generated.map(({ manifest }) => manifest.design))].sort(),
    runs: generated.map(({ manifest }) => manifest),
  });

  const backupRoot = path.join(projectRoot, "data", `.ppa-analysis-backup-${process.pid}`);
  fs.rmSync(backupRoot, { recursive: true, force: true });
  if (fs.existsSync(publishedOutputRoot)) fs.renameSync(publishedOutputRoot, backupRoot);
  try {
    fs.renameSync(outputRoot, publishedOutputRoot);
  } catch (error) {
    if (fs.existsSync(backupRoot)) fs.renameSync(backupRoot, publishedOutputRoot);
    throw error;
  }
  fs.rmSync(backupRoot, { recursive: true, force: true });

  const counts = Object.groupBy
    ? Object.groupBy(generated, ({ manifest }) => manifest.flow)
    : generated.reduce((result, entry) => {
        (result[entry.manifest.flow] ??= []).push(entry);
        return result;
      }, {});
  console.log(
    `[generate-ppa-data] ${generated.length} AST reports → data/ppa-analysis `
      + `(${Object.entries(counts).map(([flow, entries]) => `${flow}: ${entries.length}`).join(", ")})`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
    throw error;
  }
}
