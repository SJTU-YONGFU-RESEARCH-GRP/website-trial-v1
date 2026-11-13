#!/usr/bin/env python3
"""Trusted native LibCharX PPA characterization; no uploaded executable scripts."""
from __future__ import annotations
import argparse
from contextlib import redirect_stdout
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tempfile

VERSION = "ppa-libcharx-native/1.0.0"
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def need(ok, message):
    if not ok: raise ValueError(message)
def finite(v): return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def dump(p,v):
    p=Path(p); p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(v,indent=2,allow_nan=False)+"\n")
def native():
    root=Path(os.environ["LIBCHARX_ROOT"]).resolve()
    need((root/"libcharx/characterizer.py").is_file(),"Invalid LIBCHARX_ROOT")
    sys.path.insert(0,str(root))
    from libcharx.config import LibCharXConfig
    from libcharx.characterizer import Characterizer
    ng=Path(os.environ["LIBCHARX_NGSPICE"]).absolute()
    need(ng.is_file() and os.access(ng,os.X_OK),"Native ngspice unavailable")
    return root,str(ng),LibCharXConfig,Characterizer
def source_hashes(root):
    return {str(p.relative_to(root)):sha(p) for p in sorted((root/"libcharx").rglob("*.py"))}
def inside(root,rel):
    need(isinstance(rel,str) and not Path(rel).is_absolute() and "\x00" not in rel,"Unsafe input path")
    p=(root/rel).resolve()
    need(p.is_relative_to(root.resolve()) and p.is_file() and not (root/rel).is_symlink(),"Input escapes workspace or is not regular")
    return p
def statements(text):
    rows=[]
    for line in text.splitlines():
        line=line.strip()
        if not line or line.startswith("*"): continue
        if line.startswith("+"):
            need(bool(rows),"Orphan SPICE continuation"); rows[-1]+=" "+line[1:]
        else: rows.append(line)
    return rows
def without_inline_comment(line):
    # Native ngspice semicolon comments are data, never shell command separators.
    quote=None
    for i,ch in enumerate(line):
        if ch in ("'",'"'):
            if quote==ch: quote=None
            elif quote is None: quote=ch
        elif ch==";" and quote is None: return line[:i].rstrip()
    return line
def inspect_spice(path,input_root,models,cell=False,p=None):
    text=path.read_text(); need(len(text)<=32*1024*1024 and "\x00" not in text,"Invalid SPICE size/content")
    for line in statements(text):
        line=without_inline_comment(line)
        if not line: continue
        tokens=shlex.split(line,comments=False)
        need(tokens and not any(x in line for x in ("`",";","$(")),"Unsafe SPICE syntax")
        cmd=tokens[0].lower()
        if cmd.startswith("."):
            if cmd in (".include",".inc") or cmd==".lib" and len(tokens)>=3:
                need(not cell and len(tokens)>=2 and not Path(tokens[1]).is_absolute(),"Cell includes or absolute model includes unsupported")
                target=(path.parent/tokens[1]).resolve()
                need(target in models and target.is_relative_to(input_root.resolve()),"Model include absent from frozen closure")
            elif cell:
                need(cmd in (".subckt",".ends",".param",".option",".options"),"Unsupported cell directive "+cmd)
                if cmd in (".option",".options"): need(all(re.fullmatch("scale=1u",x,re.I) for x in tokens[1:]),"Unsupported cell option")
            else:
                need(cmd in (".lib",".endl",".subckt",".ends",".model",".param",".func",".option",".options",".if",".elseif",".else",".endif",".protect",".unprotect",".global",".end"),"Executable/unsupported model directive "+cmd)
        else:
            need(cmd[0] in "xmrc" if cell else cmd[0] in "xmrcbdefghlqvsi","Unsupported SPICE device/command")
            need(not re.search(r"\b(?:file|pwlfile)\s*=",line,re.I),"External device files unsupported")
            if cell and p and p["vssVolts"]!=0:
                end=next((i for i,x in enumerate(tokens) if "=" in x),len(tokens))
                nodes=tokens[1:5] if cmd[0]=="m" else tokens[1:3] if cmd[0] in "rc" else tokens[1:end-1]
                need("0" not in nodes,"Nonzero VSS requires all cell references to shift; literal ground 0 unsupported")
    return text
def validate_parameters(p):
    for k in ("topModule","designName","outputPin"):
        need(isinstance(p.get(k),str) and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*",p[k]),"Invalid "+k)
    need(p.get("processProfile") in ("gf180-03v3","gf180-06v0","sky130-hvt"),"Unsupported device profile")
    need(p.get("corner") in ("tt","ff","ss","fs","sf"),"Unsupported corner")
    expected=p["corner"] if p["processProfile"]=="sky130-hvt" or p["corner"]!="tt" else "typical"
    need(p.get("modelSection")==expected,"Actual model section differs from selected corner")
    for k in ("vddVolts","vssVolts","temperatureC"): need(finite(p.get(k)),"Nonfinite PVT")
    voltage=p["vddVolts"]-p["vssVolts"]
    lo,hi={"gf180-03v3":(2.7,3.6),"gf180-06v0":(1.62,5.5),"sky130-hvt":(1.4,1.95)}[p["processProfile"]]
    need(lo<=voltage<=hi and -55<=p["temperatureC"]<=150 and max(abs(p["vddVolts"]),abs(p["vssVolts"]))<=20,"PVT outside profile")
    need(p.get("electricalMode") in ("schematic","extracted"),"Unknown electrical mode")
    for k in ("inputs","powerPins","groundPins"):
        need(isinstance(p.get(k),list) and p[k] and all(isinstance(x,str) and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*",x) for x in p[k]),"Invalid "+k)
    names=p["inputs"]+[p["outputPin"]]+p["powerPins"]+p["groundPins"]
    need(len(set(names))==len(names),"Pins overlap")
    ins=p["inputs"]; fn=re.sub(r"\s","",p.get("function",""))
    inv=len(ins)==1 and fn=="!"+ins[0]
    nand=len(ins)==2 and fn=="!("+"&".join(ins)+")"
    nor=len(ins)==2 and fn=="!("+"|".join(ins)+")"
    need(inv or nand or nor,"Only actual INV/NAND2/NOR2 functions supported")
    need(isinstance(p.get("arcs"),list) and len(p["arcs"])==len(ins) and {a.get("input") for a in p["arcs"]}==set(ins),"Exactly one arc per input required")
    for a in p["arcs"]: need(a.get("fixedInputs")=={x:(1 if nand else 0) for x in ins if x!=a["input"]},"Arc not sensitized")
    for k,maximum in (("slewSeconds",1e-8),("loadFarads",1e-12)):
        v=p.get(k); need(isinstance(v,list) and 1<=len(v)<=5 and all(finite(x) and 0<x<=maximum for x in v) and all(x<y for x,y in zip(v,v[1:])),"Invalid "+k)
    need(p.get("spiceScale") in (None,"1u"),"Unsupported scale")
def config(p,netlist,model,ng,work,out,area):
    voltage=p["vddVolts"]-p["vssVolts"]
    return {"simulation":{"simulator":"ngspice","simulator_path":ng,"includes":[str(model)],"temperature":p["temperatureC"],"supply_voltage":voltage,"time_step":min(p["slewSeconds"])/100,"total_time":max(5e-9,max(p["slewSeconds"])*20),"input_transition":p["slewSeconds"][0],"output_load":p["loadFarads"][0],"timeout_seconds":90,"retry_count":0,"working_directory":str(work)},
      "pvt_corners":[{"name":p["corner"]+"_"+str(p["temperatureC"])+"C_"+str(voltage)+"V","process":p["corner"],"voltage":voltage,"temperature":p["temperatureC"]}],
      "cell_discovery":{"enabled":False},"cells":[{"name":p["topModule"],"netlist_path":str(netlist),"area":str(area),"pins":[*({"name":x,"direction":"input"} for x in p["inputs"]),{"name":p["outputPin"],"direction":"output","function":p["function"]},*({"name":x,"direction":"power"} for x in p["powerPins"]),*({"name":x,"direction":"ground"} for x in p["groundPins"])],"timing_sensitization":{a["input"]+"->"+p["outputPin"]:a["fixedInputs"] for a in p["arcs"]}}],
      "characterization":{"spice_backed":True,"models":["nldm"],"analysis":"timing","num_threads":1,"nldm":{"enabled":True,"interpolation":"linear","table_template_name":"measured_nldm"},"ccs":{"enabled":False},"ecsm":{"enabled":False},"sweep":{"input_transitions":p["slewSeconds"],"output_loads":p["loadFarads"]}},
      "output":{"directory":str(out),"liberty_file":"characterized.lib","include_power":False,"include_timing":True,"include_capacitance":True}}
def check(results,p):
    need(len(results)==1 and results[0]["cell_name"]==p["topModule"],"Wrong native cell")
    result=results[0]; q=result.get("quality",{}); rt=q.get("runtime_breakdown",{})
    calls=int(rt.get("simulation_calls",0))
    need(calls>0 and rt.get("simulation_successes",0)==calls and rt.get("simulation_failures",0)==0 and rt.get("arc_skipped",0)==0 and not q.get("errors"),"Native simulations failed/incomplete")
    timing=result.get("timing",[])
    need(len(timing)==len(p["inputs"]) and {a["related_pin"] for a in timing}==set(p["inputs"]),"Missing native arcs")
    count=0; delays=[]
    for a in timing:
        need(a.get("pin")==p["outputPin"] and a.get("timing_sense")=="negative_unate","Wrong native arc semantics")
        for key in ("cell_rise","cell_fall","rise_transition","fall_transition"):
            t=a.get(key,{}); need(t.get("index_1")==p["slewSeconds"] and t.get("index_2")==p["loadFarads"],"Wrong native table indices")
            rows=t.get("values",[]); need(len(rows)==len(p["slewSeconds"]),"Incomplete NLDM")
            for row in rows:
                need(len(row)==len(p["loadFarads"]) and all(finite(x) and x>0 for x in row),"Nonpositive/nonfinite native NLDM")
                count+=len(row)
                if key in ("cell_rise","cell_fall"): delays.extend(row)
    need(q.get("timing_coverage")==1 and q.get("nonzero_table_coverage")==1,"Incomplete timing coverage")
    return {"spiceBacked":True,"ngspiceInvocations":calls,"computedTimingValues":count,"timingCoverage":1,"supplyPowerComputedByLibCharX":False},max(delays)*1e12
def geometry(path,top,boundary=None):
    import gdstk
    lib=gdstk.read_gds(str(path)); cells={c.name:c for c in lib.cells}
    if top: need(top in cells,"Requested layout cell missing"); cell=cells[top]
    else:
        tops=lib.top_level(); need(len(tops)==1,"Specify layoutTopModule for multi-top GDS"); cell=tops[0]
    box=cell.bounding_box(); need(box is not None,"Empty GDS")
    area=float((box[1][0]-box[0][0])*(box[1][1]-box[0][1])); need(finite(area) and area>0,"Invalid GDS area")
    result={"layoutTopModule":cell.name,"areaUm2":area,"gdsSha256":sha(path),"method":"Actual selected GDS cell bounding box including hierarchy","bboxUm":[list(x) for x in box]}
    if boundary is not None:
        need(isinstance(boundary,dict) and set(boundary)=={"layer","datatype"} and all(isinstance(v,int) and not isinstance(v,bool) and 0<=v<=65535 for v in boundary.values()),"Invalid GDS boundary layer/datatype")
        polygons=cell.get_polygons(layer=boundary["layer"],datatype=boundary["datatype"])
        need(bool(polygons),"Selected GDS cell has no requested boundary polygons")
        merged=gdstk.boolean(polygons,[],"or",precision=1e-6)
        boundary_area=sum(p.area() for p in merged)
        need(finite(boundary_area) and boundary_area>0,"Invalid GDS boundary union area")
        result["boundary"]={**boundary,"areaUm2":boundary_area,"method":"Actual selected GDS cell boundary polygon union including hierarchy"}
    return result
def run(request):
    request=request.resolve(); workspace=request.parent.parent; input_root=workspace/"input"
    r=json.loads(request.read_text()); need(r.get("schemaVersion")=="ppa.libcharx-request.v1","Wrong request schema")
    need(sha(__file__)==r["wrapperSha256"],"Trusted wrapper changed after preparation")
    p=r["parameters"]; validate_parameters(p)
    files={}
    for f in r["files"]:
        path=inside(input_root,f["relativePath"])
        need(path.stat().st_size==f["sizeBytes"] and sha(path)==f["sha256"],"Frozen input changed: "+f["relativePath"])
        files[f["relativePath"]]=path
    selected=r["inputs"]; netlist=files[selected["netlist"]]; gds=files[selected["gds"]]
    physical=json.loads(files[selected["physical"]].read_text())
    need(physical.get("gdsSha256",physical.get("selectedGdsSha256"))==sha(gds),"Evidence does not bind actual GDS")
    need(physical.get("netlistSha256")==sha(netlist),"Evidence does not bind actual electrical netlist")
    for k in ("processProfile","corner","modelSection","vddVolts","vssVolts","temperatureC","electricalMode","topModule"):
        need(physical.get(k)==p[k],"Evidence differs from selected "+k)
    if physical.get("slewProvenance") is not None:
        slew=physical["slewProvenance"]
        need(isinstance(slew,dict) and slew.get("lowerThresholdPct")==20 and slew.get("upperThresholdPct")==80 and slew.get("conversionFactor")==0.6,"Wrong input slew threshold provenance")
        full=slew.get("dtcoFullRampSeconds"); transition=slew.get("libertyTransitionSeconds")
        need(finite(full) and full>0 and finite(transition) and math.isclose(transition,full*0.6,rel_tol=1e-12) and len(p["slewSeconds"])==1 and math.isclose(p["slewSeconds"][0],transition,rel_tol=1e-12),"DTCO full-ramp and Liberty input slew differ")
    models={files[x] for x in selected["models"]}; entry=files[p["modelEntry"]]; need(entry in models,"Model entry not frozen")
    source=inspect_spice(netlist,input_root,models,True,p)
    headers=[shlex.split(x) for x in statements(source) if x.lower().startswith(".subckt ")]
    header=next((x for x in headers if x[1]==p["topModule"]),None); need(header,"Exact SPICE subcircuit absent")
    ports=[x for x in header[2:] if "=" not in x]
    need(set(ports)==set(p["inputs"]+[p["outputPin"]]+p["powerPins"]+p["groundPins"]),"Every source port needs explicit rail/body/input/output mapping")
    for model in models: inspect_spice(model,input_root,models)
    root,ng,Config,Characterizer=native(); sources=source_hashes(root)
    need(r.get("nativeExecutables") and all(sha(path)==expected for path,expected in r["nativeExecutables"].items()),"Configured native executable changed or was not frozen")
    need(r.get("nativeSources")==sources,"Native LibCharX source changed or was not frozen")
    need(all(os.environ.get(k)==v for k,v in r.get("nativeEnvironment",{}).items()) and r.get("nativeEnvironment"),"Native environment changed or was not frozen")
    gdspy=os.environ["LIBCHARX_GDS_PYTHON"]
    command=[gdspy,str(Path(__file__).resolve()),"--gds-area",str(gds)]
    top=p.get("layoutTopModule",physical.get("layoutTopModule"))
    if top: command+=["--layout-top",top]
    if physical.get("areaMethod")=="gds-boundary":
        boundary=physical.get("boundary")
        need(isinstance(boundary,dict) and set(boundary)=={"layer","datatype"} and all(isinstance(v,int) and not isinstance(v,bool) and 0<=v<=65535 for v in boundary.values()),"Invalid GDS boundary layer/datatype")
        command += ["--boundary-layer",str(boundary["layer"]),"--boundary-datatype",str(boundary["datatype"])]
    geom=json.loads(subprocess.check_output(command,text=True,timeout=30)); area=geom["areaUm2"]
    area_evidence={"method":"gds-bbox","areaUm2":area,"sourceSha256":sha(gds)}
    if physical.get("areaMethod")=="gds-boundary":
        area=geom["boundary"]["areaUm2"]
        area_evidence={"method":"gds-boundary","areaUm2":area,"boundary":physical["boundary"],"sourceSha256":sha(gds),"geometryBBoxAreaUm2":geom["areaUm2"]}
    elif physical.get("areaMethod")=="lef-size":
        need(selected.get("lef") in files,"LEF placement footprint requires actual attached LEF")
        lefpath=files[selected["lef"]]; lef=lefpath.read_text(); cell=geom["layoutTopModule"]
        macro=re.search(r"\bMACRO\s+"+re.escape(cell)+r"\s+(.*?)\bEND\s+"+re.escape(cell)+r"(?:\s|$)",lef,re.S)
        need(macro,"Exact selected GDS cell MACRO absent from attached LEF")
        size=re.search(r"\bSIZE\s+([0-9.eE+-]+)\s+BY\s+([0-9.eE+-]+)\s*;",macro[1])
        need(size,"Selected LEF cell lacks SIZE"); area=float(size[1])*float(size[2]); need(finite(area) and area>0,"Invalid LEF footprint")
        area_evidence={"method":"lef-size","areaUm2":area,"cell":cell,"sourceSha256":sha(lefpath),"geometryBBoxAreaUm2":geom["areaUm2"]}
    else: need(physical.get("areaMethod","gds-bbox")=="gds-bbox","Unknown area evidence method")
    need(finite(physical.get("areaUm2")) and abs(physical["areaUm2"]-area)<=max(1e-6,area*1e-6),"Evidence area differs from actual GDS")
    work=workspace/"work/libcharx"; out=workspace/"output/libcharx"; work.mkdir(parents=True,exist_ok=True); out.mkdir(parents=True,exist_ok=True)
    wrapper=work/"model-wrapper.spice"
    wrapper.write_text("* Frozen actual model corner\n.param fnoicor=0 sw_stat_mismatch=0\n"+(".option scale=1u\n" if p.get("spiceScale") else "")+'.lib "'+str(entry)+'" '+p["modelSection"]+"\n")
    cfg=config(p,netlist,wrapper,ng,work/"native",out,area); dump(work/"config.json",cfg)
    with redirect_stdout(sys.stderr): results=Characterizer(Config.model_validate(cfg)).run()
    quality,delay=check(results,p)
    liberty=out/"characterized.lib"; text=liberty.read_text()
    for kind,value in (("input_threshold_pct_rise",50),("input_threshold_pct_fall",50),("output_threshold_pct_rise",50),("output_threshold_pct_fall",50),("slew_lower_threshold_pct_rise",20),("slew_lower_threshold_pct_fall",20),("slew_upper_threshold_pct_rise",80),("slew_upper_threshold_pct_fall",80)):
        match=re.search(r"\b"+kind+r"\s*:\s*([0-9.]+)\s*;",text)
        need(match and float(match[1])==value,"Native Liberty threshold differs from declared slew semantics")
    need("internal_power" not in text and not re.search(r"\bleakage_power\s*\(",text),"Unsupported power in Liberty")
    dump(out/"results.json",results)
    qualifiers=["Fresh ngspice NLDM characterization; not an RTL-to-GDS run or foundry signoff.","LibCharX rise_power/fall_power are load-capacitance proxies, not measured supply power; omitted from Liberty.","Physical area method: "+area_evidence["method"]+"; electrical layout influence is limited to the supplied schematic/extracted netlist.","Absolute rails/bodies/inputs/loads use common ground translation; external body bias unsupported."]
    power=None
    if selected.get("power"):
        powerpath=files[selected["power"]]; m=json.loads(powerpath.read_text())
        need(m.get("schemaVersion")=="dtco.measurements.v1" and m.get("selectedGdsSha256",m.get("gdsSha256"))==sha(gds) and m.get("netlistSha256")==sha(netlist),"Power evidence circuit/layout mismatch")
        for k in ("vddVolts","vssVolts","temperatureC","corner","electricalMode"): need(m.get(k)==p[k],"Power evidence PVT/mode mismatch")
        wavefiles=[files[x] for x in selected.get("waveforms",[])]; actual_wave_hashes={sha(x) for x in wavefiles}
        expected_wave_hashes={a["waveformSha256"] for a in m.get("arcs",[]) if a.get("waveformSha256")}
        if not expected_wave_hashes and m.get("waveformSha256"): expected_wave_hashes={m["waveformSha256"]}
        need(expected_wave_hashes and expected_wave_hashes==actual_wave_hashes,"Power waveforms missing or differ from actual DTCO metric hashes")
        need(finite(m.get("averagePowerW")) and m["averagePowerW"]>0,"Missing measured DTCO power")
        power={"averagePowerW":m["averagePowerW"],"origin":"DTCO ngspice supply-current waveform integration","sourcePath":"input/"+selected["power"],"sourceSha256":sha(powerpath),"measurement":m}
    manifest={"schemaVersion":"ppa.libcharx-manifest.v1","parameters":p,"effectiveVoltageV":p["vddVolts"]-p["vssVolts"],"geometry":geom,"areaEvidence":area_evidence,"slewProvenance":physical.get("slewProvenance"),"quality":quality,"native":{"root":str(root),"sourceHashes":sources,"ngspice":ng,"ngspiceSha256":sha(ng),"gdsPython":gdspy,"gdsPythonSha256":sha(gdspy)},"inputs":{f["relativePath"]:f["sha256"] for f in r["files"]},"wrapperSha256":sha(__file__),"requestSha256":sha(request),"configSha256":sha(work/"config.json"),"libertySha256":sha(liberty),"resultsSha256":sha(out/"results.json"),"powerEvidence":power,"qualifiers":qualifiers}
    dump(out/"manifest.json",manifest)
    normalized={"design":p["designName"],"cell":p["topModule"],"flow":"libcharx","electricalMode":p["electricalMode"],"pvt":{k:p[k] for k in ("corner","modelSection","temperatureC","vddVolts","vssVolts")},"areaUm2":area,"delayPs":delay,"delayMethod":"Maximum cell_rise/cell_fall across selected slew/load points and sensitized arcs","quality":quality,"power":power,"powerProxy":{"origin":"LibCharX load-capacitance estimate","measuredSupplyPower":False,"usedForObjective":False,"includedInLiberty":False},"libertyPath":"output/libcharx/characterized.lib","qualifiers":qualifiers}
    result={"title":p["designName"]+" · LibCharX","summary":normalized,"data":{"schemaVersion":"ppa.result-data.v1","flow":"libcharx","parserFlow":"libcharx","normalized":normalized,"evidence":{"manifestPath":"output/libcharx/manifest.json","manifestSha256":sha(out/"manifest.json"),"libertySha256":sha(liberty),"resultsSha256":sha(out/"results.json"),"gdsSha256":sha(gds),"netlistSha256":sha(netlist)}},"artifactRoles":["normalized-result","native-run","characterized-liberty"],"parserId":"ppa-libcharx-native","parserVersion":"1.0.0"}
    dump(workspace/"output/ppa-result.json",result)
    print(json.dumps({"schemaVersion":"ppa.libcharx-completed.v1","passed":True,**quality,"libertySha256":sha(liberty)}))
def self_test():
    root,ng,Config,Characterizer=native()
    subprocess.run([os.environ["LIBCHARX_GDS_PYTHON"],"-c","import gdstk; assert gdstk.__version__"],check=True,timeout=15)
    with tempfile.TemporaryDirectory(prefix="ppa-libcharx-") as tmp:
        d=Path(tmp); netlist=d/"cell.sp"; model=d/"models.sp"
        model.write_text(".model ntest NMOS level=1 vto=0.5 kp=120u lambda=0.02 cgso=1e-10 cgdo=1e-10\n.model ptest PMOS level=1 vto=-0.5 kp=50u lambda=0.02 cgso=1e-10 cgdo=1e-10\n")
        netlist.write_text(".subckt native_selftest A Y VDD VSS\nMN Y A VSS VSS ntest W=1u L=0.3u\nMP Y A VDD VDD ptest W=2u L=0.3u\n.ends native_selftest\n")
        p={"topModule":"native_selftest","inputs":["A"],"outputPin":"Y","powerPins":["VDD"],"groundPins":["VSS"],"function":"!A","arcs":[{"input":"A","fixedInputs":{}}],"vddVolts":1.8,"vssVolts":0,"temperatureC":25,"corner":"tt","slewSeconds":[1e-10],"loadFarads":[1e-14]}
        cfg=config(p,netlist,model,ng,d/"work",d/"out",1)
        with redirect_stdout(sys.stderr): results=Characterizer(Config.model_validate(cfg)).run()
        quality,_=check(results,p)
        print(json.dumps({"schemaVersion":"ppa.libcharx-self-test.v1","passed":True,**quality,"wrapperSha256":sha(__file__),"nativeSourceHash":hashlib.sha256(json.dumps(source_hashes(root),sort_keys=True).encode()).hexdigest()}))
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--version",action="store_true"); parser.add_argument("--self-test",action="store_true"); parser.add_argument("--request",type=Path); parser.add_argument("--gds-area",type=Path); parser.add_argument("--layout-top")
    parser.add_argument("--boundary-layer",type=int); parser.add_argument("--boundary-datatype",type=int)
    a=parser.parse_args()
    need((a.boundary_layer is None)==(a.boundary_datatype is None),"Both GDS boundary layer and datatype required")
    if a.gds_area:
        boundary=None if a.boundary_layer is None else {"layer":a.boundary_layer,"datatype":a.boundary_datatype}
        print(json.dumps(geometry(a.gds_area,a.layout_top,boundary))); return
    if a.version:
        root,ng,_,_=native(); print(VERSION+" native-source:"+hashlib.sha256(json.dumps(source_hashes(root),sort_keys=True).encode()).hexdigest()+" ngspice:"+sha(ng)); return
    if a.self_test: self_test(); return
    need(a.request is not None,"--request required"); run(a.request)
if __name__=="__main__":
    try: main()
    except Exception as error:
        print("LibCharX characterization failed: "+str(error),file=sys.stderr); raise SystemExit(1)
