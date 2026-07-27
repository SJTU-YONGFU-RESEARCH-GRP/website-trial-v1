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
  ReportPlot,
  ReportTable,
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

function numericValues(text: string): number[] {
  return Array.from(text.matchAll(/(?<![A-Za-z0-9_])[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g))
    .map((match) => Number(match[0]))
    .filter(Number.isFinite);
}

function deltaText(value: number, baseline: number): string {
  const delta = value - baseline;
  if (delta === 0) return baseline === 0 ? "Δ 0" : "Δ 0%";
  if (baseline === 0) return `Δ ${delta.toPrecision(3)}`;
  const percent = (delta / Math.abs(baseline)) * 100;
  return `Δ ${percent > 0 ? "+" : ""}${percent.toPrecision(3)}%`;
}

function metricLines(value: string): string[] {
  return value
    .split(/,\s+(?=[A-Za-zΑ-Ωα-ω])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function NumericDeltas({ value, baseline }: { value: string; baseline?: string }) {
  if (!baseline) return null;
  const values = numericValues(value);
  const baselines = numericValues(baseline);
  if (values.length === 0 || values.length !== baselines.length) return null;
  return (
    <span style={{ color: "var(--accent, #0071e3)", fontSize: "0.62rem", marginLeft: "0.3rem" }}>
      （{values.map((number, index) => deltaText(number, baselines[index])).join(" · ")}）
    </span>
  );
}

function EntryFinding({
  entry,
  baseline,
}: {
  entry: ReportEntry;
  baseline?: ReportEntry;
}) {
  if (entry.details && entry.details.length > 0) {
    const baselineDetails = baseline?.details ?? [];
    return (
      <div className="rv-finding-text">
        {entry.details.map((detail, index) => (
          <div key={detail.lineNumber} style={{ paddingLeft: `${Math.max(0, detail.depth - 2) * 0.55}rem` }}>
            {detail.text}
            <NumericDeltas value={detail.text} baseline={baselineDetails[index]?.text} />
          </div>
        ))}
      </div>
    );
  }
  return entry.keyFindings
    ? (
      <div className="rv-finding-text">
        {metricLines(entry.keyFindings).map((line, index) => {
          const baselineLine = baseline?.keyFindings
            ? metricLines(baseline.keyFindings)[index]
            : undefined;
          return (
            <div key={`${line}-${index}`}>
              {line}
              <NumericDeltas value={line} baseline={baselineLine} />
            </div>
          );
        })}
      </div>
    )
    : null;
}

interface EntryScope {
  setup?: boolean;
  summaryKey?: keyof ReportStructure["summary"];
  sectionTitle?: string;
  subsectionTitle?: string;
}

/* ─── Multi-Model Entry Table ─── */

function MultiModelEntryTable({
  entries,
  modelIds,
  reportMap,
  scenario,
  scope,
}: {
  entries: ReportEntry[];
  modelIds: string[];
  reportMap: Map<string, ReportStructure>;
  scenario: WorkflowScenario;
  scope?: EntryScope;
}) {
  if (!entries || entries.length === 0) return null;
  const baselineModel = modelIds[0];

  return (
    <div className="rv-table-scroll">
      <table
        className="rv-entry-table"
        style={{ minWidth: `${Math.max(720, 260 + modelIds.length * 180)}px` }}
      >
        <thead>
          <tr>
            <th style={{ width: "260px" }}>Test Type</th>
            {modelIds.map((mid) => {
              const model = scenario.models[mid];
              return (
                <th key={mid} style={{ minWidth: "180px", textAlign: "center" }}>
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
              const found = findMatchingEntry(report, e, scope);
              if (found) otherEntries.set(mid, found);
            }

            return (
              <tr key={i}>
                <td className="rv-entry-test">{e.testType}</td>
                <td style={{ textAlign: "center" }}>
                  <StatusBadge status={e.status} />
                  <EntryFinding entry={e} />
                </td>
                {modelIds.slice(1).map((mid) => {
                  const oe = otherEntries.get(mid);
                  return (
                    <td key={mid} style={{ textAlign: "center" }}>
                      {oe ? (
                        <>
                          <StatusBadge status={oe.status} />
                          <EntryFinding entry={oe} baseline={e} />
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
    </div>
  );
}

/** Find matching entry in another report by traversing same structure paths */
function findMatchingEntry(
  report: ReportStructure,
  target: ReportEntry,
  scope?: EntryScope,
): ReportEntry | null {
  if (scope?.setup) {
    return report.simulationSetup.find((entry) => entry.testType === target.testType) ?? null;
  }
  if (scope?.summaryKey) {
    return report.summary[scope.summaryKey].find((entry) => entry.testType === target.testType) ?? null;
  }
  if (scope?.sectionTitle && scope.subsectionTitle) {
    const section = report.sections.find((candidate) => candidate.title === scope.sectionTitle);
    const subsection = section?.subsections.find(
      (candidate) => candidate.title === scope.subsectionTitle,
    );
    return subsection?.entries.find((entry) => entry.testType === target.testType) ?? null;
  }
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
              <EntryFinding entry={e} />
              {!e.keyFindings && (!e.details || e.details.length === 0) && <span className="rv-na">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MarkdownTableView({ table }: { table: ReportTable }) {
  return (
    <div className="rv-table-scroll">
      <table className="rv-entry-table">
        <thead>
          <tr>{table.headers.map((header, index) => <th key={index}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function findSubsection(
  report: ReportStructure,
  sectionTitle: string,
  subsectionTitle: string,
): ReportSubSection | null {
  return report.sections
    .find((section) => section.title === sectionTitle)
    ?.subsections.find((subsection) => subsection.title === subsectionTitle) ?? null;
}

function samePlot(left: ReportPlot, right: ReportPlot): boolean {
  const leftName = left.src.split("/").pop();
  const rightName = right.src.split("/").pop();
  return left.src === right.src || leftName === rightName || (left.alt !== "" && left.alt === right.alt);
}

function openImageOverlay(image: HTMLImageElement) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;";
  const clone = document.createElement("img");
  clone.src = image.src;
  clone.style.cssText = "max-width:95vw;max-height:95vh;object-fit:contain;";
  overlay.appendChild(clone);
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

/* ─── SubSection ─── */

function SubSectionView({
  sub,
  defaultOpen,
  modelIds,
  reportMap,
  scenario,
  baseImgUrl,
  sectionTitle,
}: {
  sub: ReportSubSection;
  defaultOpen: boolean;
  modelIds: string[];
  reportMap: Map<string, ReportStructure>;
  scenario: WorkflowScenario;
  baseImgUrl: (modelId: string, plotPath: string) => string;
  sectionTitle: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasMulti = modelIds.length > 1;
  const orderedContent = useMemo(() => {
    const content: Array<
      | { kind: "entries"; entries: ReportEntry[] }
      | { kind: "paragraph"; text: string }
      | { kind: "image"; plot: ReportPlot }
      | { kind: "table"; table: ReportTable }
    > = [];
    let pendingEntries: ReportEntry[] = [];
    const flushEntries = () => {
      if (pendingEntries.length > 0) content.push({ kind: "entries", entries: pendingEntries });
      pendingEntries = [];
    };
    const blocks = sub.blocks ?? [];
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      if (block.kind === "check" && block.entry) {
        pendingEntries.push(block.entry);
      } else if (block.kind === "paragraph" && block.text) {
        flushEntries();
        const nextContentBlock = blocks.slice(blockIndex + 1).find((candidate) => candidate.kind !== "blank");
        const isImageCaption = nextContentBlock?.kind === "image"
          && nextContentBlock.plot?.caption === block.text;
        if (!isImageCaption) content.push({ kind: "paragraph", text: block.text });
      } else if (block.kind === "image" && block.plot) {
        flushEntries();
        content.push({ kind: "image", plot: block.plot });
      } else if (block.kind === "table" && block.table) {
        flushEntries();
        content.push({ kind: "table", table: block.table });
      }
    }
    flushEntries();
    return content;
  }, [sub]);

  return (
    <div className="rv-subsection">
      <div className="rv-subsection-header" onClick={() => setOpen((o) => !o)}>
        <span className="rv-caret">{open ? "▼" : "▶"}</span>
        <h4>{sub.title}</h4>
        <span className="rv-entry-count">{sub.entries.length} tests</span>
      </div>
      {open && (
        <div className="rv-subsection-body">
          {(orderedContent.length > 0
            ? orderedContent
            : [{ kind: "entries" as const, entries: sub.entries }]
          ).map((item, itemIndex) => {
            if (item.kind === "entries") {
              return hasMulti ? (
                <MultiModelEntryTable
                  key={itemIndex}
                  entries={item.entries}
                  modelIds={modelIds}
                  reportMap={reportMap}
                  scenario={scenario}
                  scope={{ sectionTitle, subsectionTitle: sub.title }}
                />
              ) : <EntryTable key={itemIndex} entries={item.entries} />;
            }
            if (item.kind === "paragraph") {
              return <p key={itemIndex} className="rv-plot-embed-label">{item.text}</p>;
            }
            if (item.kind === "table") {
              return (
                <div key={itemIndex} className="rv-plot-embed-row">
                  {modelIds.map((mid) => {
                    const otherReport = reportMap.get(mid);
                    const otherSub = otherReport
                      ? findSubsection(otherReport, sectionTitle, sub.title)
                      : null;
                    const matching = otherSub?.tables?.find(
                      (table) => table.headers.join("|") === item.table.headers.join("|"),
                    );
                    return (
                      <div key={mid} className="rv-plot-embed-fig">
                        <strong>{scenario.models[mid]?.displayName ?? mid}</strong>
                        {matching ? <MarkdownTableView table={matching} /> : <span className="rv-na">—</span>}
                      </div>
                    );
                  })}
                </div>
              );
            }
            return (
              <div key={itemIndex} className="rv-plot-embed">
                <div className="rv-plot-embed-item">
                  <div className="rv-plot-embed-label">{item.plot.caption ?? item.plot.alt}</div>
                  <div className="rv-plot-embed-row">
                    {modelIds.map((mid) => {
                      const model = scenario.models[mid];
                      const otherReport = reportMap.get(mid);
                      const otherSub = otherReport
                        ? findSubsection(otherReport, sectionTitle, sub.title)
                        : null;
                      const plot = otherSub?.plotDetails?.find((candidate) => samePlot(candidate, item.plot));
                      if (!plot) {
                        return <div key={mid} className="rv-plot-unavailable">Image not available</div>;
                      }
                      const url = baseImgUrl(mid, plot.src);
                      return (
                        <figure key={mid} className="rv-plot-embed-fig rv-plot-image-fig">
                          <img
                            src={url}
                            alt={`${model?.displayName ?? mid} — ${plot.alt}`}
                            loading="lazy"
                            style={{ cursor: "zoom-in" }}
                            onClick={(event) => openImageOverlay(event.target as HTMLImageElement)}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RunIntegrityTable({
  modelIds,
  reportMap,
  scenario,
}: {
  modelIds: string[];
  reportMap: Map<string, ReportStructure>;
  scenario: WorkflowScenario;
}) {
  const fields = Array.from(new Set(
    modelIds.flatMap((modelId) => Object.keys(reportMap.get(modelId)?.runIntegrity ?? {})),
  ));
  if (fields.length === 0) return null;
  return (
    <div className="rv-table-scroll">
      <table className="rv-entry-table">
        <thead>
          <tr>
            <th>Run field</th>
            {modelIds.map((modelId) => (
              <th key={modelId}>{scenario.models[modelId]?.displayName ?? modelId}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field}>
              <td className="rv-entry-test">{field}</td>
              {modelIds.map((modelId) => (
                <td key={modelId}>{reportMap.get(modelId)?.runIntegrity[field] ?? "—"}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="rv-entry-test">Integrity notes</td>
            {modelIds.map((modelId) => (
              <td key={modelId}>
                {(reportMap.get(modelId)?.runIntegrityNotes ?? []).map((note, index) => (
                  <div key={index}>{note}</div>
                ))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
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
  baseImgUrl: (modelId: string, plotPath: string) => string;
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
          {sect.title === "Run Integrity" && (
            <RunIntegrityTable modelIds={modelIds} reportMap={reportMap} scenario={scenario} />
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
              sectionTitle={sect.title}
            />
          ))}
        </div>
      )}
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

  // Plot paths are kept exactly as REPORT.md wrote them and are report-directory relative.
  const baseImgUrl = (modelId: string, plotPath: string): string => {
    const { md5, sim } = parseModelId(modelId);
    const safePath = plotPath.replace(/^\.?\//, "");
    return `${import.meta.env.BASE_URL || "/"}data/spice-model-benchmark/${md5}/${sim}/${safePath}`;
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

      {/* Simulation Setup */}
      <div className="rv-section">
        <div className="rv-section-header" onClick={() => setExpandedSetup((o) => !o)}>
          <span className="rv-caret rv-caret--lg">{expandedSetup ? "▼" : "▶"}</span>
          <h3>Simulation Setup and Execution</h3>
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
                scope={{ setup: true }}
              />
            ) : (
              <EntryTable entries={report.simulationSetup} />
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="rv-section">
        <div className="rv-section-header" onClick={() => setExpandedSummary((o) => !o)}>
          <span className="rv-caret rv-caret--lg">{expandedSummary ? "▼" : "▶"}</span>
          <h3>Summary</h3>
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
                      scope={{ summaryKey: domain }}
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

    </div>
  );
}
