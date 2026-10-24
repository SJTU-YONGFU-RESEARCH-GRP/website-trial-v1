import fs from "node:fs/promises";
import {createReadStream} from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import type {ArtifactRecordV1,ResultRecordV1,InputFileV1,JobRecordV1,JsonObject,JobPlanV1,PlannedStepV1,StructuredJobErrorV1} from "../../../shared/contracts/v1.ts";
import {ACG_RESEARCH_SCHEMA,ACG_RESEARCH_ALGORITHMS,ACG_BENCHMARK_TRANSISTORS,nativeCellTimeout,researchOperation,type AcgResearchOperation} from "../../../shared/acgResearch.ts";
import type {Repositories} from "../../app/db/repositories.ts";
import {AcgError,fail,object,regular,ready,safePath,writeJson,projectRoot,type ValidationContext,type AcgExecutionContext} from "./types.ts";
import {parseCellNames,validateConfiguration} from "./validation.ts";
const SHA=/^[a-f0-9]{64}$/;const TAG=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const canonical=(value:unknown):string=>JSON.stringify(value && typeof value==="object" ? Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(canonical(v))])):value);
const sha=(value:Buffer|string)=>createHash("sha256").update(value).digest("hex");
type FileBinding={source:string;destination:string;sha256:string;kind:"upload"|"trusted"|"retained"};
export interface AcgResearchSource {resultId:string;ownerId:string;engine:"cmos"|"mr";operation:AcgResearchOperation;generationConfiguration:unknown;artifacts:ArtifactRecordV1[];}
type Snapshot={request:JsonObject;files:FileBinding[];source:Omit<AcgResearchSource,"artifacts">|null;scriptHashes:Record<string,string>;helperSha256:string;budget:JsonObject;warnings:string[];};
export function bindAcgResearchSource(repositories:Repositories,job:JobRecordV1,parameters:JsonObject):AcgResearchSource|null {
 if(job.moduleId!=="acg" || !researchOperation(job.operation))return null;
 const id=parameters.resumeResultId ?? parameters.sourceResultId;if(id===undefined || id===null)return null;
 if(typeof id!=="string" || !UUID.test(id))fail("ACG_RESEARCH_SOURCE","Source must be a retained result UUID");
 if(job.operation==="algorithm-matrix" || job.operation==="algorithm-report" && parameters.resumeResultId!==undefined || job.operation==="known-feasible" && parameters.sourceResultId!==undefined)fail("ACG_RESEARCH_SOURCE","Unexpected prior result selector");
 const source=repositories.results.get("acg",id,job.ownerId,false);
 const operation=job.operation==="known-feasible"?"known-feasible":"algorithm-matrix";
 if(!source || source.ownerId!==job.ownerId || source.lifecycle==="deleted" || source.provenance.origin!=="computed" || (source.data.acgResearch as JsonObject|undefined)?.operation!==operation || (source.data.acgResearch as JsonObject|undefined)?.schemaVersion!==ACG_RESEARCH_SCHEMA || (source.data.acgResearch as JsonObject|undefined)?.engine!==parameters.engine)fail("ACG_RESEARCH_SOURCE","Source must be your own retained computed "+operation+" result");
 const artifacts=repositories.artifacts.listResult("acg",id);
 if(artifacts.some(a=>a.ownerId!==job.ownerId || a.resultId!==id))fail("ACG_RESEARCH_SOURCE","Source ownership mismatch");
 const data=source.data.acgResearch as JsonObject;return {resultId:id,ownerId:job.ownerId,engine:data.engine as "cmos"|"mr",operation,generationConfiguration:data.generationConfiguration ?? null,artifacts};
}
export function listAcgResearchSources(repositories:Repositories,ownerId:string):ResultRecordV1[] {
 return repositories.results.list("acg",ownerId,false,undefined,100,ownerId).filter(record=>{const data=record.data.acgResearch as JsonObject|undefined;return record.ownerId===ownerId && record.lifecycle!=="deleted" && record.provenance.origin==="computed" && data?.schemaVersion===ACG_RESEARCH_SCHEMA && ["algorithm-matrix","known-feasible"].includes(String(data.operation)) && ["cmos","mr"].includes(String(data.engine));}).map(record=>{const source=record.data.acgResearch as JsonObject;const data:JsonObject={schemaVersion:ACG_RESEARCH_SCHEMA,operation:source.operation!,engine:source.engine!,parameters:source.parameters??{},generationConfiguration:source.generationConfiguration??null,status:source.status??"unknown",budget:source.budget??{}};return {...record,resultId:record.id,operation:source.operation,engine:source.engine,compatibleParameters:source.parameters??{},data:{acgResearch:data}};});
}
function int(value:unknown,fallback:number,name:string,min:number,max:number):number {
 const v=value===undefined?fallback:value;if(typeof v!=="number" || !Number.isSafeInteger(v) || v<min || v>max)fail("ACG_RESEARCH_PARAMETER",name+" must be an integer in "+min+".."+max);return v;
}
function list(value:unknown,fallback:(string|number)[],name:string,min:number,max:number,numeric=false):Array<string|number>{
 const v=value===undefined?fallback:value;if(!Array.isArray(v)||v.length<min||v.length>max||new Set(v).size!==v.length||v.some(x=>numeric ? typeof x!=="number"||!Number.isSafeInteger(x) : typeof x!=="string"||!TAG.test(x)))fail("ACG_RESEARCH_PARAMETER","Invalid unique "+name+" array");return v as Array<string|number>;
}
export function normalizeResearchParameters(operation:AcgResearchOperation,value:JsonObject):{engine:"cmos"|"mr";parameters:JsonObject;budget:JsonObject}{
 const engine=value.engine;if(engine!=="cmos" && engine!=="mr")fail("ACG_RESEARCH_ENGINE","README research operations support CMOS/MR; DR has no native runner");
 const allowed=operation==="algorithm-report"?["engine","maxCols","sourceResultId"]:operation==="algorithm-matrix"?["engine","cells","algorithms","rowCounts","trials","threads","maxCols"]:["engine","cells","numRows","tracks","extraCpp","maxAttempts","totalTimeoutSeconds","attemptTimeoutSeconds","resumeResultId"];
 for(const key of Object.keys(value))if(!allowed.includes(key))fail("ACG_RESEARCH_PARAMETER","Unsupported "+operation+" parameter: "+key);
 const p:JsonObject={};let count=0,seconds=60;
 if(operation!=="known-feasible")p.maxCols=int(value.maxCols,8,"maxCols",4,32);
 if(operation==="algorithm-matrix"){
  const cells=list(value.cells,["inv_x1"],"cells",1,15) as string[];if(cells.some(c=>!Object.hasOwn(ACG_BENCHMARK_TRANSISTORS,c)))fail("ACG_RESEARCH_CELLS","Matrix uses the native 15 benchmark cells only");
  const algorithms=list(value.algorithms,["dp","sa"],"algorithms",1,14) as string[];if(algorithms.some(a=>!ACG_RESEARCH_ALGORITHMS[engine].includes(a)))fail("ACG_RESEARCH_ALGORITHM","Unsupported native algorithm");
  const rows=list(value.rowCounts,engine==="mr"?[1,2,3]:[1],"rowCounts",1,4,true) as number[];
  if(rows.some(r=>r<1||r>4) || engine==="cmos" && (rows.length!==1||rows[0]!==1))fail("ACG_RESEARCH_ROWS","MR matrix supports rows 1..4; CMOS uses [1]");
  const trials=int(value.trials,1,"trials",1,10),threads=int(value.threads,1,"threads",1,4);
  count=cells.length*algorithms.length*rows.length*trials;if(count>1000)fail("ACG_RESEARCH_BUDGET","Matrix product exceeds the service 1000-run limit");
  seconds+=cells.reduce((n,c)=>n+nativeCellTimeout(c),0)*algorithms.length*rows.length*trials;
  Object.assign(p,{cells,algorithms,rowCounts:rows,trials,threads});
 }else if(operation==="known-feasible"){
  if(engine!=="mr")fail("ACG_RESEARCH_ENGINE","Known-feasible corpus requires native MR GF180");
  const cells=list(value.cells,["inv_x1"],"cells",1,15) as string[];const rows=int(value.numRows,1,"numRows",1,3);
  const tracks=list(value.tracks,[9,12,16],"tracks",1,12,true) as number[],extra=list(value.extraCpp,[0,2,4,8,16],"extraCpp",1,17,true) as number[];
  if(tracks.some((t,i)=>t<5||t>16||i>0&&t<=tracks[i-1]!||rows===1&&![9,12,16].includes(t))||extra.some((e,i)=>e<0||e>16||i>0&&e<=extra[i-1]!))fail("ACG_RESEARCH_GEOMETRY","Tracks/extras must be ascending; one-row GF180 uses 9/12/16 tracks, multiple rows use 5..16, extras 0..16");
  const maxAttempts=int(value.maxAttempts,30,"maxAttempts",1,100),totalTimeoutSeconds=int(value.totalTimeoutSeconds,3600,"totalTimeoutSeconds",1,86400),attemptTimeoutSeconds=int(value.attemptTimeoutSeconds,900,"attemptTimeoutSeconds",1,3600);
  count=cells.length*maxAttempts;seconds+=cells.length*totalTimeoutSeconds;
  Object.assign(p,{cells,numRows:rows,tracks,extraCpp:extra,maxAttempts,totalTimeoutSeconds,attemptTimeoutSeconds});
 }
 const sourceKey=operation==="algorithm-report"?"sourceResultId":"resumeResultId";
 if(value[sourceKey]!==undefined && value[sourceKey]!==null){if(typeof value[sourceKey]!=="string"||!UUID.test(value[sourceKey] as string))fail("ACG_RESEARCH_SOURCE","Source must be a result UUID");p[sourceKey]=value[sourceKey];}
 return {engine,parameters:p,budget:{upperBoundSeconds:seconds,maximumNativeRuns:count,maxMatrixRuns:1000,nativeTimeoutPolicy:operation==="algorithm-matrix"?"120/180/300/600 seconds per trial by native transistor count; repeated trials retain native config seeds":operation==="known-feasible"?"per-cell total budget; prior consumed attempts and elapsed time retained on resume":"report only",parallelism:operation==="algorithm-matrix"?p.threads:1}};
}
async function fileHash(filename:string):Promise<string>{const hash=createHash("sha256");for await(const chunk of createReadStream(filename))hash.update(chunk);return hash.digest("hex");}
async function verifyFile(root:string,relative:string,expected?:string){const filename=await regular(root,relative);const digest=await fileHash(filename);if(expected&&digest!==expected)throw new AcgError("ACG_RESEARCH_HASH","Input/retained checksum changed: "+relative,"storage");return {filename,sha256:digest};}
async function checkedFile(root:string,relative:string,expected?:string):Promise<{filename:string;content:Buffer;sha256:string}>{
 const filename=await regular(root,relative);const content=await fs.readFile(filename);const digest=sha(content);
 if(expected && digest!==expected)throw new AcgError("ACG_RESEARCH_HASH","Input/retained checksum changed: "+relative,"storage");
 return {filename,content,sha256:digest};
}
export function validateNativeAggregate(value:unknown):void {
 const raw=object(value);let n=0;
 for(const [cell,v]of Object.entries(raw)){if(!TAG.test(cell))fail("ACG_RESEARCH_AGGREGATE","Invalid aggregate cell name");const algos=object(v);
  for(const [algo,a]of Object.entries(algos)){if(algo==="transistors"){if(typeof a!=="number"||!Number.isSafeInteger(a)||a<1)fail("ACG_RESEARCH_AGGREGATE","Invalid transistor count");continue;}if(!TAG.test(algo))fail("ACG_RESEARCH_AGGREGATE","Invalid aggregate algorithm");const aggregate=object(a);const trials=aggregate.trials===undefined?[aggregate]:aggregate.trials;
   if(!Array.isArray(trials)||!trials.length)fail("ACG_RESEARCH_AGGREGATE","Aggregate trials must be nonempty");
   for(const t of trials){const trial=object(t);if(typeof trial.success!=="boolean"||trial.return_code!==undefined&&trial.return_code!==null&&!Number.isSafeInteger(trial.return_code)||trial.timeout!==undefined&&typeof trial.timeout!=="boolean")fail("ACG_RESEARCH_AGGREGATE","Invalid trial process status");for(const k of ["min_cpp","cost","nor_hpwl","cross_rows","placement_ms","wall_sec"])if(trial[k]!==undefined&&trial[k]!==null&&(typeof trial[k]!=="number"||!Number.isFinite(trial[k])))fail("ACG_RESEARCH_AGGREGATE","Invalid native numeric metric");if(++n>10000)fail("ACG_RESEARCH_AGGREGATE","Aggregate exceeds 10000 trials");}
  }
 }if(!n)fail("ACG_RESEARCH_AGGREGATE","No native trial records");
}
async function resolveResearch(context:ValidationContext):Promise<Snapshot>{
 if(!researchOperation(context.job.operation))fail("ACG_OPERATION","Unsupported ACG operation");
 const operation=context.job.operation;const normalized=normalizeResearchParameters(operation,context.job.parameters);const {engine,parameters,budget}=normalized;
 const helper=context.job.toolConfigurations.find(t=>t.toolId==="acg-research"&&t.enabled);
 if(!helper || !ready(context,helper) || !helper.entryPoint || !helper.rootPath)throw new AcgError("ACG_RESEARCH_TOOL","Healthy trusted acg-research helper is required","configuration");
 if(Number(budget.upperBoundSeconds)>helper.timeoutSeconds)fail("ACG_RESEARCH_BUDGET","Derived serial upper bound "+budget.upperBoundSeconds+" seconds exceeds administrator timeout "+helper.timeoutSeconds);
 const native=context.job.toolConfigurations.find(t=>t.toolId==="acg-"+engine&&t.enabled);
 if(operation!=="algorithm-report"&&(!native||!ready(context,native)||!native.executablePath))throw new AcgError("ACG_RESEARCH_NATIVE","Healthy native "+engine+" tool required","configuration");
 const nativeRoot=native?.rootPath ?? helper.rootPath;
 const resourceConfig={...helper,rootPath:nativeRoot};const project=await projectRoot(resourceConfig,engine);
 const files:FileBinding[]=[],inputs:Record<string,unknown>={},scriptHashes:Record<string,string>={},configurationMetadata:Record<string,unknown>={};
 for(const name of ["benchmark_report.py",...(operation==="algorithm-matrix"?["benchmark_runner.py"]:operation==="known-feasible"?["build_known_feasible_corpus.py"]:[])]){
  const f=await checkedFile(project,"scripts/"+name);scriptHashes[name]=f.sha256;
 }
 const helperPath=path.isAbsolute(helper.entryPoint)?helper.entryPoint:path.join(helper.rootPath,helper.entryPoint);const helperSha256=sha(await fs.readFile(helperPath));
 const helperHealth=context.toolHealth?.[helper.id]?.version ?? context.toolBindings?.[helper.toolId]?.version;if(!helperHealth?.includes("sha256:"+helperSha256))throw new AcgError("ACG_RESEARCH_TOOL","Research helper must pass self-test for its current source checksum","configuration");
 const roles=context.files;const allowed=new Set(operation==="algorithm-matrix"?["algorithm-config","rules"]:operation==="algorithm-report"?["aggregate"]:["netlist","config","rules"]);
 if(new Set(roles.map(f=>f.relativePath)).size!==roles.length)fail("ACG_RESEARCH_INPUT","Duplicate upload path");
 for(const f of roles){if(!f.role||!allowed.has(f.role)||f.validationErrors.length)fail("ACG_RESEARCH_INPUT","Unsupported/invalid workflow input role: "+f.role);const extensions=f.role==="netlist"?[".sp",".spi",".cdl",".cir",".spice",".net"]:[".json"];if(!extensions.includes(path.extname(f.relativePath).toLowerCase()))fail("ACG_RESEARCH_INPUT","Incorrect workflow input extension: "+f.relativePath);}
 const byRole=(role:string)=>roles.filter(f=>f.role===role);for(const role of ["rules","config","aggregate"])if(byRole(role).length>1)fail("ACG_RESEARCH_INPUT","Role "+role+" accepts one file");
 const add=async(source:string,destination:string,kind:FileBinding["kind"],expected?:string,readContent=true):Promise<Buffer>=>{
  if(!readContent){const verified=await verifyFile(context.storageRoot,source,expected);files.push({source,destination,sha256:verified.sha256,kind});return Buffer.alloc(0);}
  let content:Buffer;if(kind==="trusted"){const st=await fs.lstat(source);if(!st.isFile()||st.isSymbolicLink())fail("ACG_RESEARCH_RESOURCE","Trusted resource must be a regular file");content=await fs.readFile(source);}else content=(await checkedFile(context.storageRoot,source,expected)).content;
  const hash=sha(content);if(expected&&hash!==expected)throw new AcgError("ACG_RESEARCH_HASH","Frozen resource checksum changed","storage");files.push({source,destination,sha256:hash,kind});return content;
 };
 const upload=async(file:InputFileV1,destination:string)=>add(context.job.workspaceRelativePath+"/input/"+file.relativePath,destination,"upload",file.sha256);
 const source=(context as ValidationContext&{acgResearchSource?:AcgResearchSource|null}).acgResearchSource ?? null;
 const id=parameters.resumeResultId??parameters.sourceResultId;
 if(id && (!source||source.resultId!==id||source.ownerId!==context.job.ownerId))fail("ACG_RESEARCH_SOURCE","Owned retained source binding is required");
 let inheritedHashes:Record<string,unknown>|null=null;
 const inherited=async(relative:string,destination:string,key:string)=>{
  const prefix="results/acg/"+source!.resultId+"/output/research-workflow/";
  if(!inheritedHashes){const lineage=source!.artifacts.find(a=>a.relativePath===prefix+"lineage.json");if(!lineage)fail("ACG_RESEARCH_SOURCE","Source lineage is missing");inheritedHashes=object(JSON.parse((await checkedFile(context.storageRoot,lineage.relativePath,lineage.sha256)).content.toString())).inputSha256 as Record<string,unknown>;if(!inheritedHashes||typeof inheritedHashes!=="object")fail("ACG_RESEARCH_SOURCE","Source input lineage is missing");}
  const artifact=source!.artifacts.find(a=>a.relativePath===prefix+"inputs/"+relative),expected=inheritedHashes[key];
  if(!artifact||typeof expected!=="string"||!SHA.test(expected)||artifact.sha256!==expected)fail("ACG_RESEARCH_SOURCE","Retained input is not bound to source lineage: "+key);
  return add(artifact.relativePath,destination,"retained",expected);
 };
 const config=async(role:string,defaultRelative:string,destination:string)=>{
  const uploaded=byRole(role)[0];const bytes=uploaded?await upload(uploaded,destination):operation==="known-feasible"&&source?await inherited(role+".json",destination,role==="config"?"configBase":"rules"):await add(path.join(project,defaultRelative),destination,"trusted");
  const value=object(JSON.parse(bytes.toString()));validateConfiguration(value);return value;
 };
 if(operation==="algorithm-report"){
  const aggregate=byRole("aggregate")[0];if(Boolean(aggregate)===Boolean(source))fail("ACG_RESEARCH_AGGREGATE","Select exactly one aggregate upload or prior owned matrix result");
  let bytes:Buffer;
  if(aggregate)bytes=await upload(aggregate,"work/research/aggregate.json");
  else {const prefix="results/acg/"+source!.resultId+"/output/research-workflow/";const f=source!.artifacts.find(a=>a.relativePath===prefix+"aggregate.json");if(!f)fail("ACG_RESEARCH_SOURCE","Source aggregate is missing");bytes=await add(f.relativePath,"work/research/aggregate.json","retained",f.sha256);}
  validateNativeAggregate(JSON.parse(bytes.toString()));inputs.aggregate="work/research/aggregate.json";
 }else{
  const rules=await config("rules","config/gf180/rules_gf180.json","work/research/rules.json");inputs.rules="work/research/rules.json";
  void rules;const netlists:Record<string,string>={};
  const uploadedNetlists=byRole("netlist");const selectedCells=parameters.cells as string[];
  for(const cell of selectedCells){
   const matches=uploadedNetlists.filter(f=>path.parse(f.relativePath).name.toLowerCase()===cell.toLowerCase());
   if(matches.length>1)fail("ACG_RESEARCH_INPUT","Duplicate cell netlist: "+cell);
   const dest="work/research/netlists/"+cell+".sp";
   const bytes=matches[0]?await upload(matches[0],dest):operation==="known-feasible"&&source?await inherited("netlists/"+cell+".sp",dest,"netlist:"+cell):await add(path.join(project,"input/benchmark",cell+".sp"),dest,"trusted");
   const names=parseCellNames(bytes.toString());if(names.length!==1||names[0]!==cell)fail("ACG_RESEARCH_INPUT","Netlist must define exactly selected cell "+cell);netlists[cell]=dest;
  }
  if(uploadedNetlists.some(f=>!selectedCells.some(c=>path.parse(f.relativePath).name.toLowerCase()===c.toLowerCase())))fail("ACG_RESEARCH_INPUT","Uploaded netlist does not match selected cell");
  inputs.netlists=netlists;
  if(operation==="algorithm-matrix"){
   const configs:Record<string,string>={};const uploadedConfigs=byRole("algorithm-config");
   for(const algorithm of parameters.algorithms as string[]){
    const matches=uploadedConfigs.filter(f=>path.parse(f.relativePath).name===algorithm);if(matches.length>1)fail("ACG_RESEARCH_CONFIG","Duplicate algorithm config");
    if(!matches.length&&!["dp","sa"].includes(algorithm))fail("ACG_RESEARCH_CONFIG","Upload "+algorithm+".json for this selected algorithm");
    const dest="work/research/configs/"+algorithm+".json";const bytes=matches[0]?await upload(matches[0],dest):await add(path.join(project,"config/gf180/config_benchmark_9T_"+algorithm+".json"),dest,"trusted");
    const value=object(JSON.parse(bytes.toString()));validateConfiguration(value);
    if(value.tech!=="gf180"||value.placement_only!==true||value.num_rows!==undefined&&value.num_rows!==1||value.placement_algorithm!==algorithm)fail("ACG_RESEARCH_CONFIG","Matrix requires GF180 placement-only algorithm config with base num_rows absent/1 and matching placement_algorithm");
    if(engine==="mr"&&(parameters.rowCounts as number[]).some(r=>r>1)&&(!Number.isInteger(value.track_num)||Number(value.track_num)<5||Number(value.track_num)>16))fail("ACG_RESEARCH_CONFIG","Multi-row matrix GF180 tracks must be 5..16");
    configurationMetadata[algorithm]={technology:value.tech,trackNum:value.track_num??null,baseNumRows:value.num_rows??1,rowCounts:parameters.rowCounts,requestedAlgorithm:algorithm,configuredAlgorithmByRows:Object.fromEntries((parameters.rowCounts as number[]).map(row=>[String(row),engine==="mr"&&row>1&&["auto","dp"].includes(algorithm)?"sa":algorithm])),placementSeed:value.placement_random_seed??null,placementOnly:true};
    configs[algorithm]=dest;
   }
   if(uploadedConfigs.some(f=>!(parameters.algorithms as string[]).includes(path.parse(f.relativePath).name)))fail("ACG_RESEARCH_CONFIG","Unexpected unselected algorithm config");inputs.configs=configs;
  }else{
   const base=await config("config","config/gf180/config.json","work/research/config.json");if(base.tech!=="gf180")fail("ACG_RESEARCH_CONFIG","Corpus requires GF180 base config");inputs.configBase="work/research/config.json";configurationMetadata.base={technology:base.tech,trackNum:base.track_num??null,requestedTracks:parameters.tracks,numRows:parameters.numRows,nativePortfolio:true};
   if(source){
    if(source.operation!=="known-feasible")fail("ACG_RESEARCH_SOURCE","Continuation requires known-feasible result");
    const prefix="results/acg/"+source.resultId+"/output/research-workflow/";const inventory=source.artifacts.find(a=>a.relativePath===prefix+"snapshot-files.json");
    if(!inventory)fail("ACG_RESEARCH_SOURCE","Source snapshot inventory is missing");
    const inv=object(JSON.parse((await checkedFile(context.storageRoot,inventory.relativePath,inventory.sha256)).content.toString()));
    if(inv.schemaVersion!=="acg.research-snapshot.v1"||typeof inv.sourceOutputRoot!=="string"||!path.isAbsolute(inv.sourceOutputRoot))fail("ACG_RESEARCH_SOURCE","Invalid source snapshot schema");
    const entries=object(inv.files);if(!Object.keys(entries).length||Object.keys(entries).length>32766)fail("ACG_RESEARCH_SOURCE","Source snapshot exceeds retained-file limit");
    const selected=source.artifacts.filter(a=>a.relativePath.startsWith(prefix));const selectedByPath=new Map(selected.map(a=>[a.relativePath,a]));
    if(selected.length!==Object.keys(entries).length+1)fail("ACG_RESEARCH_SOURCE","Snapshot retained file set differs from published artifacts");
    for(const [relative,hash]of Object.entries(entries)){safePath("/snapshot",relative);if(typeof hash!=="string"||!SHA.test(hash))fail("ACG_RESEARCH_SOURCE","Invalid snapshot checksum");const artifact=selectedByPath.get(prefix+relative);if(!artifact||artifact.sha256!==hash)fail("ACG_RESEARCH_SOURCE","Snapshot inventory is not bound to retained artifact");await add(artifact.relativePath,"work/research/resume/"+relative,"retained",hash,false);}
    await add(inventory.relativePath,"work/research/resume/snapshot-files.json","retained",inventory.sha256,false);inputs.resume="work/research/resume";
    const oldSummary=object(JSON.parse((await checkedFile(context.storageRoot,prefix+"summary.json",selected.find(a=>a.relativePath===prefix+"summary.json")?.sha256)).content.toString()));
    for(const[name,hash]of Object.entries(scriptHashes))if(object(oldSummary.scriptSha256)[name]!==hash)fail("ACG_RESEARCH_CONTINUATION","Continuation native script checksum differs");
    if(oldSummary.executableSha256!==await fileHash(native!.executablePath!))fail("ACG_RESEARCH_CONTINUATION","Continuation native executable checksum differs");
    const original=JSON.parse((await checkedFile(context.storageRoot,prefix+"source-request.json",selected.find(a=>a.relativePath===prefix+"source-request.json")?.sha256)).content.toString());
    const old=normalizeResearchParameters("known-feasible",{...original.parameters,engine:original.engine}).parameters;
    for(const key of ["cells","numRows","tracks","extraCpp"])if(JSON.stringify(old[key])!==JSON.stringify(parameters[key]))fail("ACG_RESEARCH_CONTINUATION","Continuation policy differs: "+key);
    for(const key of ["maxAttempts","totalTimeoutSeconds","attemptTimeoutSeconds"])if(Number(parameters[key])<Number(old[key]))fail("ACG_RESEARCH_CONTINUATION","Continuation cannot decrease "+key);
    const priorLineage=JSON.parse((await checkedFile(context.storageRoot,prefix+"lineage.json",selected.find(a=>a.relativePath===prefix+"lineage.json")?.sha256)).content.toString());
    const currentHashes:Record<string,string>={rules:files.find(f=>f.destination==="work/research/rules.json")!.sha256,configBase:files.find(f=>f.destination==="work/research/config.json")!.sha256};
    for(const cell of selectedCells)currentHashes["netlist:"+cell]=files.find(f=>f.destination===netlists[cell])!.sha256;
    if(JSON.stringify(Object.entries(currentHashes).sort())!==JSON.stringify(Object.entries(priorLineage.inputSha256??{}).sort()))fail("ACG_RESEARCH_CONTINUATION","Continuation input bytes differ");
   }
  }
 }
 const executable=operation==="algorithm-report"?null:native!.executablePath!;const executableSha256=executable?sha(await fs.readFile(executable)):null;
 const request={schemaVersion:"acg.research-request.v1",operation,engine,trustedResources:{nativeRoot,executable,executableSha256},parameters,budget,inputs,configurationMetadata:operation==="algorithm-report"?source?.generationConfiguration??null:configurationMetadata,nativeConfiguration:native ?? null,sourceResultId:source?.resultId ?? null};
 const warnings=operation==="known-feasible"?["Known-feasible native witnesses certify model/placement/routed GDS and LVS0 only; external LVS1 and foundry signoff are NOT_RUN.","Native adaptive portfolio and width schedule are unchanged; zero extra CPP is included and widening is capped at min(16,W0).","Continuation preserves consumed native attempts/time and retains the original snapshot bytes."]:["Native success means metrics collected, including possible timeout/nonzero exit; it is not layout verification PASS.","The unchanged native Markdown retains baseline headings/static captions; actual configuration is published separately.","Native repeated trials retain the supplied seed/configuration; no synthetic seed variation is added."];
 const retainedSource=source ? {resultId:source.resultId,ownerId:source.ownerId,operation:source.operation,engine:source.engine,generationConfiguration:source.generationConfiguration} : null;
 return {request:request as unknown as JsonObject,files,source:retainedSource,scriptHashes,helperSha256,budget,warnings};
}
export async function validateResearchDraft(context:ValidationContext){
 try{const resolved=await resolveResearch(context);return {valid:true,errors:[],warnings:resolved.warnings};}
 catch(error){const e=error instanceof AcgError?error:new AcgError("ACG_RESEARCH_PREFLIGHT",error instanceof Error?error.message:String(error));return {valid:false,errors:[{type:e.type,code:e.code,message:e.message,stepId:null,retryable:true,details:null}] satisfies StructuredJobErrorV1[],warnings:[]};}
}
export async function buildResearchPlan(context:ValidationContext):Promise<JobPlanV1>{
 const snapshot=await resolveResearch(context),helper=context.job.toolConfigurations.find(t=>t.toolId==="acg-research")!;
 const step=(id:string,name:string):PlannedStepV1=>({id,name,description:name,required:true,weight:1,process:null,inputRoles:[],outputRoles:["acg-research-report"]});
 const steps=[step("research-prepare","Stage verified README workflow inputs"),step("research-execute","Run unchanged native research workflow"),step("research-normalize","Verify and publish truthful research evidence")];
 steps[1]!.process={toolConfigurationId:helper.id,executableDisplay:"acg-research",argv:["--request","work/research-request.json","--output","output/research-workflow","--artifacts-root","."],cwdRelative:".",environmentNames:helper.environmentNames,timeoutSeconds:Number(snapshot.budget.upperBoundSeconds)};
 const plan:JobPlanV1={schemaVersion:"eda.job-plan.v1",capabilityVersion:ACG_RESEARCH_SCHEMA,steps,sweep:null,warnings:snapshot.warnings};
 (plan as JobPlanV1&{acgResearchSnapshot:unknown}).acgResearchSnapshot={...snapshot,snapshotHash:sha(JSON.stringify(snapshot))};return plan;
}
function frozen(context:AcgExecutionContext):Snapshot{
 const snapshot=(context.job.plan as unknown as {acgResearchSnapshot:Snapshot&{snapshotHash:string}}).acgResearchSnapshot;if(!snapshot)throw new AcgError("ACG_RESEARCH_SNAPSHOT","Frozen request missing","configuration");
 const {snapshotHash,...value}=snapshot;if(sha(JSON.stringify(value))!==snapshotHash)throw new AcgError("ACG_RESEARCH_SNAPSHOT","Frozen request changed","configuration");return value;
}
export async function executeResearchStep(context:AcgExecutionContext):Promise<{exitCode:number;outputs:JsonObject}>{
 const root=context.workspacePath;const snapshot=frozen(context);
 if(context.step.stepKey==="research-prepare"){
  const helper=context.job.toolConfigurations.find(t=>t.toolId==="acg-research")!;if(!helper.entryPoint||sha(await fs.readFile(helper.entryPoint))!==snapshot.helperSha256)throw new AcgError("ACG_RESEARCH_HASH","Helper source changed after validation","configuration");
  const resources=object(snapshot.request.trustedResources);const project=await projectRoot({...helper,rootPath:String(resources.nativeRoot)},snapshot.request.engine as "cmos"|"mr");
  for(const[name,hash]of Object.entries(snapshot.scriptHashes))if(sha(await fs.readFile(path.join(project,"scripts",name)))!==hash)throw new AcgError("ACG_RESEARCH_HASH","Native script changed after validation","configuration");
  if(resources.executable && sha(await fs.readFile(String(resources.executable)))!==resources.executableSha256)throw new AcgError("ACG_RESEARCH_HASH","Native executable changed after validation","configuration");
  for(const f of snapshot.files){if(context.abortSignal.aborted)throw new AcgError("ACG_CANCELLED","Research preparation cancelled","cancelled");const source=f.kind==="trusted"?f.source:(await verifyFile(context.storageRoot,f.source,f.sha256)).filename;const stat=await fs.lstat(source);if(!stat.isFile()||stat.isSymbolicLink()||await fileHash(source)!==f.sha256)throw new AcgError("ACG_RESEARCH_HASH","Frozen input changed","storage");const destination=safePath(root,f.destination);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(source,destination);await fs.chmod(destination,0o640);if(await fileHash(destination)!==f.sha256)throw new AcgError("ACG_RESEARCH_HASH","Copied input checksum changed","storage");}
  await writeJson(path.join(root,"work/research-request.json"),snapshot.request);return {exitCode:0,outputs:{budget:snapshot.budget}};
 }
 if(context.step.stepKey==="research-execute"){
  if(!context.runPlannedProcess)throw new AcgError("ACG_RUNTIME","Shared process group runner required","configuration");
  const result=await context.runPlannedProcess();return {exitCode:result.exitCode,outputs:{processId:result.processId,processGroupId:result.processGroupId}};
 }
 if(context.step.stepKey!=="research-normalize")throw new AcgError("ACG_RESEARCH_STEP","Unknown research step","configuration");
 const prefix="output/research-workflow/",summary=object(JSON.parse((await checkedFile(root,prefix+"summary.json")).content.toString()));
 if(summary.schemaVersion!==ACG_RESEARCH_SCHEMA||summary.operation!==snapshot.request.operation||summary.engine!==snapshot.request.engine||summary.foundryCertification!==false||summary.wrapperSha256!==snapshot.helperSha256||summary.executableSha256!==object(snapshot.request.trustedResources).executableSha256||summary.processCompleted!==true||summary.lvs1Certification!==false||!["completed","partial"].includes(String(summary.status)))throw new AcgError("ACG_RESEARCH_EVIDENCE","Summary binding differs","tool_exit");
 const request=JSON.parse((await checkedFile(root,prefix+"source-request.json")).content.toString());if(JSON.stringify(request)!==JSON.stringify(snapshot.request))throw new AcgError("ACG_RESEARCH_EVIDENCE","Published source request differs","tool_exit");
 if(canonical(summary.parameters)!==canonical(snapshot.request.parameters)||canonical(summary.budget)!==canonical(snapshot.budget))throw new AcgError("ACG_RESEARCH_EVIDENCE","Effective parameters/budget differ","tool_exit");
 const evidence=object(summary.evidenceSha256);for(const[relative,hash]of Object.entries(evidence)){if(typeof hash!=="string"||!SHA.test(hash))throw new AcgError("ACG_RESEARCH_EVIDENCE","Invalid evidence checksum","tool_exit");await verifyFile(root,prefix+relative,hash);}
 for(const[name,hash]of Object.entries(snapshot.scriptHashes))if(object(summary.scriptSha256)[name]!==hash)throw new AcgError("ACG_RESEARCH_EVIDENCE","Executed native script binding differs","tool_exit");
 if(snapshot.request.operation==="known-feasible"&&!Array.isArray(summary.cells)||snapshot.request.operation!=="known-feasible"&&!Array.isArray(summary.metrics))throw new AcgError("ACG_RESEARCH_EVIDENCE","Missing research records","tool_exit");
 const descriptor=object(JSON.parse((await checkedFile(root,prefix+"snapshot-files.json")).content.toString()));if(descriptor.schemaVersion!=="acg.research-snapshot.v1"||descriptor.sourceOutputRoot!==path.join(root,"output/research-workflow"))throw new AcgError("ACG_RESEARCH_EVIDENCE","Invalid snapshot output binding","tool_exit");for(const[relative,hash]of Object.entries(object(descriptor.files))){if(typeof hash!=="string"||!SHA.test(hash))throw new AcgError("ACG_RESEARCH_EVIDENCE","Invalid snapshot checksum","tool_exit");await verifyFile(root,prefix+relative,hash);}
 if(Array.isArray(summary.rawReportPaths))for(const relative of summary.rawReportPaths){if(typeof relative!=="string" || typeof evidence[relative]!=="string")throw new AcgError("ACG_RESEARCH_EVIDENCE","Unbound raw report","tool_exit");await regular(root,prefix+relative);}
 summary.lineage=JSON.parse((await checkedFile(root,prefix+"lineage.json")).content.toString());summary.artifactPrefix=prefix;summary.configuration= snapshot.request.parameters;summary.generationConfiguration=snapshot.request.configurationMetadata??null;summary.aggregateOrigin=snapshot.request.operation==="algorithm-report" ? snapshot.source?"retained":"uploaded" : "native";
 await writeJson(path.join(root,"output/acg-result.json"),{title:"AutoCellGen "+String(summary.engine).toUpperCase()+" / "+summary.operation,summary:{engine:summary.engine,operation:summary.operation,status:summary.status,foundryCertification:false},data:{acgResearch:summary},artifactRoles:["acg-research-report","acg-research-snapshot"],parserId:"acg-research-parser",parserVersion:ACG_RESEARCH_SCHEMA});
 return {exitCode:0,outputs:{operation:summary.operation,status:summary.status}};
}
