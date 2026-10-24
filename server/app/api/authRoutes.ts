import type { FastifyInstance } from "fastify";
import type { ServerConfig } from "../config.ts";
import type { Repositories } from "../db/repositories.ts";
import { ApiError } from "./errors.ts";
import { success } from "./http.ts";
import { csrfGuard, requireUser } from "../auth/guards.ts";

export function registerAuthRoutes(app: FastifyInstance, repositories: Repositories, config: ServerConfig): void {
  app.post("/api/auth/login", { schema: { tags: ["auth"], body: { type: "object", required: ["username", "password"], additionalProperties: false, properties: { username: { type: "string" }, password: { type: "string" } } } } }, async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    if (typeof body?.username !== "string" || typeof body?.password !== "string") throw new ApiError(400, "LOGIN_INVALID", "username and password are required");
    if (request.cookies[config.cookieName]) repositories.sessions.revoke(request.cookies[config.cookieName]!);
    const user = repositories.users.authenticate(body.username, body.password);
    if (!user) { repositories.audit.write(null, "auth.login_failed", "user", null, { username: body.username }, request.ip, request.headers["user-agent"] || null); throw new ApiError(401, "LOGIN_FAILED", "invalid username or password"); }
    const session = repositories.sessions.create(user.id, config.sessionHours);
    reply.setCookie(config.cookieName, session.sessionId, { path: "/", httpOnly: true, sameSite: "strict", secure: config.secureCookies, expires: new Date(session.expiresAt) });
    repositories.audit.write(user.id, "auth.login", "user", user.id, {}, request.ip, request.headers["user-agent"] || null);
    return success({ user, csrfToken: session.csrfToken });
  });
  app.post("/api/auth/logout", { preHandler: [requireUser, csrfGuard(repositories)], schema: { tags: ["auth"] } }, async (request, reply) => {
    repositories.sessions.revoke(request.edaSessionId!); reply.clearCookie(config.cookieName, { path: "/" });
    repositories.audit.write(request.edaUser!.id, "auth.logout", "user", request.edaUser!.id, {}, request.ip, request.headers["user-agent"] || null);
    return success({ loggedOut: true });
  });
  app.get("/api/auth/me", { preHandler: [requireUser], schema: { tags: ["auth"] } }, async (request) => {
    const csrfToken = repositories.sessions.rotateCsrf(request.edaSessionId!);
    return success({ user: request.edaUser, csrfToken });
  });
}
