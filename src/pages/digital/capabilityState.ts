import type { DigitalCapabilityResponse } from "../../api/digital/client";

export type DigitalCapabilityState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DigitalCapabilityResponse };

export function validateDigitalCapabilities(value: DigitalCapabilityResponse): DigitalCapabilityResponse {
  if (!value || value.moduleId !== "digital" || !Array.isArray(value.capabilities) || !Array.isArray(value.technologies)
    || value.capabilities.some((tool) => !tool || typeof tool.toolId !== "string" || typeof tool.label !== "string"
      || !["healthy", "degraded", "unavailable", "not_configured"].includes(tool.health))
    || value.technologies.some((technology) => !technology || !Array.isArray(technology.allowedAdapterIds))) {
    throw new Error("The Digital capabilities response is invalid.");
  }
  return value;
}

/** Missing records mean unknown status; only explicit health reports can say unavailable. */
export function digitalToolDisabledReason(state: DigitalCapabilityState, requiredToolIds: string[]): string | null {
  if (state.status === "loading") return "Loading tool availability…";
  if (state.status === "error") return `Tool availability could not be loaded: ${state.message}`;
  const unavailable: string[] = [];
  const unknown: string[] = [];
  for (const id of requiredToolIds) {
    const tool = state.data.capabilities.find((item) => item.toolId === id);
    if (!tool) unknown.push(id);
    else if (tool.health !== "healthy") unavailable.push(id);
  }
  return [
    unavailable.length ? `Unavailable tools: ${unavailable.join(", ")}` : "",
    unknown.length ? `Tool availability unknown: ${unknown.join(", ")}` : "",
  ].filter(Boolean).join(". ") || null;
}
