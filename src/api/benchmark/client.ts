import type { DraftPatchRequestV1, JobRecordV1, JsonObject, ResultRecordV1 } from "../../../shared/contracts/v1";
import { apiJsonBody, apiMultipartUpload, apiRequest } from "../client";
import type {
  BenchmarkCapabilities,
  BenchmarkDraftConfiguration,
  BenchmarkDraftResponse,
  BenchmarkStartResponse,
  BrowserInputFile,
} from "./types";

export async function getBenchmarkCapabilities(signal?: AbortSignal): Promise<BenchmarkCapabilities> {
  const response = await apiRequest<BenchmarkCapabilities>("/modules/benchmark/capabilities", { signal });
  return response.data;
}

export async function createBenchmarkDraft(
  configuration: BenchmarkDraftConfiguration,
  files: BrowserInputFile[],
  onProgress: (loaded: number, total: number | null) => void,
): Promise<BenchmarkDraftResponse> {
  const form = new FormData();
  form.append("operation", configuration.mode === "import" ? "import-completed-result" : "run-from-source");
  form.append("workflow", configuration.workflow);
  files.forEach((entry) => form.append(`file:${base64Url(entry.relativePath)}`, entry.file, entry.file.name));
  const response = await apiMultipartUpload<BenchmarkDraftResponse>("/modules/benchmark/drafts", form, onProgress);
  return response.data;
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function preflightBenchmarkDraft(
  jobId: string,
  configuration: BenchmarkDraftConfiguration,
  files: BrowserInputFile[],
  signal?: AbortSignal,
): Promise<JobRecordV1> {
  const fileRoles = Object.fromEntries(files.filter((entry) => entry.role).map((entry) => [entry.relativePath, entry.role as string]));
  const parameters: JsonObject = {
    mode: configuration.mode,
    operations: configuration.operations,
    translator: configuration.toolParameters.translator ?? {},
    fitting: configuration.toolParameters.fitting ?? {},
    reduction: configuration.toolParameters.reduction ?? {},
    expansion: configuration.toolParameters.expansion ?? {},
    benchmark: configuration.toolParameters["spice-benchmark"] ?? {},
  };
  const patch: DraftPatchRequestV1 = { fileRoles, parameters, technologyLibraryId: null };
  const response = await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/draft`, {
    method: "PATCH",
    body: apiJsonBody(patch),
    signal,
  });
  return response.data;
}

export async function startBenchmarkJob(jobId: string, signal?: AbortSignal): Promise<BenchmarkStartResponse> {
  const response = await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/start`, {
    method: "POST",
    body: apiJsonBody({}),
    signal,
  });
  return { job: response.data };
}

export async function listBenchmarkResults(): Promise<ResultRecordV1[]> {
  return (await apiRequest<ResultRecordV1[]>("/benchmark/results?limit=200")).data;
}
