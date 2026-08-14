type StatusVariant = "pass" | "fail" | "partial" | "unavailable" | "configured" | "completed" | "failed";

const CLASS_MAP: Record<StatusVariant, string> = {
  pass: "tr-badge--completed",
  fail: "tr-badge--failed",
  failed: "tr-badge--failed",
  partial: "tr-badge--partial",
  unavailable: "tr-badge--partial",
  configured: "tr-badge--partial",
  completed: "tr-badge--completed",
};

export function StatusBadge({ status }: { status: StatusVariant }) {
  return (
    <span className={`tr-badge ${CLASS_MAP[status] ?? "tr-badge--partial"}`}
      style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}>
      {status}
    </span>
  );
}
