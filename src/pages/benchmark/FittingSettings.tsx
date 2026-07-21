/* ==================================================================
 *  FittingSettings (goal.md §7.2)
 * ================================================================== */

const OPTIMIZERS = [
  { value: "nelder_mead", label: "Nelder-Mead" },
  { value: "normalized_nelder_mead", label: "Normalized Nelder-Mead" },
  { value: "lbfgs_fd", label: "L-BFGS Finite Difference" },
  { value: "differential_evolution", label: "Differential Evolution" },
  { value: "trust_region_ls", label: "Trust Region Least Squares" },
];

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
}

export function FittingSettings({ params, onChange, showAdvanced }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });

  return (
    <div>
      <p className="hint" style={{ color: "var(--warn, #b85c00)", fontSize: "0.72rem" }}>
        ⚠ Current tool support: DC IV calibration only. AC/CV fitting is not enabled.
      </p>

      <div className="tool-grid" style={{ marginTop: "0.4rem" }}>
        <SettingField label="Model name">
          <input type="text" value={String(params.modelName ?? "")} placeholder="e.g. nmos_bsim4"
            onChange={(e) => update("modelName", e.target.value)} style={{ width: "140px" }} />
        </SettingField>
        <SettingField label="Device type">
          <select value={String(params.deviceType ?? "nmos")} onChange={(e) => update("deviceType", e.target.value)}>
            <option value="nmos">NMOS</option>
            <option value="pmos">PMOS</option>
          </select>
        </SettingField>
        <SettingField label="Optimizer">
          <select value={String(params.optimizer ?? "nelder_mead")} onChange={(e) => update("optimizer", e.target.value)}>
            {OPTIMIZERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingField>
        <SettingField label="Max iterations">
          <input type="number" value={Number(params.maxIterations ?? 50)} min={1} max={1000}
            onChange={(e) => update("maxIterations", Number(e.target.value))} style={{ width: "80px" }} />
        </SettingField>
        <SettingField label="Target rel. loss">
          <input type="number" value={Number(params.targetRelativeLoss ?? 0.3)} min={0.001} max={10} step={0.01}
            onChange={(e) => update("targetRelativeLoss", Number(e.target.value))} style={{ width: "80px" }} />
        </SettingField>
        <SettingField label="Output filename">
          <input type="text" value={String(params.outputFilename ?? "calibrated.lib")}
            onChange={(e) => update("outputFilename", e.target.value)} style={{ width: "140px" }} />
        </SettingField>
      </div>

      <label style={{ fontSize: "0.78rem", display: "block", marginTop: "0.35rem" }}>
        <input type="checkbox" checked={Boolean(params.plot)} onChange={(e) => update("plot", e.target.checked)} /> Generate plot
      </label>

      {showAdvanced && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-light, #e5e5e5)", paddingTop: "0.5rem" }}>
          <SettingField label="Train parameters (comma-separated)">
            <input type="text" value={String((params.trainParameters as string[])?.join(", ") ?? "vth0, k1, k2, nfactor")}
              onChange={(e) => update("trainParameters", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              style={{ width: "280px" }} />
          </SettingField>
          <SettingField label="Fixed parameters (comma-separated)">
            <input type="text" value={String((params.fixedParameters as string[])?.join(", ") ?? "")}
              onChange={(e) => update("fixedParameters", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              style={{ width: "280px" }} placeholder="Leave empty if none" />
          </SettingField>
          <SettingField label="Step tolerance">
            <input type="number" value={Number(params.stepTolerance ?? 1e-6)} min={1e-12} max={0.1} step={1e-6}
              onChange={(e) => update("stepTolerance", Number(e.target.value))} style={{ width: "100px" }} />
          </SettingField>
          <SettingField label="Jobs">
            <input type="number" value={Number(params.jobs ?? 1)} min={1} max={16}
              onChange={(e) => update("jobs", Number(e.target.value))} style={{ width: "80px" }} />
          </SettingField>
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
