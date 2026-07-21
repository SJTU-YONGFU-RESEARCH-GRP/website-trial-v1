/* ==================================================================
 *  OperationSelector (goal.md §6.3)
 * ================================================================== */

import { TOOL_CATALOG, CANONICAL_WORKFLOW_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import type { ToolId } from "../../compat/spiceWorkflow/contracts";
import "../../benchmark-workspace.css";

interface OperationSelectorProps {
  enabled: Record<string, boolean>;
  onChange: (toolId: string, enabled: boolean) => void;
  scenarioMode: string;
}

const OPERATION_TOOLS: ToolId[] = [...CANONICAL_WORKFLOW_ORDER];

export function OperationSelector({ enabled, onChange, scenarioMode: _scenarioMode }: OperationSelectorProps) {
  return (
    <div>
      <h3 className="flow-subsection-title">Select Operations</h3>
      <p className="hint">
        Choose which processing steps to apply. Execution order is fixed: Convert → Calibrate → Reduce → Expand → Benchmark.
      </p>

      <div className="tool-grid" style={{ marginTop: "0.5rem" }}>
        {OPERATION_TOOLS.map((toolId) => {
          const meta = TOOL_CATALOG[toolId];
          const checked = enabled[toolId] ?? false;
          return (
            <label
              key={toolId}
              className={`chart-card bmw-op-card${checked ? " bmw-op-card--selected" : ""}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <input
                  type="checkbox" checked={checked}
                  onChange={(e) => onChange(toolId, e.target.checked)}
                  style={{ flexShrink: 0 }}
                />
                <strong style={{ fontSize: "0.85rem" }}>{meta.label}</strong>
                {checked && (
                  <span style={{ color: "var(--accent, #0071e3)", fontSize: "0.7rem", marginLeft: "auto" }}>✓</span>
                )}
              </div>
              <p className="hint" style={{ fontSize: "0.72rem", margin: "0 0 0.3rem 0" }}>{meta.subtitle}</p>
              {meta.limitations.length > 0 && (
                <p className="hint" style={{ fontSize: "0.67rem", color: "var(--warn, #b85c00)", margin: 0 }}>
                  ⚠ {meta.limitations[0]}
                </p>
              )}
              <p className="hint" style={{ fontSize: "0.65rem", marginTop: "0.25rem" }}>
                <a href={meta.repoUrl} target="_blank" rel="noopener noreferrer">{meta.repoLabel}</a>
              </p>
            </label>
          );
        })}
      </div>
    </div>
  );
}
