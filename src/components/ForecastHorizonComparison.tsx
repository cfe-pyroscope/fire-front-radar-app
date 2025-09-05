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

const ForecastHorizonComparison: React.FC<Props> = (props) => {
  const leadTimes = ['1h', '3h', '6h', '12h', '24h', '48h'];
  const pofData = [92, 88, 83, 75, 60, 50];
  const fopiData = [95, 91, 85, 80, 65, 55];

  const chartRef = useRef<HTMLDivElement | null>(null);
  const echartsRef = useRef<echarts.EChartsType | null>(null);

  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // fetch data
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setErr(null);

    getForecastHorizon(abort.signal)
      .then((res) => {
        setData(res as string);
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
        subtext: 'Overlay of POF and FOPI forecasts for different lead times',
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
      yAxis: {
        type: 'value',
        name: 'Forecast Confidence (%)',
        min: 0,
        max: 100,
      },
      series: [
        {
          name: 'POF',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: pofData,
        },
        {
          name: 'FOPI',
          type: 'line',
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          data: fopiData,
        },
      ],
    };

    return opt;
  }, []);

  useEffect(() => {
    if (!echartsRef.current) return;
    echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  console.log(chartRef);
  console.log(data)

  return (
    <Stack p="md" gap="md" style={{ border: 'solid 1px blue' }}>
      <Title order={3}>Forecast Horizon Comparison</Title>
      <Text size="sm" c="dimmed">
        Explanation of the chart
      </Text>

      <Card
        withBorder
        padding="xs"
        style={{ height: 520, position: 'relative', border: 'solid 1px red' }}
      >
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        {/* {loading && (
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
        )} */}
        {/* <div ref={chartRef} style={{ width: '100%', height: '100%' }} /> */}
      </Card>
      {/* <Text size="sm" c="dimmed">
        coords:{' '}
        {bboxSel
          ? bboxSel
              .split(',')
              .map((c) => Number(c).toFixed(2))
              .join(', ')
          : 'global'}
      </Text> */}
      <Space h="xs" />
    </Stack>
  );
};

export default ForecastHorizonComparison;
