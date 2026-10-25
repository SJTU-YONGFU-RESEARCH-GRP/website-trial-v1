import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import type { JsonObject } from "../../../shared/contracts/v1.ts";
import { ppaFlowAdapters } from "./adapters/index.ts";
import { normalizeParameters, runFrozenProcess, workspacePath, writeAtomic } from "./helpers.ts";
import { parseParserOutput, validatePpaParsedResult } from "./parser.ts";
import { expandSweep } from "./sweep.ts";
import type { PpaExecutionContext } from "./types.ts";
import { mapPpaInputs } from "./validation.ts";
import { sanitizePpaSdc } from "./security.ts";
import { MAX_ACTIVE_SOURCE_TEXT_BYTES, SourceSecurityError, validateHdlSource } from "../../app/storage/sourceSecurity.ts";

function baseStepKey(stepKey: string): string { return stepKey.includes(":") ? stepKey.slice(stepKey.indexOf(":") + 1) : stepKey; }
function pointRoot(stepKey: string): string { return stepKey.includes(":") ? stepKey.slice(0, stepKey.indexOf(":")) : ""; }
function pathFor(context: PpaExecutionContext, relative: string): string { const prefix = pointRoot(context.step.stepKey); return workspacePath(context.workspacePath, prefix ? `${prefix}/${relative}` : relative); }

async function validateWorkspace(context: PpaExecutionContext): Promise<void> {
  for (const input of context.job.inputManifest.files) {
    const filename = workspacePath(context.workspacePath, `input/${input.relativePath}`); const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== input.sizeBytes) throw new Error(`input changed after upload: ${input.relativePath}`);
    const hash = createHash("sha256");
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(filename);
      stream.on("data", (chunk: Buffer) => hash.update(chunk));
      stream.once("error", reject);
      stream.once("end", resolve);
    });
    if (hash.digest("hex") !== input.sha256) throw new Error(`input hash changed after upload: ${input.relativePath}`);
  }
  const mapping = mapPpaInputs(context.job.inputManifest.files); const availablePaths = new Set(context.job.inputManifest.files.map((file) => file.relativePath));
  for (const input of [...mapping.rtl, ...mapping.gate, ...mapping.include]) {
    if (input.sizeBytes > MAX_ACTIVE_SOURCE_TEXT_BYTES) throw new Error(`${input.relativePath} exceeds the 16 MiB safety-inspection limit`);
    const source = await fs.readFile(workspacePath(context.workspacePath, `input/${input.relativePath}`), "utf8");
    try { validateHdlSource(input.relativePath, source, availablePaths); }
    catch (error) { throw error instanceof SourceSecurityError ? new Error(`${error.code}: ${error.message}`) : error; }
  }
}

async function generateConfiguration(context: PpaExecutionContext): Promise<JsonObject> {
  const point = pointRoot(context.step.stepKey); let pointValues = context.job.parameters.sweepPoint as JsonObject ?? {};
  if (point) {
    const index = Number(point.slice("run-".length)) - 1; const requested = normalizeParameters(context.job.parameters);
    pointValues = expandSweep(context.job.parameters, ppaFlowAdapters[requested.flow].parameters, 256).points[index] ?? {};
  }
  const base = normalizeParameters({ ...context.job.parameters, ...pointValues });
  const mapping = mapPpaInputs(context.job.inputManifest.files); const technology = (context as PpaExecutionContext & { technology?: typeof context.job }).technology as never;
  if (!technology || typeof technology !== "object" || !("id" in technology)) throw new Error("frozen technology configuration is unavailable");
  const prefix = point ? `${point}/` : ""; const inputPrefix = point ? "../input/" : "input/";
  const inputs = [...mapping.rtl, ...mapping.gate].map((file) => `${inputPrefix}${file.relativePath}`);
  let sdc: string | null = null;
  if (mapping.sdc[0]) {
    const uploaded = workspacePath(context.workspacePath, `input/${mapping.sdc[0].relativePath}`);
    const sanitized = sanitizePpaSdc(await fs.readFile(uploaded, "utf8")); sdc = "work/generated-constraints.sdc";
    await writeAtomic(pathFor(context, sdc), sanitized);
  }
  const macros = { macro_lib: mapping.macro_lib.map((file) => `${inputPrefix}${file.relativePath}`), macro_lef: mapping.macro_lef.map((file) => `${inputPrefix}${file.relativePath}`), macro_gds: mapping.macro_gds.map((file) => `${inputPrefix}${file.relativePath}`) };
  const generated = ppaFlowAdapters[base.flow].generateConfig(base, technology, inputs, sdc, macros);
  await writeAtomic(pathFor(context, generated.relativePath), generated.contents);
  return { generatedConfig: `${prefix}${generated.relativePath}`, runDirectory: `${prefix}${generated.runDirectory}` };
}

function metricNumber(metrics: Record<string, unknown>, key: string): number | null { const value = Number(metrics[key]); return Number.isFinite(value) ? value : null; }

async function packageOrfsMetrics(context: PpaExecutionContext): Promise<JsonObject> {
  const parameters = normalizeParameters(context.job.parameters); const runRoot = pathFor(context, "work/orfs-run");
  const metadataPath = path.join(runRoot, "orfs", "reports", "metadata.json");
  const metrics = JSON.parse(await fs.readFile(metadataPath, "utf8")) as Record<string, unknown>;
  const required = ["finish__design__die__area", "finish__design__instance__area", "finish__timing__setup__ws", "finish__power__total", "detailedroute__route__wirelength"];
  const missing = required.filter((key) => metricNumber(metrics, key) === null); if (missing.length) throw new Error(`ORFS metadata is incomplete: ${missing.join(", ")}`);
  const finish = Object.fromEntries(Object.entries(metrics).filter(([key]) => key.startsWith("finish__")));
  const packaged = {
    schema: "openroad-uart-result-v1", generated_at: context.now(), run_status: "completed",
    design: { name: parameters.designName, rtl: mapPpaInputs(context.job.inputManifest.files).rtl.map((file) => `input/${file.relativePath}`), top_ports: metricNumber(metrics, "finish__design__io") },
    configuration: { flow: "OpenROAD-flow-scripts", clock_period_ns: parameters.clockPeriodNs, clock_port: parameters.clockPort, platform: (context as PpaExecutionContext & { technology?: { technologyId?: string } }).technology?.technologyId ?? null, core_utilization_target_percent: parameters.coreUtilization ?? null, place_density: parameters.placementDensity ?? null, target_frequency_mhz: 1000 / parameters.clockPeriodNs },
    ppa: {
      area: { die_um2: metricNumber(metrics, "finish__design__die__area"), core_um2: metricNumber(metrics, "finish__design__core__area"), instance_um2: metricNumber(metrics, "finish__design__instance__area"), logical_and_timing_cells: metricNumber(metrics, "finish__design__instance__count__stdcell"), all_physical_instances: metricNumber(metrics, "finish__design__instance__count"), utilization_fraction: metricNumber(metrics, "finish__design__instance__utilization") },
      timing: { setup_wns_ns: metricNumber(metrics, "finish__timing__setup__ws"), hold_wns_ns: metricNumber(metrics, "finish__timing__hold__ws"), setup_tns_ns: metricNumber(metrics, "finish__timing__setup__tns"), hold_tns_ns: metricNumber(metrics, "finish__timing__hold__tns"), fmax_hz: metricNumber(metrics, "finish__timing__fmax"), max_capacitance_violations: metricNumber(metrics, "finish__timing__drv__max_cap"), max_fanout_violations: metricNumber(metrics, "finish__timing__drv__max_fanout"), max_slew_violations: metricNumber(metrics, "finish__timing__drv__max_slew") },
      power: { internal_w: metricNumber(metrics, "finish__power__internal__total"), switching_w: metricNumber(metrics, "finish__power__switching__total"), leakage_w: metricNumber(metrics, "finish__power__leakage__total"), total_w: metricNumber(metrics, "finish__power__total"), total_mw: (metricNumber(metrics, "finish__power__total") ?? 0) * 1000, method: "ORFS post-route OpenSTA metrics; activity semantics retained from the selected platform" },
    },
    routing: { detailed_route_drc_errors: metricNumber(metrics, "detailedroute__route__drc_errors"), antenna_violating_nets: metricNumber(metrics, "detailedroute__antenna__violating__nets"), antenna_violating_pins: metricNumber(metrics, "detailedroute__antenna__violating__pins"), signal_nets: metricNumber(metrics, "detailedroute__route__net"), special_nets: metricNumber(metrics, "detailedroute__route__net__special"), vias: metricNumber(metrics, "detailedroute__route__vias"), wirelength_um: metricNumber(metrics, "detailedroute__route__wirelength") },
    quality: { implementation_complete: true, route_drc_pass: metricNumber(metrics, "detailedroute__route__drc_errors") === 0, setup_hold_pass: (metricNumber(metrics, "finish__timing__setup__ws") ?? -1) >= 0 && (metricNumber(metrics, "finish__timing__hold__ws") ?? -1) >= 0, qualifications: ["DRC/LVS and IR-drop are absent unless their native reports are retained; missing checks are not reported as passes."] },
    raw_finish_metrics: finish,
  };
  await writeAtomic(path.join(runRoot, "metrics.json"), `${JSON.stringify(packaged, null, 2)}\n`);
  return { parserInput: `${path.relative(context.workspacePath, path.join(runRoot, "metrics.json")).replaceAll(path.sep, "/")}`, source: "ORFS metadata.json" };
}

export async function stageCompletedRun(context: PpaExecutionContext): Promise<JsonObject> {
  const parameters = normalizeParameters(context.job.parameters); const mapping = mapPpaInputs(context.job.inputManifest.files); const destinationRoot = workspacePath(context.workspacePath, "work/import-run");
  await fs.mkdir(destinationRoot, { recursive: true, mode: 0o750 }); let primary: string | null = null; let stagedOpenRoadDef = false;
  for (const file of mapping.completed_run) {
    const source = workspacePath(context.workspacePath, `input/${file.relativePath}`); const name = path.posix.basename(file.relativePath); const lowered = name.toLowerCase(); let target: string;
    if (parameters.flow === "openroad-orfs" && (lowered === "normalized-metrics.json" || lowered === "metrics.json")) { target = lowered; if (lowered === "normalized-metrics.json" || !primary) primary = target; }
    else if (parameters.flow === "openlane1" && lowered === "metrics.csv") { target = "reports/metrics.csv"; primary = target; }
    else if (parameters.flow === "librelane" && lowered === "metrics.json") { target = "final/metrics.json"; primary = target; }
    else if (parameters.flow === "librelane" && lowered === "state_out.json") { target = "99-import/state_out.json"; primary ??= target; }
    else if (["manifest.json", "status.json", "metrics-coverage.json"].includes(lowered)) target = lowered;
    else if (file.relativePath.includes("reports/")) target = file.relativePath.slice(file.relativePath.indexOf("reports/"));
    else if (file.relativePath.includes("final/")) target = file.relativePath.slice(file.relativePath.indexOf("final/"));
    else if (lowered.endsWith(".def")) {
      if (parameters.flow === "openlane1") target = `results/final/def/${name}`;
      else if (parameters.flow === "openroad-orfs" && !stagedOpenRoadDef) { target = "orfs/results/import/6_final.def"; stagedOpenRoadDef = true; }
      else target = parameters.flow === "openroad-orfs" ? `evidence/${file.relativePath}` : `final/def/${name}`;
    }
    else target = `evidence/${file.relativePath}`;
    const destination = workspacePath(destinationRoot, target); await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o750 }); await fs.copyFile(source, destination);
  }
  if (!primary) throw new Error(`completed ${parameters.flow} import has no supported primary metrics source`);
  return { runDirectory: "work/import-run", primary, scriptsExecuted: false, evidenceFiles: mapping.completed_run.length };
}

function parserLog(context: PpaExecutionContext): string {
  const key = context.step.stepKey; const candidates = [`logs/${key}.stdout.log`, `${pointRoot(key)}/logs/${key}.stdout.log`];
  return workspacePath(context.workspacePath, candidates[0]);
}

export async function executePpaStep(context: PpaExecutionContext): Promise<{ exitCode: number; outputs: JsonObject }> {
  await Promise.all(["work", "output", "artifacts"].map((dir) => fs.mkdir(pathFor(context, dir), { recursive: true, mode: 0o750 })));
  switch (baseStepKey(context.step.stepKey)) {
    case "validate-input": await validateWorkspace(context); return { exitCode: 0, outputs: { validated: true } };
    case "prepare-config": return { exitCode: 0, outputs: await generateConfiguration(context) };
    case "prepare-import": return { exitCode: 0, outputs: await stageCompletedRun(context) };
    case "synthesize": case "floorplan": case "placement": case "cts": case "routing": case "signoff": case "orfs-metadata": case "openlane-flow": case "librelane-flow": case "parse-native":
      return runFrozenProcess(context);
    case "package-native": return { exitCode: 0, outputs: await packageOrfsMetrics(context) };
    case "normalize": {
      const result = await parseParserOutput(parserLog({ ...context, step: { ...context.step, stepKey: context.step.stepKey.replace(/normalize$/, "parse-native") } }));
      validatePpaParsedResult(result);
      await writeAtomic(pathFor(context, "output/ppa-result.json"), `${JSON.stringify(result, null, 2)}\n`);
      return { exitCode: 0, outputs: { normalized: true, result: "output/ppa-result.json" } };
    }
    case "publish": {
      const result = JSON.parse(await fs.readFile(pathFor(context, "output/ppa-result.json"), "utf8")); validatePpaParsedResult(result);
      return { exitCode: 0, outputs: { validatedForPublication: true } };
    }
    default: throw new Error(`unsupported PPA step ${context.step.stepKey}`);
  }
}

export async function findNativeArtifacts(root: string, limit = 4096): Promise<string[]> {
  const results: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true }).catch(() => [])) {
      if (results.length >= limit) return;
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(filename); else if (entry.isFile()) results.push(path.relative(root, filename).replaceAll(path.sep, "/"));
    }
  }
  await walk(root); return results;
}
