# Design Analytics Platform

**Vite + React + Plotly.js** static dashboard for EDA design-flow visualization, hosted on GitHub Pages.

## Routes

| Path | Page |
|------|------|
| `/#/` | Home — tool entry cards |
| `/#/flow` | Flow dashboard — CFET Standard-Cell Library P&R Algorithm Comparison Platform |
| `/#/benchmark` | **SPICE Model Workflow & Benchmark Workspace** — unified Convert / Calibrate / Reduce / Expand / Benchmark workspace |
| `/#/plotly` | Digital circuit charts (Pareto, bar, heatmap, 3D, …) |
| `/#/analog` | Analog circuit charts |

**Legacy redirects** (goal.md §4.1):
- `/#/translator` → `/#/benchmark?operation=translator`
- `/#/reduction` → `/#/benchmark?operation=reduction`
- `/#/expansion` → `/#/benchmark?operation=expansion`

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
| `npm run typecheck` | Run TypeScript compiler check (`tsc --noEmit`) |
| `npm run validate:flow-data` | Validate flow benchmark data integrity |
| `npm run validate:spice-benchmark-data` | Validate SPICE benchmark manifest |
| `npm run validate:benchmark-workspace` | Validate benchmark workspace fixtures and contracts |
| `npm run build` | validate → typecheck → Vite production build (**hermetic** — no sibling repos required) |
| `npm run preview` | Preview the production build |
| `npm run generate:data` | Generate deterministic design data |
| `npm run generate:spice-benchmark` | Scan SPICE benchmark runs and generate manifest |
| `npm run refresh:external-data` | Explicitly refresh all external data (requires sibling repos) |

**Default build is hermetic** — only depends on committed data within this repository. External data refresh scripts are manual maintenance commands, not part of the default build pipeline.

## Host on GitHub Pages

URL: **`https://sjtu-yongfu-research-grp.github.io/website-trial-v1/`**

### Setup

1. GitHub → **Settings → Pages → Source: GitHub Actions**.
2. Push **`main`** (or **`master`**) — CI deploys automatically.
3. Feature branches build only (no deploy).

CI workflow: `.github/workflows/deploy-pages.yml`

## Benchmark — SPICE Model Workflow & Benchmark Workspace

The `/benchmark` page is a unified workspace for SPICE model processing and cross-simulator verification, integrating four external tools through a compatibility layer:

### Integrated Operations

| Operation | Tool | Repository |
|-----------|------|------------|
| **Convert** | new-spice-translator | `SJTU-YONGFU-RESEARCH-GRP/new-spice-translator` |
| **Calibrate** | spice_model_fitting | `duhaochen-china/spice_model_fitting` |
| **Reduce** | spice_model_reduction | `SJTU-YONGFU-RESEARCH-GRP/spice_model_reduction` |
| **Expand** | spice_model_expansion | `SJTU-YONGFU-RESEARCH-GRP/spice_model_expansion` |
| **Benchmark** | spice_model_benchmark | `SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark` |

### Static Demo Limitation

This is a **static frontend only**. No external tool execution occurs in the browser. All results are deterministic static demonstrations or existing repository outputs. Spectre/HSPICE resource metrics in demo mode are synthetic fixtures. Custom uploaded models stay in browser memory and are never uploaded.

### Data Origins

All data is labeled at the field/card level:
- **Existing output** — previously generated tool results
- **Derived demo** — computed from existing data
- **Synthetic demo** — deterministic demo fixture
- **Local only** — user-provided, browser-memory only
- **Not available** — data missing or not yet generated

### Page Sections

| Section | Content |
|---------|---------|
| **Setup** | Scenario selector, model input (bundled/upload/paste), operation selection, settings |
| **Workflow** | Fixed-order pipeline plan with invocation previews and compatibility nodes |
| **Simulator Comparison** | 3-simulator (ngspice/Spectre/HSPICE) cards, time/memory bar charts, status matrix |
| **Model Comparison** | KPI delta table (parameters, size, time, memory, pass rate), per-simulator comparison |
| **Processed Model** | Model code preview, copy, download, metadata |
| **Analysis Details** | Legacy benchmark data browser (runs, plots, lightbox) |
| **Tool Results** | Accordion panels per operation: metrics, warnings, artifacts, invocation |
| **Artifacts** | Filterable unified artifact table with provenance |

### Compatibility Layer

The workspace communicates with tools through typed adapters (`src/compat/spiceWorkflow/`):
- **`contracts.ts`** — Unified data model (ModelArtifact, WorkflowScenario, etc.)
- **Tool adapters** — Build argv arrays, validate parameters, normalize fixtures
- **Legacy normalizers** — Map existing manifests to unified contracts
- **`mockRuntime.ts`** — Static mock for future `ApiWorkflowRuntime`

### Future Backend Integration

The static frontend implements the `WorkflowRuntime` interface. A future backend API client (`ApiWorkflowRuntime`) implementing the same interface can replace the mock without page component changes.

## Flow Dashboard — CFET Standard-Cell Library P&R Algorithm Comparison Platform

(same as before — unchanged)

## Dependencies

- **`plotly.js-dist-min`** — pre-minified browser bundle
- **`react-router-dom`** v6 with **HashRouter** (works on GitHub Pages)
- **`vite`** v8 + **`@vitejs/plugin-react`** v5
- **TypeScript** strict mode

## Project structure

```
src/
├── compat/
│   └── spiceWorkflow/            # Tool adapter compatibility layer
│       ├── contracts.ts          # Unified data contracts
│       ├── toolAdapter.ts        # Adapter interface
│       ├── translatorAdapter.ts  # Convert adapter
│       ├── fittingAdapter.ts     # Calibrate adapter
│       ├── reductionAdapter.ts   # Reduce adapter
│       ├── expansionAdapter.ts   # Expand adapter
│       ├── benchmarkAdapter.ts   # Benchmark matrix builder
│       ├── normalizeLegacy*.ts   # Legacy manifest normalizers
│       ├── mockRuntime.ts        # Static mock runtime
│       ├── toolCatalog.ts        # Tool metadata
│       ├── validation.ts         # Data validators
│       └── formatters.ts         # Display formatters
├── data/
│   ├── benchmarkWorkspace/       # Workspace fixtures
│   │   ├── integratedDemo.ts     # Deterministic integrated demo
│   │   ├── fittingFixture.ts     # Fitting synthetic fixture
│   │   ├── bundledModels.ts      # Bundled demo models
│   │   └── selectors.ts          # Derived selectors
│   ├── SpiceBenchmarkTypes.ts    # SPICE benchmark types
│   └── generatedSpiceBenchmarkManifest.ts
├── pages/
│   ├── benchmark/                # Benchmark workspace components
│   │   ├── BenchmarkWorkspacePage.tsx  # Main workspace page
│   │   ├── ScenarioSelector.tsx
│   │   ├── ModelInputCard.tsx
│   │   ├── OperationSelector.tsx
│   │   ├── OperationSettings.tsx
│   │   ├── TranslatorSettings.tsx
│   │   ├── FittingSettings.tsx
│   │   ├── ReductionSettings.tsx
│   │   ├── ExpansionSettings.tsx
│   │   ├── WorkflowPlanCard.tsx
│   │   ├── BenchmarkSetupCard.tsx
│   │   ├── ExecutiveSummaryCard.tsx
│   │   ├── ModelLineageCard.tsx
│   │   ├── SimulatorComparisonCard.tsx
│   │   ├── ModelComparisonCard.tsx
│   │   ├── ProcessedModelCard.tsx
│   │   ├── OperationResults.tsx
│   │   ├── ArtifactTableCard.tsx
│   │   └── shared/              # Shared UI components
│   ├── HomePage.tsx
│   ├── SpiceBenchmarkPage.tsx    # Re-exports BenchmarkWorkspacePage
│   ├── PlotlyPage.tsx
│   ├── AnalogPage.tsx
│   └── flow/                     # Flow sub-components
├── hooks/
├── theme/
└── components/
```

## Tool repositories (private)

- [new-spice-translator](https://github.com/SJTU-YONGFU-RESEARCH-GRP/new-spice-translator)
- [spice_model_fitting](https://github.com/duhaochen-china/spice_model_fitting)
- [spice_model_reduction](https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_reduction)
- [spice_model_expansion](https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_expansion)
- [spice_model_benchmark](https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark)
- [layout2timing_flow](https://github.com/SJTU-YONGFU-RESEARCH-GRP/layout2timing_flow)
- [AutoCellGen_V2](https://github.com/SJTU-YONGFU-RESEARCH-GRP/AutoCellGen_V2)
- [fastercap_v2](https://github.com/SJTU-YONGFU-RESEARCH-GRP/fastercap_v2)
- [DeviceOpt](https://github.com/SJTU-YONGFU-RESEARCH-GRP/DeviceOpt)
