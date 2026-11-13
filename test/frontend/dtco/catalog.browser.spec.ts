import { expect, test, type Page } from "@playwright/test";
import catalog from "../../../scripts/dtco/catalog.json" with { type: "json" };
import { options, definition, experiment } from "./fixtures";
import { iteration, optimization, optimizationDefinition, optimizationOptions } from "./optimizationFixtures";
const model = catalog.modelProfiles.find(item => item.modelId === "gf180-03v3")!;
const defaults = { ...definition, modelVersion: model.id, layoutIds: ["mr-sa-12t-pex"], electricalMode: "extracted", sizingMode: "custom", processCorners: ["tt"], workflow: "integrated" };
async function setup(page: Page, config: { integrationAvailable?: boolean; initialRun?: any } = {}) {
  const writes: { path: string; body: any }[] = [];
  let batch: any = null, run: any = config.initialRun ?? null;
  const layouts = [...new Set(catalog.circuitProfiles.flatMap(item => item.layoutIds))].map(id => ({ id, label: id, available: true, reason: null }));
  await page.route(/^http:\/\/[^/]+\/api\//, async route => {
    const path = new URL(route.request().url()).pathname, method = route.request().method(), body = route.request().postDataJSON();
    const json = (data: unknown) => route.fulfill({ json: { schemaVersion: "eda.api.v1", data } });
    if (method === "POST") writes.push({ path, body });
    if (path === "/api/auth/me") return json({ user: null, csrfToken: "mock-csrf" });
    if (path === "/api/dtco/options") return json({ ...options, ...catalog, defaults, layouts, circuits: catalog.circuitProfiles, models: catalog.modelProfiles, technologies: catalog.technologyProfiles,
      integrations: { available: config.integrationAvailable ?? true, reasons: config.integrationAvailable === false ? ["PPA tool unavailable"] : [] },
      optimization: { ...optimizationOptions, defaults: { ...optimizationDefinition, ...defaults } } });
    if (path === "/api/dtco/experiments" && method === "POST") { batch = experiment("catalog-exp", [], body); return json(batch); }
    if (path === "/api/dtco/experiments") return json(batch ? [batch] : []);
    if (path === "/api/dtco/experiments/catalog-exp") return json(batch);
    if (path === "/api/dtco/optimizations" && method === "POST") { run = optimization({ definition: body.definition }); return json(run); }
    if (path === "/api/dtco/optimizations") return json(run ? [run] : []);
    if (path === "/api/dtco/optimizations/opt-1") return json(run);
    return json(null);
  });
  return writes;
}
test("catalog UI filters real choices and fixed library inventory cannot be resized (mock API)", async ({ page }) => {
  const writes = await setup(page); await page.goto("/dtco");
  await page.getByLabel("Technology", { exact: true }).selectOption("sky130A");
  const models = await page.getByLabel("Model version", { exact: true }).locator("option").allTextContents();
  expect(models.every(label => label.includes("sky130"))).toBe(true);
  await expect(page.getByLabel("Circuit", { exact: true }).locator('option[value="gf180-inverter"]')).toHaveCount(0);
  const fixed = catalog.circuitProfiles.find(item => item.id.startsWith("sky130_fd_sc_hd__inv_1"))!;
  await page.getByLabel("Circuit", { exact: true }).selectOption(fixed.id);
  await expect(page.getByLabel("Sizing mode", { exact: true })).toHaveValue("fixed");
  const device = fixed.devices[0];
  await expect(page.getByLabel(device.id + " width (µm)", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Lock " + device.id + " width", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Save experiment", exact: true }).click();
  expect(writes[0].body).toMatchObject({ technologyId: "sky130A", circuitId: fixed.id, sizingMode: "fixed", groundVoltagesV: [0], processCorners: ["tt"] });
  expect(writes[0].body.deviceOverrides).toBeUndefined();
});
test("fixed and sweep controls post real arrays and survive reload (mock API)", async ({ page }) => {
  const writes = await setup(page); await page.goto("/dtco");
  for (const [label, text] of [["Temperatures (°C)", "25,85"], ["Supply voltages (V)", "3.2,3.3"], ["Ground voltages VSS (V)", "0,.1"]]) {
    await page.getByLabel(label + " mode", { exact: true }).selectOption("sweep");
    await page.getByLabel(label, { exact: true }).fill(text);
  }
  await page.getByLabel("Process corners mode", { exact: true }).selectOption("sweep");
  await page.locator("#dtco-configuration").getByRole("checkbox", { name: "SS", exact: true }).check();
  await expect(page.locator(".dtco-count")).toContainText("16 combinations");
  await page.getByRole("button", { name: "Save experiment", exact: true }).click();
  expect(writes[0].body).toMatchObject({ temperaturesC: [25,85], voltagesV: [3.2,3.3], groundVoltagesV: [0,.1], processCorners: ["tt","ss"] });
  await page.reload(); await expect(page.getByLabel("Ground voltages VSS (V)", { exact: true })).toHaveValue("0, 0.1");
  expect(writes).toHaveLength(1);
});
test("optimizer posts condition axes, device locks and one fixed corner (mock API)", async ({ page }) => {
  const writes = await setup(page); await page.goto("/dtco");
  await page.getByLabel("Optimization Lock MP0 width", { exact: true }).check();
  await expect(page.getByLabel("MP0 width max (µm)", { exact: true })).toBeDisabled();
  await page.getByLabel("Search VSS", { exact: true }).check();
  await page.getByLabel("VSS min (V)", { exact: true }).fill("0");
  await page.getByLabel("VSS max (V)", { exact: true }).fill(".1");
  await page.getByLabel("Optimization process corner", { exact: true }).selectOption("ss");
  await page.getByRole("button", { name: "Save optimization", exact: true }).click();
  expect(writes[0].body.definition).toMatchObject({ processCorners: ["ss"], deviceOverrides: { MP0: { lockWidth: true } }, parameterAxes: { groundVoltageV: { min: 0, max: .1, initial: 0 }, "device:MP0:widthUm": { min: 2, max: 2, initial: 2 } } });
  await expect(page.getByRole("button", { name: "Start automatic optimization" })).toBeEnabled();
  expect(writes).toHaveLength(1);
});

test("untouched optimizer draft opens history without silently creating a new run (mock API)", async ({ page }) => {
  const writes = await setup(page, { initialRun: optimization({ definition: { ...optimizationDefinition, ...defaults } as any }) });
  await page.goto("/dtco");
  await page.getByRole("button", { name: "View optimization", exact: true }).click();
  await expect(page).toHaveURL(/optimization=opt-1/);
  expect(writes).toHaveLength(0);
});
test("unavailable integration permits a draft and direct execution, with honest frequency objective (mock API)", async ({ page }) => {
  const writes = await setup(page, { integrationAvailable: false }); await page.goto("/dtco");
  await page.getByLabel("Optimization objective", { exact: true }).selectOption("maxFrequencyHz");
  await expect(page.locator("#dtco-optimization")).toContainText("not chip clock Fmax");
  await page.getByLabel("Optimization Execution workflow", { exact: true }).selectOption("direct");
  await page.getByLabel("Objective target (optional)", { exact: true }).fill("800000000");
  await page.getByRole("button", { name: "Save optimization", exact: true }).click();
  expect(writes[0].body.definition).toMatchObject({ workflow: "direct", objective: { metric: "maxFrequencyHz", target: 800000000 } });
  await expect(page.getByRole("button", { name: "Start automatic optimization" })).toBeEnabled();
  await page.getByRole("button", { name: "New optimization", exact: true }).click();
  await page.getByRole("button", { name: "Save optimization", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start automatic optimization" })).toBeDisabled();
});

test("Results shows persisted platform jobs and artifact provenance without synthetic ACG jobs (mock API)", async ({ page }) => {
  const now = "2026-10-25T00:00:00Z", sha = "a".repeat(64);
  const pipeline = { id: "pipeline-real-record", attemptId: "attempt-1", status: "succeeded", currentNodeId: null, progress: 1, provenanceVerified: true, error: null, createdAt: now, updatedAt: now,
    nodes: ["benchmark", "dtco", "ppa", "digital"].map(kind => ({ id: kind, kind, moduleId: kind, jobId: "child-" + kind, resultId: "result-" + kind, status: "succeeded", progress: 1, currentStepId: null, error: null, artifacts: kind === "ppa" ? [{ sourceJobId: "child-ppa", resultId: "result-ppa", artifactId: "artifact-ppa", relativePath: "characterization.json", sha256: sha, sizeBytes: 321 }] : [] })) };
  const measured = iteration(1, { metrics: { delayPs: 20, averagePowerW: 1e-6, areaUm2: null, maxFrequencyHz: 800000000 }, attempts: [{ id: "attempt-1", number: 1, pipeline }] as any });
  const writes = await setup(page, { initialRun: optimization({ definition: { ...optimizationDefinition, ...defaults } as any, status: "completed", allowedActions: [], iterations: [measured], bestIterationId: measured.id, bestScore: 20 }) });
  await page.goto("/dtco?optimization=opt-1");
  await expect(page.locator("#dtco-input-panel .dtco-pipeline-results")).toHaveCount(0);
  await page.getByRole("button", { name: "View optimization results", exact: true }).click();
  const result = page.locator("#dtco-results-panel");
  await expect(result.getByRole("columnheader", { name: "Maximum verified cell toggle frequency (Hz)", exact: true })).toBeVisible();
  await expect(result.locator("#dtco-comparison")).toContainText("800,000,000");
  await expect(result.locator("#dtco-comparison")).toContainText("Unavailable");
  await expect(result.locator(".dtco-pipeline-results")).not.toHaveAttribute("open", "");
  await result.locator(".dtco-pipeline-results > summary").click();
  await result.locator(".dtco-pipeline-results > details > summary").click();
  for (const kind of ["benchmark", "dtco", "ppa", "digital"]) await expect(result.locator(`a[href="/jobs/child-${kind}"]`)).toBeVisible();
  await expect(result.locator('.dtco-pipeline-results a[href*="acg"]')).toHaveCount(0);
  await result.getByText("1 immutable artifacts", { exact: true }).click();
  await expect(result.getByRole("link", { name: "characterization.json", exact: true })).toHaveAttribute("href", /artifact-ppa/);
  await expect(result.locator(".dtco-pipeline-results")).toContainText(sha);
  expect(writes).toHaveLength(0);
});

test("schematic-only catalog selection automatically uses direct workflow and blocks integrated execution (mock API)", async ({ page }) => {
  const writes = await setup(page); await page.goto("/dtco");
  const hv = catalog.modelProfiles.find(item => item.modelId === "gf180-06v0")!;
  const clone = catalog.circuitProfiles.find(item => item.id.startsWith("custom-from-library:") && item.modelIds.includes(hv.modelId))!;
  for (const prefix of ["", "Optimization "]) {
    await page.getByLabel(prefix ? "Optimization model version" : "Model version", { exact: true }).selectOption(hv.id);
    await page.getByLabel(prefix ? "Optimization circuit" : "Circuit", { exact: true }).selectOption(clone.id);
    const workflow = page.getByLabel(prefix + "Execution workflow", { exact: true });
    await expect(workflow).toHaveValue("direct");
    await expect(workflow.locator('option[value="integrated"]')).toHaveJSProperty("disabled", true);
  }
  await expect(page.locator("#dtco-optimization")).toContainText("no newly generated layout area");
  await expect(page.getByLabel("Optimization objective", { exact: true }).locator('option[value="areaUm2"]')).toHaveJSProperty("disabled", true);
  await page.getByRole("button", { name: "Save optimization", exact: true }).click();
  expect(writes[0].body.definition).toMatchObject({ circuitId: clone.id, workflow: "direct", electricalMode: "schematic", layoutIds: ["schematic-only"] });
  await expect(page.getByRole("button", { name: "Start automatic optimization" })).toBeEnabled();
});

test("superseded historical frequency is explicit in comparison and optimization history (mock API)", async ({ page }) => {
  const reason = "The old frequency measurement window was invalid; rerun with the current protocol.";
  const measured = iteration(1, { score: null, accepted: null, feasible: false, error: { type: "configuration", code: "DTCO_FREQUENCY_SUPERSEDED_PROTOCOL", message: reason, stepId: null, retryable: false, details: null }, significantImprovement: null, relativeImprovement: null,
    metrics: { delayPs: 20, averagePowerW: 1e-6, areaUm2: 3, maxFrequencyHz: null },
    provenance: { frequencyProtocolDiagnostics: { status: "superseded_protocol", reason } } });
  const writes = await setup(page, { initialRun: optimization({ definition: { ...optimizationDefinition, ...defaults, objective: { metric: "maxFrequencyHz" } } as any,
    status: "completed", allowedActions: [], iterations: [measured], bestIterationId: null, bestScore: null }) });
  await page.goto("/dtco?optimization=opt-1");
  await expect(page.locator("#dtco-optimization")).toContainText("Frequency measurement needs rerun");
  await expect(page.locator("#dtco-optimization")).toContainText(reason);
  await page.getByRole("button", { name: "View optimization results", exact: true }).click();
  const results = page.locator("#dtco-results-panel");
  await expect(results.locator("#dtco-comparison")).toContainText("Frequency measurement needs rerun");
  await expect(results.locator("#dtco-comparison tbody tr td").nth(5)).toContainText("Unavailable");
  await results.locator(".dtco-combined-details > summary").click();
  await expect(results.getByRole("link", { name: "Download all artifacts", exact: true })).toBeVisible();
  await results.locator(".dtco-combined-details > details > summary").click();
  const history = results.locator(".dtco-optimization-context");
  await expect(history).toContainText("Historical frequency scores and best claims are unavailable until rerun.");
  await expect(history).not.toContainText("Retained best: round");
  await expect(history.locator("svg")).toHaveCount(0);
  await expect(history.locator("tbody tr")).toContainText("succeeded");
  expect(writes).toHaveLength(0);
});
