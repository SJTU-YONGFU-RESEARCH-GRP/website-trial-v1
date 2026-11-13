import { describe, expect, it, vi } from "vitest";
import { createBenchmarkCapabilities } from "../../../server/modules/benchmark/capabilities.ts";
import { expansionAdapter } from "../../../server/modules/benchmark/adapters/expansion.ts";
import { reductionAdapter } from "../../../server/modules/benchmark/adapters/reduction.ts";
import { fittingAdapter } from "../../../server/modules/benchmark/adapters/fitting.ts";
import { translatorAdapter } from "../../../server/modules/benchmark/adapters/translator.ts";
import { toolConfiguration } from "./helpers.ts";
import { inputFile, jobRecord } from "./helpers.ts";
import { validateBenchmarkDraft } from "../../../server/modules/benchmark/validation.ts";
import { buildBenchmarkPlan } from "../../../server/modules/benchmark/planner.ts";

vi.mock("../../../server/modules/benchmark/modelInput.ts", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../server/modules/benchmark/modelInput.ts")>(),
  inspectInputModel: vi.fn(async () => ({ dialect: "ngspice", dialectConfidence: "strong", includeReferences: [], dependencies: [], warnings: [], text: ".model dut nmos level=54", models: [{ name: "dut", polarity: "nmos", modelType: "nmos" }] })),
}));

describe("Benchmark audited adapters", () => {
  it("reports tools as not configured instead of returning mock success", () => {
    const capabilities = createBenchmarkCapabilities({});
    expect(capabilities).toHaveLength(5);
    expect(capabilities.every((capability) => capability.health === "not_configured" || capability.health === "unavailable")).toBe(true);
    expect(capabilities.find((capability) => capability.toolId === "spice-benchmark")?.healthReason).toMatch(/simulator/i);
  });

  it("lists every supported simulator while defaulting to healthy adapters", () => {
    const configurations = [
      toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" }),
      toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
      toolConfiguration("spectre", { executable: "/opt/spectre/bin/spectre" }),
    ];
    const capabilities = createBenchmarkCapabilities({
      configurations,
      health: {
        "spice-benchmark": { status: "healthy", version: "1.0.0", reason: null },
        ngspice: { status: "healthy", version: "46", reason: null, adapterSelfTestPassed: true },
        spectre: { status: "healthy", version: "24.1", reason: null, adapterSelfTestPassed: false },
      },
    });
    const parameter = capabilities.find((capability) => capability.toolId === "spice-benchmark")?.parameters.find((entry) => entry.id === "simulators");
    expect(parameter?.enumValues).toEqual(["ngspice", "spectre", "hspice"]);
    expect(parameter?.defaultValue).toEqual(["ngspice"]);
  });

  it("uses repository commits as the displayed versions for all five tools", () => {
    const toolIds = ["translator", "fitting", "reduction", "expansion", "spice-benchmark"] as const;
    const configurations = toolIds.map((toolId) => toolConfiguration(toolId, { interpreter: "/usr/bin/python3" }));
    const health = Object.fromEntries(toolIds.map((toolId) => [toolId, {
      status: "healthy" as const,
      version: `usage: ${toolId}`,
      reason: null,
      adapterSelfTestPassed: true,
    }]));
    const repositoryVersions = Object.fromEntries(toolIds.map((toolId, index) => [toolId, String(index + 1).repeat(40)]));

    const capabilities = createBenchmarkCapabilities({ configurations, health, repositoryVersions });

    for (const [index, toolId] of toolIds.entries()) {
      expect(capabilities.find((capability) => capability.toolId === toolId)?.toolVersion).toBe(String(index + 1).repeat(40));
    }
  });

  it("adds a default-on Benchmark export control to every processing tool", () => {
    const capabilities = createBenchmarkCapabilities({});
    for (const toolId of ["translator", "fitting", "reduction", "expansion"]) {
      const parameters = capabilities.find((capability) => capability.toolId === toolId)?.parameters ?? [];
      expect(parameters.at(-1)).toEqual(expect.objectContaining({
        id: "exportToBenchmark",
        type: "boolean",
        defaultValue: true,
        mapping: { kind: "generated-config", key: "exportToBenchmark" },
      }));
    }
  });

  it("builds Translator argv without shell text or unsupported preserve-comments", () => {
    const commands = translatorAdapter.buildCommands({
      parameters: {
        mode: "run", operations: { translator: true },
        translator: { sourceDialect: "spectre", targetDialect: "ngspice", followIncludes: true, verify: true, plot: true, maxPlots: 8, outputName: "translated.lib" },
        fitting: {}, reduction: {}, expansion: {}, benchmark: {},
      },
      inputByRole: new Map(),
      configuration: toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }),
      stepId: "translator",
      inputModel: "input/models/main.scs",
      outputDirectory: "output/translator",
    });
    expect(commands[0].executable).toBe("/usr/bin/python3");
    expect(commands[0].argv).toContain("--follow-includes");
    expect(commands[0].argv).toContain("--max-plots");
    expect(commands[0].argv).not.toContain("--preserve-comments");
    expect(commands[0].argv.some((argument) => /[;&|`] /.test(argument))).toBe(false);
  });

  it("builds Expansion as separate audited Python subcommands", () => {
    const commands = expansionAdapter.buildCommands({
      parameters: {
        mode: "run", operations: { expansion: true }, translator: {}, fitting: {}, reduction: {},
        expansion: { runIv: true, runCv: true, runMonteCarlo: true, distribution: "uniform", samples: 25, seed: 7, jobs: 2 },
        benchmark: {},
      },
      inputByRole: new Map([["sigma-json", ["sigma.json"]]]),
      configuration: toolConfiguration("expansion", { interpreter: "/usr/bin/python3", entryPoint: "model_expansion" }),
      stepId: "expansion",
      inputModel: "input/model.lib",
      outputDirectory: "output/expansion",
    });
    expect(commands).toHaveLength(4);
    expect(commands.map((command) => command.argv.find((argument) => ["generate-corners", "iv", "cv", "monte-carlo"].includes(argument)))).toEqual([
      "generate-corners", "iv", "cv", "monte-carlo",
    ]);
    expect(commands.flatMap((command) => command.argv)).not.toContain("lognormal");
    expect(commands[1].argv).toContain("--summary-path");
    expect(commands[2].argv).not.toContain("--summary-path");
    expect(commands[1].expectedOutputs).toEqual(["output/expansion/iv_results.json"]);
    expect(commands[2].expectedOutputs).toEqual(["output/expansion/cv_results.json"]);
    expect(commands[3].expectedOutputs).toEqual(["output/expansion/monte_carlo_results.json"]);
  });

  it("binds Fitting to configured ngspice and the audited DC-only CLI", () => {
    const commands = fittingAdapter.buildCommands({
      parameters: {
        mode: "run", operations: { fitting: true }, translator: {}, reduction: {}, expansion: {}, benchmark: {},
        fitting: { optimizer: "nelder_mead_normalized", maxIterations: 25, stepTolerance: 1e-5, targetRelativeLoss: 0.2, jobs: 1 },
      },
      inputByRole: new Map([["measured-csv", ["measured.csv"]]]),
      configuration: toolConfiguration("fitting", { interpreter: "/usr/bin/python3", entryPoint: "/opt/fitting/calibrate_bsim.py" }),
      dependencies: new Map([["ngspice", toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" })]]),
      stepId: "fitting",
      inputModel: "",
      outputDirectory: "output/fitting",
    });
    expect(commands[0].argv).toContain("dc");
    expect(commands[0].argv).toContain("--step-tol");
    expect(commands[0].argv).not.toContain("--step-tolerance");
    expect(commands[0].argv).toContain("/usr/bin/ngspice");
  });

  it("defaults fitting to bounded residual-vector optimization and robust measured-current loss", () => {
    const context = {
      parameters: { mode: "run" as const, operations: { fitting: true }, operationOrder: ["fitting" as const], translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: {} },
      inputByRole: new Map([["measured-csv", ["measured.csv"]]]),
      configuration: toolConfiguration("fitting", { interpreter: "/usr/bin/python3", entryPoint: "/opt/fitting/calibrate_bsim.py" }),
      dependencies: new Map([["ngspice", toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" })]]),
      stepId: "fitting", inputModel: "input/pmos.lib", outputDirectory: "output/fitting",
    };
    const command = fittingAdapter.buildCommands(context)[0];
    expect(command.argv).toEqual(expect.arrayContaining(["least_squares_trust_region", "Loss.robust_iv_loss.robust_iv_percent", "--device-type", "auto", "--max-evaluations", "150", "--max-seconds", "120"]));
    expect(command.argv).not.toContain("nmos_bsim45");
    const legacy = fittingAdapter.buildCommands({ ...context, parameters: { ...context.parameters, fitting: { optimizer: "nelder_mead", lossFunction: "Loss.mape_loss.mape_percent" } } })[0];
    expect(legacy.argv).toEqual(expect.arrayContaining(["nelder_mead", "Loss.mape_loss.mape_percent"]));
  });

  it("uses actual runtime polarity and explicit card selectors in reduction", () => {
    const command = reductionAdapter.buildCommands({
      parameters: { mode: "run", operations: { reduction: true }, operationOrder: ["reduction"], translator: {}, fitting: {}, reduction: { modelName: "only_p" }, expansion: {}, benchmark: {} },
      inputByRole: new Map(), configuration: toolConfiguration("reduction", { interpreter: "/usr/bin/python3", entryPoint: "bmr.cli" }),
      stepId: "reduction", inputModel: "input/pmos.lib", outputDirectory: "output/reduction",
    })[0];
    expect(command.argv).toContain("auto");
    expect(command.argv).not.toContain("nmos");
    expect(command.argv.slice(-2)).toEqual(["--model-name", "only_p"]);
  });

  it("preserves the user-arranged processing order in the executable plan", async () => {
    const model = inputFile("model.lib", "primary-model");
    const configurations = [
      toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }),
      toolConfiguration("reduction", { interpreter: "/usr/bin/python3", entryPoint: "bmr.cli" }),
      toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" }),
      toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
    ];
    const record = jobRecord({
      parameters: {
        mode: "run",
        operations: { translator: true, reduction: true, benchmark: true },
        operationOrder: ["reduction", "translator"],
        translator: { outputName: "translated.lib" }, fitting: {}, reduction: {}, expansion: {},
        benchmark: { simulators: ["ngspice"], modes: ["dc"] },
      },
      toolConfigurations: configurations,
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [model], totalBytes: model.sizeBytes, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
    });
    const plan = await buildBenchmarkPlan({ moduleId: "benchmark", storageRoot: "/storage", now: () => "2026-08-14T00:00:00.000Z", job: record, files: [model], technology: null });
    expect(plan.steps.map((step) => step.id)).toEqual(["validate-input", "inspect-model.reduction", "reduction", "inspect-model.translator", "translator", "normalize-benchmark.1", "inspect-model.benchmark.1", "benchmark.1", "normalize-benchmark.2", "inspect-model.benchmark.2", "benchmark.2", "parse-result", "publish-result"]);
    expect(plan.steps.find((step) => step.id === "translator")?.process?.argv.join(" ")).toContain("output/reduction/reduced_model.lib");
    expect(plan.steps.find((step) => step.id === "normalize-benchmark.1")?.process?.argv.join(" ")).toContain("output/reduction/reduced_model.lib");
    expect(plan.steps.find((step) => step.id === "normalize-benchmark.2")?.process?.argv.join(" ")).toContain("output/translator/translated.lib");
  });

  it("builds a connected executable plan for every processing-tool subset and permutation", async () => {
    const tools = ["translator", "fitting", "reduction", "expansion"] as const;
    const permutations = <T,>(values: readonly T[]): T[][] => values.length === 0
      ? [[]]
      : values.flatMap((value, index) => permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((tail) => [value, ...tail]));
    const orders = [
      [] as string[],
      ...tools.flatMap((_, maskIndex) => {
        const mask = maskIndex + 1;
        const subset = tools.filter((__, index) => Boolean(mask & (1 << index)));
        return permutations(subset);
      }),
    ];
    // The flatMap above covers masks 1..4 only; enumerate the remaining masks explicitly.
    for (let mask = 5; mask < (1 << tools.length); mask += 1) {
      const subset = tools.filter((_, index) => Boolean(mask & (1 << index)));
      orders.push(...permutations(subset));
    }
    expect(orders).toHaveLength(65);

    const model = inputFile("model.lib", "primary-model");
    const dataset = inputFile("measured.csv", "measured-csv");
    const configurations = [
      toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }),
      toolConfiguration("fitting", { interpreter: "/usr/bin/python3", entryPoint: "/opt/fitting/calibrate_bsim.py" }),
      toolConfiguration("reduction", { interpreter: "/usr/bin/python3", entryPoint: "bmr.cli" }),
      toolConfiguration("expansion", { interpreter: "/usr/bin/python3", entryPoint: "model_expansion" }),
      toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" }),
      toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
    ];

    for (const targetDialect of ["ngspice", "spectre", "hspice"]) for (const order of orders) {
      const enabled = Object.fromEntries(order.map((tool) => [tool, true]));
      const record = jobRecord({
        parameters: {
          mode: "run", operations: { ...enabled, benchmark: true }, operationOrder: order,
          translator: { sourceDialect: "ngspice", targetDialect, outputName: "translated.lib", exportToBenchmark: true },
          fitting: { outputName: "fitted.lib", exportToBenchmark: true },
          reduction: { exportToBenchmark: true }, expansion: { exportToBenchmark: true },
          benchmark: { simulators: ["ngspice", "spectre", "hspice"], modes: ["dc"] },
        },
        toolConfigurations: configurations,
        inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [model, dataset], totalBytes: model.sizeBytes + dataset.sizeBytes, fileCount: 2, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
      });
      const plan = await buildBenchmarkPlan({ moduleId: "benchmark", storageRoot: "/storage", now: () => "2026-08-14T00:00:00.000Z", job: record, files: [model, dataset], technology: null });
      const processingSteps = plan.steps.filter((step) => !["validate-input", "parse-result", "publish-result"].includes(step.id) && !step.id.startsWith("benchmark.") && !step.id.startsWith("inspect-model.") && !step.id.startsWith("normalize-"));
      const firstOccurrence = processingSteps.map((step) => step.id.split(".")[0]).filter((tool, index, values) => values.indexOf(tool) === index);
      expect(firstOccurrence, `processing order ${order.join(" -> ") || "direct"}`).toEqual(order);
      expect(plan.steps.filter((step) => step.id.startsWith("benchmark.")).length, `Benchmark fan-out ${order.join(" -> ") || "direct"}`).toBeGreaterThan(0);
      const benchmarkSteps = plan.steps.filter((step) => step.id.startsWith("benchmark."));
      expect(benchmarkSteps.length % 3).toBe(0);
      for (const [index, step] of benchmarkSteps.entries()) {
        const simulator = ["ngspice", "spectre", "hspice"][index % 3];
        const argv = step.process!.argv;
        expect(plan.steps.find((candidate) => candidate.id === `inspect-model.${step.id}`)?.process?.argv).toContain("--require-benchmark-models");
        expect(argv.slice(argv.indexOf("--simulator") + 1, argv.indexOf("--modes"))).toEqual([simulator]);
        expect(argv.slice(argv.indexOf("--modes") + 1, argv.indexOf("--output-dir"))).toEqual(["dc"]);
        const normalization = plan.steps.find((candidate) => candidate.id === `normalize-${step.id}`)!;
        const targetArgv = normalization.process!.argv;
        expect(targetArgv[targetArgv.indexOf("--target") + 1]).toBe(simulator === "hspice" ? "hspice" : simulator === "spectre" ? "spectre-spice" : "ngspice");
        expect(step.process!.argv.join(" ")).toContain(`output/canonical-${step.id}/normalized.lib`);
      }
      const selectedTranslator = plan.steps.find((step) => step.id === "translator" || /^translator\.\d+$/.test(step.id));
      if (selectedTranslator) {
        expect(selectedTranslator.process?.argv).toContain(targetDialect);
        if (targetDialect !== "ngspice") expect(plan.steps.some((step) => step.id.startsWith("normalize-"))).toBe(true);
      }
      expect(plan.steps.every((step) => step.process === null || step.process.argv.every((argument) => typeof argument === "string")), `argv ${order.join(" -> ") || "direct"}`).toBe(true);
    }
  });

  it("extracts an explicit source section before the selected workflow", async () => {
    const model = inputFile("sections.lib", "primary-model");
    const record = jobRecord({
      parameters: { mode: "run", sourceSection: "TT", operations: { translator: true, benchmark: true }, operationOrder: ["translator"], translator: { targetDialect: "spectre" }, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["dc"] } },
      toolConfigurations: [toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }), toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" })],
    });
    const plan = await buildBenchmarkPlan({ moduleId: "benchmark", storageRoot: "/storage", now: () => "", job: record, files: [model], technology: null });
    const sourceNormalization = plan.steps.find((step) => step.id === "normalize-translator");
    expect(sourceNormalization?.process?.argv).toEqual(expect.arrayContaining(["--section", "TT", "--source", "ngspice", "--target", "ngspice"]));
    expect(plan.steps.findIndex((step) => step.id === "normalize-translator")).toBeLessThan(plan.steps.findIndex((step) => step.id === "translator"));
    expect(plan.steps.find((step) => step.id === "translator")?.process?.argv.join(" ")).toContain("output/canonical-translator/normalized.lib");
  });

  it("omits a processing output from Benchmark when its export control is off", async () => {
    const model = inputFile("model.lib", "primary-model");
    const record = jobRecord({
      parameters: {
        mode: "run",
        operations: { translator: true, reduction: true, benchmark: true },
        operationOrder: ["translator", "reduction"],
        translator: { outputName: "translated.lib", exportToBenchmark: false },
        fitting: {}, reduction: { exportToBenchmark: true }, expansion: {},
        benchmark: { simulators: ["ngspice"], modes: ["dc"] },
      },
      toolConfigurations: [
        toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: "/opt/translator/cli.py" }),
        toolConfiguration("reduction", { interpreter: "/usr/bin/python3", entryPoint: "bmr.cli" }),
        toolConfiguration("spice-benchmark", { interpreter: "/usr/bin/python3", entryPoint: "spice_model_benchmark.cli" }),
        toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }),
      ],
      inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [model], totalBytes: model.sizeBytes, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" },
    });
    const plan = await buildBenchmarkPlan({ moduleId: "benchmark", storageRoot: "/storage", now: () => "2026-08-14T00:00:00.000Z", job: record, files: [model], technology: null });
    expect(plan.steps.filter((step) => step.id.startsWith("benchmark."))).toHaveLength(1);
    expect(plan.steps.find((step) => step.id === "normalize-benchmark.1")?.process?.argv.join(" ")).toContain("output/reduction/reduced_model.lib");
  });

  it("fails closed when an active SPICE model is too large for complete safety inspection", async () => {
    const model = inputFile("model.lib", "primary-model", 16 * 1024 * 1024 + 1);
    const record = jobRecord({ inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [model], totalBytes: model.sizeBytes, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" } });
    const validation = await validateBenchmarkDraft({ moduleId: "benchmark", storageRoot: "/unread", now: () => "2026-08-14T00:00:00.000Z", job: record, files: [model], technology: null }, {});
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "benchmark.model_too_large_to_validate" }));
  });
});
