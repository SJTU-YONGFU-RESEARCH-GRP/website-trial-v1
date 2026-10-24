import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_ROOT = join(ROOT, "data", "spice-model-benchmark");
const PARSER_SOURCE = join(ROOT, "src", "data", "benchmarkWorkspace", "reportParser.ts");

function loadParser() {
  const source = readFileSync(PARSER_SOURCE, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    fileName: PARSER_SOURCE,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
  }
  return import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`);
}

function collectSubsections(report) {
  return report.sections.flatMap((section) => section.subsections);
}

function reportEntries(report) {
  return [
    ...report.simulationSetup,
    ...Object.values(report.summary).flat(),
    ...report.sections.flatMap((section) => [
      ...(section.entries ?? []),
      ...section.subsections.flatMap((subsection) => subsection.entries),
    ]),
  ];
}

const { parseReportMD } = await loadParser();
const simulatorExtensions = {
  ngspice: ".cir",
  hspice: ".sp",
  spectre: ".scs",
};
const modes = ["dc", "transient", "ac", "noise"];
const displayableRuns = [];

// Discover completed fixed-native runs from disk.  This intentionally does
// not expand the legacy global inventory into a model × simulator matrix.
for (const modelEntry of await readdir(DATA_ROOT, { withFileTypes: true })) {
  if (!modelEntry.isDirectory() || !/^[a-f0-9]{32}$/i.test(modelEntry.name)) continue;
  const modelRoot = join(DATA_ROOT, modelEntry.name);
  let model;
  try {
    model = JSON.parse(await readFile(join(modelRoot, "model-manifest.json"), "utf8"));
  } catch {
    continue;
  }
  for (const [simulator, extension] of Object.entries(simulatorExtensions)) {
    const runRoot = join(modelRoot, simulator);
    let run;
    let fixture;
    let provenance;
    try {
      [run, fixture, provenance] = await Promise.all([
        readFile(join(runRoot, "manifest.json"), "utf8").then(JSON.parse),
        readFile(join(runRoot, "native-fixture-manifest.json"), "utf8").then(JSON.parse),
        readFile(join(runRoot, "data", "plot_provenance.json"), "utf8").then(JSON.parse),
      ]);
    } catch {
      continue;
    }
    const netlistsExist = modes.every((mode) => (
      existsSync(join(runRoot, "netlist", `${mode}${extension}`))
    ));
    if (
      run.status !== "completed"
      || run.returnCode !== 0
      || run.benchmarkFixtureMode !== "fixed-simulator-native"
      || run.netlistAstUsed !== false
      || run.parameterPreservingInput !== true
      || run.modelFallbackApplied !== false
      || (Array.isArray(run.internalFailureMarkers) && run.internalFailureMarkers.length > 0)
      || fixture.fixtureMode !== "fixed-simulator-native"
      || fixture.netlistAstUsed !== false
      || provenance.syntheticDataUsed !== false
      || !existsSync(join(runRoot, "REPORT.md"))
      || !netlistsExist
    ) {
      continue;
    }
    displayableRuns.push({
      uid: run.modelId ?? model.id,
      md5: modelEntry.name,
      simulator,
      path: join(runRoot, "REPORT.md"),
    });
  }
}

const expectedRuns = displayableRuns.length;
const failures = [];
let checked = 0;
let imageCount = 0;
let checkCount = 0;
let detailCount = 0;
let tableCount = 0;

for (const run of displayableRuns) {
    const { uid, md5, simulator, path } = run;
    const label = `${md5}/${simulator}/REPORT.md`;
    try {
      const markdown = await readFile(path, "utf8");
      const normalized = markdown.replace(/\r\n?/g, "\n");
      const report = parseReportMD(markdown, md5, simulator);
      const subsections = collectSubsections(report);
      const plots = subsections.flatMap((subsection) => subsection.plotDetails ?? []);
      const tables = subsections.flatMap((subsection) => subsection.tables ?? []);
      const classifiedChecks = report.lines.filter((line) => line.kind === "check");
      const parsedChecks = [
        ...report.simulationSetup,
        ...report.sections.flatMap((section) => [
          ...(section.entries ?? []),
          ...section.subsections.flatMap((subsection) => subsection.entries),
        ]),
      ];
      const parsedDetails = parsedChecks.flatMap((entry) => entry.details ?? []);
      const summaryEntries = Object.values(report.summary).flat();

      if (report.rawMarkdown !== normalized) throw new Error("rawMarkdown is not normalized source");
      if (report.lines.map((line) => line.raw).join("\n") !== normalized) {
        throw new Error("line records do not reconstruct REPORT.md exactly");
      }
      if (report.lines.length !== normalized.split("\n").length) throw new Error("physical line count differs");
      if (report.title !== "MOSFET Simulation Verification Report") throw new Error(`unexpected title: ${report.title}`);
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(report.generatedAt)) {
        throw new Error(`invalid generated timestamp: ${report.generatedAt}`);
      }
      if (report.simulationSetup.length !== 3) throw new Error(`setup checks: ${report.simulationSetup.length}`);
      if (summaryEntries.length !== 19) throw new Error(`summary rows: ${summaryEntries.length}`);
      if (classifiedChecks.length !== parsedChecks.length) {
        throw new Error(`check lines ${classifiedChecks.length} != parsed checks ${parsedChecks.length}`);
      }
      if (plots.length !== 21) throw new Error(`plots: ${plots.length}`);
      if (tables.length !== 1 || tables[0].headers[0] !== "Bias Condition" || tables[0].rows.length !== 6) {
        throw new Error("nested Bias Dependence table was not parsed completely");
      }
      for (const plot of plots) {
        if (!plot.src.startsWith("plot/")) throw new Error(`plot source changed: ${plot.src}`);
        if (!existsSync(resolve(dirname(path), plot.src))) throw new Error(`missing plot: ${plot.src}`);
        if (!plot.alt) throw new Error(`plot missing alt text at line ${plot.lineNumber}`);
      }
      for (const line of classifiedChecks) {
        if (line.status === "unavailable") throw new Error(`unparsed status at line ${line.lineNumber}`);
      }
      const grayLines = classifiedChecks.filter((line) => /color\s*:\s*gray/i.test(line.raw));
      if (grayLines.some((line) => line.status !== "in-progress")) throw new Error("gray cross parsed as failure");
      if (report.runIntegrity.Model !== uid) throw new Error(`Run Integrity Model: ${report.runIntegrity.Model}`);
      if (report.runIntegrity["Model MD5"] !== md5) throw new Error("Run Integrity MD5 differs");
      if (report.runIntegrity.Simulator !== simulator) throw new Error("Run Integrity simulator differs");
      if (
        !report.runIntegrity["Benchmark circuit"]?.includes("fixed, source-controlled simulator-native fixture")
        || !report.runIntegrity["Benchmark circuit"]?.includes("no circuit AST or netlist translation")
      ) {
        throw new Error("fixed-native Benchmark circuit evidence was not parsed");
      }
      if (
        !report.runIntegrityNotes.some((note) => (
          note.includes("no fallback or parameter lowering was applied")
        ))
      ) {
        throw new Error("parameter-preserving handoff narrative was not parsed");
      }
      for (const required of [
        "Started",
        "Finished",
        "Elapsed seconds",
        "Peak resident memory KiB",
        "Process return code",
        "Plot inventory",
      ]) {
        if (!report.runIntegrity[required]) throw new Error(`Run Integrity missing ${required}`);
      }
      if (reportEntries(report).some((entry) => !entry.testType.trim())) throw new Error("empty test name");

      checked += 1;
      imageCount += plots.length;
      checkCount += parsedChecks.length;
      detailCount += parsedDetails.length;
      tableCount += 4 + tables.length;
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

if (expectedRuns === 0) {
  console.error("REPORT parser validation failed: no complete fixed-native reports found");
  process.exit(1);
}
if (checked !== expectedRuns || failures.length > 0) {
  console.error(`REPORT parser validation failed: ${checked}/${expectedRuns} passed`);
  for (const failure of failures.slice(0, 50)) console.error(`- ${failure}`);
  if (failures.length > 50) console.error(`- … ${failures.length - 50} more`);
  process.exit(1);
}

console.log(
  `REPORT parser validation passed: ${checked} reports, ${tableCount} tables, `
  + `${checkCount} checks, ${detailCount} detail rows, ${imageCount} images.`,
);
