import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {DtcoCircuitProfile,DtcoExperimentDefinition,DtcoModelProfile,DtcoOptimizationDefinition,DtcoOptions,DtcoPointCoordinates,DtcoTechnologyProfile} from "../../shared/contracts/dtco.ts";
import type {JobRecordV1,JsonObject,ResultRecordV1} from "../../shared/contracts/v1.ts";
import {EdaDatabase} from "../../server/app/db/database.ts";
import {makeRepositories} from "../../server/app/db/repositories.ts";
import {StorageService} from "../../server/app/storage/storage.ts";
const mocks=vi.hoisted(()=>({options:vi.fn(),prepare:vi.fn()}));
vi.mock("../../server/modules/dtco/environment.ts",()=>({getDtcoOptions:mocks.options,prepareDtcoJob:mocks.prepare}));
import {DTCO_FREQUENCY_PROTOCOL_VERSION,normalizeDtcoFrequencyResult} from "../../server/modules/dtco/frequencyRead.ts";
import {listDtcoProfiles} from "../../server/modules/dtco/catalog.ts";
import {DtcoPipelineRepository} from "../../server/modules/dtco/pipelineRepository.ts";
import {DtcoService,normalizeDefinition} from "../../server/modules/dtco/service.ts";
import {resolveDtcoDimensions} from "../../server/modules/dtco/dimensions.ts";
import {candidateKey,experimentDefinition,initialCandidate,initialState,nextCandidate} from "../../server/modules/dtco/optimizationAlgorithm.ts";
import {DtcoOptimizationCoordinator,DtcoOptimizationService,measuredResult,normalizeOptimization,optimizationOptions,verifiedToggleFrequency} from "../../server/modules/dtco/optimizationService.ts";
const option=(id:string)=>({id,label:id,available:true,reason:null});
const source={kind:"builtin" as const,id:"trusted",sha256:"a".repeat(64)};
const technology:DtcoTechnologyProfile={...option("tech"),modelIds:["model"],operatingBounds:{supplyVoltageV:{min:1.5,max:2},temperatureC:{min:-40,max:125},groundVoltageV:{min:-.5,max:.5}},deviceFamilies:[
 {id:"n",polarity:"nmos",modelName:"nfet",widthUm:{min:.5,max:3,step:.05},lengthUm:{min:.28,max:1,step:.01}},
 {id:"p",polarity:"pmos",modelName:"pfet",widthUm:{min:.5,max:3,step:.05},lengthUm:{min:.28,max:1,step:.01}}]};
const model:DtcoModelProfile={...option("version"),technologyId:"tech",modelId:"model",sourceHash:source.sha256,source,deviceFamilyIds:["n","p"],cornerSections:{tt:"typical",ss:"slow",ff:"fast"}};
const circuit:DtcoCircuitProfile={...option("custom"),technologyIds:["tech"],modelIds:["model"],source,subcircuit:"cell",ports:["A","Y","VDD","VSS"],sizingModes:["custom","fixed"],devices:[
 {id:"N0",familyId:"n",widthUm:1,lengthUm:.28,nodes:["Y","A","VSS","VSS"]},
 {id:"P0",familyId:"p",widthUm:2,lengthUm:.28,nodes:["Y","A","VDD","VDD"]}],groups:[{id:"pullup",deviceIds:["P0"]}],arcs:[{id:"A-Y",input:"A",output:"Y",transition:"inverting"}],layoutIds:["schematic-only"],electricalModes:["schematic"],metricScopes:{schematic:"source-schematic-v1"},availableMetrics:["delayPs","averagePowerW"]};
const base:DtcoExperimentDefinition={name:"Catalog study",technologyId:"tech",modelVersion:"version",circuitId:"custom",temperaturesC:[25],voltagesV:[1.8],layoutIds:["schematic-only"],loadFf:10,inputSlewPs:100,periodNs:10,electricalMode:"schematic"};
const options:DtcoOptions={circuits:[option("custom")],technologies:[option("tech")],models:[model],layouts:[option("schematic-only")],available:true,unavailableReason:null,tools:[],defaults:base,maxPoints:64,environmentHash:"environment",metricScope:"source-schematic-v1",catalogHash:source.sha256,technologyProfiles:[technology],modelProfiles:[model],circuitProfiles:[circuit],electricalModes:[option("schematic")]};
const roots:string[]=[],databases:EdaDatabase[]=[];
beforeEach(()=>{
 mocks.options.mockResolvedValue(options);
 mocks.prepare.mockImplementation(async(_r:unknown,storage:StorageService,job:JobRecordV1,definition:DtcoExperimentDefinition,coordinates:DtcoPointCoordinates)=>{
  await storage.createWorkspace(job.id);
  const resolvedInputs={catalogHash:source.sha256,technologyId:definition.technologyId,modelVersion:definition.modelVersion,circuitId:definition.circuitId,sourceHashes:{trusted:source.sha256},cornerSection:model.cornerSections[coordinates.processCorner??"tt"]!,operating:{temperatureC:coordinates.temperatureC,voltageV:coordinates.voltageV,groundVoltageV:coordinates.groundVoltageV??0,processCorner:coordinates.processCorner??"tt"},devices:resolveDtcoDimensions(definition,technology,circuit),arcId:"A-Y"};
  return {inputManifest:job.inputManifest,parameters:{dtcoSnapshot:{definition,coordinates:{temperatureC:coordinates.temperatureC,voltageV:coordinates.voltageV,layoutId:coordinates.layoutId,...(coordinates.groundVoltageV!==undefined?{groundVoltageV:coordinates.groundVoltageV}:{}),...(coordinates.processCorner?{processCorner:coordinates.processCorner}:{})},environmentHash:"environment",metricScope:"source-schematic-v1",resolvedInputs}},capabilityVersion:"unit",toolConfigurations:[],toolVersions:{},plan:{schemaVersion:"eda.job-plan.v1",capabilityVersion:"unit",steps:[{id:"measure",name:"Measure",description:"",required:true,weight:1,process:null,inputRoles:[],outputRoles:[]}],sweep:null,warnings:[]}};
 });
});
afterEach(async()=>{for(const db of databases.splice(0))db.close();await Promise.all(roots.splice(0).map(root=>fs.rm(root,{recursive:true,force:true})));});
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-conditions-"));roots.push(root);
 const filename=path.join(root,"db.sqlite"),db=new EdaDatabase(filename);db.migrate();databases.push(db);
 const repositories=makeRepositories(db),user=repositories.users.create({username:"condition-owner",password:"strong-password"});
 const storage=new StorageService(path.join(root,"storage"));await storage.initialize();
 const dtco=new DtcoService(repositories.dtco,repositories,storage),service=new DtcoOptimizationService(repositories,storage);
 return {db,repositories,user,storage,dtco,service,coordinator:new DtcoOptimizationCoordinator(service)};
}
function optimization(overrides:Partial<DtcoOptimizationDefinition>={}):DtcoOptimizationDefinition{
 return {...optimizationOptions(options).defaults,...base,temperatureC:25,voltageV:1.8,electricalMode:"schematic",parameterAxes:{"device:P0:widthUm":{min:1.4,max:2.6,initial:2,step:.6}},processCorners:["tt"],objective:{metric:"averagePowerW"},maxIterations:5,patience:5,...overrides};
}
function commitMeasurement(f:Awaited<ReturnType<typeof fixture>>,id:string,power:number,frequencyHz?:number):ResultRecordV1{
 const run=f.repositories.dtcoOptimizations.get(id)!,iteration=run.iterations.at(-1)!,job=f.repositories.jobs.get(iteration.jobId!)!;
 f.repositories.jobs.claim("dtco");
 const at=new Date().toISOString(),snapshot=job.parameters.dtcoSnapshot as JsonObject;
 const result:ResultRecordV1={schemaVersion:"eda.result.v1",id:randomUUID(),moduleId:"dtco",ownerId:run.ownerId,lifecycle:"private",title:"Unit-only committed measurement",summary:{},data:{dtco:{electricalMode:"schematic",resolvedInputs:structuredClone(snapshot.resolvedInputs!),metricScope:snapshot.metricScope!,metrics:{delayPs:100,averagePowerW:power,areaUm2:null},provenance:{extraction:{status:"unavailable"},outputHashes:{}}}},provenance:{origin:"computed",jobId:job.id,ownerId:run.ownerId,inputManifestSha256:createHash("sha256").update(JSON.stringify(job.inputManifest)).digest("hex"),parameters:job.parameters,capabilityVersion:job.capabilityVersion,toolConfigurations:[],toolVersions:{},parserId:"unit",parserVersion:"1",createdAt:at},artifactIds:[],createdAt:at,updatedAt:at,publishedAt:null};
 if(frequencyHz!==undefined) {const evidence=frequencyEvidence(frequencyHz,experimentDefinition(run.definition,iteration.candidate));const data=result.data.dtco as JsonObject;data.frequency=evidence.frequency;data.metrics={...(data.metrics as JsonObject),maxFrequencyHz:frequencyHz};(data.provenance as JsonObject).outputHashes=evidence.hashes;}
 f.repositories.jobs.transaction(()=>{f.repositories.results.insert(result);f.repositories.jobs.transition(job.id,"succeeded",{resultId:result.id});});return result;
}
function frequencyEvidence(hz:number,definition:DtcoExperimentDefinition){
 const hashes:Record<string,string>={"output/dtco/frequency.json":"f".repeat(64)};
 const rounds=["pass","fail"].map((status,i)=>{const arc:JsonObject={status,simulatorExitCode:0};for(const prefix of ["waveform","log","deck","processEvidence"]){const path="output/dtco/"+i+"-"+prefix;hashes[path]="a".repeat(64);arc[prefix+"Path"]=path;arc[prefix+"Sha256"]=hashes[path]!;}return {protocolVersion:DTCO_FREQUENCY_PROTOCOL_VERSION,status,frequencyHz:hz+i*hz/100,arcs:[arc]};});
 const frequency:JsonObject={protocolVersion:DTCO_FREQUENCY_PROTOCOL_VERSION,status:"bracketed",maximumVerifiedToggleFrequencyHz:hz,lowestVerifiedFailFrequencyHz:hz+hz/100,bracketWidthHz:hz/100,toleranceMet:true,upperBoundNotFound:false,scope:"combinational_cell_arc_toggle; not chip_clock_Fmax",evidencePath:"output/dtco/frequency.json",conditions:{temperatureC:definition.temperaturesC[0]!,voltageV:definition.voltagesV[0]!,groundVoltageV:definition.groundVoltagesV?.[0]??0,corner:definition.processCorners?.[0]??"tt",loadFf:definition.loadFf,inputSlewPs:definition.inputSlewPs},rounds};
 return {hashes,frequency};
}
describe("catalog operating conditions and immutable sizing",()=>{
 it("accepts only the registered legacy alias together with actual catalog profiles",()=>{
  const catalog=listDtcoProfiles(),canonical=catalog.modelProfiles.find(model=>model.modelId==="gf180-03v3")!,alias={...canonical,id:"gf180-typical-012345abcdef"};
  const actual:DtcoOptions={...options,...catalog,technologies:catalog.technologyProfiles,circuits:catalog.circuitProfiles,models:[alias,...catalog.modelProfiles],modelProfiles:[alias,...catalog.modelProfiles],layouts:[option("mr-sa-12t")]};
  const definition={...base,technologyId:"gf180mcuA",modelVersion:alias.id,circuitId:"gf180-inverter",voltagesV:[3.3],layoutIds:["mr-sa-12t"]};
  expect(normalizeDefinition(definition,actual).modelVersion).toBe(alias.id);
  expect(()=>normalizeDefinition({...definition,modelVersion:"gf180-typical-ffffffffffff"},actual)).toThrow(/compatible/);
 });
 it("validates differential supply, model corners, temperatures, compatibility and mode",()=>{
  expect(normalizeDefinition({...base,voltagesV:[2.1],groundVoltagesV:[.2],processCorners:["ss","tt","ss"]},options).processCorners).toEqual(["ss","tt"]);
  for(const change of [{voltagesV:[2.1],groundVoltagesV:[0]},{voltagesV:[1.8],groundVoltagesV:[.5]},{groundVoltagesV:[NaN]},{temperaturesC:[126]},{processCorners:["fs"]},{electricalMode:"extracted"},{deviceOverrides:{unknown:{widthUm:1}}}])expect(()=>normalizeDefinition({...base,...change},options)).toThrow();
  const narrow={...options,modelProfiles:[{...model,operatingBounds:{supplyVoltageV:{min:1.7,max:1.9}}}]};
  expect(()=>normalizeDefinition({...base,voltagesV:[1.6]},narrow)).toThrow();
 });
 it("expands all conditions, keeps legacy-default point keys and reuses prior attempts",async()=>{
  const f=await fixture(),first=await f.dtco.save(f.user.id,base);await f.dtco.submit(first.id);
  const defaults=await f.dtco.save(f.user.id,{...base,groundVoltagesV:[0],processCorners:["tt"]},first.id);
  expect(defaults.points[0]!.key).toBe(first.points[0]!.key);expect(defaults.points[0]!.attempts).toHaveLength(1);
  const expanded=await f.dtco.save(f.user.id,{...base,temperaturesC:[25,85],groundVoltagesV:[0,.1],processCorners:["tt","ss","ff"]},first.id);
  expect(expanded.points).toHaveLength(12);expect(expanded.points.find(point=>point.key===first.points[0]!.key)!.attempts).toHaveLength(1);
  await f.dtco.submit(first.id);expect(mocks.prepare).toHaveBeenCalledTimes(12);
  expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(12);
  expect(mocks.prepare.mock.calls.some(call=>call[4].groundVoltageV===.1&&call[4].processCorner==="ff")).toBe(true);
  await expect(f.dtco.save(f.user.id,{...base,temperaturesC:Array.from({length:12},(_,i)=>i),groundVoltagesV:[0,.1],processCorners:["tt","ss","ff"]})).rejects.toMatchObject({code:"DTCO_POINT_LIMIT"});
 });
 it("resolves group and per-device lengths, rejects conflicts, fixed mutations and immutable lock removal",()=>{
  const definition={...base,groupOverrides:{pullup:{widthUm:2.5}},deviceOverrides:{N0:{lengthUm:.5,lockLength:true}}};
  const devices=resolveDtcoDimensions(definition,technology,circuit);
  expect(devices.map(device=>[device.widthUm,device.lengthUm])).toEqual([[1,.5],[2.5,.28]]);
  devices[0]!.nodes[0]="changed";expect(circuit.devices[0]!.nodes[0]).toBe("Y");
  for(const invalid of [{deviceOverrides:{N0:{widthUm:NaN}}},{deviceOverrides:{N0:{widthUm:null}}},{sizingMode:"fixed" as const,deviceOverrides:{N0:{widthUm:1.1}}},{groupOverrides:{pullup:{widthUm:2.5}},deviceOverrides:{P0:{widthUm:2.2}}},{deviceOverrides:{N0:{lengthUm:.285}}}])expect(()=>resolveDtcoDimensions({...base,...invalid},technology,circuit)).toThrow();
  const locked={...circuit,devices:circuit.devices.map(device=>({...device,lockWidth:true}))};
  expect(()=>resolveDtcoDimensions({...base,deviceOverrides:{N0:{lockWidth:false}}},technology,locked)).toThrow();
 });
 it("uses bin rectangles rather than envelope bounds and applies native geometry limits to area-producing schematic flows",()=>{
  const bins={...technology,deviceFamilies:technology.deviceFamilies.map(family=>({...family,dimensionBins:[{widthUm:{min:.5,max:1},lengthUm:{min:.28,max:1}},{widthUm:{min:2,max:3},lengthUm:{min:.28,max:1}}]}))};
  expect(()=>resolveDtcoDimensions({...base,deviceOverrides:{N0:{widthUm:1.5}}},bins,circuit)).toThrow();
  const areaCircuit={...circuit,availableMetrics:["delayPs","averagePowerW","areaUm2"] as const,layoutToolBounds:{lengthUm:{min:.28,max:.28}}};
  expect(()=>resolveDtcoDimensions({...base,deviceOverrides:{N0:{lengthUm:.5}}},technology,{...areaCircuit,availableMetrics:[...areaCircuit.availableMetrics]})).toThrow();
  expect(resolveDtcoDimensions({...base,groupOverrides:{pullup:{widthUm:2.5}},deviceOverrides:{P0:{widthUm:2.5,lengthUm:.5,lockLength:true}}},technology,circuit)[1]).toMatchObject({widthUm:2.5,lengthUm:.5,lockLength:true});
 });
 it("rejects mixed-length or nonunit native geometry at save while preserving schematic and fixed inventories",async()=>{
  const f=await fixture(),nativeCircuit={...circuit,layoutIds:["native"],availableMetrics:["delayPs","averagePowerW","areaUm2"] as const};
  const nativeOptions={...options,circuitProfiles:[{...nativeCircuit,availableMetrics:[...nativeCircuit.availableMetrics]}],layouts:[option("native")]};
  mocks.options.mockResolvedValue(nativeOptions);
  await expect(f.dtco.save(f.user.id,{...base,layoutIds:["native"],deviceOverrides:{N0:{lengthUm:.5}}})).rejects.toThrow(/uniform channel length/);
  expect(f.repositories.dtco.list(f.user.id)).toHaveLength(0);expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(0);
  for(const property of ["fingers","multiplicity"] as const)expect(()=>resolveDtcoDimensions({...base,layoutIds:["native"]},technology,{...circuit,devices:circuit.devices.map(device=>({...device,[property]:2}))})).toThrow(/unit-multiplicity/);
  expect(resolveDtcoDimensions({...base,layoutIds:["native"],groupOverrides:{pullup:{lengthUm:.5}},deviceOverrides:{N0:{lengthUm:.5}}},technology,circuit).map(device=>device.lengthUm)).toEqual([.5,.5]);
  expect(resolveDtcoDimensions({...base,deviceOverrides:{N0:{lengthUm:.5}}},technology,circuit).map(device=>device.lengthUm)).toEqual([.5,.28]);
  expect(resolveDtcoDimensions({...base,layoutIds:["fixed-library"]},technology,{...circuit,devices:circuit.devices.map((device,index)=>({...device,lengthUm:index ? .5 : .6,fingers:2,multiplicity:2}))})).toHaveLength(2);
 });
 it("validates generic axes against locks, grid, corners, differential rail endpoints and objective capabilities",()=>{
  expect(normalizeOptimization(optimization(),options).parameterAxes!["device:P0:widthUm"]!.initial).toBe(2);
  expect(normalizeOptimization(optimization({parameterAxes:{temperatureC:{min:-20,max:100,initial:25,step:20},voltageV:{min:1.6,max:1.9,initial:1.8,step:.1}}}),options).parameterAxes!.voltageV!.min).toBe(1.6);
  for(const overrides of [{sizingMode:"fixed" as const},{deviceOverrides:{P0:{lockWidth:true}}},{parameterAxes:{"device:P0:lengthUm":{min:.28,max:.5,initial:.28,step:.005}}},{processCorners:["fs"]},{processCorners:["tt","ff"]},{objective:{metric:"areaUm2"}},{parameterAxes:{voltageV:{min:1.8,max:2,initial:1.8,step:.1},groundVoltageV:{min:-.5,max:0,initial:0,step:.1}}}])expect(()=>normalizeOptimization({...optimization(),...overrides},options)).toThrow();
 });
 it("propagates generic device, group, rail and temperature candidates into real experiment definitions",()=>{
  const definition=normalizeOptimization(optimization({parameterAxes:{"group:pullup:lengthUm":{min:.28,max:.5,initial:.4,step:.02},temperatureC:{min:25,max:85,initial:25,step:30},groundVoltageV:{min:0,max:.1,initial:.1,step:.1},voltageV:{min:1.8,max:1.9,initial:1.9,step:.1}}}),options);
  const candidate=initialCandidate(definition),experiment=experimentDefinition(definition,candidate);
  expect(experiment).toMatchObject({groundVoltagesV:[.1],voltagesV:[1.9],temperaturesC:[25],groupOverrides:{pullup:{lengthUm:.4}}});
  expect(experiment.design).toBeUndefined();
  expect(resolveDtcoDimensions(experiment,technology,circuit)[1]!.lengthUm).toBe(.4);
 });
 it("keeps process corner fixed and never claims a process scenario change as design improvement",()=>{
  const definition=normalizeOptimization(optimization({processCorners:["ss"],parameterAxes:{temperatureC:{min:25,max:25,initial:25,step:1}}}),options);
  const baseline=initialCandidate(definition),visited=new Set([candidateKey(baseline)]);
  expect(baseline.processCorner).toBe("ss");
  expect(nextCandidate(definition,baseline,initialState(definition),visited)).toBeNull();
  expect(()=>normalizeOptimization(optimization({processCorners:["tt","ff"]}),options)).toThrow(/one fixed process corner/);
 });
 it("uses committed schematic feedback to retain best and reverse direction at a fixed process corner",async()=>{
  const f=await fixture(),run=await f.service.create(f.user.id,randomUUID(),optimization());await f.service.start(run.id);
  const seen:number[]=[];
  for(const power of [100,120,90]) {
    await f.coordinator.tick();
    const current=f.repositories.dtcoOptimizations.get(run.id)!,candidate=current.iterations.at(-1)!.candidate;
    seen.push(candidate.parameters!["device:P0:widthUm"]!);
    commitMeasurement(f,run.id,power);await f.coordinator.tick();
  }
  const current=f.repositories.dtcoOptimizations.get(run.id)!;
  expect(seen).toEqual([2,2.6,1.4]);expect(current.bestScore).toBe(90);
  expect(current.iterations.slice(0,3).map(iteration=>iteration.accepted)).toEqual([true,false,true]);
  expect(current.iterations[2]!.baseIterationId).toBe(current.iterations[0]!.id);
  expect(current.iterations.every(iteration=>iteration.candidate.processCorner==="tt")).toBe(true);
  expect(current.status).toBe("completed");
  expect(current.iterations[0]!.metrics!.areaUm2).toBeNull();
  expect(f.repositories.jobs.list({moduleId:"dtco"})).toHaveLength(3);
 });
 it("maximizes genuinely bracketed toggle frequency and interprets target in measured Hz",async()=>{
  const f=await fixture(),created=await f.service.create(f.user.id,randomUUID(),optimization({objective:{metric:"maxFrequencyHz",target:1.1e9}}));await f.service.start(created.id);
  for(const hz of [1e9,.9e9,1.2e9]) {await f.coordinator.tick();commitMeasurement(f,created.id,100,hz);await f.coordinator.tick();}
  const run=f.repositories.dtcoOptimizations.get(created.id)!;
  expect(run.iterations.map(iteration=>iteration.metrics!.maxFrequencyHz)).toEqual([1e9,.9e9,1.2e9]);
  expect(run.iterations.map(iteration=>iteration.accepted)).toEqual([true,false,true]);
  expect(run.bestScore).toBeCloseTo(1/1.2e9,15);expect(run.iterations[2]!.relativeImprovement).toBeCloseTo(.2);
  expect(run.status).toBe("completed");expect(run.stopReason).toBe("target_reached");
 });
 it("rejects capped, unknown, unverified or condition-mismatched frequency claims",()=>{
  const evidence=frequencyEvidence(1e9,base);expect(verifiedToggleFrequency(evidence.frequency,evidence.hashes,base)).toBe(1e9);
  for(const mutate of [(f:JsonObject)=>{f.status="upper_bound_not_found";},(f:JsonObject)=>{f.maximumVerifiedToggleFrequencyHz=null;},(f:JsonObject)=>{f.toleranceMet=false;},(f:JsonObject)=>{(f.conditions as JsonObject).corner="ff";},(f:JsonObject)=>{(f.rounds as JsonObject[])[0]!.arcs=[];},(f:JsonObject)=>{((((f.rounds as JsonObject[])[1]!).arcs as JsonObject[])[0]!).simulatorExitCode=1;},(f:JsonObject)=>{((((f.rounds as JsonObject[])[0]!).arcs as JsonObject[])[0]!).waveformSha256="b".repeat(64);}]) {const changed=structuredClone(evidence.frequency);mutate(changed);expect(()=>verifiedToggleFrequency(changed,evidence.hashes,base)).toThrow(/real pass\/fail bracket/);}
  expect(()=>verifiedToggleFrequency(evidence.frequency,{},base)).toThrow();
 });
 it("hides terminal DTCO measurements and blocks optimizer decisions until the durable pipeline is complete",async()=>{
  const f=await fixture(),created=await f.service.create(f.user.id,randomUUID(),optimization());await f.service.start(created.id);await f.coordinator.tick();
  const result=commitMeasurement(f,created.id,100),experiment=f.repositories.dtco.get(created.experimentId)!,point=experiment.points[0]!,attempt=point.attempts[0]!;
  const pipelineRepository=new DtcoPipelineRepository(f.repositories),graph=pipelineRepository.reserve({experiment,point,attempt});
  expect(pipelineRepository.reserve({experiment,point,attempt}).id).toBe(graph.id);
  const pending=f.repositories.dtco.get(experiment.id)!.points[0]!;
  expect(pending.status).toBe("queued");expect(pending.metrics).toBeNull();expect(pending.resultId).toBeNull();expect(pending.attempts[0]!.pipeline!.nodes).toHaveLength(4);
  const run=f.repositories.dtcoOptimizations.get(created.id)!;run.definition.workflow="integrated";
  expect(()=>measuredResult(run,result,f.repositories)).toThrow(/all child results/);
  await f.coordinator.tick();expect(f.repositories.dtcoOptimizations.get(created.id)!.iterations).toHaveLength(1);
  pipelineRepository.finish(graph.id,"failed");expect(f.repositories.dtco.get(experiment.id)!.points[0]!.status).toBe("failed");
 });
 it("rejects altered effective dimensions, operating conditions, metric scope and unproven schematic fallback before scoring",async()=>{
  const f=await fixture(),created=await f.service.create(f.user.id,randomUUID(),optimization());await f.service.start(created.id);await f.coordinator.tick();
  const result=commitMeasurement(f,created.id,100),run=f.repositories.dtcoOptimizations.get(created.id)!;
  expect(measuredResult(run,result,f.repositories).metrics).toEqual({delayPs:100,averagePowerW:100,areaUm2:null});
  for(const mutate of [
    (data:JsonObject)=>{((data.resolvedInputs as JsonObject).operating as JsonObject).temperatureC=85;},
    (data:JsonObject)=>{(((data.resolvedInputs as JsonObject).devices as JsonObject[])[0]!).lengthUm=.5;},
    (data:JsonObject)=>{data.metricScope="extracted";},
    (data:JsonObject)=>{data.electricalMode="extracted";},
    (data:JsonObject)=>{delete data.resolvedInputs;},
  ]) {const changed=structuredClone(result);mutate(changed.data.dtco as JsonObject);expect(()=>measuredResult(run,changed,f.repositories)).toThrow();}
 });
});

describe("superseded frequency scientific read views",()=>{
 it("invalidates only old DTCO frequency views, retaining raw records, scalar diagnostics and artifact references",async()=>{
  const f=await fixture(),created=await f.service.create(f.user.id,randomUUID(),optimization());await f.service.start(created.id);await f.coordinator.tick();
  const result=commitMeasurement(f,created.id,1e-6,1e9),data=result.data.dtco as JsonObject,frequency=data.frequency as JsonObject;
  delete frequency.protocolVersion;result.summary.maxFrequencyHz=1e9;
  const raw=JSON.stringify(result);f.db.sqlite.prepare("UPDATE dtco_results SET record_json=? WHERE id=?").run(raw,result.id);
  const viewed=normalizeDtcoFrequencyResult(result),read=f.repositories.results.get("dtco",result.id,f.user.id,false)!;
  expect(JSON.stringify(result)).toBe(raw);expect(viewed).not.toBe(result);
  expect(normalizeDtcoFrequencyResult(viewed)).toBe(viewed);
  const mislabeled=structuredClone(result);((mislabeled.data.dtco as JsonObject).frequency as JsonObject).status="superseded_protocol";expect(normalizeDtcoFrequencyResult(mislabeled).summary.maxFrequencyHz).toBeNull();
  for(const normalized of [viewed,read,...f.repositories.results.list("dtco",f.user.id,false),...f.repositories.results.query("dtco",f.user.id,false,{})]){
   const dtco=normalized.data.dtco as JsonObject,metrics=dtco.metrics as JsonObject,provenance=dtco.provenance as JsonObject;
   expect(normalized.summary.maxFrequencyHz).toBeNull();expect(metrics.maxFrequencyHz).toBeNull();expect(metrics.frequencyStatus).toBe("superseded_protocol");
   expect((dtco.frequency as JsonObject).status).toBe("superseded_protocol");
   expect(provenance.frequencyProtocolDiagnostics).toMatchObject({reportedMaximumVerifiedToggleFrequencyHz:1e9,reportedMetricMaxFrequencyHz:1e9,evidencePath:"output/dtco/frequency.json"});
  }
  expect(f.repositories.dtco.get(created.experimentId)!.points[0]!.metrics).toMatchObject({maxFrequencyHz:null,frequencyStatus:"superseded_protocol"});
  expect(f.db.sqlite.prepare("SELECT record_json FROM dtco_results WHERE id=?").get(result.id)).toEqual({record_json:raw});
  const other={...result,moduleId:"benchmark" as const};expect(normalizeDtcoFrequencyResult(other)).toBe(other);
 });
 it("retains the current protocol and rejects missing or old selected-round protocol when scoring",async()=>{
  const f=await fixture(),created=await f.service.create(f.user.id,randomUUID(),optimization());await f.service.start(created.id);await f.coordinator.tick();
  const current=commitMeasurement(f,created.id,1e-6,1e9);expect(normalizeDtcoFrequencyResult(current)).toBe(current);
  expect(f.repositories.results.get("dtco",current.id,f.user.id,false)).toEqual(current);
  for(const version of [undefined,"dtco.transient-toggle.v1"]){
   const evidence=frequencyEvidence(1e9,base);if(version===undefined)delete evidence.frequency.protocolVersion;else evidence.frequency.protocolVersion=version;
   expect(()=>verifiedToggleFrequency(evidence.frequency,evidence.hashes,base)).toThrow(/superseded protocol/);
  }
  const mixed=frequencyEvidence(1e9,base);delete (mixed.frequency.rounds as JsonObject[])[0]!.protocolVersion;
  expect(()=>verifiedToggleFrequency(mixed.frequency,mixed.hashes,base)).toThrow(/superseded protocol/);
 });
 it("preserves completed workflow history but hides superseded frequency scores and best decisions without rewriting evaluations",async()=>{
  const f=await fixture(),created=await f.service.create(f.user.id,randomUUID(),optimization({objective:{metric:"maxFrequencyHz"},maxIterations:1}));
  await f.service.start(created.id);await f.coordinator.tick();commitMeasurement(f,created.id,1e-6,1e9);await f.coordinator.tick();
  const completed=f.repositories.dtcoOptimizations.get(created.id)!;expect(completed.status).toBe("completed");expect(completed.bestScore).toBe(1e-9);
  const iteration=completed.iterations[0]!,row=f.db.sqlite.prepare("SELECT evaluation_json FROM dtco_optimization_iterations WHERE id=?").get(iteration.id) as {evaluation_json:string};
  const old=JSON.parse(row.evaluation_json);delete old.provenance.frequencyProtocolVersion;const raw=JSON.stringify(old);
  f.db.sqlite.prepare("UPDATE dtco_optimization_iterations SET evaluation_json=? WHERE id=?").run(raw,iteration.id);
  const viewed=f.repositories.dtcoOptimizations.get(created.id)!;
  expect(viewed.status).toBe("completed");expect(viewed.bestScore).toBeNull();expect(viewed.bestIterationId).toBeNull();
  expect(viewed.iterations[0]).toMatchObject({score:null,accepted:null,relativeImprovement:null,significantImprovement:null,feasible:false,metrics:{maxFrequencyHz:null},error:{code:"DTCO_FREQUENCY_SUPERSEDED_PROTOCOL"},provenance:{frequencyProtocolDiagnostics:{reportedScore:1e-9,reportedAccepted:true,reportedMetricMaxFrequencyHz:1e9,reportedBestIterationId:iteration.id}}});
  expect(f.repositories.dtcoOptimizations.get(created.id)).toEqual(viewed);
  expect(f.db.sqlite.prepare("SELECT evaluation_json FROM dtco_optimization_iterations WHERE id=?").get(iteration.id)).toEqual({evaluation_json:raw});
 });
});
