// ChartTimeSeries.tsx — fixed
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getTimeSeries } from '../api/fireIndexApi';
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

const ForecastHorizonComparison: React.FC<Props> = (props) => {
  const leadTimes = ['1h', '3h', '6h', '12h', '24h', '48h'];
  const pofData = [92, 88, 83, 75, 60, 50];
  const fopiData = [95, 91, 85, 80, 65, 55];

  const options = {
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

  return (
    <Stack p="md" gap="md">
      <Title order={3}>Forecast Horizon Comparison</Title>
      <Text size="sm" c="dimmed">
        Explanation of the chart
      </Text>


      <Card
        withBorder
        padding="xs"
        style={{ height: 520, position: 'relative' }}
      >
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


export default ForecastHorizonComparison