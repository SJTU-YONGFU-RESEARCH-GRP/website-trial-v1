/* ==================================================================
 *  SimulatorComparisonCard (goal.md §11)
 *  Enhanced: time chart, memory chart, status matrix, agreement
 * ================================================================== */

import type { WorkflowScenario, SimulatorId, AnalysisDomain } from "../../compat/spiceWorkflow/contracts";
import { getResultsForModel, getSimulatorSummary, getResultForCell } from "../../data/benchmarkWorkspace/selectors";
import { formatMs, formatMB } from "../../compat/spiceWorkflow/formatters";
import { DataOriginBadge } from "./shared/DataOriginBadge";
import { StatusBadge } from "./shared/StatusBadge";
import { ExecutionTimeChart, PeakMemoryChart } from "./SimulatorResourceCharts";
import { SimulatorAgreementTable } from "./SimulatorAgreementTable";

interface Props { scenario: WorkflowScenario; modelId: string; simulators: SimulatorId[]; domains: AnalysisDomain[]; referenceSimulator: SimulatorId }

export function SimulatorComparisonCard({ scenario, modelId, simulators, domains, referenceSimulator }: Props) {
  const results = getResultsForModel(scenario, modelId);

  return (
    <div className="chart-card" id="simulator-comparison" style={{ marginTop: "0.85rem" }}>
      <h2>Cross-Simulator Comparison</h2>
      <p className="hint">Compare the same model across ngspice, Spectre, and HSPICE.</p>

      {/* Simulator summary cards */}
      <div className="tool-grid" style={{ marginTop: "0.5rem" }}>
        {simulators.map((sim) => {
          const summary = getSimulatorSummary(results, sim);
          const simResults = results.filter((r) => r.simulator === sim);
          const origin = simResults[0]?.resources.source ?? "unavailable";
          const timeMs = summary.totalTimeMs;
          const memMB = summary.peakMemoryMB;

          // Find fastest/lowest mem
          const allTimes = simulators.map((s) => getSimulatorSummary(results, s).totalTimeMs).filter((t): t is number => t !== null);
          const allMems = simulators.map((s) => getSimulatorSummary(results, s).peakMemoryMB).filter((m): m is number => m !== null);
          const isFastest = timeMs !== null && allTimes.length > 0 && timeMs === Math.min(...allTimes);
          const isLowestMem = memMB !== null && allMems.length > 0 && memMB === Math.min(...allMems);

          return (
            <div key={sim} className="chart-card" style={{ padding: "0.65rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <strong style={{ textTransform: "capitalize" }}>{sim}</strong>
                <DataOriginBadge origin={origin} />
              </div>
              <div style={{ fontSize: "0.72rem", lineHeight: 1.6 }}>
                <div>Status: {summary.pass}/{summary.total} pass</div>
                <div>Time: {timeMs !== null ? formatMs(timeMs) : "Not available"} {isFastest && <span style={{ color: "var(--accent, #0071e3)", fontSize: "0.65rem" }}>Fastest</span>}</div>
                <div>Memory: {memMB !== null ? formatMB(memMB) : "Not available"} {isLowestMem && <span style={{ color: "var(--accent, #0071e3)", fontSize: "0.65rem" }}>Lowest memory</span>}</div>
              </div>
              <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                {domains.map((dom) => {
                  const r = getResultForCell(scenario, modelId, sim, dom);
                  return <StatusBadge key={dom} status={r?.status ?? "unavailable"} />;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status / Resource Matrix */}
      <div style={{ marginTop: "0.65rem", overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.72rem" }}>
          <thead>
            <tr>
              <th>Analysis</th>
              {simulators.map((s) => <th key={s} style={{ textTransform: "capitalize" }}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {domains.map((dom) => (
              <tr key={dom}>
                <td style={{ fontWeight: 600, textTransform: "uppercase" }}>{dom}</td>
                {simulators.map((sim) => {
                  const r = getResultForCell(scenario, modelId, sim, dom);
                  const time = r?.resources.wallTimeMs ?? null;
                  const mem = r?.resources.peakRssMB ?? null;
                  return (
                    <td key={sim}>
                      <StatusBadge status={r?.status ?? "unavailable"} />
                      {r && <span style={{ fontSize: "0.65rem", color: "var(--muted, #888)", marginLeft: "0.25rem" }}>
                        {time !== null ? formatMs(time) : ""} {mem !== null ? `/ ${formatMB(mem)}` : ""}
                      </span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Execution Time Plotly chart */}
      <div className="chart-card" style={{ marginTop: "0.65rem", padding: "0.5rem" }}>
        <h3 className="flow-subsection-title">Execution Time by Domain</h3>
        <p className="hint" style={{ fontSize: "0.67rem", marginBottom: "0.35rem" }}>
          Grouped bar chart — x: analysis domain, y: elapsed time (ms), trace: simulator.
        </p>
        <ExecutionTimeChart scenario={scenario} modelId={modelId} simulators={simulators} domains={domains} />
      </div>

      {/* Peak Memory Plotly chart */}
      <div className="chart-card" style={{ marginTop: "0.65rem", padding: "0.5rem" }}>
        <h3 className="flow-subsection-title">Peak Memory by Domain</h3>
        <p className="hint" style={{ fontSize: "0.67rem", marginBottom: "0.35rem" }}>
          Grouped bar chart — x: analysis domain, y: peak RSS (MB), trace: simulator.
        </p>
        <PeakMemoryChart scenario={scenario} modelId={modelId} simulators={simulators} domains={domains} />
      </div>

      {/* Numerical Agreement */}
      <SimulatorAgreementTable scenario={scenario} modelId={modelId} simulators={simulators} domains={domains} referenceSimulator={referenceSimulator} />

      <p className="hint" style={{ marginTop: "0.5rem", fontSize: "0.67rem" }}>
        Spectre/HSPICE resource metrics in demo mode are synthetic fixtures. No overall winner is declared.
      </p>
    </div>
  );
}
