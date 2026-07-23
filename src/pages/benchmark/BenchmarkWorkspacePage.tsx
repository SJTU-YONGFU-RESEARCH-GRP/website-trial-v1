/* ==================================================================
 *  BenchmarkWorkspacePage — round 3 (goal3.md)
 *
 *  No Scenario. Input Model is the sole entry point.
 *  Formal names: Translator, Reduction, Expansion, Fitting.
 * ================================================================== */

import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  WorkflowScenario, SimulatorId, AnalysisDomain, ProcessingToolId,
} from "../../compat/spiceWorkflow/contracts";
import { INTEGRATED_DEMO_SCENARIO } from "../../data/benchmarkWorkspace";
import { DEFAULT_OPERATION_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import { ModelInputCard } from "./ModelInputCard";
import type { InputMode, LocalModelData } from "./ModelInputCard";
import { OperationSelector } from "./OperationSelector";
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
  const [selectedSimulators] = useState<SimulatorId[]>(["ngspice", "spectre", "hspice"]);
  const [selectedDomains] = useState<AnalysisDomain[]>(["dc", "ac", "transient", "noise"]);
  const [baselineModelId] = useState<string | null>(activeResultSet?.defaultInputModelId ?? null);
  const [candidateModelId] = useState<string | null>(activeResultSet?.defaultCandidateModelId ?? null);
  const [referenceSimulator] = useState<SimulatorId>("ngspice");

  return (
    <div>
      <ProvenanceBanner isBundled={isBundledModel} />

      {/* ═══ Workspace Header ═══ */}
      <div className="chart-card" style={{ marginBottom: "1rem", textAlign: "center" }}>
        <h2 style={{ marginBottom: "0.35rem" }}>SPICE Model Workflow &amp; Benchmark Workspace</h2>
        <p className="hint" style={{ maxWidth: "640px", marginInline: "auto" }}>
          Configure input model, select operations, and view cross-simulator benchmark results.
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
          enabled={enabledOps}
          onChange={handleOpToggle}
          params={opParams}
          onParamsChange={handleParamsChange}
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
          <OperationResults scenario={activeResultSet} enabledOps={enabledOps} operationOrder={DEFAULT_OPERATION_ORDER as unknown as ProcessingToolId[]} />
          <ArtifactTableCard scenario={activeResultSet} />
        </div>
      )}
    </div>
  );
}
