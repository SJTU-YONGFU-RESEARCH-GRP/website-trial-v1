export function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="chart-card" style={{ padding: "0.5rem 0.65rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.2rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--muted, #888)", marginTop: "0.15rem" }}>{label}</div>
      {hint && <div style={{ fontSize: "0.6rem", color: "var(--muted, #aaa)", marginTop: "0.1rem" }}>{hint}</div>}
    </div>
  );
}
