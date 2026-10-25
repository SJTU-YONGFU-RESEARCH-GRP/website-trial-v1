import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { JobRecordV1, ResultRecordV1 } from "../../../shared/contracts/v1";
import { createAcgDraft, getAcgCapabilities, getAcgResearchSources, preflightAcgDraft, startAcgJob, type AcgCapabilities, type AcgFileRole, type AcgResearchOperation } from "../../api/acg/client";
import { useAuth } from "../../auth/AuthContext";
import { AcgRunMonitor } from "./AcgRunMonitor";
import { record } from "./helpers";
import { RESEARCH_LABELS, researchDefaults, researchParameters, researchSourceResults, researchMatrixBudget } from "./researchHelpers";

interface ResearchFile { file: File; relativePath: string; role: AcgFileRole; }
const FIELD_LABELS: Record<string, string> = {
  cells: "Cells (comma-separated)", algorithms: "Algorithms (comma-separated)", rowCounts: "Row counts (comma-separated)", trials: "Trials per configuration", threads: "Worker threads", maxCols: "Report maximum columns (CPP)", numRows: "Transistor rows", tracks: "Track search values", extraCpp: "Extra width search values (CPP)", maxAttempts: "Total attempt budget", totalTimeoutSeconds: "Total budget (seconds)", attemptTimeoutSeconds: "Per-attempt timeout (seconds)",
};
export function AcgResearchInputPanel({ operation, onFinished }: { operation: AcgResearchOperation; onFinished(): void }): JSX.Element {
  const { user, readOnlyDemo } = useAuth();
  const uploadInput = useRef<HTMLInputElement>(null);
  const [engine, setEngine] = useState<"cmos" | "mr">("mr");
  const [fields, setFields] = useState(() => researchDefaults(operation, "mr"));
  const [files, setFiles] = useState<ResearchFile[]>([]);
  const [capabilities, setCapabilities] = useState<AcgCapabilities | null>(null);
  const [results, setResults] = useState<ResultRecordV1[]>([]);
  const [sourceOwnerId, setSourceOwnerId] = useState<string | undefined>();
  const [sourcesBusy, setSourcesBusy] = useState(false);
  const [jobRunning, setJobRunning] = useState(false);
  const [draft, setDraft] = useState<JobRecordV1 | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshSources = useCallback(async () => {
    setSourcesBusy(true);
    try { const sources = await getAcgResearchSources(); setSourceOwnerId(sources.ownerId); setResults(sources.results); }
    catch (reason) { setSourceOwnerId(undefined); setResults([]); setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setSourcesBusy(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void getAcgCapabilities().then(caps => { if (active) setCapabilities(caps); }).catch(reason => { if (active) setError(String(reason instanceof Error ? reason.message : reason)); });
    return () => { active = false; };
  }, []);
  useEffect(() => { setSourceOwnerId(undefined); setResults([]); void refreshSources(); }, [refreshSources, user?.id]);
  const finished = useCallback(() => {
    setJobRunning(false); setDraft(null); void refreshSources(); onFinished();
  }, [refreshSources, onFinished]);
  const invalidate = () => { setDraft(null); setError(null); };
  const changeField = (key: string, value: string) => { setFields(current => ({ ...current, [key]: value })); invalidate(); };
  const workflow = capabilities?.capabilities.filter(tool => tool.toolId === `acg-${engine}`).flatMap(tool => {
    const entries = tool.limits.researchWorkflows;
    return Array.isArray(entries) ? entries.map(record) : [];
  }).find(item => item.operation === operation);
  const roles: Array<{ value: AcgFileRole; label: string }> = operation === "algorithm-report" ? [{ value: "aggregate", label: "Native aggregate JSON" }] : operation === "algorithm-matrix" ? [{ value: "algorithm-config", label: "Algorithm configuration (<algorithm>.json)" }, { value: "rules", label: "Design rules (optional)" }] : [{ value: "netlist", label: "Single-cell netlist" }, { value: "config", label: "Configuration (optional)" }, { value: "rules", label: "Design rules (optional)" }];
  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(event.target.files ?? []).map(file => ({ file, relativePath: file.webkitRelativePath || file.name, role: operation === "algorithm-report" ? "aggregate" : operation === "algorithm-matrix" ? /rules/i.test(file.name) ? "rules" : "algorithm-config" : /rules/i.test(file.name) ? "rules" : /config/i.test(file.name) ? "config" : "netlist" } as ResearchFile));
    setFiles(current => [...current, ...added.filter(file => !current.some(old => old.relativePath === file.relativePath))]);
    event.target.value = ""; invalidate();
  };
  const preflight = async () => {
    setBusy(true); setError(null); setProgress(null); setDraft(null);
    try {
      if (workflow?.available !== true) throw new Error(typeof workflow?.healthReason === "string" ? workflow.healthReason : "This research workflow is not available.");
      const parameters = researchParameters(operation, engine, fields);
      if (operation === "algorithm-report" && (files.filter(file => file.role === "aggregate").length + (fields.sourceResultId ? 1 : 0) !== 1)) throw new Error("Choose one uploaded aggregate JSON or one previous comparison result.");
      const created = await createAcgDraft(files.map(({ file, relativePath }) => ({ file, relativePath })), (loaded, total) => setProgress(total ? Math.round(loaded / total * 100) : null), operation);
      setDraft(await preflightAcgDraft(created.job.id, { fileRoles: Object.fromEntries(files.map(file => [file.relativePath, file.role])), parameters }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const start = async () => {
    if (!draft || draft.status !== "ready" || jobRunning) return;
    setBusy(true); setError(null);
    try { const started = await startAcgJob(draft.id); setJobId(started.id); setJobRunning(true); setDraft(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const keys = operation === "algorithm-report" ? ["maxCols"] : operation === "algorithm-matrix" ? ["cells", "algorithms", "rowCounts", "trials", "threads", "maxCols"] : ["cells", "numRows", "tracks", "extraCpp", "maxAttempts", "totalTimeoutSeconds", "attemptTimeoutSeconds"];
  let matrixBudget: ReturnType<typeof researchMatrixBudget> | null = null;
  if (operation === "algorithm-matrix") try { matrixBudget = researchMatrixBudget(researchParameters(operation, engine, fields)); } catch { /* Invalid edited fields are reported by explicit preflight. */ }
  const sourceKey = operation === "algorithm-report" ? "sourceResultId" : "resumeResultId";
  const previous = researchSourceResults(results, sourceOwnerId, operation, engine);
  const selectSource = (id: string) => {
    const source = record(previous.find(result => result.id === id)?.data.acgResearch);
    if (source.engine === "mr" || source.engine === "cmos") setEngine(source.engine);
    setFields(current => {
      const next = { ...current, [sourceKey]: id };
      if (operation === "known-feasible" && id) for (const [key, value] of Object.entries(record(source.parameters))) {
        if (key in next && (typeof value === "string" || typeof value === "number" || Array.isArray(value))) next[key] = Array.isArray(value) ? value.map(String).join(", ") : String(value);
      }
      return next;
    });
    invalidate();
  };
  return <>
    <section className="chart-card digital-run-card">
      <header><span className="digital-eyebrow">Research workflow</span><h2>{RESEARCH_LABELS[operation]}</h2></header>
      <p className="acg-help">{operation === "algorithm-matrix" ? "Compare native algorithms across cells, row counts and trials. Process completion, native outcomes and collected metrics are reported separately; this is not foundry certification." : operation === "algorithm-report" ? "Generate comparison reports from an existing native aggregate. This operation does not run placement or routing." : "Search bounded track and extra-width configurations for a witnessed routed layout. Reaching an attempt or time limit is a capped search, not proof that no feasible layout exists."}</p>
      <fieldset className="acg-fieldset" disabled={busy || jobRunning || readOnlyDemo}>
        <div className="digital-field-grid" style={{ gridTemplateColumns: "1fr" }}>
          <label>Engine<select value={engine} onChange={event => { const next = event.target.value as "cmos" | "mr"; setEngine(next); setFields(researchDefaults(operation, next)); invalidate(); }} disabled={operation === "known-feasible"}><option value="mr">AutoCellGen MR</option>{operation !== "known-feasible" ? <option value="cmos">AutoCellGen CMOS</option> : null}</select></label>
          {keys.map(key => <label key={key}>{FIELD_LABELS[key]}<input value={fields[key] ?? ""} onChange={event => changeField(key, event.target.value)} /></label>)}
        </div>
        {operation !== "algorithm-matrix" ? <div className="digital-field-grid" style={{ gridTemplateColumns: "1fr" }}><label>{operation === "algorithm-report" ? "Previous comparison result" : "Continue previous owned search"}<select value={fields[sourceKey]} onChange={event => selectSource(event.target.value)}><option value="">Start without a previous result</option>{previous.map(result => <option key={result.id} value={result.id}>{result.title} · {result.createdAt}</option>)}</select></label><div className="workflow-file-actions"><button type="button" disabled={sourcesBusy} onClick={() => void refreshSources()}>{sourcesBusy ? "Refreshing sources…" : "Refresh previous results"}</button></div></div> : null}
        <p className="acg-help">{operation === "algorithm-matrix" ? "DP and SA have trusted defaults. Other algorithms need matching <algorithm>.json uploads with GF180 technology, placement_only=true and base num_rows absent or 1. The native runner applies selected row counts. The matrix is limited to 1000 native runs and the administrator-configured time budget; preflight checks the full bound." : operation === "known-feasible" ? "Use built-in cell names, or upload one single-cell netlist per cell with its filename stem matching that cell. Continuation keeps consumed attempts and time within the total budget; it does not reset them." : "Uploaded aggregate JSON and a previous result are mutually exclusive."}</p>
        {matrixBudget ? <p className="acg-help">Matrix: {matrixBudget.runCount} native runs. Sum of native per-cell timeouts: {matrixBudget.nativeTimeoutSumSeconds} seconds before scheduling overhead. This budget estimate is not expected elapsed time; preflight publishes the authoritative bound.</p> : null}
        <div className="workflow-file-actions"><button type="button" onClick={() => uploadInput.current?.click()}>Upload workflow files</button><input hidden ref={uploadInput} aria-label="Upload workflow files" type="file" multiple onChange={addFiles} /></div>
        {files.length ? <div className="acg-table-wrap"><table><thead><tr><th>File</th><th>Role</th><th>Action</th></tr></thead><tbody>{files.map((file, index) => <tr key={file.relativePath}><td>{file.relativePath}</td><td><div className="digital-field-grid"><label><select aria-label={`Role for ${file.relativePath}`} value={file.role} onChange={event => { setFiles(current => current.map((item, number) => number === index ? { ...item, role: event.target.value as AcgFileRole } : item)); invalidate(); }}>{roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label></div></td><td className="workflow-file-actions"><button type="button" onClick={() => { setFiles(current => current.filter((_, number) => number !== index)); invalidate(); }}>Remove</button></td></tr>)}</tbody></table></div> : null}
        {workflow?.available !== true ? <p className="acg-notice">{typeof workflow?.healthReason === "string" ? workflow.healthReason : "This research operation is not available in the current backend."}</p> : null}
        {Array.isArray(record(workflow?.limits).builtinCells) && operation !== "algorithm-report" ? <details className="acg-advanced"><summary>Built-in cells</summary><p>{(record(workflow?.limits).builtinCells as unknown[]).map(String).join(", ")}</p>{operation === "algorithm-matrix" ? <p className="acg-help">The native comparison runner uses this fixed benchmark set. User netlists are supported by the known-feasible search.</p> : null}</details> : null}
        <div className="workflow-file-actions acg-actions"><button type="button" disabled={workflow?.available !== true || busy} onClick={() => void preflight()}>{busy ? "Working…" : "Validate research workflow"}</button><button className="digital-primary" type="button" disabled={draft?.status !== "ready" || busy || jobRunning} onClick={() => void start()}>Start research workflow</button></div>
      </fieldset>
      {progress !== null && busy ? <p role="status">Upload {progress}%</p> : null}
      {error ? <p className="acg-notice is-error" role="alert">{error}</p> : null}
      {draft ? <div className="acg-preflight">
        <h3>{draft.status === "ready" ? "Preflight ready" : "Preflight requires attention"}</h3>
        <p className="acg-help">Start explicitly to execute this frozen plan. Process timeouts are enforced limits, not expected elapsed time.</p>
        <ol>{draft.plan?.steps.map(step => <li key={step.id}><strong>{step.name}</strong><p>{step.description}</p>{step.process ? <p>Process timeout: {step.process.timeoutSeconds} seconds</p> : null}</li>)}</ol>
        {draft.plan?.warnings.length ? <ul className="acg-notice">{draft.plan.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : null}
      </div> : null}
      {readOnlyDemo ? <p className="acg-notice">Sign in with execution permission to start a research workflow.</p> : null}
    </section>
    {jobId ? <AcgRunMonitor key={jobId} jobId={jobId} readOnly={readOnlyDemo} onFinished={finished} /> : null}
  </>;
}
