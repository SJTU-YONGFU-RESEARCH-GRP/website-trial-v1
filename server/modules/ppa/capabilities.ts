import type { InputRoleDefinitionV1, PlannedStepV1, ToolCapabilityV1, ToolHealthStatus } from "../../../shared/contracts/v1.ts";
import { CAPABILITY_SCHEMA_VERSION } from "../../../shared/contracts/v1.ts";
import { ppaFlowAdapters } from "./adapters/index.ts";
import { INPUT_ROLES } from "./adapters/base.ts";
import type { PpaFlowId, PpaModuleContext } from "./types.ts";
import { PPA_CAPABILITY_VERSION, PPA_FLOW_IDS } from "./types.ts";

function state(context: PpaModuleContext, toolId: string): { health: ToolHealthStatus; reason: string | null; version: string | null } {
  const binding = context.toolBindings?.[toolId];
  if (!binding) return { health: "not_configured", reason: "No administrator-owned configuration and health probe are available.", version: null };
  if (!binding.configuration.enabled) return { health: "unavailable", reason: "The administrator disabled this configuration.", version: binding.version ?? null };
  if (!binding.configuration.executablePath && !binding.configuration.interpreterPath) return { health: "not_configured", reason: "No executable or interpreter path is configured.", version: binding.version ?? null };
  const probe = context.toolHealth?.[binding.configuration.id];
  return { health: binding.health, reason: binding.health === "healthy" ? null : `Latest health probe: ${binding.health}.`, version: probe?.version ?? binding.version ?? null };
}

function templates(flow: PpaFlowId): PlannedStepV1[] {
  const native = flow === "openroad-orfs"
    ? [["synthesize", "ORFS synthesis"], ["floorplan", "ORFS floorplan"], ["placement", "ORFS placement"], ["cts", "ORFS CTS"], ["routing", "ORFS routing"], ["signoff", "ORFS signoff"]]
    : [[`${flow}-flow`, flow === "openlane1" ? "OpenLane RTL-to-GDS flow" : "LibreLane SequentialFlow"]];
  return [
    ["validate-input", "Validate source/config"], ["prepare-config", "Generate safe flow configuration"], ...native,
    ["parse-native", "result_json_ast.py"], ["normalize", "Validate normalized result"], ["publish", "Publish atomically"],
  ].map(([id, name]) => ({ id, name, description: name, required: true, weight: 1, process: null, inputRoles: [], outputRoles: [] }));
}

export function ppaCapabilities(context: PpaModuleContext): ToolCapabilityV1[] {
  const parser = state(context, "ppa-result-parser");
  return PPA_FLOW_IDS.map((flow) => {
    const adapter = ppaFlowAdapters[flow]; const flowState = state(context, flow);
    const health: ToolHealthStatus = flowState.health === "healthy" && parser.health === "healthy" ? "healthy" : flowState.health === "healthy" ? parser.health : flowState.health;
    const reason = flowState.health !== "healthy" ? flowState.reason : parser.health !== "healthy" ? `PPA result parser: ${parser.reason}` : null;
    return {
      schemaVersion: CAPABILITY_SCHEMA_VERSION,
      capabilityVersion: PPA_CAPABILITY_VERSION,
      toolId: flow,
      moduleId: "ppa",
      label: adapter.label,
      description: adapter.description,
      health,
      healthReason: reason,
      toolVersion: flowState.version,
      operations: ["run-rtl-to-gds", "import-completed-run"],
      inputRoles: INPUT_ROLES.map((role): InputRoleDefinitionV1 => ({ ...role, extensions: [...role.extensions], recognizedTypes: [...role.recognizedTypes] })),
      parameters: adapter.parameters,
      plannedStepTemplates: templates(flow),
      limits: { shell: false, arbitraryScripts: false, maxSweepJobs: context.maxSweepJobs ?? 256, parserRequired: true, parserHealth: parser.health },
    };
  });
}
