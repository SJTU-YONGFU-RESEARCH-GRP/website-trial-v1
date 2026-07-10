import type { AlgorithmCellResult, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface LayoutStageCardProps {
  results: AlgorithmCellResult[];
  algorithms: LayoutRoutingAlgorithm[];
}

export function LayoutStageCard({
  results,
  algorithms,
}: LayoutStageCardProps): JSX.Element {
  const completed = results.filter((r) => r.layout);

  if (completed.length === 0) {
    return (
      <div className="chart-card">
        <h2>Layout Generation: AutoCellGen-V2</h2>
        <EmptyState message="No layout data available" icon="📐" />
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h2>Layout Generation: AutoCellGen-V2</h2>
      <p className="hint">
        Standard-cell layout metrics per algorithm. Cell width varies by
        placement strategy and drive strength.
      </p>

      {/* Layout previews */}
      {completed.some((r) => r.layout!.layoutPreviewSvg) && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          {completed.map((r) => {
            const algo = algorithms.find((a) => a.algorithmId === r.algorithmId);
            if (!r.layout?.layoutPreviewSvg) return null;
            return (
              <div key={r.algorithmId} style={{ flex: "1 1 200px" }}>
                <strong style={{ fontSize: "0.75rem" }}>{algo?.algorithmName ?? r.algorithmId}</strong>
                <div
                  className="flow-layout-preview__svg"
                  style={{ marginTop: "0.25rem" }}
                  dangerouslySetInnerHTML={{ __html: r.layout.layoutPreviewSvg }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Metrics table — one column per algorithm */}
      <div className="analog-table-wrap">
        <table className="analog-table">
          <thead>
            <tr>
              <th>Metric</th>
              {completed.map((r) => {
                const algo = algorithms.find((a) => a.algorithmId === r.algorithmId);
                return <th key={r.algorithmId}><code>{algo?.algorithmName ?? r.algorithmId}</code></th>;
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Width (nm)</td>
              {completed.map((r) => <td key={r.algorithmId}>{r.layout!.widthNm}</td>)}
            </tr>
            <tr>
              <td>Height (nm)</td>
              {completed.map((r) => <td key={r.algorithmId}>{r.layout!.heightNm}</td>)}
            </tr>
            <tr>
              <td>Area (µm²)</td>
              {completed.map((r) => <td key={r.algorithmId}>{r.layout!.areaUm2.toFixed(1)}</td>)}
            </tr>
            <tr>
              <td>Utilization</td>
              {completed.map((r) => <td key={r.algorithmId}>{(r.layout!.utilization * 100).toFixed(0)}%</td>)}
            </tr>
            <tr>
              <td>Transistors</td>
              {completed.map((r) => <td key={r.algorithmId}>{r.layout!.transistorCount}</td>)}
            </tr>
            <tr>
              <td>Track count</td>
              {completed.map((r) => <td key={r.algorithmId}>{r.layout!.trackCount}</td>)}
            </tr>
            <tr>
              <td>Routing</td>
              {completed.map((r) => <td key={r.algorithmId}>{r.layout!.routingStatus}</td>)}
            </tr>
            <tr>
              <td>Runtime (s)</td>
              {completed.map((r) => <td key={r.algorithmId}>{r.layout!.runtimeSec.toFixed(1)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rules & Config of the first completed result */}
      <div className="flow-layout-meta" style={{ marginTop: "0.5rem" }}>
        <div className="flow-layout-meta__block">
          <strong>Rules</strong>
          <span>Min. width: {completed[0].layout!.rules.minWidthNm} nm</span>
          <span>Min. spacing: {completed[0].layout!.rules.minSpacingNm} nm</span>
          <span>Metal layers: {completed[0].layout!.rules.metalLayers}</span>
        </div>
        <div className="flow-layout-meta__block">
          <strong>Config</strong>
          <span>{completed[0].layout!.configSummary}</span>
        </div>
        <div className="flow-layout-meta__block">
          <strong>Netlist</strong>
          <span>{completed[0].layout!.netlistSummary}</span>
        </div>
      </div>
    </div>
  );
}
