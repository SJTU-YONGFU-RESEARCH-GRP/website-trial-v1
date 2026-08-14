/* ==================================================================
 *  BenchmarkSetupCard (goal.md §6.7)
 *
 *  Select simulators, analysis domains, models to benchmark,
 *  and comparison baseline.
 * ================================================================== */

import type { SimulatorId, AnalysisDomain, ModelArtifact } from "../../compat/spiceWorkflow/contracts";
import { ALL_SIMULATORS, ALL_DOMAINS } from "../../compat/spiceWorkflow/toolCatalog";

interface BenchmarkSetupCardProps {
  selectedSimulators: SimulatorId[];
  onSimulatorsChange: (sims: SimulatorId[]) => void;
  selectedDomains: AnalysisDomain[];
  onDomainsChange: (doms: AnalysisDomain[]) => void;
  benchmarkModelIds: string[];
  onBenchmarkModelIdsChange: (ids: string[]) => void;
  availableModels: ModelArtifact[];
  baselineModelId: string | null;
  onBaselineChange: (id: string) => void;
  candidateModelId: string | null;
  onCandidateChange: (id: string) => void;
  referenceSimulator: SimulatorId;
  onReferenceSimulatorChange: (sim: SimulatorId) => void;
  showCornerModels: boolean;
  onShowCornerModelsChange: (show: boolean) => void;
}

const SIMULATOR_LABELS: Record<SimulatorId, string> = {
  ngspice: "ngspice",
  spectre: "Spectre",
  hspice: "HSPICE",
};

export function BenchmarkSetupCard({
  selectedSimulators, onSimulatorsChange, selectedDomains, onDomainsChange,
  benchmarkModelIds, onBenchmarkModelIdsChange, availableModels,
  baselineModelId, onBaselineChange, candidateModelId, onCandidateChange,
  referenceSimulator, onReferenceSimulatorChange,
  showCornerModels, onShowCornerModelsChange,
}: BenchmarkSetupCardProps) {
  const nonCornerModels = availableModels.filter(
    (m) => !m.variant.startsWith("corner-"),
  );

  return (
    <div className="chart-card" id="setup">
      <h3 className="flow-subsection-title">Benchmark Setup</h3>

      {/* Simulators */}
      <div style={{ marginBottom: "0.65rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.78rem", marginBottom: "0.25rem" }}>Simulators</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {ALL_SIMULATORS.map((sim) => {
            const checked = selectedSimulators.includes(sim as SimulatorId);
            return (
              <label key={sim} style={{ fontSize: "0.78rem", cursor: "pointer" }}>
                <input
                  type="checkbox" checked={checked}
                  onChange={() => {
                    onSimulatorsChange(
                      checked
                        ? selectedSimulators.filter((s) => s !== sim)
                        : [...selectedSimulators, sim as SimulatorId],
                    );
                  }}
                /> {SIMULATOR_LABELS[sim as SimulatorId]}
              </label>
            );
          })}
        </div>
      </div>

      {/* Domains */}
      <div style={{ marginBottom: "0.65rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.78rem", marginBottom: "0.25rem" }}>Analyses</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {ALL_DOMAINS.map((dom) => {
            const checked = selectedDomains.includes(dom);
            return (
              <label key={dom} style={{ fontSize: "0.78rem", cursor: "pointer", textTransform: "uppercase" }}>
                <input
                  type="checkbox" checked={checked}
                  onChange={() => {
                    onDomainsChange(
                      checked
                        ? selectedDomains.filter((d) => d !== dom)
                        : [...selectedDomains, dom],
                    );
                  }}
                /> {dom}
              </label>
            );
          })}
        </div>
      </div>

      {/* Models to benchmark */}
      <div style={{ marginBottom: "0.65rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.78rem", marginBottom: "0.25rem" }}>Models to benchmark</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {nonCornerModels.map((m) => {
            const checked = benchmarkModelIds.includes(m.modelId);
            return (
              <label key={m.modelId} style={{ fontSize: "0.78rem", cursor: "pointer" }}>
                <input
                  type="checkbox" checked={checked}
                  onChange={() => {
                    onBenchmarkModelIdsChange(
                      checked
                        ? benchmarkModelIds.filter((id) => id !== m.modelId)
                        : [...benchmarkModelIds, m.modelId],
                    );
                  }}
                /> {m.displayName}
              </label>
            );
          })}
          <label style={{ fontSize: "0.75rem", cursor: "pointer", color: "var(--muted, #888)" }}>
            <input type="checkbox" checked={showCornerModels}
              onChange={(e) => onShowCornerModelsChange(e.target.checked)} />
            Include T/S/F corners
          </label>
        </div>
      </div>

      {/* Comparison baseline */}
      <div style={{ marginBottom: "0.65rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.78rem", marginBottom: "0.25rem" }}>Comparison baseline</p>
        <div className="tool-grid">
          <label style={{ fontSize: "0.78rem" }}>
            Baseline model
            <select value={baselineModelId ?? ""} onChange={(e) => onBaselineChange(e.target.value)}
              style={{ display: "block", marginTop: "0.15rem" }}>
              {availableModels.map((m) => (
                <option key={m.modelId} value={m.modelId}>{m.displayName}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.78rem" }}>
            Candidate model
            <select value={candidateModelId ?? ""} onChange={(e) => onCandidateChange(e.target.value)}
              style={{ display: "block", marginTop: "0.15rem" }}>
              {availableModels.map((m) => (
                <option key={m.modelId} value={m.modelId}>{m.displayName}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.78rem" }}>
            Display reference simulator
            <select value={referenceSimulator} onChange={(e) => onReferenceSimulatorChange(e.target.value as SimulatorId)}
              style={{ display: "block", marginTop: "0.15rem" }}>
              {ALL_SIMULATORS.map((s) => (
                <option key={s} value={s}>{SIMULATOR_LABELS[s as SimulatorId]}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint" style={{ fontSize: "0.67rem", marginTop: "0.25rem" }}>
          The display reference simulator is a comparison baseline, not a physical ground truth.
        </p>
      </div>
    </div>
  );
}
