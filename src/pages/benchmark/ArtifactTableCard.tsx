/* ==================================================================
 *  ArtifactTableCard (goal.md §16)
 * ================================================================== */

import { useState, useMemo } from "react";
import type { WorkflowScenario } from "../../compat/spiceWorkflow/contracts";
import { DataOriginBadge } from "./shared/DataOriginBadge";
import { formatBytes } from "../../compat/spiceWorkflow/formatters";

interface Props { scenario: WorkflowScenario }

export function ArtifactTableCard({ scenario }: Props) {
  const [filterTool, setFilterTool] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");

  const allArtifacts = useMemo(() => Object.values(scenario.artifacts), [scenario]);

  const filtered = useMemo(() => {
    return allArtifacts.filter((a) => {
      if (filterTool !== "all" && a.toolId !== filterTool) return false;
      if (filterOrigin !== "all" && a.provenance.origin !== filterOrigin) return false;
      return true;
    });
  }, [allArtifacts, filterTool, filterOrigin]);

  const tools = useMemo(() => [...new Set(allArtifacts.map((a) => a.toolId))], [allArtifacts]);
  const origins = useMemo(() => [...new Set(allArtifacts.map((a) => a.provenance.origin))], [allArtifacts]);

  return (
    <div className="chart-card" id="artifacts" style={{ marginTop: "0.85rem" }}>
      <h2>Artifacts &amp; Reproducibility</h2>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <label style={{ fontSize: "0.75rem" }}>
          Tool:{" "}
          <select value={filterTool} onChange={(e) => setFilterTool(e.target.value)}>
            <option value="all">All</option>
            {tools.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "0.75rem" }}>
          Origin:{" "}
          <select value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value)}>
            <option value="all">All</option>
            {origins.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.7rem" }}>
          <thead>
            <tr>
              <th>Name</th><th>Tool</th><th>Kind</th><th>Format</th><th>Size</th><th>Origin</th><th>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.artifactId}>
                <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.name}>{a.name}</td>
                <td><span className="tr-badge tr-badge--partial">{a.toolId}</span></td>
                <td>{a.kind}</td>
                <td>{a.format}</td>
                <td>{a.sizeBytes !== null ? formatBytes(a.sizeBytes) : "—"}</td>
                <td><DataOriginBadge origin={a.provenance.origin} /></td>
                <td>{a.visibility}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reproducibility info */}
      <div style={{ marginTop: "0.65rem", fontSize: "0.68rem", color: "var(--muted, #888)", lineHeight: 1.6 }}>
        <strong>Reproducibility:</strong><br />
        Schema version: {scenario.schemaVersion} · Scenario: {scenario.scenarioId}<br />
        Provenance: {scenario.provenance.origin} · Fixture: {scenario.provenance.fixtureId ?? "N/A"}<br />
        Generated: {scenario.provenance.generatedAt ?? "N/A"} · Models: {Object.keys(scenario.models).length} · Results: {scenario.benchmarkResults.length}
      </div>
    </div>
  );
}
