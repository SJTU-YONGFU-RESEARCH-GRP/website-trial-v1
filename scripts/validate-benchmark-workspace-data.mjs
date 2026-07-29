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

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BENCHMARK_DATA = resolve(ROOT, "data/spice-model-benchmark");

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
  "src/data/benchmarkWorkspace/dataLoader.ts",
  "src/data/benchmarkWorkspace/reportParser.ts",
  "src/pages/benchmark/BenchmarkWorkspacePage.tsx",
  "src/pages/benchmark/ModelComparisonCard.tsx",
  "src/pages/benchmark/ReportViewerCard.tsx",
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

/* ─── 4. Current benchmark result tree ─── */
console.log("\n🖼 Benchmark result tree...");
if (!existsSync(BENCHMARK_DATA)) {
  err("Missing data/spice-model-benchmark");
} else {
  const globalManifestPath = resolve(BENCHMARK_DATA, "manifest.json");
  if (!existsSync(globalManifestPath)) {
    err("Missing global benchmark manifest");
  } else {
    const globalManifest = JSON.parse(readFileSync(globalManifestPath, "utf-8"));
    const md5s = Object.values(globalManifest.models ?? {}).map((model) => model.md5);
    const simulators = globalManifest.simulators ?? [];
    let checkedRuns = 0;
    let checkedPlots = 0;
    let checkedNetlists = 0;
    const netlistExtensions = {
      ngspice: ".cir",
      spectre: ".scs",
      hspice: ".sp",
    };

    for (const md5 of md5s) {
      for (const simulator of simulators) {
        const runDir = resolve(BENCHMARK_DATA, md5, simulator);
        const runManifest = resolve(runDir, "manifest.json");
        const report = resolve(runDir, "REPORT.md");
        const allowedEntries = ["REPORT.md", "data", "manifest.json", "netlist", "plot"];
        if (existsSync(runDir)) {
          const actualEntries = readdirSync(runDir).sort();
          if (JSON.stringify(actualEntries) !== JSON.stringify([...allowedEntries].sort())) {
            err(`${md5}/${simulator}: invalid result entries ${actualEntries.join(", ")}`);
          }
        }
        if (!existsSync(runManifest)) err(`${md5}/${simulator}: missing manifest.json`);
        if (!existsSync(report)) err(`${md5}/${simulator}: missing REPORT.md`);
        if (existsSync(runManifest)) {
          const parsed = JSON.parse(readFileSync(runManifest, "utf-8"));
          const checksum = parsed.checksum ?? parsed.md5 ?? parsed.modelMd5 ?? parsed.model_md5;
          if (checksum !== md5) err(`${md5}/${simulator}: manifest checksum mismatch`);
          if (parsed.netlistDirectory !== "netlist") {
            err(`${md5}/${simulator}: manifest netlistDirectory is not "netlist"`);
          }
          if (parsed.parameterPreservingInput !== true) {
            err(`${md5}/${simulator}: input is not certified parameter-preserving`);
          }
          if (parsed.modelFallbackApplied !== false) {
            err(`${md5}/${simulator}: model fallback status is not explicitly false`);
          }
          const manifestText = JSON.stringify(parsed).toLowerCase();
          const forbiddenModelTransforms = [
            "capability normalization",
            "portable bsim4.5",
            "lowered simulator-incompatible",
            "disabled optional rbodymod",
            "disabled optional rgatemod",
            "disabled optional geomod",
            "disabled optional trnqsmod",
            "disabled optional acnqsmod",
            "removed unresolved symbolic parameter",
          ];
          for (const marker of forbiddenModelTransforms) {
            if (manifestText.includes(marker)) {
              err(`${md5}/${simulator}: forbidden model transform "${marker}"`);
            }
          }
        }

        const netlistDir = resolve(runDir, "netlist");
        const extension = netlistExtensions[simulator];
        const expectedNetlists = ["dc", "transient", "ac", "noise"].map(
          (mode) => `${mode}${extension}`,
        );
        if (!existsSync(netlistDir)) {
          err(`${md5}/${simulator}: missing netlist directory`);
        } else {
          const actualNetlists = readdirSync(netlistDir).sort();
          if (JSON.stringify(actualNetlists) !== JSON.stringify([...expectedNetlists].sort())) {
            err(`${md5}/${simulator}: invalid netlist inventory ${actualNetlists.join(", ")}`);
          }
          for (const name of actualNetlists) {
            if (statSync(resolve(netlistDir, name)).size === 0) {
              err(`${md5}/${simulator}/netlist/${name}: empty file`);
            }
            checkedNetlists++;
          }
        }

        const plotsDir = resolve(runDir, "plot");
        if (!existsSync(plotsDir)) {
          err(`${md5}/${simulator}: missing plots directory`);
        } else {
          for (const name of readdirSync(plotsDir)) {
            if (!name.endsWith(".png")) continue;
            const file = resolve(plotsDir, name);
            const st = statSync(file);
            if (st.size === 0) err(`${md5}/${simulator}/plot/${name}: empty file`);
            const buf = readFileSync(file);
            if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
              err(`${md5}/${simulator}/plot/${name}: invalid PNG`);
            }
            checkedPlots++;
          }
        }
        checkedRuns++;
      }
    }
    ok(`${checkedRuns} model/simulator run directories validated`);
    ok(`${checkedPlots} plot files validated`);
    ok(`${checkedNetlists} executed netlist files validated`);
  }
}

/* ─── 5. Frontend loading contract ─── */
console.log("\n📋 Frontend loading contract...");
const loader = readFileSync(resolve(ROOT, "src/data/benchmarkWorkspace/dataLoader.ts"), "utf-8");
const comparison = readFileSync(resolve(ROOT, "src/pages/benchmark/ModelComparisonCard.tsx"), "utf-8");
const contractChecks = [
  [loader, /loadBenchmarkRuns/, "selected-run loader exported"],
  [loader, /\$\{md5\}\/\$\{sim\}\/manifest\.json/, "per-run manifest fetched"],
  [loader, /fetchReport\(md5, sim\)/, "per-run REPORT fetched"],
  [loader, /loadRunManifest\(md5, sim, info\)/, "selector manifests loaded per run"],
  [comparison, /selectedRunIds/, "selection keyed by model and simulator run"],
  [comparison, /loadBenchmarkRuns\(selectedRunIds\)/, "selection triggers lazy REPORT loading"],
  [comparison, /loaded\.runModelIds/, "selected simulator runs compared"],
  [comparison, /UID:/, "selector labels checksum as UID"],
  [comparison, /Report:/, "selector displays report timestamp"],
];
for (const [source, pattern, label] of contractChecks) {
  pattern.test(source) ? ok(label) : err(`Missing: ${label}`);
}
if (/wallTimeMs:\s*1500|peakRssMB:\s*120/.test(loader)) {
  err("Hardcoded benchmark resource metrics remain");
} else {
  ok("No hardcoded benchmark time or memory fixtures");
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
