/* ==================================================================
 *  ExecutiveSummaryCard (goal.md §9)
 * ================================================================== */

import type { WorkflowScenario, SimulatorId } from "../../compat/spiceWorkflow/contracts";
import { KpiCard } from "./shared/KpiCard";
import { getSimulatorSummary, getResultsForModel } from "../../data/benchmarkWorkspace/selectors";
import { formatMs, formatMB } from "../../compat/spiceWorkflow/formatters";

interface Props { scenario: WorkflowScenario; enabledOps: Record<string, boolean>; simulators: SimulatorId[] }

export function ExecutiveSummaryCard({ scenario, enabledOps, simulators }: Props) {
  const results = getResultsForModel(scenario, scenario.defaultCandidateModelId);

  const opsCount = Object.values(enabledOps).filter(Boolean).length;
  const outputModels = Object.values(scenario.models).filter((m) => m.persistent && !m.temporary).length;

  // Aggregate time/memory
  let totalTime: number | null = null;
  let peakMem: number | null = null;
  for (const sim of simulators) {
    const s = getSimulatorSummary(results, sim);
    if (s.totalTimeMs !== null) totalTime = (totalTime ?? 0) + s.totalTimeMs;
    if (s.peakMemoryMB !== null) peakMem = peakMem === null ? s.peakMemoryMB : Math.max(peakMem, s.peakMemoryMB);
  }

  const passCount = results.filter((r) => r.status === "pass").length;
  const verifPass = results.length > 0 ? `${passCount}/${results.length}` : "N/A";

  return (
    <div className="chart-card" style={{ marginTop: "0.85rem" }}>
      <h2>Executive Summary</h2>
      <div className="tool-grid" style={{ marginTop: "0.5rem" }}>
        <KpiCard label="Operations" value={opsCount} hint="enabled" />
        <KpiCard label="Output Models" value={outputModels} hint="persistent" />
        <KpiCard label="Simulators" value={simulators.length} hint={simulators.join("/")} />
        <KpiCard label="Analyses" value={4} hint="DC/AC/Trans/Noise" />
        <KpiCard label="Verification" value={verifPass} hint="pass/total" />
        <KpiCard label="Total Time" value={totalTime !== null ? formatMs(totalTime) : "Not available"} />
        <KpiCard label="Peak Memory" value={peakMem !== null ? formatMB(peakMem) : "Not available"} />
        <KpiCard label="Data Origin" value={scenario.provenance.origin === "derived-static-demo" ? "Static demo" : "Repository"} />
      </div>
    </div>
  );
}
