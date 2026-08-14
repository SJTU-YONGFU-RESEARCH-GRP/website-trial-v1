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
      const specification = await selfTestSpec(tool, directory, this.tools, this.runner);
      const stdout: string[] = []; const stderr: string[] = [];
      const result = await this.runner.run(`self-test:${tool.id}:${randomUUID()}`, { tool, argv: specification.argv, cwd: directory, allowedCwdRoot: directory, timeoutSeconds: Math.min(tool.timeoutSeconds, 120), onOutput: (stream, output) => { (stream === "stdout" ? stdout : stderr).push(output); } });
      passed = result.exitCode === 0 && !result.timedOut && !result.outputLimitExceeded;
      if (!passed) throw new Error(`adapter self-test exited ${result.exitCode}${result.timedOut ? " after timeout" : ""}`);
      for (const required of specification.requiredFiles) {
        const stat = await fsp.stat(path.join(directory, required)).catch(() => null);
        if (!stat?.isFile() || stat.size === 0) throw new Error(`adapter self-test did not produce ${required}`);
      }
      if (specification.verifyOutput) specification.verifyOutput(stdout.join(""), stderr.join(""));
    } catch (error) { status = "unavailable"; message = error instanceof Error ? error.message : String(error); }
    finally { await fsp.rm(directory, { recursive: true, force: true }); }
    const previous = this.tools.latestHealth(tool.id);
    const record: ToolHealthCheckV1 = { id: randomUUID(), toolConfigurationId: tool.id, status, version: previous?.version || null, checkedAt: new Date().toISOString(), durationMs: Date.now() - started, message, missingDependencies: passed ? [] : [message], selfTestPassed: passed };
    this.tools.addHealth(record); return record;
  }
}

function isPythonModule(value: string): boolean { return !value.endsWith(".py") && !value.includes("/") && /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(value); }
function safeName(value: string): string { return value.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 80) || "tool"; }

interface SelfTestSpecification { argv: string[]; requiredFiles: string[]; verifyOutput?: (stdout: string, stderr: string) => void; }

async function selfTestSpec(tool: ToolConfigurationV1, directory: string, tools: ToolRepository, runner: SafeProcessRunner): Promise<SelfTestSpecification> {
  if (tool.toolId === "yosys") {
    const source = path.join(directory, "selftest.v");
    await fsp.writeFile(source, "module selftest(input a, output y); assign y = a; endmodule\n", { mode: 0o600 });
    return { argv: ["-Q", "-p", `read_verilog ${source}; hierarchy -check -top selftest; proc; check`], requiredFiles: [] };
  }
  if (tool.toolId === "opensta") {
    const script = path.join(directory, "selftest.tcl");
    await fsp.writeFile(script, "puts EDA_SELF_TEST_OK\nexit\n", { mode: 0o600 });
    return { argv: [script], requiredFiles: [] };
  }
  if (tool.toolId === "iverilog") {
    const source = path.join(directory, "selftest.v");
    await fsp.writeFile(source, "module selftest; initial begin $display(\"EDA_SELF_TEST_OK\"); $finish; end endmodule\n", { mode: 0o600 });
    return { argv: ["-g2012", "-s", "selftest", "-o", path.join(directory, "selftest.vvp"), source], requiredFiles: ["selftest.vvp"] };
  }
  if (tool.toolId === "vvp") {
    const compiler = tools.active("digital").find((candidate) => candidate.toolId === "iverilog");
    if (!compiler) throw new Error("vvp self-test requires an enabled Icarus Verilog compiler configuration");
    const source = path.join(directory, "selftest.v"); const image = path.join(directory, "selftest.vvp");
    await fsp.writeFile(source, "module selftest; initial begin $display(\"EDA_SELF_TEST_OK\"); $finish; end endmodule\n", { mode: 0o600 });
    const compile = await runner.run(`self-test:${compiler.id}:${randomUUID()}`, { tool: compiler, argv: ["-g2012", "-s", "selftest", "-o", image, source], cwd: directory, allowedCwdRoot: directory, timeoutSeconds: Math.min(compiler.timeoutSeconds, 60) });
    if (compile.exitCode !== 0) throw new Error(`vvp self-test compiler exited ${compile.exitCode}`);
    return { argv: [image], requiredFiles: [], verifyOutput(stdout) { if (!stdout.includes("EDA_SELF_TEST_OK")) throw new Error("vvp self-test did not execute the compiled image"); } };
  }
  if (tool.toolId === "ngspice") {
    const source = path.join(directory, "selftest.cir");
    await fsp.writeFile(source, "EDA platform self-test\nV1 in 0 1\nR1 in 0 1k\n.op\n.end\n", { mode: 0o600 });
    return { argv: ["-b", "-o", path.join(directory, "ngspice.log"), source], requiredFiles: ["ngspice.log"] };
  }
  if (tool.toolId === "hspice") {
    const source = path.join(directory, "selftest.sp");
    await fsp.writeFile(source, "EDA platform self-test\nV1 in 0 1\nR1 in 0 1k\n.op\n.end\n", { mode: 0o600 });
    return { argv: ["-i", source, "-o", path.join(directory, "hspice-selftest")], requiredFiles: [] };
  }
  if (tool.toolId === "spectre") {
    const source = path.join(directory, "selftest.scs");
    await fsp.writeFile(source, "simulator lang=spectre\nV1 (in 0) vsource dc=1\nR1 (in 0) resistor r=1k\ndcOp dc\n", { mode: 0o600 });
    return { argv: [source, "+log", path.join(directory, "spectre.log")], requiredFiles: ["spectre.log"] };
  }
  if (tool.toolId === "translator") {
    const source = path.join(directory, "selftest.sp"); const output = path.join(directory, "translated.lib");
    await writeMosModel(source);
    return { argv: ["translate", source, "--output", output, "--source", "ngspice", "--target", "ngspice"], requiredFiles: ["translated.lib"] };
  }
  if (tool.toolId === "fitting") {
    const simulator = tools.active("benchmark").find((candidate) => candidate.toolId === "ngspice" && candidate.executablePath);
    if (!simulator?.executablePath) throw new Error("Fitting self-test requires an enabled ngspice configuration");
    const csv = path.join(directory, "measured.csv");
    await fsp.writeFile(csv, "Vgs,Vds,Vbs,id\n0,1,0,0\n0.6,1,0,1e-8\n1.2,1,0,1e-4\n", { mode: 0o600 });
    return { argv: ["--dataset", `${csv}:vgs:0:1.2:0.6:vds=1:vbs=0`, "--sim-type", "dc", "--ngspice", simulator.executablePath, "--max-iters", "1", "--train", "vth0", "--jobs", "1", "--output-model", path.join(directory, "fitted.lib")], requiredFiles: ["fitted.lib"] };
  }
  if (tool.toolId === "reduction") {
    const source = path.join(directory, "selftest.lib"); await writeMosModel(source);
    return { argv: ["complete", source, path.join(directory, "reduced"), "0.5", "1", "1", "gradient_descent", "sensitivity", "dc_iv", "nmos", "false"], requiredFiles: ["reduced/reduction_results.json", "reduced/reduced_model.lib", "reduced/model_manifest.json"] };
  }
  if (tool.toolId === "expansion") {
    const source = path.join(directory, "selftest.lib"); await writeMosModel(source);
    return { argv: ["generate-corners", source, "--out-dir", path.join(directory, "expanded"), "--n-sigma", "1"], requiredFiles: ["expanded/models/model_t.sp", "expanded/models/model_s.sp", "expanded/models/model_f.sp"] };
  }
  if (tool.toolId === "spice-benchmark") {
    const simulator = tools.active("benchmark").find((candidate) => ["ngspice", "spectre", "hspice"].includes(candidate.toolId) && tools.latestHealth(candidate.id)?.selfTestPassed === true);
    if (!simulator) throw new Error("Benchmark self-test requires a simulator that passed its native self-test");
    const source = path.join(directory, "selftest.lib"); await writeMosModel(source);
    return { argv: [source, "--simulator", simulator.toolId, "--modes", "dc", "--output-dir", path.join(directory, "benchmark"), "--dpi", "72", "--log-level", "WARNING"], requiredFiles: ["benchmark/REPORT.md"] };
  }
  if (tool.toolId === "ppa-result-parser") {
    const run = path.join(directory, "openroad-run"); await fsp.mkdir(run);
    await fsp.writeFile(path.join(run, "metrics.json"), `${JSON.stringify({ design: "selftest", flow: "openroad", area: 1 })}\n`, { mode: 0o600 });
    return { argv: ["run", "--flow", "openroad", "--include-all", run], requiredFiles: [], verifyOutput(stdout) { const value = JSON.parse(stdout) as { normalized?: unknown }; if (!value.normalized) throw new Error("PPA parser self-test did not emit normalized data"); } };
  }
  if (tool.toolId === "openroad-orfs") {
    if (!tool.rootPath) throw new Error("OpenROAD ORFS self-test requires the flow repository root");
    const makefile = path.join(tool.rootPath, "flow", "Makefile");
    const designConfig = path.join(tool.rootPath, "flow", "designs", "nangate45", "gcd", "config.mk");
    for (const [label, filename] of [["flow/Makefile", makefile], ["nangate45/gcd config", designConfig]] as const) {
      const stat = await fsp.stat(filename).catch(() => null);
      if (!stat?.isFile()) throw new Error(`OpenROAD ORFS ${label} is missing`);
    }
    return { argv: ["-f", makefile, `DESIGN_CONFIG=${designConfig}`, "print-FLOW_HOME"], requiredFiles: [] };
  }
  if (tool.toolId === "openlane1") return { argv: ["--help"], requiredFiles: [] };
  if (tool.toolId === "librelane") return { argv: ["--help"], requiredFiles: [] };
  if (tool.toolId === "magic") return { argv: ["--version"], requiredFiles: [] };
  if (tool.toolId === "klayout") return { argv: ["-v"], requiredFiles: [] };
  throw new Error(`No adapter-owned minimal self-test is implemented for ${tool.toolId}`);
}

async function writeMosModel(filename: string): Promise<void> {
  await fsp.writeFile(filename, ".model nmos_bsim45 nmos level=54 version=4.8.2 vth0=0.7 u0=300 tox=1.5e-9 ndep=1e17\n", { mode: 0o600 });
}
