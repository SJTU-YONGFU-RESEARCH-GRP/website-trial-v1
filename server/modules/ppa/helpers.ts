import fs from "node:fs/promises";
import path from "node:path";
import type { JsonObject, StructuredJobErrorV1, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import type { PpaExecutionContext, PpaFlowId, PpaRunParameters } from "./types.ts";
import { PPA_FLOW_IDS } from "./types.ts";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const LABEL = /^[A-Za-z0-9][A-Za-z0-9_.:+ -]{0,127}$/;

export class PpaAdapterError extends Error {
  constructor(readonly code: string, message: string, readonly kind: StructuredJobErrorV1["type"] = "validation") { super(message); }
}

export function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, name: string, identifier = false): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || !(identifier ? IDENTIFIER : LABEL).test(result)) throw new PpaAdapterError("PPA_PARAMETER_INVALID", `${name} is invalid`);
  return result;
}

function finite(value: unknown, name: string, minimum: number, maximum: number): number {
  const result = Number(value);
  if (!Number.isFinite(result) || result < minimum || result > maximum) throw new PpaAdapterError("PPA_PARAMETER_INVALID", `${name} must be between ${minimum} and ${maximum}`);
  return result;
}

export function normalizeParameters(parameters: JsonObject): PpaRunParameters {
  const flow = parameters.flow;
  if (typeof flow !== "string" || !PPA_FLOW_IDS.includes(flow as PpaFlowId)) throw new PpaAdapterError("PPA_FLOW_INVALID", "flow must be openroad-orfs, openlane1, or librelane");
  const result: PpaRunParameters = {
    flow: flow as PpaFlowId,
    designName: text(parameters.designName, "design name"),
    topModule: text(parameters.topModule, "top module", true),
    clockPort: text(parameters.clockPort, "clock port", true),
    clockPeriodNs: finite(parameters.clockPeriodNs, "clock period", 0.001, 1_000_000),
    technologyLibraryId: typeof parameters.technologyLibraryId === "string" && parameters.technologyLibraryId.trim()
      ? text(parameters.technologyLibraryId, "technology library")
      : null,
  };
  if (parameters.coreUtilization !== undefined) result.coreUtilization = finite(parameters.coreUtilization, "core utilization", 1, 95);
  if (parameters.placementDensity !== undefined) result.placementDensity = finite(parameters.placementDensity, "placement density", 0.05, 0.99);
  if (parameters.threads !== undefined) {
    const threads = finite(parameters.threads, "threads", 1, 256);
    if (!Number.isInteger(threads)) throw new PpaAdapterError("PPA_PARAMETER_INVALID", "threads must be an integer");
    result.threads = threads;
  }
  if (parameters.sweep && typeof parameters.sweep === "object" && !Array.isArray(parameters.sweep)) result.sweep = parameters.sweep as JsonObject;
  if (parameters.sweepPoint && typeof parameters.sweepPoint === "object" && !Array.isArray(parameters.sweepPoint)) result.sweepPoint = parameters.sweepPoint as JsonObject;
  return result;
}

export function safeRelative(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("\0") || normalized.split("/").some((part) => !part || part === "." || part === "..")) throw new PpaAdapterError("PPA_PATH_UNSAFE", `unsafe relative path: ${value}`);
  return normalized;
}

export function workspacePath(root: string, relative: string): string {
  const normalized = safeRelative(relative);
  const candidate = path.resolve(root, ...normalized.split("/"));
  const resolvedRoot = path.resolve(root);
  if (!candidate.startsWith(`${resolvedRoot}${path.sep}`)) throw new PpaAdapterError("PPA_PATH_ESCAPE", "path escapes job workspace", "storage");
  return candidate;
}

export function configuredTool(context: { job: { toolConfigurations: ToolConfigurationSnapshotV1[] } }, toolId: string): ToolConfigurationSnapshotV1 {
  const configuration = context.job.toolConfigurations.find((tool) => tool.toolId === toolId);
  if (!configuration?.enabled) throw new PpaAdapterError("PPA_TOOL_NOT_CONFIGURED", `${toolId} is not configured`, "configuration");
  const executable = configuration.interpreterPath ?? configuration.executablePath;
  if (!executable || !path.isAbsolute(executable)) throw new PpaAdapterError("PPA_TOOL_NOT_CONFIGURED", `${toolId} requires an absolute executable/interpreter path`, "configuration");
  return configuration;
}

export async function writeAtomic(filename: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o750 });
  const temporary = `${filename}.${process.pid}.tmp`;
  await fs.writeFile(temporary, contents, { encoding: "utf8", mode: 0o640 });
  await fs.rename(temporary, filename);
}

export async function runFrozenProcess(context: PpaExecutionContext): Promise<{ exitCode: number; outputs: JsonObject }> {
  if (!context.runPlannedProcess) throw new PpaAdapterError("PPA_RUNTIME_UNAVAILABLE", "shared safe process runtime is unavailable", "configuration");
  const result = await context.runPlannedProcess();
  if (result.timedOut) throw new PpaAdapterError("PPA_TOOL_TIMEOUT", `${context.step.name} timed out`, "timeout");
  if (result.outputLimitExceeded) throw new PpaAdapterError("PPA_OUTPUT_LIMIT", `${context.step.name} exceeded its log limit`, "storage");
  if (result.exitCode !== 0) throw new PpaAdapterError("PPA_TOOL_EXIT", `${context.step.name} exited with ${result.exitCode}`, "tool_exit");
  return { exitCode: 0, outputs: { executed: context.step.stepKey, exitCode: 0 } };
}
