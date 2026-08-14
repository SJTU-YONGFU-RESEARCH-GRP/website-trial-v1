/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_READ_ONLY_DEMO?: "true" | "false";
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "plotly.js-dist-min" {
  /** Same API as the `plotly.js` package; types come from `@types/plotly.js`. */
  import type * as PlotlyModule from "plotly.js";
  const Plotly: typeof PlotlyModule;
  export default Plotly;
}
