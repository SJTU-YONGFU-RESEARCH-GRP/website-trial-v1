import { realpath } from "node:fs/promises";
import path from "node:path";
import type { ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import type { BenchmarkToolId, CommandSpec } from "./types.ts";

const PYTHON_MODULE_BY_TOOL: Partial<Record<BenchmarkToolId, string>> = {
  reduction: "bmr.cli",
  expansion: "model_expansion",
  "spice-benchmark": "spice_model_benchmark.cli",
};

export function assertSafeRelativePath(value: string, label = "path"): string {
  if (!value || value.includes("\0") || value.includes("\\")) {
    throw new Error(`${label} must be a non-empty POSIX relative path`);
  }
  if (path.posix.isAbsolute(value)) {
    throw new Error(`${label} must not be absolute`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${label} contains an unsafe path segment`);
  }
  return segments.join("/");
}

export function workspacePath(workspaceRoot: string, relativePath: string): string {
  const safe = assertSafeRelativePath(relativePath);
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(root, ...safe.split("/"));
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Resolved path escapes the job workspace");
  }
  return target;
}

export async function assertExistingPathWithin(root: string, target: string): Promise<string> {
  const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)]);
  if (realTarget !== realRoot && !realTarget.startsWith(`${realRoot}${path.sep}`)) {
    throw new Error("Filesystem path escapes the permitted root");
  }
  return realTarget;
}

function isPathLike(value: string): boolean {
  return value.endsWith(".py") || value.includes("/");
}

export function resolveInvocation(
  toolId: BenchmarkToolId,
  configuration: ToolConfigurationSnapshotV1,
  argv: string[],
  cwdRelative: string,
  expectedOutputs: string[],
): CommandSpec {
  if (!configuration.enabled) {
    throw new Error(`${toolId} is disabled`);
  }

  let executable: string;
  if (configuration.interpreterPath) {
    executable = configuration.interpreterPath;
    const expectedModule = PYTHON_MODULE_BY_TOOL[toolId];
    const entryPoint = configuration.entryPoint;
    if (!entryPoint) {
      if (!expectedModule) throw new Error(`${toolId} requires a configured entry point`);
    } else if (expectedModule && entryPoint === expectedModule) {
    } else if (isPathLike(entryPoint)) {
    } else {
      throw new Error(`${toolId} entry point does not match its audited Python module`);
    }
  } else if (configuration.executablePath) {
    executable = configuration.executablePath;
    if (configuration.entryPoint) {
      throw new Error(`${toolId} cannot combine an executable with an entry point`);
    }
  } else {
    throw new Error(`${toolId} is not configured with an executable or interpreter`);
  }

  if (!path.isAbsolute(executable)) {
    throw new Error(`${toolId} executable must be an administrator-configured absolute path`);
  }
  if (configuration.entryPoint && isPathLike(configuration.entryPoint) && !path.isAbsolute(configuration.entryPoint)) {
    throw new Error(`${toolId} script entry point must be an absolute path`);
  }
  if (argv.some((item) => item.includes("\0"))) {
    throw new Error(`${toolId} argv contains a NUL byte`);
  }

  return {
    toolId,
    executable,
    argv: [...argv],
    cwdRelative: assertSafeRelativePath(cwdRelative, "working directory"),
    environmentNames: [...configuration.environmentNames],
    timeoutSeconds: configuration.timeoutSeconds,
    expectedOutputs,
  };
}

export function isUnsafeSpiceText(text: string): string | null {
  const lines = text.split(/\r?\n/);
  let inControl = false;
  for (const rawLine of lines) {
    const line = rawLine.trim().toLowerCase();
    if (!line || line.startsWith("*")) continue;
    if (line === ".control" || line.startsWith(".control ")) {
      inControl = true;
      return "Embedded .control blocks are not accepted as model input";
    }
    if (line === ".endc") inControl = false;
    if (inControl || /^(shell|system|source)\b/.test(line) || /^\.?(shell|system)\b/.test(line)) {
      return "SPICE input contains an external-command directive";
    }
    if (/^\.include\s+["']?\s*(?:\/|~|[a-z]:[\\/]|\.\.\/)/i.test(rawLine.trim())) {
      return "SPICE include must stay inside the uploaded input tree";
    }
  }
  return null;
}

export function sanitizeOutputName(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const name = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(name) || name === "." || name === "..") {
    throw new Error("Output name may contain only letters, digits, dot, underscore and dash");
  }
  return name;
}
