import React, { useMemo, useEffect } from "react";
import { Select } from "@mantine/core";
import "../css/ForecastSelect.css";

interface ForecastStep {
    forecast_time: string; // ISO string, e.g. "2025-07-11T11:30:00Z"
    base_time: string;     // ISO base time
}

interface ForecastSelectProps {
    forecastSteps: ForecastStep[];
    selectedForecastTime: string | null;
    onChange: (forecastTimeIso: string) => void; // send ISO back up for API usage
}

/** Format like "20 Jul, 2025 00:00" in UTC */
const formatForecastLabel = (iso: string) => {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pad = (n: number) => String(n).padStart(2, "0");

    const day = pad(d.getUTCDate());
    const mon = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hh = pad(d.getUTCHours());
    const mm = pad(d.getUTCMinutes());

    return `${day} ${mon}, ${year} ${hh}:${mm}`;
};

const ForecastSelect: React.FC<ForecastSelectProps> = ({
    forecastSteps,
    selectedForecastTime,
    onChange,
}) => {
    useEffect(() => {
        const sample = forecastSteps.slice(0, 12).map(s => ({
            base: s.base_time,
            ft: s.forecast_time,
        }));
        const byBase = forecastSteps.reduce<Record<string, number>>((acc, s) => {
            acc[s.base_time] = (acc[s.base_time] ?? 0) + 1;
            return acc;
        }, {});
        console.log("[ForecastSelect] props changed", {
            count: forecastSteps.length,
            byBaseTimeCounts: byBase,
            sampleSteps: sample,
            selectedForecastTime,
        });
    }, [forecastSteps, selectedForecastTime]);

    // Dedupe by forecast_time and sort ascending
    const uniqueSteps = useMemo(() => {
        const seen = new Set<string>();
        const out: ForecastStep[] = [];
        for (const s of forecastSteps) {
            if (!seen.has(s.forecast_time)) {
                seen.add(s.forecast_time);
                out.push(s);
            }
        }
        out.sort(
            (a, b) =>
                new Date(a.forecast_time).getTime() - new Date(b.forecast_time).getTime()
        );
        console.log("[ForecastSelect] uniqueSteps computed", {
            inputCount: forecastSteps.length,
            uniqueCount: out.length,
            first: out[0]?.forecast_time,
            last: out[out.length - 1]?.forecast_time,
        });
        return out;
    }, [forecastSteps]);

    const data = useMemo(
        () =>
            uniqueSteps.map((step) => ({
                value: step.forecast_time,                      // keep full ISO for API
                label: formatForecastLabel(step.forecast_time), // pretty label
            })),
        [uniqueSteps]
    );

    useEffect(() => {
        console.log("[ForecastSelect] data for <Select>", data.map(d => d.label));
    }, [data]);

    return (
        <div className="forecast-select">
            <Select
                label="Forecast time"
                placeholder="Select forecast time"
                value={selectedForecastTime ?? undefined}
                onChange={(val) => {
                    if (val) {
                        console.log("[ForecastSelect] onChange ->", val);
                        onChange(val); // send raw ISO through
                    }
                }}
                data={data}
                withScrollArea={false}
                styles={{ dropdown: { maxHeight: 240, overflowY: "auto" } }}
                mt="md"
            />
        </div>
    );
};

export default ForecastSelect;
