/* ==================================================================
 *  benchmarkPlotCatalog.ts (goal2.md §6.6, §7)
 *
 *  Canonical comparisonKey / title assignments for benchmark plots.
 *  Used by selectors to pair baseline ↔ candidate plots.
 * ================================================================== */

import type { AnalysisDomain } from "../../compat/spiceWorkflow/contracts";

export interface PlotKeyEntry {
  comparisonKey: string;
  title: string;
  domain: AnalysisDomain;
}

/** Ordered plot catalog per domain (display order). */
export const PLOT_CATALOG: PlotKeyEntry[] = [
  // DC
  { comparisonKey: "iv-characteristics", title: "IV Characteristics", domain: "dc" },
  { comparisonKey: "kcl-verification", title: "KCL Verification", domain: "dc" },
  { comparisonKey: "temperature-analysis", title: "Temperature Analysis", domain: "dc" },
  { comparisonKey: "bias-sweep", title: "Bias Sweep", domain: "dc" },
  // Transient
  { comparisonKey: "large-signal-transient", title: "Large-Signal Transient", domain: "transient" },
  { comparisonKey: "switching-response", title: "Switching Response", domain: "transient" },
  { comparisonKey: "delay-effect", title: "Delay Effect", domain: "transient" },
  { comparisonKey: "power-dissipation", title: "Power Dissipation", domain: "transient" },
  { comparisonKey: "energy-consumption", title: "Energy Consumption", domain: "transient" },
  { comparisonKey: "quasi-static", title: "Quasi-Static Analysis", domain: "transient" },
  { comparisonKey: "quasi-static-iv", title: "Quasi-Static IV", domain: "transient" },
  { comparisonKey: "quasi-static-time", title: "Quasi-Static Time", domain: "transient" },
  { comparisonKey: "charge-conservation", title: "Charge Conservation", domain: "transient" },
  { comparisonKey: "total-charge", title: "Total Charge", domain: "transient" },
  // AC
  { comparisonKey: "cv-characteristics", title: "C-V Characteristics", domain: "ac" },
  { comparisonKey: "cv-components", title: "C-V Components", domain: "ac" },
  { comparisonKey: "cv-multifrequency", title: "Multi-Frequency C-V", domain: "ac" },
  { comparisonKey: "s-parameter", title: "S-Parameter Analysis", domain: "ac" },
  { comparisonKey: "nqs-effects", title: "Non-Quasi-Static Effects", domain: "ac" },
  // Noise
  { comparisonKey: "thermal-noise", title: "Thermal Noise", domain: "noise" },
  { comparisonKey: "flicker-noise", title: "Flicker Noise", domain: "noise" },
  { comparisonKey: "shot-noise", title: "Shot Noise", domain: "noise" },
  { comparisonKey: "noise-components", title: "Noise Components", domain: "noise" },
  { comparisonKey: "noise-temperature", title: "Noise vs Temperature", domain: "noise" },
  { comparisonKey: "noise-bias", title: "Noise vs Bias", domain: "noise" },
];

/** Canonicalize a filename or plot name to a comparisonKey. */
export function canonicalizeBenchmarkPlotKey(name: string, domain: AnalysisDomain): string {
  const n = name.toLowerCase()
    .replace(/\.[a-z]+$/, "")           // drop extension
    .replace(/_[a-f0-9]{8,}/, "")       // drop hash suffix
    .replace(/^(nm|pm)os_?\w*_/i, "")   // drop model prefix
    .replace(/_(ngspice|spectre|hspice)/i, "") // drop simulator suffix
    .replace(/_(original|processed|baseline|candidate)$/i, "") // drop role
    .replace(/^benchmark_/, "")
    .replace(/^plot_/, "")
    .trim();

  // Match against known keywords
  const catalog = PLOT_CATALOG.filter((e) => e.domain === domain);
  for (const entry of catalog) {
    const keywords = entry.comparisonKey.split("-");
    if (keywords.every((kw) => n.includes(kw))) return entry.comparisonKey;
  }

  // Fallback: best-effort matching
  const best = catalog.find((e) => n.includes(e.comparisonKey.split("-")[0]));
  return best?.comparisonKey ?? n.replace(/\s+/g, "-").slice(0, 40);
}
