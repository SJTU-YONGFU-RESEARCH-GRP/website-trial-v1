import type { DtcoObjectiveMetric, DtcoOptimizationDefinition, DtcoOptions } from "../../../shared/contracts/dtco";
import { DtcoWorkflowField, integrationUnavailable } from "./DtcoWorkflowField";
import { dtcoScope } from "./helpers";
import { DtcoCatalogFields } from "./DtcoCatalogFields";
import { DtcoSearchAxes, initializeParameterAxes } from "./DtcoSearchAxes";
import { availableCorners, candidateLabel, catalogProfiles, operatingBounds } from "./catalogHelpers";
import { objectiveLabels, resumableIteration } from "./optimizationHelpers";
import type { useDtcoOptimization } from "./useDtcoOptimization";
import { FrequencyProtocolNotice } from "./frequencyProtocol";
export function DtcoOptimizer({ options, readOnly, state, onViewResults }: { options: DtcoOptions; readOnly: boolean; state: ReturnType<typeof useDtcoOptimization>; onViewResults(): void }): JSX.Element {
  const { form, run, history, busy, loading, validation, error, perform, setForm, active } = state;
  const config = options.optimization;
  if (!config || !form) return <section className="jobs-card"><h2>Automatic DTCO optimization</h2><p className="jobs-empty">Optimization options are not available from this server.</p></section>;
  const disabled = busy || loading || readOnly;
  const update = <K extends keyof DtcoOptimizationDefinition>(key: K, value: DtcoOptimizationDefinition[K]) => setForm(current => {
    if (!current) return current;
    const next = { ...current, [key]: value };
    if (["voltageV", "groundVoltageV", "temperatureC"].includes(key) && typeof value === "number" && current.parameterAxes?.[key]) {
      const axis = current.parameterAxes[key]; next.parameterAxes = { ...current.parameterAxes, [key]: { ...axis, initial: value, ...(axis.min === axis.max ? { min: value, max: value } : {}) } };
    }
    return next;
  });
  const number = (label: string, key: "temperatureC" | "voltageV" | "loadFf" | "inputSlewPs" | "periodNs" | "maxIterations" | "patience") => <label>{label}<input aria-label={label} type="number" step={key === "maxIterations" || key === "patience" ? "1" : "any"} value={Number.isFinite(form[key]) ? form[key] : ""} onChange={event => update(key, event.target.value === "" ? NaN : Number(event.target.value))} /></label>;
  const profile = catalogProfiles(options, form);
  const scope = profile.circuit?.metricScopes[form.electricalMode ?? "extracted"] ?? dtcoScope({ electricalMode: form.electricalMode ?? "extracted" });
  return <section id="dtco-optimization" className="jobs-card digital-workflow-card" aria-labelledby="dtco-optimization-title">
    <div className="jobs-card__heading"><div><h2 id="dtco-optimization-title">Automatic DTCO optimization</h2><p>Choose a goal and bounded design space. Each new candidate follows a measured round; the server retains the best result.</p></div><span className="dtco-badge">Real computation</span></div>
    <p className="jobs-notice jobs-notice--warning"><strong>Optimization measurement scope:</strong> {scope}</p>
    {!config.available ? <p className="jobs-notice jobs-notice--warning">Optimization execution unavailable: {config.reason ?? "Extracted execution is not available."} Saved history remains accessible.</p> : null}
    {error ? <p role="alert" className="jobs-notice jobs-notice--error">{error}</p> : null}
    {loading ? <p role="status">Loading optimization…</p> : null}
    <h3>Optimization configuration</h3>
    <form onSubmit={event => { event.preventDefault(); void perform("create"); }}>
      <fieldset className="dtco-fieldset" disabled={disabled || Boolean(run)}>
        <div className="dtco-grid">
          <label>Optimization name<input aria-label="Optimization name" value={form.name} maxLength={120} onChange={event => update("name", event.target.value)} /></label>
        </div>
        <DtcoWorkflowField configuration={form} prefix="Optimization " value={form.workflow} options={options} onChange={value => update("workflow", value)} />
        <DtcoCatalogFields options={options} value={form} prefix="Optimization " onChange={patch => setForm(current => {
          if (!current) return current;
          const next = { ...current, ...patch, parameterAxes: undefined };
          const corners = availableCorners(options, next);
          next.processCorners = (next.processCorners ?? ["tt"]).filter(corner => corners.includes(corner));
          if (!next.processCorners.length) next.processCorners = [corners[0] ?? "tt"];
          if (patch.technologyId && patch.technologyId !== current.technologyId || patch.modelVersion && patch.modelVersion !== current.modelVersion) {
            next.groundVoltageV = 0; next.voltageV = operatingBounds(options, next).supplyVoltageV.max;
          }
          return initializeParameterAxes(next, options);
        })} />
        <div className="dtco-grid">
          {number("Optimization temperature (°C)", "temperatureC")}{number("Optimization voltage (V)", "voltageV")}
          <label>Optimization VSS (V)<input aria-label="Optimization VSS (V)" type="number" step="any" value={form.groundVoltageV ?? 0} onChange={event => update("groundVoltageV", event.target.value === "" ? NaN : Number(event.target.value))} /></label>
          {number("Optimization load (fF)", "loadFf")}{number("Optimization input slew (ps)", "inputSlewPs")}{number("Optimization period (ns)", "periodNs")}
          <label>Optimization objective<select aria-label="Optimization objective" value={form.objective.metric} onChange={event => update("objective", { metric: event.target.value as DtcoObjectiveMetric })}>{Object.entries(objectiveLabels).map(([value,label]) => <option key={value} value={value} disabled={Boolean(profile.circuit?.availableMetrics && (value === "areaUm2" || value === "balanced") && !profile.circuit.availableMetrics.includes("areaUm2"))}>{label}</option>)}</select></label>
          <label>Objective target (optional)<input aria-label="Objective target (optional)" type="number" step="any" value={form.objective.target ?? ""} onChange={event => update("objective", { ...form.objective, target: event.target.value === "" ? undefined : Number(event.target.value) })} /><small>Uses objective units above. Balanced score is normalized to the measured baseline.</small></label>
        </div>
        {form.objective.metric === "maxFrequencyHz" ? <p className="hint">Maximizes the measured, bracketed cell-arc toggle frequency. This is not chip clock Fmax or reciprocal propagation delay. An unbracketed lower bound cannot satisfy this objective.</p> : null}
        {form.objective.metric === "balanced" ? <div className="dtco-grid">{(["delay", "power", "area"] as const).map(key => <label key={key}>Balanced {key} weight<input aria-label={`Balanced ${key} weight`} type="number" min="0" step="any" value={form.objective.weights?.[key] ?? 1} onChange={event => update("objective", { ...form.objective, weights: { delay: 1, power: 1, area: 1, ...form.objective.weights, [key]: Number(event.target.value) } })} /></label>)}</div> : null}
        {options.circuitProfiles ? <DtcoSearchAxes value={form} options={options} onChange={axes => setForm(current => current ? { ...current, parameterAxes: axes, temperatureC: axes.temperatureC?.initial ?? current.temperatureC, voltageV: axes.voltageV?.initial ?? current.voltageV, groundVoltageV: axes.groundVoltageV?.initial ?? current.groundVoltageV } : current)} /> : <>
        <p className="hint">Fixed channel length: 0.28 µm. Minimum = maximum freezes that width. All width settings use a {config.widthGridUm} µm grid.</p>
        {(["nmosWidthUm", "pmosWidthUm"] as const).map(key => <fieldset className="dtco-layouts" key={key}><legend>{key === "nmosWidthUm" ? "NMOS" : "PMOS"} width (µm)</legend>{(["min", "max", "initial", "step"] as const).map(part => <label key={part}>{part}<input aria-label={`${key === "nmosWidthUm" ? "NMOS" : "PMOS"} width ${part} (µm)`} type="number" step={config.widthGridUm} value={Number.isFinite(form.axes[key][part]) ? form.axes[key][part] : ""} onChange={event => update("axes", { ...form.axes, [key]: { ...form.axes[key], [part]: event.target.value === "" ? NaN : Number(event.target.value) } })} /></label>)}</fieldset>)}
        </>}
        <p className="hint">Process corners describe manufacturing conditions. They are evaluated conditions, not a design improvement variable.</p>
        <div className="dtco-grid"><label>Optimization process corner<select aria-label="Optimization process corner" value={form.processCorners?.[0] ?? "tt"} onChange={event => update("processCorners", [event.target.value as NonNullable<DtcoOptimizationDefinition["processCorners"]>[number]])}>{availableCorners(options, form).map(corner => <option key={corner} value={corner}>{corner.toUpperCase()}</option>)}</select><small>Fixed for every candidate in this optimization.</small></label></div>
        <fieldset className="dtco-layouts"><legend>Compatible layout choices</legend>{(profile.circuit?.layoutIds ?? config.layoutIds).map(id => <label key={id}><input type="checkbox" checked={form.layoutIds.includes(id)} onChange={event => update("layoutIds", event.target.checked ? [...form.layoutIds,id] : form.layoutIds.filter(value => value !== id))} />{options.layouts.find(item => item.id === id)?.label ?? id}</label>)}</fieldset>
        <div className="dtco-grid">{number("Maximum rounds", "maxIterations")}{number("No-improvement patience (rounds)", "patience")}<label>Minimum relative improvement (%)<input aria-label="Minimum relative improvement (%)" type="number" step="any" value={Number.isFinite(form.minRelativeImprovement) ? form.minRelativeImprovement * 100 : ""} onChange={event => update("minRelativeImprovement", event.target.value === "" ? NaN : Number(event.target.value) / 100)} /></label></div>
      </fieldset>
      {!run && validation ? <p className="jobs-warning">{validation}</p> : null}
      <p className="hint">The round limit includes the baseline. Search stops at the round limit, patience limit, target, exhausted search, or explicit stop. Proposals and acceptance come from the server. Valid unsaved changes are saved before switching to another optimization.</p>
      <div className="jobs-action-row">
        {!run ? <button className="jobs-secondary-button" type="submit" disabled={disabled || Boolean(validation)}>Save optimization</button> : <><span>Saved on server · {run.status} · version {run.version}</span>{run.allowedActions.includes("start") ? <button className="jobs-primary-button" type="button" disabled={disabled || !config.available || integrationUnavailable(form.workflow, options, form)} onClick={() => void perform("start")}>Start automatic optimization</button> : null}{run.allowedActions.includes("stop") ? <button className="jobs-secondary-button" type="button" disabled={disabled || run.status === "stopping"} onClick={() => void perform("stop")}>{run.status === "stopping" ? "Stopping…" : "Stop optimization"}</button> : null}{resumableIteration(run) ? <button className="jobs-primary-button" type="button" disabled={disabled || !config.available || integrationUnavailable(form.workflow, options, form)} onClick={() => void perform("resume")}>Resume failed round</button> : null}</>}
        <button className="jobs-secondary-button" type="button" disabled={disabled} onClick={() => { void perform("new"); }}>New optimization</button>
      </div>
    </form>
    {run ? <>
      <FrequencyProtocolNotice value={run.iterations.find(row => row.provenance?.frequencyProtocolDiagnostics)?.provenance} />
      <h3>Optimization progress</h3><p>{run.iterations.length} / {run.definition.maxIterations} rounds proposed · {active ? "Active state refreshes every two seconds." : "Saved state; reload does not start a round."} {run.stopReason ? `Stop reason: ${run.stopReason.replaceAll("_", " ")}.` : ""}</p>
      <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Round / proposal</th><th>Requested parameters</th><th>Status / process</th><th>Failure</th></tr></thead><tbody>{run.iterations.map(row => <tr key={row.id}><td>Round {row.number}<small>{row.rationale}</small><small>Based on {row.baseIterationId ? `round ${run.iterations.find(item => item.id === row.baseIterationId)?.number ?? row.baseIterationId}` : "initial baseline"}</small></td><td>{candidateLabel(run.definition, row.candidate)}</td><td>{row.status}<progress aria-label={`Optimization round ${row.number} progress`} max={1} value={row.progress} /><small>{Math.round(row.progress * 100)}% · {row.attempts.at(-1)?.currentStepId ?? "Awaiting execution step"}</small><small>{row.attempts.length} attempts</small></td><td>{row.error ? <p className="jobs-error">{row.error.code}: {row.error.message}</p> : "—"}</td></tr>)}</tbody></table></div>
      <button type="button" className="jobs-secondary-button" disabled={!run.iterations.some(row => row.status === "succeeded" && row.resultId && row.metrics)} onClick={onViewResults}>View optimization results</button>
      <details><summary>Saved optimization definition and environment</summary><p>Environment: <code>{run.environmentHash}</code></p><pre>{JSON.stringify(run.definition, null, 2)}</pre></details>
    </> : null}
    <h3>Optimization history</h3>
    {history.length ? <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Optimization</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{history.map(item => <tr key={item.id}><td>{item.definition.name}<small>{item.id}</small></td><td>{item.status}<FrequencyProtocolNotice value={item.iterations.find(row => row.provenance?.frequencyProtocolDiagnostics)?.provenance} /></td><td>{new Date(item.updatedAt).toLocaleString()}</td><td><button type="button" className="jobs-secondary-button" disabled={disabled || item.id === run?.id} onClick={() => { void perform("select", item.id); }}>View optimization</button></td></tr>)}</tbody></table></div> : <p className="jobs-empty">No saved optimizations yet.</p>}
  </section>;
}
