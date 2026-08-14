import type { ModuleId } from "../../shared/contracts/v1";

export interface AdminToolCatalogEntry {
  toolId: string;
  label: string;
  moduleId: ModuleId;
  adapterId: string;
  adapterVersion: string;
  versionProbeArgv: string[];
  allowedEnvironmentNames: string[];
  executableLabel: string;
}

export const ADMIN_TOOL_CATALOG: AdminToolCatalogEntry[] = [
  { toolId: "translator", label: "SPICE Translator", moduleId: "benchmark", adapterId: "benchmark-translator-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "fitting", label: "SPICE Model Fitting", moduleId: "benchmark", adapterId: "benchmark-fitting-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "reduction", label: "SPICE Model Reduction", moduleId: "benchmark", adapterId: "benchmark-reduction-v1", adapterVersion: "1.0.0", versionProbeArgv: [], allowedEnvironmentNames: ["PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "expansion", label: "SPICE Model Expansion", moduleId: "benchmark", adapterId: "benchmark-expansion-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "spice-benchmark", label: "SPICE Benchmark", moduleId: "benchmark", adapterId: "benchmark-runner-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PATH", "PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "ngspice", label: "ngspice", moduleId: "benchmark", adapterId: "benchmark-ngspice-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "hspice", label: "HSPICE", moduleId: "benchmark", adapterId: "benchmark-hspice-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-V"], allowedEnvironmentNames: ["LM_LICENSE_FILE", "PATH"], executableLabel: "Executable" },
  { toolId: "spectre", label: "Spectre", moduleId: "benchmark", adapterId: "benchmark-spectre-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-W"], allowedEnvironmentNames: ["CDS_LIC_FILE", "PATH"], executableLabel: "Executable" },
  { toolId: "yosys", label: "Yosys", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-V"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "opensta", label: "OpenSTA", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-version"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "iverilog", label: "Icarus Verilog", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-V"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "vvp", label: "Icarus VVP", moduleId: "digital", adapterId: "digital-yosys-opensta-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-V"], allowedEnvironmentNames: ["PATH"], executableLabel: "Executable" },
  { toolId: "openroad-orfs", label: "OpenROAD / ORFS", moduleId: "ppa", adapterId: "ppa-openroad-orfs-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-version"], allowedEnvironmentNames: ["PATH", "OPENROAD_EXE", "YOSYS_EXE"], executableLabel: "Flow executable" },
  { toolId: "openlane1", label: "OpenLane 1", moduleId: "ppa", adapterId: "ppa-openlane1-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Flow executable" },
  { toolId: "librelane", label: "LibreLane", moduleId: "ppa", adapterId: "ppa-librelane-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Flow executable" },
  { toolId: "ppa-result-parser", label: "PPA Result AST Parser", moduleId: "ppa", adapterId: "ppa-result-parser-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--help"], allowedEnvironmentNames: ["PYTHONPATH"], executableLabel: "Python interpreter" },
  { toolId: "magic", label: "Magic", moduleId: "ppa", adapterId: "ppa-magic-dependency-v1", adapterVersion: "1.0.0", versionProbeArgv: ["--version"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Executable" },
  { toolId: "klayout", label: "KLayout", moduleId: "ppa", adapterId: "ppa-klayout-dependency-v1", adapterVersion: "1.0.0", versionProbeArgv: ["-v"], allowedEnvironmentNames: ["PATH", "PDK_ROOT"], executableLabel: "Executable" },
];

export const TECHNOLOGY_ADAPTER_IDS = [
  "digital-yosys-opensta-v1",
  "ppa-openroad-orfs-v1",
  "ppa-openlane1-v1",
  "ppa-librelane-v1",
] as const;

