import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DtcoOptions } from "../../shared/contracts/dtco.ts";
import type { JobRecordV1 } from "../../shared/contracts/v1.ts";
import { migration004 } from "../../server/migrations/004_dtco.ts";
import { migration001 } from "../../server/migrations/001_initial.ts";
import { migration002 } from "../../server/migrations/002_cancellation.ts";
import { migration003 } from "../../server/migrations/003_acg.ts";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";
import { StorageService } from "../../server/app/storage/storage.ts";
const mocks = vi.hoisted(() => ({ options: vi.fn(), prepare: vi.fn() }));
vi.mock("../../server/modules/dtco/environment.ts", () => ({ getDtcoOptions: mocks.options, prepareDtcoJob: mocks.prepare }));
import { DtcoService, normalizeDefinition } from "../../server/modules/dtco/service.ts";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";
const option = (id:string) => ({id,label:id,available:true,reason:null});
const definition = { name:"Study", circuitId:"inverter",technologyId:"gf180",modelVersion:"typical-hash",temperaturesC:[25,85],voltagesV:[3,3.3],layoutIds:["dp","sa"],loadFf:10,inputSlewPs:100,periodNs:10 };
const options:DtcoOptions = {circuits:[option("inverter")],technologies:[option("gf180")],models:[{...option("typical-hash"),technologyId:"gf180",sourceHash:"modelhash"}],layouts:[option("dp"),option("sa")],available:true,unavailableReason:null,tools:[],defaults:definition,maxPoints:64,environmentHash:"frozen-env",metricScope:"schematic" };
const roots:string[]=[]; const databases:EdaDatabase[]=[];
beforeEach(() => {
 mocks.options.mockResolvedValue(options);
 mocks.prepare.mockImplementation(async (_repositories,storage:StorageService,job:JobRecordV1) => {
   await storage.createWorkspace(job.id);
   return { inputManifest:job.inputManifest,parameters:{},capabilityVersion:"unit",toolConfigurations:[],toolVersions:{},plan:{schemaVersion:"eda.job-plan.v1",capabilityVersion:"unit",steps:[{id:"native",name:"Native",description:"",required:true,weight:1,process:null,inputRoles:[],outputRoles:[]}],sweep:null,warnings:[]} };
 });
});
afterEach(async () => { for(const db of databases.splice(0)) { try {db.close();} catch {} } await Promise.all(roots.splice(0).map(root => fs.rm(root,{recursive:true,force:true}))); });
async function fixture() {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-test-"));roots.push(root);
 const filename=path.join(root,"database.sqlite");const db=new EdaDatabase(filename);db.migrate();databases.push(db);
 const repositories=makeRepositories(db);const user=repositories.users.create({username:"dtco-owner",password:"strong-enough-password"});
 const storage=new StorageService(path.join(root,"storage"));await storage.initialize();
 return {root,filename,db,repositories,user,storage,service:new DtcoService(repositories.dtco,repositories,storage)};
}
describe("DTCO persisted experiments",() => {
 it("normalizes Cartesian lists, validates physical bounds, and caps combinations",() => {
   const normalized=normalizeDefinition({...definition,temperaturesC:[85,25,25],layoutIds:["sa","dp","dp"]},options);
   expect(normalized.temperaturesC).toEqual([25,85]);expect(normalized.layoutIds).toEqual(["dp","sa"]);
   for(const invalid of [{temperaturesC:[]},{voltagesV:[Infinity]},{voltagesV:[1.8]},{layoutIds:["unknown"]},{modelVersion:"wrong"},{loadFf:0},{inputSlewPs:1000,periodNs:1},{temperaturesC:Array.from({length:20},(_,i)=>i)}]) expect(()=>normalizeDefinition({...definition,...invalid},options)).toThrow();
 });
 it("rejects widths below registered bounds before saving and accepts the minimum",async() => {
   const f=await fixture();
   const advertised={...options,designBounds:{nmosWidthUm:{min:.95,max:1.3,step:.05},pmosWidthUm:{min:1.4,max:2.6,step:.05}}};
   mocks.options.mockResolvedValue(advertised);
   const invalid={...definition,design:{nmosWidthUm:.9,pmosWidthUm:2}};
   await expect(f.service.save(f.user.id,invalid)).rejects.toMatchObject({code:"DTCO_DESIGN_INVALID"});
   expect(f.repositories.dtco.list(f.user.id)).toEqual([]);
   expect(f.repositories.jobs.list({moduleId:"dtco"})).toEqual([]);
   expect(f.db.sqlite.prepare("SELECT COUNT(*) AS count FROM dtco_attempts").get()).toMatchObject({count:0});
   const valid={...definition,design:{nmosWidthUm:.95,pmosWidthUm:2}};
   const saved=await f.service.save(f.user.id,valid);
   expect(saved.definition.design).toEqual(valid.design);
   expect(saved.points.every(point=>point.attempts.length===0)).toBe(true);
   expect(mocks.prepare).not.toHaveBeenCalled();
   expect(()=>normalizeDefinition(invalid,options)).toThrow(expect.objectContaining({code:"DTCO_DESIGN_INVALID"}));
   expect(normalizeDefinition(valid,options).design).toEqual(valid.design);
 });
 it("rejects oversized transient waveforms before saving or reserving any jobs",async() => {
   const f=await fixture();const extreme={...definition,periodNs:1000,inputSlewPs:1};
   expect(()=>normalizeDefinition(extreme,options)).toThrow(expect.objectContaining({code:"DTCO_WAVEFORM_BUDGET"}));
   expect(normalizeDefinition({...definition,periodNs:10,inputSlewPs:1},options).periodNs).toBe(10);
   expect(normalizeDefinition({...definition,periodNs:1000,inputSlewPs:80},options).periodNs).toBe(1000);
   expect(()=>normalizeDefinition({...definition,periodNs:1000,inputSlewPs:79},options)).toThrow(expect.objectContaining({code:"DTCO_WAVEFORM_BUDGET"}));
   await expect(f.service.save(f.user.id,extreme)).rejects.toMatchObject({code:"DTCO_WAVEFORM_BUDGET"});
   expect(f.repositories.dtco.list(f.user.id)).toEqual([]);
   const legacy=f.repositories.dtco.save(f.user.id,extreme,options.environmentHash);
   await expect(f.service.submit(legacy.id)).rejects.toMatchObject({code:"DTCO_WAVEFORM_BUDGET"});
   expect(f.repositories.jobs.list({moduleId:"dtco"})).toEqual([]);
   expect(f.repositories.dtco.get(legacy.id)!.points.every(p=>p.attempts.length===0)).toBe(true);
 });
 it("adds DTCO permission to full legacy grants and admin while preserving restricted users",() => {
   const db=new EdaDatabase(":memory:");databases.push(db);
   for(const migration of [migration001,migration002,migration003]) db.sqlite.exec(migration.sql);
   const repos=makeRepositories(db);
   const full=repos.users.create({username:"legacy-full",password:"strong-enough-password",allowedModules:["benchmark","digital","ppa","acg"]});
   const restricted=repos.users.create({username:"legacy-limited",password:"strong-enough-password",allowedModules:["acg"]});
   const admin=repos.users.create({username:"legacy-admin",password:"strong-enough-password",role:"admin",allowedModules:["benchmark"]});
   db.sqlite.exec(migration004.sql);
   expect(repos.users.get(full.id)!.allowedModules).toContain("dtco");expect(repos.users.get(admin.id)!.allowedModules).toContain("dtco");
   expect(repos.users.get(restricted.id)!.allowedModules).toEqual(["acg"]);
 });
 it("reloads SQLite definitions/revisions and keeps immutable point history",async() => {
   const f=await fixture();const first=await f.service.save(f.user.id,definition);
   expect(first.points).toHaveLength(8);const oldIds=first.points.map(p=>p.id);
   const second=await f.service.save(f.user.id,{...definition,name:"Study two",voltagesV:[3.3]},first.id);
   expect(second.revision).toBe(2);expect(second.points).toHaveLength(4);expect(second.revisions[1]!.points.map(p=>p.id)).toEqual(oldIds);
   f.db.close();databases.splice(databases.indexOf(f.db),1);
   const reloaded=new EdaDatabase(f.filename);reloaded.migrate();databases.push(reloaded);
   expect(makeRepositories(reloaded).dtco.get(first.id)).toEqual(second);
 });
 it("reserves all jobs before awaits and deduplicates concurrent and repeated submit",async() => {
   const f=await fixture();const experiment=await f.service.save(f.user.id,{...definition,temperaturesC:[25],voltagesV:[3.3]});
   const [a,b]=await Promise.all([f.service.submit(experiment.id),f.service.submit(experiment.id)]);
   expect(a.submitted.length+b.submitted.length).toBe(2);
   expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(2);
   expect((await f.service.submit(experiment.id)).skipped).toHaveLength(2);
   expect(f.repositories.dtco.get(experiment.id)!.points.every(p=>p.status==="queued"&&p.attempts.length===1)).toBe(true);
 });
 it("reuses identical canonical points after renaming and extending a revision",async() => {
   const f=await fixture();let experiment=await f.service.save(f.user.id,{...definition,temperaturesC:[25],voltagesV:[3.3],layoutIds:["dp"]});
   await f.service.submit(experiment.id);const original=f.repositories.dtco.get(experiment.id)!.points[0]!;
   experiment=await f.service.save(f.user.id,{...experiment.definition,name:"Renamed"},experiment.id);
   expect(experiment.points[0]!.id).not.toBe(original.id);expect(experiment.points[0]!.jobId).toBe(original.jobId);
   expect((await f.service.submit(experiment.id)).submitted).toHaveLength(0);
   experiment=await f.service.save(f.user.id,{...experiment.definition,temperaturesC:[25,85]},experiment.id);
   const submitted=await f.service.submit(experiment.id);expect(submitted.submitted).toHaveLength(1);expect(submitted.skipped).toHaveLength(1);
   expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(2);
 });
 it("records preparation failures and makes retry replays idempotent even on immediate failure",async() => {
   const f=await fixture();const experiment=await f.service.save(f.user.id,{...definition,temperaturesC:[25],voltagesV:[3.3],layoutIds:["dp"]});
   mocks.prepare.mockRejectedValue(new Error("missing ngspice"));
   expect((await f.service.submit(experiment.id)).failed).toHaveLength(1);
   let point=f.repositories.dtco.get(experiment.id)!.points[0]!;
   expect(point.status).toBe("preparation_failed");const failedId=point.attempts[0]!.id;
   await f.service.submit(experiment.id,point.id,failedId);
   await f.service.submit(experiment.id,point.id,failedId);
   point=f.repositories.dtco.get(experiment.id)!.points[0]!;
   expect(point.attempts).toHaveLength(2);expect(point.attempts.every(a=>a.error?.message==="missing ngspice")).toBe(true);
   expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(2);
 });
 it("recovers incomplete preparation after SQLite reopen and permits explicit retry",async() => {
   const f=await fixture();const experiment=await f.service.save(f.user.id,{...definition,temperaturesC:[25],voltagesV:[3.3],layoutIds:["dp"]});
   const reserved=f.repositories.dtco.reserve(experiment.points[0]!.id,false)!;expect(reserved).toBeTruthy();
   f.db.close();databases.splice(databases.indexOf(f.db),1);
   const db=new EdaDatabase(f.filename);db.migrate();databases.push(db);const repos=makeRepositories(db);
   expect(repos.dtco.recoverPreparations()).toBe(1);const point=repos.dtco.get(experiment.id)!.points[0]!;
   expect(point.status).toBe("preparation_failed");expect(point.error?.code).toBe("DTCO_PREPARATION_INTERRUPTED");
   expect(repos.dtco.reserve(point.id,true,point.attempts[0]!.id)).toBeTruthy();
 });
 it("recovers ready preparation as failed but retains already queued jobs",async() => {
   const f=await fixture();const experiment=await f.service.save(f.user.id,{...definition,temperaturesC:[25],voltagesV:[3.3]});
   const reservations=experiment.points.map(p=>f.repositories.dtco.reserve(p.id,false)!);
   for(const item of reservations) { const job=f.repositories.jobs.get(item.attempt.jobId)!; const prep=await mocks.prepare(f.repositories,f.storage,job); f.repositories.jobs.setDraft(job.id,prep.inputManifest,prep.parameters,prep.capabilityVersion,prep.toolConfigurations,prep.toolVersions,prep.plan); }
   f.repositories.jobs.start(reservations[1]!.attempt.jobId);
   expect(f.repositories.dtco.recoverPreparations()).toBe(2);
   const recovered=f.repositories.dtco.get(experiment.id)!;
   expect(recovered.points.map(p=>p.status)).toEqual(["preparation_failed","queued"]);
   expect(f.repositories.jobs.get(reservations[0]!.attempt.jobId)!.status).toBe("failed");
 });
 it("does not retry successful points or submit historical revisions",async() => {
   const f=await fixture();let experiment=await f.service.save(f.user.id,{...definition,temperaturesC:[25],voltagesV:[3.3],layoutIds:["dp"]});
   await f.service.submit(experiment.id);const point=f.repositories.dtco.get(experiment.id)!.points[0]!;
   f.repositories.jobs.claim("dtco");f.repositories.jobs.transition(point.jobId!,"succeeded");
   expect(f.repositories.dtco.reserve(point.id,true,point.attempts[0]!.id)).toBeNull();
   experiment=await f.service.save(f.user.id,{...experiment.definition,loadFf:11},experiment.id);
   expect(f.repositories.dtco.reserve(point.id,false)).toBeNull();expect(experiment.revisions[1]!.points[0]!.status).toBe("succeeded");
 });
 it("rejects environment changes before freezing a saved definition",async() => {
   const f=await fixture();const experiment=await f.service.save(f.user.id,{...definition,temperaturesC:[25],voltagesV:[3.3],layoutIds:["dp"]});
   mocks.options.mockResolvedValue({...options,environmentHash:"changed"});
   const response=await f.service.submit(experiment.id);
   expect(response.failed[0]!.message).toMatch(/changed/);expect(mocks.prepare).not.toHaveBeenCalled();
 });
 it("enforces API ownership, permission and session CSRF while public owner is shared",async() => {
   const f=await fixture();const other=f.repositories.users.create({username:"dtco-other",password:"strong-enough-password"});
   const experiment=await f.service.save(f.user.id,definition);
   const app=await createEdaApp({database:f.db,config:loadConfig({EDA_STORAGE_ROOT:path.join(f.root,"storage")}),startWorkers:false,serveFrontend:false,logger:false});
   const session=f.repositories.sessions.create(other.id,1);const cookie="eda_session="+session.sessionId;
   expect((await app.inject({url:"/api/dtco/experiments/"+experiment.id,headers:{cookie}})).statusCode).toBe(404);
   expect((await app.inject({method:"PUT",url:"/api/dtco/experiments/"+experiment.id,headers:{cookie,"x-csrf-token":session.csrfToken},payload:definition})).statusCode).toBe(404);
   expect((await app.inject({method:"POST",url:"/api/dtco/experiments",headers:{cookie},payload:definition})).statusCode).toBe(403);
   const denied=f.repositories.users.create({username:"restricted-dtco",password:"strong-enough-password",allowedModules:["acg"]});
   const restricted=f.repositories.sessions.create(denied.id,1);
   expect((await app.inject({url:"/api/dtco/options",headers:{cookie:"eda_session="+restricted.sessionId}})).statusCode).toBe(403);
   const publicOptions=(await app.inject({url:"/api/dtco/options"})).json().data;
   expect(publicOptions.publicRunner).toBe(true);
   const publicCreate=await app.inject({method:"POST",url:"/api/dtco/experiments",payload:definition});expect(publicCreate.statusCode).toBe(201);
   expect(publicCreate.json().data.ownerId).toBe(publicOptions.ownerId);
   expect((await app.inject({url:"/api/dtco/experiments",headers:{cookie}})).json().data).toEqual([]);
   expect((await app.inject({method:"POST",url:"/api/dtco/experiments/"+experiment.id+"/submit",headers:{cookie,"x-csrf-token":session.csrfToken}})).statusCode).toBe(404);
   expect((await app.inject({method:"POST",url:"/api/dtco/points/"+experiment.points[0]!.id+"/retry",headers:{cookie,"x-csrf-token":session.csrfToken},payload:{attemptId:"unknown"}})).statusCode).toBe(404);
   const publicId=publicCreate.json().data.id;
   const submit=(await app.inject({method:"POST",url:"/api/dtco/experiments/"+publicId+"/submit"})).json().data;
   const jobId=submit.experiment.points[0].jobId;
   for(const action of ["retry","clone","start"]) expect((await app.inject({method:"POST",url:"/api/jobs/"+jobId+"/"+action})).statusCode).toBe(409);
   await app.close();databases.splice(databases.indexOf(f.db),1);
 });
});
