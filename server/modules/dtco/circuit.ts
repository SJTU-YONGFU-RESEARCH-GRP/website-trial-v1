import type { DtcoExperimentDefinition, DtcoPointCoordinates } from "../../../shared/contracts/dtco.ts";
import { AcgError } from "../acg/types.ts";
export const DESIGN_BOUNDS={nmosWidthUm:{min:0.95,max:1.3,step:0.05},pmosWidthUm:{min:1.4,max:2.6,step:0.05}};
export const EXTRACTED_SCOPE="Post-layout transient from physically completed GDS and validated Magic full-capacitance extraction; extracted device geometry and capacitances, no extracted wire resistance or foundry signoff.";
export function resolveDesign(definition:DtcoExperimentDefinition) {
 const design=definition.design??{nmosWidthUm:1,pmosWidthUm:2};
 for(const key of ["nmosWidthUm","pmosWidthUm"] as const){
  const value=design[key],bounds=DESIGN_BOUNDS[key];
  if(typeof value!=="number"||!Number.isFinite(value)||value<bounds.min-1e-10||value>bounds.max+1e-10||Math.abs(value/bounds.step-Math.round(value/bounds.step))>1e-7)
   throw new AcgError("DTCO_DESIGN","Unsupported "+key+"; use registered 0.05 µm increments","validation");
 }
 return {nmosWidthUm:design.nmosWidthUm,pmosWidthUm:design.pmosWidthUm,lengthUm:0.28};
}
export function buildNetlist(definition:DtcoExperimentDefinition):string {
 const d=resolveDesign(definition);
 return [".subckt dtco_inv A Y VDD VSS","*.PININFO A:I Y:O VDD:B VSS:B",
  "XMP0 Y A VDD VDD pfet_03v3 w="+d.pmosWidthUm+"u l=280n",
  "XMN0 Y A VSS VSS nfet_03v3 w="+d.nmosWidthUm+"u l=280n",".ends dtco_inv",""].join("\n");
}
export function circuitHeader(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string,extracted=false):string[] {
 resolveDesign(definition);
 return ["* Frozen GF180 inverter characterization",".param fnoicor=0 sw_stat_mismatch=0",
  '.lib "model/'+modelEntry+'" typical',".temp "+point.temperatureC,
  '.include "'+(extracted?"physical/extracted.spice":"netlist.sp")+'"',
  "XINV A Y VDD VSS dtco_inv","VSS VSS 0 0","VDD VDD 0 "+point.voltageV];
}
export function buildDcDeck(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string):string {
 return [...circuitHeader(definition,point,modelEntry),"VIN A 0 0",
  ".control","set wr_singlescale","set wr_vecnames","dc VIN 0 "+point.voltageV+" "+point.voltageV/400,
  "wrdata model-dc.txt v(A) v(Y) i(VDD)",".endc",".end",""].join("\n");
}
