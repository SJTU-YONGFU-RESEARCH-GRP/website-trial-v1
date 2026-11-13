import { afterEach, vi, describe, expect, it } from "vitest";
import type { ArtifactRecordV1, ResultRecordV1, ToolCapabilityV1 } from "../../../shared/contracts/v1";
import { acgArtifactLabel, acgMetricEntries, acgCoreDefaults, acgPresets, acgResultMatches, cellArtifacts, inferAcgRole, localInputDigest, parameterValue, parseConfigOverrides, validationLabel } from "../../../src/pages/acg/helpers";

afterEach(() => vi.unstubAllGlobals());

describe("ACG input validation and results", () => {
  it("distinguishes evidenced routed width from placement fallback and unknown legacy width", () => {
    const proven = acgMetricEntries({ widthCpp: 5, placementWidthCpp: 4, routedWidthCpp: 5, widthSource: "routed_candidate", widthEvidencePaths: ["output/candidate.routing.json"] });
    expect(proven.filter(([label]) => label.includes("(CPP)"))).toEqual([["Placement width (CPP)", 4], ["Routed width (CPP)", 5]]);
    expect(proven.some(([label]) => label === "Width evidence")).toBe(false);
    expect(proven).toContainEqual(["Width source", "Proven routed candidate"]);
    expect(acgMetricEntries({ widthCpp: 4, widthSource: "placement" })).toContainEqual(["Placement width (CPP)", 4]);
    expect(acgMetricEntries({ widthCpp: 4 })).toEqual([["Width (CPP, source unknown)", 4]]);
    expect(acgMetricEntries({})).toEqual([]);
  });
  it("shortens result storage paths without collapsing meaningful folders or legacy paths", () => {
    expect(acgArtifactLabel("results/acg/1234/output/native/gds/INV.gds")).toBe("output/native/gds/INV.gds");
    expect(acgArtifactLabel("results/acg/1234/output/route/INV.gds")).toBe("output/route/INV.gds");
    expect(acgArtifactLabel("legacy/INV.gds")).toBe("legacy/INV.gds");
    expect(acgArtifactLabel("results/acg/1234/")).toBe("results/acg/1234/");
  });
  it("searches every parsed cell and recorded technology without relying on summary counts", () => {
    const result = { title: "AutoCellGen MR / 2 cells", summary: { engine: "mr", mode: "placement", cellCount: 2 }, data: { acg: { cells: [{ cellName: "INV_X1" }, { cellName: "NAND2_X2" }], configuration: { configOverrides: { tech: "gf180" } } } }, provenance: { parameters: { engine: "mr" } } } as unknown as ResultRecordV1;
    expect(acgResultMatches(result, "  nand2_x2  ")).toBe(true);
    expect(acgResultMatches(result, "inv_x1")).toBe(true);
    expect(acgResultMatches(result, "GF180")).toBe(true);
    expect(acgResultMatches(result, "mr")).toBe(true);
    expect(acgResultMatches(result, "NOR2_X1")).toBe(false);
    const missing = { ...result, data: {}, provenance: { ...result.provenance, parameters: { presetId: "cmos:sky130:default" } } };
    expect(acgResultMatches(missing, "sky130")).toBe(true);
    expect(acgResultMatches(missing, "nand2_x2")).toBe(false);
    expect(acgResultMatches(missing, "")).toBe(true);
    expect(acgResultMatches({ ...missing, summary: { technology: "freepdk45", cellNames: ["BUF_X4"] } }, "buf_x4")).toBe(true);
    expect(acgResultMatches({ ...missing, data: { acg: { effectiveConfiguration: { technology: "asap7" } } } }, "asap7")).toBe(true);
  });
  it("preserves uploaded geometry by leaving optional controls unset", () => {
    const tools = [{ toolId: "acg-mr", parameters: [{ id: "numRows", defaultValue: 2, required: false }, { id: "trackNum", defaultValue: 9, required: false }, { id: "needed", defaultValue: 3, required: true }, { id: "engine", defaultValue: "mr", required: true }] }] as unknown as ToolCapabilityV1[];
    expect(acgCoreDefaults(tools, "mr")).toEqual({ numRows: "", trackNum: "", needed: "3" });
  });
  it("allows nonsecure HTTP upload when local crypto is unavailable", async () => {
    vi.stubGlobal("crypto", undefined);
    await expect(localInputDigest({} as File)).resolves.toBeNull();
    vi.stubGlobal("crypto", { subtle: { digest: vi.fn().mockRejectedValue(new Error("not available")) } });
    await expect(localInputDigest({ arrayBuffer: async () => new ArrayBuffer(0) } as File)).resolves.toBeNull();
  });
  it("requires a JSON object for native configuration overrides", () => {
    expect(parseConfigOverrides('{"NUM_ROW": 2, "nested": {"flag": true}}')).toEqual({ NUM_ROW: 2, nested: { flag: true } });
    expect(parseConfigOverrides("")).toEqual({});
    for (const value of ["{oops", "null", "[]", '"text"']) expect(() => parseConfigOverrides(value)).toThrow(/JSON/);
  });
  it("refuses blank, fractional integer and nonfinite native parameters", () => {
    expect(parameterValue("integer", "2", "Rows")).toBe(2);
    expect(parameterValue("number", "0.25", "Limit")).toBe(.25);
    expect(parameterValue("boolean", "false", "Flag")).toBe(false);
    for (const value of ["", "2.5", "Infinity", "NaN"]) expect(() => parameterValue("integer", value, "Rows")).toThrow(/Rows/);
  });
  it("keeps presets within their engine and removes repeated capability entries", () => {
    const cmos = { id: "cmos-1", label: "CMOS", engine: "cmos" };
    const dr = { id: "dr-1", label: "DR", engine: "dr" };
    const tools = [{ limits: { presets: [cmos, dr] } }, { limits: { presets: [cmos] } }] as unknown as ToolCapabilityV1[];
    expect(acgPresets(tools, "cmos")).toEqual([cmos]);
    expect(acgPresets(tools, "mr")).toEqual([]);
  });
  it("infers optional roles without treating a netlist as a config", () => {
    expect(inferAcgRole("cells.sp")).toBe("netlist");
    expect(inferAcgRole("rules.txt")).toBe("rules");
    expect(inferAcgRole("config.json")).toBe("config");
    expect(inferAcgRole("config_sa_placement_only.json")).toBe("config");
    expect(inferAcgRole("config_pathfinder.json")).toBe("config");
    expect(inferAcgRole("config/gf180/config_sa_placement_only.json")).toBe("config");
    expect(inferAcgRole("ports.v")).toBe("port-verilog");
    expect(inferAcgRole("port-metadata.json")).toBe("port-metadata");
    expect(inferAcgRole("placement.json")).toBe("placement");
    expect(inferAcgRole("INV.pathfinder.json")).toBe("source-diagnostic");
    expect(inferAcgRole("hotspot_diagnostic.json")).toBe("source-diagnostic");
    expect(inferAcgRole("predefined_layout.txt")).toBe("placement");
  });
  it("matches retained artifacts only to the cell's declared relative paths", () => {
    const artifacts = [{ id: "n", relativePath: "outputs/N/layout.gds" }, { id: "p", relativePath: "outputs/P/layout.gds" }] as ArtifactRecordV1[];
    expect(cellArtifacts({ artifacts: [{ relativePath: "N/layout.gds" }] }, artifacts).map((item) => item.id)).toEqual(["n"]);
    expect(cellArtifacts({}, artifacts)).toEqual([]);
    expect(cellArtifacts({ artifacts: [{ relativePath: "layout.gds" }] }, artifacts)).toEqual([]);
  });
  it("includes only cell-declared official PV evidence without basename guessing", () => {
    const artifacts = [{ id: "a", relativePath: "output/pv/cell-0000/summary.json" }, { id: "b", relativePath: "output/pv/cell-0001/summary.json" }] as ArtifactRecordV1[];
    expect(cellArtifacts({ verification: { officialDrc: { status: "passed", evidencePaths: ["output/pv/cell-0000/summary.json"] } } }, artifacts).map(item => item.id)).toEqual(["a"]);
  });
  it("does not infer verification success from missing evidence", () => {
    expect(validationLabel(undefined)).toBe("unknown");
    expect(validationLabel({ status: "not_run" })).toBe("not run");
    expect(validationLabel({ status: "failed" })).toBe("failed");
  });
});
