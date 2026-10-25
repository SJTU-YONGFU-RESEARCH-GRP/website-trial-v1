import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DtcoPoint } from "../../../shared/contracts/dtco";
import { ppaParetoFrontier } from "../../data/ppaMetricRegistry";
import { measuredPoints, pointLabel, relativeChange, selectedMeasurements, type DtcoMeasuredPoint } from "./helpers";

const format = (value: number) => value.toLocaleString(undefined, { maximumSignificantDigits: 6 });
function Scatter({ rows, yMetric, title, frontier }: { rows: DtcoMeasuredPoint[]; yMetric: "powerUw" | "areaUm2"; title: string; frontier: Set<string> }) {
  const maxX = Math.max(...rows.map(row => row.delayPs), 1);
  const maxY = Math.max(...rows.map(row => row[yMetric]), 1);
  return <figure className="dtco-plot"><figcaption>{title} · lower is better</figcaption>
    <svg viewBox="0 0 460 260" role="img" aria-label={title}>
      <line x1="65" y1="210" x2="435" y2="210" stroke="currentColor" /><line x1="65" y1="20" x2="65" y2="210" stroke="currentColor" />
      <text x="65" y="230" textAnchor="middle">0</text><text x="430" y="230" textAnchor="end">{format(maxX)}</text>
      <text x="60" y="25" textAnchor="end">{format(maxY)}</text><text x="60" y="210" textAnchor="end">0</text>
      <text x="255" y="255" textAnchor="middle">Measured propagation delay (ps)</text>
      <text x="10" y="120" transform="rotate(-90 10 120)" textAnchor="middle">{yMetric === "powerUw" ? "Power (µW)" : "GDS boundary area (µm²)"}</text>
      {rows.map(row => <circle key={row.point.id} cx={65 + (row.delayPs / maxX) * 365} cy={210 - (row[yMetric] / maxY) * 185}
        r={frontier.has(row.point.id) ? 6 : 4} fill={frontier.has(row.point.id) ? "var(--accent, #36aa9c)" : "var(--text-muted, #7a8ba3)"} stroke="currentColor">
        <title>{pointLabel(row.point)}: {format(row.delayPs)} ps; {format(row[yMetric])} {yMetric === "powerUw" ? "µW" : "µm²"}{frontier.has(row.point.id) ? "; Pareto" : ""}</title>
      </circle>)}
    </svg><small>Large accent dots: Pareto frontier for these two metrics. Equal measurements may overlap.</small>
  </figure>;
}
export function DtcoComparison({ points }: { points: DtcoPoint[] }): JSX.Element {
  const all = useMemo(() => measuredPoints(points), [points]);
  const [omitted, setOmitted] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ temperature: "", voltage: "", layout: "" });
  const [baselineId, setBaselineId] = useState("");
  const rows = selectedMeasurements(all, omitted, filters);
  const baseline = rows.find(row => row.point.id === baselineId);
  const powerFrontier = new Set(ppaParetoFrontier(rows.map(item => ({ item, x: item.delayPs, y: item.powerUw })), "lower", "lower").map(({ item }) => item.point.id));
  const areaFrontier = new Set(ppaParetoFrontier(rows.map(item => ({ item, x: item.delayPs, y: item.areaUm2 })), "lower", "lower").map(({ item }) => item.point.id));
  const best = { delayPs: Math.min(...rows.map(row => row.delayPs)), powerUw: Math.min(...rows.map(row => row.powerUw)), areaUm2: Math.min(...rows.map(row => row.areaUm2)) };
  const filtered = all.filter(({ point }) => (!filters.temperature || String(point.temperatureC) === filters.temperature)
    && (!filters.voltage || String(point.voltageV) === filters.voltage) && (!filters.layout || point.layoutId === filters.layout));
  if (!all.length) return <p className="jobs-empty">No comparable results yet. Completed runs appear here only when measured delay, power, and layout area are available.</p>;
  const metric = (row: DtcoMeasuredPoint, key: "delayPs" | "powerUw" | "areaUm2") => <td className={!omitted.has(row.point.id) && row[key] === best[key] ? "dtco-best" : undefined}>{format(row[key])}{!omitted.has(row.point.id) && row[key] === best[key] ? <small>Best selected</small> : null}{baseline ? <small>{relativeChange(row[key], baseline[key])} vs baseline</small> : null}</td>;
  return <>
    <p>{all.length} measured results · {rows.length} selected for comparison. All successful comparable combinations are selected by default.</p>
    <div className="dtco-grid dtco-filters">
      <label>Temperature<select aria-label="Temperature" value={filters.temperature} onChange={event => setFilters(current => ({ ...current, temperature: event.target.value }))}><option value="">All temperatures</option>{[...new Set(all.map(row => row.point.temperatureC))].sort((a,b) => a-b).map(value => <option key={value} value={value}>{value} °C</option>)}</select></label>
      <label>Voltage<select aria-label="Voltage" value={filters.voltage} onChange={event => setFilters(current => ({ ...current, voltage: event.target.value }))}><option value="">All voltages</option>{[...new Set(all.map(row => row.point.voltageV))].sort((a,b) => a-b).map(value => <option key={value} value={value}>{value} V</option>)}</select></label>
      <label>Layout<select aria-label="Layout" value={filters.layout} onChange={event => setFilters(current => ({ ...current, layout: event.target.value }))}><option value="">All layouts</option>{[...new Set(all.map(row => row.point.layoutId))].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Baseline (optional)<select aria-label="Baseline (optional)" value={baseline?.point.id ?? ""} onChange={event => setBaselineId(event.target.value)}><option value="">No baseline</option>{rows.map(row => <option key={row.point.id} value={row.point.id}>{pointLabel(row.point)}</option>)}</select></label>
    </div>
    <button type="button" className="jobs-secondary-button" onClick={() => { setOmitted(new Set()); setFilters({ temperature: "", voltage: "", layout: "" }); }}>Select all measured results</button>
    <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Select</th><th>Combination</th><th>Measured propagation delay (ps)</th><th>Power (µW)</th><th>GDS boundary area (µm²)</th><th>Pareto</th><th>Source</th></tr></thead>
      <tbody>{filtered.map(row => <tr key={row.point.id}><td><input type="checkbox" aria-label={`Compare ${pointLabel(row.point)}`} checked={!omitted.has(row.point.id)} onChange={event => setOmitted(current => { const next = new Set(current); if (event.target.checked) next.delete(row.point.id); else next.add(row.point.id); return next; })} /></td><td>{pointLabel(row.point)}</td>{metric(row, "delayPs")}{metric(row, "powerUw")}{metric(row, "areaUm2")}<td>{powerFrontier.has(row.point.id) ? <small>Delay / power</small> : null}{areaFrontier.has(row.point.id) ? <small>Delay / area</small> : null}</td><td>{row.point.jobId ? <Link to={`/jobs/${encodeURIComponent(row.point.jobId)}`}>Real computation</Link> : "Real computation"}</td></tr>)}</tbody>
    </table></div>
    {rows.length ? <div className="dtco-plots"><Scatter rows={rows} yMetric="powerUw" title="Delay vs power" frontier={powerFrontier} /><Scatter rows={rows} yMetric="areaUm2" title="Delay vs area" frontier={areaFrontier} /></div> : <p role="status">Select at least one result to compare.</p>}
  </>;
}
