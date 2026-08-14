import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  ArtifactRecordV1, AuditLogV1, InputManifestV1, JobEventLevel, JobEventRecordV1,
  JobEventStream, JobPlanV1, JobRecordV1, JobStatus, JobStepRecordV1, JsonObject, ModuleId,
  ResultLifecycle, ResultRecordV1, StepStatus, TechnologyLibraryV1,
  ToolConfigurationV1, ToolHealthCheckV1, UserRecordV1, UserRole,
} from "../../../shared/contracts/v1.ts";
import { EdaDatabase } from "./database.ts";
import { hashPassword, verifyPassword } from "../auth/password.ts";

const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value);
function parsed<T>(value: unknown): T { return JSON.parse(String(value)) as T; }
function bool(value: unknown): boolean { return Number(value) === 1; }

export interface AuthenticatedSession {
  sessionId: string;
  csrfToken: string;
  user: UserRecordV1;
  expiresAt: string;
}

function userFromRow(row: Record<string, unknown>): UserRecordV1 {
  return {
    id: String(row.id), username: String(row.username), role: row.role as UserRole,
    enabled: bool(row.enabled), allowedModules: parsed<ModuleId[]>(row.allowed_modules_json),
    maxConcurrentJobs: Number(row.max_concurrent_jobs), storageQuotaBytes: Number(row.storage_quota_bytes),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
  };
}

export class UserRepository {
  constructor(private readonly db: EdaDatabase) {}

  create(input: { username: string; password: string; role?: UserRole; allowedModules?: ModuleId[]; maxConcurrentJobs?: number; storageQuotaBytes?: number }): UserRecordV1 {
    const username = input.username.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{2,63}$/.test(username)) throw new Error("invalid username");
    const allowedModules = input.allowedModules || ["benchmark", "digital", "ppa"];
    if (!allowedModules.every((moduleId) => ["benchmark", "digital", "ppa"].includes(moduleId))) throw new Error("invalid allowed module");
    if (input.role && !["admin", "user"].includes(input.role)) throw new Error("invalid user role");
    if (input.maxConcurrentJobs !== undefined && (!Number.isSafeInteger(input.maxConcurrentJobs) || input.maxConcurrentJobs <= 0)) throw new Error("invalid concurrent job limit");
    if (input.storageQuotaBytes !== undefined && (!Number.isSafeInteger(input.storageQuotaBytes) || input.storageQuotaBytes <= 0)) throw new Error("invalid storage quota");
    const at = now();
    const id = randomUUID();
    this.db.sqlite.prepare(`INSERT INTO users(id,username,password_hash,role,enabled,allowed_modules_json,max_concurrent_jobs,storage_quota_bytes,created_at,updated_at,deleted_at)
      VALUES (?,?,?,?,1,?,?,?,?,?,NULL)`).run(
      id, username, hashPassword(input.password), input.role || "user",
      json(allowedModules), input.maxConcurrentJobs || 2,
      input.storageQuotaBytes || 20 * 1024 * 1024 * 1024, at, at,
    );
    return this.get(id)!;
  }

  get(id: string): UserRecordV1 | null {
    const row = this.db.sqlite.prepare("SELECT * FROM users WHERE id=?").get(id) as Record<string, unknown> | undefined;
    return row ? userFromRow(row) : null;
  }

  findByUsername(username: string): (UserRecordV1 & { passwordHash: string }) | null {
    const row = this.db.sqlite.prepare("SELECT * FROM users WHERE username=? COLLATE NOCASE").get(username) as Record<string, unknown> | undefined;
    return row ? { ...userFromRow(row), passwordHash: String(row.password_hash) } : null;
  }

  authenticate(username: string, password: string): UserRecordV1 | null {
    const found = this.findByUsername(username);
    if (!found || !verifyPassword(password, found.passwordHash) || !found.enabled || found.deletedAt) return null;
    const { passwordHash: _passwordHash, ...user } = found;
    return user;
  }

  list(limit = 100): UserRecordV1[] {
    return (this.db.sqlite.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ?").all(Math.min(limit, 500)) as Record<string, unknown>[]).map(userFromRow);
  }

  patch(id: string, input: Partial<Pick<UserRecordV1, "role" | "enabled" | "allowedModules" | "maxConcurrentJobs" | "storageQuotaBytes">> & { password?: string; delete?: boolean }): UserRecordV1 {
    const current = this.get(id);
    if (!current) throw new Error("user not found");
    if (input.role && !["admin", "user"].includes(input.role)) throw new Error("invalid user role");
    if (input.allowedModules && !input.allowedModules.every((moduleId) => ["benchmark", "digital", "ppa"].includes(moduleId))) throw new Error("invalid allowed module");
    if (input.maxConcurrentJobs !== undefined && (!Number.isSafeInteger(input.maxConcurrentJobs) || input.maxConcurrentJobs <= 0)) throw new Error("invalid concurrent job limit");
    if (input.storageQuotaBytes !== undefined && (!Number.isSafeInteger(input.storageQuotaBytes) || input.storageQuotaBytes <= 0)) throw new Error("invalid storage quota");
    const passwordHash = input.password ? hashPassword(input.password) : null;
    const at = now();
    this.db.sqlite.prepare(`UPDATE users SET role=?,enabled=?,allowed_modules_json=?,max_concurrent_jobs=?,storage_quota_bytes=?,
      password_hash=COALESCE(?,password_hash),deleted_at=?,updated_at=? WHERE id=?`).run(
      input.role ?? current.role, Number(input.enabled ?? current.enabled), json(input.allowedModules ?? current.allowedModules),
      input.maxConcurrentJobs ?? current.maxConcurrentJobs, input.storageQuotaBytes ?? current.storageQuotaBytes,
      passwordHash, input.delete ? at : current.deletedAt, at, id,
    );
    return this.get(id)!;
  }
}

export class SessionRepository {
  constructor(private readonly db: EdaDatabase, private readonly users: UserRepository) {}
  private tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }

  create(userId: string, hours: number): AuthenticatedSession {
    const sessionId = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    const createdAt = now();
    const expiresAt = new Date(Date.now() + hours * 3_600_000).toISOString();
    this.db.sqlite.prepare("INSERT INTO sessions(id,user_id,csrf_token_hash,created_at,expires_at,last_seen_at,revoked_at) VALUES (?,?,?,?,?,?,NULL)")
      .run(sessionId, userId, this.tokenHash(csrfToken), createdAt, expiresAt, createdAt);
    const user = this.users.get(userId);
    if (!user) throw new Error("user not found");
    return { sessionId, csrfToken, user, expiresAt };
  }

  resolve(sessionId: string | undefined): { sessionId: string; user: UserRecordV1; csrfTokenHash: string } | null {
    if (!sessionId) return null;
    const row = this.db.sqlite.prepare(`SELECT s.id session_id,s.csrf_token_hash,u.* FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.enabled=1 AND u.deleted_at IS NULL`).get(sessionId, now()) as Record<string, unknown> | undefined;
    if (!row) return null;
    this.db.sqlite.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").run(now(), sessionId);
    return { sessionId, user: userFromRow(row), csrfTokenHash: String(row.csrf_token_hash) };
  }

  verifyCsrf(session: { csrfTokenHash: string }, token: string | undefined): boolean {
    if (!token) return false;
    const actual = Buffer.from(this.tokenHash(token), "hex");
    const expected = Buffer.from(session.csrfTokenHash, "hex");
    return actual.length === expected.length && timingSafeEqualBuffers(actual, expected);
  }
  rotateCsrf(id: string): string {
    const token = randomBytes(32).toString("base64url");
    const result = this.db.sqlite.prepare("UPDATE sessions SET csrf_token_hash=?,last_seen_at=? WHERE id=? AND revoked_at IS NULL").run(this.tokenHash(token), now(), id);
    if (result.changes !== 1) throw new Error("session not found");
    return token;
  }
  revoke(id: string): void { this.db.sqlite.prepare("UPDATE sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL").run(now(), id); }
  revokeUser(userId: string): void { this.db.sqlite.prepare("UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL").run(now(), userId); }
  cleanup(): void { this.db.sqlite.prepare("DELETE FROM sessions WHERE expires_at<? OR revoked_at IS NOT NULL").run(now()); }
}

function timingSafeEqualBuffers(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function jobFromRow(row: Record<string, unknown>): JobRecordV1 {
  return {
    id: String(row.id), ownerId: String(row.owner_id), moduleId: row.module_id as ModuleId,
    operation: String(row.operation), workflow: String(row.workflow), status: row.status as JobStatus,
    inputManifest: parsed(row.input_manifest_json), parameters: parsed(row.parameters_json), capabilityVersion: String(row.capability_version),
    toolConfigurations: parsed(row.tool_configurations_json), toolVersions: parsed(row.tool_versions_json), plan: parsed(row.plan_json),
    workspaceRelativePath: String(row.workspace_relative_path), currentStepId: row.current_step_id === null ? null : String(row.current_step_id),
    sweepParentJobId: row.sweep_parent_job_id === null ? null : String(row.sweep_parent_job_id), retryOfJobId: row.retry_of_job_id === null ? null : String(row.retry_of_job_id),
    resultId: row.result_id === null ? null : String(row.result_id), progress: Number(row.progress), exitCode: row.exit_code === null ? null : Number(row.exit_code),
    error: row.error_json === null ? null : parsed(row.error_json), createdAt: String(row.created_at), queuedAt: row.queued_at === null ? null : String(row.queued_at),
    startedAt: row.started_at === null ? null : String(row.started_at), finishedAt: row.finished_at === null ? null : String(row.finished_at), updatedAt: String(row.updated_at),
  };
}

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ["validating"], validating: ["ready", "failed"], ready: ["queued"], queued: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled", "interrupted"], succeeded: [], failed: [], cancelled: [], interrupted: [],
};

export class JobRepository {
  constructor(private readonly db: EdaDatabase) {}

  transaction<T>(operation: () => T): T { return this.db.transaction(operation); }

  createDraft(ownerId: string, moduleId: ModuleId, operation: string, workflow: string, manifest: InputManifestV1, requestedId?: string): JobRecordV1 {
    const id = requestedId || randomUUID(); const at = now();
    const emptyPlan: JobPlanV1 = { schemaVersion: "eda.job-plan.v1", capabilityVersion: "pending", steps: [], sweep: null, warnings: [] };
    this.db.sqlite.prepare(`INSERT INTO jobs(id,owner_id,module_id,operation,workflow,status,input_manifest_json,parameters_json,capability_version,
      tool_configurations_json,tool_versions_json,plan_json,workspace_relative_path,current_step_id,sweep_parent_job_id,retry_of_job_id,result_id,
      progress,exit_code,error_json,created_at,queued_at,started_at,finished_at,updated_at) VALUES (?,?,?,?,?,'draft',?,?,'pending','[]','{}',?, ?,NULL,NULL,NULL,NULL,0,NULL,NULL,?,NULL,NULL,NULL,?)`)
      .run(id, ownerId, moduleId, operation, workflow, json(manifest), "{}", json(emptyPlan), `jobs/${id}`, at, at);
    return this.get(id)!;
  }

  get(id: string): JobRecordV1 | null {
    const row = this.db.sqlite.prepare("SELECT * FROM jobs WHERE id=?").get(id) as Record<string, unknown> | undefined;
    return row ? jobFromRow(row) : null;
  }

  list(input: { ownerId?: string; moduleId?: ModuleId; status?: JobStatus; limit?: number; cursor?: string; from?: string; to?: string } = {}): JobRecordV1[] {
    const clauses: string[] = []; const values: (string | number)[] = [];
    if (input.ownerId) { clauses.push("owner_id=?"); values.push(input.ownerId); }
    if (input.moduleId) { clauses.push("module_id=?"); values.push(input.moduleId); }
    if (input.status) { clauses.push("status=?"); values.push(input.status); }
    if (input.cursor) { clauses.push("updated_at<?"); values.push(input.cursor); }
    if (input.from) { clauses.push("created_at>=?"); values.push(input.from); }
    if (input.to) { clauses.push("created_at<=?"); values.push(input.to); }
    values.push(Math.min(input.limit || 50, 200));
    const rows = this.db.sqlite.prepare(`SELECT * FROM jobs ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY updated_at DESC,id DESC LIMIT ?`).all(...values) as Record<string, unknown>[];
    return rows.map(jobFromRow);
  }

  setDraft(id: string, manifest: InputManifestV1, parameters: JsonObject, capabilityVersion: string, toolConfigurations: unknown[], toolVersions: Record<string, string | null>, plan: JobPlanV1): JobRecordV1 {
    const current = this.get(id); if (!current || !["draft", "validating"].includes(current.status)) throw new Error("job is not an editable draft");
    this.db.sqlite.prepare(`UPDATE jobs SET status='ready',input_manifest_json=?,parameters_json=?,capability_version=?,tool_configurations_json=?,tool_versions_json=?,plan_json=?,updated_at=? WHERE id=?`)
      .run(json(manifest), json(parameters), capabilityVersion, json(toolConfigurations), json(toolVersions), json(plan), now(), id);
    this.replaceSteps(id, plan);
    return this.get(id)!;
  }

  beginValidation(id: string): void { this.transition(id, "validating"); }
  returnToDraft(id: string, error: unknown): JobRecordV1 {
    const current = this.get(id); if (!current || current.status !== "validating") throw new Error("job is not validating");
    this.db.sqlite.prepare("UPDATE jobs SET status='draft',error_json=?,updated_at=? WHERE id=?").run(json(error), now(), id);
    return this.get(id)!;
  }
  updateDraftContent(id: string, manifest: InputManifestV1, parameters: JsonObject): JobRecordV1 {
    const current = this.get(id); if (!current || current.status !== "draft") throw new Error("job is not an editable draft");
    this.db.sqlite.prepare("UPDATE jobs SET input_manifest_json=?,parameters_json=?,error_json=NULL,updated_at=? WHERE id=?").run(json(manifest), json(parameters), now(), id);
    return this.get(id)!;
  }
  transition(id: string, next: JobStatus, extra: { error?: unknown; exitCode?: number | null; resultId?: string | null } = {}): JobRecordV1 {
    const current = this.get(id); if (!current) throw new Error("job not found");
    if (!TRANSITIONS[current.status].includes(next)) throw new Error(`invalid job transition ${current.status} -> ${next}`);
    const at = now();
    this.db.sqlite.prepare(`UPDATE jobs SET status=?,queued_at=CASE WHEN ?='queued' THEN ? ELSE queued_at END,
      started_at=CASE WHEN ?='running' THEN ? ELSE started_at END,finished_at=CASE WHEN ? IN ('succeeded','failed','cancelled','interrupted') THEN ? ELSE finished_at END,
      error_json=?,exit_code=?,result_id=COALESCE(?,result_id),progress=CASE WHEN ?='succeeded' THEN 1 ELSE progress END,updated_at=? WHERE id=?`)
      .run(next, next, at, next, at, next, at, extra.error ? json(extra.error) : null, extra.exitCode ?? null, extra.resultId ?? null, next, at, id);
    return this.get(id)!;
  }

  start(id: string): JobRecordV1 { return this.transition(id, "queued"); }
  claim(moduleId: ModuleId): JobRecordV1 | null {
    return this.db.transaction(() => {
      const row = this.db.sqlite.prepare("SELECT id FROM jobs WHERE module_id=? AND status='queued' ORDER BY queued_at,id LIMIT 1").get(moduleId) as { id?: unknown } | undefined;
      if (!row) return null;
      const changed = this.db.sqlite.prepare("UPDATE jobs SET status='running',started_at=?,updated_at=? WHERE id=? AND status='queued'").run(now(), now(), String(row.id));
      return changed.changes === 1 ? this.get(String(row.id)) : null;
    });
  }

  recoverRunning(): number {
    const at = now();
    const error = json({ type: "internal", code: "WORKER_RESTART", message: "worker stopped while the job was running", stepId: null, retryable: true, details: null });
    const result = this.db.sqlite.prepare("UPDATE jobs SET status='interrupted',finished_at=?,updated_at=?,error_json=? WHERE status='running'").run(at, at, error);
    this.db.sqlite.prepare("UPDATE job_steps SET status='interrupted',finished_at=?,error_json=? WHERE status='running'").run(at, error);
    return Number(result.changes);
  }

  replaceSteps(jobId: string, plan: JobPlanV1): void {
    this.db.transaction(() => {
      this.db.sqlite.prepare("DELETE FROM job_steps WHERE job_id=?").run(jobId);
      const insert = this.db.sqlite.prepare("INSERT INTO job_steps(id,job_id,ordinal,step_key,name,status,progress,process_id,process_group_id,exit_code,started_at,finished_at,error_json) VALUES (?,?,?,?,?,'pending',0,NULL,NULL,NULL,NULL,NULL,NULL)");
      plan.steps.forEach((step, ordinal) => insert.run(randomUUID(), jobId, ordinal, step.id, step.name));
    });
  }

  steps(jobId: string): JobStepRecordV1[] { return (this.db.sqlite.prepare("SELECT * FROM job_steps WHERE job_id=? ORDER BY ordinal").all(jobId) as Array<Record<string, unknown>>).map(stepFromRow); }
  updateStep(id: string, status: StepStatus, progress: number, processId: number | null = null, processGroupId: number | null = null, exitCode: number | null = null, error: unknown = null): void {
    const terminal = ["succeeded", "failed", "cancelled", "skipped", "interrupted"].includes(status);
    this.db.sqlite.prepare(`UPDATE job_steps SET status=?,progress=?,process_id=?,process_group_id=?,exit_code=?,
      started_at=CASE WHEN ?='running' AND started_at IS NULL THEN ? ELSE started_at END,
      finished_at=CASE WHEN ? THEN ? ELSE finished_at END,error_json=? WHERE id=?`)
      .run(status, progress, processId, processGroupId, exitCode, status, now(), Number(terminal), now(), error ? json(error) : null, id);
    const row = this.db.sqlite.prepare("SELECT job_id FROM job_steps WHERE id=?").get(id) as { job_id?: unknown } | undefined;
    if (row) this.refreshProgress(String(row.job_id), id);
  }

  private refreshProgress(jobId: string, currentStepId: string): void {
    const row = this.db.sqlite.prepare("SELECT AVG(progress) value FROM job_steps WHERE job_id=?").get(jobId) as { value?: unknown };
    this.db.sqlite.prepare("UPDATE jobs SET progress=?,current_step_id=?,updated_at=? WHERE id=?").run(Number(row.value || 0), currentStepId, now(), jobId);
  }

  appendEvent(jobId: string, stepId: string | null, level: JobEventLevel, stream: JobEventStream, message: string, payload: JsonObject | null = null): JobEventRecordV1 {
    return this.db.transaction(() => {
      const row = this.db.sqlite.prepare("SELECT COALESCE(MAX(sequence),0)+1 sequence FROM job_events WHERE job_id=?").get(jobId) as { sequence: number };
      const at = now();
      const result = this.db.sqlite.prepare("INSERT INTO job_events(job_id,step_id,sequence,at,level,stream,message,payload_json) VALUES (?,?,?,?,?,?,?,?)")
        .run(jobId, stepId, row.sequence, at, level, stream, message.slice(0, 32_768), payload ? json(payload) : null);
      return { id: Number(result.lastInsertRowid), jobId, stepId, sequence: row.sequence, at, level, stream, message: message.slice(0, 32_768), payload };
    });
  }

  events(jobId: string, afterId = 0, limit = 500): JobEventRecordV1[] {
    return (this.db.sqlite.prepare("SELECT * FROM job_events WHERE job_id=? AND id>? ORDER BY id LIMIT ?").all(jobId, afterId, Math.min(limit, 2000)) as Record<string, unknown>[]).map((row) => ({
      id: Number(row.id), jobId: String(row.job_id), stepId: row.step_id === null ? null : String(row.step_id), sequence: Number(row.sequence), at: String(row.at),
      level: row.level as JobEventLevel, stream: row.stream as JobEventStream, message: String(row.message), payload: row.payload_json === null ? null : parsed(row.payload_json),
    }));
  }

  ownerInputBytes(ownerId: string): number {
    const rows = this.db.sqlite.prepare("SELECT input_manifest_json FROM jobs WHERE owner_id=?").all(ownerId) as { input_manifest_json: unknown }[];
    return rows.reduce((sum, row) => sum + Number(parsed<InputManifestV1>(row.input_manifest_json).totalBytes || 0), 0);
  }

  linkRetry(jobId: string, retryOfJobId: string): void { this.db.sqlite.prepare("UPDATE jobs SET retry_of_job_id=?,updated_at=? WHERE id=?").run(retryOfJobId, now(), jobId); }
  requestCancel(jobId: string): JobRecordV1 {
    const current = this.get(jobId); if (!current) throw new Error("job not found");
    if (current.status === "queued") return this.transition(jobId, "cancelled", { error: { type: "cancelled", code: "CANCEL_REQUESTED", message: "cancelled before execution", stepId: null, retryable: true, details: null } });
    if (current.status !== "running") throw new Error(`job in ${current.status} state cannot be cancelled`);
    this.db.sqlite.prepare("UPDATE jobs SET cancel_requested_at=?,updated_at=? WHERE id=?").run(now(), now(), jobId);
    return this.get(jobId)!;
  }
  isCancelRequested(jobId: string): boolean {
    const row = this.db.sqlite.prepare("SELECT cancel_requested_at FROM jobs WHERE id=?").get(jobId) as { cancel_requested_at?: unknown } | undefined;
    return row?.cancel_requested_at !== null && row?.cancel_requested_at !== undefined;
  }
}

function stepFromRow(row: Record<string, unknown>): JobStepRecordV1 {
  return { id: String(row.id), jobId: String(row.job_id), ordinal: Number(row.ordinal), stepKey: String(row.step_key), name: String(row.name), status: row.status as StepStatus,
    progress: Number(row.progress), processId: row.process_id === null ? null : Number(row.process_id), processGroupId: row.process_group_id === null ? null : Number(row.process_group_id),
    exitCode: row.exit_code === null ? null : Number(row.exit_code), startedAt: row.started_at === null ? null : String(row.started_at), finishedAt: row.finished_at === null ? null : String(row.finished_at),
    error: row.error_json === null ? null : parsed(row.error_json) };
}

export class AuditRepository {
  constructor(private readonly db: EdaDatabase) {}
  write(actorUserId: string | null, action: string, targetType: string, targetId: string | null, details: JsonObject = {}, ipAddress: string | null = null, userAgent: string | null = null): void {
    this.db.sqlite.prepare("INSERT INTO audit_logs(actor_user_id,action,target_type,target_id,ip_address,user_agent,at,details_json) VALUES (?,?,?,?,?,?,?,?)")
      .run(actorUserId, action, targetType, targetId, ipAddress, userAgent, now(), json(details));
  }
  list(limit = 100): AuditLogV1[] {
    return (this.db.sqlite.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?").all(Math.min(limit, 500)) as Record<string, unknown>[]).map((row) => ({
      id: Number(row.id), actorUserId: row.actor_user_id === null ? null : String(row.actor_user_id), action: String(row.action), targetType: String(row.target_type),
      targetId: row.target_id === null ? null : String(row.target_id), ipAddress: row.ip_address === null ? null : String(row.ip_address),
      userAgent: row.user_agent === null ? null : String(row.user_agent), at: String(row.at), details: parsed(row.details_json),
    }));
  }
}

export class ArtifactRepository {
  constructor(private readonly db: EdaDatabase) {}
  insert(record: ArtifactRecordV1): void {
    this.db.sqlite.prepare("INSERT INTO artifacts(id,job_id,result_id,owner_id,module_id,step_id,role,relative_path,media_type,size_bytes,sha256,visibility,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(record.id, record.jobId, record.resultId, record.ownerId, record.moduleId, record.stepId, record.role, record.relativePath, record.mediaType, record.sizeBytes, record.sha256, record.visibility, record.createdAt);
  }
  get(id: string): ArtifactRecordV1 | null {
    const row = this.db.sqlite.prepare("SELECT * FROM artifacts WHERE id=?").get(id) as Record<string, unknown> | undefined;
    return row ? artifactFromRow(row) : null;
  }
  listJob(jobId: string): ArtifactRecordV1[] { return (this.db.sqlite.prepare("SELECT * FROM artifacts WHERE job_id=? ORDER BY created_at").all(jobId) as Record<string, unknown>[]).map(artifactFromRow); }
  ownerBytes(ownerId: string): number {
    const row = this.db.sqlite.prepare("SELECT COALESCE(SUM(size_bytes),0) size FROM artifacts WHERE owner_id=?").get(ownerId) as { size?: unknown };
    return Number(row.size || 0);
  }
}

function artifactFromRow(row: Record<string, unknown>): ArtifactRecordV1 {
  return { id: String(row.id), jobId: String(row.job_id), resultId: row.result_id === null ? null : String(row.result_id), ownerId: String(row.owner_id), moduleId: row.module_id as ModuleId,
    stepId: row.step_id === null ? null : String(row.step_id), role: String(row.role), relativePath: String(row.relative_path), mediaType: String(row.media_type), sizeBytes: Number(row.size_bytes),
    sha256: String(row.sha256), visibility: row.visibility as "private" | "published", createdAt: String(row.created_at) };
}

export class ResultRepository {
  constructor(private readonly db: EdaDatabase) {}
  private table(moduleId: ModuleId): string { return `${moduleId}_results`; }
  insert(record: ResultRecordV1): void {
    this.db.sqlite.prepare(`INSERT INTO ${this.table(record.moduleId)}(id,owner_id,lifecycle,record_json,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?)`)
      .run(record.id, record.ownerId, record.lifecycle, json(record), record.createdAt, record.updatedAt, record.publishedAt);
  }
  get(moduleId: ModuleId, id: string, viewerId: string | null, admin: boolean): ResultRecordV1 | null {
    const row = this.db.sqlite.prepare(`SELECT record_json FROM ${this.table(moduleId)} WHERE id=? AND lifecycle!='deleted' AND (lifecycle='published' OR owner_id=? OR ?=1)`).get(id, viewerId, Number(admin)) as { record_json?: unknown } | undefined;
    return row ? parsed(row.record_json) : null;
  }
  list(moduleId: ModuleId, viewerId: string | null, admin: boolean, lifecycle?: ResultLifecycle, limit = 100): ResultRecordV1[] {
    const rows = this.db.sqlite.prepare(`SELECT record_json FROM ${this.table(moduleId)} WHERE lifecycle!='deleted' AND (lifecycle='published' OR owner_id=? OR ?=1) AND (? IS NULL OR lifecycle=?) ORDER BY updated_at DESC LIMIT ?`)
      .all(viewerId, Number(admin), lifecycle || null, lifecycle || null, Math.min(limit, 500)) as { record_json: unknown }[];
    return rows.map((row) => parsed(row.record_json));
  }
  query(moduleId: ModuleId, viewerId: string | null, admin: boolean, input: { lifecycle?: ResultLifecycle; ownerId?: string; cursor?: string; search?: string; filters?: Record<string, Array<string | number | boolean | null>>; limit?: number }): ResultRecordV1[] {
    const clauses = ["lifecycle!='deleted'", "(lifecycle='published' OR owner_id=? OR ?=1)"];
    const values: Array<string | number | null> = [viewerId, Number(admin)];
    if (input.lifecycle) { clauses.push("lifecycle=?"); values.push(input.lifecycle); }
    if (input.ownerId && admin) { clauses.push("owner_id=?"); values.push(input.ownerId); }
    if (input.cursor) { clauses.push("updated_at<?"); values.push(input.cursor); }
    if (input.search?.trim()) { clauses.push("LOWER(record_json) LIKE ? ESCAPE '\\'"); values.push(`%${escapeLike(input.search.trim().toLowerCase())}%`); }
    const requested = Math.min(Math.max(input.limit || 100, 1), 500);
    values.push(input.filters && Object.keys(input.filters).length ? 2_000 : requested);
    const rows = this.db.sqlite.prepare(`SELECT record_json FROM ${this.table(moduleId)} WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC,id DESC LIMIT ?`).all(...values) as { record_json: unknown }[];
    const records = rows.map((row) => parsed<ResultRecordV1>(row.record_json));
    return records.filter((record) => matchesResultFilters(record, input.filters)).slice(0, requested);
  }
  patchLifecycle(moduleId: ModuleId, id: string, lifecycle: ResultLifecycle): void {
    const row = this.db.sqlite.prepare(`SELECT record_json FROM ${this.table(moduleId)} WHERE id=?`).get(id) as { record_json?: unknown } | undefined;
    if (!row) throw new Error("result not found");
    const record = parsed<ResultRecordV1>(row.record_json); const at = now();
    record.lifecycle = lifecycle; record.updatedAt = at; record.publishedAt = lifecycle === "published" ? at : record.publishedAt;
    this.db.transaction(() => {
      this.db.sqlite.prepare(`UPDATE ${this.table(moduleId)} SET lifecycle=?,record_json=?,updated_at=?,published_at=? WHERE id=?`).run(lifecycle, json(record), at, record.publishedAt, id);
      this.db.sqlite.prepare("UPDATE artifacts SET visibility=? WHERE result_id=?").run(lifecycle === "published" ? "published" : "private", id);
    });
  }
}

function escapeLike(value: string): string { return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_"); }

function matchesResultFilters(record: ResultRecordV1, filters?: Record<string, Array<string | number | boolean | null>>): boolean {
  if (!filters) return true;
  for (const [key, accepted] of Object.entries(filters)) {
    if (!accepted.length) continue;
    let value: unknown = record;
    for (const segment of key.split(".")) {
      if (!value || typeof value !== "object" || Array.isArray(value)) { value = undefined; break; }
      value = (value as Record<string, unknown>)[segment];
    }
    if (!accepted.some((candidate) => candidate === value)) return false;
  }
  return true;
}

export class ToolRepository {
  constructor(private readonly db: EdaDatabase) {}
  save(input: Omit<ToolConfigurationV1, "id" | "revision" | "createdAt" | "updatedAt" | "capturedAt"> & { id?: string }): ToolConfigurationV1 {
    const at = now(); const id = input.id || randomUUID();
    const previous = this.db.sqlite.prepare("SELECT MAX(revision) revision FROM tool_configurations WHERE tool_id=?").get(input.toolId) as { revision?: unknown };
    const revision = Number(previous.revision || 0) + 1;
    this.db.sqlite.prepare(`INSERT INTO tool_configurations(id,tool_id,module_id,revision,enabled,root_path,executable_path,interpreter_path,entry_point,working_directory,
      timeout_seconds,max_concurrency,environment_names_json,environment_json,version_probe_argv_json,adapter_id,adapter_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, input.toolId, input.moduleId, revision, Number(input.enabled), input.rootPath, input.executablePath, input.interpreterPath, input.entryPoint, input.workingDirectory,
        input.timeoutSeconds, input.maxConcurrency, json(input.environmentNames), json(input.environment), json(input.versionProbeArgv), input.adapterId, input.adapterVersion, at, at);
    return this.get(id)!;
  }
  get(id: string): ToolConfigurationV1 | null {
    const row = this.db.sqlite.prepare("SELECT * FROM tool_configurations WHERE id=?").get(id) as Record<string, unknown> | undefined;
    return row ? toolFromRow(row) : null;
  }
  list(moduleId?: ModuleId): ToolConfigurationV1[] {
    const rows = this.db.sqlite.prepare(`SELECT * FROM tool_configurations ${moduleId ? "WHERE module_id=?" : ""} ORDER BY tool_id,revision DESC`).all(...(moduleId ? [moduleId] : [])) as Record<string, unknown>[];
    return rows.map(toolFromRow);
  }
  active(moduleId: ModuleId): ToolConfigurationV1[] {
    const rows = this.db.sqlite.prepare(`SELECT c.* FROM tool_configurations c JOIN (
      SELECT tool_id,MAX(revision) revision FROM tool_configurations WHERE module_id=? GROUP BY tool_id
    ) latest ON latest.tool_id=c.tool_id AND latest.revision=c.revision WHERE c.module_id=? AND c.enabled=1 ORDER BY c.tool_id`).all(moduleId, moduleId) as Record<string, unknown>[];
    return rows.map(toolFromRow);
  }
  latestHealth(configurationId: string): ToolHealthCheckV1 | null {
    const row = this.db.sqlite.prepare("SELECT * FROM tool_health_checks WHERE tool_configuration_id=? ORDER BY checked_at DESC LIMIT 1").get(configurationId) as Record<string, unknown> | undefined;
    return row ? { id: String(row.id), toolConfigurationId: String(row.tool_configuration_id), status: row.status as ToolHealthCheckV1["status"], version: row.version === null ? null : String(row.version), checkedAt: String(row.checked_at), durationMs: Number(row.duration_ms), message: String(row.message), missingDependencies: parsed(row.missing_dependencies_json), selfTestPassed: row.self_test_passed === null ? null : bool(row.self_test_passed) } : null;
  }
  addHealth(record: ToolHealthCheckV1): void {
    this.db.sqlite.prepare("INSERT INTO tool_health_checks(id,tool_configuration_id,status,version,checked_at,duration_ms,message,missing_dependencies_json,self_test_passed) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(record.id, record.toolConfigurationId, record.status, record.version, record.checkedAt, record.durationMs, record.message, json(record.missingDependencies), record.selfTestPassed === null ? null : Number(record.selfTestPassed));
  }
}

function toolFromRow(row: Record<string, unknown>): ToolConfigurationV1 {
  return { id: String(row.id), toolId: String(row.tool_id), moduleId: row.module_id as ModuleId, revision: Number(row.revision), enabled: bool(row.enabled),
    rootPath: row.root_path === null ? null : String(row.root_path), executablePath: row.executable_path === null ? null : String(row.executable_path), interpreterPath: row.interpreter_path === null ? null : String(row.interpreter_path),
    entryPoint: row.entry_point === null ? null : String(row.entry_point), workingDirectory: row.working_directory === null ? null : String(row.working_directory), timeoutSeconds: Number(row.timeout_seconds),
    maxConcurrency: Number(row.max_concurrency), environmentNames: parsed(row.environment_names_json), environment: parsed(row.environment_json), versionProbeArgv: parsed(row.version_probe_argv_json),
    adapterId: String(row.adapter_id), adapterVersion: String(row.adapter_version), capturedAt: String(row.updated_at), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

export class TechnologyRepository {
  constructor(private readonly db: EdaDatabase) {}
  save(input: Omit<TechnologyLibraryV1, "id" | "revision" | "createdAt" | "updatedAt">): TechnologyLibraryV1 {
    const at = now(); const id = randomUUID();
    const old = this.db.sqlite.prepare("SELECT MAX(revision) revision FROM technology_libraries WHERE technology_id=?").get(input.technologyId) as { revision?: unknown };
    const revision = Number(old.revision || 0) + 1;
    this.db.sqlite.prepare(`INSERT INTO technology_libraries(id,technology_id,process_node,pdk,standard_cell_library,liberty_paths_json,tech_lef_path,cell_lef_paths_json,
      corner,voltage,rc_corner,allowed_adapter_ids_json,enabled,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, input.technologyId, input.processNode, input.pdk, input.standardCellLibrary, json(input.libertyPaths), input.techLefPath, json(input.cellLefPaths), input.corner, input.voltage,
        input.rcCorner, json(input.allowedAdapterIds), Number(input.enabled), revision, at, at);
    return this.list().find((item) => item.id === id)!;
  }
  list(enabledOnly = false): TechnologyLibraryV1[] {
    return (this.db.sqlite.prepare(`SELECT * FROM technology_libraries ${enabledOnly ? "WHERE enabled=1" : ""} ORDER BY technology_id,revision DESC`).all() as Record<string, unknown>[]).map((row) => ({
      id: String(row.id), technologyId: String(row.technology_id), processNode: String(row.process_node), pdk: String(row.pdk), standardCellLibrary: String(row.standard_cell_library),
      libertyPaths: parsed(row.liberty_paths_json), techLefPath: row.tech_lef_path === null ? null : String(row.tech_lef_path), cellLefPaths: parsed(row.cell_lef_paths_json), corner: String(row.corner),
      voltage: row.voltage === null ? null : Number(row.voltage), rcCorner: row.rc_corner === null ? null : String(row.rc_corner), allowedAdapterIds: parsed(row.allowed_adapter_ids_json), enabled: bool(row.enabled),
      revision: Number(row.revision), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    }));
  }
}

export function makeRepositories(db: EdaDatabase) {
  const users = new UserRepository(db);
  return { users, sessions: new SessionRepository(db, users), jobs: new JobRepository(db), audit: new AuditRepository(db), artifacts: new ArtifactRepository(db), results: new ResultRepository(db), tools: new ToolRepository(db), technologies: new TechnologyRepository(db) };
}
export type Repositories = ReturnType<typeof makeRepositories>;
