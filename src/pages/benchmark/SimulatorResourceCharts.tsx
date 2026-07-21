/* ==================================================================
 *  SimulatorResourceCharts (goal.md §11.2–§11.3)
 *  Plotly grouped-bar charts for execution time and peak memory
 *  across simulators × analysis domains.
 * ================================================================== */

import type { Config, Data } from "plotly.js";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from "../../theme/chartPalette";
import type { WorkflowScenario, SimulatorId, AnalysisDomain } from "../../compat/spiceWorkflow/contracts";
import { getResultForCell } from "../../data/benchmarkWorkspace/selectors";
import { formatMs, formatMB } from "../../compat/spiceWorkflow/formatters";

const SIM_COLORS: Record<SimulatorId, string> = {
  ngspice: "#0071e3",
  spectre: "#34c759",
  hspice: "#ff9500",
};

const SIM_LABELS: Record<SimulatorId, string> = {
  ngspice: "ngspice",
  spectre: "Spectre",
  hspice: "HSPICE",
};

interface Props { scenario: WorkflowScenario; modelId: string; simulators: SimulatorId[]; domains: AnalysisDomain[] }

export function ExecutionTimeChart({ scenario, modelId, simulators, domains }: Props) {
  const traces: Data[] = simulators.map((sim) => {
    const values = domains.map((dom) => {
      const r = getResultForCell(scenario, modelId, sim, dom);
      return r?.resources.wallTimeMs ?? null;
    });
    return {
      x: domains.map((d) => d.toUpperCase()),
      y: values,
      type: "bar" as const,
      name: SIM_LABELS[sim],
      marker: { color: SIM_COLORS[sim] },
      hovertemplate: values.map((v, i) =>
        v !== null
          ? `${SIM_LABELS[sim]} · ${domains[i].toUpperCase()}<br>${formatMs(v)}<extra></extra>`
          : `${SIM_LABELS[sim]} · ${domains[i].toUpperCase()}<br>Not available<extra></extra>`,
      ),
    };
  });

  const ref = usePlotlyChart(
    traces,
    {
      barmode: "group",
      font: { family: CHART_FONT_FAMILY, size: CHART_FONT_SIZE * 0.65, color: "#666" },
      margin: { l: 50, r: 20, t: 10, b: 40 },
      xaxis: { title: { text: "" }, tickfont: { size: 11 } },
      yaxis: { title: { text: "Elapsed time (ms)", font: { size: 11 } }, tickfont: { size: 10 } },
      legend: { orientation: "h", y: 1.15, font: { size: 10 } },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
    },
    { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>,
  );

  return <div ref={ref} style={{ width: "100%", height: "280px" }} />;
}

export function PeakMemoryChart({ scenario, modelId, simulators, domains }: Props) {
  const traces: Data[] = simulators.map((sim) => {
    const values = domains.map((dom) => {
      const r = getResultForCell(scenario, modelId, sim, dom);
      return r?.resources.peakRssMB ?? null;
    });
    return {
      x: domains.map((d) => d.toUpperCase()),
      y: values,
      type: "bar" as const,
      name: SIM_LABELS[sim],
      marker: { color: SIM_COLORS[sim] },
      hovertemplate: values.map((v, i) =>
        v !== null
          ? `${SIM_LABELS[sim]} · ${domains[i].toUpperCase()}<br>${formatMB(v)}<extra></extra>`
          : `${SIM_LABELS[sim]} · ${domains[i].toUpperCase()}<br>Not available<extra></extra>`,
      ),
    };
  });

  const ref = usePlotlyChart(
    traces,
    {
      barmode: "group",
      font: { family: CHART_FONT_FAMILY, size: CHART_FONT_SIZE * 0.65, color: "#666" },
      margin: { l: 50, r: 20, t: 10, b: 40 },
      xaxis: { title: { text: "" }, tickfont: { size: 11 } },
      yaxis: { title: { text: "Peak RSS (MB)", font: { size: 11 } }, tickfont: { size: 10 } },
      legend: { orientation: "h", y: 1.15, font: { size: 10 } },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
    },
    { responsive: true, displayModeBar: false, displaylogo: false } satisfies Partial<Config>,
  );

  return <div ref={ref} style={{ width: "100%", height: "280px" }} />;
}
