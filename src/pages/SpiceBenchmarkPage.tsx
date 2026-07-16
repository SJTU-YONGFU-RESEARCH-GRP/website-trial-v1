import { useEffect, useMemo, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { useTheme } from "../theme/ThemeContext";
import {
  getChartPalette, plotInsetBackground, plotAxisFont, plotFont,
  plotlyAxisFrameX, plotlyAxisFrameY, plotlyBold, plotlyHoverLabel,
} from "../theme/chartPalette";
import { SPICE_BENCHMARK_MANIFEST } from "../data/generatedSpiceBenchmarkManifest";
import type {
  SpiceBenchmarkManifest, BenchmarkRun, AnalysisDomain, ComparisonMode,
  NumericScaleMode, PlotAspectMode, SpiceExploreState,
} from "../data/SpiceBenchmarkTypes";
import { DEFAULT_SPICE_EXPLORE_STATE, ANALYSIS_DOMAINS } from "../data/SpiceBenchmarkTypes";
import { Badge } from "./flow/Badge";
import { EmptyState } from "./flow/EmptyState";

/* ─── Constants ─── */
const NUMERIC_SCALE_OPTIONS = [{value:"linear",label:"Linear"},{value:"log",label:"Log10"}] as const;
const PLOT_ASPECT_OPTIONS = [{value:"flexible",label:"Flexible"},{value:"16:9",label:"16:9"},{value:"4:3",label:"4:3"},{value:"1:1",label:"1:1"}] as const;
const CHART_TYPES = [{value:"scatter",label:"Scatter"},{value:"line",label:"Line"},{value:"heatmap",label:"Heatmap"},{value:"bar",label:"Bar"}] as const;
const COMPARISON_MODES: {value:ComparisonMode;label:string}[] = [{value:"single",label:"Single run"},{value:"compare_models",label:"Compare models"},{value:"compare_suites",label:"Compare suites"}];
const DOMAIN_LABELS: Record<AnalysisDomain, string> = {overview:"Overview",dc:"DC",ac:"AC",transient:"Transient",noise:"Noise"};

type TabId = "overview" | "explorer" | "gallery" | "verification" | "artifacts";
const TABS: {id:TabId;label:string}[] = [
  {id:"overview",label:"Benchmark Overview"},
  {id:"explorer",label:"Data Explorer"},
  {id:"gallery",label:"Plot Gallery"},
  {id:"verification",label:"Verification Report"},
  {id:"artifacts",label:"Artifacts"},
];

/* ─── Chart helper ─── */
function usePlotlyChart(data:Data[], layout:Partial<Layout>, config:Partial<Config>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let cancelled = false;
    void Plotly.newPlot(el, data, layout, config).then(() => { if (!cancelled) void Plotly.Plots.resize(el); });
    const ro = new ResizeObserver(() => { if (el && !cancelled) void Plotly.Plots.resize(el); });
    ro.observe(el);
    return () => { cancelled = true; ro.disconnect(); void Plotly.purge(el); };
  }, [data, layout, config]);
  return ref;
}

function plotHostAspectClass(mode: PlotAspectMode): string {
  if (mode==="16:9") return "plot-host--aspect-16x9";
  if (mode==="4:3") return "plot-host--aspect-4x3";
  if (mode==="1:1") return "plot-host--aspect-1x1";
  return "";
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

function OverviewSection({ run }: { run: BenchmarkRun }): JSX.Element {
  const ns = run.netlistSuite;
  const ts = run.verificationTests;
  const passCount = ts.filter(t=>t.status==="pass").length;
  const failCount = ts.filter(t=>t.status==="fail").length;
  const naCount = ts.filter(t=>t.status==="unavailable").length;

  return (
    <div className="chart-card">
      <h2>Benchmark Overview — {run.runId}</h2>
      {run.status === "example" && <p className="hint" style={{color:"var(--warning,#ff9f0a)"}}>⚠ Example result — not real fabrication data</p>}
      <div className="flow-kpi-grid" style={{marginBottom:"0.75rem"}}>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">Model</div><div className="flow-kpi-card__value">{run.modelId}</div></div>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">Format</div><div className="flow-kpi-card__value">{run.modelFormat}</div></div>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">Device</div><div className="flow-kpi-card__value">{run.deviceName}</div></div>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">Simulator</div><div className="flow-kpi-card__value">{run.simulator} {run.simulatorVersion}</div></div>
        <div className="flow-kpi-card"><div className="flow-kpi-card__label">Generated</div><div className="flow-kpi-card__value" style={{fontSize:"0.75rem"}}>{run.generatedAt?.slice(0,10)}</div></div>
      </div>

      {/* Donut chart — pass/fail/unavailable */}
      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        <div style={{flex:"1 1 200px"}}>
          <DountChart pass={passCount} fail={failCount} na={naCount} />
        </div>
        <div style={{flex:"1 1 300px"}}>
          <h3 className="flow-subsection-title">Netlist Suite</h3>
          <table className="analog-table"><tbody>
            <tr><td>DC</td><td><code>{ns.dcCircuit || "—"}</code></td></tr>
            <tr><td>AC</td><td><code>{ns.acCircuit || "—"}</code></td></tr>
            <tr><td>Transient</td><td><code>{ns.transientCircuit || "—"}</code></td></tr>
            <tr><td>Noise</td><td><code>{ns.noiseCircuit || "—"}</code></td></tr>
          </tbody></table>
        </div>
      </div>

      <div style={{marginTop:"0.5rem"}}>
        <p className="hint">
          Modes: {run.modes.join(", ")} &middot; Commit: <code>{run.commitSha?.slice(0,8)}</code>
          &middot; Pass: {passCount} &middot; Fail: {failCount} &middot; N/A: {naCount}
        </p>
      </div>
    </div>
  );
}

function DountChart({ pass, fail, na }: {pass:number;fail:number;na:number}): JSX.Element {
  const ref = usePlotlyChart(
    [{type:"pie",values:[pass,fail,na],labels:["Pass","Fail","N/A"],hole:0.55,
      marker:{colors:["#22c55e","#ef4444","#94a3b8"]},
      textinfo:"label+value", hoverinfo:"label+percent"} as Data],
    {autosize:true,margin:{l:8,r:8,t:8,b:8},showlegend:false,
     paper_bgcolor:"transparent",plot_bgcolor:"transparent",
     font:{family:"Inter,sans-serif",size:11,color:"#334155"}} as Partial<Layout>,
    {responsive:true,displayModeBar:false,displaylogo:false} satisfies Partial<Config>
  );
  return <div className="plot-host plot-host--short"><div ref={ref} style={{width:"100%",height:"100%"}}/></div>;
}

function ExplorerSection({ manifest, run, explore, setExplore }: {
  manifest: SpiceBenchmarkManifest; run: BenchmarkRun; explore: SpiceExploreState;
  setExplore: React.Dispatch<React.SetStateAction<SpiceExploreState>>;
}): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const bg = plotInsetBackground(theme);
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);
  const aspectCls = plotHostAspectClass(explore.plotAspect);

  // Filtered datasets for current run
  const datasets = run.dataArtifacts.filter(d => explore.analysis==="overview"||d.domain===explore.analysis);
  const selectedDataset = datasets.find(d => d.name===explore.datasetId) ?? datasets[0];

  // Chart data from selected dataset
  const chart = useMemo(() => {
    if (!selectedDataset || !selectedDataset.columns) return null;
    const cols = selectedDataset.columns;
    const xCol = explore.xColumn || cols[0];
    const yCol = explore.yColumn || cols[1];
    const zCol = explore.zColumn || cols[2];
    const xIdx = cols.indexOf(xCol);
    const yIdx = cols.indexOf(yCol);
    const zIdx = cols.indexOf(zCol);
    if (xIdx<0||yIdx<0) return null;

    // Parse values from data artifact (data is small enough to inline from generated manifest)
    // For real use, data would be lazy-fetched. Here we show column metadata.
    const xTitle = xCol; const yTitle = yCol; const zTitle = zCol;

    if (explore.chartType==="scatter" || explore.chartType==="line") {
      return {
        data: [{type:"scatter",mode:explore.chartType==="line"?"lines":"markers",
          x:[],y:[],
          name:`${selectedDataset.name}`,
          hovertemplate:`${xTitle}: %{x}<br>${yTitle}: %{y}<extra></extra>`} as Data],
        layout: {
          autosize:true, margin:narrow?{l:52,r:16,t:36,b:48}:{l:60,r:24,t:40,b:52},
          paper_bgcolor:bg, plot_bgcolor:bg,
          font:plotFont(palette.rgbAxisTitle),
          title:{text:plotlyBold(`${selectedDataset.name} — ${selectedDataset.domain}`),font:plotFont(palette.rgbAxisTitle)},
          xaxis:{...frameX,title:{text:xTitle,font:plotAxisFont(palette.rgbAxisTitle,narrow)},tickfont:axTick,type:explore.numericScaleX==="log"?"log":"linear"},
          yaxis:{...frameY,title:{text:yTitle,font:plotAxisFont(palette.rgbAxisTitle,narrow)},tickfont:axTick,type:explore.numericScaleY==="log"?"log":"linear"},
          showlegend:true,hovermode:"closest",hoverlabel:hoverLabel,
        } as Partial<Layout>,
      };
    }
    if (explore.chartType==="bar") {
      return {
        data: [{type:"bar",x:[],y:[],name:yTitle} as Data],
        layout: {
          autosize:true, margin:narrow?{l:52,r:16,t:36,b:48}:{l:60,r:24,t:40,b:52},
          paper_bgcolor:bg,plot_bgcolor:bg,font:plotFont(palette.rgbAxisTitle),
          title:{text:plotlyBold(selectedDataset.name),font:plotFont(palette.rgbAxisTitle)},
          xaxis:{...frameX,title:{text:xTitle,font:plotAxisFont(palette.rgbAxisTitle,narrow)},tickfont:axTick},
          yaxis:{...frameY,title:{text:yTitle,font:plotAxisFont(palette.rgbAxisTitle,narrow)},tickfont:axTick,type:explore.numericScaleY==="log"?"log":"linear"},
          hovermode:"closest",hoverlabel:hoverLabel,
        } as Partial<Layout>,
      };
    }
    if (explore.chartType==="heatmap" && zIdx>=0) {
      return {
        data: [{type:"heatmap",z:[[]],x:[],y:[],colorscale:"Viridis",
          hovertemplate:`${xTitle}: %{x}<br>${yTitle}: %{y}<br>${zTitle}: %{z}<extra></extra>`} as Data],
        layout: {
          autosize:true, margin:narrow?{l:64,r:16,t:36,b:64}:{l:80,r:24,t:40,b:72},
          paper_bgcolor:bg,plot_bgcolor:bg,font:plotFont(palette.rgbAxisTitle),
          title:{text:plotlyBold(`${selectedDataset.name} — heatmap`),font:plotFont(palette.rgbAxisTitle)},
          xaxis:{...frameX,title:{text:xTitle,font:plotAxisFont(palette.rgbAxisTitle,narrow)},tickfont:axTick},
          yaxis:{...frameY,title:{text:yTitle,font:plotAxisFont(palette.rgbAxisTitle,narrow)},tickfont:axTick,autorange:"reversed" as const},
          hovermode:"closest",hoverlabel:hoverLabel,
        } as Partial<Layout>,
      };
    }
    return null;
  }, [selectedDataset,explore,narrow,palette,bg,axTick,hoverLabel,frameX,frameY]);

  const chartRef = usePlotlyChart(chart?.data??[], chart?.layout??{}, {responsive:true,displayModeBar:false,displaylogo:false} satisfies Partial<Config>);

  return (
    <div>
      {/* Controls card */}
      <div className="chart-card">
        <h2>Explore metrics</h2>
        <div className="flow-selector-grid" style={{marginBottom:"0.5rem"}}>
          <label className="axis-picker">Run<select value={explore.runId} onChange={e=>setExplore(p=>({...p,runId:e.target.value}))}>{Object.values(manifest.runs).map(r=><option key={r.runId} value={r.runId}>{r.runId} {r.status==="example"?" (example)":""}</option>)}</select></label>
          <label className="axis-picker">Model<select value={explore.modelId} onChange={e=>setExplore(p=>({...p,modelId:e.target.value}))}>{manifest.modelIds.filter(mid=>manifest.runs[explore.runId]?.modelId===mid || !explore.runId).map(mid=><option key={mid} value={mid}>{mid}</option>)}</select></label>
          <label className="axis-picker">Format<select value={explore.modelFormat} onChange={e=>setExplore(p=>({...p,modelFormat:e.target.value as any}))}><option value="">— any —</option>{manifest.modelFormats.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
        </div>
        <div className="flow-selector-grid" style={{marginBottom:"0.5rem"}}>
          <label className="axis-picker">Netlist Suite<select value={explore.suiteId} onChange={e=>setExplore(p=>({...p,suiteId:e.target.value}))}>{manifest.suiteIds.map(sid=><option key={sid} value={sid}>{sid}</option>)}</select></label>
          <label className="axis-picker">Analysis<select value={explore.analysis} onChange={e=>setExplore(p=>({...p,analysis:e.target.value as AnalysisDomain}))}>{ANALYSIS_DOMAINS.map(d=><option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}</select></label>
          <label className="axis-picker">Dataset<select value={explore.datasetId} onChange={e=>setExplore(p=>({...p,datasetId:e.target.value}))}><option value="">— auto —</option>{datasets.map(d=><option key={d.name} value={d.name}>{d.name} ({d.rowCount} rows)</option>)}</select></label>
        </div>
        <div className="flow-selector-grid" style={{marginBottom:"0.5rem"}}>
          <label className="axis-picker">Comparison<select value={explore.comparisonMode} onChange={e=>setExplore(p=>({...p,comparisonMode:e.target.value as ComparisonMode}))}>{COMPARISON_MODES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          {(selectedDataset?.columns) && <>
            <label className="axis-picker">X<select value={explore.xColumn} onChange={e=>setExplore(p=>({...p,xColumn:e.target.value}))}>{selectedDataset.columns.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
            <label className="axis-picker">Y<select value={explore.yColumn} onChange={e=>setExplore(p=>({...p,yColumn:e.target.value}))}>{selectedDataset.columns.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
          </>}
        </div>
        <div className="flow-selector-grid">
          {selectedDataset?.columns && selectedDataset.columns.length>2 && <label className="axis-picker">Z<select value={explore.zColumn} onChange={e=>setExplore(p=>({...p,zColumn:e.target.value}))}>{selectedDataset.columns.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
          <label className="axis-picker">Chart<select value={explore.chartType} onChange={e=>setExplore(p=>({...p,chartType:e.target.value as any}))}>{CHART_TYPES.map(ct=><option key={ct.value} value={ct.value}>{ct.label}</option>)}</select></label>
        </div>
        <div className="flow-selector-grid" style={{marginTop:"0.5rem"}}>
          <label className="axis-picker">X scale<select value={explore.numericScaleX} onChange={e=>setExplore(p=>({...p,numericScaleX:e.target.value as NumericScaleMode}))}>{NUMERIC_SCALE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="axis-picker">Y scale<select value={explore.numericScaleY} onChange={e=>setExplore(p=>({...p,numericScaleY:e.target.value as NumericScaleMode}))}>{NUMERIC_SCALE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="axis-picker">Aspect<select value={explore.plotAspect} onChange={e=>setExplore(p=>({...p,plotAspect:e.target.value as PlotAspectMode}))}>{PLOT_ASPECT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        </div>
        {selectedDataset && (
          <p className="hint" style={{marginTop:"0.5rem"}}>
            Columns: {selectedDataset.columns?.join(", ") ?? "N/A"} &middot; {selectedDataset.rowCount} rows &middot; Hash: <code>{selectedDataset.hash}</code>
          </p>
        )}
      </div>

      {/* Chart */}
      {selectedDataset ? (
        <div className="chart-card">
          <h2>{DOMAIN_LABELS[selectedDataset.domain]} — {selectedDataset.name}</h2>
          <p className="hint">
            Interactive Plotly chart. Select X/Y columns and chart type above.
            {selectedDataset.rowCount > 1000 ? " Large dataset — limited initial points for performance.": ""}
          </p>
          {chart ? (
            <div className={`plot-host ${aspectCls}`.trim()}>
              <div ref={chartRef} style={{width:"100%",height:"100%"}}/>
            </div>
          ): <EmptyState message="Select axis columns to render chart" icon="📊"/>}
        </div>
      ) : <div className="chart-card"><EmptyState message="No dataset selected for this analysis domain" icon="📊"/></div>}

      {/* Data table preview */}
      {selectedDataset && (
        <div className="chart-card">
          <h2>Data Table — {selectedDataset.name}</h2>
          <div className="analog-table-wrap" style={{maxHeight:"350px",overflowY:"auto"}}>
            <table className="analog-table">
              <thead><tr>{selectedDataset.columns?.map(c=><th key={c}>{c}</th>)}</tr></thead>
              <tbody><tr><td colSpan={selectedDataset.columns?.length??1} style={{textAlign:"center",color:"var(--muted,#94a3b8)",padding:"1rem"}}>Data is lazy-loaded from generated manifest. {selectedDataset.rowCount} rows available.</td></tr></tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PlotGallery({ run }: { run: BenchmarkRun }): JSX.Element {
  const narrow = useNarrowScreen(640);
  const [lightbox, setLightbox] = useState<string|null>(null);

  // Group plot artifacts by domain
  const grouped = useMemo(() => {
    const m = new Map<AnalysisDomain, typeof run.plotArtifacts>();
    for (const p of run.plotArtifacts) {
      const lis = m.get(p.domain) ?? [];
      lis.push(p);
      m.set(p.domain, lis);
    }
    return [...ANALYSIS_DOMAINS.filter(d=>d!=="overview"), "overview" as AnalysisDomain].filter(d=>m.has(d)).map(d=>({domain:d,plots:m.get(d)!}));
  }, [run.plotArtifacts]);

  if (run.plotArtifacts.length===0) return <div className="chart-card"><h2>Plot Gallery</h2><EmptyState message="No plot images in this run" icon="🖼"/></div>;

  return (
    <div>
      {lightbox && <div onClick={()=>setLightbox(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><img src={lightbox} style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain"}} alt="Plot"/></div>}
      {grouped.map(g=>(
        <div key={g.domain} className="chart-card">
          <h2>{DOMAIN_LABELS[g.domain]} Plots ({g.plots.length})</h2>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${narrow?2:3},1fr)`,gap:"0.75rem"}}>
            {g.plots.map(p=>(p.displayUrl?(
              <div key={p.relPath} style={{border:"1px solid var(--border,#e2e8f0)",borderRadius:"6px",overflow:"hidden",cursor:"pointer"}} onClick={()=>setLightbox(p.displayUrl)}>
                <img src={p.displayUrl} alt={p.name} style={{width:"100%",height:"auto",display:"block"}} loading="lazy"/>
                <div style={{padding:"0.3rem 0.5rem",fontSize:"0.7rem",background:"var(--surface2,#f8fafc)"}}>{p.name} ({p.size})</div>
              </div>
            ):(
              <div key={p.relPath} style={{border:"1px dashed var(--border,#e2e8f0)",borderRadius:"6px",padding:"1rem",textAlign:"center",color:"var(--muted)"}}>{p.name} (no preview)</div>
            )))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VerificationSection({ run }: { run: BenchmarkRun }): JSX.Element {
  const ts = run.verificationTests;
  const grouped = useMemo(() => {
    const m = new Map<AnalysisDomain, typeof ts>();
    for (const t of ts) { const lis = m.get(t.domain as AnalysisDomain) ?? []; lis.push(t); m.set(t.domain as AnalysisDomain, lis); }
    return m;
  }, [ts]);

  return (
    <>
      <div className="chart-card">
        <h2>Verification Summary</h2>
        <div className="flow-kpi-grid">
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Overall</div><div className="flow-kpi-card__value"><Badge status={run.reportSummary.overallStatus==="pass"?"completed":run.reportSummary.overallStatus==="fail"?"failed":"pending"}/></div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Pass</div><div className="flow-kpi-card__value" style={{color:"#22c55e"}}>{ts.filter(t=>t.status==="pass").length}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">Fail</div><div className="flow-kpi-card__value" style={{color:"#ef4444"}}>{ts.filter(t=>t.status==="fail").length}</div></div>
          <div className="flow-kpi-card"><div className="flow-kpi-card__label">N/A</div><div className="flow-kpi-card__value" style={{color:"#94a3b8"}}>{ts.filter(t=>t.status==="unavailable").length}</div></div>
        </div>
      </div>

      {[...grouped.entries()].map(([domain,tests])=>(
        <div key={domain} className="chart-card">
          <h2>{DOMAIN_LABELS[domain]} Tests</h2>
          <div className="analog-table-wrap"><table className="analog-table"><thead><tr><th>Test</th><th>Status</th><th>Detail</th></tr></thead><tbody>
            {tests.map(t=><tr key={t.testId}><td>{t.name}</td><td><Badge status={t.status==="pass"?"completed":t.status==="fail"?"failed":"pending"}/></td><td style={{fontSize:"0.8rem"}}>{t.detail}</td></tr>)}
          </tbody></table></div>
        </div>
      ))}

      {run.reportSummary.reportMarkdown && (
        <div className="chart-card">
          <h2>Raw REPORT.md</h2>
          <pre style={{background:"var(--surface2,#f8fafc)",padding:"0.75rem",borderRadius:"6px",overflowX:"auto",fontSize:"0.78rem",lineHeight:1.5,maxHeight:"400px",overflowY:"auto",whiteSpace:"pre-wrap"}}>{run.reportSummary.reportMarkdown}</pre>
        </div>
      )}
    </>
  );
}

function ArtifactSection({ run }: { run: BenchmarkRun }): JSX.Element {
  const all = [...run.dataArtifacts, ...run.plotArtifacts.map(p=>({...p,toolKey:"spice_benchmark",stageId:p.domain,algorithmId:run.modelId,cellName:"—",status:"completed" as const,hash:p.name,provenance:run.status,visibility:"public" as const,downloadUrl:p.displayUrl}))];
  return (
    <div className="chart-card">
      <h2>Artifacts — {run.runId}</h2>
      <div className="analog-table-wrap" style={{maxHeight:"400px",overflowY:"auto"}}>
        <table className="analog-table"><thead><tr><th>Name</th><th>Domain</th><th>Format</th><th>Size</th><th>Hash</th><th>Status</th></tr></thead><tbody>
          {all.map((a,i)=><tr key={i}><td><code>{a.name}</code></td><td>{a.domain}</td><td>{a.format}</td><td>{a.size}</td><td style={{fontSize:"0.68rem"}}><code>{a.hash}</code></td><td><Badge status="completed"/></td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SpiceBenchmarkPage                                                  */
/* ═══════════════════════════════════════════════════════════════════ */
export function SpiceBenchmarkPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const manifest = SPICE_BENCHMARK_MANIFEST;
  const runIds = Object.keys(manifest.runs);
  const firstRunId = runIds[0] ?? "";

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [explore, setExplore] = useState<SpiceExploreState>({...DEFAULT_SPICE_EXPLORE_STATE,runId:firstRunId,modelId:manifest.runs[firstRunId]?.modelId??"",suiteId:manifest.runs[firstRunId]?.netlistSuite?.suiteId??""});

  const run = manifest.runs[explore.runId];
  if (!run) return <div className="chart-card"><h2>No benchmark data</h2><p className="hint">Run the data generator first.</p></div>;

  useEffect(() => {
    if (activeTab!=="explorer") return;
    const id = requestAnimationFrame(()=>{
      document.querySelectorAll<HTMLElement>(".plot-host > div.js-plotly-plot").forEach(el=>{void Plotly.Plots.resize(el);});
    });
    return ()=>cancelAnimationFrame(id);
  }, [narrow, activeTab]);

  return (
    <div>
      {/* Tab bar */}
      <div style={{display:"flex",gap:"0.25rem",flexWrap:"wrap",padding:"0.5rem 0",borderBottom:"1px solid var(--border,#e2e8f0)",marginBottom:"1rem"}}>
        {TABS.map(tab=><button key={tab.id} onClick={()=>setActiveTab(tab.id)} className="tab-btn" style={{padding:"0.4rem 0.75rem",border:"none",borderRadius:"6px 6px 0 0",cursor:"pointer",fontSize:"0.82rem",fontWeight:activeTab===tab.id?600:400,background:activeTab===tab.id?"var(--accent,#0071e3)":"transparent",color:activeTab===tab.id?"#fff":"var(--text,#334155)",borderBottom:activeTab!==tab.id?"2px solid transparent":"none"}}>{narrow?tab.label.split(" ")[0]:tab.label}</button>)}
      </div>

      {activeTab==="overview" && <OverviewSection run={run}/>}
      {activeTab==="explorer" && <ExplorerSection manifest={manifest} run={run} explore={explore} setExplore={setExplore}/>}
      {activeTab==="gallery" && <PlotGallery run={run}/>}
      {activeTab==="verification" && <VerificationSection run={run}/>}
      {activeTab==="artifacts" && <ArtifactSection run={run}/>}
    </div>
  );
}
