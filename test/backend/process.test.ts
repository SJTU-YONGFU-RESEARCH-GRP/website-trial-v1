import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ToolConfigurationV1 } from "../../shared/contracts/v1.ts";
import { SafeProcessRunner } from "../../server/app/process/safeProcess.ts";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fsp.rm(root, { recursive: true, force: true }))); });

describe("safe process execution", () => {
  it("uses argv with shell disabled and cancels the entire detached process group", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-process-test-")); roots.push(root);
    const at = new Date().toISOString();
    const tool: ToolConfigurationV1 = { id: "node-test", toolId: "node-test", moduleId: "digital", revision: 1, enabled: true, rootPath: null, executablePath: process.execPath,
      interpreterPath: null, entryPoint: null, workingDirectory: null, timeoutSeconds: 30, maxConcurrency: 1, environmentNames: [], environment: {}, versionProbeArgv: ["--version"], adapterId: "test-only", adapterVersion: "1", capturedAt: at, createdAt: at, updatedAt: at };
    const runner = new SafeProcessRunner(200); const started = Date.now();
    const running = runner.run("group", { tool, argv: ["-e", "const {spawn}=require('node:child_process');spawn(process.execPath,['-e','setInterval(()=>{},1000)']);setInterval(()=>{},1000)"], cwd: root, allowedCwdRoot: root });
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100)); expect(await runner.cancel("group")).toBe(true);
    const result = await running; expect(result.signal).toMatch(/SIGTERM|SIGKILL/); expect(Date.now() - started).toBeLessThan(3000);
  });

  it("rejects a cwd outside the owning workspace", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-process-root-")); roots.push(root); const outside = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-process-out-")); roots.push(outside); const at = new Date().toISOString();
    const tool = { id: "node", toolId: "node", moduleId: "ppa", revision: 1, enabled: true, rootPath: null, executablePath: process.execPath, interpreterPath: null, entryPoint: null, workingDirectory: null, timeoutSeconds: 1, maxConcurrency: 1, environmentNames: [], environment: {}, versionProbeArgv: [], adapterId: "test", adapterVersion: "1", capturedAt: at, createdAt: at, updatedAt: at } as ToolConfigurationV1;
    await expect(new SafeProcessRunner().run("outside", { tool, argv: ["--version"], cwd: outside, allowedCwdRoot: root })).rejects.toThrow(/escapes/);
  });

  it("does not spawn when cancellation was already requested", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-process-pre-abort-")); roots.push(root); const at = new Date().toISOString();
    const tool = { id: "node", toolId: "node", moduleId: "digital", revision: 1, enabled: true, rootPath: null, executablePath: process.execPath,
      interpreterPath: null, entryPoint: null, workingDirectory: null, timeoutSeconds: 2, maxConcurrency: 1, environmentNames: [], environment: {}, versionProbeArgv: [], adapterId: "test", adapterVersion: "1",
      capturedAt: at, createdAt: at, updatedAt: at } as ToolConfigurationV1;
    const sentinel = path.join(root, "must-not-exist"); const controller = new AbortController(); controller.abort();
    await expect(new SafeProcessRunner().run("pre-abort", { tool, argv: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(sentinel)},'bad')`], cwd: root, allowedCwdRoot: root, abortSignal: controller.signal })).rejects.toThrow(/aborted before spawn/);
    await expect(fsp.access(sentinel)).rejects.toThrow();
  });

  it("redacts configured secrets from both persisted logs and streamed events", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-process-redaction-")); roots.push(root);
    const at = new Date().toISOString(); const secret = "license-token-must-not-leak";
    const tool = { id: "node", toolId: "node", moduleId: "benchmark", revision: 1, enabled: true, rootPath: null, executablePath: process.execPath,
      interpreterPath: null, entryPoint: null, workingDirectory: null, timeoutSeconds: 2, maxConcurrency: 1,
      environmentNames: ["EDA_LICENSE_TOKEN"], environment: { EDA_LICENSE_TOKEN: secret }, versionProbeArgv: [], adapterId: "test", adapterVersion: "1",
      capturedAt: at, createdAt: at, updatedAt: at } as ToolConfigurationV1;
    const stdoutPath = path.join(root, "stdout.log"); const streamed: string[] = [];
    const result = await new SafeProcessRunner().run("redact", { tool, argv: ["-e", "process.stdout.write(process.env.EDA_LICENSE_TOKEN)"], cwd: root,
      allowedCwdRoot: root, stdoutPath, onOutput: (_stream, text) => streamed.push(text) });
    expect(result.exitCode).toBe(0);
    expect(await fsp.readFile(stdoutPath, "utf8")).toBe("[REDACTED]");
    expect(streamed.join("")).toBe("[REDACTED]");
  });

  it("redacts a configured secret split across separate process output chunks", async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-process-split-redaction-")); roots.push(root);
    const at = new Date().toISOString(); const secret = "license-token-split-across-chunks";
    const tool = { id: "node", toolId: "node", moduleId: "ppa", revision: 1, enabled: true, rootPath: null, executablePath: process.execPath,
      interpreterPath: null, entryPoint: null, workingDirectory: null, timeoutSeconds: 2, maxConcurrency: 1,
      environmentNames: ["EDA_LICENSE_TOKEN"], environment: { EDA_LICENSE_TOKEN: secret }, versionProbeArgv: [], adapterId: "test", adapterVersion: "1",
      capturedAt: at, createdAt: at, updatedAt: at } as ToolConfigurationV1;
    const stdoutPath = path.join(root, "stdout.log"); const streamed: string[] = [];
    const script = "const s=process.env.EDA_LICENSE_TOKEN;process.stdout.write(s.slice(0,11));setTimeout(()=>process.stdout.write(s.slice(11)),75)";
    const result = await new SafeProcessRunner().run("split-redact", { tool, argv: ["-e", script], cwd: root,
      allowedCwdRoot: root, stdoutPath, onOutput: (_stream, text) => streamed.push(text) });
    expect(result.exitCode).toBe(0);
    expect(await fsp.readFile(stdoutPath, "utf8")).toBe("[REDACTED]");
    expect(streamed.join("")).toBe("[REDACTED]");
    expect(streamed.join("")).not.toContain(secret);
  });
});
