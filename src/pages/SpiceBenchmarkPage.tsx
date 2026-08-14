import { BenchmarkWorkspacePage } from "./benchmark/BenchmarkWorkspacePage";
import { BenchmarkRunPanel } from "./benchmark/run";

export function SpiceBenchmarkPage() {
  return (
    <>
      <BenchmarkRunPanel />
      <BenchmarkWorkspacePage />
    </>
  );
}
