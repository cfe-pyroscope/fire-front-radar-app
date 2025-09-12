import React from "react";

import IndexToggle from "./IndexToggle";
import ByModeToggle from "./ByModeToggle";
import DatePicker from "./DatePicker";
import ForecastSelect from "./ForecastSelect";
import ForecastSlider from "./ForecastSlider";
import HeatmapLegend from "./HeatmapLegend";
import "../css/RightControlsController.css";

/** Types shared with Home */
export interface ForecastStep {
    forecast_time: string; // ISO
    base_time: string;     // ISO
}

type IndexName = "pof" | "fopi";
type Mode = "by_date" | "by_forecast";

interface Props {
    /* basic controls */
    indexName: IndexName;
    onIndexToggle: (val: IndexName) => void;

    mode: Mode;
    onModeToggle: (val: Mode) => void;

    selectedDate: Date;
    onDateChange: (d: Date | null) => void;
    availableDates: Date[] | null;

    /* forecast controls */
    showControls: boolean;
    forecastSteps: ForecastStep[];
    baseTime: string | null;
    selectedForecastTime: string | null;
    onForecastTimeChange: (t: string) => void;

    /* legend */
    scale: { vmin: number; vmax: number } | null;
}

const RightControlsController: React.FC<Props> = ({
    indexName,
    onIndexToggle,
    mode,
    onModeToggle,
    selectedDate,
    onDateChange,
    availableDates,
    showControls,
    forecastSteps,
    baseTime,
    selectedForecastTime,
    onForecastTimeChange,

    scale,
}) => {
    return (
        <>
            <div className="right-controls-controller">
                <IndexToggle currentIndex={indexName} onToggle={onIndexToggle} />
                <ByModeToggle mode={mode} onToggle={onModeToggle} />
                <DatePicker
                    value={selectedDate}
                    onChange={onDateChange}
                    availableDates={availableDates}
                />

                {showControls && (
                    <div className="forecast-controls">
                        {mode === "by_date" ? (
                            <ForecastSelect
                                key={baseTime ?? "no-base"} /* reset when backend base changes */
                                forecastSteps={forecastSteps}
                                selectedForecastTime={selectedForecastTime!}
                                onChange={(t) => onForecastTimeChange(t)}
                            />
                        ) : (
                            <ForecastSlider
                                forecastSteps={forecastSteps}
                                selectedForecastTime={selectedForecastTime!}
                                onChange={onForecastTimeChange}
                            />
                        )}
                    </div>
                )}
            </div>
            {showControls && scale && (
                <div className="colorbar-container">
                    <HeatmapLegend vmin={scale.vmin} vmax={scale.vmax} index={indexName} />
                </div>
            )}
        </>
    );
};

export default RightControlsController;
