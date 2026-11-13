import { Link } from "react-router-dom";
import { ppaParetoFrontier } from "../../data/ppaMetricRegistry";
import { relativeChange } from "./helpers";
import { measurementMode, type DtcoSavedMeasurement } from "./resultHelpers";

import { isSelectionResult, type DtcoSavedResult, type DtcoSavedSelectionEvaluation } from "./unifiedResultHelpers";
import { selectionFeasible, selectionMetric } from "./selectionHelpers";
import { FREQUENCY_RERUN_LABEL } from "./frequencyProtocol";

const format = (value: number) => value.toLocaleString(undefined, { maximumSignificantDigits: 6 });
type Metric = "delayPs" | "averagePowerW" | "areaUm2";
function metricValue(row: DtcoSavedResult, metric: Metric): number | null {
  const value = isSelectionResult(row) ? metric === "delayPs" ? row.evaluation.pathDelayNs === null ? null : row.evaluation.pathDelayNs * 1000 : metric === "areaUm2" ? row.evaluation.areaUm2 : null : row.metrics[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function frontierIds(rows: DtcoSavedResult[], metric: Metric): Set<string> {
  const groups = new Map<string, DtcoSavedResult[]>();
  for (const row of rows) if (!isSelectionResult(row) || selectionFeasible(row.evaluation)) groups.set(row.comparisonKey, [...(groups.get(row.comparisonKey) ?? []), row]);
  return new Set([...groups.values()].flatMap(group => ppaParetoFrontier(group.flatMap(item => {
    const x = metricValue(item, "delayPs"), y = metricValue(item, metric);
    return x !== null && y !== null ? [{ item, x, y }] : [];
  }), "lower", "lower").map(({ item }) => item.id)));
}
function Scatter({ rows, metric, title, frontier, positions }: { rows: DtcoSavedResult[]; metric: "averagePowerW" | "areaUm2"; title: string; frontier: Set<string>; positions: Map<string, number> }) {
  const hasSelection = rows.some(isSelectionResult);
  const points = rows.flatMap(row => { const x = metricValue(row, "delayPs"), y = metricValue(row, metric); return x !== null && y !== null ? [{ row, x, y }] : []; });
  if (!points.length) return <p className="jobs-empty">{title}: {metric === "averagePowerW" && hasSelection ? "Power is unavailable for standard-cell selection; it was not characterized." : "No finite delay and area pair was published for the selected results."}</p>;
  const maxX = Math.max(...points.map(point => point.x), 1e-12), scale = metric === "averagePowerW" ? 1e6 : 1;
  const maxY = Math.max(...points.map(point => point.y * scale), 1e-12);
  return <figure className="dtco-plot"><figcaption>{title} · lower is better</figcaption>
    <svg viewBox="0 0 460 260" role="img" aria-label={title}>
      <line x1="65" y1="210" x2="435" y2="210" stroke="currentColor" /><line x1="65" y1="20" x2="65" y2="210" stroke="currentColor" />
      <text x="65" y="230" textAnchor="middle">0</text><text x="430" y="230" textAnchor="end">{format(maxX)}</text>
      <text x="60" y="25" textAnchor="end">{format(maxY)}</text><text x="60" y="210" textAnchor="end">0</text>
      <text x="255" y="255" textAnchor="middle">{hasSelection ? "Measured / STA path delay (ps)" : "Measured propagation delay (ps)"}</text>
      <text x="10" y="120" transform="rotate(-90 10 120)" textAnchor="middle">{metric === "averagePowerW" ? "Power (µW)" : hasSelection ? "Physical / Liberty area (µm²)" : "Physical area (µm²)"}</text>
      {points.map(({ row, x, y }) => <g key={row.id}><circle cx={65 + x / maxX * 365} cy={210 - y * scale / maxY * 185} r={frontier.has(row.id) ? 6 : 4} fill={frontier.has(row.id) ? "var(--accent)" : "var(--muted)"} stroke="currentColor"><title>{row.name} · {row.label} · {isSelectionResult(row) ? "STA path delay / Liberty cell-area sum" : measurementMode(row.mode)} · {row.conditions}: {format(x)} ps; {format(y * scale)}</title></circle><text x={73 + x / maxX * 365} y={205 - y * scale / maxY * 185}>{positions.get(row.id)}</text></g>)}
    </svg><small>Numbers match the selected rows. Accent dots: feasible Pareto within matching conditions and scope; equal values may overlap.{hasSelection && metric === "averagePowerW" ? " Standard-cell power: N/A · not characterized." : null}</small>
  </figure>;
}
export function DtcoComparison({ rows, baselineId, onBaselineChange }: { rows: DtcoSavedResult[]; baselineId: string; onBaselineChange(id: string): void }): JSX.Element {
  const positions = new Map(rows.map((row, index) => [row.id, index + 1]));
  const baseline = rows.find(row => row.id === baselineId);
  const measured = rows.filter((row): row is DtcoSavedMeasurement => !isSelectionResult(row));
  const hasSelection = rows.some(isSelectionResult);
  const power = frontierIds(rows, "averagePowerW"), area = frontierIds(rows, "areaUm2");
  const mixed = new Set(rows.map(row => row.comparisonKey)).size > 1;
  const cell = (row: DtcoSavedMeasurement, key: Metric) => {
    const value = row.metrics[key];
    if (value === null) return <td>Unavailable<small>No physical area measurement was published.</small></td>;
    const peers = measured.filter(peer => peer.comparisonKey === row.comparisonKey && typeof peer.metrics[key] === "number");
    const best = value === Math.min(...peers.map(peer => peer.metrics[key]!));
    return <td className={best ? "dtco-best" : undefined}>{format(value * (key === "averagePowerW" ? 1e6 : 1))}{best ? <small>Best in matching group</small> : null}{baseline ? <small>{!isSelectionResult(baseline) && row.comparisonKey === baseline.comparisonKey && baseline.metrics[key] !== null ? `${relativeChange(value, baseline.metrics[key]!)} vs baseline` : "Different conditions / scope"}</small> : null}</td>;
  };
  const selectionCell = (row: DtcoSavedSelectionEvaluation, key: "pathDelayNs" | "areaUm2") => {
    const value = row.evaluation[key], scale = key === "pathDelayNs" ? 1000 : 1;
    const comparable = baseline && isSelectionResult(baseline) && baseline.comparisonKey === row.comparisonKey && selectionFeasible(row.evaluation) && selectionFeasible(baseline.evaluation);
    const base = baseline && isSelectionResult(baseline) ? baseline.evaluation[key] : null;
    return <td>{value === null ? "Unknown" : selectionMetric(value * scale)}<small>{key === "pathDelayNs" ? "STA path delay" : "Liberty cell-area sum"}</small>{baseline ? <small>{comparable && value !== null && base !== null ? `${relativeChange(value, base)} vs baseline` : "Different scope or unverified timing"}</small> : null}</td>;
  };
  return <section id="dtco-comparison" aria-labelledby="dtco-comparison-title">
    <h3 id="dtco-comparison-title">Selected result comparison</h3>
    <p>{rows.length} saved results selected. Standard-cell candidates retain their reported feasibility.</p>
    {mixed ? <p className="digital-callout digital-callout--warning">Selected results use different conditions, models, environments, or measurement scopes. Read each source label. Best, Pareto, and baseline changes are calculated only within matching groups.</p> : null}
    <label className="dtco-baseline">Baseline (optional)<select aria-label="Baseline (optional)" value={baseline?.id ?? ""} onChange={event => onBaselineChange(event.target.value)}><option value="">No baseline</option>{rows.map(row => <option key={row.id} value={row.id}>{row.name} · {row.label}</option>)}</select></label>
    <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Selected result / source</th><th>Conditions / scope</th><th>{hasSelection ? "Delay (ps) · measurement or STA" : "Measured propagation delay (ps)"}</th><th>Power (µW)</th><th>{hasSelection ? "Area (µm²) · physical or Liberty" : "Physical area (µm²)"}</th><th>Maximum verified cell toggle frequency (Hz)</th>{hasSelection ? <><th>Setup slack (ns)</th><th>Hold slack (ns)</th><th>Global max slack (ns)</th><th>Global min slack (ns)</th></> : null}<th>Pareto / timing status</th></tr></thead><tbody>
      {rows.map((row, index) => isSelectionResult(row) ? <tr key={row.id}>
        <td>{index + 1}. {row.name}<small>{row.label}</small><small>Standard-cell selection</small></td><td>{row.conditions}<small>Pre-layout Liberty / OpenSTA</small><small>{Object.entries(row.evaluation.assignment).map(([instance, drive]) => `${instance}: X${drive}`).join(" · ")}</small></td>
        {selectionCell(row, "pathDelayNs")}<td>N/A<small>Not characterized</small></td>{selectionCell(row, "areaUm2")}<td>N/A<small>No toggle-frequency measurement</small></td>
        <td>{row.evaluation.timingKind === "combinational" && row.evaluation.setupSlackNs === null ? "N/A · combinational" : selectionMetric(row.evaluation.setupSlackNs)}</td><td>{row.evaluation.timingKind === "combinational" && row.evaluation.holdSlackNs === null ? "N/A · combinational" : selectionMetric(row.evaluation.holdSlackNs)}</td><td>{selectionMetric(row.evaluation.maxSlackNs)}</td><td>{selectionMetric(row.evaluation.minSlackNs)}</td>
        <td>{selectionFeasible(row.evaluation) ? "Pass" : row.evaluation.status}{area.has(row.id) ? <small>Delay / area</small> : null}<small>{row.evaluation.reason}</small><small>STA path delay is descriptive; no silicon Fmax.</small></td>
      </tr> : <tr key={row.id}><td>{index + 1}. {row.name}<small>{row.label}</small><small>{row.origin === "optimization" ? "Automatic optimization" : "Batch experiment"} · Real computation</small><Link to={`/results/dtco/${encodeURIComponent(row.id)}`}>Measured result</Link></td><td>{row.conditions}<small>{row.sizing}</small><small>{measurementMode(row.mode)}</small></td>{cell(row, "delayPs")}{cell(row, "averagePowerW")}{cell(row, "areaUm2")}<td>{typeof row.metrics.maxFrequencyHz === "number" && Number.isFinite(row.metrics.maxFrequencyHz) && row.metrics.maxFrequencyHz > 0 ? format(row.metrics.maxFrequencyHz) : "Unavailable"}<small>{row.frequencyRerunReason ? <><strong>{FREQUENCY_RERUN_LABEL}.</strong> {row.frequencyRerunReason}</> : "Bracketed cell-arc toggle measurement; not chip clock Fmax."}</small></td>{hasSelection ? <><td>N/A</td><td>N/A</td><td>N/A</td><td>N/A</td></> : null}<td>{power.has(row.id) ? <small>Delay / power</small> : null}{area.has(row.id) ? <small>Delay / area</small> : null}</td></tr>)}
    </tbody></table></div>
    <div className="dtco-plots"><Scatter rows={rows} metric="averagePowerW" title="Delay vs power" frontier={power} positions={positions} /><Scatter rows={rows} metric="areaUm2" title="Delay vs area" frontier={area} positions={positions} /></div>
  </section>;
}
