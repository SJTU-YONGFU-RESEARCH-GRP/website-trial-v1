import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDeck, getDtcoOptions, hash, modelClosure, pointCoordinates, validatePoint, type DtcoSnapshot } from "../../server/modules/dtco/environment.ts";
import { buildDcDeck, buildNetlist, resolveDesign } from "../../server/modules/dtco/circuit.ts";
import { acgFacade, frozenSnapshot } from "../../server/modules/dtco/planner.ts";
import { verifyFrozenResources } from "../../server/modules/dtco/executor.ts";
import { readDtcoMetrics } from "../../server/modules/dtco/metrics.ts";
const roots:string[]=[];
async function temp(){const root=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-execution-"));roots.push(root);return root;}
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>fs.rm(root,{recursive:true,force:true})));});
const definition={name:"Test",circuitId:"gf180-inverter",technologyId:"gf180mcuA",modelVersion:"typical",temperaturesC:[25],voltagesV:[3.3],layoutIds:["mr-dp-9t"],loadFf:10,inputSlewPs:100,periodNs:10};
const point={temperatureC:25,voltageV:3.3,layoutId:"mr-dp-9t"};
describe("DTCO immutable native execution",()=>{
 it("freezes only physical coordinates from a runtime experiment point",()=>{
  const runtimePoint={...point,status:"queued",attempts:[{jobId:"previous-job"}],jobId:"current-job",id:"point-id"};
  const coordinates=pointCoordinates(runtimePoint);
  expect(coordinates).toEqual(point);
  expect(Object.keys(coordinates).sort()).toEqual(["layoutId","temperatureC","voltageV"]);
  runtimePoint.temperatureC=85;
  expect(coordinates.temperatureC).toBe(25);
  expect(JSON.stringify({coordinates})).not.toMatch(/status|attempts|jobId|point-id/);
 });
 it("rejects invalid and nonfinite physical values and unsupported input paths",()=>{
  expect(()=>validatePoint(definition,point)).not.toThrow();
  for(const voltageV of [NaN,Infinity,0,1.8,3.7])expect(()=>validatePoint(definition,{...point,voltageV})).toThrow();
  expect(()=>validatePoint({...definition,inputSlewPs:2500},point)).toThrow();
  expect(()=>validatePoint({...definition,periodNs:1000,inputSlewPs:1},point)).toThrow(/1,000,000/);
  expect(()=>validatePoint({...definition,periodNs:1000,inputSlewPs:1000},point)).not.toThrow();
  expect(()=>validatePoint(definition,{...point,layoutId:"/tmp/tool"})).toThrow();
 });
 it("freezes recursive model includes, handles self .lib cycles and detects changed content",async()=>{
  const root=await temp();
  await fs.writeFile(path.join(root,"root.sp"),'.lib typical\n.include "child.sp"\n.lib "root.sp" typical\n.endl\n');
  await fs.writeFile(path.join(root,"child.sp"),".model n nmos\n");
  const initial=await modelClosure(root,"root.sp");
  expect(initial.map(f=>f.relativePath)).toEqual(["model/child.sp","model/root.sp"]);
  await fs.writeFile(path.join(root,"child.sp"),".model n nmos level=1\n");
  expect((await modelClosure(root,"root.sp"))[0]!.sha256).not.toBe(initial[0]!.sha256);
 });
 it("keeps the readable model selection available for saving when native tools are unhealthy",async()=>{
  const root=await temp();await fs.writeFile(path.join(root,"root.sp"),".model n nmos\n");
  const configuration={id:"spice",toolId:"dtco-ngspice",rootPath:root,environment:{DTCO_MODEL_FILE:"root.sp"}};
  const repositories={tools:{active:(moduleId:string)=>moduleId==="dtco"?[configuration]:[],latestHealth:()=>null}} as unknown as Parameters<typeof getDtcoOptions>[0];
  const options=await getDtcoOptions(repositories,{} as Parameters<typeof getDtcoOptions>[1]);
  expect(options.available).toBe(false);expect(options.models[0]!.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  expect(options.models[0]!.id).toBe(options.defaults.modelVersion);expect(options.defaults.modelVersion).not.toContain("unconfigured");
 });
 it("rejects include traversal and symlink escape from administrator model root",async()=>{
  const root=await temp(),outside=await temp();
  await fs.writeFile(path.join(outside,"secret.sp"),".model x nmos\n");
  await fs.symlink(path.join(outside,"secret.sp"),path.join(root,"escape.sp"));
  await fs.writeFile(path.join(root,"root.sp"),'.include "escape.sp"\n');
  await expect(modelClosure(root,"root.sp")).rejects.toThrow(/escapes/);
  await fs.writeFile(path.join(root,"root.sp"),'.include "/tmp/arbitrary-model.sp"\n');
  await expect(modelClosure(root,"root.sp")).rejects.toThrow(/Absolute/);
 });
 it("rejects changed trusted executable/model/helper source after preflight",async()=>{
  const root=await temp(),source=path.join(root,"tool");
  await fs.writeFile(source,"original");
  const snapshot={trusted:[{source,relativePath:"tools/native",sha256:hash("original")}]} as DtcoSnapshot;
  await expect(verifyFrozenResources(snapshot)).resolves.toBeUndefined();
  await fs.writeFile(source,"changed");
  await expect(verifyFrozenResources(snapshot)).rejects.toMatchObject({code:"DTCO_RESOURCE_CHANGED"});
 });
 it("preserves real composite plan and runner closure when adapting ACG input roles",()=>{
  const process=()=>{},plan={steps:[{id:"generate"}]},job={operation:"run-dtco",parameters:{voltageV:3.3},plan,inputManifest:{files:[{role:"netlist"},{role:"config"},{role:"rules"},{role:"dtco-resource"}]}};
  const adapted=acgFacade({job,files:job.inputManifest.files,runPlannedProcess:process});
  expect(adapted.runPlannedProcess).toBe(process);expect(adapted.job.plan).toBe(plan);
  expect(adapted.job.operation).toBe("run");expect(adapted.files).toHaveLength(3);
  expect(adapted.job.parameters.engine).toBe("mr");
 });
 it("rejects changed snapshot instead of rebuilding mutable inputs",()=>{
  const data={coordinates:point,trusted:[]},snapshot={...data,snapshotHash:hash(JSON.stringify(data))};
  expect(frozenSnapshot({parameters:{dtcoSnapshot:snapshot}})).toEqual(snapshot);
  snapshot.coordinates={...point,voltageV:3};
  expect(()=>frozenSnapshot({parameters:{dtcoSnapshot:snapshot}})).toThrow(/changed/);
 });
 it("retains parameterized schematic model, temperature, load and actual source current waveform",()=>{
  const deck=buildDeck(definition,point,"sm141064.ngspice");
  expect(deck).toContain('.lib "model/sm141064.ngspice" typical');
  expect(deck).toContain(".temp 25");expect(deck).toContain("CLOAD Y 0 10f");
  expect(deck).toContain('.include "netlist.sp"');expect(deck).toContain("XINV A Y VDD VSS dtco_inv");expect(deck).toContain("i(VDD)");
 });
 it("uses one sized source for native and schematic simulation and retains real DC analysis",()=>{
  const sized={...definition,design:{nmosWidthUm:1.15,pmosWidthUm:2.1}};
  expect(buildNetlist(sized)).toContain("nfet_03v3 w=1.15u l=280n");
  expect(buildNetlist(sized)).toContain("pfet_03v3 w=2.1u l=280n");
  expect(buildDeck(sized,point,"model.sp")).toContain('.include "netlist.sp"');
  expect(buildDcDeck(sized,point,"model.sp")).toContain("dc VIN 0 3.3");
  expect(resolveDesign(definition)).toEqual({nmosWidthUm:1,pmosWidthUm:2,lengthUm:0.28});
  for(const nmosWidthUm of [NaN,0.7,1.01,1.35])expect(()=>resolveDesign({...definition,design:{nmosWidthUm,pmosWidthUm:2}})).toThrow();
  const extracted={...sized,electricalMode:"extracted" as const};
  expect(buildDeck(extracted,{...point,layoutId:"mr-sa-12t-pex"},"model.sp")).toContain('.include "physical/extracted.spice"');
  expect(()=>validatePoint(extracted,point)).toThrow(/extracted/i);
 });
 it("rejects empty, nonfinite or nonpositive measurement data",async()=>{
  const root=await temp();await fs.mkdir(path.join(root,"output/dtco"),{recursive:true});
  const valid={schemaVersion:"dtco.measurements.v1",delayPs:60,delayRisePs:65,delayFallPs:55,averagePowerW:1e-5,energyPerCycleJ:1e-13,areaUm2:7.2576,selectedGdsPath:"output/native/inverter.gds",selectedGdsSha256:"a".repeat(64)};
  for(const change of [{delayPs:null},{averagePowerW:0},{areaUm2:-1},{schemaVersion:"extracted.fixture"}]){
   await fs.writeFile(path.join(root,"output/dtco/metrics.json"),JSON.stringify({...valid,...change}));
   await expect(readDtcoMetrics(root)).rejects.toThrow();
  }
  await fs.writeFile(path.join(root,"output/dtco/metrics.json"),JSON.stringify(valid));
  await expect(readDtcoMetrics(root)).resolves.toMatchObject({areaUm2:7.2576});
  const proof={status:"validated",drcCount:0,drcStyle:"drc(full)",sourceGeometryMatched:true,finalGdsRoundtrip:true,resistanceExtracted:false,devices:[{w:1e-6,l:2.8e-7},{w:2e-6,l:2.8e-7}],capacitorCount:6,validationSha256:"b".repeat(64),electricalNetlistSha256:"c".repeat(64)};
  await fs.writeFile(path.join(root,"output/dtco/metrics.json"),JSON.stringify({...valid,electricalMode:"extracted",extraction:proof,selectedGdsPath:"output/dtco/physical/completed.gds"}));
  await expect(readDtcoMetrics(root)).resolves.toMatchObject({electricalMode:"extracted"});
  for(const extraction of [null,{}, {...proof,drcStyle:"drc(fast)"}, {...proof,drcCount:2}, {...proof,devices:[]}]){
   await fs.writeFile(path.join(root,"output/dtco/metrics.json"),JSON.stringify({...valid,electricalMode:"extracted",extraction}));
   await expect(readDtcoMetrics(root)).rejects.toThrow(/extraction evidence/);
  }
 });
});
