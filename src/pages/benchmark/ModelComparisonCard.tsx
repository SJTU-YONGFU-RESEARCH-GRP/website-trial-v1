/* ==================================================================
 *  ModelComparisonCard — v4
 *
 *  Each model+simulator combo is a separate selectable entry.
 *  No separate simulator tabs — simulator is part of the model ID.
 * ================================================================== */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { WorkflowScenario } from "../../compat/spiceWorkflow/contracts";
import { ReportViewerCard } from "./ReportViewerCard";

interface Props {
  scenario: WorkflowScenario;
}

export function ModelComparisonCard({ scenario }: Props) {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const selectableModels = useMemo(() => {
    return Object.values(scenario.models)
      .filter((m) => !m.temporary)
      .sort((a, b) => {
        // Sort by PDK, then type, then sim, then chain
        const pa = a.pdkSource ?? "";
        const pb = b.pdkSource ?? "";
        if (pa !== pb) return pa.localeCompare(pb);
        const ta = a.deviceType ?? "nmos";
        const tb = b.deviceType ?? "nmos";
        if (ta !== tb) return ta.localeCompare(tb);
        const sa = a.dialect ?? "ngspice";
        const sb = b.dialect ?? "ngspice";
        if (sa !== sb) return sa.localeCompare(sb);
        return (a.operationChain ?? "").localeCompare(b.operationChain ?? "");
      });
  }, [scenario]);

  const toggleModel = useCallback((mid: string) => {
    setSelectedModels((prev) => prev.includes(mid) ? prev.filter((m) => m !== mid) : [...prev, mid]);
  }, []);

  const clearAll = useCallback(() => setSelectedModels([]), []);

  const hasModels = selectedModels.length > 0;

  return (
    <div className="chart-card" id="model-comparison" style={{ marginTop: "0.85rem" }}>
      <h2>Cross-Model Comparison</h2>

      {/* Model selector */}
      <div className="bmw-cm-filters" style={{ marginBottom: "0.75rem" }}>
        <fieldset style={{ flex: "1 1 100%", minWidth: "260px" }}>
          <legend>Models ({selectableModels.length} available — 8 models × 3 simulators)</legend>
          <div className="bmw-multi-select" ref={dropdownRef}>
            <button
              className="bmw-multi-select-trigger"
              onClick={() => setDropdownOpen((o) => !o)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {selectedModels.length === 0
                ? "Select models…"
                : `${selectedModels.length} model${selectedModels.length > 1 ? "s" : ""} selected`}
              <span className="bmw-multi-select-arrow">{dropdownOpen ? "▲" : "▼"}</span>
            </button>
            {dropdownOpen && (
              <div className="bmw-multi-select-dropdown" onMouseDown={(e) => e.preventDefault()}>
                {selectableModels.map((m) => (
                  <label key={m.modelId} className="bmw-multi-select-option">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(m.modelId)}
                      onChange={() => toggleModel(m.modelId)}
                    />
                    <span className="bmw-multi-select-label">
                      <strong>{m.displayName}</strong>
                      <span className="bmw-multi-select-sub">
                        {m.operationChain ?? m.variant}
                      </span>
                      <span className="bmw-multi-select-sub" style={{ fontFamily: "monospace", fontSize: "0.58rem", color: "var(--muted, #999)", wordBreak: "break-all" }}>
                        UID: {m.checksum ?? "N/A"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        {hasModels && (
          <button className="benchmark-btn" onClick={clearAll} style={{ fontSize: "0.65rem", alignSelf: "flex-end" }}>
            Clear
          </button>
        )}
      </div>

      {!hasModels && (
        <div className="bmw-model-empty-state">
          Select at least one model to view benchmark verification report.
        </div>
      )}

      {/* Report with embedded images */}
      {hasModels && (
        <ReportViewerCard
          scenario={scenario}
          selectedModels={selectedModels}
        />
      )}
    </div>
  );
}
