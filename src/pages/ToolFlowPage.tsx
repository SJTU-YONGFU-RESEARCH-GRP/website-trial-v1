import { useEffect, useMemo, useState } from "react";
import Plotly from "plotly.js-dist-min";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { DEMO_BENCHMARK, DEMO_DEVICE_OPT } from "../data/toolFlowDemoData";
import { findCell } from "../data/toolFlowTypes";
import { FlowOverviewCard } from "./flow/FlowOverviewCard";
import { AlgorithmSelectorCard } from "./flow/AlgorithmSelectorCard";
import { LibrarySummaryCard } from "./flow/LibrarySummaryCard";
import { CellAlgorithmHeatmapCard } from "./flow/CellAlgorithmHeatmapCard";
import { StageTimelineCard } from "./flow/StageTimelineCard";
import { CellDetailCard } from "./flow/CellDetailCard";
import { LayoutStageCard } from "./flow/LayoutStageCard";
import { ParasiticStageCard } from "./flow/ParasiticStageCard";
import { TimingStageCard } from "./flow/TimingStageCard";
import { DeviceOptCard } from "./flow/DeviceOptCard";
import { FailureTable } from "./flow/FailureTable";
import { ArtifactTableCard } from "./flow/ArtifactTableCard";

/* ═══════════════════════════════════════════════════════════════════ */
/*  ToolFlowPage — CFET Library Benchmark Dashboard                    */
/* ═══════════════════════════════════════════════════════════════════ */
export function ToolFlowPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const benchmark = DEMO_BENCHMARK;

  /* ─── State: selected algorithm, comparison algorithm, and cell ─── */
  const [selectedAlgoId, setSelectedAlgoId] = useState(
    benchmark.algorithms[0]?.algorithmId ?? "",
  );
  const [compareAlgoId, setCompareAlgoId] = useState("");
  const [selectedCell, setSelectedCell] = useState(
    benchmark.cellResults[0]?.cellName ?? "",
  );

  /* Sync default cell when benchmark changes (no-op for demo) */
  useEffect(() => {
    if (benchmark.cellResults.length > 0 && !benchmark.cellResults.some((c) => c.cellName === selectedCell)) {
      setSelectedCell(benchmark.cellResults[0].cellName);
    }
  }, [benchmark, selectedCell]);

  /* ─── Derived data ─── */
  const cellResult = useMemo(
    () => findCell(benchmark, selectedCell),
    [benchmark, selectedCell],
  );

  const algorithmsForCell = useMemo(
    () => {
      if (!cellResult) return benchmark.algorithms;
      const algoIds = cellResult.algorithmResults.map((r) => r.algorithmId);
      return benchmark.algorithms.filter((a) => algoIds.includes(a.algorithmId));
    },
    [benchmark.algorithms, cellResult],
  );

  const algoResultsForCell = useMemo(
    () => {
      if (!cellResult) return [];
      return cellResult.algorithmResults;
    },
    [cellResult],
  );

  /* ─── re-layout Plotly containers on narrow reflow ─── */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const all = document.querySelectorAll<HTMLElement>(
        ".plot-host > div.js-plotly-plot",
      );
      for (const el of all) {
        void Plotly.Plots.resize(el);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [narrow]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  Render                                                         */
  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Card 1: Flow Overview */}
      <FlowOverviewCard />

      {/* Card 2: Algorithm & Cell Selector */}
      <AlgorithmSelectorCard
        algorithms={benchmark.algorithms}
        cellResults={benchmark.cellResults}
        selectedCell={selectedCell}
        selectedAlgoId={selectedAlgoId}
        compareAlgoId={compareAlgoId}
        onCellChange={setSelectedCell}
        onAlgoChange={setSelectedAlgoId}
        onCompareAlgoChange={setCompareAlgoId}
      />

      {/* Card 3: Stage Timeline */}
      <StageTimelineCard stages={benchmark.stages} />

      {/* Card 4: Library Summary — grouped bar chart */}
      <LibrarySummaryCard
        summaries={benchmark.summaries}
        algorithms={benchmark.algorithms}
      />

      {/* Card 5: Cell × Algorithm Heatmap */}
      <CellAlgorithmHeatmapCard
        cellResults={benchmark.cellResults}
        algorithms={benchmark.algorithms}
      />

      {/* Card 6: Per-Cell Detail */}
      <CellDetailCard
        cellResult={cellResult}
        algorithms={algorithmsForCell}
      />

      {/* Card 7: Layout Stage — per-algorithm comparison */}
      <LayoutStageCard
        results={algoResultsForCell}
        algorithms={algorithmsForCell}
      />

      {/* Card 8: Parasitic Extraction */}
      <ParasiticStageCard
        results={algoResultsForCell}
        selectedCell={selectedCell}
      />

      {/* Card 9: Timing Characterization — algorithm overlay */}
      <TimingStageCard
        results={algoResultsForCell}
        algorithms={algorithmsForCell}
        selectedCell={selectedCell}
      />

      {/* Card 10: Failure / Robustness Table */}
      <FailureTable
        cellResults={benchmark.cellResults}
        algorithms={benchmark.algorithms}
      />

      {/* Card 11: DeviceOpt — standalone CFET optimization */}
      <DeviceOptCard deviceOpt={DEMO_DEVICE_OPT} />

      {/* Card 12: Artifact Table */}
      <ArtifactTableCard
        artifacts={benchmark.artifacts}
        label={benchmark.id}
      />
    </div>
  );
}
