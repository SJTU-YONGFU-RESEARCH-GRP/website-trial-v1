/* ==================================================================
 *  ArtifactTableCard (goal3.md §6)
 *  Default no selection. Checkbox fieldset filters. Centered table.
 *  Metadata table replaces loose text.
 * ================================================================== */

import { useState, useMemo } from "react";
import type { WorkflowScenario, ToolId, DataOrigin } from "../../compat/spiceWorkflow/contracts";
import { DataOriginBadge } from "./shared/DataOriginBadge";
import { formatBytes } from "../../compat/spiceWorkflow/formatters";
import "../../benchmark-workspace.css";

interface Props { scenario: WorkflowScenario }

const TOOLS: ToolId[] = ["translator", "reduction", "expansion", "fitting", "benchmark"];
const ORIGINS: DataOrigin[] = ["existing-tool-output", "derived-static-demo", "synthetic-demo", "user-local", "unavailable"];

export function ArtifactTableCard({ scenario }: Props) {
  const [selectedTools, setSelectedTools] = useState<ToolId[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<DataOrigin[]>([]);

  const allArtifacts = useMemo(() => Object.values(scenario.artifacts), [scenario]);

  const filtered = useMemo(() => {
    if (selectedTools.length === 0 && selectedOrigins.length === 0) return [];
    return allArtifacts.filter((a) => {
      if (selectedTools.length > 0 && !selectedTools.includes(a.toolId)) return false;
      if (selectedOrigins.length > 0 && !selectedOrigins.includes(a.provenance.origin)) return false;
      return true;
    });
  }, [allArtifacts, selectedTools, selectedOrigins]);

  const hasFilter = selectedTools.length > 0 || selectedOrigins.length > 0;

  const toggleTool = (t: ToolId) => setSelectedTools((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const toggleOrigin = (o: DataOrigin) => setSelectedOrigins((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]);
  const selectAll = () => {
    setSelectedTools([...TOOLS]);
    setSelectedOrigins([...ORIGINS]);
  };

  return (
    <div className="chart-card" id="artifacts" style={{ marginTop: "1rem" }}>
      <h2 style={{ textAlign: "center" }}>Artifacts &amp; Reproducibility</h2>

      {/* Filters */}
      <div className="bmw-cm-filters" style={{ justifyContent: "center" }}>
        <fieldset>
          <legend>Tool</legend>
          {TOOLS.map((t) => (
            <label key={t}><input type="checkbox" checked={selectedTools.includes(t)} onChange={() => toggleTool(t)} />{t.charAt(0).toUpperCase() + t.slice(1)}</label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Data Origin</legend>
          {ORIGINS.map((o) => (
            <label key={o}><input type="checkbox" checked={selectedOrigins.includes(o)} onChange={() => toggleOrigin(o)} />{o.replace(/-/g, " ")}</label>
          ))}
        </fieldset>

        <button className="benchmark-btn" onClick={selectAll} style={{ fontSize: "0.72rem", alignSelf: "flex-end" }}>Select all</button>
      </div>

      {/* Empty state */}
      {!hasFilter && (
        <div className="bmw-model-empty-state">
          Select at least one tool and one data origin to inspect artifacts.
        </div>
      )}

      {/* Table */}
      {hasFilter && filtered.length > 0 && (
        <div className="bmw-artifact-table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Tool</th><th>Kind</th><th>Format</th><th>Size</th><th>Origin</th><th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.artifactId}>
                  <td style={{ textAlign: "left", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.name}>{a.name}</td>
                  <td style={{ textAlign: "left" }}>{a.toolId}</td>
                  <td style={{ textAlign: "left" }}>{a.kind}</td>
                  <td style={{ textAlign: "left" }}>{a.format}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{a.sizeBytes !== null ? formatBytes(a.sizeBytes) : "—"}</td>
                  <td><DataOriginBadge origin={a.provenance.origin} /></td>
                  <td style={{ textAlign: "left" }}>{a.visibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasFilter && filtered.length === 0 && (
        <div className="bmw-model-empty-state">
          No artifacts match the selected filters.
        </div>
      )}

      {/* Metadata table */}
      <div className="bmw-artifact-table-shell" style={{ marginTop: "1rem" }}>
        <h3 className="flow-subsection-title" style={{ textAlign: "center" }}>Reproducibility</h3>
        <table className="bmw-metadata-table">
          <tbody>
            <tr><td>Schema version</td><td>{scenario.schemaVersion}</td></tr>
            <tr><td>Result set</td><td>{scenario.scenarioId}</td></tr>
            <tr><td>Source commit</td><td>{scenario.provenance.sourceCommit ?? "Not available"}</td></tr>
            <tr><td>Generated at</td><td>{scenario.provenance.generatedAt ?? "Not available"}</td></tr>
            <tr><td>Models</td><td>{Object.keys(scenario.models).length}</td></tr>
            <tr><td>Benchmark results</td><td>{scenario.benchmarkResults.length}</td></tr>
            <tr><td>Data origin</td><td>{scenario.provenance.origin}</td></tr>
            <tr><td>Adapter version</td><td>{scenario.provenance.adapterVersion ?? "1.0.0"}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
