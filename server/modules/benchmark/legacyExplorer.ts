import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
type JsonObject = Record<string, unknown>;
const simulatorExtensions = { ngspice: ".cir", spectre: ".scs", hspice: ".sp" } as const;
const benchmarkModes = ["dc", "transient", "ac", "noise"] as const;
function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

async function readJson(file: string): Promise<JsonObject> {
  return asObject(JSON.parse(await fs.readFile(file, "utf8")));
}

async function isNonEmptyFile(file: string): Promise<boolean> {
  try {
    const metadata = await fs.stat(file);
    return metadata.isFile() && metadata.size > 0;
  } catch {
    return false;
  }
}

async function sha256File(file: string): Promise<string> {
  return createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function isDisplayableRun(
  runDirectory: string,
  simulator: keyof typeof simulatorExtensions,
  manifest: JsonObject,
): Promise<boolean> {
  if (
    manifest.status !== "completed"
    || manifest.returnCode !== 0
    || manifest.benchmarkFixtureMode !== "fixed-simulator-native"
    || manifest.netlistAstUsed !== false
    || manifest.parameterPreservingInput !== true
    || manifest.modelFallbackApplied !== false
    || (
      Array.isArray(manifest.internalFailureMarkers)
      && manifest.internalFailureMarkers.length > 0
    )
  ) {
    return false;
  }

  const context = asObject(manifest.parameterContext);
  if (
    context.guessedDefaults === true
    || (
      Array.isArray(context.unresolvedSymbols)
      && context.unresolvedSymbols.length > 0
    )
  ) {
    return false;
  }

  const requiredFiles = [
    path.join(runDirectory, "REPORT.md"),
    ...benchmarkModes.map((mode) => path.join(
      runDirectory,
      "netlist",
      `${mode}${simulatorExtensions[simulator]}`,
    )),
  ];
  if (!(await Promise.all(requiredFiles.map(isNonEmptyFile))).every(Boolean)) {
    return false;
  }

  let fixtureManifest: JsonObject;
  try {
    fixtureManifest = await readJson(
      path.join(runDirectory, "native-fixture-manifest.json"),
    );
  } catch {
    return false;
  }
  if (
    fixtureManifest.fixtureMode !== "fixed-simulator-native"
    || fixtureManifest.netlistAstUsed !== false
    || typeof fixtureManifest.benchmarkContractSha256 !== "string"
    || fixtureManifest.benchmarkContractSha256.length !== 64
  ) {
    return false;
  }
  const fixtures = asObject(fixtureManifest.fixtures);
  for (const mode of benchmarkModes) {
    const fixture = asObject(fixtures[mode]);
    const archived = path.join(
      runDirectory,
      "netlist",
      `${mode}${simulatorExtensions[simulator]}`,
    );
    if (
      typeof fixture.templateSha256 !== "string"
      || fixture.templateSha256.length !== 64
      || typeof fixture.submittedSha256 !== "string"
      || fixture.submittedSha256.length !== 64
      || await sha256File(archived) !== fixture.submittedSha256
    ) {
      return false;
    }
  }

  let provenance: JsonObject;
  try {
    provenance = await readJson(
      path.join(runDirectory, "data", "plot_provenance.json"),
    );
  } catch {
    return false;
  }
  if (provenance.syntheticDataUsed !== false) return false;

  const plots = asObject(provenance.plots);
  const plotNames = Object.keys(plots);
  if (plotNames.length === 0) return false;
  let actualPlotNames: Set<string>;
  let actualDataNames: Set<string>;
  try {
    const [plotEntries, dataEntries] = await Promise.all([
      fs.readdir(path.join(runDirectory, "plot"), { withFileTypes: true }),
      fs.readdir(path.join(runDirectory, "data"), { withFileTypes: true }),
    ]);
    actualPlotNames = new Set(
      plotEntries.filter((entry) => entry.isFile()).map((entry) => entry.name),
    );
    actualDataNames = new Set(
      dataEntries.filter((entry) => entry.isFile()).map((entry) => entry.name),
    );
  } catch {
    return false;
  }
  for (const plotName of plotNames) {
    const plot = asObject(plots[plotName]);
    if (plot.syntheticDataUsed !== false) return false;
    if (
      !actualPlotNames.has(plotName)
      || !Array.isArray(plot.sources)
      || plot.sources.length === 0
    ) {
      return false;
    }
    for (const source of plot.sources) {
      if (
        typeof source !== "string"
        || !source.startsWith("data/")
        || !actualDataNames.has(source.slice("data/".length))
      ) {
        return false;
      }
    }
  }
  return true;
}

export async function discoverLegacyBenchmarkRuns(benchmarkDataRoot: string) {
  const runs: JsonObject[] = [];
  let modelDirectories: Dirent[] = [];
  try {
    modelDirectories = await fs.readdir(benchmarkDataRoot, {
      withFileTypes: true,
    });
  } catch {
    // A missing result root simply means that no run is displayable yet.
  }

  await Promise.all(modelDirectories.map(async (modelDirectory) => {
    if (
      !modelDirectory.isDirectory()
      || !/^[a-f0-9]{32}$/i.test(modelDirectory.name)
    ) {
      return;
    }
    const modelRoot = path.join(benchmarkDataRoot, modelDirectory.name);
    let modelManifest: JsonObject = {};
    try {
      modelManifest = await readJson(
        path.join(modelRoot, "model-manifest.json"),
      );
    } catch {
      return;
    }

    await Promise.all(
      Object.keys(simulatorExtensions).map(async (simulatorName) => {
        const simulator = simulatorName as keyof typeof simulatorExtensions;
        const runRoot = path.join(modelRoot, simulator);
        let manifest: JsonObject;
        try {
          manifest = await readJson(path.join(runRoot, "manifest.json"));
        } catch {
          return;
        }
        if (!(await isDisplayableRun(runRoot, simulator, manifest))) return;

        runs.push({
          modelId: manifest.modelId ?? modelManifest.id,
          sourceId: manifest.sourceId ?? modelManifest.sourceId,
          kind: manifest.kind ?? modelManifest.kind ?? "processed",
          chain: Array.isArray(manifest.chain)
            ? manifest.chain
            : (Array.isArray(modelManifest.chain) ? modelManifest.chain : []),
          md5: modelDirectory.name,
          simulator,
          cardCount: typeof modelManifest.cardCount === "number"
            ? modelManifest.cardCount
            : 0,
          deviceType: modelManifest.deviceType ?? "unknown",
          manifest: {
            modelId: manifest.modelId ?? modelManifest.id,
            sourceId: manifest.sourceId ?? modelManifest.sourceId,
            kind: manifest.kind ?? modelManifest.kind,
            chain: manifest.chain ?? modelManifest.chain,
            md5: modelDirectory.name,
            simulator,
            status: manifest.status,
            startedAt: manifest.startedAt,
            finishedAt: manifest.finishedAt,
            elapsedSeconds: manifest.elapsedSeconds,
            peakRssKiB: manifest.peakRssKiB,
          },
        });
      }),
    );
  }));

  runs.sort((left, right) => {
    const modelOrder = String(left.modelId).localeCompare(String(right.modelId));
    return modelOrder || String(left.simulator).localeCompare(
      String(right.simulator),
    );
  });
  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    runCount: runs.length,
    modes: [...benchmarkModes],
    simulators: [...new Set(runs.map((run) => run.simulator))],
    runs,
  };
}
