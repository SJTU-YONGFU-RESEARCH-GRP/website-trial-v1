import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { benchmarkToolVersionLabel } from "./toolPresentation";
import "../../../digital-run.css";
import "../../../benchmark-run.css";

const PROCESSING_TOOLS = ["translator", "fitting", "reduction", "expansion"] as const;
const BENCHMARK_TOOL = "spice-benchmark" as const;

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
  const navigate = useNavigate();
  const mode = "run" as BenchmarkWorkflowMode;
  const [capabilities, setCapabilities] = useState<BenchmarkCapabilities | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [sourceDialect, setSourceDialect] = useState<"auto" | "ngspice" | "hspice" | "spectre">("auto");
  const [sourceSection, setSourceSection] = useState("");
  const [files, setFiles] = useState<BrowserInputFile[]>([]);
  const [selectedTools, setSelectedTools] = useState<Record<string, boolean>>({ "spice-benchmark": true });
  const [toolOrder, setToolOrder] = useState<string[]>([...PROCESSING_TOOLS]);
  const [toolParameters, setToolParameters] = useState<Record<string, JsonObject>>({});
  const [draft, setDraft] = useState<JobRecordV1 | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (READ_ONLY_DEMO) return undefined;
    const controller = new AbortController();
    void getBenchmarkCapabilities(controller.signal).then((value) => {
      setCapabilityError(null);
      setCapabilities(value);
      setToolParameters(Object.fromEntries(value.capabilities.map((capability) => [capability.toolId, defaults(capability)])));
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setCapabilityError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => controller.abort();
  }, []);

  const orderedToolIds = useMemo(() => [...toolOrder, BENCHMARK_TOOL], [toolOrder]);
  const selectedCapabilities = useMemo(() => {
    if (mode !== "run") return [];
    const byId = new Map(capabilities?.capabilities.map((capability) => [capability.toolId, capability]) ?? []);
    return orderedToolIds.flatMap((toolId) => selectedTools[toolId] && byId.has(toolId) ? [byId.get(toolId)!] : []);
  }, [capabilities, mode, orderedToolIds, selectedTools]);

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
    setError(null);
  };

  const placeToolBefore = (toolId: string, targetId: string) => {
    if (toolId === targetId || !toolOrder.includes(toolId) || !toolOrder.includes(targetId)) return;
    setToolOrder((current) => {
      const next = current.filter((candidate) => candidate !== toolId);
      next.splice(next.indexOf(targetId), 0, toolId);
      return next;
    });
    invalidateDraft();
  };

  const configuration = () => ({
    mode,
    workflow: mode === "import" ? "completed-result-import" : orderedToolIds.filter((tool) => selectedTools[tool]).join("-then-"),
    operations: Object.fromEntries(orderedToolIds.map((tool) => [operationKey(tool), selectedTools[tool] === true])),
    operationOrder: toolOrder.filter((tool) => selectedTools[tool]),
    sourceDialect,
    sourceSection,
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
      onJobStarted?.(response.job);
      navigate(`/jobs/${response.job.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="benchmark-run-shell" aria-label="Benchmark input and execution">
      <article className="digital-workflow-card benchmark-workflow-card">
        <header>
          <div><span className="digital-eyebrow">{mode === "run" ? "Source → toolchain → benchmark result" : "Completed run → parser → benchmark result"}</span><h3>{mode === "run" ? "Run Benchmark Workflow" : "Import Completed Benchmark"}</h3></div>
          <span className="digital-mode-badge">{mode === "run" ? "Ordered toolchain" : "Native result"}</span>
        </header>
        <p className="digital-intro">{mode === "run" ? "Choose source files, arrange the enabled tools, inspect the backend plan and explicitly Start." : "Import a completed Benchmark result, verify the recognized content and explicitly publish it."}</p>

      {READ_ONLY_DEMO ? <div className="benchmark-run-notice is-warning">This deployment is a read-only demo. Upload and Start are disabled.</div> : null}
      {capabilityError ? <div className="benchmark-run-notice is-error">Capabilities unavailable: {capabilityError}</div> : null}

      <BenchmarkFilePicker mode={mode} files={files} roles={inputRoles} disabled={busy || READ_ONLY_DEMO} onChange={(next) => { setFiles(next); invalidateDraft(); }} />

      {mode === "run" ? <label className="benchmark-parameter-field">
        <span>Source model format</span>
        <small>Choose the uploaded model's format when SPICE syntax is shared between simulators. This controls source defaults before any tool runs.</small>
        <fieldset disabled={busy || READ_ONLY_DEMO}>
          <select value={sourceDialect} onChange={(event) => { setSourceDialect(event.target.value as typeof sourceDialect); invalidateDraft(); }}>
            <option value="auto">Automatic</option><option value="ngspice">ngspice</option><option value="hspice">HSPICE</option><option value="spectre">Spectre</option>
          </select>
        </fieldset>
      </label> : null}

      {mode === "run" ? <label className="benchmark-parameter-field">
        <span>Source library section (optional)</span>
        <small>Select a section such as TT when the root library contains several alternatives. Leave empty when the uploaded wrapper already selects its section.</small>
        <fieldset disabled={busy || READ_ONLY_DEMO}>
          <input type="text" value={sourceSection} maxLength={128} placeholder="Automatic / wrapper selection" onChange={(event) => { setSourceSection(event.target.value); invalidateDraft(); }} />
        </fieldset>
      </label> : null}

      {mode === "run" ? (
        <section className="benchmark-run-section" aria-labelledby="benchmark-tools-heading">
          <div className="benchmark-run-section__heading"><div><span className="benchmark-run-eyebrow">Step 2</span><h3 id="benchmark-tools-heading">Choose and arrange tools</h3></div><span>Benchmark always runs last</span></div>
          <p className="benchmark-run-help">Enable any of the first four tools and drag their rows to set the execution order. Each tool keeps its own parameters inside its row.</p>
          <div className="benchmark-tool-list">
            {orderedToolIds.map((toolId) => {
              const capability = capabilities?.capabilities.find((item) => item.toolId === toolId);
              if (!capability) return null;
              const unavailable = capability.health !== "healthy";
              const fixed = toolId === BENCHMARK_TOOL;
              const selected = selectedTools[toolId] === true;
              return (
                <article
                  key={toolId}
                  className={`benchmark-tool-choice ${selected ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""} ${fixed ? "is-fixed" : ""}`}
                  draggable={!fixed && !busy}
                  onDragStart={(event) => event.dataTransfer.setData("text/benchmark-tool", toolId)}
                  onDragOver={(event) => { if (!fixed) event.preventDefault(); }}
                  onDrop={(event) => { event.preventDefault(); placeToolBefore(event.dataTransfer.getData("text/benchmark-tool"), toolId); }}
                >
                  <header className="benchmark-tool-choice__header">
                    <label className="benchmark-tool-choice__toggle">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={unavailable || fixed || busy}
                        onChange={(event) => { setSelectedTools((current) => ({ ...current, [toolId]: event.target.checked })); invalidateDraft(); }}
                      />
                      <span><strong>{capability.label}</strong><small>{capability.description}</small></span>
                    </label>
                    <div className="benchmark-tool-choice__actions">
                      {fixed ? <span>Fixed final step</span> : <>
                        <span className="benchmark-tool-choice__drag-handle" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
                      </>}
                    </div>
                  </header>
                  <div className="benchmark-tool-choice__health">{unavailable ? `Unavailable · ${capability.healthReason ?? "health check required"}` : benchmarkToolVersionLabel(capability.toolVersion)}</div>
                  {selected ? <div className="benchmark-tool-choice__parameters">
                    <BenchmarkParameterEditor capability={capability} values={toolParameters[capability.toolId] ?? {}} disabled={busy} onChange={(values) => { setToolParameters((current) => ({ ...current, [capability.toolId]: values })); invalidateDraft(); }} />
                    {toolId === "fitting" ? <FittingDatasetMappingEditor
                      files={files}
                      value={(toolParameters.fitting?.datasetMapping && typeof toolParameters.fitting.datasetMapping === "object" && !Array.isArray(toolParameters.fitting.datasetMapping)) ? toolParameters.fitting.datasetMapping as JsonObject : {}}
                      disabled={busy}
                      onChange={(datasetMapping) => { setToolParameters((current) => ({ ...current, fitting: { ...(current.fitting ?? {}), datasetMapping } })); invalidateDraft(); }}
                    /> : null}
                  </div> : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="benchmark-run-section">
        <div className="benchmark-run-section__heading"><div><span className="benchmark-run-eyebrow">Step {mode === "run" ? "3" : "2"}</span><h3>Upload and backend preflight</h3></div><span>{draft?.status ?? "Not started"}</span></div>
        {uploadProgress !== null ? <div className="benchmark-progress"><span style={{ width: `${Math.min(100, uploadProgress)}%` }} /><strong>{Math.round(uploadProgress)}%</strong></div> : null}
        {draft?.inputManifest.files.length ? (
          <div className="benchmark-recognition">
            <h4>Backend recognized content</h4>
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
      </article>
    </section>
  );
}
