import { expect, test } from "@playwright/test";
import { definition, experiment, options, point } from "./fixtures";
import { iteration, optimization, optimizationOptions } from "./optimizationFixtures";
import { selectionOptions, selectionRun } from "./selectionFixtures";

test("checked experiment and optimization results show their own GDS thumbnails and clear on uncheck", async ({ page }) => {
  const mutations: string[] = [], detailCalls: string[] = [];
  const exp = experiment("exp-layouts", [point("library"), point("none")], { ...definition, name: "Layout sweep" });
  const opt = optimization({ status: "completed", allowedActions: [], iterations: [iteration(1), iteration(2)], bestIterationId: "round-1" });
  const artifact = (id: string, path: string, resultId: string, mediaType: string) => ({ id, relativePath: `results/dtco/${resultId}/${path}`, resultId, mediaType, sha256: "hash-" + id, sizeBytes: 123 });
  await page.route(/^http:\/\/[^/]+\/api\//, async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() !== "GET") mutations.push(path);
    const json = (data: unknown) => route.fulfill({ json: { schemaVersion: "eda.api.v1", data } });
    if (path === "/api/auth/me") return json({ user: null, csrfToken: "mock" });
    if (path === "/api/dtco/options") return json({ ...options, optimization: optimizationOptions });
    if (path === "/api/dtco/selection/options") return json(selectionOptions);
    if (path === "/api/dtco/selection/runs") return json([]);
    if (path === "/api/dtco/experiments") return json([exp]);
    if (path === "/api/dtco/optimizations") return json([opt]);
    if (path === "/api/dtco/optimizations/opt-1") return json(opt);
    if (path === "/api/dtco/artifacts/gds-library/preview" && !new URL(req.url()).searchParams.has("retry")) return route.fulfill({ status: 503, body: "Renderer unavailable" });
    if (path.startsWith("/api/artifacts/preview-") || path === "/api/dtco/artifacts/gds-library/preview") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect x="20" y="20" width="200" height="80" fill="#7542b5"/></svg>' });
    if (/\/api\/(jobs|results\/dtco)\//.test(path)) {
      detailCalls.push(path);
      const n = path.split("-").at(-1)!, resultId = "result-" + n;
      const native = n === "2", noLayout = n === "none", noPreview = n === "library";
      const gds = native ? "output/native/cell.gds" : "output/completed.gds", preview = "output/preview.svg";
      if (path.startsWith("/api/jobs/")) return json({ job: { resultId }, artifacts: noLayout ? [] : [artifact("gds-" + n, gds, resultId, "application/octet-stream"), ...noPreview ? [] : [artifact("preview-" + n, preview, resultId, "image/svg+xml")]] });
      return json({ id: resultId, data: { dtco: { artifacts: noLayout ? {} : { selectedGdsPath: gds, ...native || noPreview ? {} : { completedPreviewPath: preview } } }, ...native ? { acg: { previewDiagnostics: { results: [{ status: "available", gdsPath: gds, previewPath: preview, sourceSha256: "hash-gds-2" }] } } } : {} } });
    }
    return json(null);
  });
  await page.goto("/dtco");
  await page.getByRole("tab", { name: "Results", exact: true }).click();
  expect(detailCalls).toEqual([]);
  await page.getByRole("button", { name: "Select results…", exact: true }).click();
  for (const id of ["result-1", "result-2", "result-library", "result-none"]) await page.getByRole("checkbox", { name: new RegExp(id + "\\)") }).check();
  await page.getByRole("button", { name: "4 results selected", exact: true }).click();
  const gallery = page.getByRole("region", { name: "Selected result GDS layouts", exact: true });
  await expect(gallery.getByRole("img")).toHaveCount(2);
  for (const n of [1,2]) await expect(gallery.getByRole("img").nth(n - 1)).toHaveAttribute("src", `/api/artifacts/preview-${n}/download`);
  await gallery.getByRole("button", { name: /Open full-size/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute("src", "/api/artifacts/preview-1/download");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(gallery).toContainText("GDS layout available; the preview could not be loaded.");
  await expect(gallery).toContainText("No GDS layout was published for this measurement.");
  await expect(gallery.getByRole("link", { name: /Download GDS/ })).toHaveCount(3);
  await gallery.getByRole("button", { name: /Retry preview/ }).click();
  await expect(gallery.getByRole("img")).toHaveCount(3);
  await expect(gallery.locator('img[src*="gds-library/preview"]')).toHaveAttribute("src", "/api/dtco/artifacts/gds-library/preview?retry=1");
  await page.getByRole("button", { name: "4 results selected", exact: true }).click();
  await page.getByRole("checkbox", { name: /result-2\)/ }).uncheck();
  await page.getByRole("button", { name: "3 results selected", exact: true }).click();
  await expect(gallery.getByRole("img")).toHaveCount(2);
  await expect(gallery.locator('img[src*="preview-2"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(gallery).toHaveCount(0);
  expect(mutations).toEqual([]);
});

test("a missing completed GDS artifact never uses an unrelated preview", async ({ page }) => {
  const run = selectionRun();
  await page.route(/^http:\/\/[^/]+\/api\//, route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === "/api/auth/me" ? { user: null } : path === "/api/dtco/options" ? options : path.endsWith("/selection/options") ? selectionOptions : path.endsWith("/selection/runs") ? [run.job] : path.includes("/selection/runs/") ? run : [];
    return route.fulfill({ json: { schemaVersion: "eda.api.v1", data } });
  });
  await page.goto("/dtco?selection=selection-1");
  await page.getByRole("button", { name: "View selection results", exact: true }).click();
  const gallery = page.getByRole("region", { name: "Selected result GDS layouts", exact: true });
  await expect(gallery).toContainText("No matching circuit GDS artifact was published for this evaluation.");
  await expect(gallery.getByRole("img")).toHaveCount(0);
  await page.getByRole("button", { name: "1 result selected", exact: true }).click();
  await page.getByRole("checkbox", { name: /Evaluation 0/ }).uncheck();
  await expect(gallery).toHaveCount(0);
});
