import { useState } from "react";
import type { ArtifactRecordV1, JsonObject } from "../../../shared/contracts/v1";
import { DtcoMeasuredGeometry } from "./DtcoMeasuredGeometry";
import { artifactDownloadUrl } from "../../api/jobs";
export function objectValue(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}
function safeRelativePath(value: string): boolean {
  return !value.includes("\\") && value.split("/").every(segment => segment !== "" && segment !== "." && segment !== "..");
}
export function dtcoLayoutArtifacts(data: JsonObject | null, artifacts: ArtifactRecordV1[], resultId: string | null) {
  const dtco = objectValue(data?.dtco), paths = objectValue(dtco?.artifacts);
  const prefix = resultId && safeRelativePath(resultId) && !resultId.includes("/") ? `results/dtco/${resultId}/` : null;
  const matching = (key: string) => {
    const workspacePath = paths?.[key];
    if (typeof workspacePath !== "string" || !safeRelativePath(workspacePath) || workspacePath.startsWith("results/")) return undefined;
    return artifacts.find(item => {
      if (!safeRelativePath(item.relativePath) || (item.resultId && item.resultId !== resultId)) return false;
      // Strip only the publisher prefix for this result; never use an arbitrary suffix match.
      const relativePath = item.relativePath.startsWith("results/") ? prefix && item.relativePath.startsWith(prefix) ? item.relativePath.slice(prefix.length) : null : item.relativePath;
      return relativePath === workspacePath;
    });
  };
  const preview = matching("completedPreviewPath");
  return { dtco, selected: matching("selectedGdsPath"), native: matching("nativeGdsPath"),
    preview: preview && ["image/png", "image/svg+xml"].includes(preview.mediaType) ? preview : undefined };
}
export function DtcoLayoutPreview({ data, artifacts, resultId }: { data: JsonObject | null; artifacts: ArtifactRecordV1[]; resultId: string | null }): JSX.Element | null {
  const { dtco, selected, native, preview } = dtcoLayoutArtifacts(data, artifacts, resultId);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  if (!dtco) return null;
  return <section className="dtco-layout-preview" aria-label="Measured layout and scope">
    <h4>Measured layout and extraction provenance</h4>
    <DtcoMeasuredGeometry provenance={dtco.provenance} />
    <p className="jobs-notice jobs-notice--warning"><strong>Result measurement scope:</strong> {typeof dtco.metricScope === "string" ? dtco.metricScope : "Scope unavailable; inspect the result provenance before comparing measurements."}</p>
    {preview && failedPreview !== preview.id ? <figure><img loading="lazy" decoding="async" src={artifactDownloadUrl(preview.id)} alt="Completed GDS layout used for extracted measurements" onError={() => setFailedPreview(preview.id)} /><figcaption>Completed layout associated with this measured result · SHA256 <code>{preview.sha256}</code></figcaption></figure> : <p className="hint">Completed-layout preview is unavailable. Use the measured GDS download and extraction provenance below.</p>}
    <p>{selected ? <a href={artifactDownloadUrl(selected.id)}>Download measured GDS</a> : "Measured GDS artifact unavailable."}{native && native.id !== selected?.id ? <> · <a href={artifactDownloadUrl(native.id)}>Download native intermediate GDS</a></> : null}</p>
    <details><summary>Measured parameters, extraction checks, and file provenance</summary><pre>{JSON.stringify(dtco, null, 2)}</pre></details>
  </section>;
}
