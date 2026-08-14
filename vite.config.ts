import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  defineConfig,
  type ResolvedConfig,
  type ViteDevServer,
} from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const benchmarkDataRoot = path.resolve(
  __dirname,
  "data/spice-model-benchmark",
);
const availableRunsPath = "/data/spice-model-benchmark/available-runs.json";
const simulatorExtensions = {
  ngspice: ".cir",
  spectre: ".scs",
  hspice: ".sp",
} as const;
const benchmarkModes = ["dc", "transient", "ac", "noise"] as const;
let invalidateBenchmarkIndex = (): void => {};

type JsonObject = Record<string, unknown>;

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

async function discoverAvailableBenchmarkRuns() {
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

function benchmarkAvailableRunsPlugin() {
  let isBuild = false;
  let cachedIndex: Awaited<
    ReturnType<typeof discoverAvailableBenchmarkRuns>
  > | null = null;
  let cacheCreatedAt = 0;
  let activeScan: Promise<
    Awaited<ReturnType<typeof discoverAvailableBenchmarkRuns>>
  > | null = null;

  const currentIndex = async () => {
    if (cachedIndex && Date.now() - cacheCreatedAt < 5_000) {
      return cachedIndex;
    }
    if (!activeScan) {
      activeScan = discoverAvailableBenchmarkRuns()
        .then((index) => {
          cachedIndex = index;
          cacheCreatedAt = Date.now();
          return index;
        })
        .finally(() => {
          activeScan = null;
        });
    }
    return activeScan;
  };
  invalidateBenchmarkIndex = () => {
    cachedIndex = null;
    cacheCreatedAt = 0;
  };

  return {
    name: "benchmark-available-runs",
    configResolved(config: ResolvedConfig) {
      isBuild = config.command === "build";
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url?.split("?", 1)[0];
        if (
          pathname !== availableRunsPath
          && pathname !== `/website-trial-v1${availableRunsPath}`
        ) {
          next();
          return;
        }
        try {
          const index = await currentIndex();
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(JSON.stringify(index));
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      });
    },
    async buildStart() {
      if (!isBuild) return;
      const index = await currentIndex();
      await fs.writeFile(
        path.join(benchmarkDataRoot, "available-runs.json"),
        `${JSON.stringify(index, null, 2)}\n`,
        "utf8",
      );
    },
  };
}

export default defineConfig(() => ({
  plugins: [benchmarkAvailableRunsPlugin(), react()],
  resolve: {
    alias: {
      "@data": path.resolve(__dirname, "data"),
    },
  },
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  // plotly.js-dist-min is a browser bundle; do not bundle raw `plotly.js` (pulls Node
  // shims like stream/buffer that break under Rolldown with "undefined.prototype").
  optimizeDeps: {
    include: ["plotly.js-dist-min"],
  },
}));
