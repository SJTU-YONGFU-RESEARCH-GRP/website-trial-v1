import type { ResultRecordV1 } from "../../../shared/contracts/v1";
import { record } from "./helpers";

export interface ComparisonValue {
  value: unknown;
  unit?: string;
  semantic?: string;
  context?: string;
  ambiguous?: boolean;
}
export interface ComparisonRow {
  id: string;
  scope: string;
  label: string;
  values: Record<string, ComparisonValue>;
}
const ENGINES: Record<string, string> = { cmos: "CMOS", dr: "Double Row", mr: "Multi Row" };
export function acgEngineName(result: ResultRecordV1): string {
  const engine = String(result.provenance.parameters.engine ?? record(result.data.acg).engine ?? record(result.data.acgResearch).engine ?? record(result.data.acgUnified).engine ?? "Unknown");
  return ENGINES[engine] ?? engine;
}
function scalar(value: unknown): boolean {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}
function text(value: unknown): string | undefined { return typeof value === "string" && value.length ? value : undefined; }
function list(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(record) : []; }
function declaredMetric(value: unknown): boolean {
  const object = record(value);
  return typeof object.unit === "string" && typeof object.semantic === "string" && "value" in object;
}
const PHASE_STATUS_FIELDS = new Set(["status", "reason", "scientificStatus", "processCompleted", "foundryCertification", "lvs1Certification"]);
const PHASE_METADATA_FIELDS = new Set(["nativeReturnCode", "returnCode", "exitCode", "requestedThreads", "effectiveThreads", "threads", "maxCols", "seed", "rowCount", "trialIndex"]);
function label(key: string): string { return key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "); }
const METRICS: Record<string, [string, string, string]> = {
  placementWidthCpp: ["Placement width", "CPP", "placement-width"],
  routedWidthCpp: ["Routed width", "CPP", "routed-width"],
  minCpp: ["Minimum placement width", "CPP", "minimum-placement-width"],
  placementMs: ["Placement time", "ms", "placement-time"],
  wallSeconds: ["Wall time", "s", "trial-wall-time"],
  consumedSeconds: ["Search consumed time", "s", "search-consumed-time"],
  attemptCount: ["Search attempts", "count", "search-attempt-count"],
  validGdsCount: ["Valid GDS count", "count", "valid-gds-count"],
  consumedAttempts: ["Consumed search attempts", "count", "search-consumed-attempts"],
  remainingAttempts: ["Remaining search attempts", "count", "search-remaining-attempts"],
  maxAttempts: ["Search attempt budget", "count", "search-attempt-budget"],
  remainingSeconds: ["Remaining search time", "s", "search-remaining-time"],
  sharedWallBudgetSeconds: ["Search wall time budget", "s", "search-wall-budget"],
  actualRows: ["Actual transistor rows", "rows", "actual-transistor-rows"],
  cost: ["Placement cost", "native cost", "placement-cost"],
  hpwl: ["Normalized HPWL", "normalized", "normalized-hpwl"],
  crossRows: ["Cross-row connections", "count", "cross-row-connections"],
};
/** Exact cell names and explicit trial keys; no first-cell fallback or aggregation. */
export function acgComparisonRows(results: ResultRecordV1[]): ComparisonRow[] {
  const rows = new Map<string, ComparisonRow>();
  for (const result of results) {
    const acg = record(result.data.acg), research = record(result.data.acgResearch), unified = record(result.data.acgUnified);
    const engine = acgEngineName(result);
    const baseConfig = record(acg.effectiveConfiguration);
    const technology = text(acg.technology) ?? text(baseConfig.technology) ?? text(result.summary.technology);
    function add(scope: string, key: string, value: unknown, descriptor?: Partial<ComparisonValue>, displayLabel = label(key)) {
      if (value === undefined) return;
      const id = JSON.stringify([scope, key]);
      let row = rows.get(id);
      if (!row) { row = { id, scope, label: displayLabel, values: {} }; rows.set(id, row); }
      const previous = row.values[result.id];
      row.values[result.id] = previous
        ? { value: [previous.value, value], ambiguous: true }
        : { value, ...descriptor };
    }
    function metric(scope: string, key: string, value: unknown, tech: string | undefined, family: string) {
      const known = METRICS[key];
      // Unknown numeric fields remain visible, but cannot acquire units by guessing.
      const object = record(value);
      const declared = declaredMetric(value);
      const unit = declared ? object.unit as string : known?.[1];
      const semantic = declared ? object.semantic as string : known?.[2];
      const context = tech ? JSON.stringify([tech, family]) : undefined;
      add(scope, key, declared ? object.value : value, { unit, semantic, context }, known ? known[0] : label(key));
    }
    function phaseFields(source: Record<string, unknown>, phaseLabel: string, tech: string | undefined, phase: string, origin = "") {
      for (const [key, value] of Object.entries(source)) {
        // Hashes/IDs and nested evidence stay in the inspector, not the metric population.
        if (["schemaVersion", "id", "engine", "operation", "artifactPrefix"].includes(key) || key.endsWith("Sha256")) continue;
        if (METRICS[key] || declaredMetric(value) || typeof value === "number" && !PHASE_METADATA_FIELDS.has(key)) {
          metric(phaseLabel + (phase === "search" ? " · Job" : " · Phase"), key, value, tech, phase + "-phase");
        } else if (scalar(value)) {
          const status = PHASE_STATUS_FIELDS.has(key);
          add(phaseLabel, origin + (status ? key : "metadata." + key), value, undefined, (origin ? "Corpus · " : "") + (status ? "" : "Metadata · ") + label(key));
        }
      }
    }
    add("Run", "engine", engine);
    add("Run", "technology", technology);
    add("Run", "mode", acg.mode ?? result.provenance.parameters.mode);
    add("Run", "lifecycle", result.lifecycle);
    for (const stage of list(unified.stages)) {
      const scope = "Workflow · " + String(stage.id ?? "unidentified stage");
      for (const key of ["status", "reason", "exitCode"]) add(scope, key, stage[key]);
    }
    // Generation is one cell outcome per run; algorithm/configuration are shown explicitly.
    for (const [index, cell] of list(acg.cells).entries()) {
      const name = text(cell.cellName);
      const scope = name ? "Generation · " + name : "Generation · unidentified cell " + result.id + ":" + index;
      for (const [key, value] of Object.entries(cell)) {
        if (key === "cellName") continue;
        if (METRICS[key] || declaredMetric(value)) metric(scope, key, value, technology, key === "validGdsCount" ? "generation-output" : key.endsWith("WidthCpp") ? "width" : engine);
        else if (scalar(value)) add(scope, "cell." + key, value, undefined, "Cell " + label(key));
      }
      add(scope, "algorithm", acg.effectiveAlgorithm ?? acg.requestedAlgorithm ?? record(acg.configuration).algorithm);
      for (const key of ["trackNum", "configuredRows"]) add(scope, key, acg[key] ?? baseConfig[key]);
      metric(scope, "actualRows", record(cell.geometry).actualRows, technology, "geometry");
      for (const key of ["placement", "routing"]) add(scope, key + "Status", record(cell[key]).status);
      for (const [key, value] of Object.entries(record(cell.verification))) {
        add(scope, "verification." + key, scalar(value) ? value : record(value).status, undefined, "Verification · " + label(key));
      }
      const metrics = record(cell.metrics);
      for (const [key, value] of Object.entries(metrics)) {
        if (key === "widthEvidencePaths") continue;
        if (key === "widthCpp") {
          const resolved = metrics.widthSource === "placement" ? "placementWidthCpp" : metrics.widthSource === "routed_candidate" ? "routedWidthCpp" : "widthCpp";
          if (resolved !== key && metrics[resolved] !== undefined) continue;
          metric(scope, resolved, value, technology, "width");
        } else metric(scope, key, value, technology, key === "validGdsCount" ? "generation-output" : key.endsWith("WidthCpp") ? "width" : engine);
      }
    }
    function researchRows(source: Record<string, unknown>, phase: "comparison" | "search" | "report") {
      if (!Object.keys(source).length) return;
      const phaseLabel = phase === "comparison" ? "Algorithm comparison" : phase === "search" ? "Feasible search" : "Algorithm report";
      const phaseConfig = record(record(source.generationConfiguration).base);
      const phaseTech = text(source.technology) ?? text(phaseConfig.technology) ?? technology;
      phaseFields(source, phaseLabel, phaseTech, phase);
      const corpus = record(source.corpus);
      phaseFields(corpus, phaseLabel, text(corpus.technology) ?? phaseTech, phase, "corpus.");
      for (const [index, trial] of list(source.metrics).entries()) {
        const name = text(trial.cell) ?? text(trial.cellName);
        const algorithm = text(trial.requestedAlgorithm) ?? text(trial.algorithm);
        const rowCount = trial.rowCount;
        // Legacy *_rN labels are normalized only when requested algorithm and rows are explicit.
        const key = name && algorithm && typeof trial.trialIndex === "number" && Number.isInteger(trial.trialIndex) && trial.trialIndex >= 0 && typeof rowCount === "number" && Number.isInteger(rowCount) && rowCount > 0
          ? name + " · " + algorithm + " · rows " + rowCount + " · trial " + trial.trialIndex
          : "unidentified trial " + result.id + ":" + index;
        const scope = "Algorithm comparison · " + key;
        const config = record(trial.effectiveConfiguration);
        const generation = record(record(source.generationConfiguration)[algorithm ?? ""]);
        const tech = text(config.tech) ?? text(config.technology) ?? text(generation.technology) ?? technology;
        add(scope, "technology", tech);
        for (const [field, value] of Object.entries(trial)) {
          if (["cell", "cellName", "trialIndex", "rowCount"].includes(field) || !scalar(value)) continue;
          metric(scope, field, value, tech, ["cost", "hpwl", "crossRows"].includes(field) ? engine : "trial");
        }
      }
      for (const [index, cell] of [...list(source.cells), ...list(corpus.cells)].entries()) {
        const name = text(cell.cell) ?? text(cell.cellName);
        const scope = phaseLabel + " · " + (name ?? "unidentified cell " + result.id + ":" + index);
        const config = record(record(source.generationConfiguration).base);
        const tech = text(config.technology) ?? technology;
        for (const [key, value] of Object.entries(cell)) {
          if (["cell", "cellName", "manifestPath", "witnessPath"].includes(key) || !scalar(value)) continue;
          metric(scope, key, value, tech, "search");
        }
        for (const key of ["lvs0", "lvs1", "foundrySignoff"]) if (!scalar(cell[key])) add(scope, key, record(cell[key]).status);
        // Attempt arrays are kept in detail evidence. No sums or implicit winning attempt.
      }
    }
    const operation = research.operation;
    researchRows(research, operation === "known-feasible" ? "search" : operation === "algorithm-report" ? "report" : "comparison");
    researchRows(record(unified.comparison), "comparison");
    researchRows(record(unified.search), "search");
    // Unified report repeats generation/comparison evidence, rather than a new trial population.
    phaseFields(record(unified.report), "Workflow report evidence", technology, "report");
  }
  return [...rows.values()];
}
export function comparisonValueText(value: ComparisonValue | undefined): string {
  if (!value) return "—";
  if (value.ambiguous) return "Ambiguous: " + JSON.stringify(value.value);
  if (value.value === null || value.value === undefined) return "Unavailable";
  if (typeof value.value === "number" && !Number.isFinite(value.value)) return "Unavailable";
  if (typeof value.value === "boolean") return value.value ? "Yes" : "No";
  return typeof value.value === "object" ? JSON.stringify(value.value) : String(value.value);
}
export function acgNumericDelta(value: ComparisonValue | undefined, baseline: ComparisonValue | undefined): { absolute: number; percent: number | null } | null {
  if (!value || !baseline || value.ambiguous || baseline.ambiguous ||
    typeof value.value !== "number" || typeof baseline.value !== "number" ||
    !Number.isFinite(value.value) || !Number.isFinite(baseline.value) ||
    !value.unit || value.unit !== baseline.unit || !value.semantic || value.semantic !== baseline.semantic ||
    !value.context || value.context !== baseline.context) return null;
  const absolute = value.value - baseline.value;
  if (!Number.isFinite(absolute)) return null;
  const percent = baseline.value === 0 ? null : absolute / Math.abs(baseline.value) * 100;
  return { absolute, percent: percent !== null && Number.isFinite(percent) ? percent : null };
}
function signed(value: number): string {
  const rounded = Number(value.toPrecision(6));
  return (rounded >= 0 ? "+" : "") + String(Object.is(rounded, -0) ? 0 : rounded);
}
export function acgDeltaText(delta: { absolute: number; percent: number | null }, unit: string): string {
  return "Δ " + signed(delta.absolute) + " " + unit + (delta.percent === null ? " (percentage unavailable)" : " (" + signed(delta.percent) + "%)");
}
export function retainAcgResults(ids: string[], results: ResultRecordV1[], completedId?: string): string[] {
  const available = new Set(results.map(result => result.id));
  const retained = ids.filter(id => available.has(id));
  return completedId && available.has(completedId) && !retained.includes(completedId) ? [...retained, completedId] : retained;
}
export function acgBaselineId(ids: string[], preferred: string | null): string | null {
  return preferred && ids.includes(preferred) ? preferred : ids[0] ?? null;
}
