import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import type { TooltipComponentOption } from "echarts/components";
import { Group, Loader, Text } from "@mantine/core";
import { toNiceDateShort, toNiceDateLong } from "../utils/date";
import type { TimeSeriesByBaseTime } from "../api/fireIndexApi";

type TooltipFormatterFn = Extract<
    TooltipComponentOption["formatter"],
    (...args: any) => any
>;
type TooltipFmtParam = Parameters<TooltipFormatterFn>[0];

type Props = {
    data: TimeSeriesByBaseTime | null;
    indexSel: "pof" | "fopi";
    smooth: boolean;
    area: boolean;
    sampling?: "lttb" | "none";
    height?: number | string;
    loading?: boolean;
    error?: string | null;
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

    // --- Option -----------------------------------------------------------------
    const option: EChartsOption = useMemo(() => {
        const timestamps = data?.timestamps ?? [];
        const mean = data?.mean ?? [];
        const median = data?.median ?? [];

        const nums = (arr: (number | null)[]) =>
            arr.filter((v): v is number => typeof v === "number");

        const minMean = Math.min(...nums(mean));
        const minMedian = Math.min(...nums(median));

        let minShown = Math.min(
            isFinite(minMean) ? minMean : Number.POSITIVE_INFINITY,
            isFinite(minMedian) ? minMedian : Number.POSITIVE_INFINITY
        );
        if (!isFinite(minShown)) minShown = 0;

        // y-axis baseline (also used by area origin)
        const axisMin = Math.max(0, minShown * 0.95);

        // simple inline colors (no helpers)
        const meanColor = indexSel === "pof" ? "#5070dd" : "#5070dd";
        const medianColor = indexSel === "pof" ? "#b6d634" : "#b6d634";

        const common = {
            type: "line" as const,
            symbol: "none",
            smooth,
            sampling: sampling === "lttb" ? "lttb" : undefined,
            connectNulls: true,
        };

        const series: any[] = [
            {
                name: "Mean",
                data: mean,
                ...common,
                // symbols for MEAN
                symbol: "circle",
                showSymbol: true,
                showAllSymbol: "auto",
                symbolSize: 0,
                itemStyle: { color: meanColor },
                lineStyle: { width: 2, color: meanColor },
                ...(area
                    ? {
                        areaStyle: {
                            opacity: .8,
                            origin: axisMin,
                            color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
                                {
                                    offset: 0,
                                    color: '#7696fd'
                                },
                                {
                                    offset: 1,
                                    color: '#2e4eb8'
                                }
                            ]),
                        },
                    }
                    : {}),
                emphasis: { focus: "series" },
            },
            {
                name: "Median",
                data: median,
                ...common,
                // symbols for MEDIAN
                symbol: "diamond",
                showSymbol: true,
                showAllSymbol: "auto",
                symbolSize: 0,
                itemStyle: { color: medianColor },
                lineStyle: { width: 2, color: medianColor },
                ...(area
                    ? {
                        areaStyle: {
                            opacity: .8,
                            origin: axisMin,
                            color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
                                {
                                    offset: 0,
                                    color: '#ceff08'
                                },
                                {
                                    offset: 1,
                                    color: '#9ac000'
                                }
                            ]),
                        },
                    }
                    : {}),
                emphasis: { focus: "series" },
            },
        ];

        const title = `${data?.index?.toUpperCase() ?? indexSel.toUpperCase()} • by Base date`;

        const opt: EChartsOption = {
            title: { left: "center", text: title },
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "line" },
                formatter: (params: TooltipFmtParam) => {
                    const list = Array.isArray(params) ? params : [params];
                    const header = toNiceDateLong((list[0] as any).axisValue as string);
                    const lines = list.map((p: any) => {
                        const val = typeof p.data === "number" ? p.data.toFixed(4) : "";
                        return `${p.marker}${p.seriesName}: ${val}`;
                    });
                    return [header, ...lines].join("<br/>");
                },
            },
            legend: { top: 50 },
            toolbox: {
                iconStyle: { borderColor: "#C0C8E5", borderWidth: 1 },
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
                    <Text c="dimmed">Select index and date range to load the data</Text>
                </Group>
            )}
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
    );
};

export default TimeSeriesChart;
