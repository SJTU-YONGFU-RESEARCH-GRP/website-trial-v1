import { useEffect, useMemo, useRef, useState } from "react";
import type { ResultRecordV1 } from "../../../shared/contracts/v1";
import { formatDate } from "../../jobs";
import { acgResultMatches, record } from "./helpers";
import { RESEARCH_LABELS } from "./researchHelpers";
const ENGINES = [{ id: "cmos", label: "CMOS" }, { id: "dr", label: "Double Row" }, { id: "mr", label: "Multi Row" }];
export function toggleAcgResult(ids: string[], id: string): string[] { return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]; }
export function filterAcgResults(results: ResultRecordV1[], query: string, engines: string[]): ResultRecordV1[] { return results.filter(item => engines.includes(String(item.provenance.parameters.engine)) && (item.id.toLowerCase().includes(query.trim().toLowerCase()) || acgResultMatches(item, query) || (ENGINES.find(engine => engine.id === item.provenance.parameters.engine)?.label ?? "").toLowerCase().includes(query.trim().toLowerCase()))); }
export function AcgResultSelector({ results, selectedIds, onToggle, onClear }: { results: ResultRecordV1[]; selectedIds: string[]; onToggle(id: string): void; onClear(): void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [engines, setEngines] = useState(["cmos", "dr", "mr"]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  const filtered = useMemo(() => filterAcgResults(results, query, engines), [results, query, engines]);
  return <div className="acg-result-selection">
    <fieldset className="acg-result-selection-fieldset"><legend>Results ({filtered.length} of {results.length} shown)</legend>
      <div className="acg-multi-select" ref={dropdownRef} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
        <div className="acg-result-filter-bar"><label className="acg-result-search"><span>Search results</span><input type="search" value={query} placeholder="Result ID, cell or engine" onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} /></label><fieldset className="acg-engine-filter"><legend>Engine</legend><div className="acg-check-grid">{ENGINES.map(engine => <label key={engine.id}><input type="checkbox" checked={engines.includes(engine.id)} onChange={() => setEngines(ids => toggleAcgResult(ids, engine.id))} />{engine.label}</label>)}</div></fieldset>{selectedIds.length ? <div className="workflow-file-actions"><button type="button" onClick={onClear}>Clear</button></div> : null}</div>
        <button type="button" className="acg-multi-select-trigger" aria-expanded={open} aria-controls="acg-result-options" onClick={() => setOpen(value => !value)} onMouseDown={event => event.preventDefault()}>{selectedIds.length ? `${selectedIds.length} result${selectedIds.length === 1 ? "" : "s"} selected` : "Select results…"}<span aria-hidden="true">{open ? "▲" : "▼"}</span></button>
        {open ? <div id="acg-result-options" className="acg-multi-select-dropdown">{filtered.map(item => <label key={item.id} className="acg-multi-select-option"><input type="checkbox" name="acg-result" aria-label={`Select ${item.title} (${item.id})`} checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} /><span className="acg-multi-select-label"><strong>{item.title}</strong><code>Result ID: {item.id}</code><span>{formatDate(item.createdAt)} · {item.lifecycle}</span><span>{ENGINES.find(engine => engine.id === item.provenance.parameters.engine)?.label ?? String(item.provenance.parameters.engine)} · {record(item.data.acgUnified).schemaVersion === "acg.unified.v1" ? "Unified workflow" : RESEARCH_LABELS[record(item.data.acgResearch).operation as keyof typeof RESEARCH_LABELS] ?? String(item.provenance.parameters.mode ?? "unknown")}</span></span></label>)}{!filtered.length ? <p className="acg-empty">No results match the current filters.</p> : null}</div> : null}
      </div>
    </fieldset>
  </div>;
}
