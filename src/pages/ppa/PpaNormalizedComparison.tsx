import { useEffect, useMemo, useState } from "react";
import { loadPpaAstReport } from "../../data/ppaDataLoader";
import type {
  PpaAstReport,
  PpaNormalizedMetricRecord,
  PpaRunManifest,
} from "../../data/ppaTypes";

interface Props {
  runs: readonly PpaRunManifest[];
}

interface MetricMeta {
  label: string;
  category: string;
}

interface MetricRow {
  metricId: string;
  occurrence: number;
  key: string;
}

const METRIC_META: Record<string, MetricMeta> = {
  "area.die_um2": { label: "Die area", category: "Area" },
  "area.core_um2": { label: "Core area", category: "Area" },
  "area.instance_um2": { label: "Instance area", category: "Area" },
  "design.logical_instances": { label: "Logical instances", category: "Design" },
  "design.physical_instances": { label: "Physical instances", category: "Design" },
  "design.utilization": { label: "Core utilization", category: "Design" },
  "timing.clock_period_ns": { label: "Clock period", category: "Timing" },
  "timing.critical_path_ns": { label: "Critical path", category: "Timing" },
  "timing.fmax_hz": { label: "Post-route Fmax", category: "Timing" },
  "timing.reference_setup_slack_ns": { label: "Reference setup slack", category: "Timing" },
  "timing.reference_hold_slack_ns": { label: "Reference hold slack", category: "Timing" },
  "timing.worst_setup_slack_ns": { label: "Worst setup slack", category: "Timing" },
  "timing.worst_hold_slack_ns": { label: "Worst hold slack", category: "Timing" },
  "timing.setup_violations": { label: "Setup violations", category: "Timing" },
  "timing.hold_violations": { label: "Hold violations", category: "Timing" },
  "timing.max_slew_violations": { label: "Maximum slew violations", category: "Timing" },
  "timing.max_cap_violations": { label: "Maximum capacitance violations", category: "Timing" },
  "timing.max_fanout_violations": { label: "Maximum fanout violations", category: "Timing" },
  "power.internal_mw": { label: "Internal power", category: "Power" },
  "power.switching_mw": { label: "Switching power", category: "Power" },
  "power.leakage_mw": { label: "Leakage power", category: "Power" },
  "power.total_mw": { label: "Total power", category: "Power" },
  "routing.wirelength_um": { label: "Routed wire length", category: "Routing" },
  "routing.vias": { label: "Via count", category: "Routing" },
  "routing.drc_errors": { label: "Routing DRC errors", category: "Routing" },
};

const METRIC_ORDER = Object.keys(METRIC_META);
const METRIC_ORDER_INDEX = new Map(METRIC_ORDER.map((metricId, index) => [metricId, index]));

function metricSort(left: string, right: string): number {
  const leftIndex = METRIC_ORDER_INDEX.get(left);
  const rightIndex = METRIC_ORDER_INDEX.get(right);
  if (leftIndex !== undefined || rightIndex !== undefined) {
    if (leftIndex === undefined) return 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  }
  return left.localeCompare(right, "en");
}

function metricGroups(report: PpaAstReport): Map<string, PpaNormalizedMetricRecord[]> {
  const grouped = new Map<string, PpaNormalizedMetricRecord[]>();
  for (const metric of report.interpretation.normalized_metric_provenance ?? []) {
    const records = grouped.get(metric.metric_id) ?? [];
    records.push(metric);
    grouped.set(metric.metric_id, records);
  }
  return grouped;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function displayUnknown(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") {
    return value.toLocaleString(undefined, {
      maximumSignificantDigits: 8,
      useGrouping: Math.abs(value) >= 1000,
    });
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function displayMetricValue(metric: PpaNormalizedMetricRecord): string {
  if (!isFiniteNumber(metric.value)) return displayUnknown(metric.value);
  if (metric.unit === "ratio") {
    return `${(metric.value * 100).toLocaleString(undefined, { maximumFractionDigits: 5 })}%`;
  }
  return displayUnknown(metric.value);
}

function displaySigned(value: number): string {
  if (Object.is(value, -0) || value === 0) return "0";
  const formatted = Math.abs(value).toLocaleString(undefined, { maximumSignificantDigits: 6 });
  return `${value > 0 ? "+" : "−"}${formatted}`;
}

function displayDelta(value: number, baseline: number, unit: string | null): {
  absolute: string;
  percent: string;
} {
  const delta = value - baseline;
  const scale = unit === "ratio" ? 100 : 1;
  const unitLabel = unit === "ratio" ? " pp" : unit ? ` ${unit}` : "";
  const absolute = `${displaySigned(delta * scale)}${unitLabel}`;
  if (baseline === 0) return { absolute, percent: "N/A (zero baseline)" };
  return {
    absolute,
    percent: `${displaySigned((delta / Math.abs(baseline)) * 100)}%`,
  };
}

function technologyLabel(run: PpaRunManifest): string {
  return run.scl ? `${run.pdk} · ${run.scl}` : run.pdk;
}

function runLabel(run: PpaRunManifest): string {
  return `${run.flow} · ${technologyLabel(run)} · ${run.variant ?? run.uid}`;
}

function MetricCell({
  metric,
  baseline,
  isBaseline,
}: {
  metric?: PpaNormalizedMetricRecord;
  baseline?: PpaNormalizedMetricRecord;
  isBaseline: boolean;
}): JSX.Element {
  if (!metric) {
    return (
      <div className="ppa-comparison-cell ppa-comparison-cell--missing">
        <strong>N/A</strong>
      </div>
    );
  }

  const delta = isFiniteNumber(metric.value) && baseline && isFiniteNumber(baseline.value)
      && metric.unit === baseline.unit
    ? displayDelta(metric.value, baseline.value, metric.unit)
    : null;

  return (
    <div className="ppa-comparison-cell">
      <strong>{displayMetricValue(metric)}</strong>
      {!isBaseline && delta ? (
        <span className="ppa-comparison-delta">
          Δ {delta.absolute}<small>{delta.percent}</small>
        </span>
      ) : null}
      {!isBaseline && !delta ? <span className="ppa-comparison-delta">Δ N/A</span> : null}
    </div>
  );
}

export function PpaNormalizedComparison({ runs }: Props): JSX.Element {
  const [reports, setReports] = useState<Map<string, PpaAstReport>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baselineUid, setBaselineUid] = useState<string | null>(null);

  useEffect(() => {
    if (runs.length === 0) {
      setBaselineUid(null);
      return;
    }
    if (!baselineUid || !runs.some((run) => run.uid === baselineUid)) {
      setBaselineUid(runs[0].uid);
    }
  }, [baselineUid, runs]);

  useEffect(() => {
    let cancelled = false;
    if (runs.length === 0) {
      setReports(new Map());
      setLoading(false);
      setError(null);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setReports(new Map());
    setError(null);
    Promise.all(runs.map((run) => loadPpaAstReport(run.uid)))
      .then((loaded) => {
        if (!cancelled) setReports(new Map(loaded.map((report) => [report.manifest.uid, report])));
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setReports(new Map());
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [runs]);

  const comparison = useMemo(() => {
    const groupedByUid = new Map<string, Map<string, PpaNormalizedMetricRecord[]>>();
    const maxOccurrences = new Map<string, number>();
    let sourceEntryCount = 0;

    for (const run of runs) {
      const report = reports.get(run.uid);
      if (!report) continue;
      const grouped = metricGroups(report);
      groupedByUid.set(run.uid, grouped);
      for (const [metricId, records] of grouped) {
        maxOccurrences.set(metricId, Math.max(maxOccurrences.get(metricId) ?? 0, records.length));
        sourceEntryCount += records.length;
      }
    }

    const rows: MetricRow[] = [];
    for (const metricId of [...maxOccurrences.keys()].sort(metricSort)) {
      const count = maxOccurrences.get(metricId) ?? 0;
      for (let occurrence = 0; occurrence < count; occurrence += 1) {
        rows.push({ metricId, occurrence, key: `${metricId}\0${occurrence}` });
      }
    }
    const commonRowCount = rows.filter((row) =>
      runs.every((run) => Boolean(groupedByUid.get(run.uid)?.get(row.metricId)?.[row.occurrence])),
    ).length;
    return { groupedByUid, rows, commonRowCount, sourceEntryCount };
  }, [reports, runs]);

  const technologies = useMemo(
    () => new Set(runs.map((run) => technologyLabel(run))).size,
    [runs],
  );
  const expectedSourceEntries = useMemo(
    () => runs.reduce((sum, run) => {
      const report = reports.get(run.uid);
      return sum + (report?.interpretation.normalized_metric_provenance?.length ?? 0);
    }, 0),
    [reports, runs],
  );
  const baselineGroups = baselineUid ? comparison.groupedByUid.get(baselineUid) : undefined;

  return (
    <section className="chart-card ppa-normalized-comparison">
      <div className="ppa-comparison-header">
        <div>
          <span className="ppa-eyebrow">Normalized comparison</span>
          <h2>All normalized metrics</h2>
          <p className="hint">
            Rows are the complete union of canonical entries in the selected reports. Each report column shows
            only its normalized value and baseline delta; an absent backend field is shown explicitly as N/A.
          </p>
        </div>
        <label className="ppa-baseline-select">
          <span>Comparison baseline</span>
          <select
            value={baselineUid ?? ""}
            disabled={runs.length === 0}
            onChange={(event) => setBaselineUid(event.target.value || null)}
          >
            {runs.map((run) => <option key={run.uid} value={run.uid}>{runLabel(run)}</option>)}
          </select>
        </label>
      </div>

      <div className="ppa-comparison-stats" aria-label="Normalized comparison coverage">
        <div><span>Selected process variants</span><strong>{technologies}</strong></div>
        <div><span>Canonical union rows</span><strong>{comparison.rows.length}</strong></div>
        <div><span>Rows shared by every report</span><strong>{comparison.commonRowCount}</strong></div>
        <div>
          <span>Source entries displayed</span>
          <strong>{comparison.sourceEntryCount} / {expectedSourceEntries}</strong>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="ppa-empty">Select one or more final reports to load the normalized metric matrix.</div>
      ) : null}
      {loading ? <div className="ppa-loading">Loading every selected normalized metric…</div> : null}
      {error ? <div className="ppa-error">Failed to load normalized comparison: {error}</div> : null}

      {!loading && !error && runs.length > 0 ? (
        <div className="ppa-table-scroll ppa-comparison-scroll">
          <table
            className="ppa-table ppa-comparison-table"
            style={{ minWidth: `${Math.max(820, 260 + runs.length * 270)}px` }}
          >
            <thead>
              <tr>
                <th>Canonical metric</th>
                {runs.map((run) => {
                  const sourceCount = reports.get(run.uid)?.interpretation.normalized_metric_provenance?.length ?? 0;
                  const unionCoverage = comparison.rows.filter((row) =>
                    Boolean(comparison.groupedByUid.get(run.uid)?.get(row.metricId)?.[row.occurrence]),
                  ).length;
                  return (
                    <th key={run.uid} className={run.uid === baselineUid ? "is-baseline" : ""}>
                      <strong>{run.flow}</strong>
                      <span>{technologyLabel(run)}</span>
                      <code>{run.uid}</code>
                      <small>{run.design}{run.variant ? ` · ${run.variant}` : ""}</small>
                      <small>{sourceCount}/{sourceCount} source entries shown · {unionCoverage}/{comparison.rows.length} union rows</small>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => {
                const meta = METRIC_META[row.metricId];
                const baseline = baselineGroups?.get(row.metricId)?.[row.occurrence];
                return (
                  <tr key={row.key}>
                    <th scope="row">
                      <span>{meta?.category ?? row.metricId.split(".")[0] ?? "Other"}</span>
                      <strong>{meta?.label ?? row.metricId.replaceAll("_", " ")}</strong>
                      <code>{row.metricId}</code>
                      {row.occurrence > 0 ? <small>occurrence {row.occurrence + 1}</small> : null}
                    </th>
                    {runs.map((run) => (
                      <td key={run.uid} className={run.uid === baselineUid ? "is-baseline" : ""}>
                        <MetricCell
                          metric={comparison.groupedByUid.get(run.uid)?.get(row.metricId)?.[row.occurrence]}
                          baseline={baseline}
                          isBaseline={run.uid === baselineUid}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="ppa-comparison-footnote">
        Δ is candidate minus baseline. Percent Δ uses |baseline|; utilization absolute Δ is shown in percentage
        points. The table does not infer “better” because the preferred direction depends on the metric.
      </p>
    </section>
  );
}
