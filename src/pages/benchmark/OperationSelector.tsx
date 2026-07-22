/* ==================================================================
 *  OperationSelector (goal3.md §2-§3)
 *  Sortable 4-column grid with native HTML5 drag-and-drop.
 *  Inline settings, formal tool names. No external dependencies.
 * ================================================================== */

import { useState, useCallback, type DragEvent } from "react";
import { TOOL_CATALOG } from "../../compat/spiceWorkflow/toolCatalog";
import type { ProcessingToolId } from "../../compat/spiceWorkflow/contracts";
import { TranslatorSettings } from "./TranslatorSettings";
import { FittingSettings } from "./FittingSettings";
import { ReductionSettings } from "./ReductionSettings";
import { ExpansionSettings } from "./ExpansionSettings";
import "../../benchmark-workspace.css";

interface OperationSelectorProps {
  operationOrder: ProcessingToolId[];
  onOrderChange: (order: ProcessingToolId[]) => void;
  enabled: Record<string, boolean>;
  onChange: (toolId: string, enabled: boolean) => void;
  params: Record<string, Record<string, unknown>>;
  onParamsChange: (toolId: string, params: Record<string, unknown>) => void;
}

export function OperationSelector({
  operationOrder, onOrderChange, enabled, onChange, params, onParamsChange,
}: OperationSelectorProps) {
  const [dragSrc, setDragSrc] = useState<ProcessingToolId | null>(null);

  const handleDragStart = useCallback((e: DragEvent, toolId: ProcessingToolId) => {
    setDragSrc(toolId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", toolId);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: DragEvent, targetId: ProcessingToolId) => {
    e.preventDefault();
    const srcId = dragSrc;
    setDragSrc(null);
    if (!srcId || srcId === targetId) return;
    const oldIdx = operationOrder.indexOf(srcId);
    const newIdx = operationOrder.indexOf(targetId);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...operationOrder];
    next.splice(oldIdx, 1);
    next.splice(newIdx, 0, srcId);
    onOrderChange(next);
  }, [operationOrder, onOrderChange, dragSrc]);

  const handleDragEnd = useCallback(() => {
    setDragSrc(null);
  }, []);

  const moveEarlier = useCallback((toolId: ProcessingToolId) => {
    const idx = operationOrder.indexOf(toolId);
    if (idx <= 0) return;
    const next = [...operationOrder];
    next.splice(idx, 1);
    next.splice(idx - 1, 0, toolId);
    onOrderChange(next);
  }, [operationOrder, onOrderChange]);

  const moveLater = useCallback((toolId: ProcessingToolId) => {
    const idx = operationOrder.indexOf(toolId);
    if (idx < 0 || idx >= operationOrder.length - 1) return;
    const next = [...operationOrder];
    next.splice(idx, 1);
    next.splice(idx + 1, 0, toolId);
    onOrderChange(next);
  }, [operationOrder, onOrderChange]);

  return (
    <div>
      <h3 className="flow-subsection-title">Select Operations</h3>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Enable tools and drag to reorder. The workflow executes in the order shown. Benchmark always runs last.
      </p>

      <div className="bmw-operation-grid">
        {operationOrder.map((toolId) => (
          <OperationCard
            key={toolId}
            toolId={toolId}
            checked={enabled[toolId] ?? false}
            onToggle={(v) => onChange(toolId, v)}
            params={params[toolId] ?? {}}
            onParamsChange={(p) => onParamsChange(toolId, p)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onMoveEarlier={() => moveEarlier(toolId)}
            onMoveLater={() => moveLater(toolId)}
            isFirst={operationOrder.indexOf(toolId) === 0}
            isLast={operationOrder.indexOf(toolId) === operationOrder.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Operation Card ─── */

function OperationCard({
  toolId, checked, onToggle, params, onParamsChange,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onMoveEarlier, onMoveLater, isFirst, isLast,
}: {
  toolId: ProcessingToolId;
  checked: boolean;
  onToggle: (v: boolean) => void;
  params: Record<string, unknown>;
  onParamsChange: (p: Record<string, unknown>) => void;
  onDragStart: (e: DragEvent, id: ProcessingToolId) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent, id: ProcessingToolId) => void;
  onDragEnd: () => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const meta = TOOL_CATALOG[toolId];
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <article
      className={`bmw-operation-card ${checked ? "is-enabled" : "is-disabled"}`}
      draggable
      onDragStart={(e) => onDragStart(e, toolId)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, toolId)}
      onDragEnd={onDragEnd}
    >
      <header className="bmw-operation-card__header">
        <div className="bmw-operation-card__title-row">
          <span
            className="bmw-drag-handle"
            aria-label={`Drag ${meta.label} to reorder`}
            title={`Drag ${meta.label} to reorder`}
          >
            <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true">
              <circle cx="3" cy="4" r="1.5" fill="currentColor" />
              <circle cx="9" cy="4" r="1.5" fill="currentColor" />
              <circle cx="3" cy="10" r="1.5" fill="currentColor" />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <circle cx="3" cy="16" r="1.5" fill="currentColor" />
              <circle cx="9" cy="16" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <label className="bmw-operation-toggle">
            <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
            <span>{meta.label}</span>
          </label>
        </div>
        {/* Move buttons for keyboard/accessibility */}
        <div className="bmw-move-btns">
          <button
            className="bmw-move-btn"
            onClick={(e) => { e.stopPropagation(); onMoveEarlier(); }}
            disabled={isFirst}
            aria-label={`Move ${meta.label} earlier`}
            title="Move earlier"
          >▲</button>
          <button
            className="bmw-move-btn"
            onClick={(e) => { e.stopPropagation(); onMoveLater(); }}
            disabled={isLast}
            aria-label={`Move ${meta.label} later`}
            title="Move later"
          >▼</button>
        </div>
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
