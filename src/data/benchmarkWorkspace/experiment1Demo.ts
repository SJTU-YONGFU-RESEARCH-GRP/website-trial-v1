/* ==================================================================
 *  experiment1Demo.ts — v2 (goal restructure)
 *
 *  Sky130 NMOS/PMOS: Direct FF vs Reduction→FF Benchmark Comparison
 *
 *  Model IDs use checksum format (UID/MD5).
 *  Data stored under data/spice-benchmark/{modelId}/{simulator}/
 *
 *  ngspice: real simulation results
 *  hspice / spectre: synthetic data derived from ngspice
 * ================================================================== */

import type {
  WorkflowScenario,
  DomainBenchmarkResult,
  ArtifactRef,
  SimulatorId,
  AnalysisDomain,
} from "../../compat/spiceWorkflow/contracts";
import {
  EXPERIMENT1_REPORTS,
  buildReportLookup,
  buildManifestLookup,
} from "./reportData";

const BASE = import.meta.env.BASE_URL || "/";

/* ─── Model checksum IDs (real MD5) ─── */
const M_IDS = {
  nmosInput: "2b84a29946bd97b4",
  nmosDirectFF: "bc2b6974a1a14408",
  nmosReducedFF: "65341a7d3ec75e87",
  pmosInput: "32fa1724a4aaebf6",
  pmosDirectFF: "99bf6dbba6647544",
  pmosReducedFF: "ece4201f2990f6b2",
  // FreePDK45 models from integratedDemo
  fpdkInput: "7060448bf0330761",
  fpdkTranslated: "a875198b92ca0c78",
  fpdkCalibrated: "f5f0f5d9d76bf754",
  fpdkReduced: "264f10cd6c5b5069",
  fpdkTTCorner: "cfe7683bc4144750",
  fpdkSSCorner: "28f885f982d10ca9",
  fpdkFFCorner: "60c44bb10ba2d017",
  fpdkPmosInput: "02853eca87767dc1",
};

function dataPath(modelId: string, sim: string, domain: string): string {
  return `${BASE}data/spice-benchmark/${modelId}/${sim}/data/${domain}_data.json`;
}

function plotPath(modelId: string, sim: string, domain: string): string {
  return `${BASE}data/spice-benchmark/${modelId}/${sim}/plots/${domain}_chart.png`;
}

/* ─── Catalog mapping ─── */
const CATALOG_MAP: Record<string, string> = {
  dc: "iv-characteristics",
  transient: "large-signal-transient",
  ac: "cv-characteristics",
  noise: "thermal-noise",
};

/* ─── Helper factories ─── */

function result(
  modelId: string,
  sim: SimulatorId,
  domain: AnalysisDomain,
  status: "pass" | "fail" | "partial" | "unavailable",
  metrics: Record<string, number>,
  isSynth: boolean,
): DomainBenchmarkResult {
  const rid = `br-${modelId}-${sim}-${domain}`;
  return {
    resultId: rid,
    modelId,
    simulator: sim,
    simulatorVersion: sim === "ngspice" ? "ngspice-45+" : sim === "hspice" ? "hspice-2024.03" : "spectre-24.1",
    domain,
    status,
    resources: { wallTimeMs: 1500, peakRssMB: 120, source: isSynth ? "derived-static-demo" : "existing-tool-output" },
    keyMetrics: metrics as Record<string, number | string | null>,
    datasetArtifactIds: [`ds-${rid}`],
    plotArtifactIds: [`plot-${rid}`],
    provenance: {
      origin: isSynth ? "derived-static-demo" : "existing-tool-output",
      sourceRepo: "spice_model_benchmark",
      note: isSynth ? "Synthetic — derived from ngspice simulation" : "Real ngspice simulation",
    },
  };
}

function dataArtifact(modelId: string, sim: string, domain: string, isSynth: boolean): ArtifactRef {
  const rid = `br-${modelId}-${sim}-${domain}`;
  return {
    artifactId: `ds-${rid}`,
    name: `${modelId}_${sim}_${domain}.json`,
    toolId: "benchmark",
    modelId,
    domain: domain as AnalysisDomain,
    kind: "dataset",
    format: "json",
    sizeBytes: null,
    hash: null,
    displayUrl: dataPath(modelId, sim, domain),
    fetchUrl: dataPath(modelId, sim, domain),
    visibility: "public",
    provenance: { origin: isSynth ? "derived-static-demo" : "existing-tool-output" },
    comparisonKey: CATALOG_MAP[domain] ?? `${domain}_${sim}`,
  };
}

function plotArtifact(modelId: string, sim: string, domain: string, isSynth: boolean, title: string): ArtifactRef {
  const rid = `br-${modelId}-${sim}-${domain}`;
  return {
    artifactId: `plot-${rid}`,
    name: `${modelId}_${sim}_${domain}.png`,
    toolId: "benchmark",
    modelId,
    domain: domain as AnalysisDomain,
    kind: "plot",
    format: "png",
    sizeBytes: null,
    hash: null,
    displayUrl: plotPath(modelId, sim, domain),
    fetchUrl: plotPath(modelId, sim, domain),
    visibility: "public",
    provenance: { origin: isSynth ? "derived-static-demo" : "existing-tool-output" },
    comparisonKey: CATALOG_MAP[domain] ?? `${domain}_${sim}`,
    title,
  };
}

/* ═════════════════════════════════════════════════════════════════ */
/*  Models                                                            */
/* ═════════════════════════════════════════════════════════════════ */

const models = {
  [M_IDS.nmosInput]: {
    modelId: M_IDS.nmosInput, parentModelId: null,
    filename: "sky130_nmos_vtg.lib", displayName: "[SkyWater130][ngspice] NMOS-BSIM4.8",
    variant: "input" as const, dialect: "ngspice" as const,
    modelNames: ["NMOS_VTG"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 8500, parameterCount: 232,
    checksum: M_IDS.nmosInput, generatedBy: "user" as const,
    operationChain: "Input", pdkSource: "SkyWater130",
    persistent: true, temporary: false,
    provenance: { origin: "existing-tool-output" as const, sourceRepo: "spice_ast", note: "Sky130 NMOS BSIM4.8" },
  },
  [M_IDS.nmosDirectFF]: {
    modelId: M_IDS.nmosDirectFF, parentModelId: M_IDS.nmosInput,
    filename: "nmos_ff.sp", displayName: "[SkyWater130][ngspice] NMOS-BSIM4.8",
    variant: "corner-fast" as const, dialect: "ngspice" as const,
    modelNames: ["NMOS_VTG"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 8500, parameterCount: 232,
    checksum: M_IDS.nmosDirectFF, generatedBy: "expansion" as const,
    operationChain: "Input → Expansion → FF Corner", pdkSource: "SkyWater130",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_expansion", note: "FF corner at nσ=3.0" },
  },
  [M_IDS.nmosReducedFF]: {
    modelId: M_IDS.nmosReducedFF, parentModelId: M_IDS.nmosInput,
    filename: "nmos_reduced_ff.sp", displayName: "[SkyWater130][ngspice] NMOS-BSIM4.8",
    variant: "corner-fast" as const, dialect: "ngspice" as const,
    modelNames: ["NMOS_VTG"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 2800, parameterCount: 46,
    checksum: M_IDS.nmosReducedFF, generatedBy: "expansion" as const,
    operationChain: "Input → Reduction → Expansion → FF Corner", pdkSource: "SkyWater130",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_reduction", note: "Reduced to 46 params (80.2%), then FF corner" },
  },
  [M_IDS.pmosInput]: {
    modelId: M_IDS.pmosInput, parentModelId: null,
    filename: "sky130_pmos_vtg.lib", displayName: "[SkyWater130][ngspice] PMOS-BSIM4.8",
    variant: "input" as const, dialect: "ngspice" as const,
    modelNames: ["PMOS_VTG"], deviceClass: "mos" as const, deviceType: "pmos" as const,
    modelFamily: "BSIM4.8", byteSize: 8500, parameterCount: 232,
    checksum: M_IDS.pmosInput, generatedBy: "user" as const,
    operationChain: "Input", pdkSource: "SkyWater130",
    persistent: true, temporary: false,
    provenance: { origin: "existing-tool-output" as const, sourceRepo: "spice_ast", note: "Sky130 PMOS BSIM4.8" },
  },
  [M_IDS.pmosDirectFF]: {
    modelId: M_IDS.pmosDirectFF, parentModelId: M_IDS.pmosInput,
    filename: "pmos_ff.sp", displayName: "[SkyWater130][ngspice] PMOS-BSIM4.8",
    variant: "corner-fast" as const, dialect: "ngspice" as const,
    modelNames: ["PMOS_VTG"], deviceClass: "mos" as const, deviceType: "pmos" as const,
    modelFamily: "BSIM4.8", byteSize: 8500, parameterCount: 232,
    checksum: M_IDS.pmosDirectFF, generatedBy: "expansion" as const,
    operationChain: "Input → Expansion → FF Corner", pdkSource: "SkyWater130",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_expansion", note: "FF corner at nσ=3.0" },
  },
  [M_IDS.pmosReducedFF]: {
    modelId: M_IDS.pmosReducedFF, parentModelId: M_IDS.pmosInput,
    filename: "pmos_reduced_ff.sp", displayName: "[SkyWater130][ngspice] PMOS-BSIM4.8",
    variant: "corner-fast" as const, dialect: "ngspice" as const,
    modelNames: ["PMOS_VTG"], deviceClass: "mos" as const, deviceType: "pmos" as const,
    modelFamily: "BSIM4.8", byteSize: 2800, parameterCount: 46,
    checksum: M_IDS.pmosReducedFF, generatedBy: "expansion" as const,
    operationChain: "Input → Reduction → Expansion → FF Corner", pdkSource: "SkyWater130",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_reduction", note: "Reduced to 46 params (80.2%), then FF corner" },
  },
  /* ── FreePDK45 models ── */
  [M_IDS.fpdkInput]: {
    modelId: M_IDS.fpdkInput, parentModelId: null,
    filename: "nmos_bsim4.lib", displayName: "[FreePDK45][ngspice] NMOS-BSIM4.8",
    variant: "input" as const, dialect: "ngspice" as const,
    modelNames: ["nmos_bsim4"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 6200, parameterCount: 148,
    checksum: M_IDS.fpdkInput, generatedBy: "user" as const,
    operationChain: "Input", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "existing-tool-output" as const, sourceRepo: "spice_model_benchmark", note: "FreePDK45 NMOS BSIM4.8" },
  },
  [M_IDS.fpdkTranslated]: {
    modelId: M_IDS.fpdkTranslated, parentModelId: M_IDS.fpdkInput,
    filename: "nmos_translated.sp", displayName: "[FreePDK45][ngspice] NMOS-BSIM4.8",
    variant: "translated" as const, dialect: "ngspice" as const,
    modelNames: ["nmos_bsim4"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 6200, parameterCount: 148,
    checksum: M_IDS.fpdkTranslated, generatedBy: "translator" as const,
    operationChain: "Input → Convert", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "new-spice-translator" },
  },
  [M_IDS.fpdkCalibrated]: {
    modelId: M_IDS.fpdkCalibrated, parentModelId: M_IDS.fpdkTranslated,
    filename: "nmos_calibrated.sp", displayName: "[FreePDK45][ngspice] NMOS-BSIM4.8",
    variant: "calibrated" as const, dialect: "ngspice" as const,
    modelNames: ["nmos_bsim4"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 6200, parameterCount: 148,
    checksum: M_IDS.fpdkCalibrated, generatedBy: "fitting" as const,
    operationChain: "Input → Convert → Calibrate", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_fitting" },
  },
  [M_IDS.fpdkReduced]: {
    modelId: M_IDS.fpdkReduced, parentModelId: M_IDS.fpdkCalibrated,
    filename: "nmos_reduced.sp", displayName: "[FreePDK45][ngspice] NMOS-BSIM4.8",
    variant: "reduced" as const, dialect: "ngspice" as const,
    modelNames: ["nmos_bsim4"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 2100, parameterCount: 52,
    checksum: M_IDS.fpdkReduced, generatedBy: "reduction" as const,
    operationChain: "Input → Convert → Calibrate → Reduce", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_reduction", note: "Reduced to 52 params (64.9%)" },
  },
  [M_IDS.fpdkTTCorner]: {
    modelId: M_IDS.fpdkTTCorner, parentModelId: M_IDS.fpdkCalibrated,
    filename: "nmos_tt.sp", displayName: "[FreePDK45][ngspice] NMOS-BSIM4.8",
    variant: "corner-typical" as const, dialect: "ngspice" as const,
    modelNames: ["nmos_bsim4"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 6200, parameterCount: 148,
    checksum: M_IDS.fpdkTTCorner, generatedBy: "expansion" as const,
    operationChain: "Input → Convert → Calibrate → Expand → TT", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_expansion", note: "TT corner" },
  },
  [M_IDS.fpdkSSCorner]: {
    modelId: M_IDS.fpdkSSCorner, parentModelId: M_IDS.fpdkCalibrated,
    filename: "nmos_ss.sp", displayName: "[FreePDK45][ngspice] NMOS-BSIM4.8",
    variant: "corner-slow" as const, dialect: "ngspice" as const,
    modelNames: ["nmos_bsim4"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 6200, parameterCount: 148,
    checksum: M_IDS.fpdkSSCorner, generatedBy: "expansion" as const,
    operationChain: "Input → Convert → Calibrate → Expand → SS", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_expansion", note: "SS corner" },
  },
  [M_IDS.fpdkFFCorner]: {
    modelId: M_IDS.fpdkFFCorner, parentModelId: M_IDS.fpdkCalibrated,
    filename: "nmos_ff.sp", displayName: "[FreePDK45][ngspice] NMOS-BSIM4.8",
    variant: "corner-fast" as const, dialect: "ngspice" as const,
    modelNames: ["nmos_bsim4"], deviceClass: "mos" as const, deviceType: "nmos" as const,
    modelFamily: "BSIM4.8", byteSize: 6200, parameterCount: 148,
    checksum: M_IDS.fpdkFFCorner, generatedBy: "expansion" as const,
    operationChain: "Input → Convert → Calibrate → Expand → FF", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "derived-static-demo" as const, sourceRepo: "spice_model_expansion", note: "FF corner" },
  },
  [M_IDS.fpdkPmosInput]: {
    modelId: M_IDS.fpdkPmosInput, parentModelId: null,
    filename: "pmos_bsim4.lib", displayName: "[FreePDK45][ngspice] PMOS-BSIM4.8",
    variant: "input" as const, dialect: "ngspice" as const,
    modelNames: ["pmos_bsim4"], deviceClass: "mos" as const, deviceType: "pmos" as const,
    modelFamily: "BSIM4.8", byteSize: 6200, parameterCount: 148,
    checksum: M_IDS.fpdkPmosInput, generatedBy: "user" as const,
    operationChain: "Input", pdkSource: "FreePDK45",
    persistent: true, temporary: false,
    provenance: { origin: "existing-tool-output" as const, sourceRepo: "spice_model_benchmark", note: "FreePDK45 PMOS BSIM4.8" },
  },
};

/* ═════════════════════════════════════════════════════════════════ */
/*  Benchmark Results + Artifacts                                     */
/* ═════════════════════════════════════════════════════════════════ */

interface ModelDef { id: string; display: string; isReduced?: boolean; }
const MODEL_LIST: ModelDef[] = [
  { id: M_IDS.nmosInput, display: "[SkyWater130] NMOS-BSIM4.8" },
  { id: M_IDS.nmosDirectFF, display: "[SkyWater130] NMOS-BSIM4.8" },
  { id: M_IDS.nmosReducedFF, display: "[SkyWater130] NMOS-BSIM4.8", isReduced: true },
  { id: M_IDS.pmosInput, display: "[SkyWater130] PMOS-BSIM4.8" },
  { id: M_IDS.pmosDirectFF, display: "[SkyWater130] PMOS-BSIM4.8" },
  { id: M_IDS.pmosReducedFF, display: "[SkyWater130] PMOS-BSIM4.8", isReduced: true },
  { id: M_IDS.fpdkInput, display: "[FreePDK45] NMOS-BSIM4.8" },
  { id: M_IDS.fpdkTranslated, display: "[FreePDK45] NMOS-BSIM4.8" },
  { id: M_IDS.fpdkCalibrated, display: "[FreePDK45] NMOS-BSIM4.8" },
  { id: M_IDS.fpdkReduced, display: "[FreePDK45] NMOS-BSIM4.8", isReduced: true },
  { id: M_IDS.fpdkTTCorner, display: "[FreePDK45] NMOS-BSIM4.8" },
  { id: M_IDS.fpdkSSCorner, display: "[FreePDK45] NMOS-BSIM4.8" },
  { id: M_IDS.fpdkFFCorner, display: "[FreePDK45] NMOS-BSIM4.8" },
  { id: M_IDS.fpdkPmosInput, display: "[FreePDK45] PMOS-BSIM4.8" },
];

const SIMS: SimulatorId[] = ["ngspice", "hspice", "spectre"];
const DOMAINS: AnalysisDomain[] = ["dc", "transient", "ac", "noise"];

function simVariation(val: number, sim: string): number {
  if (sim === "ngspice") return val;
  const rng: Record<string, number> = { hspice: 0.97, spectre: 1.04 };
  return val * (rng[sim] ?? 1.0);
}

// Per-domain metrics — comprehensive set from benchmark tool output
type MidMetrics = Record<string, Record<string, number>>;

const DC_METRICS: MidMetrics = {
  [M_IDS.nmosInput]: { ion: 2.16e-4, ioff: 1.47e-12, vth: 0.42, gm: 5.7e-4, gds: 2.1e-6, subthreshold_slope: 78, dibl: 32, kcl_error_pct: 0.0 },
  [M_IDS.nmosDirectFF]: { ion: 2.38e-4, ioff: 2.13e-12, vth: 0.38, gm: 6.1e-4, gds: 2.5e-6, subthreshold_slope: 74, dibl: 28, kcl_error_pct: 0.0 },
  [M_IDS.nmosReducedFF]: { ion: 2.07e-4, ioff: 1.92e-12, vth: 0.41, gm: 5.3e-4, gds: 2.3e-6, subthreshold_slope: 80, dibl: 35, kcl_error_pct: 0.1 },
  [M_IDS.pmosInput]: { ion: 6.00e-6, ioff: 2.17e-19, vth: -0.45, gm: 1.8e-5, gds: 6.2e-8, subthreshold_slope: 82, dibl: 38, kcl_error_pct: 0.0 },
  [M_IDS.pmosDirectFF]: { ion: 6.50e-6, ioff: 3.12e-19, vth: -0.41, gm: 1.9e-5, gds: 7.0e-8, subthreshold_slope: 78, dibl: 34, kcl_error_pct: 0.0 },
  [M_IDS.pmosReducedFF]: { ion: 5.72e-6, ioff: 2.85e-19, vth: -0.44, gm: 1.7e-5, gds: 6.8e-8, subthreshold_slope: 84, dibl: 40, kcl_error_pct: 0.1 },
  [M_IDS.fpdkInput]: { ion: 1.85e-4, ioff: 1.23e-12, vth: 0.45, gm: 5.2e-4, gds: 1.9e-6, subthreshold_slope: 80, dibl: 35, kcl_error_pct: 0.0 },
  [M_IDS.fpdkTranslated]: { ion: 1.84e-4, ioff: 1.24e-12, vth: 0.45, gm: 5.2e-4, gds: 1.9e-6, subthreshold_slope: 80, dibl: 35, kcl_error_pct: 0.0 },
  [M_IDS.fpdkCalibrated]: { ion: 1.92e-4, ioff: 1.10e-12, vth: 0.43, gm: 5.4e-4, gds: 1.8e-6, subthreshold_slope: 76, dibl: 30, kcl_error_pct: 0.0 },
  [M_IDS.fpdkReduced]: { ion: 1.78e-4, ioff: 1.45e-12, vth: 0.46, gm: 4.9e-4, gds: 2.1e-6, subthreshold_slope: 84, dibl: 39, kcl_error_pct: 0.2 },
  [M_IDS.fpdkTTCorner]: { ion: 1.85e-4, ioff: 1.23e-12, vth: 0.45, gm: 5.2e-4, gds: 1.9e-6, subthreshold_slope: 80, dibl: 35, kcl_error_pct: 0.0 },
  [M_IDS.fpdkSSCorner]: { ion: 1.62e-4, ioff: 0.98e-12, vth: 0.49, gm: 4.5e-4, gds: 1.6e-6, subthreshold_slope: 86, dibl: 42, kcl_error_pct: 0.0 },
  [M_IDS.fpdkFFCorner]: { ion: 2.08e-4, ioff: 1.56e-12, vth: 0.41, gm: 5.9e-4, gds: 2.2e-6, subthreshold_slope: 72, dibl: 26, kcl_error_pct: 0.0 },
  [M_IDS.fpdkPmosInput]: { ion: 5.50e-6, ioff: 1.95e-19, vth: -0.47, gm: 1.6e-5, gds: 5.8e-8, subthreshold_slope: 84, dibl: 40, kcl_error_pct: 0.0 },
};

const TRANS_METRICS: MidMetrics = {
  [M_IDS.nmosInput]: { propagation_delay_ps: 10.6, rise_time_ps: 5.2, fall_time_ps: 4.8, max_power_mW: 5.66, avg_power_mW: 1.49, energy_per_switch_fJ: 15.8 },
  [M_IDS.nmosDirectFF]: { propagation_delay_ps: 9.2, rise_time_ps: 4.5, fall_time_ps: 4.1, max_power_mW: 6.12, avg_power_mW: 1.62, energy_per_switch_fJ: 14.9 },
  [M_IDS.nmosReducedFF]: { propagation_delay_ps: 11.8, rise_time_ps: 5.8, fall_time_ps: 5.3, max_power_mW: 5.24, avg_power_mW: 1.38, energy_per_switch_fJ: 17.2 },
  [M_IDS.pmosInput]: { propagation_delay_ps: 15.2, rise_time_ps: 7.8, fall_time_ps: 7.2, max_power_mW: 3.42, avg_power_mW: 0.89, energy_per_switch_fJ: 13.5 },
  [M_IDS.pmosDirectFF]: { propagation_delay_ps: 13.8, rise_time_ps: 7.0, fall_time_ps: 6.5, max_power_mW: 3.78, avg_power_mW: 0.98, energy_per_switch_fJ: 12.8 },
  [M_IDS.pmosReducedFF]: { propagation_delay_ps: 16.5, rise_time_ps: 8.4, fall_time_ps: 7.8, max_power_mW: 3.15, avg_power_mW: 0.82, energy_per_switch_fJ: 14.6 },
  [M_IDS.fpdkInput]: { propagation_delay_ps: 12.4, rise_time_ps: 6.1, fall_time_ps: 5.6, max_power_mW: 4.82, avg_power_mW: 1.25, energy_per_switch_fJ: 15.5 },
  [M_IDS.fpdkTranslated]: { propagation_delay_ps: 12.5, rise_time_ps: 6.2, fall_time_ps: 5.7, max_power_mW: 4.80, avg_power_mW: 1.24, energy_per_switch_fJ: 15.5 },
  [M_IDS.fpdkCalibrated]: { propagation_delay_ps: 11.2, rise_time_ps: 5.5, fall_time_ps: 5.0, max_power_mW: 5.10, avg_power_mW: 1.32, energy_per_switch_fJ: 14.2 },
  [M_IDS.fpdkReduced]: { propagation_delay_ps: 13.8, rise_time_ps: 6.8, fall_time_ps: 6.2, max_power_mW: 4.45, avg_power_mW: 1.15, energy_per_switch_fJ: 16.8 },
  [M_IDS.fpdkTTCorner]: { propagation_delay_ps: 12.4, rise_time_ps: 6.1, fall_time_ps: 5.6, max_power_mW: 4.82, avg_power_mW: 1.25, energy_per_switch_fJ: 15.5 },
  [M_IDS.fpdkSSCorner]: { propagation_delay_ps: 16.2, rise_time_ps: 8.2, fall_time_ps: 7.5, max_power_mW: 4.10, avg_power_mW: 1.05, energy_per_switch_fJ: 18.2 },
  [M_IDS.fpdkFFCorner]: { propagation_delay_ps: 9.0, rise_time_ps: 4.4, fall_time_ps: 4.0, max_power_mW: 5.48, avg_power_mW: 1.44, energy_per_switch_fJ: 12.8 },
  [M_IDS.fpdkPmosInput]: { propagation_delay_ps: 17.0, rise_time_ps: 8.6, fall_time_ps: 7.9, max_power_mW: 3.05, avg_power_mW: 0.78, energy_per_switch_fJ: 13.3 },
};

const AC_METRICS: MidMetrics = {
  [M_IDS.nmosInput]: { cgg_min_fF: 7.08, cgg_max_fF: 13.98, ft_GHz: 42.5, s21_gain_dB: -24.0, nqs_phase_deg: 179.997 },
  [M_IDS.nmosDirectFF]: { cgg_min_fF: 6.80, cgg_max_fF: 13.50, ft_GHz: 48.2, s21_gain_dB: -22.5, nqs_phase_deg: 179.995 },
  [M_IDS.nmosReducedFF]: { cgg_min_fF: 7.35, cgg_max_fF: 14.40, ft_GHz: 38.9, s21_gain_dB: -25.2, nqs_phase_deg: 179.998 },
  [M_IDS.pmosInput]: { cgg_min_fF: 6.50, cgg_max_fF: 12.80, ft_GHz: 28.5, s21_gain_dB: -28.0, nqs_phase_deg: 179.996 },
  [M_IDS.pmosDirectFF]: { cgg_min_fF: 6.25, cgg_max_fF: 12.30, ft_GHz: 32.0, s21_gain_dB: -26.5, nqs_phase_deg: 179.994 },
  [M_IDS.pmosReducedFF]: { cgg_min_fF: 6.78, cgg_max_fF: 13.20, ft_GHz: 25.8, s21_gain_dB: -29.2, nqs_phase_deg: 179.997 },
  [M_IDS.fpdkInput]: { cgg_min_fF: 6.90, cgg_max_fF: 13.50, ft_GHz: 38.0, s21_gain_dB: -25.5, nqs_phase_deg: 179.997 },
  [M_IDS.fpdkTranslated]: { cgg_min_fF: 6.92, cgg_max_fF: 13.52, ft_GHz: 37.8, s21_gain_dB: -25.6, nqs_phase_deg: 179.997 },
  [M_IDS.fpdkCalibrated]: { cgg_min_fF: 6.75, cgg_max_fF: 13.20, ft_GHz: 40.5, s21_gain_dB: -24.2, nqs_phase_deg: 179.996 },
  [M_IDS.fpdkReduced]: { cgg_min_fF: 7.10, cgg_max_fF: 13.90, ft_GHz: 34.2, s21_gain_dB: -27.0, nqs_phase_deg: 179.998 },
  [M_IDS.fpdkTTCorner]: { cgg_min_fF: 6.90, cgg_max_fF: 13.50, ft_GHz: 38.0, s21_gain_dB: -25.5, nqs_phase_deg: 179.997 },
  [M_IDS.fpdkSSCorner]: { cgg_min_fF: 7.30, cgg_max_fF: 14.20, ft_GHz: 32.5, s21_gain_dB: -28.5, nqs_phase_deg: 179.998 },
  [M_IDS.fpdkFFCorner]: { cgg_min_fF: 6.55, cgg_max_fF: 12.90, ft_GHz: 44.0, s21_gain_dB: -22.8, nqs_phase_deg: 179.995 },
  [M_IDS.fpdkPmosInput]: { cgg_min_fF: 6.35, cgg_max_fF: 12.50, ft_GHz: 25.5, s21_gain_dB: -29.5, nqs_phase_deg: 179.996 },
};

const NOISE_METRICS: MidMetrics = {
  [M_IDS.nmosInput]: { thermal_noise_floor_pV2Hz: 2.65e7, flicker_corner_Hz: 1.12, flicker_exponent: 0.5075, shot_noise_level_pV2Hz: 3.79e-9, noise_temp_coeff: 2.77e-11 },
  [M_IDS.nmosDirectFF]: { thermal_noise_floor_pV2Hz: 2.82e7, flicker_corner_Hz: 1.05, flicker_exponent: 0.4980, shot_noise_level_pV2Hz: 4.12e-9, noise_temp_coeff: 2.95e-11 },
  [M_IDS.nmosReducedFF]: { thermal_noise_floor_pV2Hz: 2.48e7, flicker_corner_Hz: 1.25, flicker_exponent: 0.5150, shot_noise_level_pV2Hz: 3.52e-9, noise_temp_coeff: 2.60e-11 },
  [M_IDS.pmosInput]: { thermal_noise_floor_pV2Hz: 1.85e7, flicker_corner_Hz: 2.45, flicker_exponent: 0.6230, shot_noise_level_pV2Hz: 2.15e-9, noise_temp_coeff: 1.95e-11 },
  [M_IDS.pmosDirectFF]: { thermal_noise_floor_pV2Hz: 1.98e7, flicker_corner_Hz: 2.30, flicker_exponent: 0.6100, shot_noise_level_pV2Hz: 2.38e-9, noise_temp_coeff: 2.10e-11 },
  [M_IDS.pmosReducedFF]: { thermal_noise_floor_pV2Hz: 1.72e7, flicker_corner_Hz: 2.62, flicker_exponent: 0.6380, shot_noise_level_pV2Hz: 1.98e-9, noise_temp_coeff: 1.82e-11 },
  [M_IDS.fpdkInput]: { thermal_noise_floor_pV2Hz: 2.45e7, flicker_corner_Hz: 1.35, flicker_exponent: 0.5120, shot_noise_level_pV2Hz: 3.45e-9, noise_temp_coeff: 2.55e-11 },
  [M_IDS.fpdkTranslated]: { thermal_noise_floor_pV2Hz: 2.46e7, flicker_corner_Hz: 1.36, flicker_exponent: 0.5125, shot_noise_level_pV2Hz: 3.46e-9, noise_temp_coeff: 2.56e-11 },
  [M_IDS.fpdkCalibrated]: { thermal_noise_floor_pV2Hz: 2.30e7, flicker_corner_Hz: 1.20, flicker_exponent: 0.4950, shot_noise_level_pV2Hz: 3.20e-9, noise_temp_coeff: 2.38e-11 },
  [M_IDS.fpdkReduced]: { thermal_noise_floor_pV2Hz: 2.62e7, flicker_corner_Hz: 1.48, flicker_exponent: 0.5280, shot_noise_level_pV2Hz: 3.72e-9, noise_temp_coeff: 2.75e-11 },
  [M_IDS.fpdkTTCorner]: { thermal_noise_floor_pV2Hz: 2.45e7, flicker_corner_Hz: 1.35, flicker_exponent: 0.5120, shot_noise_level_pV2Hz: 3.45e-9, noise_temp_coeff: 2.55e-11 },
  [M_IDS.fpdkSSCorner]: { thermal_noise_floor_pV2Hz: 2.70e7, flicker_corner_Hz: 1.55, flicker_exponent: 0.5300, shot_noise_level_pV2Hz: 3.85e-9, noise_temp_coeff: 2.85e-11 },
  [M_IDS.fpdkFFCorner]: { thermal_noise_floor_pV2Hz: 2.20e7, flicker_corner_Hz: 1.10, flicker_exponent: 0.4850, shot_noise_level_pV2Hz: 3.05e-9, noise_temp_coeff: 2.28e-11 },
  [M_IDS.fpdkPmosInput]: { thermal_noise_floor_pV2Hz: 1.75e7, flicker_corner_Hz: 2.60, flicker_exponent: 0.6300, shot_noise_level_pV2Hz: 2.05e-9, noise_temp_coeff: 1.88e-11 },
};

const benchmarkResults: DomainBenchmarkResult[] = [];
const artifacts: Record<string, ArtifactRef> = {};

for (const m of MODEL_LIST) {
  for (const sim of SIMS) {
    const isSynth = sim !== "ngspice";
    for (const domain of DOMAINS) {
      const domainMetrics = domain === "dc" ? DC_METRICS[m.id]
        : domain === "transient" ? TRANS_METRICS[m.id]
        : domain === "ac" ? AC_METRICS[m.id]
        : NOISE_METRICS[m.id];
      const metrics: Record<string, number> = {};
      if (domainMetrics) {
        for (const [k, v] of Object.entries(domainMetrics)) {
          metrics[k] = simVariation(v, sim);
        }
      }
      metrics.data_points = domain === "dc" ? 259 : domain === "transient" ? 1032 : domain === "ac" ? 71 : 90;

      const r = result(m.id, sim, domain, "pass", metrics, isSynth);
      benchmarkResults.push(r);

      const da = dataArtifact(m.id, sim, domain, isSynth);
      artifacts[da.artifactId] = da;

      const pa = plotArtifact(m.id, sim, domain, isSynth, `${m.display} — ${domain.toUpperCase()} (${sim})`);
      artifacts[pa.artifactId] = pa;
    }
  }
}

/* ═════════════════════════════════════════════════════════════════ */
/*  Scenario                                                          */
/* ═════════════════════════════════════════════════════════════════ */

export const EXPERIMENT1_SCENARIO: WorkflowScenario = {
  schemaVersion: "2.0.0",
  scenarioId: "experiment1-sky130",
  title: "Sky130: Direct FF vs Reduction→FF",
  description:
    "Skywater130 PDK BSIM4.8 NMOS + PMOS comparison. " +
    "Pipeline 1: Reduction (232→46 params, 80.2%) → Fast Corner → Benchmark. " +
    "Pipeline 2: Direct Fast Corner → Benchmark. " +
    "ngspice: real simulations. hspice/spectre: synthetic derived from ngspice.",
  status: "completed",
  defaultInputModelId: M_IDS.nmosInput,
  defaultCandidateModelId: M_IDS.nmosDirectFF,
  defaultSimulators: SIMS,
  defaultDomains: DOMAINS,

  models,
  benchmarkResults,
  artifacts,

  reports: buildReportLookup(EXPERIMENT1_REPORTS),
  manifests: buildManifestLookup(EXPERIMENT1_REPORTS),

  operations: [],
  invocations: {},
  executions: {},
  provenance: {
    origin: "derived-static-demo",
    sourceRepo: "spice_model_benchmark",
    note: "Sky130 NMOS/PMOS reduction vs direct comparison — real ngspice data + synthetic hspice/spectre",
  },
};
