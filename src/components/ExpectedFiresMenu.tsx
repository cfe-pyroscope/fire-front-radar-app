import React, { useMemo } from "react";
import { DatePickerInput } from "@mantine/dates";
import { Button, Group, SegmentedControl } from "@mantine/core";

import "@mantine/dates/styles.css";
import "../css/TimeSeriesMenu.css";

type Props = {
    indexSel: "pof" | "fopi";
    onIndexChange: (v: "pof" | "fopi") => void;
    dateRange: [Date | null, Date | null];
    onDateRangeChange: (v: [Date | null, Date | null]) => void;
    loading?: boolean;
    onLoadClick: () => void;
    availableDates?: readonly (Date | string | number)[];
    datesLoading?: boolean;
};

const toRealDate = (input: unknown): Date | null => {
    if (!input) return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
    const d = new Date(input as any);
    return Number.isNaN(d.getTime()) ? null : d;
};

const ExpectedFiresMenu: React.FC<Props> = ({
    indexSel,
    onIndexChange,
    dateRange,
    onDateRangeChange,
    loading = false,
    onLoadClick,
    availableDates,
    datesLoading = false,
}) => {
    const normalized = useMemo(() => {
        const arr = (availableDates ?? []).map(toRealDate).filter(Boolean) as Date[];
        // normalize to UTC midnight (consistent equality by day)
        const toUTC = (d: Date) =>
            new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        return arr.map(toUTC).sort((a, b) => a.getTime() - b.getTime());
    }, [availableDates]);

    const minDate = normalized?.[0];
    const maxDate = normalized?.[normalized.length - 1];

    return (
        <Group wrap="wrap">
            <SegmentedControl
                value={indexSel}
                onChange={(v) => onIndexChange((v as "pof" | "fopi") ?? "pof")}
                data={[
                    { value: "pof", label: "POF" },
                    { value: "fopi", label: "FOPI" },
                ]}
                size="sm"
                radius="md"
                style={{ width: 120 }}
            />

            <DatePickerInput
                type="range"
                placeholder={datesLoading ? "Loading available dates…" : "Select date range"}
                dropdownType="modal"
                modalProps={{ zIndex: 1000000, centered: true, size: "auto" }}
                value={dateRange}
                onChange={(v) =>
                    onDateRangeChange(Array.isArray(v) ? (v as [Date | null, Date | null]) : [null, null])
                }
                size="sm"
                style={{ width: 320 }}
                radius="md"
                clearable
                minDate={minDate}
                maxDate={maxDate}
                // Disable any date not explicitly available from the API
                excludeDate={(raw) => {
                    if (!normalized || normalized.length === 0) return false; // if unknown, don't exclude
                    const d = toRealDate(raw);
                    if (!d) return true;
                    const key = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toDateString();
                    return !normalized.some((a) => a.toDateString() === key);
                }}
                disabled={datesLoading || !normalized || normalized.length === 0}
            />

            <Button
                className="time-series-laod-data-btn"
                onClick={onLoadClick}
                disabled={!dateRange[0] || !dateRange[1] || loading}
                radius="md"
            >
                {loading ? "Loading…" : "Load data"}
            </Button>
        </Group>
    );
};

export default ExpectedFiresMenu;
