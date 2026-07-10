import { useMemo } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useNarrowScreen } from "../../hooks/useNarrowScreen";
import { useTheme } from "../../theme/ThemeContext";
import {
  getChartPalette,
  plotInsetBackground,
  plotAxisFont,
  plotFont,
  plotlyAxisFrameX,
  plotlyAxisFrameY,
  plotlyBold,
  plotlyHoverLabel,
} from "../../theme/chartPalette";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import type { AlgorithmCellResult, ParasiticsData } from "../../data/toolFlowTypes";
import { EmptyState } from "./EmptyState";

interface ParasiticStageCardProps {
  results: AlgorithmCellResult[];
  selectedCell: string;
}

function MaxwellHeatmap({
  pex,
  narrow,
  palette,
  plotSurfaceBg,
  hoverLabel,
  frameX,
  frameY,
}: {
  pex: ParasiticsData;
  narrow: boolean;
  palette: ReturnType<typeof getChartPalette>;
  plotSurfaceBg: string;
  hoverLabel: ReturnType<typeof plotlyHoverLabel>;
  frameX: ReturnType<typeof plotlyAxisFrameX>;
  frameY: ReturnType<typeof plotlyAxisFrameY>;
}): JSX.Element {
  const axTick = plotAxisFont(palette.axisValueLabelRgb, narrow);

  const { data, layout } = useMemo(() => {
    const labels = pex.maxwellMatrix.conductorLabels;
    const z = pex.maxwellMatrix.matrixFF;

    const trace: Data = {
      type: "heatmap",
      z,
      x: labels,
      y: labels,
      colorscale: [
        [0, "#0d47a1"],
        [0.5, "#30d158"],
        [1, "#ff9f0a"],
      ],
      hovertemplate:
        "<b>%{x}</b> → <b>%{y}</b><br>C = %{z:.3f} fF<extra></extra>",
    } as Data;

    const heatLayout: Partial<Layout> = {
      autosize: true,
      margin: narrow
        ? { l: 44, r: 12, t: 36, b: 44 }
        : { l: 56, r: 20, t: 40, b: 56 },
      paper_bgcolor: plotSurfaceBg,
      plot_bgcolor: plotSurfaceBg,
      font: plotFont(palette.rgbAxisTitle),
      title: {
        text: plotlyBold(`Maxwell capacitance matrix — ${pex.cellName} (${pex.algorithmId})`),
        font: plotFont(palette.rgbAxisTitle),
      },
      xaxis: {
        ...frameX,
        automargin: true,
        tickfont: axTick,
        side: "top",
      },
      yaxis: {
        ...frameY,
        automargin: true,
        tickfont: axTick,
        autorange: "reversed",
      },
      hovermode: "closest",
      hoverlabel: hoverLabel,
    };

    return { data: [trace], layout: heatLayout };
  }, [pex, narrow, palette, plotSurfaceBg, axTick, hoverLabel, frameX, frameY]);

  const ref = usePlotlyChart(data, layout, {
    responsive: true,
    displayModeBar: false,
    displaylogo: false,
    doubleClick: "reset",
    scrollZoom: false,
  } satisfies Partial<Config>);

  return (
    <div className="plot-host plot-host--short">
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export function ParasiticStageCard({
  results,
  selectedCell,
}: ParasiticStageCardProps): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();
  const palette = getChartPalette(theme);
  const plotSurfaceBg = plotInsetBackground(theme);
  const hoverLabel = plotlyHoverLabel(palette, narrow);
  const frameX = plotlyAxisFrameX(palette);
  const frameY = plotlyAxisFrameY(palette);

  // Show data from the first algorithm that has parasitics
  const pexResult = results.find((r) => r.parasitics);
  const pex = pexResult?.parasitics ?? null;

  return (
    <div className="chart-card">
      <h2>Parasitic Extraction: fastercap_v2</h2>
      <p className="hint">
        Maxwell capacitance matrix results, quality checks, net maps, and annotated CDL for cell <code>{selectedCell}</code>.
      </p>

      {!pex ? (
        <EmptyState message="No parasitic extraction data for this cell" icon="⚡" />
      ) : (
        <>
          <MaxwellHeatmap
            pex={pex}
            narrow={narrow}
            palette={palette}
            plotSurfaceBg={plotSurfaceBg}
            hoverLabel={hoverLabel}
            frameX={frameX}
            frameY={frameY}
          />

          {/* Net caps table */}
          <div className="analog-table-wrap" style={{ marginTop: "0.5rem" }}>
            <table className="analog-table">
              <thead>
                <tr>
                  <th>Net</th>
                  <th>Total (fF)</th>
                  <th>Coupling (fF)</th>
                  <th>Substrate (fF)</th>
                  <th>Coupling ratio</th>
                </tr>
              </thead>
              <tbody>
                {pex.netCaps.map((n) => (
                  <tr key={n.net}>
                    <td><code>{n.net}</code></td>
                    <td>{n.cTotalFF.toFixed(2)}</td>
                    <td>{n.couplingFF.toFixed(2)}</td>
                    <td>{n.cSubFF.toFixed(2)}</td>
                    <td>
                      {n.cTotalFF > 0
                        ? `${((n.couplingFF / n.cTotalFF) * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quality checks */}
          <div className="flow-pex-quality" style={{ marginTop: "0.5rem" }}>
            <h3 className="flow-subsection-title">Quality Checks</h3>
            <div className="flow-pex-quality__grid">
              {pex.qualityChecks.map((qc) => (
                <div
                  key={qc.check}
                  className={`flow-pex-quality__item ${qc.pass ? "flow-pex-quality__item--pass" : "flow-pex-quality__item--fail"}`}
                >
                  <span className="flow-pex-quality__label">{qc.check}</span>
                  <span className="flow-pex-quality__value">
                    {qc.value} {qc.unit}
                  </span>
                  <span className="flow-pex-quality__icon">
                    {qc.pass ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Net map / Annotated CDL */}
          <div className="flow-subsection-grid" style={{ marginTop: "0.5rem" }}>
            <div>
              <h3 className="flow-subsection-title">Net Map</h3>
              <div className="analog-table-wrap">
                <table className="analog-table">
                  <thead>
                    <tr>
                      <th>Conductor</th>
                      <th>Net</th>
                      <th>Layer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pex.netMap.map((nm, i) => (
                      <tr key={i}>
                        <td><code>{nm.conductor}</code></td>
                        <td><code>{nm.net}</code></td>
                        <td>{nm.layer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="flow-subsection-title">Annotated CDL</h3>
              <div className="analog-table-wrap">
                <table className="analog-table">
                  <thead>
                    <tr>
                      <th>Net</th>
                      <th>π caps (fF)</th>
                      <th>Coupled to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pex.annotatedCdl.map((cdl, i) => (
                      <tr key={i}>
                        <td><code>{cdl.net}</code></td>
                        <td>{cdl.piCapsFF.toFixed(2)}</td>
                        <td><code>{cdl.coupledTo}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
