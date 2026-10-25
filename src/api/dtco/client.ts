import type { DtcoExperiment, DtcoExperimentDefinition, DtcoOptions, DtcoSubmitResponse } from "../../../shared/contracts/dtco";
import { apiJsonBody, apiRequest } from "../client";
const id = encodeURIComponent;
export async function getDtcoOptions(signal?: AbortSignal): Promise<DtcoOptions> {
  return (await apiRequest<DtcoOptions>("/dtco/options", { signal })).data;
}
export async function listDtcoExperiments(signal?: AbortSignal): Promise<DtcoExperiment[]> {
  return (await apiRequest<DtcoExperiment[]>("/dtco/experiments", { signal })).data;
}
export async function getDtcoExperiment(experimentId: string, signal?: AbortSignal): Promise<DtcoExperiment> {
  return (await apiRequest<DtcoExperiment>(`/dtco/experiments/${id(experimentId)}`, { signal })).data;
}
export async function saveDtcoExperiment(definition: DtcoExperimentDefinition, experimentId?: string, signal?: AbortSignal): Promise<DtcoExperiment> {
  return (await apiRequest<DtcoExperiment>(experimentId ? `/dtco/experiments/${id(experimentId)}` : "/dtco/experiments", {
    method: experimentId ? "PUT" : "POST", body: apiJsonBody(definition), signal,
  })).data;
}
export async function submitDtcoExperiment(experimentId: string, signal?: AbortSignal): Promise<DtcoSubmitResponse> {
  return (await apiRequest<DtcoSubmitResponse>(`/dtco/experiments/${id(experimentId)}/submit`, { method: "POST", signal })).data;
}
export async function retryDtcoPoint(pointId: string, attemptId: string, signal?: AbortSignal): Promise<DtcoSubmitResponse> {
  return (await apiRequest<DtcoSubmitResponse>(`/dtco/points/${id(pointId)}/retry`, { method: "POST", body: apiJsonBody({ attemptId }), signal })).data;
}
