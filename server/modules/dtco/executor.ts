import fs from "node:fs/promises";
import path from "node:path";
import type { JsonObject } from "../../../shared/contracts/v1.ts";
import { executeAcgStep } from "../acg/executor.ts";
import { regular, writeJson, AcgError, type AcgExecutionContext } from "../acg/types.ts";
import { listOutputs } from "../acg/parser.ts";
import { hash, type DtcoSnapshot } from "./environment.ts";
import { acgFacade, frozenSnapshot } from "./planner.ts";
import { readDtcoMetrics } from "./metrics.ts";
import { resolveDesign } from "./circuit.ts";
export async function verifyFrozenResources(snapshot:DtcoSnapshot) {
 for(const file of snapshot.trusted) {
  if(hash(await fs.readFile(file.source))!==file.sha256)throw new AcgError("DTCO_RESOURCE_CHANGED","Trusted executable, model or helper changed after preflight: "+file.relativePath,"configuration");
 }
}
async function verifyInputs(context:AcgExecutionContext,snapshot:DtcoSnapshot,staged=false) {
 for(const[relative,digest]of Object.entries(snapshot.inputHashes)){
  if(hash(await fs.readFile(await regular(context.workspacePath,"input/"+relative)))!==digest)throw new AcgError("DTCO_INPUT_CHANGED","Frozen input checksum changed: "+relative,"storage");
  if(staged&&hash(await fs.readFile(await regular(context.workspacePath,"output/dtco/"+relative)))!==digest)throw new AcgError("DTCO_STAGED_INPUT_CHANGED","Staged simulation input checksum changed: "+relative,"storage");
 }
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
 if(["characterize","measure","model-dc","model-analysis","physical-complete","magic-complete","physical-footprint","magic-extract","physical-validate"].includes(key)) {
  await verifyInputs(context,snapshot,true);
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
  const electricalMode=snapshot.definition.electricalMode??"schematic",design=resolveDesign(snapshot.definition);
  const modelAnalysis=evidence.modelAnalysis;
  const manifest={schemaVersion:"dtco.provenance.v1",origin:"computed",electricalMode,design,metricScope:snapshot.metricScope,modelHash:snapshot.modelHash,modelVersion:snapshot.modelVersion,environmentHash:snapshot.environmentHash,inputHashes:snapshot.inputHashes,outputHashes,selectedGdsPath:selected,selectedGdsSha256:evidence.selectedGdsSha256,methodology:evidence.methodology,extraction:evidence.extraction,toolVersions:context.job.toolVersions,limitations:electricalMode==="extracted"?["Magic extraction includes actual completed-layout device geometry and capacitance; wire resistance is not extracted.","Zero errors under the configured GF180 Magic rules is research verification, not full foundry signoff.","Native intermediate and physically completed measured GDS are retained separately.","SA native placement/routing may be nondeterministic; retained artifact hashes identify the measurement."]:["Electrical measurements use the independent source-input schematic; generated layout widths, ports and body connectivity are not validated.","Layout choices affect measured area only; electrical values do not include generated layout parasitics.","Native routed candidate evidence is not foundry DRC/LVS signoff."]};
  await writeJson(path.join(root,"output/dtco/provenance.json"),manifest);
  const acg=JSON.parse(await fs.readFile(await regular(root,"output/acg-result.json"),"utf8"));
  await writeJson(path.join(root,"output/dtco-result.json"),{title:"DTCO inverter · "+snapshot.coordinates.temperatureC+" °C · "+snapshot.coordinates.voltageV+" V · "+snapshot.coordinates.layoutId,summary:{...snapshot.coordinates,...metrics,metricScope:snapshot.metricScope},data:{dtco:{schemaVersion:"dtco.result.v1",coordinates:snapshot.coordinates,definition:snapshot.definition,electricalMode,design,modelAnalysis,metrics,metricScope:snapshot.metricScope,provenance:manifest,artifacts:{metricsPath:"output/dtco/metrics.json",provenancePath:"output/dtco/provenance.json",waveformPath:"output/dtco/waveforms.txt",deckPath:"output/dtco/characterize.cir",logPath:"output/dtco/ngspice.log",modelDcCurvePath:"output/dtco/model-dc.txt",modelAnalysisPath:"output/dtco/model-analysis.json",nativeGdsPath:evidence.nativeGdsPath!,...(electricalMode==="extracted"?{completedPreviewPath:"output/dtco/physical/completed.png",extractedNetlistPath:"output/dtco/physical/extracted.spice",extractionValidationPath:"output/dtco/physical/validation.json"}:{}),selectedGdsPath:selected}},acg:acg.data.acg},artifactRoles:["dtco-evidence","acg-gds","acg-report","normalized-result"],parserId:"dtco-native-measurements",parserVersion:"1.0.0"});
  return {exitCode:0,outputs:{metrics}};
 }
 // Keep actual DTCO plan and inherited runPlannedProcess closure: native step IDs match.
 return executeAcgStep(acgFacade(context));
}
