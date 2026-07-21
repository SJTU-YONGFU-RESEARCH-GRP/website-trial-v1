/* ==================================================================
 *  ModelComparisonCard (goal2.md §6)
 *  Dual checkbox filters + original benchmark plot pairs.
 * ================================================================== */

import { useState, useMemo, useCallback } from "react";
import type { WorkflowScenario, SimulatorId, AnalysisDomain } from "../../compat/spiceWorkflow/contracts";
import { resolveBenchmarkPlotPairs } from "../../data/benchmarkWorkspace/selectors";
import type { BenchmarkPlotPair, ResolvedBenchmarkPlot } from "../../data/benchmarkWorkspace/selectors";
import { DataOriginBadge } from "./shared/DataOriginBadge";
import { BenchmarkPlotLightbox } from "./BenchmarkPlotLightbox";

const SIMULATOR_ORDER: SimulatorId[] = ["ngspice", "spectre", "hspice"];
const DOMAIN_ORDER: AnalysisDomain[] = ["dc", "transient", "ac", "noise"];

interface Props {
  scenario: WorkflowScenario;
  baselineId: string | null;
  candidateId: string | null;
}

export function ModelComparisonCard({ scenario, baselineId, candidateId }: Props) {
  const [selectedSimulators, setSelectedSimulators] = useState<SimulatorId[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<AnalysisDomain[]>([]);

  const toggleSim = useCallback((sim: SimulatorId) => {
    setSelectedSimulators((prev) => prev.includes(sim) ? prev.filter((s) => s !== sim) : [...prev, sim]);
  }, []);
  const toggleDomain = useCallback((dom: AnalysisDomain) => {
    setSelectedDomains((prev) => prev.includes(dom) ? prev.filter((d) => d !== dom) : [...prev, dom]);
  }, []);
  const clearAll = useCallback(() => {
    setSelectedSimulators([]);
    setSelectedDomains([]);
  }, []);

  const pairs = useMemo(() => {
    if (selectedSimulators.length === 0 || selectedDomains.length === 0) return [];
    return resolveBenchmarkPlotPairs(scenario, baselineId, candidateId, selectedSimulators, selectedDomains);
  }, [scenario, baselineId, candidateId, selectedSimulators, selectedDomains]);

  // Flatten all valid displayUrls for lightbox
  const lightboxPlots = useMemo(() => {
    const plots: ResolvedBenchmarkPlot[] = [];
    for (const p of pairs) {
      if (p.baseline) plots.push(p.baseline);
      if (p.candidate) plots.push(p.candidate);
    }
    return plots;
  }, [pairs]);

  const hasSelection = selectedSimulators.length > 0 && selectedDomains.length > 0;

  // Group pairs by domain → simulator
  const grouped = useMemo(() => {
    const map = new Map<AnalysisDomain, Map<SimulatorId, BenchmarkPlotPair[]>>();
    for (const d of DOMAIN_ORDER) {
      if (!selectedDomains.includes(d)) continue;
      map.set(d, new Map());
    }
    for (const p of pairs) {
      const dom = map.get(p.domain);
      if (!dom) continue;
      const sim = dom.get(p.simulator);
      if (sim) sim.push(p);
      else dom.set(p.simulator, [p]);
    }
    return map;
  }, [pairs, selectedDomains]);

  return (
    <div className="chart-card" id="model-comparison" style={{ marginTop: "0.85rem" }}>
      <h2>Cross-Model Comparison</h2>
      <p className="hint" style={{ marginBottom: "0.5rem" }}>
        Compare original benchmark plots between baseline and processed model. Select simulators and categories below.
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

        {hasSelection && (
          <button className="benchmark-btn" onClick={clearAll} style={{ fontSize: "0.65rem", alignSelf: "flex-end" }}>
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {!hasSelection && (
        <div className="bmw-model-empty-state">
          Select at least one simulator and one benchmark category to compare original plots.
        </div>
      )}

      {/* Plot pairs grouped by domain → simulator */}
      {hasSelection && pairs.length === 0 && (
        <div className="bmw-model-empty-state">
          No plot data available for the selected combination. Try different simulators or categories.
        </div>
      )}

      {hasSelection && pairs.length > 0 && (
        <div>
          {DOMAIN_ORDER.map((domain) => {
            const simMap = grouped.get(domain);
            if (!simMap || simMap.size === 0) return null;

            return (
              <section key={domain} className="bmw-model-domain-section">
                <header>{domain.toUpperCase()}</header>

                {SIMULATOR_ORDER.map((simulator) => {
                  const simPairs = simMap.get(simulator);
                  if (!simPairs || simPairs.length === 0) return null;

                  return (
                    <section key={simulator} className="bmw-model-simulator-section">
                      <header>{simulator}</header>

                      {simPairs.map((pair) => (
                        <PlotPairRow key={`${simulator}|${domain}|${pair.comparisonKey}`} pair={pair} />
                      ))}
                    </section>
                  );
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

/* ─── Plot Pair Row ─── */

function PlotPairRow({ pair }: { pair: BenchmarkPlotPair }) {
  return (
    <div className="bmw-model-plot-pair">
      <PlotPanel plot={pair.baseline} role="Original Model" plotTitle={pair.title} />
      <PlotPanel plot={pair.candidate} role="Processed Model" plotTitle={pair.title} />
    </div>
  );
}

function PlotPanel({ plot, role, plotTitle }: { plot: ResolvedBenchmarkPlot | null; role: string; plotTitle: string }) {
  if (!plot) {
    return (
      <figure className="bmw-model-plot-panel">
        <figcaption>{role}</figcaption>
        <div className="bmw-model-plot-unavailable">
          Plot unavailable in current static dataset
        </div>
      </figure>
    );
  }

  return (
    <figure className="bmw-model-plot-panel">
      <figcaption>
        {role}
        <DataOriginBadge origin={plot.provenance.origin} />
      </figcaption>
      <img
        src={plot.displayUrl}
        alt={`${role} — ${plot.modelId} — ${plot.simulator} — ${plot.domain} — ${plotTitle}`}
        loading="lazy"
        data-lightbox-id={plot.artifactId}
      />
      <div className="bmw-plot-title">{plotTitle}</div>
    </figure>
  );
}
