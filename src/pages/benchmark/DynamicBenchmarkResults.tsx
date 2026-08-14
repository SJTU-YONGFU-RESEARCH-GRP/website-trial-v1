import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ResultRecordV1 } from "../../../shared/contracts/v1";
import { listBenchmarkResults } from "../../api/benchmark";
import { READ_ONLY_DEMO } from "../../api/client";

export function DynamicBenchmarkResults(): JSX.Element | null {
  const [results, setResults] = useState<ResultRecordV1[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (READ_ONLY_DEMO) return;
    let active = true;
    void listBenchmarkResults().then((rows) => { if (active) setResults(rows); }).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, []);
  if (READ_ONLY_DEMO) return null;
  return (
    <section className="benchmark-run-shell" aria-labelledby="benchmark-live-results-heading">
      <div className="benchmark-run-section__heading"><div><span className="benchmark-run-eyebrow">Database-backed results</span><h2 id="benchmark-live-results-heading">Computed and imported results</h2></div><strong>{results.length}</strong></div>
      {unavailable ? <p className="benchmark-run-notice is-error">The dynamic result API is unavailable; bundled historical comparisons remain below.</p> : null}
      {!unavailable && results.length === 0 ? <p className="benchmark-run-notice">No visible dynamic Benchmark result yet. Private results appear here for their owner; administrators can publish them.</p> : null}
      <div className="benchmark-live-results">
        {results.map((result) => {
          const reportCount = Number(result.summary.reportCount ?? 0); const artifactCount = Number(result.summary.artifactCount ?? 0);
          return <Link key={result.id} to={`/results/benchmark/${encodeURIComponent(result.id)}`} className="benchmark-live-result"><div><strong>{result.title}</strong><span>{result.provenance.origin} · {result.lifecycle}</span></div><dl><div><dt>Reports</dt><dd>{Number.isFinite(reportCount) ? reportCount : "—"}</dd></div><div><dt>Artifacts</dt><dd>{Number.isFinite(artifactCount) ? artifactCount : "—"}</dd></div><div><dt>Parser</dt><dd>{result.provenance.parserId}</dd></div></dl></Link>;
        })}
      </div>
    </section>
  );
}
