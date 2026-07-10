import { useEffect, useRef, type RefObject } from "react";
import type { Config, Data, Layout } from "plotly.js";
import Plotly from "plotly.js-dist-min";

/**
 * Shared hook: renders Plotly chart into a div ref.
 * Returns a ref to attach to a <div> inside a .plot-host container.
 */
export function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const plot = Plotly.newPlot(el, data, layout, config);
    void plot.then(() => {
      if (cancelled) return;
      void Plotly.Plots.resize(el);
    });

    const ro = new ResizeObserver(() => {
      if (el && !cancelled) void Plotly.Plots.resize(el);
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      void Plotly.purge(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layout, config]);

  return ref;
}
