import { describe, expect, it } from "vitest";
import type { ToolCapabilityV1 } from "../../../shared/contracts/v1";
import type { DigitalCapabilityResponse } from "../../../src/api/digital/client";
import { digitalToolDisabledReason, validateDigitalCapabilities } from "../../../src/pages/digital/capabilityState";

const required = ["yosys", "opensta"];
function response(health: ToolCapabilityV1["health"] = "healthy"): DigitalCapabilityResponse {
  return {
    moduleId: "digital", technologies: [], maxSweepJobs: 1,
    capabilities: required.map((toolId) => ({ toolId, label: toolId, health }) as ToolCapabilityV1),
  };
}

describe("Digital tool availability", () => {
  it("does not call pending or failed capability requests unavailable tools", () => {
    expect(digitalToolDisabledReason({ status: "loading" }, required)).toBe("Loading tool availability…");
    expect(digitalToolDisabledReason({ status: "error", message: "HTTP 503" }, required))
      .toBe("Tool availability could not be loaded: HTTP 503");
  });

  it("accepts the API data contract and permits explicitly healthy required tools", () => {
    const data = response();
    expect(validateDigitalCapabilities(data)).toBe(data);
    expect(digitalToolDisabledReason({ status: "ready", data }, required)).toBeNull();
  });

  it.each(["unavailable", "not_configured", "degraded"] as const)("blocks explicit %s health", (health) => {
    expect(digitalToolDisabledReason({ status: "ready", data: response(health) }, required))
      .toBe("Unavailable tools: yosys, opensta");
  });

  it("keeps missing tool reports unknown and requires simulation tools only when requested", () => {
    const state = { status: "ready", data: response() } as const;
    expect(digitalToolDisabledReason(state, [...required, "iverilog", "vvp"]))
      .toBe("Tool availability unknown: iverilog, vvp");
    state.data.capabilities[0].health = "unavailable";
    expect(digitalToolDisabledReason(state, [...required, "vvp"]))
      .toBe("Unavailable tools: yosys. Tool availability unknown: vvp");
  });

  it.each([
    undefined,
    { schemaVersion: "eda.api.v1", data: response() },
    { ...response(), moduleId: "ppa" },
    { ...response(), capabilities: null },
    { ...response(), capabilities: [{ toolId: "yosys", label: "Yosys", health: "unknown" }] },
    { ...response(), technologies: [{}] },
  ])("rejects a malformed capability response instead of reporting missing tools", (value) => {
    expect(() => validateDigitalCapabilities(value as DigitalCapabilityResponse)).toThrow("The Digital capabilities response is invalid.");
  });
});
