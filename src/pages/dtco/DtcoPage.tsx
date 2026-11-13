import { useEffect, useMemo, useState } from "react";
import { WorkspaceTabs, type WorkspaceTab } from "../../components/WorkspaceTabs";
import { Link, useSearchParams } from "react-router-dom";
import { useDtcoSelection } from "./useDtcoSelection";
import { DtcoSelectionInput } from "./DtcoSelectionInput";
import { useDtcoResultSelections } from "./useDtcoResultSelections";
import { completeSelectionResult, selectionSavedResults } from "./unifiedResultHelpers";
import { DtcoCatalogFields } from "./DtcoCatalogFields";
import { DtcoWorkflowField, integrationUnavailable } from "./DtcoWorkflowField";
import { DtcoConditions } from "./DtcoConditions";
import { availableCorners, catalogProfiles, operatingBounds } from "./catalogHelpers";
import { useAuth } from "../../auth/AuthContext";
import { dtcoScope, canRetryPoint, definitionToForm, pointLabel, type DtcoForm } from "./helpers";
import { DtcoResults } from "./DtcoResults";
import { savedMeasurements, savedPipelineAttempts } from "./resultHelpers";
import { useDtcoOptimization } from "./useDtcoOptimization";
import { DtcoOptimizer } from "./DtcoOptimizer";
import { useDtcoWorkspace } from "./useDtcoWorkspace";
import "../../jobs.css";
import "../../digital-run.css";
import "./dtco.css";

export function DtcoPage(): JSX.Element {
  const state = useDtcoWorkspace();
  const selection = useDtcoSelection();
  const [query] = useSearchParams();
  const [workflow, setWorkflow] = useState(query.has("selection") ? "selection" : "sizing");
  const { readOnlyDemo } = useAuth();
  const { options, experiment, form, setForm, history, loading, busy, error, notice, validation, dirty, active, perform } = state;
  const optimization = useDtcoOptimization(options?.optimization, options ?? undefined);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("input");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pipelines = useMemo(() => savedPipelineAttempts(history, optimization.history), [history, optimization.history]);
  const measurements = useMemo(() => savedMeasurements(history, optimization.history), [history, optimization.history]);
  const savedSelections = useDtcoResultSelections(selection.history, selection.run, activeTab === "results");
  const selectionRows = useMemo(() => selectionSavedResults(savedSelections.runs), [savedSelections.runs]);
  const allResults = useMemo(() => [...measurements, ...selectionRows], [measurements, selectionRows]);
  const [requestedSelection, setRequestedSelection] = useState<string | null>(null);
  useEffect(() => {
    if (!requestedSelection) return;
    const rows = selectionRows.filter(row => row.jobId === requestedSelection);
    if (!rows.length) return;
    setSelectedIds(rows.filter(row => row.evaluation.id === row.run.result?.baselineEvaluationId || row.label.includes("retained best")).map(row => row.id));
    setRequestedSelection(null);
  }, [requestedSelection, selectionRows]);
  const selectResults = (ids: string[]) => { setRequestedSelection(null); setSelectedIds(ids); };

  const viewResults = (ids: string[]) => {
    setSelectedIds([...new Set(ids)].filter(id => measurements.some(row => row.id === id)));
    setActiveTab("results");
  };
  const disabled = busy || loading || readOnlyDemo;
  const update = <K extends keyof DtcoForm>(key: K, value: DtcoForm[K]) => setForm(current => current ? { ...current, [key]: value } : current);
  const pending = Boolean(experiment?.points.some(point => point.status === "unsubmitted"));
  return <div className="dtco-page workspace-page">
    <WorkspaceTabs idPrefix="dtco" active={activeTab} onChange={setActiveTab} />
    <section id="dtco-input-panel" className="workspace-tab-panel workspace-region workspace-region--input" role="tabpanel" aria-labelledby="dtco-input-tab" hidden={activeTab !== "input"}>
    <div className="workspace-region__content">
    <div className="digital-workflows__heading"><h2>DTCO workflows</h2><p>Configure cell selection or transistor sizing. Measured reports are available in Results.</p></div>
    <label className="dtco-workflow-choice">DTCO workflow<select aria-label="DTCO workflow" value={workflow} onChange={event => setWorkflow(event.target.value)}><option value="selection">Standard-cell selection</option><option value="sizing">Transistor sizing &amp; sweep</option></select></label>
    {workflow === "selection" ? <DtcoSelectionInput state={selection} readOnly={readOnlyDemo} onViewResults={id => { setRequestedSelection(id); setActiveTab("results"); }} /> : <>

    {options ? <DtcoOptimizer options={options} readOnly={readOnlyDemo} state={optimization} onViewResults={() => viewResults(measurements.filter(row => row.origin === "optimization" && row.sourceId === optimization.run?.id).map(row => row.id))} /> : null}
    <p className="jobs-notice jobs-notice--warning dtco-scope"><strong>Measurement scope:</strong> {dtcoScope(form ?? undefined)}</p>
    {options?.publicRunner ? <p className="hint">Public runner: experiment history and artifacts are shared across visitors.</p> : null}
    {error ? <p className="jobs-notice jobs-notice--error" role="alert">{error}</p> : null}
    {notice ? <p className="jobs-notice" role="status">{notice}</p> : null}
    {loading ? <p role="status">Loading experiment…</p> : null}
    {!options && !loading ? <p className="jobs-empty">DTCO options could not be loaded. Reload this page to reconnect.</p> : null}
    {options && form ? <section id="dtco-configuration" className="jobs-card digital-workflow-card" aria-labelledby="dtco-config-title">
      <div className="jobs-card__heading"><div><h2 id="dtco-config-title">1 · Experiment configuration</h2><p>{experiment ? `Revision ${experiment.revision} · ${experiment.id}` : "New experiment"}{dirty ? " · unsaved configuration" : experiment ? " · saved on server" : " · not saved"}</p></div><button className="jobs-secondary-button" type="button" disabled={disabled} onClick={() => void perform("new")}>New experiment</button></div>
      <form onSubmit={event => { event.preventDefault(); void perform("save"); }}>
        <fieldset disabled={disabled} className="dtco-fieldset">
          <div className="dtco-grid">
            <label>Experiment name<input value={form.name} maxLength={120} onChange={event => update("name", event.target.value)} /></label>
          </div>
          <DtcoWorkflowField configuration={form} value={form.workflow} options={options} onChange={value => update("workflow", value)} />
          <DtcoCatalogFields options={options} value={form} onChange={patch => setForm(current => {
            if (!current) return current;
            const next = { ...current, ...patch };
            const corners = availableCorners(options, next);
            next.processCorners = (next.processCorners ?? ["tt"]).filter(corner => corners.includes(corner));
            if (!next.processCorners.length) next.processCorners = [corners[0] ?? "tt"];
            if (patch.technologyId && patch.technologyId !== current.technologyId || patch.modelVersion && patch.modelVersion !== current.modelVersion) {
              next.groundVoltages = "0"; next.voltages = String(operatingBounds(options, next).supplyVoltageV.max);
            }
            return next;
          })} />
          <DtcoConditions key={experiment?.id ?? "new"} form={form} options={options} onChange={patch => setForm(current => current ? { ...current, ...patch } : current)} />
          <div className="dtco-grid">
            <label>Output load (fF)<input type="number" min="0.1" max="1000" step="any" value={form.loadFf} onChange={event => update("loadFf", event.target.value)} /></label>
            <label>Input slew (ps)<input type="number" min="1" max="10000" step="any" value={form.inputSlewPs} onChange={event => update("inputSlewPs", event.target.value)} /></label>
            <label>Period (ns)<input type="number" min="1" max="1000" step="any" value={form.periodNs} onChange={event => update("periodNs", event.target.value)} /></label>
          </div>
          <fieldset className="dtco-layouts"><legend>Generated layouts</legend>{options.layouts.filter(layout => { const circuit = catalogProfiles(options, form).circuit; return circuit ? circuit.layoutIds.includes(layout.id) : form.electricalMode === "extracted" || !layout.id.endsWith("-pex"); }).map(layout => <label key={layout.id}><input type="checkbox" checked={form.layoutIds.includes(layout.id)} disabled={!layout.available} onChange={event => update("layoutIds", event.target.checked ? [...form.layoutIds, layout.id] : form.layoutIds.filter(id => id !== layout.id))} />{layout.label}{layout.reason ? <small>{layout.reason}</small> : null}</label>)}</fieldset>
        </fieldset>
        <p className="dtco-count" role="status"><strong>{validation?.count ?? 0} combinations</strong> · temperature × VDD × VSS × process corner × layout · maximum {options.maxPoints}</p>
        {validation?.error ? <p className="jobs-warning">{validation.error}</p> : null}
        {!options.available ? <p className="jobs-notice jobs-notice--warning">Execution unavailable: {options.unavailableReason ?? "Required native tools are unavailable."}</p> : null}
        <div className="jobs-action-row">
          <button type="submit" className="jobs-secondary-button" disabled={disabled || !validation?.definition || (Boolean(experiment) && !dirty)}>{busy ? "Working…" : "Save experiment"}</button>
          <button type="button" className="jobs-primary-button" disabled={disabled || !validation?.definition || !options.available || integrationUnavailable(form.workflow, options, form) || (Boolean(experiment) && !dirty && !pending)} onClick={() => { void perform("submit"); }}>{busy ? "Working…" : dirty || !experiment ? "Save & run combinations" : pending ? "Run unsubmitted combinations" : "All combinations submitted"}</button>
          {experiment && dirty ? <button className="jobs-secondary-button" type="button" disabled={disabled} onClick={() => setForm(definitionToForm(experiment.definition))}>Restore saved configuration</button> : null}
        </div>
        <p className="hint">Running saves the current configuration first. Completed combinations are retained; failed combinations have individual retry controls.</p>
      </form>
      <details><summary>Tool availability and source identity</summary><ul>{options.tools.map(tool => <li key={tool.id}>{tool.id}: {tool.available ? tool.version ?? "available" : tool.reason ?? "unavailable"}</li>)}</ul><p>Environment hash: <code>{options.environmentHash}</code></p><p>Model source: <code>{options.models.find(model => model.id === form.modelVersion)?.sourceHash ?? "Unavailable"}</code></p></details>
    </section> : null}
    <section id="dtco-progress" className="jobs-card" aria-labelledby="dtco-progress-title">
      <div className="jobs-card__heading"><div><h2 id="dtco-progress-title">2 · Execution progress</h2><p>{active ? "Active combinations refresh every two seconds." : "Each combination retains its job and attempts."}</p></div>{experiment ? <strong>{experiment.points.filter(point => point.status === "succeeded").length} / {experiment.points.length} succeeded</strong> : null}</div>
      {dirty && experiment ? <p className="hint">These jobs belong to saved revision {experiment.revision}. Restore the saved configuration to retry a failed combination.</p> : null}
      {experiment?.points.length ? <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Combination</th><th>Status / step</th><th>Progress</th><th>Attempt / job</th><th>Failure / action</th></tr></thead><tbody>{experiment.points.map(point => <tr key={point.id}><td>{pointLabel(point)}</td><td>{point.status}<small>{point.currentStepId ?? "—"}</small></td><td><progress aria-label={`Progress ${pointLabel(point)}`} max={1} value={point.progress} /><small>{Math.round(point.progress * 100)}%</small></td><td>{point.attempts.length} attempts{point.jobId ? <><small><Link to={`/jobs/${encodeURIComponent(point.jobId)}`}>Open job</Link></small></> : null}</td><td>{point.error ? <p className="jobs-error">{point.error.code}: {point.error.message}</p> : point.status === "failed" || point.status === "preparation_failed" ? <p className="jobs-error">Execution failed; inspect the job logs for details.</p> : null}{canRetryPoint(point) ? <button className="jobs-secondary-button" type="button" disabled={disabled || dirty || !options?.available || Boolean(options && integrationUnavailable(experiment.definition.workflow, options, experiment.definition)) || !point.attempts.length} onClick={() => void perform("retry", point.id)}>Retry this combination</button> : null}</td></tr>)}</tbody></table></div> : <p className="jobs-empty">Save an experiment to materialize its parameter combinations.</p>}
      {experiment ? <button type="button" className="jobs-secondary-button" disabled={!experiment.points.some(point => point.status === "succeeded" && point.resultId)} onClick={() => viewResults(experiment.points.flatMap(point => point.status === "succeeded" && point.resultId ? [point.resultId] : []))}>View experiment results</button> : null}
    </section>
    <section id="dtco-history" className="jobs-card" aria-labelledby="dtco-history-title">
      <div className="jobs-card__heading"><div><h2 id="dtco-history-title">History</h2><p>Server-saved experiments, configuration revisions, and execution attempts.</p></div></div>
      {history.length ? <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Experiment</th><th>Revision</th><th>Updated</th><th /></tr></thead><tbody>{history.map(item => <tr key={item.id}><td>{item.definition.name}<small><code>{item.id}</code></small></td><td>{item.revision}</td><td>{new Date(item.updatedAt).toLocaleString()}</td><td><button type="button" className="jobs-secondary-button" disabled={disabled || item.id === experiment?.id} onClick={() => { void perform("select", item.id); }}>View experiment</button></td></tr>)}</tbody></table></div> : <p className="jobs-empty">No saved experiments yet.</p>}
      {experiment ? <details><summary>Saved revisions for {experiment.definition.name}</summary>{experiment.revisions.map(item => <section className="dtco-revision" key={item.revision}><h3>Revision {item.revision} · {new Date(item.createdAt).toLocaleString()}</h3><p>{item.points.length} combinations · {item.points.filter(point => point.status === "succeeded").length} succeeded</p><details><summary>Saved input configuration</summary><pre>{JSON.stringify(item.definition, null, 2)}</pre></details></section>)}</details> : null}
    </section>
    </>}
    </div>
    </section>
    <section id="dtco-results-panel" className="workspace-tab-panel workspace-region workspace-region--result" role="tabpanel" aria-labelledby="dtco-results-tab" hidden={activeTab !== "results"}>
      <div className="workspace-region__content">
        {savedSelections.loading ? <p role="status">Loading completed standard-cell evaluations…</p> : null}
        {savedSelections.errors.length ? <details className="jobs-notice jobs-notice--warning"><summary>Some saved selection reports could not be loaded</summary>{savedSelections.errors.map(error => <p key={error}>{error}</p>)}<button type="button" className="jobs-secondary-button" onClick={savedSelections.retry}>Retry saved reports</button></details> : null}
        {savedSelections.runs.some(run => run.result && !completeSelectionResult(run.result)) ? <p className="jobs-notice">{savedSelections.runs.filter(run => run.result && !completeSelectionResult(run.result)).length} timing-only selection runs are archived because their circuit GDS flow is incomplete. Open Input, choose a saved run and use Complete layout flow.</p> : null}
        <DtcoResults rows={allResults} selectedIds={selectedIds} onSelect={selectResults} active={activeTab === "results"} pipelines={pipelines} />
      </div>
    </section>
  </div>;
}
