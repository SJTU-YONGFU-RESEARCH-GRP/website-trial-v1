/* ==================================================================
 *  Validation helpers (goal.md §31)
 *
 *  Pure functions used by the static data validator script and
 *  optionally at runtime for defensive checks.
 * ================================================================== */

import type {
  WorkflowScenario,
  ModelArtifact,
  DomainBenchmarkResult,
  ArtifactRef,
  WorkflowOperation,
} from "./contracts";

/** Check that model IDs don't create a cycle. */
export function validateModelLineage(models: Record<string, ModelArtifact>): string[] {
  const errors: string[] = [];
  const ids = new Set(Object.keys(models));

  for (const [id, m] of Object.entries(models)) {
    if (!id || id.trim() === "") {
      errors.push("Model has empty modelId");
    }
    if (!m.filename) {
      errors.push(`Model ${id}: filename is empty`);
    }
    if (m.parentModelId !== null && !ids.has(m.parentModelId)) {
      errors.push(
        `Model ${id}: parentModelId "${m.parentModelId}" does not exist`,
      );
    }
    if (m.parameterCount !== null && m.parameterCount < 0) {
      errors.push(`Model ${id}: parameterCount is negative`);
    }
    if (m.byteSize !== null && m.byteSize < 0) {
      errors.push(`Model ${id}: byteSize is negative`);
    }
  }

  // Cycle detection via DFS
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(modelId: string): boolean {
    if (stack.has(modelId)) return true; // cycle
    if (visited.has(modelId)) return false;
    visited.add(modelId);
    stack.add(modelId);
    const m = models[modelId];
    if (m?.parentModelId) {
      if (dfs(m.parentModelId)) return true;
    }
    stack.delete(modelId);
    return false;
  }

  for (const id of ids) {
    if (dfs(id)) {
      errors.push(`Cycle detected in model lineage involving ${id}`);
      break;
    }
  }

  return errors;
}

/** Basic benchmark result validation. */
export function validateBenchmarkResults(
  results: DomainBenchmarkResult[],
  modelIds: Set<string>,
): string[] {
  const errors: string[] = [];

  for (const r of results) {
    if (!modelIds.has(r.modelId)) {
      errors.push(`Benchmark result ${r.resultId}: modelId "${r.modelId}" not found`);
    }
    if (r.resources.wallTimeMs !== null && r.resources.wallTimeMs < 0) {
      errors.push(`Benchmark result ${r.resultId}: negative wallTimeMs`);
    }
    if (r.resources.peakRssMB !== null && r.resources.peakRssMB < 0) {
      errors.push(`Benchmark result ${r.resultId}: negative peakRssMB`);
    }
    if (r.agreement) {
      if (r.agreement.correlation !== null && (r.agreement.correlation < -1 || r.agreement.correlation > 1)) {
        errors.push(`Benchmark result ${r.resultId}: correlation out of [-1,1]`);
      }
      if (r.agreement.normalizedRmse !== null && r.agreement.normalizedRmse < 0) {
        errors.push(`Benchmark result ${r.resultId}: negative normalizedRmse`);
      }
    }
    // Check artifact references
    for (const aId of [...r.datasetArtifactIds, ...r.plotArtifactIds]) {
      if (!aId || aId.trim() === "") {
        errors.push(`Benchmark result ${r.resultId}: empty artifact ID`);
      }
    }
  }

  return errors;
}

/** Artifact validation. */
export function validateArtifacts(artifacts: Record<string, ArtifactRef>): string[] {
  const errors: string[] = [];

  for (const [id, a] of Object.entries(artifacts)) {
    if (!id || id.trim() === "") {
      errors.push("Artifact has empty artifactId");
    }
    if (a.fetchUrl && a.fetchUrl.startsWith("file://")) {
      errors.push(`Artifact ${id}: fetchUrl must not be file:// protocol`);
    }
    if (a.fetchUrl && (a.fetchUrl.includes("/home/") || a.fetchUrl.includes("/Users/"))) {
      errors.push(`Artifact ${id}: fetchUrl may contain absolute user path`);
    }
    if (a.sizeBytes !== null && a.sizeBytes < 0) {
      errors.push(`Artifact ${id}: negative sizeBytes`);
    }
  }

  return errors;
}

/** Operation ordering validation. */
export function validateOperations(operations: WorkflowOperation[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const op of operations) {
    if (ids.has(op.operationId)) {
      errors.push(`Duplicate operation ID: ${op.operationId}`);
    }
    ids.add(op.operationId);

    if (op.toolId === "benchmark" as never) {
      errors.push(`Operation ${op.operationId}: benchmark is not a user-selectable operation`);
    }
  }

  // Check order uniqueness
  const orders = operations.map((o) => o.order);
  if (new Set(orders).size !== orders.length) {
    errors.push("Operation orders are not unique");
  }

  return errors;
}

/** Top-level scenario validation. */
export function validateScenario(scenario: WorkflowScenario): string[] {
  const errors: string[] = [];

  if (!scenario.schemaVersion) errors.push("Missing schemaVersion");
  if (!scenario.scenarioId) errors.push("Missing scenarioId");

  const modelIds = new Set(Object.keys(scenario.models));
  if (!modelIds.has(scenario.defaultInputModelId)) {
    errors.push(`defaultInputModelId "${scenario.defaultInputModelId}" not found in models`);
  }
  if (!modelIds.has(scenario.defaultCandidateModelId)) {
    errors.push(`defaultCandidateModelId "${scenario.defaultCandidateModelId}" not found in models`);
  }

  errors.push(...validateModelLineage(scenario.models));
  errors.push(...validateBenchmarkResults(scenario.benchmarkResults, modelIds));
  errors.push(...validateArtifacts(scenario.artifacts));
  errors.push(...validateOperations(scenario.operations));

  // Integrated demo: must have 3 simulators and 4 domains
  if (scenario.scenarioId === "integrated-demo") {
    const sims = new Set(scenario.defaultSimulators);
    if (!["ngspice", "spectre", "hspice"].every((s) => sims.has(s as never))) {
      errors.push("integrated-demo: must include all three simulators");
    }
    const doms = new Set(scenario.defaultDomains);
    if (!(["dc", "ac", "transient", "noise"] as const).every((d) => doms.has(d))) {
      errors.push("integrated-demo: must include all four analysis domains");
    }

    // Check model count
    if (Object.keys(scenario.models).length < 2) {
      errors.push("integrated-demo: must have at least input + processed model");
    }

    // Time/memory must be non-negative if present
    for (const r of scenario.benchmarkResults) {
      if (r.resources.wallTimeMs !== null && r.resources.wallTimeMs < 0) {
        errors.push(`integrated-demo ${r.resultId}: negative wallTimeMs`);
      }
      if (r.resources.peakRssMB !== null && r.resources.peakRssMB < 0) {
        errors.push(`integrated-demo ${r.resultId}: negative peakRssMB`);
      }
    }
  }

  return errors;
}

/** Security string check for committed fixtures. */
export function securityStringCheck(obj: unknown): string[] {
  const errors: string[] = [];
  const json = JSON.stringify(obj);

  const patterns: [RegExp, string][] = [
    [/\/home\/[a-zA-Z0-9_-]+/, "Contains /home/<user> path"],
    [/\/Users\/[a-zA-Z0-9_-]+/, "Contains /Users/<user> path"],
    [/C:\\Users\\/, "Contains Windows user path"],
    [/ghp_[a-zA-Z0-9]{36}/, "Contains GitHub personal access token pattern"],
    [/gho_[a-zA-Z0-9]{36}/, "Contains GitHub OAuth token pattern"],
    [/file:\/\/\/home\//, "Contains file:///home/ URL"],
  ];

  for (const [pattern, msg] of patterns) {
    if (pattern.test(json)) {
      errors.push(msg);
    }
  }

  return errors;
}
