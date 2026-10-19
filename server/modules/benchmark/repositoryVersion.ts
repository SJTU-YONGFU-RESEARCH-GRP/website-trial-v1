import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import type { BenchmarkToolId } from "./types.ts";

const execFileAsync = promisify(execFile);
const CACHE_TTL_MS = 30_000;
const EXPECTED_REPOSITORIES: Record<BenchmarkToolId, string> = {
  translator: "new-spice-translator",
  fitting: "spice_model_fitting",
  reduction: "spice_model_reduction",
  expansion: "spice_model_expansion",
  "spice-benchmark": "spice_model_benchmark",
};
const cache = new Map<string, { expiresAt: number; commit: string | null }>();

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, ...args], {
    timeout: 2_000,
    maxBuffer: 256 * 1024,
    encoding: "utf8",
  });
  return stdout.trim();
}

export function githubRepositoryName(remote: string): string | null {
  const normalized = remote.trim().replace(/\.git$/i, "");
  const match = normalized.match(/(?:github\.com[/:])[^/]+\/([^/]+)$/i);
  return match?.[1] ?? null;
}

async function resolveOne(toolId: BenchmarkToolId, root: string): Promise<string | null> {
  const key = `${toolId}:${root}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.commit;

  let commit: string | null = null;
  try {
    const [remote, head] = await Promise.all([
      git(root, ["remote", "get-url", "origin"]),
      git(root, ["rev-parse", "--verify", "HEAD"]),
    ]);
    const expected = EXPECTED_REPOSITORIES[toolId];
    if (githubRepositoryName(remote)?.toLowerCase() === expected.toLowerCase() && /^[a-f0-9]{40}$/i.test(head)) {
      const remoteRefs = await git(root, ["for-each-ref", "--format=%(refname)", "--contains", head, "refs/remotes/origin"]);
      if (remoteRefs.split(/\r?\n/).some((reference) => reference.startsWith("refs/remotes/origin/"))) commit = head.toLowerCase();
    }
  } catch {
    commit = null;
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, commit });
  return commit;
}

export async function resolveBenchmarkRepositoryVersions(
  configurations: ToolConfigurationSnapshotV1[],
): Promise<Partial<Record<BenchmarkToolId, string>>> {
  const entries = await Promise.all((Object.keys(EXPECTED_REPOSITORIES) as BenchmarkToolId[]).map(async (toolId) => {
    const configuration = configurations.find((candidate) => candidate.toolId === toolId && candidate.enabled);
    if (!configuration?.rootPath) return [toolId, null] as const;
    return [toolId, await resolveOne(toolId, configuration.rootPath)] as const;
  }));
  return Object.fromEntries(entries.filter((entry): entry is readonly [BenchmarkToolId, string] => entry[1] !== null));
}
