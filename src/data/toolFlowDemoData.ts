/* ================================================================== */
/*  Deterministic library-benchmark demo data for /flow dashboard       */
/*  All data is deterministic — no Math.random() anywhere.              */
/*  Replace any section with real tool output when available.           */
/* ================================================================== */

import type {
  LibraryBenchmark,
  LayoutRoutingAlgorithm,
  LayoutData,
  ParasiticsData,
  TimingData,
  DeviceOptData,
  CellBenchmarkResult,
  AlgorithmCellResult,
  LibraryAlgorithmSummary,
  Artifact,
  StageInfo,
} from "./toolFlowTypes";

/* ═══════════════════════════════════════════════════════════════════ */
/*  Algorithms                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

const ALGORITHMS: LayoutRoutingAlgorithm[] = [
  {
    algorithmId: "default",
    algorithmName: "Default Flow",
    placementAlgorithm: "timberwolf",
    routingAlgorithm: "global+maze",
    description: "Baseline CFET placement (timberwolf) + maze routing with default effort.",
  },
  {
    algorithmId: "aggressive",
    algorithmName: "Aggressive P&R",
    placementAlgorithm: "sa_anneal",
    routingAlgorithm: "maze+ripup",
    description: "Simulated-annealing placement + rip-up maze routing targeting higher density.",
  },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Layout helpers                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function layoutPlaceholderSvg(cell: string, algo: string, _w: number, _h: number, ut: number): string {
  const S = 200, T = 80;
  const fw = Math.round(S * ut), fh = Math.round(T * ut);
  const accent = algo === "aggressive" ? "#ff9f0a" : "#30d158";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${T}" width="${S}" height="${T}">` +
    `<rect width="${S}" height="${T}" fill="#1e2a3d" rx="2"/>` +
    `<rect x="4" y="4" width="${fw - 4}" height="${fh - 4}" fill="${accent}" opacity="0.55" rx="1"/>` +
    `<rect x="4" y="${fh + 4}" width="${Math.round(S * 0.38)}" height="${T - fh - 8}" fill="#5eb0ff" opacity="0.45" rx="1"/>` +
    `<rect x="${fw + 4}" y="4" width="${S - fw - 8}" height="${Math.round(T * 0.28)}" fill="${accent}" opacity="0.35" rx="1"/>` +
    `<text x="${S / 2}" y="${T / 2 + 2}" text-anchor="middle" fill="#fff" font-size="7" font-family="sans-serif">${cell} ${algo}</text></svg>`;
}

interface CellSpec {
  cellName: string;
  transistors: number;
  def: [wNm: number, util: number, rStatus: string, rtSec: number];
  agg: [wNm: number, util: number, rStatus: string, rtSec: number];
  suffix: string;
  netlist: string;
}

const CELL_SPECS: CellSpec[] = [
  { cellName:"INVX1",  transistors:2,  def:[1200,0.74,"routed",12.4], agg:[1100,0.81,"routed",18.7], suffix:"inverter", netlist:"2 transistors, INVX1 standard cell" },
  { cellName:"INVX2",  transistors:4,  def:[1600,0.71,"routed",14.1], agg:[1450,0.78,"routed",21.3], suffix:"inverter (2x drive)", netlist:"4 transistors, INVX2 standard cell" },
  { cellName:"NAND2X1",transistors:4,  def:[1800,0.69,"routed",15.8], agg:[1680,0.76,"routed",23.5], suffix:"2-input NAND", netlist:"4 transistors, NAND2X1 standard cell" },
  { cellName:"NOR2X1", transistors:4,  def:[1800,0.68,"routed",15.2], agg:[1700,0.75,"routed",22.9], suffix:"2-input NOR", netlist:"4 transistors, NOR2X1 standard cell" },
  { cellName:"AND2X1", transistors:6,  def:[2400,0.72,"routed",18.6], agg:[2200,0.79,"routed",27.4], suffix:"2-input AND", netlist:"6 transistors, AND2X1 standard cell" },
  { cellName:"MX2X1",  transistors:10, def:[3200,0.65,"routed",22.3], agg:[3000,0.72,"routed",33.1], suffix:"2:1 MUX", netlist:"10 transistors, MX2X1 standard cell" },
  { cellName:"DFFX1",  transistors:18, def:[4800,0.62,"routed",35.7], agg:[4500,0.68,"routed",52.4], suffix:"D flip-flop", netlist:"18 transistors, DFFX1 standard cell" },
  { cellName:"BUFX1",  transistors:4,  def:[1800,0.70,"routed",14.9], agg:[1680,0.77,"routed",22.1], suffix:"buffer", netlist:"4 transistors, BUFX1 standard cell" },
  { cellName:"XNOR2X1",transistors:8,  def:[2800,0.66,"routed",20.4], agg:[2600,0.73,"routed",30.2], suffix:"2-input XNOR", netlist:"8 transistors, XNOR2X1 standard cell" },
  { cellName:"AOI22X1",transistors:8,  def:[2200,0.67,"routed",19.1], agg:[2050,0.74,"routed",28.5], suffix:"AND-OR-invert 2x2", netlist:"8 transistors, AOI22X1 standard cell" },
  { cellName:"OAI22X1",transistors:8,  def:[2200,0.67,"routed",19.4], agg:[2050,0.74,"routed",28.9], suffix:"OR-AND-invert 2x2", netlist:"8 transistors, OAI22X1 standard cell" },
  { cellName:"MUX2X1", transistors:12, def:[3400,0.64,"routed",24.1], agg:[3200,0.71,"routed",35.8], suffix:"2-input MUX (TG)", netlist:"12 transistors, MUX2X1 standard cell" },
  { cellName:"HAX1",   transistors:14, def:[4000,0.63,"routed",28.6], agg:[3700,0.70,"routed",42.3], suffix:"half adder", netlist:"14 transistors, HAX1 standard cell" },
  { cellName:"FAX1",   transistors:24, def:[6000,0.60,"routed",42.0], agg:[5700,0.66,"routed",61.5], suffix:"full adder", netlist:"24 transistors, FAX1 standard cell" },
];

function buildLayoutData(spec: CellSpec, algoId: string): LayoutData {
  const [wNm, ut, rStatus, rtSec] = algoId === "default" ? spec.def : spec.agg;
  const hNm = 2720;
  return {
    exists: true as const, cellName: spec.cellName, algorithmId: algoId,
    widthNm: wNm, heightNm: hNm, areaUm2: +(wNm * hNm / 1e6).toFixed(2),
    utilization: ut, transistorCount: spec.transistors, trackCount: 12,
    routingStatus: rStatus, runtimeSec: rtSec,
    layoutPreviewSvg: layoutPlaceholderSvg(spec.cellName, algoId, wNm, hNm, ut),
    layoutPng: null,
    rules: { minWidthNm: 130, minSpacingNm: 140, metalLayers: 5 },
    configSummary: `AutoCellGen-V2 / CFET / 12-track / ${spec.suffix}`,
    netlistSummary: spec.netlist,
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Parasitics helpers                                                 */
/* ═══════════════════════════════════════════════════════════════════ */

interface MaxwellInput { labels: string[]; matrix: number[][]; }

const PEX_INVX1_DEF: MaxwellInput = { labels:["A","Y","VDD","VSS"], matrix:[[0.53,0.12,0.06,0.05],[0.12,0.90,0.08,0.07],[0.06,0.08,1.19,0.10],[0.05,0.07,0.10,1.20]] };
const PEX_INVX1_AGG: MaxwellInput = { labels:["A","Y","VDD","VSS"], matrix:[[0.49,0.14,0.05,0.04],[0.14,0.85,0.09,0.06],[0.05,0.09,1.22,0.11],[0.04,0.06,0.11,1.18]] };
const PEX_NAND2_DEF: MaxwellInput = { labels:["A","B","Y","VDD","VSS"], matrix:[[0.48,0.15,0.10,0.05,0.04],[0.15,0.53,0.18,0.06,0.05],[0.10,0.18,1.62,0.09,0.08],[0.05,0.06,0.09,2.14,0.12],[0.04,0.05,0.08,0.12,2.08]] };
const PEX_NAND2_AGG: MaxwellInput = { labels:["A","B","Y","VDD","VSS"], matrix:[[0.44,0.17,0.11,0.04,0.03],[0.17,0.49,0.20,0.05,0.04],[0.11,0.20,1.58,0.10,0.09],[0.04,0.05,0.10,2.18,0.13],[0.03,0.04,0.09,0.13,2.12]] };
const PEX_AND2_DEF: MaxwellInput = { labels:["A","B","Y","VDD","VSS"], matrix:[[0.62,0.18,0.08,0.06,0.05],[0.18,0.68,0.12,0.07,0.06],[0.08,0.12,2.10,0.11,0.10],[0.06,0.07,0.11,2.88,0.14],[0.05,0.06,0.10,0.14,2.82]] };
const PEX_AND2_AGG: MaxwellInput = { labels:["A","B","Y","VDD","VSS"], matrix:[[0.58,0.20,0.09,0.05,0.04],[0.20,0.63,0.14,0.06,0.05],[0.09,0.14,2.04,0.12,0.11],[0.05,0.06,0.12,2.92,0.15],[0.04,0.05,0.11,0.15,2.86]] };
const PEX_DFFX1_DEF: MaxwellInput = { labels:["D","CLK","Q","VDD","VSS"], matrix:[[0.72,0.21,0.09,0.07,0.06],[0.21,0.88,0.15,0.08,0.07],[0.09,0.15,1.95,0.12,0.11],[0.07,0.08,0.12,2.92,0.16],[0.06,0.07,0.11,0.16,2.88]] };
const PEX_DFFX1_AGG: MaxwellInput = { labels:["D","CLK","Q","VDD","VSS"], matrix:[[0.68,0.23,0.10,0.06,0.05],[0.23,0.83,0.17,0.07,0.06],[0.10,0.17,1.89,0.13,0.12],[0.06,0.07,0.13,2.96,0.17],[0.05,0.06,0.12,0.17,2.92]] };

function buildParasitics(cell: string, algoId: string, mi: MaxwellInput): ParasiticsData {
  const { labels, matrix } = mi;
  const n = labels.length;
  const netCaps = labels.map((net, i) => {
    let cpl = 0;
    for (let j = 0; j < n; j++) if (j !== i) cpl += matrix[i][j];
    return { net, cTotalFF: +(matrix[i][i] + cpl).toFixed(2), couplingFF: +cpl.toFixed(2), cSubFF: +matrix[i][i].toFixed(2) };
  });
  const couplings: ParasiticsData["conductorCouplings"] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (matrix[i][j] > 0.01) couplings.push({ conductorFrom: labels[i], conductorTo: labels[j], capacitanceFF: +matrix[i][j].toFixed(3) });
  }
  couplings.sort((a, b) => b.capacitanceFF - a.capacitanceFF);
  const rowSums = labels.map((_, i) => { let s = 0; for (let j = 0; j < n; j++) s += matrix[i][j]; return s; });
  const rowSumMax = Math.max(...rowSums);
  let symError = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = Math.max(Math.abs(matrix[i][j]), Math.abs(matrix[j][i]), 1e-12);
    const e = Math.abs(matrix[i][j] - matrix[j][i]) / d;
    if (e > symError) symError = e;
  }
  let skewCnt = 0, totalOff = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    totalOff++;
    const d = Math.max(Math.abs(matrix[i][j]), Math.abs(matrix[j][i]), 1e-12);
    if (Math.abs(matrix[i][j] - matrix[j][i]) / d > 0.1) skewCnt++;
  }
  const qc: ParasiticsData["qualityChecks"] = [
    { check: "Row-sum max", value: +rowSumMax.toFixed(3), unit: "fF", pass: rowSumMax < 3.0 },
    { check: "Symmetry error (max)", value: +symError.toFixed(4), unit: "rel", pass: symError < 0.02 },
    { check: "Skew before sym (>10%)", value: +(totalOff > 0 ? skewCnt / totalOff : 0).toFixed(3), unit: "frac", pass: skewCnt === 0 },
  ];
  const netMap = labels.map((net, i) => ({ conductor: `c${i}`, net, layer: i < labels.length - 2 ? "M1" : "M1+VDD" }));
  const cdl = labels.slice(0, Math.min(labels.length, 4)).map(net => {
    const idx = labels.indexOf(net);
    const pi = +(matrix[idx][idx] * 0.7).toFixed(2);
    const coupled = labels.find((_l, j) => j !== idx && matrix[idx][j] > 0.05);
    return { net, piCapsFF: pi, coupledTo: coupled ?? "—" };
  });
  return { exists: true as const, cellName: cell, algorithmId: algoId, netCaps, maxwellMatrix: { conductorLabels: labels, matrixFF: matrix }, conductorCouplings: couplings, qualityChecks: qc, netMap, annotatedCdl: cdl };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Timing helpers                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function buildTiming(cell: string, algoId: string, dBase: number, sBase: number, capScale: number): TimingData {
  const slews = [20, 40, 60], loads = [2.0, 4.0, 8.0];
  const rows: TimingData["rows"] = [];
  for (const slew of slews) {
    for (const load of loads) {
      rows.push({
        inputTransitionPs: slew, outputLoadFF: load * capScale,
        delayPs: +(dBase + slew * 0.2 + load * 2.5 * capScale).toFixed(1),
        slewPs: +(sBase + slew * 0.3 + load * 3.0 * capScale).toFixed(1),
      });
    }
  }
  const geo = +Math.exp(rows.reduce((s, r) => s + Math.log(r.delayPs), 0) / rows.length).toFixed(1);
  return { exists: true as const, cellName: cell, algorithmId: algoId, rows, geomeanDelayPs: geo };
}

const TM: Record<string, [number, number, number]> = {
  INVX1:[10,18,1.00], INVX2:[12,20,0.95], NAND2X1:[16,24,1.00], NOR2X1:[18,26,1.05],
  AND2X1:[22,32,1.00], MX2X1:[28,38,1.02], DFFX1:[45,55,1.10], BUFX1:[14,22,0.98],
  XNOR2X1:[30,40,1.03], AOI22X1:[20,30,1.00], OAI22X1:[20,30,1.00],
  MUX2X1:[32,42,1.04], HAX1:[38,48,1.06], FAX1:[55,65,1.12],
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  DeviceOpt — Standalone CFET device optimisation                    */
/* ═══════════════════════════════════════════════════════════════════ */

function buildDeviceOptData(): DeviceOptData {
  const solutions: DeviceOptData["solutions"] = [
    { solutionId:"dopt_01", tinPs: 8.2,  tsPs: 12.1, toutPs: 18.4, tMaxPs: 22.5, reward: 0.92, parameters:{widthUm:0.24,lengthNm:130,fingers:1}, capacitanceFF:0.84, resistanceOhm:120, meta:"min-area",        paretoFront: true  },
    { solutionId:"dopt_02", tinPs: 9.5,  tsPs: 14.0, toutPs: 21.3, tMaxPs: 26.1, reward: 0.88, parameters:{widthUm:0.28,lengthNm:130,fingers:1}, capacitanceFF:0.97, resistanceOhm:105, meta:"area-eff.",       paretoFront: true  },
    { solutionId:"dopt_03", tinPs:11.2,  tsPs: 16.5, toutPs: 25.0, tMaxPs: 30.8, reward: 0.84, parameters:{widthUm:0.32,lengthNm:130,fingers:1}, capacitanceFF:1.12, resistanceOhm: 92, meta:"balanced",        paretoFront: true  },
    { solutionId:"dopt_04", tinPs:13.8,  tsPs: 19.4, toutPs: 29.8, tMaxPs: 36.0, reward: 0.79, parameters:{widthUm:0.40,lengthNm:130,fingers:2}, capacitanceFF:1.40, resistanceOhm: 78, meta:"balanced-perf",   paretoFront: true  },
    { solutionId:"dopt_05", tinPs:16.4,  tsPs: 22.3, toutPs: 34.5, tMaxPs: 41.2, reward: 0.73, parameters:{widthUm:0.48,lengthNm:180,fingers:2}, capacitanceFF:1.68, resistanceOhm: 65, meta:"performance",     paretoFront: true  },
    { solutionId:"dopt_06", tinPs:19.1,  tsPs: 25.8, toutPs: 39.7, tMaxPs: 47.5, reward: 0.67, parameters:{widthUm:0.56,lengthNm:180,fingers:2}, capacitanceFF:1.95, resistanceOhm: 54, meta:"perf-boost",       paretoFront: true  },
    { solutionId:"dopt_07", tinPs:14.5,  tsPs: 21.0, toutPs: 31.2, tMaxPs: 38.0, reward: 0.76, parameters:{widthUm:0.36,lengthNm:130,fingers:1}, capacitanceFF:1.25, resistanceOhm: 84, meta:"dominated-a",     paretoFront: false },
    { solutionId:"dopt_08", tinPs:18.0,  tsPs: 24.5, toutPs: 38.2, tMaxPs: 44.8, reward: 0.68, parameters:{widthUm:0.44,lengthNm:180,fingers:2}, capacitanceFF:1.55, resistanceOhm: 72, meta:"dominated-b",     paretoFront: false },
    { solutionId:"dopt_09", tinPs:20.5,  tsPs: 28.0, toutPs: 42.5, tMaxPs: 51.0, reward: 0.64, parameters:{widthUm:0.60,lengthNm:250,fingers:2}, capacitanceFF:2.10, resistanceOhm: 48, meta:"dominated-c",     paretoFront: false },
    { solutionId:"dopt_10", tinPs:22.0,  tsPs: 30.5, toutPs: 46.0, tMaxPs: 55.2, reward: 0.60, parameters:{widthUm:0.64,lengthNm:250,fingers:2}, capacitanceFF:2.28, resistanceOhm: 42, meta:"over-dimensioned", paretoFront: false },
    { solutionId:"dopt_11", tinPs: 6.5,  tsPs: 10.0, toutPs: 15.2, tMaxPs: 18.5, reward: 0.95, parameters:{widthUm:0.20,lengthNm:130,fingers:1}, capacitanceFF:0.72, resistanceOhm:142, meta:"ultra-compact",   paretoFront: false },
    { solutionId:"dopt_12", tinPs:24.8,  tsPs: 34.1, toutPs: 51.3, tMaxPs: 60.6, reward: 0.55, parameters:{widthUm:0.72,lengthNm:250,fingers:4}, capacitanceFF:2.56, resistanceOhm: 36, meta:"max-drive",       paretoFront: false },
  ];
  return { exists: true as const, cellName: "CFET-NMOS-PMOS", solutions };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Build per-algorithm cell results                                   */
/* ═══════════════════════════════════════════════════════════════════ */

function buildAlgoCellResult(cell: string, aid: string, lay: LayoutData|null, pex: ParasiticsData|null, tim: TimingData|null, failed: boolean, stage: string|null, err: string|null): AlgorithmCellResult {
  const arts: Artifact[] = [];
  if (lay) {
    arts.push({ name:`${cell}.gds`, relPath:`${cell}/${aid}/layout/${cell}.gds`, size:"12.4 KB",  toolKey:"AutoCellGen-V2", timestamp:"2026-07-06 09:00", status:"ready" });
    arts.push({ name:`${cell}.cdl`, relPath:`${cell}/${aid}/layout/${cell}.cdl`, size:"2.1 KB",    toolKey:"AutoCellGen-V2", timestamp:"2026-07-06 09:00", status:"ready" });
  }
  if (pex) {
    arts.push({ name:`${cell}_pex.cdl`,   relPath:`${cell}/${aid}/pex/${cell}_pex.cdl`,   size:"4.7 KB", toolKey:"fastercap_v2", timestamp:"2026-07-06 09:02", status:"ready" });
    arts.push({ name:`${cell}_maxwell.m`, relPath:`${cell}/${aid}/pex/${cell}_maxwell.m`, size:"0.9 KB", toolKey:"fastercap_v2", timestamp:"2026-07-06 09:02", status:"ready" });
  }
  if (tim) {
    arts.push({ name:`${cell}.lib`,       relPath:`${cell}/${aid}/timing/${cell}.lib`,       size:"18.2 KB", toolKey:"libcharx", timestamp:"2026-07-06 09:05", status:"ready" });
    arts.push({ name:`${cell}_nldm.json`, relPath:`${cell}/${aid}/timing/${cell}_nldm.json`, size:"6.3 KB",  toolKey:"libcharx", timestamp:"2026-07-06 09:05", status:"ready" });
  }
  return { algorithmId: aid, status: failed ? "failed" : "completed", layout: lay, parasitics: pex, timing: tim, artifacts: arts, failedStage: stage, errorSummary: err };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Build library-level summaries                                      */
/* ═══════════════════════════════════════════════════════════════════ */

function buildSummaries(cellResults: CellBenchmarkResult[]): LibraryAlgorithmSummary[] {
  return ALGORITHMS.map(algo => {
    const results = cellResults.map(cr => cr.algorithmResults.find(r => r.algorithmId === algo.algorithmId)).filter(Boolean) as AlgorithmCellResult[];
    const done = results.filter(r => r.status === "completed");
    const sr = results.length > 0 ? +(done.length / results.length).toFixed(3) : 0;
    const area = done.reduce((s, r) => s + (r.layout?.areaUm2 ?? 0), 0);
    const timCells = done.filter(r => r.timing);
    const geo = timCells.length > 0 ? +Math.exp(timCells.reduce((s, r) => s + Math.log(r.timing!.geomeanDelayPs), 0) / timCells.length).toFixed(1) : 0;
    const pexCells = done.filter(r => r.parasitics);
    const avgCap = pexCells.length > 0 ? pexCells.reduce((s, r) => s + (r.parasitics!.netCaps.reduce((a, b) => a + b.cTotalFF, 0) / r.parasitics!.netCaps.length), 0) / pexCells.length : 0;
    const rt = done.reduce((s, r) => s + (r.layout?.runtimeSec ?? 0), 0);
    return {
      algorithmId: algo.algorithmId, totalCells: results.length, completedCells: done.length,
      successRate: sr, totalAreaUm2: +area.toFixed(2), geomeanDelayPs: geo,
      avgOutputCapFF: +avgCap.toFixed(2), totalRuntimeSec: +rt.toFixed(1),
      drcCleanCells: done.length, lvsCleanCells: Math.max(0, done.length - 1),
      pexCompletedCells: pexCells.length, timingCompletedCells: timCells.length,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Build the full benchmark                                           */
/* ═══════════════════════════════════════════════════════════════════ */

function buildBenchmark(): LibraryBenchmark {
  const stages: StageInfo[] = [
    { id:"netlist", name:"Netlist / Config",        tool:"layout2timing_flow", status:"done", duration:"0m 30s", order:0 },
    { id:"layout",  name:"Layout Generation",        tool:"AutoCellGen-V2",    status:"done", duration:"2m 14s", order:1 },
    { id:"pex",     name:"Parasitic Extraction",     tool:"fastercap_v2",      status:"done", duration:"1m 08s", order:2 },
    { id:"timing",  name:"Timing Characterization",  tool:"libcharx",          status:"done", duration:"3m 42s", order:3 },
  ];

  const deviceOpt = buildDeviceOptData();

  const cellResults: CellBenchmarkResult[] = CELL_SPECS.map(spec => {
    const algoResults: AlgorithmCellResult[] = ALGORITHMS.map(algo => {
      const aid = algo.algorithmId;
      let failed = false, fStage: string|null = null, fMsg: string|null = null;
      if (aid === "aggressive") {
        if (spec.cellName === "FAX1")  { failed = true; fStage = "layout"; fMsg = "Routing congestion > 95%; abort."; }
        if (spec.cellName === "HAX1")  { failed = true; fStage = "pex";    fMsg = "Maxwell matrix condition number > 1e12."; }
        if (spec.cellName === "MUX2X1"){ failed = true; fStage = "timing"; fMsg = "Timing arc missing for transmission-gate path."; }
      }
      if (failed) return buildAlgoCellResult(spec.cellName, aid, null, null, null, true, fStage, fMsg);

      const lay = buildLayoutData(spec, aid);
      const pexInputs: Record<string, {def: MaxwellInput; agg: MaxwellInput}> = {
        INVX1:{def:PEX_INVX1_DEF,agg:PEX_INVX1_AGG}, NAND2X1:{def:PEX_NAND2_DEF,agg:PEX_NAND2_AGG},
        AND2X1:{def:PEX_AND2_DEF,agg:PEX_AND2_AGG}, DFFX1:{def:PEX_DFFX1_DEF,agg:PEX_DFFX1_AGG},
      };
      const mi = pexInputs[spec.cellName];
      const pex = mi ? buildParasitics(spec.cellName, aid, aid === "default" ? mi.def : mi.agg) : null;

      const tb = TM[spec.cellName];
      const scale = aid === "aggressive" ? 0.92 : 1.0;
      const tim = tb ? buildTiming(spec.cellName, aid, tb[0] * scale, tb[1] * scale, tb[2]) : null;

      return buildAlgoCellResult(spec.cellName, aid, lay, pex, tim, false, null, null);
    });
    return { cellName: spec.cellName, algorithmResults: algoResults };
  });

  const summaries = buildSummaries(cellResults);
  const devArts: Artifact[] = deviceOpt.solutions.map(s => ({ name:`${s.solutionId}.json`, relPath:`deviceopt/${s.solutionId}.json`, size:"0.5 KB", toolKey:"DeviceOpt", timestamp:"2026-07-06 10:00", status:"ready" as const }));

  return {
    id: "cfet_lib_v1",
    name: "CFET Standard-Cell Library Benchmark",
    technology: "CFET 7nm",
    libraryName: "ICRD-CFET Standard-Cell Library",
    cellCount: CELL_SPECS.length,
    algorithms: ALGORITHMS,
    cellResults,
    summaries,
    orchestratorConfig: { designKit: "ICRD-CFET", technology: "CFET 7nm", voltageV: 0.75, trackHeight: 12, cellHeightNm: 2720 },
    stages,
    artifacts: [
      { name:"flow_manifest.json", relPath:"benchmark/flow_manifest.json", size:"1.2 KB", toolKey:"layout2timing_flow", timestamp:"2026-07-06 09:00", status:"ready" },
      { name:"technology.cfet",    relPath:"benchmark/technology.cfet",    size:"0.8 KB", toolKey:"layout2timing_flow", timestamp:"2026-07-06 08:59", status:"ready" },
      ...devArts,
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Exported benchmark                                                 */
/* ═══════════════════════════════════════════════════════════════════ */

export const DEMO_BENCHMARK: LibraryBenchmark = buildBenchmark();

export const DEMO_DEVICE_OPT: DeviceOptData = buildDeviceOptData();
