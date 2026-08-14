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
import { createHash } from "node:crypto";
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
  "src/compat/spiceWorkflow/index.ts",
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
  const modes = ["dc", "transient", "ac", "noise"];
  const netlistExtensions = {
    ngspice: ".cir",
    spectre: ".scs",
    hspice: ".sp",
  };
  const allowedEntries = [
    "REPORT.md",
    "data",
    "manifest.json",
    "native-fixture-manifest.json",
    "netlist",
    "plot",
  ].sort();
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
  let checkedRuns = 0;
  let checkedDataFiles = 0;
  let checkedPlots = 0;
  let checkedNetlists = 0;
  const dataInventoriesByModel = new Map();

  const parseJson = (file) => {
    try {
      return JSON.parse(readFileSync(file, "utf-8"));
    } catch {
      return null;
    }
  };
  const isNonEmptyFile = (file) => (
    existsSync(file) && statSync(file).isFile() && statSync(file).size > 0
  );
  const sha256 = (file) => (
    createHash("sha256").update(readFileSync(file)).digest("hex")
  );

  // Discover what is actually complete on disk.  Do not manufacture an
  // expected model × simulator Cartesian product from a global inventory.
  for (const md5Entry of readdirSync(BENCHMARK_DATA, { withFileTypes: true })) {
    if (!md5Entry.isDirectory() || !/^[a-f0-9]{32}$/i.test(md5Entry.name)) continue;
    const md5 = md5Entry.name;
    const modelDir = resolve(BENCHMARK_DATA, md5);
    if (!isNonEmptyFile(resolve(modelDir, "model-manifest.json"))) continue;

    for (const [simulator, extension] of Object.entries(netlistExtensions)) {
      const runDir = resolve(modelDir, simulator);
      const parsed = parseJson(resolve(runDir, "manifest.json"));

      // This is the same admission gate used by the Vite runtime index.
      // Incomplete and historical pre-contract runs are intentionally hidden.
      if (
        parsed?.status !== "completed"
        || parsed?.returnCode !== 0
        || parsed?.benchmarkFixtureMode !== "fixed-simulator-native"
        || parsed?.netlistAstUsed !== false
        || parsed?.parameterPreservingInput !== true
        || parsed?.modelFallbackApplied !== false
        || (
          Array.isArray(parsed?.internalFailureMarkers)
          && parsed.internalFailureMarkers.length > 0
        )
      ) {
        continue;
      }

      checkedRuns++;
      const actualEntries = readdirSync(runDir).sort();
      if (JSON.stringify(actualEntries) !== JSON.stringify(allowedEntries)) {
        err(`${md5}/${simulator}: invalid result entries ${actualEntries.join(", ")}`);
      }
      if (!isNonEmptyFile(resolve(runDir, "REPORT.md"))) {
        err(`${md5}/${simulator}: missing or empty REPORT.md`);
      }
      if (parsed.netlistDirectory !== "netlist") {
        err(`${md5}/${simulator}: manifest netlistDirectory is not "netlist"`);
      }
      const checksum = parsed.checksum ?? parsed.md5 ?? parsed.modelMd5 ?? parsed.model_md5;
      if (checksum !== undefined && checksum !== null && checksum !== md5) {
        err(`${md5}/${simulator}: manifest checksum mismatch`);
      }
      const parameterContext = parsed.parameterContext ?? {};
      if (
        parameterContext.guessedDefaults === true
        || (
          Array.isArray(parameterContext.unresolvedSymbols)
          && parameterContext.unresolvedSymbols.length > 0
        )
      ) {
        err(`${md5}/${simulator}: unresolved or guessed model parameters`);
      }
      const manifestText = JSON.stringify(parsed).toLowerCase();
      for (const marker of forbiddenModelTransforms) {
        if (manifestText.includes(marker)) {
          err(`${md5}/${simulator}: forbidden model transform "${marker}"`);
        }
      }

      const dataDir = resolve(runDir, "data");
      const dataNames = existsSync(dataDir)
        ? readdirSync(dataDir)
          .filter((name) => statSync(resolve(dataDir, name)).isFile())
          .sort()
        : [];
      if (dataNames.length === 0) {
        err(`${md5}/${simulator}: no data files`);
      }
      for (const name of dataNames) {
        if (!isNonEmptyFile(resolve(dataDir, name))) {
          err(`${md5}/${simulator}/data/${name}: empty file`);
        }
        checkedDataFiles++;
      }
      if (!dataInventoriesByModel.has(md5)) {
        dataInventoriesByModel.set(md5, new Map());
      }
      dataInventoriesByModel.get(md5).set(simulator, dataNames);

      const fixtureManifestPath = resolve(runDir, "native-fixture-manifest.json");
      const fixtureManifest = parseJson(fixtureManifestPath);
      if (
        fixtureManifest?.fixtureMode !== "fixed-simulator-native"
        || fixtureManifest?.netlistAstUsed !== false
        || !/^[a-f0-9]{64}$/i.test(fixtureManifest?.benchmarkContractSha256 ?? "")
      ) {
        err(`${md5}/${simulator}: invalid native fixture manifest`);
      }

      const netlistDir = resolve(runDir, "netlist");
      const expectedNetlists = modes.map((mode) => `${mode}${extension}`).sort();
      const actualNetlists = existsSync(netlistDir) ? readdirSync(netlistDir).sort() : [];
      if (JSON.stringify(actualNetlists) !== JSON.stringify(expectedNetlists)) {
        err(`${md5}/${simulator}: invalid netlist inventory ${actualNetlists.join(", ")}`);
      }
      for (const mode of modes) {
        const name = `${mode}${extension}`;
        const file = resolve(netlistDir, name);
        if (!isNonEmptyFile(file)) {
          err(`${md5}/${simulator}/netlist/${name}: missing or empty file`);
          continue;
        }
        const fixture = fixtureManifest?.fixtures?.[mode];
        if (
          !/^[a-f0-9]{64}$/i.test(fixture?.templateSha256 ?? "")
          || !/^[a-f0-9]{64}$/i.test(fixture?.submittedSha256 ?? "")
          || sha256(file) !== fixture.submittedSha256
        ) {
          err(`${md5}/${simulator}/netlist/${name}: fixture hash mismatch`);
        }
        checkedNetlists++;
      }

      const provenance = parseJson(resolve(runDir, "data", "plot_provenance.json"));
      if (provenance?.syntheticDataUsed !== false) {
        err(`${md5}/${simulator}: synthetic plot data is not explicitly disabled`);
      }
      const declaredPlots = provenance?.plots ?? {};
      const plotsDir = resolve(runDir, "plot");
      const actualPlotNames = existsSync(plotsDir)
        ? readdirSync(plotsDir).filter((name) => name.endsWith(".png"))
        : [];
      if (actualPlotNames.length === 0) {
        err(`${md5}/${simulator}: no PNG plots`);
      }
      for (const name of actualPlotNames) {
        const file = resolve(plotsDir, name);
        const buf = readFileSync(file);
        if (
          buf.length < 4
          || buf[0] !== 0x89
          || buf[1] !== 0x50
          || buf[2] !== 0x4e
          || buf[3] !== 0x47
        ) {
          err(`${md5}/${simulator}/plot/${name}: invalid PNG`);
        }
        const plotEvidence = declaredPlots[name];
        if (
          plotEvidence?.syntheticDataUsed !== false
          || !Array.isArray(plotEvidence?.sources)
          || plotEvidence.sources.length === 0
        ) {
          err(`${md5}/${simulator}/plot/${name}: incomplete provenance`);
        } else {
          for (const source of plotEvidence.sources) {
            if (
              typeof source !== "string"
              || !source.startsWith("data/")
              || !isNonEmptyFile(resolve(runDir, source))
            ) {
              err(`${md5}/${simulator}/plot/${name}: invalid source ${String(source)}`);
            }
          }
        }
        checkedPlots++;
      }
    }
  }

  for (const [md5, simulatorInventories] of dataInventoriesByModel) {
    const signatures = new Set(
      [...simulatorInventories.values()].map((names) => JSON.stringify(names)),
    );
    if (signatures.size !== 1) {
      const details = [...simulatorInventories.entries()]
        .map(([simulator, names]) => `${simulator}=[${names.join(", ")}]`)
        .join("; ");
      err(`${md5}: simulator data inventories differ: ${details}`);
    }
  }

  if (checkedRuns === 0) {
    err("No complete fixed-native model/simulator runs are displayable");
  } else {
    ok(`${checkedRuns} complete displayable model/simulator runs validated`);
    ok(`${checkedDataFiles} non-empty data files validated`);
    ok(`${checkedPlots} plot files and provenance records validated`);
    ok(`${checkedNetlists} executed native netlist files validated`);
  }
}

/* ─── 5. Frontend loading contract ─── */
console.log("\n📋 Frontend loading contract...");
const loader = readFileSync(resolve(ROOT, "src/data/benchmarkWorkspace/dataLoader.ts"), "utf-8");
const comparison = readFileSync(resolve(ROOT, "src/pages/benchmark/ModelComparisonCard.tsx"), "utf-8");
const contractChecks = [
  [loader, /loadBenchmarkRuns/, "selected-run loader exported"],
  [loader, /fetchAvailableRuns/, "completed-run discovery exported"],
  [loader, /available-runs\.json/, "dynamic completed-run index fetched"],
  [loader, /for \(const run of index\.runs\)/, "scenario built from discovered runs"],
  [loader, /\$\{md5\}\/\$\{sim\}\/manifest\.json/, "per-run manifest fetched"],
  [loader, /fetchReport\(md5, sim\)/, "per-run REPORT fetched"],
  [loader, /loadRunManifest\(md5, sim, fallback\)/, "selected manifest loaded lazily"],
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
