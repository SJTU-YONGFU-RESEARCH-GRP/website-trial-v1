/* ==================================================================
 *  BenchmarkWorkspacePage — v4
 *
 *  Auto-discovers models from data/spice-model-benchmark/manifest.json.
 *  No hardcoded model lists. Purely data-driven.
 * ================================================================== */

import { useEffect, useState } from "react";
import type { WorkflowScenario } from "../../compat/spiceWorkflow/contracts";
import { buildScenario } from "../../data/benchmarkWorkspace/dataLoader";
import { ModelComparisonCard } from "./ModelComparisonCard";
import "../../benchmark.css";
import "../../benchmark-workspace.css";

const DISCOVERY_REFRESH_MS = 10_000;

export function BenchmarkWorkspacePage() {
  const [scenario, setScenario] = useState<WorkflowScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let refreshing = false;

    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const nextScenario = await buildScenario();
        if (!cancelled) {
          setScenario(nextScenario);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            `Failed to load benchmark data: ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      } finally {
        refreshing = false;
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, DISCOVERY_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="chart-card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2>Error</h2>
        <p style={{ color: "var(--error, #c53030)" }}>{error}</p>
      </div>
    );
  }

  // Static mode: onOrderChange not needed
  if (!scenario) {
    return (
      <div className="chart-card" style={{ textAlign: "center", padding: "3rem" }}>
        <p>Loading benchmark data…</p>
      </div>
    );
  }

  return (
    <div>
      <ModelComparisonCard scenario={scenario} />
    </div>
  );
}
