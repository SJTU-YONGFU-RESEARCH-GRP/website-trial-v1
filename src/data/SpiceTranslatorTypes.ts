/* SpiceTranslatorTypes.ts — Types for the Translator report page */

export interface TranslatorHero {
  pdks?: string;
  sourceFiles?: string;
  successfulTranslations?: string;
  modelsTranslated?: string;
  verification?: string;
  roundTrip?: string;
  monteCarlo?: string;
  timestamp?: string;
}

export interface TranslatorJsonArtifact {
  name: string; relPath: string; size: string; hash: string;
  parsed?: Record<string, unknown> | null;
}

export interface TranslatorCsvArtifact {
  name: string; relPath: string; size: string; hash: string;
  rows: Record<string, string>[];
}

export interface TranslatorPlotArtifact {
  name: string; relPath: string; format: string; size: string; hash: string;
  displayUrl: string | null;
}

export interface TranslatorOtherArtifact {
  name: string; relPath: string; size: string; hash: string; format?: string;
}

export interface SpiceTranslatorManifest {
  generatedAt: string;
  sourceDir: string;
  reportMarkdown: string;
  reportHash: string;
  hero: TranslatorHero;
  markdowns: { name: string; relPath: string; size: string; hash: string; content?: string }[];
  jsons: TranslatorJsonArtifact[];
  csvs: TranslatorCsvArtifact[];
  texs: TranslatorOtherArtifact[];
  plots: TranslatorPlotArtifact[];
  others: TranslatorOtherArtifact[];
  totalPlots: number;
  totalDataFiles: number;
}

export type TranslatorFilterPdks = string;
