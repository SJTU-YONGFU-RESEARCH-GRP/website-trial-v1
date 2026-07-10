import { useMemo } from "react";
import type { LibraryAlgorithmSummary, LayoutRoutingAlgorithm, CellBenchmarkResult } from "../../data/toolFlowTypes";
import { commonCompletedCells, deltaPct, findAlgoResult } from "../../data/toolFlowTypes";

interface LibrarySummaryCardProps {
  summaries: LibraryAlgorithmSummary[];
  algorithms: LayoutRoutingAlgorithm[];
  cellResults: CellBenchmarkResult[];
  baselineAlgoId: string;
  compareAlgoId: string;
}

function KpiCard({ label, baseline, compare, unit, lowerIsBetter }: {
  label: string; baseline: number; compare: number | null; unit: string; lowerIsBetter: boolean;
}): JSX.Element {
  const delta = compare !== null ? deltaPct(compare, baseline) : null;
  const improved = delta !== null && ((lowerIsBetter && delta < 0) || (!lowerIsBetter && delta > 0));
  const worsened = delta !== null && ((lowerIsBetter && delta > 0) || (!lowerIsBetter && delta < 0));
  return (
    <div className="flow-kpi-card">
      <div className="flow-kpi-card__label">{label}</div>
      <div className="flow-kpi-card__value">
        {baseline.toFixed(1)}{unit}
      </div>
      {delta !== null && (
        <div className={`flow-kpi-card__delta ${improved ? "flow-kpi-card__delta--good" : worsened ? "flow-kpi-card__delta--bad" : ""}`}>
          {delta > 0 ? "+" : ""}{delta}%
        </div>
      )}
    </div>
  );
}

export function LibrarySummaryCard({
  summaries, algorithms, cellResults, baselineAlgoId, compareAlgoId,
}: LibrarySummaryCardProps): JSX.Element {
  const baselineSum = summaries.find((s) => s.algorithmId === baselineAlgoId) ?? null;
  const compareSum = summaries.find((s) => s.algorithmId === compareAlgoId) ?? null;

  const baselineAlgo = algorithms.find((a) => a.algorithmId === baselineAlgoId);
  const compareAlgo = algorithms.find((a) => a.algorithmId === compareAlgoId);

  const commonCells = useMemo(
    () => commonCompletedCells(cellResults, baselineAlgoId, compareAlgoId),
    [cellResults, baselineAlgoId, compareAlgoId],
  );

  // Compute common-cell geo-mean delay
  const commonGeoMean = useMemo(() => {
    if (commonCells.length === 0) return { baseline: 0, compare: 0 };
    let bLogSum = 0, cLogSum = 0, bCount = 0, cCount = 0;
    for (const cell of commonCells) {
      const br = findAlgoResult(cell, baselineAlgoId);
      const cr = findAlgoResult(cell, compareAlgoId);
      if (br?.timing?.geomeanDelayPs) { bLogSum += Math.log(br.timing.geomeanDelayPs); bCount++; }
      if (cr?.timing?.geomeanDelayPs) { cLogSum += Math.log(cr.timing.geomeanDelayPs); cCount++; }
    }
    return { baseline: bCount > 0 ? Math.exp(bLogSum / bCount) : 0, compare: cCount > 0 ? Math.exp(cLogSum / cCount) : 0 };
  }, [commonCells, baselineAlgoId, compareAlgoId]);

  // Common-cell output cap
  const commonCaps = useMemo(() => {
    let bSum = 0, cSum = 0, bN = 0, cN = 0;
    for (const cell of commonCells) {
      const br = findAlgoResult(cell, baselineAlgoId);
      const cr = findAlgoResult(cell, compareAlgoId);
      if (br?.parasitics) { bSum += br.parasitics.netCaps.reduce((s,n) => s+n.cSelfFF, 0); bN += br.parasitics.netCaps.length; }
      if (cr?.parasitics) { cSum += cr.parasitics.netCaps.reduce((s,n) => s+n.cSelfFF, 0); cN += cr.parasitics.netCaps.length; }
    }
    return { baseline: bN > 0 ? bSum / bN : 0, compare: cN > 0 ? cSum / cN : 0 };
  }, [commonCells, baselineAlgoId, compareAlgoId]);

  // Common-cell runtime
  const commonRuntime = useMemo(() => {
    let bRt = 0, cRt = 0;
    for (const cell of commonCells) {
      const br = findAlgoResult(cell, baselineAlgoId);
      const cr = findAlgoResult(cell, compareAlgoId);
      if (br?.layout?.runtimeSec) bRt += br.layout.runtimeSec;
      if (cr?.layout?.runtimeSec) cRt += cr.layout.runtimeSec;
    }
    return { baseline: bRt, compare: cRt };
  }, [commonCells, baselineAlgoId, compareAlgoId]);

  // Worst regression cell
  const worstCell = useMemo(() => {
    let worst = "", worstD = 0;
    for (const cell of commonCells) {
      const br = findAlgoResult(cell, baselineAlgoId);
      const cr = findAlgoResult(cell, compareAlgoId);
      if (br?.timing && cr?.timing) {
        const d = deltaPct(cr.timing.geomeanDelayPs, br.timing.geomeanDelayPs);
        if (d !== null && d > worstD) { worstD = d; worst = cell.cellName; }
      }
    }
    return { name: worst, delta: worstD };
  }, [commonCells, baselineAlgoId, compareAlgoId]);

  // Auto-generated conclusion
  const conclusion = useMemo(() => {
    if (!baselineSum || !compareSum) return "Select a comparison algorithm to see analysis.";
    const lines: string[] = [];
    const bAlgo = baselineAlgo?.algorithmName ?? baselineAlgoId;
    const cAlgo = compareAlgo?.algorithmName ?? compareAlgoId;

    if (commonCells.length < cellResults.length) {
      const missing = cellResults.length - commonCells.length;
      lines.push(`${missing} cell(s) failed in one or both algorithms. Analysis uses ${commonCells.length} common cells.`);
    }

    const bCover = baselineSum?.coverage;
    const cCover = compareSum?.coverage;
    if (bCover && cCover) {
      lines.push(`${bAlgo}: ${bCover.completedCells}/${bCover.totalCells} cells complete (${(bCover.completedCells/bCover.totalCells*100).toFixed(0)}%); ${cAlgo}: ${cCover.completedCells}/${cCover.totalCells} cells complete (${(cCover.completedCells/cCover.totalCells*100).toFixed(0)}%).`);
    }

    if (commonGeoMean.baseline > 0 && commonGeoMean.compare > 0) {
      const d = deltaPct(commonGeoMean.compare, commonGeoMean.baseline);
      lines.push(`Common-cell geo-mean delay: ${cAlgo} ${d !== null && d >= 0 ? "+" : ""}${d}% vs ${bAlgo}.`);
    }

    const bArea = baselineSum?.totalAreaUm2 ?? 0;
    const cArea = compareSum?.totalAreaUm2 ?? 0;
    if (bArea > 0 && cArea > 0) {
      lines.push(`Common-cell total area: ${cAlgo} ${deltaPct(cArea, bArea)?.toFixed(1) ?? "—"}% vs ${bAlgo}.`);
    }

    if (worstCell.name) {
      lines.push(`Worst regression: ${worstCell.name} at +${worstCell.delta}% delay.`);
    }

    return lines.join(" ");
  }, [baselineSum, compareSum, cellResults, commonCells, baselineAlgo, compareAlgo, commonGeoMean, worstCell]);

  if (!baselineSum) return <div className="chart-card"><h2>KPI Summary</h2><p className="hint">No data for selected baseline.</p></div>;

  return (
    <div className="chart-card">
      <h2>Library KPIs — Common-Cell Intersection ({commonCells.length} cells)</h2>
      <p className="hint">
        All Δ% computed over the same {commonCells.length} cells that both algorithms completed successfully.
        Lower area/delay/runtime is better. Common-cell intersection ensures statistical fairness.
      </p>

      <div className="flow-kpi-grid">
        <KpiCard label="Success Rate" baseline={(baselineSum.coverage.completedCells / baselineSum.coverage.totalCells) * 100} compare={compareSum ? (compareSum.coverage.completedCells / compareSum.coverage.totalCells) * 100 : null} unit="%" lowerIsBetter={false} />
        <KpiCard label="Common-cell Geo-mean Delay" baseline={commonGeoMean.baseline} compare={compareSum ? commonGeoMean.compare : null} unit=" ps" lowerIsBetter={true} />
        <KpiCard label="Common-cell Area (total)" baseline={baselineSum.totalAreaUm2} compare={compareSum?.totalAreaUm2 ?? null} unit=" grid²" lowerIsBetter={true} />
        <KpiCard label="Common-cell Output Cap (avg)" baseline={commonCaps.baseline} compare={compareSum ? commonCaps.compare : null} unit=" fF" lowerIsBetter={true} />
        <KpiCard label="Common-cell Runtime (total)" baseline={commonRuntime.baseline} compare={compareSum ? commonRuntime.compare : null} unit=" s" lowerIsBetter={true} />
      </div>

      <div className="flow-auto-conclusion" style={{marginTop:"0.75rem", padding:"0.5rem 0.75rem", background:"var(--surface2, #f0f4f8)", borderRadius:"6px", fontSize:"0.85rem"}}>
        <strong>Auto-analysis:</strong> {conclusion}
      </div>
    </div>
  );
}
