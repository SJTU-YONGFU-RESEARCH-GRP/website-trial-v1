import { useState } from "react";
import { Link } from "react-router-dom";
import type { DtcoOption } from "../../../shared/contracts/dtco";
import { useAuth } from "../../auth/AuthContext";
import { DTCO_SCOPE, canRetryPoint, definitionToForm, pointLabel, type DtcoForm } from "./helpers";
import { DtcoComparison } from "./DtcoComparison";
import { DtcoJobDetails } from "./DtcoJobDetails";
import { useDtcoWorkspace } from "./useDtcoWorkspace";
import "../../jobs.css";
import "./dtco.css";

export function DtcoPage(): JSX.Element {
  const state = useDtcoWorkspace();
  const { readOnlyDemo } = useAuth();
  const { options, experiment, form, setForm, history, loading, busy, error, notice, validation, dirty, active, perform } = state;
  const [revision, setRevision] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const disabled = busy || loading || readOnlyDemo;
  const update = <K extends keyof DtcoForm>(key: K, value: DtcoForm[K]) => setForm(current => current ? { ...current, [key]: value } : current);
  const select = (label: string, key: "circuitId" | "technologyId" | "modelVersion", choices: DtcoOption[]) => <label>{label}<select aria-label={label} value={form?.[key] ?? ""} disabled={disabled} onChange={event => update(key, event.target.value)}>{choices.map(option => <option value={option.id} key={option.id} disabled={!option.available}>{option.label}{!option.available ? " (unavailable)" : ""}</option>)}</select>{choices.filter(option => !option.available).map(option => <small key={option.id}>{option.reason}</small>)}</label>;
  const currentRevision = experiment?.revisions.find(item => item.revision === revision);
  const viewed = currentRevision ?? (experiment ? { revision: experiment.revision, points: experiment.points, definition: experiment.definition, environmentHash: options?.environmentHash } : null);
  const viewKey = experiment ? `${experiment.id}-${viewed?.revision}` : "new";
  const pending = Boolean(experiment?.points.some(point => point.status === "unsubmitted"));
  return <div className="dtco-page jobs-page workspace-page">
    <header className="jobs-page__header"><div><p className="jobs-eyebrow">Design–technology co-optimization · stages 1–3</p><h1>DTCO experiments</h1><p>Configure one experiment, execute its parameter combinations, and compare measured results.</p></div><button className="jobs-secondary-button" type="button" disabled={disabled || !options} onClick={() => { setRevision(null); setJobId(null); void perform("new"); }}>New experiment</button></header>
    <div className="dtco-steps" aria-label="Experiment workflow"><a href="#dtco-configuration">1 · Experiment configuration</a><a href="#dtco-progress">2 · Execution progress</a><a href="#dtco-comparison">3 · Result comparison</a><a href="#dtco-history">History</a></div>
    <p className="jobs-notice jobs-notice--warning dtco-scope"><strong>Measurement scope:</strong> {DTCO_SCOPE}</p>
    {options?.publicRunner ? <p className="hint">Public runner: experiment history and artifacts are shared across visitors.</p> : null}
    {error ? <p className="jobs-notice jobs-notice--error" role="alert">{error}</p> : null}
    {notice ? <p className="jobs-notice" role="status">{notice}</p> : null}
    {loading ? <p role="status">Loading experiment…</p> : null}
    {!options && !loading ? <p className="jobs-empty">DTCO options could not be loaded. Reload this page to reconnect.</p> : null}
    {options && form ? <section id="dtco-configuration" className="jobs-card" aria-labelledby="dtco-config-title">
      <div className="jobs-card__heading"><div><h2 id="dtco-config-title">1 · Experiment configuration</h2><p>{experiment ? `Revision ${experiment.revision} · ${experiment.id}` : "New experiment"}{dirty ? " · unsaved configuration" : experiment ? " · saved on server" : " · not saved"}</p></div><span className="dtco-badge">Real computation</span></div>
      <form onSubmit={event => { event.preventDefault(); void perform("save"); }}>
        <fieldset disabled={disabled} className="dtco-fieldset">
          <div className="dtco-grid">
            <label>Experiment name<input value={form.name} maxLength={120} onChange={event => update("name", event.target.value)} /></label>
            {select("Circuit", "circuitId", options.circuits)}
            {select("Technology", "technologyId", options.technologies)}
            {select("Model version", "modelVersion", options.models.filter(model => model.technologyId === form.technologyId))}
          </div>
          <p className="hint">GF180 CMOS inverter · NMOS W=1 µm, PMOS W=2 µm, L=0.28 µm. Electrical runs use the same schematic topology.</p>
          <div className="dtco-grid">
            <label>Temperatures (°C)<input aria-label="Temperatures (°C)" value={form.temperatures} placeholder="25, 85" onChange={event => update("temperatures", event.target.value)} /><small>Comma-separated, −40 to 125 °C</small></label>
            <label>Supply voltages (V)<input aria-label="Supply voltages (V)" value={form.voltages} placeholder="2.7, 3.3" onChange={event => update("voltages", event.target.value)} /><small>Comma-separated, 2.7 to 3.6 V</small></label>
            <label>Output load (fF)<input type="number" min="0.1" max="1000" step="any" value={form.loadFf} onChange={event => update("loadFf", event.target.value)} /></label>
            <label>Input slew (ps)<input type="number" min="1" max="10000" step="any" value={form.inputSlewPs} onChange={event => update("inputSlewPs", event.target.value)} /></label>
            <label>Period (ns)<input type="number" min="1" max="1000" step="any" value={form.periodNs} onChange={event => update("periodNs", event.target.value)} /></label>
          </div>
          <fieldset className="dtco-layouts"><legend>Generated layouts</legend>{options.layouts.map(layout => <label key={layout.id}><input type="checkbox" checked={form.layoutIds.includes(layout.id)} disabled={!layout.available} onChange={event => update("layoutIds", event.target.checked ? [...form.layoutIds, layout.id] : form.layoutIds.filter(id => id !== layout.id))} />{layout.label}{layout.reason ? <small>{layout.reason}</small> : null}</label>)}</fieldset>
        </fieldset>
        <p className="dtco-count" role="status"><strong>{validation?.count ?? 0} combinations</strong> · temperature × voltage × layout · maximum {options.maxPoints}</p>
        {validation?.error ? <p className="jobs-warning">{validation.error}</p> : null}
        {!options.available ? <p className="jobs-notice jobs-notice--warning">Execution unavailable: {options.unavailableReason ?? "Required native tools are unavailable."}</p> : null}
        <div className="jobs-action-row">
          <button type="submit" className="jobs-secondary-button" disabled={disabled || !validation?.definition || (Boolean(experiment) && !dirty)}>{busy ? "Working…" : "Save experiment"}</button>
          <button type="button" className="jobs-primary-button" disabled={disabled || !validation?.definition || !options.available || (Boolean(experiment) && !dirty && !pending)} onClick={() => { setRevision(null); void perform("submit"); }}>{busy ? "Working…" : dirty || !experiment ? "Save & run combinations" : pending ? "Run unsubmitted combinations" : "All combinations submitted"}</button>
          {experiment && dirty ? <button className="jobs-secondary-button" type="button" disabled={disabled} onClick={() => setForm(definitionToForm(experiment.definition))}>Restore saved configuration</button> : null}
        </div>
        <p className="hint">Running saves the current configuration first. Completed combinations are retained; failed combinations have individual retry controls.</p>
      </form>
      <details><summary>Tool availability and source identity</summary><ul>{options.tools.map(tool => <li key={tool.id}>{tool.id}: {tool.available ? tool.version ?? "available" : tool.reason ?? "unavailable"}</li>)}</ul><p>Environment hash: <code>{options.environmentHash}</code></p><p>Model source: <code>{options.models.find(model => model.id === form.modelVersion)?.sourceHash ?? "Unavailable"}</code></p></details>
    </section> : null}
    <section id="dtco-progress" className="jobs-card" aria-labelledby="dtco-progress-title">
      <div className="jobs-card__heading"><div><h2 id="dtco-progress-title">2 · Execution progress</h2><p>{active ? "Active combinations refresh every two seconds." : "Each combination retains its job and attempts."}</p></div>{experiment ? <strong>{experiment.points.filter(point => point.status === "succeeded").length} / {experiment.points.length} succeeded</strong> : null}</div>
      {dirty && experiment ? <p className="hint">These jobs belong to saved revision {experiment.revision}. Restore the saved configuration to retry a failed combination.</p> : null}
      {experiment?.points.length ? <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Combination</th><th>Status / step</th><th>Progress</th><th>Attempt / job</th><th>Failure / action</th></tr></thead><tbody>{experiment.points.map(point => <tr key={point.id}><td>{pointLabel(point)}</td><td>{point.status}<small>{point.currentStepId ?? "—"}</small></td><td><progress aria-label={`Progress ${pointLabel(point)}`} max={1} value={point.progress} /><small>{Math.round(point.progress * 100)}%</small></td><td>{point.attempts.length} attempts{point.jobId ? <><small><Link to={`/jobs/${encodeURIComponent(point.jobId)}`}>Open job</Link></small><button className="jobs-secondary-button" type="button" onClick={() => setJobId(point.jobId)}>Inspect job</button></> : null}</td><td>{point.error ? <p className="jobs-error">{point.error.code}: {point.error.message}</p> : point.status === "failed" || point.status === "preparation_failed" ? <p className="jobs-error">Execution failed; inspect the job logs for details.</p> : null}{canRetryPoint(point) ? <button className="jobs-secondary-button" type="button" disabled={disabled || dirty || !options?.available || !point.attempts.length} onClick={() => void perform("retry", point.id)}>Retry this combination</button> : null}</td></tr>)}</tbody></table></div> : <p className="jobs-empty">Save an experiment to materialize its parameter combinations.</p>}
      {jobId ? <><button className="jobs-secondary-button" type="button" onClick={() => setJobId(null)}>Close job details</button><DtcoJobDetails key={jobId} jobId={jobId} /></> : null}
    </section>
    <section id="dtco-comparison" className="jobs-card" aria-labelledby="dtco-comparison-title">
      <div className="jobs-card__heading"><div><h2 id="dtco-comparison-title">3 · Result comparison</h2><p>{viewed ? `Saved revision ${viewed.revision} · ${viewed.definition.name}` : "Measured results from this experiment"}</p></div>{experiment ? <label>Compare revision<select aria-label="Compare revision" value={viewed?.revision ?? experiment.revision} onChange={event => setRevision(Number(event.target.value))}>{experiment.revisions.map(item => <option key={item.revision} value={item.revision}>Revision {item.revision}</option>)}</select></label> : null}</div>
      <p className="hint">{DTCO_SCOPE} Results from different revisions are compared separately.</p>
      <DtcoComparison key={viewKey} points={viewed?.points ?? []} />
    </section>
    <section id="dtco-history" className="jobs-card" aria-labelledby="dtco-history-title">
      <div className="jobs-card__heading"><div><h2 id="dtco-history-title">History</h2><p>Server-saved experiments, configuration revisions, and execution attempts.</p></div></div>
      {history.length ? <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Experiment</th><th>Revision</th><th>Updated</th><th /></tr></thead><tbody>{history.map(item => <tr key={item.id}><td>{item.definition.name}<small><code>{item.id}</code></small></td><td>{item.revision}</td><td>{new Date(item.updatedAt).toLocaleString()}</td><td><button type="button" className="jobs-secondary-button" disabled={disabled || item.id === experiment?.id} onClick={() => { setRevision(null); setJobId(null); void perform("select", item.id); }}>View experiment</button></td></tr>)}</tbody></table></div> : <p className="jobs-empty">No saved experiments yet.</p>}
      {experiment ? <details><summary>Revisions, attempts, and provenance for {experiment.definition.name}</summary>{experiment.revisions.map(item => <section className="dtco-revision" key={item.revision}><h3>Revision {item.revision} · {new Date(item.createdAt).toLocaleString()}</h3><p>Environment: <code>{item.environmentHash}</code></p><details><summary>Saved input configuration</summary><pre>{JSON.stringify(item.definition, null, 2)}</pre></details>{item.points.map(point => <div key={point.id}><h4>{pointLabel(point)} · {point.status}</h4>{point.attempts.length ? point.attempts.map(attempt => <p key={attempt.id}>Attempt {attempt.number} · {attempt.status} · {new Date(attempt.createdAt).toLocaleString()} · <Link to={`/jobs/${encodeURIComponent(attempt.jobId)}`}>Job, inputs & provenance</Link> · <a href={`/api/jobs/${encodeURIComponent(attempt.jobId)}/artifacts.zip`}>Download artifacts</a>{attempt.resultId ? <> · <Link to={`/results/dtco/${encodeURIComponent(attempt.resultId)}`}>Measured result</Link></> : null}{attempt.error ? <small className="jobs-error">{attempt.error.code}: {attempt.error.message}</small> : null}</p>) : <p className="hint">No execution attempts.</p>}</div>)}</section>)}</details> : null}
    </section>
  </div>;
}
