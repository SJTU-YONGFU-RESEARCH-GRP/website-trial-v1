import { useEffect, useMemo, useState } from "react";
import { loadPpaAstReport } from "../../data/ppaDataLoader";
import type {
  PpaAstReport,
  PpaMetricRecord,
  PpaNormalizedMetricRecord,
  PpaRunManifest,
} from "../../data/ppaTypes";

interface Props {
  run: PpaRunManifest;
  onClose: () => void;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toPrecision(7);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function spanLabel(span: { start: { line: number; column: number }; end: { line: number; column: number } }): string {
  return `${span.start.line}:${span.start.column}–${span.end.line}:${span.end.column}`;
}

function SummaryObject({ title, values }: { title: string; values?: Record<string, unknown> }): JSX.Element | null {
  if (!values) return null;
  const entries = Object.entries(values).filter(([, value]) => value === null || typeof value !== "object");
  if (entries.length === 0) return null;
  return (
    <section className="ppa-detail-group">
      <h4>{title}</h4>
      <dl>
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt>{key.replaceAll("_", " ")}</dt>
            <dd>{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MetricInventory({ metrics }: { metrics: PpaMetricRecord[] }): JSX.Element {
  const categories = useMemo(
    () => [...new Set(metrics.map((metric) => metric.category ?? "<none>"))].sort(),
    [metrics],
  );
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories);

  useEffect(() => setSelectedCategories(categories), [categories]);
  const filtered = useMemo(() => {
    const selected = new Set(selectedCategories);
    const needle = query.trim().toLocaleLowerCase();
    return metrics.filter((metric) => {
      if (!selected.has(metric.category ?? "<none>")) return false;
      if (!needle) return true;
      return [metric.name, metric.raw_value, metric.unit, ...metric.qualifiers.map((item) => item.value)]
        .filter((value): value is string => Boolean(value))
        .join("\n")
        .toLocaleLowerCase()
        .includes(needle);
    });
  }, [metrics, query, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((previous) =>
      previous.includes(category)
        ? previous.filter((value) => value !== category)
        : [...previous, category],
    );
  };

  return (
    <section className="ppa-detail-inventory">
      <div className="ppa-detail-inventory__header">
        <div>
          <h3>All parsed metrics</h3>
          <p>{filtered.length} of {metrics.length} source-ordered AST metric records</p>
        </div>
        <label>
          Search
          <input
            type="search"
            value={query}
            placeholder="Metric, qualifier, raw value"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className="ppa-category-checks">
        {categories.map((category) => (
          <label key={category}>
            <input
              type="checkbox"
              checked={selectedCategories.includes(category)}
              onChange={() => toggleCategory(category)}
            />
            {category}
          </label>
        ))}
      </div>
      <div className="ppa-table-scroll">
        <table className="ppa-table ppa-metric-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Metric AST name</th>
              <th>Category</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Qualifiers</th>
              <th>Source span</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((metric) => (
              <tr key={`${metric.index}-${metric.name}`}>
                <td>{metric.index}</td>
                <td><code>{metric.name}</code></td>
                <td>{metric.category ?? "—"}</td>
                <td className={metric.value === "Infinity" || metric.value === "NaN" ? "ppa-nonfinite" : ""}>
                  {displayValue(metric.value)}
                  <small>raw: {metric.raw_value}</small>
                </td>
                <td>{metric.unit ?? "—"}</td>
                <td>{metric.qualifiers.map((item) => `${item.name}=${item.value}`).join(" · ") || "—"}</td>
                <td><code>{spanLabel(metric.span)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NormalizedMetricTable({ metrics }: { metrics: PpaNormalizedMetricRecord[] }): JSX.Element {
  return (
    <section className="ppa-detail-inventory">
      <div className="ppa-detail-inventory__header">
        <div>
          <h3>Cross-flow normalized metrics</h3>
          <p>Canonical IDs, source lexemes, and transformations used for direct backend comparison.</p>
        </div>
      </div>
      <div className="ppa-table-scroll">
        <table className="ppa-table ppa-metric-table">
          <thead>
            <tr>
              <th>Canonical metric</th>
              <th>Normalized value</th>
              <th>Source / field</th>
              <th>Exact lexeme</th>
              <th>Transformation</th>
              <th>Source span</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => (
              <tr key={`${metric.metric_id}-${index}`}>
                <td><code>{metric.metric_id}</code></td>
                <td>{displayValue(metric.value)}<small>{metric.unit ?? "unitless"}</small></td>
                <td>{metric.source ?? "primary AST"}<small>{metric.source_field ?? "—"}</small></td>
                <td><code>{metric.raw_value ?? "—"}</code></td>
                <td>{metric.transformation ?? "direct"}{metric.note ? <small>{metric.note}</small> : null}</td>
                <td><code>{metric.span ? spanLabel(metric.span) : "—"}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportBody({ report }: { report: PpaAstReport }): JSX.Element {
  const interpretation = report.interpretation;
  return (
    <>
      <div className="ppa-detail-kpis">
        <div><span>Root</span><strong>{report.ast.root_kind}</strong></div>
        <div><span>AST nodes</span><strong>{report.ast.node_count_including_keys.toLocaleString()}</strong></div>
        <div><span>Leaves</span><strong>{report.ast.leaf_count_including_keys.toLocaleString()}</strong></div>
        <div><span>Depth</span><strong>{report.ast.max_depth}</strong></div>
        <div><span>Source bytes</span><strong>{report.ast.bytes_utf8.toLocaleString()}</strong></div>
        <div><span>Source syntax</span><strong>{report.ast.format === "csv" ? "CSV" : report.ast.standard_json ? "RFC 8259 JSON" : "Extended JSON"}</strong></div>
      </div>

      <section className="ppa-boundary">
        <strong>Source bundle</strong>
        <ul>
          <li>Primary: <code>{report.source_bundle.primary_source}</code></li>
          {report.source_bundle.supporting_sources.map((source) => (
            <li key={source.source}>Supporting: <code>{source.source}</code> · {source.bytes.toLocaleString()} bytes</li>
          ))}
        </ul>
      </section>

      <section className="ppa-boundary">
        <strong>Evidence boundary — not an overall flow verdict</strong>
        <ul>{interpretation.boundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}</ul>
      </section>

      <div className="ppa-detail-groups">
        <SummaryObject title="Design" values={interpretation.design} />
        <SummaryObject title="Configuration" values={interpretation.configuration} />
        <SummaryObject title="Timing aggregate" values={interpretation.timing_aggregate} />
        <SummaryObject title="Power (mW)" values={interpretation.power_mw} />
        <SummaryObject title="Routing" values={interpretation.routing} />
        <SummaryObject title="Signoff indicators" values={interpretation.signoff_indicators} />
        <SummaryObject title="IR drop" values={interpretation.ir_drop} />
        <SummaryObject title="Completion evidence" values={interpretation.completion} />
      </div>

      {interpretation.normalized_metric_provenance ? <NormalizedMetricTable metrics={interpretation.normalized_metric_provenance} /> : null}
      {interpretation.all_metrics ? <MetricInventory metrics={interpretation.all_metrics} /> : null}
    </>
  );
}

export function PpaReportDetail({ run, onClose }: Props): JSX.Element {
  const [report, setReport] = useState<PpaAstReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(null);
    loadPpaAstReport(run.uid)
      .then((value) => { if (!cancelled) setReport(value); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { cancelled = true; };
  }, [run.uid]);

  return (
    <section className="chart-card ppa-report-detail" id="ppa-report-detail">
      <header className="ppa-report-detail__header">
        <div>
          <span className="ppa-eyebrow">AST report detail</span>
          <h2>{run.tool} · {run.design}</h2>
          <code>UID: {run.uid}</code>
        </div>
        <button type="button" onClick={onClose}>Close detail</button>
      </header>
      <div className="ppa-source-path">
        <span>Backend</span>
        <code>data/ppa-analysis/{run.uid}/report.json</code>
        <span>Source</span>
        <code>{run.relativePath}</code>
        <span>SHA-256</span>
        <code>{run.sourceSha256}</code>
        <span>Bundle SHA-256</span>
        <code>{run.bundleSha256}</code>
      </div>
      {error ? <div className="ppa-error">Failed to load AST report: {error}</div> : null}
      {!error && !report ? <div className="ppa-loading">Loading complete AST interpretation…</div> : null}
      {report ? <ReportBody report={report} /> : null}
    </section>
  );
}
