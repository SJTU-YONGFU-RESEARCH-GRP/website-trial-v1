import fs from "node:fs/promises";
import path from "node:path";
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

async function isDisplayableRun(
  runDirectory: string,
  simulator: keyof typeof simulatorExtensions,
  manifest: JsonObject,
): Promise<boolean> {
  if (
    manifest.status !== "completed"
    || manifest.returnCode !== 0
    || manifest.astParsedInput !== true
    || manifest.parameterPreservingInput !== true
    || manifest.modelFallbackApplied !== false
    || (
      Array.isArray(manifest.internalFailureMarkers)
      && manifest.internalFailureMarkers.length > 0
    )
    || (
      Array.isArray(manifest.astCompatibilityAdjustments)
      && manifest.astCompatibilityAdjustments.length > 0
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
  let modelDirectories: Awaited<ReturnType<typeof fs.readdir>> = [];
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

// GitHub **project** Pages serves this app at /website-trial-v1/ (not repo root).
// Use an explicit prefix in prod so lazy chunks load from the right path.
export default defineConfig(({ mode }) => ({
  plugins: [benchmarkAvailableRunsPlugin(), react()],
  resolve: {
    alias: {
      "@data": path.resolve(__dirname, "data"),
    },
  },
  base: mode === "production" ? "/website-trial-v1/" : "/",
  // plotly.js-dist-min is a browser bundle; do not bundle raw `plotly.js` (pulls Node
  // shims like stream/buffer that break under Rolldown with "undefined.prototype").
  optimizeDeps: {
    include: ["plotly.js-dist-min"],
  },
}));
