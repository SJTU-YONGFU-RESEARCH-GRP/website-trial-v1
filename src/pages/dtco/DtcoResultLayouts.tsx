import { useEffect, useRef, useState } from "react";
import type { ArtifactRecordV1, JsonObject } from "../../../shared/contracts/v1";
import type { JobDetailV1, JobResultV1 } from "../../api/jobs";
import { artifactDownloadUrl } from "../../api/jobs";
import { apiRequest } from "../../api/client";
import { dtcoLayoutArtifacts } from "./DtcoLayoutPreview";
import { isSelectionResult, type DtcoSavedResult } from "./unifiedResultHelpers";
import type { DtcoSavedSelectionEvaluation } from "./unifiedResultHelpers";
import type { SelectionRun } from "../../../shared/contracts/dtcoSelection";
import type { DtcoSavedMeasurement } from "./resultHelpers";

export function DtcoLayoutThumbnail({ title, data, artifacts, resultId, unavailable = "No GDS layout was published for this measurement." }: { title: string; data: JsonObject | null; artifacts: ArtifactRecordV1[]; resultId: string | null; unavailable?: string }): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (expanded) dialog.current?.showModal(); }, [expanded]);
  const { selected, preview } = dtcoLayoutArtifacts(data, artifacts, resultId);
  const [failed, setFailed] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  const source = selected ? preview ? artifactDownloadUrl(preview.id) : `/api/dtco/artifacts/${encodeURIComponent(selected.id)}/preview` : null;
  const imageSource = source && attempt ? `${source}?retry=${attempt}` : source;
  return <article className="dtco-gds-card" aria-label={`GDS layout ${title}`}>
    <h4>{title}</h4>
    {selected && source && failed !== source ? <button type="button" className="dtco-gds-image" onClick={() => setExpanded(true)} aria-label={`Open full-size GDS preview for ${title}`}><img loading="lazy" decoding="async" key={attempt} src={imageSource ?? undefined} alt={`GDS layout preview for ${title}`} onError={() => setFailed(source)} /></button> : <p className="dtco-gds-unavailable">{selected ? "GDS layout available; the preview could not be loaded. Download the original layout below." : unavailable}</p>}
    {expanded && imageSource ? <dialog ref={dialog} className="dtco-gds-dialog" aria-label={`Full-size GDS preview for ${title}`} onClose={() => setExpanded(false)}><button type="button" className="jobs-secondary-button" onClick={() => dialog.current?.close()}>Close preview</button><h4>{title}</h4><img src={imageSource} alt={`Full-size GDS layout for ${title}`} /></dialog> : null}
    {selected && source && failed === source ? <button type="button" className="jobs-secondary-button" onClick={() => { setFailed(null); setAttempt(value => value + 1); }}>Retry preview · {title}</button> : null}
    {selected ? <><p><a href={artifactDownloadUrl(selected.id)} aria-label={`Download GDS · ${title}`}>Download GDS</a></p></> : null}
    {selected && source && failed !== source ? <small>Click the layout to open its full-size preview.</small> : null}
  </article>;
}

function ResultLayout({ row }: { row: DtcoSavedMeasurement }): JSX.Element {
  const [loaded, setLoaded] = useState<{ result: JobResultV1; artifacts: ArtifactRecordV1[] } | null>(null);
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!row.jobId) return;
    const controller = new AbortController();
    setLoaded(null); setError(null);
    void Promise.all([
      apiRequest<JobDetailV1>(`/jobs/${encodeURIComponent(row.jobId)}`, { signal: controller.signal }),
      apiRequest<JobResultV1>(`/results/dtco/${encodeURIComponent(row.id)}`, { signal: controller.signal }),
    ]).then(([job, result]) => {
      if (controller.signal.aborted) return;
      if (result.data?.id !== row.id || !Array.isArray(job.data?.artifacts) || (job.data.job.resultId && job.data.job.resultId !== row.id)) throw new Error("Layout evidence does not match the selected measurement.");
      setLoaded({ result: result.data, artifacts: job.data.artifacts });
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => controller.abort();
  }, [row.id, row.jobId, retry]);
  const title = `${row.name} · ${row.label}`;
  if (!row.jobId || loaded) return <div><DtcoLayoutThumbnail title={title} data={loaded?.result.data ?? null} artifacts={loaded?.artifacts ?? []} resultId={row.id} /><small className="dtco-gds-result-id">Result ID: {row.id}</small></div>;
  return <article className="dtco-gds-card" aria-label={`GDS layout ${title}`}><h4>{title}</h4>{error ? <><p role="alert">Could not load GDS evidence: {error}</p><button type="button" className="jobs-secondary-button" onClick={() => setRetry(value => value + 1)}>Retry GDS preview</button></> : <p role="status">Loading selected GDS layout…</p>}</article>;
}

function SelectionLayout({ row }: { row: DtcoSavedSelectionEvaluation }): JSX.Element {
  const [artifacts, setArtifacts] = useState<ArtifactRecordV1[] | null>(row.run.artifacts.length ? row.run.artifacts : null);
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (artifacts || !row.evaluation.physical) return;
    const controller = new AbortController(); setError(null);
    void apiRequest<SelectionRun>(`/dtco/selection/runs/${encodeURIComponent(row.jobId)}`, { signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return;
      if (response.data.job.id !== row.jobId || (response.data.job.resultId ?? null) !== row.persistedResultId) throw new Error("Physical evidence does not match the selected result.");
      setArtifacts(response.data.artifacts);
    }).catch(reason => { if (!controller.signal.aborted) setError(String(reason)); });
    return () => controller.abort();
  }, [row.id, row.jobId, artifacts, retry]);
  const title = `${row.name} · ${row.label}`, physical = row.evaluation.physical;
  if (physical && !artifacts) return <article className="dtco-gds-card"><h4>{title}</h4>{error ? <p role="alert">Could not load physical artifacts: {error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry GDS evidence</button></p> : <p>Loading selected circuit GDS…</p>}</article>;
  return <div><DtcoLayoutThumbnail title={title} data={{dtco:{artifacts:{selectedGdsPath:physical?.artifacts.gdsPath ?? "",completedPreviewPath:physical?.artifacts.previewPath ?? ""}}}} artifacts={artifacts ?? []} resultId={row.persistedResultId} unavailable="No matching circuit GDS artifact was published for this evaluation." /><small>{physical?.scope}</small></div>;
}

export function DtcoResultLayouts({ rows }: { rows: DtcoSavedResult[] }): JSX.Element {
  return <section className="dtco-selected-layouts" aria-label="Selected result GDS layouts"><h3>Selected result GDS layouts ({rows.length})</h3><p className="hint">Preview the GDS layouts for your selected results.</p><div className="dtco-gds-gallery">{rows.map(row => isSelectionResult(row) ? <SelectionLayout key={row.id} row={row} /> : <ResultLayout key={row.id} row={row} />)}</div></section>;
}
