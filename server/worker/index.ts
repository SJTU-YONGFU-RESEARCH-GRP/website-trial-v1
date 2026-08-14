import type { ModuleId } from "../../shared/contracts/v1.ts";
import type { Repositories } from "../app/db/repositories.ts";
import { ModuleRegistry } from "../app/modules/registry.ts";
import { StorageService } from "../app/storage/storage.ts";
import { JobRunner, ModuleQueueWorker } from "./runner.ts";
import { SafeProcessRunner } from "../app/process/safeProcess.ts";

export class WorkerSupervisor {
  readonly runner: JobRunner;
  private readonly queues: ModuleQueueWorker[];
  constructor(repositories: Repositories, registry: ModuleRegistry, storage: StorageService, concurrency: Record<ModuleId, number>, cancelGraceMs = 10_000) {
    this.runner = new JobRunner(repositories, registry, storage, new SafeProcessRunner(cancelGraceMs));
    this.queues = (["benchmark", "digital", "ppa"] as ModuleId[]).map((moduleId) => new ModuleQueueWorker(moduleId, concurrency[moduleId], repositories.jobs, this.runner));
    repositories.jobs.recoverRunning();
  }
  start(): void { for (const queue of this.queues) queue.start(); }
  async stop(): Promise<void> { await Promise.all(this.queues.map((queue) => queue.stop())); }
  cancel(jobId: string): boolean { return this.runner.cancel(jobId); }
}
