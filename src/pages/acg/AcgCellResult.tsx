import { AcgJsonDetails } from "./AcgJsonDetails";
import { memo, useEffect, useState } from "react";
import type { ArtifactRecordV1 } from "../../../shared/contracts/v1";
import { artifactDownloadUrl } from "../../api/jobs";
import { formatBytes } from "../../jobs";
import { acgArtifactLabel, acgMetricEntries, acgWidthEvidence, artifactForPath, cellArtifacts, record, validationLabel } from "./helpers";

export const CellResult = memo(function CellResult({ cell, artifacts }: { cell: unknown; artifacts: ArtifactRecordV1[] }): JSX.Element {
  const data = record(cell);
  const name = typeof data.cellName === "string" ? data.cellName : "Unnamed cell";
  const items = cellArtifacts(cell, artifacts);
  const previews = items.filter((item) => item.role === "acg-preview" && ["image/svg+xml", "image/png"].includes(item.mediaType));
  const [previewId, setPreviewId] = useState("");
  const [imageError, setImageError] = useState(false);
  const preview = previews.find((item) => item.id === previewId) ?? previews[0];
  useEffect(() => setImageError(false), [preview?.id]);
  const verification = record(data.verification);
  const placement = record(data.placement);
  const routing = record(data.routing);
  const metrics = acgMetricEntries(data.metrics);
  const widthEvidence = acgWidthEvidence(data.metrics);
  const geometry = record(data.geometry);
  return <article className="chart-card acg-cell-result">
    <header className="acg-heading"><div><span className="digital-eyebrow">Generated cell</span><h3>{name}</h3></div><span className="acg-badge">{typeof data.status === "string" ? data.status : "unknown"}</span></header>
    <dl className="acg-metrics"><div><dt>Placement</dt><dd>{typeof placement.status === "string" ? placement.status.replaceAll("_", " ") : "unknown"}</dd></div><div><dt>Routing</dt><dd>{typeof routing.status === "string" ? routing.status.replaceAll("_", " ") : "unknown"}</dd></div>{Object.keys(geometry).length ? <div><dt>Actual transistor rows</dt><dd>{typeof geometry.actualRows === "number" ? geometry.actualRows : "Unknown"}</dd></div> : null}{metrics.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "Unavailable")}</dd></div>)}</dl>
    {widthEvidence.length ? <details className="acg-advanced"><summary>Width evidence ({widthEvidence.length})</summary><ul className="acg-downloads">{widthEvidence.map((path) => {
      const artifact = artifactForPath(path, artifacts);
      return <li key={path}>{artifact ? <a href={artifactDownloadUrl(artifact.id)}>{acgArtifactLabel(path)}</a> : acgArtifactLabel(path)}</li>;
    })}</ul></details> : null}
    <section className="acg-verification"><h4>Verification evidence</h4><p className="acg-help">Profile: {typeof verification.profile === "string" ? verification.profile : "unknown"}. Generation success alone does not establish DRC or LVS clearance.</p><div className="acg-validation-grid">{[["preRoute", "Pre-route checks"], ["researchDrc", "Research DRC"], ["lvs0", "LVS0 netlist checks"], ["lvs1", "LVS1 GDS connectivity"], ["officialDrc", "Foundry DRC"], ["officialLvs", "Foundry LVS"]].map(([key, label]) => {
      const value = record(verification[key]); const status = validationLabel(value);
      return <div key={key} className={`acg-validation ${status === "passed" ? "is-passed" : status === "failed" ? "is-failed" : ""}`}><strong>{label}</strong><span>{status}</span>{Array.isArray(value.evidencePaths) && value.evidencePaths.length ? <details><summary>Evidence files ({value.evidencePaths.length})</summary><ul>{value.evidencePaths.map((path, index) => {
        const text = String(path); const artifact = artifactForPath(text, items);
        return <li key={`${text}-${index}`}>{artifact ? <a href={artifactDownloadUrl(artifact.id)}>{acgArtifactLabel(text)}</a> : acgArtifactLabel(text)}</li>;
      })}</ul></details> : null}{value.details ? <AcgJsonDetails className="" summary="Details" value={value.details} /> : null}</div>;
    })}</div></section>
    <section className="acg-layout"><div className="acg-heading"><h4>GDS layout preview</h4>{previews.length > 1 ? <div className="digital-field-grid"><label>Preview<select aria-label={`GDS preview for ${name}`} value={preview?.id ?? ""} onChange={(event) => setPreviewId(event.target.value)}>{previews.map((item) => <option key={item.id} value={item.id}>{acgArtifactLabel(item.relativePath)}</option>)}</select></label></div> : null}</div>
      {preview && !imageError ? <a href={artifactDownloadUrl(preview.id)} target="_blank" rel="noreferrer"><img loading="lazy" decoding="async" src={artifactDownloadUrl(preview.id)} alt={`GDS layout preview for ${name}`} onError={() => setImageError(true)} /></a> : <p className="acg-empty">{imageError ? "The preview could not be loaded. Download the layout artifacts below." : "No rendered GDS preview was produced for this cell."}</p>}
    </section>
    {Array.isArray(placement.candidates) && placement.candidates.length ? <AcgJsonDetails className="acg-advanced" summary={<>Placement candidates ({placement.candidates.length})</>} value={placement.candidates} /> : null}
    {Array.isArray(data.diagnostics) && data.diagnostics.length ? <AcgJsonDetails className="acg-advanced" summary="Cell diagnostics" value={data.diagnostics} /> : null}
    {Array.isArray(routing.importedCandidates) && routing.importedCandidates.length ? <AcgJsonDetails className="acg-advanced" summary={<>Imported routing candidates ({routing.importedCandidates.length})</>} value={routing.importedCandidates} /> : null}
    {Array.isArray(data.routedCandidates) && data.routedCandidates.length ? <AcgJsonDetails className="acg-advanced" summary={<>Routed candidates ({data.routedCandidates.length})</>} value={data.routedCandidates} /> : null}
    <AcgJsonDetails className="acg-advanced" summary="Complete generated cell evidence" value={data} />
    <h4>Cell downloads</h4>{items.length ? <ul className="acg-downloads">{items.map((item) => <li key={item.id}><a href={artifactDownloadUrl(item.id)}>{item.role.replace(/^acg-/, "")} · {acgArtifactLabel(item.relativePath)}</a><span>{formatBytes(item.sizeBytes)}</span></li>)}</ul> : <p className="acg-empty">No cell artifacts are available.</p>}
  </article>;
});
