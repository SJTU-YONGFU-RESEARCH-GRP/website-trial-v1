import type {
  JsonObject,
  JobEventRecordV1,
  JobRecordV1,
  JobStatus,
  ModuleId,
} from "../../../shared/contracts/v1";
import { apiRequest } from "../client";
import type { JobDetailV1, JobResultV1 } from "./types";

export interface JobFilters {
  moduleId?: ModuleId;
  status?: JobStatus;
  ownerId?: string;
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
}

function queryString(filters: JobFilters): string {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function listJobs(filters: JobFilters = {}): Promise<JobRecordV1[]> {
  return (await apiRequest<JobRecordV1[]>(`/jobs${queryString(filters)}`)).data;
}

export async function getJob(jobId: string): Promise<JobDetailV1> {
  return (await apiRequest<JobDetailV1>(`/jobs/${encodeURIComponent(jobId)}`)).data;
}

export async function getJobEvents(jobId: string, after = 0): Promise<JobEventRecordV1[]> {
  return (await apiRequest<JobEventRecordV1[]>(
    `/jobs/${encodeURIComponent(jobId)}/events?stream=false&after=${after}`,
  )).data;
}

export async function cancelJob(jobId: string): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
  })).data;
}

export async function retryJob(jobId: string): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
  })).data;
}

export async function cloneJob(jobId: string): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/clone`, {
    method: "POST",
  })).data;
}

export async function preflightClonedJob(job: JobRecordV1): Promise<JobRecordV1> {
  const fileRoles = Object.fromEntries(job.inputManifest.files.flatMap((file) => file.role ? [[file.relativePath, file.role]] : []));
  const technology = job.parameters.technologyLibraryId;
  const technologyLibraryId = typeof technology === "string" ? technology : null;
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(job.id)}/draft`, {
    method: "PATCH",
    body: JSON.stringify({ fileRoles, parameters: job.parameters as JsonObject, technologyLibraryId }),
  })).data;
}

export async function startReadyJob(jobId: string): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/start`, {
    method: "POST",
  })).data;
}

export async function getJobResult(moduleId: ModuleId, resultId: string): Promise<JobResultV1> {
  return (await apiRequest<JobResultV1>(
    `/results/${moduleId}/${encodeURIComponent(resultId)}`,
  )).data;
}

export function diagnosticBundleUrl(jobId: string): string {
  return `/api/admin/jobs/${encodeURIComponent(jobId)}/diagnostics.zip`;
}

export async function cleanJobWorkspace(jobId: string): Promise<{ cleaned: boolean; jobId: string }> {
  return (await apiRequest<{ cleaned: boolean; jobId: string }>(
    `/admin/jobs/${encodeURIComponent(jobId)}/cleanup`,
    { method: "POST" },
  )).data;
}

export function artifactDownloadUrl(artifactId: string): string {
  return `/api/artifacts/${encodeURIComponent(artifactId)}/download`;
}
