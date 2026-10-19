import { createHash } from "node:crypto";
import {buildResearchPlan} from "./workflow.ts";
import type { JobPlanV1, PlannedStepV1, JsonObject } from "../../../shared/contracts/v1.ts";
import { ACG_VERSION, ready, type ValidationContext } from "./types.ts";
import { resolveInputs } from "./validation.ts";
import {buildUnifiedPlan} from "./unified.ts";
export async function buildAcgPlan(context: ValidationContext): Promise<JobPlanV1> {
  if(context.job.operation==="unified")return buildUnifiedPlan(context,buildNativeAcgPlan);
  if((context.job.operation??"run")!=="run")return buildResearchPlan(context);
  return buildNativeAcgPlan(context);
}
export async function buildNativeAcgPlan(context: ValidationContext): Promise<JobPlanV1> {
  const resolved = await resolveInputs(context); const { parameters, configuration, mapping } = resolved;
  const nativeArgv = ["--config","../config.json","--rules","../rules.json","--netlist","../netlist.sp","--output","../../output/native"];
  if (parameters.engine === "mr") {
    // MR treats a single-cell output as a file, and adds _<cell>.json for multi-cell input.
    nativeArgv.push("--placement-output","../../output/placement/placement.json");
    if (mapping.placement) nativeArgv.push("--placement-input","../prepared-placement.json");
    if (mapping["port-verilog"]) nativeArgv.push("--port-verilog","../ports.v");
    if (mapping["port-metadata"]) nativeArgv.push("--port-metadata","../ports.json");
    if (parameters.widenPolicy) nativeArgv.push("--widen-policy",parameters.widenPolicy);
    if (parameters.widenExtraCpp !== undefined) nativeArgv.push("--widen-extra-cpp",String(parameters.widenExtraCpp));
    if (mapping["source-diagnostic"]) nativeArgv.push("--source-diagnostic","../diagnostic.json");
    if (parameters.routabilityPipeline) nativeArgv.push("--routability-pipeline");
  } else if (mapping["port-verilog"] || mapping["port-metadata"]) throw new Error("Port metadata inputs require MR");
  const step = (id: string, name: string): PlannedStepV1 => ({ id, name, description: name, required: true, weight: 1, process: null, inputRoles: [], outputRoles: [] });
  const generate = step("generate", "AutoCellGen " + parameters.engine + " " + parameters.mode);
  generate.process = { toolConfigurationId: configuration.id, executableDisplay: configuration.toolId, argv: nativeArgv,
    cwdRelative: "work/native", environmentNames: configuration.environmentNames,
    timeoutSeconds: Math.min(parameters.timeoutSeconds ?? configuration.timeoutSeconds, configuration.timeoutSeconds) };
  const steps = [step("prepare","Prepare immutable native inputs")];
  if(parameters.engine==="mr" && mapping.placement) {
    const replay=context.job.toolConfigurations.find(x=>x.toolId==="acg-replay" && x.enabled)!;
    const prepareReplay=step("prepare-replay","Prepare MR common-width replay with dummy right padding");
    prepareReplay.process={toolConfigurationId:replay.id,executableDisplay:"acg-replay",argv:["--input","work/placement.json","--output","work/prepared-placement.json","--artifacts-output","output/replay"],cwdRelative:".",environmentNames:replay.environmentNames,timeoutSeconds:replay.timeoutSeconds};
    steps.push(prepareReplay);
  }
  steps.push(generate);
  const renderer = context.job.toolConfigurations.find(x => x.toolId === "acg-renderer" && x.enabled);
  if (renderer && ready(context,renderer)) {
    const render = step("render","Render real GDS previews");
    render.process = { toolConfigurationId: renderer.id, executableDisplay: "acg-renderer", argv: ["--input","output/native","--output","output/previews"],
      cwdRelative: ".", environmentNames: renderer.environmentNames, timeoutSeconds: renderer.timeoutSeconds };
    steps.push(render);
  }
  steps.push(step("inspect-native","Identify real routed candidates and verification evidence"));
  const researchRequested = parameters.engine === "mr" && parameters.mode === "routed" && resolved.config.tech === "gf180" && ["research","foundry"].includes(parameters.verification ?? "");
  if (researchRequested) {
    const lvs1 = context.job.toolConfigurations.find(x=>x.toolId==="acg-lvs1" && x.enabled)!;
    const verify = step("research-lvs1","Run GF180 research extracted connectivity LVS1");
    const timeout = Math.max(1, lvs1.timeoutSeconds - 15);
    verify.process = {toolConfigurationId:lvs1.id,executableDisplay:"acg-lvs1",argv:["--engine-root",lvs1.rootPath!,"--manifest","output/acg-native.json","--config","work/config.json","--output","output/research-lvs1","--artifacts-root",".","--timeout-seconds",String(timeout)],cwdRelative:".",environmentNames:lvs1.environmentNames,timeoutSeconds:lvs1.timeoutSeconds};
    steps.push(verify);
  }
  if (parameters.verification === "foundry") {
    const pv = context.job.toolConfigurations.find(x=>x.toolId==="acg-pv" && x.enabled)!;
    const verify = step("official-pv","Run official GF180 DRC and LVS");
    verify.process = {toolConfigurationId:pv.id,executableDisplay:"acg-pv",argv:["--engine-root",pv.rootPath!,"--manifest",researchRequested ? "output/acg-pv-native.json" : "output/acg-native.json","--netlist","work/netlist.sp","--output","output/pv","--artifacts-root",".","--timeout-seconds",String(pv.timeoutSeconds)],cwdRelative:".",environmentNames:pv.environmentNames,timeoutSeconds:pv.timeoutSeconds};
    steps.push(verify);
  }
  steps.push(step("normalize","Parse every native cell and verification report"));
  const plan: JobPlanV1 = { schemaVersion: "eda.job-plan.v1", capabilityVersion: ACG_VERSION, steps, sweep: null,
    warnings: ["Research verification does not certify foundry DRC/LVS.", ...(parameters.engine==="mr" && mapping.placement ? ["MR replay preparation validates the original hash and pads only shorter-row right edges with dummy columns; raw upload retained and derived replay/hash lineage published."] : []), ...(steps.some(x => x.id === "render") ? [] : ["GDS renderer is unavailable; previews will be unavailable."])] };
  const uploadedRoles = Object.entries(mapping).filter(([, file])=>file).map(([role])=>role);
  const roles: Record<string, {inputRoles:string[];outputRoles:string[]}> = {
    prepare:{inputRoles:uploadedRoles,outputRoles:["native-config","native-rules","native-inputs"]},
    "prepare-replay":{inputRoles:["native-inputs","placement"],outputRoles:["acg-placement","acg-report"]},
    generate:{inputRoles:["native-config","native-rules","native-inputs"],outputRoles:["acg-gds","acg-report",...(parameters.engine === "mr" ? ["acg-placement"] : [])]},
    render:{inputRoles:["acg-gds"],outputRoles:["acg-preview"]},
    "inspect-native":{inputRoles:["acg-gds","acg-report"],outputRoles:["native-manifest"]},
    "research-lvs1":{inputRoles:["native-manifest","native-config","acg-gds","acg-report"],outputRoles:["acg-verification"]},
    "official-pv":{inputRoles:["native-manifest","netlist"],outputRoles:["acg-verification"]},
    normalize:{inputRoles:["native-manifest","acg-report","acg-verification"],outputRoles:["normalized-result"]},
  };
  for (const item of steps) Object.assign(item, roles[item.id]);
  const snapshot = {parameters,config:resolved.config,rules:resolved.rules,cellNames:resolved.cellNames,preset:resolved.preset};
  (plan as JobPlanV1 & {acgSnapshot:JsonObject}).acgSnapshot = {...snapshot,snapshotHash:createHash("sha256").update(JSON.stringify(snapshot)).digest("hex")} as unknown as JsonObject;
  return plan;
}
