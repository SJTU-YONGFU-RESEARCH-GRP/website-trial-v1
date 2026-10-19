import { afterEach, describe, expect, it, vi } from "vitest";
import { acgResultArchiveUrl, createAcgDraft, getAcgCapabilities, getAcgResultArtifacts, getAcgResearchSources, listAcgResults, preflightAcgDraft, startAcgJob } from "../../../src/api/acg/client";
import { setApiCsrfToken } from "../../../src/api/client";
function response(data: unknown): Response { return new Response(JSON.stringify({ schemaVersion: "eda.api.v1", data }), { status: 200, headers: { "Content-Type": "application/json" } }); }
afterEach(() => { vi.unstubAllGlobals(); setApiCsrfToken(null); });
describe("ACG authenticated frontend API", () => {
  it("uses real capability/history routes and CSRF protected immutable job actions", async () => {
    const fetch = vi.fn().mockImplementation(async () => response({ id: "job" }));
    vi.stubGlobal("fetch", fetch); setApiCsrfToken("token");
    await getAcgCapabilities(); await listAcgResults();
    const patch = { fileRoles: { "cells.sp": "netlist" as const }, parameters: { engine: "mr", mode: "placement", configOverrides: { NUM_ROW: 3 } } };
    await preflightAcgDraft("job/id", patch); await startAcgJob("job/id");
    expect(fetch.mock.calls.map((call) => call[0])).toEqual(["/api/modules/acg/capabilities", "/api/acg/results?limit=200", "/api/jobs/job%2Fid/draft", "/api/jobs/job%2Fid/start"]);
    expect(fetch.mock.calls[2][1].method).toBe("PATCH");
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual(patch);
    expect(fetch.mock.calls[3][1].method).toBe("POST");
    expect((fetch.mock.calls[3][1].headers as Headers).get("X-CSRF-Token")).toBe("token");
    expect(fetch.mock.calls[3][1].credentials).toBe("include");
  });
  it("uses result authorization for published layout metadata and archives", async () => {
    const fetch = vi.fn().mockResolvedValue(response([{ id: "artifact" }])); vi.stubGlobal("fetch", fetch);
    await expect(getAcgResultArtifacts("published/result")).resolves.toEqual([{ id: "artifact" }]);
    expect(fetch.mock.calls[0][0]).toBe("/api/results/acg/published%2Fresult/artifacts");
    expect(acgResultArchiveUrl("published/result")).toBe("/api/results/acg/published%2Fresult/artifacts.zip");
  });
  it("uploads Unicode folder paths and reports real multipart progress", async () => {
    const calls: Record<string, unknown> = {};
    class UploadRequest {
      withCredentials = false;
      status = 200;
      responseText = JSON.stringify({ schemaVersion: "eda.api.v1", data: { job: { id: "draft" } } });
      upload = { addEventListener: (_name: string, listener: (event: unknown) => void) => { calls.progress = listener; } };
      open(method: string, url: string) { calls.method = method; calls.url = url; }
      setRequestHeader(name: string, value: string) { calls[name] = value; }
      addEventListener(name: string, listener: () => void) { calls[name] = listener; }
      send(form: FormData) { calls.form = form; calls.credentials = this.withCredentials; (calls.progress as (event: unknown) => void)({ loaded: 5, total: 10, lengthComputable: true }); (calls.load as () => void)(); }
    }
    vi.stubGlobal("XMLHttpRequest", UploadRequest); setApiCsrfToken("token");
    const progress = vi.fn(); const file = new Blob([".SUBCKT INV A Y VDD VSS"]) as File; Object.defineProperty(file, "name", { value: "cells.sp" });
    await createAcgDraft([{ file, relativePath: "项目/cells.sp" }], progress);
    expect(calls.url).toBe("/api/modules/acg/drafts");
    expect(calls.credentials).toBe(true); expect(calls["X-CSRF-Token"]).toBe("token");
    const form = calls.form as FormData;
    expect(form.get("workflow")).toBe("autocellgen"); expect(form.get("operation")).toBe("run");
    const key = [...form.keys()].find((name) => name.startsWith("file:"))!;
    expect(Buffer.from(key.slice(5), "base64url").toString("utf8")).toBe("项目/cells.sp");
    expect(progress).toHaveBeenCalledWith(5, 10);
  });
  it("surfaces actionable backend preflight failures instead of creating a ready result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "INVALID_CONFIG", message: "DR mode does not support this rules file" } }), { status: 422 })));
    await expect(preflightAcgDraft("job", { fileRoles: {}, parameters: {} })).rejects.toThrow("DR mode does not support this rules file");
  });
});

describe("ACG research multipart operations", () => {
  it.each(["unified", "algorithm-matrix", "algorithm-report", "known-feasible"] as const)("serializes %s without changing the workflow contract", async operation => {
    let submitted: FormData | undefined;
    class Request {
      status = 200; withCredentials = false;
      responseText = JSON.stringify({ data: { job: { id: "research" } } });
      upload = { addEventListener() {} };
      listeners: Record<string, () => void> = {};
      open() {} setRequestHeader() {}
      addEventListener(name: string, listener: () => void) { this.listeners[name] = listener; }
      send(form: FormData) { submitted = form; this.listeners.load(); }
    }
    vi.stubGlobal("XMLHttpRequest", Request);
    await createAcgDraft([], () => {}, operation);
    expect(submitted?.get("operation")).toBe(operation);
    expect(submitted?.get("workflow")).toBe("autocellgen");
  });
});

it("resolves execution ownership through the dedicated owner-filtered endpoint without session identity", async () => {
  const fetch = vi.fn().mockResolvedValue(response({ ownerId: "effective-public-runner", results: [] })); vi.stubGlobal("fetch", fetch);
  await expect(getAcgResearchSources()).resolves.toEqual({ ownerId: "effective-public-runner", results: [] });
  expect(fetch.mock.calls[0][0]).toBe("/api/modules/acg/research-sources");
  expect(fetch.mock.calls[0][1].credentials).toBe("include");
});
