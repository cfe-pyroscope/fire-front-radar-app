import React from "react";
import { Select } from "@mantine/core";
import "../css/ForecastSelect.css";

interface ForecastStep {
    time: string;       // ISO string, e.g. "2025-07-11T11:30:00Z"
    lead_hours: number;
}

interface ForecastSelectProps {
    forecastSteps: ForecastStep[];
    selectedLeadHours: number | null;
    onChange: (leadHours: number) => void;
}

const formatForecastLabel = (iso: string) => {
    // Format like "11 Jul 2025, 11:30" in UTC (avoid local TZ shifts)
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso; // fallback if parsing fails

    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

const ForecastSelect: React.FC<ForecastSelectProps> = ({
    forecastSteps,
    selectedLeadHours,
    onChange,
}) => {
    // Deduplicate by lead_hours
    const uniqueSteps = Array.from(
        new Map(forecastSteps.map((s) => [s.lead_hours, s])).values()
    );

    return (
        <div className="forecast-select-cnt">
            <Select
                label="Available forecasts"
                placeholder="Pick forecast time"
                value={selectedLeadHours?.toString() ?? null}
                onChange={(value) => {
                    if (value !== null) onChange(parseInt(value, 10));
                }}
                data={uniqueSteps.map((step) => ({
                    value: step.lead_hours.toString(),        // what the API logic uses
                    label: formatForecastLabel(step.time),    // pretty display only
                }))}
                withScrollArea={false}
                styles={{ dropdown: { maxHeight: 200, overflowY: "auto" } }}
                mt="md"
            />
        </div>
    );
};

export default ForecastSelect;
