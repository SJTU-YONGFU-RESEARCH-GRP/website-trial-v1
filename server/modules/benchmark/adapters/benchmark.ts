import type { BenchmarkToolAdapter, SimulatorId } from "../types.ts";
import { resolveInvocation } from "../security.ts";
import { enumValue, integerValue, objectAt, relativeFrom, stringList } from "./helpers.ts";

const SIMULATORS = ["ngspice", "spectre", "hspice"] as const;
const MODES = ["dc", "transient", "ac", "noise"] as const;

export const benchmarkAdapter: BenchmarkToolAdapter = {
  toolId: "spice-benchmark",
  label: "Benchmark",
  description: "Run the fixed MOS benchmark circuit with healthy simulator adapters.",
  buildCommands(context) {
    const parameters = objectAt(context.parameters, "benchmark");
    const cwd = `work/${context.stepId}`;
    const output = context.outputDirectory;
    const simulators = stringList(parameters, "simulators", SIMULATORS) as SimulatorId[];
    const modes = stringList(parameters, "modes", MODES);
    if (!simulators.length) throw new Error("Benchmark requires at least one healthy simulator");
    if (!modes.length) throw new Error("Benchmark requires at least one analysis domain");
    const argv = [relativeFrom(cwd, context.inputModel), "--simulator", ...simulators, "--modes", ...modes,
      "--output-dir", relativeFrom(cwd, output),
      "--dpi", String(integerValue(parameters, "dpi", 300, 72, 1200)),
      "--log-level", enumValue(parameters, "logLevel", ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] as const, "INFO"),
    ];
    return [resolveInvocation(this.toolId, context.configuration, argv, cwd, [`${output}/REPORT.md`])];
  },
};
