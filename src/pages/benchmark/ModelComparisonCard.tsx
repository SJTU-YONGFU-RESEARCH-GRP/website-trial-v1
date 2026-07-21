/* ==================================================================
 *  ModelComparisonCard (goal.md §12)
 * ================================================================== */

import type { WorkflowScenario, SimulatorId } from "../../compat/spiceWorkflow/contracts";
import { computeModelComparisonKPIs, getResultsForModel, getSimulatorSummary } from "../../data/benchmarkWorkspace/selectors";
import { formatMs, formatMB } from "../../compat/spiceWorkflow/formatters";

interface Props { scenario: WorkflowScenario; baselineId: string | null; candidateId: string | null; simulators: SimulatorId[] }

export function ModelComparisonCard({ scenario, baselineId, candidateId, simulators }: Props) {
  const baseline = baselineId ? scenario.models[baselineId] : null;
  const candidate = candidateId ? scenario.models[candidateId] : null;
  if (!baseline || !candidate) return null;

  const baselineResults = getResultsForModel(scenario, baseline.modelId);
  const candidateResults = getResultsForModel(scenario, candidate.modelId);
  const kpis = computeModelComparisonKPIs(baseline, candidate, baselineResults, candidateResults);

  return (
    <div className="chart-card" id="model-comparison" style={{ marginTop: "0.85rem" }}>
      <h2>Cross-Model Comparison</h2>
      <p className="hint">Compare {baseline.displayName} ↔ {candidate.displayName} using identical benchmark settings.</p>

      {/* KPI delta table */}
      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", fontSize: "0.78rem" }}>
          <thead>
            <tr>
              <th>Metric</th><th>Baseline</th><th>Candidate</th><th>Δ Absolute</th><th>Δ %</th><th>Direction</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => (
              <tr key={kpi.label}>
                <td style={{ fontWeight: 600 }}>{kpi.label}</td>
                <td>{kpi.baseline !== null ? String(kpi.baseline) : "N/A"}</td>
                <td>{kpi.candidate !== null ? String(kpi.candidate) : "N/A"}</td>
                <td style={{ color: getDeltaColor(kpi) }}>{kpi.absoluteDelta}</td>
                <td style={{ color: getDeltaColor(kpi) }}>{kpi.percentDelta}</td>
                <td style={{ fontSize: "0.65rem", color: "var(--muted, #888)" }}>
                  {kpi.lowerIsBetter === true ? "lower is better" : kpi.lowerIsBetter === false ? "higher is better" : "neutral"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-simulator comparison */}
      <h3 className="flow-subsection-title" style={{ marginTop: "0.65rem" }}>Per-Simulator Comparison</h3>
      <div className="tool-grid">
        {simulators.map((sim) => {
          const bSum = getSimulatorSummary(baselineResults, sim);
          const cSum = getSimulatorSummary(candidateResults, sim);
          return (
            <div key={sim} className="chart-card" style={{ padding: "0.5rem 0.65rem" }}>
              <strong style={{ textTransform: "capitalize", fontSize: "0.8rem" }}>{sim}</strong>
              <div style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                <div>Baseline time: {bSum.totalTimeMs !== null ? formatMs(bSum.totalTimeMs) : "N/A"}</div>
                <div>Candidate time: {cSum.totalTimeMs !== null ? formatMs(cSum.totalTimeMs) : "N/A"}</div>
                <div>Baseline mem: {bSum.peakMemoryMB !== null ? formatMB(bSum.peakMemoryMB) : "N/A"}</div>
                <div>Candidate mem: {cSum.peakMemoryMB !== null ? formatMB(cSum.peakMemoryMB) : "N/A"}</div>
                <div>Pass: {bSum.pass} → {cSum.pass}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDeltaColor(kpi: { absoluteDelta: string; percentDelta: string; lowerIsBetter: boolean | null }): string | undefined {
  if (kpi.lowerIsBetter === null || kpi.absoluteDelta === "N/A") return undefined;
  const num = parseFloat(kpi.absoluteDelta);
  if (isNaN(num)) return undefined;
  const improved = kpi.lowerIsBetter ? num < 0 : num > 0;
  return improved ? "#34c759" : num !== 0 ? "#ff3b30" : undefined;
}
