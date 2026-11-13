import path from "node:path";
import fsp from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";
import { makeRepositories } from "../app/db/repositories.ts";
import { TOOL_CATALOG_BY_ID } from "../../shared/toolCatalog.ts";
import type { ToolConfigurationV1 } from "../../shared/contracts/v1.ts";
import { SafeProcessRunner } from "../app/process/safeProcess.ts";
import { ToolHealthService } from "../app/tools/health.ts";

const args = process.argv.slice(2);
const usage = "tools:acg:init [--root AUTOCELLGEN_ROOT] [--python PYTHON] [--pdk-root GF180_PDK] [--probe] [--self-test]\nUses EDA_DATABASE_PATH/EDA_STORAGE_ROOT; registers three native engines, renderer, MR replay preparation, research LVS1, README research workflows and PV.\n";
if (args.includes("--help")) { process.stdout.write(usage); process.exit(0); }
for (let i = 0; i < args.length; i++) {
  if (["--probe", "--self-test"].includes(args[i]!)) continue;
  if (["--root", "--python", "--pdk-root"].includes(args[i]!) && args[i + 1] && !args[i + 1]!.startsWith("--")) { i++; continue; }
  throw new Error("Unknown or incomplete argument: " + args[i] + "\n" + usage);
}
const option = (name: string, fallback: string) => args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const root = path.resolve(option("--root", "/home/duhaochen/AutoCellGen_TY"));
const python = path.resolve(option("--python", "/home/duhaochen/.local/share/autocellgen/venv/bin/python"));
const pdkRoot = path.resolve(option("--pdk-root", "/home/duhaochen/rtl2gds-copilot-orchestrator/pdk/ciel/gf180mcu/versions/0fe599b2afb6708d281543108caf8310912f54af/gf180mcuA"));
const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = loadConfig();
type Definition = Omit<ToolConfigurationV1, "id" | "revision" | "createdAt" | "updatedAt" | "capturedAt">;
const definitions: Definition[] = [];
function define(toolId: string, executablePath: string | null, interpreterPath: string | null, entryPoint: string | null, rootPath: string, environment: Record<string, string>): Definition {
  const catalog = TOOL_CATALOG_BY_ID[toolId]!;
  return { toolId, moduleId: "acg", adapterId: catalog.adapterId, adapterVersion: catalog.adapterVersion, enabled: true,
    executablePath, interpreterPath, entryPoint, rootPath, workingDirectory: null, timeoutSeconds: 1800, maxConcurrency: 1,
    environment, environmentNames: [...catalog.allowedEnvironmentNames], versionProbeArgv: [...catalog.versionProbeArgv] };
}
const nativePath = path.dirname(python) + ":/usr/bin:/bin";
for (const [engine, project] of [["cmos", "cmos"], ["dr", "DR"], ["mr", "MR"]] as const)
  definitions.push(define("acg-" + engine, path.join(root, "proj", "autocellgen-" + project, "build/bin/autocell"), null, null, root,
    { PATH: nativePath, LD_LIBRARY_PATH: path.join(root, "tools/z3/build/install/usr/local/lib") }));
definitions.push(define("acg-renderer", null, python, path.join(website, "scripts/acg/render.py"), website, { PATH: nativePath }));
definitions.push({...define("acg-replay", null, python, path.join(website, "scripts/acg/prepare_replay.py"), website, { PATH: nativePath }), timeoutSeconds: 60});
definitions.push({...define("acg-lvs1", null, python, path.join(website, "scripts/acg/research_lvs1.py"), path.join(root, "proj/autocellgen-MR"), { PATH: nativePath }), timeoutSeconds: 300});
definitions.push({...define("acg-research", null, python, path.join(website, "scripts/acg/research_workflow.py"), root, { PATH: nativePath, LD_LIBRARY_PATH: path.join(root, "tools/z3/build/install/usr/local/lib") }), timeoutSeconds: 86400});
definitions.push(define("acg-pv", null, python, path.join(website, "scripts/acg/pv.py"), path.join(root, "proj/autocellgen-MR"), { PATH: nativePath, AUTOCELLGEN_PV_GF180_ROOT: pdkRoot }));
// Validate every configured path before writing any configuration revision.
for (const definition of definitions) {
  for (const filename of [definition.executablePath, definition.interpreterPath, definition.entryPoint])
    if (filename) { const stat = await fsp.stat(filename); if (!stat.isFile()) throw new Error("Tool path is not a regular file: " + filename); }
  if (!(await fsp.stat(definition.rootPath!)).isDirectory()) throw new Error("Tool root is not a directory");
}
if (!(await fsp.stat(pdkRoot)).isDirectory()) throw new Error("GF180 PDK root is not a directory");
const database = new EdaDatabase(config.databasePath);
try {
  const jobsExist = database.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='jobs'").get();
  if (jobsExist && Number(database.sqlite.prepare("SELECT COUNT(*) count FROM jobs WHERE status IN ('running','queued','validating')").get()?.count)) throw new Error("Wait for active jobs before initializing tool configurations");
  database.migrate();
  const repositories = makeRepositories(database);
  const tools = database.transaction(() => definitions.map((definition) => {
    const existing = repositories.tools.list("acg").find((item) => item.toolId === definition.toolId);
    const identical = existing && Object.entries(definition).every(([key, value]) => JSON.stringify(existing[key as keyof ToolConfigurationV1]) === JSON.stringify(value));
    return identical ? existing : repositories.tools.save(definition);
  }));
  process.stdout.write(JSON.stringify({ database: config.databasePath, configurations: tools.map((tool) => ({ toolId: tool.toolId, id: tool.id, revision: tool.revision })) }) + "\n");
  if (args.includes("--probe") || args.includes("--self-test")) {
    const probes = path.join(config.storageRoot, ".tool-probes"); await fsp.mkdir(probes, { recursive: true, mode: 0o700 });
    const health = new ToolHealthService(repositories.tools, new SafeProcessRunner(), probes);
    let failed = false;
    for (const operation of ["--probe", "--self-test"].filter((flag) => args.includes(flag))) for (const tool of tools) {
      const result = operation === "--self-test" ? await health.selfTest(tool) : await health.probe(tool);
      process.stdout.write(JSON.stringify({ toolId: tool.toolId, status: result.status, selfTestPassed: result.selfTestPassed, message: result.message }) + "\n");
      if (result.status !== "healthy") failed = true;
    }
    if (failed) process.exitCode = 1;
  }
} finally { database.close(); }
