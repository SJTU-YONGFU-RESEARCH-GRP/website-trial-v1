#!/usr/bin/env node

/**
 * generate-spice-benchmark-data.mjs
 *
 * Scans result directories to build a SpiceBenchmarkManifest.
 * Sources (in priority order):
 *   1. SPICE_BENCHMARK_SOURCE env var
 *   2. ../spice_model_benchmark (local fallback)
 *   3. data/spice-benchmark/runs (fixture fallback)
 *
 * For each result root, recursively indexes ALL files.
 * Copies data/plot files to public/benchmark/<run-id>/.
 * Generates src/data/generatedSpiceBenchmarkManifest.ts.
 * Strictly excludes paths containing "sky130" or "skywater".
 */

import {
  readFileSync, readdirSync, statSync, copyFileSync,
  existsSync, mkdirSync, writeFileSync, createReadStream,
} from "fs";
import { resolve, relative, basename, extname, join } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { readdir } from "fs/promises";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = resolve(ROOT, "public/benchmark");
const OUT_FILE = resolve(ROOT, "src/data/generatedSpiceBenchmarkManifest.ts");

const EXCLUDE_TERMS = ["sky130", "skywater"];
const DATA_EXTS = new Set([".csv", ".txt", ".dat", ".raw", ".json"]);
const PLOT_EXTS = new Set([".png", ".svg"]);
const REPORT_NAMES = new Set(["report.md", "report.txt", "readme.md"]);

let SOURCE_INVENTORY = { dataFiles: 0, plotFiles: 0, reportFiles: 0, totalArtifacts: 0 };

function isExcluded(str) {
  const lower = str.toLowerCase();
  return EXCLUDE_TERMS.some((t) => lower.includes(t));
}

function fileHash(filePath) {
  try { return createHash("md5").update(readFileSync(filePath)).digest("hex").slice(0, 8); }
  catch { return "unknown"; }
}

function formatSize(bytes) { return bytes < 1024 ? `${bytes} B` : `${(bytes/1024).toFixed(1)} KB`; }

/** Copy to public/ and return URL path (relative to site root, for BASE_URL joining). */
function copyToPublic(srcPath, runId, subdir) {
  const destDir = resolve(PUBLIC_DIR, runId, subdir);
  mkdirSync(destDir, { recursive: true });
  const dest = resolve(destDir, basename(srcPath));
  try {
    copyFileSync(srcPath, dest);
    return `benchmark/${runId}/${subdir}/${basename(srcPath)}`;
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Robust TXT/CSV/DAT/RAW parser                                      */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Detect whether a line is a comment or separator line.
 * ngspice wrdata files often have header blocks with repeated column metadata.
 */
function isCommentOrMeta(line) {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith("#") || t.startsWith("//") || t.startsWith("*")) return true;
  if (/^-{3,}$/.test(t)) return true; // markdown separator
  if (/^={3,}$/.test(t)) return true;
  // ngspice wrdata scale/plotname lines
  if (/^scale\b/i.test(t)) return true;
  if (/^plotname:/i.test(t)) return true;
  // rows that are purely non-numeric labels
  return false;
}

function detectDelimiter(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => !isCommentOrMeta(l));
  if (lines.length === 0) return { delim: ",", type: "csv" };
  const first = lines[0];
  // Count occurrences
  const commas = (first.match(/,/g) || []).length;
  const tabs = (first.match(/\t/g) || []).length;
  const spaces = (first.match(/\s{2,}/g) || []).length;
  if (tabs >= 2) return { delim: "\t", type: "tsv" };
  if (commas >= 1) return { delim: ",", type: "csv" };
  if (spaces >= 1) return { delim: /\s+/, type: "whitespace" };
  return { delim: ",", type: "csv" };
}

function smartSplit(line, delim) {
  if (typeof delim === "string") return line.split(delim).map(c => c.trim()).filter(c => c.length > 0);
  return line.trim().split(delim).filter(c => c.length > 0);
}

function parseNumericTable(text) {
  const allLines = text.split(/\r?\n/);
  // Find first non-comment, non-meta data line
  let headerIdx = -1;
  const dataStartCandidates = [];
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line || isCommentOrMeta(line)) continue;
    if (/^[a-zA-Z_][\w\s,]*$/.test(line) && !/^\d/.test(line)) {
      // Likely a header row
      if (headerIdx < 0) headerIdx = i;
    } else if (/^-?\d/.test(line) || /^\d/.test(line)) {
      if (headerIdx >= 0) { dataStartCandidates.push({ headerIdx, dataIdx: i }); break; }
    } else {
      // Could be a header
      if (headerIdx < 0) headerIdx = i;
    }
  }

  if (headerIdx < 0) {
    // No header found — try to use first data-like line
    const firstDataLine = allLines.find(l => l.trim() && !isCommentOrMeta(l));
    if (!firstDataLine) return { columns: null, rowCount: 0, rows: [] };
    const { delim } = detectDelimiter(text);
    const cols = smartSplit(firstDataLine, delim);
    // If it looks numeric, generate column names
    if (cols.every(c => /^-?[\d.]+/.test(c))) {
      const genCols = cols.map((_, i) => `col_${i}`);
      const dataLines = allLines.filter(l => !isCommentOrMeta(l));
      return { columns: genCols, rowCount: dataLines.length, rows: dataLines.map(l => smartSplit(l, delim)) };
    }
    // Use as header
    const dataLines = allLines.slice(1).filter(l => !isCommentOrMeta(l));
    return { columns: cols, rowCount: dataLines.length, rows: dataLines.map(l => smartSplit(l, delim)) };
  }

  const { delim } = detectDelimiter(allLines.slice(headerIdx).join("\n"));
  const headerCols = smartSplit(allLines[headerIdx], delim);
  const dataLines = allLines.slice(headerIdx + 1).filter(l => {
    const t = l.trim();
    return t && !isCommentOrMeta(l) && !t.startsWith("#") && !t.startsWith("*");
  });

  // Remove duplicate header-like rows (ngspice wrdata repeats headers)
  const filtered = dataLines.filter(l => {
    const cols = smartSplit(l, delim);
    if (cols.length !== headerCols.length) return true;
    return !cols.every(c => isNaN(+c));
  });

  return { columns: headerCols, rowCount: filtered.length, rows: filtered.map(l => smartSplit(l, delim)) };
}

/** Try to parse ngspice ASCII raw format. */
function parseNgspiceRaw(text) {
  const lines = text.split(/\r?\n/);
  const variables = [];
  let nPoints = 0, nVars = 0;
  let inHeader = true;
  const dataLines = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (inHeader) {
      if (/^no\.\s+variables/i.test(t)) { nVars = parseInt(t.match(/\d+/)?.[0] || "0"); continue; }
      if (/^no\.\s+points/i.test(t)) { nPoints = parseInt(t.match(/\d+/)?.[0] || "0"); continue; }
      if (/^\d+\s+\S+\s+\S+/.test(t) && nVars > 0) {
        const parts = t.split(/\s+/);
        variables.push({ index: parts[0], name: parts[1], type: parts[2] });
        if (variables.length >= nVars) inHeader = false;
        continue;
      }
      if (/^binary:/i.test(t)) {
        return { columns: null, rowCount: nPoints, rows: [], isBinaryRaw: true };
      }
    } else {
      if (/^\d/.test(t) || /^-?\d/.test(t)) dataLines.push(t);
    }
  }

  const columns = variables.map(v => v.name);
  const rows = dataLines.map(l => l.trim().split(/\s+/));
  return { columns, rowCount: rows.length, rows, isBinaryRaw: false };
}

function parseDataFile(filePath) {
  const name = basename(filePath);
  const ext = extname(filePath).toLowerCase();
  const st = statSync(filePath);
  const size = formatSize(st.size);
  const hash = fileHash(filePath);

  let format = ext.slice(1);
  let columns = null, rowCount = -1, rows = [], preview = null;

  try {
    const text = readFileSync(filePath, "utf-8");

    if (ext === ".raw") {
      const parsed = parseNgspiceRaw(text);
      if (parsed.isBinaryRaw) {
        format = "raw_binary";
        rowCount = parsed.rowCount || -1;
      } else {
        format = "raw";
        columns = parsed.columns;
        rowCount = parsed.rowCount;
        rows = parsed.rows;
      }
    } else if (ext === ".csv" || ext === ".txt" || ext === ".dat") {
      format = ext.slice(1);
      const parsed = parseNumericTable(text);
      columns = parsed.columns;
      rowCount = parsed.rowCount;
      rows = parsed.rows || [];
    } else if (ext === ".json") {
      try { JSON.parse(text); columns = ["(json)" ]; rowCount = -1; } catch {}
    }

    // Text preview: first 200 chars
    preview = text.slice(0, 200);
  } catch {
    preview = "(binary or unreadable)";
  }

  return { name, format, size, hash, columns, rowCount, rowPreview: rows.slice(0, 3), preview };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Domain assignment                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

function assignDataDomain(name, parentDir) {
  const n = `${parentDir || ""}/${name}`.toLowerCase();
  if (/dc|_iv|_id|transfer|kcl|bias|gm.?vds|output.?conductance/.test(n)) return "dc";
  if (/ac|_cv|cv_|spar|s_param|nqs|capacitance/.test(n)) return "ac";
  if (/tran|switch|delay|waveform|pulse|energy|ringing|rise.?time|fall.?time/.test(n)) return "transient";
  if (/noise|psd|flicker|thermal|shot/.test(n)) return "noise";
  return "overview";
}

function assignPlotDomain(name) {
  const n = name.toLowerCase();
  if (/dc|_iv|transfer|kcl/.test(n)) return "dc";
  if (/^ac|ac_|_cv|spar|s_param|capacitance/.test(n)) return "ac";
  if (/^tran|tran_|waveform|switch|pulse|delay/.test(n)) return "transient";
  if (/noise|psd|flicker/.test(n)) return "noise";
  return "overview";
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  REPORT parser — robust real-world format                            */
/* ═══════════════════════════════════════════════════════════════════ */

function parseStatusCell(cell) {
  const c = cell.trim().toUpperCase();
  // HTML span with pass/fail class
  const spanMatch = cell.match(/<span[^>]*class="([^"]*)"[^>]*>/i);
  if (spanMatch) {
    if (/pass|success|green|ok/.test(spanMatch[1])) return "pass";
    if (/fail|error|red/.test(spanMatch[1])) return "fail";
  }
  // HTML content
  const raw = cell.replace(/<[^>]+>/g, "").trim().toUpperCase();
  if (raw === "PASS" || raw === "✓" || raw === "✅" || raw === "OK") return "pass";
  if (raw === "FAIL" || raw === "✗" || raw === "❌" || raw === "FAILED" || raw === "ERROR") return "fail";
  if (raw === "UNAVAILABLE" || raw === "N/A" || raw === "—" || raw === "-" || raw === "SKIPPED") return "unavailable";
  // Default: if it contains PASS, assume pass; if FAIL, fail
  if (raw.includes("PASS")) return "pass";
  if (raw.includes("FAIL")) return "fail";
  return "unavailable";
}

function parseVerification(reportMd) {
  const tests = [];
  const domainMap = {
    "dc": "dc", "dc analysis": "dc",
    "ac": "ac", "ac analysis": "ac",
    "transient": "transient", "transient analysis": "transient",
    "tran": "transient",
    "noise": "noise", "noise analysis": "noise",
  };

  // Split by ## sections
  const sections = reportMd.split(/^##\s+/m);
  for (const section of sections) {
    const headEnd = section.indexOf("\n");
    const head = headEnd > 0 ? section.slice(0, headEnd).trim().toLowerCase() : "";
    const domain = domainMap[head] || (head.includes("dc") ? "dc" : head.includes("ac") ? "ac" : head.includes("tran") ? "transient" : head.includes("noise") ? "noise" : "overview");

    // Find markdown tables
    const lines = section.split("\n");
    let inTable = false, tableHeader = null;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { inTable = false; continue; }
      // Markdown separator: |---|---| etc — skip
      if (/^\|[-:\s|]+\|$/.test(t)) continue;
      if (t.startsWith("|") && t.endsWith("|")) {
        const cells = t.split("|").slice(1, -1).map(c => c.trim());
        if (cells.length < 2) continue;
        if (!inTable) {
          // Check if this is a header row
          const firstCol = cells[0].toLowerCase();
          if (/test|check|metric|name/i.test(firstCol)) {
            tableHeader = cells;
            inTable = true;
            continue;
          }
          // Assume it's a header
          tableHeader = cells;
          inTable = true;
          continue;
        }

        // Data row — find status column
        let statusIdx = -1;
        if (tableHeader) {
          for (let i = 0; i < tableHeader.length; i++) {
            if (/status|result|pass/i.test(tableHeader[i])) { statusIdx = i; break; }
          }
        }
        if (statusIdx < 0) statusIdx = 1; // default: second column

        const status = cells.length > statusIdx ? parseStatusCell(cells[statusIdx]) : "unavailable";
        const detail = cells.length > statusIdx + 1 ? cells[statusIdx + 1] : (cells.length > 2 ? cells[2] : "");

        tests.push({
          testId: `${domain}_${tests.length + 1}`,
          domain,
          name: cells[0] || "unnamed",
          status,
          detail: detail || "",
        });
      }
    }
  }
  return tests;
}

function parseReport(reportPath) {
  try {
    const md = readFileSync(reportPath, "utf-8");
    // Extract simulator info from various formats
    let sim = "ngspice", ver = "unknown";
    const simM = md.match(/\*\*Simulator:\*\*\s*(\S+)\s*(\S*)/) || md.match(/Simulator:\s*(\S+)\s*(\S*)/i);
    if (simM) { sim = simM[1]; ver = simM[2] || "unknown"; }
    // Overall result
    let overall = "unavailable";
    const orM = md.match(/##\s*Overall Result:?\s*(\w+)/i) || md.match(/Overall.*?(PASS|FAIL)/i);
    if (orM) { const w = orM[1].toUpperCase(); overall = w === "PASS" ? "pass" : w === "FAIL" ? "fail" : "unavailable"; }
    // Check for embedded JSON manifest in report
    let manifestInfo = {};
    const jsonM = md.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonM) { try { manifestInfo = JSON.parse(jsonM[1]); } catch {} }
    const tests = parseVerification(md);
    return { reportMarkdown: md, simulator: sim, simulatorVersion: ver, overallStatus: overall, verificationTests: tests, ...manifestInfo };
  } catch {
    return { reportMarkdown: "", simulator: "unknown", simulatorVersion: "", overallStatus: "unavailable", verificationTests: [] };
  }
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Source discovery                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function discoverSourceRoots() {
  const roots = [];

  // 1. Environment variable (highest priority)
  if (process.env.SPICE_BENCHMARK_SOURCE && existsSync(process.env.SPICE_BENCHMARK_SOURCE)) {
    roots.push({ path: resolve(process.env.SPICE_BENCHMARK_SOURCE), label: "SPICE_BENCHMARK_SOURCE" });
  }

  // 2. GitHub Actions external checkout
  const extDir = resolve(ROOT, "external", "spice_model_benchmark");
  if (existsSync(extDir)) {
    roots.push({ path: extDir, label: "external/spice_model_benchmark" });
  }

  // 3. Local cloned repo
  const localRepo = resolve(ROOT, "..", "spice_model_benchmark");
  if (existsSync(localRepo)) {
    roots.push({ path: localRepo, label: "local spice_model_benchmark" });
  }

  // 4. Fixture fallback (always included as last resort)
  const fixtureDir = resolve(ROOT, "data", "spice-benchmark", "runs");
  if (existsSync(fixtureDir)) {
    roots.push({ path: fixtureDir, label: "fixture fallback" });
  }

  return roots;
}

/** Find result roots: directories containing REPORT.md, data/ or plots/. */
function findResultRoots(sourcePath) {
  const roots = [];

  // Direct children first
  try {
    for (const entry of readdirSync(sourcePath)) {
      const p = resolve(sourcePath, entry);
      if (!statSync(p).isDirectory()) continue;
      if (isExcluded(entry) || isExcluded(p)) { console.log(`  ❌ Excluded: ${entry}`); continue; }
      if (entry === "models" || entry === ".git" || entry === "node_modules" || entry === "__pycache__") continue;

      const hasReport = existsSync(resolve(p, "REPORT.md")) || existsSync(resolve(p, "report.md"));
      const hasData = existsSync(resolve(p, "data"));
      const hasPlots = existsSync(resolve(p, "plots"));

      if (hasReport || hasData || hasPlots) {
        roots.push({ path: p, name: entry, hasReport, hasData, hasPlots });
      }

      // Also check common subdirectories: results, reference_results, spice_benchmark_results
      for (const sub of ["results", "reference_results", "spice_benchmark_results"]) {
        const subPath = resolve(p, sub);
        if (existsSync(subPath) && statSync(subPath).isDirectory()) {
          try {
            for (const runDir of readdirSync(subPath)) {
              const rd = resolve(subPath, runDir);
              if (!statSync(rd).isDirectory()) continue;
              if (isExcluded(runDir)) continue;
              const hr = existsSync(resolve(rd, "REPORT.md")) || existsSync(resolve(rd, "report.md"));
              const hd = existsSync(resolve(rd, "data"));
              const hp = existsSync(resolve(rd, "plots"));
              if (hr || hd || hp) {
                roots.push({ path: rd, name: `${entry}/${sub}/${runDir}`, hasReport: hr, hasData: hd, hasPlots: hp });
              }
            }
          } catch {}
        }
      }
    }
  } catch (e) { console.warn(`  ⚠ Error scanning ${sourcePath}: ${e.message}`); }

  return roots;
}

/** Recursively index ALL files in a directory (not just known formats). */
function indexAllFiles(dir, runId, parentDir = "") {
  const results = { data: [], plots: [], reports: [], other: [] };
  if (!existsSync(dir)) return results;

  try {
    for (const entry of readdirSync(dir)) {
      const fp = resolve(dir, entry);
      if (isExcluded(entry) || isExcluded(fp)) continue;

      let st;
      try { st = statSync(fp); } catch { continue; }

      if (st.isDirectory()) {
        // Recurse but skip very large dirs
        if (entry === "node_modules" || entry === ".git" || entry === "__pycache__") continue;
        const sub = indexAllFiles(fp, runId, `${parentDir}${entry}/`);
        results.data.push(...sub.data);
        results.plots.push(...sub.plots);
        results.reports.push(...sub.reports);
        results.other.push(...sub.other);
        continue;
      }

      const ext = extname(entry).toLowerCase();
      const name = entry.toLowerCase();

      if (name === "report.md" || name === "report.txt" || REPORT_NAMES.has(name)) {
        const report = parseReport(fp);
        results.reports.push({ path: fp, name: entry, size: formatSize(st.size), hash: fileHash(fp), report });
        SOURCE_INVENTORY.reportFiles++;
        continue;
      }

      if (ext === ".md" || ext === ".txt") {
        // Could be either data or report. Check content.
        const text = readFileSync(fp, "utf-8").slice(0, 500);
        if (/\*\*.*\*\*/.test(text) && /simulator|model|benchmark/i.test(text)) {
          const report = parseReport(fp);
          results.reports.push({ path: fp, name: entry, size: formatSize(st.size), hash: fileHash(fp), report });
          SOURCE_INVENTORY.reportFiles++;
        } else {
          const domain = assignDataDomain(entry, parentDir);
          const parsed = parseDataFile(fp);
          const fetchUrl = copyToPublic(fp, runId, "data");
          results.data.push({ ...parsed, relPath: `${parentDir}${entry}`, domain, fetchUrl, sourcePath: fp });
          SOURCE_INVENTORY.dataFiles++;
        }
        continue;
      }

      if (PLOT_EXTS.has(ext)) {
        const displayUrl = copyToPublic(fp, runId, "plots");
        results.plots.push({ name: entry, relPath: `${parentDir}${entry}`, domain: assignPlotDomain(entry), format: ext.slice(1), size: formatSize(st.size), displayUrl, sourcePath: fp });
        SOURCE_INVENTORY.plotFiles++;
        continue;
      }

      if (DATA_EXTS.has(ext)) {
        const domain = assignDataDomain(entry, parentDir);
        const parsed = parseDataFile(fp);
        const fetchUrl = copyToPublic(fp, runId, "data");
        results.data.push({ ...parsed, relPath: `${parentDir}${entry}`, domain, fetchUrl, sourcePath: fp });
        SOURCE_INVENTORY.dataFiles++;
        continue;
      }

      // Unknown format — still include in inventory
      results.other.push({ name: entry, relPath: `${parentDir}${entry}`, format: ext || "unknown", size: formatSize(st.size), hash: fileHash(fp), sourcePath: fp });
      SOURCE_INVENTORY.totalArtifacts++;
    }
  } catch (e) { console.warn(`  ⚠ Error reading ${dir}: ${e.message}`); }

  return results;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main                                                                */
/* ═══════════════════════════════════════════════════════════════════ */

function main() {
  console.log("[generate-spice-benchmark-data] discovering sources...");
  const sources = discoverSourceRoots();

  if (sources.length === 0) {
    console.warn("  ⚠ No sources found. Set SPICE_BENCHMARK_SOURCE or clone spice_model_benchmark.");
    writeFileSync(OUT_FILE, `// Auto-generated — no sources found\nexport const SPICE_BENCHMARK_MANIFEST = { runs: {}, modelIds: [], models: {}, suiteIds: [], netlistSuites: {}, modelFormats: [], generatedAt: "", repoUrl: "" };\nexport const SOURCE_INVENTORY = { dataFiles: 0, plotFiles: 0, reportFiles: 0, totalArtifacts: 0 };\n`);
    return;
  }

  const allRuns = {};
  const allModels = {};
  const allSuites = {};
  const modelIds = [];
  const suiteIds = [];
  const formatsSet = new Set();

  for (const src of sources) {
    console.log(`\n📂 Source: ${src.label} (${src.path})`);
    const roots = findResultRoots(src.path);
    console.log(`  Found ${roots.length} result root(s)`);

    for (const root of roots) {
      const runId = root.name.replace(/\//g, "_").replace(/\s+/g, "_");
      if (isExcluded(runId)) { console.log(`  ❌ Excluded: ${runId}`); continue; }

      console.log(`  📋 ${root.name}`);

      // Index ALL files recursively from data/ and plots/
      const dataDir = resolve(root.path, "data");
      const plotsDir = resolve(root.path, "plots");
      const files = indexAllFiles(root.path, runId);

      // Find all report files in root
      const reportPath = existsSync(resolve(root.path, "REPORT.md")) ? resolve(root.path, "REPORT.md")
        : existsSync(resolve(root.path, "report.md")) ? resolve(root.path, "report.md")
        : files.reports.length > 0 ? files.reports[0].path : null;

      const reportData = reportPath ? parseReport(reportPath) : { reportMarkdown: "", simulator: "unknown", simulatorVersion: "", overallStatus: "unavailable", verificationTests: [] };

      // Merge data from data/ dir
      const dataArtifacts = files.data.map(f => ({
        name: basename(f.relPath),
        relPath: f.relPath,
        domain: f.domain,
        format: f.format,
        size: f.size,
        hash: f.hash,
        columns: f.columns,
        rowCount: f.rowCount,
        fetchUrl: f.fetchUrl,
        preview: f.preview,
        rowPreview: f.rowPreview,
      }));

      const plotArtifacts = files.plots.map(f => ({
        name: f.name,
        relPath: f.relPath,
        domain: f.domain,
        format: f.format,
        size: f.size,
        displayUrl: f.displayUrl,
      }));

      // Try to load run_manifest.json
      let manifest = {};
      const manifestPath = resolve(root.path, "run_manifest.json");
      if (existsSync(manifestPath)) {
        try { manifest = JSON.parse(readFileSync(manifestPath, "utf-8")); } catch {}
      }

      const run = {
        runId,
        status: manifest.status || reportData.overallStatus || (dataArtifacts.length > 0 ? "completed" : "partial"),
        modelId: manifest.modelId || reportData.modelId || runId,
        modelPath: manifest.modelPath || reportData.modelPath || "",
        modelFormat: manifest.modelFormat || reportData.modelFormat || "ngspice",
        deviceName: manifest.deviceName || reportData.deviceName || "",
        netlistSuite: manifest.netlistSuite || reportData.netlistSuite || { suiteId: runId, suiteName: root.name, dcCircuit: "", acCircuit: "", transientCircuit: "", noiseCircuit: "" },
        modes: manifest.modes || reportData.modes || [],
        simulator: reportData.simulator,
        simulatorVersion: reportData.simulatorVersion,
        generatedAt: manifest.generatedAt || "",
        commitSha: manifest.commitSha || "",
        reportSummary: {
          reportPath: reportPath ? relative(root.path, reportPath) : "REPORT.md",
          reportMarkdown: reportData.reportMarkdown,
          simulator: reportData.simulator,
          simulatorVersion: reportData.simulatorVersion,
          overallStatus: reportData.overallStatus,
        },
        verificationTests: reportData.verificationTests,
        dataArtifacts,
        plotArtifacts,
        reportPath: reportPath ? relative(root.path, reportPath) : "REPORT.md",
      };
      allRuns[runId] = run;

      const mId = run.modelId;
      if (mId && !allModels[mId]) {
        allModels[mId] = { modelId: mId, modelName: mId, modelPath: run.modelPath, modelFormat: run.modelFormat, deviceName: run.deviceName, deviceType: run.deviceName?.includes("PMOS") ? "PMOS" : "NMOS" };
        modelIds.push(mId);
      }
      if (run.modelFormat) formatsSet.add(run.modelFormat);

      const s = run.netlistSuite;
      if (s && s.suiteId && !allSuites[s.suiteId]) {
        allSuites[s.suiteId] = s;
        suiteIds.push(s.suiteId);
      }
    }
  }

  // Count total from inventory
  SOURCE_INVENTORY.totalArtifacts += SOURCE_INVENTORY.dataFiles + SOURCE_INVENTORY.plotFiles + SOURCE_INVENTORY.reportFiles;

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

  // Write JSON snapshot for validator
  const JSON_FILE = resolve(ROOT, "src/data/generatedSpiceBenchmarkManifest.json");
  writeFileSync(JSON_FILE, JSON.stringify({ manifest: manifestData, sourceInventory: SOURCE_INVENTORY }, null, 2), "utf-8");

  const ts = `// Auto-generated by generate-spice-benchmark-data.mjs
// Do not edit manually.
// Generated at: ${new Date().toISOString()}
// Runs: ${Object.keys(allRuns).length}, Models: ${modelIds.length}, Suites: ${suiteIds.length}
import type { SpiceBenchmarkManifest } from "./SpiceBenchmarkTypes";

export const SPICE_BENCHMARK_MANIFEST: SpiceBenchmarkManifest = ${JSON.stringify(manifestData, null, 2)};

export const SOURCE_INVENTORY = ${JSON.stringify(SOURCE_INVENTORY)};
`;
  writeFileSync(OUT_FILE, ts, "utf-8");
  console.log(`\n[generate-spice-benchmark-data] ✅ Written: ${OUT_FILE}`);
  console.log(`  Runs: ${Object.keys(allRuns).length}, Models: ${modelIds.length}, Suites: ${suiteIds.length}`);
  console.log(`  Source inventory: ${SOURCE_INVENTORY.dataFiles} data, ${SOURCE_INVENTORY.plotFiles} plots, ${SOURCE_INVENTORY.reportFiles} reports`);
}

main();
