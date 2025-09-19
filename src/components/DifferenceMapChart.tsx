// DifferenceMapChart.tsx
import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { Group, Loader, Text } from "@mantine/core";
import type { DifferenceMapResponse } from "../api/fireIndexApi";

type Props = {
    data: DifferenceMapResponse | null;
    indexSel: "pof" | "fopi";
    height?: number | string;
    loading?: boolean;
    error?: string | null;
};

const DifferenceMapChart: React.FC<Props> = ({
    data,
    indexSel,
    height = 520,
    loading = false,
    error = null,
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

    // NOTE: option can be null when there is no data
    const option: EChartsOption | null = useMemo(() => {
        const baseTitle = `${(data?.index ?? indexSel).toUpperCase()} • Δ Difference Grid`;

        // When there's no usable data, return null so we can clear the chart
        if (
            !data ||
            !Array.isArray(data.lats) ||
            !Array.isArray(data.lons) ||
            !Array.isArray(data.delta)
        ) {
            return null;
        }

        const lats = data.lats ?? [];
        const lons = data.lons ?? [];
        const deltaRaw = data.delta ?? [];

        const delta = Array.isArray(deltaRaw) && deltaRaw.length > 0 && Array.isArray(deltaRaw[0])
            ? deltaRaw[0]
            : deltaRaw;

        const ny = Array.isArray(delta) ? delta.length : 0;
        const nx = ny > 0 && Array.isArray(delta[0]) ? (delta[0] as any[]).length : 0;

        const looksLatLon = ny === lats.length && (nx === lons.length || nx === 0);
        const looksLonLat = ny === lons.length && (nx === lats.length || nx === 0);

        const points: [number, number, number][] = [];
        if (looksLatLon) {
            for (let i = 0; i < lats.length; i++) {
                const row = (delta[i] as (number | null)[]) || [];
                for (let j = 0; j < lons.length; j++) {
                    const v = row[j];
                    if (typeof v === "number" && isFinite(v)) points.push([lons[j], lats[i], v]);
                }
            }
        } else if (looksLonLat) {
            for (let j = 0; j < lons.length; j++) {
                const col = (delta[j] as (number | null)[]) || [];
                for (let i = 0; i < lats.length; i++) {
                    const v = col[i];
                    if (typeof v === "number" && isFinite(v)) points.push([lons[j], lats[i], v]);
                }
            }
        } else {
            for (let i = 0; i < lats.length; i++) {
                const row = (delta[i] as (number | null)[]) || [];
                for (let j = 0; j < lons.length; j++) {
                    const v = row[j];
                    if (typeof v === "number" && isFinite(v)) points.push([lons[j], lats[i], v]);
                }
            }
        }

        const hasData = points.length > 0;
        let maxAbs = hasData ? Math.max(...points.map((p) => Math.abs(p[2]))) : 0;
        if (!isFinite(maxAbs) || maxAbs === 0) maxAbs = 1e-6;

        const symbolSize = Math.max(3, Math.min(20, 1000 / Math.sqrt(points.length || 1)));

        return {
            title: { text: baseTitle, left: "center" },
            animation: false,
            grid: { left: 60, right: 30, top: 60, bottom: 60 },
            tooltip: {
                trigger: "item",
                formatter: (p: any) => {
                    const [lon, lat, val] = p.value;
                    return `Lon: ${Number(lon).toFixed(2)}<br/>Lat: ${Number(lat).toFixed(2)}<br/>Δ: ${Number(val).toExponential(3)}`;
                },
            },
            xAxis: {
                name: "Lon",
                type: "value",
                min: lons.length ? Math.min(...lons) : -180,
                max: lons.length ? Math.max(...lons) : 180,
                scale: true,
                axisLabel: { formatter: (v: number) => v.toFixed(2), margin: 15 },
            },
            yAxis: {
                name: "Lat",
                type: "value",
                min: lats.length ? Math.min(...lats) : -90,
                max: lats.length ? Math.max(...lats) : 90,
                scale: true,
                axisLabel: { formatter: (v: number) => v.toFixed(2), margin: 15 },
            },
            visualMap: {
                min: -maxAbs,
                max: maxAbs,
                calculable: true,
                orient: "horizontal",
                left: "center",
                bottom: -20,
                inRange: { color: ["#4575b4", "#ffffbf", "#d73027"] },
                dimension: 2,
            },
            series: [
                {
                    name: "Δ",
                    type: "scatter",
                    data: points,
                    symbolSize,
                    progressive: 5000,
                    progressiveThreshold: 10000,
                    emphasis: { focus: "series" },
                    itemStyle: { opacity: 0.8 },
                },
            ],
        };
    }, [data, indexSel]);

    useEffect(() => {
        const inst = echartsRef.current;
        if (!inst) return;

        if (option === null) {
            // No data → no axes. Clear any previously set state.
            inst.clear();
            return;
        }

        inst.setOption(option, { notMerge: true, lazyUpdate: true });
    }, [option]);

    return (
        <div style={{ width: "100%", height, position: "relative" }}>
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

export default DifferenceMapChart;
