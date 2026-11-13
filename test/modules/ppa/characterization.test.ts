import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { InputFileV1, JsonObject } from "../../../shared/contracts/v1.ts";
import { buildCharacterizationPlan, characterizationInputs, characterizationParameters, executeCharacterizationStep, validateCharacterizationResult } from "../../../server/modules/ppa/characterization.ts";

function parameters(extra: JsonObject = {}): JsonObject { return { flow: "libcharx", designName: "inv_test", topModule: "inv_test", processProfile: "gf180-03v3", corner: "tt", modelSection: "typical", vddVolts: 3.3, vssVolts: 0, temperatureC: 25, electricalMode: "schematic", inputs: ["A"], outputPin: "Y", powerPins: ["VDD"], groundPins: ["VSS"], function: "!A", arcs: [{ input: "A", fixedInputs: {} }], modelEntry: "model/device.sp", slewSeconds: [5e-11, 1e-10], loadFarads: [5e-15, 1e-14], ...extra }; }
function input(relativePath: string, role: string): InputFileV1 { return { relativePath, role, recognizedType: "text", sizeBytes: 10, sha256: "a".repeat(64), mediaType: "text/plain", required: true, usedByStepIds: [], unresolvedIncludes: [], validationErrors: [] }; }
const inputs = () => [input("cell.sp", "cell_netlist"), input("cell.gds", "cell_gds"), input("physical.json", "physical_evidence"), input("model/device.sp", "model_file")];

describe("native PPA cell characterization contract", () => {
  it("preserves absolute common-shift rails while validating effective supply", () => {
    expect(characterizationParameters(parameters({ vddVolts: 4.3, vssVolts: 1 }))).toMatchObject({ vddVolts: 4.3, vssVolts: 1 });
    expect(() => characterizationParameters(parameters({ vddVolts: 3.3, vssVolts: 1 }))).toThrow(/Rails/);
  });
  it.each(["tt", "ff", "ss", "fs", "sf"])("maps actual GF06 %s sections without treating parameterized _t models as TT-only", (corner) => {
    expect(characterizationParameters(parameters({ processProfile: "gf180-06v0", vddVolts: 5, corner, modelSection: corner === "tt" ? "typical" : corner })).corner).toBe(corner);
  });
  it("rejects metadata-only corner labels", () => {
    expect(() => characterizationParameters(parameters({ corner: "ff", modelSection: "typical" }))).toThrow(/section/);
  });
  it("accepts actual SKY model scale and catalog lower supply bound", () => {
    expect(characterizationParameters(parameters({ processProfile: "sky130-hvt", vddVolts: 1.4, modelSection: "tt", spiceScale: "1u" })).spiceScale).toBe("1u");
  });
  it("requires sensitized arcs for both NAND inputs", () => {
    const nand = parameters({ inputs: ["A", "B"], function: "!(A&B)", arcs: [{ input: "A", fixedInputs: { B: 1 } }, { input: "B", fixedInputs: { A: 1 } }] });
    expect(characterizationParameters(nand).function).toBe("!(A&B)");
    expect(() => characterizationParameters({ ...nand, arcs: [{ input: "A", fixedInputs: { B: 0 } }, { input: "B", fixedInputs: { A: 1 } }] })).toThrow(/sensitize/);
  });
  it("requires low fixed inputs for actual NOR sensitization", () => {
    expect(characterizationParameters(parameters({ inputs: ["A", "B"], function: "!(A|B)", arcs: [{ input: "A", fixedInputs: { B: 0 } }, { input: "B", fixedInputs: { A: 0 } }] })).function).toBe("!(A|B)");
  });
  it("rejects overlapping body and signal mapping and malformed sweep axes", () => {
    expect(() => characterizationParameters(parameters({ groundPins: ["A"] }))).toThrow(/disjoint/);
    expect(() => characterizationParameters(parameters({ slewSeconds: [1e-10, 5e-11] }))).toThrow(/increasing/);
  });
  it("requires actual layout and complete frozen model entry rather than client area", () => {
    expect(characterizationInputs(inputs(), parameters()).gds.relativePath).toBe("cell.gds");
    expect(() => characterizationInputs(inputs().filter(f => f.role !== "cell_gds"), parameters())).toThrow(/cell_gds/);
    expect(() => characterizationInputs(inputs(), parameters({ modelEntry: "missing.sp" }))).toThrow(/closure/);
  });
  it("does not accept measured power without its actual waveforms", () => {
    expect(() => characterizationInputs([...inputs(), input("metrics.json", "waveform_metrics")], parameters())).toThrow(/waveform/);
  });
  it("rejects synthetic timing-only summaries without real native counters and Liberty hash", () => {
    const result = { parserId: "ppa-libcharx-native", parserVersion: "1.0.0", data: { schemaVersion: "ppa.result-data.v1", flow: "libcharx", normalized: { areaUm2: 12, delayPs: 100, quality: { spiceBacked: true, ngspiceInvocations: 10, computedTimingValues: 16 } }, evidence: { libertySha256: "b".repeat(64) } } };
    expect(() => validateCharacterizationResult(result)).not.toThrow();
    result.data.normalized.quality.ngspiceInvocations = 0;
    expect(() => validateCharacterizationResult(result)).toThrow(/Incomplete/);
  });
});

it("freezes native code and environment before queueing and rejects queued resource changes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ppa-native-freeze-"));
  try {
    await fs.mkdir(path.join(root,"libcharx")); await fs.mkdir(path.join(root,"input/model"),{recursive:true});
    for (const filename of ["wrapper.py","python","ngspice","gds-python","libcharx/characterizer.py"]) await fs.writeFile(path.join(root,filename), "trusted-resource");
    const files = inputs();
    for (const file of files) { await fs.writeFile(path.join(root,"input",file.relativePath),"data"); file.sizeBytes=4; file.sha256=createHash("sha256").update("data").digest("hex"); }
    const tool = { id:"native",toolId:"libcharx",moduleId:"ppa",revision:1,enabled:true,rootPath:root,executablePath:null,interpreterPath:path.join(root,"python"),entryPoint:"wrapper.py",workingDirectory:null,timeoutSeconds:60,maxConcurrency:1,environmentNames:["LIBCHARX_ROOT","LIBCHARX_NGSPICE","LIBCHARX_GDS_PYTHON"],versionProbeArgv:["--version"],adapterId:"ppa-libcharx-v1",adapterVersion:"1",capturedAt:"2026-10-25T00:00:00Z" };
    const context = { job:{parameters:parameters(),inputManifest:{files},toolConfigurations:[tool],plan:{}},files,toolBindings:{libcharx:{configuration:tool,health:"healthy",selfTestPassed:true,environment:{LIBCHARX_ROOT:root,LIBCHARX_NGSPICE:path.join(root,"ngspice"),LIBCHARX_GDS_PYTHON:path.join(root,"gds-python")}}},workspacePath:root,now:()=>"2026-10-25T00:00:00Z",abortSignal:new AbortController().signal,step:{stepKey:"prepare-characterization"} };
    context.job.plan = buildCharacterizationPlan(context as unknown as Parameters<typeof buildCharacterizationPlan>[0]);
    const execute = () => executeCharacterizationStep(context as unknown as Parameters<typeof executeCharacterizationStep>[0]);
    await expect(execute()).resolves.toMatchObject({exitCode:0});
    context.toolBindings.libcharx.environment.LIBCHARX_NGSPICE=path.join(root,"gds-python");
    await expect(execute()).rejects.toThrow(/changed after planning/);
    context.toolBindings.libcharx.environment.LIBCHARX_NGSPICE=path.join(root,"ngspice");
    await fs.writeFile(path.join(root,"libcharx/characterizer.py"),"changed-native-source");
    await expect(execute()).rejects.toThrow(/changed after planning/);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
