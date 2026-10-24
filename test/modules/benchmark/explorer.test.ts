import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArtifactRecordV1, ResultRecordV1, JobStepRecordV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../../server/app/db/repositories.ts";
import { StorageService } from "../../../server/app/storage/storage.ts";
import { BenchmarkExplorer } from "../../../server/modules/benchmark/explorer.ts";
import { registerBenchmarkExplorerRoutes } from "../../../server/modules/benchmark/explorerRoutes.ts";
import { modelLineage, retainExplorerModels } from "../../../server/modules/benchmark/explorerPublication.ts";
import { executionContext, jobRecord } from "./helpers.ts";

const directories: string[] = [];
afterEach(async () => { vi.unstubAllGlobals(); await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const sha = (text: string, algorithm = "sha256") => createHash(algorithm).update(text).digest("hex");
const MODES = ["dc", "transient", "ac", "noise"];

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "benchmark-explorer-")); directories.push(directory);
  const storage = new StorageService(path.join(directory, "storage")); await storage.initialize();
  const records: ResultRecordV1[] = [];
  const artifacts = new Map<string, ArtifactRecordV1>();
  const jobs = new Map<string, ReturnType<typeof jobRecord>>();
  const rows = new Map<string, JobStepRecordV1[]>();
  const repositories = {
    users: { findByUsername: () => ({ id: "public", username: "public-runner", enabled: true, deletedAt: null, role: "user" }) },
    results: {
      allIds: () => records.map((result) => result.id),
      get: (_module: string, id: string, viewerId: string, admin: boolean) => records.find((result) => result.id === id && result.lifecycle !== "deleted" && (admin || result.lifecycle === "published" || result.ownerId === viewerId)) ?? null,
    },
    jobs: { get: (id: string) => jobs.get(id), steps: (id: string) => rows.get(id) ?? [] },
    artifacts: { get: (id: string) => artifacts.get(id) },
  } as unknown as Repositories;
  const legacyRoot = path.join(directory, "legacy"); await mkdir(legacyRoot);
  const seed = async (id: string, ownerId: string) => {
    const job = jobRecord({ id: `job-${id}`, ownerId, status: "succeeded", resultId: id,
      startedAt: "2026-10-01T00:00:00Z", finishedAt: "2026-10-01T00:01:00Z",
      parameters: { mode: "run", operations: { benchmark: true }, benchmark: { modes: MODES } },
      plan: { schemaVersion: "eda.job-plan.v1", capabilityVersion: "benchmark.capability.v1", sweep: null, warnings: [], steps: [{
        id: "benchmark.1", name: "Benchmark original", description: "", required: true, weight: 1, inputRoles: [], outputRoles: [],
        process: { toolConfigurationId: "benchmark", executableDisplay: "benchmark", argv: ["../../input/source.lib", "--simulator", "ngspice", "--output-dir", "../../output/benchmark-1"],
          cwdRelative: "work/benchmark.1", timeoutSeconds: 30, environmentNames: [] },
      }] },
    });
    jobs.set(job.id, job);
    rows.set(job.id, [{ stepKey: "benchmark.1", status: "succeeded", exitCode: 0 } as JobStepRecordV1]);
    const result: ResultRecordV1 = {
      schemaVersion: "eda.result.v1", id, moduleId: "benchmark", ownerId, lifecycle: "private", title: id,
      summary: {}, data: { benchmark: { runs: [{ relativePath: "output/benchmark-1/ngspice/REPORT.md", version: "native-test", checksSucceeded: 5, checksFailed: 1 }] } },
      provenance: { origin: "computed", jobId: job.id, ownerId, inputManifestSha256: "a".repeat(64), parameters: job.parameters,
        capabilityVersion: job.capabilityVersion, toolConfigurations: [], toolVersions: {}, parserId: "native", parserVersion: "1", createdAt: "2026-10-01T00:01:00Z" },
      artifactIds: [], createdAt: "2026-10-01T00:01:00Z", updatedAt: "2026-10-01T00:01:00Z", publishedAt: null,
    };
    records.push(result);
    const put = async (relative: string, text: string, mediaType = "application/json") => {
      const id = `${result.id}/${relative}`; const file = `results/benchmark/${result.id}/${relative}`;
      const target = await storage.safeDestination(file); await writeFile(target, text);
      const artifact: ArtifactRecordV1 = { id, resultId: result.id, jobId: job.id, ownerId, moduleId: "benchmark", stepId: null, role: "native-data",
        relativePath: file, sizeBytes: Buffer.byteLength(text), sha256: sha(text), mediaType, visibility: "private", createdAt: result.createdAt };
      artifacts.set(id, artifact); result.artifactIds.push(id);
    };
    const model = ".model actual_nmos NMOS level=1 vto=0.7";
    await put("artifacts/explorer/benchmark.1/model.lib", model, "text/plain");
    await put("artifacts/explorer/benchmark.1/model.json", JSON.stringify({ modelMd5: sha(model, "md5"), modelSha256: sha(model), benchmarkInputPath: "input/source.lib", sourcePath: "input/source.lib", stage: "original", chain: [] }));
    const native = "output/benchmark-1/ngspice/";
    await put(native + "REPORT.md", "# Actual native report\n## DC Analysis\n[✗] physical check failed; TC: nan\n<img src='plots/real.png' alt='Actual plot'/>", "text/markdown");
    const fixtures: Record<string, unknown> = {};
    for (const mode of MODES) {
      await put(native + `netlist/${mode}.cir`, `${mode} actual native netlist`, "text/plain");
      fixtures[mode] = { templateSha256: "b".repeat(64), submittedSha256: sha(`${mode} actual native netlist`) };
    }
    await put(native + "native-fixture-manifest.json", JSON.stringify({ simulator: "ngspice", fixtureMode: "fixed-simulator-native", netlistAstUsed: false,
      benchmarkContractSha256: "c".repeat(64), primaryDeviceType: "nmos", modelNames: { primary: "actual_nmos" }, fixtures }));
    await put(native + "plots/real.png", "REAL_IMAGE_BYTES", "image/png");
    await put(native + "data/actual.txt", "ACTUAL_MEASUREMENTS", "text/plain");
    await put(native + "data/plot_provenance.json", JSON.stringify({ syntheticDataUsed: false, imageSha256: { "real.png": sha("REAL_IMAGE_BYTES") },
      plots: { "real.png": { syntheticDataUsed: false, sources: ["data/actual.txt"], sourceSha256: { "data/actual.txt": sha("ACTUAL_MEASUREMENTS") } } } }));
    return { result, job, put };
  };
  return { directory, storage, records, repositories, jobs, rows, artifacts, seed, legacyRoot, explorer: () => new BenchmarkExplorer(repositories, storage, legacyRoot) };
}

describe("authenticated Results explorer bridge", () => {
  it("isolates private owners and respects publication, unpublication and deletion even with cached runs", async () => {
    const f = await fixture(); await f.seed("anonymous", "public"); const privateRun = await f.seed("private", "alice");
    const explorer = f.explorer();
    expect((await explorer.availableRuns("public", false)).runCount).toBe(1);
    expect((await explorer.availableRuns("alice", false)).runCount).toBe(1);
    expect((await explorer.availableRuns("bob", false)).runCount).toBe(0);
    const aliceIndex = await explorer.availableRuns("alice", false);
    const key = (aliceIndex.runs as Array<{ runKey: string }>)[0].runKey;
    expect(await explorer.file(key, "ngspice", "REPORT.md", "public", false)).toBeNull();
    privateRun.result.lifecycle = "published";
    expect((await explorer.availableRuns("public", false)).runCount).toBe(2);
    privateRun.result.lifecycle = "unpublished";
    expect(await explorer.file(key, "ngspice", "REPORT.md", "public", false)).toBeNull();
    privateRun.result.lifecycle = "deleted";
    expect((await explorer.availableRuns("alice", true)).runCount).toBe(1);
  });

  it("discovers only committed successful runs and validates real native hashes and provenance", async () => {
    const f = await fixture(); const run = await f.seed("actual", "alice");
    run.job.status = "running";
    expect((await f.explorer().availableRuns("alice", false)).runCount).toBe(0);
    run.job.status = "succeeded"; run.job.resultId = "other";
    expect((await f.explorer().availableRuns("alice", false)).runCount).toBe(0);
    run.job.resultId = run.result.id;
    f.rows.get(run.job.id)![0].exitCode = 1;
    expect((await f.explorer().availableRuns("alice", false)).runCount).toBe(0);
    f.rows.get(run.job.id)![0].exitCode = 0;
    expect((await f.explorer().availableRuns("alice", false)).runCount).toBe(1);
    await run.put("output/benchmark-1/ngspice/netlist/dc.cir", "TAMPERED NETLIST");
    expect((await f.explorer().availableRuns("alice", false)).runCount).toBe(0);
  });

  it("keeps same-model task runs distinct and serves unchanged native report, plots and true checksum", async () => {
    const f = await fixture(); await f.seed("first", "alice"); await f.seed("second", "alice");
    const explorer = f.explorer(); const index = await explorer.availableRuns("alice", false);
    const runs = index.runs as Array<{ runKey: string; md5: string }>;
    expect(runs).toHaveLength(2); expect(runs[0].runKey).not.toBe(runs[1].runKey); expect(runs[0].md5).toBe(runs[1].md5);
    const artifact = await explorer.file(runs[0].runKey, "ngspice", "REPORT.md", "alice", false);
    expect(artifact?.content.toString()).toContain("TC: nan");
    expect(artifact?.content.toString()).toContain("physical check failed");
    const manifest = (await explorer.file(runs[0].runKey, "ngspice", "manifest.json", "alice", false))!.content as Record<string, unknown>;
    expect(manifest.checksum).toBe(runs[0].md5); expect(manifest.checksum).not.toBe(runs[0].runKey);
    expect(manifest).not.toHaveProperty("parameterPreservingInput"); expect(manifest).not.toHaveProperty("modelFallbackApplied");
    expect((await explorer.file(runs[0].runKey, "ngspice", "plot/real.png", "alice", false))?.content.toString()).toBe("REAL_IMAGE_BYTES");
    expect((await explorer.file(runs[0].runKey, "ngspice", "plots/real.png", "alice", false))?.content.toString()).toBe("REAL_IMAGE_BYTES");
    expect(await explorer.file(runs[0].runKey, "ngspice", "../manifest.json", "alice", false)).toBeNull();
  });

  it.each([
    [null, null, null],
    ["2026-10-01T00:00:10Z", null, null],
    [null, "2026-10-01T00:00:12Z", null],
    ["invalid", "2026-10-01T00:00:12Z", null],
    ["2026-10-01T00:00:10Z", "invalid", null],
    ["2026-10-01T00:00:12Z", "2026-10-01T00:00:10Z", null],
    ["2026-10-01T00:00:10Z", "2026-10-01T00:00:10Z", 0],
  ])("publishes only available step timing (%s, %s)", async (startedAt, finishedAt, elapsedSeconds) => {
    const f = await fixture(); const run = await f.seed("timing", "alice");
    Object.assign(f.rows.get(run.job.id)![0], { startedAt, finishedAt });
    const index = await f.explorer().availableRuns("alice", false);
    const manifest = (index.runs as Array<{ manifest: Record<string, unknown> }>)[0].manifest;
    expect(manifest).toMatchObject({ startedAt, finishedAt, elapsedSeconds });
    expect(manifest).not.toHaveProperty("wallTimeMs");
    expect(manifest).not.toHaveProperty("peakRssMB");
  });

  it("serves anonymous public-runner through the API without exposing signed-in private runs", async () => {
    const f = await fixture(); await f.seed("public", "public"); await f.seed("secret", "alice");
    const app = Fastify(); app.decorateRequest("edaUser", null); app.decorateRequest("edaSessionId", null);
    app.addHook("onRequest", async (request) => { if (request.headers["x-test-user"]) request.edaUser = { id: "alice", role: "user" } as NonNullable<typeof request.edaUser>; });
    registerBenchmarkExplorerRoutes(app, f.repositories, f.storage, f.legacyRoot);
    const anonymous = await app.inject("/api/benchmark/explorer/available-runs.json");
    expect(anonymous.statusCode).toBe(200); expect(anonymous.json().runs.map((run: { modelId: string }) => run.modelId)).toHaveLength(1);
    const signedIn = await app.inject({ url: "/api/benchmark/explorer/available-runs.json", headers: { "x-test-user": "alice" } });
    const key = signedIn.json().runs[0].runKey;
    expect((await app.inject(`/api/benchmark/explorer/${key}/ngspice/REPORT.md`)).statusCode).toBe(404);
    expect(anonymous.headers["cache-control"]).toBe("private, no-store"); await app.close();
  });


  it("keeps strict legacy discovery and serves legacy report and plot paths", async () => {
    const f = await fixture(); const run = await f.seed("legacy-source", "alice");
    const key = "d".repeat(32); const root = path.join(f.legacyRoot, key, "ngspice");
    for (const artifact of f.artifacts.values()) {
      const relative = artifact.relativePath.split("output/benchmark-1/ngspice/")[1];
      if (!relative) continue;
      const target = path.join(root, relative.replace(/^plots\//, "plot/"));
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(await f.storage.resolveExisting(artifact.relativePath), target);
    }
    await writeFile(path.join(f.legacyRoot, key, "model-manifest.json"), JSON.stringify({ id: "legacy-model", sourceId: "legacy-source", md5: key, kind: "original", chain: [], cardCount: 1 }));
    const manifest = { status: "completed", returnCode: 0, benchmarkFixtureMode: "fixed-simulator-native", netlistAstUsed: false,
      parameterPreservingInput: true, modelFallbackApplied: false, internalFailureMarkers: [], parameterContext: { guessedDefaults: false, unresolvedSymbols: [] }, md5: key };
    await writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest));
    expect((await f.explorer().availableRuns("bob", false)).runCount).toBe(1);
    expect((await f.explorer().file(key, "ngspice", "plot/real.png", "bob", false))?.content.toString()).toBe("REAL_IMAGE_BYTES");
    expect((await f.explorer().file(key, "ngspice", "REPORT.md", "bob", false))?.content.toString()).toContain("TC: nan");
    await writeFile(path.join(root, "manifest.json"), JSON.stringify({ ...manifest, modelFallbackApplied: true }));
    expect((await f.explorer().availableRuns("bob", false)).runCount).toBe(0);
    run.result.lifecycle = "deleted";
  });

  it("loads two same-checksum runs independently through the existing Results loader", async () => {
    const f = await fixture(); await f.seed("loader-first", "alice"); await f.seed("loader-second", "alice");
    const explorer = f.explorer(); const index = await explorer.availableRuns("alice", false);
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("available-runs.json")) return new Response(JSON.stringify(index), { headers: { "content-type": "application/json" } });
      const parts = url.replace("/api/benchmark/explorer/", "").split("/");
      const file = await explorer.file(parts[0], parts[1], parts.slice(2).join("/"), "alice", false);
      if (!file) return new Response("not found", { status: 404 });
      return new Response(Buffer.isBuffer(file.content) ? file.content.toString() : JSON.stringify(file.content), { headers: { "content-type": file.mediaType } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { buildScenario, loadBenchmarkRuns } = await import("../../../src/data/benchmarkWorkspace/dataLoader.ts");
    const scenario = await buildScenario(); const ids = Object.keys(scenario.models);
    expect(ids).toHaveLength(2); expect(scenario.models[ids[0]].checksum).toBe(scenario.models[ids[1]].checksum);
    const loaded = await loadBenchmarkRuns(ids);
    expect(loaded.runModelIds).toEqual(ids); expect(Object.keys(loaded.reports)).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("REPORT.md"))).toHaveLength(2);
    expect(loaded.manifests[ids[0]].checksum).toBe(scenario.models[ids[0]].checksum);
  });

  it("retains and discovers independent simulator steps with their actual input checksums and stage lineage", async () => {
    const f = await fixture(); const run = await f.seed("per-simulator", "alice");
    const workspace = await f.storage.createWorkspace(run.job.id);
    const stagePath = "output/fitting/fitted.lib";
    const spectrePath = "output/canonical-benchmark.2/normalized.lib";
    const translatedPath = "output/canonical-benchmark.3/normalized.lib";
    const stageModel = ".model actual_nmos NMOS level=14 vth0=0.7";
    const spectreModel = ".model actual_nmos NMOS level=14 version=4.21 vth0=0.7";
    const hspiceModel = ".model actual_nmos NMOS level=54 vth0=0.7";
    const inputs = { ngspice: stagePath, spectre: spectrePath, hspice: translatedPath };
    const modelTexts = { ngspice: stageModel, spectre: spectreModel, hspice: hspiceModel };
    for (const simulator of ["ngspice", "spectre", "hspice"] as const) {
      await mkdir(path.dirname(path.join(workspace, inputs[simulator])), { recursive: true });
      await writeFile(path.join(workspace, inputs[simulator]), modelTexts[simulator]);
    }
    run.job.parameters = { operationOrder: ["fitting"], operations: { fitting: true, benchmark: true }, benchmark: { modes: MODES } };
    const templateStep = run.job.plan.steps[0];
    const nativeArtifacts = [...f.artifacts.values()].filter((artifact) => artifact.relativePath.includes("output/benchmark-1/ngspice/"));
    const simulators = ["ngspice", "spectre", "hspice"] as const;
    const extensions = { ngspice: ".cir", spectre: ".scs", hspice: ".sp" };
    run.job.plan.steps = [
      ...(["spectre", "hspice"] as const).map((simulator, index) => ({
        ...templateStep, id: `normalize-benchmark.${index + 2}`,
        process: { ...templateStep.process!, toolConfigurationId: "translator", argv: ["translate", "../../" + stagePath, "--target", simulator === "spectre" ? "spectre-spice" : "hspice", "--output", "../../" + inputs[simulator]],
          cwdRelative: `work/normalize-benchmark.${index + 2}`, expectedOutputs: [inputs[simulator], `output/canonical-benchmark.${index + 2}/model_manifest.json`] },
      })),
      ...simulators.map((simulator, index) => ({
        ...templateStep, id: `benchmark.${index + 1}`,
        process: { ...templateStep.process!, argv: ["../../" + inputs[simulator], "--simulator", simulator, "--output-dir", `../../output/benchmark-${index + 1}`, "--modes", "dc"],
          cwdRelative: `work/benchmark.${index + 1}` },
      })),
    ];
    const timings = [
      { startedAt: "2026-10-01T00:00:10.000Z", finishedAt: "2026-10-01T00:00:11.250Z", elapsedSeconds: 1.25 },
      { startedAt: "2026-10-01T00:00:20.000Z", finishedAt: "2026-10-01T00:00:22.500Z", elapsedSeconds: 2.5 },
      { startedAt: "2026-10-01T00:00:30.000Z", finishedAt: "2026-10-01T00:00:35.000Z", elapsedSeconds: 5 },
    ];
    // Normalization rows deliberately have unrelated times and precede the
    // benchmark rows: lookup must use stepKey rather than row order or job time.
    f.rows.set(run.job.id, run.job.plan.steps.map((step) => ({ stepKey: step.id, status: "succeeded", exitCode: 0,
      ...(step.id.startsWith("benchmark.") ? timings[Number(step.id.split(".")[1]) - 1]
        : { startedAt: run.job.startedAt, finishedAt: run.job.finishedAt }),
    } as JobStepRecordV1)));
    run.result.data = { benchmark: { runs: simulators.map((simulator, index) => ({ relativePath: `output/benchmark-${index + 1}/${simulator}/REPORT.md`, checksSucceeded: 5, checksFailed: 1 })) } };
    for (const [index, simulator] of simulators.entries()) {
      const nativeRoot = `output/benchmark-${index + 1}/${simulator}/`;
      const inputPath = inputs[simulator];
      for (const artifact of nativeArtifacts) {
        let relative = artifact.relativePath.split("output/benchmark-1/ngspice/")[1];
        let content = await readFile(await f.storage.resolveExisting(artifact.relativePath), "utf8");
        if (relative.startsWith("netlist/")) relative = relative.replace(/\.cir$/, extensions[simulator]);
        if (relative === "native-fixture-manifest.json") {
          const manifest = JSON.parse(content);
          content = JSON.stringify({ ...manifest, simulator, modelFile: path.join(workspace, inputPath) });
          await mkdir(path.join(workspace, nativeRoot), { recursive: true });
          await writeFile(path.join(workspace, nativeRoot, relative), content);
        }
        await run.put(nativeRoot + relative, content, artifact.mediaType);
      }
    }
    await retainExplorerModels(executionContext(workspace, run.job));
    for (const step of run.job.plan.steps.filter((step) => step.id.startsWith("benchmark."))) {
      for (const name of ["model.lib", "model.json"]) {
        const relative = `artifacts/explorer/${step.id}/${name}`;
        await run.put(relative, await readFile(path.join(workspace, relative), "utf8"), name.endsWith(".json") ? "application/json" : "text/plain");
      }
    }
    const explorer = f.explorer(); const index = await explorer.availableRuns("alice", false);
    const entries = index.runs as Array<{ runKey: string; modelMd5: string; simulator: typeof simulators[number]; sourceId: string; chain: string[]; manifest: { modes: string[]; startedAt: string; finishedAt: string; elapsedSeconds: number; provenance: { benchmarkInputPath: string } } }>;
    expect(entries).toHaveLength(3);
    expect(new Set(entries.map((entry) => entry.runKey)).size).toBe(3);
    for (const entry of entries) {
      expect(entry.modelMd5).toBe(sha(modelTexts[entry.simulator], "md5"));
      expect(entry.sourceId).toBe(stagePath); expect(entry.chain).toEqual(["fitting"]);
      expect(entry.manifest.modes).toEqual(["dc"]);
      expect(entry.manifest).toMatchObject(timings[simulators.indexOf(entry.simulator)]);
      expect(entry.manifest.provenance.benchmarkInputPath).toBe(inputs[entry.simulator]);
      expect((await explorer.file(entry.runKey, entry.simulator, "model.lib", "alice", false))?.content.toString()).toBe(modelTexts[entry.simulator]);
    }
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("available-runs.json")) return new Response(JSON.stringify(index), { headers: { "content-type": "application/json" } });
      const parts = url.replace("/api/benchmark/explorer/", "").split("/");
      const artifact = (await explorer.file(parts[0], parts[1], parts.slice(2).join("/"), "alice", false))!;
      return new Response(Buffer.isBuffer(artifact.content) ? artifact.content.toString() : JSON.stringify(artifact.content), { headers: { "content-type": artifact.mediaType } });
    });
    const { buildScenario, loadBenchmarkRuns } = await import("../../../src/data/benchmarkWorkspace/dataLoader.ts");
    const scenario = await buildScenario(); const loaded = await loadBenchmarkRuns(Object.keys(scenario.models));
    expect(loaded.runModelIds).toHaveLength(3); expect(Object.keys(loaded.reports)).toHaveLength(3);
    expect(loaded.benchmarkResults.map((result) => result.domain)).toEqual(["dc", "dc", "dc"]);
    expect(loaded.benchmarkResults.map((result) => result.resources.wallTimeMs).sort((a, b) => a! - b!)).toEqual([1250, 2500, 5000]);
  });

  it("uses exact per-step modes and does not create results for absent analysis domains", async () => {
    const f = await fixture(); const run = await f.seed("selected-mode", "alice");
    run.job.plan.steps[0].process!.argv.push("--modes", "dc");
    const explorer = f.explorer(); const index = await explorer.availableRuns("alice", false);
    const key = (index.runs as Array<{ runKey: string }>)[0].runKey;
    const manifest = (await explorer.file(key, "ngspice", "manifest.json", "alice", false))!.content as Record<string, unknown>;
    expect(manifest.modes).toEqual(["dc"]);
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("available-runs.json")) return new Response(JSON.stringify(index), { headers: { "content-type": "application/json" } });
      const parts = url.replace("/api/benchmark/explorer/", "").split("/");
      const artifact = (await explorer.file(parts[0], parts[1], parts.slice(2).join("/"), "alice", false))!;
      return new Response(Buffer.isBuffer(artifact.content) ? artifact.content.toString() : JSON.stringify(artifact.content), { headers: { "content-type": artifact.mediaType } });
    });
    const { loadBenchmarkRuns } = await import("../../../src/data/benchmarkWorkspace/dataLoader.ts");
    expect((await loadBenchmarkRuns([key + "|ngspice"])).benchmarkResults.map((result) => result.domain)).toEqual(["dc"]);
  });

  it("preserves lineage without including disabled processing tools", () => {
    const job = jobRecord({ parameters: { operationOrder: ["translator", "fitting", "reduction", "expansion"], operations: { translator: false, fitting: true, reduction: false, expansion: true } } });
    expect(modelLineage(job, "output/expansion/models/model_t.sp").chain).toEqual(["fitting", "expansion"]);
    expect(modelLineage(job, "input/original.lib").chain).toEqual([]);
    job.plan.steps.push({ id: "normalize-benchmark.1", name: "Normalize", description: "", required: true, weight: 1, inputRoles: [], outputRoles: [], process: {
      toolConfigurationId: "translator", executableDisplay: "translator", argv: ["translate", "../../output/expansion/models/model_t.sp", "--output", "../../output/canonical-benchmark.1/normalized.lib"],
      cwdRelative: "work/normalize-benchmark.1", expectedOutputs: ["output/canonical-benchmark.1/normalized.lib"], environmentNames: [], timeoutSeconds: 10,
    } });
    expect(modelLineage(job, "output/canonical-benchmark.1/normalized.lib")).toEqual({ sourcePath: "output/expansion/models/model_t.sp", stage: "expansion", chain: ["fitting", "expansion"] });
  });

  it("rejects a native fixture that references a different model than the planned input", async () => {
    const f = await fixture(); const run = await f.seed("contradictory", "alice");
    const workspace = await f.storage.createWorkspace(run.job.id);
    await writeFile(path.join(workspace, "input/source.lib"), ".model planned NMOS vto=0.8");
    await writeFile(path.join(workspace, "input/wrong.lib"), ".model wrong NMOS vto=0.4");
    const native = path.join(workspace, "output/benchmark-1/ngspice"); await mkdir(native, { recursive: true });
    await writeFile(path.join(native, "native-fixture-manifest.json"), JSON.stringify({ modelFile: path.join(workspace, "input/wrong.lib") }));
    await expect(retainExplorerModels(executionContext(workspace, run.job))).rejects.toThrow(/does not match the planned/);
  });

  it("retains the exact input model into private publication artifacts", async () => {
    const f = await fixture(); const run = await f.seed("retain", "alice");
    const workspace = await f.storage.createWorkspace(run.job.id); await writeFile(path.join(workspace, "input/source.lib"), ".model original NMOS vto=0.8");
    const native = path.join(workspace, "output/benchmark-1/ngspice"); await mkdir(native, { recursive: true });
    await writeFile(path.join(native, "native-fixture-manifest.json"), JSON.stringify({ modelFile: path.join(workspace, "input/source.lib") }));
    await retainExplorerModels(executionContext(workspace, run.job));
    expect(await readFile(path.join(workspace, "artifacts/explorer/benchmark.1/model.lib"), "utf8")).toBe(".model original NMOS vto=0.8");
    expect(JSON.parse(await readFile(path.join(workspace, "artifacts/explorer/benchmark.1/model.json"), "utf8")).stage).toBe("original");
  });
});
