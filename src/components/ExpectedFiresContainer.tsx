import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Card,
    Group,
    Stack,
    Title,
    Space,
    Switch
} from "@mantine/core";

import ExpectedFiresMenu from "./ExpectedFiresMenu";
import ExpectedFiresChart from "./ExpectedFiresChart";

import { getExpectedFiresByDate, type ExpectedFiresByDate, getAvailableDates } from "../api/fireIndexApi";

// --- Props -------------------------------------------------------------------
type Props = {
    index?: "pof" | "fopi";
    bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY"
};

const ExpectedFiresContainer: React.FC<Props> = ({ index = "pof", bbox = null }) => {
    // Controls that affect fetching
    const [indexSel, setIndexSel] = useState<"pof" | "fopi">(index);
    const [bboxSel] = useState<string>(bbox ?? "");
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [waterfall, setWaterfall] = useState(false);

    // network control
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
        setData(null);
        setErr(null);

        (async () => {
            try {
                const raw = await getAvailableDates(indexSel, abort.signal);
                // expect ISO strings or timestamps; map to Date[]
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
    const [data, setData] = useState<ExpectedFiresByDate | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

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
        return (
            <>
                Vertical bar chart showing <strong>expected number of fires</strong> (sum of cell
                probabilities) by UTC <strong>date</strong> for the selected area {whereCoords}.<br />
                This is an expected <em>count</em>, not a probability. Larger regions naturally
                yield larger sums.
            </>
        );
    }, [whereCoords]);

    // --- Fetch handler ----------------------------------------------------------
    const fetchExpected = async () => {
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
            const endUTC = toUTCDate(to);     // 00:00:00Z

            const res = await getExpectedFiresByDate(
                indexSel,
                bboxSel || null,
                abort.signal,
                startUTC,
                endUTC
            );

            if (!abort.signal.aborted) setData(res);
        } catch (e: any) {
            if (!abort.signal.aborted) {
                setErr(e?.message ?? "Failed to load expected fires");
                setData(null);
            }
        } finally {
            if (!abort.signal.aborted) setLoading(false);
        }
    };

    return (
        <Stack p="md" gap="xs">
            <Title order={3}>Expected Fires (Sum by Date)</Title>

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
                <ExpectedFiresMenu
                    indexSel={indexSel}
                    onIndexChange={setIndexSel}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    loading={loading}
                    onLoadClick={fetchExpected}
                    availableDates={availableDates ?? undefined}
                    datesLoading={datesLoading}
                />
            </Card>

            <Card withBorder padding="xs" style={{ height: 520, position: "relative" }}>
                <ExpectedFiresChart
                    key={`${indexSel}-${waterfall ? "wf" : "bar"}`}
                    data={data}
                    indexSel={indexSel}
                    height={520}
                    loading={loading}
                    error={err}
                    waterfall={waterfall}
                />
                <Group gap="xs" wrap="wrap" justify="center" align="center" mt="xs">
                    <Switch
                        checked={waterfall}
                        onChange={(e) => setWaterfall(e.currentTarget.checked)}
                        label="Waterfall"
                        color="#C0C8E5"
                    />
                </Group>
            </Card>

            <Space h="xs" />
        </Stack>
    );
};

export default ExpectedFiresContainer;
