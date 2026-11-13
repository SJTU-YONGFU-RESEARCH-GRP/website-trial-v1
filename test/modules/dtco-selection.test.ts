import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeSelectionRequest, selectionExamples, selectionSnapshot, validateSelectionResult, verifySelectionSnapshot, SELECTION_LIBRARY_ID, SELECTION_LIBRARY_SHA256, SELECTION_LIBRARY_PATH } from "../../server/modules/dtco/selection.ts";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";
import type { JobRecordV1 } from "../../shared/contracts/v1.ts";
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>fs.rm(root,{recursive:true,force:true})));});
function result(sequential=false){
 const request=structuredClone(selectionExamples[sequential?1:0]!.request),assignment=Object.fromEntries(request.circuit.instances.map(i=>[i.id,i.initialDrive])),base={INV:"inv",NAND:"nand2",NOR:"nor2",AND:"and2",DFF:"dffq"};
 return {schemaVersion:"dtco.cell-selection.result.v1",status:"ok",bestEvaluationId:"e0",baselineEvaluationId:"e0",request,evaluations:[{id:"e0",index:0,assignment,cells:Object.fromEntries(request.circuit.instances.map(i=>[i.id,"gf180mcu_fd_sc_mcu7t5v0__"+base[i.family]+"_"+i.initialDrive])),areaUm2:10,pathDelayNs:0.5,setupSlackNs:sequential?1:null,holdSlackNs:sequential?0.1:null,maxSlackNs:1,minSlackNs:0.1,feasible:true,status:"feasible",reason:"",artifacts:{}}],search:{method:"exhaustive",spaceSize:16,evaluated:1,termination:"budget"},library:{id:SELECTION_LIBRARY_ID,sha256:SELECTION_LIBRARY_SHA256}};
}
describe("DTCO discrete selection validation",()=>{
 it("accepts both reusable example graphs and preserves arbitrary graph identities",()=>{for(const example of selectionExamples)expect(normalizeSelectionRequest(example.request)).toEqual(example.request);});
 it("rejects bad domains, missing drivers, duplicate drivers, unsafe identities and cycles",()=>{
  for(const mutate of [
   (r:any)=>r.circuit.instances[0].allowedDrives=[3],
   (r:any)=>r.circuit.instances[0].initialDrive=4,
   (r:any)=>r.circuit.instances[0].inputs=["missing","b"],
   (r:any)=>r.circuit.instances[0].output="a",
   (r:any)=>r.circuit.instances[0].id="module",
   (r:any)=>r.circuit.instances[0].id="n1",
   (r:any)=>r.circuit.instances[0].inputs=["n3","b"],
   (r:any)=>r.maxEvaluations=257,
   (r:any)=>r.constraints.inputSlewNs=5,
   (r:any)=>r.constraints.outputLoadPf=2,
   (r:any)=>r.constraints.clockPeriodNs=Infinity,
  ]){const request=structuredClone(selectionExamples[0]!.request);mutate(request);expect(()=>normalizeSelectionRequest(request)).toThrow();}
 });
 it("rejects dangling logic and clock-as-data but permits DFF feedback",()=>{
  const seq=structuredClone(selectionExamples[1]!.request);seq.circuit.instances[0]!.inputs=["q"];expect(()=>normalizeSelectionRequest(seq)).not.toThrow();
  seq.circuit.instances[0]!.inputs=["clk"];expect(()=>normalizeSelectionRequest(seq)).toThrow();
  const comb=structuredClone(selectionExamples[0]!.request);comb.circuit.instances.push({id:"dangling",family:"INV",inputs:["a"],output:"unused",allowedDrives:[1],initialDrive:1});expect(()=>normalizeSelectionRequest(comb)).toThrow();
 });
 it("requires actual setup AND hold and global min/max evidence for feasible sequential candidates",()=>{
  const good=result(true);expect(validateSelectionResult(good,good.request).bestEvaluationId).toBe("e0");
  for(const key of ["setupSlackNs","holdSlackNs","maxSlackNs","minSlackNs","pathDelayNs"]){const bad=structuredClone(good);(bad.evaluations[0] as any)[key]=null;expect(()=>validateSelectionResult(bad,good.request)).toThrow();}
  const bad=structuredClone(good);bad.evaluations[0]!.holdSlackNs=-0.1;expect(()=>validateSelectionResult(bad,good.request)).toThrow();
 });
 it("rejects wrong baseline assignment, library or cell binding and preserves inconclusive evidence",()=>{
  const good=result();
  const bad=structuredClone(good);bad.evaluations[0]!.assignment.u_inv=1;expect(()=>validateSelectionResult(bad,good.request)).toThrow();
  const unknown:any=structuredClone(good);unknown.status="inconclusive";unknown.bestEvaluationId=null;unknown.evaluations[0].feasible=false;unknown.evaluations[0].status="unknown";unknown.evaluations[0].pathDelayNs=null;expect(validateSelectionResult(unknown,good.request).status).toBe("inconclusive");
  unknown.library.sha256="tampered";expect(()=>validateSelectionResult(unknown,good.request)).toThrow();
 });
 it("fences snapshot JSON, staged requests and missing native tool bindings",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"selection-snapshot-"));roots.push(root);await fs.mkdir(path.join(root,"input"));
  const helperPath=path.resolve("scripts/dtco/selection.py"),nativePath=path.join(root,"sta");await fs.writeFile(nativePath,"native");
  const helper={id:"helper",toolId:"dtco-selection",moduleId:"dtco",interpreterPath:"/usr/bin/python3",entryPoint:helperPath,rootPath:path.resolve("."),environmentNames:[]},sta={id:"sta",toolId:"opensta",moduleId:"digital",executablePath:nativePath};
  const request=normalizeSelectionRequest(selectionExamples[0]!.request),runtime=JSON.stringify({openstaPath:nativePath,openstaSha256:sha("native")}),requestText=JSON.stringify(request);
  await fs.writeFile(path.join(root,"input/selection-request.json"),requestText);await fs.writeFile(path.join(root,"input/selection-runtime.json"),runtime);await fs.copyFile(SELECTION_LIBRARY_PATH,path.join(root,"input/selection-library.lib"));
  const trusted=await Promise.all([helper.interpreterPath,helperPath,nativePath].map(async source=>({source,sha256:createHash("sha256").update(await fs.readFile(source)).digest("hex")})));
  const content={schemaVersion:"dtco.cell-selection.v1",request,inputHashes:{"selection-request.json":sha(requestText),"selection-runtime.json":sha(runtime),"selection-library.lib":SELECTION_LIBRARY_SHA256},trusted,extraToolConfigurationIds:[sta.id]};
  const job={parameters:{dtcoSelectionSnapshot:{...content,snapshotHash:sha(JSON.stringify(content))}},toolConfigurations:[helper,sta]} as unknown as JobRecordV1;
  expect(selectionSnapshot(job).request).toEqual(content.request);await verifySelectionSnapshot({job,workspacePath:root});
  await fs.writeFile(path.join(root,"input/selection-request.json"),JSON.stringify({...request,name:"changed"}));await expect(verifySelectionSnapshot({job,workspacePath:root})).rejects.toThrow("staged request");
  (job.parameters.dtcoSelectionSnapshot as any).request.name="changed";expect(()=>selectionSnapshot(job)).toThrow("checksum changed");
 });
 it("enforces selection route ownership and session CSRF and hides other DTCO workflows",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"selection-api-"));roots.push(root);
  const app=await createEdaApp({config:loadConfig({EDA_STORAGE_ROOT:root}),startWorkers:false,serveFrontend:false,logger:false});
  try{
   const repos=app.eda.repositories,owner=repos.users.create({username:"selection-owner",password:"strong-enough-password"}),other=repos.users.create({username:"selection-other",password:"strong-enough-password"});
   const session=repos.sessions.create(other.id,1),headers={cookie:"eda_session="+session.sessionId};
   const manifest:any={schemaVersion:"eda.input-manifest.v1",files:[],totalBytes:0,fileCount:0,rootHint:null,createdAt:new Date().toISOString()};
   const job=repos.jobs.createDraft(owner.id,"dtco","cell-selection","Selection",manifest);repos.jobs.updateDraftContent(job.id,manifest,{dtcoSelectionSnapshot:{}});
   expect((await app.inject({url:"/api/dtco/selection/runs/"+job.id,headers})).statusCode).toBe(404);
   expect((await app.inject({method:"POST",url:"/api/dtco/selection/runs/"+job.id+"/retry",headers:{...headers,"x-csrf-token":session.csrfToken}})).statusCode).toBe(404);
   expect((await app.inject({method:"POST",url:"/api/dtco/selection/runs/"+job.id+"/complete-layout",headers:{...headers,"x-csrf-token":session.csrfToken},payload:{}})).statusCode).toBe(404);
   const before=repos.jobs.list({moduleId:"dtco",limit:200}).length;await app.inject({url:"/api/dtco/selection/runs/"+job.id,headers});expect(repos.jobs.list({moduleId:"dtco",limit:200})).toHaveLength(before);
   expect((await app.inject({method:"POST",url:"/api/dtco/selection/runs",headers,payload:selectionExamples[0]!.request})).statusCode).toBe(403);
   const listed=await app.inject({url:"/api/dtco/selection/runs",headers});expect(listed.statusCode).toBe(200);expect(listed.json().data).toEqual([]);
   const denied=repos.users.create({username:"selection-denied",password:"strong-enough-password",allowedModules:["digital"]}),deniedSession=repos.sessions.create(denied.id,1);
   expect((await app.inject({url:"/api/dtco/selection/options",headers:{cookie:"eda_session="+deniedSession.sessionId}})).statusCode).toBe(403);
  }finally{await app.close();}
 });
});
