#!/usr/bin/env node

/**
 * validate-spice-benchmark-data.mjs
 * Validates the generated SPICE benchmark manifest against source inventory.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

let errors = 0, warnings = 0;
function fail(msg) { console.error(`  ❌ ${msg}`); errors++; }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warnings++; }
function ok(msg) { console.log(`  ✅ ${msg}`); }

const EXCLUDE_TERMS = ["sky130", "skywater"];
function isExcluded(str) { return EXCLUDE_TERMS.some(t => str.toLowerCase().includes(t)); }

function main() {
  console.log("🔍 validate:spice-benchmark-data\n");

  // Load JSON snapshot
  const jsonPath = resolve(ROOT, "src/data/generatedSpiceBenchmarkManifest.json");
  if (!existsSync(jsonPath)) {
    fail(`JSON snapshot not found at ${jsonPath}. Run generate:spice-benchmark first.`);
    process.exit(1);
  }

  let data, manifest, sourceInventory;
  try { data = JSON.parse(readFileSync(jsonPath, "utf-8")); manifest = data.manifest; sourceInventory = data.sourceInventory; }
  catch (e) { fail(`Cannot parse JSON: ${e.message}`); process.exit(1); }

  if (!manifest || !manifest.runs) { fail("Manifest missing or has no runs"); process.exit(1); }

  const runs = manifest.runs;
  const runIds = Object.keys(runs);
  ok(`Manifest loaded: ${runIds.length} runs`);

  // Uniqueness
  const seenIds = new Set();
  for (const rid of runIds) { if (seenIds.has(rid)) fail(`Duplicate runId: ${rid}`); seenIds.add(rid); }
  ok("Run IDs unique");

  // Sky130 exclusion
  const jsonText = JSON.stringify(manifest);
  if (isExcluded(jsonText)) fail("Manifest contains excluded term (sky130/skywater)");
  ok("No Sky130/SkyWater");

  // Per-run checks
  for (const rid of runIds) {
    const run = runs[rid];
    if (isExcluded(rid)) fail(`Run ID excluded: ${rid}`);
    if (isExcluded(run.modelId)) fail(`Run ${rid}: excluded modelId`);
    if (isExcluded(run.modelPath)) fail(`Run ${rid}: excluded modelPath`);

    for (const art of run.dataArtifacts) {
      if (isExcluded(art.name) || isExcluded(art.relPath)) fail(`Run ${rid}: excluded data: ${art.relPath}`);
    }
    for (const p of run.plotArtifacts) {
      if (isExcluded(p.name) || isExcluded(p.relPath)) fail(`Run ${rid}: excluded plot: ${p.relPath}`);
    }
    ok(`Run ${rid}: no excluded terms`);

    if (!run.modelId) fail(`Run ${rid}: no modelId`);
    else if (!manifest.models[run.modelId]) warn(`Run ${rid}: model "${run.modelId}" not in models map`);

    const ns = run.netlistSuite;
    if (!ns || !ns.suiteId) fail(`Run ${rid}: no netlist suite`);
    else {
      const circuits = [ns.dcCircuit, ns.acCircuit, ns.transientCircuit, ns.noiseCircuit].filter(Boolean);
      if (circuits.length < 2) warn(`Run ${rid}: suite "${ns.suiteId}" has only ${circuits.length} circuit(s)`);
      else ok(`Run ${rid}: suite "${ns.suiteId}" has ${circuits.length} circuits`);
    }

    // Data artifacts
    for (const art of run.dataArtifacts) {
      if (!art.name) { fail(`Run ${rid}: artifact missing name`); continue; }
      if (art.columns && art.columns.length === 0) fail(`Run ${rid}: ${art.name} empty columns`);
      if (!art.size) warn(`Run ${rid}: ${art.name} missing size`);
    }
    ok(`Run ${rid}: ${run.dataArtifacts.length} data artifacts validated`);

    // Plot artifacts
    for (const p of run.plotArtifacts) {
      if (!p.displayUrl) warn(`Run ${rid}: plot "${p.name}" has no displayUrl`);
    }
    ok(`Run ${rid}: ${run.plotArtifacts.length} plot artifacts validated`);

    // Report
    if (!run.reportSummary?.reportMarkdown) warn(`Run ${rid}: no REPORT.md content`);
    else ok(`Run ${rid}: report present (${run.reportSummary.reportMarkdown.length} chars)`);

    // Verification tests
    for (const t of run.verificationTests) {
      if (!t.name) fail(`Run ${rid}: test missing name`);
      if (!["dc","ac","transient","noise","overview"].includes(t.domain)) warn(`Run ${rid}: test "${t.name}" domain=${t.domain}`);
    }
  }

  // Model formats
  for (const rid of runIds) {
    const run = runs[rid];
    if (!["ngspice","hspice","spectre",""].includes(run.modelFormat)) warn(`Run ${rid}: unknown format "${run.modelFormat}"`);
  }

  // Source inventory comparison (point 15)
  if (sourceInventory) {
    let manifestDataFiles = 0, manifestPlotFiles = 0, manifestReportFiles = 0;
    for (const rid of runIds) {
      const run = runs[rid];
      manifestDataFiles += run.dataArtifacts.length;
      manifestPlotFiles += run.plotArtifacts.length;
      if (run.reportSummary?.reportMarkdown) manifestReportFiles++;
    }
    const si = sourceInventory;

    console.log(`\n📊 Source inventory comparison:`);
    if (si.dataFiles !== manifestDataFiles)
      fail(`Data file count mismatch: source=${si.dataFiles} manifest=${manifestDataFiles}`);
    else ok(`Data files: ${manifestDataFiles} (match)`);

    if (si.plotFiles !== manifestPlotFiles)
      fail(`Plot file count mismatch: source=${si.plotFiles} manifest=${manifestPlotFiles}`);
    else ok(`Plot files: ${manifestPlotFiles} (match)`);

    if (si.reportFiles !== manifestReportFiles)
      fail(`Report file count mismatch: source=${si.reportFiles} manifest=${manifestReportFiles}`);
    else ok(`Report files: ${manifestReportFiles} (match)`);
  }

  // Empty check
  for (const rid of runIds) {
    const run = runs[rid];
    const total = run.dataArtifacts.length + run.plotArtifacts.length;
    if (total === 0) warn(`Run ${rid}: zero data and zero plot artifacts`);
  }

  console.log(`\n${errors > 0 ? "❌" : "✅"} Validation complete: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
