import { randomUUID } from "node:crypto";
import fsp from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import type { ToolConfigurationV1, ToolHealthCheckV1 } from "../../../shared/contracts/v1.ts";
import type { ToolRepository } from "../db/repositories.ts";
import { SafeProcessRunner } from "../process/safeProcess.ts";

export class ToolHealthService {
  constructor(private readonly tools: ToolRepository, private readonly runner: SafeProcessRunner, private readonly probeRoot: string) {}
  async probe(tool: ToolConfigurationV1): Promise<ToolHealthCheckV1> {
    const started = Date.now(); const previous = this.tools.latestHealth(tool.id); let status: ToolHealthCheckV1["status"] = "healthy"; let version: string | null = null; let message = "version probe succeeded"; const missing: string[] = [];
    try {
      if (!tool.enabled) throw new Error("configuration is disabled");
      const executable = tool.interpreterPath || tool.executablePath;
      if (!executable) throw new Error("no executable or interpreter configured");
      await fsp.access(executable, fsConstants.X_OK);
      if (tool.rootPath) await fsp.access(tool.rootPath, fsConstants.R_OK);
      const moduleEntry = tool.entryPoint && !tool.entryPoint.endsWith(".py") && !tool.entryPoint.includes("/") && /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(tool.entryPoint);
      if (tool.entryPoint && !moduleEntry) {
        await fsp.access(path.isAbsolute(tool.entryPoint) ? tool.entryPoint : path.join(tool.rootPath || "", tool.entryPoint), fsConstants.R_OK);
      }
      const stdout: string[] = []; const stderr: string[] = [];
      const result = await this.runner.run(`probe:${tool.id}:${randomUUID()}`, { tool, argv: tool.versionProbeArgv, cwd: this.probeRoot, allowedCwdRoot: this.probeRoot, timeoutSeconds: Math.min(tool.timeoutSeconds, 30), onOutput: (stream, text) => { (stream === "stdout" ? stdout : stderr).push(text); } });
      if (result.exitCode !== 0) throw new Error(`version probe exited ${result.exitCode}: ${stderr.join("").trim().slice(0, 500)}`);
      version = (stdout.join("") || stderr.join("")).trim().split(/\r?\n/)[0]?.slice(0, 500) || null;
    } catch (error) { status = tool.rootPath || tool.executablePath || tool.interpreterPath ? "unavailable" : "not_configured"; message = error instanceof Error ? error.message : String(error); missing.push(message); }
    const record: ToolHealthCheckV1 = { id: randomUUID(), toolConfigurationId: tool.id, status, version, checkedAt: new Date().toISOString(), durationMs: Date.now() - started, message, missingDependencies: missing, selfTestPassed: status === "healthy" ? previous?.selfTestPassed ?? null : false };
    this.tools.addHealth(record); return record;
  }

  async checkPaths(tool: ToolConfigurationV1): Promise<{ ok: boolean; executable: string | null; root: string | null; entryPoint: string | null; errors: string[] }> {
    const errors: string[] = [];
    let executable: string | null = null; let root: string | null = null; let entryPoint: string | null = null;
    try {
      const configured = tool.interpreterPath || tool.executablePath;
      if (!configured) throw new Error("no executable or interpreter configured");
      executable = await fsp.realpath(configured);
      const stat = await fsp.stat(executable);
      if (!stat.isFile() || !(stat.mode & 0o111)) throw new Error("configured executable is not an executable regular file");
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    if (tool.rootPath) {
      try { root = await fsp.realpath(tool.rootPath); if (!(await fsp.stat(root)).isDirectory()) throw new Error("tool root is not a directory"); }
      catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    }
    if (tool.entryPoint) {
      const moduleEntry = isPythonModule(tool.entryPoint);
      if (moduleEntry) entryPoint = tool.entryPoint;
      else {
        try {
          entryPoint = await fsp.realpath(path.isAbsolute(tool.entryPoint) ? tool.entryPoint : path.join(tool.rootPath || "", tool.entryPoint));
          if (!(await fsp.stat(entryPoint)).isFile()) throw new Error("entry point is not a regular file");
        } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
      }
    }
    return { ok: errors.length === 0, executable, root, entryPoint, errors };
  }

  async selfTest(tool: ToolConfigurationV1): Promise<ToolHealthCheckV1> {
    const started = Date.now(); const directory = await fsp.mkdtemp(path.join(this.probeRoot, `${safeName(tool.toolId)}-`));
    let status: ToolHealthCheckV1["status"] = "healthy"; let message = "adapter self-test succeeded"; let passed = false;
    try {
      const argv = await selfTestArgv(tool, directory);
      const result = await this.runner.run(`self-test:${tool.id}:${randomUUID()}`, { tool, argv, cwd: directory, allowedCwdRoot: directory, timeoutSeconds: Math.min(tool.timeoutSeconds, 60) });
      passed = result.exitCode === 0 && !result.timedOut && !result.outputLimitExceeded;
      if (!passed) throw new Error(`adapter self-test exited ${result.exitCode}${result.timedOut ? " after timeout" : ""}`);
    } catch (error) { status = "unavailable"; message = error instanceof Error ? error.message : String(error); }
    finally { await fsp.rm(directory, { recursive: true, force: true }); }
    const previous = this.tools.latestHealth(tool.id);
    const record: ToolHealthCheckV1 = { id: randomUUID(), toolConfigurationId: tool.id, status, version: previous?.version || null, checkedAt: new Date().toISOString(), durationMs: Date.now() - started, message, missingDependencies: passed ? [] : [message], selfTestPassed: passed };
    this.tools.addHealth(record); return record;
  }
}

function isPythonModule(value: string): boolean { return !value.endsWith(".py") && !value.includes("/") && /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(value); }
function safeName(value: string): string { return value.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 80) || "tool"; }

async function selfTestArgv(tool: ToolConfigurationV1, directory: string): Promise<string[]> {
  if (tool.toolId === "yosys") {
    const source = path.join(directory, "selftest.v");
    await fsp.writeFile(source, "module selftest(input a, output y); assign y = a; endmodule\n", { mode: 0o600 });
    return ["-Q", "-p", `read_verilog ${source}; hierarchy -check -top selftest; proc; check`];
  }
  if (tool.toolId === "opensta") {
    const script = path.join(directory, "selftest.tcl");
    await fsp.writeFile(script, "puts EDA_SELF_TEST_OK\nexit\n", { mode: 0o600 });
    return [script];
  }
  if (tool.toolId === "iverilog") {
    const source = path.join(directory, "selftest.v");
    await fsp.writeFile(source, "module selftest; initial begin $display(\"EDA_SELF_TEST_OK\"); $finish; end endmodule\n", { mode: 0o600 });
    return ["-g2012", "-s", "selftest", "-o", path.join(directory, "selftest.vvp"), source];
  }
  if (tool.toolId === "ngspice") {
    const source = path.join(directory, "selftest.cir");
    await fsp.writeFile(source, "EDA platform self-test\nV1 in 0 1\nR1 in 0 1k\n.op\n.end\n", { mode: 0o600 });
    return ["-b", "-o", path.join(directory, "ngspice.log"), source];
  }
  if (tool.toolId === "hspice") {
    const source = path.join(directory, "selftest.sp");
    await fsp.writeFile(source, "EDA platform self-test\nV1 in 0 1\nR1 in 0 1k\n.op\n.end\n", { mode: 0o600 });
    return ["-i", source, "-o", path.join(directory, "hspice-selftest")];
  }
  if (tool.toolId === "spectre") {
    const source = path.join(directory, "selftest.scs");
    await fsp.writeFile(source, "simulator lang=spectre\nV1 (in 0) vsource dc=1\nR1 (in 0) resistor r=1k\ndcOp dc\n", { mode: 0o600 });
    return [source, "+log", path.join(directory, "spectre.log")];
  }
  if (tool.toolId === "openroad") {
    const script = path.join(directory, "selftest.tcl");
    await fsp.writeFile(script, "puts EDA_SELF_TEST_OK\nexit\n", { mode: 0o600 });
    return ["-no_init", "-exit", script];
  }
  return tool.versionProbeArgv.length ? [...tool.versionProbeArgv] : ["--help"];
}
