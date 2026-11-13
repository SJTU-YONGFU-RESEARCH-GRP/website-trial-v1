/**
 * Merges UID-addressed Digital result JSON into `src/data/generatedDesignRows.ts`.
 *
 * Row files: every canonical
 * `data/digital-technologies/<md5>/results/<category>/<design>/wN/result.json` leaf.
 *
 * Technology defaults and `processNode` → effective nm mappings live in
 * `data/technology-map.json` (not merged as rows).
 *
 * Each row file may be:
 * - a JSON array of design objects `[{...}, {...}]` (all designs in one file), or
 * - `{ "rows": [ ... ] }` (same as above), or
 * - a single design object `{ ... }` (one design per file).
 * Every result should carry `category`; legacy `designFamily` remains a fallback.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const technologyStoreDir = path.join(dataDir, "digital-technologies");
const outFile = path.join(root, "src", "data", "generatedDesignRows.ts");

function technologyIdentity(processNode, canonicalTechnology, isNamedPdk) {
  return JSON.stringify({ schemaVersion: 1, processNode, canonicalTechnology, isNamedPdk });
}

function expectedTechnologyUid(processNode, canonicalTechnology, isNamedPdk) {
  return createHash("md5")
    .update(technologyIdentity(processNode, canonicalTechnology, isNamedPdk))
    .digest("hex");
}

/** Recursively collect only canonical Digital result leaves. */
function resultFilesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...resultFilesUnder(entryPath));
    else if (entry.isFile() && entry.name === "result.json") found.push(entryPath);
  }
  return found.sort((a, b) => a.localeCompare(b, "en"));
}

/** Load and validate MD5-addressed Technology resources and their result leaves. */
function loadTechnologyResources(dir) {
  if (!fs.existsSync(dir)) return [];
  const resources = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!/^[a-f0-9]{32}$/.test(entry.name)) {
      throw new Error(`[generate-design-data] non-MD5 directory in ${dir}: ${entry.name}`);
    }
    const resourceDir = path.join(dir, entry.name);
    const manifestPath = path.join(resourceDir, "technology.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`[generate-design-data] missing ${manifestPath}`);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const key of ["uid", "processNode", "displayName", "canonicalTechnology", "isNamedPdk"]) {
      if (manifest[key] === undefined) {
        throw new Error(`[generate-design-data] ${manifestPath}: missing ${key}`);
      }
    }
    const expectedUid = expectedTechnologyUid(
      String(manifest.processNode),
      String(manifest.canonicalTechnology),
      Boolean(manifest.isNamedPdk),
    );
    if (manifest.uid !== entry.name || expectedUid !== entry.name) {
      throw new Error(
        `[generate-design-data] ${manifestPath}: directory, manifest UID, and identity MD5 must match`,
      );
    }
    resources.push({
      uid: entry.name,
      dir: resourceDir,
      manifest,
      resultFiles: resultFilesUnder(path.join(resourceDir, "results")),
    });
  }
  return resources.sort((a, b) => a.uid.localeCompare(b.uid, "en"));
}

/**
 * @returns {{
 *   defaultProcessNode: string;
 *   effectiveNmByProcessNode: Record<string, number>;
 *   namedKitIds: Set<string>;
 * }}
 */
function loadTechnologyMap(dir) {
  const filePath = path.join(dir, "technology-map.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[generate-design-data] missing ${filePath} (technology defaults and processNode mappings)`,
    );
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    throw new Error(`[generate-design-data] invalid JSON in ${filePath}: ${e}`);
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`[generate-design-data] ${filePath}: expected a JSON object`);
  }
  const defaultProcessNode = raw.defaultProcessNode;
  if (typeof defaultProcessNode !== "string" || !defaultProcessNode.trim()) {
    throw new Error(`[generate-design-data] ${filePath}: require string "defaultProcessNode"`);
  }
  const effectiveNmByProcessNode = raw.effectiveNmByProcessNode;
  if (
    effectiveNmByProcessNode === null ||
    typeof effectiveNmByProcessNode !== "object" ||
    Array.isArray(effectiveNmByProcessNode)
  ) {
    throw new Error(`[generate-design-data] ${filePath}: require object "effectiveNmByProcessNode"`);
  }
  const namedKitIds = raw.namedKitIds;
  if (!Array.isArray(namedKitIds) || !namedKitIds.every((x) => typeof x === "string")) {
    throw new Error(`[generate-design-data] ${filePath}: require string[] "namedKitIds"`);
  }
  /** @type {Record<string, number>} */
  const effectiveMap = {};
  for (const [k, v] of Object.entries(effectiveNmByProcessNode)) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(
        `[generate-design-data] ${filePath}: effectiveNmByProcessNode["${k}"] must be a finite number`,
      );
    }
    effectiveMap[k] = v;
  }
  return {
    defaultProcessNode: defaultProcessNode.trim(),
    effectiveNmByProcessNode: effectiveMap,
    namedKitIds: new Set(namedKitIds.map((s) => s.trim()).filter(Boolean)),
  };
}

/** JSON key `processNode` holds the technology node id (nm label or kit name). */
const REQUIRED_KEYS = [
  "architecture",
  "bitWidth",
  "processNode",
  "fmaxMhz",
  "powerMw",
  "areaUm2",
];

/**
 * @param {Record<string, number>} effectiveNmByProcessNode
 * @param {string} processNode
 * @returns {number | undefined}
 */
function effectiveNmForProcessNode(effectiveNmByProcessNode, processNode) {
  if (effectiveNmByProcessNode[processNode] !== undefined) {
    return effectiveNmByProcessNode[processNode];
  }
  const m = /^(\d+)nm$/i.exec(processNode);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} processNode
 * @param {Record<string, number>} effectiveNmByProcessNode
 * @returns {string}
 */
function canonicalTechnologyFromRow(row, processNode, effectiveNmByProcessNode) {
  if (row.canonicalTechnology != null && String(row.canonicalTechnology).trim() !== "") {
    return String(row.canonicalTechnology);
  }
  const nm = effectiveNmForProcessNode(effectiveNmByProcessNode, processNode);
  if (nm !== undefined) return `${nm}nm`;
  return processNode;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} processNode
 * @param {Set<string>} namedKitIds
 * @returns {boolean}
 */
function isNamedPdkFromRow(row, processNode, namedKitIds) {
  if (typeof row.isNamedPdk === "boolean") return row.isNamedPdk;
  if (namedKitIds.has(processNode)) return true;
  return !/^\d+nm$/i.test(processNode);
}

/**
 * @param {unknown} row
 * @param {string} sourceFile
 * @returns {asserts row is Record<string, unknown>}
 */
function assertRow(row, sourceFile) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`${sourceFile}: each row must be an object`);
  }
  for (const k of REQUIRED_KEYS) {
    if (row[k] === undefined) {
      throw new Error(`${sourceFile}: row missing required field "${k}"`);
    }
  }
}

/**
 * Reads design row(s) from one JSON file: array, `{ rows: [...] }`, or a single row object.
 *
 * @param {string} filePath
 * @returns {unknown[]}
 */
function readRowsArray(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const base = path.basename(filePath);
  if (Array.isArray(data)) return data;
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    if (Object.prototype.hasOwnProperty.call(data, "rows")) {
      if (!Array.isArray(data.rows)) {
        throw new Error(`${base}: property "rows" must be an array`);
      }
      return data.rows;
    }
    return [data];
  }
  throw new Error(
    `${base}: expected a JSON array, an object with a "rows" array, or one design object`,
  );
}

/**
 * Category id: explicit `category`, else legacy `designFamily`, else JSON file stem.
 *
 * @param {Record<string, unknown>} row
 * @param {string} fileStem
 */
function categoryFromRow(row, fileStem) {
  if (row.category != null) return String(row.category);
  if (row.designFamily != null) return String(row.designFamily);
  return fileStem;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} fileStem
 * @param {{
 *   effectiveNmByProcessNode: Record<string, number>;
 *   namedKitIds: Set<string>;
 * }} tech
 */
function normalizeRow(row, fileStem, tech) {
  const processNode = String(row.processNode);
  return {
    architecture: String(row.architecture),
    bitWidth: Number(row.bitWidth),
    processNode,
    canonicalTechnology: canonicalTechnologyFromRow(row, processNode, tech.effectiveNmByProcessNode),
    isNamedPdk: isNamedPdkFromRow(row, processNode, tech.namedKitIds),
    fmaxMhz: Number(row.fmaxMhz),
    powerMw: Number(row.powerMw),
    areaUm2: Number(row.areaUm2),
    category: categoryFromRow(row, fileStem),
  };
}

/**
 * @param {ReturnType<typeof normalizeRow>} r
 */
function formatTsRow(r) {
  const parts = [
    `architecture: ${JSON.stringify(r.architecture)}`,
    `bitWidth: ${r.bitWidth}`,
    `processNode: ${JSON.stringify(r.processNode)}`,
    `canonicalTechnology: ${JSON.stringify(r.canonicalTechnology)}`,
    `isNamedPdk: ${r.isNamedPdk}`,
    `fmaxMhz: ${r.fmaxMhz}`,
    `powerMw: ${r.powerMw}`,
    `areaUm2: ${r.areaUm2}`,
    `category: ${JSON.stringify(r.category)}`,
  ];
  return `  { ${parts.join(", ")} }`;
}

/**
 * @param {ReturnType<typeof normalizeRow>[]} rows
 * @returns {string[]}
 */
function uniqueCategoryIdsSorted(rows) {
  const set = new Set();
  for (const r of rows) {
    if (r.category) set.add(r.category);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * Technology resources exposed to the Digital selector.
 *
 * @param {ReturnType<typeof normalizeRow>[]} rows
 * @param {{
 *   defaultProcessNode: string;
 *   effectiveNmByProcessNode: Record<string, number>;
 *   namedKitIds: Set<string>;
 * }} tech
 * @param {ReturnType<typeof loadTechnologyResources>} resources
 */
function technologyCatalog(rows, tech, resources) {
  const rowNodes = new Set(rows.map((row) => row.processNode));
  const catalog = resources
    .filter((resource) => rowNodes.has(String(resource.manifest.processNode)))
    .map((resource) => ({
      uid: resource.uid,
      processNode: String(resource.manifest.processNode),
      displayName: String(resource.manifest.displayName),
      canonicalTechnology: String(resource.manifest.canonicalTechnology),
      isNamedPdk: Boolean(resource.manifest.isNamedPdk),
      pdk: resource.manifest.pdk == null ? undefined : String(resource.manifest.pdk),
      standardCellLibrary: resource.manifest.standardCellLibrary == null
        ? undefined
        : String(resource.manifest.standardCellLibrary),
      corner: resource.manifest.corner == null ? undefined : String(resource.manifest.corner),
    }));
  catalog.sort((left, right) => {
    if (left.isNamedPdk !== right.isNamedPdk) return left.isNamedPdk ? 1 : -1;
    const leftNm = effectiveNmForProcessNode(tech.effectiveNmByProcessNode, left.processNode);
    const rightNm = effectiveNmForProcessNode(tech.effectiveNmByProcessNode, right.processNode);
    if (!left.isNamedPdk && leftNm !== undefined && rightNm !== undefined && leftNm !== rightNm) {
      return leftNm - rightNm;
    }
    return left.processNode.localeCompare(right.processNode, "en");
  });
  for (const node of rowNodes) {
    if (!catalog.some((technology) => technology.processNode === node)) {
      throw new Error(`[generate-design-data] result rows reference technology without manifest: ${node}`);
    }
  }
  const uids = catalog.map((technology) => technology.uid);
  if (uids.some((uid) => !/^[a-f0-9]{32}$/.test(uid))) {
    throw new Error("[generate-design-data] technology UID is not a 32-character MD5");
  }
  if (new Set(uids).size !== uids.length) {
    throw new Error("[generate-design-data] duplicate technology UID");
  }
  return catalog;
}

/** @param {ReturnType<typeof technologyCatalog>[number]} technology */
function formatTsTechnology(technology) {
  const optional = [
    technology.pdk == null ? "" : `, pdk: ${JSON.stringify(technology.pdk)}`,
    technology.standardCellLibrary == null ? "" : `, standardCellLibrary: ${JSON.stringify(technology.standardCellLibrary)}`,
    technology.corner == null ? "" : `, corner: ${JSON.stringify(technology.corner)}`,
  ].join("");
  return `  { uid: ${JSON.stringify(technology.uid)}, processNode: ${JSON.stringify(technology.processNode)}, displayName: ${JSON.stringify(technology.displayName)}, canonicalTechnology: ${JSON.stringify(technology.canonicalTechnology)}, isNamedPdk: ${technology.isNamedPdk}${optional} }`;
}

/**
 * @param {string} s
 * @returns {string}
 */
function tsStringLiteral(s) {
  return JSON.stringify(s);
}

function main() {
  const tech = loadTechnologyMap(dataDir);
  const resources = loadTechnologyResources(technologyStoreDir);
  const inputFiles = resources.flatMap((resource) =>
    resource.resultFiles.map((filePath) => ({ resource, filePath })),
  );
  const combined = [];

  for (const { resource, filePath } of inputFiles) {
    const name = path.relative(dataDir, filePath);
    const fileStem = path.basename(path.dirname(path.dirname(filePath)));
    const rows = readRowsArray(filePath);
    for (const row of rows) {
      assertRow(row, name);
      const normalized = normalizeRow(row, fileStem, tech);
      if (normalized.processNode !== resource.manifest.processNode) {
        throw new Error(
          `[generate-design-data] ${name}: processNode ${normalized.processNode} does not match ${resource.manifest.processNode}`,
        );
      }
      combined.push(normalized);
    }
  }

  if (combined.length === 0) {
    throw new Error(
      `[generate-design-data] no rows found: add one or more *.json files under ${dataDir}`,
    );
  }

  const categoryIds = uniqueCategoryIdsSorted(combined);
  if (categoryIds.length === 0) {
    throw new Error(`[generate-design-data] rows missing category after normalize`);
  }

  const categoryIdsTs = categoryIds.map((id) => tsStringLiteral(id)).join(", ");
  const technologies = technologyCatalog(combined, tech, resources);
  const sourceList = `${inputFiles.length} result.json leaves under data/digital-technologies/<md5>/results`;
  const namedKitSorted = [...tech.namedKitIds].sort((a, b) => a.localeCompare(b, "en"));
  const namedKitTs = namedKitSorted.map((id) => tsStringLiteral(id)).join(", ");
  const defaultNodeTs = tsStringLiteral(tech.defaultProcessNode);

  const header = `/**
 * Combined design rows from ${sourceList}.
 * Technology defaults and kit ids from \`data/technology-map.json\`.
 * AUTO-GENERATED by scripts/generate-design-data.mjs. Run: npm run generate:data
 * Do not edit by hand; change JSON under /data instead.
 */

import type { DesignRow } from "./designTypes";

export type DesignTechnology = {
  /** Stable 32-character MD5 UID used by the Digital technology selector. */
  uid: string;
  /** Legacy row join key; retained while result rows still store \`processNode\`. */
  processNode: string;
  displayName: string;
  canonicalTechnology: string;
  isNamedPdk: boolean;
  pdk?: string;
  standardCellLibrary?: string;
  corner?: string;
};

/** Distinct \`category\` values present in the merged rows (sorted). */
export const DESIGN_CATEGORY_IDS = [${categoryIdsTs}] as const;

export type DesignCategoryId = (typeof DESIGN_CATEGORY_IDS)[number];

/** From \`data/technology-map.json\` — UI default and row filter baseline. */
export const DEFAULT_TECHNOLOGY_NODE = ${defaultNodeTs};

/** Named PDK / kit \`processNode\` ids from \`data/technology-map.json\` (sorted). */
export const NAMED_KIT_PROCESS_NODES = [${namedKitTs}] as const;

/** UID-backed technology resources available to Digital charts. */
export const DESIGN_TECHNOLOGIES: readonly DesignTechnology[] = [
${technologies.map(formatTsTechnology).join(",\n")}
];

export const DESIGN_ROWS: DesignRow[] = [
${combined.map(formatTsRow).join(",\n")}
];
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, header, "utf8");
  console.log(
    `[generate-design-data] merged ${inputFiles.length} UID-addressed result(s) → ${combined.length} rows, categories: ${categoryIds.join(", ")} → ${path.relative(root, outFile)}`,
  );
}

main();
