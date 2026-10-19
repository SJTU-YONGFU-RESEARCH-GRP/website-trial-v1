import { expect, test, type Page } from "@playwright/test";

const USER_PASSWORD = "E2e-user-only-correct-horse-battery-staple";
const ADMIN_PASSWORD = "E2e-admin-only-correct-horse-battery-staple";

async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
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

  test("Benchmark, Digital, and PPA inputs expose source execution only", async ({ page }) => {
    await page.goto("/benchmark");
    await expect(page.getByRole("heading", { name: "Run Benchmark Workflow" })).toBeVisible();
    await expect(page.getByText("Import completed result", { exact: true })).toHaveCount(0);
    await page.goto("/digital");
    await expect(page.getByRole("heading", { name: "Run Digital Analysis" })).toBeVisible();
    await expect(page.getByText("Import completed result", { exact: true })).toHaveCount(0);
    await page.goto("/ppa");
    await expect(page.getByRole("heading", { name: "Run RTL-to-GDS" })).toBeVisible();
    await expect(page.getByText("Import completed result", { exact: true })).toHaveCount(0);
  });

  test("Benchmark source run invokes the configured benchmark executable and publishes computed output", async ({ page }) => {
    await page.goto("/benchmark");
    const workflow = page.locator(".benchmark-run-shell");
    await expect(workflow.getByText(/spice-benchmark fake-eda-tool/).first()).toBeVisible();
    await workflow.locator('input[type="file"]').first().setInputFiles({
      name: "nmos.sp",
      mimeType: "text/plain",
      buffer: Buffer.from([
        ".model nmos_test nmos level=1 vto=0.7 kp=100u",
        ".model pmos_test pmos level=1 vto=-0.7 kp=50u",
        "",
      ].join("\n")),
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

  test("Digital source run executes Yosys and OpenSTA and publishes normalized metrics", async ({ page }) => {
    await page.goto("/digital");
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

  test("PPA source sweep creates independent workspaces and preserves every successful result", async ({ page }) => {
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

    await page.getByLabel("Administration sections").getByRole("link", { name: "Jobs", exact: true }).click();
    await expect(page.getByText(/\d+ jobs/)).toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: "public-runner" }).first()).toBeVisible();

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
