import React, { useEffect, useMemo } from "react";
import { Slider, Text } from "@mantine/core";
import "../css/ForecastSlider.css";

interface ForecastStep {
    time: string;
    lead_hours: number;
    base_time: string;
}

interface ForecastSliderProps {
    forecastSteps: ForecastStep[];
    selectedBaseTime: string | null;
    selectedLeadHours: number | null;
    onChange: (baseTime: string) => void;
}

const ForecastSlider: React.FC<ForecastSliderProps> = ({
    forecastSteps,
    selectedBaseTime,
    selectedLeadHours,
    onChange,
}) => {
    // Early exit if no data
    if (forecastSteps.length === 0) {
        return <Text color="red">No forecast steps available</Text>;
    }

    // Sort by base_time ascending
    const sortedForecastSteps = useMemo(
        () =>
            [...forecastSteps].sort(
                (a, b) => new Date(a.base_time).getTime() - new Date(b.base_time).getTime()
            ),
        [forecastSteps]
    );

    // Extract unique base_times
    const uniqueBaseTimes = useMemo(() => {
        return Array.from(new Set(sortedForecastSteps.map((s) => s.base_time)));
    }, [sortedForecastSteps]);

    // Determine base_time to use
    const effectiveSelectedBaseTime = useMemo(() => {
        if (selectedBaseTime && uniqueBaseTimes.includes(selectedBaseTime)) {
            return selectedBaseTime;
        }
        return uniqueBaseTimes[0] || null;
    }, [selectedBaseTime, uniqueBaseTimes]);

    useEffect(() => {
        console.log("✅✅✅ Debug — SelectedStep Lookup:");
        console.log("✅✅✅ effectiveSelectedBaseTime:", effectiveSelectedBaseTime);
        console.log("✅✅✅ selectedLeadHours:", selectedLeadHours);
        console.log("✅✅✅ sortedForecastSteps sample:", sortedForecastSteps.slice(0, 3));
    }, [effectiveSelectedBaseTime, selectedLeadHours, sortedForecastSteps]);


    // Set initial base_time if missing
    useEffect(() => {
        if (!selectedBaseTime && uniqueBaseTimes.length > 0) {
            onChange(uniqueBaseTimes[0]);
        }
    }, [selectedBaseTime, uniqueBaseTimes, onChange]);

    // Match selected forecast step
    const selectedStep = useMemo(() => {
        // Try to find exact match
        const exact = sortedForecastSteps.find(
            (s) =>
                s.base_time === effectiveSelectedBaseTime &&
                s.lead_hours === selectedLeadHours
        );
        if (exact) return exact;

        // Fallback to first match by base_time only
        return sortedForecastSteps.find(
            (s) => s.base_time === effectiveSelectedBaseTime
        ) || null;
    }, [sortedForecastSteps, effectiveSelectedBaseTime, selectedLeadHours]);

    // Current slider index
    const selectedIndex = uniqueBaseTimes.findIndex(
        (bt) => bt === effectiveSelectedBaseTime
    );

    // Slider marks
    const marks = uniqueBaseTimes.map((bt, index) => {
        const date = new Date(bt);
        const isEdge = index === 0 || index === uniqueBaseTimes.length - 1;
        return {
            value: index,
            label: date.toLocaleDateString(undefined, {
                month: isEdge ? "short" : undefined,
                day: "numeric",
            }),
        };
    });

    return (
        <div className="forecast-slider-container">
            <Text size="sm" mb={4}>Forecast base date:</Text>
            <Text size="sm" mb={8}>
                {selectedStep
                    ? new Date(selectedStep.base_time).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })
                    : "—"}
            </Text>

            <Text size="sm" mb={4}>Forecast date and time:</Text>
            <Text size="sm" mb={8}>
                {selectedStep
                    ? new Date(selectedStep.time).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                        hour12: false,
                    })
                    : "—"}
            </Text>


            <Slider
                min={0}
                max={uniqueBaseTimes.length - 1}
                step={1}
                value={selectedIndex}
                onChange={(val) => onChange(uniqueBaseTimes[val])}
                marks={marks}
                label={null}
                thumbSize={16}
                styles={{ markLabel: { fontSize: 10 } }}
            />
        </div>
    );
};

export default ForecastSlider;
