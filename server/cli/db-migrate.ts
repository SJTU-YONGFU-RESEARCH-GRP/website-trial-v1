import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";

const config = loadConfig(); const database = new EdaDatabase(config.databasePath);
try { database.migrate(); process.stdout.write(`Database migrated: ${config.databasePath}\n`); } finally { database.close(); }
