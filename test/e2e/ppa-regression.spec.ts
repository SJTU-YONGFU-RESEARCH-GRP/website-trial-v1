import { expect, test, type Page, type Route } from "@playwright/test";

// Run against an existing dev server with EDA_E2E_BASE_URL to skip data generation.
// All mutation endpoints are intercepted: these tests never enqueue EDA work.
async function setup(page: Page) {
  let draftId = 0;
  let fail = false;
  let hold: "upload" | "preflight" | null = null;
  let release: (() => void) | null = null;
  let entered: (() => void) | null = null;
  let waiting = Promise.resolve();
  const starts: string[] = [];
  const patches: Record<string, unknown>[] = [];
  const parameter = { id: "clockPeriodNs", label: "Clock period", type: "number", defaultValue: 10, required: true, sweepable: true, enumValues: [], mapping: { kind: "config", key: "CLOCK_PERIOD" } };
  const capability = { toolId: "openroad-orfs", label: "OpenROAD", health: "healthy", parameters: [parameter] };
  const recognition = { fileCount: 1, totalBytes: 40, files: [{ relativePath: "top.v", recognizedType: "verilog", sha256: "a".repeat(64), validationErrors: [], unresolvedIncludes: [] }] };
  const ready = { plan: { steps: [], warnings: [] } };
  const json = (route: Route, data: unknown) => route.fulfill({ json: { data } });
  await page.route(/^http:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return json(route, { user: null, csrfToken: "mock" });
    if (path === "/api/modules/ppa/capabilities") return json(route, {
      capabilities: [capability, { ...capability, toolId: "openlane1", label: "OpenLane" }],
      maxSweepJobs: 256,
      technologies: ["tech-a", "tech-b"].map((id) => ({ id, technologyId: id, standardCellLibrary: "mock", allowedAdapterIds: ["ppa-openroad-orfs-v1", "ppa-openlane1-v1"], pdk: "mock", processNode: "45", corner: "typical", rcCorner: "typical" })),
    });
    if (path === "/api/modules/ppa/drafts") {
      if (hold === "upload") { entered?.(); await new Promise<void>((resolve) => { release = resolve; }); hold = null; }
      return json(route, { job: { id: "mock-ppa-" + ++draftId }, recognition });
    }
    if (path.endsWith("/draft")) {
      patches.push(route.request().postDataJSON());
      if (hold === "preflight") { entered?.(); await new Promise<void>((resolve) => { release = resolve; }); hold = null; }
      if (fail) return route.fulfill({ status: 422, json: { error: { code: "TEST_PREFLIGHT", message: "Mock preflight rejected" } } });
      return json(route, ready);
    }
    if (path.endsWith("/start")) { starts.push(path); return json(route, { id: "mock-started" }); }
    if (path === "/api/ppa/results") return json(route, []);
    return json(route, null);
  });
  await page.goto("/ppa");
  const workflow = page.locator("article.ppa-workflow-card");
  await workflow.getByLabel("Registered technology").selectOption("tech-a");
  await workflow.locator('input[type="file"]').first().setInputFiles({
    name: "top.v", mimeType: "text/plain", buffer: Buffer.from("module top(input clk); endmodule"),
  });
  await expect(workflow.getByText("Local SHA-256 100%")).toBeVisible();
  const preflight = async () => {
    await workflow.getByRole("button", { name: "Upload & Preflight" }).click();
    await expect(workflow.getByText("Preflight passed", { exact: true })).toBeVisible();
  };
  return { workflow, preflight, starts, patches, fail: () => { fail = true; }, pause: (phase: "upload" | "preflight") => {
    hold = phase;
    waiting = new Promise<void>((resolve) => { entered = resolve; });
    return { entered: () => waiting, release: () => release?.() };
  } };
}

test("PPA sweep edit invalidates a completed preflight", async ({ page }) => {
  const { workflow, preflight, starts, patches } = await setup(page);
  await preflight();
  await workflow.getByLabel("Clock period sweep mode").selectOption("list");
  await workflow.getByLabel("Clock period explicit list").fill("8, 12");
  await expect(workflow.getByText("Preflight passed", { exact: true })).toHaveCount(0);
  await expect(workflow.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
  await expect(workflow.getByText("Inputs changed. Run Upload & Preflight again before starting.", { exact: true })).toBeVisible();
  expect(starts).toHaveLength(0);
  await preflight();
  expect((patches.at(-1)?.parameters as { sweep: unknown }).sweep).toEqual({ clockPeriodNs: { mode: "list", values: [8, 12] } });
  await expect(workflow.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
  await workflow.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => starts.length).toBe(1);
  expect(starts[0]).toBe("/api/jobs/mock-ppa-2/start");
});

for (const phase of ["upload", "preflight"] as const) {
  test(`PPA ignores stale ${phase} completion after editing`, async ({ page }) => {
    const { workflow, preflight, pause, patches, starts } = await setup(page);
    const gate = pause(phase);
    await workflow.getByRole("button", { name: "Upload & Preflight" }).click();
    await gate.entered();
    await workflow.getByLabel(/^Clock period(?!( sweep| start| stop| step| explicit))/).fill("15");
    gate.release();
    await expect(workflow.getByRole("button", { name: "Upload & Preflight" })).toBeEnabled();
    await expect(workflow.getByText("Preflight passed", { exact: true })).toHaveCount(0);
    await expect(workflow.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
    if (phase === "upload") expect(patches).toHaveLength(0);
    expect(starts).toHaveLength(0);
    await preflight();
    expect(patches.at(-1)?.parameters).toMatchObject({ clockPeriodNs: 15 });
  });
}

test("PPA failed preflight removes an old valid plan", async ({ page }) => {
  const { workflow, preflight, fail, starts } = await setup(page);
  await preflight();
  fail();
  await workflow.getByRole("button", { name: "Upload & Preflight" }).click();
  await expect(workflow.getByRole("alert")).toHaveText("Mock preflight rejected");
  await expect(workflow.getByText("Preflight passed", { exact: true })).toHaveCount(0);
  await expect(workflow.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
  expect(starts).toHaveLength(0);
});

test("PPA unchanged successful preflight can still Start", async ({ page }) => {
  const { workflow, preflight, starts } = await setup(page);
  await preflight();
  await workflow.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => starts.length).toBe(1);
  expect(starts[0]).toBe("/api/jobs/mock-ppa-1/start");
});

test("PPA trends and table use the same exact checked reports including none", async ({ page }) => {
  await setup(page);
  await page.getByRole("tab", { name: "Results" }).click();
  const trend = page.locator(".ppa-trend-explorer");
  await expect(page.locator(".ppa-run-option")).not.toHaveCount(0);
  await expect(trend.getByText("0 selected runs", { exact: true })).toBeVisible();
  await expect(trend.locator(".ppa-trend-empty")).toBeVisible();
  const boxes = page.locator('.ppa-run-option input[type="checkbox"]');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await expect(trend.getByText("2 selected runs", { exact: true })).toBeVisible();
  const selectedUids = await page.locator(".ppa-run-option.is-selected code").allTextContents();
  const tableUids = await page.locator(".ppa-run-table tbody tr td:first-child code").allTextContents();
  expect(tableUids).toEqual(selectedUids.map((value) => value.replace("UID: ", "")));
  await page.getByLabel("Search reports").fill("no-match-regression");
  await expect(trend.getByText("2 selected runs", { exact: true })).toBeVisible();
  await expect(page.locator(".ppa-run-table tbody tr td:first-child code")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear reports" }).click();
  await expect(trend.getByText("0 selected runs", { exact: true })).toBeVisible();
  await expect(trend.locator(".ppa-trend-plot")).toHaveCount(0);
  await expect(page.locator(".ppa-run-table .ppa-empty")).toHaveText("Select at least one AST report above.");
});


for (const edit of ["parameter", "technology", "role", "flow", "files", "range-start", "range-stop", "range-step", "sweep-mode", "list"] as const) {
  test(`PPA invalidates approval for ${edit} edits`, async ({ page }) => {
    const { workflow, preflight, starts, patches } = await setup(page);
    if (edit.startsWith("range-")) {
      await workflow.getByLabel("Clock period sweep mode").selectOption("range");
      await workflow.getByLabel("Clock period start", { exact: true }).fill("8");
      await workflow.getByLabel("Clock period stop", { exact: true }).fill("12");
      await workflow.getByLabel("Clock period step", { exact: true }).fill("2");
    }
    if (edit === "list") {
      await workflow.getByLabel("Clock period sweep mode").selectOption("list");
      await workflow.getByLabel("Clock period explicit list").fill("8,12");
    }
    await preflight();
    if (edit === "parameter") await workflow.locator('input[type="number"]').fill("15");
    else if (edit === "technology") await workflow.getByLabel("Registered technology").selectOption("tech-b");
    else if (edit === "role") await workflow.locator("tbody select").selectOption("include");
    else if (edit === "flow") await workflow.locator(".ppa-flow-field select").first().selectOption("openlane1");
    else if (edit === "files") await workflow.locator('input[type="file"]').first().setInputFiles({ name: "other.v", mimeType: "text/plain", buffer: Buffer.from("module other; endmodule") });
    else if (edit === "sweep-mode") await workflow.getByLabel("Clock period sweep mode").selectOption("list");
    else if (edit === "list") await workflow.getByLabel("Clock period explicit list").fill("9,13");
    else await workflow.getByLabel("Clock period " + edit.replace("range-", ""), { exact: true }).fill(edit === "range-step" ? "1" : edit === "range-start" ? "9" : "14");
    await expect(workflow.getByText("Preflight passed", { exact: true })).toHaveCount(0);
    await expect(workflow.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
    await expect(workflow.getByText("Inputs changed. Run Upload & Preflight again before starting.", { exact: true })).toBeVisible();
    expect(starts).toHaveLength(0);
    if (edit === "range-start") {
      await preflight();
      expect((patches.at(-1)?.parameters as { sweep: unknown }).sweep).toEqual({ clockPeriodNs: { mode: "range", start: 9, stop: 12, step: 2 } });
      await expect(workflow.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
    }
  });
}
