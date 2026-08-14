import path from "node:path";

export interface ServerConfig {
  host: string;
  port: number;
  publicOrigin: string | null;
  trustProxy: boolean;
  databasePath: string;
  storageRoot: string;
  cookieName: string;
  sessionHours: number;
  secureCookies: boolean;
  upload: {
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
  };
  queueConcurrency: Record<"benchmark" | "digital" | "ppa", number>;
  cancelGraceMs: number;
  maxSweepJobs: number;
  maxLogBytes: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`expected a positive integer, got ${value}`);
  return parsed;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = environment.NODE_ENV === "production";
  const storageValue = environment.EDA_STORAGE_ROOT?.trim();
  if (production && !storageValue) throw new Error("EDA_STORAGE_ROOT is required in production");
  const storageRoot = path.resolve(storageValue || path.join(process.cwd(), ".eda-storage"));
  if (production) {
    const relative = path.relative(path.resolve(process.cwd()), storageRoot);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) throw new Error("EDA_STORAGE_ROOT must be outside the source repository in production");
  }
  const databasePath = path.resolve(environment.EDA_DATABASE_PATH || path.join(storageRoot, "eda.sqlite"));
  const publicOriginValue = environment.EDA_PUBLIC_ORIGIN?.trim() || null;
  const publicOrigin = publicOriginValue ? new URL(publicOriginValue).origin : null;
  if (production && !publicOrigin) throw new Error("EDA_PUBLIC_ORIGIN is required in production");
  const sessionSeconds = positiveInteger(environment.EDA_SESSION_TTL_SECONDS, 12 * 60 * 60);
  return {
    host: environment.EDA_HOST || "::",
    port: positiveInteger(environment.EDA_PORT, 3000),
    publicOrigin,
    trustProxy: environment.EDA_TRUST_PROXY === "true" || environment.EDA_TRUST_PROXY === "1",
    databasePath,
    storageRoot,
    cookieName: environment.EDA_SESSION_COOKIE || "eda_session",
    sessionHours: environment.EDA_SESSION_HOURS ? positiveInteger(environment.EDA_SESSION_HOURS, 12) : sessionSeconds / 3_600,
    secureCookies: production || environment.EDA_COOKIE_SECURE === "true" || environment.EDA_COOKIE_SECURE === "1",
    upload: {
      maxFiles: positiveInteger(environment.EDA_MAX_UPLOAD_FILES ?? environment.EDA_UPLOAD_MAX_FILES, 1024),
      maxFileBytes: positiveInteger(environment.EDA_MAX_UPLOAD_FILE_BYTES ?? environment.EDA_UPLOAD_MAX_FILE_BYTES, 256 * 1024 * 1024),
      maxTotalBytes: positiveInteger(environment.EDA_MAX_UPLOAD_TOTAL_BYTES ?? environment.EDA_UPLOAD_MAX_TOTAL_BYTES, 2 * 1024 * 1024 * 1024),
    },
    queueConcurrency: {
      benchmark: positiveInteger(environment.EDA_BENCHMARK_CONCURRENCY, 1),
      digital: positiveInteger(environment.EDA_DIGITAL_CONCURRENCY, 1),
      ppa: positiveInteger(environment.EDA_PPA_CONCURRENCY, 1),
    },
    cancelGraceMs: positiveInteger(environment.EDA_CANCEL_GRACE_MS, 10_000),
    maxSweepJobs: positiveInteger(environment.EDA_MAX_SWEEP_JOBS, 256),
    maxLogBytes: positiveInteger(environment.EDA_MAX_LOG_BYTES, 256 * 1024 * 1024),
  };
}
