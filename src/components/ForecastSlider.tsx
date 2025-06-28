/* NOT USED */

import React from "react";
import { Slider, Text } from "@mantine/core";
import "../css/ForecastSlider.css";

interface ForecastStep {
    time: string;
    lead_hours: number;
}

interface ForecastSliderProps {
    forecastSteps: ForecastStep[];
    selectedLeadHours: number;
    onChange: (leadHours: number) => void;
}

const ForecastSlider: React.FC<ForecastSliderProps> = ({
    forecastSteps,
    selectedLeadHours,
    onChange,
}) => {
    console.log("Rendering ForecastSlider");
    if (forecastSteps.length === 0) {
        return <Text color="red">No forecast steps available</Text>;
    }

    const min = forecastSteps[0].lead_hours;
    const max = forecastSteps[forecastSteps.length - 1].lead_hours;

    const marks = forecastSteps
        .filter((step) => step.lead_hours % 24 === 0) // Show every 24h mark
        .map((step) => ({
            value: step.lead_hours,
            label: `${step.lead_hours}h`,
        }));

    return (
        <div className="forecast-slider-container">
            <Text fw={500} mb={4}>Forecast Hour</Text>
            <Slider
                min={min}
                max={max}
                step={3}
                value={selectedLeadHours}
                onChange={onChange}
                marks={marks}
                label={(val) => {
                    const step = forecastSteps.find((s) => s.lead_hours === val);
                    return step ? new Date(step.time).toUTCString() : `${val}h`;
                }}
                thumbSize={16}
                styles={{ markLabel: { fontSize: 10 } }}
            />
        </div>
    );
};

export default ForecastSlider;
