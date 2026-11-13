import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { SelectionResult, SelectionPhysicalEvidence, SelectionCompleteness } from "../../../shared/contracts/dtcoSelection.ts";
import type { JobRecordV1, JobPlanV1, InputManifestV1, JsonObject, StepExecutionContextV1, ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories, ToolRepository } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { ApiError } from "../../app/api/errors.ts";
import { regular } from "../acg/types.ts";
import { toolSnapshot } from "./preparedModuleJob.ts";
import { normalizeSelectionRequest, validateSelectionResult, selectionSnapshot, SELECTION_LIBRARY_PATH, SELECTION_LIBRARY_SHA256, type SelectionSnapshot } from "./selection.ts";
export const SELECTION_PHYSICAL_VERSION="dtco.cell-selection.v2";
export const physicalEntry=fileURLToPath(new URL("../../../scripts/dtco/selection_physical.py",import.meta.url));
const timingEntry=fileURLToPath(new URL("../../../scripts/dtco/selection.py",import.meta.url));
const ordered=(value:unknown):unknown=>Array.isArray(value)?value.map(ordered):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,ordered(v)])):value;
const equal=(a:unknown,b:unknown)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
const sha=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
export interface PhysicalRuntime {openroadPath:string;klayoutPath:string;techLefPath:string;cellLefPath:string;klayoutTechPath:string;layerMapPath:string;cellGdsPaths:string[];assetHashes:Record<string,string>;toolHashes:Record<string,string>;perCandidateTimeoutSeconds:number;totalTimeoutSeconds:number;limits?:{perCandidateTimeoutSeconds:number;totalTimeoutSeconds:number};}
const entry=(tool:Pick<ToolConfigurationV1,"rootPath"|"entryPoint">)=>path.resolve(tool.rootPath??"",tool.entryPoint??"");
export async function physicalConfiguration(tools:ToolRepository,requireHealthy=true){
 const helper=tools.active("dtco").find(t=>t.toolId==="dtco-selection-physical"),openroad=tools.active("dtco").find(t=>t.toolId==="dtco-openroad"),klayout=tools.active("ppa").find(t=>t.toolId==="klayout");
 for(const tool of [helper,openroad,klayout]){if(!tool)throw new Error("Required DTCO physical helper, direct OpenROAD and KLayout must be configured");if(requireHealthy){const health=tools.latestHealth(tool.id);if(health?.status!=="healthy"||health.selfTestPassed!==true)throw new Error(tool.toolId+" must pass configuration and native self-test");}}
 if(!helper!.interpreterPath||entry(helper!)!==physicalEntry||!openroad!.executablePath||openroad!.interpreterPath||!klayout!.executablePath||klayout!.interpreterPath)throw new Error("DTCO physical tools require registered helper and native executable bindings");
 const manifestPath=helper!.environment.DTCO_SELECTION_ASSET_MANIFEST;if(!manifestPath||!path.isAbsolute(manifestPath))throw new Error("DTCO_SELECTION_ASSET_MANIFEST must identify the audited 7-track physical assets");
 const assets=JSON.parse(await fs.readFile(manifestPath,"utf8")) as Partial<PhysicalRuntime>;
 const paths=[assets.techLefPath,assets.cellLefPath,assets.klayoutTechPath,assets.layerMapPath,...(assets.cellGdsPaths??[])];
 if(paths.some(p=>typeof p!=="string"||!path.isAbsolute(p))||assets.cellGdsPaths?.length!==15)throw new Error("GF180 7-track physical manifest must bind LEF, technology, layer map and all 15 family/drive GDS masters");
 const support=await listSupport(path.dirname(physicalEntry)+"/physical");
 const assetPaths=[manifestPath,...paths as string[],...support],toolPaths=[helper!.interpreterPath,physicalEntry,openroad!.executablePath,klayout!.executablePath];
 const hashes=async(sources:string[])=>Object.fromEntries(await Promise.all([...new Set(sources)].map(async source=>[source,sha(await fs.readFile(source))])));
 const runtime:PhysicalRuntime={...assets as PhysicalRuntime,openroadPath:openroad!.executablePath,klayoutPath:klayout!.executablePath,assetHashes:await hashes(assetPaths),toolHashes:await hashes(toolPaths),perCandidateTimeoutSeconds:120,totalTimeoutSeconds:1800,limits:{perCandidateTimeoutSeconds:120,totalTimeoutSeconds:1800}};
 return {helper:helper!,openroad:openroad!,klayout:klayout!,runtime};
}
async function listSupport(root:string):Promise<string[]>{const files:string[]=[];for(const item of await fs.readdir(root,{withFileTypes:true})){if(item.name==="__pycache__")continue;const target=path.join(root,item.name);if(item.isDirectory())files.push(...await listSupport(target));else if(item.isFile())files.push(target);else throw new Error("Physical support assets must be regular files");}return files.sort();}
export function buildPhysicalSelectionPlan(job:Pick<JobRecordV1,"parameters"|"toolConfigurations">,snapshot:SelectionSnapshot):JobPlanV1{
 const helper=job.toolConfigurations.find(t=>t.toolId==="dtco-selection"),sta=job.toolConfigurations.find(t=>t.toolId==="opensta"&&t.moduleId==="digital"),physical=job.toolConfigurations.find(t=>t.toolId==="dtco-selection-physical"),openroad=job.toolConfigurations.find(t=>t.toolId==="dtco-openroad"),klayout=job.toolConfigurations.find(t=>t.toolId==="klayout"&&t.moduleId==="ppa");
 if(!helper||!sta?.executablePath||!physical||!openroad?.executablePath||!klayout?.executablePath||entry(helper)!==timingEntry||entry(physical)!==physicalEntry)throw new Error("Frozen physical selection tool bindings missing");
 const runtime=snapshot.physicalRuntime;if(!runtime||runtime.openroadPath!==openroad.executablePath||runtime.klayoutPath!==klayout.executablePath||JSON.stringify(snapshot.extraToolConfigurationIds)!==JSON.stringify([sta.id,openroad.id,klayout.id]))throw new Error("Frozen physical runtime identities differ");
 const expected=[helper.interpreterPath,timingEntry,sta.executablePath,...Object.keys(runtime.toolHashes),...Object.keys(runtime.assetHashes)];
 if(JSON.stringify([...new Set(expected)])!==JSON.stringify(snapshot.trusted.map(t=>t.source)))throw new Error("Frozen selection tool or asset identities differ");
 const physicalStep={id:"selection-layout",name:"Place and route every evaluated assignment",description:"Exact mapped standard cells, legal placement, power grid, signal routing and real master GDS merge",required:true,weight:3,inputRoles:["selection-physical-runtime"],outputRoles:["dtco-selection-evidence"],process:{toolConfigurationId:physical.id,additionalToolConfigurationIds:[openroad.id,klayout.id],executableDisplay:"dtco-selection-physical",argv:["--workspace","."],cwdRelative:".",environmentNames:physical.environmentNames,timeoutSeconds:1860,expectedOutputs:["output/selection/physical-result.json"]}};
 const first=snapshot.source?{id:"selection-restore",name:"Restore immutable source timing evidence",description:"Verified copies of the owned historical result; original artifacts remain unchanged",required:true,weight:1,inputRoles:["selection-source"],outputRoles:["dtco-selection-evidence"],process:null}:{id:"selection-search",name:"Evaluate discrete standard-cell assignments",description:"Bounded native OpenSTA timing evaluation",required:true,weight:1,inputRoles:["selection-request","liberty","selection-runtime"],outputRoles:["dtco-selection-evidence"],process:{toolConfigurationId:helper.id,additionalToolConfigurationIds:[sta.id],executableDisplay:"dtco-selection",argv:["--workspace","."],cwdRelative:".",environmentNames:helper.environmentNames,timeoutSeconds:600,expectedOutputs:["output/selection/result.json"]}};
 return {schemaVersion:"eda.job-plan.v1",capabilityVersion:SELECTION_PHYSICAL_VERSION,sweep:null,warnings:["Timing and ranking remain pre-layout TT evidence. Routed GDS is engineering physical completion; no extracted timing, CTS, foundry DRC/LVS or multicorner signoff."],steps:[first,physicalStep]};
}
export async function verifyPhysicalSnapshot(context:Pick<StepExecutionContextV1,"job"|"workspacePath">,snapshot:SelectionSnapshot){
 buildPhysicalSelectionPlan(context.job,snapshot);
 if(snapshot.inputHashes["selection-library.lib"]!==SELECTION_LIBRARY_SHA256)throw new Error("Physical selection Liberty binding changed");
 const canonical=(relative:string)=>relative.startsWith("output/selection/")&&!relative.split("/").some(s=>s===".."||s==="."||!s);
 if(snapshot.source&&Object.keys(snapshot.source.outputHashes).some(p=>!canonical(p)))throw new Error("Invalid frozen source path");
 const runtime=JSON.parse(await fs.readFile(await regular(context.workspacePath,"input/selection-physical-runtime.json"),"utf8"));
 if(JSON.stringify(runtime)!==JSON.stringify(snapshot.physicalRuntime))throw new Error("Physical runtime differs from frozen snapshot");
 const request=JSON.parse(await fs.readFile(await regular(context.workspacePath,"input/selection-request.json"),"utf8"));
 if(JSON.stringify(normalizeSelectionRequest(request))!==JSON.stringify(snapshot.request))throw new Error("Selection staged request differs");
 const native=JSON.parse(await fs.readFile(await regular(context.workspacePath,"input/selection-runtime.json"),"utf8"));
 if(native.openstaPath!==snapshot.trusted[2]?.source||native.openstaSha256!==snapshot.trusted[2]?.sha256)throw new Error("Selection native runtime differs");
 for(const [relative,digest]of Object.entries(snapshot.inputHashes))if(sha(await fs.readFile(await regular(context.workspacePath,"input/"+relative)))!==digest)throw new Error("Frozen selection input changed: "+relative);
 for(const file of snapshot.trusted)if(sha(await fs.readFile(file.source))!==file.sha256)throw new Error("Trusted physical selection tool or asset changed: "+file.source);
 return snapshot;
}
export async function restoreSelectionSource(context:StepExecutionContextV1){
 const snapshot=selectionSnapshot(context.job);if(!snapshot.source)throw new Error("No frozen selection source");
 for(const [relative,digest]of Object.entries(snapshot.source.outputHashes)){const bytes=await fs.readFile(await regular(context.workspacePath,"input/selection-source/"+relative));if(sha(bytes)!==digest)throw new Error("Source timing evidence changed");const target=path.join(context.workspacePath,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:"wx"});}
 return {exitCode:0,outputs:{sourceJobId:snapshot.source.jobId,sourceResultId:snapshot.source.resultId}};
}
export async function selectionSourceContents(repositories:Repositories,storage:StorageService,ownerId:string,request:ReturnType<typeof normalizeSelectionRequest>,sourceJob:JobRecordV1){
 const contents:Record<string,string|Buffer>={};
  if(sourceJob.ownerId!==ownerId||sourceJob.status!=="succeeded"||!sourceJob.resultId)throw new ApiError(409,"DTCO_SELECTION_SOURCE_INVALID","Completion requires an owned successful selection result");
  const record=repositories.results.get("dtco",sourceJob.resultId,ownerId,false),old=record?.data.dtcoSelection;
  const result=validateSelectionResult(old,request);if(result.schemaVersion!=="dtco.cell-selection.result.v1")throw new ApiError(409,"DTCO_SELECTION_ALREADY_COMPLETE","Only archived timing-only results need completion");
  const oldProvenance=(old as any).provenance,outputHashes=oldProvenance?.outputHashes as Record<string,string>|undefined;if(!outputHashes||!outputHashes["output/selection/result.json"]||Object.keys(outputHashes).length>4096)throw new Error("Historical source lacks immutable output bindings");
  const artifacts=repositories.artifacts.listResult("dtco",sourceJob.resultId);
  for(const [relative,digest]of Object.entries(outputHashes)){
   if(!/^output\/selection\/[A-Za-z0-9_./-]+$/.test(relative)||relative.split("/").includes(".."))throw new Error("Invalid source evidence path");
   const expected="results/dtco/"+sourceJob.resultId+"/"+relative;
   const artifact=artifacts.find(a=>a.relativePath===expected&&a.ownerId===ownerId&&a.jobId===sourceJob.id&&a.sha256===digest);
   if(!artifact)throw new Error("Historical source artifact binding missing: "+relative);
   const bytes=await fs.readFile(await storage.resolveExisting(artifact.relativePath));if(bytes.length!==artifact.sizeBytes||sha(bytes)!==digest)throw new Error("Historical source artifact checksum changed");
   contents["selection-source/"+relative]=bytes;
  }
  const raw=JSON.parse(String(contents["selection-source/output/selection/result.json"]));validateSelectionResult(raw,request);
  const source={jobId:sourceJob.id,resultId:sourceJob.resultId,outputHashes};contents["selection-source.json"]=JSON.stringify(source);
  return {source,contents};
}
export async function submitPhysicalSelection(repositories:Repositories,storage:StorageService,ownerId:string,value:unknown,sourceJob?:JobRecordV1):Promise<JobRecordV1>{
 const request=normalizeSelectionRequest(value),owner=repositories.users.get(ownerId);
 if(!owner?.enabled||owner.deletedAt||!owner.allowedModules.includes("dtco"))throw new ApiError(403,"MODULE_FORBIDDEN","DTCO permission required");
 const helper=repositories.tools.active("dtco").find(t=>t.toolId==="dtco-selection"),sta=repositories.tools.active("digital").find(t=>t.toolId==="opensta");
 for(const tool of [helper,sta]){if(!tool||repositories.tools.latestHealth(tool.id)?.status!=="healthy"||repositories.tools.latestHealth(tool.id)?.selfTestPassed!==true)throw new ApiError(409,"DTCO_SELECTION_NOT_READY","Selection helper and native OpenSTA must pass self-test");}
 if(!helper!.interpreterPath||entry(helper!)!==timingEntry||!sta!.executablePath||sta!.interpreterPath)throw new Error("Invalid native timing tool bindings");
 const physical=await physicalConfiguration(repositories.tools),library=await fs.readFile(SELECTION_LIBRARY_PATH);
 if(sha(library)!==SELECTION_LIBRARY_SHA256)throw new Error("Registered Liberty changed");
 const trustedSources=[helper!.interpreterPath,timingEntry,sta!.executablePath,...Object.keys(physical.runtime.toolHashes),...Object.keys(physical.runtime.assetHashes)];
 const trusted=await Promise.all([...new Set(trustedSources)].map(async source=>({source,sha256:sha(await fs.readFile(source))})));
 const contents:Record<string,string|Buffer>={"selection-request.json":JSON.stringify(request,null,2)+"\n","selection-library.lib":library,"selection-runtime.json":JSON.stringify({openstaPath:sta!.executablePath,openstaSha256:trusted[2]!.sha256}),"selection-physical-runtime.json":JSON.stringify(physical.runtime)};
 let source:SelectionSnapshot["source"];
 if(sourceJob){const prepared=await selectionSourceContents(repositories,storage,ownerId,request,sourceJob);source=prepared.source;Object.assign(contents,prepared.contents);}
 const totalBytes=Object.values(contents).reduce((n,v)=>n+Buffer.byteLength(v),0);
 if(repositories.jobs.ownerInputBytes(ownerId)+repositories.artifacts.ownerBytes(ownerId)+totalBytes>owner.storageQuotaBytes)throw new ApiError(413,"STORAGE_QUOTA","Physical selection inputs exceed quota");
 const manifest:InputManifestV1={schemaVersion:"eda.input-manifest.v1",files:Object.entries(contents).map(([relativePath,data])=>({relativePath,sizeBytes:Buffer.byteLength(data),sha256:sha(data),mediaType:relativePath.endsWith(".json")?"application/json":"application/octet-stream",recognizedType:"selection-data",role:relativePath.startsWith("selection-source")?"selection-source":relativePath.includes("physical")?"selection-physical-runtime":relativePath.includes("request")?"selection-request":relativePath.endsWith(".lib")?"liberty":"selection-runtime",required:true,usedByStepIds:[source?"selection-restore":"selection-search","selection-layout"],unresolvedIncludes:[],validationErrors:[]})),totalBytes,fileCount:Object.keys(contents).length,rootHint:null,createdAt:new Date().toISOString()};
 const job=repositories.jobs.createDraft(ownerId,"dtco","cell-selection",source?"Complete archived selection layout":"Standard-cell selection with routed GDS",manifest);repositories.jobs.beginValidation(job.id);
 try{
  const workspace=await storage.createWorkspace(job.id);for(const [relative,data]of Object.entries(contents)){const target=path.join(workspace,"input",relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data,{flag:"wx",mode:0o440});}
  const content={schemaVersion:SELECTION_PHYSICAL_VERSION,request,inputHashes:Object.fromEntries(manifest.files.map(f=>[f.relativePath,f.sha256])),trusted,extraToolConfigurationIds:[sta!.id,physical.openroad.id,physical.klayout.id],physicalRuntime:physical.runtime,...(source?{source}:{})};
  const snapshot={...content,snapshotHash:sha(JSON.stringify(content))},parameters={dtcoSelectionSnapshot:snapshot} as unknown as JsonObject,tools=[helper!,sta!,physical.helper,physical.openroad,physical.klayout],toolConfigurations=tools.map(toolSnapshot),plan=buildPhysicalSelectionPlan({parameters,toolConfigurations},snapshot);
  repositories.jobs.setDraft(job.id,manifest,parameters,SELECTION_PHYSICAL_VERSION,toolConfigurations,Object.fromEntries(tools.map(t=>[t.toolId,repositories.tools.latestHealth(t.id)?.version??null])),plan);
  await storage.writeManifest(job.id,manifest);await storage.freezeInputs(job.id);await verifyPhysicalSnapshot({job:repositories.jobs.get(job.id)!,workspacePath:workspace},snapshot);
  return repositories.database.transaction(()=>{const current=repositories.users.get(ownerId);if(!current?.enabled||current.deletedAt||!current.allowedModules.includes("dtco"))throw new ApiError(403,"MODULE_FORBIDDEN","DTCO permission changed");if(repositories.jobs.ownerInputBytes(ownerId)+repositories.artifacts.ownerBytes(ownerId)>current.storageQuotaBytes)throw new ApiError(413,"STORAGE_QUOTA","Storage quota exceeded");return repositories.jobs.start(job.id);});
 }catch(error){const current=repositories.jobs.get(job.id)!;if(["draft","validating","ready"].includes(current.status))repositories.database.sqlite.prepare("UPDATE jobs SET status='failed',error_json=?,finished_at=?,updated_at=? WHERE id=?").run(JSON.stringify({type:"configuration",code:"DTCO_SELECTION_PREPARATION",message:error instanceof Error?error.message:String(error),stepId:null,retryable:true,details:null}),new Date().toISOString(),new Date().toISOString(),job.id);throw error;}
}
export function selectionCompleteness(job:Pick<JobRecordV1,"status"|"parameters">,result:SelectionResult|null):SelectionCompleteness{
 const source=(job.parameters.dtcoSelectionSnapshot as unknown as SelectionSnapshot)?.source,links=source?{sourceJobId:source.jobId,sourceResultId:source.resultId}:{};
 if(result?.schemaVersion==="dtco.cell-selection.result.v2"&&result.completeness?.status==="complete"&&result.evaluations.length>0&&result.evaluations.every(e=>e.physical?.status==="succeeded"))return {status:"complete",missingStages:[],...links};
 return {status:result?"timing-only":["failed","cancelled","interrupted"].includes(job.status)?"failed":"pending",missingStages:["routed-layout"],...links};
}
export async function mergePhysicalResult(workspace:string,timing:SelectionResult,runtime?:PhysicalRuntime):Promise<SelectionResult>{
 const timingBytes=await fs.readFile(await regular(workspace,"output/selection/result.json"));
 const manifest=JSON.parse(await fs.readFile(await regular(workspace,"output/selection/physical-result.json"),"utf8"));
 if(manifest.schemaVersion!=="dtco.cell-selection.physical.v1"||manifest.status!=="complete"||manifest.sourceTimingSha256!==sha(timingBytes)||!Array.isArray(manifest.evaluations)||manifest.evaluations.length!==timing.evaluations.length)throw new Error("Physical stage incomplete or timing binding changed");
 if(runtime){const identities={...runtime.assetHashes,...runtime.toolHashes};if(!equal(manifest.toolchain?.identities,identities)||manifest.toolchain?.helperSha256!==runtime.toolHashes[physicalEntry]||manifest.toolchain?.streamHelperSha256!==runtime.assetHashes[path.join(path.dirname(physicalEntry),"physical/stream.py")])throw new Error("Physical toolchain provenance differs from frozen runtime");}
 const ids=new Set<string>();
 const evaluations=[];
 for(const evaluation of timing.evaluations){
  const p=manifest.evaluations.find((item:any)=>item.id===evaluation.id) as SelectionPhysicalEvidence|undefined;
  if(!p||ids.has(evaluation.id)||p.status!=="succeeded"||typeof p.scope!=="string")throw new Error("Missing successful physical candidate "+evaluation.id);ids.add(evaluation.id);
  const netlist=evaluation.artifacts.verilog??evaluation.artifacts.netlist??evaluation.artifacts.mappedVerilog;
  if(typeof netlist!=="string"||p.sourceNetlistSha256!==sha(await fs.readFile(await regular(workspace,netlist))))throw new Error("Physical candidate netlist assignment binding changed");
  const prefix="output/selection/"+evaluation.id+"/physical/";
  if(!equal(p.assignment,evaluation.assignment))throw new Error("Physical candidate assignment differs");
  const checks=p.checks;
  if(!equal(checks.functionalInstances,evaluation.cells))throw new Error("Physical functional instance assignment differs");if(checks.exactAssignment!==true||checks.routeComplete!==true||checks.legalPlacement!==true||checks.powerConnected!==true||checks.missingMasters!==0||checks.drcViolations!==0||checks.gdsPlacementMatches!==true||checks.defGeometryMatches!==true||checks.masterGeometryMatches!==true)throw new Error("Physical candidate validation failed");
  for(const key of ["gdsPath","defPath","routeReportPath","validationPath"]){const relative=p.artifacts[key];if(typeof relative!=="string"||!relative.startsWith(prefix)||!p.hashes[relative])throw new Error("Required physical artifact missing: "+key);}
  for(const relative of Object.values(p.artifacts))if(typeof relative!=="string"||!relative.startsWith(prefix)||!p.hashes[relative])throw new Error("Unbound physical artifact path");
  for(const [relative,digest]of Object.entries(p.hashes)){if(!relative.startsWith(prefix))throw new Error("Physical artifact escapes selection");const bytes=await fs.readFile(await regular(workspace,relative));if(sha(bytes)!==digest)throw new Error("Physical artifact checksum changed: "+relative);}
  const validationBytes=await fs.readFile(await regular(workspace,p.artifacts.validationPath));
  if(!equal(JSON.parse(validationBytes.toString()),checks))throw new Error("Physical validation report differs from checks");
  const def=await fs.readFile(await regular(workspace,p.artifacts.defPath),"utf8");if(!def.includes("END DESIGN")||!def.includes("COMPONENTS")||!def.includes("NETS"))throw new Error("Physical DEF is incomplete");
  const constraints=evaluation.artifacts.constraints;if(!constraints||p.sourceConstraintsSha256!==sha(await fs.readFile(await regular(workspace,constraints))))throw new Error("Physical constraint binding differs");
  const gds=await fs.readFile(await regular(workspace,p.artifacts.gdsPath));if(gds.length<100||gds.readUInt16BE(0)!==6||gds.readUInt16BE(2)!==2)throw new Error("Physical artifact is not GDSII");
  evaluations.push({...evaluation,physical:p});
 }
 return {...timing,schemaVersion:"dtco.cell-selection.result.v2",evaluations,completeness:{status:"complete",missingStages:[]},scope:timing.scope+"; exact-assignment routed circuit GDS",limitations:[...timing.limitations.map(line=>line==="Ideal clock, zero interconnect RC, no placement/routing or extracted parasitics."?"Timing uses an ideal clock and zero interconnect RC; routed geometry is separate and no extracted parasitics are analyzed.":line),...(manifest.limitations??[]),"Timing/ranking are frozen pre-layout TT evidence; routed geometry is not extracted timing or foundry DRC/LVS signoff."]};
}
