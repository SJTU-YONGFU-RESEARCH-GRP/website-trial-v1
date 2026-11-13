/* ==================================================================
 *  SimulatorAgreementTable (goal.md §11.5)
 *  Reference delta + pairwise agreement between simulators.
 * ================================================================== */

import { useState } from "react";
import type { WorkflowScenario, SimulatorId, AnalysisDomain } from "../../compat/spiceWorkflow/contracts";

type AgreementView = "reference-delta" | "pairwise";

interface Props { scenario: WorkflowScenario; modelId: string; simulators: SimulatorId[]; domains: AnalysisDomain[]; referenceSimulator: SimulatorId }

export function SimulatorAgreementTable({ simulators, domains, referenceSimulator }: Props) {
  const [view, setView] = useState<AgreementView>("reference-delta");
  const [selectedDomain, setSelectedDomain] = useState<AnalysisDomain>("dc");

  return (
    <div style={{ marginTop: "0.65rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 className="flow-subsection-title" style={{ margin: 0 }}>Numerical Agreement</h3>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button className="benchmark-btn"
            onClick={() => setView("reference-delta")}
            style={{ fontSize: "0.7rem", fontWeight: view === "reference-delta" ? 700 : 400 }}>
            Reference delta
          </button>
          <button className="benchmark-btn"
            onClick={() => setView("pairwise")}
            style={{ fontSize: "0.7rem", fontWeight: view === "pairwise" ? 700 : 400 }}>
            Pairwise agreement
          </button>
        </div>
      </div>

      {view === "reference-delta" && (
        <ReferenceDeltaView simulators={simulators} domains={domains} referenceSimulator={referenceSimulator} />
      )}

      {view === "pairwise" && (
        <PairwiseAgreementView simulators={simulators} selectedDomain={selectedDomain} onDomainChange={setSelectedDomain} domains={domains} />
      )}
    </div>
  );
}

function ReferenceDeltaView({ domains, referenceSimulator }: { simulators: SimulatorId[]; domains: AnalysisDomain[]; referenceSimulator: SimulatorId }) {
  return (
    <div>
      <p className="hint" style={{ fontSize: "0.67rem" }}>
        Display reference: <strong>{referenceSimulator}</strong>. The selected simulator is a display reference, not a physical ground truth.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.72rem" }}>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Normalized RMSE</th>
              <th>Max Rel. Error</th>
              <th>Correlation</th>
              <th>Aligned Points</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((dom) => (
              <tr key={dom}>
                <td style={{ fontWeight: 600, textTransform: "uppercase" }}>{dom}</td>
                <td colSpan={4}>
                  <span className="tr-badge tr-badge--partial" style={{ fontSize: "0.65rem" }}>Not available</span>
                  <span style={{ fontSize: "0.6rem", color: "var(--muted, #aaa)", marginLeft: "0.35rem" }}>
                    Agreement metrics not computed in static demo — requires actual simulator outputs.
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PairwiseAgreementView({ simulators, selectedDomain, onDomainChange, domains }: {
  simulators: SimulatorId[]; domains: AnalysisDomain[]; selectedDomain: AnalysisDomain; onDomainChange: (d: AnalysisDomain) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: "0.5rem" }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>
          Domain:{" "}
          <select value={selectedDomain} onChange={(e) => onDomainChange(e.target.value as AnalysisDomain)}>
            {domains.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
          </select>
        </label>
      </div>

      <p style={{ fontSize: "0.67rem", color: "var(--muted, #888)" }}>{selectedDomain.toUpperCase()} — pairwise agreement matrix</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.72rem" }}>
          <thead>
            <tr>
              <th></th>
              {simulators.map((s) => <th key={s} style={{ textTransform: "capitalize" }}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {simulators.map((simA) => (
              <tr key={simA}>
                <td style={{ fontWeight: 600, textTransform: "capitalize" }}>{simA}</td>
                {simulators.map((simB) => {
                  if (simA === simB) return <td key={simB} style={{ color: "var(--muted, #aaa)" }}>—</td>;
                  return (
                    <td key={simB}>
                      <span className="tr-badge tr-badge--partial" style={{ fontSize: "0.65rem" }}>N/A</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ fontSize: "0.62rem", marginTop: "0.35rem" }}>
        Pairwise agreement requires actual simulator output data from all three simulators for the same model.
      </p>
    </div>
  );
}
