/**
 * Card 1: End-to-End Flow Overview.
 * Shows a 4-step flowchart where DeviceOpt is drawn as an independent
 * optimization loop branching from the layout2timing_flow pipeline.
 */
export function FlowOverviewCard(): JSX.Element {
  return (
    <div className="chart-card">
      <h2>End-to-End Flow Overview</h2>
      <p className="hint" style={{ marginBottom: "0.35rem" }}>
        This page tracks the full standard-cell characterization flow: from{" "}
        <strong>layout generation</strong> (AutoCellGen-V2) through{" "}
        <strong>parasitic extraction</strong> (fastercap_v2) and{" "}
        <strong>timing characterization</strong> (libcharx), with{" "}
        <strong>device optimization</strong> (DeviceOpt) running as an
        independent multi‑objective loop.
      </p>
      <div className="flow-flowchart">
        {/* Linear pipeline (layout2timing_flow) */}
        <div className="flow-flowchart__step flow-step--done">
          <span className="flow-step__icon">📐</span>
          <span className="flow-step__label">Layout Gen</span>
          <span className="flow-step__sub">AutoCellGen</span>
        </div>
        <div className="flow-flowchart__arrow">→</div>
        <div className="flow-flowchart__step flow-step--done">
          <span className="flow-step__icon">⚡</span>
          <span className="flow-step__label">Parasitic Extr.</span>
          <span className="flow-step__sub">fastercap_v2</span>
        </div>
        <div className="flow-flowchart__arrow">→</div>
        <div className="flow-flowchart__step flow-step--done">
          <span className="flow-step__icon">⏱</span>
          <span className="flow-step__label">Timing Char.</span>
          <span className="flow-step__sub">libcharx</span>
        </div>
        {/* DeviceOpt as independent loop */}
        <div className="flow-flowchart__arrow flow-arrow--branch">↕</div>
        <div className="flow-flowchart__step flow-step--done flow-step--opt">
          <span className="flow-step__icon">🎯</span>
          <span className="flow-step__label">Device Opt.</span>
          <span className="flow-step__sub">DeviceOpt</span>
        </div>
      </div>
      <p className="hint" style={{ marginTop: "0.3rem", marginBottom: 0, fontSize: "0.72rem" }}>
        <strong>layout2timing_flow</strong> orchestrates the pipeline (layout → PEX → timing).
        DeviceOpt runs independently — sweeping transistor dimensions, extracting parasitics,
        and evaluating the Pareto frontier for performance, area, and power.
      </p>
    </div>
  );
}
