import { describe, expect, it } from "vitest";
import type { InputManifestV1 } from "../../shared/contracts/v1.ts";
import { EdaDatabase } from "../../server/app/db/database.ts";
import { makeRepositories } from "../../server/app/db/repositories.ts";

describe("step process provenance", () => {
  it.each(["succeeded", "failed", "cancelled", "interrupted"] as const)("retains spawned PID/group across progress and %s completion", (status) => {
    const database = new EdaDatabase(":memory:"); database.migrate();
    try {
      const repositories = makeRepositories(database);
      const owner = repositories.users.create({ username: "provenance-owner", password: "strong test password" });
      const manifest: InputManifestV1 = { schemaVersion: "eda.input-manifest.v1", files: [], totalBytes: 0, fileCount: 0, rootHint: null, createdAt: new Date().toISOString() };
      const job = repositories.jobs.createDraft(owner.id, "acg", "run", "test", manifest);
      repositories.jobs.replaceSteps(job.id, { schemaVersion: "eda.job-plan.v1", capabilityVersion: "test", steps: [{ id: "native", name: "Native", description: "", required: true, weight: 1, process: null, inputRoles: [], outputRoles: [] }], sweep: null, warnings: [] });
      const step = repositories.jobs.steps(job.id)[0]!;
      repositories.jobs.updateStep(step.id, "running", 0, 12345, 12345);
      const startedAt = repositories.jobs.steps(job.id)[0]!.startedAt;
      repositories.jobs.updateStep(step.id, "running", 0.5);
      expect(repositories.jobs.steps(job.id)[0]).toMatchObject({ processId: 12345, processGroupId: 12345, startedAt, finishedAt: null, progress: 0.5 });
      const exitCode = status === "succeeded" ? 0 : 9;
      repositories.jobs.updateStep(step.id, status, status === "succeeded" ? 1 : 0.5, undefined, undefined, exitCode);
      expect(repositories.jobs.steps(job.id)[0]).toMatchObject({ status, processId: 12345, processGroupId: 12345, startedAt, exitCode });
      expect(repositories.jobs.steps(job.id)[0]!.finishedAt).not.toBeNull();
      // Explicit null still clears a field; omission is the preservation contract.
      repositories.jobs.updateStep(step.id, status, 1, null, undefined, exitCode);
      expect(repositories.jobs.steps(job.id)[0]).toMatchObject({ processId: null, processGroupId: 12345 });
    } finally { database.close(); }
  });
});
