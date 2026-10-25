#!/usr/bin/env python3
"""Strict DTCO waveform + generated-layout area measurements. No PEX claims."""
from __future__ import annotations
import argparse, hashlib, json, math, re
from pathlib import Path
import gdstk

VERSION = "dtco.analysis.v1"
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def finite_positive(value, name):
    if not math.isfinite(value) or value <= 0:
        raise ValueError(name + " must be finite and positive")
    return value
def crossings(rows, column, threshold, rising):
    result = []
    for a, b in zip(rows, rows[1:]):
        if (a[column] < threshold <= b[column]) if rising else (a[column] > threshold >= b[column]):
            result.append(a[0] + (threshold-a[column])*(b[0]-a[0])/(b[column]-a[column]))
    return result
def at(rows, t, column):
    for a,b in zip(rows,rows[1:]):
        if a[0] <= t <= b[0]:
            return a[column]+(b[column]-a[column])*(t-a[0])/(b[0]-a[0])
    raise ValueError("waveform does not cover settled interval")
def electrical(rows, voltage, period):
    if len(rows)<10 or any(not all(math.isfinite(x) for x in row) for row in rows):
        raise ValueError("empty or nonfinite waveform")
    if any(b[0]<=a[0] for a,b in zip(rows,rows[1:])):
        raise ValueError("waveform time is not strictly increasing")
    start,stop=2*period,4*period
    delays={}
    for name,input_rising in [("delayFallPs",True),("delayRisePs",False)]:
        inputs=crossings(rows,1,voltage/2,input_rising)
        outputs=crossings(rows,2,voltage/2,not input_rising)
        values=[]
        for edge in inputs:
            if not start <= edge < stop-period/4: continue
            following=[out-edge for out in outputs if edge < out < min(edge+period/2,stop)]
            if not following: raise ValueError("missing settled output crossing")
            values.append(min(following)*1e12)
        if not values: raise ValueError("no settled delay measurements")
        delays[name]=finite_positive(sum(values)/len(values),name)
    samples=[(start,at(rows,start,3))]+[(row[0],row[3]) for row in rows if start<row[0]<stop]+[(stop,at(rows,stop,3))]
    energy=sum(-voltage*(a[1]+b[1])/2*(b[0]-a[0]) for a,b in zip(samples,samples[1:]))
    energy=finite_positive(energy,"supply energy")
    return {**delays,"delayPs":(delays["delayFallPs"]+delays["delayRisePs"])/2,
            "averagePowerW":energy/(stop-start),"energyPerCycleJ":energy/2,
            "integrationWindowS":[start,stop],"integratedEnergyJ":energy}
def boundary_area(filename):
    library=gdstk.read_gds(str(filename))
    cells=library.top_level()
    if len(cells)!=1: raise ValueError("GDS must have exactly one top-level cell")
    polygons=cells[0].get_polygons(layer=63,datatype=0)
    if not polygons: raise ValueError("GDS has no layer 63/0 boundary polygons")
    merged=gdstk.boolean(polygons,[],"or",precision=1e-6)
    return finite_positive(sum(p.area() for p in merged),"boundary area")
def safe(root,relative,max_bytes=128*1024*1024):
    candidate=(root/relative)
    if not isinstance(relative,str) or relative.startswith("/") or "\\" in relative or any(p in ("",".","..") for p in relative.split("/")):
        raise ValueError("unsafe evidence path")
    if candidate.is_symlink() or not candidate.is_file() or root not in candidate.resolve().parents:
        raise ValueError("evidence must be a regular file within workspace")
    if candidate.stat().st_size>max_bytes:
        raise ValueError("evidence file exceeds byte limit")
    return candidate
def load_rows(filename):
    rows=[]
    with filename.open() as source:
        for line in source:
            tokens=line.split()
            if not tokens or tokens[0].lower() in ("time","v-sweep"): continue
            if len(tokens)!=4: raise ValueError("expected scale, input, output, supply current columns")
            if len(rows)>=1_100_000: raise ValueError("waveform exceeds row limit")
            rows.append([float(value) for value in tokens])
    if not rows or any(not all(math.isfinite(value) for value in row) for row in rows): raise ValueError("empty or nonfinite curve")
    return rows

def dc_metrics(rows,voltage):
    if len(rows)<100 or any(b[1]<=a[1] for a,b in zip(rows,rows[1:])): raise ValueError("invalid DC sweep")
    if rows[0][2]<0.8*voltage or rows[-1][2]>0.2*voltage: raise ValueError("inverter DC levels failed")
    crossings=[]
    for a,b in zip(rows,rows[1:]):
        fa,fb=a[2]-a[1],b[2]-b[1]
        if fa>=0>fb: crossings.append(a[1]+fa*(b[1]-a[1])/(fa-fb))
    if len(crossings)!=1: raise ValueError("DC inverter switching point is not unique")
    return {"switchingVoltageV":finite_positive(crossings[0],"switching voltage"),"lowInputSupplyCurrentA":-rows[0][3],"highInputSupplyCurrentA":-rows[-1][3],"scope":"Schematic inverter voltage-transfer switching voltage Vout=Vin; not transistor threshold voltage."}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--version",action="store_true")
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--workspace")
    parser.add_argument("--measurement")
    parser.add_argument("--dc-only",action="store_true")
    args=parser.parse_args()
    if args.version: print(VERSION);return
    if args.self_test:
        rectangle=gdstk.rectangle((0,0),(2,3),layer=63)
        assert sum(p.area() for p in gdstk.boolean([rectangle],[],"or"))==6
        # Exact integration of a constant 1 A supply current over two cycles.
        rows=[]
        for i in range(401):
            t=i/100
            phase=t%1
            vin=0 if phase<.5 else 1
            out=1 if (t-.1)%1<.5 else 0
            rows.append([t,vin,out,-1])
        result=electrical(rows,1,1)
        assert abs(result["averagePowerW"]-1)<1e-12 and result["delayPs"]>0
        print(json.dumps({"schemaVersion":"dtco.analysis-self-test.v1","passed":True}));return
    root=Path(args.workspace).resolve()
    measurement=json.loads(safe(root,args.measurement,64*1024).read_text())
    if args.dc_only:
        curve=safe(root,"output/dtco/model-dc.txt")
        result={"schemaVersion":"dtco.model-analysis.v1",**dc_metrics(load_rows(curve),measurement["voltageV"]),"curvePath":"output/dtco/model-dc.txt","curveSha256":digest(curve)}
        (root/"output/dtco/model-analysis.json").write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")
        print(json.dumps(result,allow_nan=False));return
    native=json.loads(safe(root,"output/acg-native.json",8*1024*1024).read_text())
    if len(native.get("cells",[]))!=1: raise ValueError("expected one native inverter cell")
    candidates=native["cells"][0].get("routedCandidates",[])
    candidates=sorted([c for c in candidates if c.get("routeStatus")=="succeeded"],key=lambda c:c["gdsPath"])
    if not candidates: raise ValueError("no verified native routed GDS candidate")
    selected=candidates[0]
    gds=safe(root,selected["gdsPath"])
    if selected.get("gdsSha256")!=digest(gds): raise ValueError("native GDS candidate hash changed")
    native_path=selected["gdsPath"]
    extraction={"status":"unavailable","reason":"Schematic mode: generated layout is not the electrical model."}
    if measurement.get("electricalMode","schematic")=="extracted":
        validation_path="output/dtco/physical/validation.json"
        validation_file=safe(root,validation_path)
        validation=json.loads(validation_file.read_text())
        if validation.get("status")!="validated" or validation.get("drcCount")!=0 or validation.get("drcStyle")!="drc(full)" or validation.get("sourceGeometryMatched") is not True or validation.get("finalGdsRoundtrip") is not True or len(validation.get("devices",[]))!=2 or not validation.get("capacitors"): raise ValueError("Invalid completed-layout extraction evidence")
        for relative,expected in validation["hashes"].items():
            if digest(safe(root,relative))!=expected: raise ValueError("Physical extraction artifact hash changed")
        gds=safe(root,"output/dtco/physical/completed.gds")
        netlist=safe(root,"output/dtco/physical/extracted.spice")
        if digest(gds)!=validation.get("selectedGdsSha256") or digest(netlist)!=validation.get("electricalNetlistSha256"): raise ValueError("Measured physical source hash changed")
        selected={"gdsPath":"output/dtco/physical/completed.gds","gdsSha256":digest(gds)}
        extraction={"status":"validated","method":"physical_gds_full_capacitance","resistanceExtracted":False,"signoff":False,"drcCount":0,"drcStyle":validation["drcStyle"],"validationPath":validation_path,"validationSha256":digest(validation_file),"electricalNetlistPath":"output/dtco/physical/extracted.spice","electricalNetlistSha256":digest(netlist),"deviceCount":2,"devices":validation["devices"],"capacitorCount":len(validation["capacitors"]),"sourceGeometryMatched":True,"finalGdsRoundtrip":True}
    waveform=safe(root,"output/dtco/waveforms.txt")
    log=safe(root,"output/dtco/ngspice.log").read_text(errors="replace")
    if re.search(r"^\s*(?:Error|Fatal|run simulation\(s\) aborted)",log,re.M|re.I):
        raise ValueError("ngspice reported simulation failure")
    rows=load_rows(waveform)
    model_analysis=json.loads(safe(root,"output/dtco/model-analysis.json").read_text())
    if digest(safe(root,model_analysis["curvePath"]))!=model_analysis.get("curveSha256"): raise ValueError("DC curve hash changed")
    measured=electrical(rows,measurement["voltageV"],measurement["periodNs"]*1e-9)
    area=boundary_area(gds)
    result={"schemaVersion":"dtco.measurements.v1",**measured,"areaUm2":area,
            "selectedGdsPath":selected["gdsPath"],"selectedGdsSha256":digest(gds),
            "waveformSha256":digest(waveform),"metricScope":measurement["metricScope"],"electricalMode":measurement.get("electricalMode","schematic"),"design":measurement.get("design"),"nativeGdsPath":native_path,"nativeGdsSha256":digest(safe(root,native_path)),"modelAnalysis":model_analysis,
            "extraction":extraction,
            "methodology":{"delay":"Mean settled input-to-output 50% crossings, linear interpolation; arithmetic mean of rising and falling propagation delay.",
                           "power":"Trapezoidal integration of -VDD*i(VDD) over settled complete cycles 2 through 4, divided by interval.",
                           "area":"Union of actual selected GDS top-cell layer 63/datatype 0 boundary polygons in square micrometres.",
                           "electrical":measurement["metricScope"]}}
    (root/"output/dtco/metrics.json").write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")
    print(json.dumps(result,allow_nan=False))
if __name__=="__main__": main()
