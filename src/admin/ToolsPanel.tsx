import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { ModuleId, ToolCapabilityV1, ToolConfigurationV1, ToolHealthCheckV1 } from "../../shared/contracts/v1";
import {
  checkToolPaths,
  createToolConfiguration,
  getModuleCapabilities,
  listToolConfigurations,
  probeToolConfiguration,
  runToolSelfTest,
  updateToolConfiguration,
  type PathCheckV1,
  type ToolConfigurationInput,
} from "../api/admin";
import { formatDate, StatusBadge } from "../jobs";
import { AdminNotice } from "./AdminNotice";
import { ADMIN_TOOL_CATALOG, type AdminToolCatalogEntry } from "./catalog";

const MODULES: ModuleId[] = ["benchmark", "digital", "ppa"];

function blankInput(entry: AdminToolCatalogEntry): ToolConfigurationInput {
  return {
    toolId: entry.toolId, moduleId: entry.moduleId, enabled: true, rootPath: null,
    executablePath: null, interpreterPath: null, entryPoint: null, workingDirectory: null,
    timeoutSeconds: 300, maxConcurrency: 1, environmentNames: [...entry.allowedEnvironmentNames],
    environment: {}, versionProbeArgv: [...entry.versionProbeArgv], adapterId: entry.adapterId,
    adapterVersion: entry.adapterVersion,
  };
}

function inputFromConfiguration(value: ToolConfigurationV1): ToolConfigurationInput {
  const { id: _id, revision: _revision, capturedAt: _capturedAt, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = value;
  return input;
}

export function ToolsPanel(): JSX.Element {
  const [configurations, setConfigurations] = useState<ToolConfigurationV1[]>([]);
  const [capabilities, setCapabilities] = useState<ToolCapabilityV1[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catalogId, setCatalogId] = useState<string>(ADMIN_TOOL_CATALOG[0].toolId);
  const catalog = ADMIN_TOOL_CATALOG.find((entry) => entry.toolId === catalogId) || ADMIN_TOOL_CATALOG[0];
  const [draft, setDraft] = useState<ToolConfigurationInput>(() => blankInput(ADMIN_TOOL_CATALOG[0]));
  const [health, setHealth] = useState<Record<string, ToolHealthCheckV1>>({});
  const [pathChecks, setPathChecks] = useState<Record<string, PathCheckV1>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const [tools, ...moduleResponses] = await Promise.all([listToolConfigurations(), ...MODULES.map(getModuleCapabilities)]); setConfigurations(tools); setCapabilities(moduleResponses.flatMap((response) => response.capabilities)); setError(null); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const current = selectedId ? configurations.find((entry) => entry.id === selectedId) || null : null;
  const runtimeByTool = useMemo(() => Object.fromEntries(capabilities.map((value) => [value.toolId, value])), [capabilities]);

  function chooseCatalog(nextId: string): void {
    const entry = ADMIN_TOOL_CATALOG.find((value) => value.toolId === nextId) || ADMIN_TOOL_CATALOG[0];
    setCatalogId(entry.toolId); setSelectedId(null); setDraft(blankInput(entry)); setMessage(null); setError(null);
  }

  function edit(configuration: ToolConfigurationV1): void {
    setSelectedId(configuration.id); setCatalogId(configuration.toolId); setDraft(inputFromConfiguration(configuration)); setMessage(null); setError(null);
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault(); setBusy("save"); setError(null); setMessage(null);
    try {
      const saved = current ? await updateToolConfiguration(current.id, draft) : await createToolConfiguration(draft);
      setSelectedId(saved.id); setMessage(`Saved ${saved.toolId} revision ${saved.revision}. Run all checks before enabling it for jobs.`); await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(null); }
  }

  async function check(kind: "paths" | "probe" | "self-test"): Promise<void> {
    if (!current) return; setBusy(kind); setError(null); setMessage(null);
    try {
      if (kind === "paths") { const next = await checkToolPaths(current.id); setPathChecks((values) => ({ ...values, [current.id]: next })); setMessage(next.ok ? "All configured paths are valid." : next.errors.join("; ")); }
      if (kind === "probe") { const next = await probeToolConfiguration(current.id); setHealth((values) => ({ ...values, [current.id]: next })); setMessage(next.message); }
      if (kind === "self-test") { const next = await runToolSelfTest(current.id); setHealth((values) => ({ ...values, [current.id]: next })); setMessage(next.message); }
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : String(requestError)); }
    finally { setBusy(null); }
  }

  return <section className="admin-section"><header><div><h2>Tool configuration</h2><p>Adapters own argv construction. Administrators may configure only audited paths, limits, and allowlisted environment values.</p></div></header><AdminNotice error={error} message={message} />
    <div className="admin-tools-layout"><aside className="admin-tool-list"><button type="button" className={!selectedId ? "active" : ""} onClick={() => chooseCatalog(catalogId)}>+ New configuration</button>{configurations.map((configuration) => { const runtime = runtimeByTool[configuration.toolId]; const observed = health[configuration.id]; return <button type="button" className={selectedId === configuration.id ? "active" : ""} onClick={() => edit(configuration)} key={configuration.id}><span><strong>{ADMIN_TOOL_CATALOG.find((entry) => entry.toolId === configuration.toolId)?.label || configuration.toolId}</strong><small>rev {configuration.revision} · {configuration.moduleId}</small></span><StatusBadge status={observed?.status || runtime?.health || (configuration.enabled ? "not_configured" : "unavailable")} /></button>; })}</aside>
      <div className="admin-tool-editor"><form className="admin-form" onSubmit={(event) => { void save(event); }}><div className="admin-form--grid"><label>Audited tool<select value={catalogId} disabled={Boolean(current)} onChange={(event) => chooseCatalog(event.target.value)}>{ADMIN_TOOL_CATALOG.map((entry) => <option value={entry.toolId} key={`${entry.moduleId}:${entry.toolId}`}>{entry.label} · {entry.moduleId}</option>)}</select></label><label>Adapter<input value={draft.adapterId} readOnly /></label><label>Adapter version<input value={draft.adapterVersion} readOnly /></label><label className="admin-check admin-check--large"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Enabled for scheduling</label>
        <label>Tool root<input placeholder="/absolute/path/to/tool" value={draft.rootPath || ""} onChange={(event) => setDraft({ ...draft, rootPath: event.target.value || null })} /></label><label>Executable path<input placeholder="/absolute/path/to/executable" value={draft.executablePath || ""} onChange={(event) => setDraft({ ...draft, executablePath: event.target.value || null })} /></label><label>Python interpreter<input placeholder="/absolute/path/to/python" value={draft.interpreterPath || ""} onChange={(event) => setDraft({ ...draft, interpreterPath: event.target.value || null })} /></label><label>Adapter entry point<input placeholder="Repository-relative entry point" value={draft.entryPoint || ""} onChange={(event) => setDraft({ ...draft, entryPoint: event.target.value || null })} /></label><label>Working directory<input placeholder="/absolute/path/to/tool" value={draft.workingDirectory || ""} onChange={(event) => setDraft({ ...draft, workingDirectory: event.target.value || null })} /></label><label>Timeout (seconds)<input type="number" min={1} step={1} value={draft.timeoutSeconds} onChange={(event) => setDraft({ ...draft, timeoutSeconds: Number(event.target.value) })} /></label><label>Maximum concurrency<input type="number" min={1} step={1} value={draft.maxConcurrency} onChange={(event) => setDraft({ ...draft, maxConcurrency: Number(event.target.value) })} /></label><label>Version probe arguments<input value={JSON.stringify(catalog.versionProbeArgv)} readOnly /><small>Fixed by the audited adapter; never evaluated as a shell command.</small></label></div>
        <fieldset><legend>Allowlisted environment</legend><p>Only these adapter-approved names are accepted. Values are passed directly to the process environment.</p><div className="admin-form--grid">{catalog.allowedEnvironmentNames.map((name) => <label key={name}>{name}<input value={draft.environment[name] || ""} onChange={(event) => setDraft({ ...draft, environment: { ...draft.environment, [name]: event.target.value } })} /></label>)}</div></fieldset>
        <div className="admin-form-actions"><button className="admin-primary" type="submit" disabled={busy === "save"}>{busy === "save" ? "Saving…" : current ? "Save new revision" : "Save configuration"}</button>{current ? <><button type="button" disabled={Boolean(busy)} onClick={() => { void check("paths"); }}>{busy === "paths" ? "Checking…" : "Check paths"}</button><button type="button" disabled={Boolean(busy)} onClick={() => { void check("probe"); }}>{busy === "probe" ? "Probing…" : "Probe version"}</button><button type="button" disabled={Boolean(busy)} onClick={() => { void check("self-test"); }}>{busy === "self-test" ? "Testing…" : "Run minimal self-test"}</button></> : <span>Save first to run server-side checks.</span>}</div></form>
        {current ? <ToolCheckSummary configuration={current} health={health[current.id]} pathCheck={pathChecks[current.id]} runtime={runtimeByTool[current.toolId]} /> : null}</div></div>
  </section>;
}

function ToolCheckSummary({ configuration, health, pathCheck, runtime }: { configuration: ToolConfigurationV1; health?: ToolHealthCheckV1; pathCheck?: PathCheckV1; runtime?: ToolCapabilityV1 }): JSX.Element {
  return <section className="admin-card admin-tool-health"><h3>Health evidence</h3><dl><div><dt>Configuration</dt><dd>{configuration.id} · revision {configuration.revision}</dd></div><div><dt>Runtime capability</dt><dd><StatusBadge status={runtime?.health || "not_configured"} /> {runtime?.healthReason || runtime?.toolVersion || "No capability evidence"}</dd></div><div><dt>Latest action</dt><dd>{health ? <><StatusBadge status={health.status} /> {health.message} · {formatDate(health.checkedAt)}</> : "Run Probe version or minimal self-test."}</dd></div><div><dt>Version</dt><dd>{health?.version || runtime?.toolVersion || "—"}</dd></div><div><dt>Self-test</dt><dd>{health?.selfTestPassed === true ? "Passed" : health?.selfTestPassed === false ? "Failed" : "Not run"}</dd></div><div><dt>Missing dependencies</dt><dd>{health?.missingDependencies.join(", ") || "None reported"}</dd></div>{pathCheck ? <><div><dt>Resolved executable</dt><dd>{pathCheck.executable || "—"}</dd></div><div><dt>Resolved root</dt><dd>{pathCheck.root || "—"}</dd></div><div><dt>Resolved entry</dt><dd>{pathCheck.entryPoint || "—"}</dd></div><div><dt>Path errors</dt><dd>{pathCheck.errors.join("; ") || "None"}</dd></div></> : null}</dl></section>;
}
