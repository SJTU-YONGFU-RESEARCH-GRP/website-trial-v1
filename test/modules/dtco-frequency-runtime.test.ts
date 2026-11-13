import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { arcFileId } from "../../server/modules/dtco/circuit.ts";
import { buildFrequencySteps, executeFrequencyStep } from "../../server/modules/dtco/frequencyRuntime.ts";

const roots: string[] = [];
async function tempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dtco-frequency-runtime-"));
  roots.push(root);
  await fs.mkdir(path.join(root, "output/dtco"), { recursive: true });
  return root;
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const arc = { id: "A->Y", input: "A", output: "Y", transition: "inverting",
  fixedInputs: {}, deckPath: "output/dtco/characterize.cir",
  logPath: "output/dtco/characterize.log", waveformPath: "output/dtco/waveforms.txt" };
const snapshot = { definition: { periodNs: 10, inputSlewPs: 100 }, characterization: [arc] } as any;
describe("DTCO frequency runtime", () => {
  it("plans bounded native/evaluation rounds with fixed tracked tool commands", () => {
    const context = { job: { toolConfigurations: [
      { id: "spice", toolId: "dtco-ngspice", environmentNames: [], timeoutSeconds: 60 },
      { id: "analysis", toolId: "dtco-analysis", environmentNames: [], timeoutSeconds: 60 },
    ] } } as any;
    const steps = buildFrequencySteps(context, snapshot);
    expect(steps).toHaveLength(32);
    expect(steps[0]!.id).toBe("frequency-native-0-" + arcFileId(arc.id));
    expect(steps[0]!.process?.argv).toEqual(["-b", "-o", "frequency-0-" + arcFileId(arc.id) + ".log",
      "frequency-0-" + arcFileId(arc.id) + ".cir"]);
    expect(steps[1]!.id).toBe("frequency-evaluate-0");
    expect(steps[1]!.process?.argv).toEqual(["--workspace", ".", "--frequency-round", "0"]);
    expect(steps.at(-1)!.id).toBe("frequency-evaluate-15");
  });

  it("rewrites only derived transient decks and skips native work after a terminal search", async () => {
    const root = await tempRoot();
    const source = [
      "* frozen characterization", "VIN A 0 PULSE(0 3.3 0 100p 100p 4.9n 10n)",
      ".tran 1p 20n 0 1p", ".control", "set wr_singlescale", "set wr_vecnames",
      "run", "wrdata waveforms.txt v(A) v(Y) i(VDD)", ".endc", ".end",
    ].join("\n") + "\n";
    const sourcePath = path.join(root, "output/dtco/characterize.cir");
    await fs.writeFile(sourcePath, source);
    const runPlannedProcess = vi.fn(async () => ({ exitCode: 0, processId: "p", processGroupId: "pg" }));
    const key = "frequency-native-0-" + arcFileId(arc.id);
    const context = { workspacePath: root, step: { stepKey: key }, runPlannedProcess } as any;
    const result = await executeFrequencyStep(context, snapshot);
    expect(result.exitCode).toBe(0);
    expect(runPlannedProcess).toHaveBeenCalledOnce();
    expect(await fs.readFile(sourcePath, "utf8")).toBe(source);
    const derived = await fs.readFile(path.join(root, "output/dtco/frequency-0-" + arcFileId(arc.id) + ".cir"), "utf8");
    expect(derived).toContain("set numdgt=17\nset wr_singlescale");
    expect(derived).toContain(".tran 4.000000000000e-12 3.300000000000e-7 0 4.000000000000e-12");
    expect(derived).toContain("wrdata frequency-0-" + arcFileId(arc.id) + ".txt v(A) v(Y) i(VDD)");
    expect(derived).toContain("PULSE(0 3.3 0 1.000000000000e-10 1.000000000000e-10");
    expect(derived).not.toBe(source);

    await fs.writeFile(path.join(root, "output/dtco/frequency-state.json"), JSON.stringify({ searchStatus: "bracketed" }));
    const skipped = await executeFrequencyStep({ ...context,
      step: { stepKey: "frequency-native-1-" + arcFileId(arc.id) } }, snapshot);
    expect(skipped.outputs).toEqual({ skipped: true, reason: "search_bracketed" });
    expect(runPlannedProcess).toHaveBeenCalledOnce();
    expect(await fs.readFile(path.join(root, "output/dtco/frequency-round-1.json"), "utf8")).toContain('"status": "skipped"');
  });

  it("records the protocol and estimates the slow transient step budget", async () => {
    const root = await tempRoot();
    const source = [
      "* frozen characterization", "VIN A 0 PULSE(0 3.3 0 100p 100p 4.9n 10n)",
      ".tran 1p 20n 0 1p", ".control", "set wr_singlescale", "set wr_vecnames",
      "run", "wrdata waveforms.txt v(A) v(Y) i(VDD)", ".endc", ".end",
    ].join("\n") + "\n";
    await fs.writeFile(path.join(root, "output/dtco/characterize.cir"), source);
    const slowSnapshot = { definition: { periodNs: 1000, inputSlewPs: 100 }, characterization: [arc] } as any;
    const context = { workspacePath: root, step: { stepKey: "frequency-native-0-" + arcFileId(arc.id) },
      runPlannedProcess: vi.fn(async () => ({ exitCode: 0, processId: "p", processGroupId: "pg" })) } as any;
    await executeFrequencyStep(context, slowSnapshot);
    const request = JSON.parse(await fs.readFile(path.join(root, "output/dtco/frequency-round-0.json"), "utf8"));
    const deck = await fs.readFile(path.join(root, "output/dtco/frequency-0-" + arcFileId(arc.id) + ".cir"), "utf8");
    expect(request.protocolVersion).toBe("dtco.transient-toggle.v2");
    expect(request.minFrequencyHz).toBeCloseTo(1 / (6060 * 100e-12), 4);
    const tran = deck.match(/^\.tran\s+(\S+)\s+(\S+)/m)!;
    const maxStep = Number(tran[1]);
    const stop = Number(tran[2]);
    expect(stop / maxStep).toBeLessThanOrEqual(1_000_000);
    expect(stop / (1 / request.frequencyHz)).toBeCloseTo(8.25, 8);
  });
});
