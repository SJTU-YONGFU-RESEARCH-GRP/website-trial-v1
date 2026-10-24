/* ═══════════════════════════════════════════════════════════════════ */
/*  BenchmarkOverview — overview section for a single BenchmarkRun       */
/*  Extracted from SpiceBenchmarkPage.tsx.                                */
/* ═══════════════════════════════════════════════════════════════════ */

import type { Config, Data, Layout } from "plotly.js";
import { usePlotlyChart } from "../../../hooks/usePlotlyChart";
import type { BenchmarkRun } from "../../../data/SpiceBenchmarkTypes";

function KpiDonut({ pass, fail, na }: { pass: number; fail: number; na: number }) {
  const ref = usePlotlyChart(
    [{ type: "pie", values: [pass, fail, na], labels: ["Pass", "Fail", "N/A"], hole: 0.55, marker: { colors: ["var(--ok,#22c55e)", "var(--fail,#ef4444)", "var(--muted,#94a3b8)"] }, textinfo: "label+value" } as Data],
    { autosize: true, margin: { l: 4, r: 4, t: 4, b: 4 }, showlegend: false, paper_bgcolor: "transparent", plot_bgcolor: "transparent" } as Partial<Layout>,
    { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>,
  );
  return <div className="plot-host plot-host--short"><div ref={ref} style={{ width: "100%", height: "100%" }} /></div>;
}

export interface BenchmarkOverviewProps {
  run: BenchmarkRun;
  /** Optional suffix — e.g. "(baseline)" or "(final)" */
  suffix?: string;
}

export function BenchmarkOverview({ run, suffix }: BenchmarkOverviewProps) {
  const ns = run.netlistSuite;
  const ts = run.verificationTests;
  const passCount = ts.filter(t => t.status === "pass").length;
  const failCount = ts.filter(t => t.status === "fail").length;
  const naCount = ts.filter(t => t.status === "unavailable").length;

  return (
    <div className="chart-card benchmark-section" id="bm-overview">
      <h2>Overview — {run.runId} {suffix && <span className="hint">{suffix}</span>} <span className="hint">({run.dataArtifacts.length} datasets, {run.plotArtifacts.length} plots)</span></h2>
      {run.status === "example" && <p className="hint benchmark-demo-warn">⚠ Example result — not real fabrication data</p>}
      <div className="benchmark-overview-grid">
        <div className="benchmark-overview-kpis">
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Model</div><div className="flow-kpi-card__value">{run.modelId}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Format</div><div className="flow-kpi-card__value">{run.modelFormat}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Device</div><div className="flow-kpi-card__value">{run.deviceName || "—"}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Simulator</div><div className="flow-kpi-card__value">{run.simulator} {run.simulatorVersion}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Generated</div><div className="flow-kpi-card__value benchmark-date">{run.generatedAt?.slice(0, 10) || "—"}</div></div>
        </div>
        <div className="benchmark-overview-donut">
          <KpiDonut pass={passCount} fail={failCount} na={naCount} />
        </div>
        <div className="benchmark-overview-nets">
          <h3 className="flow-subsection-title">Netlist Suite</h3>
          <table className="benchmark-table"><tbody>
            <tr><td>DC</td><td><code>{ns.dcCircuit || "—"}</code></td></tr>
            <tr><td>AC</td><td><code>{ns.acCircuit || "—"}</code></td></tr>
            <tr><td>Transient</td><td><code>{ns.transientCircuit || "—"}</code></td></tr>
            <tr><td>Noise</td><td><code>{ns.noiseCircuit || "—"}</code></td></tr>
          </tbody></table>
        </div>
      </div>
      <p className="hint">Modes: {run.modes.join(", ") || "—"} · Commit: <code>{run.commitSha?.slice(0, 8) || "—"}</code> · Pass: {passCount} · Fail: {failCount} · N/A: {naCount}</p>
    </div>
  );
}
