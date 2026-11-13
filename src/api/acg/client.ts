import type { ArtifactRecordV1, InputManifestV1, JobRecordV1, JsonObject, ModuleCapabilityResponseV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { apiJsonBody, apiMultipartUpload, apiRequest } from "../client";

export type AcgEngine = "cmos" | "dr" | "mr";
export type AcgMode = "placement" | "routed";
export type AcgResearchOperation = "algorithm-matrix" | "algorithm-report" | "known-feasible";
export type AcgOperation = "unified" | "run" | AcgResearchOperation;
export interface AcgUnifiedParameters extends JsonObject {
  algorithms: string[]; trials: number; threads: number; maxCols: number;
  searchMaxAttempts: number; searchTotalBudgetSeconds: number; searchPerAttemptSeconds: number;
  searchTrackNums: number[]; searchExtraCpp: number[];
}
export type AcgFileRole = "netlist" | "config" | "rules" | "placement" | "port-verilog" | "port-metadata" | "source-diagnostic" | "algorithm-config" | "aggregate";
export interface AcgPreset {
  id: string; label: string; engine: AcgEngine; technology: string; trackNum: number; numRows: number;
  modes: AcgMode[]; configFilename: string; rulesFilename: string; description: string;
}
export type AcgCapabilities = ModuleCapabilityResponseV1;
export interface AcgDraftPatch { fileRoles: Record<string, AcgFileRole>; parameters: JsonObject; }
export interface AcgDraftCreated { job: JobRecordV1; recognition: InputManifestV1; }
export interface AcgUpload { file: File; relativePath: string; }

export async function getAcgCapabilities(): Promise<AcgCapabilities> {
  return (await apiRequest<AcgCapabilities>("/modules/acg/capabilities")).data;
}
function encodedPath(path: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(path)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export async function createAcgDraft(files: AcgUpload[], onProgress: (loaded: number, total: number | null) => void, operation: AcgOperation = "run"): Promise<AcgDraftCreated> {
  const form = new FormData();
  form.set("operation", operation); form.set("workflow", "autocellgen");
  for (const selected of files) form.append(`file:${encodedPath(selected.relativePath)}`, selected.file, selected.file.name);
  return (await apiMultipartUpload<AcgDraftCreated>("/modules/acg/drafts", form, onProgress)).data;
}
export async function preflightAcgDraft(id: string, patch: AcgDraftPatch): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(id)}/draft`, { method: "PATCH", body: apiJsonBody(patch) })).data;
}
export async function startAcgJob(id: string): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(id)}/start`, { method: "POST" })).data;
}
export async function listAcgResults(): Promise<ResultRecordV1[]> {
  return (await apiRequest<ResultRecordV1[]>("/acg/results?limit=200")).data;
}

/** Result access authorizes metadata independently from private job details. */
export async function getAcgResultArtifacts(resultId: string): Promise<ArtifactRecordV1[]> {
  return (await apiRequest<ArtifactRecordV1[]>(`/results/acg/${encodeURIComponent(resultId)}/artifacts`)).data;
}
export function acgResultArchiveUrl(resultId: string): string {
  return `/api/results/acg/${encodeURIComponent(resultId)}/artifacts.zip`;
}

/** The server resolves authenticated or anonymous execution ownership and filters sources. */
export async function getAcgResearchSources(): Promise<{ ownerId: string; results: ResultRecordV1[] }> {
  return (await apiRequest<{ ownerId: string; results: ResultRecordV1[] }>("/modules/acg/research-sources")).data;
}
