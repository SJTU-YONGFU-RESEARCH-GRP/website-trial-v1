export const migration001 = {
  version: 1,
  name: "initial_core_schema",
  sql: `
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      enabled INTEGER NOT NULL DEFAULT 1,
      allowed_modules_json TEXT NOT NULL,
      max_concurrent_jobs INTEGER NOT NULL,
      storage_quota_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    ) STRICT;
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      revoked_at TEXT
    ) STRICT;
    CREATE INDEX sessions_user_idx ON sessions(user_id, expires_at);

    CREATE TABLE tool_configurations (
      id TEXT PRIMARY KEY, tool_id TEXT NOT NULL, module_id TEXT NOT NULL,
      revision INTEGER NOT NULL, enabled INTEGER NOT NULL,
      root_path TEXT, executable_path TEXT, interpreter_path TEXT, entry_point TEXT,
      working_directory TEXT, timeout_seconds INTEGER NOT NULL, max_concurrency INTEGER NOT NULL,
      environment_names_json TEXT NOT NULL, environment_json TEXT NOT NULL,
      version_probe_argv_json TEXT NOT NULL, adapter_id TEXT NOT NULL, adapter_version TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(tool_id, revision)
    ) STRICT;
    CREATE TABLE tool_health_checks (
      id TEXT PRIMARY KEY, tool_configuration_id TEXT NOT NULL REFERENCES tool_configurations(id),
      status TEXT NOT NULL, version TEXT, checked_at TEXT NOT NULL, duration_ms INTEGER NOT NULL,
      message TEXT NOT NULL, missing_dependencies_json TEXT NOT NULL, self_test_passed INTEGER
    ) STRICT;
    CREATE INDEX tool_health_latest_idx ON tool_health_checks(tool_configuration_id, checked_at DESC);
    CREATE TABLE technology_libraries (
      id TEXT PRIMARY KEY, technology_id TEXT NOT NULL, process_node TEXT NOT NULL, pdk TEXT NOT NULL,
      standard_cell_library TEXT NOT NULL, liberty_paths_json TEXT NOT NULL, tech_lef_path TEXT,
      cell_lef_paths_json TEXT NOT NULL, corner TEXT NOT NULL, voltage REAL, rc_corner TEXT,
      allowed_adapter_ids_json TEXT NOT NULL, enabled INTEGER NOT NULL, revision INTEGER NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(technology_id, revision)
    ) STRICT;

    CREATE TABLE jobs (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), module_id TEXT NOT NULL,
      operation TEXT NOT NULL, workflow TEXT NOT NULL, status TEXT NOT NULL,
      input_manifest_json TEXT NOT NULL, parameters_json TEXT NOT NULL, capability_version TEXT NOT NULL,
      tool_configurations_json TEXT NOT NULL, tool_versions_json TEXT NOT NULL, plan_json TEXT NOT NULL,
      workspace_relative_path TEXT NOT NULL UNIQUE, current_step_id TEXT,
      sweep_parent_job_id TEXT REFERENCES jobs(id), retry_of_job_id TEXT REFERENCES jobs(id), result_id TEXT,
      progress REAL NOT NULL, exit_code INTEGER, error_json TEXT,
      created_at TEXT NOT NULL, queued_at TEXT, started_at TEXT, finished_at TEXT, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX jobs_queue_idx ON jobs(module_id, status, queued_at, created_at);
    CREATE INDEX jobs_owner_idx ON jobs(owner_id, updated_at DESC);
    CREATE TABLE job_steps (
      id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL, step_key TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
      progress REAL NOT NULL, process_id INTEGER, process_group_id INTEGER, exit_code INTEGER,
      started_at TEXT, finished_at TEXT, error_json TEXT,
      UNIQUE(job_id, ordinal), UNIQUE(job_id, step_key)
    ) STRICT;
    CREATE TABLE job_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      step_id TEXT REFERENCES job_steps(id), sequence INTEGER NOT NULL, at TEXT NOT NULL,
      level TEXT NOT NULL, stream TEXT NOT NULL, message TEXT NOT NULL, payload_json TEXT,
      UNIQUE(job_id, sequence)
    ) STRICT;
    CREATE INDEX job_events_poll_idx ON job_events(job_id, id);
    CREATE TABLE artifacts (
      id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), result_id TEXT,
      owner_id TEXT NOT NULL REFERENCES users(id), module_id TEXT NOT NULL, step_id TEXT REFERENCES job_steps(id),
      role TEXT NOT NULL, relative_path TEXT NOT NULL, media_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL, visibility TEXT NOT NULL, created_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX artifacts_job_idx ON artifacts(job_id, created_at);
    CREATE INDEX artifacts_result_idx ON artifacts(result_id);

    CREATE TABLE benchmark_results (id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id), lifecycle TEXT NOT NULL, record_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT);
    CREATE TABLE digital_results (id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id), lifecycle TEXT NOT NULL, record_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT);
    CREATE TABLE ppa_results (id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id), lifecycle TEXT NOT NULL, record_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT);
    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT REFERENCES users(id), action TEXT NOT NULL,
      target_type TEXT NOT NULL, target_id TEXT, ip_address TEXT, user_agent TEXT, at TEXT NOT NULL,
      details_json TEXT NOT NULL
    ) STRICT;
    CREATE INDEX audit_at_idx ON audit_logs(at DESC);
  `,
} as const;
