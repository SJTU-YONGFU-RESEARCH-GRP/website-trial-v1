export type UploadDataset = "benchmark" | "digital" | "ppa";

export interface UploadRecognition {
  tool: string;
  format: string;
  summary: string;
  details: string[];
}

export interface UploadResponse {
  schemaVersion: "eda-upload-response.v1";
  status: "published";
  dataset: UploadDataset;
  uploadId: string;
  acceptedFiles: number;
  recordCount: number;
  publishedIds: string[];
  refreshMode: "index" | "reload";
  recognition: UploadRecognition;
}

export interface UploadJobLog {
  at: string;
  level: "info" | "success" | "error";
  message: string;
}

export interface UploadJob {
  schemaVersion: "eda-upload-job.v1";
  jobId: string;
  uploadId: string;
  dataset: UploadDataset;
  tool: string;
  status: "queued" | "processing" | "published" | "failed";
  progress: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
  logs: UploadJobLog[];
  result?: UploadResponse;
  error?: { code: string; message: string };
}

interface UploadErrorBody {
  error?: { code?: string; message?: string; detail?: unknown };
}

export class DataUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "DataUploadError";
  }
}

function filePath(file: File): string {
  return file.webkitRelativePath || file.name;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      if (comma < 0) reject(new Error(`${file.name}: browser did not produce a data URL`));
      else resolve(result.slice(comma + 1));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error(`${file.name}: read failed`)));
    reader.readAsDataURL(file);
  });
}

function apiBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}api/uploads`;
}

function errorFromBody(status: number, body: UploadErrorBody | null): DataUploadError {
  return new DataUploadError(
    body?.error?.message ?? `Upload service returned HTTP ${status || 0}`,
    status,
    body?.error?.code,
  );
}

export async function loadUploadJob(jobId: string): Promise<UploadJob> {
  if (!/^[a-f0-9-]{36}$/.test(jobId)) throw new DataUploadError("Invalid upload job ID", 400, "JOB_ID_INVALID");
  const response = await fetch(`${apiBase()}/jobs/${jobId}`, { cache: "no-store" });
  const body = await response.json().catch(() => null) as UploadJob | UploadErrorBody | null;
  if (!response.ok || !body || !("status" in body)) throw errorFromBody(response.status, body as UploadErrorBody | null);
  return body;
}

async function waitForJob(
  initial: UploadJob,
  onProgress: (percent: number) => void,
  onJob: (job: UploadJob) => void,
): Promise<UploadResponse> {
  let job = initial;
  while (true) {
    onJob(job);
    onProgress(Math.min(100, 40 + Math.round(job.progress * 0.6)));
    if (job.status === "published" && job.result) {
      onProgress(100);
      return job.result;
    }
    if (job.status === "failed") {
      throw new DataUploadError(job.error?.message ?? "Backend processing failed", 422, job.error?.code ?? "PROCESSING_FAILED");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    job = await loadUploadJob(job.jobId);
  }
}

export async function uploadDatasetFiles(
  dataset: UploadDataset,
  files: readonly File[],
  onProgress: (percent: number) => void,
  onJob: (job: UploadJob) => void,
): Promise<UploadResponse> {
  onProgress(1);
  const encoded = [];
  for (const [index, file] of files.entries()) {
    encoded.push({
      path: filePath(file),
      type: file.type || "application/octet-stream",
      size: file.size,
      contentBase64: await readAsBase64(file),
    });
    onProgress(1 + Math.round(((index + 1) / files.length) * 14));
  }

  const body = JSON.stringify({ dataset, files: encoded });
  const job = await new Promise<UploadJob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiBase()}/jobs`);
    request.setRequestHeader("Content-Type", "application/json");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(15 + Math.round((event.loaded / event.total) * 25));
    });
    request.addEventListener("load", () => {
      let parsed: UploadJob | UploadErrorBody | null = null;
      try {
        parsed = JSON.parse(request.responseText) as UploadJob | UploadErrorBody;
      } catch {
        // The status-specific error below remains actionable when a proxy returns HTML.
      }
      if (request.status >= 200 && request.status < 300 && parsed && "jobId" in parsed) {
        resolve(parsed);
        return;
      }
      reject(errorFromBody(request.status, parsed as UploadErrorBody | null));
    });
    request.addEventListener("error", () => reject(new DataUploadError("Upload service is unreachable", 0, "NETWORK_ERROR")));
    request.addEventListener("abort", () => reject(new DataUploadError("Upload was cancelled", 0, "ABORTED")));
    request.send(body);
  });
  onJob(job);
  return await waitForJob(job, onProgress, onJob);
}
