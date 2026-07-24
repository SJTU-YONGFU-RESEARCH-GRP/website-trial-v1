/* ==================================================================
 *  ModelComparisonCard
 *
 *  Multi-model cross comparison: Simulators + Benchmark Categories
 *  are filters (optional). Selecting models alone triggers comparison.
 *  Status verdict grid shown below plot rows.
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

function useSelectableModels(scenario: WorkflowScenario) {
  return useMemo(() => {
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
        const aIsInput = a.variant === "input";
        const bIsInput = b.variant === "input";
        if (aIsInput && !bIsInput) return -1;
        if (!aIsInput && bIsInput) return 1;
        const aType = a.deviceType ?? "nmos";
        const bType = b.deviceType ?? "nmos";
        if (aType !== bType) return aType === "nmos" ? -1 : 1;
        return (a.variant).localeCompare(b.variant);
      });

    return { models, statusIdx };
  }, [scenario]);
}

function shortUid(checksum: string | null): string {
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

  // Effective simulators/domains: if none selected, use all available
  const effectiveSims = useMemo(() => {
    if (selectedSimulators.length > 0) return selectedSimulators;
    // When nothing selected, show all simulators that have data for selected models
    const sims = new Set<SimulatorId>();
    for (const mid of selectedModels) {
      const m = statusIdx.get(mid);
      if (m) for (const s of m.keys()) sims.add(s as SimulatorId);
    }
    if (sims.size === 0) return SIMULATOR_ORDER;
    return SIMULATOR_ORDER.filter((s) => sims.has(s));
  }, [selectedSimulators, selectedModels, statusIdx]);

  const effectiveDomains = useMemo(() => {
    if (selectedDomains.length > 0) return selectedDomains;
    const doms = new Set<AnalysisDomain>();
    for (const mid of selectedModels) {
      const m = statusIdx.get(mid);
      if (m) for (const s of m.values()) for (const d of s.keys()) doms.add(d as AnalysisDomain);
    }
    if (doms.size === 0) return DOMAIN_ORDER;
    return DOMAIN_ORDER.filter((d) => doms.has(d));
  }, [selectedDomains, selectedModels, statusIdx]);

  // Filter models that match selected simulators + domains
  const filteredModels = useMemo(() => {
    if (selectedSimulators.length === 0 && selectedDomains.length === 0) return selectableModels;
    return selectableModels.filter((m) => {
      const sims = statusIdx.get(m.modelId);
      if (!sims) return selectedSimulators.length === 0;
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

  const hasModels = selectedModels.length > 0;

  const toggleModel = useCallback((mid: string) => {
    setSelectedModels((prev) => prev.includes(mid) ? prev.filter((m) => m !== mid) : [...prev, mid]);
  }, []);

  const groups = useMemo(() => {
    if (!hasModels) return [];
    return resolveMultiModelPlots(scenario, selectedModels, effectiveSims, effectiveDomains);
  }, [scenario, selectedModels, effectiveSims, effectiveDomains, hasModels]);

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
    for (const d of effectiveDomains) {
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
  }, [groups, effectiveDomains]);

  // Build verdict grid: domain → (modelId + simulator) → status
  const verdictGrid = useMemo(() => {
    if (!hasModels || selectedModels.length < 2) return null;
    const grid = new Map<AnalysisDomain, { modelId: string; simulator: SimulatorId; status: string; chain: string; metrics: Record<string, number | string | null> }[]>();
    for (const dom of effectiveDomains) {
      const rows: { modelId: string; simulator: SimulatorId; status: string; chain: string; metrics: Record<string, number | string | null> }[] = [];
      for (const mid of selectedModels) {
        const model = scenario.models[mid];
        const chain = model?.operationChain ?? model?.variant ?? mid;
        for (const sim of effectiveSims) {
          const status = statusIdx.get(mid)?.get(sim)?.get(dom) ?? "unavailable";
          // Find matching benchmark result for metrics
          const br = scenario.benchmarkResults.find(
            (r) => r.modelId === mid && r.simulator === sim && r.domain === dom
          );
          rows.push({ modelId: mid, simulator: sim, status, chain, metrics: br?.keyMetrics ?? {} });
        }
      }
      grid.set(dom, rows);
    }
    return grid;
  }, [hasModels, selectedModels, effectiveDomains, effectiveSims, statusIdx, scenario.models, scenario.benchmarkResults]);

  // Compute metric deltas: for each domain+sim, compare metric values across models
  const metricDeltas = useMemo(() => {
    if (!verdictGrid || selectedModels.length < 2) return null;
    const deltas: { domain: AnalysisDomain; metric: string; rows: { modelId: string; simulator: SimulatorId; value: number | string | null; delta?: string }[] }[] = [];
    for (const [dom, rows] of verdictGrid) {
      // Collect all metric keys for this domain
      const metricKeys = new Set<string>();
      for (const r of rows) {
        for (const k of Object.keys(r.metrics)) {
          if (k !== "data_points") metricKeys.add(k);
        }
      }
      for (const metric of metricKeys) {
        const baselineVal = rows[0]?.metrics[metric];
        const metricRows = rows.map((r) => {
          const val = r.metrics[metric];
          let delta: string | undefined;
          if (typeof baselineVal === "number" && typeof val === "number" && baselineVal !== 0) {
            const pct = ((Math.abs(val - baselineVal)) / Math.abs(baselineVal)) * 100;
            delta = pct < 0.01 ? "<0.01%" : `${pct.toFixed(2)}%`;
          }
          return { modelId: r.modelId, simulator: r.simulator, value: val ?? "—", delta };
        });
        deltas.push({ domain: dom, metric, rows: metricRows });
      }
    }
    return deltas;
  }, [verdictGrid, selectedModels]);

  return (
    <div className="chart-card" id="model-comparison" style={{ marginTop: "0.85rem" }}>
      <h2>Cross-Model Comparison</h2>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Select models to compare. Simulators and Benchmark Categories are optional filters.
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
                        {m.operationChain ?? m.variant}  ·  UID: {shortUid(m.checksum)}
                      </span>
                    </span>
                  </label>
                  );
                })}
              </div>
            )}
          </div>
        </fieldset>

        {hasModels && (
          <button className="benchmark-btn" onClick={clearAll} style={{ fontSize: "0.65rem", alignSelf: "flex-end" }}>
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {!hasModels && (
        <div className="bmw-model-empty-state">
          Select at least one model to compare benchmark plots.
        </div>
      )}

      {hasModels && groups.length === 0 && (
        <div className="bmw-model-empty-state">
          No plot data available for the selected combination.
        </div>
      )}

      {/* Plots */}
      {hasModels && groups.length > 0 && (
        <div>
          {effectiveDomains.map((domain) => {
            const compMap = grouped.get(domain);
            if (!compMap || compMap.size === 0) return null;

            return (
              <section key={domain} className="bmw-model-domain-section">
                <header>{domain.toUpperCase()}</header>

                {Array.from(compMap.entries()).map(([compKey, simMap]) => {
                  const cells: {
                    modelId: string; simulator: SimulatorId;
                    plot: ResolvedBenchmarkPlot | null;
                  }[] = [];
                  for (const mid of selectedModels) {
                    for (const sim of effectiveSims) {
                      const group = simMap.get(sim);
                      const plot = group?.plots.get(mid) ?? null;
                      cells.push({ modelId: mid, simulator: sim, plot });
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
                        {cells.map(({ modelId, simulator, plot }) => {
                          const model = scenario.models[modelId];
                          const chain = model?.operationChain ?? model?.variant ?? modelId;
                          const label = `${chain} (${simulator})`;
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

      {/* Verdict Grid: domain × (model+simulator) status matrix */}
      {hasModels && selectedModels.length >= 2 && verdictGrid && (
        <div className="bmw-verdict-section">
          <h3>Benchmark Verdict</h3>
          <p className="hint">
            Pass/fail status per domain, plus key metric values and deltas (Δ) relative to the first selected model.
          </p>
          <div className="bmw-verdict-scroll">
            <table className="bmw-verdict-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  {selectedModels.map((mid) => {
                    const model = scenario.models[mid];
                    const chain = model?.operationChain ?? model?.variant ?? mid;
                    return effectiveSims.map((sim) => (
                      <th key={`${mid}|${sim}`}>{chain}<br/><small>{sim}</small></th>
                    ));
                  })}
                </tr>
              </thead>
              <tbody>
                {effectiveDomains.map((dom) => (
                  <tr key={dom}>
                    <td className="bmw-verdict-domain">{dom.toUpperCase()}</td>
                    {selectedModels.map((mid) =>
                      effectiveSims.map((sim) => {
                        const status = statusIdx.get(mid)?.get(sim)?.get(dom) ?? "unavailable";
                        const st = STATUS_LABEL[status] ?? STATUS_LABEL.unavailable;
                        // Get metric values for tooltip/display
                        const br = scenario.benchmarkResults.find(
                          (r) => r.modelId === mid && r.simulator === sim && r.domain === dom
                        );
                        const ionVal = br?.keyMetrics?.ion;
                        const ionStr = typeof ionVal === "number" ? (ionVal < 0.01 ? ionVal.toExponential(2) : ionVal.toFixed(4)) : "";
                        return (
                          <td key={`${mid}|${sim}|${dom}`} className={`bmw-verdict-cell ${st.cls}`} title={ionStr ? `Ion: ${ionStr} A` : ""}>
                            <span className="bmw-verdict-status">{st.text}</span>
                            {ionStr && <span className="bmw-verdict-ion">{ionStr}</span>}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Metric Delta Table */}
          {metricDeltas && metricDeltas.length > 0 && (
            <details style={{ marginTop: "0.75rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                📊 Metric Deltas (Δ vs first model)
              </summary>
              <div className="bmw-verdict-scroll" style={{ marginTop: "0.5rem" }}>
                {metricDeltas.map(({ domain, metric, rows: mrows }) => (
                  <div key={`${domain}|${metric}`} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.2rem", color: "var(--text-secondary, #555)" }}>
                      {domain.toUpperCase()} — {metric}
                    </div>
                    <table className="bmw-verdict-table" style={{ fontSize: "0.7rem" }}>
                      <thead>
                        <tr>
                          {mrows.map((mr) => (
                            <th key={`${mr.modelId}|${mr.simulator}`}>
                              {scenario.models[mr.modelId]?.displayName ?? mr.modelId}<br/><small>{mr.simulator}</small>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {mrows.map((mr, i) => (
                            <td key={i} className="bmw-verdict-cell" style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                              {typeof mr.value === "number" ? (mr.value < 0.01 ? mr.value.toExponential(2) : mr.value.toPrecision(4)) : String(mr.value)}
                              {mr.delta && i > 0 && (
                                <span style={{ display: "block", fontSize: "0.62rem", color: "var(--accent, #0071e3)", marginTop: "1px" }}>
                                  Δ {mr.delta}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {lightboxPlots.length > 0 && (
        <BenchmarkPlotLightbox plots={lightboxPlots} />
      )}
    </div>
  );
}
