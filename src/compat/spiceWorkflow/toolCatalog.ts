/* ==================================================================
 *  Tool Catalog (goal.md §20)
 *
 *  Static metadata for each integrated tool.  The catalog is consumed
 *  by adapters and the UI to render capability summaries without
 *  coupling to adapter internals.
 * ================================================================== */

import type { ToolId, AnalysisDomain } from "./contracts";

export interface ToolMeta {
  id: ToolId;
  label: string;
  subtitle: string;
  description: string;
  repoUrl: string;
  repoLabel: string;
  supportedDomains: AnalysisDomain[];
  limitations: string[];
}

export const TOOL_CATALOG: Record<ToolId, ToolMeta> = {
  translator: {
    id: "translator",
    label: "Translator",
    subtitle: "Translate between ngspice, Spectre, and HSPICE dialects",
    description:
      "Multi-directional format translation with include-aware processing, " +
      "model semantic IR, and syntax/simulation/round-trip verification.",
    repoUrl: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/new-spice-translator",
    repoLabel: "new-spice-translator",
    supportedDomains: ["dc", "ac", "transient", "noise"],
    limitations: [
      "Some vendor-specific syntax may not round-trip perfectly.",
    ],
  },
  fitting: {
    id: "fitting",
    label: "Fitting",
    subtitle: "Fit BSIM parameters to measured DC IV data",
    description:
      "Calibrate BSIM4.5 DC parameters against measured I-V sweeps " +
      "using multiple optimizers with staged or single-shot calibration.",
    repoUrl: "https://github.com/duhaochen-china/spice_model_fitting",
    repoLabel: "spice_model_fitting",
    supportedDomains: ["dc"],
    limitations: [
      "Current tool support: DC IV calibration only. AC/CV fitting is not enabled.",
    ],
  },
  reduction: {
    id: "reduction",
    label: "Reduction",
    subtitle: "Prune and optimize BSIM parameters within an error tolerance",
    description:
      "Sensitivity-driven parameter reduction with multiple optimization " +
      "methods and characterization test types.",
    repoUrl: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_reduction",
    repoLabel: "spice_model_reduction",
    supportedDomains: ["dc", "ac", "transient", "noise"],
    limitations: [
      "Reduction quality depends on characterization coverage.",
    ],
  },
  expansion: {
    id: "expansion",
    label: "Expansion",
    subtitle: "Generate T/S/F corners and optional Monte Carlo variants from a TT model",
    description:
      "Derive process corners and Monte Carlo ensembles from a nominal " +
      "TT model with configurable sigma and characterization.",
    repoUrl: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_expansion",
    repoLabel: "spice_model_expansion",
    supportedDomains: ["dc", "ac", "transient", "noise"],
    limitations: [
      "Derived corners are not foundry-certified.",
      "Monte Carlo generation is statistical, not silicon-validated.",
    ],
  },
  benchmark: {
    id: "benchmark",
    label: "Benchmark",
    subtitle: "Cross-simulator electrical verification and resource comparison",
    description:
      "Unified benchmarking across ngspice, Spectre, and HSPICE with " +
      "DC/AC/Transient/Noise analysis, resource metrics, and numerical agreement.",
    repoUrl: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark",
    repoLabel: "spice_model_benchmark",
    supportedDomains: ["dc", "ac", "transient", "noise"],
    limitations: [
      "Spectre/HSPICE resource metrics in demo mode are synthetic.",
    ],
  },
};

export const DEFAULT_OPERATION_ORDER: Exclude<ToolId, "benchmark">[] = [
  "translator",
  "reduction",
  "expansion",
  "fitting",
];

export const ALL_SIMULATORS = ["ngspice", "spectre", "hspice"] as const;
export const ALL_DOMAINS: AnalysisDomain[] = ["dc", "ac", "transient", "noise"];
