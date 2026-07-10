import { useMemo } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { useTheme } from "../../theme/ThemeContext";
import { getChartPalette, plotInsetBackground, plotAxisFont, plotFont, plotlyAxisFrameX, plotlyAxisFrameY, plotlyBold, plotlyHoverLabel } from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { ParasiticsData, CellBenchmarkResult } from "../../data/toolFlowTypes";
import { findAlgoResult, deltaPct } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface Props {
  cellResult: CellBenchmarkResult | null;
  baselineAlgoId: string;
  compareAlgoId: string;
}

function singleHeatmap(pex: ParasiticsData, title: string, narrow: boolean, palette: ReturnType<typeof getChartPalette>, bg: string, hoverLabel: ReturnType<typeof plotlyHoverLabel>, frameX: ReturnType<typeof plotlyAxisFrameX>, frameY: ReturnType<typeof plotlyAxisFrameY>): { data: Data[]; layout: Partial<Layout> } {
  const labels = pex.maxwellMatrix.conductorLabels;
  const z = pex.maxwellMatrix.matrixFF;
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
  return {
    data: [{ type:"heatmap", z, x:labels, y:labels, colorscale:[[0,"#0d47a1"],[0.5,"#30d158"],[1,"#ff9f0a"]], hovertemplate:"<b>%{x}</b> → <b>%{y}</b><br>C = %{z:.3f} fF<extra></extra>" } as Data],
    layout: {
      autosize:true, margin:narrow?{l:44,r:12,t:36,b:44}:{l:56,r:20,t:40,b:56},
      paper_bgcolor:bg, plot_bgcolor:bg, font:plotFont(palette.rgbAxisTitle),
      title:{text:plotlyBold(title),font:plotFont(palette.rgbAxisTitle)},
      xaxis:{...frameX,automargin:true,tickfont:axTick,side:"top" as const},
      yaxis:{...frameY,automargin:true,tickfont:axTick,autorange:"reversed" as const},
      hovermode:"closest" as const, hoverlabel:hoverLabel,
    } as Partial<Layout>,
  };
}

export function ParasiticStageCard({ cellResult, baselineAlgoId, compareAlgoId }: Props): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const bg = plotInsetBackground(theme);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  const baselineR = cellResult ? findAlgoResult(cellResult, baselineAlgoId) : null;
  const compareR = cellResult && compareAlgoId ? findAlgoResult(cellResult, compareAlgoId) : null;
  const blPex = baselineR?.parasitics ?? null;
  const cpPex = compareR?.parasitics ?? null;

  // Build diff matrix
  const diffPex = useMemo(() => {
    if (!blPex || !cpPex) return null;
    const lbs = blPex.maxwellMatrix.conductorLabels;
    const cbs = cpPex.maxwellMatrix.conductorLabels;
    if (lbs.length !== cbs.length) return null;
    const diff = blPex.maxwellMatrix.matrixFF.map((row, i) =>
      row.map((v, j) => +(cpPex.maxwellMatrix.matrixFF[i][j] - v).toFixed(3))
    );
    return { labels: lbs, matrix: diff };
  }, [blPex, cpPex]);

  // Coupling deltas
  const couplingDeltas = useMemo(() => {
    if (!blPex || !cpPex) return [];
    const bMap = new Map(blPex.conductorCouplings.map((c) => [`${c.conductorFrom}→${c.conductorTo}`, c.capacitanceFF]));
    return cpPex.conductorCouplings.map((c) => {
      const key = `${c.conductorFrom}→${c.conductorTo}`;
      const rev = `${c.conductorTo}→${c.conductorFrom}`;
      const bVal = bMap.get(key) ?? bMap.get(rev) ?? 0;
      return { pair: key, baseline: bVal, compare: c.capacitanceFF, delta: +(c.capacitanceFF - bVal).toFixed(3) };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [blPex, cpPex]);

  const blMap = useMemo(() => blPex ? singleHeatmap(blPex, `Baseline — ${blPex.cellName}`, narrow, palette, bg, hoverLabel, frameX, frameY) : null, [blPex]);
  const cpMap = useMemo(() => cpPex ? singleHeatmap(cpPex, `Compare — ${cpPex.cellName}`, narrow, palette, bg, hoverLabel, frameX, frameY) : null, [cpPex]);
  const diffMap = useMemo(() => {
    if (!diffPex) return null;
    const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);
    return {
      data: [{ type:"heatmap", z:diffPex.matrix, x:diffPex.labels, y:diffPex.labels, colorscale:[[0,"#ef4444"],[0.5,"#f8fafc"],[1,"#22c55e"]], zmid:0, hovertemplate:"Δ = %{z:.3f} fF<extra></extra>" } as Data],
      layout: {
        autosize:true, margin:narrow?{l:44,r:12,t:36,b:44}:{l:56,r:20,t:40,b:56},
        paper_bgcolor:bg, plot_bgcolor:bg, font:plotFont(palette.rgbAxisTitle),
        title:{text:plotlyBold("Difference (Compare − Baseline)"), font:plotFont(palette.rgbAxisTitle)},
        xaxis:{...frameX,automargin:true,tickfont:axTick,side:"top" as const},
        yaxis:{...frameY,automargin:true,tickfont:axTick,autorange:"reversed" as const},
        hovermode:"closest" as const, hoverlabel:hoverLabel,
      },
    };
  }, [diffPex]);

  const blRef = usePlotlyChart(blMap?.data??[], blMap?.layout??{}, {responsive:true,displayModeBar:false,displaylogo:false} satisfies Partial<Config>);
  const cpRef = usePlotlyChart(cpMap?.data??[], cpMap?.layout??{}, {responsive:true,displayModeBar:false,displaylogo:false} satisfies Partial<Config>);
  const diffRef = usePlotlyChart(diffMap?.data??[], diffMap?.layout??{}, {responsive:true,displayModeBar:false,displaylogo:false} satisfies Partial<Config>);

  return (
    <div className="chart-card">
      <h2>Parasitic Extraction: fastercap_v2</h2>
      <p className="hint">
        Maxwell capacitance matrices with correct sign convention: Cii ≥ 0 (self-capacitance), Cij ≤ 0 for i≠j (coupling). Diagonal is NOT substrate capacitance.
      </p>
      {!blPex ? (
        <EmptyState message="No parasitic extraction data for this baseline" icon="⚡" />
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${narrow?1:cpPex?3:1},1fr)`,gap:"0.5rem",marginBottom:"0.75rem"}}>
            <div className="plot-host plot-host--short"><div ref={blRef} style={{width:"100%",height:"100%"}} /></div>
            {cpMap && <div className="plot-host plot-host--short"><div ref={cpRef} style={{width:"100%",height:"100%"}} /></div>}
            {diffMap && <div className="plot-host plot-host--short"><div ref={diffRef} style={{width:"100%",height:"100%"}} /></div>}
          </div>

          {/* Net caps comparison */}
          {blPex && cpPex && (
            <div className="analog-table-wrap" style={{marginTop:"0.5rem"}}>
              <table className="analog-table">
                <thead>
                  <tr><th>Net</th><th>Baseline Self (fF)</th><th>Compare Self (fF)</th><th>Δ%</th><th>B Coupling (fF)</th><th>C Coupling (fF)</th><th>B Row-sum (fF)</th><th>C Row-sum (fF)</th></tr>
                </thead>
                <tbody>
                  {blPex.netCaps.map((bn) => {
                    const cn = cpPex.netCaps.find((n) => n.net === bn.net);
                    return (
                      <tr key={bn.net}>
                        <td><code>{bn.net}</code></td>
                        <td>{bn.cSelfFF.toFixed(2)}</td>
                        <td>{cn?.cSelfFF.toFixed(2) ?? "—"}</td>
                        <td>{cn ? deltaPct(cn.cSelfFF, bn.cSelfFF)?.toFixed(1) ?? "—" : "—"}%</td>
                        <td>{bn.couplingFF.toFixed(2)}</td>
                        <td>{cn?.couplingFF.toFixed(2) ?? "—"}</td>
                        <td>{bn.rowSumFF.toFixed(2)}</td>
                        <td>{cn?.rowSumFF.toFixed(2) ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Coupling deltas */}
          {couplingDeltas.length > 0 && (
            <div style={{marginTop:"0.5rem"}}>
              <h3 className="flow-subsection-title">Strongest Coupling Δ</h3>
              <p className="hint">{couplingDeltas[0].pair}: Δ = {couplingDeltas[0].delta} fF</p>
              <div className="analog-table-wrap">
                <table className="analog-table">
                  <thead><tr><th>Pair</th><th>Baseline (fF)</th><th>Compare (fF)</th><th>Δ (fF)</th></tr></thead>
                  <tbody>{couplingDeltas.slice(0,6).map(c=><tr key={c.pair}><td><code>{c.pair}</code></td><td>{c.baseline.toFixed(3)}</td><td>{c.compare.toFixed(3)}</td><td style={{color:Math.abs(c.delta)>0.005?"var(--warn,#ff9f0a)":"inherit"}}>{c.delta.toFixed(3)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quality checks */}
          {blPex.qualityChecks.length>0 && (
            <div className="flow-pex-quality" style={{marginTop:"0.5rem"}}>
              <h3 className="flow-subsection-title">Quality Checks (Baseline)</h3>
              <div className="flow-pex-quality__grid">
                {blPex.qualityChecks.map(qc=><div key={qc.check} className={`flow-pex-quality__item ${qc.pass?"flow-pex-quality__item--pass":"flow-pex-quality__item--fail"}`}><span className="flow-pex-quality__label">{qc.check}</span><span className="flow-pex-quality__value">{qc.value} {qc.unit}</span><span className="flow-pex-quality__icon">{qc.pass?"✓":"✗"}</span></div>)}
              </div>
            </div>
          )}

          {/* Annotated CDL */}
          {blPex.annotatedCdl.length>0 && (
            <div style={{marginTop:"0.5rem"}}>
              <h3 className="flow-subsection-title">Annotated CDL (Baseline)</h3>
              <div className="analog-table-wrap"><table className="analog-table"><thead><tr><th>Net</th><th>π caps (fF)</th><th>Coupled to</th></tr></thead><tbody>{blPex.annotatedCdl.map((cdl,i)=><tr key={i}><td><code>{cdl.net}</code></td><td>{cdl.piCapsFF.toFixed(2)}</td><td><code>{cdl.coupledTo}</code></td></tr>)}</tbody></table></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
