import { createHash } from "node:crypto";
import type { DtcoMeasuredMetrics, DtcoOptimization, DtcoOptimizationDefinition, DtcoOptimizationOptions, DtcoOptions } from "../../../shared/contracts/dtco.ts";
import type { JsonObject, ResultRecordV1, StructuredJobErrorV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { ApiError } from "../../app/api/errors.ts";
import { DtcoService, normalizeDefinition } from "./service.ts";
import { experimentDefinition, initialCandidate } from "./optimizationAlgorithm.ts";
const designBounds = (options:DtcoOptions) => ({
  nmosWidthUm:{min:options.designBounds?.nmosWidthUm.min??0.95,max:options.designBounds?.nmosWidthUm.max??1.3},
  pmosWidthUm:{min:options.designBounds?.pmosWidthUm.min??1.4,max:options.designBounds?.pmosWidthUm.max??2.6},
});
const errorRecord = (message:string,code="DTCO_OPTIMIZATION_RESULT"):StructuredJobErrorV1=>({type:"configuration",code,message,stepId:null,retryable:true,details:null});
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function optimizationOptions(options: DtcoOptions): DtcoOptimizationOptions {
  const bounds=designBounds(options);
  const layoutIds=["mr-sa-12t-pex"];
  const available=options.available&&Boolean(options.layouts.find(item=>item.id===layoutIds[0])?.available)&&Boolean(options.electricalModes?.find(item=>item.id==="extracted")?.available);
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
    const axis=record(axes[key]),limit=bounds[key];
    const min=number(axis.min,limit.min,limit.max,key+".min"),max=number(axis.max,min,limit.max,key+".max");
    const initial=number(axis.initial,min,max,key+".initial"),step=number(axis.step,0.05,limit.max-limit.min,key+".step");
    for(const entry of [min,max,initial,step])if(Math.abs(entry/0.05-Math.round(entry/0.05))>1e-8)fail(key+" values must use the 0.05 um grid");
    normalizedAxes[key]={min,max,initial,step};
  }
  if(!["delayPs","averagePowerW","areaUm2","balanced"].includes(String(objective.metric)))fail("select a supported objective metric");
  const metric=objective.metric as DtcoOptimizationDefinition["objective"]["metric"];
  const normalizedObjective:DtcoOptimizationDefinition["objective"]={metric};
  if(metric==="balanced"){
    const weights=objective.weights===undefined?{delay:1,power:1,area:1}:record(objective.weights);
    normalizedObjective.weights={delay:number(weights.delay,0,1e6,"delay weight"),power:number(weights.power,0,1e6,"power weight"),area:number(weights.area,0,1e6,"area weight")};
    if(Object.values(normalizedObjective.weights).reduce((a,b)=>a+b,0)<=0)fail("at least one objective weight must be positive");
  }
  if(objective.target!==undefined)normalizedObjective.target=number(objective.target,0,1e12,"target");
  if(!Array.isArray(body.layoutIds)||body.layoutIds.length!==1||body.layoutIds[0]!=="mr-sa-12t-pex")fail("optimization requires the extracted physical-completion layout");
  const partial={...body,axes:normalizedAxes,objective:normalizedObjective} as unknown as DtcoOptimizationDefinition;
  const physical=normalizeDefinition(experimentDefinition(partial,initialCandidate(partial)),options);
  const maxIterations=number(body.maxIterations??6,1,64,"maxIterations"),patience=number(body.patience??4,1,64,"patience");
  if(!Number.isInteger(maxIterations)||!Number.isInteger(patience))fail("iteration limit and patience must be integers");
  return {name:physical.name,circuitId:physical.circuitId,technologyId:physical.technologyId,modelVersion:physical.modelVersion,
    temperatureC:physical.temperaturesC[0]!,voltageV:physical.voltagesV[0]!,layoutIds:physical.layoutIds,loadFf:physical.loadFf,inputSlewPs:physical.inputSlewPs,periodNs:physical.periodNs,
    axes:normalizedAxes,objective:normalizedObjective,maxIterations,patience,minRelativeImprovement:number(body.minRelativeImprovement??0.01,0,1,"minRelativeImprovement")};
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
    if(!options.optimization!.available)throw new ApiError(409,"DTCO_EXTRACTION_UNAVAILABLE",options.optimization!.reason!);
    normalizeOptimization(run.definition,options);
    return this.repositories.dtcoOptimizations.start(id,options.environmentHash);
  }
  async resume(id:string,iterationId:string,attemptId:string):Promise<DtcoOptimization>{
    const run=this.repositories.dtcoOptimizations.get(id)!;
    if(run.status!=="paused")return run;
    const options=await this.options();
    if(!options.optimization!.available)throw new ApiError(409,"DTCO_EXTRACTION_UNAVAILABLE",options.optimization!.reason!);
    if(options.environmentHash!==run.environmentHash)throw new ApiError(409,"DTCO_ENVIRONMENT_CHANGED","Create a new optimization for the changed model or tool environment");
    return this.repositories.dtcoOptimizations.resume(id,iterationId,attemptId);
  }
}
/** Uses only committed results. Schematic metrics and unverified extraction never receive a score. */
export function measuredResult(run:DtcoOptimization,result:ResultRecordV1,repositories:Repositories):{metrics:DtcoMeasuredMetrics;provenance:JsonObject}{
  const iteration=run.iterations.at(-1)!,job=iteration.jobId?repositories.jobs.get(iteration.jobId):null;
  const data=record(result.data.dtco),metrics=record(data.metrics),provenance=record(data.provenance),extraction=record(provenance.extraction),design=record(data.design);
  const snapshot=record(job?.parameters.dtcoSnapshot),definition=record(snapshot.definition),snapshotDesign=record(definition.design),coordinates=record(snapshot.coordinates);
  const fail=(message:string):never=>{throw new Error(message);};
  if(!job||job.status!=="succeeded"||job.resultId!==result.id||result.moduleId!=="dtco"||result.ownerId!==run.ownerId||result.provenance.jobId!==job.id||result.provenance.origin!=="computed")fail("Result is not the computed output of this optimization job");
  if(data.electricalMode!=="extracted"||definition.electricalMode!=="extracted"||snapshot.environmentHash!==run.environmentHash||coordinates.layoutId!==iteration.candidate.layoutId)fail("Measured and frozen inputs do not prove extracted characterization in this environment");
  for(const key of ["nmosWidthUm","pmosWidthUm"] as const)if(design[key]!==iteration.candidate.design[key]||snapshotDesign[key]!==iteration.candidate.design[key])fail("Measured device widths do not match the proposed candidate");
  if(design.lengthUm!==0.28)fail("Unexpected measured channel length");
  if(extraction.drcCount!==0||extraction.drcStyle!=="drc(full)"||extraction.status!=="validated"||extraction.method!=="physical_gds_full_capacitance"||extraction.sourceGeometryMatched!==true||extraction.finalGdsRoundtrip!==true||extraction.deviceCount!==2||typeof extraction.capacitorCount!=="number"||extraction.capacitorCount<=0||extraction.resistanceExtracted!==false||extraction.signoff!==false)fail("Physical extraction evidence is missing or incompatible");
  const hashes=record(provenance.outputHashes);
  for(const [pathKey,hashKey] of [["selectedGdsPath","selectedGdsSha256"],["validationPath","validationSha256"],["electricalNetlistPath","electricalNetlistSha256"]]){
    const source=pathKey==="selectedGdsPath"?provenance:extraction,path=source[pathKey!],hash=source[hashKey!];
    if(typeof path!=="string"||typeof hash!=="string"||!/^[a-f0-9]{64}$/.test(hash)||hashes[path]!==hash)fail("Extraction output hashes do not match authoritative output evidence");
  }
  const measured={} as DtcoMeasuredMetrics;
  for(const key of ["delayPs","averagePowerW","areaUm2"] as const){const value=metrics[key];if(typeof value!=="number"||!Number.isFinite(value)||value<=0)fail("Objective metric is missing, nonfinite or nonpositive");measured[key]=value as number;}
  const expectedHash=createHash("sha256").update(JSON.stringify(job!.inputManifest)).digest("hex");
  if(result.provenance.inputManifestSha256!==expectedHash)fail("Result input manifest provenance does not match frozen inputs");
  return {metrics:measured,provenance:{...provenance,jobId:job!.id,resultId:result.id,inputManifestSha256:expectedHash,environmentHash:run.environmentHash,parserId:result.provenance.parserId,parserVersion:result.provenance.parserVersion}};
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
      if(!options.optimization!.available){
        repository.pause(id,iteration.id,errorRecord(options.optimization!.reason!,"DTCO_EXTRACTION_UNAVAILABLE"));return;
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
