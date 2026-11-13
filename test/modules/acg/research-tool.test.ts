import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {createHash} from "node:crypto";
import {afterEach,describe,it,expect} from "vitest";
import {ToolHealthService} from "../../../server/app/tools/health.ts";
import {SafeProcessRunner} from "../../../server/app/process/safeProcess.ts";
import type {ToolConfigurationV1} from "../../../shared/contracts/v1.ts";
const roots:string[]=[];const execute=promisify(execFile);
afterEach(async()=>{await Promise.all(roots.splice(0).map(r=>fs.rm(r,{recursive:true,force:true})));});
describe("README research tool registration",()=>{
 it("registers exactly eight tools idempotently in an isolated database without native execution",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-init-eight-"));roots.push(root);const native=path.join(root,"native"),pdk=path.join(root,"pdk");await fs.mkdir(pdk,{recursive:true});
  for(const engine of ["cmos","DR","MR"]){const bin=path.join(native,"proj/autocellgen-"+engine+"/build/bin");await fs.mkdir(bin,{recursive:true});await fs.writeFile(path.join(bin,"autocell"),"#!/bin/sh\nexit 99\n",{mode:0o700});}
  const cli=path.resolve("server/cli/acg-configure.ts"),args=[path.resolve("node_modules/tsx/dist/cli.mjs"),cli,"--root",native,"--python","/usr/bin/python3","--pdk-root",pdk];
  const options={cwd:process.cwd(),env:{...process.env,EDA_STORAGE_ROOT:path.join(root,"storage"),EDA_DATABASE_PATH:path.join(root,"eda.sqlite")},timeout:20000};
  const first=await execute(process.execPath,args,options),second=await execute(process.execPath,args,options);
  const record=(text:string)=>JSON.parse(text.split("\n").find(line=>line.startsWith("{"))!).configurations;
  expect(record(first.stdout)).toHaveLength(8);expect(record(second.stdout)).toEqual(record(first.stdout));expect(record(first.stdout).filter((x:{toolId:string})=>x.toolId==="acg-research")).toHaveLength(1);expect(record(first.stdout).every((x:{revision:number})=>x.revision===1)).toBe(true);
 },30000);
 it("binds dependency-only selftest health to current wrapper bytes",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-research-health-"));roots.push(root);const probes=path.join(root,"probes");await fs.mkdir(probes);const entry=path.join(root,"research_workflow.py");await fs.copyFile(path.resolve("scripts/acg/research_workflow.py"),entry);await fs.copyFile(path.resolve("scripts/acg/unified_workflow.py"),path.join(root,"unified_workflow.py"));
  const now=new Date().toISOString();const tool={id:"research",toolId:"acg-research",moduleId:"acg",revision:1,enabled:true,rootPath:root,entryPoint:entry,interpreterPath:"/usr/bin/python3",executablePath:null,workingDirectory:null,timeoutSeconds:86400,maxConcurrency:1,environmentNames:[],environment:{},versionProbeArgv:["--help"],adapterId:"acg-research-v1",adapterVersion:"1.0.0",capturedAt:now,createdAt:now,updatedAt:now} as ToolConfigurationV1;
  const records:unknown[]=[];const repository={latestHealth:()=>null,addHealth:(v:unknown)=>records.push(v)};
  const health=await new ToolHealthService(repository as never,new SafeProcessRunner(),probes).selfTest(tool);
  expect(health.status).toBe("healthy");expect(health.selfTestPassed).toBe(true);expect(health.version).toContain("sha256:"+createHash("sha256").update(await fs.readFile(entry)).digest("hex"));expect(records).toHaveLength(1);
 });
});
