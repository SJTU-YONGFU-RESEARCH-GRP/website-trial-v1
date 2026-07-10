import { useCallback } from "react";
import type {
  BenchmarkManifestEntry,
  LayoutRoutingAlgorithm,
  CellBenchmarkResult,
  ComparisonKind,
  CellClass,
} from "../../data/toolFlowTypes";
import { DEMO_PROVENANCE_LABEL } from "../../data/toolFlowTypes";

interface AlgorithmSelectorCardProps {
  manifests: BenchmarkManifestEntry[];
  selectedManifestId: string;
  algorithms: LayoutRoutingAlgorithm[];
  cellResults: CellBenchmarkResult[];
  selectedCell: string;
  selectedAlgoId: string;
  compareAlgoId: string;
  comparisonKind: ComparisonKind;
  cellClassFilter: CellClass | "all";
  onManifestChange: (id: string) => void;
  onCellChange: (cell: string) => void;
  onAlgoChange: (algoId: string) => void;
  onCompareAlgoChange: (algoId: string) => void;
  onComparisonKindChange: (k: ComparisonKind) => void;
  onCellClassFilterChange: (c: CellClass | "all") => void;
}

const CELL_CLASS_LABELS: Record<CellClass | "all", string> = {
  all: "All cells",
  inverter_buffer: "Inverter / Buffer",
  combinational: "Combinational",
  arithmetic: "Arithmetic",
  sequential: "Sequential",
};

const COMPARISON_KIND_LABELS: Record<ComparisonKind, string> = {
  algorithm: "Algorithm",
  architecture: "Architecture",
  ablation: "Ablation",
};

export function AlgorithmSelectorCard({
  manifests, selectedManifestId, algorithms, cellResults, selectedCell,
  selectedAlgoId, compareAlgoId, comparisonKind, cellClassFilter,
  onManifestChange, onCellChange, onAlgoChange, onCompareAlgoChange,
  onComparisonKindChange, onCellClassFilterChange,
}: AlgorithmSelectorCardProps): JSX.Element {
  const handleBaselineChange = useCallback(
    (newAlgoId: string) => {
      onAlgoChange(newAlgoId);
      if (newAlgoId === compareAlgoId) {
        const other = algorithms.find((a) => a.algorithmId !== newAlgoId);
        onCompareAlgoChange(other?.algorithmId ?? "");
      }
    },
    [compareAlgoId, algorithms, onAlgoChange, onCompareAlgoChange],
  );

  const filteredCellNames = cellResults
    .filter((c) => cellClassFilter === "all" || c.cellClass === cellClassFilter)
    .map((c) => c.cellName);

  const isDemo =
    manifests.find((m) => m.benchmarkId === selectedManifestId)?.isDemo ?? false;

  return (
    <div className="chart-card">
      <h2>Benchmark Controls</h2>
      {isDemo && (
        <p className="hint" style={{ color: "var(--warning, #ff9f0a)" }}>
          {DEMO_PROVENANCE_LABEL}
        </p>
      )}
      <div className="flow-selector-grid" style={{ marginBottom: "0.5rem" }}>
        <label className="axis-picker">
          Benchmark
          <select value={selectedManifestId} onChange={(e) => onManifestChange(e.target.value)}>
            {manifests.map((m) => (
              <option key={m.benchmarkId} value={m.benchmarkId}>
                {m.isDemo ? "📐 " : "🔬 "}{m.name} ({m.technology})
              </option>
            ))}
          </select>
        </label>
        <label className="axis-picker">
          Comparison kind
          <select value={comparisonKind} onChange={(e) => onComparisonKindChange(e.target.value as ComparisonKind)}>
            {(["algorithm","architecture","ablation"] as ComparisonKind[]).map((k) => (
              <option key={k} value={k}>{COMPARISON_KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="axis-picker">
          Cell class
          <select value={cellClassFilter} onChange={(e) => onCellClassFilterChange(e.target.value as CellClass | "all")}>
            {(["all","inverter_buffer","combinational","arithmetic","sequential"] as const).map((c) => (
              <option key={c} value={c}>{CELL_CLASS_LABELS[c]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flow-selector-grid">
        <label className="axis-picker">
          Baseline algorithm
          <select value={selectedAlgoId} onChange={(e) => handleBaselineChange(e.target.value)}>
            {algorithms.map((a) => (
              <option key={a.algorithmId} value={a.algorithmId}>{a.algorithmName}</option>
            ))}
          </select>
        </label>
        <label className="axis-picker">
          Compare algorithm
          <select value={compareAlgoId} onChange={(e) => onCompareAlgoChange(e.target.value)}>
            <option value="">— none —</option>
            {algorithms.filter((a) => a.algorithmId !== selectedAlgoId).map((a) => (
              <option key={a.algorithmId} value={a.algorithmId}>{a.algorithmName}</option>
            ))}
          </select>
        </label>
        <label className="axis-picker">
          Cell
          <select value={selectedCell} onChange={(e) => onCellChange(e.target.value)}>
            {filteredCellNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flow-config-specs" style={{marginTop:"0.5rem"}}>
        {algorithms.filter((a) => a.algorithmId === selectedAlgoId || a.algorithmId === compareAlgoId).map((a) => {
          const c = a.config;
          return (
            <div key={a.algorithmId} className="flow-config-specs__item">
              <strong>{a.algorithmName}</strong>
              <div className="hint">
                fold={c.folding_style} | LP={c.logical_partition ? "on" : "off"} | FM={c.fm_optimization ? "on" : "off"}<br />
                BB={c.branch_bound} | RS={c.route_solutions} | RA={c.route_accept}<br />
                M1={c.m1_dir}{c.min_m1} M2={c.m2_dir}{c.min_m2} M3_pitch={c.min_m3}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
