import type { JobPlanV1 } from "../../../../shared/contracts/v1";

export function BenchmarkPlanPreview({ plan }: { plan: JobPlanV1 | null }) {
  return (
    <section className="benchmark-run-section" aria-labelledby="benchmark-plan-heading">
      <div className="benchmark-run-section__heading">
        <div><span className="benchmark-run-eyebrow">Preflight</span><h3 id="benchmark-plan-heading">Planned Operations</h3></div>
        <span>{plan ? `${plan.steps.length} steps` : "Not generated"}</span>
      </div>
      {!plan ? <div className="benchmark-run-empty">Upload and run preflight to see exact tools, parameters, mappings and argv.</div> : (
        <ol className="benchmark-plan-list">
          {plan.steps.map((step) => (
            <li key={step.id}>
              <div className="benchmark-plan-step__top"><strong>{step.name}</strong><span>{step.process ? "External process" : "Backend operation"}</span></div>
              <p>{step.description}</p>
              <div className="benchmark-plan-io"><span>Input: {step.inputRoles.join(", ") || "—"}</span><span>Output: {step.outputRoles.join(", ") || "—"}</span></div>
              {step.process ? (
                <div className="benchmark-command">
                  <code>{[step.process.executableDisplay, ...step.process.argv].join(" ")}</code>
                  <small>cwd: {step.process.cwdRelative} · timeout: {step.process.timeoutSeconds}s</small>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
