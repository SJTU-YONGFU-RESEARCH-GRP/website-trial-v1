/* ==================================================================
 *  ModelComparisonCard
 *
 *  Multi-model cross comparison with metadata-rich model selector,
 *  benchmark status badges, and horizontal-scroll plot rows.
 * ================================================================== */

import { useState, useMemo, useCallback } from "react";
import type { WorkflowScenario, SimulatorId, AnalysisDomain, ModelArtifact } from "../../compat/spiceWorkflow/contracts";
import { resolveMultiModelPlots } from "../../data/benchmarkWorkspace/selectors";
import type { MultiModelPlotGroup, ResolvedBenchmarkPlot } from "../../data/benchmarkWorkspace/selectors";
import { DataOriginBadge } from "./shared/DataOriginBadge";
import { BenchmarkPlotLightbox } from "./BenchmarkPlotLightbox";

const SIMULATOR_ORDER: SimulatorId[] = ["ngspice", "spectre", "hspice"];
const DOMAIN_ORDER: AnalysisDomain[] = ["dc", "transient", "ac", "noise"];

interface Props {
  scenario: WorkflowScenario;
}

/** Extract selectable models, enriched with benchmark-status lookup. */
function useSelectableModels(scenario: WorkflowScenario) {
  return useMemo(() => {
    // Build status index: modelId → simulator → domain → status
    const statusIdx = new Map<string, Map<string, Map<string, string>>>();
    for (const r of scenario.benchmarkResults) {
      const m = statusIdx.get(r.modelId) ?? new Map();
      const s = m.get(r.simulator) ?? new Map();
      s.set(r.domain, r.status);
      m.set(r.simulator, s);
      statusIdx.set(r.modelId, m);
    }

    const models = Object.values(scenario.models)
      .filter((m) => !m.temporary)
      .sort((a, b) => {
        // Input models first, then NMOS before PMOS, then by variant
        const aIsInput = a.variant === "input";
        const bIsInput = b.variant === "input";
        if (aIsInput && !bIsInput) return -1;
        if (!aIsInput && bIsInput) return 1;
        // Within same input status, NMOS before PMOS
        const aType = a.deviceType ?? "nmos";
        const bType = b.deviceType ?? "nmos";
        if (aType !== bType) return aType === "nmos" ? -1 : 1;
        return (a.variant).localeCompare(b.variant);
      });

    return { models, statusIdx };
  }, [scenario]);
}

/** Shorten an MD5 checksum for display. */
function shortMd5(checksum: string | null): string {
  if (!checksum || checksum.length < 8) return checksum ?? "N/A";
  return checksum.slice(0, 8);
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pass: { text: "✓", cls: "bmw-status-pass" },
  fail: { text: "✗", cls: "bmw-status-fail" },
  partial: { text: "⚠", cls: "bmw-status-partial" },
  unavailable: { text: "—", cls: "bmw-status-unavailable" },
};

export function ModelComparisonCard({ scenario }: Props) {
  const [selectedSimulators, setSelectedSimulators] = useState<SimulatorId[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<AnalysisDomain[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { models: selectableModels, statusIdx } = useSelectableModels(scenario);

  // Filter models that match selected simulators + domains
  const filteredModels = useMemo(() => {
    if (selectedSimulators.length === 0 && selectedDomains.length === 0) return selectableModels;
    return selectableModels.filter((m) => {
      const sims = statusIdx.get(m.modelId);
      if (!sims) return selectedSimulators.length === 0; // show if no sim filter
      for (const [sim, domains] of sims) {
        if (selectedSimulators.length > 0 && !selectedSimulators.includes(sim as SimulatorId)) continue;
        for (const dom of domains.keys()) {
          if (selectedDomains.length === 0 || selectedDomains.includes(dom as AnalysisDomain)) return true;
        }
      }
      return false;
    });
  }, [selectableModels, statusIdx, selectedSimulators, selectedDomains]);

  const toggleSim = useCallback((sim: SimulatorId) => {
    setSelectedSimulators((prev) => prev.includes(sim) ? prev.filter((s) => s !== sim) : [...prev, sim]);
  }, []);
  const toggleDomain = useCallback((dom: AnalysisDomain) => {
    setSelectedDomains((prev) => prev.includes(dom) ? prev.filter((d) => d !== dom) : [...prev, dom]);
  }, []);
  const clearAll = useCallback(() => {
    setSelectedSimulators([]);
    setSelectedDomains([]);
    setSelectedModels([]);
  }, []);

  const hasSelection = selectedSimulators.length > 0 && selectedDomains.length > 0 && selectedModels.length > 0;

  const toggleModel = useCallback((mid: string) => {
    setSelectedModels((prev) => prev.includes(mid) ? prev.filter((m) => m !== mid) : [...prev, mid]);
  }, []);

  const groups = useMemo(() => {
    if (!hasSelection) return [];
    return resolveMultiModelPlots(scenario, selectedModels, selectedSimulators, selectedDomains);
  }, [scenario, selectedModels, selectedSimulators, selectedDomains, hasSelection]);

  const lightboxPlots = useMemo(() => {
    const plots: ResolvedBenchmarkPlot[] = [];
    for (const g of groups) {
      for (const p of g.plots.values()) {
        if (p) plots.push(p);
      }
    }
    return plots;
  }, [groups]);

  const grouped = useMemo(() => {
    const map = new Map<AnalysisDomain, Map<string, Map<SimulatorId, MultiModelPlotGroup>>>();
    for (const d of DOMAIN_ORDER) {
      if (!selectedDomains.includes(d)) continue;
      map.set(d, new Map());
    }
    for (const g of groups) {
      const dom = map.get(g.domain);
      if (!dom) continue;
      const comp = dom.get(g.comparisonKey);
      if (comp) comp.set(g.simulator, g);
      else dom.set(g.comparisonKey, new Map([[g.simulator, g]]));
    }
    return map;
  }, [groups, selectedDomains]);

  return (
    <div className="chart-card" id="model-comparison" style={{ marginTop: "0.85rem" }}>
      <h2>Cross-Model Comparison</h2>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Compare benchmark plots across multiple models. Select filters below — models with matching data appear.
      </p>

      {/* Filters */}
      <div className="bmw-cm-filters">
        <fieldset>
          <legend>Simulators</legend>
          {SIMULATOR_ORDER.map((sim) => (
            <label key={sim}>
              <input type="checkbox" checked={selectedSimulators.includes(sim)} onChange={() => toggleSim(sim)} />
              {sim}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Benchmark Categories</legend>
          {DOMAIN_ORDER.map((dom) => (
            <label key={dom}>
              <input type="checkbox" checked={selectedDomains.includes(dom)} onChange={() => toggleDomain(dom)} />
              {dom.toUpperCase()}
            </label>
          ))}
        </fieldset>

        <fieldset style={{ flex: "1 1 320px", minWidth: "260px" }}>
          <legend>Models ({filteredModels.length} available)</legend>
          <div className="bmw-multi-select">
            <button
              className="bmw-multi-select-trigger"
              onClick={() => setDropdownOpen((o) => !o)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            >
              {selectedModels.length === 0
                ? "Select models…"
                : `${selectedModels.length} model${selectedModels.length > 1 ? "s" : ""} selected`}
              <span className="bmw-multi-select-arrow">{dropdownOpen ? "▲" : "▼"}</span>
            </button>
            {dropdownOpen && (
              <div className="bmw-multi-select-dropdown">
                {filteredModels.length === 0 && (
                  <div className="bmw-multi-select-empty">No models match selected filters</div>
                )}
                {filteredModels.map((m) => {
                  const modelType = `${m.modelFamily ?? "MOSFET"} ${(m.deviceType ?? "nmos").toUpperCase()}`;
                  const pdk = m.pdkSource ? ` · ${m.pdkSource}` : "";
                  return (
                  <label key={m.modelId} className="bmw-multi-select-option">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(m.modelId)}
                      onChange={() => toggleModel(m.modelId)}
                    />
                    <span className="bmw-multi-select-label">
                      <strong>{modelType}{pdk}</strong>
                      <span className="bmw-multi-select-sub">
                        {m.operationChain ?? m.variant}  ·  UniqueID: {shortMd5(m.checksum)}
                      </span>
                    </span>
                  </label>
                  );
                })}
              </div>
            )}
          </div>
        </fieldset>

        {hasSelection && (
          <button className="benchmark-btn" onClick={clearAll} style={{ fontSize: "0.65rem", alignSelf: "flex-end" }}>
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {!hasSelection && (
        <div className="bmw-model-empty-state">
          Select at least one simulator, one benchmark category, and one model to compare plots.
        </div>
      )}

      {hasSelection && groups.length === 0 && (
        <div className="bmw-model-empty-state">
          No plot data available for the selected combination.
        </div>
      )}

      {/* Plots: domain → comparisonKey → single row with status badges */}
      {hasSelection && groups.length > 0 && (
        <div>
          {DOMAIN_ORDER.map((domain) => {
            const compMap = grouped.get(domain);
            if (!compMap || compMap.size === 0) return null;

            return (
              <section key={domain} className="bmw-model-domain-section">
                <header>{domain.toUpperCase()}</header>

                {Array.from(compMap.entries()).map(([compKey, simMap]) => {
                  const cells: {
                    modelId: string; simulator: SimulatorId;
                    plot: ResolvedBenchmarkPlot | null; status: string;
                  }[] = [];
                  for (const mid of selectedModels) {
                    for (const sim of SIMULATOR_ORDER) {
                      if (!selectedSimulators.includes(sim)) continue;
                      const group = simMap.get(sim);
                      const plot = group?.plots.get(mid) ?? null;
                      const status = statusIdx.get(mid)?.get(sim)?.get(domain) ?? "unavailable";
                      cells.push({ modelId: mid, simulator: sim, plot, status });
                    }
                  }

                  const anyGroup = simMap.values().next().value;
                  const title = anyGroup?.title ?? compKey;

                  return (
                    <div key={`${domain}|${compKey}`} className="bmw-model-metric-block">
                      <div className="bmw-model-metric-header">
                        <span className="bmw-model-metric-title">{title}</span>
                      </div>
                      <div className="bmw-model-scroll-row">
                        {cells.map(({ modelId, simulator, plot, status }) => {
                          const model = scenario.models[modelId];
                          const chain = model?.operationChain ?? model?.variant ?? modelId;
                          const label = `${chain} (${simulator})`;
                          const st = STATUS_LABEL[status] ?? STATUS_LABEL.unavailable;
                          return (
                            <figure
                              key={`${modelId}|${simulator}`}
                              className="bmw-model-plot-panel bmw-model-plot-panel--multi"
                            >
                              <figcaption>
                                {label}
                                <DataOriginBadge origin={plot?.provenance.origin ?? "unavailable"} />
                              </figcaption>
                              {plot ? (
                                <img
                                  src={plot.displayUrl}
                                  alt={`${label} — ${simulator} — ${domain} — ${title}`}
                                  loading="lazy"
                                  data-lightbox-id={plot.artifactId}
                                />
                              ) : (
                                <div className="bmw-model-plot-unavailable">No plot</div>
                              )}
                              <div className={`bmw-plot-status ${st.cls}`}>
                                {st.text}
                              </div>
                            </figure>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}

      {lightboxPlots.length > 0 && (
        <BenchmarkPlotLightbox plots={lightboxPlots} />
      )}
    </div>
  );
}
