import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { InputManifestV1, JobPlanV1, TechnologyLibraryV1, ToolCapabilityV1 } from "../../../shared/contracts/v1";
import { useAuth } from "../../auth/AuthContext";
import {
  createDigitalDraft,
  getDigitalCapabilities,
  preflightDigitalDraft,
  startDigitalJob,
  type DigitalCapabilityResponse,
} from "../../api/digital/client";
import "../../digital-run.css";

type Mode = "run" | "import";
type FileRole = "rtl" | "gate_netlist" | "yosys_json" | "liberty" | "sdc" | "testbench" | "include" | "completed_result" | "ignore";

interface SelectedFile {
  id: string;
  file: File;
  relativePath: string;
  role: FileRole;
  sha256: string | null;
}

interface RunFields {
  design: string;
  category: string;
  architecture: string;
  topModule: string;
  processTechnology: string;
  bitWidth: string;
  library: string;
  corner: string;
  clockPort: string;
  clockPeriodNs: string;
  inputSlewNs: string;
  outputLoadPf: string;
  simulationTop: string;
}

const EMPTY_FIELDS: RunFields = {
  design: "", category: "", architecture: "", topModule: "", processTechnology: "", bitWidth: "",
  library: "", corner: "", clockPort: "", clockPeriodNs: "", inputSlewNs: "", outputLoadPf: "", simulationTop: "",
};

const RUN_ROLES: Array<{ value: FileRole; label: string }> = [
  { value: "rtl", label: "RTL/source" },
  { value: "gate_netlist", label: "Gate-level netlist" },
  { value: "yosys_json", label: "Yosys JSON" },
  { value: "liberty", label: "Liberty" },
  { value: "sdc", label: "SDC" },
  { value: "testbench", label: "Testbench" },
  { value: "include", label: "Include/header" },
  { value: "ignore", label: "Do not use" },
];

function relativePath(file: File): string {
  return (file.webkitRelativePath || file.name).replaceAll("\\", "/").replace(/^\.\//, "");
}

function inferRole(file: File, mode: Mode): FileRole {
  if (mode === "import") return "completed_result";
  const name = file.name.toLowerCase();
  if (name.endsWith(".lib")) return "liberty";
  if (name.endsWith(".sdc")) return "sdc";
  if (name.endsWith(".vh") || name.endsWith(".svh")) return "include";
  if (/(?:^|[_.-])tb(?:[_.-]|$)|testbench/.test(name)) return "testbench";
  if (name.endsWith(".json")) return "yosys_json";
  return "rtl";
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(1)} MiB`;
}

function toolState(capability: ToolCapabilityV1): string {
  if (capability.health === "healthy") return capability.toolVersion ? `Available · ${capability.toolVersion}` : "Available";
  if (capability.health === "not_configured") return "Not configured";
  if (capability.health === "unavailable") return "Unavailable";
  return "Degraded";
}

function FileChooser({ mode, onFiles }: { mode: Mode; onFiles(files: File[]): void }): JSX.Element {
  const single = useRef<HTMLInputElement>(null);
  const multiple = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  useEffect(() => folder.current?.setAttribute("webkitdirectory", ""), []);
  const accept = mode === "import" ? ".json,.csv" : ".v,.sv,.vh,.svh,.json,.lib,.sdc";
  const changed = (event: ChangeEvent<HTMLInputElement>): void => {
    onFiles([...event.target.files ?? []]);
    event.target.value = "";
  };
  return (
    <div className="digital-file-actions">
      <button type="button" onClick={() => single.current?.click()}>Choose single file</button>
      <button type="button" onClick={() => multiple.current?.click()}>Choose files</button>
      <button type="button" onClick={() => folder.current?.click()}>Choose folder</button>
      <input ref={single} hidden type="file" accept={accept} onChange={changed} />
      <input ref={multiple} hidden type="file" accept={accept} multiple onChange={changed} />
      <input ref={folder} hidden type="file" multiple onChange={changed} />
    </div>
  );
}

function PlannedOperations({ plan }: { plan: JobPlanV1 }): JSX.Element {
  return (
    <section className="digital-plan" aria-label="Planned operations">
      <div className="digital-section-heading">
        <div><span>Backend processing plan</span><h4>Planned Operations</h4></div>
        <strong>{plan.steps.length} steps</strong>
      </div>
      <ol>
        {plan.steps.map((step) => (
          <li key={step.id}>
            <div><strong>{step.name}</strong><p>{step.description}</p></div>
            <div className="digital-plan__detail">
              <span>{step.process ? step.process.executableDisplay : "Backend validation / parser"}</span>
              {step.process ? <code>{step.process.argv.join(" ")}</code> : null}
            </div>
          </li>
        ))}
      </ol>
      {plan.warnings.map((warning) => <p className="digital-callout digital-callout--warning" key={warning}>{warning}</p>)}
    </section>
  );
}

function Recognition({ manifest, roles }: { manifest: InputManifestV1; roles: Record<string, FileRole> }): JSX.Element {
  return (
    <section className="digital-recognition">
      <h4>Backend recognized content</h4>
      <p>{manifest.fileCount} files · {bytes(manifest.totalBytes)} · SHA-256 recorded for every input</p>
      <div className="digital-table-wrap">
        <table>
          <thead><tr><th>Path</th><th>Detected</th><th>Mapped use</th><th>SHA-256</th><th>Validation</th></tr></thead>
          <tbody>{manifest.files.map((file) => (
            <tr key={file.relativePath}>
              <td>{file.relativePath}</td><td>{file.recognizedType}</td><td>{roles[file.relativePath] ?? "unmapped"}</td>
              <td><code>{file.sha256.slice(0, 12)}…</code></td>
              <td className={file.validationErrors.length || file.unresolvedIncludes.length ? "digital-status--bad" : "digital-status--ok"}>
                {file.validationErrors[0] ?? (file.unresolvedIncludes.length ? `Missing include: ${file.unresolvedIncludes.join(", ")}` : "Ready")}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function DigitalJobForm({ mode, capabilityData }: { mode: Mode; capabilityData: DigitalCapabilityResponse | null }): JSX.Element {
  const navigate = useNavigate();
  const { user, readOnlyDemo } = useAuth();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [fields, setFields] = useState<RunFields>(EMPTY_FIELDS);
  const [technologyId, setTechnologyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [hashProgress, setHashProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [manifest, setManifest] = useState<InputManifestV1 | null>(null);
  const [plan, setPlan] = useState<JobPlanV1 | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roles = useMemo(() => Object.fromEntries(files.map((file) => [file.relativePath, file.role])), [files]);
  const requiredToolIds = useMemo(() => {
    const ids = ["yosys", "opensta"];
    if (files.some((file) => file.role === "testbench")) ids.push("iverilog", "vvp");
    return ids;
  }, [files]);
  const unavailable = mode === "run"
    ? requiredToolIds.filter((id) => capabilityData?.capabilities.find((item) => item.toolId === id)?.health !== "healthy")
    : [];
  const technologies = (capabilityData?.technologies ?? []).filter((technology) => technology.allowedAdapterIds.includes("digital-yosys-opensta-v1"));

  const addFiles = async (added: File[]): Promise<void> => {
    setError(null); setPlan(null); setManifest(null); setJobId(null); setHashProgress(0);
    const selected = added.map((file) => ({ id: `${relativePath(file)}\0${file.size}\0${file.lastModified}`, file, relativePath: relativePath(file), role: inferRole(file, mode), sha256: null }));
    const duplicates = selected.filter((item, index) => selected.findIndex((candidate) => candidate.relativePath === item.relativePath) !== index);
    if (duplicates.length) { setError(`Duplicate relative path: ${duplicates[0].relativePath}`); return; }
    setFiles(selected);
    for (let index = 0; index < selected.length; index += 1) {
      const digest = await sha256(selected[index].file);
      setFiles((current) => current.map((item) => item.id === selected[index].id ? { ...item, sha256: digest } : item));
      setHashProgress((index + 1) / selected.length);
    }
  };

  const setField = (key: keyof RunFields, value: string): void => setFields((current) => ({ ...current, [key]: value }));

  const preflight = async (): Promise<void> => {
    if (!user) { setError("Sign in before uploading or starting a Digital job."); return; }
    if (!files.length) { setError("Choose at least one file."); return; }
    setBusy(true); setError(null); setPlan(null); setUploadProgress(0);
    try {
      const draft = await createDigitalDraft(mode, files.map(({ file, relativePath: selectedPath }) => ({ file, relativePath: selectedPath })), (loaded, total) => {
        setUploadProgress(total ? loaded / total : loaded > 0 ? 0.5 : 0);
      });
      setManifest(draft.recognition); setJobId(draft.job.id);
      const numeric = (value: string): number | null => value.trim() ? Number(value) : null;
      const parameters = mode === "import" ? {} : {
        ...fields,
        bitWidth: numeric(fields.bitWidth),
        clockPeriodNs: numeric(fields.clockPeriodNs),
        inputSlewNs: numeric(fields.inputSlewNs),
        outputLoadPf: numeric(fields.outputLoadPf),
        clockPort: fields.clockPort.trim() || null,
        simulationTop: fields.simulationTop.trim() || null,
        technologyLibraryId: technologyId || null,
      };
      const ready = await preflightDigitalDraft(draft.job.id, {
        fileRoles: Object.fromEntries(Object.entries(roles).filter(([, role]) => role !== "ignore")),
        parameters,
        technologyLibraryId: technologyId || null,
      });
      setPlan(ready.plan); setUploadProgress(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally { setBusy(false); }
  };

  const start = async (): Promise<void> => {
    if (!jobId || !plan) return;
    setBusy(true); setError(null);
    try {
      const job = await startDigitalJob(jobId);
      navigate(`/jobs/${job.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  };

  const disabledReason = readOnlyDemo
    ? "Run and Import are disabled in the read-only static demo."
    : !user ? "Sign in to create Digital jobs."
      : unavailable.length ? `Unavailable tools: ${unavailable.join(", ")}` : null;

  return (
    <article className="digital-workflow-card">
      <header>
        <div><span className="digital-eyebrow">{mode === "run" ? "Source → computation → result" : "Completed files → normalized result"}</span>
          <h3>{mode === "run" ? "Run Digital Analysis" : "Import Digital Results"}</h3></div>
        <span className="digital-mode-badge">{mode === "run" ? "Yosys · OpenSTA · optional Icarus/VVP" : "JSON · CSV"}</span>
      </header>
      <p className="digital-intro">{mode === "run"
        ? "Upload RTL or a synthesized netlist, map one Liberty source and timing constraints, inspect the exact backend plan, then explicitly start the job."
        : "Import completed JSON/CSV into the same normalized Digital Result schema. Imported power keeps its reported scope; unspecified power is never relabeled."}</p>
      {disabledReason ? <p className="digital-callout digital-callout--warning">{disabledReason}</p> : null}
      {mode === "run" ? <div className="digital-tool-grid">{(capabilityData?.capabilities ?? []).map((capability) => (
        <div className="digital-tool" key={capability.toolId}><strong>{capability.label}</strong><span className={`digital-health digital-health--${capability.health}`}>{toolState(capability)}</span><small>{capability.healthReason}</small></div>
      ))}</div> : null}
      <section className="digital-input-section">
        <div className="digital-section-heading"><div><span>Step 1</span><h4>Select source</h4></div><strong>{files.length} files</strong></div>
        <p className="digital-format">{mode === "run"
          ? "Accepted: RTL .v/.sv, gate-level .v, Yosys .json, .lib, .sdc, testbench and .vh/.svh includes. Folder paths are preserved."
          : "Required per row: architecture, bitWidth, processNode, fmaxMhz, powerMw, areaUm2. Recommended: category, design, topModule, library, corner and powerMetric."}</p>
        <FileChooser mode={mode} onFiles={(selected) => void addFiles(selected)} />
        {files.length ? <div className="digital-table-wrap"><table><thead><tr><th>Relative path</th><th>Size</th><th>SHA-256</th><th>Input mapping</th></tr></thead><tbody>{files.map((selected) => (
          <tr key={selected.id}><td>{selected.relativePath}</td><td>{bytes(selected.file.size)}</td><td><code>{selected.sha256 ? `${selected.sha256.slice(0, 12)}…` : "Calculating…"}</code></td><td>{mode === "import" ? "Completed result" : <select value={selected.role} onChange={(event) => setFiles((current) => current.map((item) => item.id === selected.id ? { ...item, role: event.target.value as FileRole } : item))}>{RUN_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>}</td></tr>
        ))}</tbody></table></div> : null}
        {files.length ? <div className="digital-progress"><span style={{ width: `${hashProgress * 100}%` }} /><label>Local SHA-256 {Math.round(hashProgress * 100)}%</label></div> : null}
      </section>

      {mode === "run" ? <section className="digital-parameter-section">
        <div className="digital-section-heading"><div><span>Step 2</span><h4>Metadata, technology and timing</h4></div></div>
        <div className="digital-field-grid">
          {(["design", "category", "architecture", "topModule", "processTechnology", "bitWidth", "library", "corner"] as const).map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1")}<input value={fields[key]} onChange={(event) => setField(key, event.target.value)} /></label>)}
          <label>Registered technology<select value={technologyId} onChange={(event) => setTechnologyId(event.target.value)}><option value="">Use uploaded Liberty</option>{technologies.map((technology: TechnologyLibraryV1) => <option key={technology.id} value={technology.id}>{technology.technologyId} · {technology.standardCellLibrary} · {technology.corner}</option>)}</select></label>
          <label>Clock port<input value={fields.clockPort} onChange={(event) => setField("clockPort", event.target.value)} placeholder="optional virtual clock" /></label>
          <label>Clock period (ns)<input type="number" min="0" step="any" value={fields.clockPeriodNs} onChange={(event) => setField("clockPeriodNs", event.target.value)} placeholder="required without SDC" /></label>
          <label>Input slew (ns)<input type="number" min="0" step="any" value={fields.inputSlewNs} onChange={(event) => setField("inputSlewNs", event.target.value)} /></label>
          <label>Output load (pF)<input type="number" min="0" step="any" value={fields.outputLoadPf} onChange={(event) => setField("outputLoadPf", event.target.value)} /></label>
          <label>Simulation top<input value={fields.simulationTop} onChange={(event) => setField("simulationTop", event.target.value)} placeholder="only with testbench" /></label>
        </div>
        <p className="digital-callout">Power contract: computed runs expose <strong>static Liberty leakage only</strong>. Dynamic and total power remain unavailable because this adapter has no activity/VCD power engine.</p>
      </section> : null}

      <section className="digital-submit-section">
        <div className="digital-section-heading"><div><span>Step {mode === "run" ? "3" : "2"}</span><h4>Upload and backend preflight</h4></div></div>
        <button className="digital-primary" type="button" disabled={busy || Boolean(disabledReason) || files.length === 0 || hashProgress < 1} onClick={() => void preflight()}>{busy ? "Processing…" : "Upload & Preflight"}</button>
        {(busy || uploadProgress > 0) ? <div className="digital-progress digital-progress--upload"><span style={{ width: `${Math.max(2, uploadProgress * 100)}%` }} /><label>Upload {Math.round(uploadProgress * 100)}%</label></div> : null}
        {error ? <p className="digital-callout digital-callout--error" role="alert">{error}</p> : null}
      </section>
      {manifest ? <Recognition manifest={manifest} roles={roles} /> : null}
      {plan ? <PlannedOperations plan={plan} /> : null}
      {plan ? <div className="digital-start"><div><strong>Preflight passed</strong><p>No tool has run yet. Start explicitly queues this immutable plan.</p></div><button className="digital-primary" type="button" disabled={busy} onClick={() => void start()}>Start</button></div> : null}
    </article>
  );
}

export function DigitalWorkflowPanel(): JSX.Element {
  const [capabilities, setCapabilities] = useState<DigitalCapabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getDigitalCapabilities().then((value) => { if (active) setCapabilities(value); }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : String(caught)); });
    return () => { active = false; };
  }, []);
  return (
    <section className="digital-workflows">
      <div className="digital-workflows__heading"><div><span>Digital compute workspace</span><h2>Run or import a reproducible analysis</h2></div><p>Uploading never starts a tool. Review file recognition, mappings, parameters and the exact plan before Start.</p></div>
      {error ? <p className="digital-callout digital-callout--error">Capabilities unavailable: {error}</p> : null}
      <DigitalJobForm mode="run" capabilityData={capabilities} />
      <DigitalJobForm mode="import" capabilityData={capabilities} />
    </section>
  );
}

export default DigitalWorkflowPanel;
