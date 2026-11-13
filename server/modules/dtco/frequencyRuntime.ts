import fs from "node:fs/promises";
import path from "node:path";
import type { PlannedStepV1, JsonObject } from "../../../shared/contracts/v1.ts";
import type { ValidationContext, AcgExecutionContext } from "../acg/types.ts";
import { AcgError, regular, writeJson } from "../acg/types.ts";
import type { DtcoSnapshot } from "./environment.ts";
import { arcFileId } from "./circuit.ts";

const ROUNDS = 16;
const FREQUENCY_PROTOCOL = "dtco.transient-toggle.v2";
const stateFile = "output/dtco/frequency-state.json";
type Arc = NonNullable<DtcoSnapshot["characterization"]>[number] & { input?: string; output?: string; transition?: string; fixedInputs?: Record<string, number> };
function names(round: number, arc: Arc) {
  const id = arcFileId(arc.id);
  return { deck: "frequency-" + round + "-" + id + ".cir", log: "frequency-" + round + "-" + id + ".log",
    waveform: "frequency-" + round + "-" + id + ".txt" };
}
function step(id: string, name: string): PlannedStepV1 {
  return { id, name, description: name, required: true, weight: 1, process: null,
    inputRoles: ["dtco-resource"], outputRoles: ["dtco-evidence"] };
}
export function buildFrequencySteps(context: ValidationContext, snapshot: DtcoSnapshot): PlannedStepV1[] {
  const arcs = (snapshot.characterization ?? []) as Arc[];
  if (!arcs.length) return [];
  const spice = context.job.toolConfigurations.find(x => x.toolId === "dtco-ngspice");
  const analysis = context.job.toolConfigurations.find(x => x.toolId === "dtco-analysis");
  if (!spice || !analysis) throw new AcgError("DTCO_FREQUENCY_TOOLS", "Trusted ngspice and analysis tools are required", "configuration");
  const result: PlannedStepV1[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    for (const arc of arcs) {
      const file = names(round, arc);
      const item = step("frequency-native-" + round + "-" + arcFileId(arc.id), "Verify toggle frequency round " + (round + 1) + " for " + arc.id);
      item.process = { toolConfigurationId: spice.id, executableDisplay: "dtco-ngspice",
        argv: ["-b", "-o", file.log, file.deck], cwdRelative: "output/dtco",
        environmentNames: spice.environmentNames, timeoutSeconds: spice.timeoutSeconds };
      result.push(item);
    }
    const evaluate = step("frequency-evaluate-" + round, "Classify all arcs and bound the frequency search");
    evaluate.process = { toolConfigurationId: analysis.id, executableDisplay: "dtco-analysis",
      argv: ["--workspace", ".", "--frequency-round", String(round)], cwdRelative: ".",
      environmentNames: analysis.environmentNames, timeoutSeconds: analysis.timeoutSeconds,
      expectedOutputs: ["output/dtco/frequency-state.json", "output/dtco/frequency.json"] };
    result.push(evaluate);
  }
  return result;
}
export function isFrequencyStep(value: unknown): boolean {
  const item = value as { stepKey?: string; id?: string } | null;
  return typeof item?.stepKey === "string" ? item.stepKey.startsWith("frequency-") : !!item?.id?.startsWith("frequency-");
}
function spiceNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) throw new AcgError("DTCO_FREQUENCY_VALUE", "Invalid frequency deck value", "validation");
  return value.toExponential(12);
}
function selectFrequency(snapshot: DtcoSnapshot, round: number, prior: any | null) {
  const nominal = 1 / (snapshot.definition.periodNs * 1e-9);
  const slew = snapshot.definition.inputSlewPs * 1e-12;
  // Use an 8.25-period stop and a maxstep tied to slew/20 or period/10000.
  // This is a nominal sample-budget estimate; adaptive solver steps can exceed it.
  const minFrequencyHz = Math.max(nominal / 4, 1 / (6060 * slew));
  const maxFrequencyHz = Math.min(nominal * 64, 0.9 / (4 * slew));
  if (!Number.isFinite(maxFrequencyHz) || maxFrequencyHz <= minFrequencyHz) {
    throw new AcgError("DTCO_FREQUENCY_BOUNDS", "No legal frequency range for the frozen input slew", "validation");
  }
  const toleranceHz = Math.max(1_000_000, minFrequencyHz * 0.05);
  if (round === 0) return { frequencyHz: minFrequencyHz, minFrequencyHz, maxFrequencyHz, toleranceHz };
  const candidate = prior?.nextFrequencyHz;
  return { frequencyHz: Number.isFinite(candidate) ? candidate : null, minFrequencyHz, maxFrequencyHz, toleranceHz };
}
async function prepareRound(root: string, snapshot: DtcoSnapshot, round: number): Promise<any> {
  const output = path.join(root, "output/dtco");
  const requestPath = path.join(output, "frequency-round-" + round + ".json");
  const existing = await fs.readFile(requestPath, "utf8").then(JSON.parse).catch(() => null);
  if (existing) return existing;
  const statePath = path.join(root, stateFile);
  const prior = await fs.readFile(statePath, "utf8").then(JSON.parse).catch(() => null);
  const selected = selectFrequency(snapshot, round, prior);
  const arcs = (snapshot.characterization ?? []) as Arc[];
  const terminal = prior && ["bracketed", "upper_bound_not_found", "no_verified_pass", "non_monotonic", "indeterminate"].includes(prior.searchStatus);
  const frequencyHz = selected.frequencyHz;
  const skipReason = terminal ? "search_" + prior.searchStatus : frequencyHz === null ? "no_verified_next_frequency" : null;
  const arcRequests = arcs.map(arc => {
    const file = names(round, arc);
    return { id: arc.id, input: arc.input, output: arc.output, transition: arc.transition,
      fixedInputs: arc.fixedInputs ?? {}, deckPath: file.deck, logPath: file.log, waveformPath: file.waveform };
  });
  const request = { schemaVersion: "dtco.frequency-round.v1", protocolVersion: FREQUENCY_PROTOCOL,
    round, status: skipReason ? "skipped" : "pending",
    reason: skipReason, frequencyHz, minFrequencyHz: selected.minFrequencyHz,
    maxFrequencyHz: selected.maxFrequencyHz, toleranceHz: selected.toleranceHz, arcs: arcRequests };
  await writeJson(requestPath, request);
  if (skipReason) return request;
  for (const arc of arcs) {
    const file = names(round, arc);
    const sourceRelative = arc.deckPath.replace(/^output\/dtco\//, "");
    const sourcePath = await regular(root, "output/dtco/" + sourceRelative);
    let deck = await fs.readFile(sourcePath, "utf8");
    const pulse = [...deck.matchAll(/PULSE\(([^)]*)\)/gi)];
    const transients = [...deck.matchAll(/^\s*\.tran\s+([^\r\n]+)$/gim)];
    const wrdata = [...deck.matchAll(/^\s*wrdata\s+\S+\s+(.+)$/gim)];
    if (pulse.length !== 1 || transients.length !== 1 || wrdata.length !== 1) {
      throw new AcgError("DTCO_FREQUENCY_TEMPLATE", "Frozen characterization deck has an unsupported transient structure", "configuration");
    }
    const params = pulse[0]![1]!.trim().split(/\s+/);
    if (params.length !== 7) throw new AcgError("DTCO_FREQUENCY_TEMPLATE", "Frozen PULSE source must have seven parameters", "configuration");
    const period = 1 / frequencyHz!, slew = snapshot.definition.inputSlewPs * 1e-12;
    if (period / 2 <= slew) throw new AcgError("DTCO_FREQUENCY_SLEW", "Frequency would overlap input edges at the frozen slew", "validation");
    params[3] = spiceNumber(slew); params[4] = spiceNumber(slew);
    params[5] = spiceNumber(period / 2 - slew); params[6] = spiceNumber(period);
    deck = deck.replace(pulse[0]![0], "PULSE(" + params.join(" ") + ")");
    const tranParts = transients[0]![1]!.trim().split(/\s+/);
    if (tranParts.length < 2) throw new AcgError("DTCO_FREQUENCY_TEMPLATE", "Invalid transient directive", "configuration");
    tranParts[0] = spiceNumber(Math.min(slew / 20, period / 10000));
    tranParts[1] = spiceNumber(period * 8.25);
    if (tranParts.length >= 4) tranParts[3] = tranParts[0]!;
    deck = deck.replace(transients[0]![1]!, tranParts.join(" "));
    deck = deck.replace(wrdata[0]![0]!, "wrdata " + file.waveform + " " + wrdata[0]![1]!.trim());
    deck = deck.replace(/set wr_singlescale/ig, "set numdgt=17\nset wr_singlescale");
    await fs.writeFile(path.join(output, file.deck), deck, { mode: 0o640 });
  }
  return request;
}
export async function executeFrequencyStep(context: AcgExecutionContext, snapshot: DtcoSnapshot): Promise<{ exitCode: number; outputs: JsonObject }> {
  const key = context.step.stepKey;
  const root = context.workspacePath;
  if (!context.runPlannedProcess) throw new AcgError("DTCO_RUNTIME", "Shared safe process runner is required", "configuration");
  const evaluate = key.match(/^frequency-evaluate-(\d+)$/);
  if (evaluate) {
    const result = await context.runPlannedProcess();
    return { exitCode: result.exitCode, outputs: { processId: result.processId, processGroupId: result.processGroupId } };
  }
  const native = key.match(/^frequency-native-(\d+)-([A-Za-z0-9_.-]+)$/);
  if (!native) throw new AcgError("DTCO_FREQUENCY_STEP", "Unrecognized frequency step", "internal");
  const round = Number(native[1]);
  const request = await prepareRound(root, snapshot, round);
  if (request.status === "skipped") return { exitCode: 0, outputs: { skipped: true, reason: request.reason } };
  const result = await context.runPlannedProcess();
  const arcId = native[2]!;
  await writeJson(path.join(root, "output/dtco/frequency-run-" + round + "-" + arcId + ".json"),
    { exitCode: result.exitCode, processId: result.processId, processGroupId: result.processGroupId });
  return { exitCode: 0, outputs: { simulatorExitCode: result.exitCode, processId: result.processId, processGroupId: result.processGroupId } };
}
