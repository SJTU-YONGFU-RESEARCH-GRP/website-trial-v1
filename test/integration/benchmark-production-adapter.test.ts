import { afterEach, describe, expect, it } from "vitest";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import { createBenchmarkModule } from "../../server/modules/benchmark/index.ts";
import type { TestEnvironment } from "./support.ts";
import { TEST_PASSWORD, login, makeEnvironment, multipart, startJob, waitForJob } from "./support.ts";

const environments: TestEnvironment[] = [];
afterEach(async () => Promise.all(environments.splice(0).map((environment) => environment.close())));

describe("production Benchmark completed-result adapter through API and worker", () => {
  it("normalizes a native REPORT and manifest without executing uploaded evidence", async () => {
    const registry = new ModuleRegistry(); registry.register(createBenchmarkModule());
    const environment = await makeEnvironment({ registry, startWorkers: true }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "benchmark-import-user", password: TEST_PASSWORD });
    const user = await login(app, "benchmark-import-user");
    const report = `# MOS Benchmark

Version: ngspice-46

## DC

✓ completed

## Transient

✓ completed
`;
    const body = multipart([
      { relativePath: "ngspice/REPORT.md", contents: report, mediaType: "text/markdown" },
      { relativePath: "ngspice/manifest.json", contents: JSON.stringify({ simulator: "ngspice", source: "external-completed-run" }), mediaType: "application/json" },
      { relativePath: "ngspice/evidence.sh", contents: "touch should-never-run\n", mediaType: "text/plain" },
    ], { operation: "import-completed-result", workflow: "fixed-four-mode" });
    const uploaded = await app.inject({ method: "POST", url: "/api/modules/benchmark/drafts", headers: { cookie: user.cookie, "x-csrf-token": user.csrf, "content-type": `multipart/form-data; boundary=${body.boundary}` }, payload: body.payload });
    expect(uploaded.statusCode, uploaded.body).toBe(201);
    const draft = uploaded.json().data.job;
    const preflight = await app.inject({
      method: "PATCH",
      url: `/api/jobs/${draft.id}/draft`,
      headers: { cookie: user.cookie, "x-csrf-token": user.csrf },
      payload: {
        fileRoles: {
          "ngspice/REPORT.md": "completed-result",
          "ngspice/manifest.json": "completed-result",
          "ngspice/evidence.sh": "completed-result",
        },
        parameters: { mode: "import", operations: { benchmark: true }, benchmark: {} },
      },
    });
    expect(preflight.statusCode, preflight.body).toBe(200);
    expect(preflight.json().data.plan.steps.map((step: { id: string }) => step.id)).toEqual(["validate-import", "parse-result", "publish-result"]);
    expect(preflight.json().data.plan.steps.every((step: { process: unknown }) => step.process === null)).toBe(true);
    expect(preflight.json().data.toolConfigurations).toEqual([]);

    await startJob(app, user, draft.id);
    const finished = await waitForJob(app, user, draft.id, ["succeeded", "failed"], 8_000);
    expect(finished.status, JSON.stringify(finished.error)).toBe("succeeded");
    const result = app.eda.repositories.results.get("benchmark", finished.resultId, user.userId, false);
    expect(result).toMatchObject({
      provenance: { origin: "imported", parserId: "benchmark-native-result-parser", toolConfigurations: [] },
      summary: { origin: "imported", reportCount: 1, simulators: ["ngspice"] },
      data: { benchmark: { reportCount: 1, runs: [{ simulator: "ngspice", version: "ngspice-46", domains: [
        { domain: "dc", status: "succeeded" }, { domain: "transient", status: "succeeded" },
        { domain: "ac", status: "not-run" }, { domain: "noise", status: "not-run" },
      ] }] } },
    });
  }, 15_000);
});
