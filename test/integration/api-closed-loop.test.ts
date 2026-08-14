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
afterEach(async () => Promise.all(environments.splice(0).map((environment) => environment.close())));

describe("authenticated upload-to-result API loop", () => {
  it("requires explicit Start, executes a child process, streams events, and publishes through the result API", async () => {
    const environment = await makeEnvironment({ modules: ["digital"] });
    environments.push(environment);
    const { app } = environment;
    app.eda.repositories.users.create({ username: "closed-loop-admin", password: TEST_PASSWORD, role: "admin" });
    app.eda.repositories.users.create({ username: "closed-loop-user", password: TEST_PASSWORD, role: "user" });
    app.eda.repositories.users.create({ username: "closed-loop-other", password: TEST_PASSWORD, role: "user" });
    const admin = await login(app, "closed-loop-admin");
    const user = await login(app, "closed-loop-user");
    const other = await login(app, "closed-loop-other");
    const tool = await configureFixtureTool(app, admin, "digital");

    const capabilities = await app.inject({ method: "GET", url: "/api/modules/digital/capabilities" });
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json()).toMatchObject({ schemaVersion: "eda.api.v1", data: { moduleId: "digital", configured: true } });
    expect(capabilities.json().data.capabilities[0]).toMatchObject({ toolId: "fixture-digital", health: "healthy" });
    expect(capabilities.json().data.technologies.every((technology: { libertyPaths: string[]; techLefPath: string | null; cellLefPaths: string[] }) => technology.libertyPaths.length === 0 && technology.techLefPath === null && technology.cellLefPaths.length === 0)).toBe(true);

    const ready = await createReadyDraft(app, user, "digital", { experiment: "closed-loop" });
    expect(ready.status).toBe("ready");
    expect(ready.plan.steps).toHaveLength(1);
    expect(ready.plan.steps[0].process).toMatchObject({
      toolConfigurationId: tool.id,
      argv: ["--output", "output/fake-result.json", "--module", "digital"],
      cwdRelative: ".",
    });
    expect(ready.resultId).toBeNull();
    expect(app.eda.repositories.results.list("digital", user.userId, false)).toEqual([]);

    const queued = await startJob(app, user, ready.id);
    expect(queued.status).toBe("queued");
    const finished = await waitForJob(app, user, ready.id);
    expect(finished.status).toBe("succeeded");
    expect(finished.resultId).toEqual(expect.any(String));

    const detail = await app.inject({ method: "GET", url: `/api/jobs/${ready.id}`, headers: { cookie: user.cookie } });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.steps).toEqual([expect.objectContaining({ stepKey: "execute", status: "succeeded", exitCode: 0 })]);
    expect(detail.json().data.artifacts.map((artifact: { role: string }) => artifact.role)).toEqual(expect.arrayContaining(["execute.stdout", "execute.stderr", "normalized-result"]));

    const polling = await app.inject({ method: "GET", url: `/api/jobs/${ready.id}/events?stream=false`, headers: { cookie: user.cookie } });
    expect(polling.statusCode).toBe(200);
    expect(polling.json().data.map((event: { message: string }) => event.message)).toEqual(expect.arrayContaining(["Job queued", "Worker claimed job", "Result published atomically"]));

    const sse = await app.inject({ method: "GET", url: `/api/jobs/${ready.id}/events`, headers: { cookie: user.cookie, accept: "text/event-stream" } });
    expect(sse.statusCode).toBe(200);
    expect(sse.headers["content-type"]).toContain("text/event-stream");
    expect(sse.body).toContain("event: job-event");
    expect(sse.body).toContain("event: end");

    const privateList = await app.inject({ method: "GET", url: "/api/digital/results", headers: { cookie: user.cookie } });
    expect(privateList.statusCode).toBe(200);
    expect(privateList.json().data).toEqual([expect.objectContaining({ id: finished.resultId, lifecycle: "private" })]);
    expect(privateList.headers.etag).toMatch(/^".+"$/);
    const publicBefore = await app.inject({ method: "GET", url: "/api/digital/results" });
    expect(publicBefore.json().data).toEqual([]);
    const privateArtifact = detail.json().data.artifacts.find((value: { role: string }) => value.role === "normalized-result");
    const crossResult = await app.inject({ method: "GET", url: `/api/results/digital/${finished.resultId}`, headers: { cookie: other.cookie } });
    const crossArtifact = await app.inject({ method: "GET", url: `/api/artifacts/${privateArtifact.id}/download`, headers: { cookie: other.cookie } });
    expect(crossResult.statusCode).toBe(404);
    expect(crossArtifact.statusCode).toBe(404);

    const publish = await app.inject({
      method: "PATCH",
      url: `/api/admin/results/digital/${finished.resultId}`,
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf },
      payload: { lifecycle: "published" },
    });
    expect(publish.statusCode).toBe(200);
    expect(publish.json().data.lifecycle).toBe("published");
    const publicAfter = await app.inject({ method: "GET", url: "/api/digital/results" });
    expect(publicAfter.json().data).toEqual([expect.objectContaining({ id: finished.resultId, provenance: expect.objectContaining({ origin: "computed", jobId: ready.id, inputManifestSha256: expect.stringMatching(/^[a-f0-9]{64}$/) }) })]);

    const download = await app.inject({ method: "GET", url: `/api/artifacts/${privateArtifact.id}/download`, headers: { cookie: user.cookie } });
    expect(download.statusCode).toBe(200);
    expect(JSON.parse(download.body)).toMatchObject({ schemaVersion: "fake.eda.v1", status: "succeeded" });

    const deleted = await app.inject({ method: "PATCH", url: `/api/admin/results/digital/${finished.resultId}`,
      headers: { cookie: admin.cookie, "x-csrf-token": admin.csrf }, payload: { lifecycle: "deleted" } });
    expect(deleted.statusCode).toBe(200);
    const deletedList = await app.inject({ method: "GET", url: `/api/admin/results?moduleId=digital&lifecycle=deleted&ownerId=${user.userId}`, headers: { cookie: admin.cookie } });
    expect(deletedList.json().data).toEqual([expect.objectContaining({ id: finished.resultId, lifecycle: "deleted" })]);
    const deletedDetail = await app.inject({ method: "GET", url: `/api/results/digital/${finished.resultId}`, headers: { cookie: admin.cookie } });
    expect(deletedDetail.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/digital/results" })).json().data).toEqual([]);

    const openApi = await app.inject({ method: "GET", url: "/api/docs/json" });
    expect(openApi.statusCode).toBe(200);
    const specification = openApi.json();
    expect(specification.openapi).toMatch(/^3\./);
    expect(Object.keys(specification.paths)).toEqual(expect.arrayContaining([
      "/api/auth/login", "/api/auth/logout", "/api/auth/me",
      "/api/modules/{module}/capabilities", "/api/modules/{module}/drafts",
      "/api/jobs/{jobId}/draft", "/api/jobs/{jobId}/start", "/api/jobs",
      "/api/jobs/{jobId}", "/api/jobs/{jobId}/events", "/api/jobs/{jobId}/cancel",
      "/api/jobs/{jobId}/retry", "/api/jobs/{jobId}/artifacts",
      "/api/artifacts/{artifactId}/download", "/api/benchmark/results",
      "/api/digital/results", "/api/ppa/results", "/api/admin/users",
      "/api/admin/tools", "/api/admin/tools/{id}/probe", "/api/admin/jobs",
      "/api/admin/results", "/api/admin/technologies", "/api/admin/audit",
    ]));
    const audit = await app.inject({ method: "GET", url: "/api/admin/audit", headers: { cookie: admin.cookie } });
    expect(audit.json().data.map((entry: { action: string }) => entry.action)).toEqual(expect.arrayContaining(["auth.login", "tool.create", "tool.probe", "result.lifecycle"]));
  }, 20_000);
});
