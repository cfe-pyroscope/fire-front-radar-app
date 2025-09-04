import React, { useMemo, useEffect } from "react";
import { Select } from "@mantine/core";
import { formatDate } from "../utils/date";
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

/** Format like "20 Jul, 2025" in UTC */
const formatForecastLabel = (iso: string) => formatDate(iso, "UTC");

const ForecastSelect: React.FC<ForecastSelectProps> = ({
    forecastSteps,
    selectedForecastTime,
    onChange,
}) => {
    useEffect(() => {
        const sample = forecastSteps.slice(0, 12).map(s => ({
            base_time: s.base_time,
            forecast_time: s.forecast_time,
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
        // console.log("[ForecastSelect] data for <Select>", data.map(d => d.label));
    }, [data]);

    return (
        <div className="forecast-select">
            <Select
                label="Forecast date"
                placeholder="Select forecast date"
                value={selectedForecastTime ?? undefined}
                onChange={(val) => {
                    if (val) {
                        // console.log("[ForecastSelect] onChange ->", val);
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
