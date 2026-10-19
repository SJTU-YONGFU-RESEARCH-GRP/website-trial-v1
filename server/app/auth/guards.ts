import { MODULE_IDS } from "../../../shared/contracts/v1.ts";
import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRecordV1 } from "../../../shared/contracts/v1.ts";
import type { Repositories } from "../db/repositories.ts";
import { ApiError } from "../api/errors.ts";

export const PUBLIC_RUNNER_USERNAME = "public-runner";

declare module "fastify" {
  interface FastifyRequest { edaUser: UserRecordV1 | null; edaSessionId: string | null; edaCsrfHash: string | null; }
}

export function installAuthResolution(repositories: Repositories, cookieName: string) {
  return async function resolveAuth(request: FastifyRequest): Promise<void> {
    const session = repositories.sessions.resolve(request.cookies[cookieName]);
    request.edaUser = session?.user || null; request.edaSessionId = session?.sessionId || null; request.edaCsrfHash = session?.csrfTokenHash || null;
  };
}

export async function requireUser(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.edaUser) throw new ApiError(401, "AUTH_REQUIRED", "authentication is required");
}

function publicRunner(repositories: Repositories): UserRecordV1 {
  const existing = repositories.users.findByUsername(PUBLIC_RUNNER_USERNAME);
  if (existing) {
    if (!existing.enabled || existing.deletedAt) throw new ApiError(503, "PUBLIC_RUNNER_DISABLED", "anonymous EDA execution is disabled");
    const { passwordHash: _passwordHash, ...user } = existing;
    return user;
  }
  return repositories.users.create({
    username: PUBLIC_RUNNER_USERNAME,
    password: randomBytes(32).toString("base64url"),
    role: "user",
    allowedModules: [...MODULE_IDS],
    maxConcurrentJobs: 3,
    storageQuotaBytes: 100 * 1024 * 1024 * 1024,
  });
}

export function allowPublicRunner(repositories: Repositories) {
  return async function resolvePublicRunner(request: FastifyRequest): Promise<void> {
    if (!request.edaUser) request.edaUser = publicRunner(repositories);
  };
}

export function csrfGuardOrPublicRunner(repositories: Repositories) {
  const verifySessionCsrf = csrfGuard(repositories);
  return async function verifyCsrfOrPublicRunner(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (request.edaUser?.username === PUBLIC_RUNNER_USERNAME && !request.edaSessionId) return;
    await verifySessionCsrf(request);
  };
}

export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.edaUser) throw new ApiError(401, "AUTH_REQUIRED", "authentication is required");
  if (request.edaUser.role !== "admin") throw new ApiError(403, "ADMIN_REQUIRED", "administrator access is required");
}

export function csrfGuard(repositories: Repositories) {
  return async function verifyCsrf(request: FastifyRequest): Promise<void> {
    if (!request.edaUser || !request.edaCsrfHash) throw new ApiError(401, "AUTH_REQUIRED", "authentication is required");
    const token = request.headers["x-csrf-token"];
    if (typeof token !== "string" || !repositories.sessions.verifyCsrf({ csrfTokenHash: request.edaCsrfHash }, token)) throw new ApiError(403, "CSRF_INVALID", "missing or invalid CSRF token");
  };
}

export function assertOwnerOrAdmin(request: FastifyRequest, ownerId: string): void {
  if (!request.edaUser) throw new ApiError(401, "AUTH_REQUIRED", "authentication is required");
  if (request.edaUser.role !== "admin" && request.edaUser.id !== ownerId) throw new ApiError(404, "NOT_FOUND", "resource not found");
}
