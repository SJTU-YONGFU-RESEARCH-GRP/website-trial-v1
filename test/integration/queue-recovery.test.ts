import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TestEnvironment } from "./support.ts";
import {
  TEST_PASSWORD,
  configureFixtureTool,
  createReadyDraft,
  login,
  makeEnvironment,
  startJob,
  waitForJob,
} from "./support.ts";

const environments: TestEnvironment[] = [];
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(environments.splice(0).map((environment) => environment.close()));
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("independent module queues", () => {
  it("a long Benchmark process does not block Digital or PPA", async () => {
    const environment = await makeEnvironment(); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "queue-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "queue-user", password: TEST_PASSWORD, maxConcurrentJobs: 4 });
    const admin = await login(app, "queue-admin"); const user = await login(app, "queue-user");
    await configureFixtureTool(app, admin, "benchmark", "cancel", 10);
    await configureFixtureTool(app, admin, "digital", "success", 5);
    await configureFixtureTool(app, admin, "ppa", "success", 5);
    const benchmark = await createReadyDraft(app, user, "benchmark");
    const digital = await createReadyDraft(app, user, "digital");
    const ppa = await createReadyDraft(app, user, "ppa");

    await startJob(app, user, benchmark.id);
    await waitForJob(app, user, benchmark.id, ["running"]);
    await Promise.all([startJob(app, user, digital.id), startJob(app, user, ppa.id)]);
    const [digitalDone, ppaDone] = await Promise.all([
      waitForJob(app, user, digital.id, ["succeeded"], 5_000),
      waitForJob(app, user, ppa.id, ["succeeded"], 5_000),
    ]);
    expect(digitalDone.status).toBe("succeeded");
    expect(ppaDone.status).toBe("succeeded");
    expect(app.eda.repositories.jobs.get(benchmark.id)?.status).toBe("running");
    expect(digitalDone.finishedAt).not.toBeNull();
    expect(ppaDone.finishedAt).not.toBeNull();

    const cancel = await app.inject({ method: "POST", url: `/api/jobs/${benchmark.id}/cancel`, headers: { cookie: user.cookie, "x-csrf-token": user.csrf } });
    expect(cancel.statusCode).toBe(200);
    expect((await waitForJob(app, user, benchmark.id, ["cancelled"], 5_000)).status).toBe("cancelled");
  }, 20_000);
});

describe("persistent recovery", () => {
  it("marks an abandoned running job interrupted and resumes a queued job after restart", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "eda-restart-integration-")); roots.push(root);
    const first = await makeEnvironment({ root, modules: ["digital"], startWorkers: false });
    first.app.eda.repositories.users.create({ username: "restart-admin", password: TEST_PASSWORD, role: "admin" });
    first.app.eda.repositories.users.create({ username: "restart-user", password: TEST_PASSWORD, maxConcurrentJobs: 3 });
    const admin = await login(first.app, "restart-admin"); const user = await login(first.app, "restart-user");
    await configureFixtureTool(first.app, admin, "digital", "success", 5);
    const abandoned = await createReadyDraft(first.app, user, "digital", { marker: "abandoned" });
    const queued = await createReadyDraft(first.app, user, "digital", { marker: "queued" });
    await startJob(first.app, user, abandoned.id); await startJob(first.app, user, queued.id);
    expect(first.app.eda.repositories.jobs.claim("digital")?.id).toBe(abandoned.id);
    expect(first.app.eda.repositories.jobs.get(abandoned.id)?.status).toBe("running");
    expect(first.app.eda.repositories.jobs.get(queued.id)?.status).toBe("queued");
    await first.close();

    const restarted = await makeEnvironment({ root, modules: ["digital"], startWorkers: true }); environments.push(restarted);
    const interrupted = restarted.app.eda.repositories.jobs.get(abandoned.id);
    expect(interrupted).toMatchObject({ status: "interrupted", error: { code: "WORKER_RESTART", retryable: true } });
    const resumed = await waitForJob(restarted.app, user, queued.id, ["succeeded"], 6_000);
    expect(resumed.status).toBe("succeeded");
    expect(resumed.resultId).toEqual(expect.any(String));

    const retry = await restarted.app.inject({ method: "POST", url: `/api/jobs/${abandoned.id}/retry`, headers: { cookie: user.cookie, "x-csrf-token": user.csrf } });
    expect(retry.statusCode, retry.body).toBe(201);
    expect(retry.json().data).toMatchObject({ status: "queued", retryOfJobId: abandoned.id });
    expect((await waitForJob(restarted.app, user, retry.json().data.id, ["succeeded"], 6_000)).status).toBe("succeeded");
  }, 20_000);
});
