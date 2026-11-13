import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import type { DraftValidationContextV1, InputFileV1, JobPlanV1, JsonObject, ParameterDefinitionV1, StructuredJobErrorV1, ToolCapabilityV1 } from "../../../shared/contracts/v1.ts";
import { CAPABILITY_SCHEMA_VERSION } from "../../../shared/contracts/v1.ts";
import { parameter, process as plannedProcess, step } from "./adapters/base.ts";
import { configuredTool, objectValue, PpaAdapterError, runFrozenProcess, safeRelative, workspacePath, writeAtomic } from "./helpers.ts";
import type { PpaExecutionContext, PpaModuleContext, PpaRuntimeBindings } from "./types.ts";

export const LIBCHARX_FLOW = "libcharx";
export const CHARACTERIZATION_OUTPUT = "output/libcharx";
export const CHARACTERIZATION_ROLES = [
  { id: "cell_netlist", label: "Cell SPICE", description: "Frozen schematic or extracted transistor netlist.", required: true, multiple: false, extensions: [".sp", ".spice", ".cir"], recognizedTypes: ["spice", "text"] },
  { id: "extracted_netlist", label: "Extracted SPICE alias", description: "Compatibility alias for cell_netlist.", required: false, multiple: false, extensions: [".sp", ".spice", ".cir"], recognizedTypes: ["spice", "text"] },
  { id: "model_file", label: "Frozen model closure", description: "Model entry and every relative include, preserved as data; executable SPICE commands are rejected.", required: true, multiple: true, extensions: [".sp", ".spice", ".cir", ".lib", ".ngspice", ".pm3", ".model"], recognizedTypes: ["spice", "text"] },
  { id: "cell_gds", label: "Actual cell layout", description: "Actual GDS whose hash and measured boundary area bind this characterization.", required: true, multiple: false, extensions: [".gds"], recognizedTypes: ["gdsii"] },
  { id: "cell_lef", label: "Selected cell LEF", description: "Optional exact selected MACRO placement footprint; required for LEF area evidence.", required: false, multiple: false, extensions: [".lef"], recognizedTypes: ["lef", "text"] },
  { id: "waveform_file", label: "Supply waveforms", description: "Actual DTCO waveform files bound by SHA256 to measured power evidence.", required: false, multiple: true, extensions: [".txt", ".csv"], recognizedTypes: ["text", "csv"] },
  { id: "physical_evidence", label: "Physical/source evidence", description: "Published DTCO metrics or physical identity manifest bound to the attached GDS.", required: true, multiple: false, extensions: [".json"], recognizedTypes: ["json"] },
  { id: "waveform_metrics", label: "Measured power evidence", description: "Optional DTCO metrics; power remains separately attributed to its waveform experiment.", required: false, multiple: false, extensions: [".json"], recognizedTypes: ["json"] },
] as const;
const PIN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HASH = /^[a-f0-9]{64}$/;
export const CHARACTERIZATION_PARAMETERS: ParameterDefinitionV1[] = [
  parameter("designName", "Design", "Result name.", "string", true, "", "designName"),
  parameter("topModule", "SPICE cell", "Exact SPICE subcircuit and emitted Liberty cell name.", "string", true, "", "topModule"),
  parameter("processProfile", "Device profile", "Frozen transistor model family.", "enum", true, "gf180-03v3", "processProfile", { enumValues: ["gf180-03v3", "gf180-06v0", "sky130-hvt"] }),
  parameter("corner", "Process corner", "Actual model section selection.", "enum", true, "tt", "corner", { enumValues: ["tt", "ff", "ss", "fs", "sf"] }),
  parameter("vddVolts", "VDD", "Absolute supply rail.", "number", true, 3.3, "vddVolts", { unit: "V", minimum: -20, maximum: 20 }),
  parameter("vssVolts", "VSS", "Absolute ground rail; all floating CMOS references translate together.", "number", true, 0, "vssVolts", { unit: "V", minimum: -20, maximum: 20 }),
  parameter("temperatureC", "Temperature", "Actual ngspice .temp.", "number", true, 25, "temperatureC", { unit: "°C", minimum: -55, maximum: 150 }),
  parameter("electricalMode", "Electrical source", "Schematic or actual extracted circuit provenance.", "enum", true, "schematic", "electricalMode", { enumValues: ["schematic", "extracted"] }),
  parameter("inputs", "Inputs", "Exact input pins.", "string-list", true, ["A"], "inputs"),
  parameter("outputPin", "Output", "Exact output pin.", "string", true, "Y", "outputPin"),
  parameter("powerPins", "Power and well pins", "All pins tied to VDD, including well/body pins.", "string-list", true, ["VDD"], "powerPins"),
  parameter("groundPins", "Ground and body pins", "All pins tied to VSS, including body pins.", "string-list", true, ["VSS"], "groundPins"),
  parameter("function", "Boolean function", "INV, NAND2 or NOR2 Liberty function; arcs carry fixed-input sensitization.", "string", true, "!A", "function"),
  parameter("modelEntry", "Frozen model entry", "Relative input path to the frozen model entry.", "string", true, "", "modelEntry"),
  parameter("modelSection", "Model section", "Profile-validated .lib section, not a metadata-only corner.", "string", true, "typical", "modelSection"),
  parameter("slewSeconds", "20–80% slews", "Positive increasing NLDM input-slew indices.", "number-list", true, [5e-11, 1e-10], "slewSeconds"),
  parameter("loadFarads", "Loads", "Positive increasing NLDM load indices.", "number-list", true, [5e-15, 1e-14], "loadFarads"),
];
function fail(code: string, message: string): never { throw new PpaAdapterError(code, message); }
function pins(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 8 || value.some(pin => typeof pin !== "string" || !PIN.test(pin)) || new Set(value).size !== value.length) fail("PPA_CHAR_PINS", name + " must contain unique simple pin names");
  return value as string[];
}
export function characterizationParameters(raw: JsonObject): JsonObject {
  const p = { ...raw };
  for (const key of ["designName", "topModule", "outputPin"]) if (typeof p[key] !== "string" || !PIN.test(p[key] as string)) fail("PPA_CHAR_PARAMETER", key + " must be a simple identifier");
  if (!["gf180-03v3", "gf180-06v0", "sky130-hvt"].includes(String(p.processProfile))) fail("PPA_CHAR_PROFILE", "Unsupported device profile");
  if (!["tt", "ff", "ss", "fs", "sf"].includes(String(p.corner))) fail("PPA_CHAR_CORNER", "Unsupported corner");
  const section = p.processProfile === "sky130-hvt" ? p.corner : p.corner === "tt" ? "typical" : p.corner;
  if (p.modelSection !== section) fail("PPA_CHAR_CORNER", "Model section does not match selected profile/corner");
  for (const key of ["vddVolts", "vssVolts", "temperatureC"]) if (typeof p[key] !== "number" || !Number.isFinite(p[key])) fail("PPA_CHAR_PVT", key + " must be finite");
  const voltage = Number(p.vddVolts) - Number(p.vssVolts), limit = p.processProfile === "sky130-hvt" ? [1.4, 1.95] : p.processProfile === "gf180-03v3" ? [2.7, 3.6] : [1.62, 5.5];
  if (voltage < limit[0]! || voltage > limit[1]! || Number(p.temperatureC) < -55 || Number(p.temperatureC) > 150 || Math.abs(Number(p.vddVolts)) > 20 || Math.abs(Number(p.vssVolts)) > 20) fail("PPA_CHAR_PVT", "Rails or temperature exceed the selected model profile");
  if (!["schematic", "extracted"].includes(String(p.electricalMode))) fail("PPA_CHAR_MODE", "Declare schematic or extracted electrical provenance");
  const inputs = pins(p.inputs, "inputs"), power = pins(p.powerPins, "powerPins"), ground = pins(p.groundPins, "groundPins");
  const all = [...inputs, String(p.outputPin), ...power, ...ground]; if (new Set(all).size !== all.length) fail("PPA_CHAR_PINS", "Input, output, power and ground pins must be disjoint");
  const fn = String(p.function).replace(/\s+/g, "");
  const inv = inputs.length === 1 && fn === "!" + inputs[0];
  const nand = inputs.length === 2 && fn === "!(" + inputs[0] + "&" + inputs[1] + ")";
  const nor = inputs.length === 2 && fn === "!(" + inputs[0] + "|" + inputs[1] + ")";
  if (!inv && !nand && !nor) fail("PPA_CHAR_FUNCTION", "Supported functions are INV, NAND2 and NOR2 with exact selected pin names");
  if (!Array.isArray(p.arcs) || p.arcs.length !== inputs.length) fail("PPA_CHAR_ARCS", "Provide one sensitized arc per input");
  const seen = new Set<string>();
  for (const value of p.arcs) {
    const arc = objectValue(value), input = String(arc.input), fixed = objectValue(arc.fixedInputs);
    if (!inputs.includes(input) || seen.has(input)) fail("PPA_CHAR_ARCS", "Each input must have exactly one arc"); seen.add(input);
    const others = inputs.filter(pin => pin !== input);
    if (Object.keys(fixed).sort().join(",") !== others.sort().join(",") || others.some(pin => fixed[pin] !== (nand ? 1 : 0))) fail("PPA_CHAR_ARCS", "Fixed inputs must sensitize the selected Boolean function");
  }
  for (const key of ["slewSeconds", "loadFarads"]) {
    const values = p[key]; if (!Array.isArray(values) || values.length < 1 || values.length > 5 || values.some((v, i) => typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > (key === "slewSeconds" ? 1e-8 : 1e-12) || (i > 0 && v <= Number(values[i - 1])))) fail("PPA_CHAR_SWEEP", key + " must have 1–5 increasing positive bounded indices");
  }
  p.modelEntry = safeRelative(String(p.modelEntry));
  if (p.spiceScale !== undefined && p.spiceScale !== "1u") fail("PPA_CHAR_SCALE", "Only explicit model-required scale=1u is supported");
  if (p.sweep && Object.keys(objectValue(p.sweep)).length) fail("PPA_CHAR_SWEEP", "Create independent single-PVT characterization jobs");
  return p;
}
function selected(files: readonly InputFileV1[], role: string, required = true): InputFileV1 | undefined {
  const matches = files.filter(file => file.role === role || role === "cell_netlist" && file.role === "extracted_netlist");
  if (matches.length > 1 || required && matches.length !== 1) fail("PPA_CHAR_INPUT", "Map exactly one " + role);
  return matches[0];
}
export function characterizationInputs(files: readonly InputFileV1[], p: JsonObject) {
  const netlist = selected(files, "cell_netlist")!, gds = selected(files, "cell_gds")!, physical = selected(files, "physical_evidence")!, power = selected(files, "waveform_metrics", false);
  const models = files.filter(file => file.role === "model_file");
  const lef = selected(files, "cell_lef", false), waveforms = files.filter(file => file.role === "waveform_file");
  if (power && !waveforms.length) fail("PPA_CHAR_POWER_WAVEFORM", "Measured power requires actual hash-bound waveform files");
  if (!models.length || !models.some(file => file.relativePath === p.modelEntry) || models.length > 256) fail("PPA_CHAR_MODEL", "Attach the complete model closure including modelEntry");
  for (const file of [netlist, gds, physical, ...(power ? [power] : []), ...(lef ? [lef] : []), ...waveforms, ...models]) {
    safeRelative(file.relativePath); if (!HASH.test(file.sha256) || file.validationErrors.length || file.unresolvedIncludes.length) fail("PPA_CHAR_INPUT", "Input metadata is invalid: " + file.relativePath);
  }
  return { netlist, gds, physical, power, lef, waveforms, models };
}
export async function validateCharacterizationDraft(context: DraftValidationContextV1) {
  const errors: StructuredJobErrorV1[] = [];
  try {
    if (context.job.operation !== "characterize-cell") fail("PPA_CHAR_OPERATION", "Use characterize-cell");
    const p = characterizationParameters(context.job.parameters); characterizationInputs(context.files, p);
    const binding = (context as DraftValidationContextV1 & PpaRuntimeBindings).toolBindings?.libcharx;
    if (!binding?.configuration.enabled || binding.health !== "healthy" || binding.selfTestPassed !== true) fail("PPA_CHAR_UNAVAILABLE", "LibCharX must pass its real SPICE-backed self-test");
  } catch (e) { errors.push({ type: e instanceof PpaAdapterError ? e.kind : "validation", code: e instanceof PpaAdapterError ? e.code : "PPA_CHAR_INVALID", message: e instanceof Error ? e.message : String(e), stepId: null, retryable: false, details: null }); }
  return { valid: !errors.length, errors, warnings: ["LibCharX power tables are proxies and are omitted from Liberty. Supply power, if supplied, is separate DTCO waveform evidence.", "Ground translation requires floating CMOS with every body, input and load referred to the selected rails; external body bias is unsupported."] };
}
interface NativeSnapshot { wrapperSha256: string; nativeEnvironment: Record<string,string>; nativeSources: Record<string,string>; nativeExecutables: Record<string,string>; }
function nativeSnapshot(context: { job: { toolConfigurations: import("../../../shared/contracts/v1.ts").ToolConfigurationSnapshotV1[] } } & PpaRuntimeBindings): NativeSnapshot {
  const configuration = configuredTool(context, "libcharx"), environment = context.toolBindings?.libcharx?.environment;
  if (!configuration.entryPoint || !configuration.interpreterPath || !environment) fail("PPA_CHAR_TOOL", "Native tool configuration is incomplete");
  const hashFile = (filename: string) => { const stat = fsSync.statSync(filename); if (!stat.isFile()) fail("PPA_CHAR_TOOL", "Native resource is not a file"); return createHash("sha256").update(fsSync.readFileSync(filename)).digest("hex"); };
  const nativeEnvironment = Object.fromEntries(["LIBCHARX_ROOT", "LIBCHARX_NGSPICE", "LIBCHARX_GDS_PYTHON"].map(key => { const value = environment[key]; if (!value || !path.isAbsolute(value)) fail("PPA_CHAR_TOOL", "Configure absolute " + key); return [key,value]; }));
  const root = nativeEnvironment.LIBCHARX_ROOT!, nativeSources: Record<string,string> = {};
  function visit(directory: string) { for (const entry of fsSync.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) { const full = path.join(directory,entry.name); if (entry.isSymbolicLink()) fail("PPA_CHAR_TOOL", "Native source symlinks are unsupported"); if (entry.isDirectory() && entry.name !== "__pycache__") visit(full); else if (entry.isFile() && entry.name.endsWith(".py")) nativeSources[path.relative(root,full).split(path.sep).join("/")] = hashFile(full); } }
  visit(path.join(root,"libcharx"));
  return { wrapperSha256: hashFile(path.resolve(configuration.rootPath ?? "",configuration.entryPoint)), nativeEnvironment, nativeSources, nativeExecutables: Object.fromEntries([configuration.interpreterPath,nativeEnvironment.LIBCHARX_NGSPICE!,nativeEnvironment.LIBCHARX_GDS_PYTHON!].map(filename => [filename,hashFile(filename)])) };
}
export function buildCharacterizationPlan(context: DraftValidationContextV1): JobPlanV1 {
  characterizationParameters(context.job.parameters); characterizationInputs(context.files, context.job.parameters);
  const tool = configuredTool(context, "libcharx"), snapshot = nativeSnapshot(context as DraftValidationContextV1 & PpaRuntimeBindings);
  return { libcharxNativeSnapshot: snapshot, schemaVersion: "eda.job-plan.v1", capabilityVersion: "ppa.workflow.v1", sweep: null, warnings: ["Single actual PVT per fresh Liberty; no place-and-route or signoff claim."], steps: [
    step("validate-input", "Validate frozen cell inputs", "Check every input hash and the characterization contract.", 5, null, ["cell_netlist", "model_file", "cell_gds", "physical_evidence"], []),
    step("prepare-characterization", "Freeze native characterization request", "Generate a data-only request for the trusted installed LibCharX wrapper.", 5, null, ["cell_netlist"], ["characterization-request"]),
    step("characterize-cell", "Run SPICE-backed LibCharX", "Evaluate actual slew/load NLDM tables and emit fresh Liberty without proxy power.", 80, { ...plannedProcess(tool, ["--request", "work/libcharx-request.json"]), expectedOutputs: ["output/libcharx/characterized.lib", "output/libcharx/results.json", "output/libcharx/manifest.json", "output/ppa-result.json"] }, ["characterization-request"], ["native-run", "characterized-liberty"]),
    step("normalize", "Validate native characterization evidence", "Require finite nonzero complete tables and real ngspice simulation counters.", 5, null, ["native-run"], ["normalized-result"]),
    step("publish", "Publish characterization", "Publish the cell/PVT-bound result and native evidence.", 5, null, ["normalized-result"], ["ppa-result"]),
  ] } as JobPlanV1 & { libcharxNativeSnapshot: NativeSnapshot };
}
export function characterizationCapability(context: PpaModuleContext): ToolCapabilityV1 {
  const b = context.toolBindings?.libcharx, healthy = b?.configuration.enabled && b.health === "healthy" && b.selfTestPassed === true;
  return { schemaVersion: CAPABILITY_SCHEMA_VERSION, capabilityVersion: "ppa.workflow.v1", toolId: "libcharx", moduleId: "ppa", label: "LibCharX transistor-cell characterization", description: "Actual ngspice NLDM and fresh Liberty for custom or fixed INV/NAND2/NOR2 cells, with explicit single PVT and verified GDS area.", health: healthy ? "healthy" : b ? "unavailable" : "not_configured", healthReason: healthy ? null : "Configure LibCharX and pass the real native characterization self-test.", toolVersion: b?.version ?? null, operations: ["characterize-cell"], inputRoles: CHARACTERIZATION_ROLES.map(r => ({ ...r, extensions: [...r.extensions], recognizedTypes: [...r.recognizedTypes] })), parameters: CHARACTERIZATION_PARAMETERS, plannedStepTemplates: [], limits: { arbitraryScripts: false, spiceBackedRequired: true, maxInputs: 2, maxTablePoints: 25, powerFromLibCharX: "proxy-not-measured", groundReference: "common-shift-floating-cmos-only" } };
}
export async function executeCharacterizationStep(context: PpaExecutionContext): Promise<{ exitCode: number; outputs: JsonObject }> {
  const p = characterizationParameters(context.job.parameters), inputs = characterizationInputs(context.job.inputManifest.files, p);
  if (context.abortSignal.aborted) throw new Error("Characterization aborted");
  if (context.step.stepKey === "validate-input" || context.step.stepKey === "prepare-characterization") {
    for (const file of context.job.inputManifest.files) {
      const filename = workspacePath(context.workspacePath, "input/" + file.relativePath), stat = await fs.lstat(filename);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.sizeBytes || createHash("sha256").update(await fs.readFile(filename)).digest("hex") !== file.sha256) fail("PPA_CHAR_INPUT_CHANGED", "Frozen input changed: " + file.relativePath);
    }
    if (context.step.stepKey === "prepare-characterization") {
      const configuration = configuredTool(context, "libcharx");
      const frozen = (context.job.plan as JobPlanV1 & { libcharxNativeSnapshot?: NativeSnapshot }).libcharxNativeSnapshot;
      const current = nativeSnapshot(context);
      if (!frozen || JSON.stringify(frozen) !== JSON.stringify(current)) fail("PPA_CHAR_TOOL_CHANGED", "Native wrapper, source, executable or environment changed after planning");
      const { wrapperSha256, nativeEnvironment, nativeSources, nativeExecutables } = frozen;
      await writeAtomic(workspacePath(context.workspacePath, "work/libcharx-request.json"), JSON.stringify({ schemaVersion: "ppa.libcharx-request.v1", parameters: p, files: context.job.inputManifest.files, inputs: { netlist: inputs.netlist.relativePath, gds: inputs.gds.relativePath, physical: inputs.physical.relativePath, power: inputs.power?.relativePath ?? null, lef: inputs.lef?.relativePath ?? null, waveforms: inputs.waveforms.map(f => f.relativePath), models: inputs.models.map(f => f.relativePath) }, tool: configuration, wrapperSha256, nativeEnvironment, nativeSources, nativeExecutables, createdAt: context.now() }, null, 2));
    }
    return { exitCode: 0, outputs: { validated: true } };
  }
  if (context.step.stepKey === "characterize-cell") return runFrozenProcess(context);
  if (context.step.stepKey === "normalize" || context.step.stepKey === "publish") {
    const result = JSON.parse(await fs.readFile(workspacePath(context.workspacePath, "output/ppa-result.json"), "utf8"));
    validateCharacterizationResult(result);
    return { exitCode: 0, outputs: { validated: true, result: "output/ppa-result.json" } };
  }
  throw new Error("Unsupported LibCharX step " + context.step.stepKey);
}
export function validateCharacterizationResult(value: unknown): void {
  const result = objectValue(value), data = objectValue(result.data), normalized = objectValue(data.normalized), quality = objectValue(normalized.quality);
  const positive = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (result.parserId !== "ppa-libcharx-native" || result.parserVersion !== "1.0.0" || data.schemaVersion !== "ppa.result-data.v1" || data.flow !== "libcharx" || quality.spiceBacked !== true || !positive(quality.ngspiceInvocations) || !Number.isInteger(quality.ngspiceInvocations) || !positive(quality.computedTimingValues) || !Number.isInteger(quality.computedTimingValues) || !HASH.test(String(objectValue(data.evidence).libertySha256)) || !positive(normalized.areaUm2) || !positive(normalized.delayPs)) fail("PPA_CHAR_RESULT", "Incomplete native LibCharX timing/area evidence");
}
