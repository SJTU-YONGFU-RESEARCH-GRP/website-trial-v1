import {selectionExamples,SELECTION_LIBRARY_ID,SELECTION_LIBRARY_SHA256} from "../../server/modules/dtco/selection.ts";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {afterEach,describe,it,expect} from "vitest";
import {mergePhysicalResult,selectionCompleteness,selectionSourceContents} from "../../server/modules/dtco/selectionPhysical.ts";
import type {SelectionResult} from "../../shared/contracts/dtcoSelection.ts";
const sha=(v:Buffer|string)=>createHash("sha256").update(v).digest("hex");
const roots:string[]=[];afterEach(async()=>{await Promise.all(roots.splice(0).map(r=>fs.rm(r,{recursive:true,force:true})));});
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"selection-physical-"));roots.push(root);
 const dir="output/selection/eval-0000/",prefix=dir+"physical/";await fs.mkdir(path.join(root,prefix),{recursive:true});
 const timing={schemaVersion:"dtco.cell-selection.result.v1",scope:"pre-layout",limitations:[],evaluations:[{id:"eval-0000",cells:{u:"inv_1"},assignment:{u:1},artifacts:{netlist:dir+"mapped.v",constraints:dir+"constraints.sdc"}}]} as unknown as SelectionResult;
 const files:Record<string,Buffer|string>={[dir+"mapped.v"]:"mapped cell",[dir+"constraints.sdc"]:"constraints",[prefix+"routed.gds"]:Buffer.concat([Buffer.from([0,6,0,2,0,3]),Buffer.alloc(128)]),[prefix+"routed.def"]:"COMPONENTS 1 ; END COMPONENTS NETS 1 ; END NETS END DESIGN",[prefix+"route-drc.rpt"]:""};
 const checks={exactAssignment:true,routeComplete:true,legalPlacement:true,powerConnected:true,missingMasters:0,drcViolations:0,gdsPlacementMatches:true,defGeometryMatches:true,masterGeometryMatches:true,functionalInstances:{u:"inv_1"}};
 files[prefix+"validation.json"]=JSON.stringify(checks);
 for(const [p,b] of Object.entries(files))await fs.writeFile(path.join(root,p),b);
 await fs.writeFile(path.join(root,"output/selection/result.json"),JSON.stringify(timing));
 const physical={id:"eval-0000",status:"succeeded",scope:"routed",sourceNetlistSha256:sha(files[dir+"mapped.v"]!),sourceConstraintsSha256:sha(files[dir+"constraints.sdc"]!),assignment:{u:1},checks,artifacts:{gdsPath:prefix+"routed.gds",defPath:prefix+"routed.def",routeReportPath:prefix+"route-drc.rpt",validationPath:prefix+"validation.json"},hashes:Object.fromEntries(Object.entries(files).filter(([p])=>p.startsWith(prefix)).map(([p,b])=>[p,sha(b)]))};
 const manifest={schemaVersion:"dtco.cell-selection.physical.v1",status:"complete",sourceTimingSha256:sha(JSON.stringify(timing)),evaluations:[physical]};
 const save=()=>fs.writeFile(path.join(root,"output/selection/physical-result.json"),JSON.stringify(manifest));await save();return {root,timing,physical,manifest,save,prefix};
}
describe("selection physical publication gate",()=>{
 it("accepts complete evidence including the empty zero-violation router report",async()=>{const f=await fixture();const merged=await mergePhysicalResult(f.root,f.timing);expect(merged.schemaVersion).toBe("dtco.cell-selection.result.v2");expect(merged.completeness?.status).toBe("complete");});
 it("rejects missing GDS and modified GDS even when a success flag remains",async()=>{const f=await fixture();await fs.rm(path.join(f.root,f.physical.artifacts.gdsPath));await expect(mergePhysicalResult(f.root,f.timing)).rejects.toThrow();});
 it("rejects a bad GDS header with a matching file hash",async()=>{const f=await fixture(),bad=Buffer.alloc(140);await fs.writeFile(path.join(f.root,f.physical.artifacts.gdsPath),bad);f.physical.hashes[f.physical.artifacts.gdsPath]=sha(bad);await f.save();await expect(mergePhysicalResult(f.root,f.timing)).rejects.toThrow("GDSII");});
 it.each(["assignment","functionalInstances","routeComplete","validation","hash","prefix","constraint","timing","geometry"] as const)("rejects changed %s evidence",async mutation=>{const f=await fixture();if(mutation==="assignment")f.physical.assignment.u=2;if(mutation==="functionalInstances")f.physical.checks.functionalInstances.u="inv_2";if(mutation==="routeComplete")f.physical.checks.routeComplete=false;if(mutation==="validation")await fs.writeFile(path.join(f.root,f.physical.artifacts.validationPath),"{}");if(mutation==="hash")f.physical.hashes[f.physical.artifacts.gdsPath]="a".repeat(64);if(mutation==="prefix")f.physical.artifacts.gdsPath="output/selection/other/physical/routed.gds";if(mutation==="constraint")f.physical.sourceConstraintsSha256="a".repeat(64);if(mutation==="geometry")f.physical.checks.defGeometryMatches=false;if(mutation==="timing")f.manifest.sourceTimingSha256="a".repeat(64);await f.save();await expect(mergePhysicalResult(f.root,f.timing)).rejects.toThrow();});
 it("keeps legacy successful timing evidence archived and preserves completion source links",async()=>{const f=await fixture(),job:any={status:"succeeded",parameters:{dtcoSelectionSnapshot:{source:{jobId:"source-job",resultId:"source-result"}}}};expect(selectionCompleteness(job,f.timing)).toEqual({status:"timing-only",missingStages:["routed-layout"],sourceJobId:"source-job",sourceResultId:"source-result"});const completed=await mergePhysicalResult(f.root,f.timing);expect(selectionCompleteness(job,completed).status).toBe("complete");});
});

describe("historical selection source bindings",()=>{
 async function sourceFixture(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"selection-source-"));roots.push(root);
  const request=structuredClone(selectionExamples[0]!.request),assignment=Object.fromEntries(request.circuit.instances.map(i=>[i.id,i.initialDrive])),families={INV:"inv",NAND:"nand2",NOR:"nor2",AND:"and2",DFF:"dffq"};
  const raw={schemaVersion:"dtco.cell-selection.result.v1",status:"ok",request,bestEvaluationId:"eval-0000",baselineEvaluationId:"eval-0000",evaluations:[{id:"eval-0000",assignment,cells:Object.fromEntries(request.circuit.instances.map(i=>[i.id,"gf180mcu_fd_sc_mcu7t5v0__"+families[i.family]+"_"+i.initialDrive])),areaUm2:10,pathDelayNs:1,setupSlackNs:null,holdSlackNs:null,maxSlackNs:1,minSlackNs:1,feasible:true,status:"feasible",artifacts:{}}],library:{id:SELECTION_LIBRARY_ID,sha256:SELECTION_LIBRARY_SHA256},search:{evaluated:1,method:"exhaustive",termination:"budget"}};
  const relative="output/selection/result.json",bytes=JSON.stringify(raw),digest=sha(bytes),storedPath="results/dtco/result/"+relative;await fs.mkdir(path.dirname(path.join(root,storedPath)),{recursive:true});await fs.writeFile(path.join(root,storedPath),bytes);
  const job:any={id:"job",ownerId:"owner",status:"succeeded",resultId:"result"},artifact={jobId:"job",ownerId:"owner",relativePath:storedPath,sha256:digest,sizeBytes:Buffer.byteLength(bytes)},repos:any={results:{get:()=>({data:{dtcoSelection:{...raw,provenance:{outputHashes:{[relative]:digest}}}}})},artifacts:{listResult:()=>[artifact]}},storage:any={resolveExisting:async(p:string)=>path.join(root,p)};
  return {root,job,artifact,repos,storage,request,storedPath,bytes};
 }
 it("copies exactly the bound original timing bytes and retains source identities",async()=>{const f=await sourceFixture(),prepared=await selectionSourceContents(f.repos,f.storage,"owner",f.request,f.job);expect(prepared.source.jobId).toBe("job");expect(prepared.source.resultId).toBe("result");expect(String(prepared.contents["selection-source/output/selection/result.json"])).toBe(f.bytes);});
 it("rejects another owner's source and a tampered immutable artifact",async()=>{const f=await sourceFixture();await expect(selectionSourceContents(f.repos,f.storage,"other",f.request,f.job)).rejects.toThrow("owned");await fs.writeFile(path.join(f.root,f.storedPath),f.bytes+" ");await expect(selectionSourceContents(f.repos,f.storage,"owner",f.request,f.job)).rejects.toThrow("checksum");});
 it("rejects an artifact database row bound to a different job",async()=>{const f=await sourceFixture();f.artifact.jobId="different";await expect(selectionSourceContents(f.repos,f.storage,"owner",f.request,f.job)).rejects.toThrow("binding");});
});
