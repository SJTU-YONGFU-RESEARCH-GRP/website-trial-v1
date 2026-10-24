import { AcgJsonDetails } from "./AcgJsonDetails";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ArtifactRecordV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { acgResultArchiveUrl, getAcgResultArtifacts } from "../../api/acg/client";
import { artifactDownloadUrl } from "../../api/jobs";
import { formatBytes } from "../../jobs";
import { acgArtifactLabel, record } from "./helpers";
import { acgEngineName } from "./comparison";
import { generatedCellGroups, resultResearchSections, type ResearchPhase } from "./fullComparison";
import { unifiedArtifactPath } from "./unifiedHelpers";
import { CellResult } from "./AcgCellResult";
import { AcgWorkflowOutcomes } from "./AcgUnifiedResults";
import { AcgResearchResults } from "./AcgResearchResults";

type Resource = { items: ArtifactRecordV1[]; loading: boolean; error: string | null; version: string };
const EMPTY: Resource = { items: [], loading: true, error: null, version: "" };
function ArtifactLoader({ id, version, onChange }: { id: string; version: string; onChange(id: string, value: Resource): void }): null {
  useEffect(() => {
    let active = true;
    onChange(id, { ...EMPTY, version });
    void getAcgResultArtifacts(id).then(items => {
      if (items.some(item => item.resultId !== null && item.resultId !== id)) throw new Error("Artifact metadata belongs to another result.");
      if (active) onChange(id, { items, loading: false, error: null, version });
    }).catch(reason => {
      if (active) onChange(id, { items: [], loading: false, error: reason instanceof Error ? reason.message : String(reason), version });
    });
    return () => { active = false; };
  }, [id, version, onChange]);
  return null;
}

export function ResultColumns({ title, sectionKey, results, children }: {
  title: string; sectionKey: string; results: ResultRecordV1[]; children(result: ResultRecordV1): ReactNode;
}): JSX.Element {
  return <section className="chart-card acg-full-section" data-comparison-section={sectionKey} aria-label={title}>
    <h2>{title}</h2>
    <div className="acg-section-scroll" role="region" aria-label={`${title} comparison columns`} tabIndex={0}>
      <div className="acg-section-columns" style={{ gridTemplateColumns: `repeat(${results.length}, minmax(360px, 1fr))` }}>
        {results.map(result => <article className="acg-section-column" data-result-id={result.id} key={result.id} aria-label={`${title} · ${result.id}`}>
          <header className="acg-column-heading"><h3>{result.title}</h3><code>{result.id}</code><span>{acgEngineName(result)}</span></header>
          {children(result)}
        </article>)}
      </div>
    </div>
  </section>;
}
function Missing({ children }: { children: ReactNode }): JSX.Element { return <p className="acg-empty acg-comparison-absent">{children}</p>; }
const ResearchPhaseResult = memo(function ResearchPhaseResult({ result, phase, artifacts }: { result: ResultRecordV1; phase: ResearchPhase; artifacts: ArtifactRecordV1[] }): JSX.Element {
  const sections = resultResearchSections(result, phase);
  return <>{sections.length ? sections.map(section => <div key={section.origin}><p className="acg-help">{section.origin}</p><AcgResearchResults value={section.value} artifacts={artifacts} artifactPath={section.stage ? path => unifiedArtifactPath(section.stage!, path) : undefined} /></div>)
    : <Missing>No {phase === "comparison" ? "algorithm comparison or trial" : phase === "search" ? "feasible-search" : "comparison report"} evidence recorded in this result.</Missing>}</>;
});
export function AcgFullResultsComparison({ results, revision, refresh, canInspectJob, focusResultId, onFocused }: {
  results: ResultRecordV1[]; revision: number; refresh: number; canInspectJob(result: ResultRecordV1): boolean;
  focusResultId: string | null; onFocused(): void;
}): JSX.Element {
  const [resources, setResources] = useState<Record<string, Resource>>({});
  const version = `${revision}:${refresh}`;
  const onResource = useCallback((id: string, resource: Resource) => setResources(values => ({ ...values, [id]: resource })), []);
  const resourceFor = (id: string): Resource => resources[id]?.version === version ? resources[id] : EMPTY;
  const groups = useMemo(() => generatedCellGroups(results), [results]);
  const overviewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusResultId || !results.some(result => result.id === focusResultId)) return;
    const column = Array.from(overviewRef.current?.querySelectorAll<HTMLElement>('.acg-section-column') ?? []).find(element => element.dataset.resultId === focusResultId);
    if (column) { column.tabIndex = -1; column.focus({ preventScroll: true }); column.scrollIntoView({ block: "start", inline: "nearest" }); onFocused(); }
  }, [focusResultId, results, onFocused]);
  return <div className="acg-full-results">
    {results.map(result => <ArtifactLoader key={result.id} id={result.id} version={version} onChange={onResource} />)}
    <nav className="acg-section-nav" aria-label="Result comparison sections"><a href="#acg-overview">Overview</a><a href="#acg-stages">Workflow stages</a><a href="#acg-trials">Algorithm trials</a><a href="#acg-search">Feasible search</a><a href="#acg-generated">Generated cells</a><a href="#acg-artifacts">Reports and artifacts</a></nav>
    <div id="acg-overview" ref={overviewRef}><ResultColumns title="Overview, job and provenance" sectionKey="overview" results={results}>{result => {
      const resource = resourceFor(result.id);
      return <><dl className="acg-metrics"><div><dt>Lifecycle</dt><dd>{result.lifecycle}</dd></div><div><dt>Created</dt><dd>{result.createdAt}</dd></div><div><dt>Parser</dt><dd>{result.provenance.parserId} {result.provenance.parserVersion}</dd></div><div><dt>Job</dt><dd>{result.provenance.jobId ?? "Not recorded"}</dd></div></dl>
        {result.provenance.jobId && canInspectJob(result) ? <Link to={`/jobs/${encodeURIComponent(result.provenance.jobId)}`}>Job details</Link> : null}
        <p><a className="digital-primary" href={acgResultArchiveUrl(result.id)}>Download all artifacts</a></p>
        {resource.loading ? <p role="status">Loading artifacts for {result.id}…</p> : null}
        {resource.error ? <p className="acg-notice is-error" role="alert">Artifacts unavailable for {result.id}: {resource.error}</p> : null}
        <AcgJsonDetails className="acg-advanced" summary="Summary and generation configuration" value={{ summary: result.summary, generation: { ...record(result.data.acg), cells: undefined } }} />
        <AcgJsonDetails className="acg-advanced" summary="Result provenance" value={result.provenance} />
      </>;
    }}</ResultColumns></div>
    <div id="acg-stages"><ResultColumns title="Unified stage evidence" sectionKey="stages" results={results}>{result => {
      const unified = record(result.data.acgUnified);
      return Object.keys(unified).length ? <><AcgWorkflowOutcomes value={unified} artifacts={resourceFor(result.id).items} /><AcgJsonDetails className="acg-advanced" summary="Complete workflow evidence" value={unified} /></>
        : <Missing>No unified stage evidence recorded in this result. Legacy research and generation evidence appear in their sections.</Missing>;
    }}</ResultColumns></div>
    <div id="acg-trials"><ResultColumns title="Algorithm trials and comparison" sectionKey="trials" results={results}>{result => <ResearchPhaseResult result={result} phase="comparison" artifacts={resourceFor(result.id).items} />}</ResultColumns></div>
    <div id="acg-search"><ResultColumns title="Feasible search" sectionKey="search" results={results}>{result => <ResearchPhaseResult result={result} phase="search" artifacts={resourceFor(result.id).items} />}</ResultColumns></div>
    <section id="acg-generated" className="acg-generated-comparison" aria-label="Generated cell comparison">
      <h2>Generated cells, layouts and diagnostics</h2>
      <p className="acg-help">Every recorded cell is listed below. Each group keeps the selected result order; a missing cell has no substituted layout.</p>
      {groups.length ? <nav className="acg-section-nav" aria-label="Generated cell groups">{groups.map((group, index) => <a key={group.key} href={`#acg-cell-group-${index}`}>{group.name}</a>)}</nav> : null}
      {groups.map((group, index) => <div key={group.key} id={`acg-cell-group-${index}`} data-cell-group={group.name}>
        <ResultColumns title={`Generated cell · ${group.name}`} sectionKey="generated-cell" results={results}>{result => {
          const cells = group.cells[result.id];
          const resource = resourceFor(result.id);
          return cells?.length ? <>{cells.length > 1 ? <p className="acg-notice">Ambiguous cell identity: {cells.length} records share this exact name. All are shown separately; no record is chosen implicitly.</p> : null}
            {resource.loading ? <p role="status">Loading cell artifacts…</p> : null}{resource.error ? <p className="acg-notice is-error" role="alert">Cell artifacts unavailable: {resource.error}</p> : null}
            {cells.map((cell, cellIndex) => <div key={cellIndex}>{cells.length > 1 ? <h4>Cell record {cellIndex + 1}</h4> : null}<CellResult cell={cell} artifacts={resource.items} /></div>)}
          </> : <Missing>Cell “{group.name}” is not present in this result. No generated cell detail or preview is available for this identity.</Missing>;
        }}</ResultColumns>
      </div>)}
      {!groups.length ? <ResultColumns title="Generated cells" sectionKey="generated-cell" results={results}>{() => <Missing>No parsed generated cells recorded in this result.</Missing>}</ResultColumns> : null}
    </section>
    <div id="acg-artifacts"><ResultColumns title="Reports, artifacts and downloads" sectionKey="artifacts" results={results}>{result => {
      const resource = resourceFor(result.id);
      return <><ResearchPhaseResult result={result} phase="report" artifacts={resource.items} />
        <h3>All result artifacts</h3><p><a href={acgResultArchiveUrl(result.id)}>Download all artifacts</a></p>
        {resource.loading ? <p role="status">Loading artifacts…</p> : resource.error ? <p className="acg-notice is-error" role="alert">Artifacts unavailable: {resource.error}</p>
          : resource.items.length ? <ul className="acg-downloads">{resource.items.map(item => <li key={item.id}><a href={artifactDownloadUrl(item.id)}>{acgArtifactLabel(item.relativePath)}</a><span>{item.role} · {formatBytes(item.sizeBytes)}</span></li>)}</ul> : <Missing>No result artifacts are available.</Missing>}
        <AcgJsonDetails className="acg-advanced" summary="Complete retained result payload" value={result.data} />
      </>;
    }}</ResultColumns></div>
  </div>;
}
