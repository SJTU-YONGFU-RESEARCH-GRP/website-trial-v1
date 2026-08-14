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
});
