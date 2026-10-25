import { useState, type ReactNode } from "react";

/** Retain the disclosure while materializing potentially large evidence only on demand. */
export function AcgJsonDetails({ summary, value, className = "acg-advanced" }: {
  summary: ReactNode; value: unknown; className?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return <details className={className} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{summary}</summary>
    {open ? <pre>{JSON.stringify(value, null, 2)}</pre> : null}
  </details>;
}
