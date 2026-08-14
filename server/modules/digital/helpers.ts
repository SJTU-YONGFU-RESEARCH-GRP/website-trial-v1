import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { JsonObject, StepExecutionContextV1, StructuredJobErrorV1 } from "../../../shared/contracts/v1.js";
import type { DigitalExecutionContext, DigitalRunParameters, DigitalToolBinding, DigitalToolId } from "./types.js";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const METADATA = /^[A-Za-z0-9][A-Za-z0-9_.+:/ -]{0,127}$/;
const MAX_CAPTURE_BYTES = 16 * 1024 * 1024;

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

export function configurationFor(context: DigitalExecutionContext, toolId: DigitalToolId): DigitalToolBinding {
  const binding = context.toolBindings?.[toolId];
  const snapshot = binding?.configuration ?? context.job.toolConfigurations.find((item) => item.toolId === toolId);
  if (!snapshot?.enabled || !snapshot.executablePath) {
    throw new DigitalAdapterError("DIGITAL_TOOL_NOT_CONFIGURED", `${toolId} is not configured`, "configuration");
  }
  if (binding && binding.health !== "healthy") {
    throw new DigitalAdapterError("DIGITAL_TOOL_UNAVAILABLE", `${toolId} is ${binding.health}`, "configuration");
  }
  return binding ?? { configuration: snapshot, health: "healthy", environment: {} };
}

const ENV_ALLOWLIST: Record<DigitalToolId, ReadonlySet<string>> = {
  yosys: new Set(["YOSYS_DATDIR"]),
  opensta: new Set(["STA_HOME"]),
  iverilog: new Set(["IVERILOG_ICONFIG"]),
  vvp: new Set(["VVP_NOSIGNALS"]),
};

function processEnvironment(binding: DigitalToolBinding, toolId: DigitalToolId, workspaceRoot: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    TMPDIR: workspacePath(workspaceRoot, "work", "tmp"),
  };
  const configuredNames = new Set(binding.configuration.environmentNames);
  for (const name of ENV_ALLOWLIST[toolId]) {
    if (configuredNames.has(name) && binding.environment[name] !== undefined) {
      environment[name] = binding.environment[name];
    }
  }
  return environment;
}

async function terminateProcessGroup(childPid: number): Promise<void> {
  try {
    process.kill(-childPid, "SIGTERM");
  } catch {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 750));
  try {
    process.kill(-childPid, "SIGKILL");
  } catch {
    // Process already exited.
  }
}

export async function runConfiguredProcess(
  context: DigitalExecutionContext,
  toolId: DigitalToolId,
  argv: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const binding = configurationFor(context, toolId);
  const executable = binding.configuration.executablePath;
  if (!path.isAbsolute(executable)) {
    throw new DigitalAdapterError("DIGITAL_EXECUTABLE_NOT_ABSOLUTE", `${toolId} executable must be an absolute administrator-configured path`, "configuration");
  }
  await fs.mkdir(workspacePath(context.workspacePath, "work", "tmp"), { recursive: true });
  await fs.mkdir(workspacePath(context.workspacePath, "logs"), { recursive: true });
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, argv, {
      cwd: context.workspacePath,
      env: processEnvironment(binding, toolId, context.workspacePath),
      detached: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let finished = false;
    const timeoutMs = binding.configuration.timeoutSeconds * 1000;
    const finishFailure = async (error: Error): Promise<void> => {
      if (finished) return;
      finished = true;
      if (child.pid) await terminateProcessGroup(child.pid);
      reject(error);
    };
    const timeout = setTimeout(() => {
      void finishFailure(new DigitalAdapterError("DIGITAL_TOOL_TIMEOUT", `${toolId} exceeded ${binding.configuration.timeoutSeconds}s`, "timeout"));
    }, timeoutMs);
    const abort = (): void => {
      void finishFailure(new DigitalAdapterError("DIGITAL_TOOL_CANCELLED", `${toolId} was cancelled`, "cancelled"));
    };
    context.abortSignal.addEventListener("abort", abort, { once: true });
    const capture = (stream: "stdout" | "stderr", chunk: Buffer): void => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_CAPTURE_BYTES) {
        void finishFailure(new DigitalAdapterError("DIGITAL_OUTPUT_LIMIT", `${toolId} exceeded the 16 MiB log limit`, "tool_exit"));
        return;
      }
      const message = chunk.toString("utf8");
      if (stream === "stdout") stdout += message;
      else stderr += message;
      void context.emit({
        jobId: context.job.id,
        stepId: context.step.id,
        at: context.now(),
        level: stream === "stderr" ? "warning" : "info",
        stream,
        message,
        payload: null,
      });
    };
    child.stdout.on("data", (chunk: Buffer) => capture("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => capture("stderr", chunk));
    child.once("error", (error) => void finishFailure(error));
    const complete = (code: number | null, signal: NodeJS.Signals | null): void => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      context.abortSignal.removeEventListener("abort", abort);
      const exitCode = code ?? (signal ? 128 : 1);
      resolve({ exitCode, stdout, stderr });
    };
    child.once("close", complete);
    // A tool may leave a helper process holding an inherited pipe after the main
    // executable has exited. Do not leave the job stuck solely waiting for that
    // pipe; the detached process group remains available to cancellation.
    child.once("exit", (code, signal) => setTimeout(() => complete(code, signal), 100));
  });
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
