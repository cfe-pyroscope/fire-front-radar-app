// ChartTimeSeries.tsx — fixed
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getTimeSeries } from "../api/fireIndexApi";
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import {
    Button,
    Card,
    Code,
    Group,
    Loader,
    SegmentedControl,
    Stack,
    Switch,
    Text,
    Title,
    Tooltip as MantineTooltip,
    Select,
    Space,
} from '@mantine/core';

// --- API type (by_base_time only) --------------------------------------------
type TimeSeriesByBaseTime = {
    index: 'pof' | 'fopi';
    mode: 'by_base_time';
    stat: ['mean', 'median'] | string[];
    bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY" or null for global
    timestamps: string[];
    mean: (number | null)[];
    median: (number | null)[];
};

// --- Props -------------------------------------------------------------------
type Props = {
    index?: 'pof' | 'fopi';
    bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY" (unencoded)
};

const defaultProps: Required<Props> = {
    index: 'pof',
    bbox: null,
};

const toNiceDateShort = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
    });

const ChartTimeSeries: React.FC<Props> = (props) => {
    const merged = { ...defaultProps, ...props };

    // Controls that affect fetching
    const [indexSel, setIndexSel] = useState<'pof' | 'fopi'>(merged.index);
    const [bboxSel, setBboxSel] = useState<string>(merged.bbox ?? '');

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
        setIndexSel(merged.index);
        setBboxSel(merged.bbox ?? '');
    }, [merged.index, merged.bbox]);

    // --- Fetch data ------------------------------------------------------------
    useEffect(() => {
        const abort = new AbortController();
        setLoading(true);
        setErr(null);

        getTimeSeries(indexSel, bboxSel || null, abort.signal)
            .then((res) => {
                setData(res as TimeSeriesByBaseTime);
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

    const option: EChartsOption = useMemo(() => {
        const timestamps = data?.timestamps ?? [];
        const mean = data?.mean ?? [];
        const median = data?.median ?? [];

        const areaStyle = area ? { areaStyle: { opacity: 0.25 } } : {};

        const common = {
            type: 'line' as const,
            symbol: 'none',
            smooth,
            sampling: sampling === 'lttb' ? 'lttb' : undefined,
            connectNulls: true,
            ...areaStyle,
        };

        const series: any[] = [];
        if (seriesMode === 'both' || seriesMode === 'mean') {
            series.push({ name: 'Mean', data: mean, ...common });
        }
        if (seriesMode === 'both' || seriesMode === 'median') {
            series.push({ name: 'Median', data: median, ...common });
        }

        const title = `${data?.index?.toUpperCase() ?? indexSel.toUpperCase()} • By Base Time`;

        const opt: EChartsOption = {
            title: { left: 'center', text: title },
            tooltip: {
                trigger: 'axis',
                valueFormatter: (val) => (typeof val === 'number' ? val.toFixed(6) : (val as any) ?? ''),
            },
            legend: { top: 50 },
            toolbox: {
                right: 16,
                feature: {
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
                min: 0,
                max: (val: any) => Math.max(1e-6, Number(val.max) * 1.2),
                axisLabel: { formatter: (val: number) => val.toFixed(3) },
            },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { start: 0, end: 100 }],
            series,
        };
        return opt;
    }, [data, seriesMode, smooth, area, sampling, indexSel]);

    useEffect(() => {
        if (!echartsRef.current) return;
        echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }, [option]);

    return (
        <Stack p="md" gap="md">
            <Title order={3}>Fire Danger Time Series</Title>
            <Text size="sm" c="dimmed">Explanation of the chart</Text>

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

                        {/* <Button
                            variant="light"
                            onClick={() => {
                                if (!echartsRef.current) return;
                                echartsRef.current.dispatchAction({ type: 'restore' });
                            }}
                        >
                            Reset view
                        </Button> */}
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
            <Text size="sm" c="dimmed">

                coords: {bboxSel
                    ? bboxSel
                        .split(',')
                        .map((c) => Number(c).toFixed(2))
                        .join(', ')
                    : 'global'}
            </Text>
            <Space h="xs" />
        </Stack>
    );
};

ChartTimeSeries.defaultProps = defaultProps;

export default ChartTimeSeries;
