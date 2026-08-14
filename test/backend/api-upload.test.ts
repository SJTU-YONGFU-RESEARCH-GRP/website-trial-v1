import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fsp.rm(root, { recursive: true, force: true }))); });

function multipart(boundary: string, fileField: string, filename: string, content: string): Buffer {
  return Buffer.from([
    `--${boundary}\r\nContent-Disposition: form-data; name="operation"\r\n\r\nrun\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="workflow"\r\n\r\nyosys\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n${content}\r\n`,
    `--${boundary}--\r\n`,
  ].join(""));
}

describe("Fastify auth and multipart draft API", () => {
  it("requires CSRF, streams folder paths, hashes inputs, and protects owner data", async () => {
    const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-api-test-")); roots.push(storageRoot);
    const app = await createEdaApp({ config: loadConfig({ NODE_ENV: "test", EDA_STORAGE_ROOT: storageRoot }), startWorkers: false, serveFrontend: false, logger: false });
    app.eda.repositories.users.create({ username: "api-user", password: "correct horse battery staple" });
    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "api-user", password: "correct horse battery staple" } });
    expect(login.statusCode).toBe(200); const auth = login.json().data; const setCookie = login.headers["set-cookie"]!; const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0]!;
    const noCsrf = await app.inject({ method: "POST", url: "/api/modules/digital/drafts", headers: { cookie } }); expect(noCsrf.statusCode).toBe(403);
    const relative = "rtl/core/top.v"; const field = `file:${Buffer.from(relative).toString("base64url")}`; const boundary = "eda-test-boundary"; const source = "module top; endmodule\n";
    const upload = await app.inject({ method: "POST", url: "/api/modules/digital/drafts", headers: { cookie, "x-csrf-token": auth.csrfToken, "content-type": `multipart/form-data; boundary=${boundary}` }, payload: multipart(boundary, field, "top.v", source) });
    expect(upload.statusCode, upload.body).toBe(201); const job = upload.json().data.job;
    expect(job.inputManifest.files[0].relativePath).toBe(relative); expect(job.inputManifest.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await fsp.readFile(path.join(storageRoot, job.workspaceRelativePath, "input", "rtl/core/top.v"), "utf8")).toBe(source);
    const anonymous = await app.inject({ method: "GET", url: `/api/jobs/${job.id}` }); expect(anonymous.statusCode).toBe(401);
    const owner = await app.inject({ method: "GET", url: `/api/jobs/${job.id}`, headers: { cookie } }); expect(owner.statusCode).toBe(200);
    await app.close();
  });

  it("rejects parent path and duplicate normalized multipart file names", async () => {
    const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "eda-api-bad-")); roots.push(storageRoot);
    const app = await createEdaApp({ config: loadConfig({ NODE_ENV: "test", EDA_STORAGE_ROOT: storageRoot }), startWorkers: false, serveFrontend: false, logger: false });
    app.eda.repositories.users.create({ username: "bad-path-user", password: "correct horse battery staple" });
    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "bad-path-user", password: "correct horse battery staple" } }); const auth = login.json().data; const setCookie = login.headers["set-cookie"]!; const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0]!;
    const boundary = "bad-path-boundary"; const field = `file:${Buffer.from("../escape.v").toString("base64url")}`;
    const upload = await app.inject({ method: "POST", url: "/api/modules/digital/drafts", headers: { cookie, "x-csrf-token": auth.csrfToken, "content-type": `multipart/form-data; boundary=${boundary}` }, payload: multipart(boundary, field, "escape.v", "module x;endmodule") });
    expect(upload.statusCode).toBe(400); expect(upload.json().error.code).toBe("REQUEST_INVALID"); await app.close();
  });
});
