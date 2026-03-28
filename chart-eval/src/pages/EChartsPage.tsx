import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import { ADDER_DEMO_ROWS, architectureColor } from "../data/samplePpa";
import { getChartPalette } from "../theme/chartPalette";
import { useTheme } from "../theme/ThemeContext";

type ScatterDatum = {
  value: [number, number];
  bitWidth: number;
  areaUm2: number;
};

export function EChartsPage(): JSX.Element {
  const narrow = useNarrowScreen(640);
  const { theme } = useTheme();

  const paretoOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const byArch = new Map<string, typeof ADDER_DEMO_ROWS>();
    for (const row of ADDER_DEMO_ROWS) {
      const list = byArch.get(row.architecture) ?? [];
      list.push(row);
      byArch.set(row.architecture, list);
    }

    const bump = narrow ? 5 : 0;

    // Numeric x + y require value axes (default xAxis is "category", which hides scatter).
    const series = [...byArch.entries()].map(([arch, rows]) => ({
      name: arch,
      type: "scatter" as const,
      itemStyle: { color: architectureColor(arch) },
      emphasis: { focus: "series" as const },
      data: rows.map((r) => ({
        value: [r.fmaxMhz, r.powerMw] as [number, number],
        // Per-point size: symbolSize callbacks receive [x,y], not this object (bitWidth was undefined → broken plot).
        symbolSize: bump + 10 + (r.bitWidth / 64) * 14,
        bitWidth: r.bitWidth,
        areaUm2: r.areaUm2,
      })),
    }));

    return {
      backgroundColor: "transparent",
      textStyle: { color: palette.text, fontSize: narrow ? 10 : 12 },
      title: {
        text: narrow ? "Fmax vs power (demo)" : "Pareto-style: Fmax vs power (demo data)",
        left: "center",
        textStyle: { fontSize: narrow ? 12 : 14, color: palette.text },
      },
      grid: narrow
        ? { left: "14%", right: "8%", top: "20%", bottom: "38%", containLabel: true }
        : { left: "12%", right: "6%", top: "18%", bottom: "22%", containLabel: true },
      toolbox: {
        right: narrow ? 4 : 8,
        top: narrow ? 4 : 8,
        iconStyle: { borderColor: palette.textMuted },
        emphasis: { iconStyle: { borderColor: palette.text } },
        feature: {
          saveAsImage: {
            title: "Save as PNG",
            name: "echarts-pareto",
            backgroundColor: theme === "dark" ? "#131b26" : "#fafafa",
          },
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: palette.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as {
            seriesName?: string;
            data?: ScatterDatum;
          };
          const d = p.data;
          if (!d?.value) return "";
          const [fmax, pwr] = d.value;
          return `${p.seriesName}<br/>Fmax: ${fmax} MHz<br/>Power: ${pwr} mW<br/>Width: ${d.bitWidth} b<br/>Area: ${d.areaUm2} µm²`;
        },
      },
      legend: {
        bottom: 0,
        type: "scroll",
        textStyle: { color: palette.textMuted },
      },
      xAxis: {
        type: "value",
        name: "Fmax (MHz)",
        nameLocation: "middle",
        nameGap: narrow ? 22 : 28,
        scale: true,
        axisLabel: { fontSize: narrow ? 9 : 11, color: palette.textMuted },
        nameTextStyle: { fontSize: narrow ? 10 : 12, color: palette.text },
        axisLine: { lineStyle: { color: palette.gridStrong } },
        splitLine: { lineStyle: { color: palette.grid, type: "dashed" } },
      },
      yAxis: {
        type: "value",
        name: "Power (mW)",
        nameLocation: "middle",
        nameGap: narrow ? 32 : 40,
        scale: true,
        axisLabel: { fontSize: narrow ? 9 : 11, color: palette.textMuted },
        nameTextStyle: { fontSize: narrow ? 10 : 12, color: palette.text },
        axisLine: { lineStyle: { color: palette.gridStrong } },
        splitLine: { lineStyle: { color: palette.grid, type: "dashed" } },
      },
      series,
      media: [
        {
          query: { maxWidth: 640 },
          option: {
            grid: { bottom: "40%", left: "16%", right: "10%" },
            legend: {
              bottom: 4,
              type: "scroll",
              itemWidth: 12,
              itemHeight: 10,
              textStyle: { fontSize: 9, color: palette.textMuted },
            },
          },
        },
      ],
    };
  }, [narrow, theme]);

  const lineOption = useMemo((): EChartsOption => {
    const palette = getChartPalette(theme);
    const ks = ADDER_DEMO_ROWS.filter((r) => r.architecture === "kogge_stone").sort(
      (a, b) => a.bitWidth - b.bitWidth,
    );
    const bw = ks.map((r) => r.bitWidth);

    return {
      backgroundColor: "transparent",
      textStyle: { color: palette.text, fontSize: narrow ? 10 : 12 },
      title: {
        text: narrow ? "Kogge-Stone scaling" : "Scaling: Kogge-Stone vs bit width",
        left: "center",
        textStyle: { fontSize: narrow ? 12 : 14, color: palette.text },
      },
      grid: narrow
        ? { left: "16%", right: "18%", top: "20%", bottom: "42%", containLabel: true }
        : { left: "12%", right: "14%", top: "18%", bottom: "24%", containLabel: true },
      toolbox: {
        right: narrow ? 4 : 8,
        top: narrow ? 4 : 8,
        iconStyle: { borderColor: palette.textMuted },
        emphasis: { iconStyle: { borderColor: palette.text } },
        feature: {
          saveAsImage: {
            title: "Save as PNG",
            name: "echarts-scaling",
            backgroundColor: theme === "dark" ? "#131b26" : "#fafafa",
          },
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: palette.text, fontSize: 12 },
      },
      legend: {
        bottom: narrow ? 52 : 0,
        data: ["Fmax (MHz)", "Area (µm²)"],
        textStyle: { color: palette.textMuted, fontSize: narrow ? 10 : 12 },
        itemGap: narrow ? 12 : 16,
      },
      xAxis: {
        type: "category",
        data: bw,
        name: "Bit width",
        nameTextStyle: { color: palette.text },
        axisLabel: { color: palette.textMuted },
        axisLine: { lineStyle: { color: palette.gridStrong } },
      },
      yAxis: [
        {
          type: "value",
          name: "Fmax (MHz)",
          position: "left",
          nameTextStyle: { color: palette.text },
          axisLabel: { color: palette.textMuted },
          axisLine: { show: true, lineStyle: { color: architectureColor("kogge_stone") } },
          splitLine: { lineStyle: { color: palette.grid, type: "dashed" } },
        },
        {
          type: "value",
          name: "Area (µm²)",
          position: "right",
          nameTextStyle: { color: palette.text },
          axisLabel: { color: palette.textMuted },
          axisLine: { show: true, lineStyle: { color: palette.accentOrange } },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Fmax (MHz)",
          type: "line",
          yAxisIndex: 0,
          data: ks.map((r) => r.fmaxMhz),
          smooth: true,
          symbol: "circle",
          symbolSize: narrow ? 11 : 8,
          lineStyle: { width: narrow ? 2.5 : 2, color: architectureColor("kogge_stone") },
        },
        {
          name: "Area (µm²)",
          type: "line",
          yAxisIndex: 1,
          data: ks.map((r) => r.areaUm2),
          smooth: true,
          symbol: "diamond",
          symbolSize: narrow ? 11 : 8,
          lineStyle: { width: 2, type: "dashed", color: palette.accentOrange },
        },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        {
          type: "slider",
          xAxisIndex: 0,
          height: narrow ? 32 : 22,
          bottom: narrow ? 8 : 36,
          moveHandleSize: narrow ? 10 : 7,
          textStyle: { color: palette.textMuted, fontSize: narrow ? 9 : 11 },
        },
      ],
      media: [
        {
          query: { maxWidth: 480 },
          option: {
            grid: { bottom: "44%" },
            dataZoom: [
              { type: "inside", xAxisIndex: 0, filterMode: "none" },
              {
                type: "slider",
                xAxisIndex: 0,
                height: 34,
                bottom: 6,
                moveHandleSize: 12,
              },
            ],
          },
        },
      ],
    };
  }, [narrow, theme]);

  return (
    <div>
      <div className="chart-card">
        <h2>Pareto scatter</h2>
        <p className="hint">
          Drag inside chart to zoom; legend scroll on small screens. Pinch works with
          inside zoom on many mobile browsers.
        </p>
        <div className="plot-host">
          <ReactECharts
            key={narrow ? "pareto-narrow" : "pareto-wide"}
            option={paretoOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <div className="chart-card">
        <h2>Dual-axis line + slider</h2>
        <p className="hint">
          Bottom <strong>dataZoom</strong> slider helps fat-finger navigation on phones.
        </p>
        <div className="plot-host">
          <ReactECharts
            key={narrow ? "line-narrow" : "line-wide"}
            option={lineOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
      <p className="note">
        ECharts: smaller initial payload than full Plotly, strong performance on mobile
        canvas; <code>media</code> + <code>dataZoom</code> are ideal for responsive
        dashboards.
      </p>
    </div>
  );
}
