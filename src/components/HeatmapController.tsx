import React from "react";
import HeatmapOverlay from "./HeatmapOverlay";

interface ForecastStep {
    time: string;
    lead_hours: number;
}

interface HeatmapControllerProps {
    indexName: "fopi" | "pof";
    baseTime: string;
    selectedLeadHours: number;
    forecastSteps: ForecastStep[];
    mode: "by_date" | "by_forecast";
    onHeatmapLoadingChange?: (loading: boolean) => void;
    onScaleChange?: (scale: { vmin: number; vmax: number }) => void;
}

const HeatmapController: React.FC<HeatmapControllerProps> = ({
    indexName,
    baseTime,
    selectedLeadHours,
    forecastSteps,
    mode,
    onHeatmapLoadingChange,
    onScaleChange,
}) => {
    const selectedStepIndex =
        mode === "by_forecast"
            ? forecastSteps.findIndex((s) => s.lead_hours === selectedLeadHours)
            : undefined;

    return (
        <HeatmapOverlay
            key={`${indexName}-${baseTime}-${selectedLeadHours}`}
            indexName={indexName}
            base={baseTime}
            lead={selectedLeadHours}
            step={selectedStepIndex}
            mode={mode}
            onLoadingChange={onHeatmapLoadingChange}
            onScaleChange={onScaleChange}
        />
    );
};

export default HeatmapController;
