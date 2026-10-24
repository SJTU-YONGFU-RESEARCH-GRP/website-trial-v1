/* ReductionTypes.ts — BSIM Model Reduction result-oriented types */

export interface KpiSet {
  originalParams: number; reducedParams: number; reductionRatio: number;
  validationError: number; errorTolerance: number; withinTolerance: boolean;
  runtimeSeconds: number; optimizationIterations: number;
  analyticsIterations?: number; trackedIterations?: number;
  dataConsistencyNote?: string;
}

export interface ReportArtifact {
  name: string; relPath: string; size: string; hash: string; fetchUrl: string | null; isHtml?: boolean;
}

export interface PlotArtifact {
  name: string; relPath: string; format: string; size: string; hash: string; displayUrl: string | null;
  width?: number; height?: number; aspectRatio?: number;
  caption?: { title: string; what: string; why: string };
  section: "parameter" | "accuracy" | "convergence" | "performance" | "other";
}

export interface IterationEntry {
  iteration: number; totalError: number; simulationErrors: Record<string,number>;
  parameterCount: number; timestamp: string; paramValues?: Record<string,number>;
}

export interface ReductionResult {
  resultId: string; title: string; description: string; model: string; device: string; testType: string;
  optimizationMethod: string; reductionMethod: string; status: string; generatedAt: string;
  kpis: KpiSet;
  reports: ReportArtifact[];
  plots: PlotArtifact[];
  retainedParams: { name: string; value: number; retained: boolean; importance?: number }[];
  iterations: IterationEntry[];
  dataArtifacts: { name: string; relPath: string; format: string; size: string; hash: string }[];
  otherArtifacts: { name: string; relPath: string; size: string; hash: string; format?: string }[];
  summary: { totalReports: number; totalPlots: number; totalData: number };
}

export interface ReductionManifest {
  generatedAt: string;
  results: ReductionResult[];
  defaultResultId: string;
  allModels: string[];
  allDevices: string[];
  allTestTypes: string[];
  allOptimizationMethods: string[];
  allReductionMethods: string[];
}
