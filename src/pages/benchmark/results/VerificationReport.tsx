/* ═══════════════════════════════════════════════════════════════════ */
/*  VerificationReport — pass/fail summary and per-domain test table    */
/*  Extracted from SpiceBenchmarkPage.tsx.                                */
/* ═══════════════════════════════════════════════════════════════════ */

import type { BenchmarkRun } from "../../../data/SpiceBenchmarkTypes";

export interface VerificationReportProps {
  run: BenchmarkRun;
}

export function VerificationReport({ run }: VerificationReportProps) {
  const ts = run.verificationTests;
  const passCount = ts.filter(t => t.status === "pass").length;
  const failCount = ts.filter(t => t.status === "fail").length;
  const naCount = ts.filter(t => t.status === "unavailable").length;

  return (
    <div className="chart-card benchmark-section" id="bm-verify">
      <h2>Summary</h2>

      <div className="benchmark-verify-summary" style={{ justifyContent: "center" }}>
        <div className="flow-kpi-card" style={{ textAlign: "center" }}><div className="flow-kpi-card__label">Total</div><div className="flow-kpi-card__value">{ts.length}</div></div>
        <div className="flow-kpi-card" style={{ textAlign: "center" }}><div className="flow-kpi-card__label">✓ Pass</div><div className="flow-kpi-card__value" style={{ color: "var(--ok,#22c55e)" }}>{passCount}</div></div>
        <div className="flow-kpi-card" style={{ textAlign: "center" }}><div className="flow-kpi-card__label">✗ Fail</div><div className="flow-kpi-card__value" style={{ color: "var(--fail,#ef4444)" }}>{failCount}</div></div>
        <div className="flow-kpi-card" style={{ textAlign: "center" }}><div className="flow-kpi-card__label">N/A</div><div className="flow-kpi-card__value" style={{ color: "var(--muted)" }}>{naCount}</div></div>
      </div>

      {ts.length > 0 && (
        <div className="benchmark-table-wrap" style={{ marginBottom: "0.75rem" }}>
          <table className="benchmark-table">
            <thead><tr><th>Test Type</th><th>Status</th><th>Domain</th><th>Key Findings</th></tr></thead>
            <tbody>
              {ts.map(t => (
                <tr key={t.testId}>
                  <td><strong>{t.name}</strong></td>
                  <td style={{ fontSize: "1rem", textAlign: "center" }}>
                    {t.status === "pass" ? <span title="Pass" style={{ color: "var(--ok,#22c55e)" }}>✓</span>
                     : t.status === "fail" ? <span title="Fail" style={{ color: "var(--fail,#ef4444)" }}>✗</span>
                     : <span title="Unavailable" style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td><span className="benchmark-domain-badge" style={{ fontSize: "0.6rem" }}>{t.domain}</span></td>
                  <td className="benchmark-test-detail">{t.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
