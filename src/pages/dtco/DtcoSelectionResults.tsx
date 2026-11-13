import { useEffect, useState } from "react";
import type { SelectionEvaluation, SelectionResult, SelectionRun } from "../../../shared/contracts/dtcoSelection";
import type { DtcoSavedSelectionEvaluation } from "./unifiedResultHelpers";
import { apiRequest } from "../../api/client";
import { artifactDownloadUrl } from "../../api/jobs/client";
import { selectionFeasible, selectionMetric } from "./selectionHelpers";

function EvaluationRows({ rows, result }: { rows: SelectionEvaluation[]; result: SelectionResult }): JSX.Element {
  return <>{rows.map(row => <tr key={row.id}><td>{row.index}{row.id === result.baselineEvaluationId ? <small>Baseline</small> : null}{row.id === result.bestEvaluationId && selectionFeasible(row) ? <small>Retained best</small> : null}</td><td>{Object.entries(row.assignment).map(([id,drive]) => <small key={id}>{id}: X{drive}{row.cells[id] ? ` · ${row.cells[id]}` : ""}</small>)}</td><td>{selectionMetric(row.areaUm2)}</td><td>{selectionMetric(row.pathDelayNs)}</td><td>{row.timingKind === "combinational" && row.setupSlackNs === null ? "N/A · combinational" : selectionMetric(row.setupSlackNs)}</td><td>{row.timingKind === "combinational" && row.holdSlackNs === null ? "N/A · combinational" : selectionMetric(row.holdSlackNs)}</td><td>{selectionMetric(row.maxSlackNs)}</td><td>{selectionMetric(row.minSlackNs)}</td><td>{selectionFeasible(row) ? "Pass" : row.status === "ok" ? "Not feasible / unverified" : row.status}{row.reason ? <small>{row.reason}</small> : null}</td></tr>)}</>;
}
const headings = <tr><th>Evaluation</th><th>Assignment / native cell</th><th>Liberty area (µm²)</th><th>STA path delay (ns)</th><th>Setup slack (ns)</th><th>Hold slack (ns)</th><th>Global max slack (ns)</th><th>Global min slack (ns)</th><th>Feasibility</th></tr>;
export function DtcoSelectionResultCard({ row, active }: { row: DtcoSavedSelectionEvaluation; active: boolean }): JSX.Element {
  const result = row.run.result!, evaluation = row.evaluation;
  const [evidence, setEvidence] = useState<SelectionRun | null>(row.run.artifacts.length ? row.run : null);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active || !reportsOpen || evidence) return;
    const controller = new AbortController();
    setError(null);
    void apiRequest<SelectionRun>(`/dtco/selection/runs/${encodeURIComponent(row.jobId)}`, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) {
        if (value.data?.job.id !== row.jobId) throw new Error("Artifact report does not match the checked run.");
        setEvidence(value.data);
      }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => controller.abort();
  }, [row.jobId, active, reportsOpen, evidence, retry]);
  const paths = new Set(Object.values(evaluation.artifacts).filter(path => !path.includes("\\") && path.split("/").every(part => part && part !== "." && part !== "..")));
  const artifacts = evidence?.artifacts.filter(artifact => (!artifact.resultId || artifact.resultId === row.persistedResultId) && [...paths].some(path => artifact.relativePath === path || row.persistedResultId && artifact.relativePath === `results/dtco/${row.persistedResultId}/${path}`)) ?? [];
  return <section className="dtco-selected-result" aria-label={`Selected measurement ${row.id}`}>
    <h3>{row.name} · {row.label}</h3><p className="dtco-result-source">Standard-cell selection · {row.conditions}<small>{row.sizing}</small><small>{row.sourceIdentity}</small></p>
    <p className="digital-callout digital-callout--warning">{row.scope}</p>
    <p>Library: <code>{result.library.id}</code> · {result.library.corner}<small>SHA-256: {result.library.sha256}</small></p>
    <p>{result.status === "inconclusive" ? "Insufficient evidence: no verified feasible best. Some timing checks are unknown." : result.bestEvaluationId && result.evaluations.some(value => value.id === result.bestEvaluationId && selectionFeasible(value)) ? `Retained best: evaluation ${result.evaluations.find(value => value.id === result.bestEvaluationId)!.index}` : "No feasible candidate found within the evaluated search."}</p>
    <p>Objective: {result.request.objective === "performance" ? "maximize global constrained setup margin at the fixed clock period" : result.request.objective === "balanced" ? "minimize equally weighted, baseline-normalized area and timing budget (clock period minus global max slack), using the first valid timing reference if baseline timing is unavailable" : "minimize cell area"}, among feasible candidates. Path delay does not establish maximum frequency.</p>
    <div className="jobs-table-scroll"><table className="jobs-table" aria-label={`Timing evidence for ${row.id}`}><thead>{headings}</thead><tbody><EvaluationRows rows={[evaluation]} result={result} /></tbody></table></div>
    <p className="hint">Setup/hold report register-to-register checks; global max/min slack also covers input/output paths. Power and maximum verified toggle frequency: N/A · not characterized.</p>
    <p><a href={`/api/jobs/${encodeURIComponent(row.jobId)}/artifacts.zip`}>Download all selection artifacts</a></p>
    <details onToggle={event => setReportsOpen(event.currentTarget.open)}><summary>Reports, native netlists and provenance</summary>
      {error ? <p role="alert">Could not load artifacts: {error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry artifacts</button></p> : !evidence ? <p>Loading artifact evidence…</p> : artifacts.length ? artifacts.map(artifact => <p key={artifact.id}><a href={artifactDownloadUrl(artifact.id)}>{artifact.relativePath}</a><small>{artifact.sha256}</small></p>) : <p>No evaluation-specific artifacts were published.</p>}
      <pre>{JSON.stringify({ evaluation: evaluation.artifacts, request: result.request, library: result.library, search: result.search }, null, 2)}</pre>
    </details>
    <details><summary>All evaluations in this saved run ({result.evaluations.length})</summary><div className="jobs-table-scroll"><table className="jobs-table" aria-label="All standard-cell selection evaluations"><thead>{headings}</thead><tbody><EvaluationRows rows={result.evaluations} result={result} /></tbody></table></div></details>
    {result.limitations.length ? <ul>{result.limitations.map((item,index) => <li key={index}>{item}</li>)}</ul> : null}
  </section>;
}
