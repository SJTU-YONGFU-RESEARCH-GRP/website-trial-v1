import { createHash } from "node:crypto";
import type { DtcoExperimentDefinition, DtcoMeasuredMetrics, DtcoOptimization, DtcoOptimizationDefinition, DtcoOptimizationOptions, DtcoOptions } from "../../../shared/contracts/dtco.ts";
import type { JsonObject, ResultRecordV1, StructuredJobErrorV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { ApiError } from "../../app/api/errors.ts";
import { DtcoService, dtcoProfiles, normalizeDefinition } from "./service.ts";
import { resolveDtcoDimensions } from "./dimensions.ts";
import { DTCO_FREQUENCY_PROTOCOL_VERSION, SUPERSEDED_FREQUENCY_REASON } from "./frequencyRead.ts";
import { experimentDefinition, initialCandidate } from "./optimizationAlgorithm.ts";
import { DtcoPipelineRepository, isIntegratedAttemptComplete } from "./pipelineRepository.ts";
const designBounds = (options:DtcoOptions) => ({
  nmosWidthUm:{min:options.designBounds?.nmosWidthUm.min??0.95,max:options.designBounds?.nmosWidthUm.max??1.3},
  pmosWidthUm:{min:options.designBounds?.pmosWidthUm.min??1.4,max:options.designBounds?.pmosWidthUm.max??2.6},
});
const errorRecord = (message:string,code="DTCO_OPTIMIZATION_RESULT"):StructuredJobErrorV1=>({type:"configuration",code,message,stepId:null,retryable:true,details:null});
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
export function optimizationAvailability(definition:DtcoOptimizationDefinition,options:DtcoOptions):{available:boolean;reason:string|null} {
  const {circuit,model,technology}=dtcoProfiles(options,definition),mode=definition.electricalMode??"extracted";
  const selected=options.layouts.filter(item=>definition.layoutIds.includes(item.id));
  const modeOption=options.electricalModes?.find(item=>item.id===mode);
  const available=(definition.workflow!=="integrated"||options.integrations?.available===true)&&options.available&&selected.length===definition.layoutIds.length&&selected.every(item=>item.available)&&
    (modeOption?.available??Boolean(circuit?.electricalModes.includes(mode)))&&
    (!circuit||(circuit.available&&Boolean(model?.available)&&Boolean(technology?.available)&&circuit.electricalModes.includes(mode)));
  return {available,reason:available?null:circuit?.reason||model?.reason||selected.find(item=>!item.available)?.reason||modeOption?.reason||options.unavailableReason||"Selected characterization flow is unavailable"};
}
export function optimizationOptions(options: DtcoOptions): DtcoOptimizationOptions {
  const bounds=designBounds(options);
  const layoutIds=["mr-sa-12t-pex"];
  const available=options.circuitProfiles?options.available&&options.circuitProfiles.some(circuit=>circuit.available&&circuit.electricalModes.some(mode=>(options.electricalModes?.find(item=>item.id===mode)?.available??true)&&circuit.layoutIds.some(id=>options.layouts.some(layout=>layout.id===id&&layout.available)))):options.available&&Boolean(options.layouts.find(item=>item.id===layoutIds[0])?.available)&&Boolean(options.electricalModes?.find(item=>item.id==="extracted")?.available);
  return {available,reason:available?null:options.unavailableReason||"Validated physical extraction is not available; schematic measurements cannot drive optimization.",
    defaults:{name:"Extracted inverter optimization",circuitId:options.defaults.circuitId,technologyId:options.defaults.technologyId,modelVersion:options.defaults.modelVersion,
      temperatureC:25,voltageV:3.3,layoutIds,loadFf:options.defaults.loadFf,inputSlewPs:options.defaults.inputSlewPs,periodNs:options.defaults.periodNs,
      axes:{nmosWidthUm:{min:1,max:1,initial:1,step:0.3},pmosWidthUm:{min:1.4,max:2.6,initial:2,step:0.6}},
      objective:{metric:"balanced",weights:{delay:1,power:1,area:1}},maxIterations:6,minRelativeImprovement:0.01,patience:4},
    widthGridUm:0.05,bounds,layoutIds,maxIterations:64};
}
export function normalizeOptimization(value:unknown,options:DtcoOptions):DtcoOptimizationDefinition {
  const body=record(value),axes=record(body.axes),objective=record(body.objective),bounds=designBounds(options);
  const fail=(message:string):never=>{throw new ApiError(400,"DTCO_OPTIMIZATION_INVALID",message);};
  const number=(value:unknown,min:number,max:number,label:string):number=>{
    if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)fail(label+" must be a finite number between "+min+" and "+max);
    return Number((value as number).toPrecision(12));
  };
  const normalizedAxes={} as DtcoOptimizationDefinition["axes"];
  for(const key of ["nmosWidthUm","pmosWidthUm"] as const){
    if(body.parameterAxes!==undefined){const initial=key==="nmosWidthUm"?1:2;normalizedAxes[key]={min:initial,max:initial,initial,step:0.05};continue;}
    const axis=record(axes[key]),limit=bounds[key];
    const min=number(axis.min,limit.min,limit.max,key+".min"),max=number(axis.max,min,limit.max,key+".max");
    const initial=number(axis.initial,min,max,key+".initial"),step=number(axis.step,0.05,limit.max-limit.min,key+".step");
    for(const entry of [min,max,initial,step])if(Math.abs(entry/0.05-Math.round(entry/0.05))>1e-8)fail(key+" values must use the 0.05 um grid");
    normalizedAxes[key]={min,max,initial,step};
  }
  if(!["delayPs","averagePowerW","areaUm2","maxFrequencyHz","balanced"].includes(String(objective.metric)))fail("select a supported objective metric");
  const metric=objective.metric as DtcoOptimizationDefinition["objective"]["metric"];
  const normalizedObjective:DtcoOptimizationDefinition["objective"]={metric};
  if(metric==="balanced"){
    const weights=objective.weights===undefined?{delay:1,power:1,area:1}:record(objective.weights);
    normalizedObjective.weights={delay:number(weights.delay,0,1e6,"delay weight"),power:number(weights.power,0,1e6,"power weight"),area:number(weights.area,0,1e6,"area weight")};
    if(Object.values(normalizedObjective.weights).reduce((a,b)=>a+b,0)<=0)fail("at least one objective weight must be positive");
  }
  if(objective.target!==undefined)normalizedObjective.target=number(objective.target,0,1e12,"target");
  if(!Array.isArray(body.layoutIds)||!body.layoutIds.length||body.layoutIds.length>16)fail("Select registered compatible layout plans");
  const parameterAxes:NonNullable<DtcoOptimizationDefinition["parameterAxes"]>={};
  if(body.parameterAxes!==undefined) {
    if(!body.parameterAxes||typeof body.parameterAxes!=="object"||Array.isArray(body.parameterAxes)||Object.keys(body.parameterAxes).length>64)fail("parameterAxes must be a map with at most 64 parameters");
    for(const [key,value] of Object.entries(record(body.parameterAxes)).sort(([a],[b])=>a.localeCompare(b))) {
      if(!["voltageV","groundVoltageV","temperatureC"].includes(key)&&!/^(device|group):[^:]+:(widthUm|lengthUm)$/.test(key))fail("Unsupported optimization parameter: "+key);
      const axis=record(value),min=number(axis.min,-1000,10000,key+".min"),max=number(axis.max,min,10000,key+".max");
      const initial=number(axis.initial,min,max,key+".initial"),step=number(axis.step,1e-9,10000,key+".step");
      if(max>min&&step>max-min+1e-9)fail(key+" step exceeds its variable range");
      parameterAxes[key]={min,max,initial,step};
    }
  }
  const partial={...body,axes:normalizedAxes,objective:normalizedObjective,...(body.parameterAxes!==undefined?{parameterAxes}:{})} as unknown as DtcoOptimizationDefinition;
  const initial=initialCandidate(partial);
  const physical=normalizeDefinition(experimentDefinition(partial,initial),options);
  const profiles=dtcoProfiles(options,physical);
  if(profiles.circuit?.availableMetrics&&((metric==="areaUm2"||metric==="balanced")&&!profiles.circuit.availableMetrics.includes("areaUm2")))fail("The selected circuit flow cannot measure area; choose a delay or power objective");
  const normalizedCorners=body.processCorners===undefined?undefined:normalizeDefinition({...physical,processCorners:body.processCorners},options).processCorners;
  if(normalizedCorners&&normalizedCorners.length!==1)fail("An optimization must use one fixed process corner; use experiments to compare multiple process scenarios");
  if(profiles.circuit&&profiles.technology&&body.parameterAxes===undefined) {
    const resolved=resolveDtcoDimensions(physical,profiles.technology,profiles.circuit);
    for(const device of resolved) {
      const family=profiles.technology.deviceFamilies.find(family=>family.id===device.familyId)!;
      if(device.lockWidth&&normalizedAxes[family.polarity==="nmos"?"nmosWidthUm":"pmosWidthUm"].min!==normalizedAxes[family.polarity==="nmos"?"nmosWidthUm":"pmosWidthUm"].max)fail("Locked or fixed device widths cannot be optimized");
    }
  }
  if(!profiles.circuit&&(body.electricalMode??"extracted")==="extracted"&&(body.layoutIds as string[]).some(id=>id!=="mr-sa-12t-pex"))fail("Legacy extracted optimization requires the physical-completion layout");
  if(body.parameterAxes!==undefined&&!profiles.circuit)fail("Generic parameters require catalog profiles");
  for(const [key,axis] of Object.entries(parameterAxes)) {
    if(profiles.circuit&&profiles.technology&&key.includes(":")) {
      const [,id,dimension]=/^(?:device|group):(.+):(widthUm|lengthUm)$/.exec(key)!;
      const ids=key.startsWith("device:")?[id!]:profiles.circuit.groups.find(group=>group.id===id)?.deviceIds??[];
      if(!ids.length)fail("Unknown parameter device/group: "+key);
      const resolved=resolveDtcoDimensions(physical,profiles.technology,profiles.circuit);
      if(axis.min!==axis.max&&resolved.some(device=>ids.includes(device.id)&&(dimension==="widthUm"?device.lockWidth:device.lockLength)))fail("Locked or fixed dimensions cannot be optimization axes");
    }
    for(const value of [axis.min,axis.max,...(axis.initial+axis.step<=axis.max?[axis.initial+axis.step]:[])])normalizeDefinition(experimentDefinition(partial,{...initial,parameters:{...initial.parameters,[key]:Number(value.toPrecision(12))}}),options);
  }
  const vdd=parameterAxes.voltageV,vss=parameterAxes.groundVoltageV;
  for(const voltage of vdd?[vdd.min,vdd.max]:[physical.voltagesV[0]!])for(const ground of vss?[vss.min,vss.max]:[physical.groundVoltagesV?.[0]??0])
    normalizeDefinition({...physical,voltagesV:[voltage],groundVoltagesV:[ground]},options);
  const maxIterations=number(body.maxIterations??6,1,64,"maxIterations"),patience=number(body.patience??4,1,64,"patience");
  if(!Number.isInteger(maxIterations)||!Number.isInteger(patience))fail("iteration limit and patience must be integers");
  return {name:physical.name,circuitId:physical.circuitId,technologyId:physical.technologyId,modelVersion:physical.modelVersion,
    temperatureC:physical.temperaturesC[0]!,voltageV:physical.voltagesV[0]!,layoutIds:physical.layoutIds,loadFf:physical.loadFf,inputSlewPs:physical.inputSlewPs,periodNs:physical.periodNs,
    axes:normalizedAxes,...(body.parameterAxes!==undefined?{parameterAxes}:{}),
    ...(body.groundVoltageV!==undefined?{groundVoltageV:physical.groundVoltagesV?.[0]??0}:{}),
    ...(normalizedCorners?{processCorners:[...new Set(body.processCorners as NonNullable<DtcoOptimizationDefinition["processCorners"]>)]}:{}),
    ...(body.electricalMode!==undefined?{electricalMode:physical.electricalMode}:{}),
    ...(physical.sizingMode?{sizingMode:physical.sizingMode}:{}),
    ...(physical.deviceOverrides?{deviceOverrides:body.deviceOverrides as DtcoOptimizationDefinition["deviceOverrides"]}:{}),
    ...(physical.groupOverrides?{groupOverrides:body.groupOverrides as DtcoOptimizationDefinition["groupOverrides"]}:{}),
    ...(physical.characterizationArcId?{characterizationArcId:physical.characterizationArcId}:{}),
    ...(physical.workflow?{workflow:physical.workflow}:{}),
    objective:normalizedObjective,maxIterations,patience,minRelativeImprovement:number(body.minRelativeImprovement??0.01,0,1,"minRelativeImprovement")};
}
export class DtcoOptimizationService {
  readonly dtco:DtcoService;
  constructor(readonly repositories:Repositories,readonly storage:StorageService){this.dtco=new DtcoService(repositories.dtco,repositories,storage);}
  async options():Promise<DtcoOptions>{const options=await this.dtco.options();return {...options,optimization:optimizationOptions(options)};}
  async create(ownerId:string,clientRequestId:unknown,definition:unknown):Promise<DtcoOptimization>{
    if(typeof clientRequestId!=="string"||!clientRequestId.trim()||clientRequestId.length>160)throw new ApiError(400,"DTCO_REQUEST_ID_REQUIRED","clientRequestId must contain 1 to 160 characters");
    const options=await this.options();
    return this.repositories.dtcoOptimizations.create(ownerId,clientRequestId,normalizeOptimization(definition,options),options.environmentHash);
  }
  async start(id:string):Promise<DtcoOptimization>{
    const run=this.repositories.dtcoOptimizations.get(id)!;
    if(run.status!=="draft")return run;
    const options=await this.options();
    const availability=optimizationAvailability(run.definition,options);
    if(!availability.available)throw new ApiError(409,"DTCO_CHARACTERIZATION_UNAVAILABLE",availability.reason!);
    normalizeOptimization(run.definition,options);
    return this.repositories.dtcoOptimizations.start(id,options.environmentHash);
  }
  async resume(id:string,iterationId:string,attemptId:string):Promise<DtcoOptimization>{
    const run=this.repositories.dtcoOptimizations.get(id)!;
    if(run.status!=="paused")return run;
    const options=await this.options();
    const availability=optimizationAvailability(run.definition,options);
    if(!availability.available)throw new ApiError(409,"DTCO_CHARACTERIZATION_UNAVAILABLE",availability.reason!);
    if(options.environmentHash!==run.environmentHash)throw new ApiError(409,"DTCO_ENVIRONMENT_CHANGED","Create a new optimization for the changed model or tool environment");
    return this.repositories.dtcoOptimizations.resume(id,iterationId,attemptId);
  }
}
/** Requires a real pass/fail bracket; a capped lower bound is never an exact frequency objective. */
export function verifiedToggleFrequency(value:unknown,hashes:Record<string,unknown>,expected:DtcoExperimentDefinition):number {
  const frequency=record(value),pass=frequency.maximumVerifiedToggleFrequencyHz,fail=frequency.lowestVerifiedFailFrequencyHz;
  if(frequency.protocolVersion!==DTCO_FREQUENCY_PROTOCOL_VERSION)throw new Error(SUPERSEDED_FREQUENCY_REASON);
  const invalid=():never=>{throw new Error("Verified toggle frequency requires a toleranced real pass/fail bracket with matching conditions and hashed waveform evidence");};
  if(frequency.status!=="bracketed"||frequency.toleranceMet!==true||frequency.upperBoundNotFound!==false||typeof pass!=="number"||!Number.isFinite(pass)||pass<=0||typeof fail!=="number"||!Number.isFinite(fail)||fail<=pass||frequency.bracketWidthHz!==fail-pass||frequency.scope!=="combinational_cell_arc_toggle; not chip_clock_Fmax")invalid();
  const conditions=record(frequency.conditions);
  for(const [key,wanted] of Object.entries({temperatureC:expected.temperaturesC[0],voltageV:expected.voltagesV[0],groundVoltageV:expected.groundVoltagesV?.[0]??0,corner:expected.processCorners?.[0]??"tt",loadFf:expected.loadFf,inputSlewPs:expected.inputSlewPs}))if(conditions[key]!==wanted)invalid();
  const hasHash=(path:unknown,hash?:unknown):boolean=>typeof path==="string"&&typeof hashes[path]==="string"&&/^[a-f0-9]{64}$/.test(hashes[path] as string)&&(hash===undefined||hashes[path]===hash);
  if(!hasHash(frequency.evidencePath))invalid();
  const rounds=Array.isArray(frequency.rounds)?frequency.rounds.map(record):[];
  for(const [status,hz] of [["pass",pass],["fail",fail]] as const) {
    const round=rounds.find(round=>round.status===status&&round.frequencyHz===hz);
    const arcs=Array.isArray(round?.arcs)?round.arcs.map(record):[];
    if(round?.protocolVersion!==DTCO_FREQUENCY_PROTOCOL_VERSION)throw new Error(SUPERSEDED_FREQUENCY_REASON);
    if(!arcs.length||arcs.some(arc=>arc.simulatorExitCode!==0||!["pass","fail"].includes(String(arc.status)))||(status==="pass"?arcs.some(arc=>arc.status!=="pass"):!arcs.some(arc=>arc.status==="fail")))invalid();
    for(const arc of arcs)for(const prefix of ["waveform","log","deck","processEvidence"])if(typeof arc[prefix+"Sha256"]!=="string"||!hasHash(arc[prefix+"Path"],arc[prefix+"Sha256"]))invalid();
  }
  return pass as number;
}
/** Scores committed measurements only; extracted and explicit schematic scopes have separate evidence requirements. */
export function measuredResult(run:DtcoOptimization,result:ResultRecordV1,repositories:Repositories):{metrics:DtcoMeasuredMetrics;provenance:JsonObject}{
  const iteration=run.iterations.at(-1)!,job=iteration.jobId?repositories.jobs.get(iteration.jobId):null;
  const data=record(result.data.dtco),metrics=record(data.metrics),provenance=record(data.provenance),extraction=record(provenance.extraction),design=record(data.design);
  const snapshot=record(job?.parameters.dtcoSnapshot),definition=record(snapshot.definition),snapshotDesign=record(definition.design),coordinates=record(snapshot.coordinates);
  const fail=(message:string):never=>{throw new Error(message);};
  if(run.definition.workflow==="integrated"&&!isIntegratedAttemptComplete(iteration.attempts.at(-1)??{}))fail("Integrated optimization requires all child results and verified artifact provenance");
  if(!job||job.status!=="succeeded"||job.resultId!==result.id||result.moduleId!=="dtco"||result.ownerId!==run.ownerId||result.provenance.jobId!==job.id||result.provenance.origin!=="computed")fail("Result is not the computed output of this optimization job");
  const mode=run.definition.electricalMode??"extracted",resolved=record(snapshot.resolvedInputs),hasResolved=Object.keys(resolved).length>0;
  const requested=experimentDefinition(run.definition,iteration.candidate);
  if(coordinates.temperatureC!==requested.temperaturesC[0]||coordinates.voltageV!==requested.voltagesV[0]||(coordinates.groundVoltageV??0)!==(requested.groundVoltagesV?.[0]??0)||(coordinates.processCorner??"tt")!==(requested.processCorners?.[0]??"tt"))fail("Frozen operating coordinates differ from the proposed candidate");
  if(data.electricalMode!==mode||definition.electricalMode!==mode||snapshot.environmentHash!==run.environmentHash||coordinates.layoutId!==iteration.candidate.layoutId)fail("Measured and frozen inputs do not prove the requested characterization mode and environment");
  if(hasResolved) {
    if(canonical(resolved)!==canonical(data.resolvedInputs))fail("Measured dimensions or operating conditions differ from frozen resolved inputs");
    const expected=experimentDefinition(run.definition,iteration.candidate);
    for(const key of ["circuitId","technologyId","modelVersion","temperaturesC","voltagesV","groundVoltagesV","processCorners","layoutIds","loadFf","inputSlewPs","periodNs","design","sizingMode","deviceOverrides","groupOverrides","characterizationArcId"] as const)
      if(canonical(expected[key])!==canonical(definition[key]))fail("Frozen "+key+" differs from the proposed candidate");
    const operating=record(resolved.operating);
    if(resolved.technologyId!==run.definition.technologyId||resolved.circuitId!==run.definition.circuitId||resolved.modelVersion!==run.definition.modelVersion||
      operating.temperatureC!==expected.temperaturesC[0]||operating.voltageV!==expected.voltagesV[0]||operating.groundVoltageV!==(expected.groundVoltagesV?.[0]??0)||operating.processCorner!==(expected.processCorners?.[0]??"tt")||
      !Array.isArray(resolved.devices)||!resolved.devices.length||typeof resolved.cornerSection!=="string"||!resolved.cornerSection||typeof resolved.catalogHash!=="string"||!resolved.catalogHash)fail("Resolved provenance does not match the selected catalog and operating condition");
    if(typeof snapshot.metricScope!=="string"||!snapshot.metricScope||data.metricScope!==snapshot.metricScope)fail("Measured metric scope differs from the frozen characterization scope");
  } else {
    if(mode!=="extracted"||run.definition.parameterAxes||run.definition.processCorners||run.definition.groundVoltageV!==undefined)fail("Catalog sizing or schematic scoring requires resolved input provenance");
    for(const key of ["nmosWidthUm","pmosWidthUm"] as const)if(design[key]!==iteration.candidate.design[key]||snapshotDesign[key]!==iteration.candidate.design[key])fail("Measured device widths do not match the proposed candidate");
    if(design.lengthUm!==0.28)fail("Unexpected measured channel length");
  }
  const expectedDeviceCount=hasResolved?(resolved.devices as unknown[]).length:2;
  if(mode==="extracted"&&(extraction.drcCount!==0||extraction.drcStyle!=="drc(full)"||extraction.status!=="validated"||extraction.method!=="physical_gds_full_capacitance"||extraction.sourceGeometryMatched!==true||extraction.finalGdsRoundtrip!==true||extraction.deviceCount!==expectedDeviceCount||typeof extraction.capacitorCount!=="number"||extraction.capacitorCount<=0||extraction.resistanceExtracted!==false||extraction.signoff!==false))fail("Physical extraction evidence is missing or incompatible");
  const hashes=record(provenance.outputHashes);
  for(const [pathKey,hashKey] of (mode==="extracted"?[["selectedGdsPath","selectedGdsSha256"],["validationPath","validationSha256"],["electricalNetlistPath","electricalNetlistSha256"]]:[])){
    const source=pathKey==="selectedGdsPath"?provenance:extraction,path=source[pathKey!],hash=source[hashKey!];
    if(typeof path!=="string"||typeof hash!=="string"||!/^[a-f0-9]{64}$/.test(hash)||hashes[path]!==hash)fail("Extraction output hashes do not match authoritative output evidence");
  }
  const measured={} as DtcoMeasuredMetrics;
  for(const key of ["delayPs","averagePowerW","areaUm2"] as const){const value=metrics[key];if(key==="areaUm2"&&value===null&&["delayPs","averagePowerW","maxFrequencyHz"].includes(run.definition.objective.metric)){measured.areaUm2=null;continue;}if(typeof value!=="number"||!Number.isFinite(value)||value<=0)fail("Objective metric is missing, nonfinite or nonpositive");measured[key]=value as number;}
  if(run.definition.objective.metric==="maxFrequencyHz"||metrics.maxFrequencyHz!==undefined) {
    try {const value=verifiedToggleFrequency(data.frequency,hashes,requested);if(metrics.maxFrequencyHz!==value)fail("Published frequency metric differs from verified bracket");measured.maxFrequencyHz=value;}
    catch(error) {if(run.definition.objective.metric==="maxFrequencyHz")throw error;measured.maxFrequencyHz=null;}
  }
  const expectedHash=createHash("sha256").update(JSON.stringify(job!.inputManifest)).digest("hex");
  if(result.provenance.inputManifestSha256!==expectedHash)fail("Result input manifest provenance does not match frozen inputs");
  return {metrics:measured,provenance:{...provenance,...(record(data.frequency).protocolVersion===DTCO_FREQUENCY_PROTOCOL_VERSION?{frequencyProtocolVersion:DTCO_FREQUENCY_PROTOCOL_VERSION}:{}),jobId:job!.id,resultId:result.id,inputManifestSha256:expectedHash,environmentHash:run.environmentHash,parserId:result.provenance.parserId,parserVersion:result.provenance.parserVersion}};
}
export class DtcoOptimizationCoordinator {
  private stopped=false;
  constructor(readonly service:DtcoOptimizationService){}
  requestStop():void{this.stopped=true;}
  async tick():Promise<void>{
    if(this.stopped)return;
    for(const id of this.service.repositories.dtcoOptimizations.activeIds()){
      if(this.stopped)return;
      try{await this.reconcile(id);}catch(error){
        const run=this.service.repositories.dtcoOptimizations.get(id),iteration=run?.iterations.at(-1);
        if(run&&iteration)this.service.repositories.dtcoOptimizations.pause(id,iteration.id,errorRecord(error instanceof Error?error.message:String(error)));
      }
    }
  }
  async reconcile(id:string):Promise<void>{
    const {repositories}=this.service,repository=repositories.dtcoOptimizations;
    let run=repository.get(id);if(!run||!["running","stopping"].includes(run.status))return;
    const iteration=run.iterations.at(-1);if(!iteration)return;
    if(run.status==="stopping"){
      if(iteration.status==="preparing")return;
      if(iteration.jobId&&["queued","running"].includes(iteration.status)){
        if(run.definition.workflow==="integrated")new DtcoPipelineRepository(repositories).requestCancel(iteration.jobId);
        if(!repositories.jobs.isCancelRequested(iteration.jobId))repositories.jobs.requestCancel(iteration.jobId);
        return;
      }
      if(iteration.status==="succeeded"&&!iteration.evaluatedAt){
        const result=iteration.resultId?repositories.results.get("dtco",iteration.resultId,run.ownerId,true):null;
        if(result){const measured=measuredResult(run,result,repositories);repository.consume(id,iteration.id,measured.metrics,measured.provenance);return;}
      }
      repository.finishStopped(id);return;
    }
    const retryToken=repository.retryToken(id);
    if(iteration.status==="unsubmitted"||retryToken){
      const options=await this.service.options();
      run=repository.get(id)!;if(run.status!=="running"||this.stopped)return;
      if(options.environmentHash!==run.environmentHash){
        repository.pause(id,iteration.id,errorRecord("Model or tool environment changed; create a new optimization","DTCO_ENVIRONMENT_CHANGED"),"environment_changed");return;
      }
      const availability=optimizationAvailability(run.definition,options);
      if(!availability.available){
        repository.pause(id,iteration.id,errorRecord(availability.reason!,"DTCO_CHARACTERIZATION_UNAVAILABLE"));return;
      }
      await this.service.dtco.submit(run.experimentId,retryToken?iteration.pointId:undefined,retryToken);
      if(retryToken)repository.clearRetryToken(id,retryToken);
      return;
    }
    if(iteration.status==="succeeded"&&!iteration.evaluatedAt){
      const result=iteration.resultId?repositories.results.get("dtco",iteration.resultId,run.ownerId,true):null;
      if(!result)throw new Error("Successful optimization job has no committed measured result");
      const measured=measuredResult(run,result,repositories);
      repository.consume(id,iteration.id,measured.metrics,measured.provenance);return;
    }
    if(["failed","interrupted","cancelled","preparation_failed"].includes(iteration.status)&&!iteration.evaluatedAt)
      repository.pause(id,iteration.id,iteration.error||errorRecord("Optimization iteration failed"));
  }
}
