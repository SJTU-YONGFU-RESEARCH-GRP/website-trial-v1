/* ==================================================================
 *  fittingFixture.ts (goal.md §21)
 *
 *  Deterministic synthetic demo fixture for Fitting/Calibration.
 *  Marked as synthetic-demo — NOT real tool output.
 * ================================================================== */

import type { ToolExecutionResult, ArtifactRef, Provenance } from "../../compat/spiceWorkflow/contracts";

const fittingProvenance: Provenance = {
  origin: "synthetic-demo",
  sourceRepo: "spice_model_fitting",
  fixtureId: "fitting-synthetic-demo-01",
  note: "Synthetic demo fixture — not real tool output.",
};

export const FITTING_FIXTURE_EXECUTION: ToolExecutionResult = {
  executionId: "fitting-demo-exec-01",
  toolId: "fitting",
  status: "completed",
  inputModelIds: ["model-input"],
  outputModelIds: ["model-calibrated"],
  metrics: {
    initialLoss: 0.452,
    finalLoss: 0.083,
    improvement: 0.816,
    iterations: 42,
    ngspiceCallCount: 168,
    fittedParameterCount: 4,
    optimizerUsed: "nelder_mead",
    deviceType: "nmos",
    simType: "dc",
  },
  artifactIds: [
    "fitting-demo-plot-iv-overlay",
    "fitting-demo-plot-loss-convergence",
    "fitting-demo-table-params",
    "fitting-demo-model-output",
    "fitting-demo-report",
  ],
  warnings: [
    "AC/CV fitting is not enabled in current tool support.",
  ],
  errors: [],
  invocationId: "fitting-demo-invocation-01",
  provenance: fittingProvenance,
};

export const FITTING_FIXTURE_ARTIFACTS: Record<string, ArtifactRef> = {
  "fitting-demo-plot-iv-overlay": {
    artifactId: "fitting-demo-plot-iv-overlay",
    name: "Before/After IV Overlay",
    toolId: "fitting",
    kind: "plot",
    format: "plotly-json",
    sizeBytes: null,
    hash: null,
    visibility: "public",
    provenance: fittingProvenance,
  },
  "fitting-demo-plot-loss-convergence": {
    artifactId: "fitting-demo-plot-loss-convergence",
    name: "Loss Convergence",
    toolId: "fitting",
    kind: "plot",
    format: "plotly-json",
    sizeBytes: null,
    hash: null,
    visibility: "public",
    provenance: fittingProvenance,
  },
  "fitting-demo-table-params": {
    artifactId: "fitting-demo-table-params",
    name: "Fitted Parameter Table",
    toolId: "fitting",
    kind: "metadata",
    format: "json",
    sizeBytes: null,
    hash: null,
    visibility: "public",
    provenance: fittingProvenance,
  },
  "fitting-demo-model-output": {
    artifactId: "fitting-demo-model-output",
    name: "Calibrated Model",
    toolId: "fitting",
    kind: "model",
    format: "lib",
    sizeBytes: 18432,
    hash: null,
    visibility: "public",
    provenance: fittingProvenance,
  },
  "fitting-demo-report": {
    artifactId: "fitting-demo-report",
    name: "Calibration Report",
    toolId: "fitting",
    kind: "report",
    format: "md",
    sizeBytes: 2048,
    hash: null,
    visibility: "public",
    provenance: fittingProvenance,
  },
};

/** Fitted parameter: before vs after */
export interface FittedParameterRow {
  parameter: string;
  before: number;
  after: number;
  delta: number;
  deltaPct: number;
}

export const FITTING_DEMO_PARAMETERS: FittedParameterRow[] = [
  { parameter: "vth0", before: 0.420, after: 0.398, delta: -0.022, deltaPct: -5.24 },
  { parameter: "k1", before: 0.350, after: 0.338, delta: -0.012, deltaPct: -3.43 },
  { parameter: "k2", before: -0.020, after: -0.018, delta: 0.002, deltaPct: 10.0 },
  { parameter: "nfactor", before: 1.200, after: 1.145, delta: -0.055, deltaPct: -4.58 },
];

/** Loss convergence trace */
export interface LossConvergencePoint {
  iteration: number;
  loss: number;
}

export const FITTING_DEMO_CONVERGENCE: LossConvergencePoint[] = [
  { iteration: 0, loss: 0.452 },
  { iteration: 5, loss: 0.318 },
  { iteration: 10, loss: 0.224 },
  { iteration: 15, loss: 0.163 },
  { iteration: 20, loss: 0.127 },
  { iteration: 25, loss: 0.106 },
  { iteration: 30, loss: 0.094 },
  { iteration: 35, loss: 0.087 },
  { iteration: 40, loss: 0.084 },
  { iteration: 42, loss: 0.083 },
];
