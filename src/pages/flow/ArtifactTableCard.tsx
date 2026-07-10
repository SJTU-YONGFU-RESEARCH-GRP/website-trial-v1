import { Badge } from "./Badge";
import type { Artifact } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface Props {
  artifacts: Artifact[];
  label: string;
}

const VIS_BADGE: Record<string, { label: string; cls: string }> = {
  public:   { label: "Public",  cls: "flow-badge--done" },
  internal: { label: "Internal", cls: "flow-badge--run" },
  redacted: { label: "Redacted", cls: "flow-badge--fail" },
};

export function ArtifactTableCard({ artifacts, label }: Props): JSX.Element {
  if (artifacts.length === 0) {
    return (
      <div className="chart-card">
        <h2>Artifacts</h2>
        <EmptyState message="No artifacts to display" icon="📦" />
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h2>Artifacts — {label}</h2>
      <p className="hint">
        All generated files with provenance, content hash, and visibility classification.
        Public website must never expose private PDK, GDS, CDL, or model files.
      </p>
      <div className="analog-table-wrap" style={{maxHeight:"400px",overflowY:"auto"}}>
        <table className="analog-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Path</th>
              <th>Size</th>
              <th>Tool</th>
              <th>Stage</th>
              <th>Algorithm</th>
              <th>Cell</th>
              <th>Hash</th>
              <th>Visibility</th>
              <th>Provenance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {artifacts.map((a, i) => (
              <tr key={i}>
                <td><code>{a.name}</code></td>
                <td style={{fontSize:"0.72rem",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.relPath}>{a.relPath}</td>
                <td style={{whiteSpace:"nowrap"}}>{a.size}</td>
                <td>{a.toolKey}</td>
                <td>{a.stageId}</td>
                <td>{a.algorithmId}</td>
                <td>{a.cellName}</td>
                <td style={{fontSize:"0.68rem",maxWidth:80,overflow:"hidden",textOverflow:"ellipsis"}} title={a.hash}><code>{a.hash.slice(0,10)}</code></td>
                <td><span className={`flow-badge ${VIS_BADGE[a.visibility]?.cls ?? "flow-badge--idle"}`}>{VIS_BADGE[a.visibility]?.label ?? a.visibility}</span></td>
                <td style={{fontSize:"0.72rem"}}>{a.provenance}</td>
                <td><Badge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
