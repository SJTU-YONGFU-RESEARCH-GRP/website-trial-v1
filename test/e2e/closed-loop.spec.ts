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
    await expect(workflow.getByText(/Job .* is queued/)).toBeVisible();
    await workflow.getByRole("link", { name: "Open backend processing" }).click();
    await waitForSucceededJob(page);
    await expect(page.getByText("benchmark-native-result-parser")).toBeVisible();

    await page.goto("/benchmark");
    const results = page.getByRole("heading", { name: "Computed and imported results" }).locator("..");
    await expect(results.getByText(/Benchmark [0-9a-f-]+/).first()).toBeVisible();
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
    await expect(page.getByText("fixture-ppa", { exact: false }).first()).toBeVisible();
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
    await expect(page.getByText("PPA result parser").first()).toBeVisible();

    await page.getByRole("link", { name: "Jobs" }).click();
    await expect(page.getByText(/\d+ jobs/)).toBeVisible();
    await expect(page.getByText("e2e-user").first()).toBeVisible();

    await page.getByRole("link", { name: "Results" }).click();
    await expect(page.getByText(/\d+ results/)).toBeVisible();
    const firstPrivate = page.locator("tbody tr").filter({ has: page.locator(".job-status--private") }).first();
    await expect(firstPrivate).toBeVisible();
    await firstPrivate.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText(/is now published/)).toBeVisible();

    await page.getByRole("link", { name: "Audit" }).click();
    await expect(page.getByText("user.create").first()).toBeVisible();
    await expect(page.getByText("result.lifecycle").first()).toBeVisible();
  });
});
