import { expect, test, type Page } from "@playwright/test";

const USER_PASSWORD = "E2e-user-only-correct-horse-battery-staple";
const ADMIN_PASSWORD = "E2e-admin-only-correct-horse-battery-staple";

async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByRole("heading", { name: "My Jobs" })).toBeVisible();
}

async function waitForSucceededJob(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Execution progress" })).toBeVisible();
  await expect(page.locator(".job-status--succeeded").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Live log" })).toBeVisible();
  await expect(page.getByText("Result published atomically")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Result & provenance" })).toBeVisible();
  await expect(page.getByText("Manifest hash")).toBeVisible();
}

test.describe.serial("EDA computation closed loop", () => {
  test("login rejects a bad password and establishes a private session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("e2e-user");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("invalid username or password");
    await page.getByLabel("Password").fill(USER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/jobs$/);
  });

  test("Benchmark import uploads, preflights, starts explicitly, logs, and appears in live results", async ({ page }) => {
    await signIn(page, "e2e-user", USER_PASSWORD);
    await page.goto("/benchmark");
    const workflow = page.locator(".benchmark-run-shell").filter({ has: page.getByRole("heading", { name: "Run real Benchmark tools" }) });
    await workflow.getByRole("button", { name: "Import completed result" }).click();
    await workflow.locator('input[type="file"]').first().setInputFiles({
      name: "REPORT.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# E2E MOS Benchmark\n\nVersion: ngspice-46\n\n## DC\n\n✓ completed\n"),
    });
    await expect(workflow.getByText("completed Benchmark artifact")).toBeVisible();
    await workflow.getByRole("button", { name: "Upload and preflight" }).click();
    await expect(workflow.getByText("Backend recognized content")).toBeVisible();
    await expect(workflow.getByRole("heading", { name: "Planned Operations" })).toBeVisible();
    await expect(workflow.getByText("No tool has run yet")).toBeVisible();
    await workflow.locator(".benchmark-start-bar").getByRole("button", { name: "Start" }).click();
    await waitForSucceededJob(page);
    await expect(page.getByText("benchmark-native-result-parser")).toBeVisible();

    await page.goto("/benchmark");
    const results = page.getByRole("region", { name: "Computed and imported results" });
    await expect(results.getByText(/Benchmark [0-9a-f-]+/).first()).toBeVisible();
  });

  test("Benchmark source run invokes the configured benchmark executable and publishes computed output", async ({ page }) => {
    await signIn(page, "e2e-user", USER_PASSWORD);
    await page.goto("/benchmark");
    const workflow = page.locator(".benchmark-run-shell").filter({ has: page.getByRole("heading", { name: "Run real Benchmark tools" }) });
    await expect(workflow.getByText(/spice-benchmark fake-eda-tool/).first()).toBeVisible();
    await workflow.locator('input[type="file"]').first().setInputFiles({
      name: "nmos.sp",
      mimeType: "text/plain",
      buffer: Buffer.from(".model nmos_test nmos level=1 vto=0.7 kp=100u\n"),
    });
    await expect(workflow.getByRole("row", { name: /nmos\.sp.*SPICE model/ })).toBeVisible();
    await workflow.getByRole("button", { name: "Upload and preflight" }).click();
    await expect(workflow.getByText("Backend recognized content")).toBeVisible();
    await expect(workflow.getByText("Run the fixed MOS benchmark", { exact: false })).toBeVisible();
    await workflow.locator(".benchmark-start-bar").getByRole("button", { name: "Start" }).click();
    await waitForSucceededJob(page);
    await expect(page.getByText("computed", { exact: true })).toBeVisible();
    await expect(page.getByText("spice-benchmark fake-eda-tool", { exact: false }).first()).toBeVisible();
  });

  test("Digital import reaches the same result API and refreshes the Plotly dataset", async ({ page }) => {
    await signIn(page, "e2e-user", USER_PASSWORD);
    await page.goto("/plotly");
    const workflow = page.locator("article.digital-workflow-card").filter({ has: page.getByRole("heading", { name: "Import Digital Results" }) });
    const input = JSON.stringify({
      architecture: "e2e_ripple", bitWidth: 8, processNode: "sky130-e2e", fmaxMhz: 123.4,
      powerMw: 0.0025, areaUm2: 44.2, powerMetric: "Liberty static leakage",
    });
    await workflow.locator('input[type="file"]').first().setInputFiles({ name: "digital-results.json", mimeType: "application/json", buffer: Buffer.from(input) });
    await expect(workflow.getByText("Local SHA-256 100%")).toBeVisible();
    await workflow.getByRole("button", { name: "Upload & Preflight" }).click();
    await expect(workflow.getByRole("heading", { name: "Backend recognized content" })).toBeVisible();
    await expect(workflow.getByRole("heading", { name: "Planned Operations" })).toBeVisible();
    await expect(workflow.getByText("Preflight passed")).toBeVisible();
    await workflow.locator(".digital-start").getByRole("button", { name: "Start" }).click();
    await waitForSucceededJob(page);
    await expect(page.getByText("digital-result-normalizer")).toBeVisible();

    const resultResponse = await page.request.get("/api/digital/results");
    expect(resultResponse.ok()).toBe(true);
    const resultBody = await resultResponse.json();
    expect(resultBody.data.some((result: { data?: { rows?: Array<{ design?: { architecture?: string } }> } }) => result.data?.rows?.some((row) => row.design?.architecture === "e2e_ripple"))).toBe(true);
    await page.goto("/plotly");
    await expect(page.locator(".js-plotly-plot").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".js-plotly-plot")).toHaveCount(6);
  });

  test("Digital source run executes Yosys and OpenSTA and publishes normalized metrics", async ({ page }) => {
    await signIn(page, "e2e-user", USER_PASSWORD);
    await page.goto("/plotly");
    const workflow = page.locator("article.digital-workflow-card").filter({ has: page.getByRole("heading", { name: "Run Digital Analysis" }) });
    await workflow.locator('input[type="file"]').nth(1).setInputFiles([
      {
        name: "top.v",
        mimeType: "text/plain",
        buffer: Buffer.from("module top(input clk, output q); assign q = clk; endmodule\n"),
      },
      {
        name: "cells.lib",
        mimeType: "text/plain",
        buffer: Buffer.from("library(test) {\nleakage_power_unit : \"1nW\";\ncell(INVX1) {\narea : 1.25;\ncell_leakage_power : 2.0;\n}\n}\n"),
      },
    ]);
    await expect(workflow.getByText("Local SHA-256 100%")).toBeVisible();
    await workflow.getByLabel(/^design$/i).fill("e2e-digital-source");
    await workflow.getByLabel(/^category$/i).fill("e2e");
    await workflow.getByLabel(/^architecture$/i).fill("rtl-source");
    await workflow.getByLabel(/^top module$/i).fill("top");
    await workflow.getByLabel(/^process technology$/i).fill("fixture45");
    await workflow.getByLabel(/^bit width$/i).fill("1");
    await workflow.getByLabel(/^library$/i).fill("fixture-lib");
    await workflow.getByLabel(/^corner$/i).fill("tt");
    await workflow.getByLabel("Clock port").fill("clk");
    await workflow.getByLabel("Clock period (ns)").fill("10");
    await workflow.getByRole("button", { name: "Upload & Preflight" }).click();
    await expect(workflow.getByText("Preflight passed")).toBeVisible();
    await expect(workflow.getByLabel("Planned operations").getByText("Yosys synthesis and mapping", { exact: true })).toBeVisible();
    await workflow.locator(".digital-start").getByRole("button", { name: "Start" }).click();
    await waitForSucceededJob(page);
    const response = await page.request.get("/api/digital/results?search=e2e-digital-source");
    expect(response.ok()).toBe(true);
    const records = (await response.json()).data;
    expect(records).toHaveLength(1);
    expect(records[0].data.rows[0].power.metric).toBe("static_liberty_leakage");
    await page.getByRole("link", { name: "Open result" }).click();
    await expect(page.getByText("static_liberty_leakage", { exact: false }).first()).toBeVisible();
  });

  test("PPA completed-run import invokes the configured parser and joins the PPA explorer", async ({ page }) => {
    await signIn(page, "e2e-user", USER_PASSWORD);
    await page.goto("/ppa");
    const workflow = page.locator("article.ppa-workflow-card").filter({ has: page.getByRole("heading", { name: "Import Completed Run" }) });
    await workflow.locator('input[type="file"]').first().setInputFiles({
      name: "metrics.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ flow: "openroad", design: "e2e-uart", area: 123.5 })),
    });
    await workflow.getByLabel("Design name").fill("e2e-uart");
    await workflow.getByLabel("Top module").fill("uart");
    await workflow.getByRole("button", { name: "Upload & Preflight" }).click();
    await expect(workflow.getByRole("heading", { name: "Backend recognized content" })).toBeVisible();
    await expect(workflow.getByText("result_json_ast.py")).toBeVisible();
    await expect(workflow.getByText("Preflight passed")).toBeVisible();
    await workflow.locator(".digital-start").getByRole("button", { name: "Start" }).click();
    await waitForSucceededJob(page);
    await expect(page.getByText("result-json-ast")).toBeVisible();

    const resultResponse = await page.request.get("/api/ppa/results");
    expect(resultResponse.ok()).toBe(true);
    const resultBody = await resultResponse.json();
    expect(resultBody.data.some((result: { data?: { normalized?: { area_um2?: number } } }) => result.data?.normalized?.area_um2 === 123.5)).toBe(true);
    await page.goto("/ppa");
    await expect(page.getByRole("heading", { name: "PPA Trend Explorer" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("checkbox", { name: /e2e-uart · imported/ })).toBeVisible();
  });

  test("PPA source sweep creates independent workspaces and preserves every successful result", async ({ page }) => {
    await signIn(page, "e2e-user", USER_PASSWORD);
    await page.goto("/ppa");
    const workflow = page.locator("article.ppa-workflow-card").filter({ has: page.getByRole("heading", { name: "Run RTL-to-GDS" }) });
    const technologySelect = workflow.getByLabel("Registered technology");
    const technologyValue = await technologySelect.locator("option").filter({ hasText: "e2e-nangate45" }).getAttribute("value");
    expect(technologyValue).toBeTruthy();
    await technologySelect.selectOption(technologyValue!);
    await workflow.locator('input[type="file"]').first().setInputFiles({
      name: "uart.v",
      mimeType: "text/plain",
      buffer: Buffer.from("module uart(input clk, output tx); assign tx = clk; endmodule\n"),
    });
    await expect(workflow.getByText("Local SHA-256 100%")).toBeVisible();
    await workflow.getByLabel(/^Design name/).fill("e2e-uart-sweep");
    await workflow.getByLabel(/^Top module/).fill("uart");
    await workflow.getByLabel("Clock period sweep mode").selectOption("list");
    await workflow.getByLabel("Clock period explicit list").fill("8, 12");
    await expect(workflow.getByText("2 runs", { exact: true })).toBeVisible();
    await workflow.getByRole("button", { name: "Upload & Preflight" }).click();
    await expect(workflow.getByText("2 independent sweep jobs", { exact: false })).toBeVisible();
    await workflow.locator(".digital-start").getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]+$/);
    const parentJobId = page.url().split("/").at(-1)!;
    await expect(page.getByRole("heading", { name: "Sweep tasks" })).toBeVisible();
    await expect(page.getByText("2 runs", { exact: true })).toBeVisible();
    await expect.poll(async () => {
      const response = await page.request.get(`/api/jobs/${parentJobId}`);
      const body = await response.json();
      return body.data.sweepJobs.map((job: { status: string }) => job.status).sort().join(",");
    }, { timeout: 30_000 }).toBe("succeeded,succeeded");
    const results = await page.request.get(`/api/ppa/results?search=e2e-uart-sweep`);
    expect(results.ok()).toBe(true);
    const records = (await results.json()).data;
    expect(records).toHaveLength(2);
    expect(records.map((record: { provenance: { parameters: { sweepPoint: { clockPeriodNs: number } } } }) => record.provenance.parameters.sweepPoint.clockPeriodNs).sort((left: number, right: number) => left - right)).toEqual([8, 12]);
  });

  test("administrator sees persisted jobs/results/tools and can create a managed user", async ({ page }) => {
    await signIn(page, "e2e-admin", ADMIN_PASSWORD);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Module queues & results")).toBeVisible();

    await page.getByRole("link", { name: "Users" }).click();
    const username = `e2e-created-${Date.now()}`;
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Initial password").fill("Created-only-correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create user" }).click();
    await expect(page.getByText(`Created ${username}.`)).toBeVisible();
    await expect(page.getByText(username, { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Tools" }).click();
    await expect(page.getByRole("heading", { name: "Tool configuration" })).toBeVisible();
    await expect(page.getByText("Yosys").first()).toBeVisible();
    await expect(page.getByText("PPA Result AST Parser", { exact: true }).first()).toBeVisible();

    await page.getByRole("link", { name: "Jobs", exact: true }).click();
    await expect(page.getByText(/\d+ jobs/)).toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: "e2e-user" }).first()).toBeVisible();

    await page.getByRole("link", { name: "Results", exact: true }).click();
    await expect(page.getByText(/\d+ results/)).toBeVisible();
    const firstPrivate = page.locator("tbody tr").filter({ has: page.locator(".job-status--private") }).first();
    await expect(firstPrivate).toBeVisible();
    await firstPrivate.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText(/is now published/)).toBeVisible();

    await page.getByRole("link", { name: "Audit" }).click();
    await expect(page.getByText("user.create").first()).toBeVisible();
    await expect(page.getByText("result.lifecycle").first()).toBeVisible();
  });
});
