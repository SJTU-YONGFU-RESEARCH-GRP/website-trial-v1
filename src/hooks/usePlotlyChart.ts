import { useEffect, useRef, type RefObject } from "react";
import type { Config, Data, Layout, PlotMouseEvent } from "plotly.js";
import Plotly from "plotly.js-dist-min";

/**
 * Shared hook: renders Plotly chart into a div ref.
 * Returns a ref to attach to a <div> inside a .plot-host container.
 */
export function usePlotlyChart(
  data: Data[],
  layout: Partial<Layout>,
  config: Partial<Config>,
  onPointClick?: (event: PlotMouseEvent) => void,
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);
  const pointClickRef = useRef(onPointClick);
  pointClickRef.current = onPointClick;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const plot = Plotly.newPlot(el, data, layout, config);
    void plot.then((plotElement) => {
      if (cancelled) return;
      if (pointClickRef.current) {
        plotElement.on("plotly_click", (event) => pointClickRef.current?.(event));
      }
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
  }, [data, layout, config]);

  return ref;
}
