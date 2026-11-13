import { createHash } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import path from "node:path";
import type { ArtifactRecordV1, JobRecordV1, JobStepRecordV1, ResultRecordV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import { StorageService, normalizeRelativePath } from "../../app/storage/storage.ts";
import { discoverLegacyBenchmarkRuns } from "./legacyExplorer.ts";
import { benchmarkOutputPath, modelLineage } from "./explorerPublication.ts";
import { assertExistingPathWithin } from "./security.ts";

type JsonObject = Record<string, unknown>;
const EXTENSIONS = { ngspice: ".cir", spectre: ".scs", hspice: ".sp" } as const;
type Simulator = keyof typeof EXTENSIONS;
const MODES = ["dc", "transient", "ac", "noise"];
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
const hash = (bytes: Buffer, algorithm = "sha256"): string => createHash(algorithm).update(bytes).digest("hex");
const hexHash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

// Persisted step timestamps measure the whole step, including execution wrapper
// overhead. Successful process outputs.wallTimeMs is not retained by the worker.
function stepTiming(step: JobStepRecordV1 | undefined): JsonObject {
  const startedAt = step?.startedAt ?? null;
  const finishedAt = step?.finishedAt ?? null;
  const start = startedAt === null ? NaN : Date.parse(startedAt);
  const finish = finishedAt === null ? NaN : Date.parse(finishedAt);
  const elapsedSeconds = Number.isFinite(start) && Number.isFinite(finish) && finish >= start
    ? (finish - start) / 1000 : null;
  return { startedAt, finishedAt, elapsedSeconds };
}

interface ExplorerRun {
  index: JsonObject;
  manifest: JsonObject;
  modelManifest: JsonObject;
  files: Map<string, ArtifactRecordV1>;
  modelFile: string;
  modelSha256: string;
  resultId: string;
}

export class BenchmarkExplorer {
  private legacyCache: { at: number; pending: ReturnType<typeof discoverLegacyBenchmarkRuns> } | null = null;
  private readonly cache = new Map<string, { at: number; pending: Promise<ExplorerRun[]> }>();
  constructor(private readonly repositories: Repositories, private readonly storage: StorageService, readonly legacyRoot: string) {}

  private legacy() {
    if (!this.legacyCache || Date.now() - this.legacyCache.at > 5_000) this.legacyCache = { at: Date.now(), pending: discoverLegacyBenchmarkRuns(this.legacyRoot) };
    return this.legacyCache.pending;
  }

  private records(viewerId: string | null, admin: boolean): ResultRecordV1[] {
    return this.repositories.results.allIds("benchmark")
      .map((id) => this.repositories.results.get("benchmark", id, viewerId, admin))
      .filter((result): result is ResultRecordV1 => Boolean(result && result.lifecycle !== "deleted" && result.provenance.origin === "computed"));
  }

  private async artifactBytes(artifact: ArtifactRecordV1): Promise<Buffer> {
    const file = await this.storage.resolveExisting(artifact.relativePath);
    const stat = await lstat(file);
    if (!stat.isFile()) throw new Error("Explorer artifact is not a regular file");
    const bytes = await readFile(file);
    if (bytes.length !== artifact.sizeBytes || hash(bytes) !== artifact.sha256) throw new Error("Explorer artifact integrity check failed");
    return bytes;
  }

  private async runs(result: ResultRecordV1): Promise<ExplorerRun[]> {
    const cached = this.cache.get(result.id);
    if (cached && Date.now() - cached.at < 5_000) return cached.pending;
    const pending = this.buildRuns(result);
    this.cache.set(result.id, { at: Date.now(), pending });
    return pending;
  }

  private async buildRuns(result: ResultRecordV1): Promise<ExplorerRun[]> {
    const job = result.provenance.jobId ? this.repositories.jobs.get(result.provenance.jobId) : null;
    // A filesystem directory alone is insufficient. Both DB publication and the
    // terminal successful job must reference the same retained result.
    if (!job || job.status !== "succeeded" || job.resultId !== result.id) return [];
    const steps = this.repositories.jobs.steps(job.id);
    if (job.plan.steps.some((step) => step.process && !steps.some((row) => row.stepKey === step.id && row.status === "succeeded" && row.exitCode === 0))) return [];
    const artifacts = result.artifactIds.map((id) => this.repositories.artifacts.get(id))
      .filter((artifact): artifact is ArtifactRecordV1 => Boolean(artifact && artifact.resultId === result.id && artifact.jobId === job.id));
    const prefix = `results/benchmark/${result.id}/`;
    const byPath = new Map(artifacts.filter((artifact) => artifact.relativePath.startsWith(prefix))
      .map((artifact) => [artifact.relativePath.slice(prefix.length), artifact]));
    const runs: ExplorerRun[] = [];
    for (const step of job.plan.steps.filter((entry) => /^benchmark\.\d+$/.test(entry.id))) {
      const output = benchmarkOutputPath(job, step.id);
      if (!output) continue;
      for (const simulator of Object.keys(EXTENSIONS) as Simulator[]) {
        try {
          const run = await this.buildRun(result, job, step.id, output, simulator, byPath, steps.find((row) => row.stepKey === step.id));
          if (run) runs.push(run);
        } catch {
          // Invalid/missing native artifacts are never made discoverable.
        }
      }
    }
    return runs;
  }

  private async buildRun(result: ResultRecordV1, job: JobRecordV1, stepId: string, output: string,
    simulator: Simulator, byPath: Map<string, ArtifactRecordV1>, executionStep: JobStepRecordV1 | undefined): Promise<ExplorerRun | null> {
    const files = new Map<string, ArtifactRecordV1>();
    const root = `${output}/${simulator}/`;
    for (const [name, artifact] of byPath) if (name.startsWith(root)) files.set(name.slice(root.length), artifact);
    const bytes = async (name: string): Promise<Buffer> => {
      const artifact = files.get(name);
      if (!artifact) throw new Error(`Missing native explorer artifact: ${name}`);
      const content = await this.artifactBytes(artifact);
      if (!content.length) throw new Error("Empty native explorer artifact");
      return content;
    };
    const fixture = object(JSON.parse((await bytes("native-fixture-manifest.json")).toString("utf8")));
    if (fixture.simulator !== simulator || fixture.fixtureMode !== "fixed-simulator-native"
      || fixture.netlistAstUsed !== false || !hexHash(fixture.benchmarkContractSha256)) return null;
    const fixtures = object(fixture.fixtures);
    const process = job.plan.steps.find((step) => step.id === stepId)!.process!;
    const modeFlag = process.argv.indexOf("--modes");
    const modeArguments = process.argv.slice(modeFlag + 1);
    const nextFlag = modeArguments.findIndex((arg) => arg.startsWith("--"));
    const requested = modeFlag >= 0 ? modeArguments.slice(0, nextFlag < 0 ? undefined : nextFlag) : object(job.parameters.benchmark).modes;
    const modes = Array.isArray(requested) ? requested.filter((mode): mode is string => typeof mode === "string" && MODES.includes(mode)) : MODES;
    if (!modes.length) return null;
    for (const mode of modes) {
      const entry = object(fixtures[mode]);
      if (!hexHash(entry.templateSha256) || !hexHash(entry.submittedSha256)
        || hash(await bytes(`netlist/${mode}${EXTENSIONS[simulator]}`)) !== entry.submittedSha256) return null;
    }
    const report = (await bytes("REPORT.md")).toString("utf8");
    const provenance = object(JSON.parse((await bytes("data/plot_provenance.json")).toString("utf8")));
    if (provenance.syntheticDataUsed !== false) return null;
    const plots = object(provenance.plots);
    if (!Object.keys(plots).length) return null;
    for (const [name, raw] of Object.entries(plots)) {
      if (path.posix.basename(name) !== name) return null;
      const entry = object(raw);
      if (entry.syntheticDataUsed !== false || !Array.isArray(entry.sources) || !entry.sources.length) return null;
      const plotName = files.has(`plots/${name}`) ? `plots/${name}` : `plot/${name}`;
      const plot = await bytes(plotName);
      const imageHash = object(provenance.imageSha256)[name];
      if (imageHash !== undefined && (!hexHash(imageHash) || hash(plot) !== imageHash)) return null;
      for (const source of entry.sources) {
        if (typeof source !== "string" || !/^data\/[^/]+$/.test(source)) return null;
        const sourceBytes = await bytes(source);
        const sourceHash = object(entry.sourceSha256)[source];
        if (sourceHash !== undefined && (!hexHash(sourceHash) || hash(sourceBytes) !== sourceHash)) return null;
      }
    }
    // Every report image must resolve to a retained plot, including native
    // reports which use "plots/" instead of the older dataset's "plot/".
    for (const match of report.matchAll(/<img\b[^>]*\bsrc=['"]([^'"]+)['"]/gi)) {
      const name = match[1].replace(/^\.\//, "");
      if (!/^(?:plot|plots)\/[^/]+$/.test(name) || !files.has(name)) return null;
    }

    const descriptorArtifact = byPath.get(`artifacts/explorer/${stepId}/model.json`);
    const descriptor = descriptorArtifact ? object(JSON.parse((await this.artifactBytes(descriptorArtifact)).toString("utf8"))) : {};
    const retainedModel = byPath.get(`artifacts/explorer/${stepId}/model.lib`);
    let modelFile: string;
    let modelBytes: Buffer;
    let modelPath: string;
    if (retainedModel) {
      modelFile = await this.storage.resolveExisting(retainedModel.relativePath);
      modelBytes = await this.artifactBytes(retainedModel);
      modelPath = String(descriptor.benchmarkInputPath);
    } else {
      // Reconcile earlier committed results from frozen job input or retained
      // output; never inspect an uncommitted workspace result.
      if (typeof fixture.modelFile !== "string") return null;
      const workspace = await this.storage.resolveExisting(job.workspaceRelativePath);
      modelPath = path.relative(workspace, fixture.modelFile).split(path.sep).join("/");
      normalizeRelativePath(modelPath);
      const artifact = byPath.get(modelPath);
      if (artifact) {
        modelFile = await this.storage.resolveExisting(artifact.relativePath);
        modelBytes = await this.artifactBytes(artifact);
      } else {
        if (!modelPath.startsWith("input/")) return null;
        const frozen = job.inputManifest.files.find((file) => `input/${file.relativePath}` === modelPath);
        if (!frozen) return null;
        modelFile = await assertExistingPathWithin(workspace, path.join(workspace, modelPath));
        modelBytes = await readFile(modelFile);
        if (modelBytes.length !== frozen.sizeBytes || hash(modelBytes) !== frozen.sha256) return null;
      }
    }
    const modelMd5 = hash(modelBytes, "md5");
    const modelSha256 = hash(modelBytes);
    if (descriptorArtifact && (descriptor.modelMd5 !== modelMd5 || descriptor.modelSha256 !== modelSha256)) return null;
    const lineage = modelLineage(job, modelPath);
    const sourcePath = typeof descriptor.sourcePath === "string" ? descriptor.sourcePath : lineage.sourcePath;
    const stage = typeof descriptor.stage === "string" ? descriptor.stage : lineage.stage;
    const chain = Array.isArray(descriptor.chain) ? descriptor.chain : lineage.chain;
    const cards = [...modelBytes.toString("utf8").matchAll(/^\s*\.model\s+(\S+)\s+([^\s(]+)/gim)];
    const modelNames = object(fixture.modelNames);
    const primary = typeof modelNames.primary === "string" ? modelNames.primary : path.posix.basename(sourcePath);
    const corner = sourcePath.match(/model_([tsf])\.sp$/)?.[1];
    const modelId = `${primary}__${stage}${corner ? `_${corner}` : ""}__${job.id.slice(0, 8)}`;
    const runKey = createHash("md5").update(JSON.stringify([result.id, stepId, modelSha256])).digest("hex");
    const reportRun = object(object(result.data.benchmark).runs instanceof Array
      ? (object(result.data.benchmark).runs as JsonObject[]).find((run) => run.relativePath === `${root}REPORT.md`) : null);
    const manifest: JsonObject = {
      runKey, modelMd5, checksum: modelMd5, modelSha256, modelId, displayName: modelId,
      sourceId: sourcePath, kind: stage === "original" ? "original" : "processed", chain,
      simulator, simulatorVersion: reportRun.version ?? null, modes, status: "completed", returnCode: 0,
      benchmarkFixtureMode: fixture.fixtureMode, netlistAstUsed: fixture.netlistAstUsed,
      benchmarkContractSha256: fixture.benchmarkContractSha256,
      ...stepTiming(executionStep), runId: `${result.id}/${stepId}/${simulator}`,
      deviceType: fixture.primaryDeviceType ?? "unknown", modelNames,
      reportChecks: { succeeded: reportRun.checksSucceeded ?? null, failed: reportRun.checksFailed ?? null },
      report: "REPORT.md", plotDirectory: files.has("plots/" + Object.keys(plots)[0]) ? "plots" : "plot",
      provenance: { ...result.provenance, resultId: result.id, stepId, sourcePath, benchmarkInputPath: modelPath,
        syntheticDataUsed: false, scientificChecks: "See unchanged native REPORT.md; completed denotes execution and retained artifacts." },
    };
    const modelManifest: JsonObject = { id: modelId, sourceId: sourcePath, kind: manifest.kind, chain,
      runKey, md5: modelMd5, modelMd5, modelSha256, cardCount: cards.length,
      deviceType: manifest.deviceType, models: cards.map((card) => ({ name: card[1], deviceType: card[2] })), modelFile: "model.lib" };
    return { index: { modelId, sourceId: sourcePath, kind: manifest.kind, chain, runKey, md5: modelMd5, modelMd5,
      simulator, cardCount: cards.length, deviceType: manifest.deviceType, manifest }, manifest, modelManifest, files, modelFile, modelSha256, resultId: result.id };
  }

  async availableRuns(viewerId: string | null, admin: boolean): Promise<JsonObject> {
    const legacy = await this.legacy();
    const dynamic = (await Promise.all(this.records(viewerId, admin).map((result) => this.runs(result)))).flat();
    const runs = [...legacy.runs, ...dynamic.map((run) => run.index)];
    runs.sort((a, b) => String(a.modelId).localeCompare(String(b.modelId)) || String(a.simulator).localeCompare(String(b.simulator)));
    return { ...legacy, generatedAt: new Date().toISOString(), runCount: runs.length, runs,
      simulators: [...new Set(runs.map((run) => run.simulator))] };
  }

  async file(key: string, simulator: string, name: string, viewerId: string | null, admin: boolean):
    Promise<{ content: Buffer | JsonObject; mediaType: string } | null> {
    if (!/^[a-f0-9]{32}$/i.test(key) || !(simulator in EXTENSIONS)) return null;
    try { normalizeRelativePath(name); } catch { return null; }
    // Recheck access on every request, independent of any cached validation.
    for (const result of this.records(viewerId, admin)) {
      const run = (await this.runs(result)).find((entry) => entry.index.runKey === key && entry.index.simulator === simulator);
      if (!run) continue;
      if (name === "manifest.json") return { content: run.manifest, mediaType: "application/json" };
      if (name === "model-manifest.json") return { content: run.modelManifest, mediaType: "application/json" };
      if (name === "model.lib") {
        const content = await readFile(run.modelFile);
        if (hash(content) !== run.modelSha256) return null;
        return { content, mediaType: "text/plain" };
      }
      const artifact = run.files.get(name) ?? run.files.get(name.replace(/^plot\//, "plots/")) ?? run.files.get(name.replace(/^plots\//, "plot/"));
      return artifact ? { content: await this.artifactBytes(artifact), mediaType: artifact.mediaType } : null;
    }
    const legacy = await this.legacy();
    if (!legacy.runs.some((run) => run.md5 === key && run.simulator === simulator)) return null;
    const root = path.join(this.legacyRoot, key, simulator);
    try {
      const file = await assertExistingPathWithin(root, path.join(root, name));
      if (!(await lstat(file)).isFile()) return null;
      const mediaType = ({ ".json": "application/json", ".md": "text/markdown", ".png": "image/png", ".svg": "image/svg+xml" } as Record<string, string>)[path.extname(name)] ?? "text/plain";
      return { content: await readFile(file), mediaType };
    } catch { return null; }
  }
}
