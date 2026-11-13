import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrations } from "../../migrations/index.ts";

export class EdaDatabase {
  readonly sqlite: DatabaseSync;

  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true, mode: 0o750 });
    this.sqlite = new DatabaseSync(filename, { enableForeignKeyConstraints: true });
    this.sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;");
  }

  migrate(): void {
    this.sqlite.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;");
    const applied = this.sqlite.prepare("SELECT version FROM schema_migrations").all().map((row) => Number(row.version));
    for (const migration of migrations) {
      if (applied.includes(migration.version)) continue;
      this.transaction(() => {
        this.sqlite.exec(migration.sql);
        this.sqlite.prepare("INSERT INTO schema_migrations(version,name,applied_at) VALUES (?,?,?)")
          .run(migration.version, migration.name, new Date().toISOString());
      });
    }
  }

  transaction<T>(operation: () => T): T {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const value = operation();
      this.sqlite.exec("COMMIT");
      return value;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void { this.sqlite.close(); }
}
