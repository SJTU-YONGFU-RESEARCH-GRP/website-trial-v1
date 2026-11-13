import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ArtifactRecordV1 } from "../../../shared/contracts/v1";
import type { SelectionRun } from "../../../shared/contracts/dtcoSelection";
import type { JobDetailV1, JobResultV1 } from "../../api/jobs";
import { apiRequest } from "../../api/client";
import { artifactDownloadUrl } from "../../api/jobs";
import { DtcoOptimizationComparison } from "./DtcoOptimizationComparison";
import { isSelectionResult, type DtcoSavedResult } from "./unifiedResultHelpers";

function Evidence({ row }: { row: DtcoSavedResult }): JSX.Element {
  const [loaded, setLoaded] = useState<{ artifacts: ArtifactRecordV1[]; provenance: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!row.jobId) return;
    const controller = new AbortController(); setError(null);
    const load = async () => {
      if (isSelectionResult(row)) {
        const response = (await apiRequest<SelectionRun>(`/dtco/selection/runs/${encodeURIComponent(row.jobId!)}`, { signal: controller.signal })).data;
        if (response.job.id !== row.jobId) throw new Error("Saved report does not match the selected job.");
        const paths = new Set([...Object.values(row.evaluation.artifacts), ...Object.values(row.evaluation.physical?.artifacts ?? {}).filter((value): value is string => typeof value === "string")].filter(path => !path.includes("\\") && path.split("/").every(part => part && part !== "." && part !== "..")));
        return { artifacts: response.artifacts.filter(artifact => (!artifact.resultId || artifact.resultId === row.persistedResultId) && [...paths].some(path => artifact.relativePath === path || row.persistedResultId && artifact.relativePath === `results/dtco/${row.persistedResultId}/${path}`)), provenance: { library: row.run.result!.library, search: row.run.result!.search } };
      }
      const [job, result] = await Promise.all([apiRequest<JobDetailV1>(`/jobs/${encodeURIComponent(row.jobId!)}`, { signal: controller.signal }), apiRequest<JobResultV1>(`/results/dtco/${encodeURIComponent(row.id)}`, { signal: controller.signal })]);
      if (result.data.id !== row.id || job.data.job.resultId && job.data.job.resultId !== row.id) throw new Error("Saved report does not match the selected result.");
      return { artifacts: job.data.artifacts, provenance: { result: result.data.data, steps: job.data.steps, events: job.data.latestEvents } };
    };
    void load().then(value => { if (!controller.signal.aborted) setLoaded(value); }).catch(reason => { if (!controller.signal.aborted) setError(String(reason)); });
    return () => controller.abort();
  }, [row.id, row.jobId, retry]);
  return <>{row.jobId ? <p><Link to={`/jobs/${encodeURIComponent(row.jobId)}`}>Full job and native logs</Link> · <a href={`/api/jobs/${encodeURIComponent(row.jobId)}/artifacts.zip`}>Download all artifacts</a></p> : null}{!isSelectionResult(row) ? <p><Link to={`/results/dtco/${encodeURIComponent(row.id)}`}>Measured result</Link></p> : null}{error ? <p role="alert">Could not load evidence: {error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry evidence</button></p> : loaded ? <>{loaded.artifacts.map(artifact => <p key={artifact.id}><a href={artifactDownloadUrl(artifact.id)}>{artifact.relativePath}</a></p>)}<details><summary>Saved native evidence and provenance</summary><pre>{JSON.stringify(loaded.provenance, null, 2)}</pre></details></> : <p>{row.jobId ? "Loading saved evidence…" : "No linked job was recorded."}</p>}</>;
}
export function DtcoResultDetails({ rows, active }: { rows: DtcoSavedResult[]; active: boolean }): JSX.Element {
  const [open, setOpen] = useState(false);
  const optimizations = [...new Map(rows.flatMap(row => !isSelectionResult(row) && row.optimization ? [[row.optimization.id, row.optimization] as const] : [])).values()];
  const fields: [string, (row: DtcoSavedResult) => React.ReactNode][] = [
    ["Source and scope", row => <>{row.origin === "selection" ? "Standard-cell selection" : row.origin === "optimization" ? "Automatic optimization" : "Batch experiment"}<p>{row.scope}</p><small>{row.sourceIdentity}</small></>],
    ["Conditions and constraints", row => <>{row.conditions}{isSelectionResult(row) ? <pre>{JSON.stringify(row.run.result!.request.constraints, null, 2)}</pre> : null}</>],
    ["Physical flow", row => isSelectionResult(row) ? <pre>{JSON.stringify(row.evaluation.physical ?? { status: "unavailable" }, null, 2)}</pre> : "Measured selected GDS; see saved native evidence and provenance."],
    ["Sizing / assignments", row => isSelectionResult(row) ? <pre>{JSON.stringify({ drives: row.evaluation.assignment, nativeCells: row.evaluation.cells }, null, 2)}</pre> : row.sizing ?? "N/A"],
    ["Requested parameters", row => <pre>{JSON.stringify(isSelectionResult(row) ? row.run.result!.request : row.requested, null, 2)}</pre>],
    ["Reports, native files and provenance", row => <Evidence key={row.id} row={row} />],
    ["Saved run audit", row => isSelectionResult(row) ? <details><summary>All evaluations in this saved run ({row.run.result!.evaluations.length})</summary><pre>{JSON.stringify(row.run.result, null, 2)}</pre></details> : <pre>{JSON.stringify(row.provenance, null, 2)}</pre>],
  ];
  return <details className="dtco-combined-details" onToggle={event => setOpen(event.currentTarget.open)}><summary>Detailed comparison · parameters, assignments, native reports and provenance ({rows.length} results)</summary>{open && active ? <><div className="jobs-table-scroll"><table className="jobs-table dtco-detail-table" aria-label="Selected result detailed comparison"><thead><tr><th>Field</th>{rows.map((row, index) => <th key={row.id}>{index + 1}. {row.name}<small>{row.label}</small></th>)}</tr></thead><tbody>{fields.map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{rows.map(row => <td key={row.id}>{render(row)}</td>)}</tr>)}</tbody></table></div>{optimizations.map(run => <details key={run.id}><summary>Full optimization history · {run.definition.name}</summary><DtcoOptimizationComparison run={run} /></details>)}</> : null}</details>;
}
