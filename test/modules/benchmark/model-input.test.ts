import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectInputModel, inspectModelPath, sourceDialectForInput } from "../../../server/modules/benchmark/modelInput.ts";
import { inputFile, jobRecord, toolConfiguration } from "./helpers.ts";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

async function fixture(payload: object) {
  const root = await mkdtemp(path.join(os.tmpdir(), "benchmark-ast-client-"));
  directories.push(root);
  const input = path.join(root, "jobs/job-1/input");
  await mkdir(input, { recursive: true });
  const model = path.join(input, "source.lib");
  await writeFile(model, ".model real_p pmos level=54\n");
  const script = path.join(root, "configured-inspector.py");
  await writeFile(script, [
    "import json, os, sys",
    "assert sys.argv[1] == 'inspect'",
    "assert '--follow-includes' in sys.argv and '--require-mos' in sys.argv",
    `print(json.dumps(${JSON.stringify(payload)}))`,
  ].join("\n").replaceAll("null", "None"));
  const configuration = toolConfiguration("translator", { interpreter: "/usr/bin/python3", entryPoint: script });
  return { root, input, model, script, configuration };
}

describe("Benchmark configured AST client", () => {
  it("resolves explicit source formats and legacy first Translator settings without leaking them into later tools", () => {
    const parameters = { operations: { translator: true, fitting: true }, operationOrder: ["translator", "fitting"], translator: { sourceDialect: "hspice" } };
    expect(sourceDialectForInput(parameters)).toBe("hspice");
    expect(sourceDialectForInput({ ...parameters, sourceDialect: "auto" })).toBe("hspice");
    expect(sourceDialectForInput({ ...parameters, sourceDialect: "hspice" })).toBe("hspice");
    expect(() => sourceDialectForInput({ ...parameters, sourceDialect: "ngspice" })).toThrow(/choose matching formats/);
    expect(() => sourceDialectForInput({ ...parameters, sourceDialect: "invalid" })).toThrow(/Source model format/);
    expect(sourceDialectForInput({ ...parameters, operationOrder: ["fitting", "translator"] })).toBe("auto");
    expect(sourceDialectForInput({ ...parameters, operationOrder: ["fitting", "translator"], sourceDialect: "spectre" })).toBe("spectre");
  });

  it("uses administrator configuration and parses authoritative polarity and names", async () => {
    const fixtureData = await fixture({
      dialect: "hspice", models: [{ name: "real_p", polarity: "pmos", modelType: "pmos", level: "54" }],
      dependencies: [], includeReferences: [], warnings: [],
    });
    const files = [inputFile("source.lib", "primary-model", 31)];
    const context = {
      moduleId: "benchmark" as const, storageRoot: fixtureData.root, now: () => "", files, technology: null,
      job: jobRecord({ toolConfigurations: [fixtureData.configuration] }),
    };
    const result = await inspectInputModel(context, "source.lib");
    expect(result.dialect).toBe("hspice");
    expect(result.models).toEqual([expect.objectContaining({ name: "real_p", polarity: "pmos", level: "54" })]);
  });

  it("passes root and legacy first-Translator declarations into the configured AST subprocess", async () => {
    const data = await fixture({ dialect: "hspice", models: [{ name: "real_p", polarity: "pmos", modelType: "pmos" }], dependencies: [], includeReferences: [], warnings: [] });
    await writeFile(data.script, `import json, sys\nassert sys.argv[sys.argv.index('--dialect') + 1] == 'hspice'\nprint(json.dumps({"dialect":"hspice","models":[{"name":"real_p","polarity":"pmos","modelType":"pmos"}],"dependencies":[],"includeReferences":[],"warnings":[]}))\n`);
    for (const parameters of [
      { sourceDialect: "hspice", operations: { benchmark: true }, translator: {} },
      { operations: { translator: true }, operationOrder: ["translator"], translator: { sourceDialect: "hspice" } },
    ]) {
      const result = await inspectInputModel({ moduleId: "benchmark", storageRoot: data.root, now: () => "", files: [inputFile("source.lib", "primary-model", 31)], technology: null, job: jobRecord({ parameters, toolConfigurations: [data.configuration] }) }, "source.lib");
      expect(result.dialect).toBe("hspice");
    }
  });

  it("rejects an inspector response that cannot classify a model as MOS", async () => {
    const fixtureData = await fixture({
      dialect: "ngspice", models: [{ name: "bipolar", polarity: null, modelType: "npn" }],
      dependencies: [], includeReferences: [], warnings: [],
    });
    await expect(inspectModelPath(fixtureData.configuration, fixtureData.model, fixtureData.input)).rejects.toThrow(/complete MOS/);
  });

  it("rejects dependencies outside the uploaded tree even when an inspector reports them", async () => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "benchmark-ast-outside-"));
    directories.push(outside);
    const dependency = path.join(outside, "hidden.lib");
    await writeFile(dependency, ".model secret nmos level=54\n");
    const fixtureData = await fixture({
      dialect: "ngspice", models: [{ name: "real_p", polarity: "pmos", modelType: "pmos" }],
      dependencies: [dependency], includeReferences: [], warnings: [],
    });
    await expect(inspectModelPath(fixtureData.configuration, fixtureData.model, fixtureData.input)).rejects.toThrow(/escapes/);
    const link = path.join(fixtureData.input, "linked.lib");
    await symlink(dependency, link);
    await expect(inspectModelPath(fixtureData.configuration, link, fixtureData.input)).rejects.toThrow(/escapes/);
  });

  it("rejects a resolved but unuploaded include dependency", async () => {
    const fixtureData = await fixture({
      dialect: "ngspice", models: [{ name: "real_p", polarity: "pmos", modelType: "pmos" }],
      dependencies: [], includeReferences: [], warnings: [],
    });
    const hidden = path.join(fixtureData.input, "hidden.lib");
    await writeFile(hidden, ".model hidden nmos level=54\n");
    await writeFile(fixtureData.script, `import json\nprint(json.dumps({"dialect": "ngspice", "models": [{"name":"real_p", "polarity":"pmos", "modelType":"pmos"}], "includeReferences": ["hidden.lib"], "dependencies": [${JSON.stringify(hidden)}], "warnings": []}))\n`);
    const files = [inputFile("source.lib", "primary-model", 31)];
    await expect(inspectInputModel({
      moduleId: "benchmark", storageRoot: fixtureData.root, now: () => "", files, technology: null,
      job: jobRecord({ toolConfigurations: [fixtureData.configuration] }),
    }, "source.lib")).rejects.toThrow(/not uploaded/);
  });
});
