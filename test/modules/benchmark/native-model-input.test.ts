import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectModelPath } from "../../../server/modules/benchmark/modelInput.ts";
import { inputFile, jobRecord, toolConfiguration } from "./helpers.ts";
import { buildBenchmarkPlan } from "../../../server/modules/benchmark/planner.ts";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const python = process.env.BENCHMARK_AST_PYTHON;
const entryPoint = process.env.BENCHMARK_AST_ENTRYPOINT;

describe.runIf(Boolean(python && entryPoint))("Benchmark native configured AST inspector", () => {
  it("recognizes real names and polarity across all three input dialects and include closures", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "benchmark-native-ast-"));
    directories.push(root);
    const configuration = toolConfiguration("translator", { interpreter: python, entryPoint });
    const samples = [
      ["ngspice", "native.lib", ".model named_n nmos level=54 version=4.8 vth0=0.7\n.model named_p pmos level=54 version=4.8 vth0=-0.7\n"],
      ["hspice", "native.sp", ".option post\n.model named_n nmos level=54 version=4.8 vth0=0.7\n.model named_p pmos level=54 version=4.8 vth0=-0.7\n"],
      ["spectre", "native.scs", "simulator lang=spectre\nmodel named_n bsim4 { type=n version=4.8 vth0=0.7 }\nmodel named_p bsim4 { type=p version=4.8 vth0=-0.7 }\n"],
    ] as const;
    for (const [dialect, name, source] of samples) {
      const filename = path.join(root, name);
      await writeFile(filename, source);
      const result = await inspectModelPath(configuration, filename, root);
      expect(result.dialect).toBe(dialect);
      expect(result.models.map((model) => [model.name, model.polarity])).toEqual([["named_n", "nmos"], ["named_p", "pmos"]]);
    }
    await mkdir(path.join(root, "models"));
    await writeFile(path.join(root, "models/p.lib"), ".model included_p pmos level=54\n");
    const included = path.join(root, "includes.lib");
    await writeFile(included, '.include "models/p.lib"\n');
    const result = await inspectModelPath(configuration, included, root);
    expect(result.models.map((model) => model.name)).toEqual(["included_p"]);
    expect(result.dependencies).toContain(path.join(root, "models/p.lib"));
  });
  it("requires explicit selection for ambiguous root sections and respects selected include sections", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "benchmark-native-section-"));
    directories.push(root);
    const configuration = toolConfiguration("translator", { interpreter: python, entryPoint });
    const library = path.join(root, "sections.lib");
    await writeFile(library, [".param shared=1", ".lib TT", ".model shared_n nmos level=54 vth0=0.7", ".model shared_p pmos level=54 vth0=-0.7", ".endl TT", ".lib FF", ".model shared_n nmos level=54 vth0=0.6", ".model shared_p pmos level=54 vth0=-0.6", ".endl FF", ""].join("\n"));
    await expect(inspectModelPath(configuration, library, root)).rejects.toThrow(/section|duplicate|ambiguous/i);
    const selected = await inspectModelPath(configuration, library, root, {}, "TT");
    expect(selected.models.map((model) => [model.name, model.section])).toEqual([["shared_n", "TT"], ["shared_p", "TT"]]);
    const wrapper = path.join(root, "wrapper.lib");
    await writeFile(wrapper, '.lib "sections.lib" TT\n');
    const included = await inspectModelPath(configuration, wrapper, root);
    expect(included.models.map((model) => model.name)).toEqual(["shared_n", "shared_p"]);
  });

  it.each([
    { family: "BSIM4", ngLevel: 14, hsLevel: 54, spectreLevel: 14, ngVersion: "4.2.1", nativeVersion: "4.21", nativeFamily: "bsim4" },
    { family: "BSIM3", ngLevel: 8, hsLevel: 53, spectreLevel: 11, ngVersion: "3.3.0", nativeVersion: "3.3", nativeFamily: "bsim3v3" },
  ])("emits simulator-compatible $family cards from every ingress dialect without changing exports", async ({ ngLevel, hsLevel, spectreLevel, ngVersion, nativeVersion, nativeFamily }) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "benchmark-native-simulator-model-"));
    directories.push(root);
    const translator = toolConfiguration("translator", { interpreter: python, entryPoint });
    const samples = [
      `.model named_n nmos level=${ngLevel} version=${ngVersion} vth0=0.7\n.model named_p pmos level=${ngLevel} version=${ngVersion} vth0=-0.7\n`,
      `.option post\n.model named_n nmos level=${hsLevel} version=${nativeVersion} vth0=0.7\n.model named_p pmos level=${hsLevel} version=${nativeVersion} vth0=-0.7\n`,
      `simulator lang=spectre\nmodel named_n ${nativeFamily} { type=n version=${nativeVersion} vth0=0.7 }\nmodel named_p ${nativeFamily} { type=p version=${nativeVersion} vth0=-0.7 }\n`,
    ];
    for (const [sampleIndex, source] of samples.entries()) {
      const workspaceRelativePath = `jobs/native-${sampleIndex}`;
      const workspace = path.join(root, workspaceRelativePath);
      await mkdir(path.join(workspace, "input"), { recursive: true });
      await writeFile(path.join(workspace, "input/model.lib"), source);
      const file = inputFile("model.lib", "primary-model", Buffer.byteLength(source));
      const job = jobRecord({ workspaceRelativePath, parameters: { mode: "run", operations: { benchmark: true }, operationOrder: [], translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice", "spectre", "hspice"], modes: ["dc", "transient", "ac", "noise"] } }, toolConfigurations: [translator, toolConfiguration("spice-benchmark", { interpreter: python, entryPoint: "spice_model_benchmark.cli" })] });
      const plan = await buildBenchmarkPlan({ moduleId: "benchmark", storageRoot: root, now: () => "", job, files: [file], technology: null });
      const benchmarks = plan.steps.filter((step) => step.id.startsWith("benchmark."));
      expect(benchmarks.map((step) => step.id)).toEqual(["benchmark.1", "benchmark.2", "benchmark.3"]);
      for (const step of plan.steps.filter((candidate) => candidate.id.startsWith("normalize-") || candidate.id.startsWith("inspect-model."))) {
        const process = step.process!;
        const cwd = path.join(workspace, process.cwdRelative);
        await mkdir(cwd, { recursive: true });
        for (const output of process.expectedOutputs) await mkdir(path.dirname(path.join(workspace, output)), { recursive: true });
        await promisify(execFile)(process.executableDisplay, [entryPoint!, ...process.argv], { cwd, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
      }
      for (const [index, benchmark] of benchmarks.entries()) {
        const normalized = await readFile(path.join(workspace, `output/canonical-${benchmark.id}/normalized.lib`), "utf8");
        expect(normalized).toMatch(/^\* BENCHMARK_PRIMARY_MODEL: named_n\n/);
        expect(normalized).toMatch(/\.model\s+named_n\s+nmos/i);
        expect(normalized).toMatch(/\.model\s+named_p\s+pmos/i);
        const inspection = await inspectModelPath(translator, path.join(workspace, `output/canonical-${benchmark.id}/normalized.lib`), workspace);
        expect(inspection.dialect).toBe(["ngspice", "spectre-spice", "hspice"][index]);
        expect(inspection.models.map((model) => Number(model.level))).toEqual([[ngLevel, spectreLevel, hsLevel][index], [ngLevel, spectreLevel, hsLevel][index]]);
        expect(inspection.models.map((model) => String(model.version))).toEqual([index === 0 ? ngVersion : nativeVersion, index === 0 ? ngVersion : nativeVersion]);
        const thresholds = [...normalized.matchAll(/vth0\s*=\s*([-+0-9.eE]+)/gi)].map((match) => Number(match[1]));
        expect(thresholds[0]).toBeCloseTo(0.7, 14);
        expect(thresholds[1]).toBeCloseTo(-0.7, 14);
      }
      expect(await readFile(path.join(workspace, "input/model.lib"), "utf8")).toBe(source);
    }
  }, 30_000);

  it("preserves ambiguous level-1 source defaults and consumes the actual fitted branch dialect", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "benchmark-native-source-format-"));
    directories.push(root);
    const translator = toolConfiguration("translator", { interpreter: python, entryPoint });
    const source = ".model named_n nmos level=1 vto=0.7 kp=100u\n";
    const execute = async (workspace: string, step: Awaited<ReturnType<typeof buildBenchmarkPlan>>["steps"][number]) => {
      const process = step.process!;
      const cwd = path.join(workspace, process.cwdRelative);
      await mkdir(cwd, { recursive: true });
      for (const output of process.expectedOutputs) await mkdir(path.dirname(path.join(workspace, output)), { recursive: true });
      await promisify(execFile)(process.executableDisplay, [entryPoint!, ...process.argv], { cwd, timeout: 30_000 });
    };
    for (const sourceDialect of ["hspice", "ngspice"] as const) {
      const workspaceRelativePath = `jobs/${sourceDialect}`;
      const workspace = path.join(root, workspaceRelativePath);
      await mkdir(path.join(workspace, "input"), { recursive: true });
      await writeFile(path.join(workspace, "input/model.lib"), source);
      const job = jobRecord({ workspaceRelativePath, parameters: { mode: "run", sourceDialect, operations: { benchmark: true }, translator: {}, fitting: {}, reduction: {}, expansion: {}, benchmark: { simulators: ["ngspice"], modes: ["dc"] } }, toolConfigurations: [translator, toolConfiguration("spice-benchmark", { interpreter: python, entryPoint: "spice_model_benchmark.cli" })] });
      const context = { moduleId: "benchmark" as const, storageRoot: root, now: () => "", job, files: [inputFile("model.lib", "primary-model", source.length)], technology: null };
      const plan = await buildBenchmarkPlan(context);
      const normalization = plan.steps.find((step) => step.id === "normalize-benchmark.1")!;
      expect(normalization.process!.argv).toEqual(expect.arrayContaining(["--source", sourceDialect, "--benchmark-primary-nmos"]));
      await execute(workspace, normalization);
      const normalized = await readFile(path.join(workspace, "output/canonical-benchmark.1/normalized.lib"), "utf8");
      if (sourceDialect === "hspice") expect(normalized).toMatch(/tnom\s*=\s*25(?:\s|$)/);
      else {
        // Same-dialect exports retain an implicit ngspice 27°C default; cross-dialect rendering makes it explicit.
        const probe = path.join(workspace, "output/ng-default-probe.lib");
        await promisify(execFile)(python!, [entryPoint!, "translate", path.join(workspace, "output/canonical-benchmark.1/normalized.lib"), "--source", "ngspice", "--target", "hspice", "--output", probe], { timeout: 30_000 });
        expect(await readFile(probe, "utf8")).toMatch(/tref\s*=\s*27(?:\s|$)/);
      }
      await execute(workspace, plan.steps.find((step) => step.id === "inspect-model.benchmark.1")!);
      if (sourceDialect === "hspice") {
        job.parameters = { ...job.parameters, operations: { fitting: true, translator: true, benchmark: false }, operationOrder: ["fitting", "translator"], translator: { sourceDialect: "hspice", targetDialect: "hspice" } };
        job.toolConfigurations.push(toolConfiguration("fitting", { interpreter: python, entryPoint: "/opt/fitting/main.py" }), toolConfiguration("ngspice", { executable: "/usr/bin/ngspice" }));
        const chain = await buildBenchmarkPlan({ ...context, job, files: [...context.files, inputFile("measured.csv", "measured-csv")] });
        const initial = chain.steps.find((step) => step.id === "normalize-fitting")!;
        expect(initial.process!.argv).toEqual(expect.arrayContaining(["--source", "hspice"]));
        expect(initial.process!.argv).not.toContain("--benchmark-primary-nmos");
        await execute(workspace, initial);
        // The fitting contract exports ngspice; use a native fitted-card fixture to exercise the next real Translator command.
        await mkdir(path.join(workspace, "output/fitting"), { recursive: true });
        await writeFile(path.join(workspace, "output/fitting/fitted.lib"), source);
        const translation = chain.steps.find((step) => step.id === "translator")!;
        expect(translation.process!.argv).toEqual(expect.arrayContaining(["--source", "ngspice"]));
        await execute(workspace, translation);
        const translated = await readFile(path.join(workspace, "output/translator/translated.lib"), "utf8");
        expect(translated).toMatch(/tref\s*=\s*27(?:\s|$)/);
        expect(translated).not.toContain("BENCHMARK_PRIMARY_MODEL");
      }
    }
  }, 30_000);

  it("rejects ambiguous DC models, unresolved bins and scoped cards in the authoritative fixture guard", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "benchmark-native-selection-"));
    directories.push(root);
    const samples = [
      ".model n1 nmos level=1\n.model n2 nmos level=1\n",
      ".model p_only pmos level=1\n",
      "simulator lang=spectre\nmodel n bsim4 {1: type=n version=4.81 lmin=0 lmax=1u wmin=0 wmax=2u}\n",
      ".subckt wrap d g s b\n.model n nmos level=1\n.ends wrap\n",
    ];
    for (const [index, source] of samples.entries()) {
      const filename = path.join(root, `bad-${index}.lib`);
      await writeFile(filename, source);
      await expect(promisify(execFile)(python!, [entryPoint!, "inspect", filename, "--dialect", "auto", "--root", root, "--follow-includes", "--require-mos", "--require-benchmark-models"], { timeout: 30_000 })).rejects.toMatchObject({ code: 2 });
    }
    const valid = path.join(root, "cmos.lib");
    await writeFile(valid, ".model n nmos level=1\n.model p pmos level=1\n");
    const { stdout } = await promisify(execFile)(python!, [entryPoint!, "inspect", valid, "--dialect", "auto", "--root", root, "--follow-includes", "--require-mos", "--require-cmos", "--require-benchmark-models"]);
    expect(JSON.parse(stdout).models.map((model: { name: string }) => model.name)).toEqual(["n", "p"]);
  });

});
