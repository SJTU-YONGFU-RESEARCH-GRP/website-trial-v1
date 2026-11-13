import type { JobRecordV1, JobStepRecordV1 } from "../../shared/contracts/v1";
import { formatDate } from "./format";
import { StatusBadge } from "./StatusBadge";

export function JobProgress({ job, steps }: { job: JobRecordV1; steps: JobStepRecordV1[] }): JSX.Element {
  const percent = Math.max(0, Math.min(100, Math.round(job.progress * 100)));
  return (
    <section className="jobs-card" aria-labelledby="job-progress-title">
      <div className="jobs-card__heading">
        <div><h2 id="job-progress-title">Execution progress</h2><p>{job.workflow} · {job.operation}</p></div>
        <StatusBadge status={job.status} />
      </div>
      <div className="jobs-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="jobs-progress-meta"><strong>{percent}%</strong><span>Started {formatDate(job.startedAt)}</span><span>Finished {formatDate(job.finishedAt)}</span></div>
      <ol className="jobs-steps">{steps.map((step) => (
        <li key={step.id} className={step.id === job.currentStepId ? "jobs-step jobs-step--current" : "jobs-step"}>
          <div><strong>{step.name}</strong><span>{step.stepKey}</span></div>
          <div className="jobs-step__status"><span>{Math.round(step.progress * 100)}%</span><StatusBadge status={step.status} /></div>
          {step.error ? <p className="jobs-error">{step.error.code}: {step.error.message}</p> : null}
        </li>
      ))}</ol>
    </section>
  );
}

