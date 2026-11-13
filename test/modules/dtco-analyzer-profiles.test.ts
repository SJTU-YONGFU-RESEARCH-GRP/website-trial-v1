import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { describe, expect, it } from "vitest";

const execFileAsync=promisify(execFile);
// Set this to the configured DTCO analysis interpreter on other installations.
const python=process.env.DTCO_TEST_PYTHON ?? "/home/duhaochen/.local/share/autocellgen/venv/bin/python";
const analyzer=path.resolve("scripts/dtco/analyze.py");
const fixture=String.raw`
import importlib.util,json,math,tempfile,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location("analyzer",sys.argv[1])
a=importlib.util.module_from_spec(spec); spec.loader.exec_module(a)
T=1e-9
VDD,VSS=2.5,.5
def ramp(phase,start):
    return max(0,min(1,(phase-start)/.02))
def waveform(delay=0,current=-.002,noninverting=False,active=0):
    rows=[]
    for i in range(401):
        t=i/100
        phase=round(t%1,10)
        vin=ramp(phase,.1)-ramp(phase,.6)
        out=(ramp(phase,.2+delay)-ramp(phase,.8+delay)) if noninverting else (1-ramp(phase,.2+delay)+ramp(phase,.8+delay))
        pins=[VDD,VDD];pins[active]=VSS+2*vin
        rows.append([t*T,*pins,VSS+2*out,current])
    return rows
def write_rows(p,rows,header):
    p.write_text(header+"\n"+"\n".join(" ".join(str(v) for v in row) for row in rows)+"\n")
def fixed_fixture(root):
    output=root/"output/dtco";output.mkdir(parents=True)
    lib=a.gdstk.Library()
    cell=lib.new_cell("NAND2");cell.add(a.gdstk.rectangle((0,0),(90,40)))
    other=lib.new_cell("OTHER");other.add(a.gdstk.rectangle((0,0),(100,100)))
    lib.write_gds(str(output/"library.gds"))
    lef=root/"cell.lef";lef.write_text("MACRO OTHER\n SIZE 99 BY 99 ;\nEND OTHER\nMACRO NAND2\n SIZE 2.4 BY 1.8 ;\nEND NAND2\n")
    truth=[{"inputs":{"A":x,"B":y},"output":int(not(x and y))} for x,y in [(0,0),(0,1),(1,0),(1,1)]]
    rows=[]
    for i in range(401):
        t=i/100;row=truth[min(int(t),3)]
        rows.append([t*T,VSS+2*row["inputs"]["A"],VSS+2*row["inputs"]["B"],VSS+2*row["output"],-.002])
    write_rows(output/"truth.txt",rows,"time v(A) v(B) v(Y) i(VDD)")
    (output/"truth.log").write_text("ok")
    arcs=[]
    for idx,pin in enumerate(["A","B"]):
        name="arc"+str(idx)
        write_rows(output/(name+".txt"),waveform(idx*.05,-.002*(idx+1),active=idx),"time v(A) v(B) v(Y) i(VDD)")
        (output/(name+".log")).write_text("ok")
        (output/(name+".sp")).write_text("* exact arc deck")
        arcs.append({"id":name,"input":pin,"output":"Y","transition":"inverting","fixedInputs":{("B" if idx==0 else "A"):1},"waveformPath":"output/dtco/"+name+".txt","logPath":"output/dtco/"+name+".log","deckPath":"output/dtco/"+name+".sp"})
    dc=[[VSS+2*i/100,VSS+2*i/100,VDD-2*i/100,-.001] for i in range(101)]
    write_rows(output/"model-dc.txt",dc,"v-sweep v(A) v(Y) i(VDD)")
    measurement={"voltageV":VDD,"groundVoltageV":VSS,"periodNs":1,"metricScope":"sensitized schematic circuit",
      "inputs":["A","B"],"output":"Y","arcs":arcs,"truthTable":truth,"truthWaveformPath":"output/dtco/truth.txt","truthLogPath":"output/dtco/truth.log",
      "fixedLayout":{"gdsPath":"output/dtco/library.gds","gdsTop":"NAND2","areaUm2":4.32,"areaSource":"lef","lefPath":"cell.lef","lefSha256":a.digest(lef)}}
    (root/"measurement.json").write_text(json.dumps(measurement))
    return measurement
def run_main(root,dc=False):
    sys.argv=[sys.argv[1],"--workspace",str(root),"--measurement","measurement.json"]+(["--dc-only"] if dc else [])
    a.main()
`;
async function run(code:string){
 const {stdout}=await execFileAsync(python,["-c",fixture+"\n"+code,analyzer],{maxBuffer:4*1024*1024});
 return JSON.parse(stdout.trim().split("\n").at(-1)!);
}

describe("DTCO profile numeric analysis",()=>{
 it("uses absolute midpoint, differential supply energy and worst rise/fall for an inverting arc",async()=>{
  const result=await run('print(json.dumps(a.electrical(waveform(),VDD,T,VSS,1,3,4,"inverting",True)))');
  expect(result.delayFallPs).toBeCloseTo(100,8);expect(result.delayRisePs).toBeCloseTo(200,8);
  expect(result.delayPs).toBeCloseTo(200,8);expect(result.averagePowerW).toBeCloseTo(.004,12);
  expect(result.integratedEnergyJ).toBeCloseTo(8e-12,20);expect(result.energyPerCycleJ).toBeCloseTo(4e-12,20);
  expect(result.integrationWindowS).toEqual([2e-9,4e-9]);
 });
 it("pairs noninverting crossings and preserves the legacy inverter arithmetic mean",async()=>{
  const result=await run('print(json.dumps({"buffer":a.electrical(waveform(noninverting=True),VDD,T,VSS,1,3,4,"noninverting",True),"legacy":a.electrical([[r[0],(r[1]-VSS)/2,(r[3]-VSS)/2,r[4]] for r in waveform()],1,T)}))');
  expect(result.buffer.delayRisePs).toBeCloseTo(100,8);expect(result.buffer.delayFallPs).toBeCloseTo(200,8);
  expect(result.legacy.delayPs).toBeCloseTo(150,8);expect(result.legacy.averagePowerW).toBeCloseTo(.002,12);
 });
 it("reports true worst path, average arc power, selected LEF area and validated truth evidence through the CLI",async()=>{
  const result=await run('with tempfile.TemporaryDirectory() as tmp:\n root=Path(tmp);fixed_fixture(root);run_main(root,True);run_main(root)');
  expect(result.schemaVersion).toBe("dtco.measurements.v1");expect(result.delayPs).toBeCloseTo(250,8);
  expect(result.averagePowerW).toBeCloseTo(.006,12);expect(result.energyPerCycleJ).toBeCloseTo(6e-12,20);
  expect(result.areaUm2).toBe(4.32);expect(result.selectedGdsPath).toBe("output/dtco/library.gds");
  expect(result.arcs).toHaveLength(2);expect(result.arcs[0].waveformSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(result.arcs[1].logSha256).toMatch(/^[a-f0-9]{64}$/);expect(result.arcs[1].deckSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(result.truthTableValidation.rows.map((r:{actualOutput:number})=>r.actualOutput)).toEqual([1,1,1,0]);
  expect(result.truthTableValidation.rows.every((r:{passed:boolean})=>r.passed)).toBe(true);
  expect(result.modelAnalysis.switchingVoltageV).toBeCloseTo(1.5,12);expect(result.nativeGdsPath).toBeNull();
 });
 it("reports unavailable physical area for a schematic-only profile without reading native layout",async()=>{
  const result=await run('with tempfile.TemporaryDirectory() as tmp:\n root=Path(tmp);m=fixed_fixture(root);m.pop("fixedLayout");m["schematicOnly"]=True;(root/"measurement.json").write_text(json.dumps(m));run_main(root,True);run_main(root)');
  expect(result.averagePowerW).toBeCloseTo(.006,12);expect(result.delayPs).toBeCloseTo(250,8);
  expect(result.areaUm2).toBeNull();expect(result.selectedGdsPath).toBeNull();expect(result.selectedGdsSha256).toBeNull();
  expect(result.nativeGdsPath).toBeNull();expect(result.nativeGdsSha256).toBeNull();expect(result.areaStatus).toBe("unavailable");
  expect(result.methodology.area).toBe("No physical implementation exists for this schematic-only profile.");
 });
 it("omits the noninverting DC switching point and measures an inverting transfer curve across nonzero VSS",async()=>{
  const result=await run('rows=[[VSS+2*i/100,VSS+2*i/100,VSS+2*i/100,-.001] for i in range(101)]\nprint(json.dumps(a.dc_metrics(rows,VDD,VSS,"noninverting")))');
  expect(result.switchingVoltageStatus).toBe("not_applicable");expect(result).not.toHaveProperty("switchingVoltageV");
  expect(result.scope).toContain("not MOS transistor threshold");
 });
 it("rejects incorrect truth rows, intermediate logic levels, unsafe evidence and ngspice errors",async()=>{
  const result=await run(String.raw`
checks={}
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);m=fixed_fixture(root)
 for name,action in [
  ("wrongTruth",lambda:a.validate_truth([[0,.5,.5,.5,0],[4*T,.5,.5,.5,0]],m["truthTable"],["A","B"],VDD,VSS,T)),
  ("intermediate",lambda:a.validate_truth([[0,.5,.5,1.5,0],[4*T,.5,.5,1.5,0]],m["truthTable"],["A","B"],VDD,VSS,T)),
  ("unsafe",lambda:a.safe(root,"../cell.lef"))]:
  try: action();checks[name]=False
  except ValueError: checks[name]=True
 (root/"bad.log").write_text("Error: simulation aborted")
 try:a.check_log(root,"bad.log");checks["log"]=False
 except ValueError:checks["log"]=True
print(json.dumps(checks))
`);
  expect(result).toEqual({wrongTruth:true,intermediate:true,unsafe:true,log:true});
 });
 it("keeps legacy native selection and arithmetic mean while rejecting nonzero full-Magic DRC",async()=>{
  const result=await run(String.raw`
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);m=fixed_fixture(root);m.pop("arcs");m.pop("fixedLayout")
 lib=a.gdstk.Library();cell=lib.new_cell("INV")
 cell.add(a.gdstk.rectangle((0,0),(2,3),layer=63))
 gds=root/"output/native.gds";lib.write_gds(str(gds))
 (root/"output/acg-native.json").write_text(json.dumps({"cells":[{"routedCandidates":[{"routeStatus":"succeeded","gdsPath":"output/native.gds","gdsSha256":a.digest(gds)}]}]}))
 write_rows(root/"output/dtco/waveforms.txt",[[r[0],r[1],r[3],r[4]] for r in waveform()],"time v(A) v(Y) i(VDD)")
 (root/"output/dtco/ngspice.log").write_text("ok")
 (root/"measurement.json").write_text(json.dumps(m));run_main(root,True);run_main(root)
 legacy=json.loads((root/"output/dtco/metrics.json").read_text())
 physical=root/"output/dtco/physical";physical.mkdir()
 (physical/"validation.json").write_text(json.dumps({"status":"validated","drcCount":1,"drcStyle":"drc(full)","sourceGeometryMatched":True,"finalGdsRoundtrip":True,"devices":[{},{}],"capacitors":[{}]}))
 m["electricalMode"]="extracted";(root/"measurement.json").write_text(json.dumps(m))
 rejected=False
 try:run_main(root)
 except ValueError as error:rejected="extraction evidence" in str(error)
 print(json.dumps({"legacy":legacy,"drcRejected":rejected}))
`);
  expect(result.legacy.areaUm2).toBe(6);expect(result.legacy.delayPs).toBeCloseTo(150,8);
  expect(result.legacy.nativeGdsPath).toBe("output/native.gds");expect(result.drcRejected).toBe(true);
 });
 it("rejects changed LEF hashes, mismatched selected areas and missing GDS cells",async()=>{
  const result=await run(String.raw`
checks=[]
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);m=fixed_fixture(root)
 for change in [{"areaUm2":9801},{"lefSha256":"0"*64},{"gdsTop":"ABSENT"}]:
  try:a.fixed_layout(root,{**m["fixedLayout"],**change});checks.append(False)
  except ValueError:checks.append(True)
print(json.dumps(checks))
`);
  expect(result).toEqual([true,true,true]);
 });
});
