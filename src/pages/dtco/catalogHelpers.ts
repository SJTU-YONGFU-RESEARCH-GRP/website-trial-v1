import type { DtcoCircuitDevice, DtcoCircuitProfile, DtcoDimensionOverride, DtcoExperimentDefinition, DtcoNumericBounds, DtcoOptimizationDefinition, DtcoOptions, DtcoProcessCorner } from "../../../shared/contracts/dtco";

export type CatalogSelection = Pick<DtcoExperimentDefinition, "technologyId" | "modelVersion" | "circuitId">;
export function catalogProfiles(options: DtcoOptions, value: CatalogSelection) {
  return {
    technology: options.technologyProfiles?.find(item => item.id === value.technologyId),
    model: options.modelProfiles?.find(item => item.id === value.modelVersion),
    circuit: options.circuitProfiles?.find(item => item.id === value.circuitId),
  };
}
export function operatingBounds(options: DtcoOptions, value: CatalogSelection) {
  const { technology, model } = catalogProfiles(options, value);
  return { supplyVoltageV: model?.operatingBounds?.supplyVoltageV ?? technology?.operatingBounds.supplyVoltageV ?? { min: 2.7, max: 3.6 },
    temperatureC: model?.operatingBounds?.temperatureC ?? technology?.operatingBounds.temperatureC ?? { min: -40, max: 125 }, groundVoltageV: technology?.operatingBounds.groundVoltageV };
}
export function compatibleModels(options: DtcoOptions, technologyId: string) {
  const technology = options.technologyProfiles?.find(item => item.id === technologyId);
  return options.models.filter(item => item.technologyId === technologyId && (!technology || !options.modelProfiles || technology.modelIds.includes(options.modelProfiles.find(model => model.id === item.id)?.modelId ?? "")));
}
export function compatibleCircuits(options: DtcoOptions, value: CatalogSelection) {
  const model = options.modelProfiles?.find(item => item.id === value.modelVersion);
  return options.circuits.filter(item => {
    const profile = options.circuitProfiles?.find(circuit => circuit.id === item.id);
    return !options.circuitProfiles || Boolean(profile && profile.technologyIds.includes(value.technologyId) && model && profile.modelIds.includes(model.modelId));
  });
}
export function chooseCatalogSelection(options: DtcoOptions, value: CatalogSelection, key: keyof CatalogSelection, id: string): CatalogSelection {
  const next = { ...value, [key]: id };
  const models = compatibleModels(options, next.technologyId);
  if (!models.some(item => item.id === next.modelVersion)) next.modelVersion = (models.find(item => item.available) ?? models[0])?.id ?? "";
  const circuits = compatibleCircuits(options, next);
  if (!circuits.some(item => item.id === next.circuitId)) next.circuitId = (circuits.find(item => item.available) ?? circuits[0])?.id ?? "";
  return next;
}
export function circuitDefaults(options: DtcoOptions, value: CatalogSelection) {
  const { circuit } = catalogProfiles(options, value);
  if (!circuit) return {};
  const electricalMode = circuit.electricalModes.includes("extracted") ? "extracted" as const : circuit.electricalModes[0];
  return { sizingMode: circuit.sizingModes.includes("custom") ? "custom" as const : "fixed" as const, electricalMode,
    ...(circuit.layoutIds.length === 1 && circuit.layoutIds[0] === "schematic-only" ? { workflow: "direct" as const } : {}),
    layoutIds: circuit.layoutIds.filter(id => options.layouts.some(layout => layout.id === id && layout.available)).slice(0, 1),
    characterizationArcId: circuit.arcs[0]?.id, design: undefined, deviceOverrides: undefined, groupOverrides: undefined };
}
export function availableCorners(options: DtcoOptions, value: CatalogSelection): DtcoProcessCorner[] {
  const { model } = catalogProfiles(options, value);
  return model ? Object.keys(model.cornerSections) as Array<"tt" | "ss" | "ff" | "fs" | "sf"> : ["tt"];
}
export function effectiveDimension(device: DtcoCircuitDevice, circuit: DtcoCircuitProfile, value: Pick<DtcoExperimentDefinition, "deviceOverrides" | "groupOverrides" | "design" | "sizingMode">, polarity?: "nmos" | "pmos") {
  const group = circuit.groups.filter(group => group.deviceIds.includes(device.id)).reduce<DtcoDimensionOverride>((result, group) => ({ ...result, ...value.groupOverrides?.[group.id] }), {});
  const override = { ...group, ...value.deviceOverrides?.[device.id] };
  return { ...device, ...override, widthUm: override.widthUm ?? (value.design && polarity ? value.design[polarity === "nmos" ? "nmosWidthUm" : "pmosWidthUm"] : device.widthUm),
    lengthUm: override.lengthUm ?? device.lengthUm, lockWidth: value.sizingMode === "fixed" || device.lockWidth || override.lockWidth || false,
    lockLength: value.sizingMode === "fixed" || device.lockLength || override.lockLength || false };
}
export function dimensionBounds(options: DtcoOptions, value: CatalogSelection & Pick<DtcoExperimentDefinition, "electricalMode">, device: DtcoCircuitDevice, dimension: "widthUm" | "lengthUm"): DtcoNumericBounds | undefined {
  const { technology, circuit } = catalogProfiles(options, value);
  const family = technology?.deviceFamilies.find(item => item.id === device.familyId);
  if (!family) return undefined;
  const base = family[dimension];
  const tool = value.electricalMode === "extracted" ? dimension === "lengthUm" ? circuit?.layoutToolBounds?.lengthUm : circuit?.layoutToolBounds?.[family.polarity === "nmos" ? "nmosWidthUm" : "pmosWidthUm"] : undefined;
  return tool ? { min: Math.max(base.min, tool.min), max: Math.min(base.max, tool.max), step: tool.step ?? base.step } : base;
}
export function validateCatalogDimensions(options: DtcoOptions, value: CatalogSelection & Pick<DtcoExperimentDefinition, "deviceOverrides" | "groupOverrides" | "design" | "sizingMode" | "electricalMode" | "characterizationArcId" | "layoutIds">): string | null {
  const { technology, model, circuit } = catalogProfiles(options, value);
  if (!options.circuitProfiles) return null;
  if (!technology || !model || !circuit || !compatibleCircuits(options, value).some(item => item.id === value.circuitId)) return "Select a compatible technology, model and circuit.";
  if (![technology, model, circuit].every(item => item.available)) return "The selected technology, model or circuit is unavailable.";
  const mode = value.sizingMode ?? (circuit.sizingModes.includes("custom") ? "custom" : "fixed");
  if (!circuit.sizingModes.includes(mode)) return "This sizing mode is unavailable for the selected circuit.";
  if (!circuit.electricalModes.includes(value.electricalMode ?? "schematic")) return "This circuit does not support the selected electrical mode.";
  if (value.characterizationArcId && !circuit.arcs.some(arc => arc.id === value.characterizationArcId)) return "Select a registered characterization arc.";
  for (const id of Object.keys(value.deviceOverrides ?? {})) if (!circuit.devices.some(device => device.id === id)) return "A device override does not belong to the selected circuit.";
  for (const id of Object.keys(value.groupOverrides ?? {})) if (!circuit.groups.some(group => group.id === id)) return "A group override does not belong to the selected circuit.";
  const nativeLayout = (value.layoutIds ?? circuit.layoutIds).some(id => circuit.layoutIds.includes(id) && id !== "fixed-library" && id !== "schematic-only");
  if (nativeLayout) {
    const lengths = circuit.devices.map(device => effectiveDimension(device, circuit, value).lengthUm);
    if (lengths.some(length => Math.abs(length - lengths[0]) > 1e-9)) return "Native layout generation requires one common channel length for every device.";
    if (circuit.devices.some(device => (device.fingers ?? 1) !== 1 || (device.multiplicity ?? 1) !== 1)) return "Native layout generation requires nf = 1 and m = 1 for every source device.";
  }
  for (const device of circuit.devices) {
    const family = technology.deviceFamilies.find(item => item.id === device.familyId);
    if (!family) return "Device family is missing from the selected technology.";
    const resolved = effectiveDimension(device, circuit, value, family.polarity);
    const groupOverrides = circuit.groups.filter(group => group.deviceIds.includes(device.id)).map(group => value.groupOverrides?.[group.id]).filter(Boolean);
    const assignments = [...groupOverrides, value.deviceOverrides?.[device.id]].filter(Boolean);
    for (const key of ["widthUm", "lengthUm", "lockWidth", "lockLength"] as const) {
      if (new Set(assignments.flatMap(override => override?.[key] === undefined ? [] : [override[key]])).size > 1) return "Group and device overrides conflict for " + device.id + ".";
    }
    for (const dimension of ["widthUm", "lengthUm"] as const) {
      const bounds = dimensionBounds(options, value, device, dimension)!, size = resolved[dimension];
      if (!Number.isFinite(size) || size < bounds.min - 1e-9 || size > bounds.max + 1e-9 || bounds.step && Math.abs(size / bounds.step - Math.round(size / bounds.step)) > 1e-7) return device.id + " " + dimension + " is outside the effective bounds or grid.";
      if ((mode === "fixed" || device[dimension === "widthUm" ? "lockWidth" : "lockLength"]) && size !== device[dimension]) return device.id + " has immutable source dimensions.";
    }
    if (device.lockWidth && assignments.some(override => override?.lockWidth === false) || device.lockLength && assignments.some(override => override?.lockLength === false)) return "Source dimension locks cannot be removed.";
  }
  return null;
}
export const boundsLabel = (bounds?: DtcoNumericBounds) => bounds ? bounds.min + "–" + bounds.max + " µm" + (bounds.step ? " · grid " + bounds.step + " µm" : "") : "Not advertised";
export function candidateLabel(definition: DtcoOptimizationDefinition, candidate: { design: { nmosWidthUm: number; pmosWidthUm: number }; layoutId: string; parameters?: Record<string, number>; processCorner?: string }) {
  const parameters = Object.entries(candidate.parameters ?? {}).map(([key, value]) => key + "=" + value).join(" · ");
  return (parameters || "N " + candidate.design.nmosWidthUm + " µm / P " + candidate.design.pmosWidthUm + " µm") + " · " + (candidate.processCorner ?? definition.processCorners?.[0] ?? "tt").toUpperCase() + " · " + candidate.layoutId;
}
