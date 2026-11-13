import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { JsonObject, JsonValue, ParsedModuleResultV1, StepExecutionContextV1 } from "../../../shared/contracts/v1.ts";
import { workspacePath } from "./security.ts";
import { benchmarkParameters, operationEnabled } from "./validation.ts";
import { BENCHMARK_ADAPTER_VERSION, type NativeArtifact, type NativeBenchmarkResult } from "./types.ts";

const MAX_ARTIFACT_FILES = 10_000;
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;

function mediaType(relativePath: string): string {
  const extension = path.posix.extname(relativePath).toLowerCase();
  return ({
    ".json": "application/json",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".log": "text/plain",
    ".txt": "text/plain",
    ".lib": "text/plain",
    ".model": "text/plain",
    ".sp": "text/plain",
    ".cir": "text/plain",
    ".scs": "text/plain",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  } as Record<string, string>)[extension] ?? "application/octet-stream";
}

export async function walkArtifacts(root: string, baseLabel: "input" | "output" | "artifacts"): Promise<NativeArtifact[]> {
  const artifacts: NativeArtifact[] = [];
  const visit = async (directory: string, relativeDirectory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (artifacts.length >= MAX_ARTIFACT_FILES) throw new Error("Benchmark artifact count exceeds the module limit");
      const absolute = path.join(directory, entry.name);
      const relative = path.posix.join(relativeDirectory, entry.name);
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) throw new Error(`Symbolic-link artifact is forbidden: ${relative}`);
      if (metadata.isDirectory()) await visit(absolute, relative);
      else if (metadata.isFile()) {
        const basename = entry.name.toLowerCase();
        const role = basename === "report.md" ? "benchmark-report"
          : basename.includes("manifest") ? "manifest"
          : basename === "reduction_results.json" ? "reduction-results"
          : basename === "summary.md" ? "expansion-summary"
          : /\.(?:lib|model|sp|cir|scs)$/i.test(basename) ? "model"
          : /\.(?:png|svg|pdf)$/i.test(basename) ? "plot"
          : /\.(?:log|txt)$/i.test(basename) ? "log"
          : "native-data";
        artifacts.push({ role, relativePath: `${baseLabel}/${relative}`, mediaType: mediaType(relative), required: role === "benchmark-report", publish: role !== "log" || baseLabel !== "input" });
      }
    }
  };
  try {
    await visit(root, "");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return artifacts;
}

async function parseJson(absolutePath: string): Promise<JsonValue> {
  const metadata = await lstat(absolutePath);
  if (metadata.size > MAX_JSON_BYTES) throw new Error(`JSON artifact is too large: ${absolutePath}`);
  const parsed = JSON.parse(await readFile(absolutePath, "utf8")) as JsonValue;
  return parsed;
}

function reportSummary(text: string, relativePath: string): JsonObject {
  const simulator = relativePath.split("/").find((segment) => ["ngspice", "spectre", "hspice"].includes(segment.toLowerCase()))?.toLowerCase()
    ?? (/spectre/i.test(text) ? "spectre" : /hspice/i.test(text) ? "hspice" : /ngspice/i.test(text) ? "ngspice" : "unknown");
  const version = text.match(/(?:Version|version)\s*:\s*([^\r\n]+)/)?.[1]?.trim() ?? null;
  const domains = ["dc", "transient", "ac", "noise"].map((domain) => {
    const hasSection = new RegExp(`#{2,3}\\s+(?:\\d+\\.\\s+)?${domain}`, "i").test(text);
    const section = text.match(new RegExp(`#{2,3}\\s+(?:\\d+\\.\\s+)?${domain}[^\\n]*([\\s\\S]*?)(?=\\n#{2,3}\\s|$)`, "i"))?.[1] ?? "";
    const failure = /(?:color:\s*red|✗|\bfailed?\b)/i.test(section);
    return { domain, status: !hasSection ? "not-run" : failure ? "failed" : "succeeded" } as JsonObject;
  });
  const checkLines = text.split(/\r?\n/).filter((line) => !/Items are marked with/i.test(line));
  const checksSucceeded = checkLines.filter((line) => /(?:color:\s*green[^>]*>✓|✓)/i.test(line)).length;
  const checksFailed = checkLines.filter((line) => /color:\s*red[^>]*>✗/i.test(line)).length;
  return { simulator, version, relativePath, domains, checksSucceeded, checksFailed };
}

function stringList(value: JsonValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function benchmarkOutputRoot(argv: string[]): string | null {
  const flag = argv.indexOf("--output-dir");
  const value = flag >= 0 ? argv[flag + 1] : null;
  if (!value) return null;
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  const outputIndex = normalized.split("/").lastIndexOf("output");
  if (outputIndex < 0) return null;
  return normalized.split("/").slice(outputIndex).join("/");
}

function plannedOptionValues(argv: string[], flag: string, fallback: string[]): string[] {
  const index = argv.indexOf(flag);
  if (index < 0) return fallback; // Earlier persisted plans did not retain these CLI flags.
  const values = argv.slice(index + 1);
  const nextFlag = values.findIndex((value) => value.startsWith("--"));
  return values.slice(0, nextFlag < 0 ? undefined : nextFlag);
}

async function validateComputedBenchmarkCompleteness(
  context: StepExecutionContextV1,
  artifacts: NativeArtifact[],
  benchmarkRuns: JsonValue[],
  parameters: ReturnType<typeof benchmarkParameters>,
): Promise<void> {
  if (!operationEnabled(parameters, "spice-benchmark")) return;
  const simulators = stringList(parameters.benchmark.simulators);
  const modes = stringList(parameters.benchmark.modes);
  const benchmarkSteps = context.job.plan.steps.filter((step) => /^benchmark\.\d+$/.test(step.id));
  if (!benchmarkSteps.length) throw new Error("Parser rejected the result because the plan contains no Benchmark execution step");

  const reportByPath = new Map<string, JsonObject>();
  for (const run of benchmarkRuns) {
    if (!run || typeof run !== "object" || Array.isArray(run)) continue;
    const relativePath = (run as JsonObject).relativePath;
    if (typeof relativePath === "string") reportByPath.set(relativePath, run as JsonObject);
  }
  const artifactPaths = new Set(artifacts.map((artifact) => artifact.relativePath));
  const failures: string[] = [];
  let expectedReports = 0;

  for (const step of benchmarkSteps) {
    const argv = step.process?.argv ?? [];
    const stepSimulators = plannedOptionValues(argv, "--simulator", simulators);
    const stepModes = plannedOptionValues(argv, "--modes", modes);
    expectedReports += stepSimulators.length;
    if (!stepSimulators.length) failures.push(`${step.id}: planned simulator selection is empty`);
    if (!stepModes.length) failures.push(`${step.id}: planned analysis mode selection is empty`);
    const outputRoot = step.process ? benchmarkOutputRoot(argv) : null;
    if (!outputRoot) {
      failures.push(`${step.id}: planned --output-dir is missing or outside output/`);
      continue;
    }
    for (const simulator of stepSimulators) {
      const prefix = `${outputRoot}/${simulator}`;
      const reportPath = `${prefix}/REPORT.md`;
      const manifestPath = `${prefix}/native-fixture-manifest.json`;
      const run = reportByPath.get(reportPath);
      if (!run) {
        failures.push(`${step.id}/${simulator}: REPORT.md is missing`);
        continue;
      }
      if (!artifactPaths.has(manifestPath)) {
        failures.push(`${step.id}/${simulator}: native-fixture-manifest.json is missing`);
        continue;
      }
      const domains = Array.isArray(run.domains) ? run.domains : [];
      for (const mode of stepModes) {
        const domain = domains.find((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && entry.domain === mode) as JsonObject | undefined;
        if (!domain || domain.status !== "succeeded") failures.push(`${step.id}/${simulator}/${mode}: report domain is not successful`);
      }

      const manifest = await parseJson(workspacePath(context.workspacePath, manifestPath));
      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
        failures.push(`${step.id}/${simulator}: native fixture manifest is not an object`);
        continue;
      }
      const manifestObject = manifest as JsonObject;
      if (manifestObject.simulator !== simulator) failures.push(`${step.id}/${simulator}: manifest simulator identity does not match`);
      const fixtures = manifestObject.fixtures;
      if (!fixtures || typeof fixtures !== "object" || Array.isArray(fixtures)) {
        failures.push(`${step.id}/${simulator}: manifest fixtures are missing`);
        continue;
      }
      for (const mode of stepModes) {
        const fixture = (fixtures as JsonObject)[mode];
        if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) failures.push(`${step.id}/${simulator}/${mode}: native fixture is missing`);
      }
    }
  }

  if (reportByPath.size !== expectedReports) failures.push(`expected exactly ${expectedReports} planned REPORT.md files, found ${reportByPath.size}`);
  if (failures.length) throw new Error(`Parser rejected incomplete Benchmark output:\n${failures.join("\n")}`);
}

export async function parseBenchmarkResult(context: StepExecutionContextV1): Promise<ParsedModuleResultV1> {
  const parameters = benchmarkParameters(context.job.parameters);
  const importMode = parameters.mode === "import" || context.job.operation === "import-completed-result";
  const rootName = importMode ? "input" : "output";
  const root = workspacePath(context.workspacePath, rootName);
  const artifacts = await walkArtifacts(root, rootName);
  const reports = artifacts.filter((artifact) => artifact.role === "benchmark-report");
  if (operationEnabled(parameters, "spice-benchmark") && !reports.length) {
    throw new Error("Parser rejected the result because no Benchmark REPORT.md was produced");
  }
  if (importMode && !reports.length && !artifacts.some((artifact) => artifact.role === "manifest")) {
    throw new Error("Completed-result import contains neither REPORT.md nor a recognized manifest");
  }

  const benchmarkRuns: JsonValue[] = [];
  for (const report of reports) {
    const absolute = workspacePath(context.workspacePath, report.relativePath);
    const metadata = await lstat(absolute);
    if (metadata.size > MAX_REPORT_BYTES) throw new Error(`Benchmark report is too large: ${report.relativePath}`);
    benchmarkRuns.push(reportSummary(await readFile(absolute, "utf8"), report.relativePath));
  }
  if (!importMode) await validateComputedBenchmarkCompleteness(context, artifacts, benchmarkRuns, parameters);

  const operations: JsonValue[] = [];
  const models: JsonValue[] = [];
  for (const artifact of artifacts) {
    if (artifact.role === "model") {
      const absolute = workspacePath(context.workspacePath, artifact.relativePath);
      const metadata = await lstat(absolute);
      if (metadata.size <= MAX_REPORT_BYTES) {
        const text = await readFile(absolute, "utf8");
        const cards = [...text.matchAll(/^\s*\.model\s+([^\s]+)\s+([^\s(]+)/gim)].map((match) => ({ name: match[1], deviceType: match[2] }));
        models.push({ path: artifact.relativePath, modelCards: cards, parameterAssignments: (text.match(/\b[A-Za-z_][A-Za-z0-9_]*\s*=/g) ?? []).length });
      }
      continue;
    }
    if (artifact.mediaType !== "application/json") continue;
    const basename = path.posix.basename(artifact.relativePath).toLowerCase();
    if (!["model_manifest.json", "model-manifest.json", "reduction_results.json", "manifest.json", "native-fixture-manifest.json"].includes(basename)) continue;
    const value = await parseJson(workspacePath(context.workspacePath, artifact.relativePath));
    if (basename.includes("model") && basename.includes("manifest")) models.push(value);
    else operations.push({ path: artifact.relativePath, native: value });
  }

  const data: NativeBenchmarkResult = {
    schemaVersion: "benchmark.result-data.v1",
    workflow: context.job.workflow,
    models,
    operations,
    benchmark: { runs: benchmarkRuns, reportCount: reports.length },
    warnings: [],
  };
  const simulatorNames = benchmarkRuns.flatMap((run) => {
    if (!run || typeof run !== "object" || Array.isArray(run)) return [];
    const simulator = (run as JsonObject).simulator;
    return typeof simulator === "string" ? [simulator] : [];
  });
  return {
    title: `Benchmark ${context.job.id}`,
    summary: {
      origin: importMode ? "imported" : "computed",
      reportCount: reports.length,
      modelManifestCount: artifacts.filter((artifact) => /(?:^|\/)model[_-]manifest\.json$/i.test(artifact.relativePath)).length,
      modelFileCount: artifacts.filter((artifact) => artifact.role === "model").length,
      simulators: [...new Set(simulatorNames)],
      artifactCount: artifacts.length,
    },
    data,
    artifactRoles: [...new Set(artifacts.filter((artifact) => artifact.publish).map((artifact) => artifact.role))],
    parserId: "benchmark-native-result-parser",
    parserVersion: BENCHMARK_ADAPTER_VERSION,
  };
}
