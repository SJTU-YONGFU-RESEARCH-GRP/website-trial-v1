import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ModuleId } from "../../shared/contracts/v1.ts";
import type { TestEnvironment } from "./support.ts";
import {
  TEST_PASSWORD,
  configureFixtureTool,
  createReadyDraft,
  login,
  makeEnvironment,
  multipart,
  startJob,
  waitForJob,
} from "./support.ts";

const environments: TestEnvironment[] = [];
afterEach(async () => Promise.all(environments.splice(0).map((environment) => environment.close())));

async function upload(environment: TestEnvironment, session: { cookie: string; csrf: string }, moduleId: ModuleId, files: Parameters<typeof multipart>[0]) {
  const body = multipart(files, { operation: "run", workflow: "security-test" });
  return environment.app.inject({
    method: "POST",
    url: `/api/modules/${moduleId}/drafts`,
    headers: { cookie: session.cookie, "x-csrf-token": session.csrf, "content-type": `multipart/form-data; boundary=${body.boundary}` },
    payload: body.payload,
  });
}

function processExists(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}

describe("failure containment and publication boundary", () => {
  it("materializes every sweep point as an independent queued job and preserves successful siblings", async () => {
    const environment = await makeEnvironment({ modules: ["ppa"] }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "sweep-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "sweep-user", password: TEST_PASSWORD, maxConcurrentJobs: 2 });
    const admin = await login(app, "sweep-admin"); const user = await login(app, "sweep-user");
    await configureFixtureTool(app, admin, "ppa", "success");
    const draft = await createReadyDraft(app, user, "ppa", { sweepValues: [0.1, 0.2, 0.3] });
    const started = await startJob(app, user, draft.id);
    expect(started.status).toBe("queued");
    const sweep = app.eda.repositories.jobs.listSweep(draft.id);
    expect(sweep).toHaveLength(3);
    expect(new Set(sweep.map((job) => job.workspaceRelativePath)).size).toBe(3);
    expect(sweep.map((job) => job.parameters.sweepPoint)).toEqual([{ sweepValues: 0.1 }, { sweepValues: 0.2 }, { sweepValues: 0.3 }]);
    expect(sweep.slice(1).every((job) => job.sweepParentJobId === draft.id)).toBe(true);
    const finished = await Promise.all(sweep.map((job) => waitForJob(app, user, job.id, ["succeeded", "failed"], 10_000)));
    expect(finished.map((job) => job.status)).toEqual(["succeeded", "succeeded", "succeeded"]);
    expect(finished.every((job) => Boolean(job.resultId))).toBe(true);
  }, 20_000);

  for (const mode of ["fail", "partial"] as const) {
    it(`${mode} output fails the job and never publishes a result`, async () => {
      const environment = await makeEnvironment({ modules: ["benchmark"] }); environments.push(environment);
      const { app } = environment;
      app.eda.repositories.users.create({ username: `${mode}-admin`, password: TEST_PASSWORD, role: "admin" });
      app.eda.repositories.users.create({ username: `${mode}-user`, password: TEST_PASSWORD });
      const admin = await login(app, `${mode}-admin`); const user = await login(app, `${mode}-user`);
      await configureFixtureTool(app, admin, "benchmark", mode);
      const draft = await createReadyDraft(app, user, "benchmark"); await startJob(app, user, draft.id);
      const finished = await waitForJob(app, user, draft.id);
      expect(finished.status).toBe("failed");
      expect(finished.resultId).toBeNull();
      expect(app.eda.repositories.results.list("benchmark", user.userId, false)).toEqual([]);
      const publishedDirectory = path.join(environment.root, "results", "benchmark");
      const published = await fs.readdir(publishedDirectory).catch((error: NodeJS.ErrnoException) => error.code === "ENOENT" ? [] : Promise.reject(error));
      expect(published).toEqual([]);
      const events = await app.inject({ method: "GET", url: `/api/jobs/${draft.id}/events?stream=false`, headers: { cookie: user.cookie } });
      expect(events.json().data.some((event: { level: string }) => event.level === "error")).toBe(true);
    }, 15_000);
  }

  it("classifies timeout and terminates the whole fake process group", async () => {
    const environment = await makeEnvironment({ modules: ["digital"] }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "timeout-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "timeout-user", password: TEST_PASSWORD });
    const admin = await login(app, "timeout-admin"); const user = await login(app, "timeout-user");
    await configureFixtureTool(app, admin, "digital", "timeout", 1);
    const draft = await createReadyDraft(app, user, "digital"); await startJob(app, user, draft.id);
    const pidFile = path.join(environment.root, draft.workspaceRelativePath, "output", "fake-child.pid");
    let childPid = 0;
    for (let index = 0; index < 80; index += 1) {
      try { childPid = Number((await fs.readFile(pidFile, "utf8")).trim()); break; } catch { await new Promise((resolve) => setTimeout(resolve, 25)); }
    }
    expect(childPid).toBeGreaterThan(0);
    const finished = await waitForJob(app, user, draft.id, ["failed"], 6_000);
    expect(finished.error).toMatchObject({ type: "timeout", code: "TOOL_TIMEOUT" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(processExists(childPid)).toBe(false);
    expect(finished.resultId).toBeNull();
  }, 15_000);

  it("cancel persists, becomes terminal, and leaves no child process", async () => {
    const environment = await makeEnvironment({ modules: ["ppa"] }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "cancel-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "cancel-user", password: TEST_PASSWORD });
    const admin = await login(app, "cancel-admin"); const user = await login(app, "cancel-user");
    await configureFixtureTool(app, admin, "ppa", "cancel", 10);
    const draft = await createReadyDraft(app, user, "ppa"); await startJob(app, user, draft.id);
    await waitForJob(app, user, draft.id, ["running"]);
    const pidFile = path.join(environment.root, draft.workspaceRelativePath, "output", "fake-child.pid");
    let childPid = 0;
    for (let index = 0; index < 80; index += 1) {
      try { childPid = Number((await fs.readFile(pidFile, "utf8")).trim()); break; } catch { await new Promise((resolve) => setTimeout(resolve, 25)); }
    }
    expect(childPid).toBeGreaterThan(0);
    const cancel = await app.inject({ method: "POST", url: `/api/jobs/${draft.id}/cancel`, headers: { cookie: user.cookie, "x-csrf-token": user.csrf } });
    expect(cancel.statusCode).toBe(200);
    const finished = await waitForJob(app, user, draft.id, ["cancelled"], 5_000);
    expect(finished.error).toMatchObject({ type: "cancelled", code: "JOB_CANCELLED" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(processExists(childPid)).toBe(false);
    expect(finished.resultId).toBeNull();
  }, 15_000);
});

describe("authorization, CSRF, upload safety, and limits", () => {
  it("hides one user's job from another user and denies non-admin admin access", async () => {
    const environment = await makeEnvironment({ modules: ["digital"], startWorkers: false }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "access-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "access-user-a", password: TEST_PASSWORD });
    app.eda.repositories.users.create({ username: "access-user-b", password: TEST_PASSWORD });
    const admin = await login(app, "access-admin"); const userA = await login(app, "access-user-a"); const userB = await login(app, "access-user-b");
    await configureFixtureTool(app, admin, "digital");
    const draft = await createReadyDraft(app, userA, "digital");
    const crossUser = await app.inject({ method: "GET", url: `/api/jobs/${draft.id}`, headers: { cookie: userB.cookie } });
    expect(crossUser.statusCode).toBe(404);
    const adminDenied = await app.inject({ method: "GET", url: "/api/admin/users", headers: { cookie: userA.cookie } });
    expect(adminDenied.statusCode).toBe(403);
    const missingCsrf = await app.inject({ method: "POST", url: `/api/jobs/${draft.id}/start`, headers: { cookie: userA.cookie } });
    expect(missingCsrf.statusCode).toBe(403);
    const wrongCsrf = await app.inject({ method: "POST", url: `/api/jobs/${draft.id}/start`, headers: { cookie: userA.cookie, "x-csrf-token": userB.csrf } });
    expect(wrongCsrf.statusCode).toBe(403);
    const owner = await app.inject({ method: "GET", url: `/api/jobs/${draft.id}`, headers: { cookie: userA.cookie } });
    expect(owner.statusCode).toBe(200);
  }, 15_000);

  it("rejects parent, absolute, and duplicate paths but treats shell metacharacters as inert filenames", async () => {
    const environment = await makeEnvironment({ modules: ["digital"], startWorkers: false }); environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "path-user", password: TEST_PASSWORD });
    const user = await login(app, "path-user");
    for (const relativePath of ["../escape.v", "/etc/passwd", "C:/Windows/system.ini"]) {
      const response = await upload(environment, user, "digital", [{ relativePath, contents: "module top; endmodule\n" }]);
      expect(response.statusCode, `${relativePath}: ${response.body}`).toBe(400);
    }
    const duplicate = await upload(environment, user, "digital", [
      { relativePath: "rtl/top.v", contents: "module top; endmodule\n" },
      { relativePath: "rtl/top.v", contents: "module other; endmodule\n" },
    ]);
    expect(duplicate.statusCode).toBe(400);
    expect(duplicate.body).toContain("duplicate normalized path");

    const sentinel = path.join(environment.root, "shell-injection-sentinel");
    const inertPath = "rtl/$(touch shell-injection-sentinel).v";
    const inert = await upload(environment, user, "digital", [{ relativePath: inertPath, contents: "module top; endmodule\n" }]);
    expect(inert.statusCode, inert.body).toBe(201);
    const job = inert.json().data.job;
    expect(job.inputManifest.files[0].relativePath).toBe(inertPath);
    await expect(fs.access(sentinel)).rejects.toThrow();
    expect(await fs.readFile(path.join(environment.root, job.workspaceRelativePath, "input", inertPath), "utf8")).toContain("module top");
  }, 15_000);

  it("enforces per-file upload and validated sweep limits before queueing", async () => {
    const limited = await makeEnvironment({ modules: ["ppa"], startWorkers: false, upload: { maxFileBytes: 16, maxTotalBytes: 24 } }); environments.push(limited);
    limited.app.eda.repositories.users.create({ username: "limit-admin", password: TEST_PASSWORD, role: "admin" });
    limited.app.eda.repositories.users.create({ username: "limit-user", password: TEST_PASSWORD });
    const admin = await login(limited.app, "limit-admin"); const user = await login(limited.app, "limit-user");
    await configureFixtureTool(limited.app, admin, "ppa");
    const tooLarge = await upload(limited, user, "ppa", [{ relativePath: "large.txt", contents: "x".repeat(64) }]);
    expect(tooLarge.statusCode).toBe(413);

    const accepted = await upload(limited, user, "ppa", [{ relativePath: "small.txt", contents: "valid input\n" }]);
    expect(accepted.statusCode).toBe(201);
    const draftId = accepted.json().data.job.id;
    const sweep = await limited.app.inject({
      method: "PATCH",
      url: `/api/jobs/${draftId}/draft`,
      headers: { cookie: user.cookie, "x-csrf-token": user.csrf },
      payload: { fileRoles: { "small.txt": "source" }, parameters: { sweepValues: Array.from({ length: 257 }, (_, index) => index) } },
    });
    expect(sweep.statusCode).toBe(409);
    expect(sweep.json().error.code).toBe("SWEEP_LIMIT");
    expect(["draft", "validating", "failed"]).toContain(limited.app.eda.repositories.jobs.get(draftId)?.status);
  }, 15_000);
});
