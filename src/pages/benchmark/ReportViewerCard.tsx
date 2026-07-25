/* ==================================================================
 *  ReportViewerCard — v2
 *
 *  Hierarchical REPORT.md display with:
 *  - Embedded plot images at appropriate subsections
 *  - Multi-model comparison: multiple status columns per test
 *  - Multi-model key findings shown side-by-side
 * ================================================================== */

import { useState, useMemo } from "react";
import type {
  ReportStructure,
  ReportSection,
  ReportSubSection,
  ReportEntry,
  ReportStatus,
} from "../../compat/spiceWorkflow/contracts";
import type { WorkflowScenario } from "../../compat/spiceWorkflow/contracts";

/* ─── Status formatting ─── */

const STATUS_CONFIG: Record<ReportStatus, { symbol: string; cls: string }> = {
  pass: { symbol: "✓", cls: "rv-status-pass" },
  fail: { symbol: "✗", cls: "rv-status-fail" },
  "in-progress": { symbol: "○", cls: "rv-status-progress" },
  unavailable: { symbol: "—", cls: "rv-status-unavail" },
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unavailable;
  return <span className={`rv-status-badge ${cfg.cls}`}>{cfg.symbol}</span>;
}

/* ─── Multi-Model Entry Table ─── */

function MultiModelEntryTable({
  entries,
  modelIds,
  reportMap,
  scenario,
}: {
  entries: ReportEntry[];
  modelIds: string[];
  reportMap: Map<string, ReportStructure>;
  scenario: WorkflowScenario;
}) {
  if (!entries || entries.length === 0) return null;
  const baselineModel = modelIds[0];

  return (
    <table className="rv-entry-table">
      <thead>
        <tr>
          <th style={{ width: "30%" }}>Test Type</th>
          {modelIds.map((mid) => {
            const model = scenario.models[mid];
            return (
              <th key={mid} style={{ width: `${60 / modelIds.length}%`, textAlign: "center" }}>
                {model?.displayName ?? mid}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => {
          // Find the corresponding entry in other models' reports
          const otherEntries = new Map<string, ReportEntry>();
          for (const mid of modelIds) {
            if (mid === baselineModel) continue;
            const report = reportMap.get(mid);
            if (!report) continue;
            // Try to find matching entry by traversing the same section structure
            const found = findMatchingEntry(report, e);
            if (found) otherEntries.set(mid, found);
          }

          return (
            <tr key={i}>
              <td className="rv-entry-test">{e.testType}</td>
              <td style={{ textAlign: "center" }}>
                <StatusBadge status={e.status} />
                {e.keyFindings && (
                  <div className="rv-finding-text">{e.keyFindings}</div>
                )}
              </td>
              {modelIds.slice(1).map((mid) => {
                const oe = otherEntries.get(mid);
                return (
                  <td key={mid} style={{ textAlign: "center" }}>
                    {oe ? (
                      <>
                        <StatusBadge status={oe.status} />
                        {oe.keyFindings && (
                          <div className="rv-finding-text">{oe.keyFindings}</div>
                        )}
                      </>
                    ) : (
                      <span className="rv-na">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Find matching entry in another report by traversing same structure paths */
function findMatchingEntry(report: ReportStructure, target: ReportEntry): ReportEntry | null {
  // Search in simulationSetup
  for (const e of report.simulationSetup) {
    if (e.testType === target.testType) return e;
  }
  // Search in summary sections
  for (const entries of Object.values(report.summary)) {
    for (const e of entries) {
      if (e.testType === target.testType) return e;
    }
  }
  // Search in sections
  for (const section of report.sections) {
    if (section.entries) {
      for (const e of section.entries) {
        if (e.testType === target.testType) return e;
      }
    }
    for (const sub of section.subsections) {
      for (const e of sub.entries) {
        if (e.testType === target.testType) return e;
        if (e.children) {
          for (const child of e.children) {
            if (child.testType === target.testType) return child;
          }
        }
      }
    }
  }
  return null;
}

/* ─── Entry Table (single model) ─── */

function EntryTable({ entries }: { entries: ReportEntry[] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <table className="rv-entry-table">
      <thead>
        <tr>
          <th style={{ width: "40%" }}>Test Type</th>
          <th style={{ width: "8%", textAlign: "center" }}>Status</th>
          <th style={{ width: "52%" }}>Key Findings</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i}>
            <td className="rv-entry-test">{e.testType}</td>
            <td className="rv-entry-status" style={{ textAlign: "center" }}>
              <StatusBadge status={e.status} />
            </td>
            <td className="rv-entry-findings">
              {e.keyFindings ?? <span className="rv-na">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── SubSection ─── */

function SubSectionView({
  sub,
  defaultOpen,
  modelIds,
  reportMap,
  scenario,
  baseImgUrl,
}: {
  sub: ReportSubSection;
  defaultOpen: boolean;
  modelIds: string[];
  reportMap: Map<string, ReportStructure>;
  scenario: WorkflowScenario;
  baseImgUrl: (modelId: string, plotName: string) => string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasMulti = modelIds.length > 1;

  return (
    <div className="rv-subsection">
      <div className="rv-subsection-header" onClick={() => setOpen((o) => !o)}>
        <span className="rv-caret">{open ? "▼" : "▶"}</span>
        <h4>{sub.title}</h4>
        <span className="rv-entry-count">{sub.entries.length} tests</span>
      </div>
      {open && (
        <div className="rv-subsection-body">
          {hasMulti ? (
            <MultiModelEntryTable entries={sub.entries} modelIds={modelIds} reportMap={reportMap} scenario={scenario} />
          ) : (
            <EntryTable entries={sub.entries} />
          )}

          {/* Embedded plot images */}
          {sub.plots && sub.plots.length > 0 && (
            <div className="rv-plot-embed">
              {sub.plots.map((plotName, pi) => (
                <div key={pi} className="rv-plot-embed-item">
                  <div className="rv-plot-embed-label">{plotName}</div>
                  <div className="rv-plot-embed-row">
                    {modelIds.map((mid) => {
                      const model = scenario.models[mid];
                      const url = baseImgUrl(mid, plotName);
                      return (
                        <figure key={mid} className="rv-plot-embed-fig">
                          <img
                            src={url}
                            alt={`${model?.displayName ?? mid} — ${plotName}`}
                            loading="lazy"
                            style={{ cursor: "zoom-in" }}
                            onClick={(e) => {
                              const img = e.target as HTMLImageElement;
                              const overlay = document.createElement("div");
                              overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;";
                              const clone = document.createElement("img");
                              clone.src = img.src;
                              clone.style.cssText = "max-width:95vw;max-height:95vh;object-fit:contain;";
                              overlay.appendChild(clone);
                              overlay.onclick = () => overlay.remove();
                              document.body.appendChild(overlay);
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("rv-hidden");
                            }}
                          />
                          <div className="rv-plot-unavailable rv-hidden">Image not available</div>
                          <figcaption>{model?.displayName ?? mid}</figcaption>
                        </figure>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Section ─── */

function SectionView({
  sect,
  defaultOpen,
  modelIds,
  reportMap,
  scenario,
  baseImgUrl,
}: {
  sect: ReportSection;
  defaultOpen: boolean;
  modelIds: string[];
  reportMap: Map<string, ReportStructure>;
  scenario: WorkflowScenario;
  baseImgUrl: (modelId: string, plotName: string) => string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const totalTests =
    (sect.entries?.length ?? 0) +
    sect.subsections.reduce((sum, s) => sum + s.entries.length, 0);

  return (
    <div className="rv-section">
      <div className="rv-section-header" onClick={() => setOpen((o) => !o)}>
        <span className="rv-caret rv-caret--lg">{open ? "▼" : "▶"}</span>
        <h3>{sect.title}</h3>
        <span className="rv-entry-count">{totalTests} tests · {sect.subsections.length} sub-sections</span>
      </div>
      {open && (
        <div className="rv-section-body">
          {sect.entries && sect.entries.length > 0 && (
            <EntryTable entries={sect.entries} />
          )}
          {sect.subsections.map((sub, i) => (
            <SubSectionView
              key={i}
              sub={sub}
              defaultOpen={false}
              modelIds={modelIds}
              reportMap={reportMap}
              scenario={scenario}
              baseImgUrl={baseImgUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Metric Deltas ─── */

function MetricDeltaTable({
  scenario,
  selectedModels,
}: {
  scenario: WorkflowScenario;
  selectedModels: string[];
}) {
  const metricKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const mid of selectedModels) {
      for (const br of scenario.benchmarkResults) {
        if (br.modelId === mid) {
          for (const k of Object.keys(br.keyMetrics)) {
            if (k !== "data_points") keys.add(k);
          }
        }
      }
    }
    return Array.from(keys).sort();
  }, [scenario, selectedModels]);

  if (selectedModels.length < 2 || metricKeys.length === 0) return null;

  const baseline = selectedModels[0];
  const baselineModel = scenario.models[baseline];

  const modelMetrics = new Map<string, Map<string, number | null>>();
  for (const mid of selectedModels) {
    const mm = new Map<string, number | null>();
    for (const br of scenario.benchmarkResults) {
      if (br.modelId === mid) {
        for (const [k, v] of Object.entries(br.keyMetrics)) {
          if (typeof v === "number") mm.set(k, v);
        }
      }
    }
    modelMetrics.set(mid, mm);
  }

  function formatDelta(baselineVal: number | null, candVal: number | null): string {
    if (baselineVal === null || candVal === null || baselineVal === 0) return "—";
    const delta = ((candVal - baselineVal) / Math.abs(baselineVal)) * 100;
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toPrecision(3)}%`;
  }

  function formatValue(v: number | null): string {
    if (v === null) return "—";
    if (Math.abs(v) < 1e-3 || Math.abs(v) > 1e6) return v.toExponential(3);
    return v.toPrecision(6);
  }

  return (
    <div className="rv-metric-deltas">
      <h4>📊 Metric Deltas (Δ vs {baselineModel?.displayName ?? baseline})</h4>
      <div className="rv-verdict-scroll">
        {metricKeys.map((metric) => (
          <div key={metric} style={{ marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.2rem", color: "var(--text-secondary, #555)" }}>
              {metric}
            </div>
            <table className="rv-entry-table" style={{ fontSize: "0.7rem" }}>
              <thead>
                <tr>
                  {selectedModels.map((mid) => (
                    <th key={mid} style={{ textAlign: "center" }}>
                      {scenario.models[mid]?.displayName ?? mid}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {selectedModels.map((mid, i) => {
                    const val = modelMetrics.get(mid)?.get(metric) ?? null;
                    const baselineVal = modelMetrics.get(baseline)?.get(metric) ?? null;
                    const delta = i > 0 ? formatDelta(baselineVal, val) : undefined;
                    return (
                      <td key={mid} className="rv-verdict-cell" style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                        {formatValue(val)}
                        {delta && (
                          <span style={{ display: "block", fontSize: "0.62rem", color: "var(--accent, #0071e3)", marginTop: "1px" }}>
                            Δ {delta}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════ */
/*  Main Component                                                     */
/* ═════════════════════════════════════════════════════════════════ */

interface Props {
  scenario: WorkflowScenario;
  selectedModels: string[];
}

/** Parse modelId like "c48102d18af9084f|ngspice" into {md5, sim} */
function parseModelId(modelId: string): { md5: string; sim: string } {
  const parts = modelId.split("|");
  return { md5: parts[0] ?? modelId, sim: parts[1] ?? "ngspice" };
}

export function ReportViewerCard({ scenario, selectedModels }: Props) {
  const [expandedSetup, setExpandedSetup] = useState(true);
  const [expandedSummary, setExpandedSummary] = useState(true);

  const { report, reportMap } = useMemo(() => {
    const map = new Map<string, ReportStructure>();
    let primary: { modelId: string; report: ReportStructure } | null = null;
    for (const mid of selectedModels) {
      const { md5, sim } = parseModelId(mid);
      const key = `${md5}|${sim}`;
      const rpt = scenario.reports?.[key];
      if (rpt) {
        map.set(mid, rpt);
        if (!primary) primary = { modelId: mid, report: rpt };
      }
    }
    return { report: primary?.report ?? null, reportMap: map };
  }, [scenario, selectedModels]);

  // Image URL builder — modelId is `${md5}|${sim}`, we need the md5 part for the path
  const baseImgUrl = (modelId: string, plotName: string): string => {
    const { md5, sim } = parseModelId(modelId);
    return `${import.meta.env.BASE_URL || "/"}data/spice-benchmark/${md5}/${sim}/plots/${plotName}`;
  };

  if (selectedModels.length === 0 || !report) {
    return (
      <div className="chart-card" id="report-viewer" style={{ marginTop: "0.85rem" }}>
        <h2>Benchmark Verification Report &amp; Comparison</h2>
        <p className="hint">Select at least one model to view its benchmark verification report.</p>
      </div>
    );
  }

  return (
    <div className="chart-card" id="report-viewer" style={{ marginTop: "0.85rem" }}>
      <h2>Benchmark Verification Report &amp; Comparison</h2>

      {/* Selected model tags */}
      <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
        {selectedModels.map((mid) => {
          const model = scenario.models[mid];
          return (
            <span key={mid} style={{
              display: "inline-block", padding: "0.15rem 0.5rem",
              background: mid === selectedModels[0] ? "var(--accent, #0071e3)" : "var(--bg-secondary, #e5e5ea)",
              color: mid === selectedModels[0] ? "#fff" : "var(--text-primary, #333)",
              borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600,
            }}>
              {model?.displayName ?? mid}
            </span>
          );
        })}
      </div>

      {/* 1. Simulation Setup */}
      <div className="rv-section">
        <div className="rv-section-header" onClick={() => setExpandedSetup((o) => !o)}>
          <span className="rv-caret rv-caret--lg">{expandedSetup ? "▼" : "▶"}</span>
          <h3>1. Simulation Setup and Execution</h3>
          <span className="rv-entry-count">{report.simulationSetup.length} checks</span>
        </div>
        {expandedSetup && (
          <div className="rv-section-body">
            {selectedModels.length > 1 ? (
              <MultiModelEntryTable
                entries={report.simulationSetup}
                modelIds={selectedModels}
                reportMap={reportMap}
                scenario={scenario}
              />
            ) : (
              <EntryTable entries={report.simulationSetup} />
            )}
          </div>
        )}
      </div>

      {/* 2. Summary */}
      <div className="rv-section">
        <div className="rv-section-header" onClick={() => setExpandedSummary((o) => !o)}>
          <span className="rv-caret rv-caret--lg">{expandedSummary ? "▼" : "▶"}</span>
          <h3>2. Summary</h3>
        </div>
        {expandedSummary && (
          <div className="rv-section-body">
            {(["dc", "transient", "ac", "noise"] as const).map((domain) => {
              const entries = report.summary[domain];
              const labels: Record<string, string> = {
                dc: "DC Analysis Summary",
                transient: "Transient Analysis Summary",
                ac: "AC Analysis Summary",
                noise: "Noise Analysis Summary",
              };
              return (
                <div key={domain} className="rv-subsection">
                  <h4 style={{ fontSize: "0.85rem", margin: "0.5rem 0 0.3rem" }}>{labels[domain]}</h4>
                  {selectedModels.length > 1 ? (
                    <MultiModelEntryTable
                      entries={entries}
                      modelIds={selectedModels}
                      reportMap={reportMap}
                      scenario={scenario}
                    />
                  ) : (
                    <EntryTable entries={entries} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3-9. Analysis Sections */}
      {report.sections.map((sect, i) => (
        <SectionView
          key={i}
          sect={sect}
          defaultOpen={false}
          modelIds={selectedModels}
          reportMap={reportMap}
          scenario={scenario}
          baseImgUrl={baseImgUrl}
        />
      ))}

      {/* Metric Deltas */}
      <MetricDeltaTable
        scenario={scenario}
        selectedModels={selectedModels}
      />
    </div>
  );
}
