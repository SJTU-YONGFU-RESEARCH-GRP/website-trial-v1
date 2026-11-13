/* ==================================================================
 *  ExpansionSettings (goal2.md §5.4)
 * ================================================================== */

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
  advancedOnly?: boolean;
}

export function ExpansionSettings({ params, onChange, showAdvanced, advancedOnly }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });
  const p = (k: string) => params[k];

  if (advancedOnly && !showAdvanced) return null;
  if (advancedOnly && showAdvanced) return <MonteCarloFields update={update} p={p} />;

  return (
    <div>
      <p className="hint" style={{ fontSize: "0.67rem", margin: "0 0 4px 0" }}>
        Generates T/S/F corners. Derived corners are not foundry-certified.
      </p>
      <CoreFields update={update} p={p} />
      {Boolean(p("monteCarlo")) && (
        <div style={{ marginTop: 6, padding: 6, background: "var(--surface-inset, #f9f9f9)", borderRadius: 6 }}>
          <strong style={{ fontSize: "0.7rem" }}>Monte Carlo Setup</strong>
          <MonteCarloFields update={update} p={p} />
        </div>
      )}
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
        <input type="text" value={String(p("modelName") ?? "")} placeholder="nmos_bsim4_red" onChange={(e) => update("modelName", e.target.value)} />
      </div>
      <div className="bmw-settings-field">
        nσ
        <input type="number" value={String(p("nSigma") ?? 3)} min={0.5} max={10} step={0.5} onChange={(e) => update("nSigma", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-checkboxes">
        <label><input type="checkbox" checked={Boolean(p("generateTSF") ?? true)} onChange={(e) => update("generateTSF", e.target.checked)} /> T/S/F corners</label>
        <label><input type="checkbox" checked={Boolean(p("runIv") ?? true)} onChange={(e) => update("runIv", e.target.checked)} /> IV characterization</label>
        <label><input type="checkbox" checked={Boolean(p("runCv") ?? true)} onChange={(e) => update("runCv", e.target.checked)} /> CV characterization</label>
        <label><input type="checkbox" checked={Boolean(p("monteCarlo") ?? false)} onChange={(e) => update("monteCarlo", e.target.checked)} /> Monte Carlo</label>
        <label><input type="checkbox" checked={Boolean(p("plot") ?? true)} onChange={(e) => update("plot", e.target.checked)} /> Generate plots</label>
      </div>
    </div>
  );
}

function MonteCarloFields({ update, p }: { update: (k: string, v: unknown) => void; p: (k: string) => unknown }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div className="bmw-settings-field">Samples <input type="number" value={String(p("mcSamples") ?? 100)} min={10} max={10000} onChange={(e) => update("mcSamples", Number(e.target.value))} /></div>
      <div className="bmw-settings-field">Distribution <select value={String(p("distribution") ?? "normal")} onChange={(e) => update("distribution", e.target.value)}><option value="normal">Normal</option><option value="uniform">Uniform</option><option value="lognormal">Lognormal</option></select></div>
      <div className="bmw-settings-field">Seed <input type="number" value={String(p("seed") ?? 42)} min={0} max={999999} onChange={(e) => update("seed", Number(e.target.value))} /></div>
    </div>
  );
}

function AdvancedFields({ update, p }: { update: (k: string, v: unknown) => void; p: (k: string) => unknown }) {
  return (
    <div>
      <div className="bmw-settings-field">MC nσ <input type="number" value={String(p("mcNSigma") ?? 3)} min={0.5} max={10} step={0.5} onChange={(e) => update("mcNSigma", Number(e.target.value))} /></div>
      <div className="bmw-settings-field">VDS at <input type="number" value={String(p("vdsAt") ?? 0.05)} min={0} max={10} step={0.01} onChange={(e) => update("vdsAt", Number(e.target.value))} /></div>
      <div className="bmw-settings-field">VGS at <input type="number" value={String(p("vgsAt") ?? 3.3)} min={0} max={10} step={0.1} onChange={(e) => update("vgsAt", Number(e.target.value))} /></div>
      <div className="bmw-settings-field">Histogram bins <input type="number" value={String(p("histogramBins") ?? 30)} min={5} max={200} onChange={(e) => update("histogramBins", Number(e.target.value))} /></div>
      <div className="bmw-settings-field">Jobs <input type="number" value={String(p("jobs") ?? 1)} min={1} max={16} onChange={(e) => update("jobs", Number(e.target.value))} /></div>
    </div>
  );
}
