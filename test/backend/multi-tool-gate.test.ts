import { describe, it, expect } from "vitest";
import { ToolConcurrencyGate } from "../../server/worker/runner.ts";
const tools = [{ toolId: "dtco-selection", maxConcurrency: 1 }, { toolId: "opensta", maxConcurrency: 1 }];
describe("trusted helpers reserve shared native capacity", () => {
  it("blocks a selection helper while Digital owns OpenSTA", async () => {
    const gate = new ToolConcurrencyGate(), signal = new AbortController().signal;
    const digital = await gate.acquire("opensta", 1, signal);
    let admitted = false;
    const helper = gate.acquireMany(tools, signal).then(release => { admitted = true; return release; });
    await new Promise(resolve => setTimeout(resolve, 120));
    expect(admitted).toBe(false);
    digital(); const release = await helper; expect(admitted).toBe(true);
    release(); release(); (await gate.acquireMany(tools, signal))();
  });
  it("releases partially acquired tools when cancelled waiting for native capacity", async () => {
    const gate = new ToolConcurrencyGate(), signal = new AbortController().signal, abort = new AbortController();
    const digital = await gate.acquire("opensta", 1, signal);
    const helper = gate.acquireMany(tools, abort.signal);
    await new Promise(resolve => setTimeout(resolve, 20)); abort.abort();
    await expect(helper).rejects.toMatchObject({ type: "cancelled" });
    (await gate.acquire("dtco-selection", 1, signal))(); digital();
    (await gate.acquireMany(tools, signal))();
  });
  it("orders overlapping reservations consistently and deduplicates tools", async () => {
    const gate = new ToolConcurrencyGate(), signal = new AbortController().signal;
    const first = await gate.acquireMany([...tools].reverse().concat(tools), signal);
    const second = gate.acquireMany(tools, signal);
    first(); (await second)();
    await expect(gate.acquireMany([{ toolId: "opensta", maxConcurrency: 0 }], signal)).rejects.toThrow(/limit/);
  });
});
