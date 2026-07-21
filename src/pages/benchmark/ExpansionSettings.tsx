/* ==================================================================
 *  ExpansionSettings (goal.md §7.4)
 * ================================================================== */

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
}

export function ExpansionSettings({ params, onChange, showAdvanced }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });

  return (
    <div>
      <p className="hint" style={{ fontSize: "0.72rem" }}>
        Generates T/S/F corners and optional Monte Carlo variants from a TT model.{" "}
        Derived corners are not foundry-certified.
      </p>

      <div className="tool-grid" style={{ marginTop: "0.4rem" }}>
        <SettingField label="Model name">
          <input type="text" value={String(params.modelName ?? "")} placeholder="e.g. nmos_bsim4_red"
            onChange={(e) => update("modelName", e.target.value)} style={{ width: "160px" }} />
        </SettingField>
        <SettingField label="nσ">
          <input type="number" value={Number(params.nSigma ?? 3)} min={0.5} max={10} step={0.5}
            onChange={(e) => update("nSigma", Number(e.target.value))} style={{ width: "80px" }} />
        </SettingField>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.generateTSF ?? true)}
            onChange={(e) => update("generateTSF", e.target.checked)} /> Generate T/S/F corners
        </label>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.runIv ?? true)}
            onChange={(e) => update("runIv", e.target.checked)} /> Run IV characterization
        </label>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.runCv ?? true)}
            onChange={(e) => update("runCv", e.target.checked)} /> Run CV characterization
        </label>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.monteCarlo ?? false)}
            onChange={(e) => update("monteCarlo", e.target.checked)} /> Enable Monte Carlo
        </label>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.plot ?? true)}
            onChange={(e) => update("plot", e.target.checked)} /> Generate plots
        </label>
      </div>

      {Boolean(params.monteCarlo) && (
        <div style={{ marginTop: "0.4rem", padding: "0.5rem", background: "var(--surface-inset, #f9f9f9)", borderRadius: "6px" }}>
          <strong style={{ fontSize: "0.78rem" }}>Monte Carlo Setup</strong>
          <div className="tool-grid" style={{ marginTop: "0.3rem" }}>
            <SettingField label="Samples">
              <input type="number" value={Number(params.mcSamples ?? 100)} min={10} max={10000}
                onChange={(e) => update("mcSamples", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="Distribution">
              <select value={String(params.distribution ?? "normal")} onChange={(e) => update("distribution", e.target.value)}>
                <option value="normal">Normal</option>
                <option value="uniform">Uniform</option>
                <option value="lognormal">Lognormal</option>
              </select>
            </SettingField>
            <SettingField label="Seed">
              <input type="number" value={Number(params.seed ?? 42)} min={0} max={999999}
                onChange={(e) => update("seed", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
          </div>
        </div>
      )}

      {showAdvanced && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-light, #e5e5e5)", paddingTop: "0.5rem" }}>
          <div className="tool-grid">
            <SettingField label="MC nσ">
              <input type="number" value={Number(params.mcNSigma ?? 3)} min={0.5} max={10} step={0.5}
                onChange={(e) => update("mcNSigma", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="VDS at">
              <input type="number" value={Number(params.vdsAt ?? 0.05)} min={0} max={10} step={0.01}
                onChange={(e) => update("vdsAt", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="VGS at">
              <input type="number" value={Number(params.vgsAt ?? 3.3)} min={0} max={10} step={0.1}
                onChange={(e) => update("vgsAt", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="Histogram bins">
              <input type="number" value={Number(params.histogramBins ?? 30)} min={5} max={200}
                onChange={(e) => update("histogramBins", Number(e.target.value))} style={{ width: "80px" }} />
            </SettingField>
            <SettingField label="Jobs">
              <input type="number" value={Number(params.jobs ?? 1)} min={1} max={16}
                onChange={(e) => update("jobs", Number(e.target.value))} style={{ width: "80px" }} />
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
