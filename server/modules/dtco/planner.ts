import type { JobPlanV1, JsonObject, PlannedStepV1 } from "../../../shared/contracts/v1.ts";
import { buildNativeAcgPlan } from "../acg/planner.ts";
import type { ValidationContext } from "../acg/types.ts";
import { DTCO_VERSION, dtcoError, hash, type DtcoSnapshot } from "./environment.ts";
export function frozenSnapshot(job:{parameters:JsonObject}):DtcoSnapshot {
 const value=job.parameters.dtcoSnapshot as unknown as DtcoSnapshot;
 if(!value)dtcoError("DTCO_SNAPSHOT","Missing immutable DTCO snapshot");
 const {snapshotHash,...data}=value;
 if(hash(JSON.stringify(data))!==snapshotHash)dtcoError("DTCO_SNAPSHOT_CHANGED","Frozen DTCO snapshot changed");
 return value;
}
export function acgFacade<T extends {job:any;files?:any[]}>(context:T):T {
 const files=context.job.inputManifest.files.filter((file:any)=>["netlist","config","rules"].includes(file.role));
 return {...context,...(context.files?{files}:{}),job:{...context.job,operation:"run",parameters:{engine:"mr",mode:"routed",presetId:null,verification:"none",configOverrides:{}},inputManifest:{...context.job.inputManifest,files}}};
}
export async function buildDtcoPlan(context:ValidationContext):Promise<JobPlanV1> {
 const snapshot=frozenSnapshot(context.job),plan=await buildNativeAcgPlan(acgFacade(context));
 const step=(id:string,name:string):PlannedStepV1=>({id,name,description:name,required:true,weight:1,process:null,inputRoles:["dtco-resource"],outputRoles:["dtco-evidence"]});
 plan.steps.unshift(step("dtco-prepare","Verify and stage frozen model, tools and measurement inputs"));
 const spice=context.job.toolConfigurations.find(t=>t.toolId==="dtco-ngspice"),analysis=context.job.toolConfigurations.find(t=>t.toolId==="dtco-analysis");
 if(!spice||!analysis)dtcoError("DTCO_TOOLS","DTCO native tools are not configured");
 const dc=step("model-dc","Simulate the frozen-model inverter DC transfer curve");
 dc.process={toolConfigurationId:spice.id,executableDisplay:"dtco-ngspice",argv:["-b","-o","model-dc.log","model-dc.cir"],cwdRelative:"output/dtco",environmentNames:spice.environmentNames,timeoutSeconds:spice.timeoutSeconds,expectedOutputs:["output/dtco/model-dc.txt"]};
 const dcAnalyze=step("model-analysis","Measure inverter switching voltage from the actual DC curve");
 dcAnalyze.process={toolConfigurationId:analysis.id,executableDisplay:"dtco-analysis",argv:["--workspace",".","--measurement","input/measurement.json","--dc-only"],cwdRelative:".",environmentNames:analysis.environmentNames,timeoutSeconds:analysis.timeoutSeconds,expectedOutputs:["output/dtco/model-analysis.json"]};
 plan.steps.splice(1,0,dc,dcAnalyze);
 const characterize=step("characterize",snapshot.definition.electricalMode==="extracted"?"Simulate the validated extracted inverter":"Simulate schematic inverter transient with frozen GF180 model");
 characterize.process={toolConfigurationId:spice.id,executableDisplay:"dtco-ngspice",argv:["-b","-o","ngspice.log","characterize.cir"],cwdRelative:"output/dtco",environmentNames:spice.environmentNames,timeoutSeconds:spice.timeoutSeconds,expectedOutputs:["output/dtco/waveforms.txt","output/dtco/ngspice.log"]};
 const measure=step("measure","Measure settled delay, supply energy and GDS boundary area");
 measure.process={toolConfigurationId:analysis.id,executableDisplay:"dtco-analysis",argv:["--workspace",".","--measurement","input/measurement.json"],cwdRelative:".",environmentNames:analysis.environmentNames,timeoutSeconds:analysis.timeoutSeconds,expectedOutputs:["output/dtco/metrics.json"]};
 if(snapshot.definition.electricalMode==="extracted") {
  const physical=context.job.toolConfigurations.find(t=>t.toolId==="dtco-physical"),magic=context.job.toolConfigurations.find(t=>t.toolId==="dtco-magic");
  if(!physical||!magic)dtcoError("DTCO_PHYSICAL_TOOLS","Trusted physical and Magic tools required");
  for(const [id,stage,name] of [["physical-complete","prepare","Prepare real contact, tap and port geometry"],["magic-complete","complete","Materialize the physical completion through GF180 Magic"],["physical-footprint","footprint","Freeze completed GDS footprint and extraction script"],["magic-extract","extract","Extract capacitance from the final GDS round trip"],["physical-validate","validate","Validate final geometry, connectivity, finite capacitance and zero Magic DRC"]] as const){
   const item=step(id,name),native=id.startsWith("magic-"),tool=native?magic:physical;
   const directory=stage==="extract"?"output/dtco/physical/roundtrip":"output/dtco/physical",prefix=stage==="extract"?"../../":"../";
   item.process={toolConfigurationId:tool.id,executableDisplay:tool.toolId,argv:native?["-dnull","-noconsole","-T",prefix+"magic/gf180mcuA.tech","-rcfile",prefix+"magic/empty.magicrc",stage+".tcl"]:["--workspace",".","--stage",stage],cwdRelative:native?directory:".",environmentNames:tool.environmentNames,timeoutSeconds:tool.timeoutSeconds};
   plan.steps.push(item);
  }
 }
 plan.steps.push(characterize,measure,step("dtco-summary","Bind all measurement and generated-layout artifacts by SHA256"));
 plan.capabilityVersion=DTCO_VERSION;plan.warnings.push(snapshot.metricScope,"SA routing can vary between runs; retained GDS checksum identifies the actual measured layout.",snapshot.definition.electricalMode==="extracted"?"Extracted mode requires final GDS round-trip topology, dimensions, finite capacitance and zero Magic DRC; this remains research verification, without extracted wire resistance or foundry signoff.":"Schematic mode does not characterize generated-layout parasitics or certify physical connectivity.");
 return plan;
}
