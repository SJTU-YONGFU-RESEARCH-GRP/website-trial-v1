import type { FastifyInstance } from "fastify";
import type { ModuleId, ResultLifecycle } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../db/repositories.ts";
import { parseModuleId } from "../modules/registry.ts";
import { ApiError } from "./errors.ts";
import { sendList, success } from "./http.ts";

export function registerResultRoutes(app: FastifyInstance, repositories: Repositories): void {
  for (const moduleId of ["benchmark", "digital", "ppa"] as ModuleId[]) {
    app.get(`/api/${moduleId}/results`, { schema: { tags: ["results"] } }, async (request, reply) => {
      const query = request.query as { lifecycle?: ResultLifecycle; limit?: string; cursor?: string; search?: string; ownerId?: string; filters?: string };
      const viewer = request.edaUser;
      let filters: Record<string, Array<string | number | boolean | null>> | undefined;
      if (query.filters) {
        try {
          const parsed = JSON.parse(query.filters) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((value) => !Array.isArray(value))) throw new Error("filters must be an object of arrays");
          filters = parsed as Record<string, Array<string | number | boolean | null>>;
        } catch { throw new ApiError(400, "RESULT_FILTER_INVALID", "filters must be valid JSON object of value arrays"); }
      }
      const rows = repositories.results.query(moduleId, viewer?.id || null, viewer?.role === "admin", { lifecycle: query.lifecycle, limit: Number(query.limit || 100), cursor: query.cursor, search: query.search, ownerId: query.ownerId, filters });
      return sendList(reply, rows, rows.length ? rows.at(-1)!.updatedAt : null);
    });
  }
  app.get("/api/results/:module/:resultId", { schema: { tags: ["results"] } }, async (request) => {
    const params = request.params as { module?: string; resultId?: string }; const moduleId = parseModuleId(params.module);
    const result = repositories.results.get(moduleId, String(params.resultId || ""), request.edaUser?.id || null, request.edaUser?.role === "admin");
    if (!result) throw new ApiError(404, "NOT_FOUND", "result not found"); return success(result);
  });
}
