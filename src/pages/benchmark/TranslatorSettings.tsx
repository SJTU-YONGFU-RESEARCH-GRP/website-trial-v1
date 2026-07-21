/* ==================================================================
 *  TranslatorSettings (goal2.md §5.4)
 *  No fixed widths — uses 100% for narrow card fit.
 * ================================================================== */

interface Props {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  showAdvanced: boolean;
  advancedOnly?: boolean;
}

export function TranslatorSettings({ params, onChange, showAdvanced, advancedOnly }: Props) {
  const update = (key: string, value: unknown) => onChange({ ...params, [key]: value });

  const p = (k: string) => params[k];

  if (advancedOnly && !showAdvanced) return null;
  if (advancedOnly && showAdvanced) return <AdvancedFields update={update} p={p} />;
  if (!showAdvanced) return <CoreFields update={update} p={p} />;
  return (
    <div>
      <CoreFields update={update} p={p} />
      <div style={{ marginTop: 6, borderTop: "1px solid var(--border-subtle, #eee)", paddingTop: 6 }}>
        <AdvancedFields update={update} p={p} />
      </div>
    </div>
  );
}

function CoreFields({ update, p }: { update: (k: string, v: unknown) => void; p: (k: string) => unknown }) {
  return (
    <div>
      <div className="bmw-settings-field">
        Source dialect
        <select value={String(p("sourceDialect") ?? "auto")} onChange={(e) => update("sourceDialect", e.target.value)}>
          <option value="auto">Auto-detect</option>
          <option value="ngspice">ngspice</option>
          <option value="spectre">Spectre</option>
          <option value="hspice">HSPICE</option>
        </select>
      </div>
      <div className="bmw-settings-field">
        Target dialect
        <select value={String(p("targetDialect") ?? "ngspice")} onChange={(e) => update("targetDialect", e.target.value)}>
          <option value="ngspice">ngspice</option>
          <option value="spectre">Spectre</option>
          <option value="hspice">HSPICE</option>
        </select>
      </div>
      <div className="bmw-settings-checkboxes">
        <label><input type="checkbox" checked={Boolean(p("followIncludes"))} onChange={(e) => update("followIncludes", e.target.checked)} /> Follow includes</label>
        <label><input type="checkbox" checked={Boolean(p("verify"))} onChange={(e) => update("verify", e.target.checked)} /> Verify syntax</label>
        <label><input type="checkbox" checked={Boolean(p("plot"))} onChange={(e) => update("plot", e.target.checked)} /> Generate plots</label>
      </div>
    </div>
  );
}

function AdvancedFields({ update, p }: { update: (k: string, v: unknown) => void; p: (k: string) => unknown }) {
  return (
    <div>
      <div className="bmw-settings-field">
        Max devices to plot
        <input type="number" value={String(p("maxPlots") ?? 10)} min={0} max={100} onChange={(e) => update("maxPlots", Number(e.target.value))} />
      </div>
      <div className="bmw-settings-field">
        Output filename
        <input type="text" value={String(p("outputFilename") ?? "translated.lib")} onChange={(e) => update("outputFilename", e.target.value)} />
      </div>
      <div className="bmw-settings-checkboxes">
        <label><input type="checkbox" checked={Boolean(p("preserveComments"))} onChange={(e) => update("preserveComments", e.target.checked)} /> Preserve comments</label>
      </div>
    </div>
  );
}
