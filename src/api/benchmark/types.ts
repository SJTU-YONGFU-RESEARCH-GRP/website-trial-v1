import type {
  InputManifestV1,
  JobRecordV1,
  JsonObject,
  ModuleCapabilityResponseV1,
  ToolCapabilityV1,
} from "../../../shared/contracts/v1";

export type BenchmarkWorkflowMode = "run" | "import";

export interface BrowserInputFile {
  file: File;
  relativePath: string;
  sizeBytes: number;
  sha256: string;
  recognizedType: string;
  role: string | null;
}

export interface BenchmarkDraftConfiguration {
  mode: BenchmarkWorkflowMode;
  workflow: string;
  operations: Record<string, boolean>;
  toolParameters: Record<string, JsonObject>;
}

export interface BenchmarkCapabilities extends ModuleCapabilityResponseV1 {
  moduleId: "benchmark";
}

export interface BenchmarkDraftResponse {
  job: JobRecordV1;
  recognition: InputManifestV1;
}

export interface BenchmarkStartResponse {
  job: JobRecordV1;
}

export function capabilityById(capabilities: BenchmarkCapabilities | null, toolId: string): ToolCapabilityV1 | null {
  return capabilities?.capabilities.find((capability) => capability.toolId === toolId) ?? null;
}
