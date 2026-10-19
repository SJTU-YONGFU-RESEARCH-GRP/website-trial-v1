import fs from "node:fs/promises";
import {validateResearchDraft} from "./workflow.ts";
import type { InputFileV1, JsonObject, StructuredJobErrorV1 } from "../../../shared/contracts/v1.ts";
import { ENGINES, AcgError, fail, object, regular, safePath, tool, ready, type Parameters, type ValidationContext } from "./types.ts";
import { loadPreset } from "./presets.ts";
const ROLES = ["netlist", "config", "rules", "placement", "port-verilog", "port-metadata", "source-diagnostic"];
export function normalizeParameters(value: JsonObject): Parameters {
  if (!ENGINES.includes(value.engine as Parameters["engine"])) fail("ACG_ENGINE", "engine must be cmos, dr or mr");
  if (value.mode !== "placement" && value.mode !== "routed") fail("ACG_MODE", "mode must be placement or routed");
  if (value.presetId !== null && (typeof value.presetId !== "string" || !value.presetId)) fail("ACG_PRESET", "Select a repository preset");
  const result: Parameters = { engine: value.engine as Parameters["engine"], mode: value.mode, presetId: value.presetId as string | null, configOverrides: value.configOverrides === undefined ? {} : object(value.configOverrides) };
  for (const [key, min, max] of [["numRows",1,4],["trackNum",1,100],["seed",-1,2147483647],["candidateCount",1,1000],["timeoutSeconds",1,86400]] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "number" || !Number.isSafeInteger(value[key]) || value[key] < min || value[key] > max) fail("ACG_PARAMETER", key + " is outside its integer range");
      result[key] = value[key];
    }
  }
  if (value.algorithm !== undefined) {
    const algorithms = result.engine === "mr" ? ["auto","dp","sa","sa_exp","sa_lin","sa_log","greedy_min","greedy_max","greedy_deg","greedy_rnd","hc_fi","hc_bi","ga","random"] : result.engine === "cmos" ? ["auto","dp","sa","sa_exp","sa_lin","sa_log"] : ["auto"];
    if (typeof value.algorithm !== "string" || !algorithms.includes(value.algorithm)) fail("ACG_ALGORITHM", "Unsupported algorithm for selected engine");
    result.algorithm = value.algorithm;
  }
  if (value.verification !== undefined) {
    if (!["none","research","foundry","official"].includes(String(value.verification))) fail("ACG_VERIFICATION", "verification must be none, research or foundry");
    result.verification = (value.verification === "official" ? "foundry" : value.verification) as Parameters["verification"];
  }
  if (value.widenPolicy !== undefined) {
    if (!["uniform_safe","hotspot_safe","edge","forced_break"].includes(String(value.widenPolicy))) fail("ACG_WIDEN", "Unsupported widening policy");
    result.widenPolicy = String(value.widenPolicy);
  }
  if (value.widenExtraCpp !== undefined) {
    if (typeof value.widenExtraCpp !== "number" || !Number.isSafeInteger(value.widenExtraCpp) || value.widenExtraCpp < 0 || value.widenExtraCpp > 1000) fail("ACG_WIDEN", "Invalid widening amount");
    result.widenExtraCpp = value.widenExtraCpp;
  }
  if (value.sourceDiagnostic !== undefined) {
    if (typeof value.sourceDiagnostic !== "string") fail("ACG_DIAGNOSTIC", "Diagnostic must name an uploaded JSON file");
    safePath("/workspace",value.sourceDiagnostic);
    result.sourceDiagnostic = value.sourceDiagnostic;
  }
  if (value.routabilityPipeline !== undefined) {
    if (typeof value.routabilityPipeline !== "boolean") fail("ACG_PIPELINE", "routabilityPipeline must be boolean");
    result.routabilityPipeline = value.routabilityPipeline;
  }
  return result;
}
export function validateConfiguration(value: JsonObject): void {
  const visit = (item: unknown, key: string, depth: number) => {
    if (depth > 20) fail("ACG_CONFIG_DEPTH", "Configuration nesting is too deep");
    if (typeof item === "number" && !Number.isFinite(item)) fail("ACG_CONFIG_NUMBER", "Configuration numbers must be finite");
    if (key==="m1_dir" || key==="m2_dir") {
      if (typeof item!=="string" || !["BOTH","HOR","VER"].includes(item)) fail("ACG_ROUTING_DIRECTION", "Native metal direction must be BOTH, HOR or VER");
      return;
    }
    if (/(?:^|_)(?:paths?|files?|filenames?|directories|directory|dirs?|scripts?|commands?|executables?|includes?)$/i.test(key) || (typeof item === "string" && item.includes("\0"))) fail("ACG_CONFIG_PATH", "Configuration cannot supply file, command or host path references: " + key);
    if (typeof item === "object" && item !== null) for (const [child, val] of Object.entries(item)) {
      if (["__proto__","prototype","constructor"].includes(child)) fail("ACG_CONFIG_KEY", "Unsafe configuration key");
      visit(val, child, depth + 1);
    }
  };
  visit(value, "", 0);
  if (value.tech !== undefined && (typeof value.tech !== "string" || !/^[A-Za-z0-9_-]+$/.test(value.tech))) fail("ACG_TECH", "tech must be a technology identifier");
}
export function mapInputs(files: InputFileV1[]) {
  if (new Set(files.map(file=>file.relativePath)).size !== files.length) fail("ACG_FILE_COUNT", "Uploaded relative paths must be unique");
  for (const file of files) if (file.role && !ROLES.includes(file.role)) fail("ACG_FILE_ROLE", "Unsupported ACG file role: " + file.role);
  const mapping: Record<string, InputFileV1 | undefined> = {};
  for (const role of ROLES) {
    const entries = files.filter(x => x.role === role);
    if (entries.length > 1) fail("ACG_FILE_COUNT", "Only one " + role + " file is allowed");
    mapping[role] = entries[0];
  }
  if (!mapping.netlist) fail("ACG_NETLIST", "Map one SPICE/CDL netlist file");
  return mapping;
}
/** Bind the CLI input exclusively to its uploaded role, also during immutable preparation. */
export function bindDiagnostic(parameters: Parameters, mapping: ReturnType<typeof mapInputs>): void {
  const diagnostic = mapping["source-diagnostic"];
  if (diagnostic && parameters.engine !== "mr") fail("ACG_MR_PARAMETER", "Source diagnostic input requires MR");
  if (parameters.sourceDiagnostic !== undefined && (!diagnostic || diagnostic.relativePath !== parameters.sourceDiagnostic)) fail("ACG_DIAGNOSTIC", "sourceDiagnostic must match the file mapped as source-diagnostic");
  if (diagnostic) {
    if (!/\.json$/i.test(diagnostic.relativePath)) fail("ACG_DIAGNOSTIC", "Source diagnostic must be an uploaded JSON file");
    parameters.sourceDiagnostic = diagnostic.relativePath;
  }
}
export function parseCellNames(text: string): string[] {
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) fail("ACG_NETLIST_CONTROL", "Netlist contains unsupported control characters");
  if (/^\s*\.(?:include|inc|lib)\b/im.test(text)) fail("ACG_NETLIST_INCLUDE", "Native CDL parser does not resolve includes; upload a self-contained netlist");
  const headers = text.split(/\r?\n/).filter(line => /^[ \t]*\.subckt(?:[ \t]|$)/i.test(line));
  const cells = headers.map(line => {
    const tokens = line.trim().split(/[ \t]+/);
    if (tokens.length < 3) fail("ACG_NETLIST_HEADER", "Every .SUBCKT declaration needs a cell name and ports");
    return tokens[1]!;
  });
  if (!cells.length) fail("ACG_NETLIST_CELLS", "Native parser requires .SUBCKT declarations with ports");
  if (cells.some(x => !/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(x)) || new Set(cells).size !== cells.length) fail("ACG_CELL_NAME", "Cell names must be unique safe output identifiers");
  if (cells.length > 256) fail("ACG_CELL_LIMIT", "At most 256 cells are allowed");
  return cells;
}
export async function resolveInputs(context: ValidationContext) {
  const parameters = normalizeParameters(context.job.parameters); const configuration = tool(context, parameters.engine);
  if (!ready(context,configuration)) throw new AcgError("ACG_HEALTH", "Native executable requires a successful real self-test", "configuration");
  const mapping = mapInputs(context.files);
  bindDiagnostic(parameters, mapping);
  if (parameters.presetId === null && (!mapping.config || !mapping.rules)) fail("ACG_CUSTOM_INPUTS", "Custom runs require both config and rules uploads");
  const selected = parameters.presetId === null ? { preset: null, config: {}, rules: {} } : await loadPreset(configuration, parameters.engine, parameters.presetId);
  const workspace = safePath(context.storageRoot, context.job.workspaceRelativePath);
  const read = async (role: string) => object(JSON.parse(await fs.readFile(await regular(workspace, "input/" + mapping[role]!.relativePath), "utf8")));
  const config = { ...selected.config, ...(mapping.config ? await read("config") : {}), ...parameters.configOverrides } as JsonObject;
  const rules = mapping.rules ? await read("rules") : selected.rules;
  if (mapping["source-diagnostic"]) await read("source-diagnostic");
  config.placement_only = parameters.mode === "placement"; config.gen_gds = true;
  if (parameters.numRows !== undefined) config.num_rows = parameters.numRows;
  else if (parameters.engine === "mr" && config.num_rows === undefined) config.num_rows = 1;
  if (parameters.trackNum !== undefined) config.track_num = parameters.trackNum;
  if (parameters.algorithm !== undefined) config.placement_algorithm = parameters.algorithm;
  if (config.placement_algorithm !== undefined) normalizeParameters({engine:parameters.engine,mode:parameters.mode,presetId:parameters.presetId,algorithm:config.placement_algorithm});
  if (parameters.seed !== undefined) {
    if (parameters.engine !== "mr") fail("ACG_SEED", "Placement seed is only implemented by MR; routing seed remains available through native configOverrides");
    config.placement_random_seed = parameters.seed;
  }
  if (parameters.candidateCount !== undefined) {
    config.placement_only_num_gds = parameters.candidateCount;
    config.route_solutions = parameters.candidateCount;
    if (parameters.engine === "mr") config.placement_candidate_count = parameters.candidateCount;
  }
  if (parameters.verification !== undefined) {
    if (parameters.engine === "mr") config.verification_profile = "routability_research";
    if (parameters.engine === "cmos") config.layout_verify = parameters.verification !== "none";
  }
  if (parameters.routabilityPipeline !== undefined) config.routability_pipeline_enable = parameters.routabilityPipeline;
  if (parameters.routabilityPipeline === true) {
    const rows = Number(config.num_rows), tracks = Number(config.track_num);
    const supported = rows === 1 ? [9,12,16].includes(tracks) : [2,3,4].includes(rows) && tracks >= 5 && tracks <= 16 && config.auto_widen_enable !== true;
    if (parameters.mode !== "routed" || config.tech !== "gf180" || config.routing_algorithm !== "pathfinder_rrr" || !supported) fail("ACG_PIPELINE", "MR routability pipeline requires routed GF180 pathfinder_rrr with 1 row at 9/12/16 tracks or 2–4 rows at 5–16 tracks without auto widening");
  }
  validateConfiguration(config); validateConfiguration(rules);
  if (parameters.verification === "foundry") {
    const pv = context.job.toolConfigurations.find(x => x.toolId === "acg-pv" && x.enabled);
    if (!pv || !ready(context,pv)) throw new AcgError("ACG_PV_UNCONFIGURED", "Requested official verification requires a configured healthy acg-pv tool", "configuration");
    if (config.tech !== "gf180") fail("ACG_PV_PDK", "Official verification is currently configured only for GF180");
    if (parameters.mode !== "routed") fail("ACG_PV_MODE", "Official verification requires routed mode");
  }
  if (parameters.engine === "mr" && parameters.mode === "routed" && config.tech === "gf180" && ["research","foundry"].includes(parameters.verification ?? "")) {
    const lvs1 = context.job.toolConfigurations.find(x=>x.toolId === "acg-lvs1" && x.enabled);
    if (!lvs1 || !ready(context,lvs1)) throw new AcgError("ACG_LVS1_UNCONFIGURED", "Requested MR GF180 research LVS1 requires a configured healthy acg-lvs1 tool", "configuration");
  }
  if (parameters.engine === "mr" && Number(config.num_rows) > 1) {
    if (config.tech !== "gf180" || ![2,3,4].includes(Number(config.num_rows)) || !Number.isInteger(config.track_num) || Number(config.track_num)<5 || Number(config.track_num)>16) fail("ACG_MR_GEOMETRY", "MR supports GF180 2–4 rows and 5–16 tracks");
    if (parameters.mode === "routed" && (config.routing_algorithm !== "pathfinder_rrr" || config.auto_widen_enable === true || config.verification_profile === "foundry_signoff")) fail("ACG_MR_ROUTE", "MR routed mode requires pathfinder_rrr without auto widening");
  }
  if (parameters.engine === "cmos" && parameters.numRows !== undefined && parameters.numRows !== 1) fail("ACG_ROWS", "CMOS uses one row");
  if (parameters.engine === "dr" && parameters.numRows !== undefined) {
    if (![1,2].includes(parameters.numRows)) fail("ACG_ROWS", "DR supports one or two rows");
    config.enable_double_row = parameters.numRows === 2;
  }
  if (parameters.engine === "mr" && (!Number.isInteger(config.num_rows) || Number(config.num_rows)<1 || Number(config.num_rows)>4)) fail("ACG_ROWS", "MR supports 1–4 rows");
  if (mapping.placement && parameters.engine === "cmos") fail("ACG_REPLAY", "CMOS does not expose predefined placement input");
  if (parameters.engine !== "mr" && [parameters.widenPolicy,parameters.widenExtraCpp,parameters.sourceDiagnostic,parameters.routabilityPipeline].some(x=>x!==undefined)) fail("ACG_MR_PARAMETER", "Widening, diagnostic and feedback CLI options are implemented only by MR");
  for (const file of Object.values(mapping)) if (file) {
    if (file.validationErrors.length) fail("ACG_SIGNATURE", file.relativePath + ": invalid file signature");
    await regular(workspace, "input/" + file.relativePath);
  }
  const netlist = await fs.readFile(await regular(workspace, "input/" + mapping.netlist!.relativePath), "utf8");
  const cellNames = parseCellNames(netlist);
  if (mapping.placement && cellNames.length !== 1) fail("ACG_REPLAY_CELLS", "A placement upload must target exactly one cell");
  if (mapping.placement && parameters.engine === "mr") {
    const replay = context.job.toolConfigurations.find(x=>x.toolId === "acg-replay" && x.enabled);
    if (!replay || !ready(context,replay)) throw new AcgError("ACG_REPLAY_UNCONFIGURED", "MR replay requires a configured healthy acg-replay preparation tool", "configuration");
    const artifact = await read("placement");
    if (artifact.schema_version !== 1 || artifact.cell_name !== cellNames[0] || artifact.tech !== config.tech || artifact.track_num !== config.track_num || artifact.num_rows !== config.num_rows) fail("ACG_REPLAY_PROFILE", "MR placement schema, cell, technology, track count and row count must match the effective configuration");
  }
  if (mapping.placement && parameters.engine === "dr") {
    const layout = await fs.readFile(await regular(workspace,"input/" + mapping.placement.relativePath),"utf8");
    if (/^[ \t]*Layout Mode:[ \t]*DOUBLE ROW\b/m.test(layout) || /(?:^|[, \t])(?:PMOS2|NMOS2)[ \t]*:/m.test(layout)) fail("ACG_DR_REPLAY_ROWS", "DR predefined layout replay supports single-row placement only; double-row PMOS2/NMOS2 exports cannot be represented by the native replay parser. Generated double-row placement remains supported.");
    if (!/\[Column[^\r\n]*\][ \t]*(?:\r?\n[ \t]*)?NMOS[ \t]*:[^\r\n]*,[ \t]*PMOS[ \t]*:/.test(layout)) fail("ACG_DR_LAYOUT", "DR predefined layout requires native [Column] and NMOS/PMOS column records");
    config.predefined_layout_files = {[cellNames[0]!]: "../placement.txt"};
  }
  return { parameters, configuration, preset: selected.preset, mapping, config, rules, cellNames, workspace };
}
import {validateUnifiedDraft} from "./unified.ts";
export async function validateAcgDraft(context: ValidationContext) {
  if(context.job.operation==="unified")return validateUnifiedDraft(context);
  if((context.job.operation??"run")!=="run")return validateResearchDraft(context);
  try {
    const resolved = await resolveInputs(context);
    return { valid: true, errors: [], warnings: ["Research verification is not official foundry DRC/LVS signoff. Placement GDS does not imply signal routing.", ...(resolved.parameters.engine === "mr" && resolved.mapping.placement ? ["MR replay preparation validates the original hash and pads only shorter-row right edges with dummy columns; raw upload retained and derived replay/hash lineage published."] : [])] };
  } catch (error) {
    const e = error instanceof AcgError ? error : new AcgError("ACG_PREFLIGHT", error instanceof Error ? error.message : String(error));
    return { valid: false, errors: [{ type: e.type, code: e.code, message: e.message, stepId: null, retryable: true, details: null }] satisfies StructuredJobErrorV1[], warnings: [] };
  }
}
