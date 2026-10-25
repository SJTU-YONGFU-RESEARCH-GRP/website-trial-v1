#!/usr/bin/env python3
"""Measured GF180 physical completion; Magic runs as separate planned processes."""
import argparse,hashlib,json,math,re
from pathlib import Path
import gdstk
VERSION="dtco.physical.v1"
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def safe(root,relative):
    if not isinstance(relative,str) or relative.startswith("/") or "\\" in relative or any(p in ("",".","..") for p in relative.split("/")): raise ValueError("Unsafe artifact path")
    candidate=root/relative
    if candidate.is_symlink() or not candidate.is_file() or root not in candidate.resolve().parents or candidate.stat().st_size>128*1024*1024: raise ValueError("Unsafe/missing/oversize artifact")
    return candidate

def contact_material(cut,gates,active):
    # The actual cut can straddle an OD edge even when its center is outside.
    on_gate=bool(gdstk.boolean(cut,gates,'and',precision=.001))
    on_active=bool(gdstk.boolean(cut,active,'and',precision=.001))
    if on_gate==on_active: raise ValueError('Ambiguous contact landing: '+str(cut.bounding_box()))
    return on_gate,on_active

def prepare(root,gds,manifest,source,output):
    output.mkdir(parents=True,exist_ok=False)
    lib=gdstk.read_gds(gds); cells=lib.top_level()
    if len(cells)!=1: raise ValueError('Expected one top cell')
    cell=cells[0]; top=cell.name
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*',top): raise ValueError('Unsafe native cell name')
    contract=json.loads(manifest.read_text()); anchors={}
    m1=[p for p in cell.polygons if p.layer==34 and p.datatype==0]
    for terminal in contract['terminals']:
        a=terminal['physical_anchor']; net=terminal['expected_net']
        if a['layer']!='M1' or a['unit']!='um': raise ValueError('Unsupported anchor')
        xy=(a['x'],a['y'])
        if not all(isinstance(v,(float,int)) and math.isfinite(v) for v in xy): raise ValueError('Nonfinite anchor')
        if not gdstk.inside([xy],m1)[0]: raise ValueError(f'Anchor {net} outside metal1')
        if net not in anchors: anchors[net]=xy; cell.add(gdstk.Label(net,xy,layer=34,texttype=10))
    if set(anchors)!={'A','Y','VDD','VSS'}: raise ValueError('Unsupported inverter ports')
    # Derive tap placement from actual geometry and rail locations, in micrometers.
    physical=[p for p in cell.polygons if p.layer not in [63,127,128,129,130]]
    xmin=min(p.bounding_box()[0][0] for p in physical); tx=round((xmin-1.0)/.005)*.005
    wells=[p for p in cell.polygons if p.layer==21]
    wx0=min(p.bounding_box()[0][0] for p in wells); wx1=max(p.bounding_box()[1][0] for p in wells)
    wy0=min(p.bounding_box()[0][1] for p in wells); wy1=max(p.bounding_box()[1][1] for p in wells)
    # Native 220nm cuts at OD edges do not survive the PDK 230nm CIF output.
    # Add real local landing pads without changing any channel intersection.
    cuts=[p for p in cell.polygons if p.layer==33 and p.datatype==0]
    gates=[p for p in cell.polygons if p.layer==30 and p.datatype==0]
    active=[p for p in cell.polygons if p.layer==22 and p.datatype==0]
    islands=gdstk.boolean(m1,[], 'or',precision=.001)
    def physical_net(x,y):
        # Native contacts may terminate exactly at an M1 edge; classify by
        # actual 220nm cut footprint overlap, avoiding floating-point edge tests.
        probe=gdstk.rectangle((x-.11,y-.11),(x+.11,y+.11))
        hits=[island for island in islands if gdstk.boolean(probe,island,'and',precision=.001)]
        labels={net for island in hits for net,anchor in anchors.items() if gdstk.inside([anchor],[island])[0]}
        if len(labels)!=1: raise ValueError(f'Contact has ambiguous native net at {x},{y}: {labels}')
        return labels.pop()
    contact_nets={}
    pads=[]
    for cut in cuts:
        box=cut.bounding_box();x=sum(b[0] for b in box)/2;y=sum(b[1] for b in box)/2
        on_gate,on_active=contact_material(cut,gates,active)
        contact_nets[id(cut)]='A' if on_gate else physical_net(x,y)
        landing=gdstk.rectangle((x-.18,y-.18),(x+.18,y+.18),layer=30 if on_gate else 22)
        if not on_gate and gdstk.boolean(landing,gates,'and'): raise ValueError('Contact landing changes channel')
        pads.extend([landing,gdstk.rectangle((x-.115,y-.115),(x+.115,y+.115),layer=33),gdstk.rectangle((x-.175,y-.175),(x+.175,y+.175),layer=34)])
    cell.remove(*cuts);cell.add(*pads)
    # Physical DRC cleanup: continuous gate pads, no sub-minimum M1 notches.
    gate_cuts=[c for c in cuts if contact_nets[id(c)]=='A']
    gx=anchors['A'][0]
    gy=[sum(b[1] for b in c.bounding_box())/2 for c in gate_cuts]
    cell.add(gdstk.rectangle((gx-.18,min(gy)-.18),(gx+.18,max(gy)+.18),layer=30))
    cell.remove(*[q for q in cell.polygons if q.layer==34 and q.datatype==0])
    gate_y0,gate_y1=min(gy)-.175,max(gy)+.175
    if gate_y1-gate_y0<.42:
        midpoint=(gate_y0+gate_y1)/2;gate_y0,gate_y1=midpoint-.21,midpoint+.21
    cell.add(gdstk.rectangle((gx-.175,gate_y0),(gx+.175,gate_y1),layer=34))
    outputs=[cut for cut in cuts if contact_nets[id(cut)]=='Y']
    if len(outputs)!=2: raise ValueError('Expected two real output contacts')
    out_x=max(sum(b[0] for b in cut.bounding_box())/2 for cut in outputs)
    trunk_left=max(out_x+.15,gx+.175+.24);trunk_right=trunk_left+.23
    native_right=max(p.bounding_box()[1][0] for p in physical)
    for net in ['VDD','VSS']:
        rx,ry=anchors[net]
        cell.add(gdstk.rectangle((xmin,ry-.115),(max(native_right,trunk_right),ry+.115),layer=34))
    outputs=[]
    for cut in cuts:
        cb=cut.bounding_box();cx=sum(b[0] for b in cb)/2;cy=sum(b[1] for b in cb)/2
        net=contact_nets[id(cut)]
        if net=='A': continue
        if net in ['VDD','VSS']:
            ry=anchors[net][1]
            cell.add(gdstk.rectangle((cx-.175,min(ry-.115,cy-.175)),(cx+.175,max(ry+.115,cy+.175)),layer=34))
        else:
            outputs.append((cx,cy))
            cell.add(gdstk.rectangle((cx-.175,cy-.175),(trunk_right,cy+.175),layer=34))
    cell.add(gdstk.rectangle((trunk_left,min(y for x,y in outputs)),(trunk_right,max(y for x,y in outputs)),layer=34))
    lib.write_gds(output/'pins.gds')
    commands=['set scalefac [tech lambda]','if {[lindex $scalefac 1] < 10} {scalegrid 1 10}','drc euclidean on','snap lambda','set VDD VDD','set GND VSS','set SUB VSUBS','drc off','gds readonly false','gds rescale true',f'gds read {output}/pins.gds',f'load {top}','select top cell']
    def paint(layer,x0,y0,x1,y1):
        commands.extend([f'box values {x0:.6f}um {y0:.6f}um {x1:.6f}um {y1:.6f}um',f'paint {layer}'])
    # Enclose the completed PMOS diffusion, including edge-contact landing
    # pads, rather than the smaller original native active rectangle.
    pactive=gdstk.boolean([a for a in cell.polygons if a.layer==22 and a.datatype==0 and gdstk.boolean(a,wells,'and')],[],'or',precision=.001)
    if len(pactive)!=1: raise ValueError('Expected one physical PMOS active island')
    p_bounds=[a.bounding_box() for a in pactive]
    p_lo=[min(b[0][k] for b in p_bounds) for k in range(2)]
    p_hi=[max(b[1][k] for b in p_bounds) for k in range(2)]
    for net,diff,contact in [('VSS','psubdiff','psc'),('VDD','nsubdiff','nsc')]:
        rx,ry=anchors[net]
        # GF180 DF.7 needs .43um PMOS enclosure; use .45 on all four
        # completed-diffusion edges, united with the tap's .45um enclosure.
        if net=='VDD': paint('nwell',min(wx0,tx-.73,p_lo[0]-.45),min(wy0,ry-.73,p_lo[1]-.45),max(wx1,tx+.73,p_hi[0]+.45),max(wy1,ry+.73,p_hi[1]+.45))
        paint(diff,tx-.28,ry-.28,tx+.28,ry+.28)
        paint(contact,tx-.115,ry-.115,tx+.115,ry+.115)
        paint('metal1',tx-.23,ry-.23,tx+.23,ry+.23)
        paint('metal1',tx-.23,ry-.115,rx,ry+.115)
    commands += ['gds write geometry.gds','feedback save feedback.txt','save completed.mag','quit -noprompt']
    script=output/'complete.tcl';script.write_text('\n'.join(commands)+'\n')
    (output/"context.json").write_text(json.dumps({"top":top,"anchors":anchors,"nativeGdsPath":str(gds.relative_to(root)),"nativeGdsSha256":digest(gds),"nativeManifestPath":str(manifest.relative_to(root)),"nativeManifestSha256":digest(manifest),"sourceSha256":digest(source)}))

def footprint(root,output):
    context=json.loads(safe(root,"output/dtco/physical/context.json").read_text());top=context["top"]
    # Include tap/well and conductor extents in the delivered boundary area.
    final=gdstk.read_gds(output/'geometry.gds'); c=final.top_level()[0]
    old=[p for p in c.polygons if p.layer==63];c.remove(*old)
    bounds=[p.bounding_box() for p in c.polygons]
    lo=[min(b[0][k] for b in bounds) for k in range(2)];hi=[max(b[1][k] for b in bounds) for k in range(2)]
    boundary=gdstk.rectangle(lo,hi,layer=63);c.add(boundary);final.write_gds(output/'completed.gds')
    extract_dir=output/'roundtrip';extract_dir.mkdir()
    tcl=['set scalefac [tech lambda]','if {[lindex $scalefac 1] < 10} {scalegrid 1 10}','drc euclidean on','snap lambda','set VDD VDD','set GND VSS','set SUB VSUBS','drc off','gds readonly false','gds rescale true',f'gds read {output}/completed.gds',f'load {top}','select top cell','extract do local','extract all','ext2spice cthresh 0','ext2spice rthresh 0','ext2spice scale off','ext2spice extresist off',f'ext2spice -o extracted.spice {top}.ext','drc style drc(full)','drc on','drc check','drc catchup','puts "DRC_COUNT [drc list count total]"','puts [drc listall why]','set fh [open drc-count.txt w]','puts $fh [drc list count total]','close $fh','set fh [open drc-why.txt w]','puts $fh [drc listall why]','close $fh','quit -noprompt']
    script=extract_dir/'extract.tcl';script.write_text('\n'.join(tcl)+'\n')

def validate(root,gds,manifest,source,output):
    context=json.loads(safe(root,"output/dtco/physical/context.json").read_text());top=context["top"];anchors=context["anchors"];extract_dir=output/"roundtrip"
    if digest(gds)!=context["nativeGdsSha256"] or digest(manifest)!=context["nativeManifestSha256"] or digest(source)!=context["sourceSha256"]: raise ValueError("Native source changed")
    extracted=(extract_dir/'extracted.spice').read_text(); devices=[]; caps=[]
    if re.search(r'\b(?:inf|nan)\b',extracted,re.I): raise ValueError('Non-finite extracted value')
    def number(v):
        m=re.fullmatch(r'([-+\d.eE]+)([a-z]*)',v)
        if not m: raise ValueError(v)
        value=float(m[1])*{'':1,'u':1e-6,'n':1e-9,'p':1e-12,'f':1e-15}[m[2]]
        if not math.isfinite(value): raise ValueError('Nonfinite extracted parameter')
        return value
    for line in extracted.splitlines():
        tokens=line.split()
        if not tokens: continue
        if tokens[0].upper().startswith('X'):
            model=tokens[5];parameters=dict(t.split('=',1) for t in tokens[6:] if '=' in t)
            expected=['Y','A','VSS','VSS'] if model=='nfet_03v3' else ['Y','A','VDD','VDD'] if model=='pfet_03v3' else None
            if tokens[1:5]!=expected: raise ValueError('Extracted topology/body mismatch: '+line)
            devices.append({'model':model,'nodes':tokens[1:5],**{k:number(v) for k,v in parameters.items()}})
        elif tokens[0].upper().startswith('C'):
            if len(tokens)!=4 or not set(tokens[1:3])<={'A','Y','VDD','VSS'}: raise ValueError('Floating capacitance node')
            value=number(tokens[3]);assert math.isfinite(value) and value>0
            caps.append({'nodes':tokens[1:3],'capacitanceF':value})
    if len(devices)!=2 or len({x['model'] for x in devices})!=2 or not caps: raise ValueError('Expected two complementary MOS and finite caps')
    requested={}
    for line in source.read_text().splitlines():
        t=line.split()
        if t and t[0].upper().startswith('X'):
            pars=dict(x.split('=',1) for x in t[6:] if '=' in x);requested[t[5]]={k:number(pars[k]) for k in ['w','l']}
    for d in devices:
        for k in ['w','l']:
            if abs(d[k]-requested[d['model']][k])>1e-12: raise ValueError(f'Extracted {k} mismatch: {d}')
    # The wrapper only declares the already extracted semantic nodes as ports.
    wrapper='* Actual completed-GDS full-cap extraction; no device/cap rewrites.\n.subckt dtco_inv A Y VDD VSS\n'+extracted+'\n.ends dtco_inv\n'
    (output/'extracted_subckt.spice').write_text(wrapper)
    for line in extracted.splitlines():
        if line.strip() and not line.lstrip().startswith("*") and line.split()[0][0].upper() not in ("X","C"): raise ValueError("Unsupported extracted statement")
    count=int(safe(root,str((extract_dir/"drc-count.txt").relative_to(root))).read_text().strip())
    if count!=0: raise ValueError("Completed layout has "+str(count)+" Magic DRC errors; see drc-why.txt")
    hashes={str(p.relative_to(root)):digest(p) for p in [gds,manifest,source,output/"completed.gds",extract_dir/"extracted.spice",output/"extracted_subckt.spice"]}
    report={"schemaVersion":"dtco.extraction-validation.v1","status":"validated","top":top,"ports":anchors,"devices":devices,"capacitors":caps,"method":"physical_gds_full_capacitance","resistanceExtracted":False,"signoff":False,"drcCount":count,"drcStyle":"drc(full)","completion":"native-net-derived physical M1 routing and PDK contact/tap completion","sourceGeometryMatched":True,"finalGdsRoundtrip":True,"hashes":hashes}
    (output/"validation.json").write_text(json.dumps(report,indent=2,allow_nan=False)+"\n")
    # Preserve the native extracted statements; only an enclosing port declaration is added.
    (output/"extracted.spice").write_text(wrapper)
    report["electricalNetlistSha256"]=digest(output/"extracted.spice")
    report["selectedGdsSha256"]=digest(output/"completed.gds")
    (output/"validation.json").write_text(json.dumps(report,indent=2,allow_nan=False)+"\n")
    from PIL import Image,ImageDraw
    polygons=gdstk.read_gds(output/"completed.gds").top_level()[0].get_polygons()
    bounds=[p.bounding_box() for p in polygons];lo=[min(b[0][k] for b in bounds) for k in range(2)];hi=[max(b[1][k] for b in bounds) for k in range(2)]
    scale=min(940/(hi[0]-lo[0]),630/(hi[1]-lo[1]));image=Image.new("RGB",(1000,700),"white");draw=ImageDraw.Draw(image)
    palette={21:"#eeeecc",22:"#55aa55",30:"#dd5555",33:"#111111",34:"#66aaff",35:"#333399",36:"#ffbb44"}
    for polygon in sorted(polygons,key=lambda p:p.layer):
        if polygon.layer in palette: draw.polygon([(30+(x-lo[0])*scale,660-(y-lo[1])*scale) for x,y in polygon.points],fill=palette[polygon.layer],outline="#555555")
    draw.text((20,10),"Measured completed GF180 layout | Magic DRC 0 | research only",fill="black")
    image.save(output/"completed.png")

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--workspace");parser.add_argument("--stage",choices=["prepare","footprint","validate"]);parser.add_argument("--version",action="store_true");parser.add_argument("--self-test",action="store_true");a=parser.parse_args()
    if a.version: print(VERSION);return
    if a.self_test:
        from PIL import Image
        assert Image.new("RGB",(2,2)).size==(2,2)
        assert gdstk.rectangle((0,0),(2,3)).area()==6
        # Real-run regression: center .22 lies outside OD, cut overlaps by .03.
        cut=gdstk.rectangle((.11,.30),(.33,.52))
        active=[gdstk.rectangle((.30,.30),(1.14,1.30))]
        gate=[gdstk.rectangle((.575,2),(.865,4))]
        assert contact_material(cut,gate,active)==(False,True)
        for ambiguous in [[],[cut]]:
            try: contact_material(cut,ambiguous,ambiguous)
            except ValueError: pass
            else: raise AssertionError("Ambiguous contact accepted")
        print(json.dumps({"schemaVersion":"dtco.physical-self-test.v1","passed":True}));return
    root=Path(a.workspace).resolve();output=root/"output/dtco/physical";source=safe(root,"input/netlist.sp")
    native=json.loads(safe(root,"output/acg-native.json").read_text())
    if len(native.get("cells",[]))!=1: raise ValueError("Expected one native cell")
    candidates=sorted([c for c in native["cells"][0].get("routedCandidates",[]) if c.get("routeStatus")=="succeeded"],key=lambda c:c["gdsPath"])
    if not candidates: raise ValueError("No routed candidate")
    selected=candidates[0];gds=safe(root,selected["gdsPath"]);manifest=safe(root,str(gds.with_suffix(".lvs1_manifest.json").relative_to(root)))
    if digest(gds)!=selected.get("gdsSha256") or digest(manifest)!=selected.get("lvs1ManifestSha256"): raise ValueError("Native candidate hash mismatch")
    if a.stage=="prepare": prepare(root,gds,manifest,source,output)
    elif a.stage=="footprint": footprint(root,output)
    else: validate(root,gds,manifest,source,output)
if __name__=="__main__": main()
