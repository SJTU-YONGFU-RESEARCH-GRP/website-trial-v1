import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import staticFiles from "@fastify/static";
import { API_SCHEMA_VERSION } from "../../shared/contracts/v1.ts";
import { loadConfig, type ServerConfig } from "./config.ts";
import { EdaDatabase } from "./db/database.ts";
import { makeRepositories } from "./db/repositories.ts";
import { ModuleRegistry } from "./modules/registry.ts";
import { StorageService } from "./storage/storage.ts";
import { installAuthResolution } from "./auth/guards.ts";
import { SafeProcessRunner } from "./process/safeProcess.ts";
import { ToolHealthService } from "./tools/health.ts";
import { WorkerSupervisor } from "../worker/index.ts";
import { ApiError } from "./api/errors.ts";
import { registerAuthRoutes } from "./api/authRoutes.ts";
import { registerModuleRoutes } from "./api/moduleRoutes.ts";
import { registerJobRoutes } from "./api/jobRoutes.ts";
import { registerResultRoutes } from "./api/resultRoutes.ts";
import { registerAdminRoutes } from "./api/adminRoutes.ts";
import { success } from "./api/http.ts";

export interface EdaAppOptions { config?: ServerConfig; registry?: ModuleRegistry; database?: EdaDatabase; startWorkers?: boolean; serveFrontend?: boolean; logger?: boolean; }

export async function createEdaApp(options: EdaAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config || loadConfig();
  if (process.env.NODE_ENV === "production" && typeof process.getuid === "function" && process.getuid() === 0) throw new Error("the production EDA backend must not run as root");
  const app = Fastify({ logger: options.logger ?? true, requestIdHeader: "x-request-id", genReqId: () => randomUUID(), bodyLimit: 1_048_576 });
  const database = options.database || new EdaDatabase(config.databasePath); database.migrate();
  const repositories = makeRepositories(database); const storage = new StorageService(config.storageRoot); await storage.initialize();
  const registry = options.registry || new ModuleRegistry(); const runner = new SafeProcessRunner(config.cancelGraceMs);
  const probeRoot = storage.resolve("work-probes"); await fs.promises.mkdir(probeRoot, { recursive: true, mode: 0o750 });
  const health = new ToolHealthService(repositories.tools, runner, probeRoot);
  const workers = options.startWorkers ? new WorkerSupervisor(repositories, registry, storage, config.queueConcurrency, config.cancelGraceMs) : null;

  app.decorate("eda", { config, database, repositories, storage, registry, workers });
  app.decorateRequest("edaUser", null); app.decorateRequest("edaSessionId", null); app.decorateRequest("edaCsrfHash", null);
  await app.register(cookie);
  await app.register(multipart, { limits: { files: config.upload.maxFiles, fileSize: config.upload.maxFileBytes, fieldNameSize: 2048, fields: 32, parts: config.upload.maxFiles + 32 }, throwFileSizeLimit: true });
  await app.register(swagger, { openapi: { info: { title: "EDA Compute Platform API", version: "1.0.0", description: "Persistent Benchmark, Digital and PPA computation API" }, tags: ["auth", "modules", "drafts", "jobs", "artifacts", "results", "admin"].map((name) => ({ name })) } });
  await app.register(swaggerUi, { routePrefix: "/api/docs" });
  app.addHook("onRequest", installAuthResolution(repositories, config.cookieName));
  app.addHook("onSend", async (_request, reply, payload) => { reply.header("X-Content-Type-Options", "nosniff").header("Referrer-Policy", "same-origin").header("X-Frame-Options", "DENY"); return payload; });
  app.setErrorHandler((error, request, reply) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    const apiError = normalized instanceof ApiError ? normalized : null; const status = apiError?.statusCode || ("statusCode" in normalized && typeof normalized.statusCode === "number" ? normalized.statusCode : 500);
    if (status >= 500) request.log.error(error);
    reply.status(status).send({ schemaVersion: API_SCHEMA_VERSION, error: { code: apiError?.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_INVALID"), message: status === 500 ? "internal server error" : normalized.message, details: apiError?.details || null, requestId: request.id } });
  });

  app.get("/api/health", { schema: { tags: ["modules"] } }, async () => success({ status: "healthy", database: "sqlite", queues: ["benchmark", "digital", "ppa"] }));
  registerAuthRoutes(app, repositories, config); registerModuleRoutes(app, repositories, registry, storage, config); registerJobRoutes(app, repositories, storage, workers); registerResultRoutes(app, repositories); registerAdminRoutes(app, repositories, health);

  const frontendRoot = path.resolve(process.cwd(), "dist");
  if (options.serveFrontend !== false && fs.existsSync(frontendRoot)) {
    await app.register(staticFiles, { root: frontendRoot, wildcard: false });
    app.setNotFoundHandler(async (request, reply) => { if (request.method === "GET" && !request.url.startsWith("/api/")) return reply.type("text/html").sendFile("index.html"); return reply.status(404).send({ schemaVersion: API_SCHEMA_VERSION, error: { code: "NOT_FOUND", message: "route not found", details: null, requestId: request.id } }); });
  }
  app.addHook("onClose", async () => { await workers?.stop(); database.close(); }); workers?.start();
  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    eda: {
      config: ServerConfig; database: EdaDatabase; repositories: ReturnType<typeof makeRepositories>;
      storage: StorageService; registry: ModuleRegistry; workers: WorkerSupervisor | null;
    };
  }
}
