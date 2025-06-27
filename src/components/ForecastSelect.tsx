import React from "react";
import { Select } from "@mantine/core";
import "../css/ForecastSelect.css";

interface ForecastStep {
    time: string;
    lead_hours: number;
}

interface ForecastSelectProps {
    forecastSteps: ForecastStep[];
    selectedLeadHours: number | null;
    onChange: (leadHours: number) => void;
}

const ForecastSelect: React.FC<ForecastSelectProps> = ({
    forecastSteps,
    selectedLeadHours,
    onChange,
}) => {
    // Deduplicate forecastSteps by lead_hours
    const uniqueSteps = Array.from(
        new Map(forecastSteps.map((step) => [step.lead_hours, step])).values()
    );

    return (
        <div className="forecast-select-cnt">
            <Select
                label="Most recent forecast"
                placeholder="Pick forecast time"
                value={selectedLeadHours?.toString() ?? null}
                onChange={(value) => {
                    if (value !== null) {
                        onChange(parseInt(value));
                    }
                }}
                data={uniqueSteps.map((step) => ({
                    value: step.lead_hours.toString(),
                    label: step.time,
                }))}
                withScrollArea={false}
                styles={{ dropdown: { maxHeight: 200, overflowY: "auto" } }}
                mt="md"
            />
        </div>
    );
};

export default ForecastSelect;
