/* ==================================================================
 *  reportData.ts
 *
 *  Structured REPORT.md data for all model+simulator combinations.
 *  Each entry mirrors the hierarchical structure of the benchmark
 *  tool's REPORT.md output, with Test Type / Status / Key Findings.
 * ================================================================== */

import type {
  ReportStructure,
  ReportEntry,
  ReportSection,
  ReportSubSection,
  ReportStatus,
  ModelManifest,
  SimulatorId,
} from "../../compat/spiceWorkflow/contracts";

/* ─── Helpers ─── */

function entry(
  testType: string,
  status: ReportStatus,
  keyFindings: string | null,
  children?: ReportEntry[],
): ReportEntry {
  if (children) return { testType, status, keyFindings, children };
  return { testType, status, keyFindings };
}

function subSection(
  title: string,
  entries: ReportEntry[],
  plots?: string[],
): ReportSubSection {
  return { title, entries, plots };
}

function section(
  title: string,
  subsections: ReportSubSection[],
  topEntries?: ReportEntry[],
): ReportSection {
  return { title, entries: topEntries, subsections };
}

/* ─── Per-simulator parameter variations (synthetic but plausible) ─── */

interface SimParams {
  dcTc: string;
  maxPower: string;
  effTc: string;
  maxCurrent: string;
  propDelay: string;
  swPower: string;
  avgSwPower: string;
  chainDelay: string;
  powerTc: string;
  idsRange: string;
  dcPoints: number;
}

function makeParams(seed: number): SimParams {
  // Simple deterministic hash
  const r = Math.sin(seed) * 10000;
  const fr = r - Math.floor(r);
  return {
    dcTc: (0.000012 + fr * 0.00001).toFixed(6),
    maxPower: (0.018 + fr * 0.007).toExponential(3),
    effTc: (0.0007 + fr * 0.0002).toExponential(2),
    maxCurrent: (2.5e-5 + fr * 1e-5).toExponential(3),
    propDelay: (9 + fr * 3).toFixed(1),
    swPower: (0.004 + fr * 0.003).toExponential(3),
    avgSwPower: (0.001 + fr * 0.001).toExponential(3),
    chainDelay: (22 + fr * 6).toFixed(1),
    powerTc: (-(2.5e-5 + fr * 1e-5)).toExponential(3),
    idsRange: `${(-(0.017 + fr * 0.002)).toExponential(2)} to ${(2.5e-8 + fr * 0.5e-8).toExponential(2)}`,
    dcPoints: 255 + Math.floor(fr * 15),
  };
}

function hashModelSim(modelId: string, sim: SimulatorId): number {
  let h = 0;
  for (let i = 0; i < modelId.length; i++) h = ((h << 5) - h + modelId.charCodeAt(i)) | 0;
  for (let i = 0; i < sim.length; i++) h = ((h << 5) - h + sim.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ─── Report Generator ─── */

export function generateReport(
  modelId: string,
  displayName: string,
  _deviceType: "nmos" | "pmos",
  sim: SimulatorId,
): ReportStructure {
  const p = makeParams(hashModelSim(modelId, sim));

  const summary = {
    dc: [
      entry("DC Operating Point Analysis", "pass", `VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V`),
      entry("Bias Point Analysis", "pass", `9 VDS points, 9 VGS points, KCL Error: 0.00%`),
      entry("Temperature Analysis", "pass", `Temp Points: [-40, 0, 25, 50, 100, 150], TC: ${p.dcTc} /°C`),
      entry("Thermodynamic Analysis", "pass", `Power: 0.000e+00W to ${p.maxPower}W, Efficiency TC: ${p.effTc}/°C`),
    ],
    transient: [
      entry("Large-Signal Transient", "pass", `Max Current: ${p.maxCurrent}A, Rise Time: 0.1ps`),
      entry("Switching Simulations", "pass", `Propagation Delay: ${p.propDelay}ps, Power: ${p.swPower}W`),
      entry("Delay Effect Simulations", "pass", `Total Chain Delay: ${p.chainDelay}ps`),
      entry("Power Dissipation", "pass", `Temp Coeff: ${p.powerTc}W/°C`),
      entry("Quasi-Static Analysis", "pass", "I-V characteristics analyzed"),
      entry("Charge Conservation Tests", "fail", "Data not available or failed to read"),
    ],
    ac: [
      entry("Small-Signal Analysis", "pass", "Gate capacitance range: 7.08fF to 13.98fF"),
      entry("High-Frequency Analysis", "pass", "S11: -2dB to -1dB, S21: -26dB to -22dB"),
    ],
    noise: [
      entry("Thermal Noise Analysis", "pass", "Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz"),
      entry("Flicker Noise Analysis", "pass", "Exponent: 0.5075, Corner Freq: 1.12e+00 Hz"),
      entry("Shot Noise Analysis", "pass", "Level: 3.79e-09 V²/Hz, Variation: 1.4676"),
      entry("Temperature Dependence", "pass", "Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C"),
      entry("Detailed Noise Characteristics", "pass", "Analyzed at 6 bias points"),
    ],
  };

  const sections: ReportSection[] = [
    section("DC Analysis", [
      subSection("DC Operating Point Analysis", [
        entry("IV data file is generated", "pass", "iv_data_*.txt files present"),
        entry("Data points are properly read", "pass", `${p.dcPoints} data points`),
        entry("Vds values are within range", "pass", "Range: 0.00V to 1.20V"),
        entry("Vgs values are within range", "pass", "Range: 0.00V to 1.20V"),
        entry("Drain current (Ids) is properly measured", "pass", `Range: ${p.idsRange}A`),
      ], ["dc_chart.png"]),
      subSection("Temperature Dependence", [
        entry("Temperature sweep is performed", "pass", "Points: [-40, 0, 25, 50, 100, 150]"),
        entry("Temperature coefficient is calculated", "pass", `TC: ${p.dcTc} /°C`),
        entry("Device behavior is valid", "pass", `Current Range: ${p.idsRange}A`),
        entry("Temperature-dependent behavior is valid", "pass", "Monotonic with temperature"),
      ], ["dc_chart.png"]),
      subSection("Thermodynamic Analysis", [
        entry("Energy is conserved", "pass", `Power Range: 0.000e+00W to ${p.maxPower}W`),
        entry("Device is efficient", "pass", `Efficiency Range: 7.99e+00 to 1.62e+10`),
        entry("Temperature coefficient is calculated", "pass", `Value: ${p.effTc}/°C`),
      ]),
      subSection("Physical Properties", [
        entry("Physical monotonicity over bias, geometry, and temperature", "in-progress", null),
        entry("Parameter sweep simulations", "in-progress", null),
        entry("Physical symmetries (currents, charges, their derivatives)", "in-progress", null),
        entry("Cross-derivative analysis", "in-progress", null),
        entry("Terminal permutation tests", "in-progress", null),
      ]),
    ]),

    section("Transient Analysis", [
      subSection("Large-Signal Transient", [
        entry("Large Signal Transient Verified", "pass", `Maximum Drain Current: ${p.maxCurrent}A`),
        entry("Gate Voltage Rise Time", "pass", "0.1ps"),
      ], ["transient_chart.png"]),
      subSection("Switching Simulations", [
        entry("Propagation Delay Verified", "pass", `${p.propDelay}ps`),
        entry("Maximum Switching Power", "pass", `${p.swPower}W`),
        entry("Average Switching Power", "pass", `${p.avgSwPower}W`),
      ], ["transient_chart.png"]),
      subSection("Delay Effect Simulations", [
        entry("Propagation delay through inverter chain", "pass",
          `Stage 1: 13.7ps, Stage 2: 6.1ps, Stage 3: 5.1ps, Total: ${p.chainDelay}ps`),
      ], ["transient_chart.png"]),
      subSection("Transient Simulations for Power Dissipation", [
        entry("Temperature-dependent power analysis", "pass",
          `Max Power at 27°C: 9.36e-03W, Max Power at 100°C: 7.13e-03W`),
        entry("Power Temperature Coefficient", "pass", `${p.powerTc}W/°C`),
      ], ["transient_chart.png", "transient_chart.png"]),
      subSection("Quasi-Static Analysis", [
        entry("Charge conservation analyzed", "pass", "Quasi-static time-domain behavior verified"),
        entry("I-V characteristic", "pass", "Gate voltage to drain current relationship confirmed"),
      ], ["transient_chart.png", "transient_chart.png"]),
      subSection("Charge Conservation Tests", [
        entry("Charge Conservation verification", "fail", "Data not available or failed to read"),
      ], ["transient_chart.png"]),
    ]),

    section("AC Analysis", [
      subSection("Small-Signal Analysis", [
        entry("AC small-signal simulations verified", "pass", "Gate capacitance range: 7.08fF to 13.98fF"),
        entry("Frequency range", "pass", "1.00e+06Hz to 1.00e+09Hz"),
      ], ["ac_chart.png", "ac_chart.png"]),
      subSection("High-Frequency Analysis", [
        entry("High-frequency AC simulations verified", "pass", "Frequency range: 1.0MHz to 1.0GHz"),
        entry("S-parameter analysis verified", "pass", "S11: -2dB to -1dB, S21: -26dB to -22dB"),
        entry("NQS effects verified", "pass", "Maximum phase shift: 179.997°"),
      ], ["ac_chart.png", "ac_chart.png", "ac_chart.png"]),
    ]),

    section("Noise Analysis", [
      subSection("Thermal Noise Analysis", [
        entry("Thermal noise analysis completed", "pass", "Max: 1.00e+09 V²/Hz, Min: 2.16e-15 V²/Hz"),
        entry("Noise Floor", "pass", "2.65e+07 V²/Hz"),
        entry("Frequency Range", "pass", "0.0MHz to 1.0GHz"),
      ], ["noise_chart.png", "noise_chart.png"]),
      subSection("Flicker Noise Analysis", [
        entry("Flicker noise analysis completed", "pass", "Coefficient (K): 4.68e-08"),
        entry("Exponent (γ)", "pass", "0.5075"),
        entry("Correlation (R²)", "pass", "0.8265"),
        entry("Corner Frequency", "pass", "1.12e+00 Hz"),
      ], ["noise_chart.png"]),
      subSection("Shot Noise Analysis", [
        entry("Shot noise analysis completed", "pass", "Level: 3.79e-09 V²/Hz"),
        entry("Variation Coefficient", "pass", "1.4676"),
      ], ["noise_chart.png"]),
      subSection("Temperature Dependence", [
        entry("Temperature-noise analysis completed", "pass", "Coefficient: 2.77e-11 V²/Hz/°C"),
        entry("Temperature Range", "pass", "-40.0°C to 150.0°C"),
      ], ["noise_chart.png"]),
      subSection("Detailed Noise Characteristics", [
        entry("Bias Dependence analysis", "pass", "6 bias points analyzed"),
        entry("Vgs=0.3V, Vds=0.3V", "pass", "Max: 1.00e+09, Min: 2.16e-15 V²/Hz"),
        entry("Vgs=0.3V, Vds=0.6V", "pass", "Max: 1.00e+09, Min: 2.16e-15 V²/Hz"),
        entry("Vgs=0.6V, Vds=0.3V", "pass", "Max: 1.00e+09, Min: 2.16e-15 V²/Hz"),
        entry("Vgs=0.6V, Vds=0.6V", "pass", "Max: 1.00e+09, Min: 2.16e-15 V²/Hz"),
      ], ["noise_chart.png"]),
    ]),

    section("Geometry and Layout Analysis", [
      subSection("Geometry Dependence", [
        entry("W/L scaling analysis", "in-progress", null),
        entry("Multi-finger device analysis", "in-progress", null),
        entry("STI stress effects", "in-progress", null),
      ]),
      subSection("Layout Effects", [
        entry("LOD effect analysis", "in-progress", null),
        entry("WPE effect analysis", "in-progress", null),
        entry("PSE effect analysis", "in-progress", null),
        entry("Parasitic extraction comparison", "in-progress", null),
      ]),
    ]),
  ];

  return {
    scenarioTitle: `${displayName} — ${sim} Verification Report`,
    generatedAt: "2026-07-24T12:00:00Z",
    simulationSetup: [
      entry("Circuit file exists and is readable", "pass",
        "dc_circuit.cir, transient_circuit.cir, noise_circuit.cir, ac_circuit.cir"),
      entry(`${sim} is properly installed`, "pass",
        sim === "ngspice" ? "ngspice-45+" : sim === "hspice" ? "hspice-2024.03" : "spectre-24.1"),
      entry("Simulation runs without errors", "pass", "All 4 analysis domains completed successfully"),
    ],
    summary,
    sections,
  };
}

/* ─── Model Manifest Generator ─── */

export function generateManifest(
  modelId: string,
  displayName: string,
  deviceType: "nmos" | "pmos",
  operationChain: string,
  paramCount: number,
  simulators: SimulatorId[],
): ModelManifest {
  return {
    modelId,
    displayName,
    checksum: modelId,
    deviceType,
    modelFamily: "BSIM4.8",
    pdkSource: "SkyWater130",
    operationChain,
    parameterCount: paramCount,
    simulators,
    reportGeneratedAt: "2026-07-24T12:00:00Z",
  };
}

/* ─── Pre-built report data for all Experiment 1 models ─── */

export interface ModelReportEntry {
  modelId: string;
  displayName: string;
  deviceType: "nmos" | "pmos";
  operationChain: string;
  parameterCount: number;
  simReports: Record<SimulatorId, ReportStructure>;
}

const SIMS: SimulatorId[] = ["ngspice", "hspice", "spectre"];

function buildModelEntry(
  modelId: string,
  displayName: string,
  deviceType: "nmos" | "pmos",
  operationChain: string,
  parameterCount: number,
): ModelReportEntry {
  const simReports: Record<SimulatorId, ReportStructure> = {} as Record<SimulatorId, ReportStructure>;
  for (const sim of SIMS) {
    simReports[sim] = generateReport(modelId, displayName, deviceType, sim);
  }
  return { modelId, displayName, deviceType, operationChain, parameterCount, simReports };
}

export const EXPERIMENT1_REPORTS: ModelReportEntry[] = [
  // Sky130 models
  buildModelEntry("2b84a29946bd97b4", "NMOS Input (TT)", "nmos", "Input", 232),
  buildModelEntry("bc2b6974a1a14408", "NMOS FF Corner", "nmos", "Input → Expansion → FF Corner", 232),
  buildModelEntry("65341a7d3ec75e87", "NMOS Reduced → FF Corner", "nmos", "Input → Reduction → Expansion → FF Corner", 46),
  buildModelEntry("32fa1724a4aaebf6", "PMOS Input (TT)", "pmos", "Input", 232),
  buildModelEntry("99bf6dbba6647544", "PMOS FF Corner", "pmos", "Input → Expansion → FF Corner", 232),
  buildModelEntry("ece4201f2990f6b2", "PMOS Reduced → FF Corner", "pmos", "Input → Reduction → Expansion → FF Corner", 46),
  // FreePDK45 models
  buildModelEntry("7060448bf0330761", "NMOS Input (TT)", "nmos", "Input", 148),
  buildModelEntry("a875198b92ca0c78", "NMOS Translated", "nmos", "Input → Convert", 148),
  buildModelEntry("f5f0f5d9d76bf754", "NMOS Calibrated", "nmos", "Input → Convert → Calibrate", 148),
  buildModelEntry("264f10cd6c5b5069", "NMOS Reduced", "nmos", "Input → Convert → Calibrate → Reduce", 52),
  buildModelEntry("cfe7683bc4144750", "NMOS TT Corner", "nmos", "Input → Convert → Calibrate → Expand → TT", 148),
  buildModelEntry("28f885f982d10ca9", "NMOS SS Corner", "nmos", "Input → Convert → Calibrate → Expand → SS", 148),
  buildModelEntry("60c44bb10ba2d017", "NMOS FF Corner", "nmos", "Input → Convert → Calibrate → Expand → FF", 148),
  buildModelEntry("02853eca87767dc1", "PMOS Input (TT)", "pmos", "Input", 148),
];

/** Build a flat lookup: `${modelId}|${sim}` → ReportStructure */
export function buildReportLookup(
  reports: ModelReportEntry[],
): Record<string, ReportStructure> {
  const lookup: Record<string, ReportStructure> = {};
  for (const entry of reports) {
    for (const sim of SIMS) {
      lookup[`${entry.modelId}|${sim}`] = entry.simReports[sim];
    }
  }
  return lookup;
}

/** Build manifest lookup: modelId → ModelManifest */
export function buildManifestLookup(
  reports: ModelReportEntry[],
): Record<string, ModelManifest> {
  const lookup: Record<string, ModelManifest> = {};
  for (const entry of reports) {
    lookup[entry.modelId] = generateManifest(
      entry.modelId, entry.displayName, entry.deviceType,
      entry.operationChain, entry.parameterCount, SIMS,
    );
  }
  return lookup;
}
