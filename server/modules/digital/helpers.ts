import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { JsonObject, StepExecutionContextV1, StructuredJobErrorV1 } from "../../../shared/contracts/v1.js";
import type { DigitalExecutionContext, DigitalRunParameters } from "./types.js";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const METADATA = /^[A-Za-z0-9][A-Za-z0-9_.+:/ -]{0,127}$/;

export class DigitalAdapterError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly kind: StructuredJobErrorV1["type"] = "validation",
  ) {
    super(message);
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

export function requiredMetadata(value: unknown, label: string): string {
  const normalized = optionalString(value);
  if (!normalized || !METADATA.test(normalized)) {
    throw new DigitalAdapterError("DIGITAL_PARAMETER_INVALID", `${label} is required and contains unsupported characters`);
  }
  return normalized;
}

export function requiredIdentifier(value: unknown, label: string): string {
  const normalized = optionalString(value);
  if (!normalized || !IDENTIFIER.test(normalized)) {
    throw new DigitalAdapterError("DIGITAL_IDENTIFIER_INVALID", `${label} must be a Verilog identifier`);
  }
  return normalized;
}

export function optionalIdentifier(value: unknown, label: string): string | null {
  const normalized = optionalString(value);
  if (normalized && !IDENTIFIER.test(normalized)) {
    throw new DigitalAdapterError("DIGITAL_IDENTIFIER_INVALID", `${label} must be a Verilog identifier`);
  }
  return normalized;
}

export function optionalPositiveNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new DigitalAdapterError("DIGITAL_PARAMETER_INVALID", `${label} must be a positive finite number`);
  }
  return numeric;
}

export function optionalPositiveInteger(value: unknown, label: string): number | null {
  const numeric = optionalPositiveNumber(value, label);
  if (numeric !== null && !Number.isInteger(numeric)) {
    throw new DigitalAdapterError("DIGITAL_PARAMETER_INVALID", `${label} must be a positive integer`);
  }
  return numeric;
}

export function normalizeRunParameters(parameters: JsonObject): DigitalRunParameters {
  return {
    design: requiredMetadata(parameters.design, "design"),
    category: requiredMetadata(parameters.category, "category"),
    architecture: requiredMetadata(parameters.architecture, "architecture"),
    topModule: requiredIdentifier(parameters.topModule, "top module"),
    processTechnology: requiredMetadata(parameters.processTechnology, "process/technology"),
    bitWidth: optionalPositiveInteger(parameters.bitWidth, "bit width"),
    library: requiredMetadata(parameters.library, "library"),
    corner: requiredMetadata(parameters.corner, "corner"),
    clockPort: optionalIdentifier(parameters.clockPort, "clock port"),
    clockPeriodNs: optionalPositiveNumber(parameters.clockPeriodNs, "clock period"),
    inputSlewNs: optionalPositiveNumber(parameters.inputSlewNs, "input slew"),
    outputLoadPf: optionalPositiveNumber(parameters.outputLoadPf, "output load"),
    simulationTop: optionalIdentifier(parameters.simulationTop, "simulation top"),
  };
}

export function normalizeRelativePath(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");
  if (
    normalized.startsWith("/")
    || normalized.includes("\0")
    || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new DigitalAdapterError("DIGITAL_PATH_UNSAFE", `unsafe relative path: ${relativePath}`);
  }
  return normalized;
}

export function workspacePath(workspaceRoot: string, area: "input" | "work" | "output" | "logs" | "artifacts", relative = ""): string {
  const normalized = relative ? normalizeRelativePath(relative) : "";
  const root = path.resolve(workspaceRoot);
  const candidate = path.resolve(root, area, ...normalized.split("/").filter(Boolean));
  const areaRoot = path.resolve(root, area);
  if (candidate !== areaRoot && !candidate.startsWith(`${areaRoot}${path.sep}`)) {
    throw new DigitalAdapterError("DIGITAL_PATH_ESCAPE", `${relative} escapes the job ${area} directory`, "storage");
  }
  return candidate;
}

export function quoteYosys(value: string): string {
  if (/[\r\n\0]/.test(value)) throw new DigitalAdapterError("DIGITAL_SCRIPT_VALUE_INVALID", "script path contains a control character");
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("$", "\\$").replaceAll("[", "\\[").replaceAll("]", "\\]")}"`;
}

export function quoteTcl(value: string): string {
  if (/[\r\n\0]/.test(value)) throw new DigitalAdapterError("DIGITAL_SCRIPT_VALUE_INVALID", "script value contains a control character");
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("$", "\\$").replaceAll("[", "\\[").replaceAll("]", "\\]")}"`;
}

export async function writeUtf8Atomic(destination: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, content, { encoding: "utf8", flag: "wx" });
  await fs.rename(temporary, destination);
}

export async function sha256File(filename: string): Promise<string> {
  return createHash("sha256").update(await fs.readFile(filename)).digest("hex");
}

export function structuredError(error: unknown, stepId: string | null = null): StructuredJobErrorV1 {
  if (error instanceof DigitalAdapterError) {
    return { type: error.kind, code: error.code, message: error.message, stepId, retryable: false, details: null };
  }
  return { type: "internal", code: "DIGITAL_INTERNAL", message: error instanceof Error ? error.message : String(error), stepId, retryable: false, details: null };
}

export function outputObject(values: Record<string, string | number | boolean | null>): JsonObject {
  return values;
}

export function stepContext(context: StepExecutionContextV1): DigitalExecutionContext {
  return context as DigitalExecutionContext;
}
