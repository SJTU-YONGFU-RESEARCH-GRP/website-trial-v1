/* ==================================================================
 *  TranslatorSettings (goal.md §7.1)
 * ================================================================== */

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
}

export function TranslatorSettings({ params, onChange, showAdvanced }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });

  return (
    <div>
      <div className="tool-grid">
        <SettingField label="Source dialect">
          <select value={String(params.sourceDialect ?? "auto")} onChange={(e) => update("sourceDialect", e.target.value)}>
            <option value="auto">Auto-detect</option>
            <option value="ngspice">ngspice</option>
            <option value="spectre">Spectre</option>
            <option value="hspice">HSPICE</option>
          </select>
        </SettingField>
        <SettingField label="Target dialect">
          <select value={String(params.targetDialect ?? "ngspice")} onChange={(e) => update("targetDialect", e.target.value)}>
            <option value="ngspice">ngspice</option>
            <option value="spectre">Spectre</option>
            <option value="hspice">HSPICE</option>
          </select>
        </SettingField>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.followIncludes)} onChange={(e) => update("followIncludes", e.target.checked)} /> Follow includes
        </label>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.verify)} onChange={(e) => update("verify", e.target.checked)} /> Verify syntax
        </label>
        <label style={{ fontSize: "0.78rem" }}>
          <input type="checkbox" checked={Boolean(params.plot)} onChange={(e) => update("plot", e.target.checked)} /> Generate plots
        </label>
      </div>
      {showAdvanced && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-light, #e5e5e5)", paddingTop: "0.5rem" }}>
          <SettingField label="Max devices to plot">
            <input type="number" value={Number(params.maxPlots ?? 10)} min={0} max={100}
              onChange={(e) => update("maxPlots", Number(e.target.value))} style={{ width: "80px" }} />
          </SettingField>
          <SettingField label="Output filename">
            <input type="text" value={String(params.outputFilename ?? "translated.lib")}
              onChange={(e) => update("outputFilename", e.target.value)} style={{ width: "200px" }} />
          </SettingField>
          <label style={{ fontSize: "0.78rem", display: "block", marginTop: "0.35rem" }}>
            <input type="checkbox" checked={Boolean(params.preserveComments)} onChange={(e) => update("preserveComments", e.target.checked)} /> Preserve comments
          </label>
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
