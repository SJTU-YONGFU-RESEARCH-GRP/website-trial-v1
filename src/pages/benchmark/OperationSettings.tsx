/* ==================================================================
 *  OperationSettings (goal.md §6.4)
 *
 *  Renders settings panels only for enabled operations.
 *  Default: core params visible. Advanced: collapsible disclosure.
 * ================================================================== */

import { useState } from "react";
import { TranslatorSettings } from "./TranslatorSettings";
import { FittingSettings } from "./FittingSettings";
import { ReductionSettings } from "./ReductionSettings";
import { ExpansionSettings } from "./ExpansionSettings";

export interface OperationParams {
  [toolId: string]: Record<string, unknown>;
}

interface OperationSettingsProps {
  enabled: Record<string, boolean>;
  params: OperationParams;
  onParamsChange: (toolId: string, params: Record<string, unknown>) => void;
}

export function OperationSettings({ enabled, params, onParamsChange }: OperationSettingsProps) {
  const enabledOps = Object.entries(enabled).filter(([, v]) => v);

  if (enabledOps.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="flow-subsection-title">Operation Settings</h3>
        <p className="hint">No operations selected. Enable one or more operations above.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="flow-subsection-title">Operation Settings</h3>
      {enabledOps.map(([toolId]) => (
        <SettingsPanel
          key={toolId}
          toolId={toolId}
          params={params[toolId] ?? {}}
          onChange={(p) => onParamsChange(toolId, p)}
        />
      ))}
    </div>
  );
}

function SettingsPanel({
  toolId, params, onChange,
}: {
  toolId: string;
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="chart-card" style={{ marginBottom: "0.65rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "0.9rem", margin: 0 }}>{getOpLabel(toolId)} Settings</h3>
        <button className="benchmark-btn" onClick={() => setShowAdvanced(!showAdvanced)} style={{ fontSize: "0.7rem" }}>
          {showAdvanced ? "Hide advanced" : "Advanced options"}
        </button>
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        {toolId === "translator" && <TranslatorSettings params={params} onChange={onChange} showAdvanced={showAdvanced} />}
        {toolId === "fitting" && <FittingSettings params={params} onChange={onChange} showAdvanced={showAdvanced} />}
        {toolId === "reduction" && <ReductionSettings params={params} onChange={onChange} showAdvanced={showAdvanced} />}
        {toolId === "expansion" && <ExpansionSettings params={params} onChange={onChange} showAdvanced={showAdvanced} />}
      </div>
    </div>
  );
}

function getOpLabel(toolId: string): string {
  switch (toolId) {
    case "translator": return "Convert";
    case "fitting": return "Calibrate";
    case "reduction": return "Reduce";
    case "expansion": return "Expand";
    default: return toolId;
  }
}
