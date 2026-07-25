/* ==================================================================
 *  BenchmarkWorkspacePage — v4
 *
 *  Auto-discovers models from data/spice-benchmark/manifest.json.
 *  No hardcoded model lists. Purely data-driven.
 * ================================================================== */

import { useEffect, useState } from "react";
import type {
  WorkflowScenario, SimulatorId, AnalysisDomain, ProcessingToolId,
} from "../../compat/spiceWorkflow/contracts";
import { DEFAULT_OPERATION_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import { buildScenario } from "../../data/benchmarkWorkspace/dataLoader";
import { ExecutiveSummaryCard } from "./ExecutiveSummaryCard";
import { SimulatorComparisonCard } from "./SimulatorComparisonCard";
import { ModelComparisonCard } from "./ModelComparisonCard";
import { OperationResults } from "./OperationResults";
import { ArtifactTableCard } from "./ArtifactTableCard";
import "../../benchmark.css";
import "../../benchmark-workspace.css";

export function BenchmarkWorkspacePage() {
  const [scenario, setScenario] = useState<WorkflowScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    buildScenario()
      .then(setScenario)
      .catch((e) => setError(`Failed to load benchmark data: ${e.message}`));
  }, []);

  if (error) {
    return (
      <div className="chart-card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2>Error</h2>
        <p style={{ color: "var(--error, #c53030)" }}>{error}</p>
      </div>
    );
  }

  // Static mode: onOrderChange not needed
  if (!scenario) {
    return (
      <div className="chart-card" style={{ textAlign: "center", padding: "3rem" }}>
        <p>Loading benchmark data…</p>
      </div>
    );
  }

  const enabledOps: Record<string, boolean> = {};
  for (const t of DEFAULT_OPERATION_ORDER) enabledOps[t] = true;

  const selectedSimulators: SimulatorId[] = ["ngspice", "spectre", "hspice"];
  const selectedDomains: AnalysisDomain[] = ["dc", "ac", "transient", "noise"];
  const candidateModelId = scenario.defaultCandidateModelId;
  const referenceSimulator: SimulatorId = "ngspice";

  return (
    <div>
      <ExecutiveSummaryCard scenario={scenario} enabledOps={enabledOps} simulators={selectedSimulators} />
      <SimulatorComparisonCard scenario={scenario} modelId={candidateModelId} simulators={selectedSimulators} domains={selectedDomains} referenceSimulator={referenceSimulator} />
      <ModelComparisonCard scenario={scenario} />
      <OperationResults scenario={scenario} enabledOps={enabledOps} operationOrder={DEFAULT_OPERATION_ORDER as unknown as ProcessingToolId[]} />
      <ArtifactTableCard scenario={scenario} />
    </div>
  );
}
