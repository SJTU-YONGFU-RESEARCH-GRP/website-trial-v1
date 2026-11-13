import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { inspectNative, parseVerification } from "../../../server/modules/acg/parser.ts";
import { readResearchReport, mergeResearchReport, prepareResearchPvManifest, type ResearchReport } from "../../../server/modules/acg/research.ts";
import { executeAcgStep } from "../../../server/modules/acg/executor.ts";
import { normalizeParameters } from "../../../server/modules/acg/validation.ts";
import { buildAcgSelfTest } from "../../../server/modules/acg/selftest.ts";
import { ToolHealthService } from "../../../server/app/tools/health.ts";

const wrapper=path.resolve("scripts/acg/research_lvs1.py");
function python(body:string) {
  const script="import json,os,tempfile,pathlib,argparse,sys\nsys.path.insert(0,str(pathlib.Path(sys.argv[1]).parent))\nimport research_lvs1 as lvs\npv=lvs.pv\n"+body;
  const result=spawnSync("python3",["-B","-c",script,wrapper],{encoding:"utf8",timeout:10000});
  expect(result.status,result.stderr||result.error?.message).toBe(0);
}
const pythonFixture = `
def fixture(root,names=('A','B')):
 (root/'output/native').mkdir(parents=True);(root/'work').mkdir()
 (root/'work/config.json').write_text(json.dumps({'tech':'gf180','placement_only':False}))
 cells=[]
 for name in names:
  gds=root/'output/native'/(name+'.gds');gds.write_bytes(b'fixture')
  ledger=gds.with_suffix('.verification.json');ledger.write_text(json.dumps({'schema_version':2,'cell_name':name,'hard_gate_pass':True,'layers':[{'checks':[{'name':'ROUTING_OUTCOME','status':'PASS'},{'name':'GDS_PROJECTION','status':'PASS'}]}]}))
  manifest=gds.with_suffix('.lvs1_manifest.json');manifest.write_text(json.dumps({'schema_version':2,'mode':'routed','technology':'gf180','topcell':name,'terminals':[{'id':'A'}]}))
  candidate={'gdsPath':pv.relative(root,gds),'verificationPath':pv.relative(root,ledger),'routeStatus':'succeeded','gdsSha256':pv.digest(gds),'verificationSha256':pv.digest(ledger),'lvs1ManifestSha256':pv.digest(manifest)}
  cells.append({'cellName':name,'routedCandidates':[candidate]})
 native=root/'output/acg-native.json';native.write_text(json.dumps({'schemaVersion':'acg.native.v1','engine':'mr','mode':'routed','cells':cells}))
 driver=root/'fake.py';driver.write_text("""import sys,json,pathlib
a=sys.argv;out=pathlib.Path(a[a.index('--out-dir')+1]);gds=pathlib.Path(a[a.index('--gds')+1]);manifest=pathlib.Path(a[a.index('--manifest')+1]);tech=pathlib.Path(a[a.index('--tech')+1]);ledger=pathlib.Path(a[a.index('--verification-ledger')+1])
status='FAIL' if gds.stem=='B' else 'PASS'
summary={'status':status,'pass':status=='PASS','gds':str(gds),'manifest':str(manifest),'technology':str(tech),'evidence_hash':'sha256:fixture','errors':[]}
(out/'lvs1_summary.json').write_text(json.dumps(summary));(out/'lvs1_extracted.json').write_text('{}')
v=json.loads(ledger.read_text());v['hard_gate_pass']=status=='PASS';v['layers'].append({'checks':[{'name':'LVS1_EXTRACTED_CONNECTIVITY','status':status}]});ledger.write_text(json.dumps(v))
sys.exit(0 if status=='PASS' else 2)
""")
 extractor=root/'extract.rb';extractor.write_text('fixture');technology=root/'tech.json';technology.write_text('{}')
 lvs.dependencies=lambda _:(driver,extractor,technology)
 return argparse.Namespace(artifacts_root=str(root),manifest='output/acg-native.json',config='work/config.json',output='output/research-lvs1',engine_root='unused',timeout_seconds=1)
`;

describe("ACG automatic research LVS1",()=>{
  it("accepts helper version evidence and rejects missing research checksums",async()=>{
    const replay=await buildAcgSelfTest({toolId:"acg-replay"} as never,"unused");
    const result=spawnSync("python3",["-B",path.resolve("scripts/acg/prepare_replay.py"),"--self-test"],{encoding:"utf8"});
    expect(result.status).toBe(0);expect(()=>replay.verifyOutput(result.stdout)).not.toThrow();
    expect(()=>replay.verifyOutput(JSON.stringify({healthy:true}))).toThrow();
    const lvs=await buildAcgSelfTest({toolId:"acg-lvs1",rootPath:"/trusted/MR"} as never,"unused");
    expect(lvs.argv).toEqual(["--self-test","--engine-root","/trusted/MR"]);
    const output={healthy:true,version:"acg.research-lvs1.v1",wrapperSha256:"a".repeat(64),driverSha256:"b".repeat(64),extractorSha256:"c".repeat(64),technologySha256:"d".repeat(64)};
    expect(()=>lvs.verifyOutput(JSON.stringify(output))).not.toThrow();
    expect(()=>lvs.verifyOutput(JSON.stringify({...output,wrapperSha256:""}))).toThrow();
  });
  it("stores helper source version in health and rejects changed source",async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-health-"));
    try {
      const entry=path.join(root,"helper.py");await fs.writeFile(entry,"fixture");
      const evidence={healthy:true,version:"acg.research-lvs1.v1",wrapperSha256:createHash("sha256").update("fixture").digest("hex"),driverSha256:"b".repeat(64),extractorSha256:"c".repeat(64),technologySha256:"d".repeat(64)};
      const tools={latestHealth:()=>null,addHealth:()=>{}};
      const runner={run:async(_key:string,spec:{onOutput:(stream:string,text:string)=>void})=>{spec.onOutput("stdout",JSON.stringify(evidence));return {exitCode:0,timedOut:false,outputLimitExceeded:false};}};
      const health=new ToolHealthService(tools as never,runner as never,root);
      const tool={id:"test",moduleId:"acg",toolId:"acg-lvs1",rootPath:root,entryPoint:entry,timeoutSeconds:30} as never;
      const passed=await health.selfTest(tool);expect(passed.selfTestPassed).toBe(true);expect(passed.version).toBe(evidence.version+" sha256:"+evidence.wrapperSha256);
      await fs.writeFile(entry,"changed");const failed=await health.selfTest(tool);expect(failed.selfTestPassed).toBe(false);expect(failed.message).toContain("checksum changed");
    } finally {await fs.rm(root,{recursive:true,force:true});}
  });
  it("probes help without a foundry PDK or optional Python packages",()=>{
    const result=spawnSync("python3",["-B",wrapper,"--help"],{encoding:"utf8"});
    expect(result.status).toBe(0);expect(result.stdout).toContain("--self-test");expect(result.stdout).toContain("--config");
  });
  it("preserves all four native states and rejects contradictory/missing or timed-out evidence",()=>python(`
for raw,code in [('PASS',0),('FAIL',2),('NOT_CHECKED',1),('TOOL_ERROR',1)]:
 summary={'status':raw,'pass':raw=='PASS','evidence_hash':'sha256:e'}
 ledger={'layers':[{'checks':[{'name':lvs.CHECK,'status':raw}]}]}
 assert lvs.classify(summary,code,False,ledger)==raw
 assert lvs.classify(summary,code,True,ledger)=='TOOL_ERROR'
 if raw!='TOOL_ERROR':
  assert lvs.classify(summary,code+3,False,ledger)=='TOOL_ERROR'
  assert lvs.classify(summary,code,False,{})=='TOOL_ERROR'
assert lvs.classify({},0,False,{})=='TOOL_ERROR'
`));
  it("isolates each candidate and publishes real failure with hashes while retaining native ledgers",()=>python(pythonFixture+`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve();args=fixture(root)
 original=(root/'output/native/A.verification.json').read_bytes()
 assert lvs.run(args)==0
 report=pv.read_json(root/'output/research-lvs1/summary.json')
 assert report['overallStatus']=='FAIL' and report['processCompleted'] is True and report['foundryCertification'] is False
 assert [cell['status'] for cell in report['cells']]==['PASS','FAIL']
 for i,cell in enumerate(report['cells']):
  candidate=cell['candidates'][0]
  assert candidate['ledgerPath']=='output/research-lvs1/cell-%04d-candidate-0000/verification.json'%i
  assert candidate['ledgerSha256']==pv.digest(root/candidate['ledgerPath'])
  assert all(pv.digest(root/p)==h for p,h in candidate['evidenceSha256'].items())
 assert (root/'output/native/A.verification.json').read_bytes()==original
 try:lvs.run(args)
 except ValueError as e:assert 'fresh' in str(e)
 else:raise AssertionError('stale output accepted')
`));
  it("rejects changed source hashes, debug routing and wrong technology before tool invocation",()=>python(pythonFixture+`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve();args=fixture(root,('A',));native=pv.read_json(root/'output/acg-native.json');candidate=native['cells'][0]['routedCandidates'][0]
 for key,value in [('gdsSha256','bad'),('verificationSha256','bad'),('lvs1ManifestSha256','bad'),('routeStatus','failed')]:
  try:lvs.candidate_inputs(root,dict(candidate,**{key:value}),'A')
  except ValueError:pass
  else:raise AssertionError('untrusted candidate accepted: '+key)
 native['engine']='dr';pv.write_json(root/'output/acg-native.json',native)
 try:lvs.run(args)
 except ValueError:pass
 else:raise AssertionError('DR research external unsupported boundary accepted')
`));
  it("retains TOOL_ERROR on extractor timeout and terminates descendants",()=>python(pythonFixture+`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve();args=fixture(root,('A',));driver,extractor,tech=lvs.dependencies('unused')
 driver.write_text('import time;time.sleep(30)')
 original_invoke=pv.invoke
 pv.invoke=lambda command,log,timeout:original_invoke(command,log,.05)
 assert lvs.run(args)==0
 report=pv.read_json(root/'output/research-lvs1/summary.json')
 item=report['cells'][0]['candidates'][0]
 assert item['status']=='TOOL_ERROR' and item['timedOut'] is True and item['summaryPath'] is None
`));
  it("leaves official checks NOT_CHECKED when required research LVS1 fails",()=>python(pythonFixture+`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve();args=fixture(root,('B',));assert lvs.run(args)==0
 report=pv.read_json(root/'output/research-lvs1/summary.json');native=pv.read_json(root/'output/acg-native.json')
 native['cells'][0]['routedCandidates'][0]['verificationPath']=report['cells'][0]['candidates'][0]['ledgerPath']
 native['cells'][0]['routedCandidates'][0]['verificationSha256']=report['cells'][0]['candidates'][0]['ledgerSha256']
 pv.write_json(root/'output/official-native.json',native);(root/'work/netlist.sp').write_text('.subckt B A Y VDD VSS\\n.ends B\\n')
 driver,_,_=lvs.dependencies('unused');pv.dependencies=lambda _:driver;pv.topcell=lambda _:'B'
 def forbidden(*args):raise AssertionError('official driver invoked after research failure')
 pv.invoke=forbidden
 official=argparse.Namespace(artifacts_root=str(root),manifest='output/official-native.json',netlist='work/netlist.sp',output='output/pv',engine_root='unused',timeout_seconds=1)
 assert pv.run(official)==0
 item=pv.read_json(root/'output/pv/summary.json')['cells'][0]['candidates'][0]
 assert item['status']=='NOT_CHECKED' and item['officialDrc']['status']=='NOT_CHECKED' and item['officialLvs']['status']=='NOT_CHECKED'
 assert item['combinedHardGatePass'] is False and 'research LVS1 is FAIL' in item['officialLvs']['message']
`));
  it("parses the current native extracted-connectivity check and preserves raw status",()=>{
    const parsed=parseVerification({layers:[{checks:[{name:"LVS1_CONNECTIVITY",status:"NOT_CHECKED"},{name:"LVS1_EXTRACTED_CONNECTIVITY",status:"FAIL"}]}]},"ledger.json");
    expect(parsed.lvs1.status).toBe("failed");expect(parsed.lvs1.details?.status).toBe("FAIL");
  });
});

async function evidenceFixture() {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"acg-lvs1-"));
  const write=async(relative:string,value:unknown)=>{await fs.mkdir(path.dirname(path.join(root,relative)),{recursive:true});await fs.writeFile(path.join(root,relative),typeof value==="string" ? value : JSON.stringify(value));};
  const sha=async(relative:string)=>createHash("sha256").update(await fs.readFile(path.join(root,relative))).digest("hex");
  await write("work/config.json",{tech:"gf180",placement_only:false,num_rows:2,track_num:9});
  const header=Buffer.from([0,6,0,2,0,3,0,4,5,2,0,4,4,0]);
  await fs.mkdir(path.join(root,"output/native"),{recursive:true});await fs.writeFile(path.join(root,"output/native/A.gds"),header);
  const ledger={schema_version:2,cell_name:"A",hard_gate_pass:true,layers:[{checks:[{name:"ROUTING_OUTCOME",status:"PASS"},{name:"GDS_PROJECTION",status:"PASS"}]}]};
  await write("output/native/A.verification.json",ledger);
  await write("output/native/A.lvs1_manifest.json",{schema_version:2,technology:"gf180",mode:"routed",topcell:"A"});
  const parameters=normalizeParameters({engine:"mr",mode:"routed",verification:"research",presetId:null});
  const native=await inspectNative(root,parameters,["A"]);
  expect(native.cells[0]!.routedCandidates).toHaveLength(1);
  await write("output/acg-native.json",native);
  const prefix="output/research-lvs1/cell-0000-candidate-0000/";
  const merged={...ledger,hard_gate_pass:false,layers:[...ledger.layers,{checks:[{name:"LVS1_EXTRACTED_CONNECTIVITY",status:"FAIL"}]}]};
  await write(prefix+"verification.json",merged);await write(prefix+"driver.log","native log");
  await write(prefix+"lvs1_summary.json",{status:"FAIL",pass:false,evidence_hash:"sha256:fixture"});
  await write(prefix+"lvs1_extracted.json",{status:"OK",anchors:[]});
  const paths=["driver.log","lvs1_extracted.json","lvs1_summary.json","verification.json"].map(x=>prefix+x);
  const candidate=native.cells[0]!.routedCandidates[0]!;
  const report:ResearchReport={schemaVersion:"acg.research-lvs1.v1",scope:"gf180-research-connectivity",foundryCertification:false,processCompleted:true,sourceManifestSha256:await sha("output/acg-native.json"),configSha256:await sha("work/config.json"),overallStatus:"FAIL",cells:[{cellName:"A",status:"FAIL",evidencePaths:paths,candidates:[{status:"FAIL",gdsPath:candidate.gdsPath,gdsSha256:candidate.gdsSha256!,nativeLedgerPath:candidate.verificationPath!,nativeLedgerSha256:candidate.verificationSha256!,manifestPath:"output/native/A.lvs1_manifest.json",manifestSha256:candidate.lvs1ManifestSha256!,ledgerPath:prefix+"verification.json",ledgerSha256:await sha(prefix+"verification.json"),summaryPath:prefix+"lvs1_summary.json",logPath:prefix+"driver.log",evidenceHash:"sha256:fixture",combinedHardGatePass:false,evidencePaths:paths,evidenceSha256:Object.fromEntries(await Promise.all(paths.map(async p=>[p,await sha(p)])))}]}]};
  await write("output/research-lvs1/summary.json",report);await write("work/acg-inputs.json",{parameters,cellNames:["A"]});
  return {root,native,report,write,parameters,prefix};
}
describe("ACG research evidence publication",()=>{
  it("merges independent LVS1 into final verification and feeds the merged gate into foundry PV",async()=>{
    const {root,native,write}=await evidenceFixture();
    try {
      const report=await readResearchReport(root);
      await prepareResearchPvManifest(root,report);
      const pvNative=JSON.parse(await fs.readFile(path.join(root,"output/acg-pv-native.json"),"utf8"));
      expect(pvNative.cells[0].routedCandidates[0].verificationPath).toBe(report.cells[0]!.candidates[0]!.ledgerPath);
      mergeResearchReport(native,report);
      expect(native.cells[0]!.verification.lvs1.status).toBe("failed");
      expect(native.cells[0]!.verification.hardGatePass).toBe(false);
      expect(native.cells[0]!.verification.officialLvs.status).toBe("unknown");
      await executeAcgStep({workspacePath:root,step:{stepKey:"normalize"},job:{plan:{steps:[{id:"research-lvs1"}]}}} as never);
      const result=JSON.parse(await fs.readFile(path.join(root,"output/acg-result.json"),"utf8")).data.acg;
      expect(result.cells[0].verification.lvs1.details.status).toBe("FAIL");
      expect(result.researchVerification.scope).toBe("gf180-research-connectivity");
      await write("output/research-lvs1/cell-0000-candidate-0000/driver.log","changed");
      await expect(readResearchReport(root)).rejects.toThrow(/checksum changed/);
    } finally {await fs.rm(root,{recursive:true,force:true});}
  });
  it("rejects changed source manifest and per-cell candidate swaps",async()=>{
    const {root,write,report}=await evidenceFixture();
    try {
      report.cells[0]!.candidates[0]!.ledgerPath="output/research-lvs1/cell-0001-candidate-0000/verification.json";
      await write("output/research-lvs1/summary.json",report);
      await expect(readResearchReport(root)).rejects.toThrow(/binding/);
      await write("output/acg-native.json",{});
      await expect(readResearchReport(root)).rejects.toThrow();
    } finally {await fs.rm(root,{recursive:true,force:true});}
  });
});
