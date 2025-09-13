// ChartTimeSeries.tsx — fixed
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getTimeSeries } from '../api/fireIndexApi';
import * as echarts from 'echarts';
import { getForecastHorizon } from '../api/fireIndexApi';
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
import HeatmapLegend from './HeatmapLegend';

const defaultProps: Required<Props> = {
  index: 'pof',
  bbox: null,
};

type Props = {
  index?: 'pof' | 'fopi';
  bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY" (unencoded)
};

type ForecastHorizonLeadTimes = {
  bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY" or null for global
  pof_forecast: (number | null)[];
  fopi_forecast: (number | null)[];
  axes_pof: (number | null)[];
  axes_fopi: (number | null)[];
};

const ForecastHorizonComparison: React.FC<Props> = (props) => {
  const merged = { ...defaultProps, ...props };

  const [indexSel, setIndexSel] = useState<'pof' | 'fopi'>(merged.index);
  const [bboxSel, setBboxSel] = useState<string>(merged.bbox ?? '');

  const leadTimes = [
    '0d',
    '1d',
    '2d',
    '3d',
    '4d',
    '5d',
    '6d',
    '7d',
    '8d',
    '9d',
  ];

  const chartRef = useRef<HTMLDivElement | null>(null);
  const echartsRef = useRef<echarts.EChartsType | null>(null);

  const [data, setData] = useState<ForecastHorizonLeadTimes | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Keep internal controls in sync with incoming props if they change
  useEffect(() => {
    setIndexSel(merged.index);
    setBboxSel(merged.bbox ?? '');
  }, [merged.index, merged.bbox]);

  // fetch data
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setErr(null);

    getForecastHorizon(indexSel, bboxSel || null, abort.signal)
      .then((res) => {
        setData(res as ForecastHorizonLeadTimes);
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
  }, []);

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
    const opt: EChartsOption = {
      title: {
        text: 'Forecast Horizon Comparison',
        subtext: 'POF and FOPI forecasts for different lead times',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['POF', 'FOPI'],
        bottom: 0,
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: leadTimes,
        name: 'Lead Time',
      },
      yAxis: [
        {
          type: 'value',
          name: 'FOPI',
          
          min: data?.axes_fopi[0],
          max: data?.axes_fopi[1],
           axisLabel: {
    formatter: (value) => value.toFixed(3)
  }
        },
        {
          type: 'value',
          name: 'POF',
          min: data?.axes_pof[0],
          max: data?.axes_pof[1],
           axisLabel: {
    formatter: (value) => value.toFixed(3) 
  }
        },
      ],
      series: [
        {
          name: 'POF',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: data?.pof_forecast,
          yAxisIndex: 1,
        },
        {
          name: 'FOPI',
          type: 'line',
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          data: data?.fopi_forecast,
          yAxisIndex: 0,
        },
      ],
    };

    return opt;
  }, [data]);

  useEffect(() => {
    if (!echartsRef.current) return;
    echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  console.log(chartRef);
  console.log(data);
  console.log(option);

  return (
    <Stack p="md" gap="md">
      <Title order={3}>Forecast Horizon Comparison</Title>
      <Text size="sm" c="dimmed"  style={{ maxWidth: 600 }}>
        This chart compares POF and FOPI forecast confidence across 0–9 day lead
        times, showing how predictions change as the forecast horizon increases.
        It highlights how confidence decays with time, helping assess
        reliability for planning and response.
      </Text>

      <Card
        withBorder
        padding="xs"
        style={{ height: 520, position: 'relative' }}
      >
        {loading && (
          <Group
            justify="center"
            align="center"
            style={{ position: 'absolute', inset: 0, zIndex: 2 }}
          >
            <Loader />
          </Group>
        )}
        {err && (
          <Group
            justify="center"
            align="center"
            style={{ position: 'absolute', inset: 0, zIndex: 2 }}
          >
            <Text c="red">Error: {err}</Text>
          </Group>
        )}
        {!loading && !err && !data && (
          <Group
            justify="center"
            align="center"
            style={{ position: 'absolute', inset: 0, zIndex: 1 }}
          >
            <Text c="dimmed">No data available.</Text>
          </Group>
        )}
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </Card>

      <Space h="xs" />
    </Stack>
  );
};

export default ForecastHorizonComparison;
