import type { DtcoCircuitProfile, DtcoDimensionOverride, DtcoExperimentDefinition, DtcoNumericBounds, DtcoResolvedDevice, DtcoTechnologyProfile } from "../../../shared/contracts/dtco.ts";
import { ApiError } from "../../app/api/errors.ts";

const fail = (message: string): never => { throw new ApiError(400,"DTCO_DIMENSIONS_INVALID",message); };
export function assertDtcoDimension(value: unknown, bounds: DtcoNumericBounds, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < bounds.min - 1e-9 || value > bounds.max + 1e-9 ||
      (bounds.step && Math.abs(value / bounds.step - Math.round(value / bounds.step)) > 1e-7)) fail(label+" is outside its device family bounds or grid");
  return Number((value as number).toPrecision(12));
}
/** Resolves immutable source dimensions, group overrides, device overrides and locks once for every execution path. */
export function resolveDtcoDimensions(definition: DtcoExperimentDefinition, technology: DtcoTechnologyProfile, circuit: DtcoCircuitProfile): DtcoResolvedDevice[] {
  const mode = definition.sizingMode ?? (circuit.sizingModes.includes("custom") ? "custom" : "fixed");
  if (!circuit.sizingModes.includes(mode)) fail("The selected circuit does not support "+mode+" sizing");
  const devices = circuit.devices.map(device => ({...device,nodes:[...device.nodes]}));
  if (!devices.length || new Set(devices.map(device=>device.id)).size !== devices.length) fail("Circuit device inventory is empty or ambiguous");
  const assignments = new Map<string, DtcoDimensionOverride>();
  const assign = (id: string, override: DtcoDimensionOverride) => {
    const previous=assignments.get(id) ?? {};
    for (const key of Object.keys(override) as Array<keyof DtcoDimensionOverride>) {
      if (previous[key] !== undefined && previous[key] !== override[key]) fail("Conflicting group/device overrides for "+id+"."+key);
    }
    assignments.set(id,{...previous,...override});
  };
  const validateOverride=(value:unknown):DtcoDimensionOverride=>{
    if (!value || typeof value!=="object" || Array.isArray(value)) fail("Dimension overrides must be objects");
    const override=value as DtcoDimensionOverride;
    if (Object.keys(override).some(key=>!["widthUm","lengthUm","lockWidth","lockLength"].includes(key))) fail("Unsupported dimension override");
    for(const key of ["widthUm","lengthUm"] as const)if(override[key]!==undefined&&(typeof override[key]!=="number"||!Number.isFinite(override[key])))fail("Dimensions must be finite numbers");
    for(const key of ["lockWidth","lockLength"] as const) if(override[key]!==undefined&&typeof override[key]!=="boolean") fail("Dimension locks must be booleans");
    return override;
  };
  for(const [id,value] of Object.entries(definition.groupOverrides??{})) {
    const group=circuit.groups.find(group=>group.id===id); if(!group) fail("Unknown device group: "+id);
    for(const deviceId of group!.deviceIds) { if(!devices.some(device=>device.id===deviceId)) fail("Group references an unknown device"); assign(deviceId,validateOverride(value)); }
  }
  for(const [id,value] of Object.entries(definition.deviceOverrides??{})) {
    if(!devices.some(device=>device.id===id)) fail("Unknown device: "+id);
    assign(id,validateOverride(value));
  }
  const resolved=devices.map(device=>{
    const family=technology.deviceFamilies.find(family=>family.id===device.familyId); if(!family) fail("Unknown device family: "+device.familyId);
    const override=assignments.get(device.id)??{};
    const legacyWidth=definition.design ? (family!.polarity==="nmos"?definition.design.nmosWidthUm:definition.design.pmosWidthUm) : undefined;
    if(legacyWidth!==undefined&&override.widthUm!==undefined&&legacyWidth!==override.widthUm) fail("Legacy design and device widths conflict");
    const width=override.widthUm??legacyWidth??device.widthUm, length=override.lengthUm??device.lengthUm;
    if(family!.dimensionBins&&!family!.dimensionBins.some(bin=>width>=bin.widthUm.min&&width<=bin.widthUm.max&&length>=bin.lengthUm.min&&length<=bin.lengthUm.max))fail("Dimensions do not match any model bin for "+device.id);
    if(family!.toolBounds?.widthUm)assertDtcoDimension(width,family!.toolBounds.widthUm,device.id+".widthUm tool limit");
    if(family!.toolBounds?.lengthUm)assertDtcoDimension(length,family!.toolBounds.lengthUm,device.id+".lengthUm tool limit");
    const physicalLimits=definition.electricalMode==="extracted"||!circuit.availableMetrics||circuit.availableMetrics.includes("areaUm2")?circuit.layoutToolBounds:undefined;
    const layoutWidth=physicalLimits?.[family!.polarity==="nmos"?"nmosWidthUm":"pmosWidthUm"];
    if(layoutWidth)assertDtcoDimension(width,layoutWidth,device.id+".widthUm layout limit");
    if(physicalLimits?.lengthUm)assertDtcoDimension(length,physicalLimits.lengthUm,device.id+".lengthUm layout limit");
    if((mode==="fixed"||device.lockWidth)&&width!==device.widthUm) fail("Width is fixed for "+device.id);
    if((mode==="fixed"||device.lockLength)&&length!==device.lengthUm) fail("Length is fixed for "+device.id);
    if((device.lockWidth&&override.lockWidth===false)||(device.lockLength&&override.lockLength===false)) fail("Source dimension locks cannot be removed");
    return {...device,widthUm:assertDtcoDimension(width,family!.widthUm,device.id+".widthUm"),lengthUm:assertDtcoDimension(length,family!.lengthUm,device.id+".lengthUm"),
      lockWidth:mode==="fixed"||device.lockWidth||override.lockWidth||false,lockLength:mode==="fixed"||device.lockLength||override.lockLength||false};
  });
  if(definition.layoutIds.some(id=>id!=="fixed-library"&&id!=="schematic-only")&&(new Set(resolved.map(device=>device.lengthUm)).size!==1||resolved.some(device=>(device.fingers??1)!==1||(device.multiplicity??1)!==1)))
    fail("Native layout generation requires uniform channel length, single-finger and unit-multiplicity devices");
  return resolved;
}
