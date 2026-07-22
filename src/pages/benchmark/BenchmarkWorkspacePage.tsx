/* ==================================================================
 *  BenchmarkWorkspacePage — round 3 (goal3.md)
 *
 *  No Scenario. Input Model is the sole entry point.
 *  Formal names: Translator, Reduction, Expansion, Fitting.
 *  Draggable order via @dnd-kit.
 * ================================================================== */

import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  WorkflowScenario, SimulatorId, ModelArtifact, AnalysisDomain,
} from "../../compat/spiceWorkflow/contracts";
import type { ProcessingToolId } from "../../compat/spiceWorkflow/contracts";
import { INTEGRATED_DEMO_SCENARIO } from "../../data/benchmarkWorkspace";
import { TOOL_CATALOG, DEFAULT_OPERATION_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import { getSelectableModels } from "../../data/benchmarkWorkspace/selectors";
import { ModelInputCard } from "./ModelInputCard";
import type { InputMode, LocalModelData } from "./ModelInputCard";
import { OperationSelector } from "./OperationSelector";
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

const DEFAULT_RESULT_SET = INTEGRATED_DEMO_SCENARIO as WorkflowScenario;
type PreselectedOperation = "translator" | "reduction" | "expansion" | "fitting" | null;

function ProvenanceBanner({ isBundled }: { isBundled: boolean }) {
  return (
    <div className="bmw-provenance-banner">
      {isBundled ? (
        <><strong>Deterministic static demonstration.</strong> Existing repository outputs and synthetic comparison fixtures are labeled separately. No external tool is executed in this browser.</>
      ) : (
        <><strong>Local model — configured only.</strong> Your model stays in browser memory. Configure operations and preview invocation. No execution occurs.</>
      )}
    </div>
  );
}

export function BenchmarkWorkspacePage() {
  const [searchParams] = useSearchParams();

  const preselectedOperation = useMemo((): PreselectedOperation => {
    const op = searchParams.get("operation");
    if (op === "translator" || op === "reduction" || op === "expansion" || op === "fitting") return op;
    return null;
  }, [searchParams]);

  /* ── Input Model (sole entry point) ── */
  const [inputMode, setInputMode] = useState<InputMode>("bundled");
  const [bundledModelId, setBundledModelId] = useState<string | null>("bundled-bsim4-nmos-tt");
  const [localModel, setLocalModel] = useState<LocalModelData | null>(null);
  const isBundledModel = inputMode === "bundled";
  const activeResultSet: WorkflowScenario | null = isBundledModel ? DEFAULT_RESULT_SET : null;

  /* ── Operation Order (draggable) ── */
  const [operationOrder, setOperationOrder] = useState<ProcessingToolId[]>(
    [...DEFAULT_OPERATION_ORDER] as ProcessingToolId[],
  );

  /* ── Operations enabled + params ── */
  const [enabledOps, setEnabledOps] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of DEFAULT_OPERATION_ORDER) init[t] = true;
    if (preselectedOperation) {
      for (const t of DEFAULT_OPERATION_ORDER) init[t] = (t === preselectedOperation);
    }
    return init;
  });
  const [opParams, setOpParams] = useState<Record<string, Record<string, unknown>>>(() => {
    const init: Record<string, Record<string, unknown>> = {};
    for (const t of DEFAULT_OPERATION_ORDER) init[t] = {};
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
    activeResultSet ? [activeResultSet.defaultInputModelId, activeResultSet.defaultCandidateModelId] : [],
  );
  const [baselineModelId, setBaselineModelId] = useState<string | null>(activeResultSet?.defaultInputModelId ?? null);
  const [candidateModelId, setCandidateModelId] = useState<string | null>(activeResultSet?.defaultCandidateModelId ?? null);
  const [referenceSimulator, setReferenceSimulator] = useState<SimulatorId>("ngspice");
  const [showCornerModels, setShowCornerModels] = useState(false);

  /* ── Workflow Plan (only enabled, current order) ── */
  const workflowSteps = useMemo(() => {
    const enabled = operationOrder.filter((tid) => enabledOps[tid]);
    return [
      ...enabled.map((tid) => ({ toolId: tid as never, label: TOOL_CATALOG[tid].label, enabled: true })),
      { toolId: "benchmark" as never, label: "Benchmark", enabled: true },
    ];
  }, [operationOrder, enabledOps]);

  /* ── Available models ── */
  const availableModels = useMemo((): ModelArtifact[] => {
    if (!activeResultSet) return [];
    const models = getSelectableModels(activeResultSet);
    if (!showCornerModels) return models.filter((m) => !m.variant.startsWith("corner-"));
    return models;
  }, [activeResultSet, showCornerModels]);

  return (
    <div>
      <ProvenanceBanner isBundled={isBundledModel} />

      {/* ═══ Workspace Header ═══ */}
      <div className="chart-card" style={{ marginBottom: "1rem", textAlign: "center" }}>
        <h2 style={{ marginBottom: "0.35rem" }}>SPICE Model Workflow &amp; Benchmark Workspace</h2>
        <p className="hint" style={{ maxWidth: "640px", marginInline: "auto" }}>
          Configure input model, select and reorder processing tools, and view cross-simulator benchmark results.
        </p>
      </div>

      {/* ═══ Input Model ═══ */}
      <div className="chart-card" style={{ marginBottom: "1rem" }}>
        <h2>Input Model</h2>
        <ModelInputCard
          mode={inputMode} onModeChange={setInputMode}
          bundledModelId={bundledModelId} onBundledModelChange={setBundledModelId}
          localModel={localModel} onLocalModelChange={setLocalModel}
        />
      </div>

      {/* ═══ Select Operations ═══ */}
      <div className="chart-card" style={{ marginBottom: "1rem" }}>
        <OperationSelector
          operationOrder={operationOrder}
          onOrderChange={setOperationOrder}
          enabled={enabledOps}
          onChange={handleOpToggle}
          params={opParams}
          onParamsChange={handleParamsChange}
        />
      </div>

      {/* ═══ Workflow Plan ═══ */}
      <WorkflowPlanCard
        steps={workflowSteps}
        operationOrder={operationOrder}
        enabledOps={enabledOps}
      />

      {/* ═══ Benchmark Setup ═══ */}
      <div style={{ marginTop: "1rem" }}>
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

      {/* ═══ Local model: configured-only ═══ */}
      {!isBundledModel && (
        <div style={{ marginTop: "1rem" }}>
          <div className="chart-card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Configured, not executed</p>
            <p className="hint">Your workflow configuration is complete. Execution requires the future backend.</p>
          </div>
        </div>
      )}

      {/* ═══ Static Results (bundled model) ═══ */}
      {isBundledModel && activeResultSet && (
        <div style={{ marginTop: "1rem" }}>
          <ExecutiveSummaryCard scenario={activeResultSet} enabledOps={enabledOps} simulators={selectedSimulators} />
          <SimulatorComparisonCard scenario={activeResultSet} modelId={candidateModelId ?? activeResultSet.defaultCandidateModelId} simulators={selectedSimulators} domains={selectedDomains as never} referenceSimulator={referenceSimulator} />
          <ModelComparisonCard scenario={activeResultSet} baselineId={baselineModelId} candidateId={candidateModelId} />
          <ProcessedModelCard scenario={activeResultSet} modelId={candidateModelId ?? activeResultSet.defaultCandidateModelId} baselineModelId={baselineModelId} />
          <OperationResults scenario={activeResultSet} enabledOps={enabledOps} />
          <ArtifactTableCard scenario={activeResultSet} />
        </div>
      )}
    </div>
  );
}
