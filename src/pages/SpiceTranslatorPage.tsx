import { useState, useMemo } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { usePlotlyChart } from "../hooks/usePlotlyChart";
import { useTheme } from "../theme/ThemeContext";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  getChartPalette, plotInsetBackground, plotAxisFont, plotFont,
  plotlyAxisFrameX, plotlyAxisFrameY, plotlyBold, plotlyHoverLabel,
} from "../theme/chartPalette";
import { TRANSLATOR_MANIFEST } from "../data/generatedSpiceTranslatorManifest";
import type { SpiceTranslatorManifest, TranslatorCsvArtifact } from "../data/SpiceTranslatorTypes";
import "../translator.css";

const BASE = import.meta.env.BASE_URL || "/";

/* ─── Parse report into named sections ─── */
interface ReportSection { id: string; title: string; level: number; content: string; subsections: ReportSection[]; }

function parseSections(md: string): ReportSection[] {
  const lines = md.split("\n");
  const sections: ReportSection[] = [];
  const stack: ReportSection[] = [];
  let buf = "";

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const h = t.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      // Flush buffer into current section
      if (stack.length > 0) stack[stack.length - 1].content += buf;
      buf = "";

      const lvl = h[1].length;
      const title = h[2];
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const sec: ReportSection = { id, title, level: lvl, content: "", subsections: [] };

      // Pop stack until we find a parent
      while (stack.length > 0 && stack[stack.length - 1].level >= lvl) stack.pop();
      if (stack.length === 0) sections.push(sec);
      else stack[stack.length - 1].subsections.push(sec);
      stack.push(sec);
    } else {
      buf += lines[i] + "\n";
    }
  }
  if (stack.length > 0) stack[stack.length - 1].content += buf;
  return sections;
}

/* ─── Safe Markdown → HTML renderer ─── */
function esc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function renderInline(t: string): string {
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return t;
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  let out = "";
  let inCode = false, codeBuf = "", codeLang = "";
  let inTable = false, tableRows: string[] = [];

  const flushTable = () => {
    if (!inTable) return;
    out += '<div class="tr-table-wrap"><table class="tr-table">';
    tableRows.forEach((row, ri) => {
      const cells = row.split("|").slice(1, -1).map(c => c.trim());
      const tag = ri === 0 ? "th" : "td";
      out += "<tr>" + cells.map(c => {
        const isNum = /^[\d.,%+\-eE]+$/.test(c);
        return `<${tag}${isNum ? ' class="tr-num"' : ''}>${renderInline(c)}</${tag}>`;
      }).join("") + "</tr>";
    });
    out += "</table></div>";
    tableRows = []; inTable = false;
  };

  const flushCode = () => {
    out += `<details class="tr-code-block"><summary>${codeLang || "code"} (${codeBuf.split("\\n").length} lines)</summary><pre><code>${esc(codeBuf)}</code></pre></details>`;
    codeBuf = ""; codeLang = ""; inCode = false;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]; const t = line.trim();

    if (t.startsWith("```")) {
      flushTable();
      if (inCode) { flushCode(); i++; continue; }
      inCode = true; codeLang = t.slice(3).trim(); i++; continue;
    }
    if (inCode) { codeBuf += (codeBuf ? "\n" : "") + line; i++; continue; }

    if (t.startsWith("|") && t.endsWith("|")) {
      if (/^\|[-:\s|]+\|$/.test(t)) { i++; continue; }
      if (!inTable) { flushTable(); inTable = true; }
      tableRows.push(t); i++; continue;
    } else { flushTable(); }

    const h = t.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out += `<h${h[1].length} id="${id}">${renderInline(h[2])}</h${h[1].length}>\n`;
      i++; continue;
    }

    if (/^[-*_]{3,}$/.test(t)) { out += "<hr/>\n"; i++; continue; }

    if (/^[-*+]\s+/.test(t)) {
      out += "<ul>\n";
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        out += `<li>${renderInline(lines[i].trim().replace(/^[-*+]\s+/, ""))}</li>\n`;
        i++;
      }
      out += "</ul>\n"; continue;
    }

    if (/^\d+\.\s+/.test(t)) {
      out += "<ol>\n";
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        out += `<li>${renderInline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>\n`;
        i++;
      }
      out += "</ol>\n"; continue;
    }

    if (t) out += `<p>${renderInline(t)}</p>\n`;
    i++;
  }
  flushTable(); flushCode();
  return out;
}

/* ─── TOC Generator ─── */
function TOC({ sections }: { sections: ReportSection[] }) {
  const render = (secs: ReportSection[], depth: number): string => {
    if (secs.length === 0) return "";
    return "<ul>" + secs.map(s => {
      const subToc = s.subsections.length > 0 ? render(s.subsections, depth + 1) : "";
      return `<li><a href="#${s.id}">${s.title}</a>${subToc}</li>`;
    }).join("") + "</ul>";
  };
  const html = render(sections, 0);
  return <div className="tr-toc" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ─── Filter bar ─── */
function FilterBar({ csvs, filters, setFilters }: {
  csvs: TranslatorCsvArtifact[]; filters: Record<string, string>; setFilters: (f: Record<string, string>) => void;
}) {
  const summaryCsv = csvs.find(c => c.name === "pdk_translation_summary.csv");
  const pdks = [...new Set((summaryCsv?.rows || []).map(r => r["PDK"] || "").filter(Boolean))];
  const sources = [...new Set((summaryCsv?.rows || []).map(r => r["Source"] || "").filter(Boolean))];
  const targets = [...new Set((summaryCsv?.rows || []).map(r => r["Target"] || "").filter(Boolean))];

  const set = (k: string, v: string) => setFilters({ ...filters, [k]: v });

  return (
    <div className="chart-card tr-filter">
      <div className="tr-filter-row">
        <label className="axis-picker">PDK<select value={filters.pdk || ""} onChange={e => set("pdk", e.target.value)}><option value="">All</option>{pdks.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <label className="axis-picker">Source<select value={filters.source || ""} onChange={e => set("source", e.target.value)}><option value="">All</option>{sources.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="axis-picker">Target<select value={filters.target || ""} onChange={e => set("target", e.target.value)}><option value="">All</option>{targets.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="axis-picker">Confidence<select value={filters.confidence || ""} onChange={e => set("confidence", e.target.value)}><option value="">All</option>{["S","A","B","C","D","F"].map(t => <option key={t} value={t}>{t}</option>)}</select></label>
        <label className="axis-picker">Result<select value={filters.result || ""} onChange={e => set("result", e.target.value)}><option value="">All</option><option value="pass">Success</option><option value="fail">Failed</option></select></label>
        <label className="axis-picker">Search<input type="text" value={filters.search || ""} onChange={e => set("search", e.target.value)} placeholder="File name..." style={{padding:"0.25rem 0.4rem",fontSize:"0.8rem",width:"100%",border:"1px solid var(--border)",borderRadius:"4px"}} /></label>
      </div>
    </div>
  );
}

function applyFilters(csv: TranslatorCsvArtifact | undefined, filters: Record<string, string>) {
  if (!csv) return [];
  let rows = csv.rows;
  if (filters.pdk) rows = rows.filter(r => r["PDK"] === filters.pdk);
  if (filters.source) rows = rows.filter(r => r["Source"] === filters.source);
  if (filters.target) rows = rows.filter(r => r["Target"] === filters.target);
  if (filters.result === "pass") rows = rows.filter(r => parseFloat(r["Success %"] || "0") >= 100);
  if (filters.result === "fail") rows = rows.filter(r => parseFloat(r["Success %"] || "0") < 100);
  return rows;
}

/* ─── Derived charts (Plotly) ─── */
function DerivedCharts({ manifest, filters }: { manifest: SpiceTranslatorManifest; filters: Record<string, string> }) {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const bg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  const summaryCsv = manifest.csvs.find(c => c.name === "pdk_translation_summary.csv");
  const effCsv = manifest.csvs.find(c => c.name === "pdk_translation_effective_summary.csv");
  const filtered = applyFilters(summaryCsv, filters);

  // Grouped bar: PDK × target success %
  const barChart = useMemo(() => {
    if (!summaryCsv) return null;
    const rows = filtered.length > 0 ? filtered : summaryCsv.rows;
    const pdks = [...new Set(rows.map(r => r["PDK"]))];
    const targets = [...new Set(rows.map(r => r["Target"]))];
    const traces: Data[] = targets.map(tg => ({
      type: "bar", name: tg,
      x: pdks, y: pdks.map(p => parseFloat(rows.find(r => r["PDK"] === p && r["Target"] === tg)?.["Success %"] || "0")),
      hovertemplate: `%{x} → ${tg}: %{y:.1f}%<extra></extra>`,
    } as Data));

    return {
      data: traces,
      layout: {
        autosize: true, barmode: "group",
        margin: narrow ? { l: 52, r: 16, t: 36, b: 80 } : { l: 60, r: 24, t: 40, b: 80 },
        paper_bgcolor: bg, plot_bgcolor: bg, font: plotFont(palette.rgbAxisTitle),
        title: { text: plotlyBold("PDK × Target Translation Success %"), font: plotFont(palette.rgbAxisTitle) },
        xaxis: { ...frameX, tickfont: axTick, tickangle: -45 },
        yaxis: { ...frameY, title: { text: "Success %", font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick, gridcolor: palette.axisGridGreyRgb },
        showlegend: true, legend: narrow ? { orientation: "h", y: -0.4 } : { x: 1.02 },
        hovermode: "closest", hoverlabel: hoverLabel,
      } as Partial<Layout>,
    };
  }, [filtered, narrow, palette, bg, axTick, hoverLabel, frameX, frameY]);

  // Raw vs effective scatter
  const rawVsEffChart = useMemo(() => {
    if (!effCsv) return null;
    const rows = effCsv.rows;
    return {
      data: [{
        type: "scatter", mode: "text+markers" as const,
        x: rows.map(r => parseFloat(r["Raw Success %"] || "0")),
        y: rows.map(r => parseFloat(r["Effective Model-Deck Success %"] || "0")),
        text: rows.map(r => `${r["PDK"]}→${r["Target"]}`),
        textposition: "top center",
        marker: { size: 10, color: rows.map(r => parseFloat(r["Effective Model-Deck Success %"] || "0") >= 100 ? "#22c55e" : "#ef4444") },
        hovertemplate: "%{text}<br>Raw: %{x:.1f}%<br>Effective: %{y:.1f}%<extra></extra>",
      } as Data],
      layout: {
        autosize: true, margin: narrow ? { l: 52, r: 16, t: 36, b: 48 } : { l: 60, r: 24, t: 40, b: 52 },
        paper_bgcolor: bg, plot_bgcolor: bg, font: plotFont(palette.rgbAxisTitle),
        title: { text: plotlyBold("Raw vs Effective Model-Deck Success %"), font: plotFont(palette.rgbAxisTitle) },
        xaxis: { ...frameX, title: { text: "Raw Success %", font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick, range: [-5, 105] },
        yaxis: { ...frameY, title: { text: "Effective Success %", font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick, range: [-5, 105], gridcolor: palette.axisGridGreyRgb },
        hovermode: "closest", hoverlabel: hoverLabel,
      } as Partial<Layout>,
    };
  }, [effCsv, narrow, palette, bg, axTick, hoverLabel, frameX, frameY]);

  // Models out vs duration scatter
  const modelsOutChart = useMemo(() => {
    if (!summaryCsv) return null;
    const rows = filtered.length > 0 ? filtered : summaryCsv.rows;
    return {
      data: [{
        type: "scatter", mode: "markers",
        x: rows.map(r => parseFloat(r["Duration (ms)"] || "0")),
        y: rows.map(r => parseFloat(r["Models Out"] || "0")),
        text: rows.map(r => `${r["PDK"]}→${r["Target"]}`),
        marker: { size: 8 },
        hovertemplate: "%{text}<br>Duration: %{x:.0f}ms<br>Models: %{y}<extra></extra>",
      } as Data],
      layout: {
        autosize: true, margin: narrow ? { l: 52, r: 16, t: 36, b: 48 } : { l: 60, r: 24, t: 40, b: 52 },
        paper_bgcolor: bg, plot_bgcolor: bg, font: plotFont(palette.rgbAxisTitle),
        title: { text: plotlyBold("Models Out vs Duration"), font: plotFont(palette.rgbAxisTitle) },
        xaxis: { ...frameX, title: { text: "Duration (ms)", font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick },
        yaxis: { ...frameY, title: { text: "Models Out", font: plotAxisFont(palette.rgbAxisTitle, narrow) }, tickfont: axTick, gridcolor: palette.axisGridGreyRgb },
        hovermode: "closest", hoverlabel: hoverLabel,
      } as Partial<Layout>,
    };
  }, [filtered, narrow, palette, bg, axTick, hoverLabel, frameX, frameY]);

  const barRef = usePlotlyChart(barChart?.data ?? [], barChart?.layout ?? {}, { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>);
  const rveRef = usePlotlyChart(rawVsEffChart?.data ?? [], rawVsEffChart?.layout ?? {}, { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>);
  const moRef = usePlotlyChart(modelsOutChart?.data ?? [], modelsOutChart?.layout ?? {}, { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>);

  return (
    <div className="chart-card tr-section" id="derived-charts">
      <h2 className="tr-section-heading">Derived Visualizations</h2>
      <p className="hint">⚠ Charts below are derived from <code>batch_all_summary.json</code> and report CSVs — they supplement but do not replace original tool output.</p>

      {barChart && <div className="plot-host plot-host--tall"><div ref={barRef} style={{ width: "100%", height: "100%" }} /></div>}
      {rawVsEffChart && <div className="plot-host plot-host--tall"><div ref={rveRef} style={{ width: "100%", height: "100%" }} /></div>}
      {modelsOutChart && <div className="plot-host plot-host--tall"><div ref={moRef} style={{ width: "100%", height: "100%" }} /></div>}

      {/* Filtered table */}
      {summaryCsv && (
        <div style={{ marginTop: "0.75rem" }}>
          <h3 className="tr-subsection-title">Filtered Translation Table ({filtered.length || summaryCsv.rows.length} rows)</h3>
          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead><tr>{["PDK","Source","Target","Files","Successful","Failed","Success %","Models Out","Duration (ms)"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {(filtered.length > 0 ? filtered : summaryCsv.rows).map((r, i) => (
                  <tr key={i} className={parseFloat(r["Success %"] || "0") >= 100 ? "tr-row-ok" : parseFloat(r["Success %"] || "0") === 0 ? "tr-row-fail" : ""}>
                    <td><code>{r["PDK"]}</code></td><td>{r["Source"]}</td><td>{r["Target"]}</td>
                    <td className="tr-num">{r["Files"]}</td><td className="tr-num">{r["Successful"]}</td>
                    <td className="tr-num">{r["Success %"]}</td><td className="tr-num">{r["Models Out"]}</td>
                    <td className="tr-num">{r["Duration (ms)"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Hero ─── */
function HeroSection({ manifest }: { manifest: SpiceTranslatorManifest }) {
  const h = manifest.hero;
  return (
    <div className="tr-hero chart-card">
      <h1 className="tr-hero-title">SPICE Model Translator</h1>
      <p className="tr-hero-subtitle">Final Translation & Verification Report</p>
      <div className="tr-hero-kpis">
        <KpiCard label="PDKs Processed" value={h.pdks || "—"} />
        <KpiCard label="Source Files" value={h.sourceFiles || "—"} />
        <KpiCard label="Successful Translations" value={h.successfulTranslations || "—"} />
        <KpiCard label="Models Translated" value={h.modelsTranslated || "—"} />
        <KpiCard label="Verification" value={h.verification ? `${h.verification} passed` : "—"} />
        <KpiCard label="Round-Trip" value={h.roundTrip ? `${h.roundTrip} passed` : "—"} />
        <KpiCard label="Monte Carlo" value={h.monteCarlo ? `${h.monteCarlo} passed` : "—"} />
      </div>
      <div className="tr-hero-meta">
        <span>Source: <code>{manifest.sourceDir.split("/").slice(-1)[0]}</code></span>
        <span>Generated: {new Date(manifest.generatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return <div className="tr-kpi"><div className="tr-kpi-value">{value}</div><div className="tr-kpi-label">{label}</div></div>;
}

/* ─── Section renderer ─── */
function SectionBlock({ section }: { section: ReportSection }) {
  const html = useMemo(() => renderMarkdown(section.content), [section.content]);
  return (
    <div id={section.id} className="tr-md-section">
      {html ? <div className="tr-md" dangerouslySetInnerHTML={{ __html: html }} /> : null}
      {section.subsections.length > 0 && section.subsections.map(s => <SectionBlock key={s.id} section={s} />)}
    </div>
  );
}

/* ─── Plot Gallery ─── */
function PlotGallery({ manifest }: { manifest: SpiceTranslatorManifest }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (manifest.plots.length === 0) return null;
  return (
    <div className="chart-card tr-section" id="verification-plots">
      {lightbox && (
        <div className="tr-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
          <a href={lightbox} download className="benchmark-btn tr-lightbox-dl">Download Original</a>
        </div>
      )}
      <h2 className="tr-section-heading">Original Verification Plots <span className="hint">({manifest.plots.length})</span></h2>
      <div className="tr-plot-grid">
        {manifest.plots.map(p => p.displayUrl ? (
          <div key={p.relPath} className="tr-plot-card" onClick={() => setLightbox(BASE + p.displayUrl)}>
            <div className="tr-plot-img-wrap"><img src={BASE + p.displayUrl} alt={p.name} loading="lazy" /></div>
            <div className="tr-plot-info">
              <div><strong>{p.name}</strong></div>
              <div className="hint">{p.size} · {p.format.toUpperCase()} · <code>{p.hash}</code></div>
              <div className="hint"><code>{p.relPath}</code></div>
            </div>
          </div>
        ) : null)}
      </div>
    </div>
  );
}

/* ─── Artifacts table ─── */
function ArtifactTable({ manifest }: { manifest: SpiceTranslatorManifest }) {
  return (
    <div className="chart-card tr-section" id="artifacts">
      <h2 className="tr-section-heading">Artifacts & Reproducibility</h2>
      <p className="hint">Report hash: <code>{manifest.reportHash}</code>. All artifacts from <code>docs/finalbatchrun2/</code>.</p>
      <div className="tr-table-wrap">
        <table className="tr-table">
          <thead><tr><th>Name</th><th>Type</th><th>Path</th><th>Size</th><th>Hash</th></tr></thead>
          <tbody>
            {manifest.markdowns.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>report</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
            {manifest.csvs.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>CSV</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
            {manifest.jsons.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>JSON</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
            {manifest.plots.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>plot</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
            {manifest.texs.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>TEX</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Page                                                          */
/* ═══════════════════════════════════════════════════════════════════ */
export function SpiceTranslatorPage() {
  const manifest = TRANSLATOR_MANIFEST;
  const sections = useMemo(() => parseSections(manifest.reportMarkdown), [manifest.reportMarkdown]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Find named sub-sections for interleaving
  const execSummary = sections.find(s => s.title.toLowerCase().includes("executive summary"));
  const translationMetrics = sections.find(s => s.title.toLowerCase().includes("translation metrics"));
  const rawVsEffective = sections.find(s => s.title.toLowerCase().includes("raw vs effective") || s.title.toLowerCase().includes("fair-comparison"));
  const verification = sections.find(s => s.title.toLowerCase().includes("verification results") || s.title.toLowerCase().includes("verification metrics"));
  const confidence = sections.find(s => s.title.toLowerCase().includes("confidence tier"));
  const failure = sections.find(s => s.title.toLowerCase().includes("failure analysis") || s.title.toLowerCase().includes("failure summary"));

  // Remaining sections not explicitly placed
  const placed = new Set([execSummary, translationMetrics, rawVsEffective, verification, confidence, failure].filter(Boolean).map(s => s!.id));
  const remaining = sections.filter(s => !placed.has(s.id));
  const restContent = remaining.map(s => `\n## ${s.title}\n${s.content}`).join("\n");

  return (
    <div className="tr-page">
      {/* 1. Hero */}
      <HeroSection manifest={manifest} />

      {/* Filter bar */}
      <FilterBar csvs={manifest.csvs} filters={filters} setFilters={setFilters} />

      {/* 2. Executive Summary */}
      {execSummary && (
        <div className="chart-card tr-section" id="executive-summary">
          <h2 className="tr-section-heading">1. Executive Summary</h2>
          <SectionBlock section={execSummary} />
        </div>
      )}

      {/* 3. Translation Coverage */}
      <div className="chart-card tr-section" id="translation-coverage">
        <h2 className="tr-section-heading">2. Translation Coverage</h2>
        <DerivedCharts manifest={manifest} filters={filters} />
      </div>

      {/* 4. PDK Translation Results */}
      {translationMetrics && (
        <div className="chart-card tr-section" id="pdk-translation-results">
          <h2 className="tr-section-heading">3. PDK Translation Results</h2>
          <SectionBlock section={translationMetrics} />
        </div>
      )}

      {/* 5. Raw vs Effective Success */}
      {rawVsEffective && (
        <div className="chart-card tr-section" id="raw-vs-effective">
          <h2 className="tr-section-heading">4. Raw vs Effective Success</h2>
          <SectionBlock section={rawVsEffective} />
        </div>
      )}

      {/* 6. Verification Results */}
      {verification && (
        <div className="chart-card tr-section" id="verification-results">
          <h2 className="tr-section-heading">5. Verification Results</h2>
          <SectionBlock section={verification} />
        </div>
      )}

      {/* 7. Confidence Tier Ranking */}
      {confidence && (
        <div className="chart-card tr-section" id="confidence-tier">
          <h2 className="tr-section-heading">6. Confidence Tier Ranking</h2>
          <SectionBlock section={confidence} />
        </div>
      )}

      {/* 8. Failure Analysis */}
      {failure && (
        <div className="chart-card tr-section" id="failure-analysis">
          <h2 className="tr-section-heading">7. Failure Analysis</h2>
          <SectionBlock section={failure} />
        </div>
      )}

      {/* 9. Original Verification Plots */}
      <PlotGallery manifest={manifest} />

      {/* 10. Full Original Report (remaining sections) */}
      {restContent && (
        <div className="tr-report chart-card" id="full-report">
          <h2 className="tr-section-heading">8. Full Original Report</h2>
          <TOC sections={sections} />
          <div className="tr-md">
            {<div dangerouslySetInnerHTML={{ __html: renderMarkdown(manifest.reportMarkdown) }} />}
          </div>
        </div>
      )}

      {/* 11. Artifacts */}
      <ArtifactTable manifest={manifest} />
    </div>
  );
}
