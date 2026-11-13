import type { JobRecordV1 } from "../../shared/contracts/v1";
import { Link } from "react-router-dom";
import { formatDate, shortId } from "./format";
import { StatusBadge } from "./StatusBadge";

export function JobTable({ jobs, showOwner = false }: { jobs: JobRecordV1[]; showOwner?: boolean }): JSX.Element {
  if (!jobs.length) return <p className="jobs-empty">No jobs match the current filters.</p>;
  return (
    <div className="jobs-table-scroll">
      <table className="jobs-table">
        <thead><tr>
          <th>Job</th>{showOwner ? <th>Owner</th> : null}<th>Module</th><th>Operation</th>
          <th>Status</th><th>Progress</th><th>Updated</th><th aria-label="Open job" />
        </tr></thead>
        <tbody>{jobs.map((job) => (
          <tr key={job.id}>
            <td><code title={job.id}>{shortId(job.id)}</code></td>
            {showOwner ? <td><code title={job.ownerId}>{shortId(job.ownerId)}</code></td> : null}
            <td>{job.moduleId}</td><td>{job.operation}</td><td><StatusBadge status={job.status} /></td>
            <td><span className="jobs-progress-label">{Math.round(job.progress * 100)}%</span></td>
            <td>{formatDate(job.updatedAt)}</td>
            <td><Link className="jobs-link" to={`/jobs/${job.id}`}>Inspect</Link></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

