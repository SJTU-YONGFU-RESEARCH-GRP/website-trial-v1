import type { JobStatus, ModuleId, StructuredJobErrorV1 } from "./v1.ts";

/** A reference to an immutable, owned, published child-job artifact. */
export interface DtcoPipelineArtifactRef {
  sourceJobId: string; resultId: string; artifactId: string;
  relativePath: string; sha256: string; sizeBytes: number;
}
export type DtcoPipelineNodeKind = "benchmark" | "dtco" | "ppa" | "digital";
export type DtcoPipelineNodeStatus = JobStatus | "blocked" | "preparing";
export interface DtcoPipelineNodeSummary {
  id: string; kind: DtcoPipelineNodeKind; moduleId: ModuleId;
  jobId: string; resultId: string | null; status: DtcoPipelineNodeStatus;
  progress: number; currentStepId: string | null;
  artifacts: DtcoPipelineArtifactRef[]; error: StructuredJobErrorV1 | null;
}
export interface DtcoPipelineRunSummary {
  id: string; attemptId: string; status: JobStatus | "preparing";
  currentNodeId: string | null; progress: number;
  provenanceVerified: boolean; error: StructuredJobErrorV1 | null;
  nodes: DtcoPipelineNodeSummary[]; createdAt: string; updatedAt: string;
}
