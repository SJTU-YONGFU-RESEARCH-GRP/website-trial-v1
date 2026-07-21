/* ==================================================================
 *  ScenarioSelector (goal2.md §4.2)
 *  Simplified: integrated-demo and custom-local only.
 * ================================================================== */

import "../../benchmark-workspace.css";

export type ScenarioMode = "integrated-demo" | "custom-local";

interface ScenarioSelectorProps { mode: ScenarioMode; onChange: (mode: ScenarioMode) => void }

const OPTIONS: { value: ScenarioMode; label: string; desc: string }[] = [
  { value: "integrated-demo", label: "Integrated Workflow Demo", desc: "Deterministic demo: Convert → Calibrate → Reduce → Expand → Benchmark. Synthetic Spectre/HSPICE data included." },
  { value: "custom-local", label: "Custom Local Model", desc: "Upload or paste your own SPICE model. Configure operations and preview invocation. No execution in browser." },
];

export function ScenarioSelector({ mode, onChange }: ScenarioSelectorProps) {
  return (
    <div>
      <h3 className="flow-subsection-title">Scenario</h3>
      <div className="tool-grid">
        {OPTIONS.map((opt) => {
          const isActive = mode === opt.value;
          return (
            <div
              key={opt.value}
              className={`chart-card bmw-scenario-option${isActive ? " bmw-scenario-option--active" : ""}`}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => e.key === "Enter" && onChange(opt.value)}
              tabIndex={0}
              role="radio"
              aria-checked={isActive}
            >
              <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                {isActive && <span className="bmw-scenario-dot">●</span>}
                {opt.label}
              </div>
              <p className="hint" style={{ fontSize: "0.72rem", margin: 0 }}>{opt.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
