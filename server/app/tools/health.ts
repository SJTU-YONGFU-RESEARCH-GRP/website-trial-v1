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
    const started = Date.now(); let status: ToolHealthCheckV1["status"] = "healthy"; let version: string | null = null; let message = "version probe succeeded"; const missing: string[] = [];
    try {
      if (!tool.enabled) throw new Error("configuration is disabled");
      const executable = tool.interpreterPath || tool.executablePath;
      if (!executable) throw new Error("no executable or interpreter configured");
      await fsp.access(executable, fsConstants.X_OK);
      if (tool.rootPath) await fsp.access(tool.rootPath, fsConstants.R_OK);
      if (tool.entryPoint) await fsp.access(path.isAbsolute(tool.entryPoint) ? tool.entryPoint : path.join(tool.rootPath || "", tool.entryPoint), fsConstants.R_OK);
      const stdout: string[] = []; const stderr: string[] = [];
      const result = await this.runner.run(`probe:${tool.id}:${randomUUID()}`, { tool, argv: tool.versionProbeArgv, cwd: this.probeRoot, allowedCwdRoot: this.probeRoot, timeoutSeconds: Math.min(tool.timeoutSeconds, 30), onOutput: (stream, text) => { (stream === "stdout" ? stdout : stderr).push(text); } });
      if (result.exitCode !== 0) throw new Error(`version probe exited ${result.exitCode}: ${stderr.join("").trim().slice(0, 500)}`);
      version = (stdout.join("") || stderr.join("")).trim().split(/\r?\n/)[0]?.slice(0, 500) || null;
    } catch (error) { status = tool.rootPath || tool.executablePath || tool.interpreterPath ? "unavailable" : "not_configured"; message = error instanceof Error ? error.message : String(error); missing.push(message); }
    const record: ToolHealthCheckV1 = { id: randomUUID(), toolConfigurationId: tool.id, status, version, checkedAt: new Date().toISOString(), durationMs: Date.now() - started, message, missingDependencies: missing, selfTestPassed: null };
    this.tools.addHealth(record); return record;
  }
}
