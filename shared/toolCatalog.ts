import type { ModuleId } from "./contracts/v1.ts";

export interface ToolCatalogEntryV1 {
  toolId: string;
  label: string;
  moduleId: ModuleId;
  adapterId: string;
  adapterVersion: string;
  versionProbeArgv: readonly string[];
  allowedEnvironmentNames: readonly string[];
  executableLabel: string;
}

/**
 * Authoritative production tool registry. The browser renders this catalog,
 * while the API enforces it; client-provided command/probe contracts are never
 * trusted.
 */
export const TOOL_CATALOG = [
  { toolId: "translator", label: "SPICE Translator", moduleId: "benchmark", adapterId: "benchmark-translator-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "fitting", label: "SPICE Model Fitting", moduleId: "benchmark", adapterId: "benchmark-fitting-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "reduction", label: "SPICE Model Reduction", moduleId: "benchmark", adapterId: "benchmark-reduction-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "expansion", label: "SPICE Model Expansion", moduleId: "benchmark", adapterId: "benchmark-expansion-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "spice-benchmark", label: "SPICE Benchmark", moduleId: "benchmark", adapterId: "benchmark-runner-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "ngspice", label: "ngspice", moduleId: "benchmark", adapterId: "benchmark-ngspice-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "hspice", label: "HSPICE", moduleId: "benchmark", adapterId: "benchmark-hspice-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-v"], allowedEnvironmentNames: ["LM_LICENSE_FILE", "SNPSLMD_LICENSE_FILE", "PATH"], executableLabel: "Executable" },
  { toolId: "spectre", label: "Spectre", moduleId: "benchmark", adapterId: "benchmark-spectre-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-W"], allowedEnvironmentNames: ["CDS_LIC_FILE", "PATH"], executableLabel: "Executable" },
  { toolId: "yosys", label: "Yosys", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-V"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "opensta", label: "OpenSTA", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-version"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "iverilog", label: "Icarus Verilog", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-V"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "vvp", label: "Icarus VVP", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-V"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "openroad-orfs", label: "OpenROAD / ORFS", moduleId: "ppa", adapterId: "ppa-openroad-orfs-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "OPENROAD_EXE", "YOSYS_EXE"], executableLabel: "GNU Make executable" },
  { toolId: "openlane1", label: "OpenLane 1", moduleId: "ppa", adapterId: "ppa-openlane1-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Flow executable" },
  { toolId: "librelane", label: "LibreLane", moduleId: "ppa", adapterId: "ppa-librelane-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Flow executable" },
  { toolId: "ppa-result-parser", label: "PPA Result AST Parser", moduleId: "ppa", adapterId: "ppa-result-parser-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "magic", label: "Magic", moduleId: "ppa", adapterId: "ppa-magic-dependency-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Executable" },
  { toolId: "klayout", label: "KLayout", moduleId: "ppa", adapterId: "ppa-klayout-dependency-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-v"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Executable" },
  { toolId: "acg-cmos", label: "AutoCellGen CMOS", moduleId: "acg", adapterId: "acg-autocell-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "LD_LIBRARY_PATH"], executableLabel: "Native autocell executable" },
  { toolId: "acg-dr", label: "AutoCellGen DR", moduleId: "acg", adapterId: "acg-autocell-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "LD_LIBRARY_PATH"], executableLabel: "Native autocell executable" },
  { toolId: "acg-mr", label: "AutoCellGen MR", moduleId: "acg", adapterId: "acg-autocell-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "LD_LIBRARY_PATH"], executableLabel: "Native autocell executable" },
  { toolId: "acg-renderer", label: "ACG layout renderer", moduleId: "acg", adapterId: "acg-renderer-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH"], executableLabel: "Python interpreter" },
  { toolId: "acg-replay", label: "ACG MR replay preparation", moduleId: "acg", adapterId: "acg-replay-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH"], executableLabel: "Python interpreter" },
  { toolId: "acg-lvs1", label: "ACG GF180 research LVS1", moduleId: "acg", adapterId: "acg-lvs1-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH"], executableLabel: "Python interpreter" },
  { toolId: "acg-research", label: "ACG README research workflows", moduleId: "acg", adapterId: "acg-research-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "LD_LIBRARY_PATH"], executableLabel: "Python interpreter" },
  { toolId: "acg-pv", label: "ACG GF180 physical verification", moduleId: "acg", adapterId: "acg-pv-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "AUTOCELLGEN_PV_GF180_ROOT"], executableLabel: "Python interpreter" },
  { toolId: "dtco-ngspice", label: "DTCO ngspice and GF180 model library", moduleId: "dtco", adapterId: "dtco-ngspice-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "DTCO_MODEL_FILE"], executableLabel: "ngspice executable" },
  { toolId: "dtco-analysis", label: "DTCO waveform and GDS analysis", moduleId: "dtco", adapterId: "dtco-analysis-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH"], executableLabel: "Python interpreter with gdstk" },
  { toolId: "dtco-physical", label: "DTCO physical completion and extraction validation", moduleId: "dtco", adapterId: "dtco-physical-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH"], executableLabel: "Python interpreter with gdstk" },
  { toolId: "dtco-magic", label: "DTCO Magic with GF180 technology", moduleId: "dtco", adapterId: "dtco-magic-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "DTCO_MAGIC_TECH_FILE"], executableLabel: "Magic executable" },
] as const satisfies readonly ToolCatalogEntryV1[];

export const TOOL_CATALOG_BY_ID: Readonly<Record<string, ToolCatalogEntryV1>> = Object.freeze(
  Object.fromEntries(TOOL_CATALOG.map((entry) => [entry.toolId, entry])),
);

export const TECHNOLOGY_ADAPTER_IDS = [
  "digital-yosys-opensta-v1",
  "ppa-openroad-orfs-v1",
  "ppa-openlane1-v1",
  "ppa-librelane-v1",
] as const;

export function adapterIdForTool(toolId: string): string | null {
  return TOOL_CATALOG_BY_ID[toolId]?.adapterId ?? null;
}
