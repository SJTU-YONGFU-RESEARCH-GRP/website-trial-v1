import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";
import { makeRepositories } from "../app/db/repositories.ts";

function argument(name: string): string | undefined { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
async function passwordInput(): Promise<string> {
  if (process.env.EDA_ADMIN_PASSWORD) return process.env.EDA_ADMIN_PASSWORD;
  if (!process.stdin.isTTY) { const chunks: Buffer[] = []; for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks).toString("utf8").trimEnd(); }
  process.stderr.write("Password (input hidden): "); process.stdin.setRawMode(true); process.stdin.resume(); let password = "";
  return new Promise((resolvePromise, reject) => {
    const restore = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write("\n"); };
    process.stdin.on("data", function onData(chunk: Buffer) {
      const text = chunk.toString("utf8");
      if (text === "\u0003") { restore(); reject(new Error("cancelled")); return; }
      if (text.includes("\r") || text.includes("\n")) { process.stdin.off("data", onData); restore(); resolvePromise(password); return; }
      if (text === "\u007f") password = password.slice(0, -1); else password += text;
    });
  });
}

const username = argument("--username");
if (!username) throw new Error("usage: admin:create -- --username <name> (password via hidden prompt, stdin, or EDA_ADMIN_PASSWORD)");
const password = await passwordInput(); const config = loadConfig(); const database = new EdaDatabase(config.databasePath); database.migrate();
try {
  const repositories = makeRepositories(database); const admin = repositories.users.create({ username, password, role: "admin", allowedModules: ["benchmark", "digital", "ppa"], maxConcurrentJobs: 8, storageQuotaBytes: 100 * 1024 * 1024 * 1024 });
  repositories.audit.write(admin.id, "admin.bootstrap", "user", admin.id, { username: admin.username }); process.stdout.write(`Administrator created: ${admin.username} (${admin.id})\n`);
} finally { database.close(); }
