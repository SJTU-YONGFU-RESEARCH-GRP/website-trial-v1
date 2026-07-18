/* SpiceTranslatorTypes — Result-oriented data model */

export type ResultKind = "batch" | "pdk_target" | "verification" | "unassigned";

export interface TranslatorHero {
  pdks?: string; sourceFiles?: string; successfulTranslations?: string;
  modelsTranslated?: string; verification?: string; roundTrip?: string; monteCarlo?: string;
}

export interface ReportArtifact {
  name: string; relPath: string; size: string; hash: string;
  /** Public fetch URL for lazy loading markdown content. */
  fetchUrl: string | null;
}

export interface PlotArtifact {
  name: string; relPath: string; format: string; size: string; hash: string;
  displayUrl: string | null;
  /** Original image dimensions (from generator image-size probe). */
  width?: number; height?: number; aspectRatio?: number;
}

export interface DataArtifact {
  name: string; relPath: string; format: string; size: string; hash: string;
  rows?: Record<string, string>[]; rowCount?: number; columns?: string[];
}

export interface OtherArtifact {
  name: string; relPath: string; size: string; hash: string; format?: string;
}

export interface ResultSummary {
  totalReports: number; totalPlots: number; totalData: number;
  hero?: TranslatorHero;
}

export interface TranslatorResult {
  resultId: string;
  title: string;
  description: string;
  kind: ResultKind;
  pdk: string;
  sourceFormat: string;
  targetFormat: string;
  generatedAt: string;
  status: string;
  reports: ReportArtifact[];
  plots: PlotArtifact[];
  dataArtifacts: DataArtifact[];
  otherArtifacts: OtherArtifact[];
  summary: ResultSummary;
}

export interface SpiceTranslatorManifest {
  generatedAt: string;
  results: TranslatorResult[];
  defaultResultId: string;
  allPdks: string[];
  allSourceFormats: string[];
  allTargetFormats: string[];
}
