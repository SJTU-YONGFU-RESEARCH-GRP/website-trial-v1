export const migration004 = {
  version: 4,
  name: "dtco_experiments",
  sql: `
    CREATE TABLE dtco_results (
      id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id), lifecycle TEXT NOT NULL,
      record_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT
    ) STRICT;
    CREATE TABLE dtco_experiments (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), revision INTEGER NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX dtco_experiments_owner ON dtco_experiments(owner_id,updated_at DESC);
    CREATE TABLE dtco_revisions (
      experiment_id TEXT NOT NULL REFERENCES dtco_experiments(id), revision INTEGER NOT NULL,
      definition_json TEXT NOT NULL, environment_hash TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(experiment_id,revision)
    ) STRICT;
    CREATE TABLE dtco_points (
      id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, revision INTEGER NOT NULL,
      point_key TEXT NOT NULL, coordinates_json TEXT NOT NULL,
      FOREIGN KEY(experiment_id,revision) REFERENCES dtco_revisions(experiment_id,revision),
      UNIQUE(experiment_id,revision,point_key)
    ) STRICT;
    CREATE TABLE dtco_attempts (
      id TEXT PRIMARY KEY, point_id TEXT NOT NULL REFERENCES dtco_points(id), number INTEGER NOT NULL,
      job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id), preparation_status TEXT NOT NULL,
      error_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(point_id,number)
    ) STRICT;
    UPDATE users SET allowed_modules_json=json_insert(allowed_modules_json, '$[#]', 'dtco')
      WHERE json_valid(allowed_modules_json) AND json_type(allowed_modules_json)='array'
        AND NOT EXISTS (SELECT 1 FROM json_each(users.allowed_modules_json) WHERE value='dtco')
        AND (role='admin' OR (
          EXISTS (SELECT 1 FROM json_each(users.allowed_modules_json) WHERE value='benchmark')
          AND EXISTS (SELECT 1 FROM json_each(users.allowed_modules_json) WHERE value='digital')
          AND EXISTS (SELECT 1 FROM json_each(users.allowed_modules_json) WHERE value='ppa')
          AND EXISTS (SELECT 1 FROM json_each(users.allowed_modules_json) WHERE value='acg')
        ));
  `,
} as const;
