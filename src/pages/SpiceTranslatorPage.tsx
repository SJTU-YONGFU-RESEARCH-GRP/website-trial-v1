import { useState, useMemo } from "react";
import { TRANSLATOR_MANIFEST } from "../data/generatedSpiceTranslatorManifest";
import type { SpiceTranslatorManifest } from "../data/SpiceTranslatorTypes";
import { EmptyState } from "./flow/EmptyState";
import "../translator.css";

const BASE = import.meta.env.BASE_URL || "/";

/* ─── Simple Markdown renderer (safe, no raw HTML injection) ─── */
function MarkdownBlock({ md }: { md: string }) {
  const html = useMemo(() => renderMarkdown(md), [md]);
  return <div className="tr-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

function esc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  let out = "";
  let inCode = false, codeBuf = "", codeLang = "";
  let inTable = false, tableRows: string[] = [];
  let i = 0;

  const flushTable = () => {
    if (!inTable) return;
    out += '<div class="tr-table-wrap"><table class="tr-table">';
    tableRows.forEach((row, ri) => {
      const cells = row.split("|").slice(1, -1).map(c => c.trim());
      const tag = ri === 0 ? "th" : "td";
      out += "<tr>" + cells.map(c => {
        // Detect numeric alignment
        const isNum = /^[\d.,%+\-eE]+$/.test(c);
        return `<${tag}${isNum?' class="tr-num"':''}>${renderInline(c)}</${tag}>`;
      }).join("") + "</tr>";
    });
    out += "</table></div>";
    tableRows = [];
    inTable = false;
  };

  const flushCode = () => {
    out += `<details class="tr-code-block"><summary>${codeLang||"code"}</summary><pre><code>${esc(codeBuf)}</code></pre></details>`;
    codeBuf = ""; codeLang = ""; inCode = false;
  };

  const renderInline = (t: string) => {
    // Bold
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic
    t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // Inline code
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Links
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t;
  };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // Code fence
    if (t.startsWith("```")) {
      if (inCode) { flushCode(); i++; continue; }
      inCode = true; codeLang = t.slice(3).trim(); i++; continue;
    }
    if (inCode) { codeBuf += (codeBuf?"\n":"") + line; i++; continue; }

    // Table
    if (t.startsWith("|") && t.endsWith("|")) {
      if (/^\|[-:\s|]+\|$/.test(t)) { i++; continue; } // separator
      if (!inTable) { flushTable(); inTable = true; }
      tableRows.push(t);
      i++; continue;
    } else { flushTable(); }

    // Headings
    const h = t.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      const lvl = h[1].length;
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      out += `<h${lvl} id="${id}">${renderInline(h[2])}</h${lvl}>`;
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(t)) { out += "<hr/>"; i++; continue; }

    // Unordered list
    if (/^[-*+]\s+/.test(t)) {
      out += "<ul>";
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        out += `<li>${renderInline(lines[i].trim().replace(/^[-*+]\s+/,""))}</li>`;
        i++;
      }
      out += "</ul>";
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
      out += "<ol>";
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        out += `<li>${renderInline(lines[i].trim().replace(/^\d+\.\s+/,""))}</li>`;
        i++;
      }
      out += "</ol>";
      continue;
    }

    // Paragraph
    if (t) {
      out += `<p>${renderInline(t)}</p>`;
    }
    i++;
  }
  flushTable();
  flushCode();
  return out;
}

/* ─── Hero ─── */
function HeroSection({ manifest }: { manifest: SpiceTranslatorManifest }) {
  const h = manifest.hero;
  return (
    <div className="tr-hero chart-card">
      <h1 className="tr-hero-title">SPICE Model Translator</h1>
      <p className="tr-hero-subtitle">Final Translation & Verification Report</p>
      <div className="tr-hero-kpis">
        <KpiCard label="PDKs Processed" value={h.pdks||"—"} />
        <KpiCard label="Source Files" value={h.sourceFiles||"—"} />
        <KpiCard label="Successful Translations" value={h.successfulTranslations||"—"} />
        <KpiCard label="Models Translated" value={h.modelsTranslated||"—"} />
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
  return (
    <div className="tr-kpi">
      <div className="tr-kpi-value">{value}</div>
      <div className="tr-kpi-label">{label}</div>
    </div>
  );
}

/* ─── Derived Charts (Plotly placeholder — data-driven) ─── */
function DerivedCharts({ manifest }: { manifest: SpiceTranslatorManifest }) {
  const csv = manifest.csvs.find(c => c.name === "pdk_translation_summary.csv");
  if (!csv) return null;
  const rows = csv.rows;

  return (
    <div className="chart-card tr-section">
      <h2 className="tr-section-heading">Derived Visualizations</h2>
      <p className="hint">Charts derived from <code>batch_all_summary.json</code> and reports CSV. These are supplementary — original tool plots are shown below.</p>

      {/* PDK × target success table (lightweight, no Plotly JS for now) */}
      <h3 className="tr-subsection-title">Translation Success by PDK & Target</h3>
      <div className="tr-table-wrap">
        <table className="tr-table">
          <thead><tr><th>PDK</th><th>Source</th><th>Target</th><th>Files</th><th>Success</th><th>%</th><th>Models Out</th><th>Duration (ms)</th></tr></thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i} className={parseFloat(r["Success %"]||"0")>=100?"tr-row-ok":parseFloat(r["Success %"]||"0")===0?"tr-row-fail":""}>
                <td><code>{r["PDK"]}</code></td><td>{r["Source"]}</td><td>{r["Target"]}</td>
                <td className="tr-num">{r["Files"]}</td><td className="tr-num">{r["Successful"]}</td>
                <td className="tr-num">{r["Success %"]}</td><td className="tr-num">{r["Models Out"]}</td>
                <td className="tr-num">{r["Duration (ms)"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="hint" style={{marginTop:"0.25rem"}}>⚠ Derived visualization — original tool images follow below.</p>
    </div>
  );
}

/* ─── Plot Gallery ─── */
function PlotGallery({ manifest }: { manifest: SpiceTranslatorManifest }) {
  const [lightbox, setLightbox] = useState<string|null>(null);
  if (manifest.plots.length === 0) return null;
  return (
    <div className="chart-card tr-section">
      {lightbox && (
        <div className="tr-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
          <a href={lightbox} download className="benchmark-btn tr-lightbox-dl">Download</a>
        </div>
      )}
      <h2 className="tr-section-heading">Original Verification Plots</h2>
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

/* ─── Main Page ─── */
export function SpiceTranslatorPage() {
  const manifest = TRANSLATOR_MANIFEST;

  return (
    <div className="tr-page">
      <HeroSection manifest={manifest} />

      {/* Full original report */}
      <div className="tr-report chart-card">
        <h2 className="tr-section-heading">Full Original Report</h2>
        <div className="tr-md">
          {manifest.reportMarkdown ? <MarkdownBlock md={manifest.reportMarkdown} /> : <EmptyState message="Report not available" />}
        </div>
      </div>

      {/* Derived charts */}
      <DerivedCharts manifest={manifest} />

      {/* Original verification plots */}
      <PlotGallery manifest={manifest} />

      {/* Artifacts */}
      <div className="chart-card tr-section">
        <h2 className="tr-section-heading">Artifacts & Reproducibility</h2>
        <p className="hint">All source files indexed from the final batch run. Report hash: <code>{manifest.reportHash}</code>.</p>
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
    </div>
  );
}
