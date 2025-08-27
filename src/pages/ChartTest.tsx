// ChartTest.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    bbox_epsg3857: string | null;
    timestamps: string[];
    mean: (number | null)[];
    median: (number | null)[];
};

// --- Props -------------------------------------------------------------------
type Props = {
    apiBase?: string; // default: http://127.0.0.1:8090/api
    index?: 'pof' | 'fopi';
    /** bbox in EPSG:3857 as 'x_min,y_min,x_max,y_max' (URL encoded ok). If omitted, backend should use its default/global. */
    bbox?: string | null;
};

const defaultProps: Required<Props> = {
    apiBase: 'http://127.0.0.1:8090/api',
    index: 'pof',
    bbox: '1033428.6224155831%2C4259682.712276304%2C2100489.537276644%2C4770282.061221281',
};

function buildUrl(apiBase: string, index: 'pof' | 'fopi', bbox: string | null) {
    const params = new URLSearchParams();
    if (bbox) params.set('bbox', bbox);
    return `${apiBase}/${index}/time_series?${params.toString()}`;
}

const toNiceDateShort = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
    });

const ChartTest: React.FC<Props> = (props) => {
    const merged = { ...defaultProps, ...props };

    // Controls that affect URL
    const [indexSel, setIndexSel] = useState<'pof' | 'fopi'>(merged.index);
    const [bboxSel, setBboxSel] = useState<string>(merged.bbox ?? '');

    // Data state
    const [apiUrl, setApiUrl] = useState(() => buildUrl(merged.apiBase, indexSel, bboxSel || null));
    const [data, setData] = useState<TimeSeriesByBaseTime | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Presentation controls
    const [seriesMode, setSeriesMode] = useState<'both' | 'mean' | 'median'>('both');
    const [smooth, setSmooth] = useState(true);
    const [area, setArea] = useState(true);
    const [sampling, setSampling] = useState<'lttb' | 'none'>('lttb');

    // Rebuild URL when inputs change
    useEffect(() => {
        setApiUrl(buildUrl(merged.apiBase, indexSel, bboxSel || null));
    }, [merged.apiBase, indexSel, bboxSel]);

    // --- Fetch data ------------------------------------------------------------
    useEffect(() => {
        let aborted = false;
        const ac = new AbortController();

        setLoading(true);
        setErr(null);
        setData(null);

        fetch(apiUrl, { signal: ac.signal })
            .then(async (r) => {
                if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
                return r.json() as Promise<TimeSeriesByBaseTime>;
            })
            .then((json) => {
                if (aborted) return;
                if (json.mode !== 'by_base_time') {
                    throw new Error(`Unexpected mode: ${json.mode}. Expected "by_base_time".`);
                }
                console.log("API response data:", json);
                setData(json);
            })
            .catch((e) => {
                if (!aborted) setErr(e?.message ?? String(e));
            })
            .finally(() => {
                if (!aborted) setLoading(false);
            });

        return () => {
            aborted = true;
            ac.abort();
        };
    }, [apiUrl]);

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

        const areaStyle = area
            ? {
                areaStyle: { opacity: 0.25 },
            }
            : {};

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
            series.push({
                name: 'Mean',
                data: mean,
                ...common,
            });
        }
        if (seriesMode === 'both' || seriesMode === 'median') {
            series.push({
                name: 'Median',
                data: median,
                ...common,
            });
        }

        const title = `${data?.index?.toUpperCase() ?? 'POF'} • By Base Time`;

        const opt: EChartsOption = {
            title: {
                left: 'center',
                text: title,
            },
            tooltip: {
                trigger: 'axis',
                valueFormatter: (val) =>
                    typeof val === 'number' ? val.toFixed(6) : (val as any) ?? '',
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
                axisLabel: {
                    formatter: (iso: string) => toNiceDateShort(iso),
                },
            },
            yAxis: {
                type: 'value',
                name: indexSel === 'pof' ? 'POF' : 'FOPI',
                min: 0,
                max: (val: any) => Math.max(1e-6, Number(val.max) * 1.2),
                axisLabel: {
                    formatter: (val: number) => val.toFixed(3)
                }
            },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                { start: 0, end: 100 },
            ],
            series,
        };
        return opt;
    }, [data, seriesMode, smooth, area, sampling]);

    useEffect(() => {
        if (!echartsRef.current) return;
        echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }, [option]);

    return (
        <Stack p="md" gap="md">
            <Title order={3}>Fire Danger Time Series</Title>

            <Card withBorder>
                <Stack gap="xs">
                    <Group gap="md" wrap="wrap">
                        <Select
                            label="Index"
                            value={indexSel}
                            onChange={(v) => setIndexSel((v as 'pof' | 'fopi') ?? 'pof')}
                            data={[
                                { value: 'pof', label: 'POF' },
                                { value: 'fopi', label: 'FOPI' },
                            ]}
                            w={260}
                        />

                        <MantineTooltip label="EPSG:3857 bbox">
                            <Code
                                miw={220}
                                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                                bbox: {bboxSel || 'global'}
                            </Code>
                        </MantineTooltip>
                    </Group>

                    <Group gap="md" wrap="wrap">
                        <SegmentedControl
                            value={seriesMode}
                            onChange={(v) => setSeriesMode(v as any)}
                            data={[
                                { value: 'both', label: 'Mean & Median' },
                                { value: 'mean', label: 'Mean only' },
                                { value: 'median', label: 'Median only' },
                            ]}
                        />
                        <Switch
                            checked={smooth}
                            onChange={(e) => setSmooth(e.currentTarget.checked)}
                            label="Smooth"
                        />
                        <Switch
                            checked={area}
                            onChange={(e) => setArea(e.currentTarget.checked)}
                            label="Area fill"
                        />
                        {/* to be decide if we want to implement or
                        <SegmentedControl
                            value={sampling}
                            onChange={(v) => setSampling(v as any)}
                            data={[
                                { value: 'lttb', label: 'Sampling: LTTB' },
                                { value: 'none', label: 'Sampling: none' },
                            ]}
                        /> */}
                        <Button
                            variant="light"
                            onClick={() => {
                                if (!echartsRef.current) return;
                                echartsRef.current.dispatchAction({ type: 'restore' });
                            }}
                        >
                            Reset view
                        </Button>
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

            {data && (
                <Text size="sm" c="dimmed">
                    Showing {data.index.toUpperCase()} • Mode: by base time
                    {data.bbox_epsg3857 ? ` • BBOX: ${decodeURIComponent(data.bbox_epsg3857)}` : ''}
                </Text>
            )}

            <Space h="lg" />
        </Stack>
    );
};

export default ChartTest;
