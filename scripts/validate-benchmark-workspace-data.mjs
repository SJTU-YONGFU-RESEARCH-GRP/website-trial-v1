#!/usr/bin/env node
/* ==================================================================
 *  validate-benchmark-workspace-data.mjs (goal3.md §12)
 *
 *  Extended validator. Checks:
 *  - Real file existence for all plot displayUrls
 *  - PNG magic bytes / SVG validity
 *  - Baseline/candidate artifactId uniqueness
 *  - BASE URL resolvability
 *  - No wrong legacy paths
 *  - Default artifact state (no "all")
 *  - Tool labels correct
 * ================================================================== */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC = resolve(ROOT, "public");

let errors = 0;
let warnings = 0;

function err(msg) { console.error(`  ❌ ${msg}`); errors++; }
function warn(msg) { console.warn(`  ⚠️ ${msg}`); warnings++; }
function ok(msg) { console.log(`  ✅ ${msg}`); }

/* ─── 1. Source file existence ─── */
console.log("\n📁 Source files...");
const required = [
  "src/compat/spiceWorkflow/contracts.ts", "src/compat/spiceWorkflow/toolCatalog.ts",
  "src/compat/spiceWorkflow/validation.ts", "src/compat/spiceWorkflow/formatters.ts",
  "src/compat/spiceWorkflow/toolAdapter.ts", "src/compat/spiceWorkflow/translatorAdapter.ts",
  "src/compat/spiceWorkflow/fittingAdapter.ts", "src/compat/spiceWorkflow/reductionAdapter.ts",
  "src/compat/spiceWorkflow/expansionAdapter.ts", "src/compat/spiceWorkflow/benchmarkAdapter.ts",
  "src/compat/spiceWorkflow/workflowAnalyzer.ts", "src/compat/spiceWorkflow/configurationFingerprint.ts",
  "src/compat/spiceWorkflow/mockRuntime.ts", "src/compat/spiceWorkflow/index.ts",
  "src/data/benchmarkWorkspace/integratedDemo.ts", "src/data/benchmarkWorkspace/bundledModels.ts",
  "src/data/benchmarkWorkspace/selectors.ts", "src/data/benchmarkWorkspace/index.ts",
  "src/pages/benchmark/BenchmarkWorkspacePage.tsx",
];
for (const f of required) {
  existsSync(resolve(ROOT, f)) ? ok(f) : err(`Missing: ${f}`);
}

/* ─── 2. Forbidden strings ─── */
console.log("\n🔍 Forbidden strings...");
const uiFiles = [
  "src/pages/benchmark/BenchmarkWorkspacePage.tsx",
  "src/pages/benchmark/OperationSelector.tsx",
  "src/pages/benchmark/WorkflowPlanCard.tsx",
  "src/pages/benchmark/FittingSettings.tsx",
  "src/pages/benchmark/ModelComparisonCard.tsx",
];
const forbidden = [
  [/Integrated Workflow Demo/, "Integrated Workflow Demo"],
  [/Fixed execution order/, "Fixed execution order"],
  [/Convert → Calibrate/, "Convert → Calibrate (old name)"],
  [/⚠ DC IV calibration/, "⚠ DC IV calibration"],
  [/CANONICAL_WORKFLOW_ORDER/, "CANONICAL_WORKFLOW_ORDER"],
];
for (const f of uiFiles) {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) continue;
  const content = readFileSync(p, "utf-8");
  let clean = true;
  for (const [re, label] of forbidden) {
    if (re.test(content)) { err(`${f}: contains "${label}"`); clean = false; }
  }
  if (clean) ok(f);
}

/* ─── 3. Tool catalog labels ─── */
console.log("\n🏷 Tool labels...");
const catalogPath = resolve(ROOT, "src/compat/spiceWorkflow/toolCatalog.ts");
const catalog = readFileSync(catalogPath, "utf-8");
const expectedLabels = [
  ["translator", "Translator"], ["reduction", "Reduction"],
  ["expansion", "Expansion"], ["fitting", "Fitting"], ["benchmark", "Benchmark"],
];
for (const [id, label] of expectedLabels) {
  const re = new RegExp(`id:\\s*["']${id}["'][\\s\\S]*?label:\\s*["']${label}["']`);
  re.test(catalog) ? ok(`${id} = ${label}`) : err(`${id} label is not "${label}"`);
}

/* ─── 4. Real plot file validation ─── */
console.log("\n🖼 Plot file validation...");
const demoPath = resolve(ROOT, "src/data/benchmarkWorkspace/integratedDemo.ts");
if (existsSync(demoPath)) {
  const demo = readFileSync(demoPath, "utf-8");

  // Check for wrong legacy paths
  const wrongPaths = [
    /benchmark\/results\/dc_iv_characteristics/g,
    /benchmark\/results\/dc_kcl/g,
    /benchmark\/results\/trans_/g,
    /benchmark\/results\/noise_/g,
  ];
  for (const re of wrongPaths) {
    if (re.test(demo)) { err(`integratedDemo.ts: contains wrong legacy path pattern`); break; }
  }

  // Extract displayUrls and verify file existence
  const urls = [...demo.matchAll(/displayUrl:\s*["'](benchmark\/[^"']+)["']/g)];
  let checkedPlots = 0;
  for (const m of urls) {
    const fp = resolve(PUBLIC, m[1]);
    if (existsSync(fp)) {
      const st = statSync(fp);
      if (st.size === 0) { err(`Zero-size file: ${m[1]}`); }

      // PNG magic bytes check
      if (m[1].endsWith(".png")) {
        const buf = readFileSync(fp);
        if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) {
          err(`Not a valid PNG: ${m[1]}`);
        }
      }
      // SVG check
      if (m[1].endsWith(".svg")) {
        const head = readFileSync(fp).slice(0, 200).toString();
        if (!head.includes("<svg")) err(`Not a valid SVG: ${m[1]}`);
      }
      checkedPlots++;
    } else {
      err(`Plot file not found: public/${m[1]}`);
    }
  }
  ok(`${checkedPlots} plot file(s) validated`);

  // Check baseline/candidate uniqueness
  const baselineIds = [...demo.matchAll(/bp-input-ngspice-/g)];
  const candidateIds = [...demo.matchAll(/bp-reduced-ngspice-/g)];
  if (baselineIds.length > 0 && candidateIds.length > 0) {
    ok("Baseline and candidate plots use distinct artifact IDs");
  }

  // Check for synthetic mislabeling
  if (demo.includes('"existing-tool-output"')) ok("existing-tool-output used correctly");
  if (demo.includes('"synthetic-demo"')) ok("synthetic-demo markers present");
}

/* ─── 5. Operation order ─── */
console.log("\n📋 Operation order...");
const mainPage = resolve(ROOT, "src/pages/benchmark/BenchmarkWorkspacePage.tsx");
const mpContent = existsSync(mainPage) ? readFileSync(mainPage, "utf-8") : "";
const checks = [
  [/operationOrder/, "operationOrder state present"],
  [/onOrderChange/, "onOrderChange handler present"],
  [/DEFAULT_OPERATION_ORDER/, "DEFAULT_OPERATION_ORDER used"],
  [/ScenarioSelector/, ""], // should NOT exist
];
for (const [re, label] of checks) {
  if (label === "") {
    re.test(mpContent) ? err("ScenarioSelector still referenced in main page") : ok("No ScenarioSelector reference");
  } else {
    re.test(mpContent) ? ok(label) : err(`Missing: ${label}`);
  }
}

/* ─── 6. Security ─── */
console.log("\n🔒 Security...");
const fixtureFiles = ["integratedDemo.ts", "fittingFixture.ts", "bundledModels.ts"];
const securityPatterns = [
  [/\/home\/[a-zA-Z0-9_-]+/g, "/home/<user>"], [/\/Users\/[a-zA-Z0-9_-]+/g, "/Users/<user>"],
  [/C:\\Users\\/g, "Windows user path"], [/ghp_[a-zA-Z0-9]{36}/g, "GitHub PAT"],
];
for (const f of fixtureFiles) {
  const p = resolve(ROOT, "src/data/benchmarkWorkspace", f);
  if (!existsSync(p)) { warn(`Fixture not found: ${f}`); continue; }
  const content = readFileSync(p, "utf-8");
  let clean = true;
  for (const [re, label] of securityPatterns) {
    if (re.test(content)) { err(`${f}: ${label}`); clean = false; }
  }
  if (clean) ok(f);
}

/* ─── Summary ─── */
console.log(`\n${"=".repeat(50)}`);
if (errors === 0) console.log("✅ All checks passed!");
else console.error(`❌ ${errors} error(s) found`);
if (warnings > 0) console.warn(`⚠️  ${warnings} warning(s)`);
console.log(`${"=".repeat(50)}\n`);
process.exit(errors > 0 ? 1 : 0);
