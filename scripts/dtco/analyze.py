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
def electrical(rows, voltage, period, ground=0, input_column=1, output_column=2, current_column=3, transition="inverting", worst=False):
    if len(rows)<10 or any(not all(math.isfinite(x) for x in row) for row in rows):
        raise ValueError("empty or nonfinite waveform")
    if any(b[0]<=a[0] for a,b in zip(rows,rows[1:])):
        raise ValueError("waveform time is not strictly increasing")
    supply=finite_positive(voltage-ground,"differential supply voltage")
    finite_positive(period,"period")
    threshold=(voltage+ground)/2
    if transition not in ("inverting","noninverting"): raise ValueError("invalid transition")
    start,stop=2*period,4*period
    at(rows,start,current_column); at(rows,stop,current_column)
    settled=[r[output_column] for r in rows if start<=r[0]<=stop]
    if not settled or min(settled)>ground+.2*supply or max(settled)<ground+.8*supply:
        raise ValueError("settled output logic levels failed")
    delays={}
    for name,output_rising in [("delayFallPs",False),("delayRisePs",True)]:
        input_rising=not output_rising if transition=="inverting" else output_rising
        inputs=crossings(rows,input_column,threshold,input_rising)
        outputs=crossings(rows,output_column,threshold,output_rising)
        values=[]
        for edge in inputs:
            if not start <= edge < stop-period/4: continue
            following=[out-edge for out in outputs if edge < out < min(edge+period/2,stop)]
            if not following: raise ValueError("missing settled output crossing")
            values.append(min(following)*1e12)
        if not values: raise ValueError("no settled delay measurements")
        delays[name]=finite_positive(sum(values)/len(values),name)
    samples=[(start,at(rows,start,current_column))]+[(row[0],row[current_column]) for row in rows if start<row[0]<stop]+[(stop,at(rows,stop,current_column))]
    energy=sum(-supply*(a[1]+b[1])/2*(b[0]-a[0]) for a,b in zip(samples,samples[1:]))
    energy=finite_positive(energy,"supply energy")
    return {**delays,"delayPs":max(delays.values()) if worst else (delays["delayFallPs"]+delays["delayRisePs"])/2,
            "averagePowerW":energy/(stop-start),"energyPerCycleJ":energy/2,
            "integrationWindowS":[start,stop],"integratedEnergyJ":energy}
def boundary_area(filename,boundary=None):
    library=gdstk.read_gds(str(filename))
    cells=library.top_level()
    if len(cells)!=1: raise ValueError("GDS must have exactly one top-level cell")
    boundary=boundary or {"layer":63,"datatype":0}
    polygons=cells[0].get_polygons(layer=boundary["layer"],datatype=boundary["datatype"])
    if not polygons: raise ValueError("GDS has no layer 63/0 boundary polygons")
    merged=gdstk.boolean(polygons,[],"or",precision=1e-6)
    return finite_positive(sum(p.area() for p in merged),"boundary area")
def safe(root,relative,max_bytes=128*1024*1024):
    if not isinstance(relative,str) or not relative: raise ValueError("unsafe evidence path")
    candidate=(root/relative)
    if not isinstance(relative,str) or relative.startswith("/") or "\\" in relative or any(p in ("",".","..") for p in relative.split("/")):
        raise ValueError("unsafe evidence path")
    if candidate.is_symlink() or not candidate.is_file() or root not in candidate.resolve().parents:
        raise ValueError("evidence must be a regular file within workspace")
    if candidate.stat().st_size>max_bytes:
        raise ValueError("evidence file exceeds byte limit")
    return candidate
def load_rows(filename, columns=4):
    rows=[]
    with filename.open() as source:
        for line in source:
            tokens=line.split()
            if not tokens or tokens[0].lower() in ("time","v-sweep","scale"): continue
            if len(tokens)!=columns: raise ValueError("unexpected waveform column count")
            if len(rows)>=1_100_000: raise ValueError("waveform exceeds row limit")
            rows.append([float(value) for value in tokens])
    if not rows or any(not all(math.isfinite(value) for value in row) for row in rows): raise ValueError("empty or nonfinite curve")
    return rows

def dc_metrics(rows,voltage,ground=0,transition="inverting"):
    supply=finite_positive(voltage-ground,"differential supply voltage")
    if len(rows)<100 or any(not all(math.isfinite(v) for v in r) for r in rows) or any(b[1]<=a[1] for a,b in zip(rows,rows[1:])): raise ValueError("invalid DC sweep")
    if rows[0][1]>ground+.01*supply or rows[-1][1]<voltage-.01*supply: raise ValueError("DC sweep does not cover supply rails")
    if transition not in ("inverting","noninverting"): raise ValueError("invalid transition")
    low,high=(rows[0][2],rows[-1][2]) if transition=="noninverting" else (rows[-1][2],rows[0][2])
    if low>ground+.2*supply or high<ground+.8*supply: raise ValueError("DC logic levels failed")
    points=[]
    for a,b in zip(rows,rows[1:]):
        fa,fb=a[2]-a[1],b[2]-b[1]
        if fa>=0>fb or fa<=0<fb:
            point=a[1]+fa*(b[1]-a[1])/(fa-fb)
            if not points or abs(points[-1]-point)>1e-12: points.append(point)
    result={"lowInputSupplyCurrentA":-rows[0][3],"highInputSupplyCurrentA":-rows[-1][3],
            "scope":"Sensitized circuit voltage-transfer curve; Vout=Vin switching point where unique, not MOS transistor threshold voltage."}
    if transition=="noninverting":
        result["switchingVoltageStatus"]="not_applicable"
        result["switchingVoltageReason"]="A noninverting transfer curve does not define a unique inverter Vout=Vin switching point."
    else:
        if len(points)!=1: raise ValueError("DC inverter switching point is not unique")
        result.update(switchingVoltageV=points[0],switchingVoltageStatus="measured")
    return result

def check_log(root,relative):
    log=safe(root,relative)
    if re.search(r"^\s*(?:Error|Fatal|run simulation\(s\) aborted)",log.read_text(errors="replace"),re.M|re.I):
        raise ValueError("ngspice reported simulation failure")
    return log

def validate_truth(rows,truth,inputs,voltage,ground,period):
    if not truth or len(truth)>256: raise ValueError("invalid truth table")
    if any(b[0]<=a[0] for a,b in zip(rows,rows[1:])): raise ValueError("truth waveform time is not strictly increasing")
    supply=finite_positive(voltage-ground,"differential supply voltage")
    def logic(value):
        if value<=ground+.2*supply: return 0
        if value>=ground+.8*supply: return 1
        raise ValueError("truth sample has invalid logic level")
    actual=[]
    for index,row in enumerate(truth):
        if set(row["inputs"])!=set(inputs) or any(v not in (0,1) for v in row["inputs"].values()) or row["output"] not in (0,1): raise ValueError("invalid truth table row")
        sample=(index+.8)*period
        sampled={pin:logic(at(rows,sample,col+1)) for col,pin in enumerate(inputs)}
        output_voltage=at(rows,sample,len(inputs)+1)
        output=logic(output_voltage)
        passed=sampled==row["inputs"] and output==row["output"]
        actual.append({"inputs":row["inputs"],"expectedOutput":row["output"],"actualInputs":sampled,"actualOutput":output,"outputVoltageV":output_voltage,"sampleTimeS":sample,"passed":passed})
    if not all(r["passed"] for r in actual): raise ValueError("truth table validation failed")
    return {"status":"passed","rows":actual}

def fixed_layout(root,layout):
    if layout.get("areaSource")!="lef": raise ValueError("fixed layout area must come from selected LEF SIZE")
    area=finite_positive(layout["areaUm2"],"LEF area")
    lef=safe(root,layout["lefPath"])
    if digest(lef)!=layout.get("lefSha256"): raise ValueError("LEF source hash changed")
    top=layout["gdsTop"]
    text=lef.read_text(errors="strict")
    macro=re.search(r"(?ims)^\s*MACRO\s+"+re.escape(top)+r"\s*$([\s\S]*?)^\s*END\s+"+re.escape(top)+r"\s*$",text)
    size=re.search(r"(?i)\bSIZE\s+([\d.eE+\-]+)\s+BY\s+([\d.eE+\-]+)\s*;",macro.group(1) if macro else "")
    if not size: raise ValueError("selected LEF macro SIZE missing")
    expected=finite_positive(float(size[1]),"LEF width")*finite_positive(float(size[2]),"LEF height")
    if not math.isclose(area,expected,rel_tol=1e-10,abs_tol=1e-12): raise ValueError("selected LEF area mismatch")
    gds=safe(root,layout["gdsPath"])
    library=gdstk.read_gds(str(gds))
    if top not in {cell.name for cell in library.cells}: raise ValueError("selected GDS cell missing")
    return gds,area

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--version",action="store_true")
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--workspace")
    parser.add_argument("--measurement")
    parser.add_argument("--dc-only",action="store_true")
    parser.add_argument("--frequency-round",type=int)
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
    if args.frequency_round is not None:
        from frequency import evaluate_round
        evaluate_round(root,args.frequency_round)
        return
    measurement=json.loads(safe(root,args.measurement,64*1024).read_text())
    ground=measurement.get("groundVoltageV",0)
    finite_positive(measurement["voltageV"]-ground,"differential supply voltage")
    if args.dc_only:
        curve=safe(root,"output/dtco/model-dc.txt")
        result={"schemaVersion":"dtco.model-analysis.v1",**dc_metrics(load_rows(curve),measurement["voltageV"],ground,measurement.get("arcs",[{}])[0].get("transition","inverting")),"curvePath":"output/dtco/model-dc.txt","curveSha256":digest(curve)}
        if measurement.get("arcs"):
            result["arc"]={key:measurement["arcs"][0][key] for key in ("id","input","output","transition","fixedInputs")}
        (root/"output/dtco/model-analysis.json").write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")
        print(json.dumps(result,allow_nan=False));return
    fixed=measurement.get("fixedLayout")
    schematic_only=measurement.get("schematicOnly",False)
    if schematic_only:
        if fixed or measurement.get("electricalMode","schematic")=="extracted": raise ValueError("schematic-only profile cannot claim physical evidence")
        gds,area,native_path=None,None,None
        selected={"gdsPath":None}
    elif fixed:
        if measurement.get("electricalMode","schematic")=="extracted": raise ValueError("fixed library layout has no validated extraction")
        gds,area=fixed_layout(root,fixed)
        selected={"gdsPath":fixed["gdsPath"]}
        native_path=None
    else:
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
    model_analysis=json.loads(safe(root,"output/dtco/model-analysis.json").read_text())
    if digest(safe(root,model_analysis["curvePath"]))!=model_analysis.get("curveSha256"): raise ValueError("DC curve hash changed")
    arcs=measurement.get("arcs")
    measured_arcs=[]
    truth_validation=None
    if arcs is not None:
        inputs=measurement.get("inputs")
        if not isinstance(inputs,list) or not 1<=len(inputs)<=8 or len(set(inputs))!=len(inputs) or any(not isinstance(pin,str) or not pin for pin in inputs): raise ValueError("invalid measurement inputs")
        if not isinstance(arcs,list) or not 1<=len(arcs)<=64: raise ValueError("invalid timing arcs")
        ids=set()
        for arc in arcs:
            if not isinstance(arc.get("id"),str) or not arc["id"] or arc["id"] in ids or arc["input"] not in inputs or arc["output"]!=measurement["output"]: raise ValueError("invalid timing arc")
            ids.add(arc["id"])
            fixed_inputs=arc["fixedInputs"]
            if set(fixed_inputs)!=set(inputs)-{arc["input"]} or any(value not in (0,1) for value in fixed_inputs.values()): raise ValueError("invalid sensitized inputs")
            waveform=safe(root,arc["waveformPath"])
            log=check_log(root,arc["logPath"])
            deck=safe(root,arc["deckPath"])
            rows=load_rows(waveform,len(inputs)+3)
            supply=measurement["voltageV"]-ground
            for pin,value in fixed_inputs.items():
                for row in rows:
                    if row[0]>=2*measurement["periodNs"]*1e-9 and abs(row[inputs.index(pin)+1]-(ground+value*supply))>.2*supply: raise ValueError("sensitizing input logic level failed")
            metrics=electrical(rows,measurement["voltageV"],measurement["periodNs"]*1e-9,ground,inputs.index(arc["input"])+1,len(inputs)+1,len(inputs)+2,arc["transition"],True)
            measured_arcs.append({**arc,**metrics,"waveformSha256":digest(waveform),"logSha256":digest(log),"deckSha256":digest(deck)})
        waveform=safe(root,arcs[0]["waveformPath"])
        measured={key:sum(arc[key] for arc in measured_arcs)/len(measured_arcs) for key in ("averagePowerW","energyPerCycleJ","integratedEnergyJ")}
        measured.update({key:max(arc[key] for arc in measured_arcs) for key in ("delayPs","delayFallPs","delayRisePs")})
        measured["integrationWindowS"]=measured_arcs[0]["integrationWindowS"]
        truth_waveform=safe(root,measurement["truthWaveformPath"])
        truth_log=check_log(root,measurement["truthLogPath"])
        truth_validation=validate_truth(load_rows(truth_waveform,len(inputs)+3),measurement["truthTable"],inputs,measurement["voltageV"],ground,measurement["periodNs"]*1e-9)
        truth_validation.update(waveformPath=measurement["truthWaveformPath"],waveformSha256=digest(truth_waveform),logPath=measurement["truthLogPath"],logSha256=digest(truth_log))
    else:
        waveform=safe(root,"output/dtco/waveforms.txt")
        check_log(root,"output/dtco/ngspice.log")
        measured=electrical(load_rows(waveform),measurement["voltageV"],measurement["periodNs"]*1e-9,ground)
    if not fixed and not schematic_only: area=boundary_area(gds,measurement.get("boundary"))
    result={"schemaVersion":"dtco.measurements.v1",**measured,"areaUm2":area,
            "selectedGdsTop":measurement.get("fixedLayout",{}).get("gdsTop"),"selectedGdsPath":selected["gdsPath"],"selectedGdsSha256":digest(gds) if gds else None,
            "waveformSha256":digest(waveform),"metricScope":measurement["metricScope"],"electricalMode":measurement.get("electricalMode","schematic"),"design":measurement.get("design"),"nativeGdsPath":native_path,"nativeGdsSha256":digest(safe(root,native_path)) if native_path else None,"modelAnalysis":model_analysis,
            "extraction":extraction,
            "methodology":{"delay":"Mean settled input-to-output 50% crossings, linear interpolation; arithmetic mean of rising and falling propagation delay.",
                           "power":"Trapezoidal integration of -(VDD-VSS)*i(VDD) over settled complete cycles 2 through 4, divided by interval.",
                           "area":"Union of actual selected GDS top-cell boundary polygons in square micrometres; layer/datatype "+str(measurement.get("boundary",{"layer":63,"datatype":0}))+".",
                           "electrical":measurement["metricScope"]}}
    if schematic_only:
        result["areaStatus"]="unavailable"
        result["methodology"]["area"]="No physical implementation exists for this schematic-only profile."
    if fixed:
        result["fixedLayout"]={**fixed,"lefSha256":digest(safe(root,fixed["lefPath"]))}
        result["methodology"]["area"]="Exact selected library cell LEF SIZE width times height in square micrometres, verified against hashed source; selected GDS cell identity verified."
    if arcs is not None:
        result["arcs"]=measured_arcs
        result["truthTableValidation"]=truth_validation
        result["methodology"]["delay"]="Mean settled 50% crossings for each output rise/fall; each arc uses maximum rise/fall delay; aggregate delay is maximum across sensitized arcs."
        result["methodology"]["power"]="Trapezoidal integration of -(VDD-VSS)*i(VDD) over [2T,4T] per arc; aggregate power and energy are arithmetic means across measured arcs."
        result["methodology"]["truthTable"]="Each truth-table row sampled at (rowIndex+0.8)*T; all inputs and output must meet VSS+0.2/0.8*(VDD-VSS) logic limits."
    (root/"output/dtco/metrics.json").write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")
    print(json.dumps(result,allow_nan=False))
if __name__=="__main__": main()
