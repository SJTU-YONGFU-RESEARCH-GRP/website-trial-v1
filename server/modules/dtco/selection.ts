import { SELECTION_PHYSICAL_VERSION, physicalConfiguration, buildPhysicalSelectionPlan, verifyPhysicalSnapshot, submitPhysicalSelection, mergePhysicalResult } from "./selectionPhysical.ts";
import type { PhysicalRuntime } from "./selectionPhysical.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { SelectionRequest, SelectionOptions, SelectionResult } from "../../../shared/contracts/dtcoSelection.ts";
import type { JobRecordV1, JobPlanV1, ParsedModuleResultV1, StepExecutionContextV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { ApiError } from "../../app/api/errors.ts";
import { listOutputs } from "../acg/parser.ts";
import { regular } from "../acg/types.ts";

export const SELECTION_VERSION = "dtco.cell-selection.v1";
export const SELECTION_LIBRARY_ID = "gf180mcu-7t5v0-tt";
export const SELECTION_LIBRARY_SHA256 = "08070623e53cd1db9abf74c6719510ebc11d8587895c0543016a28e025da0108";
export const SELECTION_LIBRARY_PATH = fileURLToPath(new URL("../../../data/digital-technologies/16bef11f7368a98382ba22ba1ba16ab0/library/timing.lib", import.meta.url));
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const fail = (message: string): never => { throw new ApiError(400, "DTCO_SELECTION_INVALID", message); };
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : fail("Expected an object");
const reserved = new Set("always and assign automatic begin buf case casex casez cell config deassign default defparam design disable edge else end endcase endconfig endfunction endgenerate endmodule endprimitive endspecify endtable endtask event for force forever fork function generate genvar if ifnone incdir include initial inout input instance integer join large liblist library localparam macromodule medium module nand negedge nmos nor noshowcancelled not notif0 notif1 or output parameter pmos posedge primitive pull0 pull1 pulldown pullup pulsestyle_onevent pulsestyle_ondetect rcmos real realtime reg release repeat rnmos rpmos rtran rtranif0 rtranif1 scalared showcancelled signed small specify specparam strong0 strong1 supply0 supply1 table task time tran tranif0 tranif1 tri tri0 tri1 triand trior trireg unsigned use vectored wait wand weak0 weak1 while wire wor xnor xor logic bit byte int longint shortint string struct typedef enum interface endinterface program endprogram import export package endpackage return void".split(" "));
const identifier = (value: unknown): string => typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) && value.length <= 64 && !reserved.has(value) ? value : fail("Names must be safe Verilog identifiers up to 64 characters");
const strings = (value: unknown): string[] => Array.isArray(value) && value.length <= 256 ? value.map(identifier) : fail("Expected a bounded list of names");
const unique = (values: string[], label: string) => { if (new Set(values).size !== values.length) fail("Duplicate " + label); };
export function normalizeSelectionRequest(value: unknown): SelectionRequest {
 const body=object(value), circuit=object(body.circuit), constraints=object(body.constraints);
 if(body.schemaVersion!=="dtco.cell-selection.request.v1" || body.libraryId!==SELECTION_LIBRARY_ID) fail("Unsupported request schema or library");
 if(typeof body.name!=="string" || !body.name.trim() || body.name.length>120) fail("Name must contain 1 to 120 characters");
 if(!["area","performance","balanced"].includes(String(body.objective))) fail("Unsupported objective");
 if(!Number.isSafeInteger(body.maxEvaluations) || Number(body.maxEvaluations)<1 || Number(body.maxEvaluations)>256) fail("maxEvaluations must be 1 to 256");
 const inputs=strings(circuit.inputs), outputs=strings(circuit.outputs), clock=circuit.clock===null?null:identifier(circuit.clock);
 unique(inputs,"primary input");unique(outputs,"primary output");
 if(!outputs.length || inputs.some(n=>outputs.includes(n)) || clock && outputs.includes(clock)) fail("Invalid primary port or clock mapping");
 if(!Array.isArray(circuit.instances)||!circuit.instances.length||circuit.instances.length>256) fail("Provide 1 to 256 instances");
 const instances=(circuit.instances as unknown[]).map(value=>{
  const item=object(value), family=String(item.family);
  if(!["INV","NAND","NOR","AND","DFF"].includes(family)) fail("Unsupported cell family");
  const pins=strings(item.inputs);if(pins.length!==(family==="NAND"||family==="NOR"||family==="AND"?2:1)) fail("Wrong number of family input pins");
  if(!Array.isArray(item.allowedDrives)||!item.allowedDrives.length||item.allowedDrives.length>3||item.allowedDrives.some(d=>!Number.isSafeInteger(d)||![1,2,4].includes(Number(d))))fail("Invalid drive domain");
  const allowedDrives=[...new Set(item.allowedDrives as number[])].sort((a,b)=>a-b);if(allowedDrives.length!==(item.allowedDrives as number[]).length)fail("Duplicate allowed drives");
  if(!allowedDrives.includes(item.initialDrive as number))fail("initialDrive must belong to allowedDrives");
  if(item.locked!==undefined&&typeof item.locked!=="boolean")fail("locked must be boolean");
  return {id:identifier(item.id),family:family as SelectionRequest["circuit"]["instances"][number]["family"],inputs:pins,output:identifier(item.output),allowedDrives,initialDrive:item.initialDrive as number,...(item.locked!==undefined?{locked:item.locked as boolean}:{})};
 });
 unique(instances.map(i=>i.id),"instance");
 const drivers=new Map<string,typeof instances[number]>();
 for(const instance of instances){if(inputs.includes(instance.output)||instance.output===clock||drivers.has(instance.output))fail("Net has multiple drivers: "+instance.output);drivers.set(instance.output,instance);}
 for(const net of [...instances.flatMap(i=>i.inputs),...outputs])if(!inputs.includes(net)&&!drivers.has(net))fail("Undriven net: "+net);
 if(instances.some(i=>i.family==="DFF")&&!clock)fail("Sequential graphs require a single rising-edge clock");
 if(clock&&!instances.some(i=>i.family==="DFF"))fail("Clock requires sequential instances");
 if(clock&&instances.some(i=>i.inputs.includes(clock)))fail("Clock may only connect to DFF clock pins implicitly");
 const visiting=new Set<string>(), visited=new Set<string>();
 const visit=(net:string)=>{const instance=drivers.get(net);if(!instance||instance.family==="DFF"||visited.has(net))return;if(visiting.has(net))fail("Combinational cycle detected");visiting.add(net);instance.inputs.forEach(visit);visiting.delete(net);visited.add(net);};
 instances.forEach(i=>visit(i.output));
 const reached=new Set<string>();const reachable=(net:string)=>{const instance=drivers.get(net);if(!instance||reached.has(instance.id))return;reached.add(instance.id);instance.inputs.forEach(reachable);};outputs.forEach(reachable);
 if(reached.size!==instances.length)fail("Every instance must contribute to a primary output");
 const netNames=new Set([...inputs,...outputs,...instances.flatMap(i=>[...i.inputs,i.output]),...(clock?[clock]:[])]);if(instances.some(i=>netNames.has(i.id)))fail("Instance identifiers cannot collide with net names");
 const normalized={} as SelectionRequest["constraints"];
 for(const [key,max] of Object.entries({clockPeriodNs:1e4,inputDelayNs:1e4,outputDelayNs:1e4,inputSlewNs:4,outputLoadPf:1,clockUncertaintyNs:1e4,holdUncertaintyNs:1e4})){
  const n=constraints[key];if(typeof n!=="number"||!Number.isFinite(n)||n<0||n>max||(["clockPeriodNs","inputSlewNs"].includes(key)&&n===0))fail("Invalid constraint "+key);
  normalized[key as keyof typeof normalized]=n as number;
 }
 return {schemaVersion:"dtco.cell-selection.request.v1",name:(body.name as string).trim(),libraryId:SELECTION_LIBRARY_ID,objective:body.objective as SelectionRequest["objective"],circuit:{name:identifier(circuit.name),inputs,outputs,clock,instances},constraints:normalized,maxEvaluations:body.maxEvaluations as number};
}
export const selectionExamples: SelectionOptions["examples"] = [
 {id:"combinational",label:"NAND / NOR / INV / AND combinational graph",request:{schemaVersion:"dtco.cell-selection.request.v1",name:"Combinational cell selection",libraryId:SELECTION_LIBRARY_ID,objective:"area",circuit:{name:"selection_comb",inputs:["a","b","c"],outputs:["y"],clock:null,instances:[{id:"u_nand",family:"NAND",inputs:["a","b"],output:"n1",allowedDrives:[1,2],initialDrive:2},{id:"u_nor",family:"NOR",inputs:["n1","c"],output:"n2",allowedDrives:[1,2],initialDrive:2},{id:"u_inv",family:"INV",inputs:["n2"],output:"n3",allowedDrives:[1,2],initialDrive:2},{id:"u_and",family:"AND",inputs:["n3","a"],output:"y",allowedDrives:[1,2],initialDrive:2}]},constraints:{clockPeriodNs:20,inputDelayNs:0,outputDelayNs:0,inputSlewNs:0.1,outputLoadPf:0.01,clockUncertaintyNs:0,holdUncertaintyNs:0},maxEvaluations:32}},
 {id:"sequential",label:"DFF – INV – DFF with setup and hold",request:{schemaVersion:"dtco.cell-selection.request.v1",name:"Sequential cell selection",libraryId:SELECTION_LIBRARY_ID,objective:"area",circuit:{name:"selection_seq",inputs:["d","clk"],outputs:["q"],clock:"clk",instances:[{id:"launch",family:"DFF",inputs:["d"],output:"n1",allowedDrives:[1,2],initialDrive:2},{id:"u_logic",family:"INV",inputs:["n1"],output:"n2",allowedDrives:[1,2],initialDrive:2},{id:"capture",family:"DFF",inputs:["n2"],output:"q",allowedDrives:[1,2],initialDrive:2}]},constraints:{clockPeriodNs:10,inputDelayNs:0.1,outputDelayNs:0,inputSlewNs:0.1,outputLoadPf:0.01,clockUncertaintyNs:0,holdUncertaintyNs:0},maxEvaluations:16}}
];
export interface SelectionSnapshot { physicalRuntime?:PhysicalRuntime; source?:{jobId:string;resultId:string;outputHashes:Record<string,string>}; schemaVersion: string; request:SelectionRequest; inputHashes:Record<string,string>; trusted:Array<{source:string;sha256:string}>; extraToolConfigurationIds:string[]; snapshotHash:string; }
export const isSelectionJob=(job:Pick<JobRecordV1,"parameters">)=>job.parameters.dtcoSelectionSnapshot!==undefined;
export function selectionSnapshot(job:Pick<JobRecordV1,"parameters">):SelectionSnapshot {
 const snapshot=job.parameters.dtcoSelectionSnapshot as unknown as SelectionSnapshot;
 if(!snapshot||![SELECTION_VERSION,SELECTION_PHYSICAL_VERSION].includes(snapshot.schemaVersion))throw new Error("Missing selection snapshot");
 const {snapshotHash,...content}=snapshot;if(sha(JSON.stringify(content))!==snapshotHash)throw new Error("Selection snapshot checksum changed");
 normalizeSelectionRequest(snapshot.request);return snapshot;
}
function configured(repositories:Repositories){
 const helper=repositories.tools.active("dtco").find(t=>t.toolId==="dtco-selection"), sta=repositories.tools.active("digital").find(t=>t.toolId==="opensta");
 for(const tool of [helper,sta]){const health=tool?repositories.tools.latestHealth(tool.id):null;if(!tool||!health||health.status!=="healthy"||health.selfTestPassed!==true)throw new Error((tool?.toolId??"Selection helper and OpenSTA")+" must pass configuration and native self-test");}
 if(!helper!.interpreterPath||!helper!.entryPoint||!sta!.executablePath||sta!.interpreterPath)throw new Error("Selection requires a trusted Python helper and native OpenSTA");
 return {helper:helper!,sta:sta!};
}
export async function selectionOptions(repositories:Repositories):Promise<SelectionOptions>{
 let reason:string|null=null;
 try{configured(repositories);await physicalConfiguration(repositories.tools);if(sha(await fs.readFile(SELECTION_LIBRARY_PATH))!==SELECTION_LIBRARY_SHA256)throw new Error("Registered Liberty checksum changed");}catch(error){reason=error instanceof Error?error.message:String(error);}
 return {available:reason===null,reason,libraries:[{id:SELECTION_LIBRARY_ID,label:"GF180 MCU 7-track 5 V typical",sha256:SELECTION_LIBRARY_SHA256}],examples:structuredClone(selectionExamples),defaults:structuredClone(selectionExamples[0]!.request)};
}
export function buildSelectionPlan(job:Pick<JobRecordV1,"parameters"|"toolConfigurations">):JobPlanV1{
 const snapshot=selectionSnapshot(job);if(snapshot.schemaVersion===SELECTION_PHYSICAL_VERSION)return buildPhysicalSelectionPlan(job,snapshot);const helper=job.toolConfigurations.find(t=>t.toolId==="dtco-selection"),sta=job.toolConfigurations.find(t=>t.toolId==="opensta"&&t.moduleId==="digital");
 if(!helper||!sta||!sta.executablePath||sta.interpreterPath||JSON.stringify(snapshot.extraToolConfigurationIds)!==JSON.stringify([sta.id]))throw new Error("Frozen selection helper/OpenSTA binding missing");
 const entry=fileURLToPath(new URL("../../../scripts/dtco/selection.py",import.meta.url));
 if(path.resolve(helper.rootPath??"",helper.entryPoint??"")!==entry)throw new Error("Selection helper entry point is not registered");
 const expected=[helper.interpreterPath,entry,sta.executablePath];if(expected.some(source=>!source)||JSON.stringify(snapshot.trusted.map(t=>t.source))!==JSON.stringify(expected))throw new Error("Selection trusted tool identities differ from frozen configurations");
 return {schemaVersion:"eda.job-plan.v1",capabilityVersion:SELECTION_VERSION,sweep:null,warnings:["Mapped standard-cell pre-layout timing and area; no dynamic power or physical signoff."],steps:[{id:"selection-search",name:"Evaluate discrete standard-cell assignments",description:"Bounded native OpenSTA evaluation of baseline and candidate assignments",required:true,weight:1,inputRoles:["selection-request","liberty","selection-runtime"],outputRoles:["dtco-selection-evidence"],process:{toolConfigurationId:helper.id,additionalToolConfigurationIds:snapshot.extraToolConfigurationIds,executableDisplay:"dtco-selection",argv:["--workspace","."],cwdRelative:".",environmentNames:helper.environmentNames,timeoutSeconds:600,expectedOutputs:["output/selection/result.json"]}}]};
}
export async function verifySelectionSnapshot(context:Pick<StepExecutionContextV1,"job"|"workspacePath">):Promise<SelectionSnapshot>{
 const snapshot=selectionSnapshot(context.job);
 if(snapshot.schemaVersion===SELECTION_PHYSICAL_VERSION)return verifyPhysicalSnapshot(context,snapshot);
 buildSelectionPlan(context.job);
 if(snapshot.inputHashes["selection-library.lib"]!==SELECTION_LIBRARY_SHA256||Object.keys(snapshot.inputHashes).length!==3)throw new Error("Selection input identities differ from registered inputs");
 const runtime=JSON.parse(await fs.readFile(await regular(context.workspacePath,"input/selection-runtime.json"),"utf8"));
 if(runtime.openstaPath!==snapshot.trusted[2]?.source||runtime.openstaSha256!==snapshot.trusted[2]?.sha256)throw new Error("Selection runtime differs from frozen native tool");
 const stagedRequest=JSON.parse(await fs.readFile(await regular(context.workspacePath,"input/selection-request.json"),"utf8"));if(JSON.stringify(normalizeSelectionRequest(stagedRequest))!==JSON.stringify(snapshot.request))throw new Error("Selection staged request differs from frozen request");
 for(const [relative,digest]of Object.entries(snapshot.inputHashes))if(sha(await fs.readFile(await regular(context.workspacePath,"input/"+relative)))!==digest)throw new Error("Frozen selection input changed: "+relative);
 for(const file of snapshot.trusted)if(sha(await fs.readFile(file.source))!==file.sha256)throw new Error("Trusted selection tool changed");
 return snapshot;
}
export async function submitSelection(repositories:Repositories,storage:StorageService,ownerId:string,value:unknown):Promise<JobRecordV1>{return submitPhysicalSelection(repositories,storage,ownerId,value);}
export function validateSelectionResult(value:unknown,request:SelectionRequest):SelectionResult{
 const result=object(value);
 if(result.schemaVersion!=="dtco.cell-selection.result.v1"||!["ok","no_feasible_candidate","inconclusive"].includes(String(result.status))||!Array.isArray(result.evaluations)||!result.evaluations.length||result.evaluations.length>request.maxEvaluations)throw new Error("Invalid selection result schema or evaluation count");
 if(JSON.stringify(normalizeSelectionRequest(result.request))!==JSON.stringify(request))throw new Error("Selection result request differs from frozen request");
 const sequential=request.circuit.instances.some(i=>i.family==="DFF"),ids=new Set<string>();
 for(const item of result.evaluations){
  const e=object(item);if(typeof e.id!=="string"||ids.has(e.id))throw new Error("Invalid evaluation identity");ids.add(e.id);
  if(typeof e.feasible!=="boolean")throw new Error("Missing feasibility");
  const assignments=object(e.assignment),cells=object(e.cells);if(Object.keys(assignments).length!==request.circuit.instances.length||Object.keys(cells).length!==request.circuit.instances.length)throw new Error("Candidate instance set changed");for(const instance of request.circuit.instances){if(!instance.allowedDrives.includes(assignments[instance.id] as number)||(instance.locked&&assignments[instance.id]!==instance.initialDrive))throw new Error("Candidate violates discrete domain");const base={INV:"inv",NAND:"nand2",NOR:"nor2",AND:"and2",DFF:"dffq"}[instance.family];if(cells[instance.id]!=="gf180mcu_fd_sc_mcu7t5v0__"+base+"_"+assignments[instance.id])throw new Error("Candidate cell binding mismatch");}
  if(typeof e.areaUm2!=="number"||!Number.isFinite(e.areaUm2)||e.areaUm2<=0)throw new Error("Invalid candidate cell area");
  if(e.feasible){for(const key of sequential?["areaUm2","pathDelayNs","setupSlackNs","holdSlackNs","maxSlackNs","minSlackNs"]:["areaUm2","pathDelayNs","maxSlackNs","minSlackNs"])if(typeof e[key]!=="number"||!Number.isFinite(e[key]))throw new Error("Feasible evaluation lacks actual constrained timing: "+key);if(Number(e.pathDelayNs)<0||Number(e.maxSlackNs)<-1e-9||Number(e.minSlackNs)<-1e-9||sequential&&(Number(e.setupSlackNs)<-1e-9||Number(e.holdSlackNs)<-1e-9)||!sequential&&Number(e.maxSlackNs)<-1e-9)throw new Error("Timing violating candidate marked feasible");}
 }
 if(!ids.has(String(result.baselineEvaluationId)))throw new Error("Baseline evaluation missing");
 const baseline=object(result.evaluations.find(v=>object(v).id===result.baselineEvaluationId));for(const instance of request.circuit.instances)if(object(baseline.assignment)[instance.id]!==instance.initialDrive)throw new Error("Baseline differs from requested initial assignment");
 const best=result.evaluations.find(v=>object(v).id===result.bestEvaluationId);
 if(result.status==="ok"&&(!best||object(best).feasible!==true)||result.status!=="ok"&&(result.bestEvaluationId!==null||result.evaluations.some(v=>object(v).feasible===true)))throw new Error("Invalid best feasible evaluation");
 const search=object(result.search);if(search.evaluated!==result.evaluations.length||typeof search.method!=="string"||typeof search.termination!=="string")throw new Error("Invalid search evidence");
 if(result.status==="inconclusive"&&!result.evaluations.some(v=>object(v).status==="unknown"))throw new Error("Inconclusive result requires unknown timing evidence");
 const library=object(result.library);if(library.sha256!==SELECTION_LIBRARY_SHA256||library.id!==SELECTION_LIBRARY_ID)throw new Error("Selection library provenance mismatch");
 return result as unknown as SelectionResult;
}
export async function parseSelectionResult(context:StepExecutionContextV1):Promise<ParsedModuleResultV1>{
 const snapshot=await verifySelectionSnapshot(context);let result=validateSelectionResult(JSON.parse(await fs.readFile(await regular(context.workspacePath,"output/selection/result.json"),"utf8")),snapshot.request);
 if(snapshot.schemaVersion===SELECTION_PHYSICAL_VERSION){
  if(snapshot.source)for(const [relative,digest]of Object.entries(snapshot.source.outputHashes))if(sha(await fs.readFile(await regular(context.workspacePath,relative)))!==digest)throw new Error("Restored source evidence changed");
  result=await mergePhysicalResult(context.workspacePath,result,snapshot.physicalRuntime);
  if(snapshot.source)result.completeness={...result.completeness!,sourceJobId:snapshot.source.jobId,sourceResultId:snapshot.source.resultId};
  await fs.writeFile(path.join(context.workspacePath,"output/selection/complete-result.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
 }
 const outputHashes:Record<string,string>={};for(const relative of await listOutputs(context.workspacePath,"output/selection",snapshot.schemaVersion===SELECTION_PHYSICAL_VERSION?16384:4096))outputHashes[relative]=sha(await fs.readFile(await regular(context.workspacePath,relative)));
 return {title:result.request.name,summary:{workflow:"cell-selection",status:result.status,evaluated:result.evaluations.length,bestEvaluationId:result.bestEvaluationId},data:{dtcoSelection:JSON.parse(JSON.stringify({...result,provenance:{snapshotHash:snapshot.snapshotHash,inputHashes:snapshot.inputHashes,outputHashes,trusted:snapshot.trusted,...(snapshot.source?{sourceJobId:snapshot.source.jobId,sourceResultId:snapshot.source.resultId}:{})}}))},artifactRoles:["dtco-selection-evidence"],parserId:snapshot.schemaVersion,parserVersion:snapshot.schemaVersion===SELECTION_PHYSICAL_VERSION?"2.0.0":"1.0.0"};
}
