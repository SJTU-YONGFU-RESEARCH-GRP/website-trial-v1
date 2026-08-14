import { describe, expect, it } from "vitest";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";
import { hashPassword, verifyPassword } from "../../server/app/auth/password.ts";

describe("persistent database and authentication", () => {
  it("applies every versioned core table migration idempotently", () => {
    const database = new EdaDatabase(":memory:"); database.migrate(); database.migrate();
    const tables = database.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => String(row.name));
    for (const table of ["users", "sessions", "tool_configurations", "tool_health_checks", "technology_libraries", "jobs", "job_steps", "job_events", "artifacts", "benchmark_results", "digital_results", "ppa_results", "audit_logs"]) expect(tables).toContain(table);
    expect(database.sqlite.prepare("SELECT COUNT(*) count FROM schema_migrations").get()!.count).toBe(2);
    database.close();
  });

  it("uses Argon2id and server-revocable sessions without exposing passwords", () => {
    const encoded = hashPassword("correct horse battery staple");
    expect(encoded).toMatch(/^\$argon2id\$/); expect(encoded).not.toContain("correct horse");
    expect(verifyPassword("correct horse battery staple", encoded)).toBe(true); expect(verifyPassword("wrong password value", encoded)).toBe(false);
    const database = new EdaDatabase(":memory:"); database.migrate(); const repositories = makeRepositories(database);
    const user = repositories.users.create({ username: "operator", password: "correct horse battery staple" });
    expect(repositories.users.authenticate("operator", "correct horse battery staple")?.id).toBe(user.id);
    const session = repositories.sessions.create(user.id, 1); const resolved = repositories.sessions.resolve(session.sessionId);
    expect(resolved?.user.id).toBe(user.id); expect(repositories.sessions.verifyCsrf(resolved!, session.csrfToken)).toBe(true);
    expect(repositories.sessions.verifyCsrf(resolved!, "not-the-token")).toBe(false);
    repositories.sessions.revoke(session.sessionId); expect(repositories.sessions.resolve(session.sessionId)).toBeNull();
    database.close();
  });
});
