#!/usr/bin/env node
/**
 * One-time migration of legacy `data/*.json` design rows into the UID-addressed
 * Digital technology store:
 *
 *   data/digital-technologies/<technology-md5>/
 *     technology.json
 *     results/<category>/<architecture>/w<width>/result.json
 *
 * The MD5 is derived from stable public technology identity metadata, matching
 * the UID contract consumed by the frontend selector. Original row files are
 * removed only after every normalized result has been written successfully.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const storeDir = path.join(dataDir, "digital-technologies");
const mapPath = path.join(dataDir, "technology-map.json");

function technologyIdentity(processNode, canonicalTechnology, isNamedPdk) {
  return JSON.stringify({
    schemaVersion: 1,
    processNode,
    canonicalTechnology,
    isNamedPdk,
  });
}

function technologyUid(processNode, canonicalTechnology, isNamedPdk) {
  return createHash("md5")
    .update(technologyIdentity(processNode, canonicalTechnology, isNamedPdk))
    .digest("hex");
}

function rowsFromJson(value, source) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, "rows")) {
      if (!Array.isArray(value.rows)) throw new Error(`${source}: rows must be an array`);
      return value.rows;
    }
    return [value];
  }
  throw new Error(`${source}: expected a row, row array, or { rows: [...] }`);
}

function safeSegment(value, label) {
  const segment = String(value).trim();
  if (!segment || segment === "." || segment === ".." || /[\\/]/.test(segment)) {
    throw new Error(`unsafe ${label}: ${JSON.stringify(value)}`);
  }
  return segment;
}

function main() {
  const technologyMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const displayNames = {
    cfet: "CFET",
    gf180: "GF180MCU",
    ihpsg13g2: "IHP SG13G2",
    freepdk45: "FreePDK45",
  };
  const named = new Set(technologyMap.namedKitIds);
  const sourceFiles = fs.readdirSync(dataDir)
    .filter((name) => name.endsWith(".json") && name !== "technology-map.json")
    .sort((a, b) => a.localeCompare(b, "en"));

  const writes = [];
  const manifests = new Map();
  for (const sourceName of sourceFiles) {
    const sourcePath = path.join(dataDir, sourceName);
    const fileStem = path.basename(sourceName, ".json");
    const rows = rowsFromJson(JSON.parse(fs.readFileSync(sourcePath, "utf8")), sourceName);
    for (const rawRow of rows) {
      if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
        throw new Error(`${sourceName}: invalid row`);
      }
      const processNode = safeSegment(rawRow.processNode, "processNode");
      const effectiveNm = technologyMap.effectiveNmByProcessNode[processNode]
        ?? (/^(\d+)nm$/i.exec(processNode)?.[1]
          ? Number(/^(\d+)nm$/i.exec(processNode)[1])
          : undefined);
      const canonicalTechnology = String(
        rawRow.canonicalTechnology ?? (effectiveNm ? `${effectiveNm}nm` : processNode),
      );
      const isNamedPdk = typeof rawRow.isNamedPdk === "boolean"
        ? rawRow.isNamedPdk
        : named.has(processNode) || !/^\d+nm$/i.test(processNode);
      const uid = technologyUid(processNode, canonicalTechnology, isNamedPdk);
      const category = safeSegment(rawRow.category ?? rawRow.designFamily ?? fileStem, "category");
      const architecture = safeSegment(rawRow.architecture, "architecture");
      const bitWidth = Number(rawRow.bitWidth);
      if (!Number.isInteger(bitWidth) || bitWidth <= 0) {
        throw new Error(`${sourceName}: invalid bitWidth ${rawRow.bitWidth}`);
      }
      const resultPath = path.join(
        storeDir,
        uid,
        "results",
        category,
        architecture,
        `w${bitWidth}`,
        "result.json",
      );
      if (writes.some((item) => item.resultPath === resultPath)) {
        throw new Error(`duplicate Digital result target: ${resultPath}`);
      }
      writes.push({
        resultPath,
        row: {
          ...rawRow,
          category,
          processNode,
          canonicalTechnology,
          isNamedPdk,
        },
      });
      manifests.set(uid, {
        schemaVersion: 1,
        uid,
        processNode,
        displayName: displayNames[processNode] ?? processNode,
        canonicalTechnology,
        isNamedPdk,
        identity: JSON.parse(technologyIdentity(processNode, canonicalTechnology, isNamedPdk)),
      });
    }
  }

  for (const { resultPath, row } of writes) {
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(resultPath, `${JSON.stringify(row, null, 2)}\n`, "utf8");
  }
  for (const [uid, manifest] of manifests) {
    const manifestPath = path.join(storeDir, uid, "technology.json");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  // Every row has now been materialized in its MD5 directory. Git retains full
  // recovery/history for these tracked sources after the migration.
  for (const sourceName of sourceFiles) fs.unlinkSync(path.join(dataDir, sourceName));
  console.log(
    `[migrate-digital-data] ${sourceFiles.length} source file(s) -> ${writes.length} result(s) in ${manifests.size} UID directories`,
  );
}

main();
