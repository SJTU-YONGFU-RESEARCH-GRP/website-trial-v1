import { expect, test, type Page } from "@playwright/test";
import type { DtcoOptimization } from "../../../shared/contracts/dtco";
import { options } from "./fixtures";
import { iteration, optimization, optimizationOptions } from "./optimizationFixtures";
async function setup(page: Page, initial: DtcoOptimization[] = []) {
  const records = new Map(initial.map(row => [row.id, structuredClone(row)]));
  const calls: { path: string; method: string; body: unknown }[] = [];
  let failNext = false;
  let hold: ((release: () => void) => void) | null = null;
  await page.route(/^http:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method(), body = request.postData() ? request.postDataJSON() : null;
    calls.push({ path, method, body });
    const json = (data: unknown) => route.fulfill({ json: { schemaVersion: "eda.api.v1", data } });
    if (path === "/api/auth/me") return json({ user: null, csrfToken: "mock-csrf" });
    if (path === "/api/dtco/options") return json({ ...options, optimization: optimizationOptions, layouts: [...options.layouts, { id: "mr-sa-12t-pex", label: "Measured completed layout", available: true, reason: null }] });
    if (path === "/api/dtco/experiments") return json([]);
    if (path === "/api/dtco/optimizations" && method === "GET") return json([...records.values()]);
    if (path === "/api/dtco/optimizations" && method === "POST") {
      const next = optimization({ definition: body.definition }); records.set(next.id, next); return json(next);
    }
    const id = path.split("/")[4], row = records.get(id);
    if (row && path.endsWith("/start")) { row.status = "running"; row.allowedActions = ["stop"]; row.iterations = [iteration(1, { status: "queued", metrics: null, score: null, accepted: null, progress: 0 })]; return json(row); }
    if (row && path.endsWith("/stop")) { row.status = "cancelled"; row.allowedActions = []; row.stopReason = "user_stopped"; return json(row); }
    if (row && path.endsWith("/resume")) { row.status = "running"; row.allowedActions = ["stop"]; row.iterations.at(-1)!.status = "queued"; return json(row); }
    if (row && method === "GET") {
      if (failNext) { failNext = false; return route.fulfill({ status: 502, json: { error: { code: "GATEWAY", message: "Temporary restart" } } }); }
      const snapshot = structuredClone(row);
      if (hold) { const handler = hold; hold = null; await new Promise<void>(resolve => handler(resolve)); }
      return json(snapshot);
    }
    return json(null);
  });
  return { records, calls, failNext: () => { failNext = true; }, holdNext: (fn: (release: () => void) => void) => { hold = fn; } };
}
test("saves bounded optimization exactly once and reloads server definition without starting", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/dtco");
  await page.getByLabel("Optimization name", { exact: true }).fill("Saved optimizer");
  await page.getByLabel("NMOS width initial (µm)").fill("1.01");
  await expect(page.getByRole("button", { name: "Save optimization", exact: true })).toBeDisabled();
  await page.getByLabel("NMOS width initial (µm)").fill("1");
  const save = page.getByRole("button", { name: "Save optimization", exact: true });
  await save.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page).toHaveURL(/optimization=opt-1/);
  expect(api.calls.filter(call => call.method === "POST")).toHaveLength(1);
  expect(api.calls.find(call => call.method === "POST")?.body).toHaveProperty("clientRequestId");
  await page.reload();
  await expect(page.getByLabel("Optimization name", { exact: true })).toHaveValue("Saved optimizer");
  await expect(page.getByRole("button", { name: "Start automatic optimization" })).toBeVisible();
  expect(api.calls.filter(call => call.path.endsWith("/start"))).toHaveLength(0);
  await expect(page.getByRole("heading", { name: "1 · Experiment configuration", exact: true })).toBeVisible();
});
test("retains historical best after a worse measured round and supports comparison selection", async ({ page }) => {
  const best = iteration(1), worse = iteration(2, { accepted: false, score: 30, metrics: { delayPs: 30, averagePowerW: 2e-6, areaUm2: 4 }, relativeImprovement: -.5 });
  await setup(page, [optimization({ status: "completed", allowedActions: [], stopReason: "patience", iterations: [best,worse], bestIterationId: best.id, bestScore: best.score })]);
  await page.goto("/dtco?optimization=opt-1");
  const panel = page.locator("#dtco-optimization");
  await expect(panel.getByText("Retained best: round 1", { exact: true })).toBeVisible();
  await expect(panel).toContainText("Stop reason: patience");
  await expect(panel).toContainText("2 / 2 measured rounds selected");
  await page.getByLabel("Compare optimization round 2").uncheck();
  await expect(panel).toContainText("1 / 2 measured rounds selected");
  await page.getByLabel("Optimization baseline").selectOption(best.id);
  await expect(panel).toContainText("0.0% vs baseline");
  await expect(page.getByRole("img", { name: "Measured objective and best-so-far trajectory" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume failed round" })).toHaveCount(0);
});
test("resumes only the saved failed attempt and supports explicit stop", async ({ page }) => {
  const failed = iteration(2, { status: "interrupted", metrics: null, score: null, accepted: null });
  const api = await setup(page, [optimization({ status: "paused", allowedActions: ["resume"], stopReason: "execution_failed", iterations: [iteration(1),failed], bestIterationId: "round-1", bestScore: 20 })]);
  await page.goto("/dtco?optimization=opt-1");
  const resume = page.getByRole("button", { name: "Resume failed round" });
  await resume.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole("button", { name: "Stop optimization", exact: true })).toBeVisible();
  expect(api.calls.filter(call => call.path.endsWith("/resume"))).toEqual([{ path: "/api/dtco/optimizations/opt-1/resume", method: "POST", body: { iterationId: failed.id, attemptId: failed.attemptId } }]);
  await page.getByRole("button", { name: "Stop optimization", exact: true }).click();
  await expect(page.locator("#dtco-optimization")).toContainText("Stop reason: user stopped");
  const gets = api.calls.filter(call => call.method === "GET" && call.path.endsWith("/opt-1")).length;
  await page.waitForTimeout(2300);
  expect(api.calls.filter(call => call.method === "GET" && call.path.endsWith("/opt-1"))).toHaveLength(gets);
});
test("recovers temporary poll failure and ignores stale response after choosing another run", async ({ page }) => {
  const first = optimization({ status: "running", allowedActions: ["stop"], iterations: [iteration(1, { status: "running", metrics: null, score: null })] });
  const second = optimization({ id: "opt-2", definition: { ...first.definition, name: "Other saved optimizer" } });
  const api = await setup(page, [first,second]);
  await page.goto("/dtco?optimization=opt-1");
  await expect(page.getByRole("button", { name: "Stop optimization", exact: true })).toBeVisible();
  api.failNext();
  await expect(page.locator("#dtco-optimization").getByRole("alert")).toContainText("retrying");
  await expect(page.getByRole("button", { name: "Stop optimization", exact: true })).toBeVisible();
  let release!: () => void;
  const held = new Promise<void>(resolve => api.holdNext(next => { release = next; resolve(); }));
  await held;
  await page.locator("#dtco-optimization tbody tr").filter({ hasText: "Other saved optimizer" }).getByRole("button", { name: "View optimization" }).click();
  await expect(page.getByLabel("Optimization name", { exact: true })).toHaveValue("Other saved optimizer");
  release();
  await page.waitForTimeout(300);
  await expect(page.getByLabel("Optimization name", { exact: true })).toHaveValue("Other saved optimizer");
  await expect(page).toHaveURL(/optimization=opt-2/);
  expect(api.calls.filter(call => call.method === "POST")).toHaveLength(0);
});

test("saves valid unsaved optimizer configuration before switching history", async ({ page }) => {
  const other = optimization({ id: "opt-2", definition: { ...optimizationOptions.defaults, name: "Other optimizer" } });
  const api = await setup(page, [other]);
  await page.goto("/dtco");
  await page.getByLabel("Optimization name", { exact: true }).fill("Preserve this draft");
  await page.locator("#dtco-optimization tbody tr").filter({ hasText: "Other optimizer" }).getByRole("button", { name: "View optimization" }).click();
  await expect(page.getByLabel("Optimization name", { exact: true })).toHaveValue("Other optimizer");
  expect(api.records.get("opt-1")?.definition.name).toBe("Preserve this draft");
  expect(api.calls.filter(call => call.method === "POST").map(call => call.path)).toEqual(["/api/dtco/optimizations"]);
});
test("inspects actual process and uses completed measured preview rather than native intermediate", async ({ page }) => {
  await setup(page, [optimization({ status: "completed", allowedActions: [], iterations: [iteration(1)], bestIterationId: "round-1", bestScore: 20 })]);
  const artifact = (id: string, relativePath: string, mediaType: string) => ({ id, relativePath, mediaType, sha256: `sha-${id}`, role: "dtco-evidence", sizeBytes: 1024, createdAt: "2026-10-25T00:00:00Z" });
  await page.route("**/api/jobs/job-1", route => route.fulfill({ json: { schemaVersion: "eda.api.v1", data: {
    job: { id: "job-1", status: "succeeded", resultId: "result-1", progress: 1, workflow: "dtco", operation: "run", startedAt: null, finishedAt: null },
    steps: [{ id: "extract", name: "Validate completed-layout extraction", stepKey: "dtco-extract", status: "succeeded", progress: 1 }],
    latestEvents: [], artifacts: [artifact("native", "native.gds", "application/octet-stream"), artifact("measured", "completed.gds", "application/octet-stream"), artifact("preview", "completed.png", "image/png")],
  } } }));
  await page.route("**/api/results/dtco/result-1", route => route.fulfill({ json: { schemaVersion: "eda.api.v1", data: {
    data: { dtco: { metricScope: "Post-layout: extracted devices and capacitance; no wire resistance", artifacts: { selectedGdsPath: "completed.gds", nativeGdsPath: "native.gds", completedPreviewPath: "completed.png" } } },
  } } }));
  await page.route("**/api/artifacts/preview/download", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7xQAAAAASUVORK5CYII=", "base64") }));
  await page.goto("/dtco?optimization=opt-1");
  await page.getByRole("button", { name: "Inspect round 1", exact: true }).click();
  await expect(page.getByText("Validate completed-layout extraction", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Completed GDS layout used for extracted measurements" })).toHaveAttribute("src", "/api/artifacts/preview/download");
  await expect(page.getByRole("link", { name: "Download measured GDS", exact: true })).toHaveAttribute("href", "/api/artifacts/measured/download");
  await expect(page.getByRole("link", { name: "Download native intermediate GDS", exact: true })).toHaveAttribute("href", "/api/artifacts/native/download");
  await expect(page.getByLabel("Measured layout and scope")).toContainText("no wire resistance");
});
