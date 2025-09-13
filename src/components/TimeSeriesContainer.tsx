import React, { useEffect, useMemo, useRef, useState } from "react";
import { getTimeSeries, type TimeSeriesByBaseTime, getAvailableDates } from "../api/fireIndexApi";

import {
    Box,
    Card,
    Group,
    Stack,
    Switch,
    Title,
    Space,
} from "@mantine/core";
import { toNiceDateLong } from "../utils/date";
import TimeSeriesMenu from "./TimeSeriesMenu";
import TimeSeriesChart from "./TimeSeriesChart";

// --- Props -------------------------------------------------------------------
type Props = {
    index?: "pof" | "fopi";
    bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY"
};

const TimeSeriesContainer: React.FC<Props> = ({ index = "pof", bbox = null }) => {
    // Controls that affect fetching
    const [indexSel, setIndexSel] = useState<"pof" | "fopi">(index);
    const [bboxSel] = useState<string>(bbox ?? "");
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const fetchAbortRef = useRef<AbortController | null>(null);

    // manage DatePicker
    const [availableDates, setAvailableDates] = useState<Date[] | null>(null);
    const [datesLoading, setDatesLoading] = useState(false);
    const datesAbortRef = useRef<AbortController | null>(null);

    const toUTCDate = (d: Date | string) => {
        const date = new Date(d);
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    };


    useEffect(() => {
        // whenever index changes, (re)load available dates
        if (datesAbortRef.current) datesAbortRef.current.abort();
        const abort = new AbortController();
        datesAbortRef.current = abort;

        setDatesLoading(true);
        setAvailableDates(null);

        (async () => {
            try {
                const raw = await getAvailableDates(indexSel, abort.signal);
                // expect the API to return ISO strings or timestamps; map to Date[]
                const dates = (raw ?? [])
                    .map((v: any) => new Date(v))
                    .filter((d: Date) => !Number.isNaN(d.getTime()))
                    .map(toUTCDate)
                    .sort((a: Date, b: Date) => a.getTime() - b.getTime());

                if (!abort.signal.aborted) {
                    setAvailableDates(dates);

                    // keep or clear the current range depending on validity for this index
                    setDateRange(([from, to]) => {
                        if (!from || !to || dates.length === 0) return [null, null];
                        const min = dates[0].getTime();
                        const max = dates[dates.length - 1].getTime();
                        const f = toUTCDate(from).getTime();
                        const t = toUTCDate(to).getTime();
                        return f >= min && t <= max ? [from, to] : [null, null];
                    });
                }
            } catch (e) {
                if (!abort.signal.aborted) setAvailableDates([]);
            } finally {
                if (!abort.signal.aborted) setDatesLoading(false);
            }
        })();

        return () => abort.abort();
    }, [indexSel]);

    // Data / network state
    const [data, setData] = useState<TimeSeriesByBaseTime | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Presentation controls
    const [smooth, setSmooth] = useState(true);
    const [area, setArea] = useState(true);


    const whereCoords = useMemo(() => {
        const dms = (v: number, pos: string, neg: string, digits = 2) =>
            `${Math.abs(v).toFixed(digits)}°${v >= 0 ? pos : neg}`;
        const niceGeo = (
            geo?: [number, number] | [number, number, number, number] | null,
            bbox3857?: string | null
        ) => {
            if (Array.isArray(geo)) {
                if (geo.length === 4) {
                    const [minLon, minLat, maxLon, maxLat] = geo;
                    return `area (SW → NE) ${dms(minLat, " N", " S")}, ${dms(minLon, " E", " W")} → ${dms(
                        maxLat,
                        " N",
                        " S"
                    )}, ${dms(maxLon, " E", " W")}`;
                }
            }
            if (bbox3857) return "";
            return "";
        };
        const where = niceGeo(data?.bbox_epsg4326 as any, bboxSel) || "";
        return where ? where : "—";
    }, [data?.bbox_epsg4326, bboxSel]);


    const explanation = useMemo(() => {
        return indexSel === "pof" ? (
            <>
                Line chart showing <strong>POF</strong> values for the selected {whereCoords}.<br />The scale runs from{" "}
                <strong>0</strong> to{" "}
                <strong>1</strong>. Any value greater than <strong>0.05</strong>{" "}
                indicates an <strong>extreme condition</strong>.
            </>
        ) : (
            <>
                Line chart showing <strong>FOPI</strong> values for the selected {whereCoords}.<br />The scale runs from{" "}
                <strong>0</strong> to{" "}
                <strong>1</strong>. Any value greater than <strong>0.8</strong>{" "}
                indicates an extreme condition.
            </>
        );
    }, [indexSel, whereCoords]);

    // --- Fetch handler ----------------------------------------------------------
    const fetchTimeSeries = async () => {
        const [from, to] = dateRange;
        if (!from || !to) {
            setErr("Please select a start and end date.");
            return;
        }

        if (fetchAbortRef.current) fetchAbortRef.current.abort();
        const abort = new AbortController();
        fetchAbortRef.current = abort;

        setLoading(true);
        setErr(null);

        try {
            const startUTC = toUTCDate(from); // 00:00:00Z
            const endUTC = toUTCDate(to);   // 00:00:00Z

            const res = await getTimeSeries(
                indexSel,
                bboxSel,
                abort.signal,
                startUTC,
                endUTC
            );

            if (!abort.signal.aborted) setData(res);
        } catch (e: any) {
            if (!abort.signal.aborted) {
                setErr(e?.message ?? "Failed to load time series");
                setData(null);
            }
        } finally {
            if (!abort.signal.aborted) setLoading(false);
        }
    };

    return (
        <Stack p="md" gap="xs">
            <Title order={3}>Fire Danger Time Series</Title>

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

            <Card padding="xs" pl={0} pr={0}>
                <TimeSeriesMenu
                    indexSel={indexSel}
                    onIndexChange={setIndexSel}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    loading={loading}
                    onLoadClick={fetchTimeSeries}
                    availableDates={availableDates ?? undefined}
                    datesLoading={datesLoading}
                />
            </Card>

            <Card withBorder padding="xs" style={{ height: 520, position: "relative" }}>
                <TimeSeriesChart
                    data={data}
                    indexSel={indexSel}
                    smooth={smooth}
                    area={area}
                    sampling="lttb"
                    height={520}
                    loading={loading}
                    error={err}
                />
                <Group gap="xs" wrap="wrap" justify="center" align="center" mt="xs">
                    <Switch
                        checked={smooth}
                        onChange={(e) => setSmooth(e.currentTarget.checked)}
                        label="Smooth"
                        color="#C0C8E5"
                    />
                    <Switch
                        checked={area}
                        onChange={(e) => setArea(e.currentTarget.checked)}
                        label="Area fill"
                        color="#C0C8E5"
                    />
                </Group>
            </Card>

            <Space h="xs" />
        </Stack>
    );
};

export default TimeSeriesContainer;
