import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { DesignTechnology } from "../data/design";
import "./technology-selector.css";

interface TechnologySelectorProps {
  technologies: readonly DesignTechnology[];
  selectedUids: readonly string[];
  onChange: (uids: string[]) => void;
}

function technologyMetadata(technology: DesignTechnology): string {
  const kind = technology.isNamedPdk ? "Named PDK / kit" : "Process node";
  const library = technology.standardCellLibrary
    ? ` · ${technology.standardCellLibrary}${technology.corner ? ` @ ${technology.corner}` : ""}`
    : "";
  return `${technology.displayName} · ${technology.canonicalTechnology} · ${kind}${library}`;
}

/** Benchmark-style UID search plus a checkbox multi-select for Digital technologies. */
export function TechnologySelector({
  technologies,
  selectedUids,
  onChange,
}: TechnologySelectorProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedUidSet = useMemo(() => new Set(selectedUids), [selectedUids]);
  const selectedTechnologies = technologies.filter((technology) => selectedUidSet.has(technology.uid));
  const filteredTechnologies = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return technologies;
    return technologies.filter((technology) =>
      [technology.uid, technology.processNode, technology.displayName, technology.canonicalTechnology]
        .join("\n")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [searchQuery, technologies]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const toggleTechnology = (uid: string): void => {
    if (selectedUidSet.has(uid)) {
      onChange(selectedUids.filter((value) => value !== uid));
      return;
    }
    onChange([...selectedUids, uid]);
  };

  return (
    <div className="technology-selector" ref={rootRef}>
      <span className="technology-selector__label">Technology</span>
      <label className="technology-selector__search">
        <span>Search UID</span>
        <input
          type="search"
          value={searchQuery}
          placeholder="Enter all or part of an MD5 UID"
          aria-label="Search Technology UID"
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
      </label>
      <button
        type="button"
        className="technology-selector__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={technologies.length === 0}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="technology-selector__selection">
          <span className="technology-selector__summary">
            {selectedTechnologies.length === 1
              ? "1 technology selected"
              : `${selectedTechnologies.length} technologies selected`}
          </span>
          <span className="technology-selector__selected-uids">
            {selectedTechnologies.map((technology) => technology.uid).join(" · ") || "No technology selected"}
          </span>
        </span>
        <span className="technology-selector__arrow" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div
          id={listboxId}
          className="technology-selector__list"
          role="listbox"
          aria-label="Technology UID results"
          aria-multiselectable="true"
        >
          <div className="technology-selector__list-header">
            <span>{filteredTechnologies.length} of {technologies.length} shown</span>
            <div>
              <button type="button" onClick={() => onChange(technologies.map((technology) => technology.uid))}>
                Select all
              </button>
              <button
                type="button"
                disabled={selectedUids.length === 0}
                onClick={() => onChange([])}
              >
                Clear
              </button>
            </div>
          </div>
          {filteredTechnologies.map((technology) => {
            const checked = selectedUidSet.has(technology.uid);
            return (
              <label
                key={technology.uid}
                role="option"
                aria-selected={checked}
                className="technology-selector__option"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  aria-label={`Select Technology UID ${technology.uid}`}
                  onChange={() => toggleTechnology(technology.uid)}
                />
                <span className="technology-selector__option-copy">
                  <span className="technology-selector__uid">UID: {technology.uid}</span>
                  <span className="technology-selector__meta">{technologyMetadata(technology)}</span>
                </span>
              </label>
            );
          })}
          {filteredTechnologies.length === 0 ? (
            <div className="technology-selector__empty">No Technology UID matches this search.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
