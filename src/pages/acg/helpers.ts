import type { ArtifactRecordV1, JsonObject, JsonValue, ResultRecordV1, ToolCapabilityV1 } from "../../../shared/contracts/v1";
import type { AcgEngine, AcgFileRole, AcgPreset } from "../../api/acg/client";

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function acgPresets(capabilities: ToolCapabilityV1[], engine: AcgEngine): AcgPreset[] {
  const unique = new Map<string, AcgPreset>();
  for (const tool of capabilities) {
    if (!Array.isArray(tool.limits.presets)) continue;
    for (const value of tool.limits.presets) {
      const item = record(value);
      if (item.engine === engine && typeof item.id === "string" && typeof item.label === "string") unique.set(item.id, item as unknown as AcgPreset);
    }
  }
  return [...unique.values()];
}
export function inferAcgRole(name: string): AcgFileRole {
  const lower = name.split(/[\\/]/).pop()!.toLowerCase();
  if (/\.(v|sv)$/.test(lower)) return "port-verilog";
  // Native configuration filenames include algorithm and placement-mode words.
  if (/(?:^|[_.-])config(?:[_.-]|$)/.test(lower)) return "config";
  if (/(?:^|[_.-])rules?(?:[_.-]|$)/.test(lower)) return "rules";
  if (/\.pathfinder\.json$/.test(lower) || /(?:^|[_.-])(?:diagnostic|hotspots?)(?:[_.-]|$)/.test(lower) && /\.json$/.test(lower)) return "source-diagnostic";
  if (/port/.test(lower) && /\.json$/.test(lower)) return "port-metadata";
  if (/placement|place|predefined/.test(lower)) return "placement";
  return "netlist";
}
export function parseConfigOverrides(text: string): JsonObject {
  let parsed: unknown;
  try { parsed = JSON.parse(text.trim() || "{}"); } catch { throw new Error("Advanced configuration must be valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Advanced configuration must be a JSON object, for example {\"key\": value}.");
  return parsed as JsonObject;
}
export function parameterValue(type: string, value: string, label: string): JsonValue {
  if (type === "number" || type === "integer") {
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || (type === "integer" && !Number.isInteger(number))) throw new Error(`${label} must be a finite ${type}.`);
    return number;
  }
  if (type === "boolean") return value === "true";
  return value;
}
export function artifactForPath(path: string, artifacts: ArtifactRecordV1[]): ArtifactRecordV1 | undefined {
  const exact = artifacts.filter((artifact) => artifact.relativePath === path);
  const candidates = exact.length ? exact : artifacts.filter((artifact) => artifact.relativePath.endsWith(`/${path}`));
  return candidates.length === 1 ? candidates[0] : undefined;
}
export function cellArtifacts(cell: unknown, artifacts: ArtifactRecordV1[]): ArtifactRecordV1[] {
  const value = record(cell);
  const paths = Array.isArray(value.artifacts) ? value.artifacts.map((item) => record(item).relativePath).filter((item): item is string => typeof item === "string") : [];
  for (const check of Object.values(record(value.verification))) {
    const evidence = record(check).evidencePaths;
    if (Array.isArray(evidence)) for (const path of evidence) if (typeof path === "string") paths.push(path);
  }
  const matched = new Set<string>();
  for (const path of paths) {
    const artifact = artifactForPath(path, artifacts);
    // An ambiguous basename must never attach another cell's layout to this cell.
    if (artifact) matched.add(artifact.id);
  }
  return artifacts.filter((artifact) => matched.has(artifact.id));
}
export function validationLabel(value: unknown): string {
  const status = record(value).status;
  return typeof status === "string" ? status.replaceAll("_", " ") : "unknown";
}

/** Optional local checksum; server recognition remains authoritative on HTTP LAN deployments. */
export async function localInputDigest(file: File): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch { return null; }
}

/** Optional UI controls must not overwrite custom configuration with catalog defaults. */
export function acgCoreDefaults(capabilities: ToolCapabilityV1[], engine: AcgEngine): Record<string, string> {
  return Object.fromEntries((capabilities.find((item) => item.toolId === `acg-${engine}`)?.parameters ?? [])
    .filter((item) => !["engine", "mode", "presetId", "configOverrides"].includes(item.id))
    .map((item) => [item.id, !item.required || item.defaultValue === null ? "" : String(item.defaultValue)]));
}

/** Search actual cell names and recorded configuration rather than summary counts alone. */
export function acgResultMatches(result: Pick<ResultRecordV1, "title" | "summary" | "data" | "provenance">, query: string): boolean {
  const acg = record(result.data.acg);
  const parameters = result.provenance.parameters;
  const configuration = record(acg.configuration);
  const cells = Array.isArray(acg.cells) ? acg.cells.map((cell) => record(cell).cellName) : [];
  const research = record(result.data.acgResearch);
  const unified = record(result.data.acgUnified);
  const values = [result.title, JSON.stringify(result.summary), acg.engine, parameters.engine, research.engine, research.operation, JSON.stringify(research.parameters), JSON.stringify(unified), ...cells];
  for (const source of [acg, record(acg.effectiveConfiguration), configuration, parameters, record(configuration.configOverrides), record(parameters.configOverrides)]) {
    values.push(source.technology, source.tech, source.presetId);
  }
  return values.filter((value): value is string => typeof value === "string").join(" ").toLowerCase().includes(query.trim().toLowerCase());
}

/** Hide the result storage prefix while retaining meaningful output subdirectories. */
export function acgArtifactLabel(path: string): string {
  return path.replace(/^results\/acg\/[^/]+\/(?=.+)/, "");
}

/** Width labels follow parser evidence; successful routing alone does not prove routed width. */
export function acgMetricEntries(value: unknown): Array<[string, unknown]> {
  const metrics = record(value);
  const widthLabel = metrics.widthSource === "routed_candidate" ? "Routed width (CPP)" : metrics.widthSource === "placement" ? "Placement width (CPP)" : "Width (CPP, source unknown)";
  const labels: Record<string, string> = { widthCpp: widthLabel, placementWidthCpp: "Placement width (CPP)", routedWidthCpp: "Routed width (CPP)", widthSource: "Width source", widthEvidencePaths: "Width evidence" };
  return Object.entries(metrics).filter(([key]) => key !== "widthEvidencePaths" && (key !== "widthCpp" || !(metrics.widthSource === "routed_candidate" && typeof metrics.routedWidthCpp === "number" && metrics.routedWidthCpp === metrics.widthCpp || metrics.widthSource === "placement" && typeof metrics.placementWidthCpp === "number" && metrics.placementWidthCpp === metrics.widthCpp)))
    .map(([key, item]) => [labels[key] ?? key, key === "widthSource" ? item === "routed_candidate" ? "Proven routed candidate" : item === "placement" ? "Initial placement" : "Unknown" : item]);
}

export function acgWidthEvidence(value: unknown): string[] {
  const paths = record(value).widthEvidencePaths;
  return Array.isArray(paths) ? [...new Set(paths.filter((path): path is string => typeof path === "string" && path.length > 0))] : [];
}
