/* ═══════════════════════════════════════════════════════════════════ */
/*  API Client — HTTP, multipart, SSE (goal.md §10.3)                   */
/* ═══════════════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_PIPELINE_API_BASE_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Attach access token if set
  const token = localStorage.getItem("pipeline_access_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; detail?: unknown } } = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      body.error?.message ?? `${res.status} ${res.statusText}`,
      res.status,
      body.error?.code,
      body.error?.detail,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

/* ─── GET ─── */
export function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: "GET", signal });
}

/* ─── POST JSON ─── */
export function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

/* ─── DELETE ─── */
export function del<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: "DELETE", signal });
}

/* ─── Multipart upload ─── */
export interface MultipartField {
  name: string;
  value: string | Blob;
  filename?: string;
  contentType?: string;
}

export async function multipartPost<T>(
  path: string,
  fields: MultipartField[],
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  const form = new FormData();
  for (const f of fields) {
    if (typeof f.value === "string") {
      form.append(f.name, f.value);
    } else {
      form.append(f.name, f.value, f.filename ?? "file");
    }
  }

  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("pipeline_access_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Use XMLHttpRequest for progress tracking
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v);
      }
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress((e.loaded / e.total) * 100);
        }
      });
      if (signal) {
        signal.addEventListener("abort", () => xhr.abort());
      }
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(undefined as T);
          }
        } else {
          reject(new ApiError(`${xhr.status} ${xhr.statusText}`, xhr.status));
        }
      });
      xhr.addEventListener("error", () =>
        reject(new ApiError("Network error", 0)),
      );
      xhr.send(form);
    });
  }

  // Fallback: use fetch
  return request<T>(url, {
    method: "POST",
    body: form,
    signal,
  });
}

/* ─── SSE stream ─── */
export interface SSEController {
  close: () => void;
  signal: AbortSignal;
}

/**
 * Connect to an SSE endpoint and invoke callbacks for each event.
 * Supports Last-Event-ID for reconnection.
 */
export function connectSSE(
  path: string,
  onEvent: (event: { eventType: string; data: unknown; id?: string }) => void,
  onError?: (err: Error) => void,
  lastEventId?: string,
): SSEController {
  const controller = new AbortController();
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  const token = localStorage.getItem("pipeline_access_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;

  const url = `${API_BASE}${path}`;

  async function connect() {
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok || !res.body) {
        onError?.(new ApiError(`${res.status} ${res.statusText}`, res.status));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        let currentData = "";
        let currentId: string | undefined;

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData += line.slice(5).trim() + "\n";
          } else if (line.startsWith("id:")) {
            currentId = line.slice(3).trim();
          } else if (line === "") {
            // Empty line = dispatch
            if (currentData) {
              try {
                const parsed = JSON.parse(currentData.trim());
                onEvent({
                  eventType: currentEvent || "message",
                  data: parsed,
                  id: currentId,
                });
              } catch {
                onEvent({
                  eventType: currentEvent || "message",
                  data: currentData.trim(),
                  id: currentId,
                });
              }
            }
            currentEvent = "";
            currentData = "";
            currentId = undefined;
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  connect();

  return {
    close: () => controller.abort(),
    signal: controller.signal,
  };
}

/** Set access token for authenticated requests. */
export function setAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem("pipeline_access_token", token);
  } else {
    localStorage.removeItem("pipeline_access_token");
  }
}
