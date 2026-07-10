import { useEffect, useMemo, useState } from "react";
import Plotly from "plotly.js-dist-min";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { DEMO_MANIFEST, DEMO_DEVICE_OPT } from "../data/toolFlowDemoData";
import type { ComparisonKind, CellClass } from "../data/toolFlowTypes";
import { findCell, commonCompletedCells } from "../data/toolFlowTypes";
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

type TabId = "exec" | "lib" | "cell" | "device" | "repro";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "exec",   label: "Executive Summary", desc: "Which algorithm is better, by how much, at what cost" },
  { id: "lib",    label: "Library Comparison", desc: "Per-cell heatmap, failures, stage timeline" },
  { id: "cell",   label: "Cell Drill-down",    desc: "Layout, PEX, timing for a single cell" },
  { id: "device", label: "Device Optimization", desc: "Upstream CFET device Pareto analysis" },
  { id: "repro",  label: "Reproducibility",    desc: "Artifacts, provenance, validation" },
];

export function ToolFlowPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const manifests = DEMO_MANIFEST.manifests;

  const [selectedManifestId, setSelectedManifestId] = useState(manifests[0]?.benchmarkId ?? "");
  const [activeTab, setActiveTab] = useState<TabId>("exec");
  const [comparisonKind, setComparisonKind] = useState<ComparisonKind>("algorithm");
  const [cellClassFilter, setCellClassFilter] = useState<CellClass | "all">("all");

  const activeManifest = manifests.find((m) => m.benchmarkId === selectedManifestId);
  const benchmark = activeManifest?.benchmark;

  const [selectedAlgoId, setSelectedAlgoId] = useState(
    benchmark?.algorithms[0]?.algorithmId ?? "",
  );
  const [compareAlgoId, setCompareAlgoId] = useState(
    benchmark?.algorithms[1]?.algorithmId ?? "",
  );
  const [selectedCell, setSelectedCell] = useState(
    benchmark?.cellResults[0]?.cellName ?? "",
  );

  useEffect(() => {
    if (!benchmark) return;
    const a0 = benchmark.algorithms[0]?.algorithmId ?? "";
    const a1 = benchmark.algorithms[1]?.algorithmId ?? "";
    setSelectedAlgoId(a0);
    setCompareAlgoId(a1);
  }, [selectedManifestId, benchmark]);

  useEffect(() => {
    if (benchmark && !benchmark.cellResults.some((c) => c.cellName === selectedCell)) {
      setSelectedCell(benchmark.cellResults[0]?.cellName ?? "");
    }
  }, [benchmark, selectedCell]);

  useEffect(() => {
    if (benchmark && !benchmark.algorithms.some((a) => a.algorithmId === selectedAlgoId)) {
      setSelectedAlgoId(benchmark.algorithms[0]?.algorithmId ?? "");
    }
  }, [benchmark, selectedAlgoId]);

  const cellResult = useMemo(
    () => (benchmark ? findCell(benchmark, selectedCell) : null),
    [benchmark, selectedCell],
  );

  const commonCount = useMemo(
    () => benchmark ? commonCompletedCells(benchmark.cellResults, selectedAlgoId, compareAlgoId).length : 0,
    [benchmark, selectedAlgoId, compareAlgoId],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(".plot-host > div.js-plotly-plot").forEach((el) => {
        void Plotly.Plots.resize(el);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [narrow, activeTab]);

  if (!benchmark) {
    return <div className="chart-card"><h2>No benchmark data</h2><p className="hint">No benchmark manifests available.</p></div>;
  }

  return (
    <div>
      <FlowOverviewCard />

      <div style={{display:"flex",gap:"0.25rem",flexWrap:"wrap",padding:"0.5rem 0",borderBottom:"1px solid var(--border,#e2e8f0)",marginBottom:"1rem"}}>
        {TABS.map((tab) => (
          <button
            key={tab.id} onClick={() => setActiveTab(tab.id)} className="tab-btn"
            style={{padding:"0.4rem 0.75rem",border:"none",borderRadius:"6px 6px 0 0",cursor:"pointer",fontSize:"0.82rem",fontWeight:activeTab===tab.id?600:400,background:activeTab===tab.id?"var(--accent,#0071e3)":"transparent",color:activeTab===tab.id?"#fff":"var(--text,#334155)",borderBottom:activeTab!==tab.id?"2px solid transparent":"none"}}
            title={tab.desc}
          >
            {narrow ? tab.label.split(" ")[0] : tab.label}
          </button>
        ))}
      </div>

      {activeTab === "exec" && (
        <>
          <AlgorithmSelectorCard manifests={manifests} selectedManifestId={selectedManifestId} algorithms={benchmark.algorithms} cellResults={benchmark.cellResults} selectedCell={selectedCell} selectedAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} comparisonKind={comparisonKind} cellClassFilter={cellClassFilter} onManifestChange={setSelectedManifestId} onCellChange={setSelectedCell} onAlgoChange={setSelectedAlgoId} onCompareAlgoChange={setCompareAlgoId} onComparisonKindChange={setComparisonKind} onCellClassFilterChange={setCellClassFilter} />
          <LibrarySummaryCard summaries={benchmark.summaries} algorithms={benchmark.algorithms} cellResults={benchmark.cellResults} baselineAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} />
          <FailureTable cellResults={benchmark.cellResults} algorithms={benchmark.algorithms} baselineAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} />
          <div className="chart-card"><p className="hint"><strong>Executive answer:</strong> Common-cell intersection covers {commonCount}/{benchmark.cellCount} cells. See KPI cards above for quantitative comparison and the auto-analysis for a plain-English conclusion.</p></div>
        </>
      )}

      {activeTab === "lib" && (
        <>
          <AlgorithmSelectorCard manifests={manifests} selectedManifestId={selectedManifestId} algorithms={benchmark.algorithms} cellResults={benchmark.cellResults} selectedCell={selectedCell} selectedAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} comparisonKind={comparisonKind} cellClassFilter={cellClassFilter} onManifestChange={setSelectedManifestId} onCellChange={setSelectedCell} onAlgoChange={setSelectedAlgoId} onCompareAlgoChange={setCompareAlgoId} onComparisonKindChange={setComparisonKind} onCellClassFilterChange={setCellClassFilter} />
          <StageTimelineCard stages={benchmark.stages} />
          <CellAlgorithmHeatmapCard cellResults={benchmark.cellResults} algorithms={benchmark.algorithms} baselineAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} cellClassFilter={cellClassFilter} />
          <FailureTable cellResults={benchmark.cellResults} algorithms={benchmark.algorithms} baselineAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} />
        </>
      )}

      {activeTab === "cell" && (
        <>
          <AlgorithmSelectorCard manifests={manifests} selectedManifestId={selectedManifestId} algorithms={benchmark.algorithms} cellResults={benchmark.cellResults} selectedCell={selectedCell} selectedAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} comparisonKind={comparisonKind} cellClassFilter={cellClassFilter} onManifestChange={setSelectedManifestId} onCellChange={setSelectedCell} onAlgoChange={setSelectedAlgoId} onCompareAlgoChange={setCompareAlgoId} onComparisonKindChange={setComparisonKind} onCellClassFilterChange={setCellClassFilter} />
          <CellDetailCard cellResult={cellResult} algorithms={benchmark.algorithms} />
          <LayoutStageCard cellResult={cellResult} algorithms={benchmark.algorithms} baselineAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} />
          <ParasiticStageCard cellResult={cellResult} baselineAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} />
          <TimingStageCard cellResult={cellResult} algorithms={benchmark.algorithms} baselineAlgoId={selectedAlgoId} compareAlgoId={compareAlgoId} cellResults={benchmark.cellResults} />
        </>
      )}

      {activeTab === "device" && (
        <DeviceOptCard deviceOpt={DEMO_DEVICE_OPT} />
      )}

      {activeTab === "repro" && (
        <>
          <ArtifactTableCard artifacts={benchmark.artifacts} label={benchmark.id} />
          <div className="chart-card">
            <h2>Reproducibility Manifest</h2>
            <p className="hint">Benchmark metadata for computational reproducibility.</p>
            {activeManifest && (
              <div className="analog-table-wrap" style={{marginTop:"0.5rem"}}>
                <table className="analog-table">
                  <tbody>
                    {Object.entries({
                      "Benchmark ID": activeManifest.benchmarkId,
                      Name: activeManifest.name,
                      Technology: activeManifest.technology,
                      "Cell set": activeManifest.cellSet,
                      "Tool commit SHA": activeManifest.toolCommitSha,
                      "Config hash": activeManifest.configHash,
                      "Rules hash": activeManifest.rulesHash,
                      Seed: String(activeManifest.seed),
                      Threads: String(activeManifest.threads),
                      "Timeout (s)": String(activeManifest.timeoutSec),
                      Host: activeManifest.host,
                      "Generated at": activeManifest.generatedAt,
                      "Data source": activeManifest.dataSource,
                      Visibility: activeManifest.visibility,
                      "Comparison kind": activeManifest.comparisonKind,
                      "Is demo": String(activeManifest.isDemo),
                    }).map(([k,v]) => (
                      <tr key={k}><td style={{fontWeight:600,whiteSpace:"nowrap"}}>{k}</td><td style={{fontSize:"0.8rem"}}><code>{v}</code></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
