/** Add ACG without rebuilding existing module tables or changing user restrictions. */
export const migration003 = {
  version: 3,
  name: "acg_results_and_public_runner",
  sql: `
    CREATE TABLE acg_results (
      id TEXT PRIMARY KEY,
      owner_id TEXT REFERENCES users(id),
      lifecycle TEXT NOT NULL CHECK(lifecycle IN ('private','published','unpublished','deleted')),
      record_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT
    ) STRICT;
    UPDATE users SET allowed_modules_json=json_insert(allowed_modules_json, '$[#]', 'acg')
      WHERE username='public-runner' COLLATE NOCASE
        AND json_valid(allowed_modules_json)
        AND json_type(allowed_modules_json)='array'
        AND NOT EXISTS (SELECT 1 FROM json_each(users.allowed_modules_json) WHERE value='acg');
  `,
} as const;
