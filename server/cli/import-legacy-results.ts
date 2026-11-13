import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { JsonObject, ModuleId, ResultRecordV1 } from "../../shared/contracts/v1.ts";
import { DESIGN_ROWS } from "../../src/data/generatedDesignRows.ts";
import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";
import { makeRepositories } from "../app/db/repositories.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = loadConfig();
const database = new EdaDatabase(config.databasePath);
database.migrate();
const repositories = makeRepositories(database);

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function jsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("legacy result row must be an object");
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function publish(moduleId: ModuleId, key: string, title: string, summary: JsonObject, data: JsonObject, createdAt: string, inputSha256: string): boolean {
  const id = `legacy-${moduleId}-${hash(key).slice(0, 24)}`;
  const exists = database.sqlite.prepare(`SELECT 1 present FROM ${moduleId}_results WHERE id=?`).get(id);
  if (exists) return false;
  const record: ResultRecordV1 = {
    schemaVersion: "eda.result.v1",
    id,
    moduleId,
    ownerId: null,
    lifecycle: "published",
    title,
    summary,
    data,
    provenance: {
      origin: "legacy-bundled",
      jobId: null,
      ownerId: null,
      inputManifestSha256: inputSha256,
      parameters: {},
      capabilityVersion: "legacy-bundled.v1",
      toolConfigurations: [],
      toolVersions: {},
      parserId: `legacy-${moduleId}-importer`,
      parserVersion: "1.0.0",
      createdAt,
    },
    artifactIds: [],
    createdAt,
    updatedAt: createdAt,
    publishedAt: createdAt,
  };
  repositories.results.insert(record);
  return true;
}

async function loadJson(relativePath: string): Promise<JsonObject> {
  return jsonObject(JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8")));
}

let inserted = 0;
const generatedAt = new Date().toISOString();
for (const row of DESIGN_ROWS) {
  const data = jsonObject(row);
  inserted += Number(publish(
    "digital",
    JSON.stringify(row),
    `${row.architecture} · ${row.processNode} · ${row.bitWidth}-bit`,
    jsonObject({ fmaxMhz: row.fmaxMhz, powerMw: row.powerMw, areaUm2: row.areaUm2 }),
    data,
    generatedAt,
    hash(row),
  ));
}

const ppaIndex = await loadJson("data/ppa-analysis/available-runs.json");
for (const value of Array.isArray(ppaIndex.runs) ? ppaIndex.runs : []) {
  const run = jsonObject(value);
  const uid = String(run.uid || hash(run));
  inserted += Number(publish(
    "ppa",
    uid,
    `${String(run.flow || "PPA")} · ${String(run.pdk || "unknown")} · ${String(run.design || "design")}`,
    jsonObject(run.summary || {}),
    jsonObject({ manifest: run, reportPath: run.reportPath ?? null }),
    typeof ppaIndex.generatedAt === "string" ? ppaIndex.generatedAt : generatedAt,
    typeof run.sourceSha256 === "string" ? run.sourceSha256 : hash(run),
  ));
}

const benchmarkIndex = await loadJson("data/spice-model-benchmark/available-runs.json");
for (const value of Array.isArray(benchmarkIndex.runs) ? benchmarkIndex.runs : []) {
  const run = jsonObject(value);
  const manifest = jsonObject(run.manifest || {});
  const key = `${String(run.md5 || hash(run))}:${String(run.simulator || "unknown")}`;
  const createdAt = typeof manifest.finishedAt === "string" ? manifest.finishedAt : generatedAt;
  inserted += Number(publish(
    "benchmark",
    key,
    `${String(run.modelId || "model")} · ${String(run.simulator || "simulator")}`,
    jsonObject({ simulator: run.simulator ?? null, status: manifest.status ?? null, elapsedSeconds: manifest.elapsedSeconds ?? null, peakRssKiB: manifest.peakRssKiB ?? null }),
    jsonObject({ run }),
    createdAt,
    hash(run),
  ));
}

console.log(JSON.stringify({ inserted, databasePath: config.databasePath, origin: "legacy-bundled" }));
database.close();
