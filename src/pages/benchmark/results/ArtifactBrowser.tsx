/* ═══════════════════════════════════════════════════════════════════ */
/*  ArtifactBrowser — unified artifact listing (data + plots)           */
/*  Extracted from SpiceBenchmarkPage.tsx ArtifactSection.               */
/* ═══════════════════════════════════════════════════════════════════ */

import type { BenchmarkRun } from "../../../data/SpiceBenchmarkTypes";

export interface ArtifactBrowserProps {
  run: BenchmarkRun;
}

export function ArtifactBrowser({ run }: ArtifactBrowserProps) {
  const all = [
    ...run.dataArtifacts.map(a => ({ ...a, kind: "data" as const })),
    ...run.plotArtifacts.map(p => ({ ...p, kind: "plot" as const })),
  ];

  return (
    <div className="chart-card benchmark-section" id="bm-artifacts">
      <h2>Artifacts — {run.runId} <span className="hint">({all.length} files)</span></h2>
      <div className="benchmark-table-wrap" style={{ maxHeight: "400px", overflowY: "auto" }}>
        <table className="benchmark-table">
          <thead>
            <tr><th>Name</th><th>Kind</th><th>Domain</th><th>Format</th><th>Size</th><th>Rows</th><th>Hash</th></tr>
          </thead>
          <tbody>
            {all.map((a, i) => (
              <tr key={i}>
                <td><code>{a.name}</code></td>
                <td>{a.kind}</td>
                <td>{a.domain}</td>
                <td>{a.format}</td>
                <td>{a.size}</td>
                <td>{"rowCount" in a ? (a.rowCount > 0 ? a.rowCount : "—") : "—"}</td>
                <td style={{ fontSize: "0.65rem" }}>
                  <code>{"hash" in a ? a.hash : a.name.slice(0, 8)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
