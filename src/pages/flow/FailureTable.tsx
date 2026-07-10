import type { CellBenchmarkResult, LayoutRoutingAlgorithm } from "../../data/toolFlowTypes";
import { Badge } from "./Badge";

interface FailureTableProps {
  cellResults: CellBenchmarkResult[];
  algorithms: LayoutRoutingAlgorithm[];
}

export function FailureTable({
  cellResults,
  algorithms,
}: FailureTableProps): JSX.Element {
  const failures = cellResults
    .map((cr) => ({
      cellName: cr.cellName,
      failures: cr.algorithmResults.filter((r) => r.status === "failed"),
    }))
    .filter((f) => f.failures.length > 0);

  if (failures.length === 0) {
    return (
      <div className="chart-card">
        <h2>Robustness / Failure Summary</h2>
        <p className="hint" style={{ padding: "1rem 0" }}>
          All cells completed successfully across all algorithms.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h2>Robustness / Failure Summary</h2>
      <p className="hint">
        Cells that failed in one or more algorithms. Use this table to identify
        robustness issues in the library or routing flow.
      </p>
      <div className="analog-table-wrap">
        <table className="analog-table">
          <thead>
            <tr>
              <th>Cell</th>
              <th>Algorithm</th>
              <th>Failed Stage</th>
              <th>Error Summary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((f) =>
              f.failures.map((ar) => (
                <tr key={`${f.cellName}-${ar.algorithmId}`}>
                  <td><code>{f.cellName}</code></td>
                  <td>
                    {algorithms.find((a) => a.algorithmId === ar.algorithmId)?.algorithmName ?? ar.algorithmId}
                  </td>
                  <td>{ar.failedStage ?? "—"}</td>
                  <td style={{ maxWidth: "300px", wordBreak: "break-word" }}>
                    <code style={{ fontSize: "0.75rem" }}>{ar.errorSummary ?? "No details"}</code>
                  </td>
                  <td><Badge status={ar.status} /></td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
