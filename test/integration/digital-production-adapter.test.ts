import { afterEach, describe, expect, it } from "vitest";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import digitalModuleAdapter from "../../server/modules/digital/index.ts";
import type { TestEnvironment } from "./support.ts";
import {
  TEST_PASSWORD,
  configureTestTool,
  login,
  makeEnvironment,
  multipart,
  startJob,
  waitForJob,
} from "./support.ts";

const environments: TestEnvironment[] = [];
afterEach(async () => Promise.all(environments.splice(0).map((environment) => environment.close())));

async function upload(environment: TestEnvironment, session: { cookie: string; csrf: string }, operation: "run" | "import", files: Parameters<typeof multipart>[0]) {
  const body = multipart(files, { operation, workflow: operation === "run" ? "yosys-opensta" : "completed-results" });
  return environment.app.inject({
    method: "POST",
    url: "/api/modules/digital/drafts",
    headers: { cookie: session.cookie, "x-csrf-token": session.csrf, "content-type": `multipart/form-data; boundary=${body.boundary}` },
    payload: body.payload,
  });
}

describe("production Digital adapter through API and worker", () => {
  it("executes frozen Yosys/OpenSTA argv and normalizes their native outputs", async () => {
    const registry = new ModuleRegistry(); registry.register(digitalModuleAdapter);
    const environment = await makeEnvironment({ registry, startWorkers: true }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "digital-real-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "digital-real-user", password: TEST_PASSWORD });
    const admin = await login(app, "digital-real-admin"); const user = await login(app, "digital-real-user");
    for (const toolId of ["yosys", "opensta"] as const) {
      await configureTestTool(app, admin, { toolId, moduleId: "digital", fakeKind: toolId, adapterId: "digital-yosys-opensta-v1" });
    }

    const rtl = "module top(input clk, output q); assign q = clk; endmodule\n";
    const liberty = `library(test) {
      leakage_power_unit : "1nW";
      cell (INVX1) { area : 1.25; cell_leakage_power : 250; }
    }\n`;
    const uploaded = await upload(environment, user, "run", [
      { relativePath: "rtl/top.v", contents: rtl, mediaType: "text/x-verilog" },
      { relativePath: "lib/test.lib", contents: liberty, mediaType: "text/plain" },
    ]);
    expect(uploaded.statusCode, uploaded.body).toBe(201);
    const draft = uploaded.json().data.job;
    const preflight = await app.inject({
      method: "PATCH",
      url: `/api/jobs/${draft.id}/draft`,
      headers: { cookie: user.cookie, "x-csrf-token": user.csrf },
      payload: {
        fileRoles: { "rtl/top.v": "rtl", "lib/test.lib": "liberty" },
        parameters: {
          design: "fixture-top", category: "integration", architecture: "direct", topModule: "top",
          processTechnology: "fixture-process", bitWidth: 1, library: "fixture-lib", corner: "tt",
          clockPort: "clk", clockPeriodNs: 10, inputSlewNs: 0.05, outputLoadPf: 0.01, simulationTop: null,
        },
      },
    });
    expect(preflight.statusCode, preflight.body).toBe(200);
    expect(preflight.json().data.plan.steps.map((step: { id: string }) => step.id)).toEqual([
      "validate-input", "resolve-hierarchy", "synthesis", "timing", "normalize", "publish",
    ]);
    expect(preflight.json().data.plan.steps.find((step: { id: string }) => step.id === "synthesis").process.argv).toEqual(["-ql", "logs/yosys.log", "work/synthesis.ys"]);
    expect(preflight.json().data.plan.steps.find((step: { id: string }) => step.id === "timing").process.argv).toEqual(["work/opensta.tcl"]);

    await startJob(app, user, draft.id);
    const finished = await waitForJob(app, user, draft.id, ["succeeded", "failed"], 10_000);
    expect(finished.status, JSON.stringify(finished.error)).toBe("succeeded");
    const result = await app.inject({ method: "GET", url: `/api/results/digital/${finished.resultId}`, headers: { cookie: user.cookie } });
    expect(result.statusCode).toBe(200);
    expect(result.json().data).toMatchObject({
      provenance: { origin: "computed", parserId: "digital-result-normalizer" },
      data: { rows: [{ metrics: { areaUm2: 1.25 }, timing: { setupWnsNs: 0.4, holdWnsNs: 0.08 }, power: { metric: "static_liberty_leakage", staticLeakageMw: 0.00025, totalPowerMw: null } }] },
    });
  }, 20_000);

  it("imports completed JSON through the same normalized Digital result schema without invoking a tool", async () => {
    const registry = new ModuleRegistry(); registry.register(digitalModuleAdapter);
    const environment = await makeEnvironment({ registry, startWorkers: true }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "digital-import-user", password: TEST_PASSWORD });
    const user = await login(app, "digital-import-user");
    const completed = JSON.stringify({ architecture: "ripple", bitWidth: 8, processNode: "sky130", fmaxMhz: 120, powerMw: 0.002, areaUm2: 42, powerMetric: "Liberty static leakage" });
    const uploaded = await upload(environment, user, "import", [{ relativePath: "completed/digital-results.json", contents: completed, mediaType: "application/json" }]);
    expect(uploaded.statusCode, uploaded.body).toBe(201);
    const draft = uploaded.json().data.job;
    const preflight = await app.inject({
      method: "PATCH",
      url: `/api/jobs/${draft.id}/draft`,
      headers: { cookie: user.cookie, "x-csrf-token": user.csrf },
      payload: { fileRoles: { "completed/digital-results.json": "completed_result" }, parameters: {} },
    });
    expect(preflight.statusCode, preflight.body).toBe(200);
    expect(preflight.json().data.toolConfigurations).toEqual([]);
    await startJob(app, user, draft.id);
    const finished = await waitForJob(app, user, draft.id, ["succeeded", "failed"], 8_000);
    expect(finished.status, JSON.stringify(finished.error)).toBe("succeeded");
    const result = app.eda.repositories.results.get("digital", finished.resultId, user.userId, false);
    expect(result).toMatchObject({ provenance: { origin: "imported", toolConfigurations: [] }, data: { rows: [{ metrics: { fmaxMhz: 120, areaUm2: 42, powerMetric: "static_liberty_leakage" } }] } });
  }, 15_000);
});
