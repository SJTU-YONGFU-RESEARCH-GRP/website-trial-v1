import { afterEach, describe, expect, it, vi } from "vitest";
import type { DtcoCircuitProfile, DtcoModelProfile, DtcoOptions, DtcoTechnologyProfile } from "../../../shared/contracts/dtco";
import catalog from "../../../scripts/dtco/catalog.json" with { type: "json" };
import { chooseCatalogSelection, circuitDefaults, compatibleCircuits, effectiveDimension, validateCatalogDimensions } from "../../../src/pages/dtco/catalogHelpers";
import { definitionToForm, parseDtcoForm, pointLabel } from "../../../src/pages/dtco/helpers";
import { initializeParameterAxes, searchParameters } from "../../../src/pages/dtco/DtcoSearchAxes";
import { validateOptimization, measuredIterations } from "../../../src/pages/dtco/optimizationHelpers";
import { savedMeasurements } from "../../../src/pages/dtco/resultHelpers";
import { saveDtcoExperiment } from "../../../src/api/dtco/client";
import { definition, options, point, experiment } from "./fixtures";
import { optimizationDefinition, optimizationOptions, iteration, optimization } from "./optimizationFixtures";
const choice = (id: string) => ({ id, label: id, available: true, reason: null });
const profiles: DtcoOptions = { ...options,
  technologyProfiles: catalog.technologyProfiles as DtcoTechnologyProfile[], modelProfiles: catalog.modelProfiles as DtcoModelProfile[], circuitProfiles: catalog.circuitProfiles as unknown as DtcoCircuitProfile[],
  technologies: catalog.technologyProfiles, models: catalog.modelProfiles, circuits: catalog.circuitProfiles,
  layouts: [...new Set(catalog.circuitProfiles.flatMap(item => item.layoutIds))].map(choice),
};
const model = catalog.modelProfiles.find(item => item.modelId === "gf180-03v3")!;
const input = { ...definition, modelVersion: model.id, electricalMode: "extracted" as const, sizingMode: "custom" as const, layoutIds: ["mr-sa-12t-pex"] };
afterEach(() => vi.unstubAllGlobals());
describe("catalog selection, physical limits and actual submitted conditions", () => {
  it("changes technology and model together, exposing only compatible real circuit choices", () => {
    const next = chooseCatalogSelection(profiles, input, "technologyId", "sky130A");
    expect(next.modelVersion).toBe(catalog.modelProfiles.find(item => item.technologyId === "sky130A")!.id);
    expect(compatibleCircuits(profiles, next).length).toBeGreaterThan(2);
    expect(compatibleCircuits(profiles, next).every(item => item.id.includes("sky130"))).toBe(true);
    expect(circuitDefaults(profiles, next)).toMatchObject({ sizingMode: "custom" });
    expect(validateCatalogDimensions(profiles, { ...input, ...next, circuitId: "gf180-inverter" })).toContain("compatible");
  });
  it("posts full Cartesian VDD/VSS/temperature/corner arrays without collapsing a sweep", async () => {
    const form = { ...definitionToForm(input), temperatures: "25,85", voltages: "3.2,3.3", groundVoltages: "0,0.1", processCorners: ["tt", "ss"] as const };
    const parsed = parseDtcoForm({ ...form, processCorners: [...form.processCorners] }, profiles);
    expect(parsed).toMatchObject({ count: 16, error: null });
    const fetch = vi.fn(async () => new Response(JSON.stringify({ data: experiment("saved", [], parsed.definition!) })));
    vi.stubGlobal("fetch", fetch);
    await saveDtcoExperiment(parsed.definition!);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({ temperaturesC: [25,85], voltagesV: [3.2,3.3], groundVoltagesV: [0,.1], processCorners: ["tt","ss"], sizingMode: "custom" });
    expect(parseDtcoForm({ ...form, processCorners: [...form.processCorners], groundVoltages: "4" }, profiles).definition).toBeNull();
  });
  it("keeps fixed library source dimensions immutable and refuses source unlocks", () => {
    const circuit = profiles.circuitProfiles!.find(item => item.source.kind === "standard-cell" && item.sizingModes.includes("fixed"))!;
    const fixed = { ...input, technologyId: circuit.technologyIds[0], circuitId: circuit.id, modelVersion: profiles.modelProfiles!.find(item => circuit.modelIds.includes(item.modelId))!.id, electricalMode: circuit.electricalModes[0], sizingMode: "fixed" as const };
    const device = circuit.devices[0];
    expect(validateCatalogDimensions(profiles, fixed)).toBeNull();
    expect(validateCatalogDimensions(profiles, { ...fixed, deviceOverrides: { [device.id]: { widthUm: device.widthUm + 1 } } })).toContain("immutable");
    expect(validateCatalogDimensions(profiles, { ...fixed, deviceOverrides: { [device.id]: { lockWidth: false } } })).toContain("locks");
  });
  it("applies group/device overrides and locks but rejects conflicting assignments and native limits", () => {
    const circuit = profiles.circuitProfiles!.find(item => item.id === input.circuitId)!;
    const device = circuit.devices.find(item => item.familyId.endsWith("-p"))!, group = circuit.groups.find(item => item.deviceIds.includes(device.id))!;
    const value = { ...input, groupOverrides: { [group.id]: { widthUm: 1.4, lockWidth: true } } };
    expect(effectiveDimension(device, circuit, value, "pmos")).toMatchObject({ widthUm: 1.4, lockWidth: true });
    expect(validateCatalogDimensions(profiles, value)).toBeNull();
    expect(validateCatalogDimensions(profiles, { ...value, deviceOverrides: { [device.id]: { widthUm: 2 } } })).toContain("conflict");
    expect(validateCatalogDimensions(profiles, { ...input, deviceOverrides: { [device.id]: { lengthUm: .3 } } })).toContain("common channel length");
  });
  it("guards native uniform length and multiplicity while preserving schematic inventory", () => {
    expect(validateCatalogDimensions(profiles, { ...input, deviceOverrides: { MP0: { lengthUm: .3 } } } )).toContain("common channel length");
    const changed = { ...profiles, circuitProfiles: profiles.circuitProfiles!.map(circuit => circuit.id === input.circuitId ? { ...circuit, devices: circuit.devices.map((device, index) => index ? device : { ...device, fingers: 2 }) } : circuit) };
    expect(validateCatalogDimensions(changed, input)).toContain("nf = 1");
    const schematic = { ...changed, circuitProfiles: changed.circuitProfiles!.map(circuit => circuit.id === input.circuitId ? { ...circuit, layoutIds: ["schematic-only"] } : circuit) };
    expect(validateCatalogDimensions(schematic, { ...input, layoutIds: ["schematic-only"], electricalMode: "schematic", deviceOverrides: { MP0: { lengthUm: .3 } } })).toBeNull();
  });
  it("posts extended axes and preserves sizing locks instead of using legacy GF180 axes", () => {
    const value = initializeParameterAxes({ ...optimizationDefinition, ...input, temperatureC: 25, voltageV: 3.3, processCorners: ["tt"] }, profiles);
    expect(value.parameterAxes?.temperatureC).toMatchObject({ min: 25, max: 25 });
    expect(searchParameters(value, profiles).find(item => item.key === "device:MP0:lengthUm")?.locked).toBe(true);
    expect(validateOptimization(value, optimizationOptions, profiles)).toBeNull();
    expect(validateOptimization({ ...value, parameterAxes: { ...value.parameterAxes, "device:MP0:lengthUm": { min: .28, max: .3, initial: .28, step: .01 } } }, optimizationOptions, profiles)).toContain("bounds");
  });
  it("rejects supply-axis extrema outside model bounds and keeps true frequency separate from delay", () => {
    const value = initializeParameterAxes({ ...optimizationDefinition, ...input, processCorners: ["tt"], voltageV: 3.3 }, profiles);
    expect(validateOptimization({ ...value, parameterAxes: { ...value.parameterAxes, groundVoltageV: { min: 0, max: .7, initial: 0, step: .1 } } }, optimizationOptions, profiles)).toContain("VDD minus VSS");
    const candidate = iteration(1, { metrics: { delayPs: 12, averagePowerW: 1e-6, areaUm2: null, maxFrequencyHz: 8e8 } });
    const rows = savedMeasurements([], [optimization({ iterations: [candidate], definition: { ...value, objective: { metric: "maxFrequencyHz", target: 8e8 } } })]);
    expect(rows[0].metrics.maxFrequencyHz).toBe(8e8);
    expect(rows[0].metrics.delayPs).toBe(12);
    expect(validateOptimization({ ...value, processCorners: ["tt", "ff"] }, optimizationOptions, profiles)).toContain("one fixed");
  });
  it("labels actual candidate conditions and sizing, retaining unavailable area honestly", () => {
    const candidate = iteration(1, { metrics: { delayPs: 12, averagePowerW: 1e-6, areaUm2: null }, candidate: { design: { nmosWidthUm: 1, pmosWidthUm: 2 }, layoutId: "native", parameters: { temperatureC: 85, voltageV: 1.8, groundVoltageV: .1, "device:MP0:widthUm": 1.4 }, processCorner: "ss" } });
    const rows = savedMeasurements([], [optimization({ definition: { ...optimizationDefinition, electricalMode: "schematic", parameterAxes: {}, sizingMode: "custom" }, iterations: [candidate] })]);
    expect(measuredIterations([candidate])).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mode: "schematic", metrics: { areaUm2: null } });
    expect(rows[0].conditions).toContain("85 °C / VDD 1.8 V / VSS 0.1 V / SS");
    expect(rows[0].sizing).toContain("device:MP0:widthUm=1.4");
    expect(pointLabel(point("condition", "succeeded", { groundVoltageV: .2, processCorner: "ff" }))).toContain("VSS 0.2 V / FF");
  });
});
