# Design Analytics Platform

**Vite + React + Plotly.js** static dashboard for EDA design-flow visualization, hosted on GitHub Pages.

## Routes

| Path | Page |
|------|------|
| `/#/` | Home — tool entry cards |
| `/#/flow` | Flow dashboard — standard-cell characterization pipeline |
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
| `npm run build` | Generate data + Vite production build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run TypeScript compiler check (`tsc --noEmit`) |

## Host on GitHub Pages

URL: **`https://sjtu-yongfu-research-grp.github.io/website-trial-v1/`**

### Setup

1. GitHub → **Settings → Pages → Source: GitHub Actions**.
2. Push **`main`** (or **`master`**) — CI deploys automatically.
3. Feature branches build only (no deploy).

CI workflow: `.github/workflows/deploy-pages.yml`

## Flow Dashboard

The `/flow` page tracks the standard-cell characterization flow:

- **layout2timing_flow** orchestrates the pipeline: Layout (AutoCellGen-V2) → Parasitic Extraction (fastercap_v2) → Timing Characterization (libcharx).
- **DeviceOpt** runs as an independent multi‑objective optimization loop (3D Pareto frontier).
- Data model is **run‑centric**: `ToolRun → cells[] → layout / parasitics / timing / deviceOpt`.
- All demo data is **deterministic** (no `Math.random()`).

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
│   ├── toolFlowTypes.ts       # Run-centric type system
│   └── toolFlowDemoData.ts    # Deterministic demo data
├── hooks/
│   └── usePlotlyChart.ts      # Shared Plotly rendering hook
├── pages/
│   ├── flow/                  # Flow sub-components
│   │   ├── ArtifactTableCard.tsx
│   │   ├── Badge.tsx
│   │   ├── DeviceOptCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── FlowOverviewCard.tsx
│   │   ├── LayoutStageCard.tsx
│   │   ├── ParasiticStageCard.tsx
│   │   ├── RunSelectorCard.tsx
│   │   ├── StageTimelineCard.tsx
│   │   └── TimingStageCard.tsx
│   ├── ToolFlowPage.tsx       # Composed flow page
│   ├── HomePage.tsx           # Tool entry cards
│   ├── PlotlyPage.tsx
│   └── AnalogPage.tsx
├── theme/                     # Theme & chart palette
└── components/                # Shared UI components
```
