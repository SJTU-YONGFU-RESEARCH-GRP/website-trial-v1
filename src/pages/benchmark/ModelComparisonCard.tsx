import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { WorkflowScenario } from "../../compat/spiceWorkflow/contracts";
import { formatMB, formatMs } from "../../compat/spiceWorkflow/formatters";
import {
  loadBenchmarkRuns,
  type LoadedBenchmarkRuns,
} from "../../data/benchmarkWorkspace/dataLoader";
import { ReportViewerCard } from "./ReportViewerCard";
import { StatusBadge } from "./shared/StatusBadge";

interface Props {
  scenario: WorkflowScenario;
}

function formatOperationChain(chain: string | undefined): string {
  if (!chain) return "Input";
  const toolNames: Record<string, string> = {
    convert: "Translation",
    translate: "Translation",
    translation: "Translation",
    translator: "Translation",
    calibrate: "Fitting",
    calibreate: "Fitting",
    fitting: "Fitting",
    reduce: "Reduction",
    reduction: "Reduction",
    expand: "Expansion",
    expansion: "Expansion",
  };
  return chain
    .split("→")
    .map((part) => {
      const trimmed = part.trim();
      return toolNames[trimmed.toLowerCase()] ?? trimmed;
    })
    .join(" → ");
}

function formatReportTime(value: string | undefined): string {
  if (!value) return "Not available";
  return value.replace(/\.\d+$/, "");
}

function selectableRuns(scenario: WorkflowScenario) {
  return Object.values(scenario.models)
    .filter((model) => !model.temporary)
    .sort((a, b) => {
    const pdkOrder = (a.pdkSource ?? "").localeCompare(b.pdkSource ?? "");
    if (pdkOrder !== 0) return pdkOrder;
    const typeOrder = (a.deviceType ?? "unknown").localeCompare(b.deviceType ?? "unknown");
    if (typeOrder !== 0) return typeOrder;
    const chainOrder = (a.operationChain ?? "").localeCompare(b.operationChain ?? "");
    if (chainOrder !== 0) return chainOrder;
    return a.dialect.localeCompare(b.dialect);
  });
}

function mergeLoadedRuns(
  scenario: WorkflowScenario,
  loaded: LoadedBenchmarkRuns,
): WorkflowScenario {
  return {
    ...scenario,
    benchmarkResults: loaded.benchmarkResults,
    artifacts: loaded.artifacts,
    reports: loaded.reports,
    manifests: loaded.manifests,
  };
}

export function ModelComparisonCard({ scenario }: Props) {
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<LoadedBenchmarkRuns | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    let cancelled = false;
    if (selectedRunIds.length === 0) {
      setLoaded(null);
      setLoadError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setLoadError(null);
    loadBenchmarkRuns(selectedRunIds)
      .then((value) => {
        if (!cancelled) setLoaded(value);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoaded(null);
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRunIds]);

  const selectableModels = useMemo(() => selectableRuns(scenario), [scenario]);
  const comparisonScenario = useMemo(
    () => loaded ? mergeLoadedRuns(scenario, loaded) : scenario,
    [loaded, scenario],
  );

  const toggleModel = useCallback((runModelId: string) => {
    setSelectedRunIds((previous) =>
      previous.includes(runModelId)
        ? previous.filter((value) => value !== runModelId)
        : [...previous, runModelId],
    );
  }, []);

  const clearAll = useCallback(() => setSelectedRunIds([]), []);
  const hasModels = selectedRunIds.length > 0;

  return (
    <div className="chart-card" id="model-comparison" style={{ marginTop: "0.85rem" }}>
      <h2>Cross-Model Comparison</h2>
      <p className="hint">
        Select the exact model and simulator runs to compare. REPORT files are loaded only
        after selection.
      </p>

      <div className="bmw-cm-filters" style={{ marginBottom: "0.75rem" }}>
        <fieldset style={{ flex: "1 1 100%", minWidth: "260px" }}>
          <legend>Model–simulator results ({selectableModels.length} available)</legend>
          <div className="bmw-multi-select" ref={dropdownRef}>
            <button
              className="bmw-multi-select-trigger"
              onClick={() => setDropdownOpen((open) => !open)}
              onMouseDown={(event) => event.preventDefault()}
            >
              {selectedRunIds.length === 0
                ? "Select results…"
                : `${selectedRunIds.length} result${selectedRunIds.length > 1 ? "s" : ""} selected`}
              <span className="bmw-multi-select-arrow">{dropdownOpen ? "▲" : "▼"}</span>
            </button>
            {dropdownOpen && (
              <div className="bmw-multi-select-dropdown" onMouseDown={(event) => event.preventDefault()}>
                {selectableModels.map((model) => {
                  const manifest = scenario.manifests?.[model.modelId];
                  return (
                    <label key={model.modelId} className="bmw-multi-select-option">
                      <input
                        type="checkbox"
                        checked={selectedRunIds.includes(model.modelId)}
                        onChange={() => toggleModel(model.modelId)}
                      />
                      <span className="bmw-multi-select-label">
                        <span className="bmw-multi-select-sub" style={{
                          fontFamily: "monospace",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "var(--text-primary, #222)",
                          textTransform: "uppercase",
                          wordBreak: "break-all",
                        }}>
                          UID: {model.checksum ?? "N/A"}
                        </span>
                        <span className="bmw-multi-select-sub" style={{
                          fontFamily: "monospace",
                          fontSize: "0.64rem",
                          fontWeight: 600,
                          color: "var(--text-secondary, #555)",
                        }}>
                          Report: {formatReportTime(manifest?.reportGeneratedAt)}
                        </span>
                        <span className="bmw-multi-select-sub">
                          {formatOperationChain(model.operationChain)}
                        </span>
                        <span className="bmw-multi-select-sub" style={{ fontSize: "0.65rem", color: "var(--muted, #999)" }}>
                          {model.pdkSource} · {model.deviceType?.toUpperCase()} · {model.dialect}
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

      {!hasModels && (
        <div className="bmw-model-empty-state">
          Select at least one model–simulator result to compare.
        </div>
      )}

      {loading && (
        <div className="bmw-model-empty-state">
          Loading selected manifests and reports…
        </div>
      )}

      {loadError && (
        <div className="benchmark-error">
          Failed to load selected benchmark results: {loadError}
        </div>
      )}

      {loaded && !loading && (
        <>
          <div className="bmw-artifact-table-shell" style={{ marginTop: "0.75rem" }}>
            <h3 className="flow-subsection-title">Selected benchmark runs</h3>
            <table>
              <thead>
                <tr>
                  <th>Model MD5</th>
                  <th>Simulator</th>
                  <th>Status</th>
                  <th>Simulator version</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th>Wall time</th>
                  <th>Peak RSS</th>
                  <th>Report generated</th>
                </tr>
              </thead>
              <tbody>
                {loaded.runModelIds.map((runModelId) => {
                  const manifest = loaded.manifests[runModelId];
                  if (!manifest) return null;
                  const [md5, simulator] = runModelId.split("|");
                  return (
                    <tr key={runModelId}>
                      <td style={{ fontFamily: "monospace" }}>{md5}</td>
                      <td>{simulator}</td>
                      <td><StatusBadge status={manifest.status ?? "unavailable"} /></td>
                      <td>{manifest.simulatorVersion ?? "Not available"}</td>
                      <td>{manifest.benchmarkStartedAt ?? "Not available"}</td>
                      <td>{manifest.benchmarkEndedAt ?? "Not available"}</td>
                      <td>{formatMs(manifest.wallTimeMs ?? null)}</td>
                      <td>{formatMB(manifest.peakRssMB ?? null)}</td>
                      <td>{formatReportTime(manifest.reportGeneratedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ReportViewerCard
            scenario={comparisonScenario}
            selectedModels={loaded.runModelIds}
          />
        </>
      )}
    </div>
  );
}
