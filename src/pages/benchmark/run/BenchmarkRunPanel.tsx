import { useEffect, useMemo, useState } from "react";
import type { InputRoleDefinitionV1, JobRecordV1, JsonObject, ToolCapabilityV1 } from "../../../../shared/contracts/v1";
import {
  createBenchmarkDraft,
  getBenchmarkCapabilities,
  preflightBenchmarkDraft,
  startBenchmarkJob,
  type BenchmarkCapabilities,
  type BenchmarkWorkflowMode,
  type BrowserInputFile,
} from "../../../api/benchmark";
import { READ_ONLY_DEMO } from "../../../api/client";
import { BenchmarkFilePicker } from "./BenchmarkFilePicker";
import { BenchmarkParameterEditor } from "./BenchmarkParameterEditor";
import { BenchmarkPlanPreview } from "./BenchmarkPlanPreview";
import { FittingDatasetMappingEditor } from "./FittingDatasetMappingEditor";
import "../../../benchmark-run.css";

const TOOL_ORDER = ["translator", "fitting", "reduction", "expansion", "spice-benchmark"];

function defaults(capability: ToolCapabilityV1): JsonObject {
  return Object.fromEntries(capability.parameters.map((parameter) => [parameter.id, parameter.defaultValue]));
}

function operationKey(toolId: string): string {
  return toolId === "spice-benchmark" ? "benchmark" : toolId;
}

interface BenchmarkRunPanelProps {
  onJobStarted?(job: JobRecordV1): void;
}

export function BenchmarkRunPanel({ onJobStarted }: BenchmarkRunPanelProps) {
  const [mode, setMode] = useState<BenchmarkWorkflowMode>("run");
  const [capabilities, setCapabilities] = useState<BenchmarkCapabilities | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [files, setFiles] = useState<BrowserInputFile[]>([]);
  const [selectedTools, setSelectedTools] = useState<Record<string, boolean>>({ "spice-benchmark": true });
  const [toolParameters, setToolParameters] = useState<Record<string, JsonObject>>({});
  const [draft, setDraft] = useState<JobRecordV1 | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<JobRecordV1 | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getBenchmarkCapabilities(controller.signal).then((value) => {
      setCapabilities(value);
      setToolParameters(Object.fromEntries(value.capabilities.map((capability) => [capability.toolId, defaults(capability)])));
    }).catch((reason: unknown) => setCapabilityError(reason instanceof Error ? reason.message : String(reason)));
    return () => controller.abort();
  }, []);

  const selectedCapabilities = useMemo(() => capabilities?.capabilities
    .filter((capability) => mode === "run" && selectedTools[capability.toolId]) ?? [], [capabilities, mode, selectedTools]);

  const inputRoles = useMemo(() => {
    if (mode === "import") {
      const completed = capabilities?.capabilities.flatMap((capability) => capability.inputRoles).find((role) => role.id === "completed-result");
      return completed ? [completed] : [];
    }
    const unique = new Map<string, InputRoleDefinitionV1>();
    selectedCapabilities.flatMap((capability) => capability.inputRoles).forEach((role) => {
      if (role.id !== "completed-result") unique.set(role.id, role);
    });
    return [...unique.values()];
  }, [capabilities, mode, selectedCapabilities]);

  const invalidateDraft = () => {
    setDraft(null);
    setStarted(null);
    setError(null);
  };

  const changeMode = (next: BenchmarkWorkflowMode) => {
    setMode(next);
    setFiles([]);
    invalidateDraft();
  };

  const configuration = () => ({
    mode,
    workflow: mode === "import" ? "completed-result-import" : TOOL_ORDER.filter((tool) => selectedTools[tool]).join("-then-"),
    operations: Object.fromEntries(TOOL_ORDER.map((tool) => [operationKey(tool), selectedTools[tool] === true])),
    toolParameters,
  });

  const preflight = async () => {
    setBusy(true);
    setError(null);
    try {
      let job = draft;
      if (!job) {
        setUploadProgress(0);
        const created = await createBenchmarkDraft(configuration(), files, (loaded, total) => setUploadProgress(total ? loaded / total * 100 : 0));
        job = created.job;
      }
      const ready = await preflightBenchmarkDraft(job.id, configuration(), files);
      setDraft(ready);
      setUploadProgress(100);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const response = await startBenchmarkJob(draft.id);
      setStarted(response.job);
      onJobStarted?.(response.job);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="benchmark-run-shell" aria-labelledby="benchmark-new-workflow-heading">
      <div className="benchmark-run-hero">
        <div><span className="benchmark-run-eyebrow">New Workflow</span><h2 id="benchmark-new-workflow-heading">Run real Benchmark tools</h2></div>
        <p>Upload → map → configure → preflight → inspect the exact plan → Start. No tool runs before Start.</p>
      </div>
      <div className="benchmark-mode-switch" role="tablist" aria-label="Benchmark workflow mode">
        <button type="button" className={mode === "run" ? "is-active" : ""} onClick={() => changeMode("run")}>Run from source</button>
        <button type="button" className={mode === "import" ? "is-active" : ""} onClick={() => changeMode("import")}>Import completed result</button>
      </div>

      {READ_ONLY_DEMO ? <div className="benchmark-run-notice is-warning">This deployment is a read-only demo. Upload and Start are disabled.</div> : null}
      {capabilityError ? <div className="benchmark-run-notice is-error">Capabilities unavailable: {capabilityError}</div> : null}

      {mode === "run" ? (
        <section className="benchmark-run-section" aria-labelledby="benchmark-tools-heading">
          <div className="benchmark-run-section__heading"><div><span className="benchmark-run-eyebrow">Toolchain</span><h3 id="benchmark-tools-heading">Choose operations</h3></div></div>
          <div className="benchmark-tool-grid">
            {TOOL_ORDER.map((toolId) => {
              const capability = capabilities?.capabilities.find((item) => item.toolId === toolId);
              if (!capability) return null;
              const unavailable = capability.health !== "healthy";
              return (
                <label key={toolId} className={`benchmark-tool-choice ${unavailable ? "is-unavailable" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedTools[toolId] === true}
                    disabled={unavailable || toolId === "spice-benchmark" || busy}
                    onChange={(event) => { setSelectedTools((current) => ({ ...current, [toolId]: event.target.checked })); invalidateDraft(); }}
                  />
                  <span><strong>{capability.label}</strong><small>{capability.description}</small></span>
                  <em>{unavailable ? `Unavailable · ${capability.healthReason ?? "health check required"}` : capability.toolVersion ?? "Healthy"}</em>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      <BenchmarkFilePicker mode={mode} files={files} roles={inputRoles} disabled={busy || READ_ONLY_DEMO} onChange={(next) => { setFiles(next); invalidateDraft(); }} />

      {mode === "run" && selectedCapabilities.length ? (
        <section className="benchmark-run-section" aria-labelledby="benchmark-parameters-heading">
          <div className="benchmark-run-section__heading"><div><span className="benchmark-run-eyebrow">Parameters</span><h3 id="benchmark-parameters-heading">Actual adapter parameters</h3></div></div>
          {selectedCapabilities.map((capability) => (
            <BenchmarkParameterEditor key={capability.toolId} capability={capability} values={toolParameters[capability.toolId] ?? {}} disabled={busy} onChange={(values) => { setToolParameters((current) => ({ ...current, [capability.toolId]: values })); invalidateDraft(); }} />
          ))}
          {selectedTools.fitting ? (
            <FittingDatasetMappingEditor
              files={files}
              value={(toolParameters.fitting?.datasetMapping && typeof toolParameters.fitting.datasetMapping === "object" && !Array.isArray(toolParameters.fitting.datasetMapping)) ? toolParameters.fitting.datasetMapping as JsonObject : {}}
              disabled={busy}
              onChange={(datasetMapping) => { setToolParameters((current) => ({ ...current, fitting: { ...(current.fitting ?? {}), datasetMapping } })); invalidateDraft(); }}
            />
          ) : null}
        </section>
      ) : null}

      <section className="benchmark-run-section">
        <div className="benchmark-run-section__heading"><div><span className="benchmark-run-eyebrow">Upload and validation</span><h3>Backend preflight</h3></div><span>{draft?.status ?? "Not started"}</span></div>
        {uploadProgress !== null ? <div className="benchmark-progress"><span style={{ width: `${Math.min(100, uploadProgress)}%` }} /><strong>{Math.round(uploadProgress)}%</strong></div> : null}
        {draft?.inputManifest.files.length ? (
          <div className="benchmark-recognition">
            {draft.inputManifest.files.map((file) => <div key={file.relativePath}><strong>{file.relativePath}</strong><span>{file.recognizedType} · {file.role ?? "unmapped"}</span>{file.validationErrors.length ? <em>{file.validationErrors.join("; ")}</em> : null}{file.unresolvedIncludes.length ? <em>Missing includes: {file.unresolvedIncludes.join(", ")}</em> : null}</div>)}
          </div>
        ) : null}
        <button className="benchmark-primary-action" type="button" disabled={busy || READ_ONLY_DEMO || !files.length || !capabilities} onClick={() => void preflight()}>{busy ? "Working…" : draft ? "Run preflight again" : "Upload and preflight"}</button>
      </section>

      <BenchmarkPlanPreview plan={draft?.plan ?? null} />
      {error ? <div className="benchmark-run-notice is-error">{error}</div> : null}
      <div className="benchmark-start-bar">
        <div><strong>Start is explicit</strong><span>The validated draft enters the persistent Benchmark queue only after this click.</span></div>
        <button type="button" disabled={busy || READ_ONLY_DEMO || !draft || draft.status !== "ready"} onClick={() => void start()}>Start</button>
      </div>
      {started ? <div className="benchmark-run-notice is-success">Job {started.id} is {started.status}. <a href={`/jobs/${encodeURIComponent(started.id)}`}>Open backend processing</a></div> : null}
    </section>
  );
}
