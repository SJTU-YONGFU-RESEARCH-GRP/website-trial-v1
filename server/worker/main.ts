import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";
import { makeRepositories } from "../app/db/repositories.ts";
import { createDefaultModuleRegistry } from "../app/modules/defaultRegistry.ts";
import { StorageService } from "../app/storage/storage.ts";
import { WorkerSupervisor } from "./index.ts";

const config = loadConfig();
if (process.env.NODE_ENV === "production" && typeof process.getuid === "function" && process.getuid() === 0) throw new Error("the production EDA worker must not run as root");
const database = new EdaDatabase(config.databasePath); database.migrate(); const repositories = makeRepositories(database);
const storage = new StorageService(config.storageRoot); await storage.initialize();
const reconciled = await storage.reconcilePublications(Object.fromEntries(
  (["benchmark", "digital", "ppa"] as const).map((moduleId) => [moduleId, new Set(repositories.results.allIds(moduleId))]),
) as Record<"benchmark" | "digital" | "ppa", Set<string>>);
if (reconciled.stagingRemoved || reconciled.orphanResultsRemoved) {
  process.stderr.write(`[eda-worker] recovered publication storage: ${reconciled.stagingRemoved} staging, ${reconciled.orphanResultsRemoved} orphan result(s) removed\n`);
}
const registry = createDefaultModuleRegistry(); const supervisor = new WorkerSupervisor(repositories, registry, storage, config.queueConcurrency, config.cancelGraceMs, config.maxLogBytes); supervisor.start();
async function shutdown(): Promise<void> { await supervisor.stop(); database.close(); process.exit(0); }
process.once("SIGINT", () => void shutdown()); process.once("SIGTERM", () => void shutdown());
