import type { ModuleAdapterV1, ModuleId } from "../../../shared/contracts/v1.ts";

export class ModuleRegistry {
  private readonly adapters = new Map<ModuleId, ModuleAdapterV1>();
  register(adapter: ModuleAdapterV1): void {
    if (this.adapters.has(adapter.moduleId)) throw new Error(`module adapter already registered: ${adapter.moduleId}`);
    this.adapters.set(adapter.moduleId, adapter);
  }
  get(moduleId: ModuleId): ModuleAdapterV1 | null { return this.adapters.get(moduleId) || null; }
  require(moduleId: ModuleId): ModuleAdapterV1 {
    const adapter = this.get(moduleId);
    if (!adapter) throw new Error(`${moduleId} backend module is not configured`);
    return adapter;
  }
}

export function parseModuleId(value: unknown): ModuleId {
  if (value === "benchmark" || value === "digital" || value === "ppa") return value;
  throw new Error("module must be benchmark, digital, or ppa");
}
