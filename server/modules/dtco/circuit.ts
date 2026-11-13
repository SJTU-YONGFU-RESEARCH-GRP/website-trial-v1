import { createHash } from "node:crypto";
import type { DtcoCharacterizationArc, DtcoCircuitProfile, DtcoExperimentDefinition, DtcoModelProfile, DtcoPointCoordinates, DtcoResolvedDevice, DtcoTechnologyProfile } from "../../../shared/contracts/dtco.ts";
import { renderDtcoNativeSource } from "./catalog.ts";
import { AcgError } from "../acg/types.ts";
export const DESIGN_BOUNDS={nmosWidthUm:{min:0.95,max:1.3,step:0.05},pmosWidthUm:{min:1.4,max:2.6,step:0.05}};
export const EXTRACTED_SCOPE="Post-layout transient from physically completed GDS and validated Magic full-capacitance extraction; extracted device geometry and capacitances, no extracted wire resistance or foundry signoff.";
export interface CircuitRuntime {
 technology:DtcoTechnologyProfile; model:DtcoModelProfile; circuit:DtcoCircuitProfile;
 devices:DtcoResolvedDevice[]; simulationSource:string; nativeSource?:string; spiceScale?:string;
 truthTable?:Array<{inputs:Record<string,0|1>;output:0|1}>;
}
export const isGround=(pin:string)=>/^(?:VSS|VGND|VNB|VPW|GND|VSSA)$/i.test(pin);
export const isPower=(pin:string)=>/^(?:VDD|VPWR|VPB|VNW|VDDA)$/i.test(pin);
export function resolveDesign(definition:DtcoExperimentDefinition) {
 const design=definition.design??{nmosWidthUm:1,pmosWidthUm:2};
 for(const key of ["nmosWidthUm","pmosWidthUm"] as const){
  const value=design[key],bounds=DESIGN_BOUNDS[key];
  if(typeof value!=="number"||!Number.isFinite(value)||value<bounds.min-1e-10||value>bounds.max+1e-10||Math.abs(value/bounds.step-Math.round(value/bounds.step))>1e-7)
   throw new AcgError("DTCO_DESIGN","Unsupported "+key+"; use registered 0.05 µm increments","validation");
 }
 return {nmosWidthUm:design.nmosWidthUm,pmosWidthUm:design.pmosWidthUm,lengthUm:0.28};
}
export function selectedArcs(definition:DtcoExperimentDefinition,runtime?:CircuitRuntime):DtcoCharacterizationArc[] {
 const arcs=runtime?.circuit.arcs??[{id:"A-Y",input:"A",output:"Y",transition:"inverting" as const,fixedInputs:{}}];
 const selected=definition.characterizationArcId?arcs.filter(arc=>arc.id===definition.characterizationArcId):arcs;
 if(!selected.length)throw new AcgError("DTCO_ARC","Unsupported characterization arc","validation");
 return selected.map(arc=>({...arc,fixedInputs:arc.fixedInputs??{}}));
}
export function circuitInputs(runtime?:CircuitRuntime):string[] {
 return runtime?[...new Set(runtime.circuit.arcs.map(arc=>arc.input))]:["A"];
}
export function arcFileId(id:string):string {
 if(!id||id.length>200)throw new AcgError("DTCO_ARC_ID","Invalid catalog arc identifier","configuration");
 return /^[A-Za-z0-9_.-]{1,100}$/.test(id)?id:id.replace(/[^A-Za-z0-9_.-]/g,"_").slice(0,70)+"-"+createHash("sha256").update(id).digest("hex").slice(0,16);
}
export function buildNetlist(definition:DtcoExperimentDefinition,runtime?:CircuitRuntime):string {
 if(runtime)return renderDtcoNativeSource({...runtime.circuit,devices:runtime.devices},runtime.technology);
 const d=resolveDesign(definition);
 return [".subckt dtco_inv A Y VDD VSS","*.PININFO A:I Y:O VDD:B VSS:B","XMP0 Y A VDD VDD pfet_03v3 w="+d.pmosWidthUm+"u l=280n","XMN0 Y A VSS VSS nfet_03v3 w="+d.nmosWidthUm+"u l=280n",".ends dtco_inv",""].join("\n");
}
/** Fixed cells retain original parameters (including nf/m/model/body); custom changes replace only explicit W/L. */
export function buildSimulationNetlist(definition:DtcoExperimentDefinition,runtime?:CircuitRuntime):string {
 if(!runtime)return buildNetlist(definition);
 if((definition.sizingMode??(runtime.circuit.sizingModes.includes("custom")?"custom":"fixed"))==="fixed")return runtime.simulationSource;
 const escaped=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 let source=runtime.simulationSource;
 for(const device of runtime.devices){
  const expression=new RegExp("^("+escaped(/^x/i.test(device.id)?device.id:"X"+device.id)+"\\s+[^\\n]+)$","im");
  if(!expression.test(source))throw new AcgError("DTCO_DEVICE_SOURCE","Catalog device is absent from simulation source: "+device.id,"configuration");
  source=source.replace(expression,line=>{
   const width=runtime.spiceScale==="1u"?String(device.widthUm):device.widthUm+"u",length=runtime.spiceScale==="1u"?String(device.lengthUm):device.lengthUm+"u";
   if(!/\bw\s*=/i.test(line)||!/\bl\s*=/i.test(line))throw new AcgError("DTCO_DEVICE_DIMENSIONS","Catalog source must contain explicit W/L","configuration");
   return line.replace(/\bw\s*=\s*[^\s]+/i,"w="+width).replace(/\bl\s*=\s*[^\s]+/i,"l="+length);
  });
 }
 return source;
}
export function circuitHeader(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string,extracted=false,runtime?:CircuitRuntime):string[] {
 if(!runtime)resolveDesign(definition);
 const corner=point.processCorner??"tt",section=runtime?.model.cornerSections[corner]??(corner==="tt"?"typical":corner),vss=point.groundVoltageV??0;
 if(!/^[A-Za-z0-9_.-]+$/.test(section))throw new AcgError("DTCO_CORNER","Unsafe model section","configuration");
 const ports=runtime?.circuit.ports??["A","Y","VDD","VSS"],subcircuit=runtime?.circuit.subcircuit??"dtco_inv";
 const mapped=ports.map(pin=>isGround(pin)?"VSS":isPower(pin)?"VDD":pin);
 return ["* Frozen DTCO catalog circuit characterization",...(runtime?.technology.id.startsWith("sky")?[".option scale=1u"]:[".param fnoicor=0 sw_stat_mismatch=0"]),'.lib "model/'+modelEntry+'" '+section,".temp "+point.temperatureC,
  '.include "'+(extracted?"physical/extracted.spice":runtime?"simulation.sp":"netlist.sp")+'"',"XINV "+mapped.join(" ")+" "+subcircuit,"VSS VSS 0 "+vss,"VDD VDD 0 "+point.voltageV];
}
function fixedSources(arc:DtcoCharacterizationArc,point:DtcoPointCoordinates,runtime?:CircuitRuntime):string[] {
 const vss=point.groundVoltageV??0;
 return circuitInputs(runtime).filter(input=>input!==arc.input).map((input,index)=>{
  const state=arc.fixedInputs?.[input];if(state!==0&&state!==1)throw new AcgError("DTCO_ARC_SENSITIZATION","Missing fixed input for "+input,"configuration");
  return "VFIX"+index+" "+input+" 0 "+(state?point.voltageV:vss);
 });
}
export function buildDcDeck(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string,runtime?:CircuitRuntime):string {
 const arc=selectedArcs(definition,runtime)[0]!,vss=point.groundVoltageV??0;
 return [...circuitHeader(definition,point,modelEntry,false,runtime),...fixedSources(arc,point,runtime),"VIN "+arc.input+" 0 "+vss,".control","set wr_singlescale","set wr_vecnames","dc VIN "+vss+" "+point.voltageV+" "+(point.voltageV-vss)/400,"wrdata model-dc.txt v("+arc.input+") v("+arc.output+") i(VDD)",".endc",".end",""].join("\n");
}
export function buildArcDeck(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string,runtime?:CircuitRuntime,arc=selectedArcs(definition,runtime)[0]!,waveform="waveforms.txt"):string {
 const period=definition.periodNs*1e-9,slew=definition.inputSlewPs*1e-12,vss=point.groundVoltageV??0;
 return [...circuitHeader(definition,point,modelEntry,definition.electricalMode==="extracted",runtime),...fixedSources(arc,point,runtime),"VIN "+arc.input+" 0 PULSE("+vss+" "+point.voltageV+" 0 "+slew+" "+slew+" "+(period/2-slew)+" "+period+")","CLOAD "+arc.output+" "+(runtime||vss!==0?"VSS":"0")+" "+definition.loadFf+"f",".option method=gear reltol=1e-4 abstol=1e-15 vntol=1e-6",".tran "+Math.min(slew/20,period/10000)+" "+period*4+" 0 "+Math.min(slew/20,period/10000),".control","set wr_singlescale","set wr_vecnames","run","wrdata "+waveform+" "+circuitInputs(runtime).map(input=>"v("+input+")").join(" ")+" v("+arc.output+") i(VDD)",".endc",".end",""].join("\n");
}
export function buildTruthDeck(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string,runtime:CircuitRuntime):string {
 const rows=runtime.truthTable;if(!rows?.length)throw new AcgError("DTCO_TRUTH_TABLE","Catalog truth table missing","configuration");
 const period=definition.periodNs*1e-9,slew=definition.inputSlewPs*1e-12,vss=point.groundVoltageV??0,output=runtime.circuit.arcs[0]!.output;
 const sources=circuitInputs(runtime).map((input,index)=>{
  const values=["0 "+(rows[0]!.inputs[input]?point.voltageV:vss)];
  rows.forEach((row,i)=>{const previous=rows[Math.max(0,i-1)]!.inputs[input]?point.voltageV:vss,current=row.inputs[input]?point.voltageV:vss;values.push(i*period+" "+previous,(i*period+slew)+" "+current,((i+1)*period)+" "+current);});
  return "VINPUT"+index+" "+input+" 0 PWL("+values.join(" ")+")";
 });
 return [...circuitHeader(definition,point,modelEntry,definition.electricalMode==="extracted",runtime),...sources,"CLOAD "+output+" VSS "+definition.loadFf+"f",".option method=gear reltol=1e-4 abstol=1e-15 vntol=1e-6",".tran "+Math.min(slew/20,period/10000)+" "+rows.length*period+" 0 "+Math.min(slew/20,period/10000),".control","set wr_singlescale","set wr_vecnames","run","wrdata truth-waveforms.txt "+circuitInputs(runtime).map(input=>"v("+input+")").join(" ")+" v("+output+") i(VDD)",".endc",".end",""].join("\n");
}
