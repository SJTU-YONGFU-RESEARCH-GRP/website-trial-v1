import { Badge } from "./Badge";
import type { Artifact } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface ArtifactTableCardProps {
  artifacts: Artifact[];
  label?: string;
}

export function ArtifactTableCard({
  artifacts,
  label = "benchmark",
}: ArtifactTableCardProps): JSX.Element {
  if (artifacts.length === 0) {
    return (
      <div className="chart-card">
        <h2>Artifact Table</h2>
        <EmptyState message="No artifacts available" icon="📄" />
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h2>Artifact Table</h2>
      <p className="hint">
        Generated files for <code>{label}</code>, organized by flow stage.
      </p>
      <div className="analog-table-wrap">
        <table className="analog-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Tool</th>
              <th>Size</th>
              <th>Timestamp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {artifacts.map((a, i) => (
              <tr key={i}>
                <td><code>{a.name}</code></td>
                <td>{a.toolKey}</td>
                <td>{a.size}</td>
                <td>{a.timestamp}</td>
                <td><Badge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
