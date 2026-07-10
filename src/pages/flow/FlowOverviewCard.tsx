/**
 * Card 1: End-to-End Flow Overview.
 * Updated for CFET Standard-Cell Library Benchmark Dashboard.
 */
export function FlowOverviewCard(): JSX.Element {
  return (
    <div className="chart-card">
      <h2>CFET Standard-Cell Library P&R Algorithm Comparison Platform</h2>
      <p className="hint" style={{ marginBottom: "0.75rem" }}>
        Evaluates algorithms across a standard-cell library benchmark: layout generation,
        parasitic extraction, and timing characterization for every cell under identical
        technology rules. Supports algorithm, architecture, and ablation comparisons.
      </p>
      <div className="flow-overview-mini">
        {[
          { icon: "⚙️", title: "AutoCellGen-V2", desc: "Layout generation with configurable placement & routing" },
          { icon: "⚡", title: "fastercap_v2", desc: "Parasitic extraction → Maxwell capacitance matrix" },
          { icon: "⏱", title: "libcharx", desc: "NLDM timing characterization per corner" },
          { icon: "📊", title: "DeviceOpt", desc: "Upstream CFET device geometry Pareto optimisation" },
        ].map((s) => (
          <div key={s.title} className="flow-overview-mini__stage">
            <span className="flow-overview-mini__icon">{s.icon}</span>
            <strong>{s.title}</strong>
            <span className="hint">{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
