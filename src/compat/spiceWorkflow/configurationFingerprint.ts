/* ==================================================================
 *  configurationFingerprint.ts (goal3.md §8.1–§8.3)
 *
 *  Computes a stable fingerprint of the current workspace configuration
 *  so the UI can detect when the user has changed parameters relative
 *  to the recorded static result set.
 * ================================================================== */

import type { ProcessingToolId, SimulatorId, ModelArtifact } from "./contracts";

export interface WorkspaceFingerprint {
  inputModelChecksum: string | null;
  enabledTools: ProcessingToolId[];
  operationOrder: ProcessingToolId[];
  toolParams: Record<string, Record<string, unknown>>;
  benchmarkSimulators: SimulatorId[];
  baselineModelId: string | null;
  candidateModelId: string | null;
}

export function buildWorkspaceFingerprint(params: {
  inputModel: ModelArtifact | null;
  enabledOps: Record<string, boolean>;
  operationOrder: ProcessingToolId[];
  opParams: Record<string, Record<string, unknown>>;
  selectedSimulators: SimulatorId[];
  baselineModelId: string | null;
  candidateModelId: string | null;
}): WorkspaceFingerprint {
  const enabledTools = params.operationOrder.filter((tid) => params.enabledOps[tid]);
  return {
    inputModelChecksum: params.inputModel?.checksum ?? null,
    enabledTools,
    operationOrder: [...params.operationOrder],
    toolParams: JSON.parse(JSON.stringify(params.opParams)),
    benchmarkSimulators: [...params.selectedSimulators],
    baselineModelId: params.baselineModelId,
    candidateModelId: params.candidateModelId,
  };
}

export function fingerprintsMatch(
  a: WorkspaceFingerprint | null,
  b: WorkspaceFingerprint | null,
): boolean {
  if (!a || !b) return false;
  if (a.inputModelChecksum !== b.inputModelChecksum) return false;
  if (a.baselineModelId !== b.baselineModelId) return false;
  if (a.candidateModelId !== b.candidateModelId) return false;
  if (JSON.stringify(a.enabledTools) !== JSON.stringify(b.enabledTools)) return false;
  if (JSON.stringify(a.operationOrder) !== JSON.stringify(b.operationOrder)) return false;
  if (JSON.stringify(a.benchmarkSimulators) !== JSON.stringify(b.benchmarkSimulators)) return false;
  if (JSON.stringify(a.toolParams) !== JSON.stringify(b.toolParams)) return false;
  return true;
}

export function buildRecordedFingerprint(recordedData: {
  inputModel: ModelArtifact | null;
  operationOrder: ProcessingToolId[];
  enabledOps: Record<string, boolean>;
  opParams: Record<string, Record<string, unknown>>;
  defaultSimulators: SimulatorId[];
  defaultInputModelId: string;
  defaultCandidateModelId: string;
}): WorkspaceFingerprint {
  return {
    inputModelChecksum: recordedData.inputModel?.checksum ?? null,
    enabledTools: recordedData.operationOrder.filter((tid) => recordedData.enabledOps[tid]),
    operationOrder: [...recordedData.operationOrder],
    toolParams: JSON.parse(JSON.stringify(recordedData.opParams)),
    benchmarkSimulators: [...recordedData.defaultSimulators],
    baselineModelId: recordedData.defaultInputModelId,
    candidateModelId: recordedData.defaultCandidateModelId,
  };
}
