/* ==================================================================
 *  WorkflowPlanCard (goal.md §6.5–§6.6)
 * ================================================================== */

import type { ToolId, SimulatorId } from "../../compat/spiceWorkflow/contracts";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { ToolInvocation } from "../../compat/spiceWorkflow/contracts";
import "../../benchmark-workspace.css";

interface WorkflowStep { toolId: ToolId; label: string; enabled: boolean }

interface CompatibilityNode { simulator: SimulatorId; dialect: string; temporary: boolean }

interface WorkflowPlanCardProps {
  steps: WorkflowStep[];
  compatibilityNodes?: CompatibilityNode[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invocationPreviews?: ToolInvocation<any>[];
}

export function WorkflowPlanCard({ steps, compatibilityNodes, invocationPreviews }: WorkflowPlanCardProps) {
  return (
    <div className="chart-card" id="workflow">
      <h3 className="flow-subsection-title">Workflow Plan</h3>
      <p className="hint">Fixed execution order: Convert → Calibrate → Reduce → Expand → Benchmark. Steps not selected are automatically skipped.</p>

      <div className="bmw-pipeline">
        <PipelineNode label="Input" active={true} />
        {steps.map((step) => (
          <span key={step.toolId} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="bmw-pipeline-arrow">→</span>
            <PipelineNode label={step.label} active={step.enabled} skipped={!step.enabled} />
          </span>
        ))}
      </div>

      {compatibilityNodes && compatibilityNodes.length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <p className="hint" style={{ fontSize: "0.7rem" }}>Temporary compatibility conversions for simulator-specific deck generation:</p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
            {compatibilityNodes.map((node) => (
              <span key={node.simulator} className="tr-badge tr-badge--partial" style={{ border: "1px dashed var(--border-light, #ccc)", background: "transparent", fontSize: "0.68rem" }}>
                temp {node.dialect} deck
              </span>
            ))}
          </div>
        </div>
      )}

      {invocationPreviews && invocationPreviews.length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <p className="hint" style={{ fontSize: "0.7rem", fontWeight: 600 }}>Invocation Preview (for future backend):</p>
          {invocationPreviews.map((inv) => (
            <div key={inv.invocationId} className="bmw-code-preview" style={{ marginTop: "0.3rem", maxHeight: "80px" }}>
              $ {inv.argv.join(" ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineNode({ label, active, skipped }: { label: string; active: boolean; skipped?: boolean }) {
  return (
    <span className={`tr-badge ${active ? "tr-badge--completed" : "tr-badge--partial"}`}
      style={{ opacity: skipped ? 0.4 : 1, fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}>
      {label}
    </span>
  );
}
