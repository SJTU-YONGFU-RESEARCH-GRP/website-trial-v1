#!/usr/bin/env node

/**
 * generate-spice-benchmark-data.mjs
 * Scans data/spice-benchmark/runs/* to build a SpiceBenchmarkManifest.
 *
 * For each run:
 *   1. Reads run_manifest.json
 *   2. Reads REPORT.md
 *   3. Indexes all data/* files (.csv/.txt/.raw/.json), parses CSV/TXT → columns + rowCount
 *   4. Indexes all plots/*.png files, copies to public/benchmark/<run-id>/plots/
 *   5. Generates src/data/generatedSpiceBenchmarkManifest.ts
 *
 * Strictly excludes any path or name containing "sky130" or "skywater".
 */

import { readFileSync, readdirSync, statSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, relative, basename, extname, join } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const RUNS_DIR = resolve(ROOT, "data/spice-benchmark/runs");
const PUBLIC_DIR = resolve(ROOT, "public/benchmark");
const OUT_FILE = resolve(ROOT, "src/data/generatedSpiceBenchmarkManifest.ts");

const EXCLUDE_TERMS = ["sky130", "skywater"];

function isExcluded(str) {
  const lower = str.toLowerCase();
  return EXCLUDE_TERMS.some((t) => lower.includes(t));
}

function fileHash(filePath) {
  try {
    const buf = readFileSync(filePath);
    return createHash("md5").update(buf).digest("hex").slice(0, 8);
  } catch { return "unknown"; }
}

function parseCSVLike(text, delimiter) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { columns: null, rowCount: 0 };
  const header = lines[0].split(delimiter).map((h) => h.trim());
  return { columns: header, rowCount: lines.length - 1 };
}

function detectDelimiter(firstLine) {
  if (firstLine.includes(",")) return ",";
  if (firstLine.includes("\t")) return "\t";
  const spaces = firstLine.match(/\s{2,}/g);
  if (spaces && spaces.length >= 2) return /\s+/;
  return " ";
}

function copyDataFile(filePath, runId) {
  const destDir = resolve(PUBLIC_DIR, runId, "data");
  mkdirSync(destDir, { recursive: true });
  const dest = resolve(destDir, basename(filePath));
  try {
    copyFileSync(filePath, dest);
    return `/benchmark/${runId}/data/${basename(filePath)}`;
  } catch {
    console.warn(`  ⚠ Could not copy data file: ${filePath}`);
    return null;
  }
}

function indexDataFile(filePath, domain, runId) {
  const name = basename(filePath);
  const ext = extname(filePath).toLowerCase();
  const stat = statSync(filePath);
  const size = `${(stat.size / 1024).toFixed(1)} KB`;
  const hash = fileHash(filePath);
  const rel = relative(resolve(RUNS_DIR, "..", ".."), filePath);

  let format, columns, rowCount;
  if (ext === ".csv") {
    format = "csv";
    try {
      const txt = readFileSync(filePath, "utf-8");
      const parsed = parseCSVLike(txt, ",");
      columns = parsed.columns;
      rowCount = parsed.rowCount;
    } catch { columns = null; rowCount = -1; }
  } else if (ext === ".txt") {
    format = "txt";
    try {
      const txt = readFileSync(filePath, "utf-8");
      const delim = detectDelimiter(txt.split(/\r?\n/)[0]);
      const d = delim === /\s+/ ? " " : delim;
      const parsed = parseCSVLike(txt, d);
      columns = parsed.columns;
      rowCount = parsed.rowCount;
    } catch { columns = null; rowCount = -1; }
  } else if (ext === ".raw") {
    format = "raw";
    columns = null;
    rowCount = -1;
  } else if (ext === ".json") {
    format = "json";
    columns = null;
    rowCount = -1;
  } else {
    return null;
  }

  // Copy CSV/TXT data files to public/ for lazy fetch
  const fetchUrl = (ext === ".csv" || ext === ".txt") ? copyDataFile(filePath, runId) : null;

  return { name, relPath: rel, domain, format, size, hash, columns, rowCount, fetchUrl };
}

function copyPlot(filePath, runId) {
  const destDir = resolve(PUBLIC_DIR, runId, "plots");
  mkdirSync(destDir, { recursive: true });
  const dest = resolve(destDir, basename(filePath));
  try {
    copyFileSync(filePath, dest);
    return `/benchmark/${runId}/plots/${basename(filePath)}`;
  } catch {
    console.warn(`  ⚠ Could not copy ${filePath}`);
    return null;
  }
}

function assignDomain(name) {
  const n = name.toLowerCase();
  if (n.includes("dc") || n.includes("_iv") || n.includes("_id") || n.includes("transfer") || n.includes("kcl") || n.includes("bias")) return "dc";
  if (n.includes("ac") || n.includes("_cv") || n.includes("cv_") || n.includes("spar") || n.includes("s_param") || n.includes("nqs")) return "ac";
  if (n.includes("tran") || n.includes("switch") || n.includes("delay") || n.includes("waveform") || n.includes("pulse") || n.includes("energy") || n.includes("ringing")) return "transient";
  if (n.includes("noise") || n.includes("psd") || n.includes("flicker") || n.includes("thermal")) return "noise";
  return "overview";
}

function assignPlotDomain(name) {
  const n = name.toLowerCase();
  if (n.includes("dc")) return "dc";
  if (n.startsWith("ac") || n.includes("ac_") || n.includes("_cv") || n.includes("spar") || n.includes("s_param")) return "ac";
  if (n.startsWith("tran") || n.includes("tran_") || n.includes("waveform") || n.includes("switch")) return "transient";
  if (n.includes("noise") || n.includes("psd") || n.includes("flicker")) return "noise";
  if (n.includes("overview")) return "overview";
  // Heuristic: first segment
  const seg = n.split(/[-_]/)[0].toLowerCase();
  if (["dc","ac","tran","noise"].includes(seg)) return seg;
  return "overview";
}

function parseVerification(reportMd) {
  const tests = [];
  const sections = reportMd.split(/^##\s+/m);
  const domainMap = { "dc analysis": "dc", "ac analysis": "ac", "transient analysis": "transient", "noise analysis": "noise", "overview": "overview" };

  for (const section of sections) {
    const headMatch = section.match(/^(.+?)\n/);
    if (!headMatch) continue;
    const domainName = headMatch[1].trim().toLowerCase();
    const domain = domainMap[domainName] || "overview";

    const tableRe = /\|([^\n]+)\|/g;
    let match;
    let headerFound = false;
    while ((match = tableRe.exec(section)) !== null) {
      const cells = match[1].split("|").map((c) => c.trim());
      if (!headerFound && (cells[0] === "Test" || cells[0] === "Check")) { headerFound = true; continue; }
      if (!headerFound) continue;
      if (cells.length < 3) continue;
      const statusCell = (cells[2] || "").trim().toUpperCase();
      let status = "unavailable";
      if (statusCell === "PASS" || statusCell === "✓") status = "pass";
      else if (statusCell === "FAIL" || statusCell === "✗" || statusCell === "FAILED") status = "fail";
      else if (statusCell === "UNAVAILABLE" || statusCell === "N/A" || statusCell === "—") status = "unavailable";

      tests.push({
        testId: `${domain}_${tests.length + 1}`,
        domain,
        name: cells[0],
        status,
        detail: cells[3] || cells[2] || "",
      });
    }
  }

  return tests;
}

function parseReport(reportPath) {
  try {
    const md = readFileSync(reportPath, "utf-8");
    const simMatch = md.match(/\*\*Simulator:\*\*\s*(.+)/);
    const verMatch = md.match(/\*\*Simulator:\*\*\s*(\S+)\s*(\S*)/);
    const sim = simMatch ? simMatch[1].trim() : "ngspice";
    const ver = verMatch && verMatch[2] ? verMatch[2] : "unknown";
    const overallLine = md.match(/## Overall Result:\s*(\w+)/);
    let overall = "unavailable";
    if (overallLine) {
      const w = overallLine[1].toUpperCase();
      if (w === "PASS") overall = "pass";
      else if (w === "FAIL") overall = "fail";
    }
    const tests = parseVerification(md);
    return { reportMarkdown: md, simulator: sim, simulatorVersion: ver, overallStatus: overall, verificationTests: tests };
  } catch {
    return { reportMarkdown: "", simulator: "unknown", simulatorVersion: "", overallStatus: "unavailable", verificationTests: [] };
  }
}

function main() {
  console.log("[generate-spice-benchmark-data] scanning runs...");

  if (!existsSync(RUNS_DIR)) {
    console.warn("  ⚠ No runs directory at", RUNS_DIR);
    writeFileSync(OUT_FILE, `// Auto-generated — no runs found\nexport const SPICE_BENCHMARK_MANIFEST = { runs: {}, modelIds: [], models: {}, suiteIds: [], netlistSuites: {}, modelFormats: [], generatedAt: "", repoUrl: "" };\n`);
    return;
  }

  const runDirs = readdirSync(RUNS_DIR).filter((d) => {
    try { return statSync(resolve(RUNS_DIR, d)).isDirectory(); } catch { return false; }
  });

  const allRuns = {};
  const allModels = {};
  const allSuites = {};
  const modelIds = [];
  const suiteIds = [];
  const formatsSet = new Set();

  for (const dir of runDirs) {
    if (isExcluded(dir)) { console.log(`  ❌ Excluding: ${dir} (sky130/skywater)`); continue; }

    const runPath = resolve(RUNS_DIR, dir);
    const manifestPath = resolve(runPath, "run_manifest.json");
    const reportPath = resolve(runPath, "REPORT.md");
    const dataDir = resolve(runPath, "data");
    const plotsDir = resolve(runPath, "plots");

    if (!existsSync(manifestPath)) { console.warn(`  ⚠ No manifest for ${dir}, skipping`); continue; }

    console.log(`  📋 Processing: ${dir}`);

    let manifest;
    try { manifest = JSON.parse(readFileSync(manifestPath, "utf-8")); }
    catch { console.warn(`  ⚠ Invalid manifest for ${dir}, skipping`); continue; }

    const runId = manifest.runId || dir;
    if (isExcluded(runId)) { console.log(`  ❌ Excluding run: ${runId}`); continue; }
    if (manifest.modelPath && isExcluded(manifest.modelPath)) { console.log(`  ❌ Excluding model: ${manifest.modelPath}`); continue; }

    // Index data files
    const dataArtifacts = [];
    if (existsSync(dataDir)) {
      const dataFiles = readdirSync(dataDir).filter((f) => [".csv",".txt",".raw",".json",".dat"].includes(extname(f).toLowerCase()));
      for (const f of dataFiles) {
        const fp = resolve(dataDir, f);
        if (isExcluded(f) || isExcluded(fp.replace(RUNS_DIR, ""))) continue;
        const domain = assignDomain(f);
        const art = indexDataFile(fp, domain, runId);
        if (art) dataArtifacts.push(art);
      }
    }

    // Index plot files
    const plotArtifacts = [];
    if (existsSync(plotsDir)) {
      const plotFiles = readdirSync(plotsDir).filter((f) => [".png",".svg"].includes(extname(f).toLowerCase()));
      for (const f of plotFiles) {
        const fp = resolve(plotsDir, f);
        if (isExcluded(f)) continue;
        const url = copyPlot(fp, runId);
        if (url) {
          plotArtifacts.push({
            name: f,
            relPath: `plots/${f}`,
            domain: assignPlotDomain(f),
            format: extname(f).slice(1),
            size: `${(statSync(fp).size / 1024).toFixed(1)} KB`,
            displayUrl: url,
          });
        }
      }
    }

    // Parse report
    const report = existsSync(reportPath) ? parseReport(reportPath) : { reportMarkdown: "", simulator: "unknown", simulatorVersion: "", overallStatus: "unavailable", verificationTests: [] };

    const run = {
      runId,
      status: manifest.status || (dataArtifacts.length > 0 ? "completed" : "partial"),
      modelId: manifest.modelId || "",
      modelPath: manifest.modelPath || "",
      modelFormat: manifest.modelFormat || "ngspice",
      deviceName: manifest.deviceName || "",
      netlistSuite: manifest.netlistSuite || { suiteId: "", suiteName: "", dcCircuit: "", acCircuit: "", transientCircuit: "", noiseCircuit: "" },
      modes: manifest.modes || [],
      simulator: report.simulator,
      simulatorVersion: report.simulatorVersion,
      generatedAt: manifest.generatedAt || "",
      commitSha: manifest.commitSha || "",
      reportSummary: {
        reportPath: manifest.reportPath || "REPORT.md",
        reportMarkdown: report.reportMarkdown,
        simulator: report.simulator,
        simulatorVersion: report.simulatorVersion,
        overallStatus: report.overallStatus,
      },
      verificationTests: report.verificationTests,
      dataArtifacts,
      plotArtifacts,
      reportPath: manifest.reportPath || "REPORT.md",
    };
    allRuns[runId] = run;

    // Build models map
    const mId = manifest.modelId;
    if (mId && !allModels[mId]) {
      allModels[mId] = { modelId: mId, modelName: mId, modelPath: manifest.modelPath || "", modelFormat: manifest.modelFormat || "ngspice", deviceName: manifest.deviceName || "", deviceType: manifest.deviceName?.includes("PMOS") ? "PMOS" : "NMOS" };
      modelIds.push(mId);
    }
    if (manifest.modelFormat) formatsSet.add(manifest.modelFormat);

    // Build suites map
    const s = manifest.netlistSuite;
    if (s && s.suiteId && !allSuites[s.suiteId]) {
      allSuites[s.suiteId] = s;
      suiteIds.push(s.suiteId);
    }
  }

  const manifestData = {
    generatedAt: new Date().toISOString(),
    repoUrl: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark",
    runs: allRuns,
    modelIds,
    models: allModels,
    suiteIds,
    netlistSuites: allSuites,
    modelFormats: [...formatsSet],
  };

  // Write TypeScript output
  const ts = `// Auto-generated by generate-spice-benchmark-data.mjs
// Do not edit manually.
// Generated at: ${new Date().toISOString()}
// Runs processed: ${Object.keys(allRuns).length}
import type { SpiceBenchmarkManifest } from "./SpiceBenchmarkTypes";

export const SPICE_BENCHMARK_MANIFEST: SpiceBenchmarkManifest = ${JSON.stringify(manifestData, null, 2)};
`;
  writeFileSync(OUT_FILE, ts, "utf-8");
  console.log(`[generate-spice-benchmark-data] ✅ Written: ${OUT_FILE}`);
  console.log(`  Runs: ${Object.keys(allRuns).length}, Models: ${modelIds.length}, Suites: ${suiteIds.length}`);
}

main();
