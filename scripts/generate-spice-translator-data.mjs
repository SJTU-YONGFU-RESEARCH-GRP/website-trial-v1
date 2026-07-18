#!/usr/bin/env node
/**
 * generate-spice-translator-data.mjs
 * Indexes docs/finalbatchrun2/ from new-spice-translator.
 * Produces result-oriented manifest: one Full Batch Result + per-PDK/target results.
 * Copies markdown reports to public/ for lazy fetch.
 * Probes PNG dimensions for plot layout.
 */

import { readFileSync, readdirSync, statSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, basename, extname } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = resolve(ROOT, "public/translator");
const OUT_FILE = resolve(ROOT, "src/data/generatedSpiceTranslatorManifest.ts");
const JSON_FILE = resolve(ROOT, "src/data/generatedSpiceTranslatorManifest.json");

const SOURCE_PRIORITY = [
  process.env.TRANSLATOR_SOURCE,
  resolve(ROOT, "external", "new-spice-translator"),
  resolve(ROOT, "..", "new-spice-translator"),
].filter(Boolean);

let SOURCE_DIR = null;
for (const p of SOURCE_PRIORITY) { if (existsSync(resolve(p, "docs", "finalbatchrun2"))) { SOURCE_DIR = p; break; } }
if (!SOURCE_DIR) { console.error("No new-spice-translator source found"); process.exit(1); }

const FINAL_DIR = resolve(SOURCE_DIR, "docs/finalbatchrun2");
const EXCLUDE_TERMS = ["private-models", "private_models"];

function isExcluded(s) { return EXCLUDE_TERMS.some(t => s.includes(t)); }
function fileHash(p) { try { return createHash("md5").update(readFileSync(p)).digest("hex").slice(0, 8); } catch { return "unknown"; } }
function fmtSize(b) { return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`; }

function copyToPublic(src, subdir) {
  const destDir = resolve(PUBLIC_DIR, subdir);
  mkdirSync(destDir, { recursive: true });
  const h = fileHash(src); const ext = extname(src);
  const dn = `${basename(src, ext)}_${h}${ext}`;
  const dest = resolve(destDir, dn);
  try { copyFileSync(src, dest); return `translator/${subdir}/${dn}`; } catch { return null; }
}

/** Probe PNG dimensions from header bytes (no external deps). */
function probePngSize(filePath) {
  try {
    const buf = readFileSync(filePath);
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    return { width: w, height: h, aspectRatio: +(w / h).toFixed(3) };
  } catch { return null; }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return { columns: headers, rows: lines.slice(1).map(l => { const v = l.split(","); const o = {}; headers.forEach((h, i) => o[h] = v[i]?.trim() ?? ""); return o; }) };
}

function extractHero(md) {
  const nums = {};
  const m = (re, key) => { const match = md.match(re); if (match) nums[key] = match[1].trim(); };
  m(/files discovered:\s*\*?\*?(\d+)/i, "sourceFiles");
  m(/Successful translations:\s*\*?\*?(\d+)/i, "successfulTranslations");
  m(/Models translated:\s*\*?\*?([\d,]+)/i, "modelsTranslated");
  m(/Verification result:\s*\*?\*?(\d+)\/(\d+)/i, "verification");
  m(/Round-trip consistency:\s*\*?\*?(\d+)\/(\d+)/i, "roundTrip");
  m(/Monte Carlo stability:\s*\*?\*?(\d+)\/(\d+)/i, "monteCarlo");
  if (!nums.sourceFiles) { const m2 = md.match(/Source files discovered[:\s]*\*?\*?(\d+)/i); if (m2) nums.sourceFiles = m2[1]; }
  return nums;
}

function main() {
  console.log(`[generate-spice-translator-data] source: ${SOURCE_DIR}`);

  // Index all files
  const allMarkdowns = []; const allJsons = []; const allCsvs = []; const allPlots = []; const allTexs = []; const allOthers = [];

  const index = (dir, relPrefix = "") => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const fp = resolve(dir, entry);
      if (isExcluded(fp)) continue;
      let st; try { st = statSync(fp); } catch { continue; }
      if (st.isDirectory()) { index(fp, relPrefix + entry + "/"); continue; }
      const ext = extname(entry).toLowerCase();
      const relP = relPrefix + entry;
      const sz = fmtSize(st.size);
      const h = fileHash(fp);

      if (ext === ".md") {
        const fetchUrl = copyToPublic(fp, "reports");
        allMarkdowns.push({ name: entry, relPath: relP, size: sz, hash: h, fetchUrl, content: readFileSync(fp, "utf-8") });
      } else if (ext === ".json") {
        let parsed = null; try { parsed = JSON.parse(readFileSync(fp, "utf-8")); } catch { }
        allJsons.push({ name: entry, relPath: relP, size: sz, hash: h, parsed });
      } else if (ext === ".csv") {
        allCsvs.push({ name: entry, relPath: relP, size: sz, hash: h, ...parseCsv(readFileSync(fp, "utf-8")) });
      } else if (ext === ".tex") {
        allTexs.push({ name: entry, relPath: relP, size: sz, hash: h, format: "tex" });
      } else if (ext === ".png" || ext === ".svg") {
        const displayUrl = copyToPublic(fp, "plots");
        const dims = ext === ".png" ? probePngSize(fp) : null;
        allPlots.push({ name: entry, relPath: relP, format: ext.slice(1), size: sz, hash: h, displayUrl, ...(dims || {}) });
      } else {
        allOthers.push({ name: entry, relPath: relP, size: sz, hash: h, format: ext || "unknown" });
      }
    }
  };
  index(FINAL_DIR);

  // ─── Build results ───
  const results = [];

  // 1. Full Batch Result (FINALBATCHRUN2.md + all plots)
  const batchMd = allMarkdowns.find(f => f.name === "FINALBATCHRUN2.md");
  const reportMarkdown = batchMd?.content || "";
  const batchHero = reportMarkdown ? extractHero(reportMarkdown) : {};
  if (batchMd) {
    results.push({
      resultId: "full-batch",
      title: "Full Batch Translation Result",
      description: "17 PDKs, full translation pipeline with verification. FINALBATCHRUN2 complete report.",
      kind: "batch",
      pdk: "all", sourceFormat: "all", targetFormat: "all",
      generatedAt: "2026-04-19", status: "completed",
      reports: [{
        name: batchMd.name, relPath: batchMd.relPath, size: batchMd.size, hash: batchMd.hash,
        fetchUrl: batchMd.fetchUrl,
      }],
      plots: allPlots.map(p => ({
        name: p.name, relPath: p.relPath, format: p.format, size: p.size, hash: p.hash,
        displayUrl: p.displayUrl, width: p.width, height: p.height, aspectRatio: p.aspectRatio,
      })),
      dataArtifacts: [
        ...allCsvs.map(c => ({ name: c.name, relPath: c.relPath, format: "csv", size: c.size, hash: c.hash, rows: c.rows, rowCount: c.rows?.length, columns: c.columns })),
        ...allJsons.map(j => ({ name: j.name, relPath: j.relPath, format: "json", size: j.size, hash: j.hash })),
      ],
      otherArtifacts: [...allTexs, ...allOthers],
      summary: {
        totalReports: 1, totalPlots: allPlots.length, totalData: allCsvs.length + allJsons.length,
        hero: { ...batchHero, pdks: "17" },
      },
    });
  }

  // 2. PDK/target results from CSV
  const summaryCsv = allCsvs.find(c => c.name === "pdk_translation_summary.csv");
  if (summaryCsv?.rows) {
    for (const row of summaryCsv.rows) {
      const pdk = row["pdk"] || row["pdk"] || row["PDK"] || ""; const src = row["source_format"] || row["source_format"] || row["Source"] || ""; const tgt = row["target"] || row["target"] || row["Target"] || "";
      if (!pdk) continue;
      const rid = `pdk-${pdk}-${src}-${tgt}`.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
      const files = row["total_files"] || row["Files"] || "?";
      const succ = row["successful"] || row["Successful"] || "?";
      const rate = row["success_rate_percent"] || row["success_rate_percent"] || row["Success %"] || "?";
      const models = row["models_out"] || row["Models Out"] || "?";
      results.push({
        resultId: rid,
        title: `${pdk}: ${src} → ${tgt}`,
        description: `${files} files, ${succ} successful, ${rate}% success rate, ${models} models out.`,
        kind: "pdk_target",
        pdk, sourceFormat: src, targetFormat: tgt,
        generatedAt: "2026-04-19", status: parseFloat(row["success_rate_percent"] || row["Success %"] || "0") >= 100 ? "completed" : "partial",
        reports: [],
        plots: [],
        dataArtifacts: [{ name: summaryCsv.name, relPath: summaryCsv.relPath, format: "csv", size: summaryCsv.size, hash: summaryCsv.hash, rows: summaryCsv.rows?.filter(r => r["PDK"] === pdk && r["Source"] === src && r["Target"] === tgt), rowCount: summaryCsv.rows?.filter(r => r["PDK"] === pdk && r["Source"] === src && r["Target"] === tgt).length, columns: summaryCsv.columns }],
        otherArtifacts: [],
        summary: { totalReports: 0, totalPlots: 0, totalData: 1 },
      });
    }
  }

  // Ensure default
  const defaultResultId = results.length > 0 ? results[0].resultId : "";

  const manifest = {
    generatedAt: new Date().toISOString(),
    results,
    defaultResultId,
    allPdks: [...new Set(results.map(r => r.pdk).filter(Boolean))],
    allSourceFormats: [...new Set(results.map(r => r.sourceFormat).filter(Boolean))],
    allTargetFormats: [...new Set(results.map(r => r.targetFormat).filter(Boolean))],
  };

  // Write JSON snapshot (without heavy content)
  const jsonManifest = {
    ...manifest,
    results: manifest.results.map(r => ({
      ...r,
      dataArtifacts: r.dataArtifacts.map(d => ({ ...d, rows: undefined })),
    })),
  };
  writeFileSync(JSON_FILE, JSON.stringify(jsonManifest, null, 2), "utf-8");

  // Write TS (no embedded markdown content — fetched from public/)
  const ts = `// Auto-generated: ${new Date().toISOString()}
import type { SpiceTranslatorManifest } from "./SpiceTranslatorTypes";
export const TRANSLATOR_MANIFEST: SpiceTranslatorManifest = ${JSON.stringify(jsonManifest, null, 2)};
`;
  writeFileSync(OUT_FILE, ts, "utf-8");

  console.log(`✅ Results: ${results.length} (batch:${results.filter(r=>r.kind==="batch").length} pdk:${results.filter(r=>r.kind==="pdk_target").length})`);
  console.log(`   Reports: ${allMarkdowns.length}, Plots: ${allPlots.length}, CSV: ${allCsvs.length}, JSON: ${allJsons.length}`);
}

main();
