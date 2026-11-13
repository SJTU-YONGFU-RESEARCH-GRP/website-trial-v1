import { afterEach, describe, expect, it, vi } from "vitest";
import { getDtcoExperiment, getDtcoOptions, listDtcoExperiments, retryDtcoPoint, saveDtcoExperiment, submitDtcoExperiment } from "../../../src/api/dtco/client";
import { setApiCsrfToken } from "../../../src/api/client";
import { canRetryPoint, definitionToForm, isActivePoint, measuredPoints, parseDtcoForm, relativeChange, selectedMeasurements } from "../../../src/pages/dtco/helpers";
import { ppaParetoFrontier } from "../../../src/data/ppaMetricRegistry";
import { definition, experiment, options, point } from "./fixtures";
const response = (data: unknown) => new Response(JSON.stringify({ schemaVersion: "eda.api.v1", data }), { status: 200 });
afterEach(() => { vi.unstubAllGlobals(); setApiCsrfToken(null); });
describe("DTCO configuration and measured comparison", () => {
  it("counts deduplicated Cartesian temperature × voltage × layout and rejects invalid or oversized input", () => {
    const form = { ...definitionToForm(definition), temperatures: "25, 85, 25", voltages: "2.7, 3.3", layoutIds: ["mr-dp-9t", "mr-sa-12t"] };
    expect(parseDtcoForm(form, options)).toMatchObject({ count: 8, error: null });
    expect(parseDtcoForm({ ...form, temperatures: Array.from({ length: 17 }, (_, i) => String(i)).join(",") }, options)).toMatchObject({ count: 68, definition: null });
    for (const temperatures of ["", "25,", "NaN", "Infinity", "126"]) expect(parseDtcoForm({ ...form, temperatures }, options).definition).toBeNull();
    expect(parseDtcoForm({ ...form, voltages: "2.6" }, options).error).toContain("2.7");
    expect(parseDtcoForm({ ...form, inputSlewPs: "2500", periodNs: "10" }, options).error).toContain("quarter");
    expect(parseDtcoForm({ ...form, layoutIds: ["invented-layout"] }, options).definition).toBeNull();
    expect(parseDtcoForm({ ...form, inputSlewPs: "1", periodNs: "1000" }, options).error).toContain("1,000,000 transient steps");
    expect(parseDtcoForm({ ...form, inputSlewPs: "80", periodNs: "1000" }, options).definition).not.toBeNull();
  });
  it("compares only actual complete metrics, supports dimension/point selection, and computes truthful Pareto", () => {
    const rows = measuredPoints([point("best"), point("dominated", "succeeded", { temperatureC: 85, metrics: { delayPs: 30, averagePowerW: 2e-6, areaUm2: 4 } }),
      point("failed", "failed"), point("missing", "succeeded", { metrics: { delayPs: 2, areaUm2: 5 } }), point("nan", "succeeded", { metrics: { delayPs: NaN, averagePowerW: 1, areaUm2: 1 } })]);
    expect(rows).toHaveLength(2); expect(rows[0].powerUw).toBe(1);
    expect(selectedMeasurements(rows, new Set(), { temperature: "85", voltage: "", layout: "" }).map(row => row.point.id)).toEqual(["dominated"]);
    expect(selectedMeasurements(rows, new Set(["best"]), { temperature: "", voltage: "3.3", layout: "mr-dp-9t" }).map(row => row.point.id)).toEqual(["dominated"]);
    expect(ppaParetoFrontier(rows.map(item => ({ item, x: item.delayPs, y: item.powerUw })), "lower", "lower").map(row => row.item.point.id)).toEqual(["best"]);
    expect(relativeChange(30, 20)).toBe("+50.0%");
  });
  it("allows retry only for unsuccessful terminal points and stops polling terminal points", () => {
    for (const status of ["failed", "interrupted", "cancelled", "preparation_failed"] as const) expect(canRetryPoint(point("p", status))).toBe(true);
    for (const status of ["unsubmitted", "succeeded", "queued", "running"] as const) expect(canRetryPoint(point("p", status))).toBe(false);
    expect(isActivePoint(point("p", "queued"))).toBe(true); expect(isActivePoint(point("p", "succeeded"))).toBe(false);
  });
});
describe("DTCO persistent frontend client", () => {
  it("saves to the server, reloads saved config/history, submits, and retries one immutable attempt with CSRF", async () => {
    let saved = experiment();
    const fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      if (init.method === "POST" && url.endsWith("/experiments")) { saved = experiment("server-exp", [], JSON.parse(String(init.body))); return response(saved); }
      if (url.endsWith("/options")) return response(options);
      if (url.endsWith("/experiments")) return response([saved]);
      if (url.endsWith("/submit") || url.endsWith("/retry")) return response({ experiment: saved, submitted: ["p1"], skipped: [], failed: [] });
      return response(saved);
    });
    vi.stubGlobal("fetch", fetch); setApiCsrfToken("csrf");
    const signal = new AbortController().signal;
    await getDtcoOptions(signal);
    await saveDtcoExperiment({ ...definition, name: "Saved experiment" }, undefined, signal);
    expect((await listDtcoExperiments(signal))[0].definition.name).toBe("Saved experiment");
    expect((await getDtcoExperiment("server-exp", signal)).definition.name).toBe("Saved experiment");
    await saveDtcoExperiment(definition, "server-exp", signal);
    await submitDtcoExperiment("server-exp", signal); await retryDtcoPoint("point/id", "attempt-1", signal);
    const retry = fetch.mock.calls.at(-1)!;
    expect(retry[0]).toBe("/api/dtco/points/point%2Fid/retry");
    expect(JSON.parse(retry[1].body)).toEqual({ attemptId: "attempt-1" });
    expect(retry[1].signal).toBe(signal); expect(retry[1].credentials).toBe("include");
    expect(retry[1].headers.get("X-CSRF-Token")).toBe("csrf");
    expect(fetch.mock.calls[4][1].method).toBe("PUT");
  });
  it("surfaces backend failure and forwards AbortSignal for stale requests", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBe(controller.signal);
      return new Response(JSON.stringify({ error: { code: "TOOL_UNAVAILABLE", message: "Native SPICE unavailable" } }), { status: 503 });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(getDtcoExperiment("x", controller.signal)).rejects.toThrow("Native SPICE unavailable");
  });
});
