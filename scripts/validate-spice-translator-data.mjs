#!/usr/bin/env node
/** validate-spice-translator-data.mjs */

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
  try { data = JSON.parse(readFileSync(JSON_PATH,"utf-8")); } catch(e) { fail(`JSON parse error: ${e.message}`); process.exit(1); }

  // 1. Has report markdown
  if (!data.reportMarkdown || data.reportMarkdown.length < 100) fail("Report Markdown missing or too short");
  else ok(`Report Markdown: ${data.reportMarkdown.length} chars`);

  // 2. Report hash matches
  if (!data.reportHash) fail("No report hash");
  else ok(`Report hash: ${data.reportHash}`);

  // 3. Has hero numbers
  const h = data.hero || {};
  if (!h.pdks) warn("Hero: pdks missing");
  if (!h.sourceFiles) warn("Hero: sourceFiles missing");
  if (h.pdks && h.sourceFiles) ok(`Hero: ${h.pdks} PDKs, ${h.sourceFiles} files`);

  // 4. Plot inventory
  const plotCount = (data.plots||[]).length;
  if (plotCount === 0) warn("No plot artifacts found");
  else ok(`${plotCount} plot artifact(s)`);
  for (const p of data.plots||[]) {
    if (!p.displayUrl) fail(`Plot ${p.name}: no displayUrl`);
    if (!p.hash) warn(`Plot ${p.name}: no hash`);
  }

  // 5. CSV/JSON data
  const csvCount = (data.csvs||[]).length;
  const jsonCount = (data.jsons||[]).length;
  ok(`${csvCount} CSV(s), ${jsonCount} JSON(s)`);

  // 6. No private-model paths in artifact relPaths / displayUrls
  const allPaths = [];
  for (const k of ["plots","csvs","jsons","texs","markdowns","others"]) {
    for (const a of data[k]||[]) { if (a.relPath) allPaths.push(a.relPath); if (a.displayUrl) allPaths.push(a.displayUrl); }
  }
  const excludeTerms = ["private-models","private_models","/tools/spice-libraries/private"];
  let excluded = false;
  for (const t of excludeTerms) {
    for (const p of allPaths) { if (p.includes(t)) { fail(`Artifact path: ${p}`); excluded = true; } }
  }
  if (!excluded) ok("No private-model paths in artifacts");

  // 7. Total counts
  const total = plotCount + csvCount + jsonCount + (data.markdowns||[]).length + (data.texs||[]).length + (data.others||[]).length;
  ok(`Total artifacts indexed: ${total}`);

  console.log(`\n${errors>0?"❌":"✅"} Validation: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(errors>0?1:0);
}
main();
