import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { TRANSLATOR_MANIFEST } from "../data/generatedSpiceTranslatorManifest";
import type { TranslatorResult, PlotArtifact, PlotCaption } from "../data/SpiceTranslatorTypes";
import "../translator.css";

const BASE = import.meta.env.BASE_URL || "/";
const mdCache = new Map<string, string>();
const PAGE = 5;

/* ─── Paginated table ─── */
function PagedTable({ columns, rows }: { columns: string[]; rows: Record<string,string>[] }) {
  const [pg, setPg] = useState(0);
  const total = Math.ceil(rows.length / PAGE);
  const slice = rows.slice(pg * PAGE, (pg + 1) * PAGE);
  return (
    <div className="tr-paged-table">
      <div className="tr-paged-header"><span>Showing {slice.length} of {rows.length} rows</span>
        <div className="tr-paged-nav">
          <button className="benchmark-btn" disabled={pg===0} onClick={()=>setPg(0)}>««</button>
          <button className="benchmark-btn" disabled={pg===0} onClick={()=>setPg(p=>p-1)}>«</button>
          <span className="hint">Page {pg+1}/{total||1}</span>
          <button className="benchmark-btn" disabled={pg>=total-1} onClick={()=>setPg(p=>p+1)}>»</button>
          <button className="benchmark-btn" disabled={pg>=total-1} onClick={()=>setPg(total-1)}>»»</button>
        </div>
      </div>
      <div className="tr-table-wrap"><table className="tr-table">
        <thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead>
        <tbody>{slice.map((r,i)=><tr key={i}>{columns.map(c=><td key={c} className={/^[\d.\-%]+$/.test(r[c]||"")?"tr-num":""}>{r[c]||""}</td>)}</tr>)}</tbody>
      </table></div>
    </div>
  );
}

/* ─── Plot card with caption ─── */
function PlotCard({ plot, featured, onClick }: { plot: PlotArtifact; featured?: boolean; onClick: () => void }) {
  const c = plot.caption as PlotCaption | undefined;
  const wide = plot.aspectRatio && plot.aspectRatio > 1.8;
  return (
    <div className={`tr-plot-card ${featured?"tr-plot-card--featured":""} ${wide?"tr-plot-card--wide":""}`} onClick={onClick}>
      <div className="tr-plot-img"><img src={BASE + plot.displayUrl!} alt={c?.title || plot.name} loading="lazy" /></div>
      <div className="tr-plot-body">
        <strong className="tr-plot-title">{c?.title || plot.name}</strong>
        {c && <p className="tr-plot-what">{c.what}</p>}
        {c && <p className="tr-plot-why hint">{c.why}</p>}
        <div className="tr-plot-meta">
          {plot.scope && <span className="tr-badge">{plot.scope}</span>}
          <span className="hint">{plot.format?.toUpperCase()} · {plot.size} · {plot.width}×{plot.height}</span>
        </div>
        <details className="tr-plot-detail"><summary>Details</summary><code>{plot.relPath}</code> · hash: <code>{plot.hash}</code></details>
      </div>
    </div>
  );
}

/* ─── Lightbox ─── */
function Lightbox({ plots, index, onClose }: { plots: PlotArtifact[]; index: number; onClose: () => void }) {
  const [idx, setIdx] = useState(index); const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key==="Escape") onClose();
      if (e.key==="ArrowRight") setIdx(p=>Math.min(p+1,plots.length-1));
      if (e.key==="ArrowLeft") setIdx(p=>Math.max(p-1,0));
      if (e.key==="+"||e.key==="=") setZoom(z=>+(z+0.25).toFixed(2));
      if (e.key==="-") setZoom(z=>Math.max(0.25,+(z-0.25).toFixed(2)));
      if (e.key==="0") setZoom(1);
    };
    window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey);
  }, [plots.length, onClose]);
  const p = plots[idx]; if (!p?.displayUrl) return null;
  return (
    <div className="tr-lightbox" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <button className="tr-lightbox-close" onClick={onClose}>×</button>
      <div className="tr-lightbox-nav">
        <button disabled={idx===0} onClick={e=>{e.stopPropagation();setIdx(x=>Math.max(0,x-1));}}>‹</button>
        <span>{idx+1}/{plots.length}</span>
        <button disabled={idx>=plots.length-1} onClick={e=>{e.stopPropagation();setIdx(x=>Math.min(plots.length-1,x+1));}}>›</button>
      </div>
      <div className="tr-lightbox-zoom">
        <button onClick={()=>setZoom(z=>+(z-0.25).toFixed(2))}>−</button>
        <button onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button>
        <button onClick={()=>setZoom(z=>+(z+0.25).toFixed(2))}>+</button>
      </div>
      <img src={BASE+p.displayUrl} alt={p.name} style={{transform:`scale(${zoom})`,cursor:zoom>1?"zoom-out":"zoom-in"}} onClick={e=>{e.stopPropagation();setZoom(z=>z>1?1:2);}} />
      <div className="tr-lightbox-info"><strong>{(p.caption as PlotCaption)?.title||p.name}</strong><a href={BASE+p.displayUrl} download className="benchmark-btn">Download</a></div>
    </div>
  );
}

/* ─── Accordion report section ─── */
function ReportSection({ title, content, defaultOpen, plots }: { title: string; content: string; defaultOpen?: boolean; plots?: PlotArtifact[] }) {
  const [open, setOpen] = useState(defaultOpen||false);
  const preview = content.slice(0, 250);

  // Match relevant plots to this section by keyword overlap
  const sectionPlots = useMemo(() => {
    if (!plots || !title) return [];
    const tl = title.toLowerCase();
    const kw = {
      "executive summary": [],
      "translation metrics": ["summary","coverage","verification_summary"],
      "verification results": ["verification_summary","verification","_verif"],
      "failure": ["failure","error","_fail"],
      "dc analysis": ["idvgs","idvds","_iv","diode","resistor","gummel","bjt"],
      "ac analysis": ["sparameter","_sp","_cv","capacitance"],
      "transient": ["transient","_tran","switch"],
      "noise": ["noise","psd","flicker"],
    };
    const matched: string[] = [];
    for (const [section, words] of Object.entries(kw)) {
      if (tl.includes(section)) { matched.push(...words); break; }
    }
    if (matched.length===0) return [];
    return plots.filter(p => {
      const pn = p.name.toLowerCase();
      return matched.some(w => pn.includes(w));
    }).slice(0, 3);
  }, [title, plots]);

  return (
    <div className="tr-report-section">
      <h3 className="tr-report-section-title" onClick={()=>setOpen(!open)}>
        <span className="tr-accordion-icon">{open?"▾":"▸"}</span> {title}
        {sectionPlots.length>0 && <span className="hint" style={{marginLeft:"0.5rem",fontWeight:400}}>({sectionPlots.length} related plot{sectionPlots.length>1?"s":""})</span>}
      </h3>
      {!open && <div className="tr-md"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw,rehypeSanitize]}>{preview+"\n\n..."}</ReactMarkdown></div>}
      {open && <div className="tr-md"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw,rehypeSanitize]}
        components={{
          table:({children})=><div className="tr-table-wrap"><table className="tr-table">{children}</table></div>,
          th:({children})=><th>{children}</th>, td:({children})=><td>{children}</td>,
          code:({className,children}:any)=>className?.includes("language-")?<details className="tr-code-block"><summary>{className.replace("language-","")||"code"}</summary><pre><code className={className}>{children}</code></pre></details>:<code>{children}</code>,
          img:({src,alt}:any)=>{const pt=plots?.find(x=>src?.includes(x.name));return <img src={pt?.displayUrl?BASE+pt.displayUrl:src} alt={alt||""} loading="lazy" style={{maxWidth:"100%"}}/>;},
          a:({href,children}:any)=>{const pt=plots?.find(x=>href?.includes(x.name));return <a href={pt?.displayUrl?BASE+pt.displayUrl:href} target="_blank" rel="noopener">{children}</a>;},
        }}>{content}</ReactMarkdown>
        {/* Inline related plots */}
        {sectionPlots.length>0 && <div style={{marginTop:"0.75rem",borderTop:"1px solid var(--border)",paddingTop:"0.5rem"}}>
          <p className="hint" style={{marginBottom:"0.4rem"}}>📊 Related verification plots for this section:</p>
          <div className="tr-plot-gallery">{sectionPlots.map(p=><PlotCard key={`${p.scope||""}-${p.relPath}`} plot={p} onClick={()=>{}}/>)}</div>
        </div>}
      </div>}
      {!open && <button className="benchmark-btn tr-read-more" onClick={()=>setOpen(true)}>Read full section</button>}
    </div>
  );
}

/* ─── Selector ─── */
function Selector({ results, selectedId, onSelect }: { results: TranslatorResult[]; selectedId: string; onSelect: (id: string) => void }) {
  const batchR = results.filter(r=>r.kind==="batch"), pdkR = results.filter(r=>r.kind==="pdk_target"&&r.level===1), fileR = results.filter(r=>r.level===2);
  const sel = results.find(r=>r.resultId===selectedId);

  // Cascading: PDK → source/target → file
  const [cascadePdk, setCascadePdk] = useState(sel?.pdk||"");
  const [cascadeDir, setCascadeDir] = useState(sel?.kind==="pdk_target"?`${sel.sourceFormat}→${sel.targetFormat}`:"");
  const pdkList = [...new Set(pdkR.map(r=>r.pdk))].sort();
  const dirList = [...new Set(pdkR.filter(r=>r.pdk===cascadePdk).map(r=>`${r.sourceFormat}→${r.targetFormat}`))].sort();
  const fileList = fileR.filter(r=>r.pdk===cascadePdk);

  const onDirChange = (dir: string) => {
    setCascadeDir(dir);
    const match = pdkR.find(r=>r.pdk===cascadePdk&&`${r.sourceFormat}→${r.targetFormat}`===dir);
    if (match) onSelect(match.resultId);
  };

  return (
    <div className="chart-card tr-selector">
      <h2>Explore translation results</h2>
      <p className="hint">Select a result level, PDK, and direction — reports, plots, and tables update below.</p>
      <div className="tr-selector-grid">
        <label className="axis-picker">Result Level
          <select value={sel?.kind==="batch"?"batch":sel?.level===2?"file":"pdk"} onChange={e=>{
            if(e.target.value==="batch") onSelect(batchR[0]?.resultId||"");
            else {const first=pdkR[0]; if(first){setCascadePdk(first.pdk);setCascadeDir(`${first.sourceFormat}→${first.targetFormat}`);onSelect(first.resultId);}}
          }}>
            {batchR.length>0&&<option value="batch">Full Batch</option>}
            <option value="pdk">PDK / Target</option>
            {fileList.length>0&&<option value="file">Translation File</option>}
          </select>
        </label>
        {sel?.kind!=="batch"&&<label className="axis-picker">PDK<select value={cascadePdk} onChange={e=>{setCascadePdk(e.target.value);const d=pdkR.find(r=>r.pdk===e.target.value);if(d){setCascadeDir(`${d.sourceFormat}→${d.targetFormat}`);onSelect(d.resultId);}}}>{pdkList.map(p=><option key={p} value={p}>{p}</option>)}</select></label>}
        {sel?.kind==="pdk_target"&&sel.level===1&&<label className="axis-picker">Direction<select value={cascadeDir} onChange={e=>onDirChange(e.target.value)}>{dirList.map(d=><option key={d} value={d}>{d}</option>)}</select></label>}
        {sel?.level===2&&<span className="hint" style={{alignSelf:"center"}}>{sel.title} · {sel.summary.totalPlots} plots</span>}
      </div>
      <div className="tr-anchor-nav">
        <a href="#tr-highlights">Highlights</a> <a href="#tr-report">Report</a> <a href="#tr-tables">Tables</a> <a href="#tr-plots">Plots</a> <a href="#tr-artifacts">Artifacts</a>
      </div>
    </div>
  );
}

/* ─── Main ─── */
function Kpi({label,v}:{label:string;v:string}){return <div className="tr-kpi-sm"><span className="tr-kpi-sm-value">{v}</span><span className="tr-kpi-sm-label">{label}</span></div>;}

export function SpiceTranslatorPage() {
  const manifest = TRANSLATOR_MANIFEST;
  const [selectedId, setSelectedId] = useState(manifest.defaultResultId);
  const [lightboxIdx, setLightboxIdx] = useState<number|null>(null);
  const [expandAll, setExpandAll] = useState(false);

  const result = manifest.results.find(r=>r.resultId===selectedId);
  if (!result) return <div className="tr-page"><Selector results={manifest.results} selectedId={selectedId} onSelect={setSelectedId} /><div className="chart-card"><p className="hint">No result selected.</p></div></div>;

  const hasReport = result.reports.length>0 && result.reports[0].fetchUrl;
  const [mdContent, setMdContent] = useState<string|null>(hasReport?null:"");
  useEffect(() => {
    if (!hasReport) { setMdContent(""); return; }
    const url = BASE + result.reports[0].fetchUrl!;
    if (mdCache.has(url)) { setMdContent(mdCache.get(url)!); return; }
    let cancelled = false;
    fetch(url).then(r=>r.text()).then(t=>{if(!cancelled){mdCache.set(url,t);setMdContent(t);}});
    return ()=>{cancelled=true;};
  }, [selectedId]);

  const sections = useMemo(() => {
    if (!mdContent) return [];
    const secs: {title:string;content:string}[] = [];
    let t="Preamble", c="";
    for (const l of mdContent.split("\n")) { const h=l.match(/^##\s+(.+)/); if(h){if(c.trim())secs.push({title:t,content:c.trim()});t=h[1];c="";continue;} c+=l+"\n"; }
    if(c.trim())secs.push({title:t,content:c.trim()});
    return secs;
  }, [mdContent]);

  const featured = useMemo(() => {
    const v = result.plots.filter(x=>x.name.toLowerCase().includes("verification_summary"));
    const iv = result.plots.filter(x=>x.name.toLowerCase().includes("idvgs")||x.name.toLowerCase().includes("idvds"));
    return [...v.slice(0,2),...iv.slice(0,2)].slice(0,4);
  }, [result.plots]);

  const stats = result.summary.stats;
  const hero = result.summary.hero;

  return (
    <div className="tr-page">
      <Selector results={manifest.results} selectedId={selectedId} onSelect={setSelectedId} />

      {/* Compact header */}
      <div className="chart-card tr-compact-header">
        <div className="tr-compact-row">
          <div><h1 className="tr-compact-title">{result.title}</h1><p className="hint">{result.description}</p></div>
          <span className={`tr-badge tr-badge--${result.status}`}>{result.status}</span>
        </div>
        <div className="tr-compact-kpis">
          {result.kind==="batch"&&<>{hero?.pdks&&<Kpi label="PDKs" v={hero.pdks}/>}{hero?.sourceFiles&&<Kpi label="Files" v={hero.sourceFiles}/>}{hero?.successfulTranslations&&<Kpi label="Successful" v={hero.successfulTranslations}/>}{hero?.modelsTranslated&&<Kpi label="Models" v={hero.modelsTranslated}/>}{hero?.verification&&<Kpi label="Verification" v={hero.verification}/>}</>}
          {result.kind==="pdk_target"&&stats&&<>{stats.files&&<Kpi label="Files" v={stats.files}/>}{stats.successful&&<Kpi label="Successful" v={stats.successful}/>}{stats.rawSuccess&&<Kpi label="Raw Success" v={stats.rawSuccess+"%"}/>}{stats.effectiveSuccess&&<Kpi label="Effective" v={stats.effectiveSuccess+"%"}/>}{stats.modelsOut&&<Kpi label="Models Out" v={stats.modelsOut}/>}</>}
          <Kpi label="Reports" v={String(result.summary.totalReports)}/> <Kpi label="Plots" v={String(result.summary.totalPlots)}/>
        </div>
        <div className="tr-compact-meta">
          {result.pdk!=="all"&&<span>PDK: <code>{result.pdk}</code></span>}
          {result.kind==="pdk_target"&&<span>{result.sourceFormat} → {result.targetFormat}</span>}
          <span><span className="tr-badge">{result.kind}</span></span>
        </div>
      </div>

      {/* Visual Highlights FIRST */}
      {featured.length>0 && <div className="chart-card tr-section" id="tr-highlights">
        <h2 className="tr-section-heading">Visual Highlights</h2>
        <div className={`tr-featured-grid ${featured.length<=2?"tr-featured-grid--2":""}`}>
          {featured.map(p=><PlotCard key={`${p.scope||""}-${p.relPath}`} plot={p} featured onClick={()=>setLightboxIdx(result.plots.indexOf(p))}/>)}
        </div>
      </div>}

      {/* Report with accordion */}
      <div className="chart-card tr-section" id="tr-report">
        <div className="tr-report-header">
          <h2 className="tr-section-heading">{result.reports.length>0&&result.reports[0].isOriginal?"Original Report":"Generated Result Summary"}</h2>
          {sections.length>0&&<button className="benchmark-btn" onClick={()=>setExpandAll(e=>!e)}>{expandAll?"Collapse all":"Expand all report"}</button>}
          {hasReport&&<a href={BASE+result.reports[0].fetchUrl!} download className="benchmark-btn">⬇ Download MD</a>}
        </div>
        {hasReport&&mdContent===null?<p className="hint">Loading…</p>:
         hasReport&&mdContent===""?<p className="hint">Failed to load.</p>:
         hasReport&&sections.length>0?sections.map((s,i)=><ReportSection key={i} title={s.title} content={s.content} defaultOpen={expandAll||i===0} plots={result.plots}/>):
         !hasReport&&result.kind==="pdk_target"&&stats?<div className="tr-generated-summary"><p className="hint">⚠ No source Markdown report. Summary generated from CSV/JSON.</p><div className="tr-table-wrap"><table className="tr-table"><tbody>{Object.entries(stats).filter(([,v])=>v&&v!=="-").map(([k,v])=><tr key={k}><td style={{fontWeight:600}}>{k}</td><td>{v}</td></tr>)}</tbody></table></div></div>:
         <p className="hint">No report content.</p>}
      </div>

      {/* Paginated tables */}
      <div className="chart-card tr-section" id="tr-tables">
        <h2 className="tr-section-heading">Data Tables</h2>
        {result.dataArtifacts.filter(d=>d.columns&&d.columns.length>0&&d.rows&&d.rows.length>0).slice(0,3).map(d=><PagedTable key={d.relPath} columns={d.columns!} rows={d.rows||[]}/>)}
      </div>

      {/* Complete gallery */}
      {result.plots.length>0 && <div className="chart-card tr-section" id="tr-plots">
        <h2 className="tr-section-heading">Complete Plot Gallery <span className="hint">({result.plots.length})</span></h2>
        <div className="tr-plot-gallery">
          {result.plots.map(p=><PlotCard key={`${p.scope||""}-${p.relPath}`} plot={p} onClick={()=>setLightboxIdx(result.plots.indexOf(p))}/>)}
        </div>
      </div>}

      {/* Artifacts */}
      <div className="chart-card tr-section" id="tr-artifacts">
        <h2 className="tr-section-heading">Artifacts</h2>
        <PagedTable columns={["Name","Type","Path","Size","Hash"]}
          rows={[...result.reports.map(f=>({Name:f.name,Type:"report",Path:f.relPath,Size:f.size,Hash:f.hash})),...result.dataArtifacts.map(f=>({Name:f.name,Type:f.format,Path:f.relPath,Size:f.size,Hash:f.hash})),...result.plots.slice(0,20).map(f=>({Name:f.name,Type:"plot",Path:f.relPath,Size:f.size,Hash:f.hash}))]}/>
      </div>

      {lightboxIdx!==null && <Lightbox plots={result.plots} index={lightboxIdx} onClose={()=>setLightboxIdx(null)}/>}
    </div>
  );
}
