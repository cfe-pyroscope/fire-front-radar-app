import React, { useEffect, useMemo } from "react";
import { Slider, Text } from "@mantine/core";
import "../css/ForecastSlider.css";

interface ForecastStep {
    forecast_time: string; // ISO
    base_time: string;     // ISO
}

interface ForecastSliderProps {
    forecastSteps: ForecastStep[];
    selectedForecastTime: string | null;            // actively displayed map time
    onChange?: (forecastTime: string) => void; // used in forecast-time mode
}

const ForecastSlider: React.FC<ForecastSliderProps> = ({
    forecastSteps,
    selectedForecastTime,
    onChange: onForecastTimeChange,
}) => {
    if (forecastSteps.length === 0) {
        return <Text color="red">No forecast steps available</Text>;
    }

    console.log("[ForecastSlider] forecastSteps", forecastSteps)
    console.log("[ForecastSlider] selectedForecastTime", selectedForecastTime)
    console.log("[ForecastSlider] onForecastTimeChange", onForecastTimeChange)

    // Sort by base_time then by forecast_time for stable behavior
    const sortedForecastSteps = useMemo(
        () =>
            [...forecastSteps].sort((a, b) => {
                const bt = new Date(a.base_time).getTime() - new Date(b.base_time).getTime();
                if (bt !== 0) return bt;
                return new Date(a.forecast_time).getTime() - new Date(b.forecast_time).getTime();
            }),
        [forecastSteps]
    );

    // Distinct base_time values
    const uniqueBaseTimes = useMemo(
        () => Array.from(new Set(sortedForecastSteps.map((s) => s.base_time))),
        [sortedForecastSteps]
    );

    // If there is only one base_time, we are in "forecast-time mode" (by_forecast)
    const isForecastTimeMode = uniqueBaseTimes.length === 1;

    const handleSliderChange = (val: number) => {
        const t = times[val];
        if (t) onForecastTimeChange?.(t);         // <- call the aliased prop
    };

    // ===== Mode A: forecast-time mode (by_forecast) =====
    if (isForecastTimeMode) {
        const times = useMemo(
            () => Array.from(new Set(sortedForecastSteps.map((s) => s.forecast_time))),
            [sortedForecastSteps]
        );

        const selectedIndex = useMemo(() => {
            const idx = times.findIndex((t) => t === selectedForecastTime);
            return idx >= 0 ? idx : 0;
        }, [times, selectedForecastTime]);

        const marks = useMemo(() => {
            return times.map((t, i) => {
                const d = new Date(t);
                const isFirst = i === 0;
                const isLast = i === times.length - 1;
                const isCenter = i === Math.floor(times.length / 2);
                const shouldLabel = isFirst || isCenter || isLast;
                return {
                    value: i,
                    label: shouldLabel
                        ? d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                        })
                        : undefined,
                };
            });
        }, [times]);

        const current = times[selectedIndex] ?? null;

        return (
            <div className="forecast-slider-container">
                <Text size="sm" mb={4}>Forecast base date:</Text>
                <Text size="sm" mb={8}>
                    {new Date(sortedForecastSteps[0].base_time).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </Text>

                <Text size="sm" mb={4}>Forecast date and time (UTC):</Text>
                <Text size="sm" mb={8}>
                    {current
                        ? new Date(current).toLocaleString(undefined, {
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
                    max={Math.max(times.length - 1, 0)}
                    step={1}
                    value={selectedIndex}
                    onChange={handleSliderChange}
                    marks={marks}
                    label={null}
                    thumbSize={16}
                    styles={{
                        markLabel: {
                            fontSize: 10,
                            fontWeight: 500,
                        },
                        mark: {
                            height: '6px',
                            width: '2px',
                            backgroundColor: '#dee2e6'
                        }
                    }}
                />
            </div>
        );
    }
};

export default ForecastSlider;