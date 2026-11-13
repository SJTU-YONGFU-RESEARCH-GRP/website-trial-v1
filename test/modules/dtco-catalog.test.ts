import { describe,it,expect } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { listDtcoProfiles,resolveDtcoProfile,renderDtcoCircuitSource,validateDtcoDeviceBins,verifyDtcoProfileResources } from "../../server/modules/dtco/catalog.ts";
import { resolveDtcoDimensions } from "../../server/modules/dtco/dimensions.ts";
import type { DtcoExperimentDefinition } from "../../shared/contracts/dtco.ts";
function definition(circuitId:string,technologyId:string):DtcoExperimentDefinition{return {name:"catalog test",circuitId,technologyId,modelVersion:"",temperaturesC:[25],voltagesV:[3.3],layoutIds:["schematic-only"],loadFf:10,inputSlewPs:100,periodNs:10};}
describe("trusted DTCO resource catalog",()=>{
 it("registers compatible multi-technology gates, fixed drives and explicit custom clones",()=>{
  const c=listDtcoProfiles();expect(c.technologyProfiles.map(t=>t.id)).toEqual(["gf180mcuA","sky130A"]);expect(c.modelProfiles).toHaveLength(3);expect(c.circuitProfiles).toHaveLength(30);
  expect(c.circuitProfiles.filter(x=>x.sizingModes.includes("fixed"))).toHaveLength(12);
  expect(()=>resolveDtcoProfile({technologyId:"sky130A",circuitId:"gf180-inverter"})).toThrow(/incompatible/);
  expect(()=>resolveDtcoProfile({technologyId:"gf180mcuA",circuitId:"gf180-inverter",modelId:"gf180-06v0"})).toThrow(/incompatible/);
  expect(JSON.stringify(c)).not.toContain("/home/");expect(Object.isFrozen(c)).toBe(true);
 });
 it("keeps GF fixed HV device dimensions and actual body port order",()=>{
  const p=resolveDtcoProfile({technologyId:"gf180mcuA",circuitId:"gf180mcu_fd_sc_mcu9t5v0__inv_1"});
  expect(p.model.modelId).toBe("gf180-06v0");expect(p.circuit.ports).toEqual(["I","ZN","VDD","VNW","VPW","VSS"]);
  expect(p.circuit.devices.map(d=>[d.widthUm,d.lengthUm])).toEqual([[1.32,.6],[1.83,.5]]);
  expect(p.fixedAreaUm2).toBeCloseTo(11.2896);expect(p.nativeSource).toBeUndefined();expect(p.simulationSource).toContain("pfet_06v0 W=1.830000U L=0.500000U");
  expect(resolveDtcoDimensions(definition(p.circuit.id,p.technology.id),p.technology,p.circuit)).toHaveLength(2);
  expect(()=>resolveDtcoDimensions({...definition(p.circuit.id,p.technology.id),deviceOverrides:{X_i_0:{widthUm:1.5}}},p.technology,p.circuit)).toThrow(/fixed/);
 });
 it("normalizes SKY custom simulation and native dimensions without changing model identity",()=>{
  const p=resolveDtcoProfile({technologyId:"sky130A",circuitId:"sky130-inverter"});
  expect(p.spiceScale).toBe("1u");expect(p.simulationSource).toContain("sky130_fd_pr__nfet_01v8 w=0.65 l=0.15");
  expect(p.simulationSource).toContain("sky130_fd_pr__pfet_01v8_hvt");expect(p.nativeSource).toContain("w=0.65u l=0.15u");
  expect(p.simulationSource).toContain("XMP0");expect(p.circuit.layoutIds).toEqual(["mr-sa-10t-sky130"]);
 });
 it("preserves fixed library source units and enables customization through a separate identity",()=>{
  const cell="sky130_fd_sc_hd__nand2_2",fixed=resolveDtcoProfile({technologyId:"sky130A",circuitId:cell});
  const custom=resolveDtcoProfile({technologyId:"sky130A",circuitId:"custom-from-library:"+cell});
  expect(fixed.simulationSource).toContain("l=150000u");expect(fixed.fixedCellName).toBe(cell);expect(fixed.circuit.devices.every(d=>d.lockWidth&&d.lockLength&&d.lockBody&&d.lockModel)).toBe(true);
  expect(custom.circuit.devices.every(d=>!d.lockWidth&&!d.lockLength&&d.lockBody&&d.lockModel)).toBe(true);
  expect(custom.nativeSource).not.toMatch(/\bVNB\b|\bVPB\b|\bVPWR\b|\bVGND\b/);expect(custom.simulationSource).toContain("VNB");
  expect(custom.fixedGdsPath).toBeUndefined();expect(custom.fixedAreaUm2).toBeUndefined();expect(custom.circuit.layoutIds).toEqual(["mr-sa-10t-sky130"]);
 });
 it("verifies actual fixed GDS resources and native config closure",async()=>{
  for(const [technologyId,circuitId] of [["gf180mcuA","gf180mcu_fd_sc_mcu9t5v0__inv_1"],["sky130A","sky130_fd_sc_hd__nor2_2"],["sky130A","custom-from-library:sky130_fd_sc_hd__nand2_2"]]){
   const p=resolveDtcoProfile({technologyId:technologyId!,circuitId:circuitId!});await expect(verifyDtcoProfileResources(p)).resolves.toBeUndefined();
   if(p.fixedGdsPath)expect((await fs.readFile(p.fixedGdsPath)).subarray(0,4)).toEqual(Buffer.from([0,6,0,2]));
   if(p.nativeSource)expect(p.nativeSource).not.toContain("a_27_47#");
  }
 });
 it("validates every actual source device against its proper family bins",()=>{
  const catalog=listDtcoProfiles();for(const circuit of catalog.circuitProfiles){
   const p=resolveDtcoProfile({technologyId:circuit.technologyIds[0]!,circuitId:circuit.id});
   for(const d of p.circuit.devices)expect(validateDtcoDeviceBins(d.familyId,d.widthUm,d.lengthUm),circuit.id+"/"+d.id).toBe(true);
  }
  expect(validateDtcoDeviceBins("gf180-06v0-n",1.32,.5)).toBe(false);expect(validateDtcoDeviceBins("gf180-06v0-p",1.83,.5)).toBe(true);
 });
 it("retains NAND/NOR arc sensitization and complete truth tables",()=>{
  for(const gate of ["nand2","nor2"]){const p=resolveDtcoProfile({technologyId:"gf180mcuA",circuitId:"gf180-"+gate});
   expect(p.truthTable).toHaveLength(4);expect(p.circuit.arcs).toHaveLength(2);expect(p.circuit.arcs[0]!.fixedInputs).toEqual({B:gate==="nand2"?1:0});
   expect(p.truthTable.find(r=>r.inputs.A===1&&r.inputs.B===0)?.output).toBe(gate==="nand2"?1:0);
  }
 });
 it("renders resolved sizing without changing nodes, bodies or multiplicity",()=>{
  const p=resolveDtcoProfile({technologyId:"sky130A",circuitId:"sky130-nor2"});const d=p.circuit.devices.map(x=>({...x,widthUm:1.2}));
  const source=renderDtcoCircuitSource({...p.circuit,devices:d},p.technology,"micron");expect(source).toContain("PINT A VDD VDD");expect(source).toContain("w=1.2 l=0.15 nf=1 m=1");
 });
 it("rehashes files at preflight and rejects changed contents and symlink escape",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-catalog-"));const outside=await fs.mkdtemp(path.join(os.tmpdir(),"dtco-outside-"));
  try{const file=path.join(root,"model.spice");await fs.writeFile(file,"trusted");const p=resolveDtcoProfile({technologyId:"gf180mcuA",circuitId:"gf180-inverter"});const sha256=createHash("sha256").update("trusted").digest("hex");
   const testProfile={...p,modelRoot:root,sourceFiles:[{source:file,sha256}]};await expect(verifyDtcoProfileResources(testProfile)).resolves.toBeUndefined();
   await fs.writeFile(file,"changed");await expect(verifyDtcoProfileResources(testProfile)).rejects.toThrow(/HASH/);
   const escape=path.join(outside,"escape.spice");await fs.writeFile(escape,"trusted");const link=path.join(root,"link.spice");await fs.symlink(escape,link);
   await expect(verifyDtcoProfileResources({...testProfile,sourceFiles:[{source:link,sha256}]})).rejects.toThrow(/PATH/);
  }finally{await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
 });
});
