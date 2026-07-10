/* ================================================================== */
/*  Demo data for the /flow CFET Library Benchmark Dashboard            */
/*  All data is deterministic synthetic (not real ICRD-CFET).           */
/*  No Math.random() — everything is explicit.                          */
/* ================================================================== */

import {
  type LibraryBenchmarkManifest,
  type LibraryBenchmark,
  type LayoutRoutingAlgorithm,
  type CellBenchmarkResult,
  type AlgorithmCellResult,
  type LibraryAlgorithmSummary,
  type StageInfo,
  type TechnologyRules,
  type AutoCellGenConfig,
  type LayoutData,
  type ParasiticsData,
  type TimingData,
  type DeviceOptData,
  type Artifact,
  type CellClass,
  buildNonDominatedPareto,
  DEMO_PROVENANCE_LABEL,
} from "./toolFlowTypes";

/* ═══════════════════════════════════════════════════════════════════ */
/*  Technology & Rules — asap7_cfet                                    */
/*  Values are in grid units, not nm.  Explicitly marked as demo.      */
/* ═══════════════════════════════════════════════════════════════════ */

const ASAP7_CFET_RULES: TechnologyRules = {
  node: "asap7_cfet",
  metalLayers: 10,
  trackCount: 8,
  cellHeightRows: 6,
  bpr: 4,
  rowStructure: "double",
  minWidth: 4,
  minSpacing: 2,
  m1Pitch: 6,
  m2Pitch: 7,
  voltageV: 0.75,
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  AutoCellGen-V2 configs                                              */
/* ═══════════════════════════════════════════════════════════════════ */

const BASELINE_CONFIG: AutoCellGenConfig = {
  folding_style: "straight",
  logical_partition: true,
  branch_bound: 4,
  refine_sol: 2,
  remove_sym: true,
  remove_dom: true,
  route_solutions: 8,
  route_accept: 0.95,
  min_m1: 3,
  min_m2: 3,
  min_m3: 4,
  m1_dir: "H",
  m2_dir: "V",
  fm_optimization: true,
};

const AGGRESSIVE_CONFIG: AutoCellGenConfig = {
  folding_style: "snake",
  logical_partition: false,
  branch_bound: 2,
  refine_sol: 1,
  remove_sym: false,
  remove_dom: false,
  route_solutions: 16,
  route_accept: 0.90,
  min_m1: 2,
  min_m2: 2,
  min_m3: 3,
  m1_dir: "H",
  m2_dir: "V",
  fm_optimization: false,
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Algorithms                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

const ALGO_BASELINE: LayoutRoutingAlgorithm = {
  algorithmId: "algo_default",
  algorithmName: "Default Flow",
  comparisonKind: "algorithm",
  description: "Baseline AutoCellGen-V2: folding=straight, LP enabled, FM opt on, BB=4, RS=8",
  config: BASELINE_CONFIG,
};

const ALGO_AGGRESSIVE: LayoutRoutingAlgorithm = {
  algorithmId: "algo_aggressive",
  algorithmName: "Aggressive P&R",
  comparisonKind: "algorithm",
  description: "Aggressive: folding=snake, LP disabled, FM opt off, BB=2, RS=16, tighter pitches",
  config: AGGRESSIVE_CONFIG,
};

const ALGORITHMS = [ALGO_BASELINE, ALGO_AGGRESSIVE];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Cell roster                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

interface CellRosterEntry {
  name: string;
  cellClass: CellClass;
  transistors: number;
}

const CELL_ROSTER: CellRosterEntry[] = [
  { name: "INVX1",     cellClass: "inverter_buffer", transistors: 2 },
  { name: "INVX2",     cellClass: "inverter_buffer", transistors: 4 },
  { name: "BUFX1",     cellClass: "inverter_buffer", transistors: 4 },
  { name: "NAND2X1",   cellClass: "combinational",   transistors: 4 },
  { name: "NOR2X1",    cellClass: "combinational",   transistors: 4 },
  { name: "AND2X1",    cellClass: "combinational",   transistors: 6 },
  { name: "XNOR2X1",   cellClass: "combinational",   transistors: 8 },
  { name: "AOI22X1",   cellClass: "combinational",   transistors: 8 },
  { name: "OAI22X1",   cellClass: "combinational",   transistors: 8 },
  { name: "MUX2X1",    cellClass: "combinational",   transistors: 10 },
  { name: "MX2X1",     cellClass: "combinational",   transistors: 10 },
  { name: "HAX1",      cellClass: "arithmetic",      transistors: 14 },
  { name: "FAX1",      cellClass: "arithmetic",      transistors: 28 },
  { name: "DFFX1",     cellClass: "sequential",      transistors: 18 },
];

/* ─── Deterministic helpers ─── */

function deterministicWidth(cellName: string, t: number, m1: number): number {
  const base: Record<string, number> = {INVX1:4, INVX2:6, BUFX1:7, DFFX1:18, FAX1:28, HAX1:16, MUX2X1:16, MX2X1:14, XNOR2X1:14, AOI22X1:12, OAI22X1:12, NAND2X1:8, NOR2X1:8, AND2X1:10};
  return (base[cellName] ?? 8) + Math.ceil(t * 0.35) + m1;
}

function deterministicDelay(cellName: string): number {
  const map: Record<string, number> = {
    INVX1: 4.2, INVX2: 3.8, BUFX1: 6.1, NAND2X1: 5.4, NOR2X1: 6.0, AND2X1: 8.2,
    XNOR2X1: 12.0, AOI22X1: 7.3, OAI22X1: 7.8, MUX2X1: 10.5, MX2X1: 9.8,
    HAX1: 14.2, FAX1: 22.0, DFFX1: 18.5,
  };
  return map[cellName] ?? 10;
}

function deterministicOutputCap(cellName: string): number {
  const map: Record<string, number> = {
    INVX1: 0.6, INVX2: 1.2, BUFX1: 1.8, NAND2X1: 0.9, NOR2X1: 0.9, AND2X1: 1.5,
    XNOR2X1: 2.2, AOI22X1: 1.4, OAI22X1: 1.4, MUX2X1: 2.4, MX2X1: 2.0,
    HAX1: 2.8, FAX1: 4.2, DFFX1: 3.0,
  };
  return map[cellName] ?? 1.5;
}

function aggressiveDelta(name: string): { w: number; d: number; c: number } {
  const map: Record<string, { w: number; d: number; c: number }> = {
    INVX1:{w:-12,d:-2,c:5}, INVX2:{w:-10,d:-1,c:4}, BUFX1:{w:-8,d:3,c:6},
    NAND2X1:{w:-10,d:0,c:4}, NOR2X1:{w:-8,d:2,c:5}, AND2X1:{w:-6,d:4,c:6},
    XNOR2X1:{w:-5,d:6,c:7}, AOI22X1:{w:-7,d:3,c:5}, OAI22X1:{w:-7,d:4,c:5},
    MUX2X1:{w:-4,d:8,c:8}, MX2X1:{w:-5,d:5,c:6},
    HAX1:{w:-3,d:7,c:7}, FAX1:{w:-2,d:10,c:10}, DFFX1:{w:-4,d:6,c:8},
  };
  return map[name] ?? {w:-5,d:3,c:5};
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Layout builder                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

function svgPreview(cellName: string, w: number, h: number, isAgg: boolean): string {
  const col = isAgg ? "#ff9f0a" : "#30d158";
  return `<svg viewBox="0 0 ${w*10} ${h*10}" xmlns="http://www.w3.org/2000/svg"><rect width="${w*10}" height="${h*10}" fill="#f0f4f8" stroke="#94a3b8" stroke-width="2"/><rect x="4" y="4" width="${Math.round(w*10*0.7)-4}" height="${Math.round(h*10*0.5)-4}" fill="${col}" opacity="0.4" rx="2"/><text x="${w*5}" y="${h*5+3}" text-anchor="middle" font-family="monospace" font-size="10" fill="#334155">${cellName} ${isAgg?"Aggressive":"Baseline"} (placeholder)</text></svg>`;
}

function buildLayout(cellName: string, algoId: string, t: number, agg: boolean, cfg: AutoCellGenConfig): LayoutData {
  const w = agg ? Math.max(2, deterministicWidth(cellName, t, cfg.min_m1) + Math.round(deterministicWidth(cellName, t, cfg.min_m1) * aggressiveDelta(cellName).w / 100)) : deterministicWidth(cellName, t, cfg.min_m1);
  const h = ASAP7_CFET_RULES.cellHeightRows;
  return {
    exists: true, cellName, algorithmId: algoId,
    widthGrid: w, heightGrid: h, areaGrid2: w * h,
    utilization: +(agg ? 0.70 + t/100 : 0.60 + t/100).toFixed(3),
    transistorCount: t,
    routingStatus: "routed",
    runtimeSec: agg ? 8 + t*0.5 : 12 + t*0.7,
    layoutPreviewSvg: svgPreview(cellName, w, h, agg),
    previewType: "placeholder",
    layoutPng: null,
    rules: ASAP7_CFET_RULES,
    configSummary: `${cfg.folding_style} fold, LP=${cfg.logical_partition}, FM=${cfg.fm_optimization}`,
    netlistSummary: `${t} transistors`,
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Parasitics builder — proper Maxwell sign convention                  */
/*  Cii >= 0, Cij <= 0 for i != j                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function buildParasitics(cellName: string, algoId: string, t: number, agg: boolean): ParasiticsData {
  const outCap = deterministicOutputCap(cellName);
  const scale = agg ? 1 + aggressiveDelta(cellName).c/100 : 1;
  const nConductors = Math.min(6, 2 + Math.ceil(t/4));
  const labels = ["VDD","VSS","IN","OUT","INT1","INT2"].slice(0, nConductors);
  const matrix: number[][] = Array.from({length: nConductors}, () => Array(nConductors).fill(0));
  const couplings: {conductorFrom:string;conductorTo:string;capacitanceFF:number}[] = [];

  for (let i = 0; i < nConductors; i++) {
    matrix[i][i] = Math.max(0.01, +(outCap * (1 + i*0.2) * scale).toFixed(3));
    for (let j = i + 1; j < nConductors; j++) {
      const v = +(outCap * 0.15 * (1 / (1 + Math.abs(i-j))) * scale).toFixed(3);
      matrix[i][j] = -v;
      matrix[j][i] = -v;
      couplings.push({conductorFrom:labels[i], conductorTo:labels[j], capacitanceFF: v});
    }
  }

  const netCaps = labels.map((c, i) => ({
    net: c,
    cSelfFF: +matrix[i][i].toFixed(3),
    couplingFF: +matrix[i].reduce((s, v, j) => j!==i ? s+Math.abs(v) : s, 0).toFixed(3),
    rowSumFF: +matrix[i].reduce((s, v) => s+v, 0).toFixed(3),
  }));

  const netMap = labels.map((c, i) => ({
    conductor: c,
    net: i<2? (i===0?"VDD":"VSS") : i<4? (i===2?"IN":"OUT") : `NET${i-3}`,
    layer: i<2?"M1(power)":"M1(signal)",
  }));

  const annotatedCdl = labels.map((c, i) => {
    const coupled = couplings.filter(cp => cp.conductorFrom===c||cp.conductorTo===c).map(cp => cp.conductorFrom===c?cp.conductorTo:cp.conductorFrom);
    return { net: c, piCapsFF: +matrix[i][i].toFixed(3), coupledTo: coupled[0] ?? "—", hasRef: coupled.length>0 };
  });

  return {
    exists: true, cellName, algorithmId: algoId, netCaps,
    maxwellMatrix: { conductorLabels: labels, matrixFF: matrix },
    conductorCouplings: couplings,
    qualityChecks: [
      { check:"Diagonal positivity", value:1, unit:"pass", pass: matrix.every((r,i)=>r[i]>0) },
      { check:"Off-diagonal sign", value:1, unit:"pass", pass: matrix.every((r,i)=>r.every((v,j)=>i===j||v<=0)) },
      { check:"Symmetric matrix", value:1, unit:"pass", pass: matrix.every((r,i)=>r.every((v,j)=>Math.abs(v-matrix[j][i])<1e-9)) },
    ],
    netMap, annotatedCdl,
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Timing builder                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

function buildTiming(cellName: string, algoId: string, agg: boolean): TimingData {
  const baseDelay = deterministicDelay(cellName);
  const scale = agg ? 1 + aggressiveDelta(cellName).d/100 : 1;
  const slews = [10, 50, 150], loads = [1, 5, 25];
  const rows = [];
  for (const s of slews) {
    for (const lf of loads) {
      rows.push({
        inputTransitionPs: s, outputLoadFF: lf,
        delayPs: +((baseDelay + s*0.02 + lf*0.12) * scale).toFixed(2),
        slewPs: +((s * (1 + lf*0.02)) * scale).toFixed(1),
      });
    }
  }
  const logSum = rows.reduce((s, r) => s + Math.log(r.delayPs), 0);
  return { exists: true, cellName, algorithmId: algoId, rows, geomeanDelayPs: +Math.exp(logSum/rows.length).toFixed(2) };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Artifact builder                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function buildArtifacts(cellName: string, algoId: string, status: string): Artifact[] {
  if (status !== "completed") return [];
  const c0 = cellName.charCodeAt(0), c1 = cellName.charCodeAt(cellName.length-1);
  const pfx = `a1b2c3d${c0.toString(16)}${c1.toString(16)}`;
  return [
    { name:`${cellName}.gds`, relPath:`results/${algoId}/${cellName}/${cellName}.gds`, size:`${2+c0%8}KB`, toolKey:"AutoCellGen-V2", timestamp:"2026-07-09T14:22:00Z", status:"completed", stageId:"layout", algorithmId:algoId, cellName, hash:pfx+"gds", provenance:"deterministic-demo", visibility:"public", downloadUrl:null },
    { name:`${cellName}.pex`, relPath:`results/${algoId}/${cellName}/${cellName}.pex`, size:`${1+c1%6}KB`, toolKey:"fastercap_v2", timestamp:"2026-07-09T14:25:00Z", status:"completed", stageId:"pex", algorithmId:algoId, cellName, hash:pfx+"pex", provenance:"deterministic-demo", visibility:"internal", downloadUrl:null },
    { name:`${cellName}.lib`, relPath:`results/${algoId}/${cellName}/${cellName}.lib`, size:`${3+(c0+c1)%7}KB`, toolKey:"libcharx", timestamp:"2026-07-09T14:28:00Z", status:"completed", stageId:"timing", algorithmId:algoId, cellName, hash:pfx+"lib", provenance:"deterministic-demo", visibility:"public", downloadUrl:null },
  ];
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Per-algorithm cell result                                           */
/* ═══════════════════════════════════════════════════════════════════ */

function buildAlgoResult(entry: CellRosterEntry, algoId: string, agg: boolean, cfg: AutoCellGenConfig): AlgorithmCellResult {
  const {name, transistors: t} = entry;
  let failedStage: string|null = null, errorSummary: string|null = null, status: "completed"|"failed" = "completed";
  if (agg) {
    if (name==="FAX1") { status="failed"; failedStage="layout"; errorSummary="Cell too large for aggressive folding — routing congestion exceeded limit."; }
    else if (name==="HAX1") { status="failed"; failedStage="pex"; errorSummary="PEX: Maxwell solver failed to converge (residual > 1e-3 after 500 iterations)."; }
    else if (name==="MUX2X1") { status="failed"; failedStage="timing"; errorSummary="Timing: output slew exceeds 500ps limit for slow corner."; }
  }
  const layout = status==="failed"&&failedStage==="layout" ? null : buildLayout(name, algoId, t, agg, cfg);
  const pex = layout && !(agg&&name==="HAX1") ? buildParasitics(name, algoId, t, agg) : null;
  const timing = pex && !(agg&&name==="MUX2X1") ? buildTiming(name, algoId, agg) : null;
  return { algorithmId: algoId, status, layout, parasitics: pex, timing, artifacts: buildArtifacts(name, algoId, status), failedStage, errorSummary };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Cell benchmark results                                               */
/* ═══════════════════════════════════════════════════════════════════ */

function buildCellResults(): CellBenchmarkResult[] {
  return CELL_ROSTER.map(entry => ({
    cellName: entry.name,
    cellClass: entry.cellClass,
    transistorCount: entry.transistors,
    algorithmResults: [
      buildAlgoResult(entry, "algo_default", false, BASELINE_CONFIG),
      buildAlgoResult(entry, "algo_aggressive", true, AGGRESSIVE_CONFIG),
    ],
  }));
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Library summaries                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function buildSummary(cells: CellBenchmarkResult[], algoId: string): LibraryAlgorithmSummary {
  const allRes = cells.map(cr => cr.algorithmResults.find(r => r.algorithmId===algoId)).filter((r): r is AlgorithmCellResult => !!r);
  const done = allRes.filter(r => r.status==="completed");
  const doneLayout = allRes.filter(r => r.layout);
  const donePex = allRes.filter(r => r.parasitics);
  const doneTim = allRes.filter(r => r.timing);
  return {
    algorithmId: algoId,
    coverage: {
      totalCells: cells.length, completedCells: done.length,
      layoutCompleted: doneLayout.length, pexCompleted: donePex.length,
      timingCompleted: doneTim.length, drcClean: doneLayout.length, lvsClean: doneLayout.length,
    },
    totalAreaUm2: doneLayout.reduce((s,r) => s+(r.layout?.areaGrid2??0), 0),
    totalRuntimeSec: +done.reduce((s,r) => s+(r.layout?.runtimeSec??0)+(r.parasitics?15:0), 0).toFixed(1),
    commonCellCount: done.length,
    commonAreaUm2: doneLayout.reduce((s,r) => s+(r.layout?.areaGrid2??0), 0),
    commonGeomeanDelayPs: 0,
    commonAvgOutputCapFF: 0,
    commonRuntimeSec: 0,
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  DeviceOpt — CFET device optimisation, Pareto computed              */
/* ═══════════════════════════════════════════════════════════════════ */

function buildDeviceOpt(): DeviceOptData {
  const raw = [
    { Hsep:28, Tsp_drain:12, Hbot:18, Tsp_psource:10, Tsp_nsource:10, FP:24, GXT:5.0, gate_length:18, capacitanceFF:0.85, resistanceOhm:320, timingPs:5.2, powerUW:12.1 },
    { Hsep:32, Tsp_drain:10, Hbot:20, Tsp_psource:12, Tsp_nsource:12, FP:28, GXT:5.5, gate_length:18, capacitanceFF:0.72, resistanceOhm:295, timingPs:4.8, powerUW:10.5 },
    { Hsep:36, Tsp_drain:8,  Hbot:22, Tsp_psource:14, Tsp_nsource:14, FP:32, GXT:6.0, gate_length:20, capacitanceFF:0.61, resistanceOhm:270, timingPs:4.5, powerUW:9.2 },
    { Hsep:40, Tsp_drain:6,  Hbot:25, Tsp_psource:16, Tsp_nsource:16, FP:36, GXT:6.5, gate_length:20, capacitanceFF:0.52, resistanceOhm:250, timingPs:4.2, powerUW:8.0 },
    { Hsep:30, Tsp_drain:14, Hbot:16, Tsp_psource:8,  Tsp_nsource:8,  FP:20, GXT:4.5, gate_length:16, capacitanceFF:0.95, resistanceOhm:380, timingPs:6.8, powerUW:14.5 },
    { Hsep:34, Tsp_drain:10, Hbot:18, Tsp_psource:10, Tsp_nsource:10, FP:26, GXT:5.2, gate_length:18, capacitanceFF:0.78, resistanceOhm:310, timingPs:5.0, powerUW:11.0 },
    { Hsep:38, Tsp_drain:7,  Hbot:21, Tsp_psource:13, Tsp_nsource:13, FP:30, GXT:5.8, gate_length:19, capacitanceFF:0.58, resistanceOhm:260, timingPs:4.4, powerUW:8.8 },
    { Hsep:42, Tsp_drain:5,  Hbot:24, Tsp_psource:15, Tsp_nsource:15, FP:34, GXT:6.2, gate_length:20, capacitanceFF:0.48, resistanceOhm:240, timingPs:4.0, powerUW:7.5 },
    { Hsep:26, Tsp_drain:15, Hbot:15, Tsp_psource:7,  Tsp_nsource:7,  FP:18, GXT:4.2, gate_length:15, capacitanceFF:1.10, resistanceOhm:420, timingPs:7.5, powerUW:16.0 },
    { Hsep:35, Tsp_drain:9,  Hbot:19, Tsp_psource:11, Tsp_nsource:11, FP:27, GXT:5.4, gate_length:18, capacitanceFF:0.68, resistanceOhm:285, timingPs:4.7, powerUW:9.8 },
    { Hsep:39, Tsp_drain:6,  Hbot:23, Tsp_psource:14, Tsp_nsource:14, FP:33, GXT:6.3, gate_length:21, capacitanceFF:0.55, resistanceOhm:255, timingPs:4.3, powerUW:8.2 },
    { Hsep:44, Tsp_drain:4,  Hbot:26, Tsp_psource:17, Tsp_nsource:17, FP:38, GXT:6.8, gate_length:22, capacitanceFF:0.42, resistanceOhm:225, timingPs:3.8, powerUW:7.0 },
    { Hsep:27, Tsp_drain:13, Hbot:17, Tsp_psource:9,  Tsp_nsource:9,  FP:22, GXT:4.8, gate_length:17, capacitanceFF:0.90, resistanceOhm:350, timingPs:5.8, powerUW:13.2 },
    { Hsep:33, Tsp_drain:11, Hbot:20, Tsp_psource:12, Tsp_nsource:12, FP:28, GXT:5.6, gate_length:19, capacitanceFF:0.75, resistanceOhm:300, timingPs:4.9, powerUW:10.8 },
    { Hsep:37, Tsp_drain:7,  Hbot:22, Tsp_psource:12, Tsp_nsource:12, FP:29, GXT:5.7, gate_length:19, capacitanceFF:0.62, resistanceOhm:268, timingPs:4.5, powerUW:9.0 },
    { Hsep:41, Tsp_drain:5,  Hbot:25, Tsp_psource:16, Tsp_nsource:16, FP:35, GXT:6.4, gate_length:21, capacitanceFF:0.50, resistanceOhm:235, timingPs:4.0, powerUW:7.7 },
  ];
  const metas = ["Low-power","Balanced","Balanced","High-perf","Low-power","Balanced","High-perf","High-perf","Low-power","Balanced","High-perf","High-perf","Low-power","Balanced","High-perf","High-perf"];
  const solutions = raw.map((s,i) => ({
    ...s,
    solutionId: `sol_${String(i+1).padStart(2,"0")}`,
    reward: 0, meta: metas[i], paretoFront: false, rewardMode: "default",
  }));
  solutions.forEach(s => { s.reward = +(1/Math.cbrt(s.capacitanceFF*s.resistanceOhm*s.timingPs)).toFixed(6); });
  const pareto = buildNonDominatedPareto(solutions, [
    { key:"capacitanceFF", higherBetter:false }, { key:"resistanceOhm", higherBetter:false }, { key:"timingPs", higherBetter:false },
  ]);
  const pset = new Set(pareto.map(s=>s.solutionId));
  solutions.forEach(s => { if(pset.has(s.solutionId)) s.paretoFront = true; });
  return { exists: true, cellName: "CFET_NAND2X1", solutions };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Stages & top-level artifacts                                        */
/* ═══════════════════════════════════════════════════════════════════ */

const DEMO_STAGES: StageInfo[] = [
  { id:"auto_cell_gen", name:"AutoCellGen-V2", tool:"AutoCellGen-V2", status:"completed", duration:"48s", order:1 },
  { id:"pex",           name:"fastercap_v2",   tool:"fastercap_v2",   status:"completed", duration:"12s", order:2 },
  { id:"timing",        name:"libcharx",        tool:"libcharx",       status:"completed", duration:"28s", order:3 },
  { id:"device_opt",    name:"DeviceOpt",       tool:"DeviceOpt",       status:"completed", duration:"18s", order:4 },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Build the complete benchmark                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function buildBenchmark(): LibraryBenchmark {
  const cellResults = buildCellResults();
  const deviceOpt = buildDeviceOpt();
  const summaries = [buildSummary(cellResults, "algo_default"), buildSummary(cellResults, "algo_aggressive")];

  const devArts: Artifact[] = deviceOpt.solutions.map(s => ({
    name:`${s.solutionId}.json`, relPath:`deviceopt/${s.solutionId}.json`, size:`0.5KB`,
    toolKey:"DeviceOpt", timestamp:"2026-07-09T14:30:00Z", status:"completed",
    stageId:"device_opt", algorithmId:"common", cellName:"CFET_NAND2X1",
    hash:`dev${s.solutionId}`, provenance:"deterministic-demo", visibility:"public", downloadUrl:null,
  }));

  const manifestArts: Artifact[] = [
    { name:"flow_manifest.json", relPath:"benchmark/flow_manifest.json", size:"1.2KB", toolKey:"layout2timing_flow", timestamp:"2026-07-09T14:20:00Z", status:"completed", stageId:"manifest", algorithmId:"common", cellName:"benchmark", hash:"manifest01", provenance:"deterministic-demo", visibility:"public", downloadUrl:null },
    { name:"technology.cfet", relPath:"benchmark/technology.cfet", size:"0.8KB", toolKey:"layout2timing_flow", timestamp:"2026-07-09T14:20:00Z", status:"completed", stageId:"manifest", algorithmId:"common", cellName:"benchmark", hash:"tech001", provenance:"deterministic-demo", visibility:"internal", downloadUrl:null },
  ];

  return {
    id: "cfet_lib_v1", name: "CFET Standard-Cell Library Benchmark",
    technology: "CFET 7nm", libraryName: "ICRD-CFET Standard-Cell Library",
    cellCount: CELL_ROSTER.length,
    algorithms: ALGORITHMS,
    cellResults, summaries, technologyRules: ASAP7_CFET_RULES,
    stages: DEMO_STAGES,
    artifacts: [...manifestArts, ...devArts],
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Exported data                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

const DEMO_BENCHMARK = buildBenchmark();

export const DEMO_MANIFEST: LibraryBenchmarkManifest = {
  manifests: [{
    benchmarkId: "cfet_lib_v1",
    name: "CFET Standard-Cell Library Benchmark",
    technology: "asap7_cfet",
    cellSet: "14-cell ICRD-CFET subset",
    toolCommitSha: "abc123def",
    configHash: "cfg_baseline_001",
    rulesHash: "rules_asap7cfet_001",
    seed: 42,
    threads: 8,
    timeoutSec: 3600,
    host: "demo-cluster-01",
    generatedAt: "2026-07-09T14:20:00Z",
    dataSource: "deterministic-synthetic",
    visibility: "public",
    comparisonKind: "algorithm",
    isDemo: true,
    benchmark: DEMO_BENCHMARK,
  }],
};

export const DEMO_BENCHMARK_STANDALONE: LibraryBenchmark = DEMO_BENCHMARK;
export const DEMO_DEVICE_OPT: DeviceOptData = buildDeviceOpt();
export { DEMO_PROVENANCE_LABEL };
