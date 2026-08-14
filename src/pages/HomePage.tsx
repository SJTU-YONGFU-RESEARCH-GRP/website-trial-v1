import { Link } from "react-router-dom";

const TOOLS = [
  {
    title: "SPICE Model Workflow & Benchmark",
    subtitle: "Convert · Calibrate · Reduce · Expand · Compare",
    repo: "spice_model_benchmark",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark",
    flowPath: "/benchmark",
    description:
      "Unified SPICE model workspace: translate, calibrate, reduce, expand, and run configured ngspice, Spectre, or HSPICE adapters with persistent jobs and auditable results.",
  },
  {
    title: "Layout Generation",
    subtitle: "AutoCellGen-V2",
    repo: "AutoCellGen_V2",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/AutoCellGen_V2",
    flowPath: undefined,
    description:
      "Automated standard-cell layout generation engine. Produces GDSII layout from transistor-level netlists with design-rule-correct placement and routing.",
  },
  {
    title: "Parasitic Extraction",
    subtitle: "fastercap_v2",
    repo: "fastercap_v2",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/fastercap_v2",
    flowPath: undefined,
    description:
      "Fast parasitic capacitance extraction for VLSI layouts. Computes Maxwell capacitance matrices and generates annotated CDL netlists for post-layout simulation.",
  },
  {
    title: "Device Optimization",
    subtitle: "DeviceOpt",
    repo: "DeviceOpt",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/DeviceOpt",
    flowPath: undefined,
    description:
      "Multi-objective device geometry optimizer. Sweeps transistor dimensions → extracts parasitics → evaluates Pareto frontier for performance, area, and power.",
  },
] as const;

/** Quick shortcuts to the Benchmark workspace with pre-selected operations. */
const QUICK_ENTRIES = [
  { label: "Open with Convert selected", operation: "translator" },
  { label: "Open with Reduce selected", operation: "reduction" },
  { label: "Open with Expand selected", operation: "expansion" },
  { label: "Open with Calibrate selected", operation: "fitting" },
] as const;

/** External tool repository links (not top-level pages). */
const REPO_LINKS = [
  { repo: "new-spice-translator", url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/new-spice-translator" },
  { repo: "spice_model_fitting", url: "https://github.com/duhaochen-china/spice_model_fitting" },
  { repo: "spice_model_reduction", url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_reduction" },
  { repo: "spice_model_expansion", url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_expansion" },
] as const;

export function HomePage(): JSX.Element {
  return (
    <div>
      <p className="home-intro">
        <strong>Design Analytics Platform</strong> — Integrated EDA tool suite for
        standard-cell characterization, from layout generation to parasitic extraction
        and device optimization, plus a unified SPICE model workflow and cross-simulator
        benchmark workspace.
      </p>

      <div className="tool-grid">
        {TOOLS.map((t) => (
          <div className="chart-card tool-card" key={t.title}>
            <div className="tool-card__header">
              <h2>{t.title}</h2>
              <span className="tool-card__subtitle">{t.subtitle}</span>
            </div>
            <p className="hint">{t.description}</p>
            {t.flowPath ? <Link className="tool-card__link" to={t.flowPath}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>{t.repo}</span>
            </Link> : <a
              className="tool-card__link"
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>{t.repo}</span>
            </a>}
          </div>
        ))}
      </div>

      {/* Quick entry shortcuts */}
      <div className="chart-card" style={{ marginTop: "1rem" }}>
        <h3 className="flow-subsection-title">Quick Start — Benchmark Workspace</h3>
        <div className="tool-grid">
          {QUICK_ENTRIES.map((entry) => (
            <Link
              key={entry.operation}
              to={`/benchmark?operation=${entry.operation}`}
              className="chart-card"
              style={{
                display: "block",
                padding: "0.5rem 0.75rem",
                textDecoration: "none",
                color: "inherit",
                textAlign: "center",
                fontSize: "0.82rem",
              }}
            >
              {entry.label}
            </Link>
          ))}
        </div>

        <p className="hint" style={{ marginTop: "0.5rem" }}>
          Tool repositories:{" "}
          {REPO_LINKS.map((r, i) => (
            <span key={r.repo}>
              {i > 0 && " · "}
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.repo}
              </a>
            </span>
          ))}
        </p>
      </div>

      <p className="note">
        <strong>Navigation:</strong>{" "}
        <Link to="/benchmark">Benchmark</Link> &middot;{" "}
        <Link to="/plotly">Digital Circuits</Link> &middot;{" "}
        <Link to="/analog">Analog Circuits</Link>
        <br />
        Refer to each tool's repository for documentation, source code, and usage
        examples (private organization repos).
      </p>
    </div>
  );
}
