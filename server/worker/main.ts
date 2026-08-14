import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";
import { makeRepositories } from "../app/db/repositories.ts";
import { ModuleRegistry } from "../app/modules/registry.ts";
import { StorageService } from "../app/storage/storage.ts";
import { WorkerSupervisor } from "./index.ts";

const config = loadConfig();
if (process.env.NODE_ENV === "production" && typeof process.getuid === "function" && process.getuid() === 0) throw new Error("the production EDA worker must not run as root");
const database = new EdaDatabase(config.databasePath); database.migrate(); const repositories = makeRepositories(database);
const storage = new StorageService(config.storageRoot); await storage.initialize();
// Module packages register their adapters during mainline integration. An empty registry safely fails queued jobs as not configured.
const registry = new ModuleRegistry(); const supervisor = new WorkerSupervisor(repositories, registry, storage, config.queueConcurrency, config.cancelGraceMs); supervisor.start();
async function shutdown(): Promise<void> { await supervisor.stop(); database.close(); process.exit(0); }
process.once("SIGINT", () => void shutdown()); process.once("SIGTERM", () => void shutdown());
