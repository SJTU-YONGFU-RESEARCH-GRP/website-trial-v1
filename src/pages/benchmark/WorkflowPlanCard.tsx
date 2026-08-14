/* ==================================================================
 *  WorkflowPlanCard (goal3.md §4)
 *  Only shows enabled steps in current drag order. Benchmark last.
 * ================================================================== */

import type { ProcessingToolId } from "../../compat/spiceWorkflow/contracts";
import { TOOL_CATALOG } from "../../compat/spiceWorkflow/toolCatalog";
import "../../benchmark-workspace.css";

interface WorkflowStep { toolId: string; label: string; enabled: boolean }

interface WorkflowPlanCardProps {
  steps: WorkflowStep[];
  operationOrder: ProcessingToolId[];
  enabledOps: Record<string, boolean>;
}

export function WorkflowPlanCard({ steps: _steps, operationOrder, enabledOps }: WorkflowPlanCardProps) {
  const enabledTools = operationOrder.filter((tid) => enabledOps[tid]);
  const summary = enabledTools.length > 0
    ? `Input Model → ${enabledTools.map((tid) => TOOL_CATALOG[tid].label).join(" → ")} → Benchmark`
    : "Input Model → Benchmark";

  const noToolsSelected = enabledTools.length === 0;

  return (
    <div className="chart-card" id="workflow" style={{ marginBottom: "1rem" }}>
      <h3 className="flow-subsection-title">Workflow Plan</h3>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Current plan: {summary}
      </p>

      {noToolsSelected && (
        <p className="hint" style={{ fontStyle: "italic" }}>
          No processing tool is selected. The input model will be benchmarked directly.
        </p>
      )}

      <div className="bmw-pipeline">
        <PipelineNode label="Input Model" />
        {enabledTools.map((toolId) => (
          <span key={toolId} className="bmw-pipeline-step">
            <span className="bmw-pipeline-arrow">→</span>
            <PipelineNode label={TOOL_CATALOG[toolId].label} />
          </span>
        ))}
        <span className="bmw-pipeline-step">
          <span className="bmw-pipeline-arrow">→</span>
          <PipelineNode label="Benchmark" />
        </span>
      </div>
    </div>
  );
}

function PipelineNode({ label }: { label: string }) {
  return (
    <span className="tr-badge tr-badge--completed" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>
      {label}
    </span>
  );
}
