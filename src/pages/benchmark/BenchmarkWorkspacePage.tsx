/* ==================================================================
 *  BenchmarkWorkspacePage — round 2 convergence (goal2.md)
 *
 *  Removed: SectionAnchorNav, Legacy Browser, ModelLineage,
 *  DomainOverlay, Load-demo button, selectedModelForPreview.
 *  Results auto-display on page load.
 * ================================================================== */

import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  WorkflowScenario, SimulatorId, ToolId, ModelArtifact,
  ToolInvocation, AnalysisDomain,
} from "../../compat/spiceWorkflow/contracts";
import { INTEGRATED_DEMO_SCENARIO } from "../../data/benchmarkWorkspace";
import { TOOL_CATALOG, CANONICAL_WORKFLOW_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import { getSelectableModels } from "../../data/benchmarkWorkspace/selectors";
import { translatorAdapter } from "../../compat/spiceWorkflow/translatorAdapter";
import { fittingAdapter } from "../../compat/spiceWorkflow/fittingAdapter";
import { reductionAdapter } from "../../compat/spiceWorkflow/reductionAdapter";
import { expansionAdapter } from "../../compat/spiceWorkflow/expansionAdapter";
import { ScenarioSelector } from "./ScenarioSelector";
import type { ScenarioMode } from "./ScenarioSelector";
import { ModelInputCard } from "./ModelInputCard";
import type { InputMode, LocalModelData } from "./ModelInputCard";
import { OperationSelector } from "./OperationSelector";
type OperationParams = Record<string, Record<string, unknown>>;
import { WorkflowPlanCard } from "./WorkflowPlanCard";
import { BenchmarkSetupCard } from "./BenchmarkSetupCard";
import { ExecutiveSummaryCard } from "./ExecutiveSummaryCard";
import { SimulatorComparisonCard } from "./SimulatorComparisonCard";
import { ModelComparisonCard } from "./ModelComparisonCard";
import { ProcessedModelCard } from "./ProcessedModelCard";
import { OperationResults } from "./OperationResults";
import { ArtifactTableCard } from "./ArtifactTableCard";
import "../../benchmark.css";
import "../../benchmark-workspace.css";

type PreselectedOperation = "translator" | "reduction" | "expansion" | "fitting" | null;

/* ═══════════════════════════════════════════════════════════════ */
/*  Provenance Banner                                              */
/* ═══════════════════════════════════════════════════════════════ */

function ProvenanceBanner({ mode }: { scenario: WorkflowScenario | null; mode: ScenarioMode }) {
  return (
    <div className="bmw-provenance-banner">
      {mode === "integrated-demo" && (
        <><strong>Deterministic static demonstration.</strong> Existing repository outputs and synthetic comparison fixtures are labeled separately. No external tool is executed in this browser.</>
      )}
      {mode === "custom-local" && (
        <><strong>Local model — configured only.</strong> Your model stays in browser memory. Configure operations and preview invocation. No execution occurs.</>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Main Page                                                      */
/* ═══════════════════════════════════════════════════════════════ */

export function BenchmarkWorkspacePage() {
  const [searchParams] = useSearchParams();

  const preselectedOperation = useMemo((): PreselectedOperation => {
    const op = searchParams.get("operation");
    if (op === "translator" || op === "reduction" || op === "expansion" || op === "fitting") return op;
    return null;
  }, [searchParams]);

  /* ── Scenario ── */
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>("integrated-demo");
  const scenario: WorkflowScenario | null = scenarioMode === "integrated-demo" ? INTEGRATED_DEMO_SCENARIO : null;
  const shouldShowStaticResults = scenarioMode !== "custom-local" && scenario !== null;

  /* ── Model input ── */
  const [inputMode, setInputMode] = useState<InputMode>("bundled");
  const [bundledModelId, setBundledModelId] = useState<string | null>("bundled-bsim4-nmos-tt");
  const [localModel, setLocalModel] = useState<LocalModelData | null>(null);

  /* ── Operations ── */
  const [enabledOps, setEnabledOps] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of CANONICAL_WORKFLOW_ORDER) init[t] = true;
    if (preselectedOperation) {
      for (const t of CANONICAL_WORKFLOW_ORDER) init[t] = (t === preselectedOperation);
    }
    return init;
  });
  const [opParams, setOpParams] = useState<OperationParams>(() => {
    const init: OperationParams = {};
    for (const t of CANONICAL_WORKFLOW_ORDER) init[t] = {};
    return init;
  });

  const handleOpToggle = useCallback((toolId: string, enabled: boolean) => {
    setEnabledOps((prev) => ({ ...prev, [toolId]: enabled }));
  }, []);
  const handleParamsChange = useCallback((toolId: string, params: Record<string, unknown>) => {
    setOpParams((prev) => ({ ...prev, [toolId]: params }));
  }, []);

  /* ── Benchmark setup ── */
  const [selectedSimulators, setSelectedSimulators] = useState<SimulatorId[]>(["ngspice", "spectre", "hspice"]);
  const [selectedDomains, setSelectedDomains] = useState<AnalysisDomain[]>(["dc", "ac", "transient", "noise"]);
  const [benchmarkModelIds, setBenchmarkModelIds] = useState<string[]>(
    scenario ? [scenario.defaultInputModelId, scenario.defaultCandidateModelId] : [],
  );
  const [baselineModelId, setBaselineModelId] = useState<string | null>(scenario?.defaultInputModelId ?? null);
  const [candidateModelId, setCandidateModelId] = useState<string | null>(scenario?.defaultCandidateModelId ?? null);
  const [referenceSimulator, setReferenceSimulator] = useState<SimulatorId>("ngspice");
  const [showCornerModels, setShowCornerModels] = useState(false);

  /* ── Invocation previews (custom-local + integrated-demo) ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invocationPreviews = useMemo((): ToolInvocation<any>[] => {
    if (!scenario) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previews: ToolInvocation<any>[] = [];
    const contextBase = { workingDirectoryKey: "workspace", adapterVersion: "1.0.0" };
    let idx = 0;
    const inputModel = scenario.models[scenario.defaultInputModelId];
    if (!inputModel) return [];

    for (const toolId of CANONICAL_WORKFLOW_ORDER) {
      if (!enabledOps[toolId]) continue;
      const ctx = { ...contextBase, invocationId: `inv-preview-${toolId}-${idx++}`, outputDirectoryKey: `${toolId}-output` };
      if (toolId === "translator") {
        previews.push(translatorAdapter.buildInvocation(ctx, [inputModel], {
          sourceDialect: inputModel.dialect, targetDialect: "ngspice",
          followIncludes: true, verify: true, plot: true,
          maxPlots: Number(opParams.translator?.maxPlots ?? 10), preserveComments: false,
        }));
      } else if (toolId === "fitting") {
        previews.push(fittingAdapter.buildInvocation(ctx, [inputModel], {
          modelName: String(opParams.fitting?.modelName ?? "nmos_bsim4"),
          deviceType: (opParams.fitting?.deviceType as "nmos" | "pmos") ?? "nmos",
          simType: "dc", datasets: [],
          optimizer: (opParams.fitting?.optimizer as never) ?? "nelder_mead",
          maxIterations: Number(opParams.fitting?.maxIterations ?? 50),
          targetRelativeLoss: Number(opParams.fitting?.targetRelativeLoss ?? 0.3),
          outputFilename: String(opParams.fitting?.outputFilename ?? "calibrated.lib"),
          plot: Boolean(opParams.fitting?.plot ?? true),
          trainParameters: (opParams.fitting?.trainParameters as string[]) ?? ["vth0", "k1", "k2", "nfactor"],
          fixedParameters: (opParams.fitting?.fixedParameters as string[]) ?? [],
          lowerBounds: {}, upperBounds: {},
        }));
      } else if (toolId === "reduction") {
        previews.push(reductionAdapter.buildInvocation(ctx, [inputModel], {
          errorTolerance: Number(opParams.reduction?.errorTolerance ?? 0.05),
          minParameters: Number(opParams.reduction?.minParameters ?? 10),
          maxIterations: Number(opParams.reduction?.maxIterations ?? 100),
          optimizationMethod: (opParams.reduction?.optimizationMethod as never) ?? "genetic_algorithm",
          reductionMethod: (opParams.reduction?.reductionMethod as never) ?? "sensitivity",
          testType: (opParams.reduction?.testType as never) ?? "dc_iv",
          deviceType: (opParams.reduction?.deviceType as "nmos") ?? "nmos",
          usePrebuiltNetlist: Boolean(opParams.reduction?.usePrebuiltNetlist ?? true),
        }));
      } else if (toolId === "expansion") {
        previews.push(expansionAdapter.buildInvocation(ctx, [inputModel], {
          modelName: String(opParams.expansion?.modelName ?? "nmos_bsim4_red"),
          nSigma: Number(opParams.expansion?.nSigma ?? 3),
          generateTSF: Boolean(opParams.expansion?.generateTSF ?? true),
          runIv: Boolean(opParams.expansion?.runIv ?? true),
          runCv: Boolean(opParams.expansion?.runCv ?? true),
          monteCarlo: Boolean(opParams.expansion?.monteCarlo ?? false),
          mcSamples: Number(opParams.expansion?.mcSamples ?? 100),
          distribution: (opParams.expansion?.distribution as never) ?? "normal",
          seed: Number(opParams.expansion?.seed ?? 42),
          plot: Boolean(opParams.expansion?.plot ?? true),
        }));
      }
    }
    return previews;
  }, [scenario, enabledOps, opParams]);

  /* ── Workflow steps ── */
  const workflowSteps = useMemo(() => {
    const steps = CANONICAL_WORKFLOW_ORDER.map((toolId) => ({
      toolId, label: TOOL_CATALOG[toolId].label, enabled: enabledOps[toolId] ?? false,
    }));
    return [...steps, { toolId: "benchmark" as ToolId, label: "Benchmark", enabled: true }];
  }, [enabledOps]);

  /* ── Available models ── */
  const availableModels = useMemo((): ModelArtifact[] => {
    if (!scenario) return [];
    const models = getSelectableModels(scenario);
    if (!showCornerModels) return models.filter((m) => !m.variant.startsWith("corner-"));
    return models;
  }, [scenario, showCornerModels]);

  return (
    <div>
      <ProvenanceBanner scenario={scenario} mode={scenarioMode} />

      {/* ═══ Setup Card ═══ */}
      <div className="chart-card" id="setup" style={{ marginBottom: "0.85rem" }}>
        <h2>SPICE Model Workflow &amp; Benchmark Workspace</h2>
        <p className="hint">
          Configure input model, select operations, and view cross-simulator benchmark results.{" "}
          {preselectedOperation && (
            <span style={{ color: "var(--accent, #0071e3)", fontWeight: 600 }}>Pre-selected: {preselectedOperation}.</span>
          )}
        </p>

        <div style={{ marginTop: "0.75rem" }}>
          <ScenarioSelector mode={scenarioMode} onChange={setScenarioMode} />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <ModelInputCard
            mode={inputMode} onModeChange={setInputMode}
            bundledModelId={bundledModelId} onBundledModelChange={setBundledModelId}
            localModel={localModel} onLocalModelChange={setLocalModel}
          />
        </div>
      </div>

      {/* ═══ Select Operations (4-column grid + inline settings) ═══ */}
      <div className="chart-card" id="workflow" style={{ marginBottom: "0.85rem" }}>
        <OperationSelector enabled={enabledOps} onChange={handleOpToggle} scenarioMode={scenarioMode} params={opParams} onParamsChange={handleParamsChange} />
      </div>

      {/* ═══ Workflow Plan ═══ */}
      <WorkflowPlanCard
        steps={workflowSteps}
        invocationPreviews={invocationPreviews}
        compatibilityNodes={scenarioMode === "integrated-demo" ? [
          { simulator: "spectre" as SimulatorId, dialect: "spectre", temporary: true },
          { simulator: "hspice" as SimulatorId, dialect: "hspice", temporary: true },
        ] : undefined}
      />

      {/* ═══ Benchmark Setup ═══ */}
      <div style={{ marginTop: "0.85rem" }}>
        <BenchmarkSetupCard
          selectedSimulators={selectedSimulators} onSimulatorsChange={setSelectedSimulators}
          selectedDomains={selectedDomains as never} onDomainsChange={setSelectedDomains as never}
          benchmarkModelIds={benchmarkModelIds} onBenchmarkModelIdsChange={setBenchmarkModelIds}
          availableModels={availableModels}
          baselineModelId={baselineModelId} onBaselineChange={setBaselineModelId}
          candidateModelId={candidateModelId} onCandidateChange={setCandidateModelId}
          referenceSimulator={referenceSimulator} onReferenceSimulatorChange={setReferenceSimulator}
          showCornerModels={showCornerModels} onShowCornerModelsChange={setShowCornerModels}
        />
      </div>

      {/* ═══ Preview Workflow (custom-local only) ═══ */}
      {scenarioMode === "custom-local" && (
        <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="benchmark-btn" onClick={() => {}} style={{ padding: "0.5rem 1rem", fontWeight: 600 }}>
            Preview workflow
          </button>
          <div className="chart-card" style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: "var(--muted, #888)" }}>
            Execution is unavailable in this static build. Connect the future backend to run this exact invocation.
          </div>
        </div>
      )}

      {/* ═══ Static Results — auto-displayed ═══ */}
      {shouldShowStaticResults && scenario && (
        <div style={{ marginTop: "1rem" }}>
          <ExecutiveSummaryCard scenario={scenario} enabledOps={enabledOps} simulators={selectedSimulators} />
          <SimulatorComparisonCard scenario={scenario} modelId={candidateModelId ?? scenario.defaultCandidateModelId} simulators={selectedSimulators} domains={selectedDomains as never} referenceSimulator={referenceSimulator} />
          <ModelComparisonCard scenario={scenario} baselineId={baselineModelId} candidateId={candidateModelId} />
          <ProcessedModelCard scenario={scenario} modelId={candidateModelId ?? scenario.defaultCandidateModelId} baselineModelId={baselineModelId} />
          <OperationResults scenario={scenario} enabledOps={enabledOps} />
          <ArtifactTableCard scenario={scenario} />
        </div>
      )}

      {/* ═══ Custom-local: configured, not executed ═══ */}
      {scenarioMode === "custom-local" && (
        <div className="chart-card" style={{ marginTop: "1rem", textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Configured, not executed</p>
          <p className="hint">Your workflow configuration is complete. Execution requires the future backend.</p>
        </div>
      )}
    </div>
  );
}
