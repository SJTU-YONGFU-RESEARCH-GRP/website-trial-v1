import path from "node:path";
import type { JsonObject, JsonValue } from "../../../../shared/contracts/v1.ts";
import type { BenchmarkRunParameters } from "../types.ts";

export function objectAt(parameters: BenchmarkRunParameters, key: keyof BenchmarkRunParameters): JsonObject {
  const value = parameters[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

export function stringValue(object: JsonObject, key: string, fallback: string): string {
  const value = object[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function booleanValue(object: JsonObject, key: string, fallback = false): boolean {
  return typeof object[key] === "boolean" ? object[key] as boolean : fallback;
}

export function numberValue(
  object: JsonObject,
  key: string,
  fallback: number,
  minimum?: number,
  maximum?: number,
): number {
  const raw = object[key];
  const value = typeof raw === "number" ? raw : fallback;
  if (!Number.isFinite(value) || (minimum !== undefined && value < minimum) || (maximum !== undefined && value > maximum)) {
    throw new Error(`Parameter ${key} is outside its allowed range`);
  }
  return value;
}

export function integerValue(
  object: JsonObject,
  key: string,
  fallback: number,
  minimum?: number,
  maximum?: number,
): number {
  const value = numberValue(object, key, fallback, minimum, maximum);
  if (!Number.isInteger(value)) throw new Error(`Parameter ${key} must be an integer`);
  return value;
}

export function enumValue<const T extends string>(
  object: JsonObject,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = stringValue(object, key, fallback);
  if (!allowed.includes(value as T)) throw new Error(`Parameter ${key} has an unsupported value`);
  return value as T;
}

export function stringList(object: JsonObject, key: string, allowed?: readonly string[]): string[] {
  const raw = object[key];
  if (!Array.isArray(raw)) return [];
  const values = raw.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim());
  if (allowed && values.some((value) => !allowed.includes(value))) {
    throw new Error(`Parameter ${key} contains an unsupported value`);
  }
  return [...new Set(values)];
}

export function entries(object: JsonObject, key: string): [string, JsonValue][] {
  const value = object[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value as JsonObject)
    : [];
}

export function relativeFrom(cwdRelative: string, workspaceRelative: string): string {
  const result = path.posix.relative(cwdRelative, workspaceRelative);
  return result || ".";
}

export function modelName(object: JsonObject): string | null {
  const value = object.modelName;
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z_][A-Za-z0-9_$]{0,127}$/.test(value)) {
    throw new Error("modelName must be a valid SPICE model identifier");
  }
  return value;
}
