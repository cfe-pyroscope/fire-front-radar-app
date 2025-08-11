import React, { useMemo } from "react";
import HeatmapOverlay from "./HeatmapOverlay";


interface ForecastStep {
    forecast_time: string; // ISO datetime, e.g. "2025-07-11T12:00:00Z"
    base_time: string;     // ISO base time
}

interface HeatmapControllerProps {
    indexName: "fopi" | "pof";
    baseTime: string;                      // ISO base time currently selected
    selectedForecastTime: string;          // ISO forecast_time currently selected
    forecastSteps: ForecastStep[];
    mode: "by_date" | "by_forecast";
    onHeatmapLoadingChange?: (loading: boolean) => void;
    onScaleChange?: (scale: { vmin: number; vmax: number }) => void;
}


/**
 * HeatmapController orchestrates the display of a heatmap based on
 * the selected forecast time, base time, and mode.
 *
 * It determines the correct step index (when in "by_forecast" mode)
 * and passes that along to the HeatmapOverlay component.
 */
const HeatmapController: React.FC<HeatmapControllerProps> = ({
    indexName,
    baseTime,
    selectedForecastTime,
    forecastSteps,
    mode,
    onHeatmapLoadingChange,
    onScaleChange,
}) => {
    // When in "by_forecast" mode, find the index of the currently selected step.
    const selectedStepIndex = useMemo(() => {
        if (mode !== "by_forecast") return undefined;
        return forecastSteps.findIndex(
            (s) =>
                s.base_time === baseTime &&
                s.forecast_time === selectedForecastTime
        );
    }, [mode, forecastSteps, baseTime, selectedForecastTime]);

    return (
        <HeatmapOverlay
            key={`${indexName}-${baseTime}-${selectedForecastTime}`}
            indexName={indexName}
            base={baseTime}
            forecastTime={selectedForecastTime}   // pass ISO forecast_time
            step={selectedStepIndex}              // keep passing a step index if needed
            mode={mode}
            onLoadingChange={onHeatmapLoadingChange}
            onScaleChange={onScaleChange}
        />
    );
};

export default HeatmapController;
