import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DraftValidationContextV1, InputFileV1, JobRecordV1, TechnologyLibraryV1, ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import { ppaModuleAdapter } from "../../../server/modules/ppa/index.ts";
import { ppaCapabilities } from "../../../server/modules/ppa/capabilities.ts";
import { parseParserOutput } from "../../../server/modules/ppa/parser.ts";
import { executePpaStep, stageCompletedRun } from "../../../server/modules/ppa/executor.ts";
import { sanitizePpaSdc } from "../../../server/modules/ppa/security.ts";
import { buildPpaPlan, buildPpaSweepChildPlans } from "../../../server/modules/ppa/planner.ts";
import { expandSweep } from "../../../server/modules/ppa/sweep.ts";
import { openRoadOrfsAdapter } from "../../../server/modules/ppa/adapters/openroadOrfs.ts";

const temporary: string[] = [];
afterEach(async () => Promise.all(temporary.splice(0).map((item) => fs.rm(item, { recursive: true, force: true }))));

function tool(toolId: string, options: { root?: string; parser?: boolean } = {}): ToolConfigurationSnapshotV1 {
  return { id: `tool-${toolId}`, toolId, moduleId: "ppa", revision: 1, enabled: true, rootPath: options.root ?? null,
    executablePath: options.parser ? null : "/usr/bin/make", interpreterPath: options.parser ? "/usr/bin/python3" : null,
    entryPoint: options.parser ? "/configured/result_json_ast.py" : null, workingDirectory: null, timeoutSeconds: 100,
    maxConcurrency: 1, environmentNames: [], versionProbeArgv: ["--version"], adapterId: toolId, adapterVersion: "1.0.0", capturedAt: "2026-08-14T00:00:00.000Z" };
}

function file(relativePath: string, role: string, recognizedType = "verilog"): InputFileV1 {
  return { relativePath, role, recognizedType, sizeBytes: 1, sha256: "a".repeat(64), mediaType: "text/plain", required: true, usedByStepIds: [], unresolvedIncludes: [], validationErrors: [] };
}

const technology: TechnologyLibraryV1 = { id: "tech-1", technologyId: "sky130hd", processNode: "130nm", pdk: "sky130A", standardCellLibrary: "sky130_fd_sc_hd",
  libertyPaths: ["/pdk/cells.lib"], techLefPath: "/pdk/tech.lef", cellLefPaths: ["/pdk/cells.lef"], corner: "tt", voltage: 1.8, rcCorner: "nominal",
  allowedAdapterIds: ["ppa-openroad-orfs-v1", "ppa-openlane1-v1", "ppa-librelane-v1"], enabled: true, revision: 1, createdAt: "2026-08-14T00:00:00.000Z", updatedAt: "2026-08-14T00:00:00.000Z" };

function job(overrides: Partial<JobRecordV1> = {}): JobRecordV1 {
  const at = "2026-08-14T00:00:00.000Z"; const files = [file("rtl/uart.v", "rtl")];
  return { id: "job-ppa", ownerId: "user", moduleId: "ppa", operation: "run", workflow: "openroad-orfs", status: "validating",
    inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: 1, fileCount: 1, rootHint: null, createdAt: at },
    parameters: { flow: "openroad-orfs", designName: "uart", topModule: "uart", clockPort: "clk", clockPeriodNs: 10, coreUtilization: 40, technologyLibraryId: technology.id },
    capabilityVersion: "ppa.workflow.v1", toolConfigurations: [tool("openroad-orfs", { root: "/opt/orfs" }), tool("ppa-result-parser", { parser: true })], toolVersions: {},
    plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "ppa.workflow.v1", steps: [], sweep: null, warnings: [] }, workspaceRelativePath: "jobs/job-ppa",
    currentStepId: null, sweepParentJobId: null, retryOfJobId: null, resultId: null, progress: 0, exitCode: null, error: null,
    createdAt: at, queuedAt: null, startedAt: null, finishedAt: null, updatedAt: at, ...overrides };
}

function context(record = job()): DraftValidationContextV1 & { toolBindings: Record<string, { configuration: ToolConfigurationSnapshotV1; health: "healthy"; environment: Record<string, string>; selfTestPassed: true }>; maxSweepJobs: number } {
  return { moduleId: "ppa", storageRoot: "/storage", now: () => "2026-08-14T00:00:00.000Z", job: record, files: record.inputManifest.files, technology,
    toolBindings: Object.fromEntries(record.toolConfigurations.map((configuration) => [configuration.toolId, { configuration, health: "healthy" as const, environment: {}, selfTestPassed: true as const }])), maxSweepJobs: 16 };
}

describe("PPA capabilities and validation", () => {
  it("marks OpenLane and LibreLane unavailable instead of manufacturing demo success", async () => {
    const capabilities = ppaCapabilities({ moduleId: "ppa", storageRoot: "/storage", now: () => "2026-08-14T00:00:00.000Z", toolBindings: {
      "openroad-orfs": { configuration: tool("openroad-orfs", { root: "/opt/orfs" }), health: "healthy", environment: {}, selfTestPassed: true },
      "ppa-result-parser": { configuration: tool("ppa-result-parser", { parser: true }), health: "healthy", environment: {}, selfTestPassed: true },
    } });
    expect(capabilities.find((item) => item.toolId === "openroad-orfs")?.health).toBe("healthy");
    expect(capabilities.find((item) => item.toolId === "openlane1")?.health).toBe("not_configured");
    expect(capabilities.find((item) => item.toolId === "librelane")?.health).toBe("not_configured");
    expect(capabilities.every((item) => item.parameters.every((parameter) => parameter.mapping.key && parameter.toolVersionRange !== undefined))).toBe(true);
  });

  it("rejects a run when the selected real flow has no healthy binding", async () => {
    const value = context(); delete value.toolBindings["openroad-orfs"];
    const validation = await ppaModuleAdapter.validateDraft(value);
    expect(validation.valid).toBe(false); expect(validation.errors[0]?.code).toBe("PPA_FLOW_UNAVAILABLE");
  });

  it("rejects unsafe uploaded SDC during preflight", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ppa-preflight-sdc-")); temporary.push(storageRoot);
    const record = job();
    record.inputManifest.files.push(file("constraints.sdc", "sdc", "sdc"));
    const inputRoot = path.join(storageRoot, record.workspaceRelativePath, "input");
    await fs.mkdir(path.join(inputRoot, "rtl"), { recursive: true });
    await fs.writeFile(path.join(inputRoot, "rtl", "uart.v"), "m");
    await fs.writeFile(path.join(inputRoot, "constraints.sdc"), "create_clock -period 10 [exec touch /tmp/pwned]\n");
    const validation = await ppaModuleAdapter.validateDraft({ ...context(record), storageRoot });
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "PPA_SDC_UNSAFE" }));
  });

  it("rejects an unsafe or missing HDL include during source-run preflight", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ppa-preflight-include-")); temporary.push(storageRoot);
    const source = "`include \"missing.vh\"\nmodule uart; endmodule\n"; const record = job(); record.inputManifest.files[0].sizeBytes = Buffer.byteLength(source);
    const inputRoot = path.join(storageRoot, record.workspaceRelativePath, "input", "rtl"); await fs.mkdir(inputRoot, { recursive: true }); await fs.writeFile(path.join(inputRoot, "uart.v"), source);
    const validation = await ppaModuleAdapter.validateDraft({ ...context(record), storageRoot });
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "PPA_HDL_INCLUDE_UNRESOLVED" }));
  });

  it("rejects JSON mapped as executable RTL instead of passing it to the flow", async () => {
    const record = job(); record.inputManifest.files.push(file("config.json", "rtl", "json"));
    const validation = await ppaModuleAdapter.validateDraft(context(record));
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "PPA_ROLE_EXTENSION_MISMATCH" }));
  });

  it("accepts completed-run import with only the healthy configured parser and no technology", async () => {
    const parser = tool("ppa-result-parser", { parser: true }); const evidence = file("openroad/metrics.json", "completed_run", "json");
    const record = job({ operation: "import", workflow: "openroad-orfs", inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [evidence], totalBytes: 1, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      parameters: { flow: "openroad-orfs", designName: "uart", topModule: "uart", clockPort: "clk", clockPeriodNs: 10 }, toolConfigurations: [parser] });
    const value = { ...context(record), technology: null, toolBindings: { "ppa-result-parser": { configuration: parser, health: "healthy" as const, environment: {}, selfTestPassed: true as const } } };
    const validation = await ppaModuleAdapter.validateDraft(value); expect(validation).toMatchObject({ valid: true, errors: [] });
    const plan = buildPpaPlan(value); expect(plan.steps.map((step) => step.id)).toEqual(["validate-input", "prepare-import", "parse-native", "normalize", "publish"]);
    expect(plan.steps.find((step) => step.id === "parse-native")?.process?.argv).toEqual(["run", "--flow", "openroad", "--include-all", "work/import-run"]);
  });

  it("stages a single imported OpenROAD report into the parser run directory without executing evidence", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ppa-import-")); temporary.push(directory); await fs.mkdir(path.join(directory, "input", "bundle"), { recursive: true });
    const evidence = file("bundle/metrics.json", "completed_run", "json"); await fs.writeFile(path.join(directory, "input", "bundle", "metrics.json"), "{}");
    const record = job({ operation: "import", inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [evidence], totalBytes: 2, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" }, parameters: { flow: "openroad-orfs", designName: "uart", topModule: "uart", clockPort: "clk", clockPeriodNs: 10 } });
    const output = await stageCompletedRun({ moduleId: "ppa", storageRoot: directory, now: () => "2026-08-14T00:00:00.000Z", job: record,
      step: { id: "step", jobId: record.id, ordinal: 0, stepKey: "prepare-import", name: "prepare", status: "running", progress: 0, processId: null, processGroupId: null, exitCode: null, startedAt: null, finishedAt: null, error: null },
      workspacePath: directory, abortSignal: new AbortController().signal, emit: async () => undefined });
    expect(output).toMatchObject({ primary: "metrics.json", scriptsExecuted: false }); expect(await fs.readFile(path.join(directory, "work", "import-run", "metrics.json"), "utf8")).toBe("{}");
  });
});

describe("PPA sweep and plans", () => {
  it("expands single/range/list dimensions as a bounded Cartesian product", () => {
    const expanded = expandSweep({ sweep: { clockPeriodNs: { mode: "range", start: 5, stop: 10, step: 5 }, coreUtilization: { mode: "list", values: [30, 50, 70] } } }, openRoadOrfsAdapter.parameters, 6);
    expect(expanded.runCount).toBe(6); expect(expanded.points).toContainEqual({ clockPeriodNs: 10, coreUtilization: 70 });
    expect(() => expandSweep({ sweep: { clockPeriodNs: { mode: "range", start: 1, stop: 10, step: 1 } } }, openRoadOrfsAdapter.parameters, 5)).toThrow(/maximum is 5/);
  });

  it("builds real ORFS phases with argv arrays and child plans for every point", () => {
    const record = job(); record.parameters.sweep = { clockPeriodNs: { mode: "list", values: [5, 10] } };
    const value = context(record); const plan = buildPpaPlan(value);
    expect(plan.sweep?.runCount).toBe(2); expect(plan.steps.some((item) => item.id === "run-0001:synthesize")).toBe(true);
    const synth = plan.steps.find((item) => item.id === "run-0001:synthesize")?.process;
    expect(synth?.argv).toEqual(["-f", "/opt/orfs/flow/Makefile", "DESIGN_CONFIG=work/orfs-config.mk", "WORK_HOME=work/orfs-home", "synth"]);
    expect(synth?.cwdRelative).toBe("run-0001"); expect(buildPpaSweepChildPlans(value)).toHaveLength(2);
  });

  it("never places an uploaded Tcl/Make/Python file in executable argv", () => {
    const record = job(); record.inputManifest.files.push(file("user/config.tcl", "ignore", "evidence-script-never-executed"));
    const argv = buildPpaPlan(context(record)).steps.flatMap((item) => item.process?.argv ?? []);
    expect(argv.join(" ")).not.toContain("user/config.tcl"); expect(argv.join(" ")).not.toContain("shell");
  });
});

describe("PPA parser", () => {
  it("accepts result_json_ast normalized JSON and retains evidence", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ppa-parser-")); temporary.push(directory); const filename = path.join(directory, "parser.json");
    await fs.writeFile(filename, JSON.stringify({ flow: "openroad", design: "uart", normalized: { area_um2: 123, setup_wns_ns: 0.1 }, provenance: { primary: "metrics.json" } }));
    const result = await parseParserOutput(filename); expect(result.title).toContain("uart"); expect(result.data.flow).toBe("openroad-orfs"); expect(result.parserId).toBe("result-json-ast");
  });
});

describe("PPA generated configuration security", () => {
  it("accepts a conservative SDC subset and rejects nested Tcl execution", () => {
    expect(sanitizePpaSdc("create_clock -period 10 [get_ports clk]\nset_input_delay 1 -clock clk [all_inputs]\n")).toContain("create_clock");
    expect(() => sanitizePpaSdc("create_clock -period 10 [exec touch /tmp/pwned]\n")).toThrow(/unsafe SDC query/);
    expect(() => sanitizePpaSdc("source user.tcl\n")).toThrow(/unsupported SDC command/);
    expect(() => sanitizePpaSdc("set x [get_ports clk]\n")).toThrow(/unsafe SDC syntax|unsupported SDC command/);
  });

  it("rejects an uploaded input whose bytes changed without changing its size", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ppa-input-hash-")); temporary.push(directory);
    await fs.mkdir(path.join(directory, "input", "rtl"), { recursive: true });
    await fs.writeFile(path.join(directory, "input", "rtl", "uart.v"), "b");
    const record = job();
    record.inputManifest.files[0].sha256 = createHash("sha256").update("a").digest("hex");
    const step = { id: "validate-step", jobId: record.id, ordinal: 0, stepKey: "validate-input", name: "validate", status: "running" as const,
      progress: 0, processId: null, processGroupId: null, exitCode: null, startedAt: null, finishedAt: null, error: null };
    await expect(executePpaStep({ moduleId: "ppa", storageRoot: directory, now: () => "2026-08-14T00:00:00.000Z", job: record,
      step, workspacePath: directory, abortSignal: new AbortController().signal, emit: async () => undefined })).rejects.toThrow(/input hash changed/);
  });
});
