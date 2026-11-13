export const migration002 = {
  version: 2,
  name: "persistent_cancel_request",
  sql: "ALTER TABLE jobs ADD COLUMN cancel_requested_at TEXT;",
} as const;
