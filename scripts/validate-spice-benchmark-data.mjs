#!/usr/bin/env node

/**
 * validate-spice-benchmark-data.mjs
 * Validates the generated SPICE benchmark manifest.
 *
 * Checks:
 *  - Manifest structure and uniqueness
 *  - Model ↔ Netlist associations
 *  - Data artifact column headers and numeric fields
 *  - Plot/report file references
 *  - No Sky130/SkyWater anywhere
 *  - No empty data or invalid paths
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

let errors = 0;
let warnings = 0;
function fail(msg) { console.error(`  ❌ ${msg}`); errors++; }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warnings++; }
function ok(msg) { console.log(`  ✅ ${msg}`); }

const EXCLUDE_TERMS = ["sky130", "skywater"];
function isExcluded(str) {
  return EXCLUDE_TERMS.some((t) => str.toLowerCase().includes(t));
}

async function main() {
  console.log("🔍 validate:spice-benchmark-data\n");

  // Load the manifest by extracting JSON from the generated TS file.
  const tsPath = resolve(ROOT, "src/data/generatedSpiceBenchmarkManifest.ts");
  let raw;
  try {
    const { readFileSync } = await import("fs");
    raw = readFileSync(tsPath, "utf-8");
  } catch (e) {
    fail(`Cannot read manifest file: ${e.message}`);
    process.exit(1);
  }

  // Extract the JSON object from `export const SPICE_BENCHMARK_MANIFEST: ... = {...};`
  const match = raw.match(/export const SPICE_BENCHMARK_MANIFEST[^=]*=\s*(\{[\s\S]*\});/);
  if (!match) {
    fail("Cannot find SPICE_BENCHMARK_MANIFEST in generated TS file");
    process.exit(1);
  }
  let manifest;
  try {
    manifest = JSON.parse(match[1]);
  } catch (e) {
    fail(`Cannot parse manifest JSON: ${e.message}`);
    process.exit(1);
  }

  if (!manifest || !manifest.runs) {
    fail("Manifest missing or has no runs");
    process.exit(1);
  }

  const runs = manifest.runs;
  const runIds = Object.keys(runs);
  ok(`Manifest loaded: ${runIds.length} runs`);

  // 1. Uniqueness checks
  const seenIds = new Set();
  for (const rid of runIds) {
    if (seenIds.has(rid)) fail(`Duplicate runId: ${rid}`);
    seenIds.add(rid);
  }
  ok("Run IDs unique");

  // 2. Sky130/SkyWater exclusion
  const manifestJson = JSON.stringify(manifest);
  if (isExcluded(manifestJson)) fail("Manifest contains excluded term (sky130/skywater)");
  ok("No Sky130/SkyWater in manifest");

  for (const rid of runIds) {
    const run = runs[rid];
    if (isExcluded(rid)) fail(`Run ID excluded: ${rid}`);
    if (isExcluded(run.modelId)) fail(`Run ${rid}: excluded modelId: ${run.modelId}`);
    if (isExcluded(run.modelPath)) fail(`Run ${rid}: excluded modelPath: ${run.modelPath}`);

    for (const art of run.dataArtifacts) {
      if (isExcluded(art.name) || isExcluded(art.relPath)) fail(`Run ${rid}: excluded data artifact: ${art.relPath}`);
    }
    for (const plot of run.plotArtifacts) {
      if (isExcluded(plot.name) || isExcluded(plot.relPath)) fail(`Run ${rid}: excluded plot: ${plot.relPath}`);
    }
    ok(`Run ${rid}: no excluded terms`);
  }

  // 3. Model ↔ Run associations
  for (const rid of runIds) {
    const run = runs[rid];
    if (!run.modelId) fail(`Run ${rid}: no modelId`);
    else if (!manifest.models[run.modelId]) warn(`Run ${rid}: model "${run.modelId}" not in models map`);
  }
  ok("Model-run associations verified");

  // 4. Netlist suite associations — ensure at least 2 circuits defined
  for (const rid of runIds) {
    const run = runs[rid];
    const ns = run.netlistSuite;
    if (!ns || !ns.suiteId) fail(`Run ${rid}: no netlist suite`);
    else {
      const circuits = [ns.dcCircuit, ns.acCircuit, ns.transientCircuit, ns.noiseCircuit].filter(Boolean);
      if (circuits.length < 2) warn(`Run ${rid}: netlist suite "${ns.suiteId}" has only ${circuits.length} circuit(s)`);
      else ok(`Run ${rid}: netlist suite "${ns.suiteId}" has ${circuits.length} circuits`);
    }
  }

  // 5. Data artifacts: check columns and numeric fields
  for (const rid of runIds) {
    const run = runs[rid];
    for (const art of run.dataArtifacts) {
      if (!art.name) { fail(`Run ${rid}: data artifact missing name`); continue; }
      if (!art.columns && art.format !== "raw") fail(`Run ${rid}: ${art.name} has no column headers (${art.format})`);
      if (art.columns && art.columns.length === 0) fail(`Run ${rid}: ${art.name} has empty column list`);
      if (art.rowCount < 0 && art.format !== "raw") warn(`Run ${rid}: ${art.name} could not be parsed (rowCount=${art.rowCount})`);
      if (art.size === "0.0 KB") warn(`Run ${rid}: ${art.name} is empty (0 KB)`);
    }
    ok(`Run ${rid}: data artifacts validated (${run.dataArtifacts.length} files)`);
  }

  // 6. Plot artifacts: check displayUrl
  for (const rid of runIds) {
    const run = runs[rid];
    for (const plot of run.plotArtifacts) {
      if (!plot.displayUrl) warn(`Run ${rid}: plot "${plot.name}" has no displayUrl`);
      if (plot.format !== "png" && plot.format !== "svg") warn(`Run ${rid}: plot "${plot.name}" has unexpected format "${plot.format}"`);
    }
    ok(`Run ${rid}: plot artifacts validated (${run.plotArtifacts.length} files)`);
  }

  // 7. Report: ensure markdown exists
  for (const rid of runIds) {
    const run = runs[rid];
    if (!run.reportSummary?.reportMarkdown) warn(`Run ${rid}: no REPORT.md content`);
    if (run.reportSummary?.overallStatus === "unavailable") warn(`Run ${rid}: overall status is UNAVAILABLE`);
  }

  // 8. Verification tests: check domain assignments
  const validDomains = ["dc","ac","transient","noise","overview"];
  for (const rid of runIds) {
    const run = runs[rid];
    for (const t of run.verificationTests) {
      if (!validDomains.includes(t.domain)) warn(`Run ${rid}: test "${t.name}" has invalid domain "${t.domain}"`);
      if (!t.name) fail(`Run ${rid}: verification test missing name`);
    }
  }

  // 9. Empty data: no run should have zero data artifacts and zero plot artifacts
  for (const rid of runIds) {
    const run = runs[rid];
    const total = run.dataArtifacts.length + run.plotArtifacts.length;
    if (total === 0) warn(`Run ${rid}: has zero data AND zero plot artifacts`);
  }

  // 10. Model formats
  for (const rid of runIds) {
    const run = runs[rid];
    const validFormats = ["ngspice","hspice","spectre",""];
    if (!validFormats.includes(run.modelFormat)) warn(`Run ${rid}: unknown model format "${run.modelFormat}"`);
  }
  ok("Model formats validated");

  console.log(`\n${errors > 0 ? "❌" : "✅"} Validation complete: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
