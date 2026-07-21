/* ==================================================================
 *  ReductionSettings (goal.md §7.3)
 * ================================================================== */

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
}

export function ReductionSettings({ params, onChange, showAdvanced }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });

  return (
    <div>
      <div className="tool-grid">
        <SettingField label="Error tolerance">
          <input type="number" value={Number(params.errorTolerance ?? 0.05)} min={0.001} max={1} step={0.01}
            onChange={(e) => update("errorTolerance", Number(e.target.value))} style={{ width: "80px" }} />
        </SettingField>
        <SettingField label="Min parameters">
          <input type="number" value={Number(params.minParameters ?? 10)} min={1} max={500}
            onChange={(e) => update("minParameters", Number(e.target.value))} style={{ width: "80px" }} />
        </SettingField>
        <SettingField label="Max iterations">
          <input type="number" value={Number(params.maxIterations ?? 100)} min={1} max={1000}
            onChange={(e) => update("maxIterations", Number(e.target.value))} style={{ width: "80px" }} />
        </SettingField>
        <SettingField label="Optimization method">
          <select value={String(params.optimizationMethod ?? "genetic_algorithm")} onChange={(e) => update("optimizationMethod", e.target.value)}>
            <option value="gradient_descent">Gradient Descent</option>
            <option value="genetic_algorithm">Genetic Algorithm</option>
            <option value="bayesian_optimization">Bayesian Optimization</option>
          </select>
        </SettingField>
        <SettingField label="Reduction method">
          <select value={String(params.reductionMethod ?? "sensitivity")} onChange={(e) => update("reductionMethod", e.target.value)}>
            <option value="sensitivity">Sensitivity</option>
            <option value="parameter_pruning">Parameter Pruning</option>
            <option value="lasso">LASSO</option>
          </select>
        </SettingField>
        <SettingField label="Test type">
          <select value={String(params.testType ?? "dc_iv")} onChange={(e) => update("testType", e.target.value)}>
            <option value="dc_iv">DC IV</option>
            <option value="dc_transfer">DC Transfer</option>
            <option value="cv">CV</option>
            <option value="ac">AC</option>
            <option value="combined">Combined</option>
          </select>
        </SettingField>
        <SettingField label="Device type">
          <select value={String(params.deviceType ?? "nmos")} onChange={(e) => update("deviceType", e.target.value)}>
            <option value="nmos">NMOS</option>
            <option value="pmos">PMOS</option>
          </select>
        </SettingField>
      </div>

      <label style={{ fontSize: "0.78rem", display: "block", marginTop: "0.35rem" }}>
        <input type="checkbox" checked={Boolean(params.usePrebuiltNetlist)} onChange={(e) => update("usePrebuiltNetlist", e.target.checked)} /> Use prebuilt netlist
      </label>

      {showAdvanced && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-light, #e5e5e5)", paddingTop: "0.5rem" }}>
          <div className="tool-grid">
            <SettingField label="Initial keep ratio">
              <input type="number" value={Number(params.initialKeepRatio ?? 1)} min={0.1} max={1} step={0.1}
                onChange={(e) => update("initialKeepRatio", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="Sensitivity threshold">
              <input type="number" value={Number(params.sensitivityThreshold ?? 0.01)} min={1e-6} max={1} step={0.001}
                onChange={(e) => update("sensitivityThreshold", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="Reduction stages">
              <input type="number" value={Number(params.reductionStages ?? 1)} min={1} max={10}
                onChange={(e) => update("reductionStages", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="Worker count">
              <input type="number" value={Number(params.workerCount ?? 1)} min={1} max={16}
                onChange={(e) => update("workerCount", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.78rem", fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
