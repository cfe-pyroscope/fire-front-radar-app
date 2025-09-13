import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { Group, Loader, Text } from "@mantine/core";
import { getPalette } from "../utils/legend";
import { toNiceDateShort, toNiceDateLong } from "../utils/date";
import type { TimeSeriesByBaseTime } from "../api/fireIndexApi";

type Props = {
    data: TimeSeriesByBaseTime | null;
    indexSel: "pof" | "fopi";
    smooth: boolean;
    area: boolean;
    sampling?: "lttb" | "none";
    height?: number | string;
    loading?: boolean;
    error?: string | null;
    setCarouselDraggable?: (v: boolean) => void;
};

const TimeSeriesChart: React.FC<Props> = ({
    data,
    indexSel,
    smooth,
    area,
    sampling = "lttb",
    height = 520,
    loading = false,
    error = null,
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

    // --- Helpers ----------------------------------------------------------------
    function paletteColorFor(idx: "pof" | "fopi", t: number) {
        const PALETTE_5 = getPalette("official_5");
        const tt = idx === "fopi"
            ? [0.20, 0.40, 0.60, 0.80, 1]
            : [0.0025 / 0.045, 0.0075 / 0.045, 0.015 / 0.045, 0.030 / 0.045, 1];

        const x = Math.max(0, Math.min(1, t));
        if (x === 0) return "#ffffff";
        if (x <= tt[0]) return PALETTE_5[0]; // Low
        if (x <= tt[1]) return PALETTE_5[1]; // Medium
        if (x <= tt[2]) return PALETTE_5[2]; // High
        if (x <= tt[3]) return PALETTE_5[3]; // Very High
        return PALETTE_5[4];                 // Extreme
    }

    function hexToRgba(hex: string, alpha = 0.25) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return hex;
        const r = parseInt(m[1], 16);
        const g = parseInt(m[2], 16);
        const b = parseInt(m[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // --- Option -----------------------------------------------------------------
    const option: EChartsOption = useMemo(() => {
        const timestamps = data?.timestamps ?? [];
        const mean = data?.mean ?? [];
        const median = data?.median ?? [];

        const nums = (arr: (number | null)[]) =>
            arr.filter((v): v is number => typeof v === "number");

        const minMean = Math.min(...nums(mean));
        const minMedian = Math.min(...nums(median));

        let minShown = 0;
        minShown =
            Math.min(
                isFinite(minMean) ? minMean : Number.POSITIVE_INFINITY,
                isFinite(minMedian) ? minMedian : Number.POSITIVE_INFINITY
            );
        if (!isFinite(minShown)) minShown = 0;

        // y-axis baseline (also used by area origin)
        const axisMin = Math.max(0, minShown * 0.95);

        const maxMean = Math.max(0, ...nums(mean));
        const maxMedian = Math.max(0, ...nums(median));

        const norm = (idx: "pof" | "fopi", v: number) => {
            if (!Number.isFinite(v) || v <= 0) return 0;
            return idx === "pof" ? Math.min(v / 0.05, 1) : Math.min(v, 1);
        };

        const meanAreaFill = hexToRgba(paletteColorFor(indexSel, norm(indexSel, maxMean)), 1);
        const medianAreaFill = hexToRgba(paletteColorFor(indexSel, norm(indexSel, maxMedian)), 1);

        const common = {
            type: "line" as const,
            symbol: "none",
            smooth,
            sampling: sampling === "lttb" ? "lttb" : undefined,
            connectNulls: true,
        };

        const meanColor = "#8a3b00";
        const medianColor = "#0a5f65";

        const series: any[] = [
            {
                name: "Mean",
                data: mean,
                ...common,
                lineStyle: { width: 2, color: meanColor },
                itemStyle: { color: meanColor },
                ...(area ? { areaStyle: { origin: axisMin, color: meanAreaFill } } : {}),
            },
            {
                name: "Median",
                data: median,
                ...common,
                lineStyle: { width: 2, color: medianColor },
                itemStyle: { color: medianColor },
                ...(area ? { areaStyle: { origin: axisMin, color: medianAreaFill } } : {}),
            },
        ];

        const title = `${data?.index?.toUpperCase() ?? indexSel.toUpperCase()} • by Base date`;

        const opt: EChartsOption = {
            title: { left: "center", text: title },
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "line" },
                formatter: (params: any[]) => {
                    if (!params?.length) return "";
                    const header = toNiceDateLong(params[0].axisValue);
                    const lines = params.map((p: any) => {
                        const val = typeof p.data === "number" ? p.data.toFixed(4) : "";
                        return `${p.marker}${p.seriesName}: ${val}`;
                    });
                    return [header, ...lines].join("<br/>");
                },
            },
            legend: { top: 50 },
            toolbox: {
                iconStyle: { borderColor: "#C0C8E5", borderCap: "round", borderWidth: "1" },
                right: 16,
                feature: {
                    dataView: { readOnly: false },
                    dataZoom: { yAxisIndex: "none" },
                    restore: {},
                    saveAsImage: {},
                },
            },
            grid: { left: 48, right: 24, bottom: 60, top: 90 },
            xAxis: {
                type: "category",
                boundaryGap: false,
                data: timestamps,
                axisLabel: { formatter: (iso: string) => toNiceDateShort(iso) },
            },
            yAxis: {
                type: "value",
                name: indexSel === "pof" ? "POF" : "FOPI",
                min: axisMin,
                max: (val: any) => Math.max(1e-6, Number(val.max)),
                axisLabel: { formatter: (val: number) => val.toFixed(4) },
            },
            dataZoom: [
                { type: "inside", start: 0, end: 100 },
                {
                    type: "slider",
                    start: 0,
                    end: 100,
                    height: 30,
                    bottom: 10,
                    borderColor: "transparent",
                    labelFormatter: (val: any) => {
                        const i = Number(val);
                        const iso = timestamps[i];
                        return iso ? toNiceDateLong(iso) : "";
                    },
                },
            ],
            series,
        };
        return opt;
    }, [data, indexSel, smooth, area, sampling]);

    // --- Apply option -----------------------------------------------------------
    useEffect(() => {
        if (!echartsRef.current) return;
        echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }, [option]);

    return (
        <div style={{ width: "100%", height }}>
            {loading && (
                <Group
                    justify="center"
                    align="center"
                    style={{ position: "absolute", inset: 0, zIndex: 2 }}
                >
                    <Loader />
                </Group>
            )}
            {error && (
                <Group
                    justify="center"
                    align="center"
                    style={{ position: "absolute", inset: 0, zIndex: 2 }}
                >
                    <Text c="red">Error: {error}</Text>
                </Group>
            )}
            {!loading && !error && !data && (
                <Group
                    justify="center"
                    align="center"
                    style={{ position: "absolute", inset: 0, zIndex: 1 }}
                >
                    <Text c="dimmed">No data available.</Text>
                </Group>
            )}
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
    );
};

export default TimeSeriesChart;
