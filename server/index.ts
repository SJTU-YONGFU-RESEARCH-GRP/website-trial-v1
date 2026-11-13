import { createEdaApp } from "./app/app.ts";
import { loadConfig } from "./app/config.ts";
import { createDefaultModuleRegistry } from "./app/modules/defaultRegistry.ts";

const config = loadConfig();
const app = await createEdaApp({
  config,
  registry: createDefaultModuleRegistry(),
  startWorkers: process.env.EDA_EMBED_WORKER === "1",
  serveFrontend: true,
});
await app.listen({ host: config.host, port: config.port });

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "shutting down");
  await app.close(); process.exit(0);
}
process.once("SIGINT", () => void shutdown("SIGINT")); process.once("SIGTERM", () => void shutdown("SIGTERM"));
