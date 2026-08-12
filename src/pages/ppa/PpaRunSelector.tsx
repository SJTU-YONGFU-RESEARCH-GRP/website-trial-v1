import { useEffect, useMemo, useState } from "react";
import type { PpaReportFacet, PpaRunManifest } from "../../data/ppaTypes";

interface Props {
  runs: readonly PpaRunManifest[];
  selectedUids: readonly string[];
  onChange: (uids: string[]) => void;
}

interface FacetOption {
  value: string;
  label: string;
  order: number;
}

interface FacetDimension {
  category: string;
  categoryLabel: string;
  categoryOrder: number;
  dimension: string;
  label: string;
  order: number;
  options: FacetOption[];
}

interface FacetCategory {
  category: string;
  label: string;
  order: number;
  dimensions: FacetDimension[];
}

type FacetSelections = Record<string, string[]>;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  design: "Which design artifact and primary timing requirement entered the experiment.",
  technology: "Which process, library, parasitic model, cell model, and PVT were used.",
  implementation: "Which backend engine and implementation controls produced the result.",
  experiment: "Which input variable the comparison intentionally swept.",
};

function titleFromToken(value: string): string {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Runtime fallback for a cached pre-1.3 index during a rolling deployment. */
function legacyFacets(run: PpaRunManifest): PpaReportFacet[] {
  const values = [
    { category: "design", categoryLabel: "Design & constraints", categoryOrder: 10, dimension: "design", dimensionLabel: "Design", value: run.design, valueLabel: run.design, dimensionOrder: 10 },
    { category: "implementation", categoryLabel: "Implementation", categoryOrder: 30, dimension: "tool", dimensionLabel: "Tools", value: run.flow, valueLabel: titleFromToken(run.flow), dimensionOrder: 10 },
    { category: "technology", categoryLabel: "Technology", categoryOrder: 20, dimension: "pdk", dimensionLabel: "PDK", value: run.pdk, valueLabel: run.pdk, dimensionOrder: 10 },
    { category: "technology", categoryLabel: "Technology", categoryOrder: 20, dimension: "scl", dimensionLabel: "Standard-cell library", value: run.scl, valueLabel: run.scl, dimensionOrder: 20 },
    { category: "technology", categoryLabel: "Technology", categoryOrder: 20, dimension: "techfile_rc", dimensionLabel: "Techfile RC", value: run.techfileRcScale === null ? null : String(run.techfileRcScale), valueLabel: run.techfileRcScale === null ? null : `RC ×${run.techfileRcScale}`, dimensionOrder: 30 },
    { category: "design", categoryLabel: "Design & constraints", categoryOrder: 10, dimension: "clock_period", dimensionLabel: "Clock period", value: run.summary.clockPeriodNs === null ? null : String(run.summary.clockPeriodNs), valueLabel: run.summary.clockPeriodNs === null ? null : `${run.summary.clockPeriodNs} ns`, dimensionOrder: 30 },
  ];
  return values.flatMap((facet) => (
    facet.value && facet.valueLabel
      ? [{ ...facet, value: facet.value, valueLabel: facet.valueLabel, valueOrder: 100 }]
      : []
  ));
}

function facetsForRun(run: PpaRunManifest): readonly PpaReportFacet[] {
  return Array.isArray(run.filterFacets)
    && run.filterFacets.length > 0
    && run.filterFacets.every((facet) => typeof facet.category === "string")
    ? run.filterFacets
    : legacyFacets(run);
}

function matchesFacetSelections(
  run: PpaRunManifest,
  selections: FacetSelections,
  ignoredDimension?: string,
): boolean {
  const facets = facetsForRun(run);
  return Object.entries(selections).every(([dimension, selectedValues]) => {
    if (dimension === ignoredDimension || selectedValues.length === 0) return true;
    const accepted = new Set(selectedValues);
    return facets.some((facet) => facet.dimension === dimension && accepted.has(facet.value));
  });
}

function matchesSearch(run: PpaRunManifest, needle: string): boolean {
  if (!needle) return true;
  return [
    run.uid,
    run.flow,
    run.pdk,
    run.scl,
    run.design,
    run.runName,
    run.variant,
    run.relativePath,
    ...facetsForRun(run).flatMap((facet) => [facet.dimensionLabel, facet.value, facet.valueLabel]),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .toLocaleLowerCase()
    .includes(needle);
}

export function PpaRunSelector({ runs, selectedUids, onChange }: Props): JSX.Element {
  const [query, setQuery] = useState("");
  const [facetSelections, setFacetSelections] = useState<FacetSelections>({});
  const [openDimensions, setOpenDimensions] = useState<Set<string>>(() => new Set());
  const selected = useMemo(() => new Set(selectedUids), [selectedUids]);

  const dimensions = useMemo<FacetDimension[]>(() => {
    const grouped = new Map<string, {
      category: string;
      categoryLabel: string;
      categoryOrder: number;
      label: string;
      order: number;
      options: Map<string, FacetOption>;
    }>();
    for (const run of runs) {
      for (const facet of facetsForRun(run)) {
        const group = grouped.get(facet.dimension) ?? {
          category: facet.category,
          categoryLabel: facet.categoryLabel,
          categoryOrder: facet.categoryOrder,
          label: facet.dimensionLabel,
          order: facet.dimensionOrder,
          options: new Map<string, FacetOption>(),
        };
        group.order = Math.min(group.order, facet.dimensionOrder);
        const previous = group.options.get(facet.value);
        if (!previous || facet.valueOrder < previous.order) {
          group.options.set(facet.value, {
            value: facet.value,
            label: facet.valueLabel,
            order: facet.valueOrder,
          });
        }
        grouped.set(facet.dimension, group);
      }
    }
    return [...grouped.entries()]
      .map(([dimension, group]) => ({
        category: group.category,
        categoryLabel: group.categoryLabel,
        categoryOrder: group.categoryOrder,
        dimension,
        label: group.label,
        order: group.order,
        options: [...group.options.values()].sort((left, right) =>
          left.order - right.order || left.label.localeCompare(right.label, "en")),
      }))
      .sort((left, right) => left.categoryOrder - right.categoryOrder
        || left.order - right.order
        || left.label.localeCompare(right.label, "en"));
  }, [runs]);

  const categories = useMemo<FacetCategory[]>(() => {
    const grouped = new Map<string, FacetCategory>();
    for (const dimension of dimensions) {
      const category = grouped.get(dimension.category) ?? {
        category: dimension.category,
        label: dimension.categoryLabel,
        order: dimension.categoryOrder,
        dimensions: [],
      };
      category.dimensions.push(dimension);
      grouped.set(dimension.category, category);
    }
    return [...grouped.values()].sort((left, right) => left.order - right.order);
  }, [dimensions]);

  useEffect(() => {
    const valid = new Map(dimensions.map((dimension) => [
      dimension.dimension,
      new Set(dimension.options.map((option) => option.value)),
    ]));
    setFacetSelections((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous).flatMap(([dimension, values]) => {
          const allowed = valid.get(dimension);
          if (!allowed) return [];
          const retained = values.filter((value) => allowed.has(value));
          return retained.length > 0 ? [[dimension, retained]] : [];
        }),
      );
      return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
    });
  }, [dimensions]);

  const searchNeedle = query.trim().toLocaleLowerCase();
  const searchMatches = useMemo(
    () => runs.filter((run) => matchesSearch(run, searchNeedle)),
    [runs, searchNeedle],
  );
  const filtered = useMemo(
    () => searchMatches.filter((run) => matchesFacetSelections(run, facetSelections)),
    [facetSelections, searchMatches],
  );
  const availableValues = useMemo(() => {
    const values = new Map<string, Set<string>>();
    for (const dimension of dimensions) {
      const available = new Set<string>();
      for (const run of runs) {
        if (!matchesFacetSelections(run, facetSelections, dimension.dimension)) continue;
        for (const facet of facetsForRun(run)) {
          if (facet.dimension === dimension.dimension) available.add(facet.value);
        }
      }
      values.set(dimension.dimension, available);
    }
    return values;
  }, [dimensions, facetSelections, runs]);

  useEffect(() => {
    setFacetSelections((previous) => {
      let changed = false;
      const next = Object.fromEntries(
        Object.entries(previous).flatMap(([dimension, values]) => {
          const available = availableValues.get(dimension);
          const retained = available ? values.filter((value) => available.has(value)) : [];
          if (retained.length !== values.length) changed = true;
          return retained.length > 0 ? [[dimension, retained]] : [];
        }),
      );
      return changed ? next : previous;
    });
  }, [availableValues]);
  const activeFilterCount = Object.values(facetSelections).reduce(
    (count, values) => count + values.length,
    0,
  );

  const toggleFacet = (dimension: string, value: string) => {
    setFacetSelections((previous) => {
      const selectedValues = previous[dimension] ?? [];
      const nextValues = selectedValues.includes(value)
        ? selectedValues.filter((candidate) => candidate !== value)
        : [...selectedValues, value];
      if (nextValues.length === 0) {
        const { [dimension]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [dimension]: nextValues };
    });
  };

  const setDimensionOpen = (dimension: string, isOpen: boolean) => {
    setOpenDimensions((previous) => {
      if (previous.has(dimension) === isOpen) return previous;
      const next = new Set(previous);
      if (isOpen) next.add(dimension);
      else next.delete(dimension);
      return next;
    });
  };

  const toggleRun = (uid: string) => {
    onChange(
      selected.has(uid)
        ? selectedUids.filter((candidate) => candidate !== uid)
        : [...selectedUids, uid],
    );
  };

  const latestVisiblePerBackendTechnology = () => {
    const latest = new Map<string, PpaRunManifest>();
    for (const run of filtered) {
      const key = [run.flow, run.pdk, run.scl ?? "", run.design].join("\0");
      const previous = latest.get(key);
      if (!previous || run.runName.localeCompare(previous.runName, "en") > 0) latest.set(key, run);
    }
    onChange([...latest.values()].map((run) => run.uid));
  };

  return (
    <section className="ppa-selector" aria-label="PPA report filters and selection">
      <div className="ppa-selector__topline">
        <label className="ppa-search">
          <span>Search reports</span>
          <input
            type="search"
            value={query}
            placeholder="UID, design, process, experiment value, or source path"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="ppa-selection-actions">
          <span>{selectedUids.length} of {runs.length} selected</span>
          <button type="button" disabled={filtered.length === 0} onClick={latestVisiblePerBackendTechnology}>
            Latest per process
          </button>
          <button type="button" disabled={filtered.length === 0} onClick={() => onChange(filtered.map((run) => run.uid))}>
            Select visible
          </button>
          <button type="button" disabled={selectedUids.length === 0} onClick={() => onChange([])}>
            Clear reports
          </button>
        </div>
      </div>

      <div className="ppa-filter-heading">
        <div>
          <strong>Input-variable filters</strong>
          <span>OR within one filter, AND between filters. Zero-match options are disabled and stale selections are removed.</span>
        </div>
        <button type="button" disabled={activeFilterCount === 0} onClick={() => setFacetSelections({})}>
          Reset filters
        </button>
      </div>

      <div className="ppa-filter-categories">
        {categories.map((category, categoryIndex) => (
          <section key={category.category} className="ppa-filter-category">
            <header className="ppa-filter-category__header">
              <span>{String(categoryIndex + 1).padStart(2, "0")}</span>
              <div>
                <strong>{category.label}</strong>
                <small>{CATEGORY_DESCRIPTIONS[category.category] ?? "Independent report input dimensions."}</small>
              </div>
            </header>
            <div className="ppa-filter-groups">
              {category.dimensions.map((dimension) => {
                const selectedValues = facetSelections[dimension.dimension] ?? [];
                const selectedLabels = dimension.options
                  .filter((option) => selectedValues.includes(option.value))
                  .map((option) => option.label);
                const available = availableValues.get(dimension.dimension) ?? new Set<string>();
                const availableCount = available.size;
                const optionCount = dimension.options.length;
                return (
                  <details
                    key={dimension.dimension}
                    className={`ppa-filter-group${selectedValues.length > 0 ? " has-selection" : ""}`}
                    open={openDimensions.has(dimension.dimension)}
                    onToggle={(event) => setDimensionOpen(dimension.dimension, event.currentTarget.open)}
                  >
                    <summary>
                      <strong>{dimension.label}</strong>
                      <span
                        className={`ppa-filter-group__selection${selectedLabels.length === 0 ? " is-all" : ""}`}
                        title={selectedLabels.length > 0 ? selectedLabels.join(", ") : "No restriction"}
                      >
                        {selectedLabels.length > 0 ? selectedLabels.join(", ") : "All"}
                      </span>
                      <span className="ppa-filter-group__count">
                        {selectedValues.length > 0
                          ? `${selectedValues.length} selected`
                          : availableCount === optionCount
                            ? `${optionCount} option${optionCount === 1 ? "" : "s"}`
                            : `${availableCount}/${optionCount} available`}
                      </span>
                    </summary>
                    <div className="ppa-filter-group__panel">
                      <div className="ppa-filter-group__options" role="group" aria-label={dimension.label}>
                        {dimension.options.map((option) => {
                          const checked = selectedValues.includes(option.value);
                          const isAvailable = available.has(option.value);
                          return (
                            <label
                              key={option.value}
                              className={!isAvailable ? "is-unavailable" : undefined}
                              title={!isAvailable ? "No report matches this option with the other active filters." : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!isAvailable}
                                onChange={() => toggleFacet(dimension.dimension, option.value)}
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {selectedValues.length > 0 ? (
                        <button
                          type="button"
                          className="ppa-filter-group__clear"
                          onClick={() => setFacetSelections((previous) => {
                            const { [dimension.dimension]: _removed, ...rest } = previous;
                            return rest;
                          })}
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <details className="ppa-run-picker" open>
        <summary>Matching reports</summary>
        <div className="ppa-run-picker__grid">
          {filtered.map((run) => (
            <label key={run.uid} className={`ppa-run-option${selected.has(run.uid) ? " is-selected" : ""}`}>
              <input type="checkbox" checked={selected.has(run.uid)} onChange={() => toggleRun(run.uid)} />
              <span className="ppa-run-option__copy">
                <code>UID: {run.uid}</code>
                <strong>{run.flow} · {run.pdk}{run.scl ? ` · ${run.scl}` : ""}</strong>
                <span>
                  {run.design}
                  {run.variant ? ` · ${run.variant}` : ""}
                  {run.techfileRcScale !== null ? ` · RC ×${run.techfileRcScale}` : ""}
                  {run.summary.clockPeriodNs !== null ? ` · ${run.summary.clockPeriodNs.toLocaleString(undefined, { maximumSignificantDigits: 7 })} ns` : ""}
                </span>
              </span>
            </label>
          ))}
          {filtered.length === 0 ? <p className="ppa-empty">No report matches the current scope.</p> : null}
        </div>
      </details>
    </section>
  );
}
