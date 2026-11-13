import { expect, test, type Page } from "@playwright/test";
import type { SelectionRun } from "../../../shared/contracts/dtcoSelection";
import { options } from "./fixtures";
import { optimizationOptions } from "./optimizationFixtures";
import { evaluation, selectionJob, selectionOptions, selectionRequest, selectionResult, selectionRun } from "./selectionFixtures";
async function setup(page: Page, initial: SelectionRun[] = []) {
  const runs = new Map(initial.map(run => [run.job.id,structuredClone(run)]));
  const calls: { path: string; method: string; body: unknown }[] = [];
  let defer: ((release: () => void) => void) | null = null;
  await page.route(/^http:\/\/[^/]+\/api\//, async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method(), body = request.postData() ? request.postDataJSON() : null;
    calls.push({path,method,body});
    const json = (data: unknown) => route.fulfill({json:{schemaVersion:"eda.api.v1",data}});
    if (path === "/api/auth/me") return json({user:null,csrfToken:"mock-csrf"});
    if (path === "/api/dtco/options") return json({...options,optimization:optimizationOptions});
    if (["/api/dtco/experiments","/api/dtco/optimizations"].includes(path)) return json([]);
    if (path === "/api/dtco/selection/options") return json(selectionOptions);
    if (path === "/api/dtco/selection/runs" && method === "GET") return json([...runs.values()].map(run => run.job));
    if (path === "/api/dtco/selection/runs" && method === "POST") {
      const job = selectionJob("new-selection","queued"); job.parameters = {dtcoSelectionSnapshot:{request:body}};
      runs.set(job.id,{job,result:null,artifacts:[]}); return json(job);
    }
    const id = path.split("/")[5], run = runs.get(id);
    if (run && (path.endsWith("/retry") || path.endsWith("/complete-layout"))) { const job = selectionJob("retry-selection","queued"); runs.set(job.id,{job,result:null,artifacts:[]}); return json(job); }
    if (path.startsWith("/api/jobs/") && path.endsWith("/cancel")) { const target = runs.get(path.split("/")[3]); if (target) target.job.status = "cancelled"; return json(target?.job); }
    if (run && method === "GET") {
      const snapshot = structuredClone(run);
      if (defer) { const fn = defer; defer = null; await new Promise<void>(resolve => fn(resolve)); }
      return json(snapshot);
    }
    return route.fulfill({status:404,json:{error:{code:"NOT_FOUND",message:"Unknown mock route"}}});
  });
  return {calls,runs,holdNext: (fn: (release: () => void) => void) => {defer=fn;}};
}
test("keeps sizing available and submits per-instance drive choices exactly once", async ({page}) => {
  const api = await setup(page);
  await page.goto("/dtco");
  await expect(page.getByLabel("Optimization name",{exact:true})).toBeVisible();
  await page.getByLabel("DTCO workflow",{exact:true}).selectOption("selection");
  await expect(page.getByLabel("Optimization name",{exact:true})).toHaveCount(0);
  await expect(page.locator("#dtco-input-panel")).toContainText("area minimizes cell area.");
  await page.getByLabel("u_nand allow X1",{exact:true}).uncheck();
  await expect(page.getByLabel("u_nand baseline drive",{exact:true})).toHaveValue("2");
  await page.getByLabel("Lock u_inv",{exact:true}).check();
  const run = page.getByRole("button",{name:"Run standard-cell selection",exact:true});
  await run.evaluate(button => {(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect(page).toHaveURL(/selection=new-selection/);
  expect(api.calls.filter(call => call.method === "POST")).toHaveLength(1);
  const body = api.calls.find(call => call.method === "POST")!.body as typeof selectionRequest;
  expect(body.circuit.instances[0].allowedDrives).toEqual([2,4]); expect(body.circuit.instances[2].locked).toBe(true);
  await expect(page.getByRole("button",{name:"Cancel selection",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Cancel selection",exact:true}).click();
  await expect(page.getByRole("button",{name:"Retry selection",exact:true})).toBeVisible();
});
test("loads completed selection without executing and confines reports to Results", async ({page}) => {
  const api = await setup(page,[selectionRun()]);
  await page.goto("/dtco?selection=selection-1");
  await expect(page.getByLabel("Selection name",{exact:true})).toHaveValue(selectionRequest.name);
  await expect(page.locator("#dtco-input-panel")).not.toContainText("Retained best: evaluation");
  await page.getByRole("button",{name:"View selection results",exact:true}).click();
  const panel = page.locator("#dtco-results-panel");
  await expect(panel.locator("#dtco-comparison")).toContainText("retained best");
  await expect(panel.locator("#dtco-comparison")).toContainText("N/A · combinational");
  await panel.getByRole("button", { name: "1 result selected", exact: true }).click();
  await panel.getByRole("checkbox", { name: /Evaluation 1/ }).check();
  await panel.getByRole("button", { name: "2 results selected", exact: true }).click();
  await expect(panel.locator("#dtco-comparison tbody tr")).toHaveCount(2);
  await expect(panel.locator("#dtco-comparison")).toContainText("infeasible");
  await panel.locator(".dtco-combined-details > summary").click();
  await expect(panel.getByText("All evaluations in this saved run (2)", { exact: true })).toHaveCount(2);
  await expect(panel.getByRole("link",{name:"Download all artifacts",exact:true}).first()).toHaveAttribute("href","/api/jobs/selection-1/artifacts.zip");
  expect(api.calls.filter(call => call.method === "POST")).toHaveLength(0);
});
test("shows unknown evidence explicitly and never retains an unverified best", async ({page}) => {
  const run = selectionRun(); run.result = selectionResult({status:"inconclusive",evaluations:[evaluation({timingKind:"sequential",setupSlackNs:1,holdSlackNs:null,status:"incomplete_evidence",feasible:false})]});
  await setup(page,[run]);
  await page.goto("/dtco?selection=selection-1");
  await page.getByRole("button",{name:"View selection results",exact:true}).click();
  const panel = page.locator("#dtco-results-panel");
  await expect(panel).toContainText("incomplete_evidence");
  await expect(panel.locator("#dtco-comparison")).toContainText("Unknown");
  await expect(panel).not.toContainText("Retained best: evaluation");
});
test("imports a larger generic graph and blocks invalid JSON before submit", async ({page}) => {
  await setup(page);
  await page.goto("/dtco");
  await page.getByLabel("DTCO workflow",{exact:true}).selectOption("selection");
  await page.getByText("Edit or upload circuit JSON",{exact:true}).click();
  const graph = structuredClone(selectionRequest.circuit);
  graph.instances = Array.from({length:16},(_,i) => ({id:`u_${i}`,family:"INV" as const,inputs:[i ? `n_${i-1}` : "a"],output:i===15 ? "y" : `n_${i}`,allowedDrives:[1,2,4],initialDrive:1}));
  await page.getByLabel("Circuit JSON",{exact:true}).fill(JSON.stringify(graph));
  await expect(page.getByRole("button",{name:"Run standard-cell selection",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Apply circuit JSON",exact:true}).click();
  await expect(page.getByRole("table",{name:"Standard-cell instance choices"}).locator("tbody tr")).toHaveCount(16);
  await page.getByLabel("Circuit JSON",{exact:true}).fill('{"bad":true}');
  await page.getByRole("button",{name:"Apply circuit JSON",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("JSON must contain a circuit");
});

test("historical timing-only runs require an explicit linked layout completion action", async ({page}) => {
  const legacy = selectionRun(); legacy.result!.schemaVersion = "dtco.cell-selection.result.v1";
  const api = await setup(page, [legacy]);
  await page.goto("/dtco?selection=selection-1");
  await expect(page.getByRole("button", {name:"Complete layout flow",exact:true})).toBeVisible();
  await expect(page.getByRole("button", {name:"View selection results",exact:true})).toHaveCount(0);
  await page.getByRole("tab", {name:"Results",exact:true}).click();
  await expect(page.locator("#dtco-results-panel")).toContainText("1 timing-only selection runs are archived");
  await page.getByRole("button", {name:"Select results…",exact:true}).click();
  await expect(page.locator('input[name="dtco-result"]')).toHaveCount(0);
  expect(api.calls.filter(call => call.method === "POST")).toHaveLength(0);
  await page.getByRole("tab", {name:"Input",exact:true}).click();
  await page.getByRole("button", {name:"Complete layout flow",exact:true}).click();
  await expect(page).toHaveURL(/selection=retry-selection/);
  expect(api.calls.filter(call => call.method === "POST").map(call => call.path)).toEqual(["/api/dtco/selection/runs/selection-1/complete-layout"]);
});
