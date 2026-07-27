/* ==================================================================
 *  dataLoader.ts — Auto-discovery from data/spice-model-benchmark/
 *
 *  Reads the global manifest.json to discover all models, then
 *  builds the WorkflowScenario dynamically. No hardcoded models.
 * ================================================================== */

import type {
  WorkflowScenario,
  ModelArtifact,
  DomainBenchmarkResult,
  ArtifactRef,
  SimulatorId,
  AnalysisDomain,
  ReportStructure,
  ModelManifest,
} from "../../compat/spiceWorkflow/contracts";
import { parseReportMD } from "./reportParser";

const BASE = import.meta.env.BASE_URL || "/";
const DATA_ROOT = `${BASE}data/spice-model-benchmark`;
const FALLBACK_SIMULATORS: SimulatorId[] = ["ngspice", "hspice", "spectre"];
const FALLBACK_DOMAINS: AnalysisDomain[] = ["dc", "transient", "ac", "noise"];

/* ─── Global Manifest ─── */

interface GlobalManifest {
  version: string;
  description?: string;
  models: Record<string, {
    md5: string;
    sourceId: string;
    kind: "original" | "processed" | string;
    chain: string[];
    cardCount: number;
  }>;
  simulators: string[];
  modes: string[];
  generatedAt?: string;
}

let cachedManifest: GlobalManifest | null = null;

export async function fetchGlobalManifest(): Promise<GlobalManifest> {
  if (cachedManifest) return cachedManifest;
  const res = await fetch(`${DATA_ROOT}/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  cachedManifest = await res.json();
  return cachedManifest!;
}

function isSimulator(value: string): value is SimulatorId {
  return value === "ngspice" || value === "hspice" || value === "spectre";
}

function isDomain(value: string): value is AnalysisDomain {
  return value === "dc" || value === "transient" || value === "ac" || value === "noise";
}

function manifestSimulators(manifest: GlobalManifest): SimulatorId[] {
  const values = manifest.simulators.filter(isSimulator);
  return values.length > 0 ? values : FALLBACK_SIMULATORS;
}

function manifestDomains(manifest: GlobalManifest): AnalysisDomain[] {
  const values = manifest.modes.filter(isDomain);
  return values.length > 0 ? values : FALLBACK_DOMAINS;
}

/* ─── Build ModelArtifact from manifest entry ─── */

function buildModelArtifact(
  uid: string,
  md5: string,
  info: GlobalManifest["models"][string],
  parentMd5: string | null,
  sim: SimulatorId,
): ModelArtifact {
  const simModelId = `${md5}|${sim}`;
  const uidParts = uid.split("__");
  const deviceType = uidParts.includes("nmos") ? "nmos" : uidParts.includes("pmos") ? "pmos" : "unknown";
  const chain = info.chain.map((tool) => tool.charAt(0).toUpperCase() + tool.slice(1)).join(" → ");
  return {
    modelId: simModelId,
    parentModelId: parentMd5 ? `${parentMd5}|${sim}` : null,
    filename: `${uid}.lib`,
    displayName: `${uid} · ${sim}`,
    variant: info.kind === "processed" ? "calibrated" as const : "input" as const,
    dialect: sim,
    modelNames: [uid],
    deviceClass: "mos",
    deviceType,
    modelFamily: uidParts[2]?.toUpperCase() ?? "Unknown",
    byteSize: null,
    parameterCount: info.cardCount,
    checksum: md5,
    generatedBy: info.chain.includes("expansion") ? "expansion" : "user",
    operationChain: chain || "Input",
    pdkSource: info.sourceId,
    persistent: true,
    temporary: false,
    provenance: { origin: "existing-tool-output", sourceRepo: "spice_model_benchmark" },
  };
}

/* ─── Extract ALL numeric metrics from REPORT.md ─── */

/** Short readable metric name mapping: extract well-known values with concise keys */
const KNOWN_METRICS: { pattern: RegExp; key: string }[] = [
  // DC
  { pattern: /TC:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "DC_temp_coeff_/C" },
  { pattern: /VDS:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*V\s*to\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*V/, key: "DC_VDS_max_V" },
  { pattern: /KCL Error:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "DC_KCL_error_%" },
  // Transient
  { pattern: /Propagation Delay.*?([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*ps/, key: "Tran_prop_delay_ps" },
  { pattern: /Max Current:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Tran_max_current_A" },
  { pattern: /Rise Time:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Tran_rise_time_ps" },
  { pattern: /Total Chain Delay:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*ps/, key: "Tran_chain_delay_ps" },
  { pattern: /Temp Coeff:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Tran_power_TC_W/C" },
  // AC
  { pattern: /capacitance.*?([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*fF\s*to\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*fF/, key: "AC_Cgg_max_fF" },
  { pattern: /S11.*?([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*dB\s*to\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*dB/, key: "AC_S11_max_dB" },
  { pattern: /S21.*?([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*dB\s*to\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)\s*dB/, key: "AC_S21_max_dB" },
  { pattern: /phase shift:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "AC_NQS_phase_deg" },
  // Noise
  { pattern: /Floor:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Noise_thermal_floor_V2/Hz" },
  { pattern: /Exponent:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Noise_flicker_exponent" },
  { pattern: /Corner Freq.*?([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Noise_flicker_corner_Hz" },
  { pattern: /Level:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Noise_shot_level_V2/Hz" },
  { pattern: /Coefficient:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/, key: "Noise_temp_coeff_V2/Hz/C" },
];

function extractMetricsFromReport(report: ReportStructure, domain: AnalysisDomain): Record<string, number> {
  const metrics: Record<string, number> = {};

  // Collect ALL key findings text from sections that match this domain
  const texts: string[] = [];

  // Map section titles to domain codes
  const sectionTitleMap: Record<string, string> = {
    "DC Analysis": "dc", "Transient Analysis": "transient",
    "AC Analysis": "ac", "Noise Analysis": "noise",
  };

  // Summary
  for (const entry of (report.summary as any)[domain] ?? []) {
    if (entry.keyFindings) texts.push(entry.keyFindings);
  }

  // Detailed sections matching this domain
  for (const section of report.sections) {
    const secDomain = sectionTitleMap[section.title];
    if (secDomain !== domain) continue;
    for (const sub of section.subsections) {
      for (const entry of sub.entries) {
        if (entry.keyFindings) texts.push(entry.keyFindings);
        if (entry.children) {
          for (const child of entry.children) {
            if (child.keyFindings) texts.push(child.keyFindings);
          }
        }
      }
    }
  }

  // Apply known metric patterns to all collected texts
  const combined = texts.join("; ");
  for (const { pattern, key } of KNOWN_METRICS) {
    const m = combined.match(pattern);
    if (m) {
      // If the pattern has 2 capture groups, use the second (max value of range)
      const val = parseFloat(m[2] ?? m[1]);
      if (!isNaN(val) && isFinite(val)) metrics[key] = val;
    }
  }

  return metrics;
}

/* ─── Build DomainBenchmarkResult ─── */

function buildBenchmarkResult(
  modelId: string,
  sim: SimulatorId,
  domain: AnalysisDomain,
  report: ReportStructure | null,
  manifest: ModelManifest,
  plotArtifactIds: string[],
): DomainBenchmarkResult {
  const rid = `br-${modelId}-${sim}-${domain}`;

  const metrics: Record<string, number> = report
    ? extractMetricsFromReport(report, domain)
    : {};

  return {
    resultId: rid,
    modelId,
    simulator: sim,
    simulatorVersion: manifest.simulatorVersion ?? null,
    domain,
    status: manifest.status ?? "unavailable",
    resources: {
      wallTimeMs: manifest.wallTimeMs ?? null,
      peakRssMB: manifest.peakRssMB ?? null,
      source: "existing-tool-output",
    },
    keyMetrics: metrics as Record<string, number | string | null>,
    datasetArtifactIds: [],
    plotArtifactIds,
    provenance: { origin: "existing-tool-output", sourceRepo: "spice_model_benchmark" },
  };
}

/* ─── Build Plot Artifact ─── */

function buildPlotArtifacts(
  md5: string,
  runModelId: string,
  sim: SimulatorId,
  report: ReportStructure | null,
): Record<AnalysisDomain, ArtifactRef[]> {
  const byDomain: Record<AnalysisDomain, ArtifactRef[]> = {
    dc: [], transient: [], ac: [], noise: [],
  };
  if (!report) return byDomain;
  const sectionDomains: Record<string, AnalysisDomain | undefined> = {
    "DC Analysis": "dc",
    "Transient Analysis": "transient",
    "AC Analysis": "ac",
    "Noise Analysis": "noise",
  };
  let sequence = 0;
  for (const section of report.sections) {
    const domain = sectionDomains[section.title];
    if (!domain) continue;
    for (const subsection of section.subsections) {
      for (const plot of subsection.plotDetails ?? []) {
        sequence += 1;
        const artifactId = `plot-${runModelId}-${sequence}`;
        const url = `${DATA_ROOT}/${md5}/${sim}/${plot.src.replace(/^\.?\//, "")}`;
        byDomain[domain].push({
          artifactId,
          name: plot.src.split("/").pop() ?? plot.src,
          toolId: "benchmark",
          modelId: runModelId,
          domain,
          kind: "plot",
          format: "png",
          sizeBytes: null,
          hash: null,
          displayUrl: url,
          fetchUrl: url,
          visibility: "public",
          provenance: { origin: "existing-tool-output" },
          comparisonKey: `${section.title}/${subsection.title}/${plot.alt}`,
          title: plot.caption ?? plot.alt,
        });
      }
    }
  }
  return byDomain;
}

/* ─── Parse REPORT.md into ReportStructure ─── */

export async function fetchReport(modelId: string, sim: string): Promise<ReportStructure | null> {
  try {
    const url = `${DATA_ROOT}/${modelId}/${sim}/REPORT.md`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const md = await res.text();
    return parseReportMD(md, modelId, sim);
  } catch {
    return null;
  }
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeRunStatus(value: unknown): ModelManifest["status"] {
  if (typeof value !== "string") return "unavailable";
  const status = value.toLowerCase();
  if (status === "pass" || status === "passed" || status === "completed" || status === "success") return "pass";
  if (status === "fail" || status === "failed" || status === "error") return "fail";
  if (status === "partial" || status === "in-progress" || status === "running") return "partial";
  return "unavailable";
}

function normalizeRunManifest(
  rawValue: unknown,
  md5: string,
  sim: SimulatorId,
  fallback: GlobalManifest["models"][string],
): ModelManifest {
  const raw = asRecord(rawValue);
  const run = asRecord(raw.run);
  const benchmark = asRecord(raw.benchmark);
  const resources = asRecord(raw.resources);
  const timing = asRecord(raw.timing);
  const simulator = asRecord(raw.simulator);
  const fallbackUid = firstString(raw.modelId, raw.model_id) ?? md5;
  const fallbackDeviceType = fallbackUid.includes("__nmos__")
    ? "nmos"
    : fallbackUid.includes("__pmos__")
      ? "pmos"
      : "unknown";
  const chainValue = Array.isArray(raw.chain)
    ? raw.chain.filter((item): item is string => typeof item === "string").join(" → ")
    : null;
  const elapsedSeconds = firstNumber(raw.elapsedSeconds, raw.elapsed_seconds);
  const peakRssKiB = firstNumber(raw.peakRssKiB, raw.peak_rss_kib);
  const finishedAt = firstString(raw.finishedAt, raw.finished_at);

  return {
    modelId: fallbackUid,
    displayName: firstString(raw.displayName, raw.display_name) ?? fallbackUid,
    checksum: firstString(raw.checksum, raw.md5, raw.modelMd5, raw.model_md5) ?? md5,
    deviceType: (firstString(raw.deviceType, raw.device_type) ?? fallbackDeviceType) as ModelManifest["deviceType"],
    modelFamily: firstString(raw.modelFamily, raw.model_family) ?? "Unknown",
    pdkSource: firstString(raw.pdkSource, raw.pdk_source, raw.sourceId, raw.source_id) ?? fallback.sourceId,
    operationChain: firstString(raw.operationChain, raw.operation_chain)
      ?? chainValue
      ?? (fallback.chain.join(" → ") || "Input"),
    parameterCount: firstNumber(raw.parameterCount, raw.parameter_count) ?? fallback.cardCount,
    simulators: [sim],
    simulator: sim,
    simulatorVersion: firstString(
      raw.simulatorVersion, raw.simulator_version,
      simulator.version,
    ),
    runId: firstString(raw.runId, raw.run_id, run.id, benchmark.runId, benchmark.run_id),
    status: normalizeRunStatus(raw.status ?? run.status ?? benchmark.status),
    benchmarkStartedAt: firstString(
      raw.benchmarkStartedAt, raw.startedAt, raw.startTime,
      raw.benchmark_started_at, raw.started_at, raw.start_time,
      run.startedAt, run.started_at, timing.startedAt, timing.started_at,
    ),
    benchmarkEndedAt: firstString(
      raw.benchmarkEndedAt, raw.endedAt, raw.endTime,
      raw.finishedAt,
      raw.benchmark_ended_at, raw.ended_at, raw.end_time,
      run.endedAt, run.ended_at, timing.endedAt, timing.ended_at,
    ),
    reportGeneratedAt: firstString(
      raw.reportGeneratedAt, raw.report_generated_at,
      raw.generatedAt, raw.generated_at,
      finishedAt,
    ) ?? "",
    wallTimeMs: firstNumber(
      raw.wallTimeMs, raw.wall_time_ms,
      resources.wallTimeMs, resources.wall_time_ms,
      timing.wallTimeMs, timing.wall_time_ms,
    ) ?? (elapsedSeconds === null ? null : elapsedSeconds * 1000),
    peakRssMB: firstNumber(
      raw.peakRssMB, raw.peak_rss_mb,
      resources.peakRssMB, resources.peak_rss_mb,
    ) ?? (peakRssKiB === null ? null : peakRssKiB / 1024),
  };
}

export interface LoadedBenchmarkRuns {
  reports: Record<string, ReportStructure>;
  manifests: Record<string, ModelManifest>;
  benchmarkResults: DomainBenchmarkResult[];
  artifacts: Record<string, ArtifactRef>;
  runModelIds: string[];
}

const runLoadCache = new Map<string, Promise<{
  report: ReportStructure | null;
  manifest: ModelManifest;
}>>();
const manifestLoadCache = new Map<string, Promise<ModelManifest>>();

async function loadRunManifest(
  md5: string,
  sim: SimulatorId,
  fallback: GlobalManifest["models"][string],
): Promise<ModelManifest> {
  const key = `${md5}|${sim}`;
  const cached = manifestLoadCache.get(key);
  if (cached) return cached;

  const pending = fetch(`${DATA_ROOT}/${md5}/${sim}/manifest.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`${key}: manifest.json returned ${response.status}`);
      const rawManifest: unknown = await response.json();
      const manifest = normalizeRunManifest(rawManifest, md5, sim, fallback);
      if (manifest.checksum !== md5) {
        throw new Error(`${key}: manifest checksum ${manifest.checksum} does not match directory MD5 ${md5}`);
      }
      return manifest;
    });

  manifestLoadCache.set(key, pending);
  return pending;
}

async function loadRun(
  md5: string,
  sim: SimulatorId,
  fallback: GlobalManifest["models"][string],
): Promise<{ report: ReportStructure | null; manifest: ModelManifest }> {
  const key = `${md5}|${sim}`;
  const cached = runLoadCache.get(key);
  if (cached) return cached;

  const pending = Promise.all([
    loadRunManifest(md5, sim, fallback),
    fetchReport(md5, sim),
  ]).then(([manifest, report]) => ({ report, manifest }));

  runLoadCache.set(key, pending);
  return pending;
}

/** Load only the exact model/simulator runs selected by the user. */
export async function loadBenchmarkRuns(selectedRunIds: string[]): Promise<LoadedBenchmarkRuns> {
  const globalManifest = await fetchGlobalManifest();
  const domains = manifestDomains(globalManifest);
  const infoByMd5 = new Map(
    Object.values(globalManifest.models).map((info) => [info.md5, info]),
  );

  const requests = selectedRunIds.map((runModelId) => {
    const [md5, simulatorName] = runModelId.split("|");
    if (!md5 || !simulatorName || !isSimulator(simulatorName)) {
      throw new Error(`Invalid benchmark run ID: ${runModelId}`);
    }
    const info = infoByMd5.get(md5);
    if (!info) throw new Error(`Model ${md5} is not present in the global manifest`);
    const sim = simulatorName;
    return (async () => ({
      md5,
      sim,
      loaded: await loadRun(md5, sim, info),
    }))();
  });

  const loadedRuns = await Promise.all(requests);
  const reports: Record<string, ReportStructure> = {};
  const manifests: Record<string, ModelManifest> = {};
  const benchmarkResults: DomainBenchmarkResult[] = [];
  const artifacts: Record<string, ArtifactRef> = {};
  const runModelIds: string[] = [];

  for (const { md5, sim, loaded } of loadedRuns) {
    const runModelId = `${md5}|${sim}`;
    runModelIds.push(runModelId);
    manifests[runModelId] = loaded.manifest;
    if (loaded.report) reports[runModelId] = loaded.report;
    const plotsByDomain = buildPlotArtifacts(md5, runModelId, sim, loaded.report);
    for (const domainArtifacts of Object.values(plotsByDomain)) {
      for (const artifact of domainArtifacts) artifacts[artifact.artifactId] = artifact;
    }

    for (const domain of domains) {
      benchmarkResults.push(
        buildBenchmarkResult(
          runModelId,
          sim,
          domain,
          loaded.report,
          loaded.manifest,
          plotsByDomain[domain].map((artifact) => artifact.artifactId),
        ),
      );
    }
  }

  return { reports, manifests, benchmarkResults, artifacts, runModelIds };
}

/* ─── Build WorkflowScenario ─── */

export async function buildScenario(): Promise<WorkflowScenario> {
  const manifest = await fetchGlobalManifest();
  const simulators = manifestSimulators(manifest);
  const domains = manifestDomains(manifest);

  const models: Record<string, ModelArtifact> = {};
  const manifests: Record<string, ModelManifest> = {};
  const modelIds: string[] = [];
  const manifestRequests: Promise<void>[] = [];

  // Per-run manifests are lightweight selector metadata and are loaded up
  // front. REPORT files remain lazy and are fetched only after selection.
  for (const [uid, info] of Object.entries(manifest.models)) {
    const md5 = info.md5;

    for (const sim of simulators) {
      const simModelId = `${md5}|${sim}`;
      modelIds.push(simModelId);
      models[simModelId] = buildModelArtifact(uid, md5, info, null, sim);
      manifestRequests.push(
        loadRunManifest(md5, sim, info).then((runManifest) => {
          manifests[simModelId] = runManifest;
        }),
      );
    }
  }
  await Promise.all(manifestRequests);

  const firstId = modelIds[0] || "";

  return {
    schemaVersion: "3.0.0",
    scenarioId: "spice-benchmark",
    title: "SPICE Model Benchmark Results",
    description: "Auto-discovered from data/spice-model-benchmark/. Each selected model/simulator run loads its own manifest, REPORT.md and plots.",
    status: "completed",
    defaultInputModelId: firstId,
    defaultCandidateModelId: modelIds[1] || firstId,
    defaultSimulators: simulators,
    defaultDomains: domains,
    models,
    benchmarkResults: [],
    artifacts: {},
    reports: {},
    manifests,
    operations: [],
    invocations: {},
    executions: {},
    provenance: {
      origin: "existing-tool-output",
      sourceRepo: "spice_model_benchmark",
      generatedAt: manifest.generatedAt,
    },
  };
}
