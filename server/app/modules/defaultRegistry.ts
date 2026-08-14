import { createBenchmarkModule } from "../../modules/benchmark/index.ts";
import digitalModuleAdapter from "../../modules/digital/index.ts";
import ppaModuleAdapter from "../../modules/ppa/index.ts";
import { ModuleRegistry } from "./registry.ts";

/**
 * Build the production module registry in one place so the API process and the
 * standalone worker always expose exactly the same adapters.
 */
export function createDefaultModuleRegistry(): ModuleRegistry {
  const registry = new ModuleRegistry();
  registry.register(createBenchmarkModule());
  registry.register(digitalModuleAdapter);
  registry.register(ppaModuleAdapter);
  return registry;
}
