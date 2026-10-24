/* ═══════════════════════════════════════════════════════════════════ */
/*  Workflow API — typed endpoints (goal.md §7)                         */
/* ═══════════════════════════════════════════════════════════════════ */

import type {
  PreflightResult,
  ServerCapabilities,
  WorkflowDetail,
  WorkflowFilter,
  WorkflowListResponse,
  WorkflowSubmitResponse,
  WorkflowRequest,
} from "../types";
import type { SpiceBenchmarkManifest } from "../../../data/SpiceBenchmarkTypes";
import { get, post, multipartPost, type MultipartField } from "./client";

/* ─── Capabilities ─── */
export function fetchCapabilities(signal?: AbortSignal): Promise<ServerCapabilities> {
  return get<ServerCapabilities>("/capabilities", signal);
}

/* ─── Preflight — upload model and get analysis ─── */
export interface PreflightFiles {
  model: File;
  bundle?: File;
  datasets?: File[];
  sigmaMap?: File;
}

export function preflight(
  files: PreflightFiles,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<PreflightResult> {
  const fields: MultipartField[] = [
    { name: "model", value: files.model, filename: files.model.name },
  ];
  if (files.bundle) {
    fields.push({ name: "bundle", value: files.bundle, filename: files.bundle.name });
  }
  for (const ds of files.datasets ?? []) {
    fields.push({ name: "datasets", value: ds, filename: ds.name });
  }
  if (files.sigmaMap) {
    fields.push({ name: "sigmaMap", value: files.sigmaMap, filename: files.sigmaMap.name });
  }
  return multipartPost<PreflightResult>("/preflight", fields, onProgress, signal);
}

/* ─── Workflow CRUD ─── */
export function submitWorkflow(
  request: WorkflowRequest,
  files: { model: File; bundle?: File; datasets?: File[]; sigmaMap?: File },
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<WorkflowSubmitResponse> {
  const fields: MultipartField[] = [
    { name: "request", value: JSON.stringify(request), contentType: "application/json" },
    { name: "model", value: files.model, filename: files.model.name },
  ];
  if (files.bundle) {
    fields.push({ name: "bundle", value: files.bundle, filename: files.bundle.name });
  }
  for (const ds of files.datasets ?? []) {
    fields.push({ name: "datasets", value: ds, filename: ds.name });
  }
  if (files.sigmaMap) {
    fields.push({ name: "sigmaMap", value: files.sigmaMap, filename: files.sigmaMap.name });
  }
  return multipartPost<WorkflowSubmitResponse>("/workflows", fields, onProgress, signal);
}

export function listWorkflows(filter?: WorkflowFilter, signal?: AbortSignal): Promise<WorkflowListResponse> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.page !== undefined) params.set("page", String(filter.page));
  if (filter?.pageSize !== undefined) params.set("pageSize", String(filter.pageSize));
  if (filter?.sort) params.set("sort", filter.sort);
  if (filter?.order) params.set("order", filter.order);
  const qs = params.toString();
  return get<WorkflowListResponse>(`/workflows${qs ? `?${qs}` : ""}`, signal);
}

export function getWorkflow(workflowId: string, signal?: AbortSignal): Promise<WorkflowDetail> {
  return get<WorkflowDetail>(`/workflows/${workflowId}`, signal);
}

export function cancelWorkflow(workflowId: string, signal?: AbortSignal): Promise<WorkflowDetail> {
  return post<WorkflowDetail>(`/workflows/${workflowId}/cancel`, {}, signal);
}

export function cloneWorkflow(workflowId: string, signal?: AbortSignal): Promise<WorkflowSubmitResponse> {
  return post<WorkflowSubmitResponse>(`/workflows/${workflowId}/clone`, {}, signal);
}

/* ─── Manifest ─── */
export function getWorkflowManifest(workflowId: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>(`/workflows/${workflowId}/manifest`, signal);
}

export function getBenchmarkManifest(workflowId: string, signal?: AbortSignal): Promise<SpiceBenchmarkManifest> {
  return get<SpiceBenchmarkManifest>(`/workflows/${workflowId}/benchmark-manifest`, signal);
}

/* ─── Artifacts ─── */
export function getArtifactDownloadUrl(artifactId: string): string {
  const base = import.meta.env.VITE_PIPELINE_API_BASE_URL || "http://localhost:8000/api/v1";
  const token = localStorage.getItem("pipeline_access_token");
  const params = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${base}/artifacts/${artifactId}/download${params}`;
}

export function getWorkflowDownloadUrl(workflowId: string): string {
  const base = import.meta.env.VITE_PIPELINE_API_BASE_URL || "http://localhost:8000/api/v1";
  const token = localStorage.getItem("pipeline_access_token");
  const params = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${base}/workflows/${workflowId}/download.zip${params}`;
}
