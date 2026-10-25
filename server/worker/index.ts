import { MODULE_IDS } from "../../shared/contracts/v1.ts";
import type { ModuleId } from "../../shared/contracts/v1.ts";
import type { Repositories } from "../app/db/repositories.ts";
import { ModuleRegistry } from "../app/modules/registry.ts";
import { StorageService } from "../app/storage/storage.ts";
import { JobRunner, ModuleQueueWorker } from "./runner.ts";
import { SafeProcessRunner } from "../app/process/safeProcess.ts";
import { DtcoOptimizationCoordinator, DtcoOptimizationService } from "../modules/dtco/optimizationService.ts";

export class WorkerSupervisor {
  readonly runner: JobRunner;
  private readonly queues: ModuleQueueWorker[];
  private readonly dtcoOptimization: DtcoOptimizationCoordinator;
  constructor(repositories: Repositories, registry: ModuleRegistry, storage: StorageService, concurrency: Record<ModuleId, number>, cancelGraceMs = 10_000, maxLogBytes = 256 * 1024 * 1024) {
    this.runner = new JobRunner(repositories, registry, storage, new SafeProcessRunner(cancelGraceMs, maxLogBytes));
    repositories.jobs.recoverRunning();
    repositories.dtco.recoverPreparations();
    this.dtcoOptimization = new DtcoOptimizationCoordinator(new DtcoOptimizationService(repositories,storage));
    this.queues = MODULE_IDS.map((moduleId) => new ModuleQueueWorker(moduleId, concurrency[moduleId], repositories.jobs, this.runner, moduleId === "dtco" ? () => this.dtcoOptimization.tick() : undefined));
  }
  start(): void { for (const queue of this.queues) queue.start(); }
  async stop(): Promise<void> { this.dtcoOptimization.requestStop(); for (const queue of this.queues) queue.requestStop(); this.runner.cancelAll(); await Promise.all(this.queues.map((queue) => queue.stop())); }
  cancel(jobId: string): boolean { return this.runner.cancel(jobId); }
}
