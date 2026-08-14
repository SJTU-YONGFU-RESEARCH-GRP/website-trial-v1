/* ==================================================================
 *  OperationSelector
 *  4-column grid, inline settings, formal tool names.
 * ================================================================== */

import { useState } from "react";
import { TOOL_CATALOG, DEFAULT_OPERATION_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import type { ProcessingToolId } from "../../compat/spiceWorkflow/contracts";
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
}

export function OperationSelector({
  enabled, onChange, params, onParamsChange,
}: OperationSelectorProps) {
  return (
    <div>
      <h3 className="flow-subsection-title">Select Operations</h3>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Enable tools to include them in the workflow. Benchmark always runs last.
      </p>

      <div className="bmw-operation-grid">
        {DEFAULT_OPERATION_ORDER.map((toolId) => (
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

/* ─── Operation Card ─── */

function OperationCard({
  toolId, checked, onToggle, params, onParamsChange,
}: {
  toolId: ProcessingToolId;
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
      </header>

      <p className="bmw-operation-card__summary">{meta.subtitle}</p>

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
