/* ==================================================================
 *  ReductionSettings (goal2.md §5.4)
 * ================================================================== */

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
  advancedOnly?: boolean;
}

export function ReductionSettings({ params, onChange, showAdvanced, advancedOnly }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });
  const p = (k: string) => params[k];

  if (advancedOnly && !showAdvanced) return null;
  if (advancedOnly && showAdvanced) return <AdvancedFields update={update} p={p} />;

  return (
    <div>
      <CoreFields update={update} p={p} />
      {showAdvanced && (
        <div style={{ marginTop: 6, borderTop: "1px solid var(--border-subtle, #eee)", paddingTop: 6 }}>
          <AdvancedFields update={update} p={p} />
        </div>
      )}
    </div>
  );
}

function CoreFields({ update, p }: { update: (k: string, v: unknown) => void; p: (k: string) => unknown }) {
  return (
    <div>
      <div className="bmw-settings-field">
        Error tolerance
        <input type="number" value={String(p("errorTolerance") ?? 0.05)} min={0.001} max={1} step={0.01} onChange={(e) => update("errorTolerance", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Min parameters
        <input type="number" value={String(p("minParameters") ?? 10)} min={1} max={500} onChange={(e) => update("minParameters", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Max iterations
        <input type="number" value={String(p("maxIterations") ?? 100)} min={1} max={1000} onChange={(e) => update("maxIterations", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Optimization
        <select value={String(p("optimizationMethod") ?? "genetic_algorithm")} onChange={(e) => update("optimizationMethod", e.target.value)}>
          <option value="gradient_descent">Gradient Descent</option>
          <option value="genetic_algorithm">Genetic Algorithm</option>
          <option value="bayesian_optimization">Bayesian Optimization</option>
        </select>
      </div>
      <div className="bmw-settings-field">
        Reduction
        <select value={String(p("reductionMethod") ?? "sensitivity")} onChange={(e) => update("reductionMethod", e.target.value)}>
          <option value="sensitivity">Sensitivity</option>
          <option value="parameter_pruning">Parameter Pruning</option>
          <option value="lasso">LASSO</option>
        </select>
      </div>
      <div className="bmw-settings-field">
        Device type
        <select value={String(p("deviceType") ?? "nmos")} onChange={(e) => update("deviceType", e.target.value)}>
          <option value="nmos">NMOS</option>
          <option value="pmos">PMOS</option>
        </select>
      </div>
      <div className="bmw-settings-checkboxes">
        <label><input type="checkbox" checked={Boolean(p("usePrebuiltNetlist"))} onChange={(e) => update("usePrebuiltNetlist", e.target.checked)} /> Use prebuilt netlist</label>
      </div>
    </div>
  );
}

function AdvancedFields({ update, p }: { update: (k: string, v: unknown) => void; p: (k: string) => unknown }) {
  return (
    <div>
      <div className="bmw-settings-field">
        Test type
        <select value={String(p("testType") ?? "dc_iv")} onChange={(e) => update("testType", e.target.value)}>
          <option value="dc_iv">DC IV</option>
          <option value="dc_transfer">DC Transfer</option>
          <option value="cv">CV</option>
          <option value="ac">AC</option>
          <option value="combined">Combined</option>
        </select>
      </div>
      <div className="bmw-settings-field">
        Initial keep ratio
        <input type="number" value={String(p("initialKeepRatio") ?? 1)} min={0.1} max={1} step={0.1} onChange={(e) => update("initialKeepRatio", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Sensitivity threshold
        <input type="number" value={String(p("sensitivityThreshold") ?? 0.01)} min={1e-6} max={1} step={0.001} onChange={(e) => update("sensitivityThreshold", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Reduction stages
        <input type="number" value={String(p("reductionStages") ?? 1)} min={1} max={10} onChange={(e) => update("reductionStages", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Worker count
        <input type="number" value={String(p("workerCount") ?? 1)} min={1} max={16} onChange={(e) => update("workerCount", Number(e.target.value))} />
      </div>
    </div>
  );
}
