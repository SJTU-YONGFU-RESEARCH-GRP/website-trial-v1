import { useState } from "react";
import { Link } from "react-router-dom";
import type { DtcoOptimization, DtcoOptimizationIteration } from "../../../shared/contracts/dtco";
import { ppaParetoFrontier } from "../../data/ppaMetricRegistry";
import { measuredIterations, objectiveLabels } from "./optimizationHelpers";
const fmt = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumSignificantDigits: 6 }) : "—";
export function DtcoOptimizationComparison({ run }: { run: DtcoOptimization }): JSX.Element {
  const [omitted, setOmitted] = useState<Set<string>>(new Set());
  const [baselineId, setBaselineId] = useState("");
  const all = measuredIterations(run.iterations), rows = all.filter(row => !omitted.has(row.id));
  const baseline = rows.find(row => row.id === baselineId);
  const frontier = new Set(ppaParetoFrontier(rows.map(row => ({ item: row, x: row.metrics!.delayPs, y: row.metrics!.averagePowerW })), "lower", "lower").map(({ item }) => item.id));
  const best = run.iterations.find(row => row.id === run.bestIterationId);
  const scores = all.filter(row => row.score !== null && Number.isFinite(row.score));
  const max = Math.max(...scores.map(row => row.score!), 1e-12), count = Math.max(run.iterations.length - 1, 1);
  let retained = Infinity;
  const path = scores.map(row => { if (row.accepted === true || !Number.isFinite(retained)) retained = row.score!; return `${55 + (row.number - 1) / count * 390},${200 - retained / max * 170}`; }).join(" ");
  const delta = (row: DtcoOptimizationIteration, key: "delayPs" | "averagePowerW" | "areaUm2") => baseline ? ` (${((row.metrics![key] / baseline.metrics![key] - 1) * 100).toFixed(1)}% vs baseline)` : "";
  return <>
    <h3>Retained best and measured PPA</h3>
    {best ? <p className="jobs-notice" role="status"><strong>Retained best: round {best.number}</strong> · {objectiveLabels[run.definition.objective.metric]} · score {fmt(run.bestScore)}. A worse candidate does not replace this result.</p> : <p className="jobs-empty">No measured incumbent yet. Failed or incomplete rounds never contribute fabricated metrics.</p>}
    {!all.length ? null : <>
      <p>{rows.length} / {all.length} measured rounds selected. Power is displayed in µW; power objective scores and targets use W.</p>
      <label>Optimization baseline<select aria-label="Optimization baseline" value={baseline?.id ?? ""} onChange={event => setBaselineId(event.target.value)}><option value="">No baseline</option>{rows.map(row => <option key={row.id} value={row.id}>Round {row.number}</option>)}</select></label>
      <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Select</th><th>Round / parameters</th><th>Measured propagation delay (ps)</th><th>Power (µW)</th><th>GDS boundary area (µm²)</th><th>Objective / decision</th><th>Source</th></tr></thead><tbody>{all.map(row => <tr key={row.id} className={row.id === run.bestIterationId ? "dtco-best" : undefined}>
        <td><input type="checkbox" aria-label={`Compare optimization round ${row.number}`} checked={!omitted.has(row.id)} onChange={event => setOmitted(current => { const next = new Set(current); if (event.target.checked) next.delete(row.id); else next.add(row.id); return next; })} /></td>
        <td>Round {row.number}<small>N {row.candidate.design.nmosWidthUm} µm / P {row.candidate.design.pmosWidthUm} µm</small></td>
        <td>{fmt(row.metrics!.delayPs)}<small>{delta(row, "delayPs")}</small></td><td>{fmt(row.metrics!.averagePowerW * 1e6)}<small>{delta(row, "averagePowerW")}</small></td><td>{fmt(row.metrics!.areaUm2)}<small>{delta(row, "areaUm2")}</small></td>
        <td>{fmt(row.score)}<small>{row.id === run.bestIterationId ? "Retained best" : row.accepted === true ? "Improved at evaluation" : row.accepted === false ? "Not retained" : "Pending evaluation"}</small><small>{frontier.has(row.id) ? "Selected delay / power Pareto" : ""}</small></td><td>{row.jobId ? <Link to={`/jobs/${encodeURIComponent(row.jobId)}`}>Real computation</Link> : "Real computation"}</td>
      </tr>)}</tbody></table></div>
      {scores.length ? <figure className="dtco-plot"><figcaption>Objective trajectory · lower is better</figcaption><svg viewBox="0 0 470 250" role="img" aria-label="Measured objective and best-so-far trajectory"><line x1="55" y1="200" x2="445" y2="200" stroke="currentColor" /><line x1="55" y1="20" x2="55" y2="200" stroke="currentColor" /><text x="50" y="25" textAnchor="end">{fmt(max)}</text><text x="55" y="220">Round 1</text><text x="445" y="220" textAnchor="end">Round {run.iterations.length}</text><polyline points={path} fill="none" stroke="var(--accent, #258879)" strokeWidth="3" />{scores.map(row => <circle key={row.id} cx={55 + (row.number - 1) / count * 390} cy={200 - row.score! / max * 170} r="5" fill="currentColor"><title>Round {row.number}: measured objective {fmt(row.score)}</title></circle>)}</svg><small>Dots: actual measured candidate scores. Accent line: best score so far. All rounds remain visible regardless of comparison selection.</small></figure> : null}
    </>}
  </>;
}
