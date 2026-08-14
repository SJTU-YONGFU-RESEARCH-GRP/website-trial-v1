import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import { createBenchmarkModule } from "../../server/modules/benchmark/index.ts";
import digitalModuleAdapter from "../../server/modules/digital/index.ts";
import ppaModuleAdapter from "../../server/modules/ppa/index.ts";

if (process.env.NODE_ENV !== "test") throw new Error("the E2E fixture server is test-only");

const storageRoot = process.env.EDA_E2E_STORAGE_ROOT || await fs.mkdtemp(path.join(os.tmpdir(), "eda-playwright-"));
process.env.EDA_STORAGE_ROOT = storageRoot;
process.env.EDA_DATABASE_PATH = path.join(storageRoot, "eda.sqlite");
process.env.EDA_COOKIE_SECURE = "false";
process.env.EDA_CANCEL_GRACE_MS = "100";
process.env.EDA_BENCHMARK_CONCURRENCY = "1";
process.env.EDA_DIGITAL_CONCURRENCY = "1";
process.env.EDA_PPA_CONCURRENCY = "1";

const registry = new ModuleRegistry();
registry.register(createBenchmarkModule());
registry.register(digitalModuleAdapter);
registry.register(ppaModuleAdapter);
const config = loadConfig();
const app = await createEdaApp({ config, registry, startWorkers: true, serveFrontend: true, logger: false });

const adminPassword = process.env.EDA_E2E_ADMIN_PASSWORD;
const userPassword = process.env.EDA_E2E_USER_PASSWORD;
if (!adminPassword || !userPassword) throw new Error("E2E passwords must be provided by the test runner environment");
app.eda.repositories.users.create({ username: "e2e-admin", password: adminPassword, role: "admin", maxConcurrentJobs: 8 });
app.eda.repositories.users.create({ username: "e2e-user", password: userPassword, role: "user", maxConcurrentJobs: 8 });

const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "e2e-admin", password: adminPassword } });
if (login.statusCode !== 200) throw new Error(`E2E admin login failed: ${login.body}`);
const loginBody = login.json().data;
const cookieHeader = login.headers["set-cookie"];
const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(";")[0];
if (!cookie) throw new Error("E2E admin login did not establish a cookie");

const fixture = path.resolve("test/fixtures/fake-tools/fake-eda-tool.mjs");
async function configure(toolId: string, moduleId: "digital" | "ppa", fakeKind: string, adapterId: string): Promise<void> {
  const created = await app.inject({
    method: "POST",
    url: "/api/admin/tools",
    headers: { cookie, "x-csrf-token": loginBody.csrfToken },
    payload: {
      toolId, moduleId, enabled: true, rootPath: path.dirname(fixture), executablePath: fixture,
      interpreterPath: null, entryPoint: null, workingDirectory: null, timeoutSeconds: 5, maxConcurrency: 1,
      environmentNames: ["FAKE_EDA_TOOL", "FAKE_EDA_MODE"], environment: { FAKE_EDA_TOOL: fakeKind, FAKE_EDA_MODE: "success" },
      versionProbeArgv: ["--version"], adapterId, adapterVersion: "1.0.0",
    },
  });
  if (created.statusCode !== 201) throw new Error(`E2E tool setup failed: ${created.body}`);
  const probe = await app.inject({ method: "POST", url: `/api/admin/tools/${created.json().data.id}/probe`, headers: { cookie, "x-csrf-token": loginBody.csrfToken } });
  if (probe.statusCode !== 200 || probe.json().data.status !== "healthy") throw new Error(`E2E tool probe failed: ${probe.body}`);
}

await configure("yosys", "digital", "yosys", "digital-yosys-opensta-v1");
await configure("opensta", "digital", "opensta", "digital-yosys-opensta-v1");
await configure("ppa-result-parser", "ppa", "ppa-result-parser", "ppa-result-parser-v1");

await app.listen({ host: config.host, port: config.port });

async function makeWritable(directory: string): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  await fs.chmod(directory, 0o750).catch(() => undefined);
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) await makeWritable(candidate);
    else await fs.chmod(candidate, 0o640).catch(() => undefined);
  }
}

async function shutdown(): Promise<void> {
  await app.close();
  if (!process.env.EDA_E2E_STORAGE_ROOT) {
    await makeWritable(storageRoot);
    await fs.rm(storageRoot, { recursive: true, force: true });
  }
  process.exit(0);
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
