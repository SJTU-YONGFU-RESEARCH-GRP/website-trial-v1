/* ==================================================================
 *  OperationSelector (goal2.md §5)
 *  Four-column grid with settings inline in each card.
 * ================================================================== */

import { useState } from "react";
import { TOOL_CATALOG, CANONICAL_WORKFLOW_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import type { ToolId } from "../../compat/spiceWorkflow/contracts";
import { TranslatorSettings } from "./TranslatorSettings";
import { FittingSettings } from "./FittingSettings";
import { ReductionSettings } from "./ReductionSettings";
import { ExpansionSettings } from "./ExpansionSettings";
import "../../benchmark-workspace.css";

interface OperationSelectorProps {
  enabled: Record<string, boolean>;
  onChange: (toolId: string, enabled: boolean) => void;
  params: Record<string, Record<string, unknown>>;
  onParamsChange: (toolId: string, params: Record<string, unknown>) => void;
  scenarioMode: string;
}

const ORDER_LABELS: Record<ToolId, string> = {
  translator: "01", fitting: "02", reduction: "03", expansion: "04",
  benchmark: "05",
};

export function OperationSelector({ enabled, onChange, params, onParamsChange, scenarioMode: _scenarioMode }: OperationSelectorProps) {
  return (
    <div>
      <h3 className="flow-subsection-title">Select Operations</h3>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Choose which processing steps to apply. Execution order is fixed: Convert → Calibrate → Reduce → Expand → Benchmark.
      </p>

      <div className="bmw-operation-grid">
        {CANONICAL_WORKFLOW_ORDER.map((toolId) => (
          <OperationCard
            key={toolId}
            toolId={toolId}
            checked={enabled[toolId] ?? false}
            onToggle={(v) => onChange(toolId, v)}
            params={params[toolId] ?? {}}
            onParamsChange={(p) => onParamsChange(toolId, p)}
          />
        ))}
      </div>
    </div>
  );
}

function OperationCard({
  toolId, checked, onToggle, params, onParamsChange,
}: {
  toolId: ToolId;
  checked: boolean;
  onToggle: (v: boolean) => void;
  params: Record<string, unknown>;
  onParamsChange: (p: Record<string, unknown>) => void;
}) {
  const meta = TOOL_CATALOG[toolId];
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <article className={`bmw-operation-card ${checked ? "is-enabled" : "is-disabled"}`}>
      <header className="bmw-operation-card__header">
        <label className="bmw-operation-toggle">
          <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
          <span>{meta.label}</span>
        </label>
        <span className="bmw-operation-order">{ORDER_LABELS[toolId]}</span>
      </header>

      <p className="bmw-operation-card__summary">{meta.subtitle}</p>

      {meta.limitations.length > 0 && (
        <p className="hint" style={{ fontSize: "0.67rem", color: "var(--warn, #b85c00)", margin: "0 0 6px 0" }}>
          ⚠ {meta.limitations[0]}
        </p>
      )}

      {checked && (
        <div className="bmw-operation-card__settings">
          {toolId === "translator" && <TranslatorSettings params={params} onChange={onParamsChange} showAdvanced={false} />}
          {toolId === "fitting" && <FittingSettings params={params} onChange={onParamsChange} showAdvanced={false} />}
          {toolId === "reduction" && <ReductionSettings params={params} onChange={onParamsChange} showAdvanced={false} />}
          {toolId === "expansion" && <ExpansionSettings params={params} onChange={onParamsChange} showAdvanced={false} />}

          <details className="bmw-operation-advanced" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
            <summary>Advanced options</summary>
            <div className="bmw-advanced-body">
              {toolId === "translator" && <TranslatorSettings params={params} onChange={onParamsChange} showAdvanced={true} advancedOnly />}
              {toolId === "fitting" && <FittingSettings params={params} onChange={onParamsChange} showAdvanced={true} advancedOnly />}
              {toolId === "reduction" && <ReductionSettings params={params} onChange={onParamsChange} showAdvanced={true} advancedOnly />}
              {toolId === "expansion" && <ExpansionSettings params={params} onChange={onParamsChange} showAdvanced={true} advancedOnly />}
            </div>
          </details>
        </div>
      )}

      <footer className="bmw-operation-card__footer">
        <a href={meta.repoUrl} target="_blank" rel="noopener noreferrer">{meta.repoLabel}</a>
      </footer>
    </article>
  );
}
