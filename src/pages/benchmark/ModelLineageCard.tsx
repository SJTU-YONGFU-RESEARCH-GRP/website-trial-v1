/* ==================================================================
 *  ModelLineageCard (goal.md §10)
 * ================================================================== */

import type { WorkflowScenario } from "../../compat/spiceWorkflow/contracts";
import { getModelLineage } from "../../data/benchmarkWorkspace/selectors";
import { DataOriginBadge } from "./shared/DataOriginBadge";

interface Props { scenario: WorkflowScenario; activeModelId: string | null; onSelect: (id: string) => void }

export function ModelLineageCard({ scenario, activeModelId, onSelect }: Props) {
  const lineage = getModelLineage(scenario, scenario.defaultCandidateModelId);
  if (lineage.length === 0) return null;

  return (
    <div className="chart-card" style={{ marginTop: "0.85rem" }}>
      <h2>Model Lineage</h2>
      <p className="hint">Click a node to select it for preview and comparison.</p>

      <div style={{
        display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center",
        marginTop: "0.5rem", padding: "0.5rem",
        background: "var(--surface-inset, #f9f9f9)", borderRadius: "8px",
      }}>
        {lineage.map((model, i) => (
          <span key={model.modelId} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            {i > 0 && <span style={{ color: "var(--muted, #999)", fontSize: "0.8rem" }}>→</span>}
            <button
              onClick={() => onSelect(model.modelId)}
              style={{
                padding: "0.3rem 0.55rem", borderRadius: "4px", border: activeModelId === model.modelId ? "2px solid var(--accent, #0071e3)" : "1px solid var(--border-light, #ddd)",
                background: activeModelId === model.modelId ? "var(--accent-bg, rgba(0,113,227,0.06))" : "#fff",
                cursor: "pointer", textAlign: "left", fontSize: "0.7rem",
                opacity: model.temporary ? 0.5 : 1,
              }}
            >
              <div style={{ fontWeight: 600 }}>{model.filename}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--muted, #888)" }}>
                {model.variant} · {model.dialect} · {model.parameterCount ?? "?"}p
              </div>
              {model.temporary && <div style={{ fontSize: "0.55rem", color: "var(--warn, #b85c00)" }}>temporary</div>}
              <DataOriginBadge origin={model.provenance.origin} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
