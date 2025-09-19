import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, Group, Stack, Title, Space, Switch } from "@mantine/core";

import ExceedanceFrequencyMenu from "./ExceedanceFrequencyMenu";
import ExceedanceFrequencyChart from "./ExceedanceFrequencyChart";
import { formatBoundingBox } from "../utils/bounds";

import {
    getExceedanceFrequency,
    type ExceedanceFrequency,
    getAvailableDates,
} from "../api/fireIndexApi";

// --- Props -------------------------------------------------------------------
type Props = {
    index?: "pof" | "fopi";
    bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY"
    onBoxChange?: (bbox: string | null) => void;
};


const ExceedanceFrequencyContainer: React.FC<Props> = ({
    index = "pof",
    bbox = null,
    onBoxChange = null,
}) => {
    const [indexSel, setIndexSel] = useState<"pof" | "fopi">(index);
    const [bboxSel, setBoxSel] = useState<string>(bbox ?? "");
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [cdf, setCdf] = useState(false); // toggle between CCDF (false) and CDF (true)

    // Notify parent when bbox changes (if callback provided)
    useEffect(() => {
        if (onBoxChange) onBoxChange(bboxSel || null);
    }, [bboxSel, onBoxChange]);

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
    const [data, setData] = useState<ExceedanceFrequency | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const whereCoords = useMemo(() => {
        return formatBoundingBox(data?.bbox_epsg4326 ?? null, bboxSel);
    }, [data?.bbox_epsg4326, bboxSel]);


    const explanation = useMemo(() => {
        const totalCells =
            typeof data?.overall?.total === "number" && data.overall.total > 0
                ? ` (~${data.overall.total.toLocaleString()} pooled cells)`
                : "";

        const daysTotal =
            Array.isArray(data?.by_date?.dates) ? data!.by_date.dates.length : 0;
        const daysStr = daysTotal ? ` across ${daysTotal} day(s)` : "";

        return (
            <>
                Exceedance frequency for daily <strong>cell-based exceedance</strong> in {whereCoords}
                {totalCells}
                {daysStr}.<br />
                Plot shows <strong>{cdf ? "CDF (≤ threshold)" : "CCDF (≥ threshold)"}</strong> vs{" "}
                <strong>threshold</strong>. The curve uses the pooled (overall) cell distribution.
                Tooltip also reports how often any cell exceeded the threshold on a given day.
            </>
        );
    }, [whereCoords, cdf, data?.overall?.total, data?.by_date?.dates]);


    // --- Fetch handler ----------------------------------------------------------
    const fetchExceedance = async () => {
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
            const endUTC = toUTCDate(to); // 00:00:00Z

            const res = await getExceedanceFrequency(indexSel, {
                bbox: bboxSel || null,
                startBase: startUTC, // 00:00:00Z
                endBase: endUTC,     // 00:00:00Z
                signal: abort.signal,
                thresholds: undefined
            });

            if (!abort.signal.aborted) setData(res);
        } catch (e: any) {
            if (!abort.signal.aborted) {
                setErr(e?.message ?? "Failed to load exceedance frequency");
                setData(null);
            }
        } finally {
            if (!abort.signal.aborted) setLoading(false);
        }
    };

    return (
        <Stack p="md" gap="xs">
            <Title order={3}>Exceedance Frequency (CCDF / CDF)</Title>

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
                <ExceedanceFrequencyMenu
                    indexSel={indexSel}
                    onIndexChange={setIndexSel}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    loading={loading}
                    onLoadClick={fetchExceedance}
                    availableDates={availableDates ?? undefined}
                    datesLoading={datesLoading}
                    bbox={bboxSel}
                    onBoxChange={setBoxSel}
                />
            </Card>

            <Card withBorder padding="xs" style={{ height: 520, position: "relative" }}>
                <ExceedanceFrequencyChart
                    key={`${indexSel}-${cdf ? "cdf" : "ccdf"}`}
                    data={data}
                    indexSel={indexSel}
                    height={520}
                    loading={loading}
                    error={err}
                    cdf={cdf} // false=CCDF, true=CDF
                />
                <Group gap="xs" wrap="wrap" justify="center" align="center" mt="xs">
                    <Switch
                        checked={cdf}
                        onChange={(e) => setCdf(e.currentTarget.checked)}
                        label="CDF"
                        color="#C0C8E5"
                    />
                </Group>
            </Card>

            <Space h="xs" />
        </Stack>
    );
};

export default ExceedanceFrequencyContainer;
