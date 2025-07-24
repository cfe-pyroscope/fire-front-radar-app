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
    if (forecastSteps.length === 0) {
        return <Text color="red">No forecast steps available</Text>;
    }

    // Determine step automatically (fallback to 1 if not uniform)
    const step = forecastSteps.length > 1
        ? forecastSteps[1].lead_hours - forecastSteps[0].lead_hours
        : 1;

    const min = forecastSteps[0].lead_hours;
    const max = forecastSteps[forecastSteps.length - 1].lead_hours;

    // Always show marks at first/last hour, and every 24h
    const marks = forecastSteps
        .filter(
            (stepObj, idx) =>
                stepObj.lead_hours % 24 === 0 ||
                idx === 0 ||
                idx === forecastSteps.length - 1
        )
        .map((step) => ({
            value: step.lead_hours,
            label: `${step.lead_hours}h`,
        }));

    return (
        <div className="forecast-slider-container">
            <Text mb={4} id="forecast-slider-label">
                Available dates and times
            </Text>
            <Slider
                aria-labelledby="forecast-slider-label"
                min={min}
                max={max}
                step={step}
                value={selectedLeadHours}
                onChange={onChange}
                marks={marks}
                label={(val) => {
                    const stepObj = forecastSteps.find((s) => s.lead_hours === val);
                    return stepObj
                        ? new Date(stepObj.time).toUTCString()
                        : `${val}h`;
                }}
                thumbSize={16}
                styles={{ markLabel: { fontSize: 10 } }}
            />
        </div>
    );
};

export default ForecastSlider;
