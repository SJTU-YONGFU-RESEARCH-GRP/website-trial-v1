import type { CellBenchmarkResult, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";
import { Badge } from "./Badge";

interface CellDetailCardProps {
  cellResult: CellBenchmarkResult | null;
  algorithms: LayoutRoutingAlgorithm[];
}

export function CellDetailCard({ cellResult, algorithms }: CellDetailCardProps): JSX.Element {
  if (!cellResult) {
    return (
      <div className="chart-card">
        <h2>Cell Detail</h2>
        <p className="hint" style={{ padding: "1rem 0" }}>Select a cell to view per-algorithm comparison.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h2>Cell Detail: <code>{cellResult.cellName}</code> <span style={{fontSize:"0.75rem",color:"var(--muted,#94a3b8)"}}>({cellResult.cellClass}, {cellResult.transistorCount} transistors)</span></h2>
      <p className="hint">Side-by-side comparison of layout, parasitic, and timing data across algorithms.</p>

      <div style={{ overflowX: "auto" }}>
        <table className="analog-table" style={{ minWidth: "600px" }}>
          <thead>
            <tr>
              <th>Metric</th>
              {algorithms.map((a) => <th key={a.algorithmId}><code>{a.algorithmName}</code></th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Status</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                return <td key={a.algorithmId}><Badge status={ar?.status ?? "pending"} /></td>;
              })}
            </tr>
            <tr>
              <td>Width (grid units)</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                return <td key={a.algorithmId}>{ar?.layout?.widthGrid ?? "—"}</td>;
              })}
            </tr>
            <tr>
              <td>Area (grid²)</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                return <td key={a.algorithmId}>{ar?.layout?.areaGrid2 != null ? ar.layout.areaGrid2.toFixed(1) : "—"}</td>;
              })}
            </tr>
            <tr>
              <td>Utilization</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                return <td key={a.algorithmId}>{ar?.layout ? `${(ar.layout.utilization * 100).toFixed(0)}%` : "—"}</td>;
              })}
            </tr>
            <tr>
              <td>Geo. Delay (ps)</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                return <td key={a.algorithmId}>{ar?.timing?.geomeanDelayPs != null ? ar.timing.geomeanDelayPs.toFixed(1) : "—"}</td>;
              })}
            </tr>
            <tr>
              <td>Avg Self Cap (fF)</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                const avg = ar?.parasitics
                  ? +(ar.parasitics.netCaps.reduce((s, n) => s + n.cSelfFF, 0) / ar.parasitics.netCaps.length).toFixed(2)
                  : null;
                return <td key={a.algorithmId}>{avg !== null ? avg : "—"}</td>;
              })}
            </tr>
            <tr>
              <td>Runtime (s)</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                return <td key={a.algorithmId}>{ar?.layout?.runtimeSec != null ? ar.layout.runtimeSec.toFixed(1) : "—"}</td>;
              })}
            </tr>
            <tr>
              <td>Routing Status</td>
              {algorithms.map((a) => {
                const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                return <td key={a.algorithmId}>{ar?.layout?.routingStatus ?? "—"}</td>;
              })}
            </tr>
            {cellResult.algorithmResults.some((r) => r.failedStage) && (
              <tr>
                <td>Failure Stage</td>
                {algorithms.map((a) => {
                  const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
                  return <td key={a.algorithmId}>{ar?.failedStage ?? "—"}</td>;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Layout previews side by side */}
      {cellResult.algorithmResults.some((r) => r.layout?.layoutPreviewSvg) && (
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          {algorithms.map((a) => {
            const ar = cellResult.algorithmResults.find((r) => r.algorithmId === a.algorithmId);
            if (!ar?.layout?.layoutPreviewSvg) return null;
            return (
              <div key={a.algorithmId} style={{ flex: "1 1 200px" }}>
                <strong style={{ fontSize: "0.75rem" }}>{a.algorithmName} ({ar.layout.previewType ?? "placeholder"})</strong>
                <div className="flow-layout-preview__svg" style={{ marginTop: "0.25rem" }} dangerouslySetInnerHTML={{ __html: ar.layout.layoutPreviewSvg }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Failure details */}
      {cellResult.algorithmResults.some((r) => r.failedStage) && (
        <div style={{ marginTop: "0.75rem" }}>
          <h3 className="flow-subsection-title">Failure Details</h3>
          {cellResult.algorithmResults.filter((r) => r.failedStage).map((r) => (
            <div key={r.algorithmId} className="flow-pex-quality__item flow-pex-quality__item--fail" style={{ padding: "0.35rem 0.5rem", marginBottom: "0.25rem" }}>
              <strong>{algorithms.find((a) => a.algorithmId === r.algorithmId)?.algorithmName ?? r.algorithmId}</strong>
              :{" "}{r.errorSummary ?? `Failed at ${r.failedStage}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
