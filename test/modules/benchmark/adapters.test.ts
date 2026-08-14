import { describe, expect, it } from "vitest";
import { createBenchmarkCapabilities } from "../../../server/modules/benchmark/capabilities.ts";
import { expansionAdapter } from "../../../server/modules/benchmark/adapters/expansion.ts";
import { fittingAdapter } from "../../../server/modules/benchmark/adapters/fitting.ts";
import { translatorAdapter } from "../../../server/modules/benchmark/adapters/translator.ts";
import { toolConfiguration } from "./helpers.ts";
import { inputFile, jobRecord } from "./helpers.ts";
import { validateBenchmarkDraft } from "../../../server/modules/benchmark/validation.ts";

describe("Benchmark audited adapters", () => {
  it("reports tools as not configured instead of returning mock success", () => {
    const capabilities = createBenchmarkCapabilities({});
    expect(capabilities).toHaveLength(5);
    expect(capabilities.every((capability) => capability.health === "not_configured" || capability.health === "unavailable")).toBe(true);
    expect(capabilities.find((capability) => capability.toolId === "spice-benchmark")?.healthReason).toMatch(/simulator/i);
  });

  it("advertises only simulators that passed both health and adapter self-test", () => {
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
    expect(parameter?.enumValues).toEqual(["ngspice"]);
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

  it("fails closed when an active SPICE model is too large for complete safety inspection", async () => {
    const model = inputFile("model.lib", "primary-model", 16 * 1024 * 1024 + 1);
    const record = jobRecord({ inputManifest: { schemaVersion: "eda.input-manifest.v1", files: [model], totalBytes: model.sizeBytes, fileCount: 1, rootHint: null, createdAt: "2026-08-14T00:00:00.000Z" } });
    const validation = await validateBenchmarkDraft({ moduleId: "benchmark", storageRoot: "/unread", now: () => "2026-08-14T00:00:00.000Z", job: record, files: [model], technology: null }, {});
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: "benchmark.model_too_large_to_validate" }));
  });
});
