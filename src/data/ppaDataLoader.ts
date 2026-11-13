import type { PpaAstReport, PpaRunIndex } from "./ppaTypes";

const BASE = import.meta.env.BASE_URL || "/";
const ROOT = `${BASE}data/ppa-analysis`;
const reportCache = new Map<string, Promise<PpaAstReport>>();

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`${label} returned ${contentType || "non-JSON content"}`);
  }
  return await response.json() as T;
}

export async function loadPpaRunIndex(): Promise<PpaRunIndex> {
  const index = await fetchJson<PpaRunIndex>(`${ROOT}/available-runs.json`, "PPA run index");
  if (!Array.isArray(index.runs) || index.runCount !== index.runs.length) {
    throw new Error("PPA run index has an invalid runs inventory");
  }
  return index;
}

export async function loadPpaAstReport(uid: string): Promise<PpaAstReport> {
  if (!/^[a-f0-9]{32}$/.test(uid)) throw new Error(`Invalid PPA report UID: ${uid}`);
  const cached = reportCache.get(uid);
  if (cached) return cached;
  const pending = fetchJson<PpaAstReport>(`${ROOT}/${uid}/report.json`, `PPA report ${uid}`)
    .then((report) => {
      if (report.manifest.uid !== uid) throw new Error(`PPA report ${uid} has a mismatched manifest`);
      return report;
    });
  reportCache.set(uid, pending);
  return pending;
}
