import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DraftValidationContextV1 } from "../../../shared/contracts/v1.ts";
import { BenchmarkModuleAdapter } from "../../../server/modules/benchmark/index.ts";
import { inputFile, jobRecord, toolConfiguration } from "./helpers.ts";
import { detectSpiceDialect, inspectInputModel } from "../../../server/modules/benchmark/modelInput.ts";

vi.mock("../../../server/modules/benchmark/modelInput.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../server/modules/benchmark/modelInput.ts")>();
  return { ...actual, inspectInputModel: vi.fn(async (context: DraftValidationContextV1, relativePath: string) => {
    const file = context.files.find((entry) => entry.relativePath === relativePath)!;
    const text = await actual.readInputText(context, file);
    const models = [...(text ?? "").matchAll(/(?:\.model\s+(\S+)\s+(nmos|pmos)|model\s+(\S+)\s+\S+\s*\{\s*type=([np]))/gi)].map((match) => ({ name: match[1] ?? match[3], polarity: match[2]?.toLowerCase() ?? (match[4] === "n" ? "nmos" : "pmos"), modelType: "bsim4" }));
    return { ...actual.detectSpiceDialect(relativePath, text), text, models, includeReferences: actual.includeReferences(text ?? ""), dependencies: [], warnings: [] };
  }) };
});

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixtureContext(csv: string): Promise<DraftValidationContextV1> {
  const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-validation-"));
  temporaryDirectories.push(storageRoot);
  const inputRoot = path.join(storageRoot, "jobs/job-1/input");
  await mkdir(inputRoot, { recursive: true });
  await writeFile(path.join(inputRoot, "measured.csv"), csv);
  const files = [inputFile("measured.csv", "measured-csv", Buffer.byteLength(csv))];
  const job = jobRecord({
    inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(csv), fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
    parameters: {
      mode: "run", operations: { fitting: true, benchmark: false }, translator: {}, reduction: {}, expansion: {}, benchmark: {},
      fitting: { datasetMapping: { "measured.csv": { sweep: "vgs", start: 0, stop: 1.8, step: 0.1, vds: 1.8 } } },
    },
    toolConfigurations: [toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }),
      toolConfiguration("fitting", { interpreter: "/usr/bin/python3", entryPoint: "/opt/fitting/calibrate_bsim.py" }),
      toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
    ],
  });
  return { moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job, files, technology: null };
}

describe("Benchmark preflight validation", () => {
  it("recognizes generic .model content in a .sp file as canonical SPICE", () => {
    expect(detectSpiceDialect("model.sp", [
      ".model nmos_test nmos level=1 vto=0.7",
      ".model pmos_test pmos level=1 vto=-0.7",
    ].join("\n"))).toEqual({ dialect: "ngspice", dialectConfidence: "strong" });
    expect(detectSpiceDialect("model.sp", ".option post\n.model dut nmos level=1\n")).toEqual({ dialect: "hspice", dialectConfidence: "strong" });
  });

  it("recursively safety-scans included model dependencies without treating them as extra roots", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-include-security-")); temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input"); await mkdir(inputRoot, { recursive: true });
    const root = ".include child.lib\n.model dut nmos level=54\n"; const child = ".control\nshell touch never\n.endc\n";
    await writeFile(path.join(inputRoot, "main.sp"), root); await writeFile(path.join(inputRoot, "child.lib"), child);
    const files = [inputFile("main.sp", "primary-model", Buffer.byteLength(root)), inputFile("child.lib", "model-include", Buffer.byteLength(child))];
    const record = jobRecord({ inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(root) + Buffer.byteLength(child), fileCount: 2, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" }, parameters: { mode: "run", operations: { translator: true }, translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: {} }, toolConfigurations: [toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/main.py" })] });
    const result = await new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true } } }).validateDraft({ moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job: record, files, technology: null });
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "benchmark.unsafe_spice" }));
    expect(result.errors.map((item) => item.code)).not.toContain("benchmark.processing_single_model");
  });

  it("follows Spectre include syntax and rejects ahdl_include in the dependency", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-spectre-security-")); temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input"); await mkdir(inputRoot, { recursive: true });
    const root = "include \"child.scs\" section=tt\n"; const child = "ahdl_include \"external.va\"\n";
    await writeFile(path.join(inputRoot, "main.scs"), root); await writeFile(path.join(inputRoot, "child.scs"), child);
    const files = [inputFile("main.scs", "primary-model", Buffer.byteLength(root)), inputFile("child.scs", "model-include", Buffer.byteLength(child))];
    const record = jobRecord({ inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(root) + Buffer.byteLength(child), fileCount: 2, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" }, parameters: { mode: "run", operations: { translator: true }, translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: {} }, toolConfigurations: [toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/main.py" })] });
    const result = await new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true } } }).validateDraft({ moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job: record, files, technology: null });
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "benchmark.unsafe_spice", message: expect.stringContaining("ahdl_include") }));
  });

  it("treats a local .lib section as model syntax rather than a missing include", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-lib-section-")); temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input"); await mkdir(inputRoot, { recursive: true });
    const text = ".lib tt\n.model dut nmos level=54\n.endl tt\n";
    await writeFile(path.join(inputRoot, "model.lib"), text);
    const files = [inputFile("model.lib", "primary-model", Buffer.byteLength(text))];
    const benchmark = toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" });
    const simulator = toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" });
    const record = jobRecord({
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(text), fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      parameters: { mode: "run", operations: { benchmark: true }, operationOrder: [], translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["dc"] } },
      toolConfigurations: [toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }), benchmark, simulator],
    });
    const result = await new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      "spice-benchmark": { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } }).validateDraft({ moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job: record, files, technology: null });
    expect(result.errors.map((error) => error.code)).not.toContain("benchmark.unresolved_include");
  });

  it("automatically normalizes a Spectre root before a direct full Benchmark", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-auto-normalize-")); temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input"); await mkdir(inputRoot, { recursive: true });
    const text = [
      "simulator lang=spectre",
      "model dut_n bsim4 { type=n vth0=0.7 }",
      "model dut_p bsim4 { type=p vth0=-0.7 }",
    ].join("\n");
    await writeFile(path.join(inputRoot, "model.scs"), text);
    const files = [inputFile("model.scs", "primary-model", Buffer.byteLength(text))];
    const translator = toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" });
    const benchmark = toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" });
    const simulator = toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" });
    const record = jobRecord({
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(text), fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      parameters: { mode: "run", operations: { benchmark: true }, operationOrder: [], translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["dc", "transient", "ac", "noise"] } },
      toolConfigurations: [translator, benchmark, simulator],
    });
    const adapter = new BenchmarkModuleAdapter({ health: {
      translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      "spice-benchmark": { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const context: DraftValidationContextV1 = { moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job: record, files, technology: null };
    const validation = await adapter.validateDraft(context);
    expect(validation.errors).toEqual([]);
    const plan = await adapter.buildPlan(context);
    expect(plan.steps.map((step) => step.id)).toEqual([
      "validate-input", "normalize-benchmark.1", "inspect-model.benchmark.1", "benchmark.1", "parse-result", "publish-result",
    ]);
    expect(plan.steps.find((step) => step.id === "normalize-benchmark.1")?.process?.argv).toEqual(expect.arrayContaining([
      "--source", "spectre", "--target", "ngspice", "--follow-includes",
    ]));
    expect(plan.steps.find((step) => step.id === "benchmark.1")?.process?.argv.join(" ")).toContain("output/canonical-benchmark.1/normalized.lib");
  });

  it("fails preflight when automatic input normalization is required but Translator is unavailable", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-normalizer-health-")); temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input"); await mkdir(inputRoot, { recursive: true });
    const text = "simulator lang=spectre\nmodel dut bsim4 { type=n vth0=0.7 }\n";
    await writeFile(path.join(inputRoot, "model.scs"), text);
    const files = [inputFile("model.scs", "primary-model", Buffer.byteLength(text))];
    const benchmark = toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" });
    const simulator = toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" });
    const record = jobRecord({
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(text), fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      parameters: { mode: "run", operations: { benchmark: true }, operationOrder: [], translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["dc"] } },
      toolConfigurations: [benchmark, simulator],
    });
    const result = await new BenchmarkModuleAdapter({ health: {
      "spice-benchmark": { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } }).validateDraft({ moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job: record, files, technology: null });
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "benchmark.input_normalizer_unavailable" }));
  });

  it("accepts measured DC IV CSV with a sweep and mapped fixed bias", async () => {
    const context = await fixtureContext("Vgs,id\n0,0\n0.5,0.0001\n1.0,0.001\n");
    const adapter = new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      fitting: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const result = await adapter.validateDraft(context);
    expect(result.valid).toBe(true);
  });

  it("accepts fitting-tool CSV output with sweep_var/sweep_value and node voltages", async () => {
    const context = await fixtureContext([
      "sweep_var,sweep_value,id,vd,vg,vs,vb,temp",
      "vgs,0.0,1e-12,0.05,0.0,0.0,0.0,27",
      "vgs,0.5,1e-6,0.05,0.5,0.0,0.0,27",
      "vgs,1.0,1e-3,0.05,1.0,0.0,0.0,27",
    ].join("\n"));
    const adapter = new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      fitting: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const result = await adapter.validateDraft(context);
    expect(result.valid).toBe(true);
  });

  it("rejects parameters outside capability bounds before building argv", async () => {
    const context = await fixtureContext("Vgs,id\n0,0\n0.5,0.0001\n1.0,0.001\n");
    context.job.parameters.fitting = { ...(context.job.parameters.fitting as object), maxIterations: 0 };
    const adapter = new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      fitting: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const result = await adapter.validateDraft(context);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "benchmark.parameter_invalid", details: expect.objectContaining({ parameterId: "maxIterations" }) }));
  });

  it("rejects a CSV without an accepted current column", async () => {
    const context = await fixtureContext("Vgs,gm\n0,0\n1,1\n");
    const adapter = new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      fitting: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const result = await adapter.validateDraft(context);
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("benchmark.csv_current_column");
  });

  it("requires an uploaded model when fitting occurs after another model consumer", async () => {
    const context = await fixtureContext("Vgs,id\n0,0\n0.5,0.0001\n1.0,0.001\n");
    context.job.parameters.operations = { reduction: true, fitting: true, benchmark: false };
    context.job.parameters.operationOrder = ["reduction", "fitting"];
    const result = await new BenchmarkModuleAdapter().validateDraft(context);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "benchmark.chain_model_missing" }));
  });

  it("rejects nonfinite measured current before launching fitting", async () => {
    const context = await fixtureContext("Vgs,id\n0,0\n0.5,NaN\n1.0,0.001\n");
    const adapter = new BenchmarkModuleAdapter({ health: {
      fitting: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const result = await adapter.validateDraft(context);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "benchmark.csv_nonfinite_value" }));
  });

  it("builds a real multi-step Expansion DAG followed by Benchmark", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-plan-"));
    temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input");
    await mkdir(inputRoot, { recursive: true });
    await writeFile(path.join(inputRoot, "model.lib"), ".model dut nmos level=54\n");
    const files = [inputFile("model.lib", "primary-model")];
    const job = jobRecord({
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: 128, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      parameters: {
        mode: "run", operations: { expansion: true, benchmark: true }, translator: {}, fitting: {}, reduction: {},
        expansion: { runIv: true, runCv: true, runMonteCarlo: true },
        benchmark: { simulators: ["ngspice"], modes: ["dc", "ac"] },
      },
      toolConfigurations: [toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }),
        toolConfiguration("expansion", { interpreter: "/usr/bin/python3", entryPoint: "model_expansion" }),
        toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" }),
        toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
      ],
    });
    const context: DraftValidationContextV1 = { moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job, files, technology: null };
    const adapter = new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      expansion: { status: "healthy", version: "0.1.0", reason: null, adapterSelfTestPassed: true },
      "spice-benchmark": { status: "healthy", version: "1.0.0", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const plan = await adapter.buildPlan(context);
    expect(plan.steps.map((step) => step.id)).toEqual(expect.arrayContaining([
      "validate-input", "expansion.corners", "expansion.iv", "expansion.cv", "expansion.monte-carlo",
      "benchmark.1", "benchmark.2", "benchmark.3", "parse-result", "publish-result",
    ]));
    expect(plan.steps.filter((step) => step.id.startsWith("expansion.") && step.process)).toHaveLength(4);
  });

  it("requires a real CMOS pair only when the transient domain is selected", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "benchmark-cmos-contract-")); temporaryDirectories.push(storageRoot);
    const inputRoot = path.join(storageRoot, "jobs/job-1/input"); await mkdir(inputRoot, { recursive: true });
    const text = ".model only_n nmos level=54\n"; await writeFile(path.join(inputRoot, "model.lib"), text);
    const files = [inputFile("model.lib", "primary-model", Buffer.byteLength(text))];
    const configuration = toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" });
    const simulator = toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" });
    const record = jobRecord({
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files, totalBytes: Buffer.byteLength(text), fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      parameters: { mode: "run", operations: { benchmark: true }, operationOrder: [], translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["transient"] } },
      toolConfigurations: [toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }), configuration, simulator],
    });
    const adapter = new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      "spice-benchmark": { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    const transient = await adapter.validateDraft({ moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job: record, files, technology: null });
    expect(transient.errors).toContainEqual(expect.objectContaining({ code: "benchmark.transient_cmos_pair_required" }));
    record.parameters.benchmark = { simulators: ["ngspice"], modes: ["dc"] };
    const dc = await adapter.validateDraft({ moduleId: "benchmark", storageRoot, now: () => "2026-08-14T00:00:00.000Z", job: record, files, technology: null });
    expect(dc.errors.map((error) => error.code)).not.toContain("benchmark.transient_cmos_pair_required");
  });
  it.each([
    { name: "multiple NMOS cards", models: [{ name: "n1", polarity: "nmos" as const, modelType: "nmos" }, { name: "n2", polarity: "nmos" as const, modelType: "nmos" }], code: "benchmark.fixture_model_selection_ambiguous" },
    { name: "unresolved bin geometry", models: [{ name: "n", polarity: "nmos" as const, modelType: "nmos", hasBins: true, binCount: 2 }], code: "benchmark.fixture_binning_unsupported" },
    { name: "subcircuit-scoped MOS", models: [{ name: "n", polarity: "nmos" as const, modelType: "nmos", scope: ["wrap"] }], code: "benchmark.fixture_scope_unsupported" },
    { name: "PMOS-only unsupported positive-bias fixture", models: [{ name: "p", polarity: "pmos" as const, modelType: "pmos" }], code: "benchmark.fixture_nmos_required" },
    { name: "one real CMOS pair", models: [{ name: "n", polarity: "nmos" as const, modelType: "nmos" }, { name: "p", polarity: "pmos" as const, modelType: "pmos" }], code: null },
  ])("guards fixed Benchmark selection for DC: $name", async ({ models, code }) => {
    const context = await fixtureContext("Vgs,Vds,Id\n0,1.8,0\n1,1.8,1e-5\n");
    const source = ".model n nmos level=1\n";
    await writeFile(path.join(context.storageRoot, context.job.workspaceRelativePath, "input/model.lib"), source);
    const file = inputFile("model.lib", "primary-model", Buffer.byteLength(source));
    context.files = [file];
    context.job.parameters = { mode: "run", operations: { benchmark: true }, operationOrder: [], translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["dc"] } };
    context.job.toolConfigurations.push(toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" }));
    vi.mocked(inspectInputModel).mockResolvedValueOnce({ dialect: "ngspice", dialectConfidence: "strong", text: source, models, includeReferences: [], dependencies: [], warnings: [] });
    const result = await new BenchmarkModuleAdapter({ health: { translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true }, "spice-benchmark": { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true }, ngspice: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true } } }).validateDraft(context);
    if (code) expect(result.errors).toContainEqual(expect.objectContaining({ code }));
    else expect(result.errors).toEqual([]);
  });

});


describe("Expansion sigma JSON CLI contract", () => {
  async function validateSigma(value: unknown) {
    const context = await fixtureContext("vgs,vds,id\n0,1,0\n");
    const model = ".model nchmod nmos level=14 version=4.2.1 vth0=.44 u0=.0419 toxe=3n\n";
    const sigma = JSON.stringify(value);
    const inputRoot = path.join(context.storageRoot, "jobs/job-1/input");
    await writeFile(path.join(inputRoot, "model.lib"), model);
    await writeFile(path.join(inputRoot, "sigma.json"), sigma);
    context.files = [inputFile("model.lib", "primary-model", Buffer.byteLength(model)), inputFile("sigma.json", "sigma-json", Buffer.byteLength(sigma))];
    context.job.parameters = { mode: "run", operations: { expansion: true, benchmark: false }, translator: {}, fitting: {}, reduction: {}, expansion: { nSigma: 3, runIv: false, runCv: false }, benchmark: {} };
    context.job.toolConfigurations.push(toolConfiguration("expansion", { interpreter: "/usr/bin/python3", entryPoint: "/opt/expansion/main.py" }));
    const adapter = new BenchmarkModuleAdapter({ health: {
      translator: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      expansion: { status: "healthy", version: "1", reason: null, adapterSelfTestPassed: true },
      ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
    } });
    return adapter.validateDraft(context);
  }

  it.each([
    { VTH0: [0.05, 1], U0: [0.1, -1], TOXE: { sigma: 0.03, slow_dir: 1 } },
    { vth0: {}, U0: { sigma: 0.2 }, TOXE: { slow_dir: -1 } },
    { VTH0: ["5e-2", "1"], U0: { sigma: "1_0e-2", slow_dir: "-1" } },
    { VTH0: [true, true], U0: [false, -1] },
    { VTH0: ["٠.٠٥", "١"] },
    { vth0: [-1, 0], VTH0: [0.05, 1] },
    {},
  ])("accepts native sigma configuration %j", async (value) => {
    const result = await validateSigma(value);
    expect(result.errors).toEqual([]);
  });

  it.each([
    { VTH0: 0.05 }, { VTH0: [0.05] }, { VTH0: [0.05, 1, 2] },
    { VTH0: { sigma: 0.05, direction: 1 } }, { VTH0: [-0.05, 1] },
    { VTH0: [0.05, 0] }, { VTH0: [0.05, 2] },
    { VTH0: ["nan", 1] }, { VTH0: ["Infinity", 1] }, { VTH0: [0.05, "inf"] },
    { VTH0: [null, 1] }, { VTH0: { sigma: null } },
    { VTH0: ["", 1] }, { VTH0: ["0x10", 1] }, { VTH0: [[0.05], 1] },
    ...["level", "VERSION", "TYPE", "BINUNIT", "LMIN", "LMAX", "WMIN", "WMAX"].map((key) => ({ [key]: [0, 1] })),
    [], null, 1,
  ])("rejects configuration rejected by the CLI %j", async (value) => {
    const result = await validateSigma(value);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "benchmark.sigma_json" }));
  });
});
