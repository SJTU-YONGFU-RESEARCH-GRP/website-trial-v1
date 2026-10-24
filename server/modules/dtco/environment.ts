import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { DtcoOptions, DtcoExperimentDefinition, DtcoPointCoordinates } from "../../../shared/contracts/dtco.ts";
import type { InputFileV1, InputManifestV1, JobRecordV1, JsonObject } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { projectRoot, AcgError } from "../acg/types.ts";
import { buildDtcoPlan } from "./planner.ts";
export const DTCO_VERSION = "dtco.adapter.v1";
export const METRIC_SCOPE = "Schematic transient delay/power + generated-layout boundary area; no extracted RC or foundry signoff; layouts do not electrically alter the model.";
export const ASSETS = path.resolve(import.meta.dirname, "../../../scripts/dtco");
export const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const LAYOUTS = ["mr-dp-9t", "mr-sa-12t"];
type TrustedFile = { source: string; relativePath: string; sha256: string };
export interface DtcoSnapshot { environmentHash: string; modelHash: string; modelVersion: string; coordinates: DtcoPointCoordinates; definition: DtcoExperimentDefinition; trusted: TrustedFile[]; inputHashes: Record<string,string>; metricScope: string; snapshotHash?: string; }
export function dtcoError(code:string,message:string): never { throw new AcgError(code,message,"configuration"); }
async function bytes(filename:string):Promise<Buffer> { const real=await fs.realpath(filename); if(!(await fs.stat(real)).isFile()) dtcoError("DTCO_FILE","Trusted path must resolve to a regular file"); return fs.readFile(real); }
export async function modelClosure(root:string, entry:string):Promise<TrustedFile[]> {
 const seen=new Set<string>(), result:TrustedFile[]=[]; let totalBytes=0;
 async function visit(filename:string) {
  const real=await fs.realpath(filename), rel=path.relative(await fs.realpath(root),real);
  if(rel===".." || rel.startsWith("../") || path.isAbsolute(rel))dtcoError("DTCO_MODEL_PATH","Model include escapes administrator model root");
  if(seen.has(real))return; seen.add(real);
  const metadata=await fs.stat(real); if(metadata.size>32*1024*1024 || (totalBytes+=metadata.size)>128*1024*1024)dtcoError("DTCO_MODEL_LIMIT","Model closure exceeds file or total byte limits");
  const content=await bytes(real); result.push({source:real,relativePath:"model/"+rel.split(path.sep).join("/"),sha256:hash(content)});
  if(result.length>256)dtcoError("DTCO_MODEL_LIMIT","Model closure exceeds 256 files");
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
async function environment(repositories:Repositories) {
 const configurations=[...repositories.tools.active("acg"),...repositories.tools.active("dtco")];
 const native=configurations.find(t=>t.toolId==="acg-mr"), spice=configurations.find(t=>t.toolId==="dtco-ngspice"), analysis=configurations.find(t=>t.toolId==="dtco-analysis");
 const tools=[["acg-mr",native],["dtco-ngspice",spice],["dtco-analysis",analysis]] as const;
 for(const[id,tool]of tools) {
  const health=tool?repositories.tools.latestHealth(tool.id):null;
  if(!tool?.enabled||health?.status!=="healthy"||health.selfTestPassed!==true)dtcoError("DTCO_TOOL_UNAVAILABLE","Configure and probe administrator tool "+id+(id==="acg-mr"?" with real native self-test":""));
 }
 if(!spice!.rootPath||!spice!.environment.DTCO_MODEL_FILE)dtcoError("DTCO_MODEL_UNCONFIGURED","Administrator dtco-ngspice rootPath and DTCO_MODEL_FILE are required");
 if(spice!.interpreterPath || !spice!.executablePath)dtcoError("DTCO_TOOL_UNAVAILABLE","dtco-ngspice requires the native executable");
 const modelEntry=spice!.environment.DTCO_MODEL_FILE;
 if(path.isAbsolute(modelEntry))dtcoError("DTCO_MODEL_PATH","DTCO_MODEL_FILE must be relative to rootPath");
 const model=await modelClosure(spice!.rootPath,modelEntry),modelHash=hash(JSON.stringify(model.map(({relativePath,sha256})=>({relativePath,sha256}))));
 const entry=analysis!.entryPoint && path.resolve(analysis!.rootPath??"",analysis!.entryPoint);
 if(!analysis!.interpreterPath||!entry||path.resolve(entry)!==path.join(ASSETS,"analyze.py"))dtcoError("DTCO_ANALYZER","Configure trusted repository scripts/dtco/analyze.py with a Python interpreter");
 const renderer=configurations.find(t=>t.toolId==="acg-renderer"&&repositories.tools.latestHealth(t.id)?.status==="healthy"&&repositories.tools.latestHealth(t.id)?.selfTestPassed===true);
 const selected=[native!,spice!,analysis!,...(renderer?[renderer]:[])];
 const trusted:TrustedFile[]=[...model];
 for(const tool of selected) {
  const source=tool.interpreterPath??tool.executablePath;
  if(!source||!path.isAbsolute(source))dtcoError("DTCO_TOOL_PATH","Absolute administrator executable required");
  trusted.push({source,relativePath:"tools/"+tool.toolId,sha256:hash(await bytes(source))});
  if(tool.toolId==="acg-renderer"&&tool.entryPoint){const source=path.resolve(tool.rootPath??"",tool.entryPoint);trusted.push({source,relativePath:"helpers/renderer"+path.extname(source),sha256:hash(await bytes(source))});}
 }
 trusted.push({source:entry,relativePath:"helpers/analyze.py",sha256:hash(await bytes(entry))});
 const project=await projectRoot(native!,"mr");
 const rules=path.join(project,"config/gf180/rules_gf180.json");
 trusted.push({source:rules,relativePath:"rules.json",sha256:hash(await bytes(rules))});
 for(const name of ["mr-dp-9t.json","mr-sa-12t.json","inverter.sp"])trusted.push({source:path.join(ASSETS,name),relativePath:"catalog/"+name,sha256:hash(await bytes(path.join(ASSETS,name)))});
 for(const name of ["ascii_to_gds_gdstk.py","gds_merge_all_layers_klayout.rb"]) {
  const source=path.join(project,"scripts",name);
  trusted.push({source,relativePath:"resources/scripts/"+name,sha256:hash(await bytes(source))});
 }
 const jar=path.resolve(project,"../../bin/ascii2gdsii.jar");
 trusted.push({source:jar,relativePath:"resources/bin/ascii2gdsii.jar",sha256:hash(await bytes(jar))});
 const versions=Object.fromEntries(selected.map(t=>[t.toolId,repositories.tools.latestHealth(t.id)?.version??null]));
 const environmentHash=hash(JSON.stringify({trusted,configurations:selected,versions}));
 return {native:native!,spice:spice!,analysis:analysis!,configurations:selected,trusted,modelHash,modelVersion:"gf180-typical-"+modelHash.slice(0,12),environmentHash,versions,modelEntry};
}
export async function getDtcoOptions(repositories:Repositories,_storage:StorageService):Promise<DtcoOptions> {
 let env:Awaited<ReturnType<typeof environment>>|null=null, reason:string|null=null;
 try{env=await environment(repositories);}catch(error){reason=error instanceof Error?error.message:String(error);}
 const available=env!==null;
 const active=[...repositories.tools.active("acg"),...repositories.tools.active("dtco")];
 const toolOptions=["acg-mr","dtco-ngspice","dtco-analysis"].map(id=>{const configuration=active.find(t=>t.toolId===id),health=configuration?repositories.tools.latestHealth(configuration.id):null;const ready=health?.status==="healthy"&&health.selfTestPassed===true;return {id,available:ready,version:health?.version??null,reason:ready?null:"Administrator configuration and real self-test required"};});
 let modelHash=env?.modelHash??"",modelVersion=env?.modelVersion??"gf180-typical-unconfigured";
 if(!env){const spice=active.find(t=>t.toolId==="dtco-ngspice");if(spice?.rootPath&&spice.environment.DTCO_MODEL_FILE){try{const closure=await modelClosure(spice.rootPath,spice.environment.DTCO_MODEL_FILE);modelHash=hash(JSON.stringify(closure.map(({relativePath,sha256})=>({relativePath,sha256}))));modelVersion="gf180-typical-"+modelHash.slice(0,12);}catch{ /* Unreadable administrator model remains explicitly unconfigured. */ }}}
 const option=(id:string,label:string)=>({id,label,available,reason});
 return {circuits:[option("gf180-inverter","CMOS inverter · N1 µm / P2 µm · L280 nm")],technologies:[option("gf180mcuA","GF180MCU A · 3.3 V MOS")],models:[{...option(modelVersion,"GF180 typical SPICE model"),technologyId:"gf180mcuA",sourceHash:modelHash}],layouts:LAYOUTS.map((id,i)=>option(id,i?"MR SA · 12 tracks":"MR DP · 9 tracks")),available,unavailableReason:reason,tools:toolOptions,defaults:{name:"GF180 inverter study",circuitId:"gf180-inverter",technologyId:"gf180mcuA",modelVersion,temperaturesC:[25,85],voltagesV:[3,3.3],layoutIds:[...LAYOUTS],loadFf:10,inputSlewPs:100,periodNs:10},maxPoints:64,environmentHash:env?.environmentHash??hash(JSON.stringify({unavailableReason:reason,modelHash,tools:toolOptions})),metricScope:METRIC_SCOPE};
}
export function validatePoint(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates) {
 if(definition.circuitId!=="gf180-inverter"||definition.technologyId!=="gf180mcuA"||!LAYOUTS.includes(point.layoutId))dtcoError("DTCO_SELECTION","Unsupported circuit, technology or layout");
 for(const[key,value,min,max]of [["temperatureC",point.temperatureC,-40,125],["voltageV",point.voltageV,2.7,3.6],["loadFf",definition.loadFf,0.1,1000],["inputSlewPs",definition.inputSlewPs,1,10000],["periodNs",definition.periodNs,1,1000]] as const)if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)dtcoError("DTCO_RANGE",key+" is outside "+min+".."+max);
 if(definition.inputSlewPs*1e-3>=definition.periodNs/4)dtcoError("DTCO_SLEW","Input slew must be less than one quarter period");
 const plannedSteps=4*definition.periodNs/Math.min(definition.inputSlewPs/1000/20,definition.periodNs/10000);
 if(plannedSteps>1_000_000)dtcoError("DTCO_TRANSIENT_BUDGET","Transient plan exceeds 1,000,000 steps; increase input slew or shorten period");
}
export function buildDeck(definition:DtcoExperimentDefinition,point:DtcoPointCoordinates,modelEntry:string):string {
 const period=definition.periodNs*1e-9,slew=definition.inputSlewPs*1e-12;
 // Pulse high duration excludes transitions, making each input half-period symmetric.
 return ["* GF180 inverter schematic; identical topology and dimensions to native layout input",".param fnoicor=0 sw_stat_mismatch=0",'.lib "model/'+modelEntry+'" typical',".temp "+point.temperatureC,"VDD vdd 0 "+point.voltageV,"VIN in 0 PULSE(0 "+point.voltageV+" 0 "+slew+" "+slew+" "+(period/2-slew)+" "+period+")","XMP0 out in vdd vdd pfet_03v3 w=2u l=280n","XMN0 out in 0 0 nfet_03v3 w=1u l=280n","CLOAD out 0 "+definition.loadFf+"f",".option method=gear reltol=1e-4 abstol=1e-15 vntol=1e-6",".tran "+Math.min(slew/20,period/10000)+" "+period*4+" 0 "+Math.min(slew/20,period/10000),".control","set wr_singlescale","set wr_vecnames","run","wrdata waveforms.txt v(in) v(out) i(VDD)",".endc",".end",""].join("\n");
}
export function pointCoordinates(point:DtcoPointCoordinates):DtcoPointCoordinates {
 return {temperatureC:point.temperatureC,voltageV:point.voltageV,layoutId:point.layoutId};
}
export async function prepareDtcoJob(repositories:Repositories,storage:StorageService,job:JobRecordV1,definition:DtcoExperimentDefinition,point:DtcoPointCoordinates) {
 const coordinates=pointCoordinates(point);
 validatePoint(definition,coordinates); const env=await environment(repositories);
 if(definition.modelVersion!==env.modelVersion)dtcoError("DTCO_MODEL_CHANGED","Selected model differs from current model closure; save a new experiment revision");
 const root=storage.resolve(job.workspaceRelativePath);
 await fs.mkdir(root,{recursive:true}); for(const dir of ["input","work","output","logs","artifacts"])await fs.mkdir(path.join(root,dir),{recursive:true});
 const files:InputFileV1[]=[];
 const owner=repositories.users.get(job.ownerId); if(!owner)dtcoError("DTCO_OWNER","Job owner no longer exists");
 const ownerInputBytes=repositories.jobs.ownerInputBytes(job.ownerId);
 let inputBytes=0;
 const add=async(relativePath:string,content:Buffer|string,role:string) => {
  const size=Buffer.byteLength(content); inputBytes+=size;
  if(files.length>=300 || size>32*1024*1024 || inputBytes>160*1024*1024)dtcoError("DTCO_INPUT_LIMIT","Frozen DTCO input file/byte limit exceeded");
  if(ownerInputBytes+inputBytes>owner.storageQuotaBytes)dtcoError("DTCO_QUOTA","Frozen DTCO inputs exceed owner storage quota");
  await fs.mkdir(path.dirname(path.join(root,"input",relativePath)),{recursive:true});
  await fs.writeFile(path.join(root,"input",relativePath),content,{mode:0o640,flag:"wx"});
  const data=Buffer.isBuffer(content)?content:Buffer.from(content);
  files.push({relativePath,sizeBytes:data.length,sha256:hash(data),mediaType:relativePath.endsWith(".json")?"application/json":"text/plain",recognizedType:relativePath.endsWith(".json")?"json":"text",role,required:true,usedByStepIds:["dtco-prepare"],unresolvedIncludes:[],validationErrors:[]});
 };
 for(const file of env.trusted)if(!file.relativePath.startsWith("tools/"))await add(file.relativePath,await bytes(file.source),"dtco-resource");
 await add("netlist.sp",await bytes(path.join(ASSETS,"inverter.sp")),"netlist");
 await add("config.json",await bytes(path.join(ASSETS,coordinates.layoutId+".json")),"config");
 const rule=files.find(f=>f.relativePath==="rules.json")!;rule.role="rules";
 await add("characterize.cir",buildDeck(definition,coordinates,env.modelEntry),"dtco-testbench");
 await add("measurement.json",JSON.stringify({temperatureC:coordinates.temperatureC,voltageV:coordinates.voltageV,periodNs:definition.periodNs,settledStartPeriods:2,settledStopPeriods:4,metricScope:METRIC_SCOPE})+"\n","dtco-measurement");
 const snapshot:DtcoSnapshot={environmentHash:env.environmentHash,modelHash:env.modelHash,modelVersion:env.modelVersion,coordinates,definition,trusted:env.trusted,inputHashes:Object.fromEntries(files.map(f=>[f.relativePath,f.sha256])),metricScope:METRIC_SCOPE};
 snapshot.snapshotHash=hash(JSON.stringify(snapshot));
 const inputManifest:InputManifestV1={schemaVersion:"eda.input-manifest.v1",files,totalBytes:files.reduce((a,f)=>a+f.sizeBytes,0),fileCount:files.length,rootHint:null,createdAt:new Date().toISOString()};
 const parameters={...coordinates,modelVersion:env.modelVersion,loadFf:definition.loadFf,inputSlewPs:definition.inputSlewPs,periodNs:definition.periodNs,dtcoSnapshot:snapshot} as unknown as JsonObject;
 const toolConfigurations=env.configurations.map(({environment:_environment,createdAt:_createdAt,updatedAt:_updatedAt,...configuration})=>configuration);
 const staged={...job,parameters,inputManifest,toolConfigurations,toolVersions:env.versions};
 const health=Object.fromEntries(env.configurations.map(t=>[t.id,repositories.tools.latestHealth(t.id)]));
 const plan=await buildDtcoPlan({moduleId:"dtco",storageRoot:storage.root,now:()=>new Date().toISOString(),job:staged,files,technology:null,toolHealth:health});
 return {inputManifest,parameters,capabilityVersion:DTCO_VERSION,toolConfigurations,toolVersions:env.versions,plan};
}
