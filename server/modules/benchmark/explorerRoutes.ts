import path from "node:path";
import type { FastifyInstance } from "fastify";
import { allowPublicRunner } from "../../app/auth/guards.ts";
import type { Repositories } from "../../app/db/repositories.ts";
import type { StorageService } from "../../app/storage/storage.ts";
import { ApiError } from "../../app/api/errors.ts";
import { BenchmarkExplorer } from "./explorer.ts";

export function registerBenchmarkExplorerRoutes(app: FastifyInstance, repositories: Repositories, storage: StorageService, legacyRoot = path.resolve(process.cwd(), "data/spice-model-benchmark")): void {
  const explorer = new BenchmarkExplorer(repositories, storage, legacyRoot);
  const access = { preHandler: [allowPublicRunner(repositories)] };
  app.get("/api/benchmark/explorer/available-runs.json", access, async (request, reply) => {
    reply.header("Cache-Control", "private, no-store").header("Vary", "Cookie");
    return explorer.availableRuns(request.edaUser?.id ?? null, request.edaUser?.role === "admin");
  });
  app.get("/api/benchmark/explorer/:runKey/:simulator/*", access, async (request, reply) => {
    const params = request.params as { runKey: string; simulator: string; "*": string };
    const artifact = await explorer.file(params.runKey, params.simulator, params["*"], request.edaUser?.id ?? null, request.edaUser?.role === "admin");
    if (!artifact) throw new ApiError(404, "NOT_FOUND", "completed Benchmark artifact not found");
    reply.header("Cache-Control", "private, no-store").header("Vary", "Cookie").type(artifact.mediaType);
    return artifact.content;
  });
}
