import { describe, expect, it } from "vitest";
import { ADMIN_TOOL_CATALOG, TECHNOLOGY_ADAPTER_IDS } from "../../../src/admin/catalog";

describe("administrator tool catalog", () => {
  it("exposes one immutable audited definition per module/tool", () => {
    const keys = ADMIN_TOOL_CATALOG.map((entry) => `${entry.moduleId}:${entry.toolId}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(ADMIN_TOOL_CATALOG.map((entry) => entry.moduleId))).toEqual(new Set(["benchmark", "digital", "ppa", "acg"]));
  });

  it("exposes the three native ACG engines and four internal audited helpers", () => {
    const acg = ADMIN_TOOL_CATALOG.filter((entry) => entry.moduleId === "acg");
    expect(acg.map((entry) => entry.toolId)).toEqual(["acg-cmos", "acg-dr", "acg-mr", "acg-renderer", "acg-replay", "acg-lvs1", "acg-pv"]);
    expect(acg.map((entry) => entry.adapterId)).toEqual(["acg-autocell-v1", "acg-autocell-v1", "acg-autocell-v1", "acg-renderer-v1", "acg-replay-v1", "acg-lvs1-v1", "acg-pv-v1"]);
    for (const entry of acg) expect(entry.versionProbeArgv).toEqual(["--help"]);
    expect(acg.find((entry) => entry.toolId === "acg-pv")!.allowedEnvironmentNames).toEqual(["PATH", "AUTOCELLGEN_PV_GF180_ROOT"]);
  });

  it("does not expose shell command strings or arbitrary environment names", () => {
    for (const entry of ADMIN_TOOL_CATALOG) {
      expect(entry.adapterId).toMatch(/^[a-z0-9-]+$/);
      expect(entry.allowedEnvironmentNames.every((name) => /^[A-Z_][A-Z0-9_]*$/.test(name))).toBe(true);
      expect(entry.versionProbeArgv).not.toContain("-c");
      expect(entry.versionProbeArgv).not.toContain("sh");
      expect(entry.versionProbeArgv).not.toContain("bash");
    }
  });

  it("limits technology selection to adapters implemented by Digital or PPA", () => {
    expect(TECHNOLOGY_ADAPTER_IDS).toEqual([
      "digital-yosys-opensta-v1",
      "ppa-openroad-orfs-v1",
      "ppa-openlane1-v1",
      "ppa-librelane-v1",
    ]);
  });
});

