import { MODULE_IDS } from "../../shared/contracts/v1.ts";
import type { ModuleId } from "../../shared/contracts/v1.ts";
import type { Repositories } from "../app/db/repositories.ts";
import { ModuleRegistry } from "../app/modules/registry.ts";
import { StorageService } from "../app/storage/storage.ts";
import { JobRunner, ModuleQueueWorker } from "./runner.ts";
import { SafeProcessRunner } from "../app/process/safeProcess.ts";
import { DtcoOptimizationCoordinator, DtcoOptimizationService } from "../modules/dtco/optimizationService.ts";
import { configureDtcoPipeline, DtcoPipelineCoordinator, DtcoPipelineService } from "../modules/dtco/pipeline.ts";

export class WorkerSupervisor {
  readonly runner: JobRunner;
  private readonly queues: ModuleQueueWorker[];
  private readonly dtcoOptimization: DtcoOptimizationCoordinator;
  private readonly dtcoPipeline: DtcoPipelineCoordinator;
  constructor(repositories: Repositories, registry: ModuleRegistry, storage: StorageService, concurrency: Record<ModuleId, number>, cancelGraceMs = 10_000, maxLogBytes = 256 * 1024 * 1024) {
    this.runner = new JobRunner(repositories, registry, storage, new SafeProcessRunner(cancelGraceMs, maxLogBytes));
    configureDtcoPipeline(repositories, registry);
    repositories.jobs.recoverRunning();
    this.dtcoPipeline = new DtcoPipelineCoordinator(new DtcoPipelineService(repositories, storage, registry), id => { this.runner.cancel(id); });
    this.dtcoPipeline.service.repository.recover();
    repositories.dtco.recoverPreparations();
    this.dtcoOptimization = new DtcoOptimizationCoordinator(new DtcoOptimizationService(repositories,storage));
    this.queues = MODULE_IDS.map((moduleId) => new ModuleQueueWorker(moduleId, concurrency[moduleId], repositories.jobs, this.runner, moduleId === "dtco" ? async () => { await this.dtcoPipeline.tick(); await this.dtcoOptimization.tick(); } : undefined));
  }
  start(): void { for (const queue of this.queues) queue.start(); }
  async stop(): Promise<void> { this.dtcoPipeline.requestStop(); this.dtcoOptimization.requestStop(); for (const queue of this.queues) queue.requestStop(); this.runner.cancelAll(); await Promise.all(this.queues.map((queue) => queue.stop())); }
  cancel(jobId: string): boolean { const graph = this.dtcoPipeline.service.cancel(jobId); return this.runner.cancel(jobId) || graph; }
}
