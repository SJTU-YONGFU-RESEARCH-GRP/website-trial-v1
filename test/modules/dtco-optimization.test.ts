import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DtcoExperimentDefinition, DtcoOptimization, DtcoOptimizationDefinition, DtcoOptions, DtcoPointCoordinates } from "../../shared/contracts/dtco.ts";
import type { JobRecordV1, JsonObject, ResultRecordV1 } from "../../shared/contracts/v1.ts";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";
import { StorageService } from "../../server/app/storage/storage.ts";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import { WorkerSupervisor } from "../../server/worker/index.ts";
import { loadConfig } from "../../server/app/config.ts";
import { createEdaApp } from "../../server/app/app.ts";
const mocks=vi.hoisted(()=>({options:vi.fn(),prepare:vi.fn()}));
vi.mock("../../server/modules/dtco/environment.ts",()=>({getDtcoOptions:mocks.options,prepareDtcoJob:mocks.prepare}));
import { DtcoOptimizationCoordinator, DtcoOptimizationService, normalizeOptimization, optimizationOptions } from "../../server/modules/dtco/optimizationService.ts";
const option=(id:string)=>({id,label:id,available:true,reason:null});
const base:DtcoExperimentDefinition={name:"Physical",circuitId:"gf180-inverter",technologyId:"gf180mcuA",modelVersion:"model-hash",temperaturesC:[25],voltagesV:[3.3],layoutIds:["mr-sa-12t-pex"],loadFf:10,inputSlewPs:100,periodNs:10};
const options:DtcoOptions={circuits:[option(base.circuitId)],technologies:[option(base.technologyId)],models:[{...option(base.modelVersion),technologyId:base.technologyId,sourceHash:"hash"}],layouts:[option("mr-sa-12t-pex")],electricalModes:[option("extracted")],available:true,unavailableReason:null,tools:[],defaults:base,maxPoints:64,environmentHash:"environment",metricScope:"physical capacitance extraction"};
const roots:string[]=[],databases:EdaDatabase[]=[];
beforeEach(()=>{
 mocks.options.mockResolvedValue(options);
 mocks.prepare.mockImplementation(async(_repositories,storage:StorageService,job:JobRecordV1,definition:DtcoExperimentDefinition,coordinates:DtcoPointCoordinates)=>{
   await storage.createWorkspace(job.id);
   return {inputManifest:job.inputManifest,parameters:{dtcoSnapshot:{definition,coordinates:{temperatureC:coordinates.temperatureC,voltageV:coordinates.voltageV,layoutId:coordinates.layoutId},environmentHash:"environment"}},capabilityVersion:"unit",toolConfigurations:[],toolVersions:{},plan:{schemaVersion:"eda.job-plan.v1",capabilityVersion:"unit",steps:[{id:"native",name:"Native",description:"",required:true,weight:1,process:null,inputRoles:[],outputRoles:[]}],sweep:null,warnings:[]}};
 });
});
afterEach(async()=>{for(const db of databases.splice(0)){try{db.close();}catch{}}await Promise.all(roots.splice(0).map(root=>fs.rm(root,{recursive:true,force:true})));});
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-optimizer-"));roots.push(root);
 const filename=path.join(root,"db.sqlite"),db=new EdaDatabase(filename);db.migrate();databases.push(db);
 const repositories=makeRepositories(db),user=repositories.users.create({username:"optimizer-owner",password:"strong-password"});
 const storage=new StorageService(path.join(root,"storage"));await storage.initialize();
 const service=new DtcoOptimizationService(repositories,storage),coordinator=new DtcoOptimizationCoordinator(service);
 return {root,filename,db,repositories,user,storage,service,coordinator};
}
function definition(overrides:Partial<DtcoOptimizationDefinition>={}):DtcoOptimizationDefinition{
 return {...optimizationOptions(options).defaults,objective:{metric:"averagePowerW"},maxIterations:3,patience:4,...overrides};
}
async function start(f:Awaited<ReturnType<typeof fixture>>,overrides:Partial<DtcoOptimizationDefinition>={}){
 const run=await f.service.create(f.user.id,randomUUID(),definition(overrides));return f.service.start(run.id);
}
function succeed(repositories:ReturnType<typeof makeRepositories>,run:DtcoOptimization,power:number,mutate?:(record:ResultRecordV1)=>void):ResultRecordV1{
 const iteration=run.iterations.at(-1)!,job=repositories.jobs.get(iteration.jobId!)!;
 if(job.status==="queued")repositories.jobs.claim("dtco");
 const hash="a".repeat(64),id=randomUUID(),at=new Date().toISOString();
 const provenance={selectedGdsPath:"output/final.gds",selectedGdsSha256:hash,
   extraction:{status:"validated",drcCount:0,drcStyle:"drc(full)",method:"physical_gds_full_capacitance",resistanceExtracted:false,signoff:false,validationPath:"output/validation.json",validationSha256:hash,electricalNetlistPath:"output/extracted.spice",electricalNetlistSha256:hash,deviceCount:2,capacitorCount:4,sourceGeometryMatched:true,finalGdsRoundtrip:true},
   inputHashes:{},outputHashes:{"output/final.gds":hash,"output/validation.json":hash,"output/extracted.spice":hash}};
 const result:ResultRecordV1={schemaVersion:"eda.result.v1",id,moduleId:"dtco",ownerId:run.ownerId,lifecycle:"private",title:"Unit-only measured result",summary:{},data:{dtco:{electricalMode:"extracted",design:{...iteration.candidate.design,lengthUm:0.28},metrics:{delayPs:100,averagePowerW:power,areaUm2:10},provenance}},
   provenance:{origin:"computed",jobId:job.id,ownerId:run.ownerId,inputManifestSha256:createHash("sha256").update(JSON.stringify(job.inputManifest)).digest("hex"),parameters:job.parameters,capabilityVersion:job.capabilityVersion,toolConfigurations:[],toolVersions:{},parserId:"unit",parserVersion:"1",createdAt:at},
   artifactIds:[],createdAt:at,updatedAt:at,publishedAt:null};
 mutate?.(result);
 repositories.jobs.transaction(()=>{repositories.results.insert(result);repositories.jobs.transition(job.id,"succeeded",{resultId:id});});return result;
}
describe("persistent measured DTCO optimizer",()=>{
 it("validates bounded grid axes, fixed axes, goals and waveform budgets",()=>{
   expect(normalizeOptimization(definition(),options).axes.nmosWidthUm.min).toBe(1);
   for(const axes of [{nmosWidthUm:{min:.7,max:1.3,initial:.73,step:.3},pmosWidthUm:definition().axes.pmosWidthUm},{...definition().axes,pmosWidthUm:{min:1.4,max:2.6,initial:2,step:0}}])expect(()=>normalizeOptimization(definition({axes}),options)).toThrow();
   for(const value of [{maxIterations:65},{patience:1.5},{temperatureC:Infinity},{inputSlewPs:1,periodNs:1000},{objective:{metric:"balanced",weights:{delay:0,power:0,area:0}}},{layoutIds:["legacy"]}])expect(()=>normalizeOptimization({...definition(),...value},options)).toThrow();
   expect(optimizationOptions({...options,electricalModes:[]}).available).toBe(false);
   const advertised={...options,designBounds:{nmosWidthUm:{min:.95,max:1.3,step:.05},pmosWidthUm:{min:1.4,max:2.6,step:.05}}};
   expect(optimizationOptions(advertised).bounds.nmosWidthUm.min).toBe(.95);
   expect(()=>normalizeOptimization(definition({axes:{...definition().axes,nmosWidthUm:{min:.9,max:1,initial:1,step:.05}}}),advertised)).toThrow();
 });
 it("deduplicates create/start/reconcile and rejects request-id reuse without orphan experiments",async()=>{
   const f=await fixture(),request=randomUUID(),[a,b]=await Promise.all([f.service.create(f.user.id,request,definition()),f.service.create(f.user.id,request,definition())]);
   expect(a.id).toBe(b.id);expect(f.repositories.dtco.list(f.user.id)).toHaveLength(1);
   await expect(f.service.create(f.user.id,request,definition({name:"changed"}))).rejects.toMatchObject({code:"DTCO_REQUEST_REUSED"});
   await Promise.all([f.service.start(a.id),f.service.start(a.id)]);
   expect(f.repositories.dtcoOptimizations.get(a.id)!.iterations).toHaveLength(1);
   await Promise.all([f.coordinator.reconcile(a.id),f.coordinator.reconcile(a.id)]);
   expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(1);
   expect(f.repositories.dtcoOptimizations.get(a.id)!.iterations[0]!.attempts).toHaveLength(1);
 });
 it("retains the measured best after a worse positive probe and reverses around it",async()=>{
   const f=await fixture(),initial=await start(f);await f.coordinator.tick();
   let run=f.repositories.dtcoOptimizations.get(initial.id)!;succeed(f.repositories,run,100);
   await Promise.all([f.coordinator.reconcile(run.id),f.coordinator.reconcile(run.id)]);
   run=f.repositories.dtcoOptimizations.get(run.id)!;
   expect(run.iterations[1]!.candidate.design).toEqual({nmosWidthUm:1,pmosWidthUm:2.6});
   expect(run.iterations[1]!.baseIterationId).toBe(run.iterations[0]!.id);
   await f.coordinator.tick();run=f.repositories.dtcoOptimizations.get(run.id)!;succeed(f.repositories,run,120);await f.coordinator.tick();
   run=f.repositories.dtcoOptimizations.get(run.id)!;expect(run.bestIterationId).toBe(run.iterations[0]!.id);expect(run.bestScore).toBe(100);
   expect(run.iterations[2]!.candidate.design).toEqual({nmosWidthUm:1,pmosWidthUm:1.4});expect(run.iterations[2]!.baseIterationId).toBe(run.iterations[0]!.id);
   await f.coordinator.tick();run=f.repositories.dtcoOptimizations.get(run.id)!;succeed(f.repositories,run,80);await f.coordinator.tick();
   run=f.repositories.dtcoOptimizations.get(run.id)!;expect(run.status).toBe("completed");expect(run.stopReason).toBe("max_iterations");expect(run.bestScore).toBe(80);
   expect(run.iterations.map(item=>item.accepted)).toEqual([true,false,true]);expect(run.iterations.every(item=>item.metrics&&item.provenance&&item.resultId)).toBe(true);
   await f.coordinator.tick();expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(3);
 });
 it("keeps a true best improvement below the significance threshold while patience stops",async()=>{
   const f=await fixture(),initial=await start(f,{patience:1,minRelativeImprovement:.01});await f.coordinator.tick();
   let run=f.repositories.dtcoOptimizations.get(initial.id)!;succeed(f.repositories,run,100);await f.coordinator.tick();await f.coordinator.tick();
   run=f.repositories.dtcoOptimizations.get(run.id)!;succeed(f.repositories,run,99.5);await f.coordinator.tick();
   run=f.repositories.dtcoOptimizations.get(run.id)!;
   expect(run.bestScore).toBe(99.5);expect(run.iterations[1]!.accepted).toBe(true);expect(run.iterations[1]!.significantImprovement).toBe(false);expect(run.stopReason).toBe("patience");
 });
 it("normalizes balanced objective to the measured baseline and stops on the target",async()=>{
   const f=await fixture(),initial=await start(f,{objective:{metric:"balanced",weights:{delay:0,power:2,area:0},target:.9}});
   await f.coordinator.tick();let run=f.repositories.dtcoOptimizations.get(initial.id)!;succeed(f.repositories,run,100);await f.coordinator.tick();
   expect(f.repositories.dtcoOptimizations.get(run.id)!.bestScore).toBe(1);
   await f.coordinator.tick();run=f.repositories.dtcoOptimizations.get(run.id)!;succeed(f.repositories,run,80);await f.coordinator.tick();
   run=f.repositories.dtcoOptimizations.get(run.id)!;expect(run.bestScore).toBe(.8);expect(run.stopReason).toBe("target_reached");
 });
 it("reloads a committed terminal result and continues exactly one new round",async()=>{
   const f=await fixture(),initial=await start(f);await f.coordinator.tick();const prior=f.repositories.dtcoOptimizations.get(initial.id)!;succeed(f.repositories,prior,100);
   f.db.close();databases.splice(databases.indexOf(f.db),1);const db=new EdaDatabase(f.filename);db.migrate();databases.push(db);
   const repositories=makeRepositories(db),service=new DtcoOptimizationService(repositories,f.storage),coordinator=new DtcoOptimizationCoordinator(service);
   await Promise.all([coordinator.tick(),coordinator.tick()]);let run=repositories.dtcoOptimizations.get(prior.id)!;
   expect(run.iterations).toHaveLength(2);expect(run.bestScore).toBe(100);expect(run.iterations[0]!.resultId).toBeTruthy();
   await Promise.all([coordinator.tick(),coordinator.tick()]);run=repositories.dtcoOptimizations.get(prior.id)!;
   expect(run.iterations[1]!.attempts).toHaveLength(1);expect(repositories.jobs.list({moduleId:"dtco"})).toHaveLength(2);
 });
 it("does not recover another worker preparation when starting API-only",async()=>{
   const f=await fixture(),initial=await start(f),point=initial.iterations[0]!.pointId;
   f.repositories.dtco.reserve(point,false);
   const app=await createEdaApp({database:f.db,config:loadConfig({EDA_STORAGE_ROOT:path.join(f.root,"storage")}),startWorkers:false,serveFrontend:false,logger:false});
   expect(f.repositories.dtcoOptimizations.get(initial.id)!.iterations[0]!.status).toBe("preparing");
   await app.close();
 });
 it("recovers standalone worker preparation and requires explicit tokenized retry",async()=>{
   const f=await fixture(),initial=await start(f),point=initial.iterations[0]!.pointId;
   const reserved=f.repositories.dtco.reserve(point,false)!;
   const prepared=await mocks.prepare(f.repositories,f.storage,f.repositories.jobs.get(reserved.attempt.jobId)!,f.repositories.dtco.get(initial.experimentId)!.definition,initial.iterations[0]!.candidate);
   f.repositories.jobs.setDraft(reserved.attempt.jobId,prepared.inputManifest,prepared.parameters,prepared.capabilityVersion,prepared.toolConfigurations,prepared.toolVersions,prepared.plan);
   const supervisor=new WorkerSupervisor(f.repositories,new ModuleRegistry(),f.storage,loadConfig().queueConcurrency);
   expect(f.repositories.dtcoOptimizations.get(initial.id)!.iterations[0]!.status).toBe("preparation_failed");await supervisor.stop();
   await f.coordinator.tick();let run=f.repositories.dtcoOptimizations.get(initial.id)!;
   expect(run.status).toBe("paused");expect(run.allowedActions).toContain("resume");
   await Promise.all([f.service.resume(run.id,run.iterations[0]!.id,reserved.attempt.id),f.service.resume(run.id,run.iterations[0]!.id,reserved.attempt.id)]);
   await Promise.all([f.coordinator.tick(),f.coordinator.tick()]);run=f.repositories.dtcoOptimizations.get(run.id)!;
   expect(run.iterations).toHaveLength(1);expect(run.iterations[0]!.attempts).toHaveLength(2);expect(run.iterations[0]!.status).toBe("queued");
 });
 it("does not automatically retry failures and rejects stale resume tokens",async()=>{
   const f=await fixture(),initial=await start(f);mocks.prepare.mockRejectedValue(new Error("native preparation failed"));
   await f.coordinator.tick();await f.coordinator.tick();let run=f.repositories.dtcoOptimizations.get(initial.id)!;
   expect(run.status).toBe("paused");const iteration=run.iterations[0]!,attempt=iteration.attemptId!;
   await f.coordinator.tick();expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(1);
   await f.service.resume(run.id,iteration.id,attempt);await f.coordinator.tick();await f.coordinator.tick();run=f.repositories.dtcoOptimizations.get(run.id)!;
   expect(run.iterations[0]!.attempts).toHaveLength(2);
   await expect(f.service.resume(run.id,iteration.id,attempt)).rejects.toMatchObject({code:"DTCO_OPTIMIZATION_NOT_RESUMABLE"});
   expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(2);
 });
 it("stops queued work without adding another round and stop is idempotent",async()=>{
   const f=await fixture(),initial=await start(f);await f.coordinator.tick();
   f.repositories.dtcoOptimizations.stop(initial.id);f.repositories.dtcoOptimizations.stop(initial.id);
   await f.coordinator.tick();await f.coordinator.tick();const run=f.repositories.dtcoOptimizations.get(initial.id)!;
   expect(run.status).toBe("cancelled");expect(run.stopReason).toBe("user_stopped");expect(run.iterations[0]!.status).toBe("cancelled");expect(run.iterations).toHaveLength(1);
 });
 it("does not submit a new candidate when the environment changed",async()=>{
   const f=await fixture(),initial=await start(f);
   mocks.options.mockResolvedValue({...options,environmentHash:"changed"});await f.coordinator.tick();
   const run=f.repositories.dtcoOptimizations.get(initial.id)!;expect(run.status).toBe("paused");expect(run.stopReason).toBe("environment_changed");expect(run.allowedActions).not.toContain("resume");expect(f.repositories.jobs.list()).toHaveLength(0);
 });
 it("rejects schematic, nonfinite, mismatched or unverified result evidence",async()=>{
   const mutations:Array<(result:ResultRecordV1)=>void>=[
     result=>{(result.data.dtco as JsonObject).electricalMode="schematic";},
     result=>{(((result.data.dtco as JsonObject).provenance as JsonObject).extraction as JsonObject).drcCount=1;},
     result=>{delete (((result.data.dtco as JsonObject).provenance as JsonObject).extraction as JsonObject).drcCount;},
     result=>{(((result.data.dtco as JsonObject).provenance as JsonObject).extraction as JsonObject).drcStyle="drc(fast)";},
     result=>{((result.data.dtco as JsonObject).metrics as JsonObject).averagePowerW=NaN;},
     result=>{((result.data.dtco as JsonObject).design as JsonObject).pmosWidthUm=2.6;},
     result=>{(((result.data.dtco as JsonObject).provenance as JsonObject).extraction as JsonObject).finalGdsRoundtrip=false;},
     result=>{result.provenance.inputManifestSha256="mismatch";}
   ];
   for(const mutate of mutations){const f=await fixture(),initial=await start(f);await f.coordinator.tick();const run=f.repositories.dtcoOptimizations.get(initial.id)!;succeed(f.repositories,run,100,mutate);await f.coordinator.tick();
     const failed=f.repositories.dtcoOptimizations.get(run.id)!;expect(failed.status).toBe("paused");expect(failed.bestScore).toBeNull();expect(failed.iterations[0]!.feasible).toBe(false);expect(failed.iterations).toHaveLength(1);}
 });
 it("enforces owner/CSRF/module permission and rejects managed experiment mutations",async()=>{
   const f=await fixture(),run=await f.service.create(f.user.id,randomUUID(),definition()),other=f.repositories.users.create({username:"other-optimizer",password:"strong-password"});
   const app=await createEdaApp({database:f.db,config:loadConfig({EDA_STORAGE_ROOT:path.join(f.root,"storage")}),startWorkers:false,serveFrontend:false,logger:false});
   const session=f.repositories.sessions.create(f.user.id,1),headers={cookie:"eda_session="+session.sessionId,"x-csrf-token":session.csrfToken};
   const outsider=f.repositories.sessions.create(other.id,1);
   expect((await app.inject({url:"/api/dtco/optimizations/"+run.id,headers:{cookie:"eda_session="+outsider.sessionId}})).statusCode).toBe(404);
   expect((await app.inject({method:"POST",url:"/api/dtco/optimizations/"+run.id+"/start",headers:{cookie:headers.cookie},payload:{}})).statusCode).toBe(403);
   for(const [method,url,payload] of [["PUT","/api/dtco/experiments/"+run.experimentId,base],["POST","/api/dtco/experiments/"+run.experimentId+"/submit",{}]] as const)
     expect((await app.inject({method,url,headers,payload})).statusCode).toBe(409);
   const denied=f.repositories.users.create({username:"denied-optimizer",password:"strong-password",allowedModules:["acg"]}),deniedSession=f.repositories.sessions.create(denied.id,1);
   expect((await app.inject({url:"/api/dtco/optimizations",headers:{cookie:"eda_session="+deniedSession.sessionId}})).statusCode).toBe(403);
   const before=f.repositories.jobs.list().length;expect((await app.inject({url:"/api/dtco/optimizations/"+run.id,headers})).statusCode).toBe(200);expect(f.repositories.jobs.list()).toHaveLength(before);
   await app.close();
 });
});
