#!/usr/bin/env python3
"""Build reviewed DTCO resource descriptors from installed administrator PDKs. No simulation."""
import hashlib,json,os,re
from pathlib import Path
VERSION='dtco.catalog.v1'
PDK=Path('/home/duhaochen/rtl2gds-copilot-orchestrator/pdk/ciel')
REV='0fe599b2afb6708d281543108caf8310912f54af'
ROOTS={'gf180mcuA':Path(os.environ.get('DTCO_GF180_PDK_ROOT',str(PDK/'gf180mcu/versions'/REV/'gf180mcuA'))),'sky130A':Path(os.environ.get('DTCO_SKY130_PDK_ROOT',str(PDK/'sky130/versions'/REV/'sky130A')))}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def resource(p):return {'source':str(p.resolve()),'sha256':sha(p)}
def number(s):
 m=re.fullmatch(r'([-+0-9.eE]+)([a-zA-Z]*)',s);units={'':1,'u':1e-6,'n':1e-9,'p':1e-12,'m':1e-3,'f':1e-15}
 if not m or m[2].lower() not in units:raise ValueError('Unsupported SPICE number '+s)
 return float(m[1])*units[m[2].lower()]
def bins(text):return [dict(zip(['lengthMinUm','lengthMaxUm','widthMinUm','widthMaxUm'],[float(v)*1e6 for v in row])) for row in re.findall(r'lmin\s*=\s*(\S+)\s*\+?\s*lmax\s*=\s*(\S+)\s*\+?\s*wmin\s*=\s*(\S+)\s*\+?\s*wmax\s*=\s*(\S+)',text,re.I)]
def section(text,name):
 m=re.search(r'(?im)^\s*\.lib\s+'+re.escape(name)+r'\s*$',text)
 if not m:raise ValueError('Missing section '+name)
 end=re.search(r'(?im)^\s*\.endl',text[m.end():]);return text[m.end():m.end()+end.start()]
def option(id,label):return dict(id=id,label=label,available=True,reason=None)
def truth(gate):
 return [{'inputs':dict(zip(['A'] if gate=='inv' else ['A','B'],vs)),'output':int(not (vs[0] if gate=='inv' else (all(vs) if gate=='nand2' else any(vs))))} for vs in ([(0,),(1,)] if gate=='inv' else [(0,0),(0,1),(1,0),(1,1)])]
def arcs(gate):return [{'id':i+'->Y','input':i,'output':'Y','transition':'inverting',**({'fixedInputs':{('B' if i=='A' else 'A'):1 if gate=='nand2' else 0}} if gate!='inv' else {})} for i in (['A'] if gate=='inv' else ['A','B'])]
catalog={'version':VERSION,'revision':REV,'technologyProfiles':[],'modelProfiles':[],'circuitProfiles':[],'resources':{},'cellResources':{},'families':{}}
family_sets={}
for tech,root in ROOTS.items():
 gf=tech=='gf180mcuA';entry='libs.tech/ngspice/'+('sm141064.ngspice' if gf else 'sky130.lib.spice');entryfile=root/entry
 model_specs=[('gf180-03v3',['nfet_03v3','pfet_03v3']),('gf180-06v0',['nfet_06v0','pfet_06v0'])] if gf else [('sky130-01v8-hvt',['sky130_fd_pr__nfet_01v8','sky130_fd_pr__pfet_01v8_hvt'])]
 techfamilies=[]
 for modelid,names in model_specs:
  ids=[]
  for name in names:
   source=entryfile if gf else root/'libs.ref/sky130_fd_pr/spice'/(name+'__tt.pm3.spice');text=source.read_text();b=bins(section(text,name+'_t') if gf else text)
   if not b:raise ValueError('No real bins '+name)
   polarity='nmos' if 'nfet' in name else 'pmos';fid=modelid+('-n' if polarity=='nmos' else '-p');ids.append(fid)
   family={'id':fid,'polarity':polarity,'modelName':name,'widthUm':{'min':min(x['widthMinUm'] for x in b),'max':max(x['widthMaxUm'] for x in b)},'lengthUm':{'min':min(x['lengthMinUm'] for x in b),'max':max(x['lengthMaxUm'] for x in b)}}
   techfamilies.append(family);catalog['families'][fid]={'bins':b,'source':resource(source),'scope':'Compact-model bin envelope; actual dimensions must match one bin. DRC and generator restrictions apply separately.','drcSources':[resource(root/'libs.tech/klayout/drc/rule_decks/comp.drc'),resource(root/'libs.tech/klayout/drc/rule_decks/poly2.drc')] if gf else [resource(root/'libs.tech/klayout/drc/sky130A.lydrc')]}
  family_sets[modelid]=ids
  model={**option(modelid+'-'+sha(entryfile)[:12],modelid),'modelId':modelid,'technologyId':tech,'sourceHash':sha(entryfile),'deviceFamilyIds':ids,'cornerSections':{'tt':'typical' if gf else 'tt','ff':'ff','ss':'ss','fs':'fs','sf':'sf'},'source':{'kind':'builtin','id':entry,'sha256':sha(entryfile)}}
  catalog['modelProfiles'].append(model);catalog['resources'][modelid]={'root':str(root.resolve()),'entry':entry,'source':resource(entryfile),'simulationUnits':'si' if gf else 'micron','deviceFamilyIds':ids,'cornerSections':model['cornerSections']}
 catalog['technologyProfiles'].append({**option(tech,'GF180MCU A' if gf else 'SKY130 A'),'modelIds':[x[0] for x in model_specs],'deviceFamilies':techfamilies,'operatingBounds':{'supplyVoltageV':{'min':1.62 if gf else 1.4,'max':5.5 if gf else 1.95},'temperatureC':{'min':-40,'max':125 if gf else 100},'groundVoltageV':{'min':-1,'max':1}},'boundsScope':'Registered characterization envelope, not an absolute reliability rating; per-model limits also apply.'})
 for gate in ['inv','nand2','nor2']:
  modelid='gf180-03v3' if gf else 'sky130-01v8-hvt';nf,pf=family_sets[modelid];n,p,l=(1,2,.28) if gf else (.65,1,.15)
  topology=([('MP0',pf,p,['Y','A','VDD','VDD']),('MN0',nf,n,['Y','A','VSS','VSS'])] if gate=='inv' else ([('MP_A',pf,p,['Y','A','VDD','VDD']),('MP_B',pf,p,['Y','B','VDD','VDD']),('MN_A',nf,n,['Y','A','NINT','VSS']),('MN_B',nf,n,['NINT','B','VSS','VSS'])] if gate=='nand2' else [('MP_A',pf,p,['PINT','A','VDD','VDD']),('MP_B',pf,p,['Y','B','PINT','VDD']),('MN_A',nf,n,['Y','A','VSS','VSS']),('MN_B',nf,n,['Y','B','VSS','VSS'])]))
  devices=[{'id':id,'familyId':f,'widthUm':w,'lengthUm':l,'nodes':nodes,'multiplicity':1,'fingers':1,'lockModel':True,'lockBody':True} for id,f,w,nodes in topology]
  id=('gf180' if gf else 'sky130')+'-'+('inverter' if gate=='inv' else gate);ports=['A']+(['B'] if gate!='inv' else [])+['Y','VDD','VSS'];sourcehash=hashlib.sha256(json.dumps(devices,sort_keys=True).encode()).hexdigest()
  catalog['circuitProfiles'].append({**option(id,id),'technologyIds':[tech],'modelIds':[modelid],'source':{'kind':'builtin','id':id,'sha256':sourcehash},'subcircuit': 'dtco_inv' if gf and gate=='inv' else id.replace('-','_'),'ports':ports,'sizingModes':['custom'],'devices':devices,'groups':[{'id':'nmos','deviceIds':[d['id'] for d in devices if d['familyId']==nf]},{'id':'pmos','deviceIds':[d['id'] for d in devices if d['familyId']==pf]}],'arcs':arcs(gate),'layoutIds':['mr-dp-9t','mr-sa-12t','mr-sa-12t-pex'] if gf and gate=='inv' else ['mr-sa-12t'] if gf else ['mr-sa-10t-sky130'],'electricalModes':['schematic','extracted'] if gf and gate=='inv' else ['schematic'],'metricScopes':{'schematic':'Source SPICE transistor transient; generated layout has no electrical parasitics.',**({'extracted':'Validated GF180 inverter completed-GDS capacitance extraction; no wire resistance.'} if gf and gate=='inv' else {})},'truthTable':truth(gate),'gate':gate,'nativeTechnology':'gf180' if gf else 'sky130','layoutToolBounds':{'nmosWidthUm':{'min':.95,'max':1.3,'step':.05},'pmosWidthUm':{'min':1.4,'max':2.6,'step':.05},'lengthUm':{'min':.28,'max':.28}} if gf and gate=='inv' else None})
 lib='gf180mcu_fd_sc_mcu9t5v0' if gf else 'sky130_fd_sc_hd';base=root/'libs.ref'/lib;sp=base/'spice'/(lib+'.spice');text=sp.read_text();lef=base/'lef'/(lib+'.lef');lt=lef.read_text()
 for gate in ['inv','nand2','nor2']:
  for drive in [1,2]:
   cell=lib+'__'+gate+'_'+str(drive);match=re.search(r'(?im)^\.subckt\s+'+cell+r'\s+([^\n]+)\n(.*?)^\.ends[^\n]*',text,re.S|re.M);source=match[0]+'\n';ports=match[1].split();devices=[];modelid='gf180-06v0' if gf else 'sky130-01v8-hvt';nf,pf=family_sets[modelid]
   for line in match[2].splitlines():
    t=line.split()
    if not t or t[0][0].lower() not in ['x','m']:continue
    pars=dict((a.lower(),b) for a,b in re.findall(r'(\w+)\s*=\s*([^\s]+)',line));w=number(pars['w'])*(1e6 if gf else 1);l=number(pars['l'])*(1e6 if gf else 1)
    devices.append({'id':t[0],'familyId':nf if 'nfet' in t[5] else pf,'widthUm':round(w,9),'lengthUm':round(l,9),'nodes':t[1:5],'multiplicity':number(pars.get('m','1')),'fingers':number(pars.get('nf','1')),'sourceInstancePath':cell+'/'+t[0],'lockWidth':True,'lockLength':True,'lockModel':True,'lockBody':True})
   lm=re.search(r'(?m)^MACRO '+cell+r'\s*\n(.*?)^END '+cell,lt,re.S|re.M);size=re.search(r'SIZE\s+(\S+)\s+BY\s+(\S+)',lm[1]);area=float(size[1])*float(size[2])
   resourceinfo={'spiceFile':str(sp),'sourceSubcircuit':cell,'sourceNetlist':source,'sourceHash':sha(sp),'gdsFile':str(base/'gds'/(lib+'.gds')),'lefFile':str(lef),'gdsTop':cell,'areaUm2':area,'libertyFiles':[str(x) for x in sorted((base/'lib').glob('*'+('__tt_025C_3v30.lib' if gf else '__tt_025C_1v80.lib')))],'files':[resource(sp),resource(lef),resource(base/'gds'/(lib+'.gds'))]}
   orfs=Path('/home/duhaochen/rtl2gds-copilot-orchestrator/OpenROAD-flow-scripts/flow/platforms')
   actualgds=orfs/'gf180/gds/9t'/(cell+'.gds') if gf else orfs/'sky130hd/gds/sky130_fd_sc_hd.gds'
   if actualgds.read_bytes()[:4]!=b'\x00\x06\x00\x02':raise ValueError('Not actual GDS '+str(actualgds))
   resourceinfo['gdsFile']=str(actualgds.resolve());resourceinfo['files']=[resource(sp),resource(lef),resource(actualgds)]+[resource(Path(p)) for p in resourceinfo['libertyFiles']]
   cellinputs=['I'] if gf and gate=='inv' else ['A1','A2'] if gf else ['A'] if gate=='inv' else ['A','B'];output='ZN' if gf else 'Y';tt=[{'inputs':{cellinputs[i]:v for i,v in enumerate(row['inputs'].values())},'output':row['output']} for row in truth(gate)]
   aa=[{'id':input+'->'+output,'input':input,'output':output,'transition':'inverting',**({'fixedInputs':{other:1 if gate=='nand2' else 0 for other in cellinputs if other!=input}} if gate!='inv' else {})} for input in cellinputs]
   for custom in [False,True]:
    cid=('custom-from-library:' if custom else '')+cell;ds=[{**d,'lockWidth':not custom,'lockLength':not custom} for d in devices];profile={**option(cid,cid),'technologyIds':[tech],'modelIds':[modelid],'source':{'kind':'standard-cell','id':cell,'sha256':hashlib.sha256(source.encode()).hexdigest()},'subcircuit':cell,'ports':ports,'sizingModes':['custom'] if custom else ['fixed'],'devices':ds,'groups':[{'id':'nmos','deviceIds':[d['id'] for d in ds if d['familyId']==nf]},{'id':'pmos','deviceIds':[d['id'] for d in ds if d['familyId']==pf]}],'arcs':aa,'layoutIds':(['mr-sa-10t-sky130'] if not gf else ['schematic-only']) if custom else ['fixed-library'],'electricalModes':['schematic'],'metricScopes':{'schematic':'Library-derived transistor SPICE with custom dimensions; original fixed GDS/Liberty no longer represents resized devices.' if custom else 'Original fixed standard-cell transistor SPICE; original cell LEF area; no extracted interconnect parasitics.'},'truthTable':tt,'gate':gate,'customFromLibrary':custom,'nativeTechnology':'gf180' if gf else 'sky130'}
    catalog['circuitProfiles'].append(profile);catalog['cellResources'][cid]=resourceinfo
catalog['modelOperatingBounds']={'gf180-03v3':{'supplyVoltageV':{'min':2.7,'max':3.6}},'gf180-06v0':{'supplyVoltageV':{'min':1.62,'max':5.5}},'sky130-01v8-hvt':{'supplyVoltageV':{'min':1.4,'max':1.95}}}
for p in catalog['modelProfiles']:p['operatingBounds']=catalog['modelOperatingBounds'][p['modelId']]
for p in catalog['circuitProfiles']:
 if p['technologyIds']==['sky130A'] and p['sizingModes']==['custom']:p['layoutToolBounds']={'nmosWidthUm':{'min':.65,'max':.85,'step':.05},'pmosWidthUm':{'min':1,'max':1.2,'step':.05},'lengthUm':{'min':.15,'max':.15}}
 p['availableMetrics']=['delayPs','averagePowerW']+(['areaUm2'] if p['layoutIds']!=['schematic-only'] else [])
native=Path('/home/duhaochen/AutoCellGen_TY/proj/autocellgen-MR')
catalog['nativeResources']={'sky130':{'technology':'sky130','projectPath':str(native),'rulesPath':str(native/'config/sky130/rules_sky130.json'),'configPath':str(Path(__file__).resolve().with_name('catalog-sky130-sa10.json')),'files':[resource(native/'build/bin/autocell'),resource(native/'config/sky130/rules_sky130.json'),resource(native/'config/sky130/config_10T.json'),resource(native/'config/template_all_params.json'),resource(Path(__file__).resolve().with_name('catalog-sky130-sa10.json'))],'version':os.popen('git -C '+str(native)+' rev-parse HEAD').read().strip(),'evidence':'Native INV/NAND2/NOR2 generated GDS with boundary81/12; no DRC/LVS/PEX claim.'}}
body=json.dumps(catalog,sort_keys=True,separators=(',',':'));catalog['hash']=hashlib.sha256(body.encode()).hexdigest()
Path(__file__).with_name('catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
print(json.dumps({'version':VERSION,'hash':catalog['hash'],'models':len(catalog['modelProfiles']),'circuits':len(catalog['circuitProfiles'])}))
