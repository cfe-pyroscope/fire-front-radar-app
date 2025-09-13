import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getTimeSeries, type TimeSeriesByBaseTime } from "../api/fireIndexApi";
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import {
    Card,
    Group,
    Loader,
    SegmentedControl,
    Stack,
    Switch,
    Text,
    Box,
    Title,
    Space,
} from '@mantine/core';

import { getPalette } from "../utils/legend";

import { toNiceDateShort, toNiceDateLong } from "../utils/date";


// --- Props -------------------------------------------------------------------
type Props = {
    index?: 'pof' | 'fopi';
    bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY"
};


const ChartTimeSeries: React.FC<Props> = ({ index = 'pof', bbox = null }) => {

    // Controls that affect fetching
    const [indexSel, setIndexSel] = useState<'pof' | 'fopi'>(index);
    const [bboxSel, setBboxSel] = useState<string>(bbox ?? '');

    // Data / network state
    const [data, setData] = useState<TimeSeriesByBaseTime | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Presentation controls
    const [seriesMode, setSeriesMode] = useState<'both' | 'mean' | 'median'>('both');
    const [smooth, setSmooth] = useState(true);
    const [area, setArea] = useState(true);
    const [sampling] = useState<'lttb' | 'none'>('lttb'); // keep UI off for now

    // Keep internal controls in sync with incoming props if they change
    useEffect(() => {
        setIndexSel(index);
        setBboxSel(bbox ?? '');
    }, [index, bbox]);

    // --- Fetch data ------------------------------------------------------------
    useEffect(() => {
        const abort = new AbortController();
        setLoading(true);
        setErr(null);

        getTimeSeries(indexSel, bboxSel || null, abort.signal)
            .then((res) => {
                setData(res);
            })
            .catch((e) => {
                if (abort.signal.aborted) return;
                setErr(e?.message ?? 'Failed to load time series');
                setData(null);
            })
            .finally(() => {
                if (!abort.signal.aborted) setLoading(false);
            });

        return () => abort.abort();
    }, [indexSel, bboxSel]);

    // --- ECharts setup ---------------------------------------------------------
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


    // Map a normalized t∈[0,1] to a palette color, using your thresholds
    function paletteColorFor(indexSel: 'pof' | 'fopi', t: number) {
        const PALETTE_5 = getPalette('official_5');
        const tt =
            indexSel === 'fopi'
                ? [0.20, 0.40, 0.60, 0.80, 1]
                // pof thresholds mapped into normalized t-space; 0.050 => Extreme (t=1)
                : [0.0025 / 0.045, 0.0075 / 0.045, 0.015 / 0.045, 0.030 / 0.045, 1];

        const x = Math.max(0, Math.min(1, t));
        if (x === 0) return '#ffffff';
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


    const option: EChartsOption = useMemo(() => {
        const timestamps = data?.timestamps ?? [];
        const mean = data?.mean ?? [];
        const median = data?.median ?? [];

        const nums = (arr: (number | null)[]) =>
            arr.filter((v): v is number => typeof v === 'number');

        const minMean = Math.min(...nums(mean));
        const minMedian = Math.min(...nums(median));

        let minShown = 0;
        if (seriesMode === 'both') {
            minShown = Math.min(minMean, minMedian);
        } else if (seriesMode === 'mean') {
            minShown = minMean;
        } else {
            minShown = minMedian;
        }
        if (!isFinite(minShown)) minShown = 0;

        // y-axis baseline (also used by area origin)
        const axisMin = Math.max(0, minShown * 0.95);

        const maxMean = Math.max(0, ...nums(mean));
        const maxMedian = Math.max(0, ...nums(median));

        const norm = (idx: 'pof' | 'fopi', v: number) => {
            if (!Number.isFinite(v) || v <= 0) return 0;
            return idx === 'pof' ? Math.min(v / 0.05, 1) : Math.min(v, 1);
        };

        const meanAreaFill = hexToRgba(paletteColorFor(indexSel, norm(indexSel, maxMean)), 1);
        const medianAreaFill = hexToRgba(paletteColorFor(indexSel, norm(indexSel, maxMedian)), 1);

        const common = {
            type: 'line' as const,
            symbol: 'none',
            smooth,
            sampling: sampling === 'lttb' ? 'lttb' : undefined,
            connectNulls: true,
        };

        const meanColor = '#8a3b00';
        const medianColor = '#0a5f65';

        const series: any[] = [];
        if (seriesMode === 'both' || seriesMode === 'mean') {
            series.push({
                name: 'Mean',
                data: mean,
                ...common,
                lineStyle: { width: 2, color: meanColor },
                itemStyle: { color: meanColor },
                ...(area ? { areaStyle: { origin: axisMin, color: meanAreaFill } } : {}),
            });
        }
        if (seriesMode === 'both' || seriesMode === 'median') {
            series.push({
                name: 'Median',
                data: median,
                ...common,
                lineStyle: { width: 2, color: medianColor },
                itemStyle: { color: medianColor },
                ...(area ? { areaStyle: { origin: axisMin, color: medianAreaFill } } : {}),
            });
        }

        const title = `${data?.index?.toUpperCase() ?? indexSel.toUpperCase()} • By Base Time`;

        const opt: EChartsOption = {
            title: { left: 'center', text: title },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'line' },
                formatter: (params: any[]) => {
                    if (!params?.length) return '';
                    const header = toNiceDateLong(params[0].axisValue);
                    const lines = params.map((p: any) => {
                        const val = typeof p.data === 'number' ? p.data.toFixed(4) : '';
                        return `${p.marker}${p.seriesName}: ${val}`;
                    });
                    return [header, ...lines].join('<br/>');
                },
            },
            legend: { top: 50 },
            toolbox: {
                iconStyle: { borderColor: '#228be6', borderCap: 'round', borderWidth: '1' },
                right: 16,
                feature: {
                    dataView: { readOnly: false },
                    dataZoom: { yAxisIndex: 'none' },
                    restore: {},
                    saveAsImage: {},
                },
            },
            grid: { left: 48, right: 24, bottom: 60, top: 90 },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: timestamps,
                axisLabel: { formatter: (iso: string) => toNiceDateShort(iso) },
            },
            yAxis: {
                type: 'value',
                name: indexSel === 'pof' ? 'POF' : 'FOPI',
                min: axisMin, // keep consistent with areaStyle.origin
                max: (val: any) => Math.max(1e-6, Number(val.max)),
                axisLabel: { formatter: (val: number) => val.toFixed(4) },
            },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                {
                    type: 'slider',
                    start: 0, end: 100, height: 30, bottom: 10,
                    borderColor: 'transparent',
                    /* backgroundColor: '#dee2e6',
                    dataBackground: { lineStyle: { color: '#868e96' }, areaStyle: { color: '#f1f3f5' } },
                    fillerColor: '#ced4da66',
                    handleStyle: { color: '#868e96', borderColor: '#495057' },
                    moveHandleStyle: { color: '#aaa', opacity: 0.7 }, */
                    labelFormatter: (val: any) => {
                        const i = Number(val);
                        const iso = timestamps[i];
                        return iso ? toNiceDateLong(iso) : '';
                    },
                },
            ],
            series,
        };
        return opt;
    }, [data, seriesMode, smooth, area, sampling, indexSel]);



    useEffect(() => {
        if (!echartsRef.current) return;
        echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }, [option]);

    const dms = (v: number, pos: string, neg: string, digits = 2) =>
        `${Math.abs(v).toFixed(digits)}°${v >= 0 ? pos : neg}`;

    const niceGeo = (
        geo?: [number, number] | [number, number, number, number] | null,
        bbox3857?: string | null
    ) => {
        if (Array.isArray(geo)) {
            // Point: [lon, lat]
            if (geo.length > 4) {
                console.log("Logic to be implemented")
            }
            // BBox: [minLon, minLat, maxLon, maxLat]
            if (geo.length === 4) {
                const [minLon, minLat, maxLon, maxLat] = geo;
                return `area (SW → NE) ${dms(minLat, 'N', 'S')}, ${dms(minLon, 'E', 'W')} → ${dms(
                    maxLat,
                    'N',
                    'S'
                )}, ${dms(maxLon, 'E', 'W')}`;
            }
        }
        if (bbox3857) return '';
        return '';
    };


    const ts = data?.timestamps ?? [];
    const firstTs = ts[0];
    const lastTs = ts.length > 0 ? ts[ts.length - 1] : undefined;

    const where = niceGeo(data?.bbox_epsg4326 as any, bboxSel) || '';
    const where_coords = where ? where : '—';
    const fromStr = firstTs ? toNiceDateLong(firstTs) : '—';
    const toStr = lastTs ? toNiceDateLong(lastTs) : '—';

    const explanation =
        indexSel === 'pof' ? (
            <>
                Line chart showing <strong>POF</strong> values for the selected {where_coords} between {fromStr} – {toStr}. The scale runs from{" "}
                <span style={{ color: '#fff7ec', textShadow: '1px 1px 2px #000000' }}>0</span>{" "}
                to{" "}
                <span style={{ color: '#7f0000' }}>1</span>
                . Any value greater than{" "}<strong>0.05</strong>
                {" "}indicates an{" "}
                <span style={{ color: '#7f0000' }}>extreme condition</span>.
            </>
        ) : (
            <>
                Line chart showing <strong>FOPI</strong> values for the selected {where_coords} between {fromStr} – {toStr}. The scale runs from{" "}
                <span style={{ color: '#fff7ec', textShadow: '1px 1px 2px #000000' }}>0</span>{" "}
                to{" "}
                <span style={{ color: '#7f0000' }}>1</span>
                . Any value greater than{" "}<strong>0.8</strong>
                {" "}indicates an{" "}
                <span style={{ color: '#7f0000' }}>extreme condition</span>.
            </>
        );


    return (
        <Stack p="md" gap="md">
            <Title order={3}>Fire Danger Time Series</Title>
            <Box
                component="p"
                c="dimmed"
                fz="sm"
                style={{
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    lineHeight: 1.45,
                    maxWidth: '100%',
                }}
            >
                {explanation}
            </Box>


            <Card withBorder>
                <Stack gap="xs">
                    <Group gap="md" wrap="wrap">
                        <SegmentedControl
                            value={indexSel}
                            onChange={(v) => setIndexSel((v as 'pof' | 'fopi') ?? 'pof')}
                            data={[
                                { value: 'pof', label: 'POF' },
                                { value: 'fopi', label: 'FOPI' },
                            ]}
                            size="sm"          // tweak: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
                            radius="md"        // tweak corner radius
                            fullWidth={false}  // set to true to stretch
                            style={{ width: 120 }} // optional fixed width, or remove to autosize
                        />

                        <SegmentedControl
                            value={seriesMode}
                            onChange={(v) => setSeriesMode(v as any)}
                            data={[
                                { value: 'both', label: 'Mean & Median' },
                                { value: 'mean', label: 'Mean only' },
                                { value: 'median', label: 'Median only' },
                            ]}
                        />
                        <Switch checked={smooth} onChange={(e) => setSmooth(e.currentTarget.checked)} label="Smooth" />
                        <Switch checked={area} onChange={(e) => setArea(e.currentTarget.checked)} label="Area fill" />
                    </Group>
                </Stack>
            </Card>

            <Card withBorder padding="xs" style={{ height: 520, position: 'relative' }}>
                {loading && (
                    <Group justify="center" align="center" style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                        <Loader />
                    </Group>
                )}
                {err && (
                    <Group justify="center" align="center" style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                        <Text c="red">Error: {err}</Text>
                    </Group>
                )}
                {!loading && !err && !data && (
                    <Group justify="center" align="center" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                        <Text c="dimmed">No data available.</Text>
                    </Group>
                )}
                <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
            </Card>
            <Space h="xs" />
        </Stack>
    );
};

export default ChartTimeSeries;
