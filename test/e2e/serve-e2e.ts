import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEdaApp } from "../../server/app/app.ts";
import { loadConfig } from "../../server/app/config.ts";
import { ModuleRegistry } from "../../server/app/modules/registry.ts";
import { createBenchmarkModule } from "../../server/modules/benchmark/index.ts";
import digitalModuleAdapter from "../../server/modules/digital/index.ts";
import ppaModuleAdapter from "../../server/modules/ppa/index.ts";
import { TOOL_CATALOG_BY_ID } from "../../shared/toolCatalog.ts";

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
process.stderr.write(`[e2e-server] storage ${storageRoot}\n`);
const app = await createEdaApp({ config, registry, startWorkers: true, serveFrontend: true, logger: false });
process.stderr.write("[e2e-server] app created\n");

const adminPassword = process.env.EDA_E2E_ADMIN_PASSWORD;
const userPassword = process.env.EDA_E2E_USER_PASSWORD;
if (!adminPassword || !userPassword) throw new Error("E2E passwords must be provided by the test runner environment");
app.eda.repositories.users.create({ username: "e2e-admin", password: adminPassword, role: "admin", maxConcurrentJobs: 8 });
app.eda.repositories.users.create({ username: "e2e-user", password: userPassword, role: "user", maxConcurrentJobs: 8 });
process.stderr.write("[e2e-server] users created\n");

const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "e2e-admin", password: adminPassword } });
if (login.statusCode !== 200) throw new Error(`E2E admin login failed: ${login.body}`);
const loginBody = login.json().data;
const cookieHeader = login.headers["set-cookie"];
const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(";")[0];
if (!cookie) throw new Error("E2E admin login did not establish a cookie");
process.stderr.write("[e2e-server] admin session created\n");

const fixture = path.resolve("test/fixtures/fake-tools/fake-eda-tool.mjs");
async function configure(toolId: string, moduleId: "benchmark" | "digital" | "ppa", fakeKind: string): Promise<void> {
  const catalog = TOOL_CATALOG_BY_ID[toolId];
  if (!catalog || catalog.moduleId !== moduleId) throw new Error(`E2E tool ${toolId} is absent from the audited catalog`);
  process.stderr.write(`[e2e-server] configuring ${toolId}\n`);
  const created = await app.inject({
    method: "POST",
    url: "/api/admin/tools",
    headers: { cookie, "x-csrf-token": loginBody.csrfToken },
    payload: {
      toolId, moduleId, enabled: true, rootPath: path.dirname(fixture), executablePath: fixture,
      interpreterPath: null, entryPoint: null, workingDirectory: null, timeoutSeconds: 5, maxConcurrency: 1,
      environmentNames: ["FAKE_EDA_TOOL", "FAKE_EDA_MODE"], environment: { FAKE_EDA_TOOL: fakeKind, FAKE_EDA_MODE: "success" },
      versionProbeArgv: [...catalog.versionProbeArgv], adapterId: catalog.adapterId, adapterVersion: catalog.adapterVersion,
    },
  });
  if (created.statusCode !== 201) throw new Error(`E2E tool setup failed: ${created.body}`);
  const probe = await app.inject({ method: "POST", url: `/api/admin/tools/${created.json().data.id}/probe`, headers: { cookie, "x-csrf-token": loginBody.csrfToken } });
  if (probe.statusCode !== 200 || probe.json().data.status !== "healthy") throw new Error(`E2E tool probe failed: ${probe.body}`);
  const selfTest = await app.inject({ method: "POST", url: `/api/admin/tools/${created.json().data.id}/self-test`, headers: { cookie, "x-csrf-token": loginBody.csrfToken } });
  if (selfTest.statusCode !== 200 || selfTest.json().data.selfTestPassed !== true) throw new Error(`E2E tool self-test failed: ${selfTest.body}`);
}

await configure("ngspice", "benchmark", "ngspice");
await configure("spice-benchmark", "benchmark", "spice-benchmark");
await configure("yosys", "digital", "yosys");
await configure("opensta", "digital", "opensta");
await configure("openroad-orfs", "ppa", "openroad-orfs");
await configure("ppa-result-parser", "ppa", "ppa-result-parser");

const technologyRoot = path.join(storageRoot, "registered-technology");
await fs.mkdir(technologyRoot, { recursive: true });
const libertyPath = path.join(technologyRoot, "e2e.lib");
const techLefPath = path.join(technologyRoot, "e2e-tech.lef");
const cellLefPath = path.join(technologyRoot, "e2e-cells.lef");
await fs.writeFile(libertyPath, "library(e2e) {\nleakage_power_unit : \"1nW\";\ncell(INVX1) {\narea : 1.25;\ncell_leakage_power : 2.0;\n}\n}\n");
await fs.writeFile(techLefPath, "VERSION 5.8 ;\nEND LIBRARY\n");
await fs.writeFile(cellLefPath, "VERSION 5.8 ;\nMACRO INVX1\n  CLASS CORE ;\nEND INVX1\nEND LIBRARY\n");
const technology = await app.inject({
  method: "POST",
  url: "/api/admin/technologies",
  headers: { cookie, "x-csrf-token": loginBody.csrfToken },
  payload: {
    technologyId: "e2e-nangate45",
    processNode: "45nm",
    pdk: "nangate45",
    standardCellLibrary: "NangateOpenCellLibrary",
    libertyPaths: [libertyPath],
    techLefPath,
    cellLefPaths: [cellLefPath],
    corner: "tt_1v10_25c",
    voltage: 1.1,
    rcCorner: "nominal",
    allowedAdapterIds: ["digital-yosys-opensta-v1", "ppa-openroad-orfs-v1"],
    enabled: true,
  },
});
if (technology.statusCode !== 201) throw new Error(`E2E technology setup failed: ${technology.body}`);

await app.listen({ host: config.host, port: config.port });
process.stderr.write(`[e2e-server] listening on ${config.host}:${config.port}\n`);

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
