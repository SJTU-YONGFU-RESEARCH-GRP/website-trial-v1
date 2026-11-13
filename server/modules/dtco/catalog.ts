import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { DtcoTechnologyProfile, DtcoModelProfile, DtcoCircuitProfile, DtcoProcessCorner } from "../../../shared/contracts/dtco.ts";

type FileEvidence = { source: string; sha256: string };
type Bin = { lengthMinUm:number; lengthMaxUm:number; widthMinUm:number; widthMaxUm:number };
type PrivateCircuit = DtcoCircuitProfile & { gate:"inv"|"nand2"|"nor2"; customFromLibrary?:boolean; nativeTechnology:"gf180"|"sky130" };
type ModelResource = { root:string; entry:string; source:FileEvidence; simulationUnits:"si"|"micron"; deviceFamilyIds:string[]; cornerSections:Partial<Record<DtcoProcessCorner,string>> };
type CellResource = { spiceFile:string; sourceSubcircuit:string; sourceNetlist:string; sourceHash:string; gdsFile:string; lefFile:string; gdsTop:string; areaUm2:number; libertyFiles:string[]; files:FileEvidence[] };
type NativeResource = { technology:"sky130";projectPath:string;rulesPath:string;configPath:string;files:FileEvidence[];version:string;evidence:string };
type Asset = { nativeResources:Record<string,NativeResource>; version:string;hash:string; technologyProfiles:DtcoTechnologyProfile[];modelProfiles:DtcoModelProfile[];circuitProfiles:PrivateCircuit[];resources:Record<string,ModelResource>;cellResources:Record<string,CellResource>;families:Record<string,{bins:Bin[];source:FileEvidence;drcSources:FileEvidence[];scope:string}>;modelOperatingBounds:Record<string,{supplyVoltageV:{min:number;max:number}}> };
const asset = JSON.parse(readFileSync(new URL("../../../scripts/dtco/catalog.json",import.meta.url),"utf8")) as Asset;
const digest = (value:string|Buffer) => createHash("sha256").update(value).digest("hex");
function freeze<T>(value:T):T { if(value && typeof value==="object"){Object.freeze(value);for(const child of Object.values(value))freeze(child);} return value; }
function relativeSource(filename:string):string { const root=Object.values(asset.resources).find(r=>filename.startsWith(r.root+path.sep))?.root;return root?path.relative(root,filename).split(path.sep).join("/"):path.basename(filename); }
for(const technology of asset.technologyProfiles) for(const family of technology.deviceFamilies){
 const evidence=asset.families[family.id]!;
 family.dimensionBins=evidence.bins.map(b=>({widthUm:{min:b.widthMinUm,max:b.widthMaxUm},lengthUm:{min:b.lengthMinUm,max:b.lengthMaxUm}}));
 family.pdkBounds={widthUm:{...family.widthUm},lengthUm:{...family.lengthUm}};
 family.boundsProvenance={kind:"model-bin-intersection",sourceId:relativeSource(evidence.source.source),sourceHash:evidence.source.sha256,ruleSources:evidence.drcSources.map(f=>({id:relativeSource(f.source),sha256:f.sha256})),caveat:"Model-bin envelope intersected with selected device geometry minima; every pair must match a listed bin. DRC enclosure, spacing, folding and layout-tool limits still apply. These maxima are compact-model coverage, not a universal PDK maximum."};
}
freeze(asset);
const publicCircuits=asset.circuitProfiles.map(({gate:_gate,customFromLibrary:_custom,nativeTechnology:_native,...profile})=>profile);
const publicCatalog=freeze({catalogVersion:asset.version,catalogHash:asset.hash,technologyProfiles:asset.technologyProfiles,modelProfiles:asset.modelProfiles,circuitProfiles:publicCircuits});
export function listDtcoProfiles(){ return publicCatalog; }
/** Async convenience; descriptors are read once. Actual files are rehashed during execution preflight. */
export async function loadDtcoCatalog(){ return listDtcoProfiles(); }
export interface DtcoProfileSelection { technologyId:string; circuitId:string; modelId?:string; modelVersion?:string; }
export interface ResolvedDtcoProfile {
 technology:DtcoTechnologyProfile;model:DtcoModelProfile;circuit:DtcoCircuitProfile;
 simulationSource:string;nativeSource?:string;modelRoot:string;modelEntry:string;
 nativeTechnology?:"sky130";nativeProjectPath?:string;nativeRulesPath?:string;nativeConfigPath?:string;nativePortBindings?:Record<string,string>;nativeFiles?:FileEvidence[];nativeVersion?:string;
 sourceHashes:Record<string,string>;spiceScale?:"1u";truthTable:Array<{inputs:Record<string,0|1>;output:0|1}>;
 fixedGdsPath?:string;fixedLefPath?:string;fixedCellName?:string;fixedAreaUm2?:number;
 fixedLibertyPaths?:string[];boundary?:{layer:number;datatype:number};
 modelOperatingBounds:{supplyVoltageV:{min:number;max:number}};
 resource:ModelResource;cellResource?:CellResource;sourceFiles:FileEvidence[];
}
function modelFor(selection:DtcoProfileSelection,circuit:DtcoCircuitProfile):DtcoModelProfile {
 const requested=selection.modelId??selection.modelVersion;
 const legacy=requested && /^gf180-typical-[a-f0-9]{12}$/.test(requested);
 const model=asset.modelProfiles.find(m=>m.technologyId===selection.technologyId && (requested?m.id===requested||m.modelId===requested||(legacy&&m.modelId==="gf180-03v3"):circuit.modelIds.includes(m.modelId)));
 if(!model || !circuit.modelIds.includes(model.modelId)) throw new Error("DTCO_CATALOG_COMPATIBILITY: circuit and model are incompatible");
 return model;
}
/** Render device semantics explicitly; SKY130 wrappers use micron values under scale=1u. */
export function renderDtcoCircuitSource(circuit:DtcoCircuitProfile,technology:DtcoTechnologyProfile,units:"si"|"micron"="si"):string {
 const pins=circuit.ports.map(p=>p+":"+(circuit.arcs.some(a=>a.input===p)?"I":circuit.arcs.some(a=>a.output===p)?"O":"B"));
 return [".subckt "+circuit.subcircuit+" "+circuit.ports.join(" "),"*.PININFO "+pins.join(" "),...circuit.devices.map(d=>{
  const family=technology.deviceFamilies.find(f=>f.id===d.familyId);if(!family)throw new Error("DTCO_CATALOG_FAMILY: missing device family");
  const suffix=units==="si"?"u":"";const name=/^x/i.test(d.id)?d.id:"X"+d.id;
  return [name,...d.nodes,family.modelName,"w="+d.widthUm+suffix,"l="+d.lengthUm+suffix,"nf="+(d.fingers??1),"m="+(d.multiplicity??1)].join(" ");
 }),".ends "+circuit.subcircuit,""].join("\n");
}
export function dtcoNativeNetBindings(circuit:DtcoCircuitProfile,technology:DtcoTechnologyProfile):Record<string,string>{
 const bindings:Record<string,string>=technology.id==="sky130A"?{VGND:"VSS",VNB:"VSS",VPB:"VDD",VPWR:"VDD"}:{};
 const used=new Set(circuit.devices.flatMap(d=>d.nodes));let next=0;
 for(const node of [...used].sort())if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(node)){let safe:string;do{safe="DTCO_INTERNAL_"+next++;}while(used.has(safe));bindings[node]=safe;used.add(safe);}
 return bindings;
}
export function renderDtcoNativeSource(circuit:DtcoCircuitProfile,technology:DtcoTechnologyProfile):string {
 const bindings=dtcoNativeNetBindings(circuit,technology);
 const map=(n:string)=>bindings[n]??n;
 return renderDtcoCircuitSource({...circuit,ports:[...new Set(circuit.ports.map(map))],devices:circuit.devices.map(d=>({...d,nodes:d.nodes.map(map) as [string,string,string,string]}))},technology,"si");
}
export function resolveDtcoProfile(selection:DtcoProfileSelection):ResolvedDtcoProfile {
 const technology=asset.technologyProfiles.find(t=>t.id===selection.technologyId),raw=asset.circuitProfiles.find(c=>c.id===selection.circuitId);
 if(!technology||!raw||!raw.technologyIds.includes(technology.id))throw new Error("DTCO_CATALOG_COMPATIBILITY: circuit and technology are incompatible");
 const circuit=publicCircuits.find(c=>c.id===raw.id)!;const model=modelFor(selection,circuit),resource=asset.resources[model.modelId]!,cellResource=asset.cellResources[circuit.id];
 const sourceFiles=[resource.source,...model.deviceFamilyIds.flatMap(id=>{const f=asset.families[id]!;return [f.source,...f.drcSources];}),...(cellResource?.files??[])];
 const native=raw.nativeTechnology==="sky130"&&!cellResource || (raw.nativeTechnology==="sky130"&&raw.customFromLibrary)?asset.nativeResources.sky130:undefined;
 const unique=[...new Map(sourceFiles.map(f=>[f.source,f])).values()];const fixed=Boolean(cellResource&&!raw.customFromLibrary);
 return {technology,model,circuit,resource,...(cellResource?{cellResource}:{}),modelRoot:resource.root,modelEntry:resource.entry,
  simulationSource:fixed?cellResource!.sourceNetlist:renderDtcoCircuitSource(circuit,technology,resource.simulationUnits),
  ...(!fixed?{nativeSource:renderDtcoNativeSource(circuit,technology)}:{}),
  ...(resource.simulationUnits==="micron"?{spiceScale:"1u" as const}:{}),
  ...(native?{nativeTechnology:native.technology,nativeProjectPath:native.projectPath,nativeRulesPath:native.rulesPath,nativeConfigPath:native.configPath,nativeVersion:native.version,nativeFiles:native.files,nativePortBindings:dtcoNativeNetBindings(circuit,technology)}:{}),
  sourceHashes:Object.fromEntries([...unique,...(native?.files??[])].map(f=>[relativeSource(f.source),f.sha256])),sourceFiles:unique,
  truthTable:raw.truthTable??[],modelOperatingBounds:asset.modelOperatingBounds[model.modelId]!,
  ...(fixed?{fixedGdsPath:cellResource!.gdsFile,fixedLefPath:cellResource!.lefFile,fixedCellName:cellResource!.gdsTop,fixedAreaUm2:cellResource!.areaUm2,fixedLibertyPaths:cellResource!.libertyFiles}:{}),
  ...(!fixed?{boundary:technology.id==="gf180mcuA"?{layer:63,datatype:0}:{layer:81,datatype:12}}:{})};
}
/** Verify frozen descriptor inputs anew, including symlink containment. Call before staging each job. */
export async function verifyDtcoProfileResources(profile:ResolvedDtcoProfile):Promise<void>{
 const root=await fs.realpath(profile.modelRoot);
 for(const file of profile.sourceFiles){
  const real=await fs.realpath(file.source),relative=path.relative(root,real);
  if((relative===".."||relative.startsWith(".."+path.sep)||path.isAbsolute(relative))&&!Object.values(asset.cellResources).some(c=>c.files.some(f=>f.source===real&&f.source===file.source&&f.sha256===file.sha256)))throw new Error("DTCO_CATALOG_PATH: resource escapes registered PDK root");
  const stat=await fs.stat(real);if(!stat.isFile()||stat.size>128*1024*1024)throw new Error("DTCO_CATALOG_RESOURCE: invalid resource file");
  if(digest(await fs.readFile(real))!==file.sha256)throw new Error("DTCO_CATALOG_HASH: registered PDK resource changed: "+relative);
 }
 for(const file of profile.nativeFiles??[]){
  const registered=asset.nativeResources.sky130;
  if(!registered?.files.some(f=>f.source===file.source&&f.sha256===file.sha256))throw new Error("DTCO_CATALOG_PATH: unregistered native resource");
  const real=await fs.realpath(file.source);if(real!==file.source)throw new Error("DTCO_CATALOG_PATH: native resource symlink changed");
  if(digest(await fs.readFile(real))!==file.sha256)throw new Error("DTCO_CATALOG_HASH: registered native resource changed");
 }
}
export function validateDtcoDeviceBins(familyId:string,widthUm:number,lengthUm:number):boolean {
 return Number.isFinite(widthUm)&&Number.isFinite(lengthUm)&&Boolean(asset.families[familyId]?.bins.some(b=>widthUm>=b.widthMinUm-1e-9&&widthUm<=b.widthMaxUm+1e-9&&lengthUm>=b.lengthMinUm-1e-9&&lengthUm<=b.lengthMaxUm+1e-9));
}
