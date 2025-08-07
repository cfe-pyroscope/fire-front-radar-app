import React, { useEffect } from "react";

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

    console.log("🌟🌟🌟 ForecastSlider props:");
    useEffect(() => {
        console.log("forecastSteps:", forecastSteps);
        console.log("selectedLeadHours:", selectedLeadHours);
        console.log("onChange (function):", onChange);
    }, [forecastSteps, selectedLeadHours, onChange]);

    if (forecastSteps.length === 0) {
        return <Text color="red">No forecast steps available</Text>;
    }

    // Determine step automatically (fallback to 1 if not uniform)
    const step = forecastSteps.length > 1
        ? forecastSteps[1].lead_hours - forecastSteps[0].lead_hours
        : 1;

    const min = forecastSteps[0].lead_hours;
    const max = forecastSteps[forecastSteps.length - 1].lead_hours;

    // Helper function to find the closest forecast step or interpolate
    const getDateForLeadHours = (leadHours: number): string => {
        // First try to find exact match
        const exactMatch = forecastSteps.find((s) => s.lead_hours === leadHours);
        if (exactMatch) {
            return new Date(exactMatch.time).toUTCString();
        }

        // If no exact match, find the closest step or interpolate
        const sortedSteps = [...forecastSteps].sort((a, b) => a.lead_hours - b.lead_hours);

        // Find the step that's just before or at the target leadHours
        let baseStep = sortedSteps[0];
        for (const step of sortedSteps) {
            if (step.lead_hours <= leadHours) {
                baseStep = step;
            } else {
                break;
            }
        }

        // Calculate the time difference and add it to the base time
        const hoursDifference = leadHours - baseStep.lead_hours;
        const baseTime = new Date(baseStep.time);
        const interpolatedTime = new Date(baseTime.getTime() + (hoursDifference * 60 * 60 * 1000));

        return interpolatedTime.toUTCString();
    };

    // Always show marks at first/last hour, and every 24h
    const rawMarks = forecastSteps
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

    // ✂️ Limit to 10 evenly spaced marks if too many
    const marks =
        rawMarks.length > 10
            ? rawMarks.filter((_, i) => i % Math.ceil(rawMarks.length / 10) === 0)
            : rawMarks;

    return (
        <div className="forecast-slider-container">
            <Text mb={4} id="forecast-slider-label">
                Available dates and times
            </Text>
            <Text size="sm" mb={8}>
                {getDateForLeadHours(selectedLeadHours)}
            </Text>
            <Slider
                aria-labelledby="forecast-slider-label"
                min={min}
                max={max}
                step={step}
                value={selectedLeadHours}
                onChange={onChange}
                marks={marks}
                label={(val) => getDateForLeadHours(val)}
                labelAlwaysOn={false}
                labelTransitionProps={{ duration: 150 }}
                thumbSize={16}
                styles={{ markLabel: { fontSize: 10 } }}
            />
        </div>
    );
};

export default ForecastSlider;