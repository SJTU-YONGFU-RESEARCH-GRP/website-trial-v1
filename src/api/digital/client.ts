import type {
  InputManifestV1,
  JobPlanV1,
  JobRecordV1,
  ModuleCapabilityResponseV1,
  ResultRecordV1,
} from "../../../shared/contracts/v1";
import type { DesignRow } from "../../data/designTypes";
import { apiJsonBody, apiMultipartUpload, apiRequest } from "../client";

export interface DigitalCapabilityResponse extends ModuleCapabilityResponseV1 {
  configured?: boolean;
  unavailableReason?: string | null;
}

export interface DigitalDraftCreated {
  job: JobRecordV1;
  recognition: InputManifestV1;
}

export interface DigitalDraftPatch {
  fileRoles: Record<string, string>;
  parameters: Record<string, string | number | boolean | null>;
  technologyLibraryId: string | null;
}

export async function getDigitalCapabilities(): Promise<DigitalCapabilityResponse> {
  return (await apiRequest<DigitalCapabilityResponse>("/modules/digital/capabilities")).data;
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function createDigitalDraft(
  operation: "run" | "import",
  files: Array<{ file: File; relativePath: string }>,
  onProgress: (loaded: number, total: number | null) => void,
): Promise<DigitalDraftCreated> {
  const form = new FormData();
  form.set("operation", operation);
  form.set("workflow", operation === "run" ? "yosys-opensta" : "completed-results");
  for (const selected of files) {
    form.append(`file:${base64Url(selected.relativePath)}`, selected.file, selected.file.name);
  }
  return (await apiMultipartUpload<DigitalDraftCreated>("/modules/digital/drafts", form, onProgress)).data;
}

export async function preflightDigitalDraft(jobId: string, patch: DigitalDraftPatch): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/draft`, {
    method: "PATCH",
    body: apiJsonBody(patch),
  })).data;
}

export async function startDigitalJob(jobId: string): Promise<JobRecordV1> {
  return (await apiRequest<JobRecordV1>(`/jobs/${encodeURIComponent(jobId)}/start`, { method: "POST" })).data;
}

export async function listDigitalResults(): Promise<ResultRecordV1[]> {
  return (await apiRequest<ResultRecordV1[]>("/digital/results?limit=200")).data;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Projection used by PlotlyPage integration; rows without an explicit comparable power value are omitted. */
export function digitalChartRows(results: ResultRecordV1[]): DesignRow[] {
  const rows: DesignRow[] = [];
  for (const result of results) {
    const values = Array.isArray(result.data.rows) ? result.data.rows : [];
    for (const value of values) {
      const row = objectValue(value);
      const design = objectValue(row.design);
      const metrics = objectValue(row.metrics);
      const fmaxMhz = Number(metrics.fmaxMhz);
      const areaUm2 = Number(metrics.areaUm2);
      const powerMw = Number(metrics.powerMw);
      const bitWidth = Number(design.bitWidth);
      if (![fmaxMhz, areaUm2, powerMw, bitWidth].every(Number.isFinite)) continue;
      if (typeof design.architecture !== "string" || typeof design.processTechnology !== "string") continue;
      rows.push({
        architecture: design.architecture,
        bitWidth,
        processNode: design.processTechnology,
        canonicalTechnology: design.processTechnology,
        isNamedPdk: !/^\d+(?:\.\d+)?nm$/i.test(design.processTechnology),
        fmaxMhz,
        powerMw,
        areaUm2,
        category: typeof design.category === "string" ? design.category : undefined,
      });
    }
  }
  return rows;
}

export type { JobPlanV1 };
