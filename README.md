# Design Analytics Platform

**Vite + React + Plotly.js** static dashboard for EDA design-flow visualization, hosted on GitHub Pages.

## Routes

| Path | Page |
|------|------|
| `/#/` | Home — tool entry cards |
| `/#/flow` | Flow dashboard — CFET Standard-Cell Library P&R Algorithm Comparison Platform |
| `/#/plotly` | Digital circuit charts (Pareto, bar, heatmap, 3D, …) |
| `/#/analog` | Analog circuit charts |

## Run locally

```bash
cd website-trial-v1
npm install
npm run dev
```

The dev server runs on `http://0.0.0.0:3000`.

### npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run generate:data` | Generate deterministic design data |
| `npm run validate:flow-data` | Validate flow benchmark data integrity |
| `npm run typecheck` | Run TypeScript compiler check (`tsc --noEmit`) |
| `npm run build` | generate:data → validate:flow-data → typecheck → Vite production build |
| `npm run preview` | Preview the production build |

Build chain: `generate:data → validate:flow-data → typecheck → vite build`

## Host on GitHub Pages

URL: **`https://sjtu-yongfu-research-grp.github.io/website-trial-v1/`**

### Setup

1. GitHub → **Settings → Pages → Source: GitHub Actions**.
2. Push **`main`** (or **`master`**) — CI deploys automatically.
3. Feature branches build only (no deploy).

CI workflow: `.github/workflows/deploy-pages.yml`

## Flow Dashboard — CFET Standard-Cell Library P&R Algorithm Comparison Platform

The `/flow` page is a research-grade algorithm comparison platform structured around benchmark manifests:

### Data Model

- **`LibraryBenchmarkManifest`** — top-level container supporting multiple benchmarks, each with: technology, cellSet, tool commit SHA, config/rules hash, seed, threads, timeout, host, generatedAt, dataSource, visibility, comparisonKind.
- **`LibraryBenchmark`** — one evaluation run with algorithms, cell results, stage timelines, and artifacts.
- **`AlgorithmConfig`** — real AutoCellGen-V2 snapshot fields: `folding_style`, `logical_partition`, `branch_bound`, `refine_sol`, `remove_sym`, `remove_dom`, `route_solutions`, `route_accept`, `min_m1/m2/m3`, `m1_dir/m2_dir`, `fm_optimization`.
- **`comparisonKind`**: `"algorithm"` | `"architecture"` | `"ablation"`.
- **`LayoutData`** — dimensions in grid units (asap7_cfet config grid, not nm). Preview type tagged as `"placeholder"` | `"real-png"`.
- **`ParasiticsData`** — Maxwell capacitance matrix with proper sign convention: Cii ≥ 0 (self-capacitance), Cij ≤ 0 for i≠j (coupling). Diagonal is NOT substrate capacitance.
- **`TimingData`** — per-cell NLDM timing with geomean delay, input transition/output load grid.
- **`DeviceOptData`** — CFET device optimization with real parameters: `Hsep`, `Tsp_drain`, `Hbot`, `Tsp_psource`, `Tsp_nsource`, `FP`, `GXT`, `gate_length`. Pareto frontier computed programmatically via `buildNonDominatedPareto()` — no hand-filled `paretoFront: true`.
- **`Artifact`** — includes `hash`, `provenance`, and `visibility` (`"public"` | `"internal"` | `"redacted"`). Public website must never expose private PDK, GDS, CDL, or models.
- **Cell classes**: `inverter_buffer` | `combinational` | `arithmetic` | `sequential`.
- **Common-cell intersection** used for all fair Δ% comparisons.
- All demo data is **deterministic** (no `Math.random()`) and explicitly marked as synthetic.

### Page Layout — Tabbed

| Tab | Content |
|-----|---------|
| **Executive Summary** | Benchmark selector, comparison config, KPI cards, auto-analysis, failure report. Answers "which algorithm is better, by how much, at what cost." |
| **Library Comparison** | Δ% heatmap (diverging colorscale: green/red/gray), cell class filter, stage timeline, failures. |
| **Cell Drill-down** | Layout side-by-side previews + config diff, 3-way Maxwell heatmap (baseline/compare/diff), timing overlay with per-arc Δ%, common-cell stats. |
| **Device Optimization** | Upstream CFET device Pareto analysis. 2D/3D views, markers-only rendering, computed non-dominated set. |
| **Reproducibility** | Artifact table (hash, provenance, visibility), benchmark manifest metadata. |

### Component List

```
src/pages/flow/
├── AlgorithmSelectorCard.tsx    # Benchmark/manifest selector, comparisonKind, cell class filter, config summary
├── LibrarySummaryCard.tsx       # KPI metric cards + auto-generated analysis conclusions
├── CellAlgorithmHeatmapCard.tsx # Δ% diverging heatmap with cell class filter
├── CellDetailCard.tsx           # Side-by-side per-algorithm detail table
├── LayoutStageCard.tsx          # Same-scale layout previews, metrics table, config diff
├── ParasiticStageCard.tsx       # 3-way Maxwell heatmap (baseline/compare/diff), coupling deltas
├── TimingStageCard.tsx          # Delay vs load overlay, per-arc Δ%, common-cell stats
├── DeviceOptCard.tsx            # CFET device Pareto frontier (2D/3D, markers-only, computed Pareto)
├── FailureTable.tsx             # Cell failure/robustness report
├── ArtifactTableCard.tsx        # Artifact table with hash, provenance, visibility
├── FlowOverviewCard.tsx         # 4-step flow overview
├── StageTimelineCard.tsx        # Stage timeline
├── Badge.tsx                    # Status badge component
└── EmptyState.tsx               # Empty state placeholder
```

### Technology

- **asap7_cfet** rules (trackCount=8, cellHeight=6 grid rows, voltage=0.75V). No 12-track, 2720nm, or 130nm min-width assumptions.
- Grid units used throughout — never self-labeled as nm when uncertain.
- All pages display "⚠ Deterministic synthetic demo — not real ICRD-CFET measurements."

### Tool repositories (private)

- [layout2timing_flow](https://github.com/SJTU-YONGFU-RESEARCH-GRP/layout2timing_flow)
- [AutoCellGen_V2](https://github.com/SJTU-YONGFU-RESEARCH-GRP/AutoCellGen_V2)
- [fastercap_v2](https://github.com/SJTU-YONGFU-RESEARCH-GRP/fastercap_v2)
- [DeviceOpt](https://github.com/SJTU-YONGFU-RESEARCH-GRP/DeviceOpt)

## Dependencies

- **`plotly.js-dist-min`** — pre-minified browser bundle (3D WebGL, treemap, etc.)
- **`react-router-dom`** v6 with **HashRouter** (works on GitHub Pages)
- **`vite`** v8 + **`@vitejs/plugin-react`** v5
- **TypeScript** strict mode

## Project structure

```
src/
├── data/
│   ├── toolFlowTypes.ts         # Benchmark-centric type system + helpers (commonCompletedCells, buildNonDominatedPareto, deltaPct)
│   └── toolFlowDemoData.ts      # Deterministic synthetic demo data (multi-benchmark manifests)
├── hooks/
│   ├── usePlotlyChart.ts        # Shared Plotly rendering hook
│   └── useNarrowScreen.ts       # Responsive breakpoint hook
├── pages/
│   ├── flow/                    # Flow sub-components (14 files)
│   ├── ToolFlowPage.tsx         # Tabbed flow page
│   ├── HomePage.tsx             # Tool entry cards
│   ├── PlotlyPage.tsx
│   └── AnalogPage.tsx
├── theme/                       # Theme & chart palette
└── components/                  # Shared UI components
```
