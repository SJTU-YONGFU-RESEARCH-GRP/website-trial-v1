import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { describe,it,expect,afterEach } from "vitest";
import { normalizeParameters,validateConfiguration,parseCellNames,resolveInputs } from "../../../server/modules/acg/validation.ts";
import { buildAcgPlan } from "../../../server/modules/acg/planner.ts";
import { executeAcgStep } from "../../../server/modules/acg/executor.ts";
import { inspectNative,listOutputs,parseVerification } from "../../../server/modules/acg/parser.ts";
import type { ValidationContext } from "../../../server/modules/acg/types.ts";
const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(x=>fs.rm(x,{recursive:true,force:true})));});
async function directory() { const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-test-"));dirs.push(root);return root; }
async function context(engine="mr") {
  const root=await directory();const project=path.join(root,"project");const workspace=path.join(root,"jobs/test");
  await fs.mkdir(path.join(project,"config/gf180"),{recursive:true});await fs.mkdir(path.join(workspace,"input"),{recursive:true});
  const config={tech:"gf180",track_num:9,num_rows:2,routing_algorithm:"pathfinder_rrr",auto_widen_enable:false,verification_profile:"routability_research"};
  await fs.writeFile(path.join(project,"config/gf180/config.json"),JSON.stringify(config));
  await fs.writeFile(path.join(project,"config/gf180/rules_gf180.json"),JSON.stringify({gate_width:100}));
  const text=".subckt INV A Y VDD VSS\nXMP Y A VDD VDD pmos w=2u l=100n\nXMN Y A VSS VSS nmos w=1u l=100n\n.ends INV\n";
  await fs.writeFile(path.join(workspace,"input/model.sp"),text);
  const file={relativePath:"model.sp",role:"netlist",sha256:createHash("sha256").update(text).digest("hex"),validationErrors:[],unresolvedIncludes:[]};
  const tool={id:"native",toolId:"acg-"+engine,enabled:true,executablePath:"/bin/true",interpreterPath:null,rootPath:project,timeoutSeconds:300,environmentNames:[]};
  return {root,project,workspace,context:{moduleId:"acg",storageRoot:root,now:()=>new Date().toISOString(),files:[file],toolHealth:{native:{status:"healthy",selfTestPassed:true}},job:{workspaceRelativePath:"jobs/test",parameters:{engine,mode:"placement",presetId:engine+":gf180:config"},inputManifest:{files:[file]},toolConfigurations:[tool]}} as unknown as ValidationContext};
}
describe("ACG native parameter and input contract",()=>{
  it("records DR actual rows only from explicit per-cell native placement evidence",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native"),{recursive:true});
    await fs.mkdir(path.join(root,"work"));await fs.writeFile(path.join(root,"work/config.json"),JSON.stringify({enable_double_row:true}));
    await fs.writeFile(path.join(root,"output/native/INV_w4.txt"),"Layout Mode: SINGLE ROW (2 transistors per column)\n");
    await fs.writeFile(path.join(root,"output/native/INVPAIR_w4.txt"),"Layout Mode: DOUBLE ROW (4 transistors per column)\n");
    const result=await inspectNative(root,normalizeParameters({engine:"dr",mode:"placement",presetId:null}),["INV","INVPAIR","MISSING"]);
    expect(result.cells.map(x=>x.geometry.actualRows)).toEqual([1,2,null]);
    expect(result.cells[0]!.geometry.rowEvidencePaths).toEqual(["output/native/INV_w4.txt"]);
    await fs.writeFile(path.join(root,"output/native/INV_w5.txt"),"Layout Mode: DOUBLE ROW (4 transistors per column)\n");
    expect((await inspectNative(root,normalizeParameters({engine:"dr",mode:"placement",presetId:null}),["INV"])).cells[0]!.geometry.actualRows).toBeNull();
  });
  it("binds MR diagnostic upload to its role, CLI, frozen provenance and checked bytes",async()=>{
    const {context:c,workspace}=await context();const text=JSON.stringify({final_hotspots:[]});
    await fs.writeFile(path.join(workspace,"input/hotspots.json"),text);
    const diagnostic={relativePath:"hotspots.json",role:"source-diagnostic",sha256:createHash("sha256").update(text).digest("hex"),validationErrors:[],unresolvedIncludes:[]};
    c.files.push(diagnostic as never);c.job.inputManifest.files=c.files;
    const resolved=await resolveInputs(c);expect(resolved.parameters.sourceDiagnostic).toBe("hotspots.json");
    const plan=await buildAcgPlan(c);const argv=plan.steps.find(x=>x.id==="generate")!.process!.argv;
    expect(argv[argv.indexOf("--source-diagnostic")+1]).toBe("../diagnostic.json");
    expect(plan.steps.find(x=>x.id==="prepare")!.inputRoles).toContain("source-diagnostic");
    c.job.plan=plan;const execution={...c,workspacePath:workspace,step:{stepKey:"prepare"}};
    await executeAcgStep(execution as never);
    expect(await fs.readFile(path.join(workspace,"work/diagnostic.json"),"utf8")).toBe(text);
    expect(JSON.parse(await fs.readFile(path.join(workspace,"work/acg-inputs.json"),"utf8")).parameters.sourceDiagnostic).toBe("hotspots.json");
    await fs.writeFile(path.join(workspace,"input/hotspots.json"),"{}");
    await expect(executeAcgStep(execution as never)).rejects.toThrow(/checksum changed/);
  });
  it("rejects diagnostic role mismatch, duplicate binding and non-MR use",async()=>{
    const {context:c,workspace}=await context();await fs.writeFile(path.join(workspace,"input/hotspots.json"),"{}");
    const file={relativePath:"hotspots.json",role:"config",sha256:"",validationErrors:[],unresolvedIncludes:[]};
    c.files.push(file as never);c.job.parameters.sourceDiagnostic="hotspots.json";
    await expect(resolveInputs(c)).rejects.toThrow(/mapped as source-diagnostic/);
    file.role="source-diagnostic";c.job.parameters.sourceDiagnostic="model.sp";
    await expect(resolveInputs(c)).rejects.toThrow(/mapped as source-diagnostic/);
    delete c.job.parameters.sourceDiagnostic;c.files.push({...file,relativePath:"other.json"} as never);
    await expect(resolveInputs(c)).rejects.toThrow(/Only one source-diagnostic/);
    c.files.pop();c.job.parameters.engine="dr";c.job.toolConfigurations[0]!.toolId="acg-dr";
    await expect(resolveInputs(c)).rejects.toThrow(/requires MR/);
  });
  it("requires healthy MR replay preparation and checks uploaded replay profile",async()=>{
    const {context:c,workspace}=await context();
    const text=await fs.readFile(path.resolve("test/fixtures/acg/raw-uneven-placement.json"),"utf8");
    await fs.writeFile(path.join(workspace,"input/replay.json"),text);
    const file={relativePath:"replay.json",role:"placement",sha256:createHash("sha256").update(text).digest("hex"),validationErrors:[],unresolvedIncludes:[]};
    c.files.push(file as never);c.job.inputManifest.files=c.files;
    await expect(resolveInputs(c)).rejects.toThrow(/healthy acg-replay/);
    c.job.toolConfigurations.push({...c.job.toolConfigurations[0]!,id:"replay",toolId:"acg-replay"});
    c.toolHealth!.replay={status:"healthy",selfTestPassed:true} as never;
    await expect(resolveInputs(c)).rejects.toThrow(/must match the effective configuration/);
    c.job.parameters.numRows=3;
    await fs.writeFile(path.join(workspace,"input/model.sp"),".subckt inv4_common A Y VDD VSS\n.ends inv4_common\n");
    await expect(resolveInputs(c)).resolves.toBeDefined();
    c.job.parameters.trackNum=12;
    await expect(resolveInputs(c)).rejects.toThrow(/must match the effective configuration/);
  });
  it("requires healthy research LVS1 only for explicit routed MR GF180 checks",async()=>{
    const {context:c}=await context();c.job.parameters={...c.job.parameters,mode:"routed",verification:"research"};
    await expect(resolveInputs(c)).rejects.toThrow(/healthy acg-lvs1/);
    c.job.parameters.verification="none";await expect(resolveInputs(c)).resolves.toBeDefined();
    c.job.parameters.verification="research";
    c.job.toolConfigurations.push({...c.job.toolConfigurations[0]!,id:"lvs1",toolId:"acg-lvs1"});
    c.toolHealth!.lvs1={status:"healthy",selfTestPassed:true} as never;
    await expect(resolveInputs(c)).resolves.toBeDefined();
  });
  it("maps explicit pipeline false over inherited true and rejects unsupported enabling",async()=>{
    const {context:c}=await context();c.job.parameters={...c.job.parameters,routabilityPipeline:false,configOverrides:{routability_pipeline_enable:true}};
    expect((await resolveInputs(c)).config.routability_pipeline_enable).toBe(false);
    expect((await buildAcgPlan(c)).steps.find(x=>x.id==="generate")!.process!.argv).not.toContain("--routability-pipeline");
    c.job.parameters.routabilityPipeline=true;await expect(resolveInputs(c)).rejects.toThrow(/requires routed GF180/);
    c.job.parameters.mode="routed";expect((await resolveInputs(c)).config.routability_pipeline_enable).toBe(true);
    expect((await buildAcgPlan(c)).steps.find(x=>x.id==="generate")!.process!.argv).toContain("--routability-pipeline");
  });
  it("makes explicit none clear inherited MR signoff policy and controls optional CMOS checks",async()=>{
    const {context:c}=await context();c.job.parameters={...c.job.parameters,verification:"none",configOverrides:{verification_profile:"foundry_signoff"}};
    expect((await resolveInputs(c)).config.verification_profile).toBe("routability_research");
    const {context:cmos}=await context("cmos");cmos.job.parameters={...cmos.job.parameters,verification:"none",configOverrides:{layout_verify:true}};
    expect((await resolveInputs(cmos)).config.layout_verify).toBe(false);
    cmos.job.parameters.verification="research";expect((await resolveInputs(cmos)).config.layout_verify).toBe(true);
  });
  it("preserves full native configuration while mapping real MR fields",async()=>{
    const {context:c}=await context();c.job.parameters={...c.job.parameters,seed:21,candidateCount:4,configOverrides:{sa_alpha:0.75}};
    const result=await resolveInputs(c);expect(result.config).toMatchObject({placement_random_seed:21,placement_candidate_count:4,placement_only_num_gds:4,route_solutions:4,sa_alpha:0.75});
  });
  it("maps DR predefined placement text to a controlled per-cell path",async()=>{
    const {context:c,workspace}=await context("dr");
    const text="[Column 1]\nNMOS : XMN(1) [Y A VSS], PMOS : XMP(1) [Y A VDD]\n";
    await fs.writeFile(path.join(workspace,"input/layout.txt"),text);
    const file={relativePath:"layout.txt",role:"placement",sha256:createHash("sha256").update(text).digest("hex"),validationErrors:[],unresolvedIncludes:[]};
    c.files.push(file as never);c.job.inputManifest.files.push(file as never);
    const resolved=await resolveInputs(c);expect(resolved.config.predefined_layout_files).toEqual({INV:"../placement.txt"});
  });
  it("rejects actual DR double-row replay fields but accepts inline single-row input in allowed double-row mode",async()=>{
    const {context:c,workspace}=await context("dr");c.job.parameters.numRows=2;
    const upload=async(text:string)=>{await fs.writeFile(path.join(workspace,"input/layout.txt"),text);const file={relativePath:"layout.txt",role:"placement",sha256:createHash("sha256").update(text).digest("hex"),validationErrors:[],unresolvedIncludes:[]};c.files.splice(1,c.files.length,file as never);c.job.inputManifest.files=c.files;};
    await upload("Layout Mode: DOUBLE ROW (4 transistors per column)\n[Column 1] NMOS : MN0(3) [Y0 A VSS], PMOS : MP0(3) [Y0 A VDD], PMOS2: MP1(3) [VDD A Y1], NMOS2: MN1(3) [VSS A Y1]\n");
    await expect(resolveInputs(c)).rejects.toThrow(/single-row placement only/);
    await upload("[Column 1] NMOS : MN0(3) [Y0 A VSS], PMOS : MP0(3) [Y0 A VDD], PMOS2: MP1(3) [VDD A Y1]\n");
    await expect(resolveInputs(c)).rejects.toThrow(/single-row placement only/);
    await upload("Layout Mode: SINGLE ROW (2 transistors per column)\n[Column 1] NMOS : XMN(1) [Y A VSS], PMOS : XMP(1) [Y A VDD]\n");
    expect((await resolveInputs(c)).config.enable_double_row).toBe(true);
  });
  it("requires a real native self-test instead of help-only health",async()=>{
    const {context:c}=await context();c.toolHealth!.native!.selfTestPassed=false;
    await expect(resolveInputs(c)).rejects.toThrow(/real self-test/);
  });
  it("does not silently accept unimplemented placement seeds",async()=>{
    const {context:c}=await context("cmos");c.job.parameters.seed=1;await expect(resolveInputs(c)).rejects.toThrow(/only implemented by MR/);
  });
  it("honors native case insensitive subcircuits and checks every declaration",()=>{
    expect(parseCellNames(".subckt INV A Y\n.ends INV\n.SUBCKT BUF A Y\n.ENDS BUF")).toEqual(["INV","BUF"]);
    for(const text of [".SUBCKT INV A\n.SUBCKT ../../escape",".SUBCKT INV A\n\u000b.SUBCKT /etc A"]) expect(()=>parseCellNames(text)).toThrow();
  });
  it.each([{predefined_layout_dir:"/etc"},{predefined_layout_files:{INV:"/etc/passwd"}},{nested:{COMMANDS:[]}}])("rejects native host path/command sources %j",config=>expect(()=>validateConfiguration(config)).toThrow());
  it("allows native metal direction enums without permitting host directories",()=>{
    expect(()=>validateConfiguration({m1_dir:"BOTH",m2_dir:"HOR"})).not.toThrow();
    for(const value of ["/etc",{},false,"vertical"]) expect(()=>validateConfiguration({m1_dir:value} as never)).toThrow();
    expect(()=>validateConfiguration({predefined_layout_dir:"/etc"})).toThrow();
  });
  it("keeps numerical pathfinder settings and false native switches",()=>expect(()=>validateConfiguration({pathfinder_hotspot_report_limit:10,layout_verify:false,sa_alpha:0.9})).not.toThrow());
  it("requires both uploads for custom configuration",async()=>{
    const {context:c}=await context();c.job.parameters.presetId=null;await expect(resolveInputs(c)).rejects.toThrow(/both config and rules/);
  });
  it("accepts MR single row nonGF180 and single row DP",async()=>{
    const {context:c}=await context();c.job.parameters={...c.job.parameters,numRows:1,algorithm:"dp",configOverrides:{tech:"sky130"}};
    expect((await resolveInputs(c)).config).toMatchObject({num_rows:1,placement_algorithm:"dp",tech:"sky130"});
  });
  it("rejects unsupported native multirow geometry and routing profile",async()=>{
    const {context:c}=await context();c.job.parameters={...c.job.parameters,numRows:3,configOverrides:{tech:"sky130"}};
    await expect(resolveInputs(c)).rejects.toThrow(/GF180/);
  });
  it("validates direct CLI widening options",()=> {
    expect(normalizeParameters({engine:"mr",mode:"placement",presetId:"mr:default",widenPolicy:"hotspot_safe",widenExtraCpp:2})).toMatchObject({widenPolicy:"hotspot_safe",widenExtraCpp:2});
    expect(()=>normalizeParameters({engine:"mr",mode:"placement",presetId:"x",widenPolicy:"auto"})).toThrow();
  });
  it("freezes effective configuration into the plan and checks uploaded bytes",async()=>{
    const {context:c,project,workspace}=await context();const plan=await buildAcgPlan(c);
    const argv=plan.steps.find(x=>x.id==="generate")!.process!.argv;
    expect(argv[argv.indexOf("--placement-output")+1]).toBe("../../output/placement/placement.json");
    await fs.writeFile(path.join(project,"config/gf180/config.json"),'{"tech":"changed"}');c.job.plan=plan;
    const execution={...c,workspacePath:workspace,step:{stepKey:"prepare"}};
    await executeAcgStep(execution as never);
    expect(JSON.parse(await fs.readFile(path.join(workspace,"work/config.json"),"utf8")).tech).toBe("gf180");
    await fs.writeFile(path.join(workspace,"input/model.sp"),"changed");
    await expect(executeAcgStep(execution as never)).rejects.toThrow(/checksum changed/);
  });
});
describe("ACG native output interpretation",()=>{
  it("parses actual schema1 exports separately per cell and accepts the historical extensionless file",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/placement"),{recursive:true});
    const artifact=(cell_name:string,num_rows:number)=>({schema_version:1,cell_name,num_rows,grid:{row_count:num_rows,rows:Array.from({length:num_rows},()=>({nmos:[],pmos:[]}))}});
    for(const [cell,rows] of [["INV",3],["BUF",4]] as const) await fs.writeFile(path.join(root,"output/placement/placement_"+cell+".json"),JSON.stringify(artifact(cell,rows)));
    const params=normalizeParameters({engine:"mr",mode:"placement",presetId:null});
    const multi=await inspectNative(root,params,["INV","BUF"]);
    expect(multi.cells.map(x=>x.geometry.actualRows)).toEqual([3,4]);
    expect(multi.cells.map(x=>x.placement.candidates.length)).toEqual([1,1]);
    await fs.rm(path.join(root,"output/placement"),{recursive:true});
    await fs.writeFile(path.join(root,"output/placement"),JSON.stringify(artifact("INV",3)));
    const legacy=(await inspectNative(root,params,["INV"])).cells[0]!;
    expect(legacy.geometry.actualRows).toBe(3);expect(legacy.artifacts[0]!.role).toBe("acg-placement");
  });
  it("binds CMOS native actual filenames despite different candidate indices",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native"),{recursive:true});
    // Real gdstk rectangle GDS from the renderer self-test; only filename binding is under test.
    const bytes=Buffer.from("AAYAAgJYABwBAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMAgZsaWJyYXJ5AAAUAwU+QYk3S8an8DlEuC+gm1pUABwFAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMBgZTRUxGVEVTVAAECAAABg0CAAEABg4CAAAALBADAAAAAAAAAAAAAAPoAAAAAAAAA+gAAAPoAAAAAAAAA+gAAAAAAAAAAAAEEQAABAcAAAQEAA==","base64");
    await fs.writeFile(path.join(root,"output/native/INV_w3_0.gds"),bytes);
    await fs.writeFile(path.join(root,"output/native/summary.txt"),"Cell name : INV\nWidth 3, Solution 7: M1 routable; GDS_FILE=INV_w3_0.gds\n");
    const result=await inspectNative(root,{engine:"cmos",mode:"routed",presetId:null,configOverrides:{}},["INV"]);
    expect(result.cells[0]!.routing.status).toBe("succeeded");expect(result.cells[0]!.routedCandidates[0]!.gdsPath).toBe("output/native/INV_w3_0.gds");
  });
  it("rejects header-only and truncated GDS record streams",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native"),{recursive:true});
    await fs.writeFile(path.join(root,"output/native/INV.gds"),Buffer.from([0,6,0,2,0,3,0,4]));
    const result=await inspectNative(root,{engine:"mr",mode:"placement",presetId:"x",configOverrides:{}},["INV"]);
    expect(result.cells[0]!.validGdsCount).toBe(0);
  });
  it("uses actual GDS top structure names for placement-only colliding cells",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native/gds"),{recursive:true});
    const bytes=Buffer.from("AAYAAgJYABwBAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMAgZsaWJyYXJ5AAAUAwU+QYk3S8an8DlEuC+gm1pUABwFAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMBgZTRUxGVEVTVAAECAAABg0CAAEABg4CAAAALBADAAAAAAAAAAAAAAPoAAAAAAAAA+gAAAPoAAAAAAAAA+gAAAAAAAAAAAAEEQAABAcAAAQEAA==","base64");
    const named=(name:string)=>{for(let off=0;off<bytes.length;){const len=bytes.readUInt16BE(off);if(bytes[off+2]===6){const record=Buffer.alloc(4+name.length+name.length%2);record.writeUInt16BE(record.length);record[2]=6;record[3]=6;record.write(name,4,"ascii");return Buffer.concat([bytes.subarray(0,off),record,bytes.subarray(off+len)]);}off+=len;}throw new Error("Missing STRNAME");};
    for(const [stem,cell_name] of [["INV_w3_rank0","INV"],["INV_w5_w3_rank0","INV_w5"]]) await fs.writeFile(path.join(root,"output/native/gds",stem+".gds"),named(cell_name!));
    await fs.writeFile(path.join(root,"output/native/summary.txt"),"Cell name : INV\nPlacement-only mode: 1 GDS candidate(s) generated\nCell name : INV_w5\nPlacement-only mode: 1 GDS candidate(s) generated\n");
    const params=normalizeParameters({engine:"mr",mode:"placement",presetId:null});
    const result=await inspectNative(root,params,["INV","INV_w5"]);
    expect(result.cells.map(x=>[x.status,x.validGdsCount])).toEqual([["complete",1],["complete",1]]);
    expect(result.cells[1]!.artifacts.filter(x=>x.role==="acg-gds").map(x=>path.basename(x.relativePath))).toEqual(["INV_w5_w3_rank0.gds"]);
    await fs.writeFile(path.join(root,"output/native/gds/INV_w5_w3_rank0.verification.json"),JSON.stringify({schema_version:2,cell_name:"INV",layers:[]}));
    expect((await inspectNative(root,params,["INV","INV_w5"])).cells.map(x=>x.validGdsCount)).toEqual([1,0]);
  });
  it("does not promote imported unverified DR routing templates to routed candidates",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native"),{recursive:true});
    const bytes=Buffer.from("AAYAAgJYABwBAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMAgZsaWJyYXJ5AAAUAwU+QYk3S8an8DlEuC+gm1pUABwFAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMBgZTRUxGVEVTVAAECAAABg0CAAEABg4CAAAALBADAAAAAAAAAAAAAAPoAAAAAAAAA+gAAAPoAAAAAAAAA+gAAAAAAAAAAAAEEQAABAcAAAQEAA==","base64");
    await fs.writeFile(path.join(root,"output/native/INV_w4_0.gds"),bytes);
    await fs.writeFile(path.join(root,"output/native/summary.txt"),"Cell name : INV\nWidth 4, Solution 0: Imported routing template NOT_CHECKED; GDS_FILE=INV_w4_0.gds\n");
    const cell=(await inspectNative(root,normalizeParameters({engine:"dr",mode:"routed",presetId:null}),["INV"])).cells[0]!;
    expect(cell.routing.status).toBe("unknown");expect(cell.routedCandidates).toEqual([]);expect(cell.status).toBe("partial");
    expect(cell.routing.importedCandidates[0]).toMatchObject({status:"imported_unverified",connectivityStatus:"not_checked"});
    expect(cell.diagnostics.join(" ")).toMatch(/without connectivity verification/);
  });
  it("assigns colliding cell names by companion declaration and quarantines conflicts",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native"),{recursive:true});
    const bytes=Buffer.from("AAYAAgJYABwBAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMAgZsaWJyYXJ5AAAUAwU+QYk3S8an8DlEuC+gm1pUABwFAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMBgZTRUxGVEVTVAAECAAABg0CAAEABg4CAAAALBADAAAAAAAAAAAAAAPoAAAAAAAAA+gAAAPoAAAAAAAAA+gAAAAAAAAAAAAEEQAABAcAAAQEAA==","base64");
    for(const [stem,cell_name] of [["INV_w5_0","INV"],["INV_w5_w6_0","INV_w5"]]) {
      await fs.writeFile(path.join(root,"output/native",stem+".gds"),bytes);
      await fs.writeFile(path.join(root,"output/native",stem+".verification.json"),JSON.stringify({schema_version:2,cell_name,hard_gate_pass:true,layers:[{checks:[{name:"ROUTING_OUTCOME",status:"PASS"},{name:"GDS_PROJECTION",status:"PASS"}]}]}));
    }
    const params=normalizeParameters({engine:"mr",mode:"routed",presetId:null});
    const result=await inspectNative(root,params,["INV","INV_w5"]);
    expect(result.cells.map(x=>[x.status,x.validGdsCount])).toEqual([["complete",1],["complete",1]]);
    expect(result.cells[0]!.artifacts.some(x=>x.relativePath.endsWith("INV_w5_0.gds"))).toBe(true);
    expect(result.cells[1]!.artifacts.some(x=>x.relativePath.endsWith("INV_w5_0.gds"))).toBe(false);
    await fs.writeFile(path.join(root,"output/native/INV_w5_0.routing.json"),JSON.stringify({schema_version:1,cell_name:"INV_w5",status:"ROUTED",outcome:"ROUTED"}));
    const conflict=await inspectNative(root,params,["INV","INV_w5"]);
    expect(conflict.cells[0]!.artifacts.some(x=>x.relativePath.endsWith(".routing.json"))).toBe(false);
    expect(conflict.cells[1]!.artifacts.some(x=>x.relativePath.endsWith(".routing.json"))).toBe(false);
    expect(conflict.cells.map(x=>x.validGdsCount)).toEqual([0,1]);
    await fs.rm(path.join(root,"output/native/INV_w5_0.verification.json"));await fs.rm(path.join(root,"output/native/INV_w5_0.routing.json"));
    expect((await inspectNative(root,params,["INV","INV_w5"])).cells.map(x=>x.validGdsCount)).toEqual([0,1]);
  });
  it("uses only the proven routed candidate width and preserves initial placement width",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native"),{recursive:true});
    const stem=path.join(root,"output/native/INV_final");
    const bytes=Buffer.from("AAYAAgJYABwBAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMAgZsaWJyYXJ5AAAUAwU+QYk3S8an8DlEuC+gm1pUABwFAgB+AAoABgAMACEANwB+AAoABgAMACEANwAMBgZTRUxGVEVTVAAECAAABg0CAAEABg4CAAAALBADAAAAAAAAAAAAAAPoAAAAAAAAA+gAAAPoAAAAAAAAA+gAAAAAAAAAAAAEEQAABAcAAAQEAA==","base64");
    await fs.writeFile(stem+".gds",bytes);
    await fs.writeFile(stem+".verification.json",JSON.stringify({schema_version:2,cell_name:"INV",hard_gate_pass:true,layers:[{checks:[{name:"ROUTING_OUTCOME",status:"PASS"},{name:"GDS_PROJECTION",status:"PASS"}]}]}));
    await fs.writeFile(stem+".routing.json",JSON.stringify({schema_version:1,status:"ROUTED",outcome:"ROUTED",placement:{cell_width_cpp:5}}));
    await fs.writeFile(path.join(root,"output/native/INV_other.routing.json"),JSON.stringify({schema_version:1,status:"ROUTED",outcome:"ROUTED",placement:{cell_width_cpp:99}}));
    await fs.writeFile(path.join(root,"output/native/summary.txt"),"Cell name : INV\nMin #CPP = 4\n");
    const params=normalizeParameters({engine:"mr",mode:"routed",presetId:null});
    expect((await inspectNative(root,params,["INV"])).cells[0]!.metrics).toMatchObject({widthCpp:5,routedWidthCpp:5,placementWidthCpp:4,widthSource:"routed_candidate"});
    await fs.rm(stem+".routing.json");
    expect((await inspectNative(root,params,["INV"])).cells[0]!.metrics).toMatchObject({widthCpp:4,placementWidthCpp:4,widthSource:"placement"});
  });
  it("retains CMOS pre-route research evidence without inventing official checks",()=>{
    const result=parseVerification({phase:"PRE_ROUTE",pass:true,drc:{pass:true},lvs:{pass:false}},"native.json");
    expect(result.preRoute.status).toBe("passed");expect(result.researchDrc.status).toBe("passed");
    expect(result.lvs0.status).toBe("failed");expect(result.lvs1.status).toBe("unknown");expect(result.officialDrc.status).toBe("unknown");
  });
  it("does not relabel schema2 placement LVS compatibility view as routed LVS0",()=>{
    const result=parseVerification({schema_version:2,phase:"PRE_ROUTE",pass:true,lvs:{pass:true},milestones:{PLACEMENT_VALID:{status:"PASS"}}},"mr.json");
    expect(result.preRoute.status).toBe("passed");expect(result.lvs0.status).toBe("unknown");
  });
  it("separates unknown, not checked and official passes",()=>{
    const value=parseVerification({layers:[{checks:[{name:"LVS0_CONNECTIVITY",status:"NOT_CHECKED"},{name:"FOUNDRY_DRC",status:"FAIL"}]}]},"x.json");
    expect(value.lvs0.status).toBe("not_run");expect(value.lvs1.status).toBe("unknown");expect(value.officialDrc.status).toBe("failed");expect(value.officialLvs.status).toBe("unknown");
  });
  it("rejects symlinked output root and descendants",async()=>{
    const root=await directory();const outside=await directory();await fs.writeFile(path.join(outside,"secret.txt"),"secret");
    await fs.symlink(outside,path.join(root,"output"));await expect(listOutputs(root)).rejects.toThrow(/Unsafe output/);
  });
  it("does not promote empty GDS or partial fabricated route ledgers",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native/gds"),{recursive:true});
    await fs.writeFile(path.join(root,"output/native/gds/INV.gds"),"");
    await fs.writeFile(path.join(root,"output/native/gds/INV.verification.json"),JSON.stringify({cell_name:"INV",hard_gate_pass:true,layers:[{checks:[{name:"ROUTING_OUTCOME",status:"PASS"}]}]}));
    const result=await inspectNative(root,{engine:"mr",mode:"routed",presetId:"x",configOverrides:{}},["INV"]);
    expect(result.cells[0]!.routing.status).toBe("unknown");expect(result.cells[0]!.status).toBe("partial");expect(result.cells[0]!.validGdsCount).toBe(0);
  });
  it("keeps multi-cell summaries isolated, including failed/debug output",async()=>{
    const root=await directory();await fs.mkdir(path.join(root,"output/native"),{recursive:true});
    await fs.writeFile(path.join(root,"output/native/summary.txt"),"Cell name : INV\nWidth 3, Solution 0: Unroutable\nCell name : BUF\nMin #CPP = 8\n");
    const result=await inspectNative(root,{engine:"cmos",mode:"routed",presetId:"x",configOverrides:{}},["INV","BUF"]);
    expect(result.cells[0]!.routing.status).toBe("failed");expect(result.cells[1]!.routing.status).toBe("unknown");expect(result.cells[1]!.metrics).toMatchObject({widthCpp:8});
  });
});
