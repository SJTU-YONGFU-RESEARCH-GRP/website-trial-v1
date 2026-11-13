import type { JobStatus, StepStatus, ToolHealthStatus } from "../../shared/contracts/v1";

type Status = JobStatus | StepStatus | ToolHealthStatus | "published" | "private" | "unpublished" | "deleted";

export function StatusBadge({ status }: { status: Status }): JSX.Element {
  return <span className={`job-status job-status--${status}`}>{status.replaceAll("_", " ")}</span>;
}

