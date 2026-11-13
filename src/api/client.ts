import type { ApiErrorV1, ApiSuccessV1, JsonObject } from "../../shared/contracts/v1";

let csrfToken: string | null = null;

export function setApiCsrfToken(token: string | null): void {
  csrfToken = token;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
    readonly details: JsonObject | null,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function isMutation(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiSuccessV1<T>> {
  if (!path.startsWith("/")) {
    throw new Error(`API path must be absolute: ${path}`);
  }
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (isMutation(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as ApiSuccessV1<T> | ApiErrorV1 | null;
  if (!response.ok || !body || "error" in body) {
    const error = body && "error" in body ? body.error : null;
    throw new ApiClientError(
      error?.message ?? `API request failed with HTTP ${response.status}`,
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.requestId ?? response.headers.get("X-Request-ID"),
      error?.details ?? null,
    );
  }
  return body;
}

export function apiJsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export function apiMultipartUpload<T>(
  path: string,
  formData: FormData,
  onProgress: (loaded: number, total: number | null) => void,
): Promise<ApiSuccessV1<T>> {
  if (!path.startsWith("/")) {
    return Promise.reject(new Error(`API path must be absolute: ${path}`));
  }
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api${path}`);
    request.withCredentials = true;
    request.setRequestHeader("Accept", "application/json");
    if (csrfToken) request.setRequestHeader("X-CSRF-Token", csrfToken);
    request.upload.addEventListener("progress", (event) => {
      onProgress(event.loaded, event.lengthComputable ? event.total : null);
    });
    request.addEventListener("error", () => {
      reject(new ApiClientError("Upload service is unreachable", 0, "NETWORK_ERROR", null, null));
    });
    request.addEventListener("abort", () => {
      reject(new ApiClientError("Upload was cancelled", 0, "UPLOAD_ABORTED", null, null));
    });
    request.addEventListener("load", () => {
      let body: ApiSuccessV1<T> | ApiErrorV1 | null = null;
      try {
        body = JSON.parse(request.responseText) as ApiSuccessV1<T> | ApiErrorV1;
      } catch {
        // Preserve the status-aware error below when a proxy returns non-JSON.
      }
      if (request.status >= 200 && request.status < 300 && body && !("error" in body)) {
        resolve(body);
        return;
      }
      const error = body && "error" in body ? body.error : null;
      reject(new ApiClientError(
        error?.message ?? `Upload failed with HTTP ${request.status || 0}`,
        request.status,
        error?.code ?? "UPLOAD_FAILED",
        error?.requestId ?? request.getResponseHeader("X-Request-ID"),
        error?.details ?? null,
      ));
    });
    request.send(formData);
  });
}

export const READ_ONLY_DEMO = import.meta.env.VITE_READ_ONLY_DEMO === "true";
