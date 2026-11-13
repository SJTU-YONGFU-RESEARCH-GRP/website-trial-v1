import { useState } from "react";
import type { DtcoOptions, DtcoProcessCorner } from "../../../shared/contracts/dtco";
import { availableCorners, operatingBounds } from "./catalogHelpers";
import type { DtcoForm } from "./helpers";
export function DtcoConditions({ form, options, onChange }: { form: DtcoForm; options: DtcoOptions; onChange(patch: Partial<DtcoForm>): void }): JSX.Element {
  const [modes, setModes] = useState<Record<string, "fixed" | "sweep">>({});
  const operating = operatingBounds(options, form), corners = availableCorners(options, form);
  const control = (label: string, key: "temperatures" | "voltages" | "groundVoltages", fallback: string, hint: string) => {
    const value = form[key] ?? fallback, mode = modes[key] ?? (value.includes(",") ? "sweep" : "fixed");
    return <div className="dtco-condition"><label>{label} mode<select aria-label={label + " mode"} value={mode} onChange={event => {
      const next = event.target.value as "fixed" | "sweep"; setModes(current => ({ ...current, [key]: next }));
      if (next === "fixed") onChange({ [key]: value.split(",")[0]?.trim() ?? fallback });
    }}><option value="fixed">Fixed</option><option value="sweep">Sweep</option></select></label><label>{label}<input aria-label={label} type={mode === "fixed" ? "number" : "text"} step="any" value={value} onChange={event => onChange({ [key]: event.target.value })} /><small>{mode === "sweep" ? "Comma-separated values. " : "One value. "}{hint}</small></label></div>;
  };
  const selected = form.processCorners ?? ["tt"], cornerMode = modes.corners ?? (selected.length > 1 ? "sweep" : "fixed");
  return <div className="dtco-grid">
    {control("Temperatures (°C)", "temperatures", "25", operating.temperatureC.min + " to " + operating.temperatureC.max + " °C")}
    {control("Supply voltages (V)", "voltages", "3.3", "Absolute VDD. VDD − VSS must lie in the technology supply range.")}
    {control("Ground voltages VSS (V)", "groundVoltages", "0", "Absolute reference potential; applied to the actual circuit.")}
    <div className="dtco-condition"><label>Process corners mode<select aria-label="Process corners mode" value={cornerMode} onChange={event => {
      const next = event.target.value as "fixed" | "sweep"; setModes(current => ({ ...current, corners: next }));
      if (next === "fixed") onChange({ processCorners: [selected[0] ?? corners[0] ?? "tt"] });
    }}><option value="fixed">Fixed</option><option value="sweep">Sweep</option></select></label>{cornerMode === "fixed" ? <label>Process corner<select aria-label="Process corner" value={selected[0] ?? ""} onChange={event => onChange({ processCorners: [event.target.value as DtcoProcessCorner] })}>{corners.map(corner => <option key={corner} value={corner}>{corner.toUpperCase()}</option>)}</select></label> : <fieldset className="dtco-layouts"><legend>Process corners</legend>{corners.map(corner => <label key={corner}><input type="checkbox" checked={selected.includes(corner)} onChange={event => onChange({ processCorners: event.target.checked ? [...selected, corner] : selected.filter(value => value !== corner) })} />{corner.toUpperCase()}</label>)}</fieldset>}</div>
  </div>;
}
