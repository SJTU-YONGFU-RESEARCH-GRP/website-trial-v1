import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const wrapper = path.resolve("scripts/acg/pv.py");
function python(body: string) {
  const script = `import importlib.util, json, os, tempfile, pathlib, argparse, sys\nspec=importlib.util.spec_from_file_location('acg_pv',sys.argv[1])\npv=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(pv)\n${body}`;
  const result = spawnSync("python3", ["-B", "-c", script, wrapper], { encoding: "utf8", timeout: 10000 });
  expect(result.status, result.stderr || result.error?.message).toBe(0);
  return result.stdout.trim();
}

describe("ACG optional official GF180 PV", () => {
  it("probes help without importing optional PV packages", () => {
    const result = spawnSync("python3", ["-B", wrapper, "--help"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--self-test");
    expect(result.stdout).toContain("--manifest");
  });

  it("rejects absolute, escaping and symlinked artifact paths", () => {
    python(`
with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as outside:
 root=pathlib.Path(d).resolve(); (root/'input').write_text('safe'); (root/'link').symlink_to(pathlib.Path(outside)/'secret')
 assert pv.confined(root,'input') == root/'input'
 for value in ['/etc/passwd','../secret','link',None,'']:
  try: pv.confined(root,value)
  except ValueError: pass
  else: raise AssertionError('unsafe path accepted: '+str(value))
`);
  });

  it("rejects debug GDS and malformed native verification before invoking tools", () => {
    python(`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve(); (root/'cell.gds').write_bytes(b'debug'); ledger=root/'verification.json'
 candidate={'routeStatus':'succeeded','gdsPath':'cell.gds','verificationPath':'verification.json'}
 for payload in [{'schema_version':1}, {'schema_version':2,'layers':[{'checks':[{'name':'ROUTING_OUTCOME','status':'FAIL'},{'name':'GDS_PROJECTION','status':'PASS'}]}]}, {'schema_version':2,'layers':[{'checks':[{'name':'ROUTING_OUTCOME','status':'PASS'},{'name':'GDS_PROJECTION','status':'NOT_CHECKED'}]}]}]:
  ledger.write_text(json.dumps(payload))
  try: pv.verified_candidate(root,candidate)
  except ValueError: pass
  else: raise AssertionError('unverified GDS accepted')
`);
  });

  it("validates CMOS/DR genuine cell route summaries against exact GDS and hashes", () => {
    python(`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve(); gds=root/'INV_w8_0.gds'; gds.write_bytes(b'fixture-only'); summary=root/'summary.txt'
 line='Width 8, Solution 0 (Cost = 3): M2 routable (Usage 2), Routing time: 1ms'
 summary.write_text('Cell name : INV\\n'+line+'\\nCell name : OTHER\\n')
 for engine in ['cmos','dr']:
  evidence={'engine':engine,'cellName':'INV','path':'summary.txt','sha256':pv.digest(summary),'gdsSha256':pv.digest(gds),'matchedLine':line}
  candidate={'routeStatus':'succeeded','gdsPath':gds.name,'routeEvidence':evidence}
  assert pv.verified_candidate(root,candidate,engine,'INV')==(gds,None)
  for key,value in [('sha256','wrong'),('gdsSha256','wrong'),('cellName','OTHER'),('matchedLine',line.replace('M2 routable (Usage 2)','Unroutable'))]:
   bad=dict(candidate,routeEvidence=dict(evidence,**{key:value}))
   try: pv.verified_candidate(root,bad,engine,'INV')
   except ValueError: pass
   else: raise AssertionError('unproven legacy route accepted: '+key)
  wrong=root/'INV_w9_0.gds'; wrong.write_bytes(gds.read_bytes())
  try: pv.verified_candidate(root,dict(candidate,gdsPath=wrong.name),engine,'INV')
  except ValueError: pass
  else: raise AssertionError('mismatched GDS candidate accepted')
`);
  });

  it("uses actual successful native GDS_FILE mapping and auto-widen suffix without trusting debug files", () => {
    python(`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve(); summary=root/'summary.txt'
 for basename,line in [('INV_w8_7.gds','Width 8, Solution 0 (Cost = 3, RouteScore = 2): M1 routable, Routing time: 1ms; GDS_FILE=INV_w8_7.gds'),('INV_w9_7_aw1.gds','Width 9 (aw 1), Solution 0: Routable via auto-widen, Routing time: 1ms; GDS_FILE=INV_w9_7_aw1.gds')]:
  gds=root/basename;gds.write_bytes(b'fixture-only');summary.write_text('Cell name : INV\\n'+line+'\\n')
  evidence={'engine':'cmos','cellName':'INV','path':'summary.txt','sha256':pv.digest(summary),'gdsSha256':pv.digest(gds),'matchedLine':line}
  candidate={'routeStatus':'succeeded','gdsPath':basename,'routeEvidence':evidence}
  assert pv.verified_candidate(root,candidate,'cmos','INV')==(gds,None)
  for badname in ['../'+basename,'OTHER_w8_7.gds','INV_debug.gds','INV_w99_7.gds',basename+'; GDS_FILE='+basename]:
   badline=line.split('; GDS_FILE=')[0]+'; GDS_FILE='+badname
   summary.write_text('Cell name : INV\\n'+badline+'\\n')
   bad=dict(candidate,routeEvidence=dict(evidence,matchedLine=badline,sha256=pv.digest(summary)))
   try: pv.verified_candidate(root,bad,'cmos','INV')
   except ValueError: pass
   else: raise AssertionError('unsafe explicit native candidate accepted: '+badname)
 # Legacy summaries cannot use an unrelated candidate index.
 legacy=line.split('; GDS_FILE=')[0];summary.write_text('Cell name : INV\\n'+legacy+'\\n')
 try: pv.verified_candidate(root,dict(candidate,routeEvidence=dict(evidence,matchedLine=legacy,sha256=pv.digest(summary))),'cmos','INV')
 except ValueError: pass
 else: raise AssertionError('legacy index mismatch accepted')
`);
  });

  it("accepts indexed native cell headers without borrowing another cell's route proof", () => {
    python(`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve();gds=root/'inv_x1_w8_7.gds';gds.write_bytes(b'fixture-only');summary=root/'summary.txt'
 line='Width 8, Solution 0 (Cost = 3, RouteScore = 2): M1 routable, Routing time: 1ms; GDS_FILE=inv_x1_w8_7.gds'
 for header in ['Cell name : inv_x1','(0) Cell name : inv_x1','  (12) Cell name : inv_x1']:
  summary.write_text(header+'\\n'+line+'\\n(1) Cell name : OTHER\\n')
  evidence={'engine':'cmos','cellName':'inv_x1','path':'summary.txt','sha256':pv.digest(summary),'gdsSha256':pv.digest(gds),'matchedLine':line}
  candidate={'routeStatus':'succeeded','gdsPath':gds.name,'routeEvidence':evidence}
  assert pv.verified_candidate(root,candidate,'cmos','inv_x1')==(gds,None)
 summary.write_text('(0) Cell name : inv_x1\\n(1) Cell name : OTHER\\n'+line+'\\n')
 candidate['routeEvidence']['sha256']=pv.digest(summary)
 try: pv.verified_candidate(root,candidate,'cmos','inv_x1')
 except ValueError: pass
 else: raise AssertionError('route proof borrowed from different indexed cell')
`);
  });

  it("requires positive official evidence and retains genuine violations", () => {
    python(`
base={'drc':{'status':'PASS'},'lvs':{'status':'PASS'},'pass':True,'overall_status':'PASS'}
assert pv.classify(base,0,False)=='PASS'
assert pv.classify(base,2,False)=='TOOL_ERROR'
assert pv.classify(base,0,True)=='TOOL_ERROR'
assert pv.classify({},0,False)=='TOOL_ERROR'
assert pv.classify(dict(base,drc={'status':'FAIL'},overall_status='TOOL_ERROR',ledger_error='missing'),1,False)=='TOOL_ERROR'
assert pv.classify(dict(base,drc={'status':'FAIL'},overall_status='FAIL'),1,False)=='TOOL_ERROR'
assert pv.classify(dict(base,lvs={'status':'FAIL'},overall_status='FAIL',pass_=False),2,False)=='FAIL'
assert pv.overall([])=='NOT_CHECKED'
`);
  });

  it("publishes per-candidate raw evidence while keeping PV PASS distinct from combined gate", () => {
    python(`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d).resolve(); (root/'cell.gds').write_bytes(b'fixture-only'); (root/'netlist.sp').write_text('.subckt cell A Y VDD VSS\\n.ends\\n')
 original={'schema_version':2,'hard_gate_pass':True,'layers':[{'checks':[{'name':'ROUTING_OUTCOME','status':'PASS'},{'name':'GDS_PROJECTION','status':'PASS'}]}]}
 (root/'native.json').write_text(json.dumps(original))
 (root/'manifest.json').write_text(json.dumps({'schemaVersion':'acg.native.v1','engine':'mr','cells':[{'cellName':'cell','routedCandidates':[{'routeStatus':'succeeded','gdsPath':'cell.gds','verificationPath':'native.json'}]}]}))
 driver=root/'fake-official.py'
 driver.write_text("import sys,json,pathlib,hashlib\\na=sys.argv\\nout=pathlib.Path(a[a.index('--run-dir')+1]); gds=pathlib.Path(a[a.index('--gds')+1]); ledger=pathlib.Path(a[a.index('--verification-ledger')+1])\\nv=json.loads(ledger.read_text());v['hard_gate_pass']=False;v['layers'].append({'checks':[{'name':'FOUNDRY_DRC','status':'PASS'},{'name':'FOUNDRY_LVS','status':'PASS'}]});ledger.write_text(json.dumps(v))\\n(out/'pv_summary.json').write_text(json.dumps({'drc':{'status':'PASS'},'lvs':{'status':'PASS'},'pass':True,'overall_status':'PASS','deck_hash':'sha256:deck','evidence_hash':'sha256:evidence','gds_hash':'sha256:'+hashlib.sha256(gds.read_bytes()).hexdigest()}))\\nprint('fixture official log')\\n")
 pv.dependencies=lambda _:driver; pv.topcell=lambda _: 'cell'
 args=argparse.Namespace(artifacts_root=str(root),manifest='manifest.json',netlist='netlist.sp',output='pv',engine_root='unused',timeout_seconds=1)
 assert pv.run(args)==0
 report=json.loads((root/'pv/summary.json').read_text()); item=report['cells'][0]['candidates'][0]
 assert report['overallStatus']=='PASS' and report['processCompleted'] is True
 assert item['combinedHardGatePass'] is False
 assert json.loads((root/'native.json').read_text())==original
 assert item['ledgerSha256']!=item['nativeLedgerSha256']
 assert item['summaryPath'] in item['evidencePaths'] and item['logPath'] in item['evidencePaths']
 assert all((root/p).is_file() for p in item['evidenceSha256'])
 try: pv.run(args)
 except ValueError: pass
 else: raise AssertionError('stale PV directory reused')
`);
  });

  it("publishes CMOS/DR official PV without fabricating a combined MR ledger", () => {
    python(`
for engine in ['cmos','dr']:
 with tempfile.TemporaryDirectory() as d:
  root=pathlib.Path(d).resolve(); gds=root/'INV_w8_0.gds';gds.write_bytes(b'fixture-only');(root/'netlist.sp').write_text('.subckt INV A Y VDD VSS\\n.ends\\n')
  line='Width 8, Solution 0 (Cost = 3): M1 routable, Routing time: 1ms'
  summary=root/'summary.txt';summary.write_text('Cell name : INV\\n'+line+'\\n')
  evidence={'engine':engine,'cellName':'INV','path':'summary.txt','sha256':pv.digest(summary),'gdsSha256':pv.digest(gds),'matchedLine':line}
  (root/'manifest.json').write_text(json.dumps({'schemaVersion':'acg.native.v1','engine':engine,'cells':[{'cellName':'INV','routedCandidates':[{'routeStatus':'succeeded','gdsPath':gds.name,'routeEvidence':evidence}]}]}))
  driver=root/'fake-official.py'
  driver.write_text("import sys,json,pathlib,hashlib\\na=sys.argv;out=pathlib.Path(a[a.index('--run-dir')+1]);gds=pathlib.Path(a[a.index('--gds')+1]);assert '--verification-ledger' not in a;assert gds.parent==out;assert not gds.with_suffix('.verification.json').exists()\\n(out/'pv_summary.json').write_text(json.dumps({'drc':{'status':'PASS'},'lvs':{'status':'PASS'},'pass':True,'overall_status':'PASS','deck_hash':'sha256:deck','evidence_hash':'sha256:evidence','gds_hash':'sha256:'+hashlib.sha256(gds.read_bytes()).hexdigest()}))\\n")
  pv.dependencies=lambda _:driver;pv.topcell=lambda _:'INV'
  assert pv.run(argparse.Namespace(artifacts_root=str(root),manifest='manifest.json',netlist='netlist.sp',output='pv',engine_root='unused',timeout_seconds=1))==0
  item=json.loads((root/'pv/summary.json').read_text())['cells'][0]['candidates'][0]
  assert item['status']=='PASS' and item['combinedLedgerUnavailable'] is True
  assert item['combinedHardGatePass'] is None and item['ledgerPath'] is None and item['nativeLedgerPath'] is None
  assert item['routeEvidence']==evidence and not (root/'pv/cell-0000-candidate-0000/verification.json').exists()
`);
  });

  it("forwards worker cancellation to official runner descendants", () => {
    python(`
import subprocess, signal, time
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d); marker=root/'survived'; ready=root/'ready'
 native=root/'native.py'
 native.write_text("import subprocess,sys,time,pathlib\\nsubprocess.Popen([sys.executable,'-c',"+repr("import time,pathlib;time.sleep(.7);pathlib.Path("+repr(str(marker))+").touch()")+"])\\npathlib.Path("+repr(str(ready))+").touch()\\ntime.sleep(5)\\n")
 runner=root/'wrapper.py'
 runner.write_text("import importlib.util,signal,sys,pathlib\\nspec=importlib.util.spec_from_file_location('pv',"+repr(str(pathlib.Path(sys.argv[1]).resolve()))+");pv=importlib.util.module_from_spec(spec);spec.loader.exec_module(pv)\\nsignal.signal(signal.SIGTERM,pv.cancelled)\\npv.invoke([sys.executable,"+repr(str(native))+"],pathlib.Path("+repr(str(root/'log'))+"),5)\\n")
 child=subprocess.Popen([sys.executable,str(runner)])
 deadline=time.monotonic()+3
 while not ready.exists() and time.monotonic()<deadline: time.sleep(.01)
 assert ready.exists()
 child.terminate(); assert child.wait(timeout=3)==143
 time.sleep(.8); assert not marker.exists()
`);
  });

  it("kills descendants that ignore TERM after their leader exits", () => {
    python(`
import time
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d); marker=root/'survived'; ready=root/'ready'
 child="import signal,time,pathlib;signal.signal(signal.SIGTERM,signal.SIG_IGN);pathlib.Path("+repr(str(ready))+").touch();time.sleep(.5);pathlib.Path("+repr(str(marker))+").touch()"
 parent="import subprocess,sys,time;subprocess.Popen([sys.executable,'-c',"+repr(child)+"]);time.sleep(5)"
 code,timeout=pv.invoke([sys.executable,'-c',parent],root/'log',.2)
 assert ready.exists() and timeout and code==124
 time.sleep(.6); assert not marker.exists()
`);
  });

  it("times out the isolated official runner process group", () => {
    python(`
with tempfile.TemporaryDirectory() as d:
 root=pathlib.Path(d); marker=root/'survived'
 code="import subprocess,sys,time; subprocess.Popen([sys.executable,'-c',\\"import time,pathlib;time.sleep(.35);pathlib.Path("+repr(str(marker))+").touch()\\"]);time.sleep(5)"
 result=pv.invoke([sys.executable,'-c',code],root/'log',.1)
 import time;time.sleep(.5)
 assert result==(124,True) and not marker.exists()
`);
  });
});
