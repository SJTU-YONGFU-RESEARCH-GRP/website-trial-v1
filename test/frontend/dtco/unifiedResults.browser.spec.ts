import { expect, test, type Page } from "@playwright/test";
import { options } from "./fixtures";
import { iteration, optimization, optimizationOptions } from "./optimizationFixtures";
import { evaluation, selectionOptions, selectionRun } from "./selectionFixtures";
async function setup(page: Page, delaySecond = false) {
  const first = structuredClone(selectionRun("run-a")), second = structuredClone(selectionRun("run-b"));
  first.job.resultId = "result-a"; second.job.resultId = "result-b";
  first.result!.request.name = "Cell selection A"; second.result!.request.name = "Cell selection B";
  second.result!.evaluations = [evaluation({ feasible: false, status: "incomplete_evidence", timingKind: "sequential", setupSlackNs: .0002084, holdSlackNs: null, areaUm2: .1 })];
  const runs = [first, second], calls: {path:string;method:string}[] = [];
  let release: (() => void) | null = null;
  const opt = optimization({ status: "completed", allowedActions: [], iterations: [iteration(1)] });
  await page.route(/^http:\/\/[^/]+\/api\//, async route => {
    const path = new URL(route.request().url()).pathname; calls.push({path,method:route.request().method()});
    const json = (data: unknown) => route.fulfill({json:{schemaVersion:"eda.api.v1",data}});
    if(path === "/api/auth/me") return json({user:null});
    if(path === "/api/dtco/options") return json({...options,optimization:optimizationOptions});
    if(path === "/api/dtco/experiments") return json([]);
    if(path === "/api/dtco/optimizations") return json([opt]);
    if(path === "/api/dtco/selection/options") return json(selectionOptions);
    if(path === "/api/dtco/selection/runs" || path === "/api/jobs") return json(runs.map(run=>({...run.job,operation:"cell-selection"})));
    if(path.startsWith("/api/dtco/selection/runs/")) return json(runs.find(run=>path.endsWith(run.job.id)));
    if(path === "/api/results/dtco/result-a" || path === "/api/results/dtco/result-b") {
      if(delaySecond && path.endsWith("result-b")) await new Promise<void>(resolve=>{release=resolve;});
      const run = runs.find(run=>path.endsWith(run.job.resultId!))!;
      return json({id:run.job.resultId,data:{dtcoSelection:run.result}});
    }
    if(path === "/api/jobs/job-1") return json({job:{id:"job-1",status:"succeeded",resultId:"result-1"},artifacts:[{id:"gds",relativePath:"native.gds",mediaType:"application/octet-stream"},{id:"png",relativePath:"native.svg",mediaType:"image/svg+xml"}]});
    if(path === "/api/results/dtco/result-1") return json({id:"result-1",data:{dtco:{artifacts:{selectedGdsPath:"native.gds",completedPreviewPath:"native.svg"}}}});
    if(path === "/api/artifacts/png/download") return route.fulfill({contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'});
    return json(null);
  });
  return { calls, release:()=>release?.(), isHeld:()=>Boolean(release) };
}
test("one picker compares mixed workflows and repeated evaluation IDs without inventing metrics", async ({page})=>{
  const api = await setup(page);
  await page.goto("/dtco"); await page.getByRole("tab",{name:"Results",exact:true}).click();
  await expect(page.getByLabel("Results workflow",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Select results…",exact:true}).click();
  for(const id of ["selection:result-a:eval-0","result-1","selection:result-b:eval-0"]) await page.getByRole("checkbox",{name:new RegExp(id+"\\)")}).check();
  await page.getByRole("button",{name:"3 results selected",exact:true}).click();
  await expect(page.locator("#dtco-comparison tbody tr")).toHaveCount(3);
  const unknown = page.locator("#dtco-comparison tbody tr").filter({hasText:"Cell selection B"});
  await expect(unknown).toContainText("0.0002084"); await expect(unknown).toContainText("Unknown"); await expect(unknown).toContainText("N/A");
  await expect(page.getByRole("img", { name: "Delay vs area", exact: true }).locator("circle")).toHaveCount(3);
  await expect(page.getByRole("img", { name: "Delay vs power", exact: true }).locator("g text")).toHaveText(["2"]);
  // Checked complete rows load only their own real physical artifact evidence.
  await expect(unknown).toContainText("incomplete_evidence"); await expect(unknown).not.toContainText("Best in matching group");
  await expect(page.getByRole("region",{name:"Selected result GDS layouts",exact:true}).getByRole("img")).toHaveCount(1);
  await page.getByLabel("Baseline (optional)").selectOption("result-1"); await expect(unknown).toContainText("Different scope or unverified timing");
  await page.getByRole("tab",{name:"Input",exact:true}).click(); await page.getByLabel("DTCO workflow",{exact:true}).selectOption("selection");
  await page.getByRole("tab",{name:"Results",exact:true}).click(); await expect(page.locator("#dtco-comparison tbody tr")).toHaveCount(3);
  await page.getByRole("button",{name:"3 results selected",exact:true}).click(); await page.getByRole("checkbox",{name:/selection:result-a:eval-0\)/}).uncheck();
  await page.getByRole("button",{name:"2 results selected",exact:true}).click(); await expect(page.locator("#dtco-comparison tbody tr")).toHaveCount(2);
  await page.getByRole("button",{name:"Clear",exact:true}).click(); await expect(page.locator(".dtco-selected-result")).toHaveCount(0);
  await expect(page.locator("#dtco-comparison")).toHaveCount(0); expect(api.calls.filter(call=>call.method!=="GET")).toEqual([]);
});
test("late background reports cannot revive cleared selections",async({page})=>{
  const api = await setup(page,true);
  await page.goto("/dtco"); await page.getByRole("tab",{name:"Results",exact:true}).click();
  await expect.poll(api.isHeld).toBe(true);
  await page.getByRole("button",{name:"Select results…",exact:true}).click(); await page.getByRole("checkbox",{name:/selection:result-a:eval-0\)/}).check();
  await page.getByRole("button",{name:"1 result selected",exact:true}).click(); await page.getByRole("button",{name:"Clear",exact:true}).click(); api.release();
  await expect(page.getByText("Loading completed standard-cell evaluations…")).toHaveCount(0);
  await expect(page.locator(".dtco-selected-result")).toHaveCount(0); await expect(page.locator("#dtco-comparison")).toHaveCount(0);
  expect(api.calls.filter(call=>call.method!=="GET")).toEqual([]);
});

test("standard labels and one closed aligned detail comparison preserve evidence", async ({page}) => {
  const api = await setup(page);
  await page.goto("/dtco"); await page.getByRole("tab",{name:"Results",exact:true}).click();
  await page.getByRole("button",{name:"Select results…",exact:true}).click();
  for (const id of ["result-1", "selection:result-a:eval-0"]) {
    const choice = page.getByRole("checkbox",{name:new RegExp(id+"\\)")});
    const label = choice.locator("..");
    for (const field of ["Name:", "Candidate:", "Source:", "Conditions:", "Status:"]) await expect(label).toContainText(field);
    await expect(label).not.toContainText("SHA256"); await choice.check();
  }
  await page.getByRole("button",{name:"2 results selected",exact:true}).click();
  const details = page.locator(".dtco-combined-details");
  await expect(details).toHaveCount(1); await expect(details).not.toHaveAttribute("open", "");
  await expect(page.locator(".dtco-selected-result")).toHaveCount(0);

  await details.locator(":scope > summary").click();
  const table = page.getByRole("table", {name:"Selected result detailed comparison", exact:true});
  await expect(table.locator("thead th")).toHaveCount(3);
  await expect(table.locator("tbody tr")).toHaveCount(7);
  await expect(table).toContainText("Sizing / assignments"); await expect(table).toContainText("Reports, native files and provenance");
  await expect.poll(() => api.calls.some(call => /selection\/runs\/run-a$/.test(call.path))).toBe(true);
  await expect(details.getByText("Full optimization history · Real inverter optimization",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Clear",exact:true}).click(); await expect(details).toHaveCount(0);
  expect(api.calls.filter(call => call.method !== "GET")).toEqual([]);
});
