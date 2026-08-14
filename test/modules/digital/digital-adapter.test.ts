import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type {
  DraftValidationContextV1,
  InputFileV1,
  JobRecordV1,
  JobStepRecordV1,
  StepExecutionContextV1,
  ToolConfigurationSnapshotV1,
} from "../../../shared/contracts/v1";
import { digitalModuleAdapter } from "../../../server/modules/digital/index";
import { normalizeImportedRecord, parseCompletedDigitalFiles } from "../../../server/modules/digital/parsers/import";
import { parseLiberty } from "../../../server/modules/digital/parsers/liberty";
import { buildDigitalPlan } from "../../../server/modules/digital/planner";
import { materializeSafeSdc, validateWorkspaceInputs } from "../../../server/modules/digital/security";
import { validateInputMapping } from "../../../server/modules/digital/inputs";
import type { DigitalExecutionContext } from "../../../server/modules/digital/types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

function tool(toolId: string): ToolConfigurationSnapshotV1 {
  return {
    id: `config-${toolId}`,
    toolId,
    moduleId: "digital",
    revision: 1,
    enabled: true,
    rootPath: null,
    executablePath: `/usr/bin/${toolId === "opensta" ? "sta" : toolId}`,
    interpreterPath: null,
    entryPoint: null,
    workingDirectory: null,
    timeoutSeconds: 30,
    maxConcurrency: 1,
    environmentNames: [],
    versionProbeArgv: ["--version"],
    adapterId: "digital-yosys-opensta-v1",
    adapterVersion: "1.0.0",
    capturedAt: "2026-08-14T00:00:00.000Z",
  };
}

function input(relativePath: string, role: string, overrides: Partial<InputFileV1> = {}): InputFileV1 {
  return {
    relativePath,
    sizeBytes: 1,
    sha256: "0".repeat(64),
    mediaType: "text/plain",
    recognizedType: path.extname(relativePath).slice(1),
    role,
    required: false,
    usedByStepIds: [],
    unresolvedIncludes: [],
    validationErrors: [],
    ...overrides,
  };
}

function job(files: InputFileV1[], operation = "run"): JobRecordV1 {
  const at = "2026-08-14T00:00:00.000Z";
  return {
    id: "job-digital",
    ownerId: "owner",
    moduleId: "digital",
    operation,
    workflow: operation === "import" ? "completed-results" : "yosys-opensta",
    status: "validating",
    inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0), fileCount: files.length, rootHint: null, createdAt: at },
    parameters: operation === "import" ? {} : {
      design: "adder",
      category: "adders",
      architecture: "ripple_carry",
      topModule: "adder_top",
      processTechnology: "sky130",
      bitWidth: 8,
      library: "sky130_fd_sc_hd",
      corner: "tt",
      clockPort: null,
      clockPeriodNs: 10,
      inputSlewNs: 0.05,
      outputLoadPf: 0.01,
      simulationTop: "tb",
    },
    capabilityVersion: "digital.workflow.v1",
    toolConfigurations: [tool("yosys"), tool("opensta"), tool("iverilog"), tool("vvp")],
    toolVersions: {},
    plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "digital.workflow.v1", steps: [], sweep: null, warnings: [] },
    workspaceRelativePath: "jobs/job-digital",
    currentStepId: null,
    sweepParentJobId: null,
    retryOfJobId: null,
    resultId: null,
    progress: 0,
    exitCode: null,
    error: null,
    createdAt: at,
    queuedAt: null,
    startedAt: null,
    finishedAt: null,
    updatedAt: at,
  };
}

function validationContext(record: JobRecordV1): DraftValidationContextV1 {
  return { moduleId: "digital", storageRoot: "/storage", now: () => "2026-08-14T00:00:00.000Z", job: record, files: record.inputManifest.files, technology: null };
}

async function executionContext(record: JobRecordV1, stepKey = "validate-input"): Promise<DigitalExecutionContext> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "digital-adapter-test-"));
  temporaryDirectories.push(workspace);
  await Promise.all(["input", "work", "output", "logs", "artifacts"].map((directory) => fs.mkdir(path.join(workspace, directory))));
  const step: JobStepRecordV1 = {
    id: `step-${stepKey}`, jobId: record.id, ordinal: 0, stepKey, name: stepKey, status: "running", progress: 0,
    processId: null, processGroupId: null, exitCode: null, startedAt: null, finishedAt: null, error: null,
  };
  return {
    moduleId: "digital",
    storageRoot: path.dirname(workspace),
    now: () => "2026-08-14T00:00:00.000Z",
    job: record,
    step,
    workspacePath: workspace,
    abortSignal: new AbortController().signal,
    emit: async () => undefined,
  } satisfies StepExecutionContextV1;
}

describe("Digital plan and preflight", () => {
  it("builds exact argv arrays and optional simulation steps without shell commands", () => {
    const files = [input("rtl/adder.sv", "rtl"), input("tb/tb.sv", "testbench"), input("lib/sky.lib", "liberty")];
    const plan = buildDigitalPlan(validationContext(job(files)));
    expect(plan.steps.map((step) => step.id)).toEqual([
      "validate-input", "resolve-hierarchy", "simulation-compile", "simulation-run", "synthesis", "timing", "normalize", "publish",
    ]);
    const compile = plan.steps.find((step) => step.id === "simulation-compile")?.process;
    expect(compile?.argv).toEqual(["-g2012", "-s", "tb", "-o", "work/simulation.vvp", "input/rtl/adder.sv", "input/tb/tb.sv"]);
    expect(plan.steps.find((step) => step.id === "synthesis")?.process?.argv).toEqual(["-ql", "logs/yosys.log", "work/synthesis.ys"]);
    expect(plan.steps.find((step) => step.id === "timing")?.process?.argv).toEqual(["work/opensta.tcl"]);
    expect(plan.steps.flatMap((step) => step.process?.argv ?? []).join(" ")).not.toContain("shell:true");
  });

  it("reports unavailable required tools instead of accepting a demo success", async () => {
    const record = job([input("adder.v", "rtl"), input("cells.lib", "liberty")]);
    record.toolConfigurations = [];
    const validation = await digitalModuleAdapter.validateDraft(validationContext(record));
    expect(validation.valid).toBe(false);
    expect(validation.errors.filter((error) => error.code === "DIGITAL_TOOL_NOT_CONFIGURED")).toHaveLength(2);
  });

  it("rejects unsafe uploaded SDC during preflight, before the job can be started", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "digital-preflight-sdc-"));
    temporaryDirectories.push(storageRoot);
    const record = job([input("constraints.sdc", "sdc"), input("adder.v", "rtl"), input("cells.lib", "liberty")]);
    const inputRoot = path.join(storageRoot, record.workspaceRelativePath, "input");
    await fs.mkdir(inputRoot, { recursive: true });
    await fs.writeFile(path.join(inputRoot, "constraints.sdc"), "create_clock -period 10 [exec touch /tmp/pwned]\n");
    const validation = await validateInputMapping({ ...validationContext(record), storageRoot });
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "DIGITAL_SDC_UNSAFE" }));
  });

  it("rejects an external-process primitive located in RTL during preflight", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "digital-preflight-rtl-")); temporaryDirectories.push(storageRoot);
    const source = "module adder_top; initial $system(\"never-executed\"); endmodule\n";
    const record = job([input("adder.v", "rtl", { sizeBytes: Buffer.byteLength(source) }), input("cells.lib", "liberty")]);
    const inputRoot = path.join(storageRoot, record.workspaceRelativePath, "input"); await fs.mkdir(inputRoot, { recursive: true }); await fs.writeFile(path.join(inputRoot, "adder.v"), source);
    const validation = await validateInputMapping({ ...validationContext(record), storageRoot });
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "DIGITAL_HDL_EXTERNAL_PRIMITIVE" }));
  });

  it("recursively scans unassigned include dependencies and rejects host file I/O", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "digital-preflight-closure-")); temporaryDirectories.push(storageRoot);
    const root = "`include \"secret.vh\"\nmodule adder_top; endmodule\n"; const dependency = "initial $fopen(\"/etc/passwd\", \"r\");\n";
    const record = job([input("rtl/adder.v", "rtl", { sizeBytes: Buffer.byteLength(root) }), input("rtl/secret.vh", "unassigned", { sizeBytes: Buffer.byteLength(dependency) }), input("cells.lib", "liberty")]);
    const inputRoot = path.join(storageRoot, record.workspaceRelativePath, "input", "rtl"); await fs.mkdir(inputRoot, { recursive: true }); await fs.writeFile(path.join(inputRoot, "adder.v"), root); await fs.writeFile(path.join(inputRoot, "secret.vh"), dependency);
    const validation = await validateInputMapping({ ...validationContext(record), storageRoot });
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "DIGITAL_HDL_EXTERNAL_PRIMITIVE" }));
  });

  it("recognizes an include directive after a block comment and ordinary tokens", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "digital-inline-include-")); temporaryDirectories.push(storageRoot);
    const root = "/* comment */ wire marker; `include \"secret.vh\"\nmodule adder_top; endmodule\n"; const dependency = "initial $readmemh(\"/etc/passwd\", memory);\n";
    const record = job([input("rtl/adder.v", "rtl", { sizeBytes: Buffer.byteLength(root) }), input("rtl/secret.vh", "unassigned", { sizeBytes: Buffer.byteLength(dependency) }), input("cells.lib", "liberty")]);
    const inputRoot = path.join(storageRoot, record.workspaceRelativePath, "input", "rtl"); await fs.mkdir(inputRoot, { recursive: true }); await fs.writeFile(path.join(inputRoot, "adder.v"), root); await fs.writeFile(path.join(inputRoot, "secret.vh"), dependency);
    const validation = await validateInputMapping({ ...validationContext(record), storageRoot });
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "DIGITAL_HDL_EXTERNAL_PRIMITIVE" }));
  });

  it("scans includes beyond the upload preview window and rejects a missing dependency", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "digital-preflight-late-include-")); temporaryDirectories.push(storageRoot);
    const source = `${"// padding\n".repeat(210_000)}\`include \"missing.vh\"\nmodule adder_top; endmodule\n`;
    const record = job([input("adder.v", "rtl", { sizeBytes: Buffer.byteLength(source) }), input("cells.lib", "liberty")]);
    const inputRoot = path.join(storageRoot, record.workspaceRelativePath, "input"); await fs.mkdir(inputRoot, { recursive: true }); await fs.writeFile(path.join(inputRoot, "adder.v"), source);
    const validation = await validateInputMapping({ ...validationContext(record), storageRoot });
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "DIGITAL_HDL_INCLUDE_UNRESOLVED" }));
  });

  it("detects a changed input using the frozen SHA-256 manifest", async () => {
    const content = "module adder_top; endmodule\n";
    const file = input("adder.v", "rtl", { sizeBytes: Buffer.byteLength(content), sha256: createHash("sha256").update(content).digest("hex") });
    const record = job([file, input("cells.lib", "liberty")]);
    const context = await executionContext(record);
    await fs.writeFile(path.join(context.workspacePath, "input", "adder.v"), `${content}// changed`);
    await fs.writeFile(path.join(context.workspacePath, "input", "cells.lib"), "x");
    await expect(validateWorkspaceInputs(context)).rejects.toMatchObject({ code: "DIGITAL_INPUT_SIZE_CHANGED" });
  });

  it("regenerates only a conservative SDC subset and rejects Tcl exec", async () => {
    const safe = "create_clock -name clk -period 10 [get_ports clk]\nset_input_delay 1 -clock clk [all_inputs]\n";
    const file = input("constraints.sdc", "sdc", { sizeBytes: Buffer.byteLength(safe), sha256: createHash("sha256").update(safe).digest("hex") });
    const record = job([file, input("adder.v", "rtl"), input("cells.lib", "liberty")]);
    const context = await executionContext(record);
    await fs.writeFile(path.join(context.workspacePath, "input", "constraints.sdc"), safe);
    expect(await materializeSafeSdc(context)).toBe(path.join(context.workspacePath, "work", "constraints.sdc"));
    expect(await fs.readFile(path.join(context.workspacePath, "work", "constraints.sdc"), "utf8")).toBe(safe);
    await fs.writeFile(path.join(context.workspacePath, "input", "constraints.sdc"), "create_clock -period 10 [exec touch /tmp/pwned]\n");
    await expect(materializeSafeSdc(context)).rejects.toMatchObject({ code: "DIGITAL_SDC_UNSAFE" });
  });
});

describe("Digital result normalization", () => {
  it("parses Liberty area and converts nW leakage to mW", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "digital-liberty-test-"));
    temporaryDirectories.push(directory);
    const filename = path.join(directory, "cells.lib");
    await fs.writeFile(filename, `library(test) {
      leakage_power_unit : "1nW";
      cell (INVX1) { area : 1.25; cell_leakage_power : 250; }
      cell (NANDX1) { area : 2.5; leakage_power () { when : "A"; value : 400; } leakage_power () { when : "!A"; value : 600; } }
    }`);
    const liberty = await parseLiberty(filename);
    expect(liberty.cells.get("INVX1")).toMatchObject({ areaUm2: 1.25, leakageMw: 0.00025, leakageSource: "cell_leakage_power" });
    expect(liberty.cells.get("NANDX1")).toMatchObject({ areaUm2: 2.5, leakageMw: 0.0005, leakageSource: "conditional_average" });
  });

  it("never relabels an unspecified imported powerMw as total power", () => {
    const row = normalizeImportedRecord({ architecture: "ripple", bitWidth: 8, processNode: "sky130", fmaxMhz: 100, powerMw: 0.5, areaUm2: 40 });
    expect(row.power).toMatchObject({ metric: "reported_unspecified", reportedMw: 0.5, staticLeakageMw: null, estimatedDynamicMw: null, totalPowerMw: null });
    expect(row.warnings[0]).toContain("not treated as leakage, dynamic, or total power");
  });

  it("preserves explicit static, dynamic, and total power scopes across CSV import", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "digital-import-test-"));
    temporaryDirectories.push(directory);
    const filename = path.join(directory, "results.csv");
    await fs.writeFile(filename, [
      "architecture,bitWidth,processNode,fmaxMhz,powerMw,areaUm2,powerMetric",
      "a,8,sky130,100,0.1,20,Liberty static leakage",
      "b,8,sky130,90,0.2,22,VCD estimated dynamic power",
      "c,8,sky130,80,0.3,24,parsed total power",
    ].join("\n"));
    const rows = await parseCompletedDigitalFiles([filename]);
    expect(rows.map((row) => row.power.metric)).toEqual(["static_liberty_leakage", "reported_dynamic", "reported_total"]);
    expect(rows[0].power.totalPowerMw).toBeNull();
    expect(rows[1].power.staticLeakageMw).toBeNull();
    expect(rows[2].power.totalPowerMw).toBe(0.3);
  });
});
