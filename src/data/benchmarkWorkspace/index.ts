/* ==================================================================
 *  benchmarkWorkspace data index
 * ================================================================== */

export { INTEGRATED_DEMO_SCENARIO } from "./integratedDemo";
export { EXPERIMENT1_SCENARIO } from "./experiment1Demo";
export {
  FITTING_FIXTURE_EXECUTION,
  FITTING_FIXTURE_ARTIFACTS,
  FITTING_DEMO_PARAMETERS,
  FITTING_DEMO_CONVERGENCE,
} from "./fittingFixture";
export type { FittedParameterRow, LossConvergencePoint } from "./fittingFixture";
export { BUNDLED_MODELS } from "./bundledModels";
export type { BundledModelEntry } from "./bundledModels";
export {
  getModelById,
  getDefaultInputModel,
  getDefaultCandidateModel,
  getModelLineage,
  getPersistentModels,
  getSelectableModels,
  getResultsForModel,
  getResultsForSimulator,
  getResultForCell,
  getSimulatorSummary,
  getEffectivePipeline,
  computeModelComparisonKPIs,
  resolveBenchmarkPlotPairs,
} from "./selectors";
export type { ModelComparisonKPI, BenchmarkPlotPair, ResolvedBenchmarkPlot } from "./selectors";
export { PLOT_CATALOG, canonicalizeBenchmarkPlotKey } from "./benchmarkPlotCatalog";
export type { PlotKeyEntry } from "./benchmarkPlotCatalog";
