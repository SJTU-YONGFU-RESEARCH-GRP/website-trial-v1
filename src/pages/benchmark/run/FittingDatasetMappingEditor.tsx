import type { JsonObject } from "../../../../shared/contracts/v1";
import type { BrowserInputFile } from "../../../api/benchmark";

interface FittingDatasetMappingEditorProps {
  files: BrowserInputFile[];
  value: JsonObject;
  disabled?: boolean;
  onChange(value: JsonObject): void;
}

function numericValue(value: unknown): string | number {
  return typeof value === "number" ? value : "";
}

export function FittingDatasetMappingEditor({ files, value, disabled, onChange }: FittingDatasetMappingEditorProps) {
  const datasets = files.filter((file) => file.role === "measured-csv");
  if (!datasets.length) return null;
  const change = (path: string, key: string, next: string | number) => {
    const current = value[path];
    const mapping = current && typeof current === "object" && !Array.isArray(current) ? current as JsonObject : {};
    const updated = next === "" ? Object.fromEntries(Object.entries(mapping).filter(([entry]) => entry !== key)) : { ...mapping, [key]: next };
    onChange({ ...value, [path]: updated });
  };
  return (
    <details className="benchmark-tool-parameters" open>
      <summary><span>Fitting dataset mapping</span><small>Repeated --dataset specifications</small></summary>
      <p className="benchmark-run-help">Choose the measured sweep and provide at least one fixed Vgs/Vds/Vbs bias when it is not a constant CSV column.</p>
      <div className="benchmark-dataset-list">
        {datasets.map((file) => {
          const current = value[file.relativePath];
          const mapping = current && typeof current === "object" && !Array.isArray(current) ? current as JsonObject : {};
          return (
            <fieldset key={file.relativePath} disabled={disabled}>
              <legend>{file.relativePath}</legend>
              <label><span>Sweep</span><select value={typeof mapping.sweep === "string" ? mapping.sweep : "vgs"} onChange={(event) => change(file.relativePath, "sweep", event.target.value)}><option value="vgs">Vgs</option><option value="vds">Vds</option><option value="vbs">Vbs</option></select></label>
              {(["start", "stop", "step", "vgs", "vds", "vbs", "W", "L", "temp"] as const).map((key) => (
                <label key={key}><span>{key}</span><input type="number" step="any" value={numericValue(mapping[key])} placeholder={["vgs", "vds", "vbs"].includes(key) ? "fixed bias" : "optional"} onChange={(event) => change(file.relativePath, key, event.target.value === "" ? "" : Number(event.target.value))} /></label>
              ))}
            </fieldset>
          );
        })}
      </div>
    </details>
  );
}
