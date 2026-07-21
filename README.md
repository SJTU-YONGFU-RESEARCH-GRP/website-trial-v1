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

**Legacy redirects:**
- `/#/translator` → `/#/benchmark?operation=translator`
- `/#/reduction` → `/#/benchmark?operation=reduction`
- `/#/expansion` → `/#/benchmark?operation=expansion`

## Run locally

```bash
cd website-trial-v1
npm install
npm run dev
```

### npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run typecheck` | Run TypeScript compiler check |
| `npm run validate:flow-data` | Validate flow benchmark data |
| `npm run validate:spice-benchmark-data` | Validate SPICE benchmark manifest |
| `npm run validate:benchmark-workspace` | Validate benchmark workspace fixtures |
| `npm run build` | validate → typecheck → Vite production build (**hermetic**) |
| `npm run preview` | Preview the production build |
| `npm run refresh:external-data` | Explicitly refresh all external data (requires sibling repos) |

## Benchmark — SPICE Model Workflow & Benchmark Workspace

The `/benchmark` page is a unified single-page workspace integrating four SPICE tools through a compatibility layer.

### Page Sections (top-to-bottom, no secondary navigation)

1. **Setup** — scenario selector, model input (bundled/upload/paste)
2. **Select Operations** — 4-column grid (Convert/Calibrate/Reduce/Expand), each with inline settings
3. **Workflow Plan** — fixed-order pipeline with invocation previews
4. **Benchmark Setup** — simulators, domains, models, baseline/candidate
5. **Executive Summary** — 8 KPI cards
6. **Cross-Simulator Comparison** — 3-simulator cards, time/memory Plotly charts, status matrix, numerical agreement
7. **Cross-Model Comparison** — dual checkbox filters (simulators + categories), original benchmark plot pairs (baseline left, candidate right)
8. **Processed Model Output** — model code preview, copy, download, parameter diff
9. **Tool Results** — accordion panels for each enabled operation
10. **Artifacts** — filterable unified artifact table

### Static Demo Limitation

This is a **static frontend only**. No external tool execution occurs in the browser. Results are deterministic static demonstrations labeled by origin. Custom uploaded models stay in browser memory.

### Data Origins

All data labeled at field/card level:
- **Existing output** — previously generated tool results
- **Synthetic demo** — deterministic demo fixture
- **Local only** — user-provided, browser-memory only
- **Not available** — data missing

### Compatibility Layer

Typed adapters in `src/compat/spiceWorkflow/`:
- `contracts.ts` — Unified data model
- Tool adapters — build argv, validate params, normalize fixtures
- Legacy normalizers — map existing manifests to unified contracts

## Dependencies

- `plotly.js-dist-min`
- `react-router-dom` v6 with HashRouter
- `vite` v8 + `@vitejs/plugin-react` v5
- TypeScript strict mode

## Tool repositories (private)

- [new-spice-translator](https://github.com/SJTU-YONGFU-RESEARCH-GRP/new-spice-translator)
- [spice_model_fitting](https://github.com/duhaochen-china/spice_model_fitting)
- [spice_model_reduction](https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_reduction)
- [spice_model_expansion](https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_expansion)
- [spice_model_benchmark](https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark)
