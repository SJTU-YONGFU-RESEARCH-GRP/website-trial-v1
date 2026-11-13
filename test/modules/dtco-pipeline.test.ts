import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {afterEach,describe,expect,it} from "vitest";
import {EdaDatabase} from "../../server/app/db/database.ts";
import {makeRepositories} from "../../server/app/db/repositories.ts";
import {StorageService} from "../../server/app/storage/storage.ts";
import {ModuleRegistry} from "../../server/app/modules/registry.ts";
import {DtcoPipelineRepository,isIntegratedAttemptComplete,readPipelineSummary} from "../../server/modules/dtco/pipelineRepository.ts";
import {DtcoPipelineService} from "../../server/modules/dtco/pipeline.ts";
import {enqueuePipelineChild,sha256,verifiedPipelineArtifact} from "../../server/modules/dtco/preparedModuleJob.ts";
import {flattenModelSection,extractMosModelCards,recombineNormalizedMos,selectedMosModelNames} from "../../server/modules/dtco/pipelineModel.ts";
import type {ResultRecordV1,JobPlanV1} from "../../shared/contracts/v1.ts";
const roots:string[]=[],dbs:EdaDatabase[]=[];
afterEach(async()=>{dbs.splice(0).forEach(d=>d.close());await Promise.all(roots.splice(0).map(p=>fs.rm(p,{recursive:true,force:true})));});
const definition={workflow:"integrated" as const,name:"Synthetic scheduling fixture only",circuitId:"fixture",technologyId:"fixture",modelVersion:"fixture",temperaturesC:[25],voltagesV:[3.3],layoutIds:["fixture"],loadFf:10,inputSlewPs:100,periodNs:10};
const plan:JobPlanV1={schemaVersion:"eda.job-plan.v1",capabilityVersion:"fixture",steps:[],sweep:null,warnings:[]};
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-pipeline-"));roots.push(root);const db=new EdaDatabase(path.join(root,"db"));db.migrate();dbs.push(db);
 const repositories=makeRepositories(db),user=repositories.users.create({username:"pipeline-owner",password:"test-password-123",maxConcurrentJobs:1}),storage=new StorageService(path.join(root,"storage"));await storage.initialize();
 const experiment=repositories.dtco.save(user.id,definition,"fixture-environment"),context=repositories.dtco.reserve(experiment.points[0]!.id,false)!;
 const repository=new DtcoPipelineRepository(repositories),run=repository.reserve({...context,configurations:{}} as typeof context),registry=new ModuleRegistry();
 const prepare=async(_r:unknown,_s:unknown,_g:unknown,_c:unknown,_run:unknown,node:{jobId:string})=>{const job=repositories.jobs.get(node.jobId)!;repositories.jobs.setDraft(job.id,job.inputManifest,{},"fixture",[],{},plan);enqueuePipelineChild(repositories,job.id);};
 return{root,db,repositories,user,storage,context,repository,run,service:new DtcoPipelineService(repositories,storage,registry,prepare)};
}
async function publish(f:Awaited<ReturnType<typeof fixture>>,jobId:string){
 const job=f.repositories.jobs.get(jobId)!,id=randomUUID(),artifactId=randomUUID(),relativePath="results/"+job.moduleId+"/"+id+"/fixture.txt",body=Buffer.from("synthetic scheduling fixture "+job.id),destination=await f.storage.safeDestination(relativePath);await fs.writeFile(destination,body);
 const at=new Date().toISOString(),record:ResultRecordV1={schemaVersion:"eda.result.v1",id,moduleId:job.moduleId,ownerId:job.ownerId,lifecycle:"private",title:"Synthetic fixture",summary:{},data:{},provenance:{origin:"computed",jobId,ownerId:job.ownerId,inputManifestSha256:sha256(JSON.stringify(job.inputManifest)),parameters:{},capabilityVersion:"fixture",toolConfigurations:[],toolVersions:{},parserId:"fixture",parserVersion:"1",createdAt:at},artifactIds:[artifactId],createdAt:at,updatedAt:at,publishedAt:null};
 f.repositories.results.insert(record);f.repositories.artifacts.insert({id:artifactId,ownerId:job.ownerId,jobId,resultId:id,moduleId:job.moduleId,stepId:null,role:"fixture",relativePath,mediaType:"text/plain",sizeBytes:body.length,sha256:sha256(body),visibility:"private",createdAt:at});f.repositories.jobs.transition(jobId,"succeeded",{resultId:id});
}
describe("durable integrated DTCO graph (synthetic scheduling fixtures)",()=>{
 it("reserves four children once, progresses with one owner slot, and requires all computed provenance",async()=>{
  const f=await fixture();expect(f.repository.reserve(f.context).id).toBe(f.run.id);expect(f.repositories.jobs.list()).toHaveLength(4);
  expect(f.repositories.jobs.list({status:"queued"})).toHaveLength(0);expect(isIntegratedAttemptComplete({pipeline:f.run})).toBe(false);
  for(const node of f.run.nodes){await f.service.advance();expect(f.repositories.jobs.list({status:"queued"})).toHaveLength(1);
   const claimed=f.repositories.jobs.claim(node.moduleId)!;expect(claimed.id).toBe(node.jobId);expect(f.repositories.jobs.list({status:"running"})).toHaveLength(1);
   await publish(f,node.jobId);await f.service.advance();
  }
  await f.service.advance();const summary=readPipelineSummary(f.db,f.context.attempt.id)!;expect(summary.status).toBe("succeeded");expect(summary.progress).toBe(1);expect(isIntegratedAttemptComplete({pipeline:summary})).toBe(true);
 });
 it("cancels during async preparation without enqueueing any child",async()=>{
  const f=await fixture();let release!:()=>void,entered!:()=>void;const waiting=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
  const service=new DtcoPipelineService(f.repositories,f.storage,new ModuleRegistry(),async(_r,_s,_g,_c,_run,node)=>{entered();await waiting;const job=f.repositories.jobs.get(node.jobId)!;f.repositories.jobs.setDraft(job.id,job.inputManifest,{},"fixture",[],{},plan);enqueuePipelineChild(f.repositories,job.id);});
  const advancing=service.advance();await started;expect(f.repository.requestCancel(f.context.attempt.jobId)).toBe(true);release();await advancing;
  expect(readPipelineSummary(f.db,f.context.attempt.id)!.status).toBe("cancelled");expect(f.repositories.jobs.list().every(j=>j.status==="cancelled")).toBe(true);
 });
 it("recovers queued work without duplication and terminalizes interrupted preparations",async()=>{
  const f=await fixture();await f.service.advance();f.repository.recover();await f.service.advance();expect(f.repositories.jobs.list({status:"queued"})).toHaveLength(1);expect(f.repositories.jobs.list()).toHaveLength(4);
  const g=await fixture();expect(g.repository.claim(g.run.nodes[0]!.id)).toBe(true);g.repository.recover();await g.service.advance();
  expect(readPipelineSummary(g.db,g.context.attempt.id)!.status).toBe("interrupted");expect(g.repositories.jobs.list().every(j=>j.status==="interrupted")).toBe(true);
  const previous=readPipelineSummary(g.db,g.context.attempt.id)!;const retry=g.repositories.dtco.reserve(g.context.point.id,true,g.context.attempt.id)!;const fresh=g.repository.reserve(retry);
  expect(fresh.id).not.toBe(previous.id);expect(g.repositories.jobs.list()).toHaveLength(8);expect(readPipelineSummary(g.db,g.context.attempt.id)).toEqual(previous);
 });
 it("rejects tampered artifacts and never scores a partially completed graph",async()=>{
  const f=await fixture();await f.service.advance();const node=f.run.nodes[0]!;f.repositories.jobs.claim(node.moduleId);await publish(f,node.jobId);await f.service.advance();
  const partial=readPipelineSummary(f.db,f.context.attempt.id)!;expect(isIntegratedAttemptComplete({pipeline:partial})).toBe(false);const ref=partial.nodes[0]!.artifacts[0]!;
  await verifiedPipelineArtifact(f.repositories,f.storage,f.user.id,ref);await fs.writeFile(f.storage.resolve(ref.relativePath),"tampered");
  await expect(verifiedPipelineArtifact(f.repositories,f.storage,f.user.id,ref)).rejects.toThrow();await expect(verifiedPipelineArtifact(f.repositories,f.storage,"other-owner",ref)).rejects.toThrow();
 });
});
describe("native selected-section and strict MOS recombination",()=>{
 it("normalizes exact selected model families and leaves unrelated duplicate cards untouched",()=>{
  const source=".model sky_n__model.0 nmos level=1\n.model sky_n_extra nmos level=1\n.model other nmos level=1\n.model OTHER nmos level=2\n";
  const names=selectedMosModelNames(source,["sky_n"]);expect(names).toEqual(["sky_n__model.0"]);
  const combined=recombineNormalizedMos(source,".model sky_n__model.0 nmos level=1\n+ vto=.7\n",names);
  expect(combined).toContain(".model sky_n_extra nmos level=1");expect(combined).toContain(".model other nmos level=1\n.model OTHER nmos level=2");expect(combined).toContain("+ vto=.7");
  expect(()=>extractMosModelCards(source+".model SKY_N__MODEL.0 nmos level=2\n",names)).toThrow();
 });
 it("resolves same-file section references, retains corner params and rejects true recursion",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-model-"));roots.push(root);await fs.writeFile(path.join(root,"models.lib"),".lib tt\n.param corner=1\n.lib models.lib mos\n.endl tt\n.lib ff\n.param corner=2\n.lib models.lib mos\n.endl ff\n.lib mos\n.model n nmos level=1\n+ vto=.5\n.endl mos\n");
  const tt=await flattenModelSection(root,"models.lib","tt"),ff=await flattenModelSection(root,"models.lib","ff");expect(tt.content).toContain(".param corner=1");expect(ff.content).toContain(".param corner=2");expect(tt.content).toContain("+ vto=.5");
  await fs.writeFile(path.join(root,"loop.lib"),".lib tt\n.lib loop.lib tt\n.endl tt");await expect(flattenModelSection(root,"loop.lib","tt")).rejects.toThrow("cycle");
 });
 it("replaces complete MOS logical statements while preserving wrappers/passives/outer params",()=>{
  const source=".param corner=2\n.subckt wrapper d g s b\n.model n nmos level=1\n* continuation comment\n+ vto=.5\n.model diode d is=1e-12\n.ends wrapper\n";
  expect(extractMosModelCards(source)).toContain("+ vto=.5");const recombined=recombineNormalizedMos(source,".model N nmos level=1\n+ vto=.6\n");
  expect(recombined).toContain(".param corner=2");expect(recombined).toContain(".model diode d is=1e-12");expect(recombined).toContain("+ vto=.6");expect(recombined).not.toContain("+ vto=.5");
  for(const invalid of [".model x nmos level=1",".model n pmos level=1",".model n nmos level=1\n.model N nmos level=1",".model n nmos level=1\n.param unsafe=1"])expect(()=>recombineNormalizedMos(source,invalid)).toThrow();
 });
});
