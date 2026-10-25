import { useEffect, useMemo, useState } from "react";
import { loadPpaAstReport } from "../../data/ppaDataLoader";
import type {
  PpaAstReport,
  PpaRunManifest,
  PpaStandardCellUsage,
} from "../../data/ppaTypes";

interface Props {
  runs: readonly PpaRunManifest[];
}

type SortDirection = "asc" | "desc";

interface CellUsageSort {
  key: string;
  direction: SortDirection;
}

const MASTER_SORT_KEY = "standard-cell-master";

interface CoreMetric {
  key: "performance" | "power" | "area";
  label: string;
  note: string;
  direction: "max" | "min";
  value: (run: PpaRunManifest) => number | null;
  comparable?: (run: PpaRunManifest) => boolean;
  format: (value: number) => string;
}

const CORE_METRICS: readonly CoreMetric[] = [
  {
    key: "performance",
    label: "Performance",
    note: "Post-route Fmax",
    direction: "max",
    value: (run) => run.summary.fmaxHz === null ? null : run.summary.fmaxHz / 1e6,
    format: (value) => `${value.toLocaleString(undefined, { maximumSignificantDigits: 7 })} MHz`,
  },
  {
    key: "power",
    label: "Power",
    note: "Reference total power",
    direction: "min",
    value: (run) => run.summary.totalPowerMw,
    comparable: (run) => run.summary.powerComparisonValid,
    format: (value) => `${value.toLocaleString(undefined, { maximumSignificantDigits: 7 })} mW`,
  },
  {
    key: "area",
    label: "Area",
    note: "Normalized die area",
    direction: "min",
    value: (run) => run.summary.areaUm2,
    format: (value) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} µm²`,
  },
];

function signed(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString()}`;
}

function runTechnology(run: PpaRunManifest): string {
  return `${run.flow} · ${run.pdk}${run.scl ? ` · ${run.scl}` : ""}`;
}

function runVariant(run: PpaRunManifest): string {
  return run.variant ?? run.design;
}

function isSameBest(value: number, best: number): boolean {
  return Math.abs(value - best) <= Math.max(1, Math.abs(best)) * 1e-10;
}

function CoreMetricSummary({ metric, runs }: { metric: CoreMetric; runs: readonly PpaRunManifest[] }): JSX.Element {
  const entries = runs.map((run, index) => ({
    run,
    index,
    value: metric.value(run),
    comparable: metric.comparable?.(run) ?? true,
  }));
  const values = entries.filter(
    (entry): entry is { run: PpaRunManifest; index: number; value: number; comparable: true } =>
      entry.comparable && entry.value !== null && Number.isFinite(entry.value),
  );
  const best = values.length === 0
    ? null
    : metric.direction === "max"
      ? Math.max(...values.map((entry) => entry.value))
      : Math.min(...values.map((entry) => entry.value));
  const orderedEntries = [...entries].sort((left, right) => {
    const leftIsBest = left.value !== null && best !== null && isSameBest(left.value, best);
    const rightIsBest = right.value !== null && best !== null && isSameBest(right.value, best);
    if (leftIsBest !== rightIsBest) return leftIsBest ? -1 : 1;
    return left.index - right.index;
  });

  return (
    <article className={`ppa-core-metric ppa-core-metric--${metric.key}`}>
      <header>
        <h3>{metric.label}</h3>
        <span>{metric.note}</span>
      </header>
      <div className="ppa-core-metric__results">
        {orderedEntries.map(({ run, value, comparable }) => {
          const bestResult = comparable && value !== null && best !== null && isSameBest(value, best);
          return (
            <div key={run.uid} className={bestResult ? "is-best" : value === null || !comparable ? "is-na" : ""}>
              <div>
                <strong>{runTechnology(run)}</strong>
                <small>{runVariant(run)} · UID {run.uid}</small>
              </div>
              <span>{value === null ? "N/A" : metric.format(value)}</span>
              {bestResult ? <b>Best</b> : null}
              {!comparable && value !== null ? <b title={run.summary.powerComparisonReason ?? undefined}>Not comparable</b> : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function inventoryMap(inventory?: PpaStandardCellUsage): Map<string, number> {
  return new Map(inventory?.cells.map((record) => [record.master, record.count]) ?? []);
}

export function PpaSummary({ runs }: Props): JSX.Element {
  const [reports, setReports] = useState<Map<string, PpaAstReport>>(new Map());
  const [loadErrors, setLoadErrors] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [cellSort, setCellSort] = useState<CellUsageSort>({ key: "", direction: "desc" });

  useEffect(() => {
    setCellSort((current) => {
      if (runs.length === 0) return current.key === "" ? current : { key: "", direction: "desc" };
      if (current.key === MASTER_SORT_KEY || runs.some((run) => run.uid === current.key)) return current;
      return { key: runs[0].uid, direction: "desc" };
    });
  }, [runs]);

  useEffect(() => {
    let cancelled = false;
    if (runs.length === 0) {
      setReports(new Map());
      setLoadErrors(new Map());
      setLoading(false);
      return () => { cancelled = true; };
    }
    setReports(new Map());
    setLoadErrors(new Map());
    setLoading(true);
    Promise.allSettled(runs.map((run) => loadPpaAstReport(run.uid)))
      .then((settled) => {
        if (cancelled) return;
        const nextReports = new Map<string, PpaAstReport>();
        const nextErrors = new Map<string, string>();
        settled.forEach((result, index) => {
          const run = runs[index];
          if (result.status === "fulfilled") nextReports.set(run.uid, result.value);
          else nextErrors.set(run.uid, result.reason instanceof Error ? result.reason.message : String(result.reason));
        });
        setReports(nextReports);
        setLoadErrors(nextErrors);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [runs]);

  const comparison = useMemo(() => {
    const inventories = new Map<string, PpaStandardCellUsage | undefined>();
    const counts = new Map<string, Map<string, number>>();
    const union = new Set<string>();
    for (const run of runs) {
      const inventory = reports.get(run.uid)?.interpretation.standard_cell_usage;
      inventories.set(run.uid, inventory);
      const byMaster = inventoryMap(inventory);
      counts.set(run.uid, byMaster);
      for (const master of byMaster.keys()) union.add(master);
    }

    const baseline = runs[0];
    const baselineInventory = baseline ? inventories.get(baseline.uid) : undefined;
    const baselineCounts = baseline ? counts.get(baseline.uid) ?? new Map<string, number>() : new Map<string, number>();
    const sortKey = cellSort.key || baseline?.uid || MASTER_SORT_KEY;
    const masters = [...union].sort((left, right) => {
      let order = 0;
      if (sortKey === MASTER_SORT_KEY) {
        order = left.localeCompare(right, "en");
      } else if (inventories.get(sortKey)?.availability === "available") {
        const sortCounts = counts.get(sortKey) ?? new Map<string, number>();
        order = (sortCounts.get(left) ?? 0) - (sortCounts.get(right) ?? 0);
      }
      if (order !== 0) return cellSort.direction === "asc" ? order : -order;
      return left.localeCompare(right, "en");
    });
    return { inventories, counts, masters, baselineInventory, baselineCounts, sortKey };
  }, [cellSort, reports, runs]);

  const changeCellSort = (key: string): void => {
    setCellSort((current) => ({
      key,
      direction: current.key === key
        ? current.direction === "desc" ? "asc" : "desc"
        : key === MASTER_SORT_KEY ? "asc" : "desc",
    }));
  };

  const baseline = runs[0];
  return (
    <section className="chart-card ppa-summary" aria-labelledby="ppa-summary-title">
      <header className="ppa-summary__header">
        <div>
          <h2 id="ppa-summary-title">Summary</h2>
          <p className="hint">Performance, total power, and normalized die area for every selected result. Best values are highlighted automatically.</p>
        </div>
        {runs.length > 0 ? <span>{runs.length} selected result{runs.length === 1 ? "" : "s"}</span> : null}
      </header>

      {!baseline ? <div className="ppa-empty">Select at least one report to populate Summary.</div> : null}
      {baseline ? (
        <section className="ppa-core-summary" aria-label="Selected PPA headline metrics">
          {CORE_METRICS.map((metric) => <CoreMetricSummary key={metric.key} metric={metric} runs={runs} />)}
        </section>
      ) : null}

      {baseline ? (
        <section className="ppa-cell-usage">
          <div className="ppa-cell-usage__header">
            <div>
              <h3>Final standard-cell usage</h3>
              <p>Exact final/post-fill DEF <code>COMPONENTS</code> counts, including functional and physical-only cells.</p>
            </div>
            <div className="ppa-cell-usage__stats">
              <span><strong>{comparison.masters.length}</strong> union masters</span>
              <span><strong>{runs.filter((run) => comparison.inventories.get(run.uid)?.availability === "available").length}</strong> sourced columns</span>
            </div>
          </div>

          {loading ? <div className="ppa-loading">Loading selected final-DEF component inventories…</div> : null}
          {!loading && comparison.baselineInventory?.availability !== "available" ? (
            <div className="ppa-boundary">
              The first-selected baseline has no retained authoritative final/post-fill DEF. Its column remains
              the baseline and shows N/A; row order falls back to the highest count among other selected results.
            </div>
          ) : null}
          {!loading && loadErrors.size > 0 ? (
            <div className="ppa-error">{loadErrors.size} selected report file(s) could not be loaded; their columns remain visible as N/A.</div>
          ) : null}

          {!loading ? (
            <div className="ppa-table-scroll ppa-cell-usage__scroll">
              <table
                className="ppa-table ppa-cell-usage-table"
                style={{ minWidth: `${Math.max(760, 310 + runs.length * 220)}px` }}
              >
                <thead>
                  <tr>
                    <th
                      className={comparison.sortKey === MASTER_SORT_KEY ? "is-sort-active" : ""}
                      aria-sort={comparison.sortKey === MASTER_SORT_KEY ? cellSort.direction === "asc" ? "ascending" : "descending" : "none"}
                    >
                      <button
                        type="button"
                        className="ppa-cell-sort-button"
                        onClick={() => changeCellSort(MASTER_SORT_KEY)}
                        aria-label="Sort by standard-cell master"
                      >
                        <strong>Standard-cell master</strong>
                        {comparison.sortKey === MASTER_SORT_KEY ? <span aria-hidden="true">{cellSort.direction === "asc" ? "↑" : "↓"}</span> : null}
                      </button>
                    </th>
                    {runs.map((run, index) => {
                      const active = comparison.sortKey === run.uid;
                      return (
                      <th
                        key={run.uid}
                        className={`${index === 0 ? "is-baseline" : ""} ${active ? "is-sort-active" : ""}`.trim()}
                        aria-sort={active ? cellSort.direction === "asc" ? "ascending" : "descending" : "none"}
                      >
                        <button
                          type="button"
                          className="ppa-cell-sort-button"
                          onClick={() => changeCellSort(run.uid)}
                          aria-label={`Sort by ${runTechnology(run)} cell count`}
                        >
                          <strong>{runTechnology(run)}</strong>
                          <small>{runVariant(run)}</small>
                          {active ? <span aria-hidden="true">{cellSort.direction === "asc" ? "↑" : "↓"}</span> : null}
                        </button>
                      </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {comparison.masters.map((master) => {
                    const baselineCount = comparison.baselineCounts.get(master) ?? 0;
                    return (
                      <tr key={master}>
                        <th scope="row"><code>{master}</code></th>
                        {runs.map((run, index) => {
                          const inventory = comparison.inventories.get(run.uid);
                          const available = inventory?.availability === "available";
                          const count = comparison.counts.get(run.uid)?.get(master) ?? 0;
                          const valueClass = !available ? "is-na" : count === 0 ? "is-zero" : "";
                          return (
                            <td key={run.uid} className={`${index === 0 ? "is-baseline" : ""} ${valueClass}`.trim()}>
                              <strong>{available ? count.toLocaleString() : "N/A"}</strong>
                              {available && index > 0 && comparison.baselineInventory?.availability === "available" ? (
                                <small>Δ {signed(count - baselineCount)}</small>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {comparison.masters.length === 0 ? (
                    <tr><td colSpan={runs.length + 1} className="ppa-empty is-na">No selected report retains a usable final-DEF component inventory.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="ppa-comparison-footnote">
            Click any header to sort the rows; click it again to reverse the direction. The first selected result remains the baseline for Δ values.
          </p>
        </section>
      ) : null}
    </section>
  );
}
