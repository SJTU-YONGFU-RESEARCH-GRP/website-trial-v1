import fs from "node:fs/promises";
import path from "node:path";
import type { JsonObject } from "../../../shared/contracts/v1.ts";
import { executeAcgStep } from "../acg/executor.ts";
import { regular, writeJson, AcgError, type AcgExecutionContext } from "../acg/types.ts";
import { listOutputs } from "../acg/parser.ts";
import { hash, type DtcoSnapshot } from "./environment.ts";
import { acgFacade, frozenSnapshot } from "./planner.ts";
import { readDtcoMetrics } from "./metrics.ts";
export async function verifyFrozenResources(snapshot:DtcoSnapshot) {
 for(const file of snapshot.trusted) {
  if(hash(await fs.readFile(file.source))!==file.sha256)throw new AcgError("DTCO_RESOURCE_CHANGED","Trusted executable, model or helper changed after preflight: "+file.relativePath,"configuration");
 }
}
async function verifyInputs(context:AcgExecutionContext,snapshot:DtcoSnapshot) {
 for(const[relative,digest]of Object.entries(snapshot.inputHashes))
  if(hash(await fs.readFile(await regular(context.workspacePath,"input/"+relative)))!==digest)throw new AcgError("DTCO_INPUT_CHANGED","Frozen input checksum changed: "+relative,"storage");
}
export async function executeDtcoStep(context:AcgExecutionContext):Promise<{exitCode:number;outputs:JsonObject}> {
 const snapshot=frozenSnapshot(context.job),root=context.workspacePath,key=context.step.stepKey;
 await verifyFrozenResources(snapshot);
 if(key==="dtco-prepare") {
  await verifyInputs(context,snapshot);
  const target=path.join(root,"output/dtco"); await fs.mkdir(target,{recursive:true});
  for(const relative of Object.keys(snapshot.inputHashes)) {
   const destination=path.join(target,relative);
   await fs.mkdir(path.dirname(destination),{recursive:true});
   await fs.copyFile(await regular(root,"input/"+relative),destination);
  }
  await writeJson(path.join(target,"snapshot.json"),snapshot);
  return {exitCode:0,outputs:{modelHash:snapshot.modelHash,environmentHash:snapshot.environmentHash}};
 }
 if(key==="characterize"||key==="measure") {
  await verifyInputs(context,snapshot);
  if(!context.runPlannedProcess)throw new AcgError("DTCO_RUNTIME","Shared safe process runner is required","configuration");
  const result=await context.runPlannedProcess();
  return {exitCode:result.exitCode,outputs:{processId:result.processId,processGroupId:result.processGroupId}};
 }
 if(key==="dtco-summary") {
  await verifyInputs(context,snapshot);
  const evidence=await readDtcoMetrics(root);
  if(evidence.metricScope!==snapshot.metricScope)throw new AcgError("DTCO_SCOPE_CHANGED","Measurement scope differs from frozen request","parser");
  const selected=String(evidence.selectedGdsPath);
  if(hash(await fs.readFile(await regular(root,selected)))!==evidence.selectedGdsSha256)throw new AcgError("DTCO_GDS_CHANGED","Selected measured GDS changed","parser");
  const outputHashes:Record<string,string>={};
  for(const relative of await listOutputs(root,"output",10000))outputHashes[relative]=hash(await fs.readFile(await regular(root,relative)));
  const metrics:JsonObject={};
  for(const name of ["delayPs","delayRisePs","delayFallPs","averagePowerW","energyPerCycleJ","areaUm2"])metrics[name]=evidence[name]!;
  const manifest={schemaVersion:"dtco.provenance.v1",origin:"computed",metricScope:snapshot.metricScope,modelHash:snapshot.modelHash,modelVersion:snapshot.modelVersion,environmentHash:snapshot.environmentHash,inputHashes:snapshot.inputHashes,outputHashes,selectedGdsPath:selected,selectedGdsSha256:evidence.selectedGdsSha256,methodology:evidence.methodology,extraction:evidence.extraction,toolVersions:context.job.toolVersions,limitations:["Electrical measurements use the independent source-input schematic N1um/P2um L280nm; generated layout widths, ports and body connectivity are not validated.","Layout choices affect measured area only; electrical values do not include generated layout parasitics.","Native routed candidate evidence is not foundry DRC/LVS signoff.","SA placement and routing are not guaranteed bitwise deterministic; retained GDS checksum identifies the measured artifact."]};
  await writeJson(path.join(root,"output/dtco/provenance.json"),manifest);
  const acg=JSON.parse(await fs.readFile(await regular(root,"output/acg-result.json"),"utf8"));
  await writeJson(path.join(root,"output/dtco-result.json"),{title:"DTCO inverter · "+snapshot.coordinates.temperatureC+" °C · "+snapshot.coordinates.voltageV+" V · "+snapshot.coordinates.layoutId,summary:{...snapshot.coordinates,...metrics,metricScope:snapshot.metricScope},data:{dtco:{schemaVersion:"dtco.result.v1",coordinates:snapshot.coordinates,definition:snapshot.definition,metrics,metricScope:snapshot.metricScope,provenance:manifest,artifacts:{metricsPath:"output/dtco/metrics.json",provenancePath:"output/dtco/provenance.json",waveformPath:"output/dtco/waveforms.txt",deckPath:"output/dtco/characterize.cir",logPath:"output/dtco/ngspice.log",selectedGdsPath:selected}},acg:acg.data.acg},artifactRoles:["dtco-evidence","acg-gds","acg-report","normalized-result"],parserId:"dtco-native-measurements",parserVersion:"1.0.0"});
  return {exitCode:0,outputs:{metrics}};
 }
 // Keep actual DTCO plan and inherited runPlannedProcess closure: native step IDs match.
 return executeAcgStep(acgFacade(context));
}
