/* ==================================================================
 *  DomainOverlayCard (goal.md §12.3)
 *  Baseline vs candidate curve overlay with optional residual.
 * ================================================================== */

import { useState } from "react";
import type { Config, Data } from "plotly.js";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from "../../theme/chartPalette";
import type { WorkflowScenario, SimulatorId, AnalysisDomain } from "../../compat/spiceWorkflow/contracts";

interface Props {
  scenario: WorkflowScenario;
  baselineModelId: string | null;
  candidateModelId: string | null;
  simulators: SimulatorId[];
  domains: AnalysisDomain[];
}

const DOMAIN_PRESETS: Record<AnalysisDomain, string[]> = {
  dc: ["Id–Vg", "Id–Vd", "gm", "KCL"],
  ac: ["C–V", "Cgg/Cgs/Cgd", "S11/S21", "NQS"],
  transient: ["Input/Output", "Delay", "Power", "Charge Conservation"],
  noise: ["PSD", "Flicker", "Thermal", "Temp/Bias Sweep"],
};

export function DomainOverlayCard({ scenario, baselineModelId, candidateModelId, simulators, domains }: Props) {
  const [selectedSimulator, setSelectedSimulator] = useState<SimulatorId>(simulators[0] ?? "ngspice");
  const [selectedDomain, setSelectedDomain] = useState<AnalysisDomain>("dc");
  const [selectedMetric, setSelectedMetric] = useState("Id–Vg");
  const [useLogScale, setUseLogScale] = useState(false);

  const baseline = baselineModelId ? scenario.models[baselineModelId] : null;
  const candidate = candidateModelId ? scenario.models[candidateModelId] : null;
  const presets = DOMAIN_PRESETS[selectedDomain] ?? [];

  // Build synthetic overlay data for the static demo
  const traces: Data[] = [
    {
      x: Array.from({ length: 50 }, (_, i) => (i / 49) * 3.3),
      y: Array.from({ length: 50 }, (_, i) => Math.pow((i / 49) * 3.3 / 3.3, 1.5) * 1e-3 + Math.sin(i * 0.3) * 1e-5),
      type: "scatter" as const,
      mode: "lines",
      name: baseline ? `${baseline.displayName} (baseline)` : "Baseline",
      line: { color: "#0071e3", width: 2 },
      hovertemplate: "Baseline<br>Vgs: %{x:.2f} V<br>Id: %{y:.2e} A<extra></extra>",
    },
    {
      x: Array.from({ length: 50 }, (_, i) => (i / 49) * 3.3),
      y: Array.from({ length: 50 }, (_, i) => Math.pow((i / 49) * 3.3 / 3.3, 1.5) * 0.95e-3 + Math.sin(i * 0.3) * 1e-5),
      type: "scatter" as const,
      mode: "lines",
      name: candidate ? `${candidate.displayName} (candidate)` : "Candidate",
      line: { color: "#ff9500", width: 2, dash: "dash" },
      hovertemplate: "Candidate<br>Vgs: %{x:.2f} V<br>Id: %{y:.2e} A<extra></extra>",
    },
    {
      x: Array.from({ length: 50 }, (_, i) => (i / 49) * 3.3),
      y: Array.from({ length: 50 }, (_, i) => Math.abs(Math.pow((i / 49) * 3.3 / 3.3, 1.5) * 0.05e-3) * 0.1),
      type: "scatter" as const,
      mode: "lines",
      name: "|Residual| ×10",
      line: { color: "#ff3b30", width: 1, dash: "dot" },
      yaxis: "y2",
      hovertemplate: "|Residual| ×10<br>Vgs: %{x:.2f} V<br>|Δ|: %{y:.2e}<extra></extra>",
    },
  ];

  const ref = usePlotlyChart(
    traces,
    {
      font: { family: CHART_FONT_FAMILY, size: CHART_FONT_SIZE * 0.6, color: "#666" },
      margin: { l: 60, r: 60, t: 10, b: 50 },
      xaxis: { title: { text: "Vgs (V)", font: { size: 11 } }, tickfont: { size: 10 } },
      yaxis: {
        title: { text: "Id (A)", font: { size: 11 } },
        type: useLogScale ? "log" : "linear",
        tickfont: { size: 10 },
      },
      yaxis2: {
        title: { text: "|Residual|", font: { size: 10, color: "#ff3b30" } },
        overlaying: "y",
        side: "right",
        tickfont: { size: 9, color: "#ff3b30" },
      },
      legend: { orientation: "h", y: 1.18, font: { size: 9 } },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
    },
    { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>,
  );

  return (
    <div className="chart-card" style={{ marginTop: "0.85rem" }}>
      <h3 className="flow-subsection-title">Domain Overlay Comparison</h3>
      <p className="hint" style={{ fontSize: "0.67rem", marginBottom: "0.4rem" }}>
        Baseline vs candidate curve overlay. Data is synthetic demo — not actual simulation output.
      </p>

      {/* Controls */}
      <div className="tool-grid" style={{ marginBottom: "0.5rem" }}>
        <label className="bmw-field">
          Model
          <select value={selectedSimulator} onChange={(e) => setSelectedSimulator(e.target.value as SimulatorId)}>
            {simulators.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="bmw-field">
          Simulator
          <select value={selectedSimulator} onChange={(e) => setSelectedSimulator(e.target.value as SimulatorId)}>
            {simulators.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="bmw-field">
          Domain
          <select value={selectedDomain} onChange={(e) => { setSelectedDomain(e.target.value as AnalysisDomain); setSelectedMetric(DOMAIN_PRESETS[e.target.value as AnalysisDomain]?.[0] ?? "Id–Vg"); }}>
            {domains.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
          </select>
        </label>
        <label className="bmw-field">
          Metric
          <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
            {presets.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <input type="checkbox" checked={useLogScale} onChange={(e) => setUseLogScale(e.target.checked)} />
          Log scale
        </label>
      </div>

      {/* Chart */}
      <div className="plot-host" style={{ background: "var(--surface-inset, #f9f9f9)", borderRadius: "6px", padding: "0.25rem" }}>
        <div ref={ref} style={{ width: "100%", height: "340px" }} />
      </div>

      <p className="hint" style={{ marginTop: "0.25rem", fontSize: "0.62rem" }}>
        ⚠ Static demo overlay — not actual ngspice/Spectre/HSPICE output. Actual curves require future backend execution.
      </p>
    </div>
  );
}
