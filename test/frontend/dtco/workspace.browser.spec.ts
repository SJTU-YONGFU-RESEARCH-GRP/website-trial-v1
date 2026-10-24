import { expect, test, type Page } from "@playwright/test";
import type { DtcoExperiment, DtcoExperimentDefinition, DtcoPoint } from "../../../shared/contracts/dtco";
import { definition, experiment, options, point } from "./fixtures";

async function setup(page: Page, initial: DtcoExperiment[] = []) {
  const records = new Map(initial.map(item => [item.id, structuredClone(item)]));
  const calls: { path: string; body: unknown; method: string }[] = [];
  let sequence = 0;
  let failNextGet = false;
  let holdGet: ((release: () => void) => void) | null = null;
  await page.route(/^http:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ path, method, body });
    const json = (data: unknown) => route.fulfill({ json: { schemaVersion: "eda.api.v1", data } });
    if (path === "/api/auth/me") return json({ user: null, csrfToken: "mock-csrf" });
    if (path === "/api/dtco/options") return json({ ...options, publicRunner: true });
    if (path === "/api/dtco/experiments" && method === "GET") return json([...records.values()]);
    const makePoints = (input: DtcoExperimentDefinition) => input.temperaturesC.flatMap(temperatureC => input.voltagesV.flatMap(voltageV => input.layoutIds.map(layoutId =>
      point(`p-${++sequence}`, "unsubmitted", { temperatureC, voltageV, layoutId, jobId: null, attempts: [] }))));
    if (path === "/api/dtco/experiments" && method === "POST") {
      const next = experiment(`exp-${++sequence}`, makePoints(body), body);
      records.set(next.id, next); return json(next);
    }
    const id = path.split("/")[4];
    const existing = records.get(id);
    if (existing && path.endsWith("/submit")) {
      existing.points = existing.points.map(item => item.status === "unsubmitted" ? point(item.id, "queued", { ...item, status: "queued" }) : item);
      return json({ experiment: existing, submitted: existing.points.map(item => item.id), skipped: [], failed: [] });
    }
    if (existing && method === "PUT") {
      const next = { ...existing, revision: existing.revision + 1, definition: body, points: makePoints(body) };
      next.revisions = [...existing.revisions, { revision: next.revision, definition: body, points: next.points, environmentHash: options.environmentHash, createdAt: existing.createdAt }];
      records.set(id, next); return json(next);
    }
    if (existing && method === "GET") {
      if (failNextGet) { failNextGet = false; return route.fulfill({ status: 502, json: { error: { code: "TEMPORARY_GATEWAY", message: "Service restarting" } } }); }
      const snapshot = structuredClone(existing);
      if (holdGet) { const handler = holdGet; holdGet = null; await new Promise<void>(resolve => handler(resolve)); }
      return json(snapshot);
    }
    if (path.includes("/points/") && path.endsWith("/retry")) {
      const item = [...records.values()].find(record => record.points.some(candidate => candidate.id === id))!;
      item.points = item.points.map(candidate => candidate.id === id ? { ...candidate, status: "queued", error: null, attempts: [...candidate.attempts, { ...candidate.attempts[0], id: "attempt-2", number: 2, status: "queued" }] } as DtcoPoint : candidate);
      item.revisions[0].points = item.points;
      return json({ experiment: item, submitted: [id], skipped: [], failed: [] });
    }
    return json(null);
  });
  return { records, calls, failNextGet: () => { failNextGet = true; }, holdNextGet: (handler: (release: () => void) => void) => { holdGet = handler; } };
}

test("counts combinations, saves configuration, and restores it from server after reload", async ({ page }) => {
  const api = await setup(page);
  await page.goto("/dtco");
  await page.getByLabel("Experiment name").fill("Saved server sweep");
  await page.getByLabel("Temperatures (°C)", { exact: true }).fill("25, 85");
  await page.getByLabel("Supply voltages (V)", { exact: true }).fill("2.7, 3.3");
  await page.getByLabel("mr-sa-12t", { exact: true }).check();
  await expect(page.locator(".dtco-count")).toContainText("8 combinations");
  await page.getByRole("button", { name: "Save experiment", exact: true }).click();
  await expect(page).toHaveURL(/experiment=exp-/);
  expect(api.records.size).toBe(1);
  await page.reload();
  await expect(page.getByLabel("Experiment name")).toHaveValue("Saved server sweep");
  await expect(page.locator("#dtco-progress tbody tr")).toHaveCount(8);
  await expect(page.getByText("Public runner:", { exact: false })).toBeVisible();
});

test("retries one failed attempt, keeps successful jobs, and defaults comparison to all real results", async ({ page }) => {
  const failed = point("failed", "failed", { error: { code: "SPICE_EXIT", message: "ngspice exited 1", type: "tool_exit", stepId: null, retryable: true, details: null } });
  const api = await setup(page, [experiment("exp-1", [point("ok"), failed, point("ok2", "succeeded", { temperatureC: 85, metrics: { delayPs: 25, averagePowerW: 2e-6, areaUm2: 4 } })])]);
  await page.goto("/dtco?experiment=exp-1");
  await expect(page.locator("#dtco-progress")).toContainText("ngspice exited 1");
  await expect(page.getByRole("button", { name: "Retry this combination" })).toHaveCount(1);
  await page.getByRole("button", { name: "Retry this combination" }).click();
  await expect(page.getByRole("button", { name: "Retry this combination" })).toHaveCount(0);
  expect(api.calls.filter(call => call.path.endsWith("/retry"))).toEqual([{ path: "/api/dtco/points/failed/retry", method: "POST", body: { attemptId: "attempt-failed" } }]);
  expect(api.records.get("exp-1")!.points[0].jobId).toBe("job-ok");
  await expect(page.locator("#dtco-comparison")).toContainText("2 selected for comparison");
  await page.getByLabel("Temperature", { exact: true }).selectOption("85");
  await expect(page.locator("#dtco-comparison")).toContainText("1 selected for comparison");
  await page.getByLabel("Baseline (optional)").selectOption("ok2");
  await expect(page.locator("#dtco-comparison")).toContainText("0.0% vs baseline");
});

test("save-and-run persists unsaved configuration first and prevents duplicate submission", async ({ page }) => {
  const api = await setup(page, [experiment("exp-1", [point("p1", "unsubmitted", { jobId: null, attempts: [] })])]);
  await page.goto("/dtco?experiment=exp-1");
  await page.getByLabel("Experiment name").fill("Edited before submit");
  await page.getByLabel("Temperatures (°C)", { exact: true }).fill("25, 85");
  const button = page.getByRole("button", { name: "Save & run combinations", exact: true });
  await button.evaluate(element => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await expect(page.locator("#dtco-progress tbody tr")).toHaveCount(2);
  const writes = api.calls.filter(call => call.method === "PUT" || call.path.endsWith("/submit"));
  expect(writes.map(call => call.method)).toEqual(["PUT", "POST"]);
  expect((writes[0].body as DtcoExperimentDefinition).name).toBe("Edited before submit");
  expect(api.records.get("exp-1")!.definition.temperaturesC).toEqual([25, 85]);
});

test("late polling response cannot overwrite unsaved edits or the newly selected experiment", async ({ page }) => {
  const api = await setup(page, [experiment("exp-1", [point("p1", "running")]), experiment("exp-2", [], { ...definition, name: "Second experiment" })]);
  await page.goto("/dtco?experiment=exp-1");
  await expect(page.getByLabel("Experiment name")).toHaveValue(definition.name);
  await page.getByLabel("Experiment name").fill("Unsaved typed name");
  let release = () => {};
  const held = new Promise<void>(resolve => api.holdNextGet(next => { release = next; resolve(); }));
  await held;
  // A pending active-run poll must preserve the editable form.
  release();
  await expect(page.getByLabel("Experiment name")).toHaveValue("Unsaved typed name");
  let staleRelease = () => {};
  const heldAgain = new Promise<void>(resolve => api.holdNextGet(next => { staleRelease = next; resolve(); }));
  await heldAgain;
  await page.locator("#dtco-history tbody tr").filter({ hasText: "Second experiment" }).getByRole("button", { name: "View experiment" }).click();
  await expect(page.getByLabel("Experiment name")).toHaveValue("Second experiment");
  staleRelease();
  await expect(page.getByLabel("Experiment name")).toHaveValue("Second experiment");
  expect(api.records.get("exp-1")!.definition.name).toBe("Unsaved typed name");
  await expect(page).toHaveURL(/experiment=exp-2/);
});

test("transient polling error keeps last status, recovers results, and stops polling terminal runs", async ({ page }) => {
  const api = await setup(page, [experiment("exp-1", [point("p1", "running")])]);
  await page.goto("/dtco?experiment=exp-1");
  await expect(page.getByLabel("Experiment name")).toHaveValue(definition.name);
  api.failNextGet();
  await expect(page.getByRole("alert")).toContainText("Progress refresh failed: Service restarting");
  await expect(page.locator("#dtco-progress tbody")).toContainText("running");
  await expect(page.locator("#dtco-progress tbody")).not.toContainText("failed");
  api.records.get("exp-1")!.points = [point("p1")];
  await expect(page.locator("#dtco-comparison")).toContainText("1 selected for comparison");
  await expect(page.getByRole("alert")).toHaveCount(0);
  const completedCalls = api.calls.filter(call => call.path === "/api/dtco/experiments/exp-1" && call.method === "GET").length;
  await page.waitForTimeout(2300);
  expect(api.calls.filter(call => call.path === "/api/dtco/experiments/exp-1" && call.method === "GET")).toHaveLength(completedCalls);
});
