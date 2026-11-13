import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {afterEach,describe,it,expect} from "vitest";
import {createEdaApp} from "../../server/app/app.ts";
import {loadConfig} from "../../server/app/config.ts";
import type {ResultRecordV1} from "../../shared/contracts/v1.ts";
const roots:string[]=[];afterEach(async()=>{await Promise.all(roots.splice(0).map(r=>fs.rm(r,{recursive:true,force:true})));});
function record(id:string,ownerId:string,lifecycle:"private"|"published"="private"):ResultRecordV1{
 const at=new Date().toISOString();return {schemaVersion:"eda.result.v1",id,ownerId,moduleId:"acg",lifecycle,title:id,summary:{operation:"algorithm-matrix"},data:{acgResearch:{schemaVersion:"acg.research-workflow.v1",operation:"algorithm-matrix",engine:"mr",parameters:{cells:["inv_x1"],rowCounts:[1],algorithms:["dp"]},metrics:[{large:"must not be returned in source selector"}],generationConfiguration:{dp:{technology:"gf180",trackNum:9}},status:"completed"}},provenance:{origin:"computed",jobId:null,ownerId,inputManifestSha256:"",parameters:{},capabilityVersion:"test",toolConfigurations:[],toolVersions:{},parserId:"fixture",parserVersion:"1",createdAt:at},artifactIds:[],createdAt:at,updatedAt:at,publishedAt:lifecycle==="published"?at:null};
}
describe("ACG research source owner API",()=>{
 it("resolves anonymous public-runner ownership and excludes foreign published/imported/legacy results",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-source-api-"));roots.push(root);const app=await createEdaApp({config:loadConfig({NODE_ENV:"test",EDA_STORAGE_ROOT:root}),startWorkers:false,serveFrontend:false,logger:false});
  try{
   const first=await app.inject({method:"GET",url:"/api/modules/acg/research-sources"});expect(first.statusCode).toBe(200);const owner=first.json().data.ownerId;
   const foreign=app.eda.repositories.users.create({username:"foreign-source",password:"strong source password"});app.eda.repositories.results.insert(record("own",owner));app.eda.repositories.results.insert(record("foreign",foreign.id,"published"));
   const imported=record("imported",owner);imported.provenance.origin="imported";app.eda.repositories.results.insert(imported);const legacy=record("legacy",owner);legacy.data={acg:{cells:[]}};app.eda.repositories.results.insert(legacy);
   const response=await app.inject({method:"GET",url:"/api/modules/acg/research-sources"});expect(response.json().data.results.map((x:{id:string})=>x.id)).toEqual(["own"]);expect(response.body).not.toContain("must not be returned");expect(response.json().data.results[0].compatibleParameters.cells).toEqual(["inv_x1"]);
  }finally{await app.close();}
 });
 it("uses logged-in effective owner with no admin/public ownership widening",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-source-session-"));roots.push(root);const app=await createEdaApp({config:loadConfig({NODE_ENV:"test",EDA_STORAGE_ROOT:root}),startWorkers:false,serveFrontend:false,logger:false});
  try{
   const anonymous=(await app.inject({method:"GET",url:"/api/modules/acg/research-sources"})).json().data.ownerId;app.eda.repositories.results.insert(record("anonymous-own",anonymous,"published"));
   const user=app.eda.repositories.users.create({username:"signed-source",password:"strong source password",role:"admin"});const session=app.eda.repositories.sessions.create(user.id,1);app.eda.repositories.results.insert(record("signed-own",user.id));
   const response=await app.inject({method:"GET",url:"/api/modules/acg/research-sources",headers:{cookie:"eda_session="+session.sessionId}});expect(response.statusCode).toBe(200);expect(response.json().data.ownerId).toBe(user.id);expect(response.json().data.results.map((x:{id:string})=>x.id)).toEqual(["signed-own"]);
  }finally{await app.close();}
 });
});
