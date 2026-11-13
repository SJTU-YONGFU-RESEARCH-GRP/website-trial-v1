export const migration006 = {
  version: 6,
  name: "dtco_pipeline",
  sql: `
    CREATE TABLE dtco_pipeline_runs (
      id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL UNIQUE REFERENCES dtco_attempts(id),
      owner_id TEXT NOT NULL REFERENCES users(id), dtco_job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id),
      context_json TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('preparing','queued','running','succeeded','failed','cancelled','interrupted')),
      provenance_verified INTEGER NOT NULL DEFAULT 0 CHECK(provenance_verified IN (0,1)),
      cancel_requested INTEGER NOT NULL DEFAULT 0 CHECK(cancel_requested IN (0,1)),
      error_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE dtco_pipeline_nodes (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES dtco_pipeline_runs(id),
      ordinal INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('benchmark','dtco','ppa','digital')),
      job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id),
      status TEXT NOT NULL CHECK(status IN ('blocked','preparing','draft','validating','ready','queued','running','succeeded','failed','cancelled','interrupted')),
      artifacts_json TEXT NOT NULL DEFAULT '[]', error_json TEXT,
      UNIQUE(run_id,ordinal), UNIQUE(run_id,kind)
    ) STRICT;
    CREATE INDEX dtco_pipeline_active ON dtco_pipeline_runs(status,updated_at);
  `,
} as const;
