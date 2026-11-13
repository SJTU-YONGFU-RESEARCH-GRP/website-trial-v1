import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { JobRecordV1, JsonObject } from "../../../shared/contracts/v1";
import { createAcgDraft, getAcgCapabilities, preflightAcgDraft, startAcgJob, type AcgCapabilities, type AcgEngine, type AcgFileRole, type AcgMode } from "../../api/acg/client";
import { useAuth } from "../../auth/AuthContext";
import { AcgUnifiedSettings } from "./AcgUnifiedSettings";
import { unifiedDefaults, unifiedParameters } from "./unifiedHelpers";
import { record } from "./helpers";
import { AcgRunMonitor } from "./AcgRunMonitor";
import { acgCoreDefaults, acgPresets, inferAcgRole, localInputDigest, parameterValue, parseConfigOverrides } from "./helpers";

interface SelectedFile { file: File; relativePath: string; role: AcgFileRole | "ignore"; sha256: string | null; hashing: boolean; }
const ENGINES: Array<{ id: AcgEngine; label: string; description: string }> = [
  { id: "cmos", label: "AutoCellGen CMOS", description: "CMOS version, single-row layout" },
  { id: "dr", label: "AutoCellGen Double Row", description: "CFET double-row/9T layout" },
  { id: "mr", label: "AutoCellGen Multi Row", description: "Multi-row placement algorithm comparison platform" },
];
const PARAMETER_LABELS: Record<string, string> = { numRows: "Number of rows", trackNum: "Track count", algorithm: "Placement algorithm", seed: "Random seed", candidateCount: "Placement candidates", timeoutSeconds: "Timeout (seconds)", verification: "Requested verification", widenPolicy: "Widening policy", widenExtraCpp: "Extra width (CPP)", routabilityPipeline: "Routability pipeline", sourceDiagnostic: "MR hotspot diagnostic file" };
const PARAMETER_HELP: Record<string, string> = { numRows: "CMOS uses one row; DR supports one or two; MR supports up to four subject to technology rules.", trackNum: "Track geometry must match the effective technology configuration.", algorithm: "Available algorithms depend on the selected native engine; preflight checks geometry constraints.", seed: "Use -1 for the native engine default.", candidateCount: "Number of placement candidates requested from the native engine.", timeoutSeconds: "Maximum run time before the backend terminates the process.", verification: "Native verification policy. Foundry verification needs an administrator-configured PV tool; research checks are reported separately.", widenPolicy: "MR placement replay widening strategy; routed multi-row constraints are checked during preflight.", widenExtraCpp: "Additional placement width in contacted poly pitches.", routabilityPipeline: "Enable the native MR routability pipeline.", sourceDiagnostic: "Uploaded JSON mapped as MR hotspot diagnostic; used for hotspot_safe widening." };
const ROLES: Array<{ id: AcgFileRole | "ignore"; label: string }> = [
  { id: "netlist", label: "Transistor netlist" }, { id: "config", label: "Configuration" }, { id: "rules", label: "Design rules" },
  { id: "placement", label: "Existing placement (optional)" }, { id: "port-verilog", label: "Verilog ports (optional)" }, { id: "port-metadata", label: "Port metadata (optional)" }, { id: "source-diagnostic", label: "MR hotspot diagnostic (.json, optional)" }, { id: "ignore", label: "Do not use" },
];
export function AcgInputPanel({ onFinished }: { onFinished(job?: JobRecordV1): void }): JSX.Element {
  const { readOnlyDemo } = useAuth();
  const [capabilities, setCapabilities] = useState<AcgCapabilities | null>(null);
  const [capabilityRevision, setCapabilityRevision] = useState(0);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [engine, setEngine] = useState<AcgEngine>("cmos");
  const [mode, setMode] = useState<AcgMode>("placement");
  const [presetId, setPresetId] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [unifiedFields, setUnifiedFields] = useState(() => unifiedDefaults("cmos"));
  const [overrides, setOverrides] = useState("{}");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [draft, setDraft] = useState<JobRecordV1 | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobRunning, setJobRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const one = useRef<HTMLInputElement>(null); const many = useRef<HTMLInputElement>(null); const folder = useRef<HTMLInputElement>(null);
  const fileGeneration = useRef(0);
  const engineRef = useRef<AcgEngine>("cmos");
  useEffect(() => folder.current?.setAttribute("webkitdirectory", ""), []);
  useEffect(() => {
    let active = true; setCapabilityError(null);
    void getAcgCapabilities().then((data) => { if (active) { setCapabilities(data); setFields((current) => Object.keys(current).length ? current : acgCoreDefaults(data.capabilities, engineRef.current)); } })
      .catch((reason) => { if (active) setCapabilityError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, [capabilityRevision]);
  useEffect(() => () => { fileGeneration.current += 1; }, []);
  const capability = capabilities?.capabilities.find((item) => item.toolId === `acg-${engine}`);
  const presets = useMemo(() => acgPresets(capabilities?.capabilities ?? [], engine), [capabilities, engine]);
  const preset = presets.find((item) => item.id === presetId);
  const modeDefinition = capability?.parameters.find((item) => item.id === "mode");
  const supportedModes = preset?.modes ?? modeDefinition?.enumValues.filter((value): value is AcgMode => value === "placement" || value === "routed") ?? ["placement"];
  const unifiedCapability = record(capability?.limits.unified);
  const comparisonAlgorithms = capability?.parameters.find(item => item.id === "algorithm")?.enumValues.filter((value): value is string => typeof value === "string") ?? [];
  const maxThreads = Math.max(1, Math.min(4, Number(record(unifiedCapability.limits).maxThreads) || 4));
  const frozenBudget = record(record(record(draft?.plan).acgUnifiedSnapshot).budget);
  const healthy = capability?.health === "healthy" && unifiedCapability.available === true;
  const hashed = files.length > 0 && files.every((item) => !item.hashing);
  const invalidate = () => { setDraft(null); setError(null); setUploadProgress(null); };
  const selectEngine = (next: AcgEngine) => {
    engineRef.current = next; setEngine(next); setPresetId(""); setMode("placement"); setOverrides("{}");
    setFields(capabilities ? acgCoreDefaults(capabilities.capabilities, next) : {});
    setUnifiedFields(unifiedDefaults(next, record(capabilities?.capabilities.find(item => item.toolId === `acg-${next}`)?.limits.unified).defaults)); invalidate();
  };
  const selectPreset = (id: string) => {
    setPresetId(id); const selected = presets.find((item) => item.id === id);
    if (!selected) setFields((current) => ({ ...current, numRows: "", trackNum: "" }));
    if (selected) { setFields((current) => ({ ...current, numRows: String(selected.numRows), trackNum: String(selected.trackNum) })); if (!selected.modes.includes(mode)) setMode(selected.modes[0] ?? "placement"); }
    invalidate();
  };
  const addFiles = async (added: File[]) => {
    invalidate();
    const paths = new Set(files.map((item) => item.relativePath));
    const selected: SelectedFile[] = [];
    for (const file of added) {
      const path = (file.webkitRelativePath || file.name).replaceAll("\\", "/").replace(/^\.\//, "");
      if (paths.has(path)) { setError(`Duplicate relative path: ${path}. Remove the previous file before adding its replacement.`); return; }
      paths.add(path); selected.push({ file, relativePath: path, role: /\.(md|png|jpg|gds|log|csv|sh|py)$/i.test(file.name) ? "ignore" : inferAcgRole(file.name), sha256: null, hashing: true });
    }
    const generation = fileGeneration.current;
    setFiles((current) => [...current, ...selected]);
    try {
      for (const item of selected) {
        const sha256 = await localInputDigest(item.file);
        if (generation !== fileGeneration.current) return;
        setFiles((current) => current.map((existing) => existing.file === item.file ? { ...existing, sha256, hashing: false } : existing));
      }
    } catch (reason) { setError(`Could not hash inputs: ${reason instanceof Error ? reason.message : String(reason)}`); }
  };
  const fileChange = (event: ChangeEvent<HTMLInputElement>) => { void addFiles([...event.target.files ?? []]); event.target.value = ""; };
  const preflight = async () => {
    setBusy(true); setError(null); setDraft(null);
    try {
      const included = files.filter((item): item is SelectedFile & { role: AcgFileRole } => item.role !== "ignore");
      if (!included.some((item) => item.role === "netlist")) throw new Error("Map one file as a transistor netlist. It may contain multiple cells.");
      for (const role of ROLES.filter((item) => item.id !== "ignore")) if (included.filter((item) => item.role === role.id).length > 1) throw new Error(`Only one ${role.label} file is supported. Combine netlist cells in one self-contained file or remove duplicate inputs.`);
      if (!presetId && (!files.some((item) => item.role === "config") || !files.some((item) => item.role === "rules"))) throw new Error("Choose a technology preset or upload both configuration and design-rule files.");
      if (!supportedModes.includes(mode)) throw new Error("The selected engine or preset does not support this generation mode.");
      if (engine === "cmos" && included.some((item) => item.role === "placement")) throw new Error("Placement input is supported by DR (native predefined-layout text) and MR (JSON replay), not CMOS. Remove or ignore the placement input.");
      const diagnostic = included.find((item) => item.role === "source-diagnostic");
      if (diagnostic && engine !== "mr") throw new Error("Hotspot diagnostic input requires MR. Remove or ignore this file.");
      if (diagnostic && !/\.json$/i.test(diagnostic.relativePath)) throw new Error("MR hotspot diagnostic must be a JSON file.");
      const parameters: JsonObject = { engine, mode, presetId: presetId || null, configOverrides: parseConfigOverrides(overrides) };
      for (const definition of capability?.parameters ?? []) {
        if (["engine", "mode", "presetId", "configOverrides"].includes(definition.id)) continue;
        const value = definition.id === "sourceDiagnostic" ? diagnostic?.relativePath ?? "" : fields[definition.id] ?? "";
        if (!value.trim() && !definition.required) continue;
        const parsed = parameterValue(definition.type, value, PARAMETER_LABELS[definition.id] ?? definition.label);
        if (typeof parsed === "number" && ((definition.minimum !== null && parsed < definition.minimum) || (definition.maximum !== null && parsed > definition.maximum))) throw new Error(`${definition.label} is outside the supported range.`);
        if (definition.type === "enum" && !definition.enumValues.includes(parsed as string)) throw new Error(`Choose a supported ${definition.label}.`);
        parameters[definition.id] = parsed;
      }
      parameters.unified = unifiedParameters(engine, unifiedFields, comparisonAlgorithms, maxThreads);
      setUploadProgress(0);
      const created = await createAcgDraft(included, (loaded, total) => setUploadProgress(total ? loaded / total : null), "unified");
      const ready = await preflightAcgDraft(created.job.id, { fileRoles: Object.fromEntries(included.map((item) => [item.relativePath, item.role])), parameters });
      setDraft(ready); setUploadProgress(1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const start = async () => {
    if (!draft || draft.status !== "ready" || jobRunning) return;
    setBusy(true); setError(null);
    try { const job = await startAcgJob(draft.id); setJobId(job.id); setJobRunning(true); setDraft(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  return <>
    <article className="digital-workflow-card acg-input-card">
      <header><div><span className="digital-eyebrow">Netlist → generation → comparison → search → report</span><h3>AutoCellGen</h3></div></header><p className="digital-intro">Upload inputs once, inspect the complete automatic execution plan, then start one workflow. Generated layouts, algorithm comparisons, supported searches and reports appear in one result.</p>
      {readOnlyDemo ? <p className="acg-notice">This deployment is read-only. Upload and Start are disabled.</p> : null}
      {capabilityError ? <div className="acg-notice is-error" role="alert"><p>Capabilities unavailable: {capabilityError}</p><div className="workflow-file-actions"><button type="button" disabled={busy || jobRunning} onClick={() => { invalidate(); setCapabilityRevision((value) => value + 1); }}>Retry engine capabilities</button></div></div> : !capabilities ? <p role="status">Loading engine capabilities…</p> : null}
      <fieldset className="acg-fieldset" disabled={busy || jobRunning || readOnlyDemo}>
        <section className="digital-input-section"><div className="digital-section-heading"><div><span>Step 1</span><h4>Engine and technology</h4></div></div><div className="acg-engine-grid">{ENGINES.map((item) => {
          const tool = capabilities?.capabilities.find((candidate) => candidate.toolId === `acg-${item.id}`);
          return <label key={item.id} className={`digital-tool acg-engine ${engine === item.id ? "is-selected" : ""}`}><input type="radio" name="acg-engine" value={item.id} checked={engine === item.id} onChange={() => selectEngine(item.id)} /><strong>{item.label}</strong><span>{item.description}</span><small>{tool?.health === "healthy" ? `Available${tool.toolVersion ? ` · ${tool.toolVersion}` : ""}` : `${tool?.health ?? (capabilityError ? "Capabilities unavailable" : "Loading")}${tool?.healthReason ? ` · ${tool.healthReason}` : ""}`}</small></label>;
        })}</div>
          <div className="acg-fields digital-field-grid"><label>Technology preset<select value={presetId} onChange={(event) => selectPreset(event.target.value)}><option value="">Custom uploaded config and rules</option>{presets.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.technology}</option>)}</select></label><label>Generation mode<select value={mode} onChange={(event) => { setMode(event.target.value as AcgMode); invalidate(); }}><option value="placement" disabled={!supportedModes.includes("placement")}>Placement</option><option value="routed" disabled={!supportedModes.includes("routed")}>Routed layout</option></select></label></div>
          {preset ? <p className="digital-format">{preset.description} · Configuration: {preset.configFilename} · Rules: {preset.rulesFilename}</p> : <p className="digital-format">Upload both configuration and rules. Backend preflight checks their compatibility with this engine.</p>}
          {capability && !supportedModes.includes("routed") ? <p className="digital-format">Routed layout is unavailable for the selected engine or preset; placement remains available.</p> : null}
        </section>
        <section className="digital-input-section"><div className="digital-section-heading"><div><span>Step 2</span><h4>Input files</h4></div></div><p className="digital-format">Supply one self-contained transistor netlist (one or more cells) and map each file's role. A preset supplies config and rules; uploaded files can replace them. Placement input is a native predefined-layout text file for DR or a JSON replay for MR; both require a single-cell netlist. MR replay preparation pads only the right edge of shorter rows with dummy columns. The raw upload is retained, and the derived replay and hash lineage are downloadable. For MR hotspot_safe widening, map one uploaded JSON as MR hotspot diagnostic; its relative filename is bound automatically.</p>
          <div className="acg-actions workflow-file-actions"><button type="button" onClick={() => one.current?.click()}>Choose single file</button><button type="button" onClick={() => many.current?.click()}>Choose files</button><button type="button" onClick={() => folder.current?.click()}>Choose folder</button></div>
          <input hidden ref={one} type="file" onChange={fileChange} /><input hidden ref={many} type="file" multiple onChange={fileChange} /><input hidden ref={folder} type="file" multiple onChange={fileChange} />
          {files.length ? <div className="acg-table-wrap"><table><thead><tr><th>Relative path</th><th>Role</th><th>Size</th><th>SHA-256</th><th /></tr></thead><tbody>{files.map((item) => <tr key={item.relativePath}><td><code>{item.relativePath}</code></td><td><div className="digital-field-grid"><label><select aria-label={`Role for ${item.relativePath}`} value={item.role} onChange={(event) => { setFiles((current) => current.map((file) => file.relativePath === item.relativePath ? { ...file, role: event.target.value as AcgFileRole | "ignore" } : file)); invalidate(); }}>{ROLES.map((role) => <option key={role.id} value={role.id} disabled={role.id === "placement" && engine === "cmos" || role.id === "source-diagnostic" && engine !== "mr"}>{role.id === "placement" ? engine === "dr" ? "Predefined layout (.txt, optional)" : "Placement replay (.json, optional)" : role.label}{role.id === "placement" && engine === "cmos" ? " — DR/MR only" : ""}</option>)}</select></label></div></td><td>{item.file.size.toLocaleString()} B</td><td><code title={item.sha256 ?? "SHA-256 is calculated by the server at preflight"}>{item.sha256 ? `${item.sha256.slice(0, 12)}…` : item.hashing ? "Hashing…" : "Server at preflight"}</code></td><td className="workflow-file-actions"><button type="button" aria-label={`Remove ${item.relativePath}`} onClick={() => { setFiles((current) => current.filter((file) => file.relativePath !== item.relativePath)); invalidate(); }}>Remove</button></td></tr>)}</tbody></table></div> : <p className="acg-empty">No inputs selected.</p>}
        </section>
        <section className="digital-parameter-section"><div className="digital-section-heading"><div><span>Step 3</span><h4>Generation parameters</h4></div></div><div className="acg-fields acg-generation-fields digital-field-grid">{capability?.parameters.filter((item) => !["engine", "mode", "presetId", "configOverrides"].includes(item.id)).map((definition) => <label key={definition.id}>{engine === "dr" && definition.id === "numRows" ? "Permitted row mode" : PARAMETER_LABELS[definition.id] ?? definition.label}{definition.unit ? ` (${definition.unit})` : ""}{definition.id === "sourceDiagnostic" ? <select aria-label="MR hotspot diagnostic file" value={files.find((file) => file.role === "source-diagnostic")?.relativePath ?? ""} disabled><option value="">Map an uploaded MR hotspot diagnostic in Step 2</option>{files.filter((file) => file.role === "source-diagnostic").map((file) => <option key={file.relativePath} value={file.relativePath}>{file.relativePath}</option>)}</select> : definition.type === "enum" || definition.type === "boolean" ? <select value={fields[definition.id] ?? ""} onChange={(event) => { setFields((current) => ({ ...current, [definition.id]: event.target.value })); invalidate(); }}>{!definition.required ? <option value="">Engine default</option> : null}{(definition.type === "boolean" ? [true, false] : definition.enumValues).map((value) => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select> : <input placeholder={definition.defaultValue === null ? "Engine configuration" : `Engine configuration (${String(definition.defaultValue)} default)`} type={definition.type === "integer" || definition.type === "number" ? "number" : "text"} step={definition.type === "integer" ? 1 : "any"} min={definition.minimum ?? undefined} max={definition.maximum ?? undefined} value={fields[definition.id] ?? ""} onChange={(event) => { setFields((current) => ({ ...current, [definition.id]: event.target.value })); invalidate(); }} />}<small>{definition.description || PARAMETER_HELP[definition.id]}</small>{definition.id === "verification" && capability.limits.officialVerificationConfigured !== true ? <small>Official verification is not configured. Requesting foundry checks will fail preflight rather than skip them.</small> : null}</label>)}</div>
          <details className="acg-advanced"><summary>Advanced native configuration</summary><p className="digital-format">JSON fields override the selected configuration; explicit core controls take precedence for their mapped settings. Leave an optional core control empty to retain the uploaded or preset configuration value. The backend validates keys and values before execution. Use this for native settings beyond the core controls.</p><div className="digital-field-grid"><label>Configuration overrides (JSON)<textarea rows={8} spellCheck={false} value={overrides} onChange={(event) => { setOverrides(event.target.value); invalidate(); }} /></label></div></details>
        </section>
        <AcgUnifiedSettings engine={engine} fields={unifiedFields} algorithms={comparisonAlgorithms} maxThreads={maxThreads} onChange={(key,value) => { setUnifiedFields(current => ({ ...current, [key]: value })); invalidate(); }} />
        <section className="digital-submit-section"><div className="digital-section-heading"><div><span>Step 5</span><h4>Preflight and Start</h4></div></div><p className="digital-format">Preflight validates inputs and freezes the execution plan. It does not run cell generation.</p>
          <button className="digital-primary" type="button" disabled={!healthy || !hashed} onClick={() => void preflight()}>{busy ? "Working…" : "Upload and preflight"}</button>
          {!healthy && capability ? <p className="acg-notice">Start is unavailable: {String(unifiedCapability.healthReason ?? capability.healthReason ?? capability.health)}.</p> : null}
        </section>
      </fieldset>
      {uploadProgress !== null ? <progress aria-label="Input upload progress" value={uploadProgress} max={1} /> : null}
      {error ? <p className="acg-notice is-error" role="alert">{error}</p> : null}
      {draft ? <section className="acg-preflight" aria-label="ACG preflight"><h3>Preflight {draft.status === "ready" ? "passed" : draft.status}</h3>
        <div className="acg-table-wrap"><table><thead><tr><th>Input</th><th>Recognized</th><th>Role</th><th>Server SHA-256</th><th>Validation</th></tr></thead><tbody>{draft.inputManifest.files.map((item) => <tr key={item.relativePath}><td>{item.relativePath}</td><td>{item.recognizedType}</td><td>{item.role}</td><td><code title={item.sha256}>{item.sha256.slice(0, 12)}…</code></td><td>{[...item.validationErrors, ...item.unresolvedIncludes.map((include) => `Missing include: ${include}`)].join("; ") || "Ready"}</td></tr>)}</tbody></table></div>
        {Object.keys(frozenBudget).length ? <section aria-label="Workflow execution budget"><h4>Execution budget</h4><dl className="acg-metrics">{[["comparisonMaximumRuns","Maximum comparison runs"],["comparisonUpperBoundSeconds","Comparison timeout bound (seconds)"],["searchMaximumAttempts","Maximum search attempts"],["searchUpperBoundSeconds","Search timeout bound (seconds)"],["totalUpperBoundSeconds","Total workflow timeout bound (seconds)"]].map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{String(frozenBudget[key] ?? "Unavailable")}</dd></div>)}</dl><p className="acg-help">Search limits apply across the workflow. Timeout bounds are execution caps, not expected elapsed time; unsupported stages are explained in the plan.</p></section> : null}
        <details className="acg-advanced"><summary>Frozen parameters and execution budgets</summary><pre>{JSON.stringify(draft.parameters, null, 2)}</pre></details>
        <ol className="acg-plan">{draft.plan.steps.map((step) => <li key={step.id}><strong>{step.name}</strong><p>{step.description}</p><small>Inputs: {step.inputRoles.join(", ") || "none"} · Outputs: {step.outputRoles.join(", ") || "none"}</small></li>)}</ol>
        {draft.plan.warnings.map((warning) => <p className="acg-notice" key={warning}>{warning}</p>)}
        <button className="digital-primary" type="button" disabled={busy || readOnlyDemo || draft.status !== "ready"} onClick={() => void start()}>{busy ? "Starting…" : "Start workflow"}</button>
      </section> : null}
    </article>
    {jobId ? <AcgRunMonitor key={jobId} jobId={jobId} readOnly={readOnlyDemo} onFinished={(job) => { setJobRunning(false); onFinished(job); }} /> : null}
  </>;
}
