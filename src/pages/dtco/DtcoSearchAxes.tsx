import type { DtcoOptimizationAxis, DtcoOptimizationDefinition, DtcoOptions } from "../../../shared/contracts/dtco";
import { catalogProfiles, operatingBounds, dimensionBounds, effectiveDimension } from "./catalogHelpers";
export interface DtcoSearchParameter { key: string; label: string; unit: string; value: number; min: number; max: number; step: number; grid?: number; locked: boolean; }
export function searchParameters(value: DtcoOptimizationDefinition, options: DtcoOptions): DtcoSearchParameter[] {
  const { circuit, technology } = catalogProfiles(options, value), operating = operatingBounds(options, value);
  const condition = (key: string, label: string, initial: number, min: number, max: number, step: number) => ({ key, label, unit: key === "temperatureC" ? "°C" : "V", value: initial, min, max, step, locked: min === max });
  const parameters: DtcoSearchParameter[] = [condition("temperatureC", "Temperature", value.temperatureC, operating?.temperatureC.min ?? -40, operating?.temperatureC.max ?? 125, operating?.temperatureC.step ?? 1),
    condition("voltageV", "VDD", value.voltageV, (operating?.supplyVoltageV.min ?? 2.7) + (value.groundVoltageV ?? 0), (operating?.supplyVoltageV.max ?? 3.6) + (value.groundVoltageV ?? 0), .05),
    condition("groundVoltageV", "VSS", value.groundVoltageV ?? 0, operating?.groundVoltageV?.min ?? 0, operating?.groundVoltageV?.max ?? 0, operating?.groundVoltageV?.step ?? .05)];
  if (!circuit || !technology) return parameters;
  for (const device of circuit.devices) {
    const family = technology.deviceFamilies.find(item => item.id === device.familyId);
    const resolved = effectiveDimension(device, circuit, value, family?.polarity);
    for (const dimension of ["widthUm", "lengthUm"] as const) {
      const bounds = dimensionBounds(options, value, device, dimension);
      if (bounds) parameters.push({ key: "device:" + device.id + ":" + dimension, label: device.id + (dimension === "widthUm" ? " width" : " length"), unit: "µm",
        value: resolved[dimension], ...bounds, grid: bounds.step, step: bounds.step ?? .01, locked: resolved[dimension === "widthUm" ? "lockWidth" : "lockLength"] || bounds.min === bounds.max });
    }
  }
  for (const group of circuit.groups) for (const dimension of ["widthUm", "lengthUm"] as const) {
    const members = parameters.filter(item => group.deviceIds.some(id => item.key === "device:" + id + ":" + dimension));
    if (members.length) parameters.push({ key: "group:" + group.id + ":" + dimension, label: group.id + " group " + (dimension === "widthUm" ? "width" : "length"), unit: "µm",
      value: value.groupOverrides?.[group.id]?.[dimension] ?? members[0].value, min: Math.max(...members.map(item => item.min)), max: Math.min(...members.map(item => item.max)),
      step: Math.max(...members.map(item => item.step)), grid: members.every(item => item.grid) ? Math.max(...members.map(item => item.grid!)) : undefined, locked: members.some(item => item.locked) || new Set(members.map(item => item.value)).size > 1 });
  }
  return parameters;
}
export function initializeParameterAxes(value: DtcoOptimizationDefinition, options: DtcoOptions): DtcoOptimizationDefinition {
  if (!options.circuitProfiles || value.parameterAxes) return value;
  const axes: Record<string, DtcoOptimizationAxis> = {};
  for (const parameter of searchParameters(value, options).filter(item => !item.key.startsWith("group:"))) axes[parameter.key] = { min: parameter.value, max: parameter.value, initial: parameter.value, step: parameter.step };
  const { circuit, technology } = catalogProfiles(options, value);
  if (circuit?.id === "gf180-inverter" && value.electricalMode !== "schematic" && !value.deviceOverrides && !value.groupOverrides) for (const device of circuit.devices) {
    const family = technology?.deviceFamilies.find(item => item.id === device.familyId), key = "device:" + device.id + ":widthUm";
    const legacy = family ? value.axes[family.polarity === "nmos" ? "nmosWidthUm" : "pmosWidthUm"] : undefined;
    const parameter = searchParameters(value, options).find(item => item.key === key);
    if (legacy && parameter && !parameter.locked && legacy.min >= parameter.min && legacy.max <= parameter.max) axes[key] = { ...legacy };
  }
  return { ...value, parameterAxes: axes };
}
export function DtcoSearchAxes({ value, options, onChange }: { value: DtcoOptimizationDefinition; options: DtcoOptions; onChange(axes: Record<string, DtcoOptimizationAxis>): void }): JSX.Element {
  const parameters = searchParameters(value, options), axes = value.parameterAxes ?? {};
  const edit = (key: string, axis: DtcoOptimizationAxis) => {
    const next = { ...axes, [key]: axis };
    const { circuit } = catalogProfiles(options, value);
    if (key.startsWith("group:")) {
      const [, id, dimension] = key.split(":");
      for (const deviceId of circuit?.groups.find(group => group.id === id)?.deviceIds ?? []) delete next["device:" + deviceId + ":" + dimension];
    } else if (key.startsWith("device:")) {
      const [, id, dimension] = key.split(":");
      for (const group of circuit?.groups.filter(group => group.deviceIds.includes(id)) ?? []) delete next["group:" + group.id + ":" + dimension];
    }
    onChange(next);
  };
  return <section aria-label="Optimization search variables"><h3>Search variables and locks</h3><p className="hint">A fixed axis has minimum = maximum. Source and sizing locks cannot be expanded. Group axes replace member device axes; each candidate is evaluated at the selected process corner.</p>
    <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Parameter</th><th>Search / lock</th><th>Minimum</th><th>Maximum</th><th>Initial</th><th>Step</th></tr></thead><tbody>{parameters.map(parameter => {
      const axis = axes[parameter.key] ?? { min: parameter.value, max: parameter.value, initial: parameter.value, step: parameter.step };
      const enabled = Boolean(axes[parameter.key]), searching = enabled && axis.min !== axis.max;
      return <tr key={parameter.key}><td>{parameter.label} ({parameter.unit})<small>Effective {parameter.min}–{parameter.max}{parameter.locked ? " · locked" : ""}</small></td><td><label className="dtco-inline-check"><input aria-label={"Search " + parameter.label} type="checkbox" checked={searching} disabled={parameter.locked} onChange={event => edit(parameter.key, event.target.checked ? { ...axis, min: parameter.min, max: parameter.max } : { ...axis, min: axis.initial, max: axis.initial })} />{parameter.locked ? "Locked" : searching ? "Variable" : "Fixed"}</label></td>{(["min", "max", "initial", "step"] as const).map(part => <td key={part}><input aria-label={parameter.label + " " + part + " (" + parameter.unit + ")"} type="number" step={parameter.step} disabled={parameter.locked || (part === "min" || part === "max") && !searching} value={Number.isFinite(axis[part]) ? axis[part] : ""} onChange={event => {
        const next = event.target.value === "" ? NaN : Number(event.target.value);
        edit(parameter.key, part === "initial" && !searching ? { ...axis, initial: next, min: next, max: next } : { ...axis, [part]: next });
      }} /></td>)}</tr>;
    })}</tbody></table></div>
  </section>;
}
