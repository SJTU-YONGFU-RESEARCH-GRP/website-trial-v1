/* ==================================================================
 *  ToolAdapter interface (goal.md §20.1)
 *
 *  Every external tool is wrapped by an adapter that validates
 *  parameters, builds a safe invocation argv, and normalizes
 *  fixture data into the unified contracts.
 * ================================================================== */

import type {
  ToolId,
  ModelArtifact,
  ToolInvocation,
  ToolExecutionResult,
  Provenance,
} from "./contracts";

/* ─── Build context ─── */
export interface AdapterBuildContext {
  invocationId: string;
  workingDirectoryKey: string;
  outputDirectoryKey: string;
  adapterVersion: string;
}

/* ─── Normalization context ─── */
export interface FixtureNormalizationContext {
  executionId: string;
  provenance: Provenance;
}

/* ─── The adapter interface ─── */
export interface ToolAdapter<TParams = Record<string, unknown>> {
  readonly toolId: ToolId;
  readonly adapterVersion: string;

  validate(
    inputModels: ModelArtifact[],
    params: TParams,
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };

  buildInvocation(
    context: AdapterBuildContext,
    inputModels: ModelArtifact[],
    params: TParams,
  ): ToolInvocation<TParams>;

  normalizeFixture(
    raw: unknown,
    context: FixtureNormalizationContext,
  ): ToolExecutionResult;
}
