import type { JsonObject, JsonPrimitive, ParameterDefinitionV1 } from "../../../shared/contracts/v1.ts";
import { PpaAdapterError, objectValue } from "./helpers.ts";

export type SweepInput = { mode?: unknown; value?: unknown; start?: unknown; stop?: unknown; step?: unknown; values?: unknown };

function numericList(input: SweepInput, definition: ParameterDefinitionV1): JsonPrimitive[] {
  const mode = input.mode ?? "single";
  if (mode === "single") return [Number(input.value ?? definition.defaultValue)];
  if (mode === "list") {
    const source = Array.isArray(input.values) ? input.values : String(input.values ?? "").split(",");
    return source.map(Number);
  }
  if (mode === "range") {
    const start = Number(input.start); const stop = Number(input.stop); const step = Number(input.step);
    if (![start, stop, step].every(Number.isFinite) || step === 0 || (stop - start) * step < 0) throw new PpaAdapterError("PPA_SWEEP_RANGE_INVALID", `${definition.label} sweep range is invalid`);
    const values: number[] = []; const epsilon = Math.abs(step) * 1e-9;
    for (let value = start; step > 0 ? value <= stop + epsilon : value >= stop - epsilon; value += step) {
      if (values.length >= 10_000) throw new PpaAdapterError("PPA_SWEEP_RANGE_INVALID", `${definition.label} sweep has too many values`);
      values.push(Number(value.toPrecision(14)));
    }
    return values;
  }
  throw new PpaAdapterError("PPA_SWEEP_MODE_INVALID", `${definition.label} sweep mode must be single, range, or list`);
}

function values(input: SweepInput, definition: ParameterDefinitionV1): JsonPrimitive[] {
  const numeric = ["number", "integer", "number-list"].includes(definition.type);
  const output = numeric ? numericList(input, definition) : (Array.isArray(input.values) ? input.values : [input.value ?? definition.defaultValue]) as JsonPrimitive[];
  if (!output.length) throw new PpaAdapterError("PPA_SWEEP_EMPTY", `${definition.label} sweep is empty`);
  for (const value of output) {
    if (numeric) {
      if (typeof value !== "number" || !Number.isFinite(value)) throw new PpaAdapterError("PPA_SWEEP_VALUE_INVALID", `${definition.label} contains a non-finite value`);
      if (definition.type === "integer" && !Number.isInteger(value)) throw new PpaAdapterError("PPA_SWEEP_VALUE_INVALID", `${definition.label} requires integer values`);
      if (definition.minimum !== null && value < definition.minimum || definition.maximum !== null && value > definition.maximum) throw new PpaAdapterError("PPA_SWEEP_VALUE_INVALID", `${definition.label} value is outside capability bounds`);
    }
    if (definition.enumValues.length && !definition.enumValues.includes(value)) throw new PpaAdapterError("PPA_SWEEP_VALUE_INVALID", `${definition.label} contains an unsupported value`);
  }
  return [...new Set(output.map((value) => JSON.stringify(value)))].map((value) => JSON.parse(value) as JsonPrimitive);
}

export function expandSweep(parameters: JsonObject, definitions: readonly ParameterDefinitionV1[], maxRunCount: number): { dimensions: Record<string, JsonPrimitive[]>; points: JsonObject[]; runCount: number } {
  const requested = objectValue(parameters.sweep);
  const dimensions: Record<string, JsonPrimitive[]> = {};
  for (const [id, raw] of Object.entries(requested)) {
    const definition = definitions.find((candidate) => candidate.id === id);
    if (!definition?.sweepable) throw new PpaAdapterError("PPA_PARAMETER_NOT_SWEEPABLE", `${id} is not sweepable for the selected flow`);
    dimensions[id] = values(objectValue(raw) as SweepInput, definition);
  }
  const runCount = Object.values(dimensions).reduce((count, entries) => count * entries.length, 1);
  if (!Number.isSafeInteger(runCount) || runCount > maxRunCount) throw new PpaAdapterError("PPA_SWEEP_LIMIT", `sweep expands to ${runCount} runs; maximum is ${maxRunCount}`);
  let points: JsonObject[] = [{}];
  for (const [id, entries] of Object.entries(dimensions)) points = points.flatMap((point) => entries.map((value) => ({ ...point, [id]: value })));
  return { dimensions, points, runCount };
}
