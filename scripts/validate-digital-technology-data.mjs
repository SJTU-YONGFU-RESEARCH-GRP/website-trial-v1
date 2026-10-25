#!/usr/bin/env node
/** Validate UID-addressed Digital Technology resources and open-PDK adders. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const store = path.join(dataDir, "digital-technologies");
const expectedArchitectures = [
  "carry_lookahead_adder",
  "carry_select_adder",
  "kogge_stone_adder",
  "ripple_carry_adder",
];
const expectedWidths = [4, 8, 16, 32];
const requiredArtifacts = [
  "result.json",
  "rtl.v",
  "testbench.v",
  "rtl-simulation.log",
  "synthesis.ys",
  "synthesis.log",
  "mapped.v",
  "mapped.json",
  "area.rpt",
  "sta.tcl",
  "sta.log",
];
const sky130LibcharxArchitectures = [
  "alternating_polarity_adder",
  "carry_select_adder",
  "carry_skip_adder",
  "kogge_stone_adder",
  "ripple_carry_adder",
];
const sky130LibcharxArtifacts = [
  "result.json",
  "rtl.v",
  "adder_primitives.v",
  "cells_blackbox.v",
  "cells_functional.v",
  "synthesis.ys",
  "synthesis.log",
  "mapped.v",
  "mapped.json",
  "area.rpt",
  "sta.tcl",
  "sta.log",
];

function fail(message) {
  throw new Error(`[validate-digital-technology-data] ${message}`);
}

function uidFor(manifest) {
  const identity = JSON.stringify({
    schemaVersion: 1,
    processNode: manifest.processNode,
    canonicalTechnology: manifest.canonicalTechnology,
    isNamedPdk: manifest.isNamedPdk,
  });
  return createHash("md5").update(identity).digest("hex");
}

const rootJson = fs.readdirSync(dataDir).filter((name) => name.endsWith(".json"));
if (rootJson.some((name) => name !== "technology-map.json")) {
  fail(`legacy flat JSON remains under data/: ${rootJson.join(", ")}`);
}

const resources = fs.readdirSync(store, { withFileTypes: true }).filter((entry) => entry.isDirectory());
for (const entry of resources) {
  if (!/^[a-f0-9]{32}$/.test(entry.name)) fail(`non-MD5 directory: ${entry.name}`);
  const manifestPath = path.join(store, entry.name, "technology.json");
  if (!fs.existsSync(manifestPath)) fail(`${entry.name}: missing technology.json`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.uid !== entry.name || uidFor(manifest) !== entry.name) {
    fail(`${entry.name}: UID/identity mismatch`);
  }
}

const openPdkNodes = ["freepdk45", "gf180", "ihpsg13g2"];
for (const processNode of openPdkNodes) {
  const resource = resources.find((entry) => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(store, entry.name, "technology.json"), "utf8"),
    );
    return manifest.processNode === processNode;
  });
  if (!resource) fail(`missing open-PDK resource: ${processNode}`);
  const resourceDir = path.join(store, resource.name);
  const manifest = JSON.parse(fs.readFileSync(path.join(resourceDir, "technology.json"), "utf8"));
  const liberty = path.join(resourceDir, "library", "timing.lib");
  if (!fs.existsSync(liberty) || fs.statSync(liberty).size === 0) {
    fail(`${processNode}: missing materialized Liberty`);
  }
  const libertySha256 = createHash("sha256").update(fs.readFileSync(liberty)).digest("hex");
  if (libertySha256 !== manifest.materializedLibertySha256) {
    fail(`${processNode}: Liberty SHA-256 mismatch`);
  }
  let points = 0;
  for (const architecture of expectedArchitectures) {
    for (const width of expectedWidths) {
      const pointDir = path.join(
        resourceDir,
        "results",
        "adders",
        architecture,
        `w${width}`,
      );
      for (const artifact of requiredArtifacts) {
        const artifactPath = path.join(pointDir, artifact);
        if (!fs.existsSync(artifactPath) || fs.statSync(artifactPath).size === 0) {
          // Icarus compile logs are intentionally empty on a warning-free compile.
          if (artifact !== "iverilog-compile.log") {
            fail(`${processNode}/${architecture}/w${width}: missing ${artifact}`);
          }
        }
      }
      const row = JSON.parse(fs.readFileSync(path.join(pointDir, "result.json"), "utf8"));
      if (
        row.processNode !== processNode
        || row.architecture !== architecture
        || row.bitWidth !== width
        || row.flow?.technologyUid !== resource.name
      ) {
        fail(`${processNode}/${architecture}/w${width}: result identity mismatch`);
      }
      if (
        row.flow?.rtlSimulation?.status !== "pass"
        || row.flow?.synthesis?.status !== "pass"
        || row.flow?.sta?.status !== "pass"
      ) {
        fail(`${processNode}/${architecture}/w${width}: flow did not pass`);
      }
      for (const metric of ["fmaxMhz", "powerMw", "areaUm2"]) {
        if (typeof row[metric] !== "number" || !Number.isFinite(row[metric]) || row[metric] <= 0) {
          fail(`${processNode}/${architecture}/w${width}: invalid ${metric}`);
        }
      }
      points += 1;
    }
  }
  if (points !== 16) fail(`${processNode}: expected 16 complete points, found ${points}`);
  console.log(`  OK ${processNode}: ${resource.name} · ${points} complete adder points`);
}

const sky130Resource = resources.find((entry) => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(store, entry.name, "technology.json"), "utf8"),
  );
  return manifest.processNode === "sky130hd_libcharx";
});
if (!sky130Resource) fail("missing SKY130 HD LibCharX resource");
const sky130Dir = path.join(store, sky130Resource.name);
const sky130Manifest = JSON.parse(
  fs.readFileSync(path.join(sky130Dir, "technology.json"), "utf8"),
);
const sky130Liberty = path.join(sky130Dir, "library", "timing.lib");
if (!fs.existsSync(sky130Liberty) || fs.statSync(sky130Liberty).size === 0) {
  fail("sky130hd_libcharx: missing materialized LibCharX Liberty");
}
const sky130LibertySha256 = createHash("sha256")
  .update(fs.readFileSync(sky130Liberty))
  .digest("hex");
if (sky130LibertySha256 !== sky130Manifest.materializedLibertySha256) {
  fail("sky130hd_libcharx: Liberty SHA-256 mismatch");
}
for (const evidence of [
  "README.md",
  "characterization-run-manifest.json",
  "characterization-results.json",
  "synthesis-summary.json",
  "timing-summary.json",
  "verification-summary.json",
  "comparison.csv",
  "final-report.md",
  "formal-rtl.log",
  "formal-mapped.log",
]) {
  const evidencePath = path.join(sky130Dir, "evidence", evidence);
  if (!fs.existsSync(evidencePath) || fs.statSync(evidencePath).size === 0) {
    fail(`sky130hd_libcharx: missing evidence/${evidence}`);
  }
}
let sky130Points = 0;
for (const architecture of sky130LibcharxArchitectures) {
  const pointDir = path.join(
    sky130Dir,
    "results",
    "adders",
    architecture,
    "w8",
  );
  for (const artifact of sky130LibcharxArtifacts) {
    const artifactPath = path.join(pointDir, artifact);
    if (!fs.existsSync(artifactPath) || fs.statSync(artifactPath).size === 0) {
      fail(`sky130hd_libcharx/${architecture}/w8: missing ${artifact}`);
    }
  }
  const row = JSON.parse(fs.readFileSync(path.join(pointDir, "result.json"), "utf8"));
  if (
    row.processNode !== "sky130hd_libcharx"
    || row.architecture !== architecture
    || row.bitWidth !== 8
    || row.flow?.technologyUid !== sky130Resource.name
  ) {
    fail(`sky130hd_libcharx/${architecture}/w8: result identity mismatch`);
  }
  if (
    row.flow?.characterization?.status !== "pass"
    || row.flow?.formalVerification?.status !== "pass"
    || row.flow?.synthesis?.status !== "pass"
    || row.flow?.sta?.status !== "pass"
  ) {
    fail(`sky130hd_libcharx/${architecture}/w8: source flow did not pass`);
  }
  if (!String(row.flow?.ppa?.powerMetric).includes("transition-power proxy")) {
    fail(`sky130hd_libcharx/${architecture}/w8: power proxy policy missing`);
  }
  for (const metric of ["fmaxMhz", "powerMw", "areaUm2"]) {
    if (typeof row[metric] !== "number" || !Number.isFinite(row[metric]) || row[metric] <= 0) {
      fail(`sky130hd_libcharx/${architecture}/w8: invalid ${metric}`);
    }
  }
  sky130Points += 1;
}
if (sky130Points !== 5) {
  fail(`sky130hd_libcharx: expected 5 complete points, found ${sky130Points}`);
}
console.log(
  `  OK sky130hd_libcharx: ${sky130Resource.name} · ${sky130Points} verified 8-bit adder points`,
);

console.log(
  `[validate-digital-technology-data] ${resources.length} MD5 resources; 3 open PDK matrices + SKY130 LibCharX set complete`,
);
