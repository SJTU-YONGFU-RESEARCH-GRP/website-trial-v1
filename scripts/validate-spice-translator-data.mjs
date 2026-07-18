#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const JSON_PATH = resolve(ROOT, "src/data/generatedSpiceTranslatorManifest.json");

let errors = 0, warnings = 0;
function fail(msg) { console.error(`  ❌ ${msg}`); errors++; }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warnings++; }
function ok(msg) { console.log(`  ✅ ${msg}`); }

function main() {
  console.log("🔍 validate:spice-translator-data\n");
  if (!existsSync(JSON_PATH)) { fail("JSON snapshot not found"); process.exit(1); }
  let data;
  try { data = JSON.parse(readFileSync(JSON_PATH, "utf-8")); } catch (e) { fail(`JSON parse error: ${e.message}`); process.exit(1); }

  const results = data.results || [];
  if (results.length === 0) { fail("No results in manifest"); process.exit(1); }
  ok(`${results.length} results found`);

  for (const r of results) {
    // Check each result has an ID
    if (!r.resultId) { fail("Result missing resultId"); continue; }

    // Reports
    if (!r.reports) { warn(`${r.resultId}: no reports array`); }
    else ok(`${r.resultId}: ${r.reports.length} report(s), ${r.plots?.length || 0} plot(s), ${(r.dataArtifacts?.length || 0) + (r.otherArtifacts?.length || 0)} data artifact(s)`);

    // Reports must have fetchUrl
    for (const rpt of (r.reports || [])) {
      if (!rpt.fetchUrl) warn(`${r.resultId}: report "${rpt.name}" has no fetchUrl`);
      if (!rpt.hash) warn(`${r.resultId}: report "${rpt.name}" has no hash`);
    }

    // Plots must have displayUrl
    for (const p of (r.plots || [])) {
      if (!p.displayUrl) fail(`${r.resultId}: plot "${p.name}" has no displayUrl`);
    }
  }

  // No private-model paths
  const allPaths = [];
  for (const r of results) {
    for (const rpt of (r.reports || [])) { if (rpt.relPath) allPaths.push(rpt.relPath); if (rpt.fetchUrl) allPaths.push(rpt.fetchUrl); }
    for (const p of (r.plots || [])) { if (p.relPath) allPaths.push(p.relPath); if (p.displayUrl) allPaths.push(p.displayUrl); }
    for (const a of [...(r.dataArtifacts || []), ...(r.otherArtifacts || [])]) { if (a.relPath) allPaths.push(a.relPath); }
  }
  const excludeTerms = ["private-models", "private_models", "/tools/spice-libraries/private"];
  let excluded = false;
  for (const t of excludeTerms) {
    for (const p of allPaths) { if (p.includes(t)) { fail(`Path contains excluded term: ${p}`); excluded = true; } }
  }
  if (!excluded) ok("No private-model paths in artifacts");

  // Count totals
  const totalPlots = results.reduce((s, r) => s + (r.plots?.length || 0), 0);
  const totalReports = results.reduce((s, r) => s + (r.reports?.length || 0), 0);
  ok(`Total: ${totalReports} reports, ${totalPlots} plots across ${results.length} results`);

  console.log(`\n${errors > 0 ? "❌" : "✅"} Validation: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(errors > 0 ? 1 : 0);
}
main();
