/* ==================================================================
 *  integratedDemo.ts (goal.md §17.1)
 *
 *  Deterministic static demonstration of a complete SPICE workflow:
 *  Convert → Calibrate → Reduce → Expand → Benchmark.
 *
 *  ALL values are fixed — no Math.random(), no Date.now().
 *  ALL synthetic fields are explicitly labeled.
 * ================================================================== */

import type {
  WorkflowScenario,
  ModelArtifact,
  DomainBenchmarkResult,
  ArtifactRef,
  ToolInvocation,
  ToolExecutionResult,
  WorkflowOperation,
  Provenance,
} from "../../compat/spiceWorkflow/contracts";

/* ─── Provenances ─── */
const realProvenance: Provenance = {
  origin: "existing-tool-output",
  sourceRepo: "spice_model_benchmark",
};

const synthProvenance: Provenance = {
  origin: "synthetic-demo",
  fixtureId: "integrated-demo-v1",
  note: "Synthetic demo fixture — not real tool output.",
};

const derivedProvenance: Provenance = {
  origin: "derived-static-demo",
  fixtureId: "integrated-demo-v1",
};

/* ═════════════════════════════════════════════════════════════════ */
/*  Models                                                           */
/* ═════════════════════════════════════════════════════════════════ */

const models: Record<string, ModelArtifact> = {
  "model-input": {
    modelId: "model-input",
    parentModelId: null,
    filename: "bsim4_nmos_tt.lib",
    displayName: "Input Model (BSIM4 NMOS TT)",
    variant: "input",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    content: `* BSIM4.5 NMOS TT Input Model
.model nmos_bsim4 nmos
+ level=54  version=4.5
+ vth0=0.42  k1=0.35  k2=-0.02  nfactor=1.2
+ u0=280  vsat=1.0e5
+ toxe=2.4e-9  nch=3.2e17
`,
    byteSize: 4096,
    parameterCount: 62,
    checksum: "a1b2c3d4-input",
    generatedBy: "user",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-translated": {
    modelId: "model-translated",
    parentModelId: "model-input",
    filename: "translated.lib",
    displayName: "Translated Model",
    variant: "translated",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    content: `* Translated Model (ngspice output)
.model nmos_bsim4 nmos
+ level=54  version=4.5
+ vth0=0.42  k1=0.35  k2=-0.02  nfactor=1.2
+ u0=280  vsat=1.0e5
`,
    byteSize: 3910,
    parameterCount: 62,
    checksum: "b2c3d4e5-translated",
    generatedBy: "translator",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-calibrated": {
    modelId: "model-calibrated",
    parentModelId: "model-translated",
    filename: "calibrated.lib",
    displayName: "Calibrated Model",
    variant: "calibrated",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4_cal"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    content: `* Calibrated BSIM4.5 NMOS
.model nmos_bsim4_cal nmos
+ level=54  version=4.5
+ vth0=0.398  k1=0.338  k2=-0.018  nfactor=1.145
+ u0=285  vsat=1.05e5
`,
    byteSize: 4140,
    parameterCount: 62,
    checksum: "c3d4e5f6-calibrated",
    generatedBy: "fitting",
    persistent: true,
    temporary: false,
    provenance: synthProvenance,
  },
  "model-reduced": {
    modelId: "model-reduced",
    parentModelId: "model-calibrated",
    filename: "reduced.lib",
    displayName: "Reduced Model (Final Nominal)",
    variant: "reduced",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4_red"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    content: `* Reduced BSIM4.5 NMOS (12 params)
.model nmos_bsim4_red nmos
+ level=54  version=4.5
+ vth0=0.398  k1=0.338  u0=285
+ vsat=1.05e5  nfactor=1.145
+ toxe=2.4e-9  nch=3.2e17
`,
    byteSize: 2240,
    parameterCount: 12,
    checksum: "d4e5f6a7-reduced",
    generatedBy: "reduction",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-corner-typical": {
    modelId: "model-corner-typical",
    parentModelId: "model-reduced",
    filename: "model_t.lib",
    displayName: "Corner Typical (T)",
    variant: "corner-typical",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4_t"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    content: `* T corner model
.model nmos_bsim4_t nmos
+ vth0=0.398  k1=0.338
`,
    byteSize: 1980,
    parameterCount: 12,
    checksum: "e5f6a7b8-t",
    generatedBy: "expansion",
    persistent: true,
    temporary: false,
    provenance: synthProvenance,
  },
  "model-corner-slow": {
    modelId: "model-corner-slow",
    parentModelId: "model-reduced",
    filename: "model_s.lib",
    displayName: "Corner Slow (S)",
    variant: "corner-slow",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4_s"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    content: `* S corner model
.model nmos_bsim4_s nmos
+ vth0=0.428  k1=0.368
`,
    byteSize: 1980,
    parameterCount: 12,
    checksum: "f6a7b8c9-s",
    generatedBy: "expansion",
    persistent: true,
    temporary: false,
    provenance: synthProvenance,
  },
  "model-corner-fast": {
    modelId: "model-corner-fast",
    parentModelId: "model-reduced",
    filename: "model_f.lib",
    displayName: "Corner Fast (F)",
    variant: "corner-fast",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4_f"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    content: `* F corner model
.model nmos_bsim4_f nmos
+ vth0=0.368  k1=0.308
`,
    byteSize: 1980,
    parameterCount: 12,
    checksum: "a7b8c9d0-f",
    generatedBy: "expansion",
    persistent: true,
    temporary: false,
    provenance: synthProvenance,
  },
};

/* ═════════════════════════════════════════════════════════════════ */
/*  Operations                                                       */
/* ═════════════════════════════════════════════════════════════════ */

const operations: WorkflowOperation[] = [
  {
    operationId: "op-translator",
    toolId: "translator",
    enabled: true,
    order: 1,
    params: {
      sourceDialect: "ngspice",
      targetDialect: "ngspice",
      followIncludes: true,
      verify: true,
      plot: true,
      maxPlots: 10,
    },
  },
  {
    operationId: "op-fitting",
    toolId: "fitting",
    enabled: true,
    order: 2,
    params: {
      modelName: "nmos_bsim4",
      deviceType: "nmos",
      optimizer: "nelder_mead",
      maxIterations: 50,
      targetRelativeLoss: 0.3,
      plot: true,
    },
  },
  {
    operationId: "op-reduction",
    toolId: "reduction",
    enabled: true,
    order: 3,
    params: {
      errorTolerance: 0.05,
      minParameters: 10,
      maxIterations: 100,
      optimizationMethod: "genetic_algorithm",
      reductionMethod: "sensitivity",
      testType: "dc_iv",
      deviceType: "nmos",
      usePrebuiltNetlist: true,
    },
  },
  {
    operationId: "op-expansion",
    toolId: "expansion",
    enabled: true,
    order: 4,
    params: {
      modelName: "nmos_bsim4_red",
      nSigma: 3,
      generateTSF: true,
      runIv: true,
      runCv: true,
      monteCarlo: false,
      mcSamples: 100,
      distribution: "normal",
      seed: 42,
      plot: true,
    },
  },
];

/* ═════════════════════════════════════════════════════════════════ */
/*  Invocations                                                      */
/* ═════════════════════════════════════════════════════════════════ */

const invocations: Record<string, ToolInvocation> = {
  "inv-translator": {
    invocationId: "inv-translator",
    toolId: "translator",
    adapterVersion: "1.0.0",
    inputModelIds: ["model-input"],
    outputModelIds: ["model-translated"],
    params: { sourceDialect: "ngspice", targetDialect: "ngspice" },
    argv: ["./cli.py", "translate", "<workspace>/input/bsim4_nmos_tt.lib", "--source", "ngspice", "--target", "ngspice", "--output", "<workspace>/output/translated.lib"],
    workingDirectoryKey: "workspace",
    outputDirectoryKey: "translator-output",
    environment: {},
    temporary: false,
  },
  "inv-fitting": {
    invocationId: "inv-fitting",
    toolId: "fitting",
    adapterVersion: "1.0.0",
    inputModelIds: ["model-translated"],
    outputModelIds: ["model-calibrated"],
    params: { optimizer: "nelder_mead" },
    argv: ["python", "calibrate_bsim.py", "--model-path", "<workspace>/input/translated.lib", "--model-name", "nmos_bsim4", "--device-type", "nmos", "--sim-type", "dc", "--optimizer", "nelder_mead", "--max-iters", "50", "--target-rel-loss", "0.3", "--output-model", "<workspace>/output/calibrated.lib", "--plot"],
    workingDirectoryKey: "workspace",
    outputDirectoryKey: "fitting-output",
    environment: {},
    temporary: false,
  },
  "inv-reduction": {
    invocationId: "inv-reduction",
    toolId: "reduction",
    adapterVersion: "1.0.0",
    inputModelIds: ["model-calibrated"],
    outputModelIds: ["model-reduced"],
    params: { errorTolerance: 0.05 },
    argv: ["python", "-m", "bmr.cli", "complete", "<workspace>/input/calibrated.lib", "<workspace>/reduction-output", "0.05", "10", "100", "genetic_algorithm", "sensitivity", "dc_iv", "nmos", "true"],
    workingDirectoryKey: "workspace",
    outputDirectoryKey: "reduction-output",
    environment: {},
    temporary: false,
  },
  "inv-expansion": {
    invocationId: "inv-expansion",
    toolId: "expansion",
    adapterVersion: "1.0.0",
    inputModelIds: ["model-reduced"],
    outputModelIds: ["model-corner-typical", "model-corner-slow", "model-corner-fast"],
    params: { nSigma: 3, modelName: "nmos_bsim4_red" },
    argv: ["./run_expansion.sh", "<workspace>/input/reduced.lib", "--out-dir", "<workspace>/expansion-output", "--model-name", "nmos_bsim4_red", "--n-sigma", "3", "--plot"],
    workingDirectoryKey: "workspace",
    outputDirectoryKey: "expansion-output",
    environment: {},
    temporary: false,
  },
};

/* ═════════════════════════════════════════════════════════════════ */
/*  Executions                                                       */
/* ═════════════════════════════════════════════════════════════════ */

const executions: Record<string, ToolExecutionResult> = {
  "exec-translator": {
    executionId: "exec-translator",
    toolId: "translator",
    status: "completed",
    inputModelIds: ["model-input"],
    outputModelIds: ["model-translated"],
    metrics: {
      modelsTranslated: 1,
      translationStatus: "success",
      warningsCount: 0,
    },
    artifactIds: ["art-translator-report", "art-translator-plot"],
    warnings: [],
    errors: [],
    invocationId: "inv-translator",
    provenance: derivedProvenance,
  },
  "exec-fitting": {
    executionId: "exec-fitting",
    toolId: "fitting",
    status: "completed",
    inputModelIds: ["model-translated"],
    outputModelIds: ["model-calibrated"],
    metrics: {
      initialLoss: 0.452,
      finalLoss: 0.083,
      improvement: 0.816,
      iterations: 42,
      ngspiceCallCount: 168,
      fittedParameterCount: 4,
    },
    artifactIds: ["art-fitting-iv-overlay", "art-fitting-loss", "art-fitting-params", "art-fitting-report"],
    warnings: ["AC/CV fitting is not enabled in current tool support."],
    errors: [],
    invocationId: "inv-fitting",
    provenance: synthProvenance,
  },
  "exec-reduction": {
    executionId: "exec-reduction",
    toolId: "reduction",
    status: "completed",
    inputModelIds: ["model-calibrated"],
    outputModelIds: ["model-reduced"],
    metrics: {
      originalParameterCount: 62,
      reducedParameterCount: 12,
      reductionRatio: 0.806,
      validationError: 0.018,
      tolerance: 0.05,
      withinTolerance: true,
      runtime: 45.2,
      iterations: 28,
    },
    artifactIds: ["art-reduction-dc-plot", "art-reduction-error-evol", "art-reduction-params-table", "art-reduction-report"],
    warnings: [],
    errors: [],
    invocationId: "inv-reduction",
    provenance: derivedProvenance,
  },
  "exec-expansion": {
    executionId: "exec-expansion",
    toolId: "expansion",
    status: "completed",
    inputModelIds: ["model-reduced"],
    outputModelIds: ["model-corner-typical", "model-corner-slow", "model-corner-fast"],
    metrics: {
      sourceTT: "nmos_bsim4_red",
      nSigma: 3,
      devices: 1,
      coverage: 1.0,
      mcSamples: 0,
    },
    artifactIds: ["art-expansion-iv", "art-expansion-cv", "art-expansion-report", "art-expansion-models"],
    warnings: ["Derived corners are not foundry-certified."],
    errors: [],
    invocationId: "inv-expansion",
    provenance: synthProvenance,
  },
};

/* ═════════════════════════════════════════════════════════════════ */
/*  Benchmark Plot Artifacts (real public/benchmark PNGs)             */
/* ═════════════════════════════════════════════════════════════════ */

// Map: modelId → simulator → domain → list of {artifactId, comparisonKey, title}
type PlotEntry = { artifactId: string; comparisonKey: string; title: string; displayUrl: string };

const PLOT_INDEX: Record<string, Record<string, Record<string, PlotEntry[]>>> = {};

function addPlot(modelId: string, sim: string, domain: string, artifactId: string, key: string, title: string, publicPath: string) {
  const m = PLOT_INDEX[modelId] ?? (PLOT_INDEX[modelId] = {});
  const s = m[sim] ?? (m[sim] = {});
  const d = s[domain] ?? (s[domain] = []);
  d.push({ artifactId, comparisonKey: key, title, displayUrl: publicPath });
}

const BENCHMARK_PLOT_ARTIFACTS: Record<string, ArtifactRef> = {};

function registerPlotArtifact(artifactId: string, name: string, modelId: string, domain: string, displayUrl: string, comparisonKey: string, title: string, _sim: string, origin: "existing-tool-output" | "synthetic-demo") {
  BENCHMARK_PLOT_ARTIFACTS[artifactId] = {
    artifactId, name, toolId: "benchmark", modelId, domain: domain as never, kind: "plot",
    format: "png", sizeBytes: null, hash: null, displayUrl, visibility: "public",
    provenance: { origin, sourceRepo: "spice_model_benchmark" },
    comparisonKey, title,
  };
}

// Ngspice plots for input model (from results/)
addPlot("model-input", "ngspice", "dc", "bp-input-ngspice-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/results/dc_iv_characteristics_44e599f9.png");
addPlot("model-input", "ngspice", "dc", "bp-input-ngspice-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/results/dc_kcl_verification_9a99adfa.png");
addPlot("model-input", "ngspice", "dc", "bp-input-ngspice-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/results/dc_temperature_analysis_8afe0802.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-cv", "cv-characteristics", "C-V Characteristics", "benchmark/results/ac_cv_characteristics_54ad29bc.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-cvc", "cv-components", "C-V Components", "benchmark/results/ac_cv_components_b0763246.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-nqs", "nqs-effects", "Non-Quasi-Static Effects", "benchmark/results/ac_cv_nqs_effects_dd0638f7.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-sp", "s-parameter", "S-Parameter Analysis", "benchmark/results/ac_cv_sparameter_analysis_ea6bfba2.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/results/trans_large_signal_transient_a8870071.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-sw", "switching-response", "Switching Response", "benchmark/results/trans_switching_response_bad3ed2b.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-delay", "delay-effect", "Delay Effect", "benchmark/results/trans_delay_effect_bbf71e09.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-power", "power-dissipation", "Power Dissipation", "benchmark/results/trans_power_dissipation_831114e8.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/results/noise_thermal_noise_84c213c5.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-flicker", "flicker-noise", "Flicker Noise", "benchmark/results/noise_flicker_noise_8992dd34.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-shot", "shot-noise", "Shot Noise", "benchmark/results/noise_shot_noise_97f69a58.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-components", "noise-components", "Noise Components", "benchmark/results/noise_components_d2a1aff6.png");

// Ngspice plots for reduced model (from results_final/)
addPlot("model-reduced", "ngspice", "dc", "bp-reduced-ngspice-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/results_final/dc_iv_characteristics_24e9b83e.png");
addPlot("model-reduced", "ngspice", "dc", "bp-reduced-ngspice-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/results_final/dc_kcl_verification_3e27897c.png");
addPlot("model-reduced", "ngspice", "dc", "bp-reduced-ngspice-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/results_final/dc_temperature_analysis_f15e5dc8.png");
addPlot("model-reduced", "ngspice", "ac", "bp-reduced-ngspice-ac-cv", "cv-characteristics", "C-V Characteristics", "benchmark/results_final/ac_cv_characteristics_2f26bb98.png");
addPlot("model-reduced", "ngspice", "transient", "bp-reduced-ngspice-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/results_final/trans_large_signal_transient_de4ca9fb.png");
addPlot("model-reduced", "ngspice", "transient", "bp-reduced-ngspice-tran-sw", "switching-response", "Switching Response", "benchmark/results_final/trans_switching_response_95782e13.png");
addPlot("model-reduced", "ngspice", "transient", "bp-reduced-ngspice-tran-delay", "delay-effect", "Delay Effect", "benchmark/results_final/trans_delay_effect_46e5bfba.png");
addPlot("model-reduced", "ngspice", "noise", "bp-reduced-ngspice-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/results_final/thermal_noise_01d4dd8b.png");

// Spectre plots for reduced model (from results_spectre_final2/) — synthetic demo
addPlot("model-reduced", "spectre", "dc", "bp-reduced-spectre-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/results_spectre_final2/dc_iv_characteristics_24e9b83e.png");
addPlot("model-reduced", "spectre", "dc", "bp-reduced-spectre-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/results_spectre_final2/dc_kcl_verification_3e27897c.png");
addPlot("model-reduced", "spectre", "transient", "bp-reduced-spectre-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/results_spectre_final2/trans_large_signal_transient_de4ca9fb.png");
addPlot("model-reduced", "spectre", "transient", "bp-reduced-spectre-tran-sw", "switching-response", "Switching Response", "benchmark/results_spectre_final2/trans_switching_response_95782e13.png");

// Register all artifacts
for (const [modelId, sims] of Object.entries(PLOT_INDEX)) {
  for (const [sim, domains] of Object.entries(sims)) {
    for (const [domain, entries] of Object.entries(domains)) {
      for (const e of entries) {
        const origin: "existing-tool-output" | "synthetic-demo" = sim === "ngspice" ? "existing-tool-output" : "synthetic-demo";
        registerPlotArtifact(e.artifactId, e.title, modelId, domain, e.displayUrl, e.comparisonKey, e.title, sim, origin);
      }
    }
  }
}

/* ═════════════════════════════════════════════════════════════════ */
/*  Benchmark Results                                                */
/* ═════════════════════════════════════════════════════════════════ */

function benchResult(
  id: string,
  modelId: string,
  simulator: "ngspice" | "spectre" | "hspice",
  domain: "dc" | "ac" | "transient" | "noise",
  status: "pass" | "fail" | "partial" | "unavailable",
  timeMs: number | null,
  memMB: number | null,
  origin: "existing-tool-output" | "synthetic-demo",
): DomainBenchmarkResult {
  const prov = origin === "existing-tool-output" ? realProvenance : synthProvenance;
  // Look up plot artifact IDs for this model/simulator/domain combo
  const plotIds = (PLOT_INDEX[modelId]?.[simulator]?.[domain] ?? []).map((e) => e.artifactId);
  return {
    resultId: id,
    modelId,
    simulator,
    simulatorVersion: simulator === "ngspice" ? "42" : null,
    domain,
    status,
    resources: { wallTimeMs: timeMs, peakRssMB: memMB, source: origin },
    keyMetrics: {},
    datasetArtifactIds: [],
    plotArtifactIds: plotIds,
    provenance: { ...prov },
  };
}

const benchmarkResults: DomainBenchmarkResult[] = [
  /* ── Input model, ngspice (existing-tool-output) ── */
  benchResult("br-input-ngspice-dc", "model-input", "ngspice", "dc", "pass", 1240, 182, "existing-tool-output"),
  benchResult("br-input-ngspice-ac", "model-input", "ngspice", "ac", "pass", 890, 155, "existing-tool-output"),
  benchResult("br-input-ngspice-transient", "model-input", "ngspice", "transient", "pass", 3420, 310, "existing-tool-output"),
  benchResult("br-input-ngspice-noise", "model-input", "ngspice", "noise", "partial", 2100, 245, "existing-tool-output"),

  /* ── Reduced model, ngspice ── */
  benchResult("br-reduced-ngspice-dc", "model-reduced", "ngspice", "dc", "pass", 980, 152, "existing-tool-output"),
  benchResult("br-reduced-ngspice-ac", "model-reduced", "ngspice", "ac", "pass", 720, 138, "existing-tool-output"),
  benchResult("br-reduced-ngspice-transient", "model-reduced", "ngspice", "transient", "pass", 2800, 278, "existing-tool-output"),
  benchResult("br-reduced-ngspice-noise", "model-reduced", "ngspice", "noise", "pass", 1680, 210, "existing-tool-output"),

  /* ── Reduced model, Spectre (synthetic-demo) ── */
  benchResult("br-reduced-spectre-dc", "model-reduced", "spectre", "dc", "pass", 2240, 345, "synthetic-demo"),
  benchResult("br-reduced-spectre-ac", "model-reduced", "spectre", "ac", "pass", 1890, 298, "synthetic-demo"),
  benchResult("br-reduced-spectre-transient", "model-reduced", "spectre", "transient", "pass", 5890, 520, "synthetic-demo"),
  benchResult("br-reduced-spectre-noise", "model-reduced", "spectre", "noise", "pass", 3780, 410, "synthetic-demo"),

  /* ── Reduced model, HSPICE (synthetic-demo) ── */
  benchResult("br-reduced-hspice-dc", "model-reduced", "hspice", "dc", "pass", 1980, 295, "synthetic-demo"),
  benchResult("br-reduced-hspice-ac", "model-reduced", "hspice", "ac", "pass", 1650, 260, "synthetic-demo"),
  benchResult("br-reduced-hspice-transient", "model-reduced", "hspice", "transient", "pass", 5210, 488, "synthetic-demo"),
  benchResult("br-reduced-hspice-noise", "model-reduced", "hspice", "noise", "pass", 3340, 375, "synthetic-demo"),

  /* ── Input model, Spectre (synthetic-demo) ── */
  benchResult("br-input-spectre-dc", "model-input", "spectre", "dc", "pass", 2680, 378, "synthetic-demo"),
  benchResult("br-input-spectre-ac", "model-input", "spectre", "ac", "pass", 2150, 325, "synthetic-demo"),
  benchResult("br-input-spectre-transient", "model-input", "spectre", "transient", "pass", 6840, 590, "synthetic-demo"),
  benchResult("br-input-spectre-noise", "model-input", "spectre", "noise", "partial", 4290, 448, "synthetic-demo"),

  /* ── Input model, HSPICE (synthetic-demo) ── */
  benchResult("br-input-hspice-dc", "model-input", "hspice", "dc", "pass", 2310, 328, "synthetic-demo"),
  benchResult("br-input-hspice-ac", "model-input", "hspice", "ac", "pass", 1850, 290, "synthetic-demo"),
  benchResult("br-input-hspice-transient", "model-input", "hspice", "transient", "pass", 6020, 545, "synthetic-demo"),
  benchResult("br-input-hspice-noise", "model-input", "hspice", "noise", "partial", 3820, 405, "synthetic-demo"),

  /* ── Spectre/HSPICE for ngspice comparison on input model (some synthetic) ── */
  benchResult("br-input-spectre-ac-synth", "model-input", "spectre", "ac", "pass", 1970, 312, "synthetic-demo"),
  benchResult("br-input-hspice-ac-synth", "model-input", "hspice", "ac", "pass", 1740, 280, "synthetic-demo"),
];

/* ═════════════════════════════════════════════════════════════════ */
/*  Artifacts                                                        */
/* ═════════════════════════════════════════════════════════════════ */

const artifacts: Record<string, ArtifactRef> = {
  "art-translator-report": {
    artifactId: "art-translator-report", name: "Translation Report",
    toolId: "translator", kind: "report", format: "md",
    sizeBytes: 1024, hash: null, visibility: "public", provenance: derivedProvenance,
  },
  "art-translator-plot": {
    artifactId: "art-translator-plot", name: "Translation Verification Plot",
    toolId: "translator", kind: "plot", format: "png",
    sizeBytes: 46080, hash: null, visibility: "public", provenance: derivedProvenance,
  },
  "art-fitting-iv-overlay": {
    artifactId: "art-fitting-iv-overlay", name: "Before/After IV Overlay",
    toolId: "fitting", kind: "plot", format: "plotly-json",
    sizeBytes: null, hash: null, visibility: "public", provenance: synthProvenance,
  },
  "art-fitting-loss": {
    artifactId: "art-fitting-loss", name: "Loss Convergence",
    toolId: "fitting", kind: "plot", format: "plotly-json",
    sizeBytes: null, hash: null, visibility: "public", provenance: synthProvenance,
  },
  "art-fitting-params": {
    artifactId: "art-fitting-params", name: "Fitted Parameter Table",
    toolId: "fitting", kind: "metadata", format: "json",
    sizeBytes: 512, hash: null, visibility: "public", provenance: synthProvenance,
  },
  "art-fitting-report": {
    artifactId: "art-fitting-report", name: "Calibration Report",
    toolId: "fitting", kind: "report", format: "md",
    sizeBytes: 2048, hash: null, visibility: "public", provenance: synthProvenance,
  },
  "art-reduction-dc-plot": {
    artifactId: "art-reduction-dc-plot", name: "DC Comparison (Original vs Reduced)",
    toolId: "reduction", kind: "plot", format: "plotly-json",
    sizeBytes: null, hash: null, visibility: "public", provenance: derivedProvenance,
  },
  "art-reduction-error-evol": {
    artifactId: "art-reduction-error-evol", name: "Error Evolution",
    toolId: "reduction", kind: "plot", format: "plotly-json",
    sizeBytes: null, hash: null, visibility: "public", provenance: derivedProvenance,
  },
  "art-reduction-params-table": {
    artifactId: "art-reduction-params-table", name: "Retained Parameters",
    toolId: "reduction", kind: "metadata", format: "json",
    sizeBytes: 256, hash: null, visibility: "public", provenance: derivedProvenance,
  },
  "art-reduction-report": {
    artifactId: "art-reduction-report", name: "Reduction Report",
    toolId: "reduction", kind: "report", format: "md",
    sizeBytes: 1536, hash: null, visibility: "public", provenance: derivedProvenance,
  },
  "art-expansion-iv": {
    artifactId: "art-expansion-iv", name: "Corner IV Characteristics",
    toolId: "expansion", kind: "plot", format: "plotly-json",
    sizeBytes: null, hash: null, visibility: "public", provenance: synthProvenance,
  },
  "art-expansion-cv": {
    artifactId: "art-expansion-cv", name: "Corner CV Characteristics",
    toolId: "expansion", kind: "plot", format: "plotly-json",
    sizeBytes: null, hash: null, visibility: "public", provenance: synthProvenance,
  },
  "art-expansion-report": {
    artifactId: "art-expansion-report", name: "Expansion Report",
    toolId: "expansion", kind: "report", format: "md",
    sizeBytes: 1280, hash: null, visibility: "public", provenance: synthProvenance,
  },
  "art-expansion-models": {
    artifactId: "art-expansion-models", name: "Corner Model Files (T/S/F)",
    toolId: "expansion", kind: "model", format: "lib",
    sizeBytes: 6144, hash: null, visibility: "public", provenance: synthProvenance,
  },
};

/* ═════════════════════════════════════════════════════════════════ */
/*  Merge plot artifacts                                             */
/* ═════════════════════════════════════════════════════════════════ */

Object.assign(artifacts, BENCHMARK_PLOT_ARTIFACTS);

/* ═════════════════════════════════════════════════════════════════ */
/*  Assembled Scenario                                               */
/* ═════════════════════════════════════════════════════════════════ */

export const INTEGRATED_DEMO_SCENARIO: WorkflowScenario = {
  schemaVersion: "1.0",
  scenarioId: "integrated-demo",
  title: "Demo: BSIM4 NMOS Integrated Workflow",
  description:
    "Deterministic static demonstration of a complete SPICE model workflow: " +
    "Convert → Calibrate → Reduce → Expand → Benchmark. " +
    "All Spectre/HSPICE resource metrics and fitting results are synthetic demo fixtures.",
  status: "completed",
  models,
  operations,
  invocations,
  executions,
  benchmarkResults,
  artifacts,
  defaultInputModelId: "model-input",
  defaultCandidateModelId: "model-reduced",
  defaultSimulators: ["ngspice", "spectre", "hspice"],
  defaultDomains: ["dc", "ac", "transient", "noise"],
  provenance: {
    origin: "derived-static-demo",
    fixtureId: "integrated-demo-v1",
    generatedAt: "2025-07-01",
    note:
      "Deterministic static demonstration. " +
      "Existing repository outputs and synthetic comparison fixtures are labeled separately. " +
      "No external tool is executed in this browser.",
  },
};
