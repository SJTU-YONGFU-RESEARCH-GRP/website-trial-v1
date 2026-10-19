import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {describe,it,expect,afterEach} from "vitest";
import {normalizeResearchParameters,validateNativeAggregate,validateResearchDraft,buildResearchPlan,executeResearchStep,bindAcgResearchSource,type AcgResearchSource} from "../../../server/modules/acg/workflow.ts";
import {validateAcgDraft} from "../../../server/modules/acg/validation.ts";
import {acgCapabilities} from "../../../server/modules/acg/capabilities.ts";
import type {ValidationContext} from "../../../server/modules/acg/types.ts";
import type {JsonObject} from "../../../shared/contracts/v1.ts";
import {ACG_BENCHMARK_TRANSISTORS} from "../../../shared/acgResearch.ts";
import {SafeProcessRunner} from "../../../server/app/process/safeProcess.ts";
const roots:string[]=[];const sha=(b:string|Buffer)=>createHash("sha256").update(b).digest("hex");
afterEach(async()=>{await Promise.all(roots.splice(0).map(r=>fs.rm(r,{recursive:true,force:true})));});
async function fixture(operation="algorithm-matrix",engine="mr"){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-research-contract-"));roots.push(root);const project=path.join(root,"project"),workspace=path.join(root,"jobs/draft");
 const write=async(relative:string,value:unknown)=>{const filename=path.join(root,relative);await fs.mkdir(path.dirname(filename),{recursive:true});await fs.writeFile(filename,typeof value==="string"?value:JSON.stringify(value));};
 await write("project/scripts/benchmark_report.py","trusted report source");await write("project/scripts/benchmark_runner.py","trusted runner source");await write("project/scripts/build_known_feasible_corpus.py","trusted corpus source");await write("helper.py","trusted wrapper source");
 for(const algo of ["dp","sa"])await write("project/config/gf180/config_benchmark_9T_"+algo+".json",{tech:"gf180",track_num:9,placement_only:true,placement_algorithm:algo});
 await write("project/config/gf180/config.json",{tech:"gf180",track_num:9});await write("project/config/gf180/rules_gf180.json",{gate_width:100});
 await write("project/input/benchmark/inv_x1.sp",".subckt inv_x1 A Y VDD VSS\n.ends inv_x1\n");await fs.mkdir(path.join(workspace,"input"),{recursive:true});
 const tool={id:"native",toolId:"acg-"+engine,enabled:true,rootPath:project,executablePath:"/bin/true",interpreterPath:null,entryPoint:null,timeoutSeconds:1800,environmentNames:[]};
 const helper={...tool,id:"helper",toolId:"acg-research",entryPoint:path.join(root,"helper.py"),interpreterPath:"/usr/bin/python3",executablePath:null,timeoutSeconds:86400};
 const c={moduleId:"acg",storageRoot:root,now:()=>new Date().toISOString(),files:[],toolHealth:{native:{status:"healthy",selfTestPassed:true},helper:{status:"healthy",selfTestPassed:true,version:"acg.research-workflow.v1 sha256:"+sha("trusted wrapper source")}},job:{id:"draft",ownerId:"owner",operation,workspaceRelativePath:"jobs/draft",parameters:{engine},inputManifest:{files:[]},toolConfigurations:[tool,helper]}} as unknown as ValidationContext;
 const upload=async(relative:string,role:string,value:unknown)=>{const text=typeof value==="string"?value:JSON.stringify(value);await write("jobs/draft/input/"+relative,text);const file={relativePath:relative,role,sha256:sha(text),validationErrors:[],unresolvedIncludes:[]};c.files.push(file as never);c.job.inputManifest.files=c.files;};
 return {root,project,workspace,c,write,upload};
}
describe("README research workflow preflight",()=>{
 it("supports the documented225 matrix and derives unchanged native timeout budget",()=>{
  const p=normalizeResearchParameters("algorithm-matrix",{engine:"mr",cells:Object.keys(ACG_BENCHMARK_TRANSISTORS),algorithms:["dp","sa","greedy_min","hc_fi","random"],rowCounts:[1,2,3],trials:1});
  expect(p.budget.maximumNativeRuns).toBe(225);expect(p.budget.upperBoundSeconds).toBe(50460);
 });
 it("rejects irrelevant fields, scalar arrays, DR, unsupported corpus rows and invalid ladders",()=>{
  for(const p of [{engine:"mr",verification:"research"},{engine:"mr",cells:"inv_x1"},{engine:"dr"},{engine:"cmos",rowCounts:[2]}])expect(()=>normalizeResearchParameters("algorithm-matrix",p)).toThrow();
  for(const p of [{engine:"mr",numRows:4},{engine:"mr",tracks:[5]},{engine:"mr",numRows:2,tracks:[9,5]},{engine:"mr",extraCpp:[0,17]}])expect(()=>normalizeResearchParameters("known-feasible",p)).toThrow();
 });
 it("caps matrix counts and bounded serial walltime without altering native timeouts",async()=>{
  expect(()=>normalizeResearchParameters("algorithm-matrix",{engine:"mr",cells:Object.keys(ACG_BENCHMARK_TRANSISTORS),algorithms:["dp","sa"],rowCounts:[1,2,3,4],trials:10})).toThrow(/1000-run/);
  const {c}=await fixture("known-feasible");c.job.parameters.totalTimeoutSeconds=86400;expect((await validateResearchDraft(c)).errors[0]!.code).toBe("ACG_RESEARCH_BUDGET");
 });
 it("selects trusted defaults and emits audited three-step plan",async()=>{
  const {c}=await fixture();const plan=await buildResearchPlan(c);
  expect(plan.steps.map(s=>s.id)).toEqual(["research-prepare","research-execute","research-normalize"]);
  expect(plan.steps[1]!.process!.toolConfigurationId).toBe("helper");expect(plan.steps[1]!.process!.timeoutSeconds).toBe(780);
  expect(plan.steps[1]!.process!.argv).toEqual(["--request","work/research-request.json","--output","output/research-workflow","--artifacts-root","."]);
 });
 it("requires matching supplied configs and rejects unsupported uploaded paths/roles",async()=>{
  const {c,upload}=await fixture();c.job.parameters.algorithms=["greedy_min"];expect((await validateResearchDraft(c)).errors[0]!.message).toMatch(/Upload greedy_min/);
  await upload("greedy_min.json","algorithm-config",{tech:"gf180",placement_only:true,placement_algorithm:"greedy_min",num_rows:2});expect((await validateResearchDraft(c)).errors[0]!.message).toMatch(/base num_rows/);
  c.files=[];await upload("model.sp","netlist",".subckt inv_x1 A Y\n.ends\n");expect((await validateResearchDraft(c)).errors[0]!.code).toBe("ACG_RESEARCH_INPUT");
 });
 it("report-only uses wrapper/scripts with unhealthy or absent native binary",async()=>{
  const {c,upload}=await fixture("algorithm-report");c.job.toolConfigurations=c.job.toolConfigurations.filter(t=>t.toolId==="acg-research");await upload("aggregate.json","aggregate",{inv_x1:{dp:{success:true,trials:[{success:true,return_code:124,timeout:true,min_cpp:3}]}}});
  expect((await validateResearchDraft(c)).valid).toBe(true);const plan=await buildResearchPlan(c);expect((plan as unknown as {acgResearchSnapshot:{request:{trustedResources:{executable:unknown}}}}).acgResearchSnapshot.request.trustedResources.executable).toBeNull();
 });
 it("renders the real native aggregate through audited report wrapper without native binary",async()=>{
  const {c,workspace,upload}=await fixture("algorithm-report");const bytes=await fs.readFile(path.resolve("test/fixtures/acg/native-matrix-aggregate.json"),"utf8");await upload("aggregate.json","aggregate",bytes);
  const helper=c.job.toolConfigurations.find(t=>t.toolId==="acg-research")!;helper.rootPath="/home/duhaochen/AutoCellGen_TY";helper.entryPoint=path.resolve("scripts/acg/research_workflow.py");helper.interpreterPath="/usr/bin/python3";(helper as unknown as {environment:object}).environment={};c.job.toolConfigurations=[helper];
  c.toolHealth!.helper={status:"healthy",selfTestPassed:true,version:"acg.research-workflow.v1 sha256:"+sha(await fs.readFile(helper.entryPoint))} as never;
  const plan=await buildResearchPlan(c);c.job.plan=plan;const abortSignal=new AbortController().signal,runner=new SafeProcessRunner(50);let streams="";
  await executeResearchStep({...c,workspacePath:workspace,abortSignal,step:{stepKey:"research-prepare"}} as never);
  const result=await executeResearchStep({...c,workspacePath:workspace,abortSignal,step:{stepKey:"research-execute"},runPlannedProcess:()=>runner.run("report-fixture",{tool:helper as never,argv:plan.steps[1]!.process!.argv,cwd:workspace,allowedCwdRoot:workspace,abortSignal,timeoutSeconds:60,onOutput:(_s,text)=>{streams+=text;}})} as never);expect(result.exitCode,streams).toBe(0);
  await executeResearchStep({...c,workspacePath:workspace,step:{stepKey:"research-normalize"}} as never);const normalized=JSON.parse(await fs.readFile(path.join(workspace,"output/acg-result.json"),"utf8")).data;
  expect(normalized.acg).toBeUndefined();expect(normalized.acgResearch.metrics).toHaveLength(2);expect(normalized.acgResearch.executableSha256).toBeNull();expect(normalized.acgResearch.aggregateOrigin).toBe("uploaded");expect(normalized.acgResearch.generationConfiguration).toBeNull();expect(normalized.acgResearch.metrics.every((m:{layoutValidity:string})=>m.layoutValidity==="NOT_EVALUATED")).toBe(true);
  expect(await fs.readFile(path.join(workspace,"output/research-workflow/aggregate.json"),"utf8")).toBe(bytes);expect(await fs.readdir(path.join(workspace,"output/research-workflow"))).not.toContain("_workspace");
 },10000);
 it("rejects stale helper self-test even when cached health is healthy",async()=>{
  const {c,write}=await fixture();await write("helper.py","changed source");expect((await validateResearchDraft(c)).errors[0]!.message).toMatch(/current source checksum/);
 });
 it("accepts byte-identical actual native aggregate through upload and owned-source report",async()=>{
  const bytes=await fs.readFile(path.resolve("test/fixtures/acg/native-matrix-aggregate.json"),"utf8");expect(JSON.parse(bytes).inv_x1.transistors).toBe(2);expect(()=>validateNativeAggregate(JSON.parse(bytes))).not.toThrow();
  const {c,upload,write}=await fixture("algorithm-report");await upload("aggregate.json","aggregate",bytes);expect((await validateResearchDraft(c)).valid).toBe(true);
  c.files=[];c.job.inputManifest.files=[];const id="11111111-1111-4111-8111-111111111111",relative="results/acg/"+id+"/output/research-workflow/aggregate.json";await write(relative,bytes);c.job.parameters.sourceResultId=id;(c as ValidationContext&{acgResearchSource:AcgResearchSource}).acgResearchSource={resultId:id,ownerId:"owner",engine:"mr",operation:"algorithm-matrix",generationConfiguration:{dp:{trackNum:9}},artifacts:[{relativePath:relative,sha256:sha(bytes)}] as never};expect((await validateResearchDraft(c)).valid).toBe(true);
 });
 it("validates native trial values while retaining timeout/nonzero metric evidence",()=>{
  expect(()=>validateNativeAggregate({inv_x1:{dp:{success:true,trials:[{success:true,return_code:7,timeout:true,min_cpp:3}]}}})).not.toThrow();
  for(const raw of [{inv_x1:{dp:{success:"true"}}},{inv_x1:{dp:{success:true,cost:Infinity}}},{inv_x1:{dp:{success:true,return_code:"0"}}},{}])expect(()=>validateNativeAggregate(raw)).toThrow();
 });
 it("gates capabilities per operation and exposes full bounds",async()=>{
  const {c}=await fixture();c.toolConfigurations=c.job.toolConfigurations;c.toolHealth!.native={status:"unhealthy",selfTestPassed:false} as never;const caps=await acgCapabilities(c);
  const workflows=caps.find(x=>x.toolId==="acg-mr")!.limits.researchWorkflows as unknown as Array<{operation:string;available:boolean;limits:{maxRuns:number;maxRows:number}}>;
  expect(workflows.find(w=>w.operation==="algorithm-report")!.available).toBe(true);expect(workflows.find(w=>w.operation==="algorithm-matrix")!.available).toBe(false);expect(workflows[0]!.limits.maxRuns).toBe(1000);expect(workflows.find(w=>w.operation==="known-feasible")!.limits.maxRows).toBe(3);
 });
 it("rechecks frozen input hashes and script bindings before native invocation",async()=>{
  const {c,workspace,write}=await fixture();const plan=await buildResearchPlan(c);c.job.plan=plan;
  await executeResearchStep({...c,workspacePath:workspace,abortSignal:new AbortController().signal,step:{stepKey:"research-prepare"}} as never);
  expect(JSON.parse(await fs.readFile(path.join(workspace,"work/research-request.json"),"utf8")).parameters.algorithms).toEqual(["dp","sa"]);
  await write("project/input/benchmark/inv_x1.sp","changed");await expect(executeResearchStep({...c,workspacePath:workspace,abortSignal:new AbortController().signal,step:{stepKey:"research-prepare"}} as never)).rejects.toThrow(/Frozen input/);
 });
 it("does not reinterpret default run or unknown operations as research",async()=>{
  const {c}=await fixture("run");expect((await validateAcgDraft(c)).errors[0]!.code).toBe("ACG_MODE");
  c.job.operation="unexpected";expect((await validateAcgDraft(c)).errors[0]!.code).toBe("ACG_OPERATION");
 });
});
describe("retained research sources",()=>{
 it("requires source ownership and computed operation even when public result is readable",()=>{
  const id="11111111-1111-4111-8111-111111111111";let owner="foreign";let operation="algorithm-matrix";let origin="computed";
  const repositories={results:{get:()=>({ownerId:owner,lifecycle:"published",provenance:{origin},data:{acgResearch:{operation,schemaVersion:"acg.research-workflow.v1",engine:"mr"}}})},artifacts:{listResult:()=>[]}};
  const job={moduleId:"acg",ownerId:"owner",operation:"algorithm-report"};const call=()=>bindAcgResearchSource(repositories as never,job as never,{sourceResultId:id,engine:"mr"});
  expect(call).toThrow(/your own/);owner="owner";expect(call()!.resultId).toBe(id);origin="imported";expect(call).toThrow();origin="computed";operation="known-feasible";expect(call).toThrow();
 });
 it("continues only unchanged input/policy with increasing caps and DB-bound snapshot",async()=>{
  const {c,root,workspace,write,upload}=await fixture("known-feasible");const id="11111111-1111-4111-8111-111111111111";const prefix="results/acg/"+id+"/output/research-workflow/";
  const previous=normalizeResearchParameters("known-feasible",{engine:"mr"}).parameters;
  const retainedConfig=JSON.stringify({tech:"gf180",track_num:12,placement_random_seed:123}),retainedRules=JSON.stringify({gate_width:101}),retainedNetlist="* custom source retained\n.subckt inv_x1 A Y VDD VSS\n.ends inv_x1\n";
  const contents:Record<string,string>={"inputs/config.json":retainedConfig,"inputs/rules.json":retainedRules,"inputs/netlists/inv_x1.sp":retainedNetlist,"source-request.json":JSON.stringify({parameters:previous,engine:"mr"}),"lineage.json":JSON.stringify({inputSha256:{configBase:sha(retainedConfig),rules:sha(retainedRules),"netlist:inv_x1":sha(retainedNetlist)}}),"native/inv_x1/manifest.json":JSON.stringify({attempts:[{wall_time_sec:2}],status:"CAPPED_UNRESOLVED"})};
  const inv={schemaVersion:"acg.research-snapshot.v1",sourceOutputRoot:"/original/job/output/research-workflow",files:Object.fromEntries(Object.entries(contents).map(([k,v])=>[k,sha(v)]))};contents["snapshot-files.json"]=JSON.stringify(inv);
  contents["summary.json"]=JSON.stringify({scriptSha256:{"benchmark_report.py":sha("trusted report source"),"build_known_feasible_corpus.py":sha("trusted corpus source")},executableSha256:sha(await fs.readFile("/bin/true"))});(inv.files as Record<string,string>)["summary.json"]=sha(contents["summary.json"]!);contents["snapshot-files.json"]=JSON.stringify(inv);
  const artifacts=[];for(const [relative,content]of Object.entries(contents)){await write(prefix+relative,content);artifacts.push({relativePath:prefix+relative,sha256:sha(content),ownerId:"owner",resultId:id});}
  const source={resultId:id,ownerId:"owner",operation:"known-feasible",artifacts} as AcgResearchSource;(c as ValidationContext&{acgResearchSource:AcgResearchSource}).acgResearchSource=source;c.job.parameters.resumeResultId=id;
  expect((await validateResearchDraft(c)).valid).toBe(true);const resumedPlan=await buildResearchPlan(c);c.job.plan=resumedPlan;await executeResearchStep({...c,workspacePath:workspace,abortSignal:new AbortController().signal,step:{stepKey:"research-prepare"}} as never);expect(await fs.readFile(path.join(workspace,"work/research/config.json"),"utf8")).toBe(retainedConfig);expect(await fs.readFile(path.join(workspace,"work/research/netlists/inv_x1.sp"),"utf8")).toBe(retainedNetlist);
  await upload("config.json","config",retainedConfig);expect((await validateResearchDraft(c)).valid).toBe(true);c.files=[];c.job.inputManifest.files=[];await upload("config.json","config",{tech:"gf180",track_num:9});expect((await validateResearchDraft(c)).errors[0]!.code).toBe("ACG_RESEARCH_CONTINUATION");c.files=[];c.job.inputManifest.files=[];
  c.job.parameters.maxAttempts=29;expect((await validateResearchDraft(c)).errors[0]!.code).toBe("ACG_RESEARCH_CONTINUATION");
  c.job.parameters.maxAttempts=31;c.job.parameters.tracks=[9,16];expect((await validateResearchDraft(c)).errors[0]!.code).toBe("ACG_RESEARCH_CONTINUATION");delete c.job.parameters.tracks;
  await fs.writeFile(path.join(root,prefix+"native/inv_x1/manifest.json"),"tampered");expect((await validateResearchDraft(c)).errors[0]!.code).toBe("ACG_RESEARCH_HASH");
 });
 it("normalizes only bound reports and never promotes native metrics to layout validity",async()=>{
  const {c,workspace,write}=await fixture();const plan=await buildResearchPlan(c);c.job.plan=plan;
  const snap=(plan as unknown as {acgResearchSnapshot:{request:JsonObject;helperSha256:string;scriptHashes:JsonObject;budget:JsonObject}}).acgResearchSnapshot;const prefix="jobs/draft/output/research-workflow/";
  const request=JSON.stringify(snap.request),lineage=JSON.stringify({parentResultId:null});await write(prefix+"source-request.json",request);await write(prefix+"lineage.json",lineage);await write(prefix+"aggregate.json","{}");await write(prefix+"REPORT.md","Native GF1809T static caption");
  const evidence={"source-request.json":sha(request),"lineage.json":sha(lineage),"aggregate.json":sha("{}"),"REPORT.md":sha("Native GF1809T static caption")};
  const summary={schemaVersion:"acg.research-workflow.v1",operation:"algorithm-matrix",engine:"mr",parameters:snap.request.parameters,budget:snap.budget,processCompleted:true,nativeReturnCode:0,status:"partial",foundryCertification:false,lvs1Certification:false,wrapperSha256:snap.helperSha256,executableSha256:(snap.request.trustedResources as JsonObject).executableSha256,scriptSha256:snap.scriptHashes,evidenceSha256:evidence,rawReportPaths:["aggregate.json","REPORT.md"],metrics:[{nativeSuccess:true,processExitCode:7,processCompleted:false,layoutValidity:"NOT_EVALUATED"}]};const summaryText=JSON.stringify(summary);await write(prefix+"summary.json",summaryText);
  await write(prefix+"snapshot-files.json",{schemaVersion:"acg.research-snapshot.v1",sourceOutputRoot:path.join(workspace,"output/research-workflow"),files:{...evidence,"summary.json":sha(summaryText)}});
  await executeResearchStep({...c,workspacePath:workspace,step:{stepKey:"research-normalize"}} as never);const parsed=JSON.parse(await fs.readFile(path.join(workspace,"output/acg-result.json"),"utf8"));expect(parsed.data.acg).toBeUndefined();expect(parsed.data.acgResearch.metrics[0].layoutValidity).toBe("NOT_EVALUATED");expect(parsed.data.acgResearch.status).toBe("partial");
  await write(prefix+"REPORT.md","changed");await expect(executeResearchStep({...c,workspacePath:workspace,step:{stepKey:"research-normalize"}} as never)).rejects.toThrow(/checksum changed/);
 });
});
