import { useMemo, useState } from "react";
import type { ResultRecordV1 } from "../../../shared/contracts/v1";
import { acgComparisonRows, acgDeltaText, acgEngineName, acgNumericDelta, comparisonValueText } from "./comparison";

export function AcgResultComparison({ results, baselineId, onBaseline }: {
  results: ResultRecordV1[]; baselineId: string | null; onBaseline(id: string): void;
}): JSX.Element {
  const rows = useMemo(() => acgComparisonRows(results), [results]);
  const scopes = useMemo(() => [...new Set(rows.map(row => row.scope))], [rows]);
  const [scope, setScope] = useState("");
  const activeScope = scopes.includes(scope) ? scope : "";
  return <section className="chart-card acg-comparison" aria-label="ACG horizontal comparison">
    <header className="acg-heading"><div><h2>Result comparison</h2><p>{results.length} selected result{results.length === 1 ? "" : "s"} · {rows.length} metric rows across all selected results</p></div></header>
    <div className="digital-field-grid acg-comparison-controls">
      <label>Baseline result<select aria-label="Baseline result" value={baselineId ?? ""} onChange={event => onBaseline(event.target.value)}>{results.map(result => <option key={result.id} value={result.id}>{result.title} · {result.id}</option>)}</select></label>
      <label>Comparison scope<select aria-label="Comparison scope" value={activeScope} onChange={event => setScope(event.target.value)}><option value="">All scopes</option>{scopes.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className="acg-help">The first selection is the default baseline; choose another above. Δ shows the signed change and percentage of the baseline magnitude for compatible metrics. Zero baselines have no percentage. — means missing; Unavailable means no usable value. Cells, trials and job totals stay separate.</p>
    <div className="acg-table-wrap acg-comparison-scroll" role="region" aria-label="Comparison metrics" tabIndex={0}>
      <table className="acg-comparison-table">
        <caption>Metric union of selected ACG results; values remain in their recorded scopes.</caption>
        <thead><tr><th scope="col">Scope / Metric</th>{results.map(result => <th scope="col" key={result.id} data-result-id={result.id}><strong>{result.title}</strong><code>{result.id}</code><span>{acgEngineName(result)}{result.id === baselineId ? " · Baseline" : ""}</span></th>)}</tr></thead>
        <tbody>{rows.filter(row => !activeScope || row.scope === activeScope).map(row => <tr key={row.id} data-metric-id={row.id} data-scope={row.scope}><th scope="row"><small>{row.scope}</small>{row.label}</th>{results.map(result => {
          const value = row.values[result.id];
          const delta = result.id === baselineId ? null : acgNumericDelta(value, row.values[baselineId ?? ""]);
          return <td key={result.id} data-result-id={result.id}><span className="acg-comparison-value" title={!value ? "Not recorded in this result" : undefined}>{comparisonValueText(value)}{value?.unit && value.value !== null && value.value !== undefined && !(typeof value.value === "number" && !Number.isFinite(value.value)) ? " " + value.unit : ""}</span>{delta && value?.unit ? <span className="acg-comparison-delta">{acgDeltaText(delta, value.unit)}</span> : null}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  </section>;
}
