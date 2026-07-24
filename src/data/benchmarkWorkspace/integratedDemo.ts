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
    filename: "nmos_bsim4.lib",
    displayName: "Input Model (BSIM4 NMOS)",
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
    byteSize: 1243,
    parameterCount: 63,
    checksum: "bfaeda020b886302ac56c7dc215ea3e6",
    generatedBy: "user",
    operationChain: "Input",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-translated": {
    modelId: "model-translated",
    parentModelId: "model-input",
    filename: "translated_hspice.lib",
    displayName: "Translated Model",
    variant: "translated",
    dialect: "hspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    byteSize: 980,
    parameterCount: 12,
    checksum: "ca0ea0157e1a8275791616476bc1628c",
    generatedBy: "translator",
    operationChain: "Input → Translator",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-calibrated": {
    modelId: "model-calibrated",
    parentModelId: "model-input",
    filename: "calibrated.lib",
    displayName: "Calibrated Model",
    variant: "calibrated",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    byteSize: 1747,
    parameterCount: 66,
    checksum: "f44741b3d24aa70b4b6355d82a9b65fd",
    generatedBy: "fitting",
    operationChain: "Input → Fitting",
    persistent: true,
    temporary: false,
    provenance: synthProvenance,
  },
  "model-reduced": {
    modelId: "model-reduced",
    parentModelId: "model-input",
    filename: "reduced_model.lib",
    displayName: "Reduced Model",
    variant: "reduced",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    byteSize: 1239,
    parameterCount: 63,
    checksum: "56714439dab6b7a69e434962a40a74d0",
    generatedBy: "reduction",
    operationChain: "Input → Reduction",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-corner-typical": {
    modelId: "model-corner-typical",
    parentModelId: "model-input",
    filename: "model_t.sp",
    displayName: "Corner Typical (T)",
    variant: "corner-typical",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    byteSize: 885,
    parameterCount: 64,
    checksum: "8b18c3579e48ba6c3954c77366aaca98",
    generatedBy: "expansion",
    operationChain: "Input → Expansion (T)",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-corner-slow": {
    modelId: "model-corner-slow",
    parentModelId: "model-input",
    filename: "model_s.sp",
    displayName: "Corner Slow (S)",
    variant: "corner-slow",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    byteSize: 885,
    parameterCount: 64,
    checksum: "473e3c42e5a2d0f392a7b3b6ddbf2e71",
    generatedBy: "expansion",
    operationChain: "Input → Expansion (S)",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
  },
  "model-corner-fast": {
    modelId: "model-corner-fast",
    parentModelId: "model-input",
    filename: "model_f.sp",
    displayName: "Corner Fast (F)",
    variant: "corner-fast",
    dialect: "ngspice",
    modelNames: ["nmos_bsim4"],
    deviceClass: "mos",
    deviceType: "nmos",
    modelFamily: "BSIM4.5",
    byteSize: 885,
    parameterCount: 64,
    checksum: "a23f7b2c81e5d0f392a7b3b6ddbf2e71",
    generatedBy: "expansion",
    operationChain: "Input → Expansion (F)",
    persistent: true,
    temporary: false,
    provenance: derivedProvenance,
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

// ═══════════════════════════════════════════════════════════
// Ngspice plots for input model (from reference_results/)
// ═══════════════════════════════════════════════════════════
addPlot("model-input", "ngspice", "dc", "bp-input-ngspice-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/reference_results/plots/iv_characteristics_44e599f9.png");
addPlot("model-input", "ngspice", "dc", "bp-input-ngspice-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/reference_results/plots/kcl_verification_9a99adfa.png");
addPlot("model-input", "ngspice", "dc", "bp-input-ngspice-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/reference_results/plots/temperature_analysis_8afe0802.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-cv", "cv-characteristics", "C-V Characteristics", "benchmark/reference_results/plots/cv_characteristics_54ad29bc.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-cvc", "cv-components", "C-V Components", "benchmark/reference_results/plots/cv_components_b0763246.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-nqs", "nqs-effects", "Non-Quasi-Static Effects", "benchmark/reference_results/plots/nqs_effects_dd0638f7.png");
addPlot("model-input", "ngspice", "ac", "bp-input-ngspice-ac-sp", "s-parameter", "S-Parameter Analysis", "benchmark/reference_results/plots/sparameter_analysis_ea6bfba2.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/reference_results/plots/large_signal_transient_d41850d1.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-sw", "switching-response", "Switching Response", "benchmark/reference_results/plots/switching_response_d9430ed0.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-delay", "delay-effect", "Delay Effect", "benchmark/reference_results/plots/delay_effect_2b75b9da.png");
addPlot("model-input", "ngspice", "transient", "bp-input-ngspice-tran-power", "power-dissipation", "Power Dissipation", "benchmark/reference_results/plots/power_dissipation_c61c1c94.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/reference_results/plots/thermal_noise_84c213c5.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-flicker", "flicker-noise", "Flicker Noise", "benchmark/reference_results/plots/flicker_noise_8992dd34.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-shot", "shot-noise", "Shot Noise", "benchmark/reference_results/plots/shot_noise_97f69a58.png");
addPlot("model-input", "ngspice", "noise", "bp-input-ngspice-noise-components", "noise-components", "Noise Components", "benchmark/reference_results/plots/noise_components_d2a1aff6.png");

// ═══════════════════════════════════════════════════════════
// HSPICE + Spectre pipeline results (4 tools × 2 simulators)
// ═══════════════════════════════════════════════════════════
// --- Translator ---
addPlot("model-translated", "hspice", "dc", "bp-translator-hspice-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/translator/hspice/dc_iv_characteristics.png");
addPlot("model-translated", "hspice", "dc", "bp-translator-hspice-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/translator/hspice/dc_kcl_verification.png");
addPlot("model-translated", "hspice", "dc", "bp-translator-hspice-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/translator/hspice/dc_temperature_analysis.png");
addPlot("model-translated", "hspice", "ac", "bp-translator-hspice-ac-nqs", "nqs-effects", "Non-Quasi-Static Effects", "benchmark/pipeline_results/translator/hspice/ac_cv_nqs_effects.png");
addPlot("model-translated", "hspice", "ac", "bp-translator-hspice-ac-sp", "s-parameter", "S-Parameter Analysis", "benchmark/pipeline_results/translator/hspice/ac_cv_sparameter_analysis.png");
addPlot("model-translated", "hspice", "noise", "bp-translator-hspice-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/translator/hspice/thermal_noise.png");
addPlot("model-translated", "hspice", "transient", "bp-translator-hspice-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/translator/hspice/trans_large_signal_transient.png");
addPlot("model-translated", "hspice", "transient", "bp-translator-hspice-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/translator/hspice/trans_quasi_static_iv.png");
addPlot("model-translated", "hspice", "transient", "bp-translator-hspice-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/translator/hspice/trans_quasi_static_time.png");
addPlot("model-translated", "spectre", "dc", "bp-translator-spectre-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/translator/spectre/dc_iv_characteristics.png");
addPlot("model-translated", "spectre", "dc", "bp-translator-spectre-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/translator/spectre/dc_kcl_verification.png");
addPlot("model-translated", "spectre", "dc", "bp-translator-spectre-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/translator/spectre/dc_temperature_analysis.png");
addPlot("model-translated", "spectre", "ac", "bp-translator-spectre-ac-cv", "cv-characteristics", "C-V Characteristics", "benchmark/pipeline_results/translator/spectre/ac_cv_characteristics.png");
addPlot("model-translated", "spectre", "ac", "bp-translator-spectre-ac-cvc", "cv-components", "C-V Components", "benchmark/pipeline_results/translator/spectre/ac_cv_components.png");
addPlot("model-translated", "spectre", "ac", "bp-translator-spectre-ac-cvmf", "cv-multifrequency", "Multi-Frequency C-V", "benchmark/pipeline_results/translator/spectre/ac_v_multifreq_characteristics.png");
addPlot("model-translated", "spectre", "noise", "bp-translator-spectre-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/translator/spectre/thermal_noise.png");
addPlot("model-translated", "spectre", "transient", "bp-translator-spectre-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/translator/spectre/trans_large_signal_transient.png");
addPlot("model-translated", "spectre", "transient", "bp-translator-spectre-tran-delay", "delay-effect", "Delay Effect", "benchmark/pipeline_results/translator/spectre/trans_delay_effect.png");
addPlot("model-translated", "spectre", "transient", "bp-translator-spectre-tran-sw", "switching-response", "Switching Response", "benchmark/pipeline_results/translator/spectre/trans_switching_response.png");
addPlot("model-translated", "spectre", "transient", "bp-translator-spectre-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/translator/spectre/trans_quasi_static_iv.png");
addPlot("model-translated", "spectre", "transient", "bp-translator-spectre-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/translator/spectre/trans_quasi_static_time.png");

// --- Fitting ---
addPlot("model-calibrated", "hspice", "dc", "bp-fitting-hspice-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/fitting/hspice/dc_iv_characteristics.png");
addPlot("model-calibrated", "hspice", "dc", "bp-fitting-hspice-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/fitting/hspice/dc_kcl_verification.png");
addPlot("model-calibrated", "hspice", "dc", "bp-fitting-hspice-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/fitting/hspice/dc_temperature_analysis.png");
addPlot("model-calibrated", "hspice", "ac", "bp-fitting-hspice-ac-nqs", "nqs-effects", "Non-Quasi-Static Effects", "benchmark/pipeline_results/fitting/hspice/ac_cv_nqs_effects.png");
addPlot("model-calibrated", "hspice", "ac", "bp-fitting-hspice-ac-sp", "s-parameter", "S-Parameter Analysis", "benchmark/pipeline_results/fitting/hspice/ac_cv_sparameter_analysis.png");
addPlot("model-calibrated", "hspice", "noise", "bp-fitting-hspice-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/fitting/hspice/thermal_noise.png");
addPlot("model-calibrated", "hspice", "transient", "bp-fitting-hspice-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/fitting/hspice/trans_large_signal_transient.png");
addPlot("model-calibrated", "hspice", "transient", "bp-fitting-hspice-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/fitting/hspice/trans_quasi_static_iv.png");
addPlot("model-calibrated", "hspice", "transient", "bp-fitting-hspice-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/fitting/hspice/trans_quasi_static_time.png");
addPlot("model-calibrated", "spectre", "dc", "bp-fitting-spectre-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/fitting/spectre/dc_iv_characteristics.png");
addPlot("model-calibrated", "spectre", "dc", "bp-fitting-spectre-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/fitting/spectre/dc_kcl_verification.png");
addPlot("model-calibrated", "spectre", "dc", "bp-fitting-spectre-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/fitting/spectre/dc_temperature_analysis.png");
addPlot("model-calibrated", "spectre", "ac", "bp-fitting-spectre-ac-cv", "cv-characteristics", "C-V Characteristics", "benchmark/pipeline_results/fitting/spectre/ac_cv_characteristics.png");
addPlot("model-calibrated", "spectre", "ac", "bp-fitting-spectre-ac-cvc", "cv-components", "C-V Components", "benchmark/pipeline_results/fitting/spectre/ac_cv_components.png");
addPlot("model-calibrated", "spectre", "ac", "bp-fitting-spectre-ac-cvmf", "cv-multifrequency", "Multi-Frequency C-V", "benchmark/pipeline_results/fitting/spectre/ac_v_multifreq_characteristics.png");
addPlot("model-calibrated", "spectre", "noise", "bp-fitting-spectre-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/fitting/spectre/thermal_noise.png");
addPlot("model-calibrated", "spectre", "transient", "bp-fitting-spectre-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/fitting/spectre/trans_large_signal_transient.png");
addPlot("model-calibrated", "spectre", "transient", "bp-fitting-spectre-tran-delay", "delay-effect", "Delay Effect", "benchmark/pipeline_results/fitting/spectre/trans_delay_effect.png");
addPlot("model-calibrated", "spectre", "transient", "bp-fitting-spectre-tran-sw", "switching-response", "Switching Response", "benchmark/pipeline_results/fitting/spectre/trans_switching_response.png");
addPlot("model-calibrated", "spectre", "transient", "bp-fitting-spectre-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/fitting/spectre/trans_quasi_static_iv.png");
addPlot("model-calibrated", "spectre", "transient", "bp-fitting-spectre-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/fitting/spectre/trans_quasi_static_time.png");

// --- Expansion (Corner Typical) ---
addPlot("model-corner-typical", "hspice", "dc", "bp-expansion-hspice-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/expansion/hspice/dc_iv_characteristics.png");
addPlot("model-corner-typical", "hspice", "dc", "bp-expansion-hspice-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/expansion/hspice/dc_kcl_verification.png");
addPlot("model-corner-typical", "hspice", "dc", "bp-expansion-hspice-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/expansion/hspice/dc_temperature_analysis.png");
addPlot("model-corner-typical", "hspice", "ac", "bp-expansion-hspice-ac-nqs", "nqs-effects", "Non-Quasi-Static Effects", "benchmark/pipeline_results/expansion/hspice/ac_cv_nqs_effects.png");
addPlot("model-corner-typical", "hspice", "ac", "bp-expansion-hspice-ac-sp", "s-parameter", "S-Parameter Analysis", "benchmark/pipeline_results/expansion/hspice/ac_cv_sparameter_analysis.png");
addPlot("model-corner-typical", "hspice", "noise", "bp-expansion-hspice-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/expansion/hspice/thermal_noise.png");
addPlot("model-corner-typical", "hspice", "transient", "bp-expansion-hspice-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/expansion/hspice/trans_large_signal_transient.png");
addPlot("model-corner-typical", "hspice", "transient", "bp-expansion-hspice-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/expansion/hspice/trans_quasi_static_iv.png");
addPlot("model-corner-typical", "hspice", "transient", "bp-expansion-hspice-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/expansion/hspice/trans_quasi_static_time.png");
addPlot("model-corner-typical", "spectre", "dc", "bp-expansion-spectre-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/expansion/spectre/dc_iv_characteristics.png");
addPlot("model-corner-typical", "spectre", "dc", "bp-expansion-spectre-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/expansion/spectre/dc_kcl_verification.png");
addPlot("model-corner-typical", "spectre", "dc", "bp-expansion-spectre-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/expansion/spectre/dc_temperature_analysis.png");
addPlot("model-corner-typical", "spectre", "ac", "bp-expansion-spectre-ac-cv", "cv-characteristics", "C-V Characteristics", "benchmark/pipeline_results/expansion/spectre/ac_cv_characteristics.png");
addPlot("model-corner-typical", "spectre", "ac", "bp-expansion-spectre-ac-cvc", "cv-components", "C-V Components", "benchmark/pipeline_results/expansion/spectre/ac_cv_components.png");
addPlot("model-corner-typical", "spectre", "ac", "bp-expansion-spectre-ac-cvmf", "cv-multifrequency", "Multi-Frequency C-V", "benchmark/pipeline_results/expansion/spectre/ac_v_multifreq_characteristics.png");
addPlot("model-corner-typical", "spectre", "noise", "bp-expansion-spectre-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/expansion/spectre/thermal_noise.png");
addPlot("model-corner-typical", "spectre", "transient", "bp-expansion-spectre-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/expansion/spectre/trans_large_signal_transient.png");
addPlot("model-corner-typical", "spectre", "transient", "bp-expansion-spectre-tran-delay", "delay-effect", "Delay Effect", "benchmark/pipeline_results/expansion/spectre/trans_delay_effect.png");
addPlot("model-corner-typical", "spectre", "transient", "bp-expansion-spectre-tran-sw", "switching-response", "Switching Response", "benchmark/pipeline_results/expansion/spectre/trans_switching_response.png");
addPlot("model-corner-typical", "spectre", "transient", "bp-expansion-spectre-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/expansion/spectre/trans_quasi_static_iv.png");
addPlot("model-corner-typical", "spectre", "transient", "bp-expansion-spectre-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/expansion/spectre/trans_quasi_static_time.png");

// --- Reduction ---
addPlot("model-reduced", "hspice", "dc", "bp-reduction-hspice-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/reduction/hspice/dc_iv_characteristics.png");
addPlot("model-reduced", "hspice", "dc", "bp-reduction-hspice-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/reduction/hspice/dc_kcl_verification.png");
addPlot("model-reduced", "hspice", "dc", "bp-reduction-hspice-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/reduction/hspice/dc_temperature_analysis.png");
addPlot("model-reduced", "hspice", "ac", "bp-reduction-hspice-ac-nqs", "nqs-effects", "Non-Quasi-Static Effects", "benchmark/pipeline_results/reduction/hspice/ac_cv_nqs_effects.png");
addPlot("model-reduced", "hspice", "ac", "bp-reduction-hspice-ac-sp", "s-parameter", "S-Parameter Analysis", "benchmark/pipeline_results/reduction/hspice/ac_cv_sparameter_analysis.png");
addPlot("model-reduced", "hspice", "noise", "bp-reduction-hspice-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/reduction/hspice/thermal_noise.png");
addPlot("model-reduced", "hspice", "transient", "bp-reduction-hspice-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/reduction/hspice/trans_large_signal_transient.png");
addPlot("model-reduced", "hspice", "transient", "bp-reduction-hspice-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/reduction/hspice/trans_quasi_static_iv.png");
addPlot("model-reduced", "hspice", "transient", "bp-reduction-hspice-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/reduction/hspice/trans_quasi_static_time.png");
addPlot("model-reduced", "spectre", "dc", "bp-reduction-spectre-dc-iv", "iv-characteristics", "IV Characteristics", "benchmark/pipeline_results/reduction/spectre/dc_iv_characteristics.png");
addPlot("model-reduced", "spectre", "dc", "bp-reduction-spectre-dc-kcl", "kcl-verification", "KCL Verification", "benchmark/pipeline_results/reduction/spectre/dc_kcl_verification.png");
addPlot("model-reduced", "spectre", "dc", "bp-reduction-spectre-dc-temp", "temperature-analysis", "Temperature Analysis", "benchmark/pipeline_results/reduction/spectre/dc_temperature_analysis.png");
addPlot("model-reduced", "spectre", "ac", "bp-reduction-spectre-ac-cv", "cv-characteristics", "C-V Characteristics", "benchmark/pipeline_results/reduction/spectre/ac_cv_characteristics.png");
addPlot("model-reduced", "spectre", "ac", "bp-reduction-spectre-ac-cvc", "cv-components", "C-V Components", "benchmark/pipeline_results/reduction/spectre/ac_cv_components.png");
addPlot("model-reduced", "spectre", "ac", "bp-reduction-spectre-ac-cvmf", "cv-multifrequency", "Multi-Frequency C-V", "benchmark/pipeline_results/reduction/spectre/ac_v_multifreq_characteristics.png");
addPlot("model-reduced", "spectre", "noise", "bp-reduction-spectre-noise-thermal", "thermal-noise", "Thermal Noise", "benchmark/pipeline_results/reduction/spectre/thermal_noise.png");
addPlot("model-reduced", "spectre", "transient", "bp-reduction-spectre-tran-ls", "large-signal-transient", "Large-Signal Transient", "benchmark/pipeline_results/reduction/spectre/trans_large_signal_transient.png");
addPlot("model-reduced", "spectre", "transient", "bp-reduction-spectre-tran-delay", "delay-effect", "Delay Effect", "benchmark/pipeline_results/reduction/spectre/trans_delay_effect.png");
addPlot("model-reduced", "spectre", "transient", "bp-reduction-spectre-tran-sw", "switching-response", "Switching Response", "benchmark/pipeline_results/reduction/spectre/trans_switching_response.png");
addPlot("model-reduced", "spectre", "transient", "bp-reduction-spectre-tran-qs-iv", "quasi-static-iv", "Quasi-Static IV", "benchmark/pipeline_results/reduction/spectre/trans_quasi_static_iv.png");
addPlot("model-reduced", "spectre", "transient", "bp-reduction-spectre-tran-qs-t", "quasi-static-time", "Quasi-Static Time", "benchmark/pipeline_results/reduction/spectre/trans_quasi_static_time.png");

// Register all artifacts
for (const [modelId, sims] of Object.entries(PLOT_INDEX)) {
  for (const [sim, domains] of Object.entries(sims)) {
    for (const [domain, entries] of Object.entries(domains)) {
      for (const e of entries) {
        const isPipeline = e.displayUrl.includes("pipeline_results");
        const origin: "existing-tool-output" | "synthetic-demo" = isPipeline ? "existing-tool-output" : (sim === "ngspice" ? "existing-tool-output" : "synthetic-demo");
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

  // ═══ Pipeline results: model-translated (Translator) ═══
  benchResult("br-translated-hspice-dc", "model-translated", "hspice", "dc", "pass", 3800, 320, "existing-tool-output"),
  benchResult("br-translated-hspice-ac", "model-translated", "hspice", "ac", "pass", 2200, 280, "existing-tool-output"),
  benchResult("br-translated-hspice-transient", "model-translated", "hspice", "transient", "pass", 6200, 490, "existing-tool-output"),
  benchResult("br-translated-hspice-noise", "model-translated", "hspice", "noise", "pass", 3500, 380, "existing-tool-output"),
  benchResult("br-translated-spectre-dc", "model-translated", "spectre", "dc", "pass", 1200, 190, "existing-tool-output"),
  benchResult("br-translated-spectre-ac", "model-translated", "spectre", "ac", "pass", 800, 170, "existing-tool-output"),
  benchResult("br-translated-spectre-transient", "model-translated", "spectre", "transient", "pass", 3100, 310, "existing-tool-output"),
  benchResult("br-translated-spectre-noise", "model-translated", "spectre", "noise", "pass", 1500, 220, "existing-tool-output"),

  // ═══ Pipeline results: model-calibrated (Fitting) ═══
  benchResult("br-calibrated-hspice-dc", "model-calibrated", "hspice", "dc", "pass", 3800, 320, "existing-tool-output"),
  benchResult("br-calibrated-hspice-ac", "model-calibrated", "hspice", "ac", "pass", 2200, 280, "existing-tool-output"),
  benchResult("br-calibrated-hspice-transient", "model-calibrated", "hspice", "transient", "pass", 6200, 490, "existing-tool-output"),
  benchResult("br-calibrated-hspice-noise", "model-calibrated", "hspice", "noise", "pass", 3500, 380, "existing-tool-output"),
  benchResult("br-calibrated-spectre-dc", "model-calibrated", "spectre", "dc", "pass", 1100, 188, "existing-tool-output"),
  benchResult("br-calibrated-spectre-ac", "model-calibrated", "spectre", "ac", "pass", 700, 170, "existing-tool-output"),
  benchResult("br-calibrated-spectre-transient", "model-calibrated", "spectre", "transient", "pass", 2900, 310, "existing-tool-output"),
  benchResult("br-calibrated-spectre-noise", "model-calibrated", "spectre", "noise", "pass", 1400, 220, "existing-tool-output"),

  // ═══ Pipeline results: model-corner-typical (Expansion) ═══
  benchResult("br-corner-typical-hspice-dc", "model-corner-typical", "hspice", "dc", "pass", 3900, 325, "existing-tool-output"),
  benchResult("br-corner-typical-hspice-ac", "model-corner-typical", "hspice", "ac", "pass", 2250, 285, "existing-tool-output"),
  benchResult("br-corner-typical-hspice-transient", "model-corner-typical", "hspice", "transient", "pass", 6300, 495, "existing-tool-output"),
  benchResult("br-corner-typical-hspice-noise", "model-corner-typical", "hspice", "noise", "pass", 3550, 385, "existing-tool-output"),
  benchResult("br-corner-typical-spectre-dc", "model-corner-typical", "spectre", "dc", "pass", 1150, 190, "existing-tool-output"),
  benchResult("br-corner-typical-spectre-ac", "model-corner-typical", "spectre", "ac", "pass", 750, 172, "existing-tool-output"),
  benchResult("br-corner-typical-spectre-transient", "model-corner-typical", "spectre", "transient", "pass", 3000, 315, "existing-tool-output"),
  benchResult("br-corner-typical-spectre-noise", "model-corner-typical", "spectre", "noise", "pass", 1450, 225, "existing-tool-output"),
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
