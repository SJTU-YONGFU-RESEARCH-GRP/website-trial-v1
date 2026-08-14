import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

describe("Benchmark production integration", () => {
  it("mounts the real Run/Import panel before the legacy result explorer", async () => {
    const source = await readFile(path.join(repositoryRoot, "src/pages/SpiceBenchmarkPage.tsx"), "utf8");
    expect(source).toContain("<BenchmarkRunPanel />");
    expect(source).toContain("<BenchmarkWorkspacePage />");
    expect(source.indexOf("<BenchmarkRunPanel />")).toBeLessThan(source.indexOf("<BenchmarkWorkspacePage />"));
  });

  it("does not import mockRuntime in the production Benchmark module or run UI", async () => {
    const files = [
      "server/modules/benchmark/index.ts",
      "server/modules/benchmark/planner.ts",
      "src/pages/benchmark/run/BenchmarkRunPanel.tsx",
      "src/pages/SpiceBenchmarkPage.tsx",
    ];
    for (const relativePath of files) {
      const source = await readFile(path.join(repositoryRoot, relativePath), "utf8");
      expect(source).not.toMatch(/mockRuntime|compat\/spiceWorkflow\/mock/i);
    }
  });
});
