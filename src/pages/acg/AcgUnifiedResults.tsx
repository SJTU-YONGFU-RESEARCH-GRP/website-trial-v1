import { AcgJsonDetails } from "./AcgJsonDetails";
import { memo } from "react";
import type { ArtifactRecordV1 } from "../../../shared/contracts/v1";
import { artifactDownloadUrl } from "../../api/jobs";
import { acgArtifactLabel, artifactForPath, record } from "./helpers";
import { unifiedArtifactPath, unifiedStageSections } from "./unifiedHelpers";
import { AcgResearchResults } from "./AcgResearchResults";
const OPERATIONS = { comparison: "algorithm-matrix", search: "known-feasible", report: "algorithm-report" } as const;
export const AcgWorkflowOutcomes = memo(function AcgWorkflowOutcomes({ value, artifacts }: { value: unknown; artifacts: ArtifactRecordV1[] }): JSX.Element {
  const unified = record(value);
  const stages = Array.isArray(unified.stages) ? unified.stages.map(record) : [];
  const reportPaths = record(unified.report).rawReportPaths;
  const paths = (Array.isArray(reportPaths) ? reportPaths : Object.values(record(reportPaths))).filter((path): path is string => typeof path === "string");
  const mainReport = paths.find(path => /\.md$/i.test(path)) ?? paths[0];
  const reportArtifact = mainReport ? artifactForPath(unifiedArtifactPath("report", mainReport), artifacts) : null;
  const evidenceLink = (stage: string, path: string) => { const artifact = artifactForPath(unifiedArtifactPath(stage, path), artifacts); return artifact ? <a href={artifactDownloadUrl(artifact.id)}>{acgArtifactLabel(path)}</a> : <span>{acgArtifactLabel(path)} (download unavailable)</span>; };
  return <section aria-label="Unified ACG workflow result">
    <div className="chart-card"><div className="acg-heading"><h3>Workflow outcomes</h3>{reportArtifact ? <a className="digital-primary" href={artifactDownloadUrl(reportArtifact.id)}>Download workflow report</a> : null}</div><p className="acg-help">Job completion means the workflow evidence was assembled. Each stage retains its actual outcome; unsupported, failed and partial stages do not become successful checks.</p>
      <div className="acg-table-wrap"><table><thead><tr><th>Stage</th><th>Outcome</th><th>Reason</th><th>Native execution</th><th>Evidence</th></tr></thead><tbody>{stages.map((stage,index) => {
        const evidence = Array.isArray(stage.evidencePaths) ? stage.evidencePaths.filter((path): path is string => typeof path === "string") : [];
        const primary = evidence.filter(path => /(?:^|\/)(?:summary\.json|(?:main)?report\.(?:md|json))$/i.test(path)).slice(0,3);
        const remaining = evidence.filter(path => !primary.includes(path));
        const execution = typeof stage.exitCode === "number" ? `Exit ${stage.exitCode}` : stage.status === "unsupported" ? "Not run" : stage.id === "comparison" ? "See trials" : stage.id === "search" ? "See attempts" : stage.id === "report" ? "Evidence assembly" : "Unavailable";
        return <tr key={String(stage.id ?? index)}><td>{String(stage.label ?? stage.id ?? "Unknown stage")}</td><td>{String(stage.status ?? "unknown")}</td><td>{typeof stage.reason === "string" ? stage.reason : "—"}</td><td>{execution}</td><td>{primary.map(path => <div key={path}>{evidenceLink(String(stage.id), path)}</div>)}{remaining.length ? <details><summary>{remaining.length} additional artifacts</summary><ul>{remaining.map(path => <li key={path}>{evidenceLink(String(stage.id), path)}</li>)}</ul></details> : null}{!evidence.length ? "No recorded evidence" : null}</td></tr>;
      })}</tbody></table></div>
    </div>
  </section>;
});
export function AcgUnifiedResults({ value, artifacts }: { value: unknown; artifacts: ArtifactRecordV1[] }): JSX.Element {
  const unified = record(value);
  return <section aria-label="Unified ACG workflow result">
    <AcgWorkflowOutcomes value={unified} artifacts={artifacts} />
    {unifiedStageSections(unified).map(({key,summary}) => <AcgResearchResults key={key} value={{ ...summary, engine: summary.engine ?? unified.engine, operation: OPERATIONS[key as keyof typeof OPERATIONS] }} artifacts={artifacts} artifactPath={path => unifiedArtifactPath(key, path)} />)}
    <AcgJsonDetails className="chart-card acg-advanced" summary="Complete workflow evidence" value={unified} />
  </section>;
}
