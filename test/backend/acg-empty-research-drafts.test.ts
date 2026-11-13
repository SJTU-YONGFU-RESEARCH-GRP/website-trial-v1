import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {it,expect} from "vitest";
import {createEdaApp} from "../../server/app/app.ts";
import {loadConfig} from "../../server/app/config.ts";

it("accepts actual HTTP multipart field-only ACG research drafts and preserves run/Benchmark file requirements",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-empty-http-"));
 const app=await createEdaApp({config:loadConfig({NODE_ENV:"test",EDA_STORAGE_ROOT:root}),startWorkers:false,serveFrontend:false,logger:false});
 try {
  await app.listen({host:"127.0.0.1",port:0});const address=app.server.address();if(!address||typeof address==="string")throw new Error("Missing test HTTP address");
  const post=async(moduleId:string,operation?:string)=>{const body=new FormData();body.set("workflow","autocellgen");if(operation)body.set("operation",operation);return fetch("http://127.0.0.1:"+address.port+"/api/modules/"+moduleId+"/drafts",{method:"POST",body});};
  for(const operation of ["algorithm-matrix","algorithm-report","known-feasible"]){
   const response=await post("acg",operation);const value=await response.json();expect(response.status,JSON.stringify(value)).toBe(201);
   expect(value.data.job.operation).toBe(operation);expect(value.data.job.status).toBe("draft");expect(value.data.recognition.files).toEqual([]);expect(value.data.recognition.fileCount).toBe(0);expect(value.data.recognition.totalBytes).toBe(0);
  }
  for(const [moduleId,operation] of [["acg","run"],["acg",undefined],["acg","unknown"],["benchmark","run"],["benchmark","known-feasible"]]){
   const response=await post(moduleId!,operation);expect(response.status).toBe(400);expect((await response.json()).error.message).toBe("at least one file is required");
  }
 } finally {await app.close();await fs.rm(root,{recursive:true,force:true});}
},15000);
