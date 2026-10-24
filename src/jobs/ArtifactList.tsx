import type { ArtifactRecordV1 } from "../../shared/contracts/v1";
import { artifactDownloadUrl } from "../api/jobs";
import { formatBytes, formatDate } from "./format";

export function ArtifactList({ artifacts }: { artifacts: ArtifactRecordV1[] }): JSX.Element {
  return (
    <section className="jobs-card" aria-labelledby="artifact-list-title">
      <div className="jobs-card__heading"><div><h2 id="artifact-list-title">Artifacts</h2><p>Immutable outputs retained for this job.</p></div><strong>{artifacts.length}</strong></div>
      {artifacts.length ? <div className="jobs-table-scroll"><table className="jobs-table"><thead><tr><th>Role</th><th>Path</th><th>Size</th><th>SHA-256</th><th>Created</th><th /></tr></thead>
        <tbody>{artifacts.map((artifact) => <tr key={artifact.id}><td>{artifact.role}</td><td><code>{artifact.relativePath}</code></td><td>{formatBytes(artifact.sizeBytes)}</td><td><code title={artifact.sha256}>{artifact.sha256.slice(0, 14)}…</code></td><td>{formatDate(artifact.createdAt)}</td><td><a className="jobs-link" href={artifactDownloadUrl(artifact.id)}>Download</a></td></tr>)}</tbody></table></div> : <p className="jobs-empty">No artifacts have been collected yet.</p>}
    </section>
  );
}

