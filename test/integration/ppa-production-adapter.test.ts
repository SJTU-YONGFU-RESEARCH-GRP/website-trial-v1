import { afterEach, describe, expect, it } from "vitest";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import ppaModuleAdapter from "../../server/modules/ppa/index.ts";
import type { TestEnvironment } from "./support.ts";
import { TEST_PASSWORD, configureTestTool, login, makeEnvironment, multipart, startJob, waitForJob } from "./support.ts";

const environments: TestEnvironment[] = [];
afterEach(async () => Promise.all(environments.splice(0).map((environment) => environment.close())));

describe("production PPA completed-run adapter through API and worker", () => {
  it("executes the configured parser, preserves evidence, and atomically publishes normalized PPA data", async () => {
    const registry = new ModuleRegistry(); registry.register(ppaModuleAdapter);
    const environment = await makeEnvironment({ registry, startWorkers: true }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "ppa-import-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "ppa-import-user", password: TEST_PASSWORD });
    const admin = await login(app, "ppa-import-admin"); const user = await login(app, "ppa-import-user");
    await configureTestTool(app, admin, { toolId: "ppa-result-parser", moduleId: "ppa", fakeKind: "ppa-result-parser", adapterId: "ppa-result-parser-v1" });

    const body = multipart([
      { relativePath: "openroad/uart/run/metrics.json", contents: JSON.stringify({ design: "uart", flow: "openroad", area: 123.5 }), mediaType: "application/json" },
      { relativePath: "openroad/uart/run/config.tcl", contents: "exec touch should-never-run\n", mediaType: "text/plain" },
    ], { operation: "import-completed-run", workflow: "openroad-orfs" });
    const uploaded = await app.inject({ method: "POST", url: "/api/modules/ppa/drafts", headers: { cookie: user.cookie, "x-csrf-token": user.csrf, "content-type": `multipart/form-data; boundary=${body.boundary}` }, payload: body.payload });
    expect(uploaded.statusCode, uploaded.body).toBe(201);
    expect(uploaded.json().data.recognition.files.find((file: { relativePath: string }) => file.relativePath.endsWith("config.tcl"))).toMatchObject({ recognizedType: "evidence-script-never-executed" });
    const draft = uploaded.json().data.job;
    const preflight = await app.inject({
      method: "PATCH",
      url: `/api/jobs/${draft.id}/draft`,
      headers: { cookie: user.cookie, "x-csrf-token": user.csrf },
      payload: {
        fileRoles: {
          "openroad/uart/run/metrics.json": "completed_run",
          "openroad/uart/run/config.tcl": "completed_run",
        },
        parameters: {
          flow: "openroad-orfs", designName: "uart", topModule: "uart", clockPort: "clk", clockPeriodNs: 10,
          technologyLibraryId: "import-evidence-only",
        },
      },
    });
    expect(preflight.statusCode, preflight.body).toBe(200);
    expect(preflight.json().data.plan.steps.map((step: { id: string }) => step.id)).toEqual(["validate-input", "prepare-import", "parse-native", "normalize", "publish"]);
    const parser = preflight.json().data.plan.steps.find((step: { id: string }) => step.id === "parse-native").process;
    expect(parser.argv).toEqual(["run", "--flow", "openroad", "--include-all", "work/import-run"]);
    expect(parser.argv.join(" ")).not.toContain("config.tcl");

    await startJob(app, user, draft.id);
    const finished = await waitForJob(app, user, draft.id, ["succeeded", "failed"], 10_000);
    expect(finished.status, JSON.stringify(finished.error)).toBe("succeeded");
    const result = app.eda.repositories.results.get("ppa", finished.resultId, user.userId, false);
    expect(result).toMatchObject({
      lifecycle: "private",
      provenance: { origin: "imported", parserId: "result-json-ast", toolVersions: { "ppa-result-parser": expect.stringContaining("fake-eda-tool") } },
      data: { flow: "openroad-orfs", parserFlow: "openroad", normalized: { area_um2: 123.5, setup_wns_ns: 0.12, hold_wns_ns: 0.04, power_mw: 1.5 } },
    });
    const detail = await app.inject({ method: "GET", url: `/api/jobs/${draft.id}`, headers: { cookie: user.cookie } });
    expect(detail.json().data.artifacts.map((artifact: { role: string }) => artifact.role)).toEqual(expect.arrayContaining(["parse-native.stdout", "normalized-result", "native-run"]));
  }, 20_000);
});
