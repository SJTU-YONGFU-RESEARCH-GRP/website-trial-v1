/* ==================================================================
 *  mockRuntime.ts (goal.md §38)
 *
 *  Static mock implementation of the WorkflowRuntime interface.
 *  Returns deterministic fixtures without calling external tools.
 * ================================================================== */

import type {
  WorkflowRuntime,
  WorkflowPreview,
  WorkflowPreviewRequest,
  WorkflowScenario,
  ToolId,
} from "./contracts";
import { CANONICAL_WORKFLOW_ORDER } from "./toolCatalog";

/* ─── Fixture registry ─── */
const scenarioRegistry = new Map<string, () => Promise<WorkflowScenario>>();

export function registerScenario(
  id: string,
  loader: () => Promise<WorkflowScenario>,
): void {
  scenarioRegistry.set(id, loader);
}

export function createMockRuntime(): WorkflowRuntime {
  return {
    async preview(request: WorkflowPreviewRequest): Promise<WorkflowPreview> {
      const enabledTools: ToolId[] = [];

      for (const toolId of CANONICAL_WORKFLOW_ORDER) {
        const op = request.operations.find((o) => o.toolId === toolId);
        if (op?.enabled) {
          enabledTools.push(toolId);
        }
      }

      // Always include benchmark as final step
      const effectiveSteps: ToolId[] = [...enabledTools, "benchmark"];

      // Build benchmark matrix
      const modelIds = request.operations
        .flatMap((o) => o.enabled ? [`model-${o.toolId}`] : [])
        .filter(Boolean);

      if (request.inputModelId) modelIds.unshift(request.inputModelId);

      const benchmarkMatrix = modelIds.map((modelId) => ({
        modelId,
        simulators: request.selectedSimulators,
        domains: request.selectedDomains,
      }));

      const warnings: string[] = [];
      if (request.selectedSimulators.includes("spectre")) {
        warnings.push("Spectre resource metrics in demo mode are synthetic.");
      }
      if (request.selectedSimulators.includes("hspice")) {
        warnings.push("HSPICE resource metrics in demo mode are synthetic.");
      }

      return {
        effectiveSteps,
        compatibilityNodes: [],
        benchmarkMatrix,
        warnings,
      };
    },

    async loadResult(scenarioId: string): Promise<WorkflowScenario> {
      const loader = scenarioRegistry.get(scenarioId);
      if (!loader) {
        throw new Error(`Unknown scenario: ${scenarioId}`);
      }
      return loader();
    },
  };
}
