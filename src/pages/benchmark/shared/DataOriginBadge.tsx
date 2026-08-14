import type { DataOrigin } from "../../../compat/spiceWorkflow/contracts";

const ORIGIN_LABELS: Record<DataOrigin, string> = {
  "existing-tool-output": "Existing output",
  "derived-static-demo": "Derived demo",
  "synthetic-demo": "Synthetic demo",
  "user-local": "Local only",
  "unavailable": "Not available",
};

export function DataOriginBadge({ origin }: { origin: DataOrigin }) {
  const isSynthetic = origin === "synthetic-demo" || origin === "derived-static-demo";
  return (
    <span className={`tr-badge ${isSynthetic ? "tr-badge--partial" : "tr-badge--completed"}`}
      style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem" }}>
      {ORIGIN_LABELS[origin]}
    </span>
  );
}
