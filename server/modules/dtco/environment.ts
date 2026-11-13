import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { DtcoOptions, DtcoExperimentDefinition, DtcoPointCoordinates, DtcoResolvedInputs } from "../../../shared/contracts/dtco.ts";
import type { InputFileV1, InputManifestV1, JobRecordV1, JsonObject } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { projectRoot, AcgError } from "../acg/types.ts";
import { buildDtcoPlan } from "./planner.ts";
import { buildNetlist, buildSimulationNetlist, buildDcDeck, buildArcDeck, buildTruthDeck, selectedArcs, circuitInputs, arcFileId, DESIGN_BOUNDS, EXTRACTED_SCOPE, isPower, isGround, type CircuitRuntime } from "./circuit.ts";
import { listDtcoProfiles, resolveDtcoProfile, verifyDtcoProfileResources, type ResolvedDtcoProfile } from "./catalog.ts";
import { resolveDtcoDimensions } from "./dimensions.ts";
export const DTCO_VERSION = "dtco.adapter.v3";
export const PHYSICAL_PIPELINE_READY=true;
export const METRIC_SCOPE = "Schematic transient delay/power + generated-layout boundary area; no extracted RC or foundry signoff; layouts do not electrically alter the model.";
export const ASSETS = path.resolve(import.meta.dirname, "../../../scripts/dtco");
export const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const LAYOUTS = ["mr-dp-9t", "mr-sa-12t", "mr-sa-12t-pex"];
export type TrustedFile = { source: string; relativePath: string; sha256: string };
export interface DtcoSnapshot { environmentHash: string; modelHash: string; modelVersion: string; coordinates: DtcoPointCoordinates; definition: DtcoExperimentDefinition; trusted: TrustedFile[]; inputHashes: Record<string,string>; metricScope: string; snapshotHash?: string; resolvedInputs?:DtcoResolvedInputs; layoutMode?:"native"|"fixed"|"schematic"; characterization?:Array<{id:string;deckPath:string;logPath:string;waveformPath:string}>; normalizedModel?:DtcoNormalizedModel; nativePortBindings?:Record<string,string>; }
export function dtcoError(code:string,message:string): never { throw new AcgError(code,message,"configuration"); }
async function bytes(filename:string):Promise<Buffer> { const real=await fs.realpath(filename); if(!(await fs.stat(real)).isFile()) dtcoError("DTCO_FILE","Trusted path must resolve to a regular file"); return fs.readFile(real); }
export async function dtcoRuntimeResources(sourceRoot=import.meta.dirname):Promise<TrustedFile[]> {
 const source=path.join(sourceRoot,"frequencyRuntime.ts");
 return [{source,relativePath:"runtime/frequencyRuntime.ts",sha256:hash(await bytes(source))}];
}
export async function modelClosure(root:string, entry:string):Promise<TrustedFile[]> {
 const seen=new Set<string>(), result:TrustedFile[]=[]; let totalBytes=0;
 async function visit(filename:string) {
  const real=await fs.realpath(filename), rel=path.relative(await fs.realpath(root),real);
  if(rel===".." || rel.startsWith("../") || path.isAbsolute(rel))dtcoError("DTCO_MODEL_PATH","Model include escapes administrator model root");
  if(seen.has(real))return; seen.add(real);
  const metadata=await fs.stat(real); if(metadata.size>64*1024*1024 || (totalBytes+=metadata.size)>512*1024*1024)dtcoError("DTCO_MODEL_LIMIT","Model closure exceeds file or total byte limits");
  const content=await bytes(real); result.push({source:real,relativePath:"model/"+rel.split(path.sep).join("/"),sha256:hash(content)});
  if(result.length>8192)dtcoError("DTCO_MODEL_LIMIT","Model closure exceeds 8192 files");
  for(const line of content.toString("utf8").split(/\r?\n/)) {
   const match=line.match(/^\s*\.(include|inc|lib)\s+(?:"([^"]+)"|'([^']+)'|(\S+))(?:\s+(\S+))?/i);
   if(!match)continue;
   if(match[1]!.toLowerCase()==="lib"&&!match[5])continue;
   const target=match[2]??match[3]??match[4]!;
   if(path.isAbsolute(target)||target.includes("\0"))dtcoError("DTCO_MODEL_INCLUDE","Absolute model includes are unsupported");
   await visit(path.resolve(path.dirname(real),target));
  }
 }
 await visit(path.resolve(root,entry)); return result.sort((a,b)=>a.relativePath.localeCompare(b.relativePath));
}
async function environment(repositories:Repositories,profile?:ResolvedDtcoProfile) {
 const configurations=[...repositories.tools.active("acg"),...repositories.tools.active("dtco")];
 const native=configurations.find(t=>t.toolId==="acg-mr"), spice=configurations.find(t=>t.toolId==="dtco-ngspice"), analysis=configurations.find(t=>t.toolId==="dtco-analysis");
 const tools=[["acg-mr",native],["dtco-ngspice",spice],["dtco-analysis",analysis]] as const;
 for(const[id,tool]of tools) {
  const health=tool?repositories.tools.latestHealth(tool.id):null;
  if(!tool?.enabled||health?.status!=="healthy"||health.selfTestPassed!==true)dtcoError("DTCO_TOOL_UNAVAILABLE","Configure and probe administrator tool "+id+(id==="acg-mr"?" with real native self-test":""));
 }
 if(!profile&&(!spice!.rootPath||!spice!.environment.DTCO_MODEL_FILE))dtcoError("DTCO_MODEL_UNCONFIGURED","Administrator dtco-ngspice rootPath and DTCO_MODEL_FILE are required");
 if(spice!.interpreterPath || !spice!.executablePath)dtcoError("DTCO_TOOL_UNAVAILABLE","dtco-ngspice requires the native executable");
 const modelEntry=profile?.modelEntry??spice!.environment.DTCO_MODEL_FILE!;
 if(path.isAbsolute(modelEntry))dtcoError("DTCO_MODEL_PATH","DTCO_MODEL_FILE must be relative to rootPath");
 const model=await modelClosure(profile?.modelRoot??spice!.rootPath!,modelEntry),modelHash=hash(JSON.stringify(model.map(({relativePath,sha256})=>({relativePath,sha256}))));
 const entry=analysis!.entryPoint && path.resolve(analysis!.rootPath??"",analysis!.entryPoint);
 if(!analysis!.interpreterPath||!entry||path.resolve(entry)!==path.join(ASSETS,"analyze.py"))dtcoError("DTCO_ANALYZER","Configure trusted repository scripts/dtco/analyze.py with a Python interpreter");
 const renderer=configurations.find(t=>t.toolId==="acg-renderer"&&repositories.tools.latestHealth(t.id)?.status==="healthy"&&repositories.tools.latestHealth(t.id)?.selfTestPassed===true);
 const physical=configurations.find(t=>t.toolId==="dtco-physical"&&repositories.tools.latestHealth(t.id)?.status==="healthy"&&repositories.tools.latestHealth(t.id)?.selfTestPassed===true);
 const magic=configurations.find(t=>t.toolId==="dtco-magic"&&repositories.tools.latestHealth(t.id)?.status==="healthy"&&repositories.tools.latestHealth(t.id)?.selfTestPassed===true);
 const selected=[native!,spice!,analysis!,...(renderer?[renderer]:[]),...(physical?[physical]:[]),...(magic?[magic]:[])];
 const trusted:TrustedFile[]=[...model,...await dtcoRuntimeResources()];
 for(const tool of selected) {
  const source=tool.interpreterPath??tool.executablePath;
  if(!source||!path.isAbsolute(source))dtcoError("DTCO_TOOL_PATH","Absolute administrator executable required");
  trusted.push({source,relativePath:"tools/"+tool.toolId,sha256:hash(await bytes(source))});
  if(["acg-renderer","dtco-physical"].includes(tool.toolId)&&tool.entryPoint){const source=path.resolve(tool.rootPath??"",tool.entryPoint);trusted.push({source,relativePath:"helpers/"+tool.toolId+path.extname(source),sha256:hash(await bytes(source))});}
 }
 trusted.push({source:entry,relativePath:"helpers/analyze.py",sha256:hash(await bytes(entry))});
 if(physical&&(!physical.interpreterPath||path.resolve(physical.rootPath??"",physical.entryPoint??"")!==path.join(ASSETS,"physical.py")))dtcoError("DTCO_PHYSICAL_HELPER","Configure trusted repository physical.py with a Python interpreter");
 if(magic&&(!magic.executablePath||magic.interpreterPath))dtcoError("DTCO_MAGIC_EXECUTABLE","Configure the native Magic executable");
 if(magic){const file=magic.environment.DTCO_MAGIC_TECH_FILE;if(!magic.rootPath||file!=="gf180mcuA.tech")dtcoError("DTCO_MAGIC_TECH","Configure GF180MCUA Magic technology");const source=path.resolve(magic.rootPath,file);trusted.push({source,relativePath:"magic/gf180mcuA.tech",sha256:hash(await bytes(source))});}
 const project=await projectRoot(native!,"mr");
 const technology=profile?.technology.id==="sky130A"?"sky130":"gf180";
 const rules=path.join(project,"config",technology,"rules_"+technology+".json");
 trusted.push({source:rules,relativePath:"rules.json",sha256:hash(await bytes(rules))});
 for(const name of ["mr-dp-9t.json","mr-sa-12t.json","mr-sa-12t-pex.json","inverter.sp","physical.py","catalog.json","frequency.py"])trusted.push({source:path.join(ASSETS,name),relativePath:"catalog/"+name,sha256:hash(await bytes(path.join(ASSETS,name)))});
 for(const name of ["ascii_to_gds_gdstk.py","gds_merge_all_layers_klayout.rb"]) {
  const source=path.join(project,"scripts",name);
  trusted.push({source,relativePath:"resources/scripts/"+name,sha256:hash(await bytes(source))});
 }
 const jar=path.resolve(project,"../../bin/ascii2gdsii.jar");
 trusted.push({source:jar,relativePath:"resources/bin/ascii2gdsii.jar",sha256:hash(await bytes(jar))});
 const versions=Object.fromEntries(selected.map(t=>[t.toolId,repositories.tools.latestHealth(t.id)?.version??null]));
 if(profile){for(const [index,file]of [...profile.sourceFiles,...(profile.nativeFiles??[])].entries())trusted.push({source:file.source,relativePath:"sources/"+index+"-"+path.basename(file.source),sha256:file.sha256});}
 // One shared identity must cover options, experiment deduplication and every selected profile.
 // Per-profile staging remains independently frozen below; catalogue resources are hashed globally.
 const catalog=listDtcoProfiles(),globalFiles=new Map<string,string>();
 for(const file of trusted.filter(f=>!f.relativePath.startsWith("model/")&&!f.relativePath.startsWith("sources/")&&f.relativePath!=="rules.json"))globalFiles.set(file.source,file.sha256);
 const closures=new Map<string,TrustedFile[]>();
 for(const modelProfile of catalog.modelProfiles){
  const circuit=catalog.circuitProfiles.find(c=>c.technologyIds.includes(modelProfile.technologyId)&&c.modelIds.includes(modelProfile.modelId));
  if(!circuit)continue;
  const resolved=resolveDtcoProfile({technologyId:modelProfile.technologyId,circuitId:circuit.id,modelId:modelProfile.id});
  const key=resolved.modelRoot+"/"+resolved.modelEntry;
  if(!closures.has(key))closures.set(key,await modelClosure(resolved.modelRoot,resolved.modelEntry));
 }
 for(const closure of closures.values())for(const file of closure)globalFiles.set(file.source,file.sha256);
 for(const circuit of catalog.circuitProfiles){
  const resolved=resolveDtcoProfile({technologyId:circuit.technologyIds[0]!,circuitId:circuit.id});
  for(const file of [...resolved.sourceFiles,...(resolved.nativeFiles??[])])if(!globalFiles.has(file.source))globalFiles.set(file.source,hash(await bytes(file.source)));
 }
 for(const technologyId of ["gf180","sky130"]){const source=path.join(project,"config",technologyId,"rules_"+technologyId+".json");globalFiles.set(source,hash(await bytes(source)));}
 const environmentHash=hash(JSON.stringify({resources:[...globalFiles.entries()].sort(([a],[b])=>a.localeCompare(b)),configurations:selected,versions,catalogHash:catalog.catalogHash}));
 return {native:native!,spice:spice!,analysis:analysis!,configurations:selected,trusted,modelHash,modelVersion:profile?.model.id??"gf180-typical-"+modelHash.slice(0,12),environmentHash,versions,modelEntry,physicalReady:PHYSICAL_PIPELINE_READY&&Boolean(physical&&magic)};
}
export async function getDtcoPipelineEnvironmentFingerprint(repositories:Repositories,definition:DtcoExperimentDefinition):Promise<string> {
 const profile=resolveDtcoProfile({technologyId:definition.technologyId,circuitId:definition.circuitId,modelVersion:definition.modelVersion});
 await verifyDtcoProfileResources(profile);
 return (await environment(repositories,profile)).environmentHash;
}
export async function getDtcoOptions(repositories:Repositories,_storage:StorageService):Promise<DtcoOptions> {
 let env:Awaited<ReturnType<typeof environment>>|null=null,reason:string|null=null;
 try{env=await environment(repositories);}catch(error){reason=error instanceof Error?error.message:String(error);}
 const catalog=listDtcoProfiles(),available=env!==null;
 const active=[...repositories.tools.active("acg"),...repositories.tools.active("dtco")];
 const tools=["acg-mr","dtco-ngspice","dtco-analysis"].map(id=>{const c=active.find(t=>t.toolId===id),h=c?repositories.tools.latestHealth(c.id):null;const ready=h?.status==="healthy"&&h.selfTestPassed===true;return {id,available:ready,version:h?.version??null,reason:ready?null:"Administrator configuration and real self-test required"};});
 const option=(id:string,label:string)=>({id,label,available,reason});
 let modelHash=env?.modelHash??"",legacyVersion=env?.modelVersion??"gf180-typical-unconfigured";
 if(!env){const spice=active.find(t=>t.toolId==="dtco-ngspice");if(spice?.rootPath&&spice.environment.DTCO_MODEL_FILE){try{const closure=await modelClosure(spice.rootPath,spice.environment.DTCO_MODEL_FILE);modelHash=hash(JSON.stringify(closure.map(({relativePath,sha256})=>({relativePath,sha256}))));legacyVersion="gf180-typical-"+modelHash.slice(0,12);}catch{ /* Explicitly unavailable. */ }}}
 const defaultModel=catalog.modelProfiles.find(m=>m.modelId==="gf180-03v3")!;
 const models=catalog.modelProfiles.map(m=>({...m,available,reason}));
 // Retain the readable legacy model alias for existing experiments and portable unavailable-tool saves.
 if(legacyVersion!=="gf180-typical-unconfigured")models.unshift({...defaultModel,id:legacyVersion,label:"GF180 legacy frozen model",sourceHash:modelHash,available,reason});
 const layouts=[...new Set(catalog.circuitProfiles.flatMap(c=>c.layoutIds))].map(id=>id==="mr-sa-12t-pex"?{id,label:"Completed MR SA · extracted capacitance",available:env?.physicalReady??false,reason:env?.physicalReady?null:"Physical extraction tools unavailable"}:option(id,id==="fixed-library"?"Original standard-cell library GDS":id==="schematic-only"?"Schematic only · no layout area":id));
 return {circuits:catalog.circuitProfiles.map(c=>({...c,available:c.available&&available,reason:c.available?reason:c.reason})),technologies:catalog.technologyProfiles.map(t=>({...t,available,reason})),models,layouts,available,unavailableReason:reason,tools,defaults:{name:"GF180 inverter study",circuitId:"gf180-inverter",technologyId:"gf180mcuA",modelVersion:models[0]?.id??defaultModel.id,temperaturesC:[25,85],voltagesV:[3,3.3],layoutIds:LAYOUTS.slice(0,2),loadFf:10,inputSlewPs:100,periodNs:10},designBounds:DESIGN_BOUNDS,electricalModes:[option("schematic","Source schematic"),{id:"extracted",label:"Completed GF180 inverter extracted capacitance",available:env?.physicalReady??false,reason:env?.physicalReady?null:"Physical extraction tools unavailable"}],maxPoints:64,environmentHash:env?.environmentHash??hash(JSON.stringify({catalogHash:catalog.catalogHash,reason,modelHash,tools})),metricScope:METRIC_SCOPE,...catalog,modelProfiles:models};
}
export function profileRuntime(definition:DtcoExperimentDefinition,profile:ResolvedDtcoProfile):CircuitRuntime {
 return {...profile,devices:resolveDtcoDimensions(definition,profile.technology,profile.circuit)};
}
export function validatePoint(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates) {
 const profile=resolveDtcoProfile({technologyId:definition.technologyId,circuitId:definition.circuitId,modelVersion:definition.modelVersion==="typical"?undefined:definition.modelVersion});
 const runtime=profileRuntime(definition,profile),mode=definition.electricalMode??"schematic";
 if(!profile.circuit.layoutIds.includes(point.layoutId)||!profile.circuit.electricalModes.includes(mode))dtcoError("DTCO_SELECTION","Unsupported circuit layout or electrical mode");
 if(mode==="extracted"&&(point.layoutId!=="mr-sa-12t-pex"||definition.circuitId!=="gf180-inverter"))dtcoError("DTCO_MODE_LAYOUT","Extracted mode requires the registered GF180 inverter completed 12-track PEX layout");
 selectedArcs(definition,runtime);
 const vss=point.groundVoltageV??0,supply=point.voltageV-vss,operating=profile.technology.operatingBounds,voltageBounds=profile.modelOperatingBounds.supplyVoltageV;
 if(!Number.isFinite(vss)||vss<-10||vss>10||!Number.isFinite(supply)||supply<voltageBounds.min||supply>voltageBounds.max)dtcoError("DTCO_SUPPLY","Differential VDD−VSS is outside the selected model operating range");
 if(!profile.model.cornerSections[point.processCorner??"tt"])dtcoError("DTCO_CORNER","Unsupported model process corner");
 for(const[key,value,min,max]of [["temperatureC",point.temperatureC,operating.temperatureC.min,operating.temperatureC.max],["loadFf",definition.loadFf,0.1,1000],["inputSlewPs",definition.inputSlewPs,1,10000],["periodNs",definition.periodNs,1,1000]] as const)if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)dtcoError("DTCO_RANGE",key+" is outside "+min+".."+max);
 if(definition.inputSlewPs*1e-3>=definition.periodNs/4)dtcoError("DTCO_SLEW","Input slew must be less than one quarter period");
 if(point.layoutId!=="fixed-library"&&point.layoutId!=="schematic-only"){
  if(new Set(runtime.devices.map(d=>d.lengthUm)).size!==1||runtime.devices.some(d=>(d.fingers??1)!==1||(d.multiplicity??1)!==1))dtcoError("DTCO_NATIVE_GEOMETRY","Native area generation requires uniform channel length and explicit single-finger, unit-multiplicity devices");
 }
 const plannedSteps=Math.max(4,profile.truthTable.length)*definition.periodNs/Math.min(definition.inputSlewPs/1000/20,definition.periodNs/10000);
 if(plannedSteps>1_000_000)dtcoError("DTCO_TRANSIENT_BUDGET","Transient plan exceeds 1,000,000 steps; increase input slew or shorten period");
}
export function buildDeck(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string):string {
 return buildArcDeck(definition,point,modelEntry);
}
export function pointCoordinates(point:DtcoPointCoordinates):DtcoPointCoordinates {
 return {temperatureC:point.temperatureC,voltageV:point.voltageV,layoutId:point.layoutId,...(point.groundVoltageV!==undefined?{groundVoltageV:point.groundVoltageV}:{}),...(point.processCorner!==undefined?{processCorner:point.processCorner}:{})};
}
export interface DtcoNormalizedModel {sourceJobId:string;resultId:string;artifactId:string;sha256:string;files:Array<{relativePath:string;sourcePath:string;sha256:string}>;entry:string;technologyId?:string;modelId?:string;cornerSection?:string;spiceScale?:string;normalization?:"mos-cards-only";sourceStageSha256?:string;sourceStage?:JsonObject;translatedModelCount?:number;}
export interface DtcoPrepareBridge { normalizedModel:DtcoNormalizedModel; }
export async function getDtcoPipelineModel(_repositories:Repositories,_storage:StorageService,definition:DtcoExperimentDefinition,point:DtcoPointCoordinates) {
 validatePoint(definition,point);
 const profile=resolveDtcoProfile({technologyId:definition.technologyId,circuitId:definition.circuitId,modelVersion:definition.modelVersion});
 await verifyDtcoProfileResources(profile);
 const files=await modelClosure(profile.modelRoot,profile.modelEntry),inputs=circuitInputs(profileRuntime(definition,profile));
 return {files:files.map(f=>({relativePath:f.relativePath.slice(6),sourcePath:f.source,sha256:f.sha256})),entry:profile.modelEntry,technologyId:profile.technology.id,modelId:profile.model.modelId,cornerSection:profile.model.cornerSections[point.processCorner??"tt"]!,spiceScale:profile.spiceScale,circuit:{topModule:profile.circuit.subcircuit,inputs,outputPin:profile.circuit.arcs[0]!.output,powerPins:profile.circuit.ports.filter(isPower),groundPins:profile.circuit.ports.filter(isGround),function:profile.truthTable,arcs:selectedArcs(definition,profileRuntime(definition,profile))}};
}
export async function prepareDtcoJob(repositories:Repositories,storage:StorageService,job:JobRecordV1,definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,bridge?:DtcoPrepareBridge) {
 const coordinates=pointCoordinates(point);
 validatePoint(definition,coordinates);
 const profile=resolveDtcoProfile({technologyId:definition.technologyId,circuitId:definition.circuitId,modelVersion:definition.modelVersion});
 await verifyDtcoProfileResources(profile);
 const runtime=profileRuntime(definition,profile),layoutMode=coordinates.layoutId==="fixed-library"?"fixed":coordinates.layoutId==="schematic-only"?"schematic":"native";
 const env=await environment(repositories,profile);
 if((definition.electricalMode==="extracted"||coordinates.layoutId==="mr-sa-12t-pex")&&!env.physicalReady)dtcoError("DTCO_PHYSICAL_UNAVAILABLE","Validated physical extraction tools and final feasibility proof required");
 if(definition.modelVersion!==env.modelVersion){
  const spice=env.spice,legacy=spice.rootPath&&spice.environment.DTCO_MODEL_FILE?await modelClosure(spice.rootPath,spice.environment.DTCO_MODEL_FILE):[];
  const legacyVersion="gf180-typical-"+hash(JSON.stringify(legacy.map(({relativePath,sha256})=>({relativePath,sha256})))).slice(0,12);
  if(!legacy.length||definition.modelVersion!==legacyVersion)dtcoError("DTCO_MODEL_CHANGED","Selected model differs from current model closure; save a new experiment revision");
 }
 const root=storage.resolve(job.workspaceRelativePath);
 await fs.mkdir(root,{recursive:true}); for(const dir of ["input","work","output","logs","artifacts"])await fs.mkdir(path.join(root,dir),{recursive:true});
 const files:InputFileV1[]=[];
 const owner=repositories.users.get(job.ownerId); if(!owner)dtcoError("DTCO_OWNER","Job owner no longer exists");
 const ownerInputBytes=repositories.jobs.ownerInputBytes(job.ownerId);
 let inputBytes=0;
 const add=async(relativePath:string,content:Buffer|string,role:string) => {
  const size=Buffer.byteLength(content); inputBytes+=size;
  if(files.length>=8500 || size>128*1024*1024 || inputBytes>640*1024*1024)dtcoError("DTCO_INPUT_LIMIT","Frozen DTCO input file/byte limit exceeded");
  if(ownerInputBytes+inputBytes>owner.storageQuotaBytes)dtcoError("DTCO_QUOTA","Frozen DTCO inputs exceed owner storage quota");
  await fs.mkdir(path.dirname(path.join(root,"input",relativePath)),{recursive:true});
  await fs.writeFile(path.join(root,"input",relativePath),content,{mode:0o640,flag:"wx"});
  const data=Buffer.isBuffer(content)?content:Buffer.from(content);
  files.push({relativePath,sizeBytes:data.length,sha256:hash(data),mediaType:relativePath.endsWith(".json")?"application/json":"text/plain",recognizedType:relativePath.endsWith(".json")?"json":"text",role,required:true,usedByStepIds:["dtco-prepare"],unresolvedIncludes:[],validationErrors:[]});
 };
 for(const file of env.trusted)if(!file.relativePath.startsWith("tools/")&&!file.relativePath.startsWith("sources/")&&file.relativePath!=="rules.json")await add(file.relativePath,await bytes(file.source),"dtco-resource");
 {const original=env.trusted.find(f=>f.relativePath==="rules.json")!;const rules=JSON.parse((await bytes(original.source)).toString("utf8"));if(coordinates.layoutId==="mr-sa-12t-pex")rules.gate_pitch=1000;if(layoutMode==="native")rules.gate_width=runtime.devices[0]!.lengthUm*1000;await add("rules.json",JSON.stringify(rules,null,2)+"\n",layoutMode==="native"?"rules":"dtco-resource");}
 await add("magic/empty.magicrc","# No ambient Magic startup configuration\n","dtco-resource");
 if(bridge){
  const normalized=bridge.normalizedModel;
  if(normalized.technologyId&&normalized.technologyId!==profile.technology.id||normalized.modelId&&normalized.modelId!==profile.model.modelId||normalized.cornerSection&&normalized.cornerSection!==profile.model.cornerSections[coordinates.processCorner??"tt"]||normalized.spiceScale!==profile.spiceScale)dtcoError("DTCO_NORMALIZED_MODEL_COMPATIBILITY","Normalized model metadata does not match selected profile");
  for(const file of normalized.files){
   if(!file.relativePath||file.relativePath.split("/").some(p=>!p||p==="."||p==="..")||path.isAbsolute(file.relativePath)||file.relativePath.includes("\\"))dtcoError("DTCO_NORMALIZED_PATH","Unsafe normalized model path");
   const source=await fs.realpath(file.sourcePath),storageRelative=path.relative(await fs.realpath(storage.root),source);
   if(storageRelative.startsWith("..")||path.isAbsolute(storageRelative))dtcoError("DTCO_NORMALIZED_PATH","Normalized model must come from durable artifact storage");
   const content=await bytes(source);if(hash(content)!==file.sha256)dtcoError("DTCO_NORMALIZED_HASH","Normalized model artifact changed");
   const target="model/"+file.relativePath;
   const previous=files.findIndex(f=>f.relativePath===target);if(previous>=0){inputBytes-=files[previous]!.sizeBytes;files.splice(previous,1);await fs.unlink(path.join(root,"input",target));}
   await add(target,content,"dtco-resource");
  }
  const entry=normalized.entry;if(!normalized.files.some(f=>f.relativePath===entry))dtcoError("DTCO_NORMALIZED_ENTRY","Normalized model entry absent from frozen files");
  const closure=await modelClosure(path.join(root,"input/model"),entry);
  if(closure.some(f=>!normalized.files.some(n=>"model/"+n.relativePath===f.relativePath&&n.sha256===f.sha256)))dtcoError("DTCO_NORMALIZED_CLOSURE","Normalized model includes unverified files");
  env.modelEntry=entry;env.modelHash=hash(JSON.stringify(normalized.files.map(f=>({relativePath:f.relativePath,sha256:f.sha256}))));
 }
 await add("netlist.sp",buildNetlist(definition,runtime),layoutMode==="native"?"netlist":"dtco-source");
 await add("simulation.sp",buildSimulationNetlist(definition,runtime),"dtco-source");
 if(layoutMode==="native")await add("config.json",await bytes(profile.nativeConfigPath??path.join(ASSETS,coordinates.layoutId+".json")),"config");
 const rule=files.find(f=>f.relativePath==="rules.json")!;rule.role=layoutMode==="native"?"rules":"dtco-resource";
 const arcs=selectedArcs(definition,runtime).map((arc,index)=>({...arc,deckPath:"output/dtco/characterize"+(index?"-"+arcFileId(arc.id):"")+".cir",logPath:"output/dtco/ngspice"+(index?"-"+arcFileId(arc.id):"")+".log",waveformPath:"output/dtco/waveforms"+(index?"-"+arcFileId(arc.id):"")+".txt"}));
 for(const arc of arcs)await add(path.basename(arc.deckPath),buildArcDeck(definition,coordinates,env.modelEntry,runtime,arc,path.basename(arc.waveformPath)),"dtco-testbench");
 await add("model-dc.cir",buildDcDeck(definition,coordinates,env.modelEntry,runtime),"dtco-testbench");
 await add("truth.cir",buildTruthDeck(definition,coordinates,env.modelEntry,runtime),"dtco-testbench");
 let fixedLayout:Record<string,unknown>|undefined;
 if(layoutMode==="fixed"){
  if(!profile.fixedGdsPath||!profile.fixedLefPath||!profile.fixedCellName||!profile.fixedAreaUm2)dtcoError("DTCO_FIXED_LAYOUT","Verified original standard-cell GDS and LEF are required");
  const gds=await bytes(profile.fixedGdsPath),lef=await bytes(profile.fixedLefPath);
  await add("library.gds",gds,"dtco-layout");await add("library.lef",lef,"dtco-layout");
  fixedLayout={gdsPath:"output/dtco/library.gds",gdsTop:profile.fixedCellName,areaUm2:profile.fixedAreaUm2,areaSource:"lef",lefPath:"output/dtco/library.lef",lefSha256:hash(lef)};
 }
 const metricScope=definition.electricalMode==="extracted"?EXTRACTED_SCOPE:profile.circuit.metricScopes.schematic??METRIC_SCOPE;
 const resolvedInputs:DtcoResolvedInputs={catalogHash:listDtcoProfiles().catalogHash,technologyId:profile.technology.id,modelVersion:definition.modelVersion,circuitId:profile.circuit.id,sourceHashes:{...profile.sourceHashes,modelClosure:env.modelHash},cornerSection:profile.model.cornerSections[coordinates.processCorner??"tt"]!,operating:{temperatureC:coordinates.temperatureC,voltageV:coordinates.voltageV,groundVoltageV:coordinates.groundVoltageV??0,processCorner:coordinates.processCorner??"tt"},devices:runtime.devices,arcId:definition.characterizationArcId??"all"};
 await add("measurement.json",JSON.stringify({temperatureC:coordinates.temperatureC,voltageV:coordinates.voltageV,groundVoltageV:coordinates.groundVoltageV??0,periodNs:definition.periodNs,inputSlewPs:definition.inputSlewPs,loadFf:definition.loadFf,processCorner:coordinates.processCorner??"tt",inputs:circuitInputs(runtime),output:arcs[0]!.output,arcs,truthTable:runtime.truthTable,truthWaveformPath:"output/dtco/truth-waveforms.txt",truthLogPath:"output/dtco/truth.log",settledStartPeriods:2,settledStopPeriods:4,electricalMode:definition.electricalMode??"schematic",devices:runtime.devices,metricScope,schematicOnly:layoutMode==="schematic",boundary:profile.boundary,...(fixedLayout?{fixedLayout}:{})})+"\n","dtco-measurement");
 const snapshot:DtcoSnapshot={environmentHash:env.environmentHash,modelHash:env.modelHash,modelVersion:definition.modelVersion,coordinates,definition,trusted:env.trusted,inputHashes:Object.fromEntries(files.map(f=>[f.relativePath,f.sha256])),metricScope,resolvedInputs,layoutMode,characterization:arcs,...(profile.nativePortBindings?{nativePortBindings:profile.nativePortBindings}:{}),...(bridge?{normalizedModel:bridge.normalizedModel}:{})};
 snapshot.snapshotHash=hash(JSON.stringify(snapshot));
 const inputManifest:InputManifestV1={schemaVersion:"eda.input-manifest.v1",files,totalBytes:files.reduce((a,f)=>a+f.sizeBytes,0),fileCount:files.length,rootHint:null,createdAt:new Date().toISOString()};
 const parameters={...coordinates,modelVersion:env.modelVersion,loadFf:definition.loadFf,inputSlewPs:definition.inputSlewPs,periodNs:definition.periodNs,dtcoSnapshot:snapshot} as unknown as JsonObject;
 const toolConfigurations=env.configurations.map(({environment:_environment,createdAt:_createdAt,updatedAt:_updatedAt,...configuration})=>configuration);
 const staged={...job,parameters,inputManifest,toolConfigurations,toolVersions:env.versions};
 const health=Object.fromEntries(env.configurations.map(t=>[t.id,repositories.tools.latestHealth(t.id)]));
 const plan=await buildDtcoPlan({moduleId:"dtco",storageRoot:storage.root,now:()=>new Date().toISOString(),job:staged,files,technology:null,toolHealth:health});
 return {inputManifest,parameters,capabilityVersion:DTCO_VERSION,toolConfigurations,toolVersions:env.versions,plan};
}
