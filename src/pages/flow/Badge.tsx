import type { BadgeStatus } from "../../data/toolFlowTypes";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: "Done",  cls: "flow-badge--done" },
  running:   { label: "Run…", cls: "flow-badge--run" },
  pending:   { label: "—",     cls: "flow-badge--idle" },
  failed:    { label: "Fail", cls: "flow-badge--fail" },
  ready:     { label: "Ready", cls: "flow-badge--done" },
  error:     { label: "Error", cls: "flow-badge--fail" },
  done:      { label: "Done",  cls: "flow-badge--done" },
};

export function Badge({ status }: { status: BadgeStatus | string }): JSX.Element {
  const s = STATUS_BADGE[status] ?? { label: status, cls: "flow-badge--idle" };
  return <span className={`flow-badge ${s.cls}`}>{s.label}</span>;
}
