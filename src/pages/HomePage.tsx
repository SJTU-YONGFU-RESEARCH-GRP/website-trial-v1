const TOOLS = [
  {
    title: "Overall Flow",
    subtitle: "layout → PEX → timing characterization",
    repo: "layout2timing_flow",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/layout2timing_flow",
    flowPath: "/#/flow",
    description:
      "End-to-end design flow connecting layout generation, parasitic extraction, and timing characterization for digital standard cells.",
  },
  {
    title: "Layout Generation",
    subtitle: "AutoCellGen-V2",
    repo: "AutoCellGen_V2",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/AutoCellGen_V2",
    description:
      "Automated standard-cell layout generation engine. Produces GDSII layout from transistor-level netlists with design-rule-correct placement and routing.",
  },
  {
    title: "Parasitic Extraction",
    subtitle: "fastercap_v2",
    repo: "fastercap_v2",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/fastercap_v2",
    description:
      "Fast parasitic capacitance extraction for VLSI layouts. Computes Maxwell capacitance matrices and generates annotated CDL netlists for post-layout simulation.",
  },
  {
    title: "Device Optimization",
    subtitle: "DeviceOpt",
    repo: "DeviceOpt",
    url: "https://github.com/SJTU-YONGFU-RESEARCH-GRP/DeviceOpt",
    description:
      "Multi-objective device geometry optimizer. Sweeps transistor dimensions → extracts parasitics → evaluates Pareto frontier for performance, area, and power.",
  },
] as const;

export function HomePage(): JSX.Element {
  return (
    <div>
      <p className="home-intro">
        <strong>Design Analytics Platform</strong> — Integrated EDA tool suite for
        standard-cell characterization, from layout generation to parasitic extraction
        and device optimization.
      </p>
      <div className="tool-grid">
        {TOOLS.map((t) => (
          <div className="chart-card tool-card" key={t.title}>
            <div className="tool-card__header">
              <h2>{t.title}</h2>
              <span className="tool-card__subtitle">{t.subtitle}</span>
            </div>
            <p className="hint">{t.description}</p>
            <a
              className="tool-card__link"
              href={t.flowPath || t.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.flowPath ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
              )}
              <span>{t.repo}</span>
            </a>
          </div>
        ))}
      </div>
      <p className="note">
        <strong>Navigation:</strong>{" "}
        <a href="/#/flow">Flow</a> &middot;{" "}
        <a href="/#/plotly">Digital Circuits</a> &middot;{" "}
        <a href="/#/analog">Analog Circuits</a>
        <br />
        Refer to each tool's repository for documentation, source code, and usage
        examples (private organization repos).
      </p>
    </div>
  );
}
