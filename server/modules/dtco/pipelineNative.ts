import fs from "node:fs/promises";
import path from "node:path";
import type { JsonObject } from "../../../shared/contracts/v1.ts";
import type { DtcoPipelineNodeSummary, DtcoPipelineRunSummary, DtcoPipelineArtifactRef } from "../../../shared/contracts/dtcoPipeline.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { ModuleRegistry } from "../../app/modules/registry.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import type { PipelineContext } from "./pipelineRepository.ts";
import { prepareModuleJob, moduleConfigurationHash, verifiedPipelineArtifact, sha256, enqueuePipelineChild, type PreparedModuleInput } from "./preparedModuleJob.ts";
import { flattenModelSection, extractMosModelCards, recombineNormalizedMos, mosModelBlocks, selectedMosModelNames } from "./pipelineModel.ts";
import { resolveDtcoProfile, verifyDtcoProfileResources } from "./catalog.ts";
import { prepareDtcoJob, getDtcoPipelineEnvironmentFingerprint } from "./environment.ts";
function artifact(node:DtcoPipelineNodeSummary,suffix:string):DtcoPipelineArtifactRef{
 const matches=node.artifacts.filter(a=>a.relativePath.endsWith("/"+suffix));if(matches.length!==1)throw new Error("Expected one computed child artifact: "+suffix);return matches[0]!;
}
function jsonContent(value:unknown){return JSON.stringify(value,null,2)+"\n";}
export async function preparePipelineNode(repositories:Repositories,storage:StorageService,registry:ModuleRegistry,context:PipelineContext,run:DtcoPipelineRunSummary,node:DtcoPipelineNodeSummary,configurations:Record<string,string>):Promise<void>{
 const definition=context.experiment.definition,point=context.point,profile=resolveDtcoProfile(definition),corner=point.processCorner??"tt",section=profile.model.cornerSections[corner];
 if(!section)throw new Error("Selected model has no native corner section");
 await verifyDtcoProfileResources(profile);
 const lineage={pipelineRunId:run.id,pipelineAttemptId:context.attempt.id,pipelineNodeKind:node.kind};
 if(node.kind==="benchmark"){
  const expanded=await flattenModelSection(profile.modelRoot,profile.modelEntry,section),families=profile.technology.deviceFamilies.filter(f=>profile.resource.deviceFamilyIds.includes(f.id)).map(f=>f.modelName),selectedNames=selectedMosModelNames(expanded.content,families),models=extractMosModelCards(expanded.content,selectedNames);
  await prepareModuleJob(repositories,storage,registry,node.jobId,[
   {relativePath:"models/selected-mos.lib",role:"primary-model",content:models},
   {relativePath:"source/selected-section.sp",role:"model-include",content:expanded.content},
   {relativePath:"source/source-map.json",role:"model-source-map",content:jsonContent({schemaVersion:"dtco.model-section-source.v1",normalization:"mos-cards-only",selectedFamilies:families,selectedModelNames:selectedNames,selectedModelCount:selectedNames.length,technologyId:definition.technologyId,modelId:profile.model.modelId,cornerSection:section,sourceHashes:expanded.sourceHashes,segments:expanded.segments,expandedSha256:sha256(expanded.content),mosSha256:sha256(models)})},
  ],{...lineage,mode:"run",sourceDialect:"ngspice",operations:{translator:true,fitting:false,reduction:false,expansion:false,benchmark:false},operationOrder:["translator"],translator:{sourceDialect:"ngspice",targetDialect:"ngspice",outputName:"translated.lib",followIncludes:true,verify:false,exportToBenchmark:false}},configurations.benchmark);
  return;
 }
 if(node.kind==="dtco"){
  if(configurations.dtcoEnvironment!==await getDtcoPipelineEnvironmentFingerprint(repositories,definition))throw new Error("Frozen DTCO/ACG binary, helper, model or resource environment changed during Benchmark translation");
  if(configurations.dtco!==moduleConfigurationHash(repositories,"dtco")||configurations.acg!==moduleConfigurationHash(repositories,"acg"))throw new Error("DTCO/ACG tool configuration changed during pipeline");
  const source=run.nodes.find(n=>n.kind==="benchmark")!,ref=artifact(source,"output/translator/translated.lib"),normalized=(await verifiedPipelineArtifact(repositories,storage,context.experiment.ownerId,ref)).toString("utf8");
  const benchmarkJob=repositories.jobs.get(source.jobId)!,manifest=benchmarkJob.inputManifest.files.find(f=>f.relativePath==="source/selected-section.sp")!;
  const expanded=await fs.readFile(await storage.resolveExisting(benchmarkJob.workspaceRelativePath+"/input/"+manifest.relativePath));if(sha256(expanded)!==manifest.sha256)throw new Error("Frozen source-section checksum changed");
  const families=profile.technology.deviceFamilies.filter(f=>profile.resource.deviceFamilyIds.includes(f.id)).map(f=>f.modelName),selectedNames=selectedMosModelNames(expanded.toString("utf8"),families);
  const combined=".lib "+section+"\n"+recombineNormalizedMos(expanded.toString("utf8"),normalized,selectedNames)+"\n.endl "+section+"\n",destination=await storage.safeDestination("pipelines/"+run.id+"/normalized-model.lib");
  await fs.writeFile(destination,combined,{flag:"wx",mode:0o440});
  const bridge={normalizedModel:{sourceJobId:ref.sourceJobId,resultId:ref.resultId,artifactId:ref.artifactId,sha256:ref.sha256,files:[{relativePath:"benchmark-normalized.lib",sourcePath:destination,sha256:sha256(combined)}],entry:"benchmark-normalized.lib",technologyId:definition.technologyId,modelId:profile.model.modelId,cornerSection:section,spiceScale:profile.spiceScale,normalization:"mos-cards-only",sourceStageSha256:manifest.sha256,sourceStage:{selectedFamilies:families,selectedModelNames:selectedNames,selectedModelCount:selectedNames.length},translatedModelCount:mosModelBlocks(normalized).length}};
  const job=repositories.jobs.get(node.jobId)!;
  const prepare=prepareDtcoJob as typeof prepareDtcoJob & ((...args:[Repositories,StorageService,typeof job,typeof definition,typeof point,typeof bridge])=>ReturnType<typeof prepareDtcoJob>);
  const prepared=await prepare(repositories,storage,job,definition,point,bridge);
  const parameters={...prepared.parameters,...lineage,dtcoExperimentId:context.experiment.id,dtcoPointId:point.id,dtcoPointKey:point.key,dtcoRevision:point.revision};
  repositories.jobs.setDraft(job.id,prepared.inputManifest,parameters,prepared.capabilityVersion,prepared.toolConfigurations,prepared.toolVersions,prepared.plan);
  await storage.writeManifest(job.id,prepared.inputManifest);await storage.freezeInputs(job.id);
  if(configurations.dtcoEnvironment!==await getDtcoPipelineEnvironmentFingerprint(repositories,definition))throw new Error("Frozen DTCO/ACG environment changed before enqueue");
  if(configurations.dtco!==moduleConfigurationHash(repositories,"dtco")||configurations.acg!==moduleConfigurationHash(repositories,"acg"))throw new Error("DTCO/ACG tool configuration changed before enqueue");
  enqueuePipelineChild(repositories,job.id);return;
 }
 const dtco=run.nodes.find(n=>n.kind==="dtco")!,metricsRef=artifact(dtco,"output/dtco/metrics.json"),metrics=JSON.parse((await verifiedPipelineArtifact(repositories,storage,context.experiment.ownerId,metricsRef)).toString("utf8"));
 const dtcoJob=repositories.jobs.get(dtco.jobId)!,snapshot=dtcoJob.parameters.dtcoSnapshot as JsonObject;
 const inputs=[...new Set(profile.circuit.arcs.map(a=>a.input))],outputPin=profile.circuit.arcs[0]!.output;
 const powerPins=profile.circuit.ports.filter(p=>/^(?:VDD|VPWR|VNW|VPB|VCC)$/i.test(p)),groundPins=profile.circuit.ports.filter(p=>/^(?:VSS|VGND|VPW|VNB|GND)$/i.test(p));
 if(!powerPins.length||!groundPins.length)throw new Error("Unsupported explicit supply pin mapping");
 const allOne=profile.truthTable.find(r=>inputs.every(p=>r.inputs[p]===1)),allZero=profile.truthTable.find(r=>inputs.every(p=>r.inputs[p]===0));
 const fn=inputs.length===1?"!"+inputs[0]:allOne?.output===0&&profile.truthTable.filter(r=>r.output===0).length===1?"!("+inputs.join(" & ")+")":allZero?.output===1&&profile.truthTable.filter(r=>r.output===1).length===1?"!("+inputs.join(" | ")+")":null;
 if(!fn)throw new Error("Unsupported characterized Boolean function");
 if(node.kind==="ppa"){
  const gds=artifact(dtco,String(metrics.selectedGdsPath)),netlist=artifact(dtco,definition.electricalMode==="extracted"?"output/dtco/physical/extracted.spice":"output/dtco/simulation.sp"),netlistBytes=await verifiedPipelineArtifact(repositories,storage,context.experiment.ownerId,netlist);
  const normalizedModel=snapshot.normalizedModel as JsonObject|undefined;
  const modelFiles=normalizedModel?.files as Array<JsonObject>|undefined;
  const models=dtco.artifacts.filter(a=>modelFiles?modelFiles.some(f=>a.relativePath.endsWith("/output/dtco/model/"+f.relativePath)):a.relativePath.includes("/output/dtco/model/"));
  if(!models.length)throw new Error("DTCO did not publish the actual consumed normalized model");
  const evidence={...metrics,gdsSha256:gds.sha256,netlistSha256:sha256(netlistBytes),processProfile:profile.model.modelId==="sky130-01v8-hvt"?"sky130-hvt":profile.model.modelId,corner,modelSection:section,vddVolts:point.voltageV,vssVolts:point.groundVoltageV??0,temperatureC:point.temperatureC,electricalMode:definition.electricalMode??"schematic",topModule:profile.circuit.subcircuit,layoutTopModule:metrics.selectedGdsTop,sourceJobId:dtco.jobId,sourceResultId:dtco.resultId,areaMethod:profile.fixedLefPath?"lef-size":profile.boundary?"gds-boundary":"gds-bbox",...(profile.boundary?{boundary:profile.boundary}:{}),slewProvenance:{dtcoFullRampSeconds:definition.inputSlewPs*1e-12,libertyTransitionSeconds:0.6*definition.inputSlewPs*1e-12,lowerThresholdPct:20,upperThresholdPct:80,conversionFactor:0.6},powerArcScope:definition.characterizationArcId??"all-catalog-arcs"};
  const files:PreparedModuleInput[]=[{relativePath:"cell.spice",role:"cell_netlist",artifact:netlist},{relativePath:"cell.gds",role:"cell_gds",artifact:gds},{relativePath:"physical-evidence.json",role:"physical_evidence",content:jsonContent(evidence)},{relativePath:"waveform-metrics.json",role:"waveform_metrics",content:jsonContent(evidence)}];
  for(const model of models)files.push({relativePath:model.relativePath.split("/output/dtco/")[1]!,role:"model_file",artifact:model});
  for(const waveform of dtco.artifacts.filter(a=>/\/output\/dtco\/waveforms(?:-[^/]+)?\.txt$/.test(a.relativePath)))files.push({relativePath:"waveforms/"+path.basename(waveform.relativePath),role:"waveform_file",artifact:waveform});
  if(profile.fixedLefPath){const bytes=await fs.readFile(profile.fixedLefPath);files.push({relativePath:"cell.lef",role:"cell_lef",content:bytes,sha256:sha256(bytes)});}
  await prepareModuleJob(repositories,storage,registry,node.jobId,files,{...lineage,flow:"libcharx",designName:"dtco_"+run.id.replaceAll("-","_"),topModule:profile.circuit.subcircuit,processProfile:evidence.processProfile,corner,modelSection:section,modelEntry:"model/"+(normalizedModel?String(normalizedModel.entry):profile.modelEntry),...(profile.spiceScale?{spiceScale:profile.spiceScale}:{}),vddVolts:point.voltageV,vssVolts:point.groundVoltageV??0,temperatureC:point.temperatureC,electricalMode:definition.electricalMode??"schematic",inputs,outputPin,powerPins,groundPins,function:fn,arcs:profile.circuit.arcs.map(a=>({input:a.input,fixedInputs:a.fixedInputs??{}})),slewSeconds:[0.6*definition.inputSlewPs*1e-12],loadFarads:[definition.loadFf*1e-15],...(metrics.selectedGdsTop?{layoutTopModule:metrics.selectedGdsTop}:{})} as JsonObject,configurations.ppa);return;
 }
 const ppa=run.nodes.find(n=>n.kind==="ppa")!,liberty=artifact(ppa,"output/libcharx/characterized.lib");
 // A real one-cell mapped design retains the exact characterized cell and pin mapping.
 const cell=profile.circuit.subcircuit,top="dtco_pipeline_design";
 if(![...inputs,outputPin,cell].every(p=>/^[A-Za-z_][A-Za-z0-9_$]*$/.test(p)))throw new Error("Unsafe catalog Verilog identity");
 const verilog='(* blackbox *) module '+cell+'('+[...inputs,outputPin].join(",")+'); input '+inputs.join(",")+'; output '+outputPin+'; endmodule\nmodule '+top+'('+[...inputs,outputPin].join(",")+'); input '+inputs.join(",")+'; output '+outputPin+'; '+cell+' dut('+[...inputs,outputPin].map(p=>"."+p+"("+p+")").join(",")+'); endmodule\n';
 await prepareModuleJob(repositories,storage,registry,node.jobId,[{relativePath:"design.v",role:"gate_netlist",content:verilog},{relativePath:"characterized.lib",role:"liberty",artifact:liberty}],{...lineage,design:definition.name,category:"dtco",architecture:"characterized-cell",dtcoTimingOnly:true,dtcoPowerCapability:"unavailable-liberty-has-no-power-tables",dtcoAuthoritativePowerJobId:dtco.jobId,topModule:top,processTechnology:definition.technologyId,library:cell,corner:corner+"_"+point.temperatureC+"C_"+point.voltageV+"V",clockPeriodNs:definition.periodNs,inputSlewNs:0.6*definition.inputSlewPs/1000,dtcoSlewProvenance:{dtcoFullRampSeconds:definition.inputSlewPs*1e-12,libertyTransitionSeconds:0.6*definition.inputSlewPs*1e-12,lowerThresholdPct:20,upperThresholdPct:80,conversionFactor:0.6},outputLoadPf:definition.loadFf/1000},configurations.digital);
}
