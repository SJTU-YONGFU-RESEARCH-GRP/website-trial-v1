import type { CellBenchmarkResult, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";
import { Badge } from "./Badge";

interface Props {
  cellResults: CellBenchmarkResult[];
  algorithms: LayoutRoutingAlgorithm[];
  baselineAlgoId: string;
  compareAlgoId: string;
}

export function FailureTable({ cellResults, algorithms, baselineAlgoId, compareAlgoId }: Props): JSX.Element {
  const failures = cellResults
    .flatMap((cr) =>
      cr.algorithmResults
        .filter((r) => r.status === "failed" && (r.algorithmId === baselineAlgoId || r.algorithmId === compareAlgoId))
        .map((r) => ({
          cellName: cr.cellName,
          cellClass: cr.cellClass,
          algorithmId: r.algorithmId,
          algorithmName: algorithms.find((a) => a.algorithmId === r.algorithmId)?.algorithmName ?? r.algorithmId,
          failedStage: r.failedStage ?? "unknown",
          errorSummary: r.errorSummary ?? "No details available",
          status: r.status,
        })),
    );

  if (failures.length === 0) {
    return (
      <div className="chart-card">
        <h2>Failure / Robustness Report</h2>
        <p className="hint">All cells completed successfully across selected algorithms. ✅</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h2>Failure / Robustness Report</h2>
      <p className="hint">
        {failures.length} failure(s) across {baselineAlgoId} and {compareAlgoId}.
        Failures indicate robustness gaps, not necessarily worse QoR.
      </p>
      <div className="analog-table-wrap">
        <table className="analog-table">
          <thead>
            <tr>
              <th>Cell</th>
              <th>Class</th>
              <th>Algorithm</th>
              <th>Failed Stage</th>
              <th>Error Summary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((f, i) => (
              <tr key={i}>
                <td><code>{f.cellName}</code></td>
                <td>{f.cellClass}</td>
                <td>{f.algorithmName}</td>
                <td>{f.failedStage}</td>
                <td style={{fontSize:"0.8rem",maxWidth:300}}>{f.errorSummary}</td>
                <td><Badge status={f.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
