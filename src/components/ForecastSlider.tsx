import React, { useEffect, useMemo } from "react";
import { Slider, Text } from "@mantine/core";
import "../css/ForecastSlider.css";

interface ForecastStep {
    forecast_time: string; // ISO
    base_time: string;     // ISO
}

interface ForecastSliderProps {
    forecastSteps: ForecastStep[];
    selectedBaseTime: string | null;
    selectedForecastTime: string | null;       // ← changed
    onChange: (baseTime: string) => void;      // slider still chooses base_time
}

const ForecastSlider: React.FC<ForecastSliderProps> = ({
    forecastSteps,
    selectedBaseTime,
    selectedForecastTime,
    onChange,
}) => {
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

    // Unique base times
    const uniqueBaseTimes = useMemo(
        () => Array.from(new Set(sortedForecastSteps.map((s) => s.base_time))),
        [sortedForecastSteps]
    );

    // Determine base_time to use
    const effectiveSelectedBaseTime = useMemo(() => {
        if (selectedBaseTime && uniqueBaseTimes.includes(selectedBaseTime)) {
            return selectedBaseTime;
        }
        return uniqueBaseTimes[0] || null;
    }, [selectedBaseTime, uniqueBaseTimes]);

    useEffect(() => {
        if (!selectedBaseTime && uniqueBaseTimes.length > 0) {
            onChange(uniqueBaseTimes[0]);
        }
    }, [selectedBaseTime, uniqueBaseTimes, onChange]);

    // Match selected forecast step using base_time + forecast_time
    const selectedStep = useMemo(() => {
        // Try exact match
        const exact = sortedForecastSteps.find(
            (s) =>
                s.base_time === effectiveSelectedBaseTime &&
                s.forecast_time === selectedForecastTime
        );
        if (exact) return exact;

        // Fallback to first with matching base_time
        return (
            sortedForecastSteps.find((s) => s.base_time === effectiveSelectedBaseTime) ||
            null
        );
    }, [sortedForecastSteps, effectiveSelectedBaseTime, selectedForecastTime]);

    const selectedIndex = uniqueBaseTimes.findIndex(
        (bt) => bt === effectiveSelectedBaseTime
    );

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
                    ? new Date(selectedStep.forecast_time).toLocaleString(undefined, {
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
