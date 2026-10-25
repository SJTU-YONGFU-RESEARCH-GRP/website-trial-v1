export const migration005 = {
  version: 5,
  name: "dtco_optimization",
  sql: `
    CREATE TABLE dtco_optimizations (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
      client_request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
      definition_json TEXT NOT NULL, experiment_id TEXT NOT NULL UNIQUE REFERENCES dtco_experiments(id),
      environment_hash TEXT NOT NULL, status TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      best_iteration_id TEXT, best_score REAL, no_improvement INTEGER NOT NULL DEFAULT 0,
      state_json TEXT NOT NULL, stop_reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(owner_id,client_request_id)
    ) STRICT;
    CREATE INDEX dtco_optimizations_owner ON dtco_optimizations(owner_id,updated_at DESC);
    CREATE INDEX dtco_optimizations_active ON dtco_optimizations(status,updated_at);
    CREATE TABLE dtco_optimization_iterations (
      id TEXT PRIMARY KEY, optimization_id TEXT NOT NULL REFERENCES dtco_optimizations(id),
      number INTEGER NOT NULL, candidate_key TEXT NOT NULL, candidate_json TEXT NOT NULL,
      revision INTEGER NOT NULL, point_id TEXT NOT NULL REFERENCES dtco_points(id),
      base_iteration_id TEXT, rationale TEXT NOT NULL, evaluation_json TEXT, error_json TEXT,
      created_at TEXT NOT NULL, evaluated_at TEXT,
      UNIQUE(optimization_id,number), UNIQUE(optimization_id,candidate_key)
    ) STRICT;
  `,
} as const;
