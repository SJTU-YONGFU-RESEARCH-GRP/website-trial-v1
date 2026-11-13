import {describe,it,expect} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {EdaDatabase} from "../../server/app/db/database.ts";
import {makeRepositories} from "../../server/app/db/repositories.ts";
import {ModuleRegistry} from "../../server/app/modules/registry.ts";
import {StorageService} from "../../server/app/storage/storage.ts";
import {SafeProcessRunner} from "../../server/app/process/safeProcess.ts";
import {JobRunner,ToolConcurrencyGate} from "../../server/worker/runner.ts";
describe("weighted native gate for unified helpers",()=>{
 it.each(["nonzero","timeout","cancelled"])("only recovers scoped native exit, preserving %s semantics",async(kind)=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"unified-worker-")),database=new EdaDatabase(":memory:");database.migrate();
  try{
   const storage=new StorageService(root);await storage.initialize();const repos=makeRepositories(database),user=repos.users.create({username:"unified-test",password:"a sufficiently strong password"});
   const manifest={schemaVersion:"eda.input-manifest.v1" as const,files:[],totalBytes:0,fileCount:0,rootHint:null,createdAt:new Date().toISOString()};
   const job=repos.jobs.createDraft(user.id,"acg","unified","unified",manifest);await storage.createWorkspace(job.id);repos.jobs.beginValidation(job.id);
   repos.jobs.setDraft(job.id,manifest,{},"test",[],{},{schemaVersion:"eda.job-plan.v1",capabilityVersion:"test",sweep:null,warnings:[],steps:["generate","report"].map(id=>({id,name:id,description:id,required:id!=="generate",weight:1,process:null,inputRoles:[],outputRoles:[]}))});repos.jobs.start(job.id);
   let reportExecuted=false;const registry=new ModuleRegistry();
   registry.register({moduleId:"acg",capabilities:async()=>[],validateDraft:async()=>({valid:true,errors:[],warnings:[]}),buildPlan:async()=>{throw Error("unused");},
    executeStep:async(context)=>{if(context.step.stepKey==="generate"){if(kind!=="nonzero")throw {type:kind,code:kind==="timeout"?"PROCESS_TIMEOUT":"JOB_CANCELLED",message:kind,stepId:context.step.id,retryable:false,details:null};return {exitCode:7,outputs:{unifiedRecoverable:true}};}reportExecuted=true;return {exitCode:0,outputs:{}};},
    parseResult:async()=>({title:"Truthful partial",summary:{status:"partial"},data:{acg:{processStatus:"failed",nativeExitCode:7},acgUnified:{stages:[{id:"generation",status:"failed"}]}},artifactRoles:[],parserId:"test",parserVersion:"1"}),publishResult:async()=>{},collectArtifacts:async()=>[]});
   await new JobRunner(repos,registry,storage,new SafeProcessRunner(100)).run(repos.jobs.claim("acg")!);
   const finished=repos.jobs.get(job.id)!;expect(reportExecuted).toBe(kind==="nonzero");
   expect(finished.status).toBe(kind==="nonzero"?"succeeded":kind==="cancelled"?"cancelled":"failed");
   expect(repos.jobs.steps(job.id)[0]!.status).toBe(kind==="cancelled"?"cancelled":"failed");
   if(kind==="nonzero"){expect(repos.jobs.steps(job.id)[0]!.exitCode).toBe(7);expect(repos.results.get("acg",finished.resultId!,user.id,false)!.data.acg).toMatchObject({processStatus:"failed",nativeExitCode:7});}else expect(finished.resultId).toBeNull();
  }finally{database.close();await fs.rm(root,{recursive:true,force:true});}
 });
 it("shares native capacity with generation and reserves all comparison threads",async()=>{
  const gate=new ToolConcurrencyGate(),signal=new AbortController().signal;
  const generation=await gate.acquire("acg-mr",2,signal);let admitted=false;
  const comparison=gate.acquire("acg-mr",2,signal,2).then(release=>{admitted=true;return release;});
  await new Promise(r=>setTimeout(r,120));expect(admitted).toBe(false);generation();
  const release=await comparison;let ordinaryAdmitted=false;
  const ordinary=gate.acquire("acg-mr",2,signal).then(r=>{ordinaryAdmitted=true;return r;});
  await new Promise(r=>setTimeout(r,120));expect(ordinaryAdmitted).toBe(false);release();release();(await ordinary)();
 });
 it("cancels queued reservations without losing or leaking capacity",async()=>{
  const gate=new ToolConcurrencyGate(),controller=new AbortController(),signal=new AbortController().signal;
  const release=await gate.acquire("acg-mr",1,signal),waiting=gate.acquire("acg-mr",1,controller.signal);
  controller.abort();await expect(waiting).rejects.toMatchObject({type:"cancelled"});release();
  (await gate.acquire("acg-mr",1,signal))();await expect(gate.acquire("acg-mr",1,signal,2)).rejects.toThrow(/reservation/);
 });
});
