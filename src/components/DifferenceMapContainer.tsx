import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDifferenceMap, type DifferenceMapResponse, getAvailableDates } from "../api/fireIndexApi";

import {
    Box,
    Card,
    Stack,
    Title,
    Space,
} from "@mantine/core";

import TimeSeriesMenu from "./TimeSeriesMenu";
import { formatBoundingBox } from '../utils/bounds';
import DifferenceMapChart from "./DifferenceMapChart";

type Props = {
    index?: "pof" | "fopi";
    bbox?: string | null;
    onBoxChange?: (bbox: string | null) => void;
};

const DifferenceMapContainer: React.FC<Props> = ({ index = "pof", bbox = null, onBoxChange = null }) => {
    const [indexSel, setIndexSel] = useState<"pof" | "fopi">(index);
    const [bboxSel, setBoxSel] = useState<string>(bbox ?? "");
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const fetchAbortRef = useRef<AbortController | null>(null);

    // DatePicker available dates
    const [availableDates, setAvailableDates] = useState<Date[] | null>(null);
    const [datesLoading, setDatesLoading] = useState(false);
    const datesAbortRef = useRef<AbortController | null>(null);

    const toUTCDate = (d: Date | string) => {
        const date = new Date(d);
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    };

    useEffect(() => {
        if (onBoxChange) onBoxChange(bboxSel || null);
    }, [bboxSel, onBoxChange]);

    useEffect(() => {
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
                const dates = (raw ?? [])
                    .map((v: any) => new Date(v))
                    .filter((d: Date) => !Number.isNaN(d.getTime()))
                    .map(toUTCDate)
                    .sort((a: Date, b: Date) => a.getTime() - b.getTime());

                if (!abort.signal.aborted) {
                    setAvailableDates(dates);
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
    const [data, setData] = useState<DifferenceMapResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const whereCoords = useMemo(() => {
        return formatBoundingBox(data?.bbox_epsg4326 as any, bboxSel);
    }, [data?.bbox_epsg4326, bboxSel]);

    const explanation = useMemo(() => {
        return indexSel === "pof" ? (
            <>
                Map showing the daily difference in POF per cell.{" "}
                <strong><span style={{ color: "#d73027" }}>Red</span></strong> = risk increased,{" "}
                <strong><span style={{ color: "#4575b4" }}>Blue</span></strong> = risk decreased.
            </>
        ) : (
            <>
                Map showing the daily difference in FOPI per cell.{" "}
                <strong><span style={{ color: "#d73027" }}>Red</span></strong> = risk increased,{" "}
                <strong><span style={{ color: "#4575b4" }}>Blue</span></strong> = risk decreased.
            </>
        );
    }, [indexSel, whereCoords]);

    // --- Fetch handler --------------------------------------------------------
    const fetchDiffMap = async () => {
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
            const startUTC = toUTCDate(from);
            const endUTC = toUTCDate(to);

            const res = await getDifferenceMap(
                indexSel,
                startUTC,
                endUTC,
                bboxSel,
                abort.signal
            );

            if (!abort.signal.aborted) setData(res);
        } catch (e: any) {
            if (!abort.signal.aborted) {
                setErr(e?.message ?? "Failed to load difference map");
                setData(null);
            }
        } finally {
            if (!abort.signal.aborted) setLoading(false);
        }
    };

    return (
        <Stack p="md" gap="xs">
            <Title order={3}>Fire Risk Change Map</Title>
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
                    onLoadClick={fetchDiffMap}
                    availableDates={availableDates ?? undefined}
                    datesLoading={datesLoading}
                    bbox={bboxSel}
                    onBoxChange={setBoxSel}
                />
            </Card>

            <Card withBorder padding="xs" style={{ height: 520, position: "relative" }}>
                <DifferenceMapChart
                    data={data}
                    indexSel={indexSel}
                    loading={loading}
                    error={err}
                    height={520}
                />
            </Card>

            <Space h="xs" />
        </Stack>
    );
};

export default DifferenceMapContainer;
