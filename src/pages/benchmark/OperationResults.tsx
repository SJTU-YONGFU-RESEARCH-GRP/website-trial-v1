/* ==================================================================
 *  OperationResults (goal.md §15)
 *  Accordion panels for each enabled operation's execution result.
 * ================================================================== */

import { useState } from "react";
import type { WorkflowScenario, ToolId } from "../../compat/spiceWorkflow/contracts";
import { TOOL_CATALOG } from "../../compat/spiceWorkflow/toolCatalog";
import { DataOriginBadge } from "./shared/DataOriginBadge";
import { StatusBadge } from "./shared/StatusBadge";

interface Props { scenario: WorkflowScenario; enabledOps: Record<string, boolean> }

export function OperationResults({ scenario, enabledOps }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const opResults: { toolId: ToolId; label: string; executionId: string | null }[] = [
    { toolId: "translator", label: "Translation Result", executionId: "exec-translator" },
    { toolId: "fitting", label: "Calibration Result", executionId: "exec-fitting" },
    { toolId: "reduction", label: "Reduction Result", executionId: "exec-reduction" },
    { toolId: "expansion", label: "Expansion Result", executionId: "exec-expansion" },
  ];

  const visible = opResults.filter((op) => enabledOps[op.toolId]);

  if (visible.length === 0) return null;

  return (
    <div id="tool-results" style={{ marginTop: "0.85rem" }}>
      <h2>Operation Results</h2>
      {visible.map((op) => {
        const exec = op.executionId ? scenario.executions[op.executionId] : null;
        const isOpen = expanded[op.toolId] ?? false;
        const meta = TOOL_CATALOG[op.toolId];

        return (
          <div key={op.toolId} className="chart-card" style={{ marginBottom: "0.5rem" }}>
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [op.toolId]: !isOpen }))}
              style={{
                width: "100%", textAlign: "left", border: "none", background: "none",
                cursor: "pointer", padding: 0, display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
              aria-expanded={isOpen}
            >
              <div>
                <h3 style={{ fontSize: "0.9rem", margin: 0 }}>{op.label}</h3>
                <p className="hint" style={{ margin: "0.1rem 0 0 0", fontSize: "0.68rem" }}>
                  {meta.repoLabel} · {exec ? <StatusBadge status={exec.status === "completed" ? "completed" : exec.status} /> : "No data"}
                </p>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted, #888)" }}>{isOpen ? "▴" : "▾"}</span>
            </button>

            {isOpen && exec && (
              <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-light, #e5e5e5)", paddingTop: "0.5rem" }}>
                {/* KPI summary */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  {Object.entries(exec.metrics).map(([k, v]) => (
                    <span key={k} className="tr-badge tr-badge--completed" style={{ fontSize: "0.65rem" }}>
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>

                {/* Warnings / Errors */}
                {exec.warnings.length > 0 && (
                  <div style={{ marginBottom: "0.35rem" }}>
                    {exec.warnings.map((w, i) => <p key={i} className="hint" style={{ fontSize: "0.68rem", color: "var(--warn, #b85c00)" }}>⚠ {w}</p>)}
                  </div>
                )}
                {exec.errors.length > 0 && (
                  <div style={{ marginBottom: "0.35rem" }}>
                    {exec.errors.map((e, i) => <p key={i} className="hint" style={{ fontSize: "0.68rem", color: "var(--fail, #ef4444)" }}>❌ {e}</p>)}
                  </div>
                )}

                {/* Artifacts */}
                {exec.artifactIds.length > 0 && (
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.72rem", marginBottom: "0.25rem" }}>Artifacts ({exec.artifactIds.length})</p>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      {exec.artifactIds.map((aId) => {
                        const a = scenario.artifacts[aId];
                        return a ? (
                          <span key={aId} className="tr-badge tr-badge--partial" style={{ fontSize: "0.62rem" }}>
                            {a.name} ({a.kind})
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Provenance */}
                <div style={{ marginTop: "0.35rem" }}>
                  <DataOriginBadge origin={exec.provenance.origin} />
                  {exec.provenance.note && <span style={{ fontSize: "0.62rem", color: "var(--muted, #888)", marginLeft: "0.35rem" }}>{exec.provenance.note}</span>}
                </div>

                {/* Invocation */}
                {scenario.invocations[exec.invocationId] && (
                  <div style={{ marginTop: "0.35rem" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.68rem", marginBottom: "0.15rem" }}>Invocation</p>
                    <pre style={{ fontSize: "0.6rem", background: "var(--surface-inset, #f5f5f7)", padding: "0.3rem 0.4rem", borderRadius: "4px", overflow: "auto", maxHeight: "60px" }}>
                      $ {scenario.invocations[exec.invocationId].argv.join(" ")}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {isOpen && !exec && (
              <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-light, #e5e5e5)", paddingTop: "0.5rem" }}>
                <p className="hint">No execution data available for this operation in the current scenario.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
