/* ==================================================================
 *  ModelComparisonCard (goal2.md §6 / goal3.md)
 *
 *  Multi-model cross comparison: filter by simulators, domains,
 *  and models, then display all selected models side-by-side per
 *  metric plot, with horizontal scrolling when needed.
 * ================================================================== */

import { useState, useMemo, useCallback } from "react";
import type { WorkflowScenario, SimulatorId, AnalysisDomain } from "../../compat/spiceWorkflow/contracts";
import { resolveMultiModelPlots } from "../../data/benchmarkWorkspace/selectors";
import type { MultiModelPlotGroup, ResolvedBenchmarkPlot } from "../../data/benchmarkWorkspace/selectors";
import { DataOriginBadge } from "./shared/DataOriginBadge";
import { BenchmarkPlotLightbox } from "./BenchmarkPlotLightbox";

const SIMULATOR_ORDER: SimulatorId[] = ["ngspice", "spectre", "hspice"];
const DOMAIN_ORDER: AnalysisDomain[] = ["dc", "transient", "ac", "noise"];

interface Props {
  scenario: WorkflowScenario;
}

/** Extract selectable models from scenario (nontemporary, persistent). */
function useSelectableModels(scenario: WorkflowScenario) {
  return useMemo(() => {
    return Object.values(scenario.models)
      .filter((m) => !m.temporary)
      .sort((a, b) => {
        // Input model first, then by variant order
        if (a.variant === "input") return -1;
        if (b.variant === "input") return 1;
        return (a.variant).localeCompare(b.variant);
      });
  }, [scenario]);
}

export function ModelComparisonCard({ scenario }: Props) {
  const [selectedSimulators, setSelectedSimulators] = useState<SimulatorId[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<AnalysisDomain[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectableModels = useSelectableModels(scenario);

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

  // Toggle a model ID in/out
  const toggleModel = useCallback((mid: string) => {
    setSelectedModels((prev) => prev.includes(mid) ? prev.filter((m) => m !== mid) : [...prev, mid]);
  }, []);

  const groups = useMemo(() => {
    if (!hasSelection) return [];
    return resolveMultiModelPlots(scenario, selectedModels, selectedSimulators, selectedDomains);
  }, [scenario, selectedModels, selectedSimulators, selectedDomains, hasSelection]);

  // Flatten all valid plots for lightbox
  const lightboxPlots = useMemo(() => {
    const plots: ResolvedBenchmarkPlot[] = [];
    for (const g of groups) {
      for (const p of g.plots.values()) {
        if (p) plots.push(p);
      }
    }
    return plots;
  }, [groups]);

  // Grouped: domain → comparisonKey → simulator → group
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
        Compare benchmark plots across multiple models. Filter by simulators, categories, and models below.
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

        <fieldset style={{ flex: "1 1 260px", minWidth: "220px" }}>
          <legend>Models</legend>
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
                {selectableModels.length === 0 && (
                  <div className="bmw-multi-select-empty">No models available</div>
                )}
                {selectableModels.map((m) => (
                  <label key={m.modelId} className="bmw-multi-select-option">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(m.modelId)}
                      onChange={() => toggleModel(m.modelId)}
                    />
                    <span className="bmw-multi-select-label">
                      <strong>{m.displayName}</strong>
                      <span className="bmw-multi-select-sub">{m.variant}</span>
                    </span>
                  </label>
                ))}
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
          No plot data available for the selected combination. Try different simulators, categories, or models.
        </div>
      )}

      {/* Plots: domain → comparisonKey → simulator → horizontal row of model plots */}
      {hasSelection && groups.length > 0 && (
        <div>
          {DOMAIN_ORDER.map((domain) => {
            const compMap = grouped.get(domain);
            if (!compMap || compMap.size === 0) return null;

            return (
              <section key={domain} className="bmw-model-domain-section">
                <header>{domain.toUpperCase()}</header>

                {Array.from(compMap.entries()).map(([compKey, simMap]) => {
                  return Array.from(simMap.entries()).map(([simulator, group]) => (
                    <div key={`${domain}|${compKey}|${simulator}`} className="bmw-model-metric-block">
                      <div className="bmw-model-metric-header">
                        <span className="bmw-model-metric-sim">{simulator}</span>
                        <span className="bmw-model-metric-title">{group.title}</span>
                      </div>
                      <div className="bmw-model-scroll-row">
                        {selectedModels.map((mid) => {
                          const plot = group.plots.get(mid) ?? null;
                          const model = scenario.models[mid];
                          return (
                            <MultiModelPlotPanel
                              key={mid}
                              plot={plot}
                              modelName={model?.displayName ?? mid}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ));
                })}
              </section>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPlots.length > 0 && (
        <BenchmarkPlotLightbox plots={lightboxPlots} />
      )}
    </div>
  );
}

/* ─── Single model plot panel ─── */

function MultiModelPlotPanel({ plot, modelName }: { plot: ResolvedBenchmarkPlot | null; modelName: string }) {
  if (!plot) {
    return (
      <figure className="bmw-model-plot-panel bmw-model-plot-panel--multi">
        <figcaption>{modelName}</figcaption>
        <div className="bmw-model-plot-unavailable">No plot</div>
      </figure>
    );
  }

  return (
    <figure className="bmw-model-plot-panel bmw-model-plot-panel--multi">
      <figcaption>
        {modelName}
        <DataOriginBadge origin={plot.provenance.origin} />
      </figcaption>
      <img
        src={plot.displayUrl}
        alt={`${modelName} — ${plot.simulator} — ${plot.domain} — ${plot.title}`}
        loading="lazy"
        data-lightbox-id={plot.artifactId}
      />
    </figure>
  );
}
