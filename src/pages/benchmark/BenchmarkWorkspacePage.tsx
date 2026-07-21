/* ==================================================================
 *  BenchmarkWorkspacePage (goal.md §5–§15)
 *
 *  Unified SPICE Model Workflow & Benchmark Workspace.
 *  Phase 3: Full workflow setup (scenario, model input, operations,
 *  settings, plan, benchmark setup, invocation preview).
 *  Brick-integrated with legacy benchmark browser.
 * ================================================================== */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { SPICE_BENCHMARK_MANIFEST } from "../../data/generatedSpiceBenchmarkManifest";
import type { AnalysisDomain, DataArtifact } from "../../data/SpiceBenchmarkTypes";
import { ANALYSIS_DOMAINS } from "../../data/SpiceBenchmarkTypes";
import { EmptyState } from "../flow/EmptyState";
import type {
  WorkflowScenario, SimulatorId, ToolId, ModelArtifact,
  ToolInvocation,
} from "../../compat/spiceWorkflow/contracts";
import { INTEGRATED_DEMO_SCENARIO } from "../../data/benchmarkWorkspace";
import { TOOL_CATALOG, CANONICAL_WORKFLOW_ORDER } from "../../compat/spiceWorkflow/toolCatalog";
import {
  getSelectableModels,
} from "../../data/benchmarkWorkspace/selectors";
import { translatorAdapter } from "../../compat/spiceWorkflow/translatorAdapter";
import { fittingAdapter } from "../../compat/spiceWorkflow/fittingAdapter";
import { reductionAdapter } from "../../compat/spiceWorkflow/reductionAdapter";
import { expansionAdapter } from "../../compat/spiceWorkflow/expansionAdapter";
import { ScenarioSelector } from "./ScenarioSelector";
import type { ScenarioMode } from "./ScenarioSelector";
import { ModelInputCard } from "./ModelInputCard";
import type { InputMode, LocalModelData } from "./ModelInputCard";
import { OperationSelector } from "./OperationSelector";
import { OperationSettings } from "./OperationSettings";
import type { OperationParams } from "./OperationSettings";
import { WorkflowPlanCard } from "./WorkflowPlanCard";
import { BenchmarkSetupCard } from "./BenchmarkSetupCard";
import { ExecutiveSummaryCard } from "./ExecutiveSummaryCard";
import { ModelLineageCard } from "./ModelLineageCard";
import { SimulatorComparisonCard } from "./SimulatorComparisonCard";
import { ModelComparisonCard } from "./ModelComparisonCard";
import { ProcessedModelCard } from "./ProcessedModelCard";
import { OperationResults } from "./OperationResults";
import { ArtifactTableCard } from "./ArtifactTableCard";
import { DomainOverlayCard } from "./DomainOverlayCard";
import "../../benchmark.css";
import "../../benchmark-workspace.css";

const BASE = import.meta.env.BASE_URL || "/";

type PreselectedOperation = "translator" | "reduction" | "expansion" | "fitting" | null;

/* ═══════════════════════════════════════════════════════════════ */
/*  Section Anchor Navigation                                      */
/* ═══════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { id: "setup", label: "Setup" },
  { id: "workflow", label: "Workflow" },
  { id: "simulator-comparison", label: "Simulator Comparison" },
  { id: "model-comparison", label: "Model Comparison" },
  { id: "processed-model", label: "Processed Model" },
  { id: "analysis-details", label: "Analysis Details" },
  { id: "tool-results", label: "Tool Results" },
  { id: "artifacts", label: "Artifacts" },
] as const;

function SectionAnchorNav({ activeSection }: { activeSection: string | null }) {
  return (
    <div className="bmw-anchor-nav">
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`}
          className={`bmw-anchor-link${activeSection === s.id ? " bmw-anchor-link--active" : ""}`}>{s.label}</a>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Lightbox (goal.md §28)                                         */
/* ═══════════════════════════════════════════════════════════════ */

function LegacyLightbox({ src, onClose, onPrev, onNext, index, total }: {
  src: string; onClose: () => void;
  onPrev: (() => void) | null; onNext: (() => void) | null;
  index: number; total: number;
}) {
  return (
    <div
      className="bmw-lightbox-overlay"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowLeft" && onPrev) onPrev();
        if (e.key === "ArrowRight" && onNext) onNext();
      }}
      tabIndex={0}
      ref={(el) => el?.focus()}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      <button className="bmw-lightbox-close" onClick={onClose} aria-label="Close">✕</button>
      {onPrev && <button className="bmw-lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous">◀</button>}
      {onNext && <button className="bmw-lightbox-next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next">▶</button>}
      <img src={src} alt="Enlarged plot" className="bmw-lightbox-img" onClick={(e) => e.stopPropagation()} />
      <div className="bmw-lightbox-counter">{index} / {total}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Provenance Banner                                              */
/* ═══════════════════════════════════════════════════════════════ */

function ProvenanceBanner({ mode }: { scenario: WorkflowScenario | null; mode: ScenarioMode }) {
  return (
    <div className="bmw-provenance-banner">
      {mode === "integrated-demo" && (
        <><strong>Deterministic static demonstration.</strong> Existing repository outputs and synthetic comparison fixtures are labeled separately. No external tool is executed in this browser.</>
      )}
      {mode === "existing-results" && (
        <><strong>Existing repository results.</strong> Displaying previously generated manifests from independent benchmark runs. Cross-tool lineage is not implied.</>
      )}
      {mode === "custom-local" && (
        <><strong>Local model — configured only.</strong> Your model stays in browser memory. Configure operations and preview invocation. No execution occurs.</>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Legacy Benchmark Browser                                      */
/* ═══════════════════════════════════════════════════════════════ */

const DOMAIN_LABELS: Record<AnalysisDomain, string> = {
  overview: "Overview", dc: "DC Analysis Summary", ac: "AC Analysis Summary",
  transient: "Transient Analysis Summary", noise: "Noise Analysis Summary",
};

function plotLabel(name: string): { title: string; detail: string } {
  const n = name.toLowerCase();
  if (n.includes("iv_characteristics")) return { title: "IV Characteristics", detail: "Id-Vd and Id-Vg curves across bias points" };
  if (n.includes("kcl_verification")) return { title: "KCL Verification", detail: "Sum of terminal currents" };
  if (n.includes("temperature_analysis")) return { title: "Temperature Analysis", detail: "DC characteristics at -40°C to 150°C" };
  if (n.includes("cv_characteristics")) return { title: "Capacitance-Voltage", detail: "C-V curves across frequency and bias" };
  if (n.includes("cv_components")) return { title: "C-V Components", detail: "Cgg, Cgs, Cgd decomposition" };
  if (n.includes("cv_multifreq")) return { title: "Multi-Frequency C-V", detail: "C-V at multiple frequencies" };
  if (n.includes("nqs_effects")) return { title: "Non-Quasi-Static Effects", detail: "Phase shift and frequency dependence" };
  if (n.includes("sparameter")) return { title: "S-Parameter Analysis", detail: "S11 and S21 vs frequency" };
  if (n.includes("charge_conservation")) return { title: "Charge Conservation", detail: "Total charge error verification" };
  if (n.includes("switching_response")) return { title: "Switching Response", detail: "Input pulse → output switching waveform" };
  if (n.includes("large_signal")) return { title: "Large-Signal Transient", detail: "Full-scale switching analysis" };
  if (n.includes("delay_effect")) return { title: "Delay Effect", detail: "Propagation delay" };
  if (n.includes("power_dissipation")) return { title: "Power Dissipation", detail: "Dynamic and static power" };
  if (n.includes("energy_consumption")) return { title: "Energy Consumption", detail: "Energy per switching event" };
  if (n.includes("quasi_static")) return { title: "Quasi-Static Analysis", detail: "I-V and time-domain" };
  if (n.includes("thermal_noise")) return { title: "Thermal Noise", detail: "Noise power spectral density" };
  if (n.includes("flicker_noise")) return { title: "Flicker Noise", detail: "1/f noise characterization" };
  if (n.includes("shot_noise")) return { title: "Shot Noise", detail: "Shot noise characterization" };
  if (n.includes("noise_components")) return { title: "Noise Components", detail: "Thermal, flicker, shot decomposition" };
  return { title: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), detail: "" };
}

function LegacyBenchmarkExplorer() {
  const manifest = SPICE_BENCHMARK_MANIFEST;
  const allRuns = useMemo(() => Object.values(manifest.runs), [manifest]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisDomain>("overview");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const selectedRun = useMemo(() => allRuns.find((r) => r.runId === selectedRunId) ?? null, [allRuns, selectedRunId]);
  useEffect(() => { if (!selectedRunId && allRuns.length > 0) setSelectedRunId(allRuns[0].runId); }, [allRuns, selectedRunId]);

  const datasets: DataArtifact[] = useMemo(() => selectedRun?.dataArtifacts ?? [], [selectedRun]);
  if (allRuns.length === 0) return <EmptyState icon="📭" message="No benchmark runs available" />;

  return (
    <div id="analysis-details">
      <div className="chart-card" style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <label><span style={{ fontSize: "0.78rem", fontWeight: 600 }}>Run</span>
            <select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
              {allRuns.map((r) => <option key={r.runId} value={r.runId}>{r.runId}</option>)}
            </select>
          </label>
          <label><span style={{ fontSize: "0.78rem", fontWeight: 600 }}>Domain</span>
            <select value={analysis} onChange={(e) => setAnalysis(e.target.value as AnalysisDomain)}>
              {ANALYSIS_DOMAINS.map((d) => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
            </select>
          </label>
        </div>
      </div>

      {analysis === "overview" && selectedRun && (
        <div className="chart-card">
          <h2>Run Overview</h2>
          <p className="hint">Simulator: {selectedRun.simulator} v{selectedRun.simulatorVersion} · Status: {selectedRun.status} · Model: {selectedRun.deviceName}</p>
          <div className="tool-grid" style={{ marginTop: "0.5rem" }}>
            {(["dc", "ac", "transient", "noise"] as const).map((dom) => (
              <div key={dom} className="chart-card" style={{ padding: "0.6rem" }}>
                <h3 style={{ fontSize: "0.85rem" }}>{DOMAIN_LABELS[dom]}</h3>
                <p className="hint">Datasets: {datasets.filter((d) => d.domain === dom).length}<br />Plots: {selectedRun.plotArtifacts.filter((p) => p.domain === dom).length}</p>
              </div>
            ))}
          </div>
          {selectedRun.reportSummary && (
            <div style={{ marginTop: "0.75rem" }}>
              <h3 className="flow-subsection-title">Verification</h3>
              <p className="hint">Overall: {selectedRun.reportSummary.overallStatus}</p>
            </div>
          )}
        </div>
      )}

      {analysis !== "overview" && selectedRun && (
        <div className="chart-card">
          <h2>{DOMAIN_LABELS[analysis]}</h2>
          {selectedRun.plotArtifacts.filter((p) => p.domain === analysis).length > 0 && (
            <div className="tool-grid" style={{ marginTop: "0.5rem" }}>
              {selectedRun.plotArtifacts.filter((p) => p.domain === analysis).map((plot, i) => {
                const label = plotLabel(plot.name);
                const src = plot.displayUrl ? `${BASE}${plot.displayUrl}` : null;
                return (
                  <div key={i} className="chart-card" style={{ cursor: src ? "pointer" : "default" }} onClick={() => src && setLightboxSrc(src)}>
                    {src ? <img src={src} alt={label.title} style={{ width: "100%", borderRadius: "6px" }} loading="lazy" /> : <p className="hint">Plot not available</p>}
                    <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}><strong>{label.title}</strong></p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {lightboxSrc && (
        <LegacyLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
          onPrev={null}
          onNext={null}
          index={1}
          total={1}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Main Page                                                      */
/* ═══════════════════════════════════════════════════════════════ */

export function BenchmarkWorkspacePage() {
  const [searchParams] = useSearchParams();

  /* ── Query param parsing ── */
  const preselectedOperation = useMemo((): PreselectedOperation => {
    const op = searchParams.get("operation");
    if (op === "translator" || op === "reduction" || op === "expansion" || op === "fitting") return op;
    return null;
  }, [searchParams]);

  /* ── Scenario ── */
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>(
    preselectedOperation ? "existing-results" : "integrated-demo",
  );
  const scenario: WorkflowScenario | null = scenarioMode === "integrated-demo" ? INTEGRATED_DEMO_SCENARIO : null;

  /* ── Model input ── */
  const [inputMode, setInputMode] = useState<InputMode>("bundled");
  const [bundledModelId, setBundledModelId] = useState<string | null>("bundled-bsim4-nmos-tt");
  const [localModel, setLocalModel] = useState<LocalModelData | null>(null);

  /* ── Operations ── */
  const [enabledOps, setEnabledOps] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of CANONICAL_WORKFLOW_ORDER) init[t] = true;
    if (preselectedOperation) {
      // Enable only the pre-selected operation
      for (const t of CANONICAL_WORKFLOW_ORDER) init[t] = (t === preselectedOperation);
    }
    return init;
  });
  const [opParams, setOpParams] = useState<OperationParams>(() => {
    const init: OperationParams = {};
    for (const t of CANONICAL_WORKFLOW_ORDER) {
      init[t] = {};
    }
    return init;
  });

  const handleOpToggle = useCallback((toolId: string, enabled: boolean) => {
    setEnabledOps((prev) => ({ ...prev, [toolId]: enabled }));
  }, []);

  const handleParamsChange = useCallback((toolId: string, params: Record<string, unknown>) => {
    setOpParams((prev) => ({ ...prev, [toolId]: params }));
  }, []);

  /* ── Benchmark setup ── */
  const [selectedSimulators, setSelectedSimulators] = useState<SimulatorId[]>(["ngspice", "spectre", "hspice"]);
  const [selectedDomains, setSelectedDomains] = useState<AnalysisDomain[]>(["dc", "ac", "transient", "noise"]);
  const [benchmarkModelIds, setBenchmarkModelIds] = useState<string[]>(
    scenario ? [scenario.defaultInputModelId, scenario.defaultCandidateModelId] : [],
  );
  const [baselineModelId, setBaselineModelId] = useState<string | null>(scenario?.defaultInputModelId ?? null);
  const [candidateModelId, setCandidateModelId] = useState<string | null>(scenario?.defaultCandidateModelId ?? null);
  const [referenceSimulator, setReferenceSimulator] = useState<SimulatorId>("ngspice");
  const [showCornerModels, setShowCornerModels] = useState(false);
  const [selectedModelForPreview, setSelectedModelForPreview] = useState<string | null>(null);

  /* ── Results visibility ── */
  const [resultsVisible, setResultsVisible] = useState<"hidden" | "demo" | "configured-only">(
    scenarioMode === "integrated-demo" ? "demo" : "hidden",
  );

  /* ── Invocation previews ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invocationPreviews = useMemo((): ToolInvocation<any>[] => {
    if (scenarioMode !== "integrated-demo" && scenarioMode !== "custom-local") return [];
    if (!scenario) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previews: ToolInvocation<any>[] = [];
    const contextBase = { workingDirectoryKey: "workspace", adapterVersion: "1.0.0" };
    let idx = 0;

    const inputModel = scenario.models[scenario.defaultInputModelId];
    if (!inputModel) return [];

    for (const toolId of CANONICAL_WORKFLOW_ORDER) {
      if (!enabledOps[toolId]) continue;
      const ctx = { ...contextBase, invocationId: `inv-preview-${toolId}-${idx++}`, outputDirectoryKey: `${toolId}-output` };

      if (toolId === "translator") {
        previews.push(translatorAdapter.buildInvocation(ctx, [inputModel], {
          sourceDialect: inputModel.dialect,
          targetDialect: "ngspice",
          followIncludes: true, verify: true, plot: true,
          maxPlots: Number(opParams.translator?.maxPlots ?? 10),
          preserveComments: false,
        }));
      } else if (toolId === "fitting") {
        previews.push(fittingAdapter.buildInvocation(ctx, [inputModel], {
          modelName: String(opParams.fitting?.modelName ?? "nmos_bsim4"),
          deviceType: (opParams.fitting?.deviceType as "nmos" | "pmos") ?? "nmos",
          simType: "dc",
          datasets: [],
          optimizer: (opParams.fitting?.optimizer as never) ?? "nelder_mead",
          maxIterations: Number(opParams.fitting?.maxIterations ?? 50),
          targetRelativeLoss: Number(opParams.fitting?.targetRelativeLoss ?? 0.3),
          outputFilename: String(opParams.fitting?.outputFilename ?? "calibrated.lib"),
          plot: Boolean(opParams.fitting?.plot ?? true),
          trainParameters: (opParams.fitting?.trainParameters as string[]) ?? ["vth0", "k1", "k2", "nfactor"],
          fixedParameters: (opParams.fitting?.fixedParameters as string[]) ?? [],
          lowerBounds: {},
          upperBounds: {},
        }));
      } else if (toolId === "reduction") {
        previews.push(reductionAdapter.buildInvocation(ctx, [inputModel], {
          errorTolerance: Number(opParams.reduction?.errorTolerance ?? 0.05),
          minParameters: Number(opParams.reduction?.minParameters ?? 10),
          maxIterations: Number(opParams.reduction?.maxIterations ?? 100),
          optimizationMethod: (opParams.reduction?.optimizationMethod as never) ?? "genetic_algorithm",
          reductionMethod: (opParams.reduction?.reductionMethod as never) ?? "sensitivity",
          testType: (opParams.reduction?.testType as never) ?? "dc_iv",
          deviceType: (opParams.reduction?.deviceType as "nmos") ?? "nmos",
          usePrebuiltNetlist: Boolean(opParams.reduction?.usePrebuiltNetlist ?? true),
        }));
      } else if (toolId === "expansion") {
        previews.push(expansionAdapter.buildInvocation(ctx, [inputModel], {
          modelName: String(opParams.expansion?.modelName ?? "nmos_bsim4_red"),
          nSigma: Number(opParams.expansion?.nSigma ?? 3),
          generateTSF: Boolean(opParams.expansion?.generateTSF ?? true),
          runIv: Boolean(opParams.expansion?.runIv ?? true),
          runCv: Boolean(opParams.expansion?.runCv ?? true),
          monteCarlo: Boolean(opParams.expansion?.monteCarlo ?? false),
          mcSamples: Number(opParams.expansion?.mcSamples ?? 100),
          distribution: (opParams.expansion?.distribution as never) ?? "normal",
          seed: Number(opParams.expansion?.seed ?? 42),
          plot: Boolean(opParams.expansion?.plot ?? true),
        }));
      }
    }
    return previews;
  }, [scenarioMode, scenario, enabledOps, opParams]);

  /* ── Workflow steps ── */
  const workflowSteps = useMemo(() => {
    const steps = CANONICAL_WORKFLOW_ORDER.map((toolId) => ({
      toolId,
      label: TOOL_CATALOG[toolId].label,
      enabled: enabledOps[toolId] ?? false,
    }));
    return [...steps, { toolId: "benchmark" as ToolId, label: "Benchmark", enabled: true }];
  }, [enabledOps]);

  /* ── Available model list ── */
  const availableModels = useMemo((): ModelArtifact[] => {
    if (!scenario) return [];
    const models = getSelectableModels(scenario);
    if (!showCornerModels) return models.filter((m) => !m.variant.startsWith("corner-"));
    return models;
  }, [scenario, showCornerModels]);

  /* ── Actions ── */
  const handlePreviewWorkflow = useCallback(() => {
    setResultsVisible("configured-only");
  }, []);

  const handleLoadDemoResults = useCallback(() => {
    if (scenarioMode === "integrated-demo") {
      setResultsVisible("demo");
    }
  }, [scenarioMode]);

  return (
    <div>
      <SectionAnchorNav activeSection={null} />
      <ProvenanceBanner scenario={scenario} mode={scenarioMode} />

      {/* ═══ Setup Card ═══ */}
      <div className="chart-card" id="setup" style={{ marginBottom: "0.85rem" }}>
        <h2>SPICE Model Workflow &amp; Benchmark Workspace</h2>
        <p className="hint">
          Configure input model, select operations, and view cross-simulator benchmark results.{" "}
          {preselectedOperation && (
            <span style={{ color: "var(--accent, #0071e3)", fontWeight: 600 }}>Pre-selected: {preselectedOperation}.</span>
          )}
        </p>

        <div style={{ marginTop: "0.75rem" }}>
          <ScenarioSelector mode={scenarioMode} onChange={(m) => { setScenarioMode(m); setResultsVisible(m === "integrated-demo" ? "demo" : "hidden"); }} />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <ModelInputCard
            mode={inputMode} onModeChange={setInputMode}
            bundledModelId={bundledModelId} onBundledModelChange={setBundledModelId}
            localModel={localModel} onLocalModelChange={setLocalModel}
          />
        </div>
      </div>

      {/* ═══ Operations ═══ */}
      <div className="chart-card" id="workflow" style={{ marginBottom: "0.85rem" }}>
        <OperationSelector enabled={enabledOps} onChange={handleOpToggle} scenarioMode={scenarioMode} />
      </div>

      {/* ═══ Operation Settings ═══ */}
      <div className="chart-card" style={{ marginBottom: "0.85rem" }}>
        <OperationSettings enabled={enabledOps} params={opParams} onParamsChange={handleParamsChange} />
      </div>

      {/* ═══ Workflow Plan ═══ */}
      <WorkflowPlanCard
        steps={workflowSteps}
        invocationPreviews={resultsVisible !== "hidden" ? invocationPreviews : undefined}
        compatibilityNodes={scenarioMode === "integrated-demo" ? [
          { simulator: "spectre", dialect: "spectre", temporary: true },
          { simulator: "hspice", dialect: "hspice", temporary: true },
        ] : undefined}
      />

      {/* ═══ Benchmark Setup ═══ */}
      <div style={{ marginTop: "0.85rem" }}>
        <BenchmarkSetupCard
          selectedSimulators={selectedSimulators} onSimulatorsChange={setSelectedSimulators}
          selectedDomains={selectedDomains as never} onDomainsChange={setSelectedDomains as never}
          benchmarkModelIds={benchmarkModelIds} onBenchmarkModelIdsChange={setBenchmarkModelIds}
          availableModels={availableModels}
          baselineModelId={baselineModelId} onBaselineChange={setBaselineModelId}
          candidateModelId={candidateModelId} onCandidateChange={setCandidateModelId}
          referenceSimulator={referenceSimulator} onReferenceSimulatorChange={setReferenceSimulator}
          showCornerModels={showCornerModels} onShowCornerModelsChange={setShowCornerModels}
        />
      </div>

      {/* ═══ Static Action Buttons ═══ */}
      <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className="benchmark-btn" onClick={handlePreviewWorkflow} style={{ padding: "0.5rem 1rem", fontWeight: 600 }}>
          Preview workflow
        </button>
        {scenarioMode === "integrated-demo" && (
          <button className="benchmark-btn" onClick={handleLoadDemoResults} style={{ padding: "0.5rem 1rem", fontWeight: 600, background: "var(--accent, #0071e3)", color: "#fff", border: "none" }}>
            Load demonstration results
          </button>
        )}
        {scenarioMode === "custom-local" && resultsVisible === "configured-only" && (
          <div className="chart-card" style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: "var(--muted, #888)" }}>
            Execution is unavailable in this static build. Connect the future backend to run this exact invocation.
          </div>
        )}
      </div>

      {/* ═══ Results Area (Phase 4 & 5) ═══ */}
      {resultsVisible === "demo" && scenario && (
        <div style={{ marginTop: "1rem" }}>
          <ExecutiveSummaryCard scenario={scenario} enabledOps={enabledOps} simulators={selectedSimulators} />
          <ModelLineageCard scenario={scenario} activeModelId={selectedModelForPreview} onSelect={setSelectedModelForPreview} />
          <SimulatorComparisonCard scenario={scenario} modelId={candidateModelId ?? scenario.defaultCandidateModelId} simulators={selectedSimulators} domains={selectedDomains as never} referenceSimulator={referenceSimulator} />
          <ModelComparisonCard scenario={scenario} baselineId={baselineModelId} candidateId={candidateModelId} simulators={selectedSimulators} />
          <DomainOverlayCard scenario={scenario} baselineModelId={baselineModelId} candidateModelId={candidateModelId} simulators={selectedSimulators} domains={selectedDomains as never} />
          <ProcessedModelCard scenario={scenario} modelId={selectedModelForPreview ?? candidateModelId ?? scenario.defaultCandidateModelId} baselineModelId={baselineModelId} />
          <OperationResults scenario={scenario} enabledOps={enabledOps} />
          <ArtifactTableCard scenario={scenario} />
        </div>
      )}

      {resultsVisible === "configured-only" && scenarioMode === "custom-local" && (
        <div className="chart-card" style={{ marginTop: "1rem", textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Configured, not executed</p>
          <p className="hint">Your workflow configuration is complete. Execution requires the future backend.</p>
        </div>
      )}

      {/* ═══ Legacy Benchmark Browser ≡ always available ═══ */}
      <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-light, #e5e5e5)", paddingTop: "1rem" }}>
        <h2 style={{ fontSize: "0.9rem", color: "var(--muted, #888)", marginBottom: "0.5rem" }}>Legacy Benchmark Results Browser</h2>
        <LegacyBenchmarkExplorer />
      </div>
    </div>
  );
}
