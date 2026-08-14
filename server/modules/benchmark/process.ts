import { spawn } from "node:child_process";
import type { ProcessSpawner, SpawnRequest, SpawnResult } from "./types.ts";

const MAX_CAPTURED_STREAM_BYTES = 64 * 1024 * 1024;

export const spawnWithoutShell: ProcessSpawner = async (request: SpawnRequest): Promise<SpawnResult> =>
  new Promise((resolve, reject) => {
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let settled = false;

    const child = spawn(request.executable, request.argv, {
      cwd: request.cwd,
      env: request.env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const killGroup = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        if (process.platform === "win32") child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch {
        child.kill(signal);
      }
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      killGroup("SIGTERM");
      setTimeout(() => killGroup("SIGKILL"), 5_000).unref();
    }, Math.max(1, request.timeoutSeconds) * 1_000);
    timeout.unref();

    const abort = () => killGroup("SIGTERM");
    request.abortSignal.addEventListener("abort", abort, { once: true });

    const handleChunk = async (stream: "stdout" | "stderr", chunk: Buffer) => {
      if (stream === "stdout") stdoutBytes += chunk.byteLength;
      else stderrBytes += chunk.byteLength;
      if (stdoutBytes + stderrBytes > MAX_CAPTURED_STREAM_BYTES) {
        killGroup("SIGTERM");
        return;
      }
      const text = chunk.toString("utf8");
      if (stream === "stdout") await request.onStdout(text);
      else await request.onStderr(text);
    };

    child.stdout?.on("data", (chunk: Buffer) => void handleChunk("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer) => void handleChunk("stderr", chunk));
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      request.abortSignal.removeEventListener("abort", abort);
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      request.abortSignal.removeEventListener("abort", abort);
      resolve({
        exitCode: code ?? (request.abortSignal.aborted ? 130 : 1),
        signal,
        timedOut,
        stdoutBytes,
        stderrBytes,
      });
    });
  });
