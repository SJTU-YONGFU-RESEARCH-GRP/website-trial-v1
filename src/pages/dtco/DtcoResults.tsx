import { useEffect, useRef, useState } from "react";
import { DtcoPipelineResults, type DtcoPipelineEntry } from "./DtcoPipelineResults";
import { DtcoComparison } from "./DtcoComparison";
import { DtcoResultLayouts } from "./DtcoResultLayouts";
import { measurementMode, toggleSavedMeasurement } from "./resultHelpers";

import { filterSavedResults, isSelectionResult, type DtcoSavedResult } from "./unifiedResultHelpers";
import { selectionFeasible } from "./selectionHelpers";
import { DtcoResultDetails } from "./DtcoResultDetails";

export function DtcoResults({ rows, selectedIds, onSelect, active, pipelines = [] }: { rows: DtcoSavedResult[]; selectedIds: string[]; onSelect(ids: string[]): void; active: boolean; pipelines?: DtcoPipelineEntry[] }): JSX.Element {
  const [query, setQuery] = useState(""), [mode, setMode] = useState(""), [origin, setOrigin] = useState("");
  const [open, setOpen] = useState(false), [baselineId, setBaselineId] = useState("");
  const dropdown = useRef<HTMLDivElement>(null);
  const filtered = filterSavedResults(rows, query, mode, origin);
  const selected = selectedIds.flatMap(id => { const row = rows.find(item => item.id === id); return row ? [row] : []; });
  useEffect(() => {
    if (baselineId && !selectedIds.includes(baselineId)) setBaselineId("");
  }, [selectedIds, baselineId]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (dropdown.current && !dropdown.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  return <div className="dtco-results chart-card">
    <div className="digital-workflows__heading"><h2>DTCO results</h2><p>Select saved results to compare PPA and timing and inspect layouts, logs, and provenance. Selection never starts a calculation.</p></div>
    <fieldset className="dtco-result-selection"><legend>Results ({filtered.length} of {rows.length} shown)</legend>
      <div ref={dropdown} className="dtco-multi-select" onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
        <div className="dtco-result-filter-bar">
          <label>Search results<input type="search" aria-label="Search DTCO results" value={query} placeholder="Name, result ID, round or conditions" onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} /></label>
          <label>Measurement scope<select aria-label="Filter measurement scope" value={mode} onChange={event => setMode(event.target.value)}><option value="">All scopes</option><option value="schematic">Schematic SPICE</option><option value="extracted">Extracted capacitance</option><option value="liberty">Pre-layout Liberty / OpenSTA</option></select></label>
          <label>Source<select aria-label="Filter result source" value={origin} onChange={event => setOrigin(event.target.value)}><option value="">All sources</option><option value="optimization">Automatic optimization</option><option value="experiment">Batch experiment</option><option value="selection">Standard-cell selection</option></select></label>
          <button type="button" className="jobs-secondary-button" disabled={!selectedIds.length} onClick={() => { onSelect([]); setBaselineId(""); }}>Clear</button>
        </div>
        <button type="button" className="dtco-multi-select-trigger" aria-expanded={open} aria-controls="dtco-result-options" onClick={() => setOpen(current => !current)}>{selected.length ? `${selected.length} result${selected.length === 1 ? "" : "s"} selected` : "Select results…"}<span aria-hidden="true">{open ? "▲" : "▼"}</span></button>
        {open ? <div id="dtco-result-options" className="dtco-multi-select-dropdown">{filtered.map(row => <label key={row.id} className="dtco-multi-select-option"><input type="checkbox" name="dtco-result" aria-label={`Select ${row.name} · ${row.label} (${row.id})`} checked={selectedIds.includes(row.id)} onChange={() => onSelect(toggleSavedMeasurement(selectedIds, row.id))} /><span><strong>Name: {row.name}</strong><span>Candidate: {row.label}</span><span>Source: {row.origin === "selection" ? "Standard-cell selection" : row.origin === "optimization" ? "Automatic optimization" : "Batch experiment"} · {isSelectionResult(row) ? "Pre-layout Liberty / OpenSTA" : measurementMode(row.mode)}</span><span>Conditions: {row.conditions}</span><span>Status: {isSelectionResult(row) ? `Complete · timing ${selectionFeasible(row.evaluation) ? "pass" : row.evaluation.status === "incomplete_evidence" ? "unknown" : "fail / " + row.evaluation.status}` : "Complete · measured"}</span></span></label>)}{!filtered.length ? <p>No saved results match these filters.</p> : null}</div> : null}
      </div>
    </fieldset>
    {!selected.length ? <p className="dtco-result-empty" role="status">Select results above to view reports. Completed standard-cell runs include all evaluated candidates, with their timing status.</p> : <>
      {active ? <DtcoResultLayouts rows={selected} /> : null}
      <DtcoComparison rows={selected} baselineId={baselineId} onBaselineChange={setBaselineId} />
      <DtcoResultDetails rows={selected} active={active} />
    </>}
    <DtcoPipelineResults entries={pipelines} active={active} />
  </div>;
}
