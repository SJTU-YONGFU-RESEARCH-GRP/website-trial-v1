import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";
import { makeRepositories } from "../app/db/repositories.ts";
import { SafeProcessRunner } from "../app/process/safeProcess.ts";
import { ToolHealthService } from "../app/tools/health.ts";
import { TOOL_CATALOG_BY_ID } from "../../shared/toolCatalog.ts";
import type { ToolConfigurationV1 } from "../../shared/contracts/v1.ts";

const args = process.argv.slice(2);
const usage = "ppa-characterization-configure [--root LIBCHARX_ROOT] [--python PYTHON] [--ngspice NGSPICE] [--gds-python PYTHON] [--probe] [--self-test]\nUses EDA_DATABASE_PATH/EDA_STORAGE_ROOT; registers only the LibCharX PPA adapter.\n";
if (args.includes("--help")) { process.stdout.write(usage); process.exit(0); }
for (let i = 0; i < args.length; i++) {
  if (["--probe", "--self-test"].includes(args[i]!)) continue;
  if (["--root", "--python", "--ngspice", "--gds-python"].includes(args[i]!) && args[i+1] && !args[i+1]!.startsWith("--")) { i++; continue; }
  throw new Error("Unknown or incomplete argument: " + args[i] + "\n" + usage);
}
const option = (key: string, fallback: string): string => path.resolve(args.includes(key) ? args[args.indexOf(key)+1]! : fallback);
const nativeRoot = option("--root", "/home/duhaochen/LibCharX");
const python = option("--python", path.join(nativeRoot, ".venv/bin/python"));
const ngspice = option("--ngspice", "/usr/local/bin/ngspice");
const gdsPython = option("--gds-python", "/home/duhaochen/.local/share/autocellgen/venv/bin/python");
const website = path.resolve(import.meta.dirname, "../..");
const entryPoint = path.join(website, "scripts/ppa/characterize.py");
for (const filename of [python, ngspice, gdsPython, entryPoint]) if (!(await fs.stat(filename)).isFile()) throw new Error("Expected regular file: " + filename);
if (!(await fs.stat(nativeRoot)).isDirectory()) throw new Error("LibCharX root must be a directory");
const catalog = TOOL_CATALOG_BY_ID.libcharx!;
const definition: Omit<ToolConfigurationV1, "id" | "revision" | "createdAt" | "updatedAt" | "capturedAt"> = {
  toolId: "libcharx", moduleId: "ppa", adapterId: catalog.adapterId, adapterVersion: catalog.adapterVersion, enabled: true,
  executablePath: null, interpreterPath: python, entryPoint, rootPath: website, workingDirectory: null,
  timeoutSeconds: 1800, maxConcurrency: 1, versionProbeArgv: [...catalog.versionProbeArgv], environmentNames: [...catalog.allowedEnvironmentNames],
  environment: { PATH: path.dirname(python)+":"+path.dirname(ngspice)+":/usr/bin:/bin", LIBCHARX_ROOT: nativeRoot, LIBCHARX_NGSPICE: ngspice, LIBCHARX_GDS_PYTHON: gdsPython },
};
const config = loadConfig();
const database = new EdaDatabase(config.databasePath);
try {
  const exists = database.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='jobs'").get();
  if (exists && Number(database.sqlite.prepare("SELECT COUNT(*) count FROM jobs WHERE status IN ('running','queued','validating')").get()?.count)) throw new Error("Wait for active jobs before changing tool configuration");
  database.migrate();
  const repositories = makeRepositories(database);
  const existing = repositories.tools.active("ppa").find(tool => tool.toolId === "libcharx");
  const identical = existing && Object.entries(definition).every(([key, value]) => JSON.stringify(existing[key as keyof ToolConfigurationV1]) === JSON.stringify(value));
  const tool = identical ? existing : repositories.tools.save(definition);
  process.stdout.write(JSON.stringify({ toolId: tool.toolId, id: tool.id, revision: tool.revision, changed: !identical })+"\n");
  if (args.includes("--probe") || args.includes("--self-test")) {
    const probeRoot = path.join(config.storageRoot, ".tool-probes"); await fs.mkdir(probeRoot, { recursive: true, mode: 0o700 });
    const health = new ToolHealthService(repositories.tools, new SafeProcessRunner(), probeRoot);
    for (const action of ["--probe", "--self-test"].filter(flag => args.includes(flag))) {
      const result = action === "--probe" ? await health.probe(tool) : await health.selfTest(tool);
      process.stdout.write(JSON.stringify({ toolId: tool.toolId, status: result.status, selfTestPassed: result.selfTestPassed, message: result.message })+"\n");
      if (result.status !== "healthy") process.exitCode = 1;
    }
  }
} finally { database.close(); }
