import type { DtcoOptimization, DtcoOptimizationCreateRequest, DtcoOptimizationResumeRequest } from "../../../shared/contracts/dtco";
import { apiJsonBody, apiRequest } from "../client";
const root = "/dtco/optimizations";
export async function listDtcoOptimizations(signal?: AbortSignal): Promise<DtcoOptimization[]> {
  return (await apiRequest<DtcoOptimization[]>(root, { signal })).data;
}
export async function getDtcoOptimization(id: string, signal?: AbortSignal): Promise<DtcoOptimization> {
  return (await apiRequest<DtcoOptimization>(`${root}/${encodeURIComponent(id)}`, { signal })).data;
}
export async function createDtcoOptimization(body: DtcoOptimizationCreateRequest, signal?: AbortSignal): Promise<DtcoOptimization> {
  return (await apiRequest<DtcoOptimization>(root, { method: "POST", body: apiJsonBody(body), signal })).data;
}
export async function controlDtcoOptimization(id: string, action: "start" | "stop" | "resume", body?: DtcoOptimizationResumeRequest, signal?: AbortSignal): Promise<DtcoOptimization> {
  return (await apiRequest<DtcoOptimization>(`${root}/${encodeURIComponent(id)}/${action}`, { method: "POST", body: body ? apiJsonBody(body) : undefined, signal })).data;
}
