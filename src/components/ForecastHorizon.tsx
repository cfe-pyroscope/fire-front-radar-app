// ChartTimeSeries.tsx — fixed
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import {
  Box,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { formatDate } from '../utils/date';
import { formatBoundingBox } from '../utils/bounds';
import { getForecastHorizon, type ForecastHorizonResponse } from '../api/fireIndexApi';



type Props = {
  index?: 'pof' | 'fopi';
  bbox?: string | null;
};

const defaultProps: Required<Props> = {
  index: 'pof',
  bbox: null,
};

const ForecastHorizon: React.FC<Props> = (props) => {
  const merged = { ...defaultProps, ...props };

  const [indexSel, setIndexSel] = useState<'pof' | 'fopi'>(merged.index);
  const [bboxSel, setBboxSel] = useState<string>(merged.bbox ?? '');

  const chartRef = useRef<HTMLDivElement | null>(null);
  const echartsRef = useRef<echarts.EChartsType | null>(null);

  const [data, setData] = useState<ForecastHorizonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setIndexSel(merged.index);
    setBboxSel(merged.bbox ?? '');
  }, [merged.index, merged.bbox]);


  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setErr(null);

    getForecastHorizon(bboxSel || null, abort.signal)
      .then((res) => {
        setData(res); // <-- no cast
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
  }, [indexSel, bboxSel]); // <-- important

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

  const leadTimes = useMemo(
    () => ['0d', '1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d'],
    []
  );

  const option: EChartsOption = useMemo(() => {
    const formatter = (value: number | string) => Number(value).toFixed(3);

    return {
      title: {
        text: 'Forecast Horizon',
        subtext: 'POF and FOPI forecasts for different lead times',
        left: 'center',
      },
      tooltip: { trigger: 'axis' },
      legend: { data: ['POF', 'FOPI'], top: 70, left: 'center' },
      grid: { left: 0, right: 40, bottom: 0, top: 120, containLabel: true },
      xAxis: { type: 'category', data: leadTimes, name: 'Lead Time' },
      yAxis: [
        {
          type: 'value',
          name: 'FOPI',
          min: data?.axes_fopi?.[0],
          max: data?.axes_fopi?.[1],
          axisLabel: { formatter },
        },
        {
          type: 'value',
          name: 'POF',
          min: data?.axes_pof?.[0],
          max: data?.axes_pof?.[1],
          axisLabel: { formatter },
        },
      ],
      series: [
        {
          name: 'POF',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: data?.pof_forecast ?? [],
          yAxisIndex: 1,
          lineStyle: { color: '#5070DD' },
          itemStyle: { color: '#5070DD' },
        },
        {
          name: 'FOPI',
          type: 'line',
          smooth: true,
          symbol: 'diamond',
          symbolSize: 8,
          data: data?.fopi_forecast ?? [],
          yAxisIndex: 0,
          lineStyle: { color: '#B6D634' },
          itemStyle: { color: '#B6D634' },
        },
      ],
    } satisfies EChartsOption;
  }, [data, leadTimes]);

  useEffect(() => {
    if (!echartsRef.current) return;
    echartsRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  const whereCoords = useMemo(() => {
    return formatBoundingBox(data?.bbox_epsg4326, bboxSel);
  }, [data?.bbox_epsg4326, bboxSel]);

  const formattedDate = data?.base_date ? formatDate(data.base_date, 'UTC') : '—';

  const explanation = useMemo(() => {
    return (
      <>
        This chart compares POF and FOPI forecast confidence
        for <strong>{formattedDate}</strong>  across 0–9 day lead times. It illustrates how forecast confidence changes as the horizon increases for the selected area {whereCoords}. Confidence typically decreases with longer lead times, helping assess the reliability of forecasts for planning and response.
        <br />The scale runs from <strong>0</strong> to <strong>1</strong>. Values above <strong>0.05</strong> for POF and <strong>0.8</strong> for FOPI indicate an extreme condition.
      </>
    );
  }, [whereCoords, formattedDate]);


  return (
    <Stack p="md" gap="md">
      <Title order={3}>Forecast Horizon</Title>
      <Box
        component="p"
        c="dimmed"
        fz="sm"
        style={{
          whiteSpace: "normal",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          lineHeight: 1.45,
          maxWidth: "100%",
        }}
      >
        {explanation}
      </Box>

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

    </Stack>
  );
};

export default ForecastHorizon;
