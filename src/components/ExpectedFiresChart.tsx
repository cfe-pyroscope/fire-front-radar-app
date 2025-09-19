import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption, SeriesOption } from "echarts";
import type { TooltipComponentOption } from "echarts/components";
import { Group, Loader, Text } from "@mantine/core";
import { toNiceDateShort, toNiceDateLong } from "../utils/date";
import type { ExpectedFiresByDate } from "../api/fireIndexApi";

type TooltipFormatterFn = Extract<TooltipComponentOption["formatter"], (...args: any) => any>;
type TooltipFmtParam = Parameters<TooltipFormatterFn>[0];

type Props = {
    data: ExpectedFiresByDate | null;
    indexSel: "pof" | "fopi";
    height?: number | string;
    loading?: boolean;
    error?: string | null;
    waterfall?: boolean;
};

const ExpectedFiresChart: React.FC<Props> = ({
    data,
    indexSel,
    height = 520,
    loading = false,
    error = null,
    waterfall = false,
}) => {
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

    function getBarColor(index: "pof" | "fopi") {
        return index === "pof" ? "#5070DD" : "#B6D634";
    }

    // --- Option -----------------------------------------------------------------
    const option: EChartsOption = useMemo(() => {
        const dates = data?.dates ?? [];              // "YYYY-MM-DD"
        const values = data?.expected_sum ?? [];      // daily expected fires

        // prefix sums for waterfall baseline
        const prefix: number[] = [];
        let acc = 0;
        for (let i = 0; i < values.length; i++) {
            prefix.push(acc);      // total up to (but not including) i
            acc += values[i];      // add today for next step
        }
        const runningTotals = values.map((v, i) => prefix[i] + v); // for y-axis & tooltip

        // y-axis max adapts to mode
        const maxDaily = values.length ? Math.max(...values) : 0;
        const maxCumulative = runningTotals.length ? Math.max(...runningTotals) : 0;
        const yMax = waterfall ? maxCumulative : maxDaily;

        const title = `${(data?.index ?? indexSel).toUpperCase()} • Expected fires ${waterfall ? "(waterfall)" : "(bars from zero)"} by Date`;

        // Tooltip: show daily; if waterfall also show cumulative
        const formatter = (params: TooltipFmtParam) => {
            const list = Array.isArray(params) ? params : [params];
            // find the visible (non-placeholder) series item
            const p = list.find((x: any) => x?.seriesName !== "Cumulative") as any;
            if (!p) return "";
            const idx = p?.dataIndex ?? 0;
            const header = toNiceDateLong(p.axisValue as string);
            const daily = typeof p.data === "number" ? p.data : null;
            const cum = runningTotals[idx] ?? null;

            if (waterfall) {
                return `${header}<br/>${p.marker}${p.seriesName}: ${daily?.toFixed(2)}<br/>Cumulative: ${cum?.toFixed(2)}`;
            }
            return `${header}<br/>${p.marker}${p.seriesName}: ${daily?.toFixed(2)}`;
        };

        const series = (waterfall
            ? [
                {
                    name: "Cumulative",
                    type: "bar" as const,
                    stack: "total",
                    itemStyle: { color: "transparent", borderColor: "transparent" },
                    emphasis: { itemStyle: { color: "transparent", borderColor: "transparent" } },
                    tooltip: { show: false },
                    silent: true,
                    data: prefix,
                },
                {
                    name: "Expected fires (sum)",
                    type: "bar" as const,
                    stack: "total",
                    itemStyle: { color: getBarColor(indexSel), borderRadius: [6, 6, 6, 6] },
                    label: { show: false },
                    data: values,
                },
            ]
            : [
                {
                    name: "Expected fires (sum)",
                    type: "bar" as const,
                    emphasis: { focus: "series" },
                    itemStyle: { color: getBarColor(indexSel), borderRadius: [6, 6, 0, 0] },
                    label: { show: false },
                    data: values,
                },
            ]) satisfies SeriesOption[];

        const opt: EChartsOption = {
            title: { left: "center", text: title },
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                formatter,
            },
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
            grid: { left: 48, right: 24, bottom: 60, top: 80 },
            xAxis: {
                type: "category",
                splitLine: { show: false },
                data: dates,
                axisLabel: { formatter: (d: string) => toNiceDateShort(d) },
            },
            yAxis: {
                type: "value",
                name: waterfall ? "Cumulative expected fires" : "Expected fires (sum)",
                min: 0,
                max: (val: any) => Math.max(1, Number(yMax || val.max)),
                axisLabel: { formatter: (v: number) => (yMax < 5 ? v.toFixed(2) : v.toFixed(0)) },
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
                        const d = dates[i];
                        return d ? toNiceDateLong(d) : "";
                    },
                },
            ],
            series,
        };

        return opt;
    }, [data, indexSel, waterfall]);


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

export default ExpectedFiresChart;
