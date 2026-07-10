import type { AlgorithmCellResult, LayoutRoutingAlgorithm, CellBenchmarkResult } from "../../data/toolFlowTypes";
import { findAlgoResult, deltaPct, DEMO_PROVENANCE_LABEL } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface Props {
  cellResult: CellBenchmarkResult | null;
  algorithms: LayoutRoutingAlgorithm[];
  baselineAlgoId: string;
  compareAlgoId: string;
}

function PreviewBox({ algo, layout, isBaseline }: {
  algo: LayoutRoutingAlgorithm; layout: NonNullable<AlgorithmCellResult["layout"]>; isBaseline: boolean;
}): JSX.Element {
  return (
    <div className="flow-layout-preview" style={{flex:"1 1 240px",minWidth:200}}>
      <strong style={{fontSize:"0.78rem"}}>
        {isBaseline ? "📏 " : "📐 "}
        {algo.algorithmName} ({layout.previewType ?? "placeholder"})
      </strong>
      {layout.layoutPreviewSvg && (
        <div style={{marginTop:"0.25rem",border:"1px solid var(--border,#e2e8f0)",borderRadius:"4px",overflow:"hidden",background:"var(--surface2,#f8fafc)"}}
          dangerouslySetInnerHTML={{ __html: layout.layoutPreviewSvg }} />
      )}
      {!layout.layoutPreviewSvg && (
        <div style={{marginTop:"0.25rem",padding:"2rem",textAlign:"center",background:"var(--surface2,#f8fafc)",borderRadius:"4px",fontSize:"0.8rem",color:"var(--muted,#94a3b8)"}}>
          No preview available
        </div>
      )}
    </div>
  );
}

export function LayoutStageCard({ cellResult, algorithms, baselineAlgoId, compareAlgoId }: Props): JSX.Element {
  if (!cellResult) {
    return <div className="chart-card"><h2>Layout Generation: AutoCellGen-V2</h2><EmptyState message="No cell selected" icon="📐" /></div>;
  }

  const baselineR = findAlgoResult(cellResult, baselineAlgoId);
  const compareR = compareAlgoId ? findAlgoResult(cellResult, compareAlgoId) : null;
  const baselineAlgo = algorithms.find((a) => a.algorithmId === baselineAlgoId);
  const compareAlgo = compareAlgoId ? algorithms.find((a) => a.algorithmId === compareAlgoId) : null;

  const bl = baselineR?.layout ?? null;
  const cl = compareR?.layout ?? null;

  return (
    <div className="chart-card">
      <h2>Layout Generation: AutoCellGen-V2</h2>
      <p className="hint">
        Same-scale side-by-side layout previews for cell <code>{cellResult.cellName}</code>.
        All dimensions in grid units (asap7_cfet config grid). {DEMO_PROVENANCE_LABEL}
      </p>

      {/* Side-by-side previews */}
      {(bl || cl) && (
        <div style={{display:"flex",gap:"1rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
          {bl && baselineAlgo && <PreviewBox algo={baselineAlgo} layout={bl} isBaseline />}
          {cl && compareAlgo && <PreviewBox algo={compareAlgo} layout={cl} isBaseline={false} />}
        </div>
      )}

      {/* Metrics table */}
      <div className="analog-table-wrap">
        <table className="analog-table">
          <thead>
            <tr>
              <th>Metric</th>
              {bl && <th><code>{baselineAlgo?.algorithmName ?? baselineAlgoId}</code></th>}
              {cl && <th><code>{compareAlgo?.algorithmName ?? compareAlgoId}</code></th>}
              {bl && cl && <th>Δ%</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Width (grid)</td>
              {bl && <td>{bl.widthGrid}</td>}
              {cl && <td>{cl.widthGrid}</td>}
              {bl && cl && <td>{deltaPct(cl.widthGrid, bl.widthGrid)?.toFixed(1) ?? "—"}%</td>}
            </tr>
            <tr>
              <td>Height (grid)</td>
              {bl && <td>{bl.heightGrid}</td>}
              {cl && <td>{cl.heightGrid}</td>}
              {bl && cl && <td>{deltaPct(cl.heightGrid, bl.heightGrid)?.toFixed(1) ?? "—"}%</td>}
            </tr>
            <tr>
              <td>Area (grid²)</td>
              {bl && <td>{bl.areaGrid2}</td>}
              {cl && <td>{cl.areaGrid2}</td>}
              {bl && cl && <td>{deltaPct(cl.areaGrid2, bl.areaGrid2)?.toFixed(1) ?? "—"}%</td>}
            </tr>
            <tr>
              <td>Utilization</td>
              {bl && <td>{(bl.utilization * 100).toFixed(0)}%</td>}
              {cl && <td>{(cl.utilization * 100).toFixed(0)}%</td>}
              {bl && cl && <td>{deltaPct(cl.utilization, bl.utilization)?.toFixed(1) ?? "—"}%</td>}
            </tr>
            <tr>
              <td>Transistors</td>
              {bl && <td>{bl.transistorCount}</td>}
              {cl && <td>{cl.transistorCount}</td>}
              {bl && cl && <td>—</td>}
            </tr>
            <tr>
              <td>Routing</td>
              {bl && <td>{bl.routingStatus}</td>}
              {cl && <td>{cl.routingStatus}</td>}
              {bl && cl && <td>—</td>}
            </tr>
            <tr>
              <td>Runtime (s)</td>
              {bl && <td>{bl.runtimeSec.toFixed(1)}</td>}
              {cl && <td>{cl.runtimeSec.toFixed(1)}</td>}
              {bl && cl && <td>{deltaPct(cl.runtimeSec, bl.runtimeSec)?.toFixed(1) ?? "—"}%</td>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Config diff */}
      {bl && cl && baselineAlgo && compareAlgo && (
        <div style={{marginTop:"0.5rem"}}>
          <h3 className="flow-subsection-title">Config Diff</h3>
          <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
            <div className="flow-layout-meta" style={{flex:1}}>
              <div className="flow-layout-meta__block">
                <strong>{baselineAlgo.algorithmName}</strong>
                <span>{bl.configSummary}</span>
                <span>{bl.netlistSummary}</span>
              </div>
            </div>
            <div className="flow-layout-meta" style={{flex:1}}>
              <div className="flow-layout-meta__block">
                <strong>{compareAlgo.algorithmName}</strong>
                <span>{cl.configSummary}</span>
                <span>{cl.netlistSummary}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
