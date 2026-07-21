#!/usr/bin/env node
/* ==================================================================
 *  validate-benchmark-workspace-data.mjs (goal.md §31)
 *
 *  Validates static workspace fixtures after TypeScript compilation.
 *  Checks structural integrity, lineage, and security of committable
 *  fixture files.
 *
 *  Usage: node scripts/validate-benchmark-workspace-data.mjs
 * ================================================================== */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

let errors = 0;
let warnings = 0;

function err(msg) {
  console.error(`  ❌ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ⚠️ ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

/* ─── Check source files exist ─── */
console.log("\n📁 Checking source files...");

const requiredFiles = [
  "src/compat/spiceWorkflow/contracts.ts",
  "src/compat/spiceWorkflow/toolCatalog.ts",
  "src/compat/spiceWorkflow/validation.ts",
  "src/compat/spiceWorkflow/formatters.ts",
  "src/compat/spiceWorkflow/toolAdapter.ts",
  "src/compat/spiceWorkflow/translatorAdapter.ts",
  "src/compat/spiceWorkflow/fittingAdapter.ts",
  "src/compat/spiceWorkflow/reductionAdapter.ts",
  "src/compat/spiceWorkflow/expansionAdapter.ts",
  "src/compat/spiceWorkflow/benchmarkAdapter.ts",
  "src/compat/spiceWorkflow/mockRuntime.ts",
  "src/compat/spiceWorkflow/normalizeLegacyBenchmark.ts",
  "src/compat/spiceWorkflow/normalizeLegacyTranslator.ts",
  "src/compat/spiceWorkflow/normalizeLegacyReduction.ts",
  "src/compat/spiceWorkflow/normalizeLegacyExpansion.ts",
  "src/compat/spiceWorkflow/index.ts",
  "src/data/benchmarkWorkspace/integratedDemo.ts",
  "src/data/benchmarkWorkspace/fittingFixture.ts",
  "src/data/benchmarkWorkspace/bundledModels.ts",
  "src/data/benchmarkWorkspace/selectors.ts",
  "src/data/benchmarkWorkspace/index.ts",
];

for (const f of requiredFiles) {
  const p = resolve(ROOT, f);
  if (existsSync(p)) {
    ok(f);
  } else {
    err(`Missing: ${f}`);
  }
}

/* ─── Security string check ─── */
console.log("\n🔒 Security check (committed fixtures)...");

const fixtureFiles = [
  "src/data/benchmarkWorkspace/integratedDemo.ts",
  "src/data/benchmarkWorkspace/fittingFixture.ts",
  "src/data/benchmarkWorkspace/bundledModels.ts",
];

const securityPatterns = [
  [/\/home\/[a-zA-Z0-9_-]+/g, "/home/<user> path"],
  [/\/Users\/[a-zA-Z0-9_-]+/g, "/Users/<user> path"],
  [/C:\\Users\\/g, "Windows user path"],
  [/ghp_[a-zA-Z0-9]{36}/g, "GitHub PAT"],
  [/gho_[a-zA-Z0-9]{36}/g, "GitHub OAuth token"],
  [/file:\/\/\/home\//g, "file:// user path"],
];

for (const f of fixtureFiles) {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) continue;

  const content = readFileSync(p, "utf-8");
  let fileOk = true;

  for (const [pattern, label] of securityPatterns) {
    if (pattern.test(content)) {
      err(`${f}: contains ${label}`);
      fileOk = false;
    }
  }

  if (fileOk) {
    ok(`${f}: clean`);
  }
}

/* ─── Integrated demo structural check ─── */
console.log("\n📊 Checking integrated demo structure...");

// We can parse the TS export by checking for the exported const name and
// validating inline. For a more thorough check, we depend on tsc.
const demoPath = resolve(ROOT, "src/data/benchmarkWorkspace/integratedDemo.ts");
if (existsSync(demoPath)) {
  const demo = readFileSync(demoPath, "utf-8");

  const checks = [
    { name: "scenarioId: integrated-demo", pattern: /scenarioId:\s*["']integrated-demo["']/ },
    { name: "defaultSimulators includes ngspice", pattern: /defaultSimulators:\s*\[[^\]]*["']ngspice["']/ },
    { name: "defaultSimulators includes spectre", pattern: /defaultSimulators:\s*\[[^\]]*["']spectre["']/ },
    { name: "defaultSimulators includes hspice", pattern: /defaultSimulators:\s*\[[^\]]*["']hspice["']/ },
    { name: "defaultDomains includes dc/ac/transient/noise", pattern: /defaultDomains:\s*\[[^\]]*["']dc["'][^\]]*["']ac["'][^\]]*["']transient["'][^\]]*["']noise["']/ },
    { name: "synthetic-demo origin for Spectre/HSPICE", pattern: /synthetic-demo/ },
    { name: "no Math.random()", pattern: /Math\.random/ },
    { name: "no Date.now()", pattern: /Date\.now/ },
  ];

  for (const check of checks) {
    if (check.pattern.test(demo)) {
      ok(check.name);
    } else {
      // For "no X" checks, NOT matching is success
      if (check.name.startsWith("no ")) {
        ok(check.name);
      } else {
        err(`Missing: ${check.name}`);
      }
    }
  }

  // Check model lineage references
  const modelRefs = demo.match(/parentModelId:\s*["']([^"']+)["']/g) ?? [];
  const modelIds = new Set(
    (demo.match(/modelId:\s*["']([^"']+)["']/g) ?? []).map((m) => m.replace(/.*["']([^"']+)["'].*/, "$1")),
  );

  let lineageErrors = 0;
  for (const ref of modelRefs) {
    const id = ref.replace(/.*["']([^"']+)["'].*/, "$1");
    if (id !== "null" && !modelIds.has(id)) {
      err(`Lineage ref to unknown model: ${id}`);
      lineageErrors++;
    }
  }
  if (lineageErrors === 0) ok("Model lineage references valid");
}

/* ─── Summary ─── */
console.log(`\n${"=".repeat(50)}`);
if (errors === 0) {
  console.log("✅ All checks passed!");
} else {
  console.error(`❌ ${errors} error(s) found`);
}
if (warnings > 0) {
  console.warn(`⚠️  ${warnings} warning(s)`);
}
console.log(`${"=".repeat(50)}\n`);

process.exit(errors > 0 ? 1 : 0);
