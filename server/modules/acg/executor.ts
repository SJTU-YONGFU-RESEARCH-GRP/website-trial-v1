import fs from "node:fs/promises";
import {executeResearchStep} from "./workflow.ts";
import { createHash } from "node:crypto";
import path from "node:path";
import type { JsonObject, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import { AcgError, projectRoot, regular, safePath, writeJson, type AcgExecutionContext, type Engine } from "./types.ts";
import { mapInputs, bindDiagnostic } from "./validation.ts";
import { inspectNative } from "./parser.ts";
import { readResearchReport, mergeResearchReport, prepareResearchPvManifest } from "./research.ts";
export async function prepareResources(workspace: string, configuration: ToolConfigurationSnapshotV1, engine: Engine) {
  const project = await projectRoot(configuration,engine);
  await fs.mkdir(path.join(workspace,"work/native"),{recursive:true});
  const copy = async (sources:string[],relative:string) => {
    for (const source of sources) {
      if (await fs.stat(source).then(x=>x.isFile()).catch(()=>false)) {
        await fs.mkdir(path.dirname(safePath(workspace,relative)),{recursive:true}); await fs.copyFile(source,safePath(workspace,relative)); return;
      }
    }
  };
  const repo = path.resolve(project,"../..");
  await copy([path.join(repo,"bin/ascii2gdsii.jar"),path.join(project,"bin/ascii2gdsii.jar")],"bin/ascii2gdsii.jar");
  for (const filename of ["ascii_to_gds_gdstk.py","gds_merge_all_layers_klayout.rb"]) await copy([path.join(project,"scripts",filename),path.join(repo,"scripts",filename)],"scripts/" + filename);
}
async function replayEvidence(context:AcgExecutionContext) {
  const root=context.workspacePath;
  const metadata=JSON.parse(await fs.readFile(await regular(root,"output/replay/preparation.json"),"utf8"));
  const uploaded=mapInputs(context.job.inputManifest.files).placement;
  const sha=async(relative:string)=>createHash("sha256").update(await fs.readFile(await regular(root,relative))).digest("hex");
  if(metadata.schemaVersion!=="acg.replay-preparation.v1" || metadata.rawUploadRetained!==true || metadata.preparedReplayPath!=="output/replay/prepared-placement.json" || metadata.sourceReplayPath!=="output/replay/source-placement.json" || await sha(metadata.sourceReplayPath)!==metadata.sourceSha256 || !uploaded || metadata.sourceSha256!==uploaded.sha256 || await sha("input/"+uploaded.relativePath)!==metadata.sourceSha256 || await sha("work/placement.json")!==metadata.sourceSha256 || await sha("work/prepared-placement.json")!==metadata.derivedSha256 || await sha(metadata.preparedReplayPath)!==metadata.derivedSha256) throw new AcgError("ACG_REPLAY_EVIDENCE_INVALID","Replay source or derived checksum/provenance changed","tool_exit");
  return metadata;
}
import {executeUnifiedStep} from "./unified.ts";
export async function executeAcgStep(context: AcgExecutionContext): Promise<{exitCode:number;outputs:JsonObject}> {
  if(context.job.operation==="unified")return executeUnifiedStep(context,executeAcgStep);
  if((context.job.operation??"run")!=="run")return executeResearchStep(context);
  const root = context.workspacePath;
  switch (context.step.stepKey) {
    case "prepare": {
      const snapshot = (context.job.plan as unknown as {acgSnapshot:Record<string,unknown>}).acgSnapshot;
      if (!snapshot) throw new AcgError("ACG_SNAPSHOT_MISSING","Validated configuration snapshot is unavailable","configuration");
      const {snapshotHash,...data} = snapshot;
      if (createHash("sha256").update(JSON.stringify(data)).digest("hex") !== snapshotHash) throw new AcgError("ACG_SNAPSHOT_CHANGED","Validated configuration snapshot changed","configuration");
      const resolved = {...data,mapping:mapInputs(context.job.inputManifest.files),configuration:context.job.toolConfigurations.find(x=>x.toolId==="acg-"+(data.parameters as {engine:string}).engine)!} as unknown as {parameters:import("./types.ts").Parameters;configuration:ToolConfigurationSnapshotV1;mapping:ReturnType<typeof mapInputs>;config:JsonObject;rules:JsonObject;cellNames:string[];preset:unknown};
      bindDiagnostic(resolved.parameters, resolved.mapping);
      await prepareResources(root,resolved.configuration,resolved.parameters.engine);
      await fs.mkdir(path.join(root,"output"),{recursive:true});
      await writeJson(path.join(root,"work/config.json"),resolved.config); await writeJson(path.join(root,"output/config.json"),resolved.config);
      await writeJson(path.join(root,"work/rules.json"),resolved.rules); await writeJson(path.join(root,"output/rules.json"),resolved.rules);
      const names:Record<string,string> = {netlist:"netlist.sp",placement:resolved.parameters.engine==="dr" ? "placement.txt" : "placement.json","port-verilog":"ports.v","port-metadata":"ports.json","source-diagnostic":"diagnostic.json"};
      for (const [role, filename] of Object.entries(names)) if (resolved.mapping[role]) {
        const source = await regular(root,"input/" + resolved.mapping[role]!.relativePath);
        const content = await fs.readFile(source);
        if (createHash("sha256").update(content).digest("hex") !== resolved.mapping[role]!.sha256) throw new AcgError("ACG_INPUT_CHANGED","Frozen input checksum changed","storage");
        await fs.writeFile(path.join(root,"work",filename),content);
      }
      await writeJson(path.join(root,"work/acg-inputs.json"),{parameters:resolved.parameters,cellNames:resolved.cellNames,preset:resolved.preset});
      return {exitCode:0,outputs:{cellCount:resolved.cellNames.length}};
    }
    case "prepare-replay": case "generate": case "render": case "research-lvs1": case "official-pv": {
      if (!context.runPlannedProcess) throw new AcgError("ACG_RUNTIME","Shared safe process runner is required","configuration");
      const result = await context.runPlannedProcess();
      if (context.step.stepKey==="prepare-replay" && result.exitCode===0) await replayEvidence(context);
      if (context.step.stepKey==="research-lvs1" && result.exitCode===0) await prepareResearchPvManifest(root,await readResearchReport(root));
      return {exitCode:result.exitCode,outputs:{processId:result.processId,processGroupId:result.processGroupId}};
    }
    case "inspect-native": case "normalize": {
      const input = JSON.parse(await fs.readFile(path.join(root,"work/acg-inputs.json"),"utf8"));
      const native = await inspectNative(root,input.parameters,input.cellNames);
      if (context.step.stepKey === "inspect-native") {
        await writeJson(path.join(root,"output/acg-native.json"),native); return {exitCode:0,outputs:{cellCount:native.cells.length}};
      }
      if (!native.cells.every(cell=>cell.validGdsCount>0 || cell.routing.status==="failed" || cell.placement.status==="failed")) throw new AcgError("ACG_OUTPUT_MISSING","Native execution emitted no cell products or verification evidence","tool_exit");
      const preview = await fs.readFile(path.join(root,"output/previews/manifest.json"),"utf8").then(x=>JSON.parse(x)).catch(()=>({results:[]}));
      const previews = (Array.isArray(preview.results) ? preview.results : []) as Array<{status:string;previewPath?:string}>;
      const rendered: string[] = [];
      for (const item of previews) if (item.status==="available" && item.previewPath) {
        const file = await regular(root,item.previewPath).catch(()=>null);
        if (file && (await fs.stat(file)).size>0) rendered.push(item.previewPath);
      }
      const researchRequested=input.parameters.engine==="mr" && input.parameters.mode==="routed" && input.parameters.verification!=="none" && context.job.plan.steps.some(step=>step.id==="research-lvs1");
      const research=researchRequested ? await readResearchReport(root) : null;
      if(research) mergeResearchReport(native,research);
      const pv = await fs.readFile(path.join(root,"output/pv/summary.json"),"utf8").then(x=>JSON.parse(x)).catch(()=>null);
      for (const cell of native.cells) {
        const official = pv?.cells?.find((x:{cellName:string})=>x.cellName===cell.cellName);
        if (official) {
          const evidence=new Set<string>();
          const gather=(value:unknown,key="")=>{if(typeof value==="string" && (key.endsWith("Path") || key==="evidencePaths") && value.startsWith("output/pv/")) evidence.add(value);else if(Array.isArray(value)) value.forEach(x=>gather(x,key));else if(value && typeof value==="object") Object.entries(value).forEach(([k,v])=>gather(v,k));};
          gather(official);
          for(const relativePath of evidence) if(await regular(root,relativePath).catch(()=>null)) if(!cell.artifacts.some(x=>x.relativePath===relativePath)) cell.artifacts.push({role:"acg-verification",relativePath,cellName:cell.cellName});
        }
        if (official && Array.isArray(official.candidates) && official.candidates.length) cell.verification.hardGatePass=official.candidates.every((x:{combinedHardGatePass:boolean|null})=>x.combinedHardGatePass===true);
        if (official) for (const key of ["officialDrc","officialLvs"] as const) if (official[key]) {
          const value = official[key]; const raw = typeof value === "string" ? value : value.status;
          cell.verification[key] = {status:raw==="PASS" ? "passed" : raw==="FAIL" ? "failed" : raw==="NOT_CHECKED" ? "not_run" : "unknown", evidencePaths:official.evidencePaths ?? ["output/pv/summary.json"],details:{...value,status:raw,candidates:official.candidates ?? []}};
        }
      }
      const replay=context.job.plan.steps.some(step=>step.id==="prepare-replay") ? await replayEvidence(context) : null;
      if(replay) {
        const cell=native.cells.find(x=>x.cellName===replay.cellName);
        if(!cell) throw new AcgError("ACG_REPLAY_EVIDENCE_INVALID","Replay preparation cell does not match native result","tool_exit");
        for(const relativePath of ["output/replay/preparation.json",replay.sourceReplayPath,replay.preparedReplayPath]) if(!cell.artifacts.some(x=>x.relativePath===relativePath)) cell.artifacts.push({role:relativePath!== "output/replay/preparation.json" ? "acg-placement" : "acg-report",relativePath,cellName:cell.cellName});
      }
      const config = await fs.readFile(path.join(root,"work/config.json"),"utf8").then(JSON.parse);
      const requested = config.placement_algorithm ?? (input.parameters.engine==="dr" ? "native_default" : "auto");
      const effective = input.parameters.engine==="mr" && Number(config.num_rows)>1 && ["auto","dp"].includes(requested) ? "sa" : requested;
      const configuredRows=input.parameters.engine==="mr" ? config.num_rows ?? 1 : input.parameters.engine==="dr" ? config.enable_double_row===true ? 2 : 1 : 1;
      const actualDrRows=new Set(native.cells.map(cell=>cell.geometry.actualRows));
      const geometry={technology:typeof config.tech==="string" ? config.tech : null,trackNum:Number.isFinite(config.track_num) ? config.track_num : null,configuredRows,numRows:input.parameters.engine==="dr" ? actualDrRows.size===1 ? native.cells[0]?.geometry.actualRows ?? null : null : configuredRows};
      const acg = {...native,schemaVersion:"acg.result.v1",configuration:input.parameters,...geometry,effectiveConfiguration:geometry,requestedAlgorithm:requested,effectiveAlgorithm:effective,
        previewStatus:rendered.length ? rendered.length===previews.length ? "available" : "partial" : "unavailable",previewDiagnostics:preview,
        processStatus:"succeeded",replayPreparation:replay,researchVerification:research,officialVerification:pv};
      await writeJson(path.join(root,"output/acg-result.json"),{title:"AutoCellGen " + native.engine.toUpperCase() + " / " + native.cells.length + " cells",
        summary:{engine:native.engine,mode:native.mode,...geometry,cellNames:native.cells.map(x=>x.cellName),cellCount:native.cells.length,completeCells:native.cells.filter(x=>x.status==="complete").length},
        data:{acg},artifactRoles:["acg-gds","acg-preview","acg-report","acg-config","acg-rules","acg-placement","acg-verification"],
        parserId:"acg-native",parserVersion:"1.0.0"});
      return {exitCode:0,outputs:{cellCount:native.cells.length}};
    }
    default: throw new AcgError("ACG_STEP","Unknown ACG step","internal");
  }
}
