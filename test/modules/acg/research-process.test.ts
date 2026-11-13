import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {afterEach,describe,it,expect} from "vitest";
import {SafeProcessRunner} from "../../../server/app/process/safeProcess.ts";
import type {ToolConfigurationV1} from "../../../shared/contracts/v1.ts";
const roots:string[]=[];afterEach(async()=>{await Promise.all(roots.splice(0).map(r=>fs.rm(r,{recursive:true,force:true})));});
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-research-process-"));roots.push(root);
 await fs.writeFile(path.join(root,"leaf.py"),"import subprocess,sys,time,os\np=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)'])\nopen('pids','w').write(str(os.getpid())+' '+str(p.pid))\nwhile True: time.sleep(1)\n");
 await fs.writeFile(path.join(root,"controller.py"),"import subprocess,sys,time,pathlib\np=subprocess.Popen([sys.executable,'leaf.py'])\nwhile not pathlib.Path('pids').exists():time.sleep(.01)\nprint('READY',flush=True)\np.wait()\n");
 const at=new Date().toISOString();const tool={id:"research",toolId:"acg-research",moduleId:"acg",revision:1,enabled:true,rootPath:root,interpreterPath:"/usr/bin/python3",executablePath:null,entryPoint:path.join(root,"controller.py"),workingDirectory:null,timeoutSeconds:5,maxConcurrency:1,environmentNames:[],environment:{},versionProbeArgv:[],adapterId:"acg-research-v1",adapterVersion:"1",capturedAt:at,createdAt:at,updatedAt:at} as ToolConfigurationV1;
 return {root,tool};
}
async function alive(pid:number):Promise<boolean>{
 try{const stat=await fs.readFile("/proc/"+pid+"/stat","utf8");return !/\) [ZX] /.test(stat);}catch{return false;}
}
describe("research controller process group cancellation",()=>{
 for(const mode of ["cancel","timeout"] as const)it("kills controller child and grandchild on "+mode,async()=>{
  const {root,tool}=await fixture();const controller=new AbortController();const runner=new SafeProcessRunner(50);let readyResolve!:()=>void;const ready=new Promise<void>(resolve=>{readyResolve=resolve;});
  const running=runner.run("research-"+mode,{tool,argv:[],cwd:root,allowedCwdRoot:root,abortSignal:controller.signal,timeoutSeconds:mode==="timeout"?.3:5,onOutput:(_s,text)=>{if(text.includes("READY"))readyResolve();}});
  await ready;const pids=(await fs.readFile(path.join(root,"pids"),"utf8")).split(" ").map(Number);expect(pids.length).toBe(2);expect(await alive(pids[0]!)).toBe(true);
  if(mode==="cancel")controller.abort();const result=await running;expect(result.exitCode).not.toBe(0);expect(result.timedOut).toBe(mode==="timeout");expect(result.processGroupId).toBe(result.processId);
  await new Promise(resolve=>setTimeout(resolve,100));for(const pid of [result.processId,...pids])expect(await alive(pid)).toBe(false);
 },5000);
});
