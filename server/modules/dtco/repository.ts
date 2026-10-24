import { createHash, randomUUID } from "node:crypto";
import type { DtcoAttempt, DtcoExperiment, DtcoExperimentDefinition, DtcoPoint, DtcoPointCoordinates, DtcoRevision } from "../../../shared/contracts/dtco.ts";
import type { InputManifestV1, JsonObject, StructuredJobErrorV1 } from "../../../shared/contracts/v1.ts";
import type { EdaDatabase } from "../../app/db/database.ts";
import type { JobRepository, ResultRepository } from "../../app/db/repositories.ts";
const now = () => new Date().toISOString();
type Row = Record<string, unknown>;
export const preparationError = (message: string, code = "DTCO_PREPARATION_FAILED"): StructuredJobErrorV1 => ({ type: "configuration", code, message, stepId: null, retryable: true, details: null });
const emptyManifest = (): InputManifestV1 => ({ schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: now() });
export class DtcoRepository {
  constructor(private readonly db: EdaDatabase, private readonly repositories: { jobs: JobRepository; results: ResultRepository }) {}
  list(ownerId: string, admin = false): DtcoExperiment[] {
    return (this.db.sqlite.prepare("SELECT id FROM dtco_experiments WHERE owner_id=? OR ?=1 ORDER BY updated_at DESC,id DESC LIMIT 100").all(ownerId, Number(admin)) as Row[]).map(row => this.get(String(row.id))!);
  }
  get(id: string): DtcoExperiment | null {
    const row = this.db.sqlite.prepare("SELECT * FROM dtco_experiments WHERE id=?").get(id) as Row | undefined;
    if (!row) return null;
    const revisions = (this.db.sqlite.prepare("SELECT * FROM dtco_revisions WHERE experiment_id=? ORDER BY revision DESC").all(id) as Row[]).map(item => this.revision(item));
    const current = revisions.find(item => item.revision === Number(row.revision))!;
    return { id, ownerId: String(row.owner_id), revision: Number(row.revision), definition: current.definition, createdAt: String(row.created_at), updatedAt: String(row.updated_at), points: current.points, revisions };
  }
  experimentForPoint(id: string): DtcoExperiment | null {
    const row = this.db.sqlite.prepare("SELECT experiment_id FROM dtco_points WHERE id=?").get(id) as Row | undefined;
    return row ? this.get(String(row.experiment_id)) : null;
  }
  save(ownerId: string, definition: DtcoExperimentDefinition, environmentHash: string, id?: string): DtcoExperiment {
    const experimentId = id || randomUUID();
    this.db.transaction(() => {
      const current = id ? this.get(id) : null;
      if (id && !current) throw new Error("experiment not found");
      if (current && JSON.stringify(current.definition) === JSON.stringify(definition) && current.revisions[0]!.environmentHash === environmentHash) return;
      const revision = (current?.revision || 0) + 1; const at = now();
      if (!current) this.db.sqlite.prepare("INSERT INTO dtco_experiments(id,owner_id,revision,created_at,updated_at) VALUES (?,?,?,?,?)").run(experimentId, ownerId, revision, at, at);
      else this.db.sqlite.prepare("UPDATE dtco_experiments SET revision=?,updated_at=? WHERE id=?").run(revision, at, experimentId);
      this.db.sqlite.prepare("INSERT INTO dtco_revisions(experiment_id,revision,definition_json,environment_hash,created_at) VALUES (?,?,?,?,?)").run(experimentId, revision, JSON.stringify(definition), environmentHash, at);
      for (const temperatureC of definition.temperaturesC) for (const voltageV of definition.voltagesV) for (const layoutId of definition.layoutIds) {
        const coordinates = { temperatureC, voltageV, layoutId };
        const identity = { ...definition, name: undefined, temperaturesC: undefined, voltagesV: undefined, layoutIds: undefined, ...coordinates, environmentHash, version: "dtco.point.v1" };
        const key = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
        this.db.sqlite.prepare("INSERT INTO dtco_points(id,experiment_id,revision,point_key,coordinates_json) VALUES (?,?,?,?,?)").run(randomUUID(), experimentId, revision, key, JSON.stringify(coordinates));
      }
    });
    return this.get(experimentId)!;
  }
  reserve(pointId: string, retry: boolean, expectedAttemptId?: string): { attempt: DtcoAttempt; point: DtcoPoint; experiment: DtcoExperiment } | null {
    return this.db.transaction(() => {
      const experiment = this.experimentForPoint(pointId);
      if (!experiment) throw new Error("point not found");
      const point = experiment.revisions.flatMap(rev => rev.points).find(p => p.id === pointId)!;
      if (point.revision !== experiment.revision) return null;
      if (retry && point.attempts.at(-1)?.id !== expectedAttemptId) return null;
      if (retry ? !["failed","interrupted","cancelled","preparation_failed"].includes(point.status) : point.status !== "unsubmitted") return null;
      const canonical = this.db.sqlite.prepare("SELECT id FROM dtco_points WHERE experiment_id=? AND point_key=? ORDER BY rowid LIMIT 1").get(experiment.id,point.key) as Row;
      const canonicalPointId = String(canonical.id);
      const jobId = randomUUID(); const at = now(); const number = point.attempts.length + 1; const attemptId = randomUUID();
      this.repositories.jobs.createDraft(experiment.ownerId, "dtco", "characterize", "inverter-layout-characterization", emptyManifest(), jobId);
      if (point.jobId) this.repositories.jobs.linkRetry(jobId, point.jobId);
      this.db.sqlite.prepare("INSERT INTO dtco_attempts(id,point_id,number,job_id,preparation_status,error_json,created_at,updated_at) VALUES (?,?,?,?,'preparing',NULL,?,?)").run(attemptId, canonicalPointId, number, jobId, at, at);
      this.db.sqlite.prepare("UPDATE dtco_experiments SET updated_at=? WHERE id=?").run(at, experiment.id);
      return { experiment, point, attempt: { id: attemptId, number, jobId, resultId: null, status: "preparing", progress: 0, currentStepId: null, error: null, metrics: null, createdAt: at, updatedAt: at } };
    });
  }
  finishPreparation(attemptId: string, error: StructuredJobErrorV1 | null = null): void {
    const row = this.db.sqlite.prepare("SELECT job_id FROM dtco_attempts WHERE id=?").get(attemptId) as Row | undefined;
    if (!row) return;
    const job = this.repositories.jobs.get(String(row.job_id));
    if (error && job && !["draft","validating","ready"].includes(job.status)) error = null;
    if (error && job && ["draft","validating","ready"].includes(job.status)) {
      this.db.sqlite.prepare("UPDATE jobs SET status='failed',error_json=?,finished_at=?,updated_at=? WHERE id=? AND status IN ('draft','validating','ready')").run(JSON.stringify(error), now(), now(), job.id);
    }
    this.db.sqlite.prepare("UPDATE dtco_attempts SET preparation_status=?,error_json=?,updated_at=? WHERE id=?").run(error ? "preparation_failed" : "prepared", error ? JSON.stringify(error) : null, now(), attemptId);
  }
  recoverPreparations(): number {
    const rows = this.db.sqlite.prepare("SELECT a.id,j.status FROM dtco_attempts a JOIN jobs j ON j.id=a.job_id WHERE preparation_status='preparing'").all() as Row[];
    for (const row of rows) {
      const executable = ["queued","running","succeeded","failed","cancelled","interrupted"].includes(String(row.status));
      this.finishPreparation(String(row.id), executable ? null : preparationError("Server restarted before input preparation completed; retry this point.", "DTCO_PREPARATION_INTERRUPTED"));
    }
    return rows.length;
  }
  private revision(row: Row): DtcoRevision {
    const points = (this.db.sqlite.prepare("SELECT * FROM dtco_points WHERE experiment_id=? AND revision=? ORDER BY rowid").all(String(row.experiment_id), Number(row.revision)) as Row[]).map(point => this.point(point));
    return { revision: Number(row.revision), definition: JSON.parse(String(row.definition_json)) as DtcoExperimentDefinition, environmentHash: String(row.environment_hash), createdAt: String(row.created_at), points };
  }
  private point(row: Row): DtcoPoint {
    const attempts = (this.db.sqlite.prepare("SELECT a.* FROM dtco_attempts a JOIN dtco_points p ON p.id=a.point_id WHERE p.experiment_id=? AND p.point_key=? ORDER BY a.number").all(String(row.experiment_id),String(row.point_key)) as Row[]).map(item => this.attempt(item));
    const latest = attempts.at(-1);
    return { ...JSON.parse(String(row.coordinates_json)) as DtcoPointCoordinates, id: String(row.id), revision: Number(row.revision), key: String(row.point_key), attempts,
      status: latest?.status || "unsubmitted", progress: latest?.progress || 0, currentStepId: latest?.currentStepId || null, jobId: latest?.jobId || null, resultId: latest?.resultId || null, error: latest?.error || null, metrics: latest?.metrics || null };
  }
  private attempt(row: Row): DtcoAttempt {
    const job = this.repositories.jobs.get(String(row.job_id))!;
    const status = row.preparation_status === "prepared" ? job.status : row.preparation_status as "preparing" | "preparation_failed";
    const result = job.resultId ? this.repositories.results.get("dtco", job.resultId, job.ownerId, true) : null;
    const dtco = result?.data.dtco as JsonObject | undefined;
    const metrics = dtco?.metrics as JsonObject | undefined;
    return { id: String(row.id), number: Number(row.number), jobId: job.id, resultId: job.resultId, status, progress: job.progress, currentStepId: job.currentStepId,
      error: row.error_json ? JSON.parse(String(row.error_json)) as StructuredJobErrorV1 : job.error, metrics: metrics || result?.summary || null, createdAt: String(row.created_at), updatedAt: job.updatedAt > String(row.updated_at) ? job.updatedAt : String(row.updated_at) };
  }
}
