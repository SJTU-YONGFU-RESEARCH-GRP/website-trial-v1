export function HomePage(): JSX.Element {
  return (
    <div>
      <div className="chart-card">
        <h2>Why this demo</h2>
        <p className="hint" style={{ marginBottom: "0.75rem" }}>
          Compare <strong>Plotly.js</strong> and <strong>ECharts</strong> for the same
          PPA-style visuals: Pareto scatter (Fmax vs power) and bit-width scaling.
          Built with <strong>Vite + React</strong> (recommended in docs for JSON-driven
          dashboards + GitHub Pages).
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--text-secondary)" }}>
          <li>
            <strong>HashRouter</strong> (<code>#/plotly</code>) works on GitHub Project
            Pages without server rewrite rules.
          </li>
          <li>
            <strong>Plotly</strong> includes a richer mode bar (zoom, pan, PNG download,
            etc.). <strong>ECharts</strong> adds a small toolbox with PNG export on each
            chart; interaction model differs from Plotly.
          </li>
          <li>
            Chart containers use <strong>min-height</strong> and{" "}
            <strong>viewport units</strong> so phones get usable plot area.
          </li>
        </ul>
      </div>
      <p className="note">
        <strong>Mobile:</strong> Both libraries support touch (pan/zoom). ECharts tends
        to feel snappier on low-end phones if you enable{" "}
        <code>dataZoom</code> sliders; Plotly bundles are larger (slower first load).
        Try both routes on a real device.
      </p>
    </div>
  );
}
