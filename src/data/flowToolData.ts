/* ------------------------------------------------------------------ */
/*  Flow-tool data types and example data for the ToolFlowPage        */
/* ------------------------------------------------------------------ */

/* ─── Run / Case selector ─── */
export interface SimpleRun {
  id: string;
  label: string;
  status: "completed" | "running" | "pending" | "failed";
  createdAt: string;
}

export const FLOW_RUNS: SimpleRun[] = [
  { id: "run_005", label: "Run 005 — Sky130 @ 1.8V, TT", status: "completed", createdAt: "2026-07-04" },
  { id: "run_004", label: "Run 004 — Sky130 @ 1.8V, SS", status: "completed", createdAt: "2026-07-03" },
  { id: "run_003", label: "Run 003 — Sky130 @ 1.8V, FF", status: "completed", createdAt: "2026-07-02" },
  { id: "run_002", label: "Run 002 — Sky130 @ 3.3V, TT", status: "completed", createdAt: "2026-07-01" },
  { id: "run_001", label: "Run 001 — Sky130 @ 3.3V, SS", status: "completed", createdAt: "2026-06-28" },
];

export const FLOW_CASES = [
  "AND2X1", "AND2X2", "OR2X1", "NAND2X1", "NOR2X1",
  "INVX1",  "INVX2",  "BUFX1", "BUFX2",   "MX2X1",
  "DFFQ_X1", "DFFQ_X2",
];

/* ─── Stage timeline ─── */
export interface StageInfo {
  id: string;
  name: string;
  tool: string;
  status: "done" | "running" | "pending" | "error";
  duration: string;
  order: number;
}

export const CURRENT_STAGES: StageInfo[] = [
  { id: "layout",   name: "Layout Generation",    tool: "AutoCellGen-V2",  status: "done",    duration: "2m 14s", order: 1 },
  { id: "pex",      name: "Parasitic Extraction", tool: "fastercap_v2",    status: "done",    duration: "1m 08s", order: 2 },
  { id: "timing",   name: "Timing Characterization", tool: "libcharx",     status: "done",    duration: "3m 42s", order: 3 },
  { id: "optimize", name: "Device Optimization",  tool: "DeviceOpt",       status: "done",    duration: "4m 15s", order: 4 },
];

/* ─── AutoCellGen layout metrics ─── */
export interface LayoutCellMetric {
  cellName: string;
  widthNm: number;
  heightNm: number;
  areaUm2: number;
  utilization: number;
  transistorCount: number;
}

export const LAYOUT_METRICS: LayoutCellMetric[] = [
  { cellName: "INVX1",  widthNm: 1200, heightNm: 2720, areaUm2: 3.26, utilization: 0.74, transistorCount: 2 },
  { cellName: "INVX2",  widthNm: 1600, heightNm: 2720, areaUm2: 4.35, utilization: 0.71, transistorCount: 4 },
  { cellName: "NAND2X1",widthNm: 1800, heightNm: 2720, areaUm2: 4.90, utilization: 0.69, transistorCount: 4 },
  { cellName: "NOR2X1", widthNm: 1800, heightNm: 2720, areaUm2: 4.90, utilization: 0.68, transistorCount: 4 },
  { cellName: "AND2X1", widthNm: 2400, heightNm: 2720, areaUm2: 6.53, utilization: 0.72, transistorCount: 6 },
  { cellName: "OR2X1",  widthNm: 2400, heightNm: 2720, areaUm2: 6.53, utilization: 0.70, transistorCount: 6 },
  { cellName: "BUFX1",  widthNm: 2000, heightNm: 2720, areaUm2: 5.44, utilization: 0.73, transistorCount: 4 },
  { cellName: "MX2X1",  widthNm: 3200, heightNm: 2720, areaUm2: 8.70, utilization: 0.65, transistorCount: 10 },
];

/* ─── fastercap_v2 capacitance results ─── */
export interface PexNetCap {
  net: string;
  cTotalFF: number;
  couplingFF: number;
  cSubFF: number;
}

export const PEX_RESULTS: PexNetCap[] = [
  { net: "A",       cTotalFF: 0.84,  couplingFF: 0.31, cSubFF: 0.53 },
  { net: "B",       cTotalFF: 0.91,  couplingFF: 0.38, cSubFF: 0.53 },
  { net: "Y",       cTotalFF: 1.62,  couplingFF: 0.72, cSubFF: 0.90 },
  { net: "VDD",     cTotalFF: 2.14,  couplingFF: 0.95, cSubFF: 1.19 },
  { net: "VSS",     cTotalFF: 2.08,  couplingFF: 0.88, cSubFF: 1.20 },
  { net: "CLK",     cTotalFF: 1.45,  couplingFF: 0.61, cSubFF: 0.84 },
  { net: "D",       cTotalFF: 0.76,  couplingFF: 0.28, cSubFF: 0.48 },
  { net: "Q",       cTotalFF: 1.87,  couplingFF: 0.81, cSubFF: 1.06 },
];

/* ─── libcharx timing results ─── */
export interface TimingChar {
  cell: string;
  inputTransitionPs: number;
  outputLoadFF: number;
  delayPs: number;
  slewPs: number;
}

export const TIMING_CHARS: TimingChar[] = [
  { cell: "INVX1",  inputTransitionPs: 20,  outputLoadFF: 2.0, delayPs: 18.2,  slewPs: 25.1 },
  { cell: "INVX1",  inputTransitionPs: 40,  outputLoadFF: 2.0, delayPs: 22.5,  slewPs: 30.4 },
  { cell: "INVX1",  inputTransitionPs: 60,  outputLoadFF: 2.0, delayPs: 28.1,  slewPs: 37.2 },
  { cell: "INVX1",  inputTransitionPs: 20,  outputLoadFF: 4.0, delayPs: 24.6,  slewPs: 35.8 },
  { cell: "INVX1",  inputTransitionPs: 40,  outputLoadFF: 4.0, delayPs: 30.3,  slewPs: 42.5 },
  { cell: "INVX1",  inputTransitionPs: 60,  outputLoadFF: 4.0, delayPs: 37.1,  slewPs: 51.0 },
  { cell: "INVX1",  inputTransitionPs: 20,  outputLoadFF: 8.0, delayPs: 33.5,  slewPs: 50.2 },
  { cell: "INVX1",  inputTransitionPs: 40,  outputLoadFF: 8.0, delayPs: 40.8,  slewPs: 58.9 },
  { cell: "INVX1",  inputTransitionPs: 60,  outputLoadFF: 8.0, delayPs: 49.6,  slewPs: 69.3 },
  { cell: "NAND2X1",inputTransitionPs: 20,  outputLoadFF: 2.0, delayPs: 25.4,  slewPs: 32.0 },
  { cell: "NAND2X1",inputTransitionPs: 40,  outputLoadFF: 2.0, delayPs: 31.2,  slewPs: 38.7 },
  { cell: "NAND2X1",inputTransitionPs: 60,  outputLoadFF: 2.0, delayPs: 38.5,  slewPs: 47.3 },
  { cell: "NAND2X1",inputTransitionPs: 20,  outputLoadFF: 4.0, delayPs: 33.1,  slewPs: 44.2 },
  { cell: "NAND2X1",inputTransitionPs: 40,  outputLoadFF: 4.0, delayPs: 40.4,  slewPs: 52.8 },
  { cell: "NAND2X1",inputTransitionPs: 60,  outputLoadFF: 4.0, delayPs: 49.0,  slewPs: 62.5 },
];

/* ─── DeviceOpt Pareto data ─── */
export interface DeviceOptPoint {
  widthUm: number;
  lengthNm: number;
  areaUm2: number;
  delayPs: number;
  powerUW: number;
  paretoFront: boolean;
}

function randPareto(n: number): DeviceOptPoint[] {
  const pts: DeviceOptPoint[] = [];
  for (let i = 0; i < n; i++) {
    const w = 0.2 + Math.random() * 3.8;
    const l = 130 + Math.round(Math.random() * 120);
    const area = w * (l / 1000);
    const delay = 5 + area * 1.5 + Math.random() * 8;
    const power = 0.5 + area * 0.3 + Math.random() * 2;
    pts.push({ widthUm: +w.toFixed(2), lengthNm: l, areaUm2: +area.toFixed(3), delayPs: +delay.toFixed(1), powerUW: +power.toFixed(2), paretoFront: false });
  }
  pts.sort((a, b) => a.areaUm2 - b.areaUm2);
  // Mark Pareto front (min delay for area / min power for area — simplified)
  let bestDelay = Infinity;
  for (const p of pts) {
    if (p.delayPs < bestDelay) {
      bestDelay = p.delayPs;
      p.paretoFront = true;
    }
  }
  return pts;
}

export const DEVICE_OPT_POINTS: DeviceOptPoint[] = randPareto(30);

/* ─── Artifact table ─── */
export interface FlowArtifact {
  name: string;
  path: string;
  size: string;
  tool: string;
  timestamp: string;
  status: "ready" | "pending" | "error";
}

export const FLOW_ARTIFACTS: FlowArtifact[] = [
  { name: "AND2X1.gds",         path: "run_005/layout/AND2X1.gds",        size: "12.4 KB",  tool: "AutoCellGen-V2", timestamp: "2026-07-05 14:32", status: "ready" },
  { name: "AND2X1.cdl",         path: "run_005/layout/AND2X1.cdl",        size: "2.1 KB",   tool: "AutoCellGen-V2", timestamp: "2026-07-05 14:32", status: "ready" },
  { name: "AND2X1_pex.cdl",     path: "run_005/pex/AND2X1_pex.cdl",      size: "4.7 KB",   tool: "fastercap_v2",   timestamp: "2026-07-05 14:38", status: "ready" },
  { name: "AND2X1_pex.scs",     path: "run_005/pex/AND2X1_pex.scs",      size: "8.3 KB",   tool: "fastercap_v2",   timestamp: "2026-07-05 14:38", status: "ready" },
  { name: "AND2X1_maxwell.m",   path: "run_005/pex/AND2X1_maxwell.m",    size: "0.9 KB",   tool: "fastercap_v2",   timestamp: "2026-07-05 14:38", status: "ready" },
  { name: "AND2X1.lib",         path: "run_005/timing/AND2X1.lib",        size: "28.6 KB",  tool: "libcharx",       timestamp: "2026-07-05 14:42", status: "ready" },
  { name: "AND2X1_opt.json",    path: "run_005/optimize/AND2X1_opt.json", size: "3.2 KB",   tool: "DeviceOpt",      timestamp: "2026-07-05 14:47", status: "ready" },
  { name: "INVX1.gds",          path: "run_005/layout/INVX1.gds",         size: "8.1 KB",   tool: "AutoCellGen-V2", timestamp: "2026-07-05 14:30", status: "ready" },
  { name: "INVX1.cdl",          path: "run_005/layout/INVX1.cdl",         size: "1.3 KB",   tool: "AutoCellGen-V2", timestamp: "2026-07-05 14:30", status: "ready" },
  { name: "INVX1_pex.cdl",      path: "run_005/pex/INVX1_pex.cdl",        size: "3.0 KB",   tool: "fastercap_v2",   timestamp: "2026-07-05 14:35", status: "ready" },
  { name: "INVX1.lib",          path: "run_005/timing/INVX1.lib",         size: "18.2 KB",  tool: "libcharx",       timestamp: "2026-07-05 14:42", status: "ready" },
  { name: "INVX1_opt.json",     path: "run_005/optimize/INVX1_opt.json",  size: "2.1 KB",   tool: "DeviceOpt",      timestamp: "2026-07-05 14:47", status: "ready" },
];
