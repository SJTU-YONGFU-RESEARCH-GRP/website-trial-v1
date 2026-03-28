/**
 * Chart colors for light / dark UI (kept in sync with index.css `data-theme`).
 */

/** Shared chart typography: Arial, 20px bold, line width 3 for strokes. */
export const CHART_FONT_FAMILY = "Arial, sans-serif";
export const CHART_FONT_SIZE = 20;
export const CHART_LINE_WIDTH = 3;

/** Plotly accepts HTML; use for bold where `layout.font` has no weight. */
export function plotlyBold(text: string): string {
  return `<b>${text}</b>`;
}

/** Default Plotly font object (size 20, Arial). */
export function plotFont(color: string): { family: string; size: number; color: string } {
  return { family: CHART_FONT_FAMILY, size: CHART_FONT_SIZE, color };
}

/**
 * Plotly tick / category labels with bold weight (Plotly has no fontWeight on ticks).
 * Uses Arial Black when available.
 */
export function plotTickFont(color: string): { family: string; size: number; color: string } {
  return {
    family: `Arial Black, ${CHART_FONT_FAMILY}`,
    size: CHART_FONT_SIZE,
    color,
  };
}

/** Shared axis grid / spine styling for Plotly (RGB + linewidth 3). */
export function plotlyAxisStrokes(palette: ChartPalette): {
  gridcolor: string;
  zerolinecolor: string;
  zerolinewidth: number;
  linecolor: string;
  linewidth: number;
  tickwidth: number;
  tickcolor: string;
} {
  return {
    gridcolor: palette.rgbAxisGrid,
    zerolinecolor: palette.rgbAxisGridStrong,
    zerolinewidth: CHART_LINE_WIDTH,
    linecolor: palette.rgbAxisGridStrong,
    linewidth: CHART_LINE_WIDTH,
    tickwidth: CHART_LINE_WIDTH,
    tickcolor: palette.rgbAxisGridStrong,
  };
}

/** ECharts textStyle helper matching chart typography. */
export function echartsTextStyle(color: string): {
  fontFamily: string;
  fontSize: number;
  fontWeight: "bold";
  color: string;
} {
  return {
    fontFamily: CHART_FONT_FAMILY,
    fontSize: CHART_FONT_SIZE,
    fontWeight: "bold",
    color,
  };
}

export type ChartPalette = {
  text: string;
  textMuted: string;
  grid: string;
  gridStrong: string;
  /** Axis titles, chart chrome (explicit RGB). */
  rgbAxisTitle: string;
  /** Tick / legend item labels (explicit RGB). */
  rgbAxisTick: string;
  /** Major gridlines (explicit RGB). */
  rgbAxisGrid: string;
  /** Axis lines, zero lines, slider borders (explicit RGB). */
  rgbAxisGridStrong: string;
  plotBg: string;
  accentOrange: string;
  tooltipBg: string;
  tooltipBorder: string;
  markerOutline: string;
};

const light: ChartPalette = {
  text: "#1d1d1f",
  textMuted: "#6e6e73",
  grid: "#e5e5ea",
  gridStrong: "#d2d2d7",
  rgbAxisTitle: "rgb(29, 29, 31)",
  rgbAxisTick: "rgb(110, 110, 115)",
  rgbAxisGrid: "rgb(229, 229, 234)",
  rgbAxisGridStrong: "rgb(210, 210, 215)",
  plotBg: "rgba(255,255,255,0)",
  accentOrange: "#ff9500",
  tooltipBg: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "#d2d2d7",
  markerOutline: "rgba(29, 29, 31, 0.25)",
};

const dark: ChartPalette = {
  text: "#e7ecf3",
  textMuted: "#8b9bb4",
  grid: "#2d3a4d",
  gridStrong: "#3d4f66",
  rgbAxisTitle: "rgb(231, 236, 243)",
  rgbAxisTick: "rgb(139, 155, 180)",
  rgbAxisGrid: "rgb(45, 58, 77)",
  rgbAxisGridStrong: "rgb(61, 79, 102)",
  plotBg: "rgba(255,255,255,0)",
  accentOrange: "#ff9f4a",
  tooltipBg: "rgba(26, 35, 50, 0.96)",
  tooltipBorder: "#3d4f66",
  markerOutline: "rgba(231, 236, 243, 0.35)",
};

export type ThemeMode = "light" | "dark";

export function getChartPalette(theme: ThemeMode): ChartPalette {
  return theme === "dark" ? dark : light;
}
