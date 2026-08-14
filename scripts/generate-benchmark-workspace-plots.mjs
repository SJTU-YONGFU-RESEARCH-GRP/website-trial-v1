#!/usr/bin/env node
/* ==================================================================
 *  generate-benchmark-workspace-plots.mjs (goal3.md §5.2)
 *
 *  Scans public/benchmark/ for real PNG/SVG plot files and
 *  generates a normalized manifest with comparisonKeys,
 *  file hashes, and model/simulator/domain mappings.
 *
 *  Usage: node scripts/generate-benchmark-workspace-plots.mjs
 * ================================================================== */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { resolve, relative, basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = resolve(ROOT, "public", "benchmark");
const OUT = resolve(ROOT, "src", "data", "benchmarkWorkspace", "generatedBenchmarkPlotManifest.ts");

/* ─── Domain mapping from filename keywords ─── */
function guessDomain(filename) {
  const n = filename.toLowerCase();
  if (n.includes("iv_characteristics") || n.includes("kcl") || n.includes("temperature_analysis")) return "dc";
  if (n.includes("cv_characteristics") || n.includes("cv_components") || n.includes("cv_multifreq") ||
      n.includes("nqs_effects") || n.includes("sparameter")) return "ac";
  if (n.includes("large_signal") || n.includes("switching_response") || n.includes("delay_effect") ||
      n.includes("power_dissipation") || n.includes("energy_consumption") || n.includes("quasi_static") ||
      n.includes("charge_conservation") || n.includes("total_charge")) return "transient";
  if (n.includes("thermal_noise") || n.includes("flicker_noise") || n.includes("shot_noise") ||
      n.includes("noise_components") || n.includes("noise_vs_temperature") || n.includes("noise_temp")) return "noise";
  return "dc";
}

function canonicalizeKey(filename) {
  const n = filename.toLowerCase().replace(/\.[a-z]+$/, "").replace(/_[a-f0-9]{8,}/, "");
  const keys = [
    ["iv_characteristics", "iv-characteristics"], ["kcl_verification", "kcl-verification"],
    ["temperature_analysis", "temperature-analysis"], ["cv_characteristics", "cv-characteristics"],
    ["cv_components", "cv-components"], ["cv_multifreq", "cv-multifrequency"],
    ["nqs_effects", "nqs-effects"], ["sparameter", "s-parameter"],
    ["large_signal_transient", "large-signal-transient"], ["switching_response", "switching-response"],
    ["delay_effect", "delay-effect"], ["power_dissipation", "power-dissipation"],
    ["energy_consumption", "energy-consumption"], ["quasi_static", "quasi-static"],
    ["charge_conservation", "charge-conservation"], ["total_charge", "total-charge"],
    ["thermal_noise", "thermal-noise"], ["flicker_noise", "flicker-noise"],
    ["shot_noise", "shot-noise"], ["noise_components", "noise-components"],
    ["noise_vs_temperature", "noise-temperature"], ["noise_temp", "noise-temperature"],
  ];
  for (const [kw, ck] of keys) {
    if (n.includes(kw)) return ck;
  }
  return n.slice(0, 40);
}

function guessSimulator(runId) {
  const r = runId.toLowerCase();
  if (r.includes("spectre")) return "spectre";
  if (r.includes("hspice")) return "hspice";
  return "ngspice";
}

/* ─── Main ─── */
console.log("[generate-benchmark-workspace-plots] Scanning public/benchmark/...");

if (!existsSync(PUBLIC)) {
  console.error("  public/benchmark/ does not exist. Run refresh:benchmark-data first.");
  process.exit(0);
}

const artifacts = [];
let plotCount = 0;

function scanDir(dirPath, runId) {
  const plotsDir = join(dirPath, "plots");
  if (!existsSync(plotsDir)) return;

  const files = readdirSync(plotsDir).filter((f) => /\.(png|svg)$/i.test(f));
  const simulator = guessSimulator(runId);

  for (const f of files) {
    const fullPath = join(plotsDir, f);
    const stat = statSync(fullPath);
    const content = readFileSync(fullPath);
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
    const publicPath = relative(resolve(ROOT, "public"), fullPath);
    const domain = guessDomain(f);
    const comparisonKey = canonicalizeKey(f);

    // Check PNG magic bytes
    let format = stat.size > 0 ? "png" : null;
    if (f.endsWith(".svg")) {
      const head = content.slice(0, 200).toString();
      format = head.includes("<svg") ? "svg" : null;
    } else {
      const magic = content.slice(0, 8);
      if (magic[0] !== 0x89 || magic[1] !== 0x50 || magic[2] !== 0x4E || magic[3] !== 0x47) {
        console.warn(`  ⚠ Not a valid PNG: ${publicPath}`);
        format = null;
      }
    }

    if (!format || stat.size === 0) {
      console.warn(`  ⚠ Skipping invalid file: ${publicPath}`);
      continue;
    }

    artifacts.push({
      artifactId: `gen-plot-${runId}-${plotCount}`,
      name: f.replace(/\.[a-z]+$/, ""),
      publicPath,
      runId,
      simulator,
      domain,
      comparisonKey,
      format,
      sizeBytes: stat.size,
      hash,
    });

    plotCount++;
  }
}

// Scan all run directories
const dirs = readdirSync(PUBLIC).filter((d) => {
  const p = join(PUBLIC, d);
  return statSync(p).isDirectory() && existsSync(join(p, "plots"));
});

for (const runId of dirs) {
  scanDir(join(PUBLIC, runId), runId);
}

console.log(`  Found ${plotCount} plots across ${dirs.length} run(s)`);

/* ─── Generate TypeScript manifest ─── */
const ts = `/* Auto-generated by scripts/generate-benchmark-workspace-plots.mjs
 * DO NOT EDIT MANUALLY.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GENERATED_BENCHMARK_PLOT_MANIFEST: any[] = ${JSON.stringify(artifacts, null, 2)};

export const GENERATED_BENCHMARK_PLOT_COUNT = ${plotCount};
`;

writeFileSync(OUT, ts, "utf-8");
console.log(`  ✅ Written: ${relative(ROOT, OUT)}`);
