/* ==================================================================
 *  workflowAnalyzer.ts (goal3.md §4.3–§4.8)
 *
 *  Pure-function analyser that chains tool invocations,
 *  handles dialect compatibility, flags blocking issues, and
 *  builds a sequential workflow from the user's operationOrder.
 * ================================================================== */

import type {
  ModelArtifact, SpiceDialect, ToolInvocation, ProcessingToolId, SimulatorId,
} from "./contracts";
import { translatorAdapter } from "./translatorAdapter";
import { fittingAdapter } from "./fittingAdapter";
import { reductionAdapter } from "./reductionAdapter";
import { expansionAdapter } from "./expansionAdapter";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInvocation = ToolInvocation<any>;

/* ─── Tool capabilities ─── */

export interface ToolCapabilities {
  acceptedDialects: SpiceDialect[];
  outputDialect: SpiceDialect;
  outputCardinality: "single" | "multiple";
  primaryOutputPolicy: "only-output" | "typical-corner" | "selected-output";
  requiresMeasuredDataset: boolean;
  benchmarkableOutput: boolean;
}

export const TOOL_CAPABILITIES: Record<ProcessingToolId, ToolCapabilities> = {
  translator: {
    acceptedDialects: ["ngspice", "spectre", "hspice", "auto", "unknown"],
    outputDialect: "ngspice",
    outputCardinality: "single",
    primaryOutputPolicy: "only-output",
    requiresMeasuredDataset: false,
    benchmarkableOutput: true,
  },
  reduction: {
    acceptedDialects: ["ngspice"],
    outputDialect: "ngspice",
    outputCardinality: "single",
    primaryOutputPolicy: "only-output",
    requiresMeasuredDataset: false,
    benchmarkableOutput: true,
  },
  expansion: {
    acceptedDialects: ["ngspice", "spectre", "hspice"],
    outputDialect: "ngspice",
    outputCardinality: "multiple",
    primaryOutputPolicy: "typical-corner",
    requiresMeasuredDataset: false,
    benchmarkableOutput: true,
  },
  fitting: {
    acceptedDialects: ["ngspice"],
    outputDialect: "ngspice",
    outputCardinality: "single",
    primaryOutputPolicy: "only-output",
    requiresMeasuredDataset: true,
    benchmarkableOutput: true,
  },
};

/* ─── Compatibility action ─── */

export interface CompatibilityAction {
  description: string;
  sourceDialect: SpiceDialect;
  targetDialect: SpiceDialect;
  temporary: true;
}

/* ─── Analyzed step ─── */

export interface AnalyzedWorkflowStep {
  toolId: ProcessingToolId | "benchmark";
  order: number;
  label: string;
  inputDialect: SpiceDialect;
  outputDialect: SpiceDialect;
  inputModelIds: string[];
  outputModelIds: string[];
  status: "ready" | "configured" | "needs-input" | "incompatible" | "no-op";
  messages: string[];
  compatibilityActions: CompatibilityAction[];
  invocation: ToolInvocation | null;
}

/* ─── Analysis result ─── */

export interface WorkflowAnalysis {
  steps: AnalyzedWorkflowStep[];
  finalPrimaryModelId: string | null;
  benchmarkModelIds: string[];
  blockingIssues: string[];
  notices: string[];
}

/* ─── Request ─── */

export interface WorkflowAnalysisRequest {
  inputModel: ModelArtifact;
  operationOrder: ProcessingToolId[];
  enabledOps: Record<string, boolean>;
  params: Record<string, Record<string, unknown>>;
  selectedSimulators: SimulatorId[];
}

/* ─── Main analyser ─── */

export function analyzeWorkflow(req: WorkflowAnalysisRequest): WorkflowAnalysis {
  const steps: AnalyzedWorkflowStep[] = [];
  const notices: string[] = [];
  const blockingIssues: string[] = [];

  let currentDialect: SpiceDialect = req.inputModel.dialect;
  let previousOutputModelId: string | null = req.inputModel.modelId;
  const inputModel = req.inputModel;

  // Determine which tools are enabled in order
  const enabledTools = req.operationOrder.filter((tid) => req.enabledOps[tid]);
  let order = 0;

  // Add Input Model step
  steps.push({
    toolId: "benchmark",
    order: order++,
    label: "Input Model",
    inputDialect: currentDialect,
    outputDialect: currentDialect,
    inputModelIds: [],
    outputModelIds: [inputModel.modelId],
    status: "ready",
    messages: [],
    compatibilityActions: [],
    invocation: null,
  });

  let hasDataset = false;
  // Check if any fitting fixture data is available
  if (enabledTools.includes("fitting")) {
    const fittingParams = req.params["fitting"] ?? {};
    if ((fittingParams.trainParameters as string[] | undefined)?.length) {
      hasDataset = true;
    }
  }

  for (const toolId of enabledTools) {
    const capabilities = TOOL_CAPABILITIES[toolId]!;
    const toolParams = req.params[toolId] ?? {};
    const step: AnalyzedWorkflowStep = {
      toolId,
      order: order++,
      label: toolId === "translator" ? "Translator" : toolId === "reduction" ? "Reduction" : toolId === "expansion" ? "Expansion" : "Fitting",
      inputDialect: currentDialect,
      outputDialect: capabilities.outputDialect,
      inputModelIds: previousOutputModelId ? [previousOutputModelId] : [],
      outputModelIds: [`model-${toolId}-output`],
      status: "ready",
      messages: [],
      compatibilityActions: [],
      invocation: null,
    };

    // ── Dialect compatibility ──
    if (toolId === "translator") {
      const source = (toolParams.sourceDialect as SpiceDialect) ?? currentDialect;
      const target = (toolParams.targetDialect as SpiceDialect) ?? "ngspice";
      if (source === target) {
        step.status = "no-op";
        step.messages.push("Source and target dialect are the same. No translation needed.");
      }
      step.inputDialect = source;
      step.outputDialect = target;
    } else if (!capabilities.acceptedDialects.includes(currentDialect) && !capabilities.acceptedDialects.includes("auto" as never)) {
      // Need temporary compatibility conversion
      step.compatibilityActions.push({
        description: `Temporary conversion from ${currentDialect} to ngspice for ${step.label}`,
        sourceDialect: currentDialect,
        targetDialect: "ngspice",
        temporary: true,
      });
      step.inputDialect = "ngspice";
      step.messages.push(`Auto-generated compatibility conversion: ${currentDialect} → ngspice.`);
      notices.push(`Compatibility conversion inserted before ${step.label} (${currentDialect} → ngspice).`);
      currentDialect = "ngspice";
    }

    // ── Fitting: needs dataset ──
    if (toolId === "fitting" && !hasDataset) {
      step.status = "needs-input";
      step.messages.push("Fitting requires a measured dataset. None provided.");
      blockingIssues.push("Fitting is enabled but no measured dataset is available.");
    }

    // ── Expansion: multiple outputs ──
    if (toolId === "expansion" && capabilities.outputCardinality === "multiple") {
      step.outputModelIds = ["model-expansion-typical", "model-expansion-slow", "model-expansion-fast"];
      step.messages.push("Generates T/S/F corners. Typical corner used as primary output for downstream tools.");
    }

    // ── Build invocation ──
    try {
      const ctx = {
        invocationId: `analyzed-${toolId}-${order}`,
        workingDirectoryKey: "workspace",
        outputDirectoryKey: `${toolId}-output`,
        adapterVersion: "1.0.0",
      };

      // Use previous output model as input (sequential chaining)
      const inputModels: ModelArtifact[] = previousOutputModelId && previousOutputModelId !== inputModel.modelId
        ? [{ ...inputModel, modelId: previousOutputModelId }]
        : [inputModel];

      if (toolId === "translator") {
        step.invocation = translatorAdapter.buildInvocation(ctx, inputModels, {
          sourceDialect: (toolParams.sourceDialect as SpiceDialect) ?? currentDialect,
          targetDialect: (toolParams.targetDialect as SpiceDialect) ?? "ngspice",
          followIncludes: Boolean(toolParams.followIncludes ?? true),
          verify: Boolean(toolParams.verify ?? true),
          plot: Boolean(toolParams.plot ?? true),
          maxPlots: Number(toolParams.maxPlots ?? 10),
          preserveComments: Boolean(toolParams.preserveComments ?? false),
        }) as unknown as AnyInvocation;
      } else if (toolId === "reduction") {
        step.invocation = reductionAdapter.buildInvocation(ctx, inputModels, {
          errorTolerance: Number(toolParams.errorTolerance ?? 0.05),
          minParameters: Number(toolParams.minParameters ?? 10),
          maxIterations: Number(toolParams.maxIterations ?? 100),
          optimizationMethod: (toolParams.optimizationMethod as never) ?? "genetic_algorithm",
          reductionMethod: (toolParams.reductionMethod as never) ?? "sensitivity",
          testType: (toolParams.testType as never) ?? "dc_iv",
          deviceType: (toolParams.deviceType as "nmos") ?? "nmos",
          usePrebuiltNetlist: Boolean(toolParams.usePrebuiltNetlist ?? true),
        }) as unknown as AnyInvocation;
      } else if (toolId === "expansion") {
        step.invocation = expansionAdapter.buildInvocation(ctx, inputModels, {
          modelName: String(toolParams.modelName ?? "nmos_bsim4"),
          nSigma: Number(toolParams.nSigma ?? 3),
          generateTSF: Boolean(toolParams.generateTSF ?? true),
          runIv: Boolean(toolParams.runIv ?? true),
          runCv: Boolean(toolParams.runCv ?? true),
          monteCarlo: Boolean(toolParams.monteCarlo ?? false),
          mcSamples: Number(toolParams.mcSamples ?? 100),
          distribution: (toolParams.distribution as never) ?? "normal",
          seed: Number(toolParams.seed ?? 42),
          plot: Boolean(toolParams.plot ?? true),
        }) as unknown as AnyInvocation;
      } else if (toolId === "fitting") {
        step.invocation = fittingAdapter.buildInvocation(ctx, inputModels, {
          modelName: String(toolParams.modelName ?? "nmos_bsim4"),
          deviceType: (toolParams.deviceType as "nmos" | "pmos") ?? "nmos",
          simType: "dc",
          datasets: [],
          optimizer: (toolParams.optimizer as never) ?? "nelder_mead",
          maxIterations: Number(toolParams.maxIterations ?? 50),
          targetRelativeLoss: Number(toolParams.targetRelativeLoss ?? 0.3),
          outputFilename: String(toolParams.outputFilename ?? "calibrated.lib"),
          plot: Boolean(toolParams.plot ?? true),
          trainParameters: (toolParams.trainParameters as string[]) ?? ["vth0", "k1", "k2", "nfactor"],
          fixedParameters: (toolParams.fixedParameters as string[]) ?? [],
          lowerBounds: {},
          upperBounds: {},
        }) as unknown as AnyInvocation;
      }
    } catch (_e) {
      step.messages.push("Could not build invocation for this step.");
    }

    // Update chain state
    currentDialect = step.outputDialect;
    previousOutputModelId = step.outputModelIds[0] ?? null;

    steps.push(step);
  }

  // Add Benchmark step
  const benchmarkModelIds = [inputModel.modelId];
  if (previousOutputModelId && previousOutputModelId !== inputModel.modelId) {
    benchmarkModelIds.push(previousOutputModelId);
  }

  // Compatibility decks for simulators
  const compatibilityNotes: string[] = [];
  for (const sim of req.selectedSimulators) {
    if (sim !== "ngspice" && currentDialect !== sim) {
      compatibilityNotes.push(`Temporary ${sim} deck required for cross-simulator benchmark.`);
    }
  }

  steps.push({
    toolId: "benchmark",
    order,
    label: "Benchmark",
    inputDialect: currentDialect,
    outputDialect: currentDialect,
    inputModelIds: benchmarkModelIds,
    outputModelIds: [],
    status: "ready",
    messages: compatibilityNotes,
    compatibilityActions: compatibilityNotes.map((note, _i) => ({
      description: note,
      sourceDialect: currentDialect,
      targetDialect: "ngspice",
      temporary: true,
    })),
    invocation: null,
  });

  return {
    steps,
    finalPrimaryModelId: previousOutputModelId,
    benchmarkModelIds,
    blockingIssues,
    notices,
  };
}
