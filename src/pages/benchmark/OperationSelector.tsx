/* ==================================================================
 *  OperationSelector (goal3.md §2-§3)
 *  Sortable 4-column grid, inline settings, formal tool names.
 *  Uses @dnd-kit for drag reorder. No ⚠ emoji.
 * ================================================================== */

import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = operationOrder.indexOf(active.id as ProcessingToolId);
    const newIdx = operationOrder.indexOf(over.id as ProcessingToolId);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...operationOrder];
    next.splice(oldIdx, 1);
    next.splice(newIdx, 0, active.id as ProcessingToolId);
    onOrderChange(next);
  };

  // Context-based "sortable" needs all items, but grid distributes them via CSS.
  // Use a custom strategy: the items array drives sortable context order
  // but the CSS grid keeps the visual 4-column layout.
  return (
    <div>
      <h3 className="flow-subsection-title">Select Operations</h3>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Enable tools and drag to reorder. The workflow executes in the order shown. Benchmark always runs last.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={operationOrder} strategy={verticalListSortingStrategy}>
          <div className="bmw-operation-grid">
            {operationOrder.map((toolId) => (
              <SortableOperationCard
                key={toolId}
                toolId={toolId}
                checked={enabled[toolId] ?? false}
                onToggle={(v) => onChange(toolId, v)}
                params={params[toolId] ?? {}}
                onParamsChange={(p) => onParamsChange(toolId, p)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ─── Sortable Card Wrapper ─── */

function SortableOperationCard(props: {
  toolId: ProcessingToolId;
  checked: boolean;
  onToggle: (v: boolean) => void;
  params: Record<string, unknown>;
  onParamsChange: (p: Record<string, unknown>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.toolId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="bmw-sortable-wrapper">
      <OperationCardContent {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

/* ─── Card Content ─── */

function OperationCardContent({
  toolId, checked, onToggle, params, onParamsChange,
  dragHandleProps,
}: {
  toolId: ProcessingToolId;
  checked: boolean;
  onToggle: (v: boolean) => void;
  params: Record<string, unknown>;
  onParamsChange: (p: Record<string, unknown>) => void;
  dragHandleProps: Record<string, unknown>;
}) {
  const meta = TOOL_CATALOG[toolId];
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <article className={`bmw-operation-card ${checked ? "is-enabled" : "is-disabled"}`}>
      <header className="bmw-operation-card__header">
        <div className="bmw-operation-card__title-row">
          <button
            className="bmw-drag-handle"
            aria-label={`Drag ${meta.label} to reorder`}
            {...dragHandleProps}
          >
            <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true">
              <circle cx="3" cy="4" r="1.5" fill="currentColor" />
              <circle cx="9" cy="4" r="1.5" fill="currentColor" />
              <circle cx="3" cy="10" r="1.5" fill="currentColor" />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <circle cx="3" cy="16" r="1.5" fill="currentColor" />
              <circle cx="9" cy="16" r="1.5" fill="currentColor" />
            </svg>
          </button>
          <label className="bmw-operation-toggle">
            <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
            <span>{meta.label}</span>
          </label>
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
