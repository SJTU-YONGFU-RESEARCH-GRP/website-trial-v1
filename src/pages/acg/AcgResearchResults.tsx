import { AcgJsonDetails } from "./AcgJsonDetails";
import type { ArtifactRecordV1 } from "../../../shared/contracts/v1";
import { artifactDownloadUrl } from "../../api/jobs";
import { acgArtifactLabel, artifactForPath, record } from "./helpers";
import { RESEARCH_LABELS, researchWitnessArtifacts } from "./researchHelpers";
import type { AcgResearchOperation } from "../../api/acg/client";

export function AcgResearchResults({ value, artifacts, artifactPath }: { value: unknown; artifacts: ArtifactRecordV1[]; artifactPath?: (path: string) => string }): JSX.Element {
  const research = record(value);
  const operation = research.operation as AcgResearchOperation;
  const corpus = record(research.corpus);
  const cells = Array.isArray(research.cells) ? research.cells : Array.isArray(corpus.cells) ? corpus.cells : [];
  const metrics = Array.isArray(research.metrics) ? research.metrics.map(record) : [];
  const columns = [...new Set(metrics.flatMap(row => Object.keys(row).filter(key => row[key] === null || typeof row[key] !== "object")))];
  const rawPaths = research.rawReportPaths;
  const paths = Array.isArray(rawPaths) ? rawPaths.filter((path): path is string => typeof path === "string") : Object.values(record(rawPaths)).filter((path): path is string => typeof path === "string");
  const boundPaths = artifactPath ? paths.map(artifactPath) : paths;
  const reports = [...new Map(boundPaths.map(path => [path, artifactForPath(path, artifacts)])).entries()];
  return <section className="chart-card acg-research-result" aria-label="Research workflow result">
    <header className="acg-heading"><div><span className="digital-eyebrow">Research result</span><h3>{RESEARCH_LABELS[operation] ?? "Research workflow"}</h3></div><span className="acg-badge">{typeof research.status === "string" ? research.status : "unknown"}</span></header>
    <p className="acg-help">Research status describes retained workflow evidence. Job completion does not establish native feasibility, connectivity clearance or foundry certification.</p>
    <dl className="acg-metrics"><div><dt>Engine</dt><dd>{String(research.engine ?? "unknown")}</dd></div><div><dt>Process completed</dt><dd>{research.processCompleted === true ? "Yes" : research.processCompleted === false ? "No" : "Unknown"}</dd></div><div><dt>Foundry certification</dt><dd>{research.foundryCertification === false ? "Not certified" : "Unknown"}</dd></div></dl>
    {operation === "known-feasible" ? <>
      <p className="acg-help">A witness is limited to its recorded validation level. A capped search does not prove infeasibility. LVS1 and foundry signoff remain unverified unless separate evidence explicitly establishes them.</p>
      {cells.length ? <div className="acg-table-wrap"><table><thead><tr><th>Cell</th><th>Search status</th><th>Termination</th><th>Attempts</th><th>Validation level</th><th>LVS0</th><th>LVS1</th><th>Foundry signoff</th><th>Witness</th></tr></thead><tbody>{cells.map((value, index) => {
        const cell = record(value); const path = typeof cell.witnessPath === "string" ? artifactPath ? artifactPath(cell.witnessPath) : cell.witnessPath : null; const witness = path ? artifactForPath(path, artifacts) : null;
        const witnessFiles = path ? researchWitnessArtifacts(path, boundPaths, artifacts) : [];
        return <tr key={index}><td>{String(cell.cellName ?? cell.cell ?? "unknown")}</td><td>{String(cell.status ?? "unknown")}</td><td>{String(cell.terminationReason ?? "unknown")}</td><td>{String(cell.attemptCount ?? "Unavailable")}</td><td>{String(cell.validationLevel ?? "unknown")}</td><td>{String(typeof cell.lvs0 === "string" ? cell.lvs0 : record(cell.lvs0).status ?? "Not recorded")}</td><td>{String(typeof cell.lvs1 === "string" ? cell.lvs1 : record(cell.lvs1).status ?? "unknown")}</td><td>{String(typeof cell.foundrySignoff === "string" ? cell.foundrySignoff : record(cell.foundrySignoff).status ?? "unknown")}</td><td>{witness ? <a href={artifactDownloadUrl(witness.id)}>{acgArtifactLabel(witness.relativePath)}</a> : witnessFiles.length ? <details><summary>Witness artifacts ({witnessFiles.length})</summary><ul>{witnessFiles.map(file => <li key={file.id}><a href={artifactDownloadUrl(file.id)}>{acgArtifactLabel(file.relativePath)}</a></li>)}</ul></details> : path ? acgArtifactLabel(path) : "No recorded witness"}</td></tr>;
      })}</tbody></table></div> : <p className="acg-empty">No normalized per-cell search records are present. Inspect the retained index and native manifests below.</p>}
    </> : <p className="acg-help">Native success means width or cost metrics were parsed; it does not establish layout validity. Process exit/timeout and collected metrics are separate outcomes in the report. Native Markdown may contain static captions; the normalized request configuration below records the parameters used for this workflow.</p>}
    {operation !== "known-feasible" && metrics.length ? <div className="acg-table-wrap"><table><thead><tr>{columns.map(key => <th key={key}>{key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ")}</th>)}</tr></thead><tbody>{metrics.map((row, index) => <tr key={index}>{columns.map(key => <td key={key}>{String(row[key] ?? (["processCompleted", "nativeSuccess", "timedOut"].includes(key) ? "Unknown" : "Unavailable"))}</td>)}</tr>)}</tbody></table></div> : null}
    <h4>Research reports</h4>
    {reports.length ? <ul className="acg-downloads">{reports.map(([path, artifact]) => <li key={path}>{artifact ? <a href={artifactDownloadUrl(artifact.id)}>{acgArtifactLabel(path)}</a> : <span>{acgArtifactLabel(path)} (metadata only; download unavailable)</span>}</li>)}</ul> : <p className="acg-empty">No report paths were recorded.</p>}
    <AcgJsonDetails className="acg-advanced" summary="Normalized configuration and budget" value={{ parameters: research.parameters, generationConfiguration: research.generationConfiguration, configurationMetadata: research.configurationMetadata, budget: research.budget, lineage: research.lineage }} />
    {research.metrics ? <AcgJsonDetails className="acg-advanced" summary="Native comparison metrics and trial outcomes" value={research.metrics} /> : null}
    {operation === "known-feasible" ? <AcgJsonDetails className="acg-advanced" summary="Search manifests and witness evidence" value={{ cells: research.cells, corpus: research.corpus }} /> : null}
    <AcgJsonDetails className="acg-advanced" summary="Script and evidence provenance" value={{ scriptSha256: research.scriptSha256, evidenceSha256: research.evidenceSha256 }} />
  </section>;
}
