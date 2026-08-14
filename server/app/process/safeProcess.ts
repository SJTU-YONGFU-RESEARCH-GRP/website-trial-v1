import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";

export interface ProcessRunOptions {
  tool: ToolConfigurationV1;
  argv: string[];
  cwd: string;
  allowedCwdRoot: string;
  abortSignal?: AbortSignal;
  timeoutSeconds?: number;
  stdoutPath?: string;
  stderrPath?: string;
  onOutput?: (stream: "stdout" | "stderr", text: string) => void | Promise<void>;
  onSpawn?: (processId: number, processGroupId: number) => void;
  maxOutputBytes?: number;
}

export interface ProcessRunResult { exitCode: number; signal: NodeJS.Signals | null; processId: number; processGroupId: number; timedOut: boolean; outputLimitExceeded: boolean; }

function within(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export class SafeProcessRunner {
  private readonly children = new Map<string, ChildProcess>();
  constructor(private readonly cancelGraceMs = 10_000, private readonly defaultMaxOutputBytes = 256 * 1024 * 1024) {}

  async run(key: string, options: ProcessRunOptions): Promise<ProcessRunResult> {
    if (!options.tool.enabled) throw new Error("tool configuration is disabled");
    const configuredExecutable = options.tool.interpreterPath || options.tool.executablePath;
    if (!configuredExecutable || !path.isAbsolute(configuredExecutable)) throw new Error("configured executable must be an absolute path");
    const executable = await fsp.realpath(configuredExecutable);
    const executableStat = await fsp.stat(executable);
    if (!executableStat.isFile() || !(executableStat.mode & 0o111)) throw new Error("configured executable is not an executable regular file");
    const cwd = await fsp.realpath(options.cwd); const root = await fsp.realpath(options.allowedCwdRoot);
    if (!within(root, cwd)) throw new Error("tool cwd escapes the owning job workspace");
    let entryPoint = options.tool.entryPoint;
    let entryArgv: string[] = [];
    if (options.tool.interpreterPath && entryPoint) {
      const isModule = !entryPoint.endsWith(".py") && !entryPoint.includes("/") && /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(entryPoint);
      if (isModule) entryArgv = ["-m", entryPoint];
      else {
        entryPoint = await fsp.realpath(path.isAbsolute(entryPoint) ? entryPoint : path.join(options.tool.rootPath || "", entryPoint));
        entryArgv = [entryPoint];
      }
    }
    const adapterArgv = options.tool.interpreterPath ? [...entryArgv, ...options.argv] : options.argv;
    if (!adapterArgv.every((item) => typeof item === "string" && !item.includes("\0"))) throw new Error("argv contains an invalid value");
    const isolatedHome = path.join(cwd, ".eda-home"); const isolatedTemp = path.join(cwd, ".eda-tmp");
    await Promise.all([fsp.mkdir(isolatedHome, { recursive: true, mode: 0o750 }), fsp.mkdir(isolatedTemp, { recursive: true, mode: 0o750 })]);
    const environment: NodeJS.ProcessEnv = {
      PATH: [path.dirname(executable), "/usr/local/bin", "/usr/bin", "/bin"].filter((value, index, values) => values.indexOf(value) === index).join(path.delimiter),
      LANG: "C.UTF-8", LC_ALL: "C.UTF-8", HOME: isolatedHome, TMPDIR: isolatedTemp,
    };
    for (const name of options.tool.environmentNames) {
      const value = options.tool.environment[name];
      if (value !== undefined) environment[name] = value;
    }
    const stdout = options.stdoutPath ? fs.createWriteStream(options.stdoutPath, { flags: "a", mode: 0o640 }) : null;
    const stderr = options.stderrPath ? fs.createWriteStream(options.stderrPath, { flags: "a", mode: 0o640 }) : null;
    const child = spawn(executable, adapterArgv, { cwd, env: environment, shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
    this.children.set(key, child);
    const processId = child.pid;
    if (!processId) throw new Error("process did not receive a pid");
    options.onSpawn?.(processId, processId);
    let timedOut = false; let outputLimitExceeded = false; let outputBytes = 0; let timer: NodeJS.Timeout | null = null;
    const abort = () => { void this.terminate(child); };
    options.abortSignal?.addEventListener("abort", abort, { once: true });
    const timeoutSeconds = options.timeoutSeconds || options.tool.timeoutSeconds;
    if (timeoutSeconds > 0) timer = setTimeout(() => { timedOut = true; void this.terminate(child); }, timeoutSeconds * 1000);
    const handleOutput = (stream: "stdout" | "stderr", chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > (options.maxOutputBytes || this.defaultMaxOutputBytes)) { outputLimitExceeded = true; void this.terminate(child); return; }
      (stream === "stdout" ? stdout : stderr)?.write(chunk); void options.onOutput?.(stream, redact(chunk.toString("utf8"), options.tool));
    };
    child.stdout?.on("data", (chunk: Buffer) => handleOutput("stdout", chunk)); child.stderr?.on("data", (chunk: Buffer) => handleOutput("stderr", chunk));
    try {
      const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolvePromise, reject) => {
        child.once("error", reject); child.once("close", (code, signal) => resolvePromise({ code, signal }));
      });
      return { exitCode: result.code ?? (options.abortSignal?.aborted ? 130 : 1), signal: result.signal, processId, processGroupId: processId, timedOut, outputLimitExceeded };
    } finally {
      if (timer) clearTimeout(timer);
      options.abortSignal?.removeEventListener("abort", abort);
      this.children.delete(key);
      await Promise.all([closeWriteStream(stdout), closeWriteStream(stderr)]);
    }
  }

  async cancel(key: string): Promise<boolean> {
    const child = this.children.get(key); if (!child) return false;
    await this.terminate(child); return true;
  }

  private async terminate(child: ChildProcess): Promise<void> {
    if (!child.pid) return;
    signalProcessGroup(child.pid, "SIGTERM");
    await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, this.cancelGraceMs));
    // Always address the original process group after the grace period. The
    // leader may have exited while a descendant kept running; ESRCH is safe.
    signalProcessGroup(child.pid, "SIGKILL");
  }
}

async function closeWriteStream(stream: fs.WriteStream | null): Promise<void> {
  if (!stream || stream.closed) return;
  await new Promise<void>((resolvePromise, reject) => {
    stream.once("error", reject);
    stream.end(resolvePromise);
  });
}

function signalProcessGroup(pid: number, signal: NodeJS.Signals): void {
  try { process.kill(process.platform === "win32" ? pid : -pid, signal); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
}

function redact(text: string, tool: ToolConfigurationV1): string {
  let output = text;
  for (const [name, value] of Object.entries(tool.environment)) {
    if (/pass|secret|token|license|key/i.test(name) && value) output = output.replaceAll(value, "[REDACTED]");
  }
  return output;
}
