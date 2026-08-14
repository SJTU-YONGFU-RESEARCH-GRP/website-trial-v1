import type { DraftPatchRequestV1, JobRecordV1, JsonObject } from "../../../shared/contracts/v1";
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
  form.append("request", JSON.stringify({
    operation: configuration.mode === "import" ? "import-completed-result" : "run-from-source",
    workflow: configuration.workflow,
  }));
  form.append("fileMetadata", JSON.stringify(files.map((entry, index) => ({
    part: `file-${index}`,
    relativePath: entry.relativePath,
    sha256: entry.sha256,
    role: entry.role,
  }))));
  files.forEach((entry, index) => form.append(`file-${index}`, entry.file, entry.file.name));
  const response = await apiMultipartUpload<BenchmarkDraftResponse>("/modules/benchmark/drafts", form, onProgress);
  return response.data;
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
  const response = await apiRequest<BenchmarkStartResponse>(`/jobs/${encodeURIComponent(jobId)}/start`, {
    method: "POST",
    body: apiJsonBody({}),
    signal,
  });
  return response.data;
}
