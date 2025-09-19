// ExceedanceFrequencyChart.tsx
import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption, SeriesOption } from "echarts";
import type { TooltipComponentOption } from "echarts/components";
import { Group, Loader, Text } from "@mantine/core";
import type { ExceedanceFrequency } from "../api/fireIndexApi";

type TooltipFormatterFn = Extract<TooltipComponentOption["formatter"], (...args: any) => any>;
type TooltipFmtParam = Parameters<TooltipFormatterFn>[0];

type Props = {
    data: ExceedanceFrequency | null;
    indexSel: "pof" | "fopi";
    height?: number | string;
    loading?: boolean;
    error?: string | null;
    cdf?: boolean;
};

const ExceedanceFrequencyChart: React.FC<Props> = ({
    data,
    indexSel,
    height = 520,
    loading = false,
    error = null,
    cdf = false,
}) => {
    // --- ECharts bootstrap ------------------------------------------------------
    const chartRef = useRef<HTMLDivElement | null>(null);
    const echartsRef = useRef<echarts.EChartsType | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        const inst = echarts.init(chartRef.current);
        echartsRef.current = inst;

        const ro = new ResizeObserver(() => inst.resize());
        ro.observe(chartRef.current);

        return () => {
            ro.disconnect();
            inst.dispose();
            echartsRef.current = null;
        };
    }, []);

    function getLineColor(index: "pof" | "fopi") {
        return index === "pof" ? "#5070DD" : "#B6D634";
    }

    function getPointFromTooltipParam(p: any): [number, number] {
        // ECharts may put coords in either `data` or `value`
        if (Array.isArray(p?.data) && p.data.length >= 2) {
            return [Number(p.data[0]), Number(p.data[1])];
        }
        const v = p?.value;
        if (Array.isArray(v) && v.length >= 2) {
            return [Number(v[0]), Number(v[1])];
        }
        return [NaN, NaN];
    }

    const toPct = (v: number | undefined | null, digits = 2) =>
        v == null || !isFinite(v) ? "—" : `${(v * 100).toFixed(digits)}%`;

    const thresholdFmt = (t: number, idx: "pof" | "fopi") => {
        const digits = idx === "pof" ? 4 : 2;
        return t.toFixed(digits);
    };

    // --- Option -----------------------------------------------------------------
    const option: EChartsOption = useMemo(() => {
        const thresholds = data?.thresholds ?? [];

        // X domain with small padding
        const tMinRaw = thresholds.length ? Math.min(...thresholds) : 0;
        const tMaxRaw = thresholds.length ? Math.max(...thresholds) : 1;
        const span = Math.max(1e-6, tMaxRaw - tMinRaw);
        const pad = Math.min(0.05, span * 0.05);
        const xMin = Math.max(0, tMinRaw - pad);
        const xMax = Math.min(1, tMaxRaw + pad);

        // --- 1) Pooled (overall) CCDF across all runs/cells -----------------------
        const pooledCCDF = data?.overall?.fraction ?? [];           // y for CCDF
        const pooledCDF = pooledCCDF.map((v) => (Number.isFinite(v) ? 1 - v : NaN));

        // --- 2) Day-based exceedance: “days with any cells ≥ t” -------------------
        const nDays = Array.isArray(data?.by_date?.dates) ? data!.by_date.dates.length : 0;
        let daysWithAnyExceed: number[] = [];
        if (nDays && data?.by_date?.count?.length) {
            // by_date.count shape: [n_dates][n_thresholds]
            const countsByDate = data.by_date.count; // number[][]
            // For each threshold j, count days where count > 0
            daysWithAnyExceed = thresholds.map((_, j) => {
                let c = 0;
                for (let d = 0; d < countsByDate.length; d++) {
                    if ((countsByDate[d]?.[j] ?? 0) > 0) c++;
                }
                return c;
            });
        }
        const dayCCDF = nDays ? daysWithAnyExceed.map((c) => c / nDays) : [];

        // Which curve to display on Y
        const y = cdf ? pooledCDF : pooledCCDF;
        const seriesName = cdf ? "CDF (≤ threshold)" : "CCDF (≥ threshold)";

        // Build series
        const scatterSeries: SeriesOption = {
            name: seriesName,
            type: "scatter",
            symbolSize: 10,
            symbol: indexSel === "pof" ? "circle" : "diamond",
            itemStyle: { color: getLineColor(indexSel) },
            emphasis: { focus: "series" },
            data: thresholds.map((t, i) => [t, y[i] ?? null]),
        };

        const title = `${(data?.index ?? indexSel).toUpperCase()} • ${seriesName}`;

        // Tooltip: show pooled cell proportion and day-based exceedance summary
        const pooledTotal = data?.overall?.total ?? 0;
        const pooledCount = data?.overall?.count ?? [];
        const formatter = (params: TooltipFmtParam) => {
            const p = Array.isArray(params) ? params[0] : params;
            if (!p) return "";
            const [t, val] = getPointFromTooltipParam(p);
            const thrStr = thresholdFmt(Number(t), indexSel);

            const idx = thresholds.findIndex((x) => x === t);
            const ccdfCellFrac = pooledCCDF[idx] ?? NaN; // pooled CCDF at threshold
            const ccdfCellCnt = pooledCount[idx] ?? null;

            const ccdfDayFrac = dayCCDF[idx] ?? NaN;
            const ccdfDayCnt = daysWithAnyExceed[idx] ?? null;

            const lines = [
                `${p.marker}${p.seriesName}`,
                `Threshold: <b>${thrStr}</b>`,
                // show the curve value being plotted (CDF or CCDF)
                `${cdf ? "≤" : "≥"} t (pooled): <b>${toPct(Number(val))}</b>`,
            ];

            // Add extra context: pooled cells + day frequency (CCDF side)
            lines.push(
                `Cells ≥ t (pooled CCDF): <b>${toPct(ccdfCellFrac)}</b>` +
                (Number.isFinite(pooledTotal) && ccdfCellCnt != null
                    ? ` (${ccdfCellCnt}/${pooledTotal} cells)`
                    : "")
            );

            if (nDays) {
                lines.push(
                    `Days with any cell ≥ t: <b>${toPct(ccdfDayFrac)}</b>` +
                    (ccdfDayCnt != null ? ` (${ccdfDayCnt}/${nDays} days)` : "")
                );
            }

            return lines.join("<br/>");
        };

        const opt: EChartsOption = {
            title: { left: "center", text: title },
            tooltip: {
                trigger: "item",
                valueFormatter: (v) => toPct(Number(v)),
                formatter,
            },
            toolbox: {
                iconStyle: { borderColor: "#C0C8E5", borderWidth: 1 },
                right: 16,
                feature: { dataView: { readOnly: false }, restore: {}, saveAsImage: {} },
            },
            grid: { left: 64, right: 24, bottom: 48, top: 64 },
            xAxis: {
                type: "value",
                name: "Threshold",
                min: xMin,
                max: xMax,
                splitLine: { show: true },
                axisLabel: { formatter: (val: number) => thresholdFmt(Number(val), indexSel) },
                scale: true,
            },
            yAxis: {
                type: "value",
                name: cdf ? "Proportion ≤ t" : "Proportion ≥ t",
                min: 0,
                max: 1,
                axisLabel: { formatter: (v: number) => toPct(v, 0) },
            },
            series: [scatterSeries],
            dataZoom:
                thresholds.length > 12
                    ? [
                        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
                        { type: "slider", xAxisIndex: 0, height: 24, bottom: 8 },
                    ]
                    : undefined,
            animationDurationUpdate: 200,
        };

        return opt;
    }, [data, indexSel, cdf]);


    useEffect(() => {
        if (!echartsRef.current) return;
        echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }, [option]);

    return (
        <div style={{ width: "100%", height }}>
            {loading && (
                <Group justify="center" align="center" style={{ position: "absolute", inset: 0, zIndex: 2 }}>
                    <Loader />
                </Group>
            )}
            {error && (
                <Group justify="center" align="center" style={{ position: "absolute", inset: 0, zIndex: 2 }}>
                    <Text c="red">Error: {error}</Text>
                </Group>
            )}
            {!loading && !error && !data && (
                <Group justify="center" align="center" style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                    <Text c="dimmed">Select index and date range to load the data</Text>
                </Group>
            )}
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
    );
};

export default ExceedanceFrequencyChart;
