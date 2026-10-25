import type { DtcoExperimentDefinition, DtcoOptions, DtcoSubmitResponse } from "../../../shared/contracts/dtco.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { ApiError } from "../../app/api/errors.ts";
import { DtcoRepository, preparationError } from "./repository.ts";
import { getDtcoOptions, prepareDtcoJob } from "./environment.ts";

function assertWaveformBudget(definition: Pick<DtcoExperimentDefinition, "periodNs" | "inputSlewPs">): void {
  const estimatedSteps = 4 * definition.periodNs / Math.min(definition.inputSlewPs / 1000 / 20, definition.periodNs / 10000);
  if (!Number.isFinite(estimatedSteps) || estimatedSteps > 1_000_000) throw new ApiError(400,"DTCO_WAVEFORM_BUDGET","waveform exceeds the 1,000,000 estimated transient step limit; increase input slew or shorten the period");
}

export function normalizeDefinition(value: unknown, options: DtcoOptions): DtcoExperimentDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "DTCO_DEFINITION_INVALID", "experiment definition must be an object");
  const body = value as Record<string, unknown>;
  const text = (key: string): string => {
    const result = body[key];
    if (typeof result !== "string" || !result.trim() || result.length > 160) throw new ApiError(400,"DTCO_DEFINITION_INVALID", key + " must be a nonempty string of at most 160 characters");
    return result.trim();
  };
  const number = (key: string, min: number, max: number, fallback?: number): number => {
    const result = body[key] === undefined ? fallback : body[key];
    if (typeof result !== "number" || !Number.isFinite(result) || result < min || result > max) throw new ApiError(400,"DTCO_DEFINITION_INVALID", key + " is outside the supported range " + min + " to " + max);
    return Object.is(result, -0) ? 0 : Number(result.toPrecision(12));
  };
  const numbers = (key: string, min: number, max: number): number[] => {
    if (!Array.isArray(body[key]) || !(body[key] as unknown[]).length || (body[key] as unknown[]).length > 64) throw new ApiError(400,"DTCO_DEFINITION_INVALID", key + " must contain 1 to 64 numbers");
    return [...new Set((body[key] as unknown[]).map(value => {
      if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new ApiError(400,"DTCO_DEFINITION_INVALID", key + " contains an unsupported value");
      return Object.is(value, -0) ? 0 : Number(value.toPrecision(12));
    }))].sort((a,b) => a-b);
  };
  const circuitId = text("circuitId"), technologyId = text("technologyId"), modelVersion = text("modelVersion");
  if (!options.circuits.some(option => option.id === circuitId) || !options.technologies.some(option => option.id === technologyId) || !options.models.some(option => option.id === modelVersion && option.technologyId === technologyId)) throw new ApiError(400,"DTCO_CONFIGURATION_UNSUPPORTED","selected circuit, technology, and model version are not compatible");
  const layoutValues = body.layoutIds;
  if (!Array.isArray(layoutValues) || !layoutValues.length || layoutValues.length > 64 || layoutValues.some(id => typeof id !== "string" || !options.layouts.some(option => option.id === id))) throw new ApiError(400,"DTCO_LAYOUT_UNSUPPORTED","select at least one registered layout plan");
  const result: DtcoExperimentDefinition = { name: text("name"), circuitId, technologyId, modelVersion, temperaturesC: numbers("temperaturesC",-40,125), voltagesV: numbers("voltagesV",2.7,3.6), layoutIds: [...new Set(layoutValues as string[])].sort(), loadFf: number("loadFf",0.1,1000,options.defaults.loadFf), inputSlewPs: number("inputSlewPs",1,10000,options.defaults.inputSlewPs), periodNs: number("periodNs",1,1000,options.defaults.periodNs) };
  if (result.temperaturesC.length * result.voltagesV.length * result.layoutIds.length > Math.min(options.maxPoints,64)) throw new ApiError(400,"DTCO_POINT_LIMIT","an experiment may contain at most 64 unique parameter combinations");
  if (result.inputSlewPs / 1000 >= result.periodNs / 4) throw new ApiError(400,"DTCO_WAVEFORM_INVALID","input slew must be shorter than one quarter the waveform period");
  assertWaveformBudget(result);
  if (body.design !== undefined) {
    if (!body.design || typeof body.design !== "object" || Array.isArray(body.design)) throw new ApiError(400,"DTCO_DESIGN_INVALID","design must contain NMOS and PMOS widths");
    const design = body.design as Record<string, unknown>;
    const width = (key: string, min: number, max: number): number => {
      const value = design[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || Math.abs(value / 0.05 - Math.round(value / 0.05)) > 1e-8) throw new ApiError(400,"DTCO_DESIGN_INVALID",key + " must lie on the 0.05 um grid within " + min + " to " + max);
      return Number(value.toFixed(8));
    };
    result.design = { nmosWidthUm: width("nmosWidthUm",0.7,1.3), pmosWidthUm: width("pmosWidthUm",1.4,2.6) };
  }
  if (body.electricalMode !== undefined) {
    if (body.electricalMode !== "schematic" && body.electricalMode !== "extracted") throw new ApiError(400,"DTCO_MODE_INVALID","electricalMode must be schematic or extracted");
    result.electricalMode = body.electricalMode;
    if (body.electricalMode === "extracted" && result.layoutIds.some(id => id !== "mr-sa-12t-pex")) throw new ApiError(400,"DTCO_EXTRACTION_LAYOUT","extracted characterization requires the physical-completion layout");
  }
  return result;
}

export class DtcoService {
  constructor(readonly repository: DtcoRepository, private readonly repositories: Repositories, private readonly storage: StorageService) {}
  options(): Promise<DtcoOptions> { return getDtcoOptions(this.repositories,this.storage); }
  async save(ownerId: string, value: unknown, id?: string) {
    const options = await this.options();
    return this.repository.save(ownerId,normalizeDefinition(value,options),options.environmentHash,id);
  }
  async submit(experimentId: string, onlyPointId?: string, expectedAttemptId?: string): Promise<DtcoSubmitResponse> {
    const experiment = this.repository.get(experimentId)!;
    assertWaveformBudget(experiment.definition);
    const ids = onlyPointId ? [onlyPointId] : experiment.points.map(point => point.id);
    const submitted: string[] = [], skipped: string[] = [], failed: Array<{pointId:string;message:string}> = [];
    // Reservation is synchronous SQLite work before the first await. Concurrent
    // requests see the durable preparing attempt and cannot create another job.
    const reservations = ids.map(pointId => ({ pointId, reserved: this.repository.reserve(pointId,Boolean(onlyPointId),expectedAttemptId) }));
    for (const {pointId,reserved} of reservations) {
      if (!reserved) { skipped.push(pointId); continue; }
      try {
        const frozenEnvironment = reserved.experiment.revisions.find(item => item.revision === reserved.point.revision)!.environmentHash;
        const options = await this.options();
        if (options.environmentHash !== frozenEnvironment) throw new Error("Registered model or tool configuration changed. Save a new experiment revision before submitting.");
        const job = this.repositories.jobs.get(reserved.attempt.jobId)!;
        const prepared = await prepareDtcoJob(this.repositories,this.storage,job,reserved.experiment.definition,reserved.point);
        const parameters = { ...prepared.parameters, dtcoExperimentId: experimentId, dtcoPointId: pointId, dtcoPointKey: reserved.point.key, dtcoRevision: reserved.point.revision };
        this.repositories.jobs.setDraft(job.id,prepared.inputManifest,parameters,prepared.capabilityVersion,prepared.toolConfigurations,prepared.toolVersions,prepared.plan);
        await this.storage.writeManifest(job.id,prepared.inputManifest);
        await this.storage.freezeInputs(job.id);
        this.repositories.jobs.start(job.id);
        this.repository.finishPreparation(reserved.attempt.id);
        this.repositories.jobs.appendEvent(job.id,null,"info","system","DTCO experiment point queued",{experimentId,pointId,revision:reserved.point.revision});
        submitted.push(pointId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const current = this.repositories.jobs.get(reserved.attempt.jobId);
        if (current && !["draft","validating","ready"].includes(current.status)) {
          this.repository.finishPreparation(reserved.attempt.id); submitted.push(pointId);
        } else {
          this.repository.finishPreparation(reserved.attempt.id,preparationError(message));
          failed.push({pointId,message});
        }
      }
    }
    return { experiment: this.repository.get(experimentId)!, submitted, skipped, failed };
  }
}
