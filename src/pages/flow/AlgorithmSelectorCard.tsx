import type { LayoutRoutingAlgorithm, CellBenchmarkResult } from "../../data/toolFlowTypes";

interface AlgorithmSelectorCardProps {
  algorithms: LayoutRoutingAlgorithm[];
  cellResults: CellBenchmarkResult[];
  selectedCell: string;
  selectedAlgoId: string;
  compareAlgoId: string;
  onCellChange: (cell: string) => void;
  onAlgoChange: (algoId: string) => void;
  onCompareAlgoChange: (algoId: string) => void;
}

export function AlgorithmSelectorCard({
  algorithms,
  cellResults,
  selectedCell,
  selectedAlgoId,
  compareAlgoId,
  onCellChange,
  onAlgoChange,
  onCompareAlgoChange,
}: AlgorithmSelectorCardProps): JSX.Element {
  const cellNames = cellResults.map((c) => c.cellName);

  return (
    <div className="chart-card">
      <h2>Benchmark Controls</h2>
      <div className="flow-selector-grid">
        <label className="axis-picker">
          Baseline algorithm
          <select
            value={selectedAlgoId}
            onChange={(e) => onAlgoChange(e.target.value)}
          >
            {algorithms.map((a) => (
              <option key={a.algorithmId} value={a.algorithmId}>
                {a.algorithmName}
              </option>
            ))}
          </select>
        </label>
        <label className="axis-picker">
          Compare algorithm
          <select
            value={compareAlgoId}
            onChange={(e) => onCompareAlgoChange(e.target.value)}
          >
            <option value="">— none —</option>
            {algorithms
              .filter((a) => a.algorithmId !== selectedAlgoId)
              .map((a) => (
                <option key={a.algorithmId} value={a.algorithmId}>
                  {a.algorithmName}
                </option>
              ))}
          </select>
        </label>
        <label className="axis-picker">
          Cell
          <select
            value={selectedCell}
            onChange={(e) => onCellChange(e.target.value)}
          >
            {cellNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
