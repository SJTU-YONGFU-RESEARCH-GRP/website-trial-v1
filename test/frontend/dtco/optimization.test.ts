import { afterEach, expect, it, vi } from "vitest";
import type { ArtifactRecordV1 } from "../../../shared/contracts/v1";
import { controlDtcoOptimization, createDtcoOptimization, getDtcoOptimization } from "../../../src/api/dtco/optimization";
import { measuredIterations, resumableIteration, validateOptimization } from "../../../src/pages/dtco/optimizationHelpers";
import { extractedDevices } from "../../../src/pages/dtco/DtcoMeasuredGeometry";
import { dtcoLayoutArtifacts } from "../../../src/pages/dtco/DtcoLayoutPreview";
import { definitionToForm, dtcoScope, parseDtcoForm } from "../../../src/pages/dtco/helpers";
import { definition, options } from "./fixtures";
import { iteration, optimization, optimizationDefinition as input, optimizationOptions as config } from "./optimizationFixtures";
afterEach(() => vi.unstubAllGlobals());
it("validates physical grid/bounds, frozen axes, round limits and transient budget", () => {
  expect(validateOptimization(input, config)).toBeNull();
  expect(validateOptimization({ ...input, axes: { ...input.axes, nmosWidthUm: { min: 1, max: 1, initial: 1, step: .05 } } }, config)).toBeNull();
  expect(validateOptimization({ ...input, axes: { ...input.axes, nmosWidthUm: { ...input.axes.nmosWidthUm, initial: 1.01 } } }, config)).toContain("grid");
  expect(validateOptimization({ ...input, maxIterations: 65 }, config)).toContain("64");
  expect(validateOptimization({ ...input, inputSlewPs: 1, periodNs: 1000 }, config)).toContain("1,000,000");
  const extracted = { ...definition, design: { nmosWidthUm: .9, pmosWidthUm: 1.8 }, electricalMode: "extracted" as const };
  expect(parseDtcoForm(definitionToForm(extracted), options).definition).toMatchObject({ design: extracted.design, electricalMode: "extracted" });
  expect(dtcoScope(extracted)).toContain("capacitance");
  expect(dtcoScope(definition)).toContain("Schematic");
});
it("retains worse real measurements and permits only server-authorized failed-attempt resume", () => {
  const worse = iteration(2, { accepted: false, score: 30, metrics: { delayPs: 30, averagePowerW: 2e-6, areaUm2: 4 } });
  expect(measuredIterations([iteration(1), worse, iteration(3, { status: "failed" }), iteration(4, { metrics: { delayPs: NaN, averagePowerW: 1, areaUm2: 1 } })])).toHaveLength(2);
  const failed = iteration(3, { status: "interrupted" });
  expect(resumableIteration(optimization({ status: "paused", allowedActions: ["resume"], iterations: [failed] }))?.id).toBe(failed.id);
  expect(resumableIteration(optimization({ status: "paused", allowedActions: [], iterations: [failed] }))).toBeUndefined();
  expect(resumableIteration(optimization({ status: "paused", allowedActions: ["resume"], stopReason: "environment_changed", iterations: [failed] }))).toBeUndefined();
});
it("binds completed preview and measured GDS only by result-published paths", () => {
  const artifact = (id: string, relativePath: string, mediaType: string) => ({ id, relativePath, mediaType }) as ArtifactRecordV1;
  const files = [artifact("native", "native.gds", "application/octet-stream"), artifact("measured", "completed.gds", "application/octet-stream"), artifact("preview", "completed.png", "image/png"), artifact("untrusted", "native.png", "image/png")];
  expect(dtcoLayoutArtifacts({ dtco: { artifacts: { selectedGdsPath: "completed.gds", nativeGdsPath: "native.gds", completedPreviewPath: "completed.png" } } }, files, "result-1")).toMatchObject({ selected: { id: "measured" }, native: { id: "native" }, preview: { id: "preview" } });
  expect(dtcoLayoutArtifacts({ dtco: { artifacts: {} } }, files, "result-1").preview).toBeUndefined();
});
it("persists client request identity, forwards abort and sends exact resume token", async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ schemaVersion: "eda.api.v1", data: optimization() }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  const signal = new AbortController().signal;
  await createDtcoOptimization({ clientRequestId: "stable-id", definition: input }, signal);
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({ clientRequestId: "stable-id" });
  await getDtcoOptimization("opt/1", signal);
  await controlDtcoOptimization("opt/1", "resume", { iterationId: "round-3", attemptId: "attempt-3" }, signal);
  expect(fetch.mock.calls.at(-1)?.[0]).toBe("/api/dtco/optimizations/opt%2F1/resume");
  expect(JSON.parse(String(fetch.mock.calls.at(-1)?.[1]?.body))).toEqual({ iterationId: "round-3", attemptId: "attempt-3" });
  expect(fetch.mock.calls.at(-1)?.[1]?.signal).toBe(signal);
});

it("shows only finite measured extraction dimensions with explicit SI conversion", () => {
  expect(extractedDevices({ extraction: { devices: [{ model: "nfet_03v3", w: 1e-6, l: .28e-6 }, { model: "pfet_03v3", w: 2e-6, l: .28e-6 }, { model: "invalid", w: "1u", l: .28e-6 }] } })).toEqual([{ model: "nfet_03v3", widthUm: 1, lengthUm: .28 }, { model: "pfet_03v3", widthUm: 2, lengthUm: .28 }]);
  expect(extractedDevices(null)).toEqual([]);
});

it("resolves publisher paths only inside the current DTCO result prefix", () => {
  const resultId = "result-1", workspacePath = "output/dtco/completed.png";
  const data = { dtco: { artifacts: { completedPreviewPath: workspacePath, selectedGdsPath: "output/dtco/completed.gds", nativeGdsPath: "output/acg/native.gds" } } };
  const artifact = (id: string, relativePath: string, mediaType = "image/png", publishedResultId: string | null = resultId) => ({ id, relativePath, mediaType, resultId: publishedResultId }) as ArtifactRecordV1;
  const valid = [
    artifact("preview", `results/dtco/${resultId}/${workspacePath}`),
    artifact("measured", `results/dtco/${resultId}/output/dtco/completed.gds`, "application/octet-stream"),
    artifact("native", `results/dtco/${resultId}/output/acg/native.gds`, "application/octet-stream"),
  ];
  expect(dtcoLayoutArtifacts(data, valid, resultId)).toMatchObject({ preview: { id: "preview" }, selected: { id: "measured" }, native: { id: "native" } });
  for (const relativePath of [
    `results/dtco/other-result/${workspacePath}`, `results/acg/${resultId}/${workspacePath}`,
    `results/dtco/${resultId}-suffix/${workspacePath}`, `other/results/dtco/${resultId}/${workspacePath}`,
    `results/dtco/${resultId}/../${workspacePath}`, `/results/dtco/${resultId}/${workspacePath}`,
    `results/dtco/${resultId}//${workspacePath}`, `results/dtco/${resultId}/${String.fromCharCode(92)}${workspacePath}`,
  ]) expect(dtcoLayoutArtifacts(data, [artifact("wrong", relativePath)], resultId).preview).toBeUndefined();
  expect(dtcoLayoutArtifacts(data, valid, null).preview).toBeUndefined();
  expect(dtcoLayoutArtifacts(data, [artifact("wrong-result-record", valid[0].relativePath, "image/png", "other-result")], resultId).preview).toBeUndefined();
  expect(dtcoLayoutArtifacts({ dtco: { artifacts: { completedPreviewPath: "../" + workspacePath } } }, valid, resultId).preview).toBeUndefined();
});
