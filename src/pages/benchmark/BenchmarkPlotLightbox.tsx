/* ==================================================================
 *  BenchmarkPlotLightbox (goal2.md §6.11)
 *  Shared lightbox for Cross-Model plot comparison.
 *  Supports keyboard nav, close, prev/next, counter.
 * ================================================================== */

import { useState, useCallback, useEffect } from "react";
import type { ResolvedBenchmarkPlot } from "../../data/benchmarkWorkspace/selectors";

interface Props {
  plots: ResolvedBenchmarkPlot[];
}

export function BenchmarkPlotLightbox({ plots }: Props) {
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG" || !target.hasAttribute("data-lightbox-id")) return;
    const id = target.getAttribute("data-lightbox-id");
    const idx = plots.findIndex((p) => p.artifactId === id);
    if (idx >= 0) setIndex(idx);
  }, [plots]);

  useEffect(() => {
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, [open]);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(() => setIndex((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const next = useCallback(() => setIndex((i) => (i !== null && i < plots.length - 1 ? i + 1 : i)), [plots.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [index, close, prev, next]);

  if (index === null || plots.length === 0) return null;
  const plot = plots[index];
  if (!plot) return null;

  return (
    <div
      className="bmw-lightbox-overlay"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Plot lightbox"
      ref={(el) => el?.focus()}
      tabIndex={0}
    >
      <button className="bmw-lightbox-close" onClick={close} aria-label="Close">✕</button>
      {index > 0 && (
        <button className="bmw-lightbox-prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">◀</button>
      )}
      {index < plots.length - 1 && (
        <button className="bmw-lightbox-next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">▶</button>
      )}
      <img
        src={plot.displayUrl}
        alt={`${plot.modelId} — ${plot.simulator} — ${plot.domain} — ${plot.title}`}
        className="bmw-lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="bmw-lightbox-counter">{index + 1} / {plots.length}</div>
    </div>
  );
}
