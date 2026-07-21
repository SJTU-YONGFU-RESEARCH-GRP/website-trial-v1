/* ==================================================================
 *  FittingSettings (goal2.md §5.4)
 * ================================================================== */

const OPTIMIZERS = [
  { value: "nelder_mead", label: "Nelder-Mead" },
  { value: "normalized_nelder_mead", label: "Normalized Nelder-Mead" },
  { value: "lbfgs_fd", label: "L-BFGS FD" },
  { value: "differential_evolution", label: "Differential Evolution" },
  { value: "trust_region_ls", label: "Trust Region LS" },
];

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
  advancedOnly?: boolean;
}

export function FittingSettings({ params, onChange, showAdvanced, advancedOnly }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });
  const p = (k: string) => params[k];

  if (advancedOnly && !showAdvanced) return null;
  if (advancedOnly && showAdvanced) return <AdvancedFields update={update} p={p} />;

  return (
    <div>
      <p className="hint" style={{ color: "var(--warn, #b85c00)", fontSize: "0.67rem", margin: "0 0 4px 0" }}>
        ⚠ DC IV calibration only. AC/CV not enabled.
      </p>
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
        Model name
        <input type="text" value={String(p("modelName") ?? "")} placeholder="nmos_bsim4" onChange={(e) => update("modelName", e.target.value)} />
      </div>
      <div className="bmw-settings-field">
        Device type
        <select value={String(p("deviceType") ?? "nmos")} onChange={(e) => update("deviceType", e.target.value)}>
          <option value="nmos">NMOS</option>
          <option value="pmos">PMOS</option>
        </select>
      </div>
      <div className="bmw-settings-field">
        Optimizer
        <select value={String(p("optimizer") ?? "nelder_mead")} onChange={(e) => update("optimizer", e.target.value)}>
          {OPTIMIZERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="bmw-settings-field">
        Max iterations
        <input type="number" value={String(p("maxIterations") ?? 50)} min={1} max={1000} onChange={(e) => update("maxIterations", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Target rel. loss
        <input type="number" value={String(p("targetRelativeLoss") ?? 0.3)} min={0.001} max={10} step={0.01} onChange={(e) => update("targetRelativeLoss", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-checkboxes" style={{ marginTop: 4 }}>
        <label><input type="checkbox" checked={Boolean(p("plot"))} onChange={(e) => update("plot", e.target.checked)} /> Generate plot</label>
      </div>
    </div>
  );
}

function AdvancedFields({ update, p }: { update: (k: string, v: unknown) => void; p: (k: string) => unknown }) {
  return (
    <div>
      <div className="bmw-settings-field">
        Train parameters
        <input type="text" value={String((p("trainParameters") as string[])?.join(", ") ?? "vth0, k1, k2, nfactor")}
          onChange={(e) => update("trainParameters", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
      </div>
      <div className="bmw-settings-field">
        Fixed parameters
        <input type="text" value={String((p("fixedParameters") as string[])?.join(", ") ?? "")}
          onChange={(e) => update("fixedParameters", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
          placeholder="Leave empty if none" />
      </div>
      <div className="bmw-settings-field">
        Output filename
        <input type="text" value={String(p("outputFilename") ?? "calibrated.lib")} onChange={(e) => update("outputFilename", e.target.value)} />
      </div>
      <div className="bmw-settings-field">
        Step tolerance
        <input type="number" value={String(p("stepTolerance") ?? 1e-6)} min={1e-12} max={0.1} step={1e-6} onChange={(e) => update("stepTolerance", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Jobs
        <input type="number" value={String(p("jobs") ?? 1)} min={1} max={16} onChange={(e) => update("jobs", Number(e.target.value))} />
      </div>
    </div>
  );
}
