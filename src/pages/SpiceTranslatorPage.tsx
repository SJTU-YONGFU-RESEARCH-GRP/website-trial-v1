import { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TRANSLATOR_MANIFEST } from "../data/generatedSpiceTranslatorManifest";
import type { TranslatorResult } from "../data/SpiceTranslatorTypes";
import "../translator.css";

const BASE = import.meta.env.BASE_URL || "/";

/* ─── Text cache for lazy-loaded markdown ─── */
const mdCache = new Map<string, string>();

/* ═══════════════════════════════════════════════════════════════════ */
/*  Result Selector                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

function ResultSelector({ results, selectedId, onSelect, filters, setFilter }: {
  results: TranslatorResult[]; selectedId: string; onSelect: (id: string) => void;
  filters: Record<string, string>; setFilter: (k: string, v: string) => void;
}) {
  const manifest = TRANSLATOR_MANIFEST;
  const batchResults = results.filter(r => r.kind === "batch");
  const pdkResults = results.filter(r => r.kind === "pdk_target");
  const verifResults = results.filter(r => r.kind === "verification");

  const set = (k: string, v: string) => setFilter(k, v);

  return (
    <div className="chart-card tr-selector">
      <h2>Explore translation results</h2>
      <p className="hint">Select a result to view its complete report and original plots.</p>
      <div className="tr-selector-grid">
        <label className="axis-picker">Result
          <select value={selectedId} onChange={e => onSelect(e.target.value)}>
            {batchResults.length > 0 && <optgroup label="Batch Summary">{batchResults.map(r => <option key={r.resultId} value={r.resultId}>{r.title}</option>)}</optgroup>}
            {pdkResults.length > 0 && <optgroup label="PDK / Target Results">{pdkResults.map(r => <option key={r.resultId} value={r.resultId}>{r.pdk}: {r.sourceFormat} → {r.targetFormat}</option>)}</optgroup>}
            {verifResults.length > 0 && <optgroup label="Verification Results">{verifResults.map(r => <option key={r.resultId} value={r.resultId}>{r.title}</option>)}</optgroup>}
          </select>
        </label>
        <label className="axis-picker">PDK<select value={filters.pdk || ""} onChange={e => set("pdk", e.target.value)}><option value="">All</option>{manifest.allPdks.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <label className="axis-picker">Source<select value={filters.source || ""} onChange={e => set("source", e.target.value)}><option value="">All</option>{manifest.allSourceFormats.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="axis-picker">Target<select value={filters.target || ""} onChange={e => set("target", e.target.value)}><option value="">All</option>{manifest.allTargetFormats.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="axis-picker">Type<select value={filters.kind || ""} onChange={e => set("kind", e.target.value)}><option value="">All</option><option value="batch">Batch Summary</option><option value="pdk_target">PDK / Target</option><option value="verification">Verification</option></select></label>
        <label className="axis-picker">Search<input type="text" value={filters.search || ""} onChange={e => set("search", e.target.value)} placeholder="Search..." className="tr-search-input" /></label>
      </div>

      {/* Anchor nav */}
      <div className="tr-anchor-nav">
        <a href="#tr-reports" onClick={e => { e.preventDefault(); document.getElementById("tr-reports")?.scrollIntoView({ behavior: "smooth" }); }}>Reports</a>
        <a href="#tr-plots" onClick={e => { e.preventDefault(); document.getElementById("tr-plots")?.scrollIntoView({ behavior: "smooth" }); }}>Plots</a>
        <a href="#tr-artifacts" onClick={e => { e.preventDefault(); document.getElementById("tr-artifacts")?.scrollIntoView({ behavior: "smooth" }); }}>Artifacts</a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Lightbox (prev/next, keyboard, zoom)                                */
/* ═══════════════════════════════════════════════════════════════════ */

function Lightbox({ plots, index, onClose }: { plots: { displayUrl: string | null; name: string }[]; index: number; onClose: () => void }) {
  const [idx, setIdx] = useState(index);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx(p => Math.min(p + 1, plots.length - 1));
      if (e.key === "ArrowLeft") setIdx(p => Math.max(p - 1, 0));
      if (e.key === "+" || e.key === "=") setZoom(z => +(z + 0.25).toFixed(2));
      if (e.key === "-") setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)));
      if (e.key === "0") setZoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plots.length, onClose]);

  const plot = plots[idx];
  if (!plot?.displayUrl) return null;

  return (
    <div className="tr-lightbox" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="tr-lightbox-close" onClick={onClose}>×</button>
      <div className="tr-lightbox-nav">
        <button disabled={idx === 0} onClick={e => { e.stopPropagation(); setIdx(p => Math.max(0, p - 1)); }}>‹</button>
        <span>{idx + 1} / {plots.length}</span>
        <button disabled={idx >= plots.length - 1} onClick={e => { e.stopPropagation(); setIdx(p => Math.min(plots.length - 1, p + 1)); }}>›</button>
      </div>
      <div className="tr-lightbox-zoom">
        <button onClick={() => setZoom(z => +(z - 0.25).toFixed(2))}>−</button>
        <button onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button onClick={() => setZoom(z => +(z + 0.25).toFixed(2))}>+</button>
        <button onClick={() => imgRef.current?.requestFullscreen?.()}>⛶</button>
      </div>
      <img ref={imgRef} src={BASE + plot.displayUrl} alt={plot.name} style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
        onClick={e => { e.stopPropagation(); setZoom(z => z > 1 ? 1 : 2); }} />
      <div className="tr-lightbox-info">
        <strong>{plot.name}</strong>
        <a href={BASE + plot.displayUrl} download className="benchmark-btn">Download</a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Markdown report (with react-markdown)                               */
/* ═══════════════════════════════════════════════════════════════════ */

function isHeading(part: string): boolean { return /^#{1,6}\s/.test(part); }

function TOC({ content }: { content: string }) {
  const headings = content.split("\n").filter(isHeading).map(h => {
    const m = h.match(/^(#{1,6})\s+(.+)/);
    if (!m) return null;
    const lvl = m[1].length;
    const title = m[2];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return { lvl, title, id };
  }).filter(Boolean) as { lvl: number; title: string; id: string }[];

  if (headings.length === 0) return null;
  return (
    <details className="tr-toc-mobile">
      <summary>Table of Contents</summary>
      <ul className="tr-toc-list">
        {headings.map(h => (
          <li key={h.id} style={{ paddingLeft: `${(h.lvl - 1) * 0.75}rem` }}>
            <a href={`#${h.id}`}>{h.title}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MarkdownReport({ report, result }: { report: TranslatorResult["reports"][0]; result: TranslatorResult }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!report.fetchUrl) { setContent(null); return; }
    const url = BASE + report.fetchUrl;
    if (mdCache.has(url)) { setContent(mdCache.get(url)!); return; }
    let cancelled = false;
    fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); }).then(t => {
      if (!cancelled) { mdCache.set(url, t); setContent(t); }
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [report.fetchUrl]);

  if (error) return <div className="tr-report-error">⚠ Failed to load: {error}</div>;
  if (content === null) return <div className="tr-report-loading">Loading report…</div>;

  return (
    <div className="tr-report-doc">
      <TOC content={content} />
      <div className="tr-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => <div className="tr-table-wrap"><table className="tr-table">{children}</table></div>,
            th: ({ children }) => <th>{children}</th>,
            td: ({ children }) => <td>{children}</td>,
            code: ({ className, children }: any) => {
              const isBlock = /language-/.test(className || "");
              if (isBlock) {
                const lang = (className || "").replace("language-", "");
                return (
                  <details className="tr-code-block">
                    <summary>{lang || "code"}</summary>
                    <pre><code className={className}>{children}</code></pre>
                  </details>
                );
              }
              return <code>{children}</code>;
            },
            a: ({ href, children }: any) => {
              // Rewrite relative image links to public URLs
              if (href && /\.(png|svg|jpg|jpeg)$/i.test(href) && !href.startsWith("http")) {
                const plot = result.plots.find(p => href.includes(p.name) || p.relPath.includes(href));
                const url = plot?.displayUrl ? BASE + plot.displayUrl : href;
                return <a href={url} target="_blank" rel="noopener">{children}</a>;
              }
              return <a href={href} target="_blank" rel="noopener">{children}</a>;
            },
            img: ({ src, alt }: any) => {
              if (src && !src.startsWith("http")) {
                const plot = result.plots.find(p => src.includes(p.name) || p.relPath.includes(src));
                src = plot?.displayUrl ? BASE + plot.displayUrl : src;
              }
              return <img src={src} alt={alt || ""} loading="lazy" style={{ maxWidth: "100%" }} />;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Plot Gallery                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

function PlotGalleryBlock({ result }: { result: TranslatorResult }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (result.plots.length === 0) return <p className="hint" style={{ padding: "1rem" }}>No plot images for this result.</p>;

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox plots={result.plots.map(p => ({ displayUrl: p.displayUrl, name: p.name }))} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      <div className="tr-plot-gallery">
        {result.plots.map((p, i) => {
          const isWide = p.aspectRatio && p.aspectRatio > 1.8;
          return (
            <div key={p.relPath} className={`tr-plot-card ${isWide ? "tr-plot-card--wide" : ""}`} onClick={() => setLightboxIdx(i)}>
              <div className="tr-plot-card-header">
                <strong className="tr-plot-card-title">{p.name}</strong>
                <span className="hint">{p.format?.toUpperCase()} · {p.size} · {p.width}×{p.height}</span>
              </div>
              <div className="tr-plot-card-img">
                {p.displayUrl ? <img src={BASE + p.displayUrl} alt={p.name} loading="lazy" /> : <span className="hint">No preview</span>}
              </div>
              <details className="tr-plot-card-detail">
                <summary>Details</summary>
                <div className="hint"><code>{p.relPath}</code><br />Hash: <code>{p.hash}</code></div>
              </details>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  KPI card                                                           */
/* ═══════════════════════════════════════════════════════════════════ */

function KpiCard({ label, value }: { label: string; value: string }) {
  return <div className="tr-kpi"><div className="tr-kpi-value">{value}</div><div className="tr-kpi-label">{label}</div></div>;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Page                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

export function SpiceTranslatorPage() {
  const manifest = TRANSLATOR_MANIFEST;
  const [selectedId, setSelectedId] = useState(manifest.defaultResultId || manifest.results[0]?.resultId || "");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Apply filters
  const filteredResults = useMemo(() => {
    let list = manifest.results;
    if (filters.pdk) list = list.filter(r => r.pdk === filters.pdk || r.pdk === "all");
    if (filters.source) list = list.filter(r => r.sourceFormat === filters.source || r.sourceFormat === "all");
    if (filters.target) list = list.filter(r => r.targetFormat === filters.target || r.targetFormat === "all");
    if (filters.kind) list = list.filter(r => r.kind === filters.kind);
    if (filters.search) { const s = filters.search.toLowerCase(); list = list.filter(r => r.title.toLowerCase().includes(s) || r.pdk.toLowerCase().includes(s)); }
    return list;
  }, [manifest.results, filters]);

  const result = manifest.results.find(r => r.resultId === selectedId);
  if (!result) {
    return (
      <div className="tr-page">
        <ResultSelector results={filteredResults} selectedId={selectedId} onSelect={setSelectedId} filters={filters} setFilter={(k, v) => setFilters(p => ({ ...p, [k]: v }))} />
        <div className="chart-card"><p className="hint">No result selected. Choose a result above to view its reports and plots.</p></div>
      </div>
    );
  }

  const hero = result.summary.hero || {};
  const pdks = hero.pdks || (result.pdk !== "all" ? "" : "17");

  return (
    <div className="tr-page">
      {/* 1. Selector */}
      <ResultSelector results={filteredResults} selectedId={selectedId} onSelect={setSelectedId} filters={filters} setFilter={(k, v) => setFilters(p => ({ ...p, [k]: v }))} />

      {/* 2. Hero/Summary */}
      <div className="chart-card tr-hero">
        <h1 className="tr-hero-title">{result.title}</h1>
        <p className="tr-hero-subtitle">{result.description}</p>
        <div className="tr-hero-kpis">
          {result.kind === "batch" && (
            <>
              {pdks && <KpiCard label="PDKs" value={pdks} />}
              {hero.sourceFiles && <KpiCard label="Source Files" value={hero.sourceFiles} />}
              {hero.successfulTranslations && <KpiCard label="Successful" value={hero.successfulTranslations} />}
              {hero.modelsTranslated && <KpiCard label="Models" value={hero.modelsTranslated} />}
              {hero.verification && <KpiCard label="Verification" value={hero.verification} />}
              {hero.roundTrip && <KpiCard label="Round-Trip" value={hero.roundTrip} />}
              {hero.monteCarlo && <KpiCard label="Monte Carlo" value={hero.monteCarlo} />}
            </>
          )}
          {result.kind === "pdk_target" && (
            <>
              <KpiCard label="PDK" value={result.pdk} />
              <KpiCard label="Source" value={result.sourceFormat} />
              <KpiCard label="Target" value={result.targetFormat} />
            </>
          )}
          <KpiCard label="Reports" value={String(result.summary.totalReports)} />
          <KpiCard label="Plots" value={String(result.summary.totalPlots)} />
          <KpiCard label="Data Files" value={String(result.summary.totalData)} />
        </div>
        <div className="tr-hero-meta">
          <span><span className="tr-badge">{result.kind}</span></span>
          {result.pdk !== "all" && <span>PDK: <code>{result.pdk}</code></span>}
          <span>Status: {result.status}</span>
          <span>Generated: {result.generatedAt}</span>
        </div>
      </div>

      {/* 3. Full Reports */}
      <div className="chart-card tr-section" id="tr-reports">
        <h2 className="tr-section-heading">Full Reports <span className="hint">({result.reports.length})</span></h2>
        {result.reports.length === 0 ? (
          <p className="hint" style={{ padding: "1rem" }}>No source Markdown report available for this result.</p>
        ) : (
          result.reports.map((rpt, _i) => (
            <div key={rpt.relPath} className="tr-report-entry">
              {result.reports.length > 1 && (
                <div className="tr-report-separator">
                  <strong>{rpt.name}</strong>
                  <span className="hint">{rpt.size} · <code>{rpt.hash}</code></span>
                </div>
              )}
              <MarkdownReport report={rpt} result={result} />
            </div>
          ))
        )}
      </div>

      {/* 4. Original Plots */}
      <div className="chart-card tr-section" id="tr-plots">
        <h2 className="tr-section-heading">Original Plots <span className="hint">({result.plots.length})</span></h2>
        <PlotGalleryBlock result={result} />
      </div>

      {/* 5. Artifacts */}
      <div className="chart-card tr-section" id="tr-artifacts">
        <h2 className="tr-section-heading">Artifacts</h2>
        <div className="tr-table-wrap">
          <table className="tr-table">
            <thead><tr><th>Name</th><th>Type</th><th>Path</th><th>Size</th><th>Hash</th></tr></thead>
            <tbody>
              {result.reports.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>report</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
              {result.dataArtifacts.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>{f.format}</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
              {result.plots.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>plot</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
              {result.otherArtifacts.map(f => <tr key={f.relPath}><td><code>{f.name}</code></td><td>{f.format || "other"}</td><td><code>{f.relPath}</code></td><td>{f.size}</td><td><code>{f.hash}</code></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
