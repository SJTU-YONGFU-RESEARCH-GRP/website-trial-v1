import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {afterEach,describe,it,expect} from "vitest";
import {buildAcgPlan} from "../../../server/modules/acg/planner.ts";
import {executeAcgStep} from "../../../server/modules/acg/executor.ts";
import {validateUnifiedDraft,normalizeUnifiedSettings} from "../../../server/modules/acg/unified.ts";
import type {ValidationContext} from "../../../server/modules/acg/types.ts";
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(d=>fs.rm(d,{recursive:true,force:true})));});
async function fixture(engine="mr",cells=1){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-unified-"));dirs.push(root);
 const project=path.join(root,"project"),workspace=path.join(root,"jobs/test"),helpers=path.join(root,"helpers");
 await fs.mkdir(path.join(project,"config/gf180"),{recursive:true});await fs.mkdir(path.join(project,"scripts"),{recursive:true});await fs.mkdir(path.join(workspace,"input"),{recursive:true});await fs.mkdir(helpers);
 await fs.writeFile(path.join(project,"config/gf180/config.json"),JSON.stringify({tech:"gf180",track_num:9,num_rows:2,enable_double_row:false,routing_algorithm:"pathfinder_rrr",verification_profile:"routability_research"}));
 await fs.writeFile(path.join(project,"config/gf180/rules_gf180.json"),JSON.stringify({gate_width:100}));
 for(const name of ["benchmark_runner.py","benchmark_report.py","build_known_feasible_corpus.py"])await fs.writeFile(path.join(project,"scripts",name),name);
 await fs.writeFile(path.join(helpers,"research_workflow.py"),"dispatcher");await fs.writeFile(path.join(helpers,"unified_workflow.py"),"unified");
 const text=Array.from({length:cells},(_,i)=>".subckt INV"+i+" A Y VDD VSS\nXMP Y A VDD VDD pmos w=2u l=100n\nXMN Y A VSS VSS nmos w=1u l=100n\n.ends INV"+i+"\n").join("");
 await fs.writeFile(path.join(workspace,"input/model.sp"),text);
 const file={relativePath:"model.sp",role:"netlist",sha256:hash(text),validationErrors:[],unresolvedIncludes:[]};
 const native={id:"native",toolId:"acg-"+engine,enabled:true,executablePath:"/bin/true",interpreterPath:null,rootPath:project,timeoutSeconds:1,maxConcurrency:1,environmentNames:[]};
 const helper={...native,id:"helper",toolId:"acg-research",rootPath:helpers,entryPoint:path.join(helpers,"research_workflow.py"),interpreterPath:"/usr/bin/python3",timeoutSeconds:86400};
 const c={moduleId:"acg",storageRoot:root,now:()=>new Date().toISOString(),files:[file],toolHealth:{native:{status:"healthy",selfTestPassed:true},helper:{status:"healthy",selfTestPassed:true,version:"sha256:"+hash("dispatcher")+" unifiedSha256:"+hash("unified")}},job:{id:"test",operation:"unified",workspaceRelativePath:"jobs/test",parameters:{engine,mode:"placement",presetId:engine+":gf180:config"},inputManifest:{files:[file]},toolConfigurations:[native,helper]}} as unknown as ValidationContext;
 const run=async(key:string,extra={})=>executeAcgStep({...c,workspacePath:workspace,step:{id:key,stepKey:key},abortSignal:new AbortController().signal,emit:async()=>{},...extra} as never);
 return {c,project,workspace,helpers,run};
}
describe("unified ACG frozen stages",()=>{
 it("preserves 256-cell generation capacity and freezes a single source with full process timeout sum",async()=>{
  const {c}=await fixture("mr",16);const plan=await buildAcgPlan(c);const snap=(plan as any).acgUnifiedSnapshot;
  expect(plan.steps.slice(0,3).map(s=>s.id)).toEqual(["prepare","unified-prepare","generate"]);
  expect(plan.steps.findIndex(s=>s.id==="generation-normalize")).toBeLessThan(plan.steps.findIndex(s=>s.id==="unified-comparison"));
  expect(snap.request.cellNames).toHaveLength(16);expect(snap.budget.searchBudgetScope).toBe("job");expect(snap.budget.searchMaximumAttempts).toBe(6);
  expect(snap.budget.totalUpperBoundSeconds).toBe(plan.steps.reduce((sum,s)=>sum+(s.process?.timeoutSeconds??0),0));
  expect(snap.request.sourceNetlistSha256).toBe(c.files[0]!.sha256);expect((plan as any).acgSnapshot.parameters.engine).toBe("mr");
 });
 it("requires current helper digest and honors native concurrency and matrix bounds",async()=>{
  const {c}=await fixture();c.job.parameters.unified={threads:2};expect((await validateUnifiedDraft(c)).valid).toBe(false);
  c.job.parameters.unified={algorithms:["dp","sa"],trials:10};const {c:many}=await fixture("mr",51);many.job.parameters.unified=c.job.parameters.unified;
  expect((await validateUnifiedDraft(many)).errors[0]!.message).toMatch(/1000/);
  delete c.job.parameters.unified;c.toolHealth!.helper!.version="sha256:"+hash("dispatcher");expect((await validateUnifiedDraft(c)).valid).toBe(false);
 });
 it("uses effective DR row/track config and permits unsupported comparison empty algorithms",async()=>{
  const {c}=await fixture("dr");c.job.parameters={...c.job.parameters,numRows:2,trackNum:5,unified:{algorithms:[]}};
  expect((await validateUnifiedDraft(c)).errors[0]!.code).toBe("ACG_DR_ROWS_TRACKS");
  c.job.parameters.trackNum=6;const plan=await buildAcgPlan(c);expect((plan as any).acgUnifiedSnapshot.budget.comparisonMaximumRuns).toBe(0);expect((plan as any).acgUnifiedSnapshot.budget.searchMaximumAttempts).toBe(0);
  expect(()=>normalizeUnifiedSettings({searchExtraCpp:[2,0]},"mr")).toThrow();
 });
 it("checks helpers before generation and detects snapshot or staged-source tampering",async()=>{
  const {c,run,workspace,helpers}=await fixture();c.job.plan=await buildAcgPlan(c);await run("prepare");await run("unified-prepare");
  await fs.writeFile(path.join(helpers,"unified_workflow.py"),"changed");await expect(run("unified-prepare")).rejects.toThrow(/Helper source changed/);
  await fs.writeFile(path.join(helpers,"unified_workflow.py"),"unified");await fs.writeFile(path.join(workspace,"work/netlist.sp"),"changed");await expect(run("unified-prepare")).rejects.toThrow(/Staged source changed/);
  (c.job.plan as any).acgUnifiedSnapshot.settings.trials=3;await expect(run("generate")).rejects.toThrow(/snapshot changed/);
 });
 it("retains nonzero generation exit and assembles later evidence without re-inspecting search GDS",async()=>{
  const {c,run,workspace}=await fixture();c.job.plan=await buildAcgPlan(c);await run("prepare");await run("unified-prepare");
  const raw=await run("generate",{runPlannedProcess:async()=>({exitCode:3,processId:1,processGroupId:1})});expect(raw.outputs.unifiedRecoverable).toBe(true);
  await run("generation-normalize");const generation=JSON.parse(await fs.readFile(path.join(workspace,"output/acg-generation.json"),"utf8"));expect(generation.data.acg).toMatchObject({processStatus:"failed",nativeExitCode:3});expect(generation.data.acgUnified.stages[0].status).toBe("failed");
  const request=(c.job.plan as any).acgUnifiedSnapshot.request;
  for(const id of ["comparison","search","report"]){
   const dir=path.join(workspace,"output/unified",id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,"evidence.txt"),id);
   await fs.writeFile(path.join(dir,"summary.json"),JSON.stringify({schemaVersion:"acg.unified-stage.v1",id,engine:"mr",status:"unsupported",reason:"test",sourceNetlistSha256:request.sourceNetlistSha256,configSha256:request.configSha256,rulesSha256:request.rulesSha256,requestSha256:hash(JSON.stringify(request,null,2)+"\n"),executableSha256:request.trustedResources.executableSha256,scriptSha256:{},resourceSha256:{},helperSha256:request.trustedResources.helperSha256,evidenceSha256:{"evidence.txt":hash(id)}}));
  }
  await fs.writeFile(path.join(workspace,"output/unified/search/fake.gds"),"unrelated search data");await run("unified-normalize");
  const result=JSON.parse(await fs.readFile(path.join(workspace,"output/acg-result.json"),"utf8"));expect(result.summary.status).toBe("partial");expect(result.data.acg.cells).toEqual(generation.data.acg.cells);expect(result.data.acgUnified.stages).toHaveLength(4);
  await fs.writeFile(path.join(workspace,"output/unified/search/evidence.txt"),"tampered");await expect(run("unified-normalize")).rejects.toThrow(/artifact checksum differs/);
 });
 it("rejects a stage bound to a different request even with matching source hashes",async()=>{
  const {c,run,workspace}=await fixture();c.job.plan=await buildAcgPlan(c);await run("prepare");await run("unified-prepare");
  const request=(c.job.plan as any).acgUnifiedSnapshot.request,dir=path.join(workspace,"output/unified/comparison");await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,"summary.json"),JSON.stringify({schemaVersion:"acg.unified-stage.v1",id:"comparison",engine:"mr",status:"unsupported",sourceNetlistSha256:request.sourceNetlistSha256,configSha256:request.configSha256,rulesSha256:request.rulesSha256,requestSha256:"0".repeat(64)}));
  await expect(run("unified-comparison",{runPlannedProcess:async()=>({exitCode:0})})).rejects.toThrow(/binding differs/);
 });
});
