import type {
  JsonObject,
  JsonValue,
  PlannedProcessV1,
  ToolConfigurationSnapshotV1,
  ToolHealthStatus,
} from "../../../shared/contracts/v1.ts";

export const BENCHMARK_ADAPTER_VERSION = "1.0.0";
export const BENCHMARK_CAPABILITY_VERSION = "benchmark.capability.v1";

export type BenchmarkToolId =
  | "translator"
  | "fitting"
  | "reduction"
  | "expansion"
  | "spice-benchmark";

export type SimulatorId = "ngspice" | "spectre" | "hspice";
export type BenchmarkMode = "dc" | "transient" | "ac" | "noise";

export interface ToolRuntimeHealth {
  status: ToolHealthStatus;
  version: string | null;
  reason: string | null;
  adapterSelfTestPassed?: boolean;
}

export interface BenchmarkModuleOptions {
  configurations?: ToolConfigurationSnapshotV1[];
  health?: Partial<Record<BenchmarkToolId | SimulatorId, ToolRuntimeHealth>>;
}

export interface BenchmarkRunParameters extends JsonObject {
  mode: "run" | "import";
  operations: JsonObject;
  translator: JsonObject;
  fitting: JsonObject;
  reduction: JsonObject;
  expansion: JsonObject;
  benchmark: JsonObject;
}

export interface CommandSpec {
  toolId: BenchmarkToolId;
  executable: string;
  argv: string[];
  cwdRelative: string;
  environmentNames: string[];
  timeoutSeconds: number;
  expectedOutputs: string[];
}

export interface AdapterPlanContext {
  parameters: BenchmarkRunParameters;
  inputByRole: ReadonlyMap<string, string[]>;
  configuration: ToolConfigurationSnapshotV1;
  stepId: string;
  inputModel: string;
  outputDirectory: string;
  dependencies?: ReadonlyMap<string, ToolConfigurationSnapshotV1>;
}

export interface BenchmarkToolAdapter {
  readonly toolId: BenchmarkToolId;
  readonly label: string;
  readonly description: string;
  buildCommands(context: AdapterPlanContext): CommandSpec[];
}

export interface NativeArtifact {
  role: string;
  relativePath: string;
  mediaType: string;
  required: boolean;
  publish: boolean;
}

export interface NativeBenchmarkResult extends JsonObject {
  schemaVersion: "benchmark.result-data.v1";
  workflow: string;
  models: JsonValue[];
  operations: JsonValue[];
  benchmark: JsonObject;
  warnings: JsonValue[];
}

export function plannedProcess(
  configuration: ToolConfigurationSnapshotV1,
  command: CommandSpec,
): PlannedProcessV1 {
  return {
    toolConfigurationId: configuration.id,
    executableDisplay: command.executable,
    argv: [...command.argv],
    cwdRelative: command.cwdRelative,
    environmentNames: [...command.environmentNames],
    timeoutSeconds: command.timeoutSeconds,
  };
}
