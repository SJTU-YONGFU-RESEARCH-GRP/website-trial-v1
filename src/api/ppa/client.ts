import type { InputManifestV1, JobRecordV1, ModuleCapabilityResponseV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { apiJsonBody, apiMultipartUpload, apiRequest } from "../client";

export interface PpaCapabilityResponse extends ModuleCapabilityResponseV1 { configured?: boolean; unavailableReason?: string | null; }
export interface PpaDraftCreated { job: JobRecordV1; recognition: InputManifestV1; }
export interface PpaDraftPatch { fileRoles: Record<string, string>; parameters: Record<string, unknown>; technologyLibraryId: string | null; }

export async function getPpaCapabilities(): Promise<PpaCapabilityResponse> { return (await apiRequest<PpaCapabilityResponse>("/modules/ppa/capabilities")).data; }

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value); let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function createPpaDraft(operation: "run" | "import", workflow: string, files: Array<{ file: File; relativePath: string }>, onProgress: (loaded: number, total: number | null) => void): Promise<PpaDraftCreated> {
  const form = new FormData(); form.set("operation", operation); form.set("workflow", workflow);
  for (const selected of files) form.append(`file:${base64Url(selected.relativePath)}`, selected.file, selected.file.name);
  return (await apiMultipartUpload<PpaDraftCreated>("/modules/ppa/drafts", form, onProgress)).data;
}

export async function preflightPpaDraft(jobId: string, patch: PpaDraftPatch): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/draft`, { method: "PATCH", body: apiJsonBody(patch) })).data;
}
export async function startPpaJob(jobId: string): Promise<JobRecordV1> { return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/start`, { method: "POST" })).data; }
export async function listPpaResults(): Promise<ResultRecordV1[]> { return (await apiRequest<ResultRecordV1[]>("/ppa/results?limit=500")).data; }
