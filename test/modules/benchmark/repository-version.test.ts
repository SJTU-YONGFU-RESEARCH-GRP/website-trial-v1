import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { githubRepositoryName, resolveBenchmarkRepositoryVersions } from "../../../server/modules/benchmark/repositoryVersion.ts";
import { benchmarkToolVersionLabel } from "../../../src/pages/benchmark/run/toolPresentation.ts";
import { toolConfiguration } from "./helpers.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Benchmark repository versions", () => {
  it("uses one Available label format for a repository commit", () => {
    const commit = "8c496d415935d2f2ac837c11692ec9654bb65a3b";
    expect(benchmarkToolVersionLabel(commit)).toBe(`Available: ${commit}`);
    expect(benchmarkToolVersionLabel("usage: cli.py --help")).toBe("Available");
  });

  it("recognizes HTTPS and SSH GitHub remotes", () => {
    expect(githubRepositoryName("https://github.com/example/new-spice-translator.git")).toBe("new-spice-translator");
    expect(githubRepositoryName("git@github.com:example/spice_model_fitting.git")).toBe("spice_model_fitting");
    expect(githubRepositoryName("https://example.com/example/spice_model_fitting.git")).toBeNull();
  });

  it("returns HEAD only when it belongs to the expected GitHub repository and an origin ref", async () => {
    const root = mkdtempSync(join(tmpdir(), "benchmark-repository-version-"));
    temporaryDirectories.push(root);
    execFileSync("git", ["init", "-q", root]);
    execFileSync("git", ["-C", root, "config", "user.email", "test@example.com"]);
    execFileSync("git", ["-C", root, "config", "user.name", "Test"]);
    execFileSync("git", ["-C", root, "commit", "--allow-empty", "-qm", "fixture"]);
    execFileSync("git", ["-C", root, "remote", "add", "origin", "https://github.com/example/new-spice-translator.git"]);
    const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    execFileSync("git", ["-C", root, "update-ref", "refs/remotes/origin/main", head]);
    const configuration = { ...toolConfiguration("translator"), rootPath: root };

    await expect(resolveBenchmarkRepositoryVersions([configuration])).resolves.toEqual({ translator: head });
  });
});
