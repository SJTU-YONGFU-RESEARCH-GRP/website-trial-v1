import { afterEach, describe, expect, it, vi } from "vitest";
import { checkToolPaths, runToolSelfTest, updateResultLifecycle } from "../../../src/api/admin/client";
import { cancelJob, cloneJob, cleanJobWorkspace } from "../../../src/api/jobs/client";
import { setApiCsrfToken } from "../../../src/api/client";

function response(data: unknown): Response {
  return new Response(JSON.stringify({ schemaVersion: "eda.api.v1", data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  setApiCsrfToken(null);
});

describe("authenticated administrator API client", () => {
  it("sends CSRF-protected, non-shell tool check actions to dedicated routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, executable: "/usr/bin/yosys", root: null, entryPoint: null, errors: [] }))
      .mockResolvedValueOnce(response({ id: "health", toolConfigurationId: "tool", status: "healthy", version: "1", checkedAt: "2026-01-01T00:00:00Z", durationMs: 1, message: "passed", missingDependencies: [], selfTestPassed: true }));
    vi.stubGlobal("fetch", fetchMock);
    setApiCsrfToken("csrf-value");

    await checkToolPaths("tool/id");
    await runToolSelfTest("tool/id");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/tools/tool%2Fid/check");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/tools/tool%2Fid/self-test");
    for (const call of fetchMock.mock.calls) {
      expect(call[1].method).toBe("POST");
      expect((call[1].headers as Headers).get("X-CSRF-Token")).toBe("csrf-value");
      expect(call[1].credentials).toBe("include");
    }
  });

  it("connects cancel, clone, cleanup, and result lifecycle controls to real mutations", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response({ id: "next-job", cleaned: true }));
    vi.stubGlobal("fetch", fetchMock);
    setApiCsrfToken("csrf-value");

    await cancelJob("job");
    await cloneJob("job");
    await cleanJobWorkspace("job");
    await updateResultLifecycle("ppa", "result", "published");

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "/api/jobs/job/cancel",
      "/api/jobs/job/clone",
      "/api/admin/jobs/job/cleanup",
      "/api/admin/results/ppa/result",
    ]);
    expect(fetchMock.mock.calls.every((call) => call[1].method === "POST" || call[1].method === "PATCH")).toBe(true);
  });
});
