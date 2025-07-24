import React, { useEffect, useState } from "react";
import ColorBarLegend from "./ColorBarLegend";
import ForecastSelect from "./ForecastSelect";
import ForecastSlider from "./ForecastSlider";
import HeatmapOverlay from "./HeatmapOverlay";
import "../css/HeatmapController.css";
import { API_BASE_URL } from "../utils/config";

interface ForecastStep {
    time: string;
    lead_hours: number;
}

interface MetadataResponse {
    location: [number, number];
    valid_time: string;
    forecast_steps: ForecastStep[];
}

interface HeatmapControllerProps {
    indexName: "fopi" | "pof";
    selectedDate: Date;
    mode: "by_date" | "by_forecast";
    onHeatmapLoadingChange?: (loading: boolean) => void;
}

const HeatmapController: React.FC<HeatmapControllerProps> = ({
    indexName,
    selectedDate,
    mode,
    onHeatmapLoadingChange
}) => {
    const [forecastSteps, setForecastSteps] = useState<ForecastStep[]>([]);
    const [selectedLeadHours, setSelectedLeadHours] = useState<number | null>(null);
    const [baseTime, setBaseTime] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [scale, setScale] = useState<{ vmin: number; vmax: number } | null>(null);


    useEffect(() => {
        // Reset state when dependencies change
        setError(null);
        setLoading(true);
        onHeatmapLoadingChange?.(true);

        // More robust date validation
        if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            console.error("Invalid selectedDate:", selectedDate);
            setError("Invalid date selected");
            setLoading(false);
            return;
        }

        console.log("Fetching metadata for:", indexName, selectedDate.toISOString());

        const fetchMetadata = async () => {
            try {
                const baseIso = selectedDate.toISOString();
                console.log("Base ISO time:", baseIso);

                let url = "";

                if (mode === "by_forecast") {
                    url = `${API_BASE_URL}/api/${indexName}/forecast?forecast_init=${baseIso}`;
                } else {
                    url = `${API_BASE_URL}/api/${indexName}?base_time=${baseIso}&lead_hours=0`;
                }
                console.log(`Mode, ${mode} - Fetching from URL: ${url}`);


                const res = await fetch(url);

                if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(`Metadata API error ${res.status}: ${msg}`);
                }

                const data: MetadataResponse = await res.json();
                console.log("Metadata response:", JSON.stringify(data, null, 2));

                if (!data.forecast_steps || !Array.isArray(data.forecast_steps) || data.forecast_steps.length === 0) {
                    console.error("Invalid forecast_steps:", data.forecast_steps);
                    throw new Error("No forecast steps available for this date.");
                }

                setForecastSteps(data.forecast_steps);
                setSelectedLeadHours(data.forecast_steps[0].lead_hours);
                setBaseTime(baseIso);
                setError(null);

            } catch (err: any) {
                console.error("Failed to load metadata:", err);
                setError(err.message || "Failed to load data for this date");
            } finally {
                setLoading(false);
                onHeatmapLoadingChange?.(false); // ensure loader is stopped in Home.tsx
            }
        };

        fetchMetadata();
    }, [indexName, selectedDate]);

    if (loading) {
        return (
            <div className="forecast-loading">
                Loading forecast data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="forecast-error">
                ⚠️ Error loading heatmap: {error}
            </div>
        );
    }

    console.log("indexName:", indexName);
    console.log("selectedLeadHours:", selectedLeadHours);
    console.log("forecastSteps:", forecastSteps);


    const selectedStepIndex =
        mode === "by_forecast"
            ? forecastSteps.findIndex((s) => s.lead_hours === selectedLeadHours)
            : undefined;


    return (
        <>
            {scale && (
                <>
                    {console.log("🎨 Rendering ColorBarLegend with scale:", scale)}
                    <div className="colorbar-container">
                        <ColorBarLegend vmin={scale.vmin} vmax={scale.vmax} index={indexName} />
                    </div>
                </>
            )}


            {forecastSteps.length > 0 && (
                mode === "by_date" ? (
                    <ForecastSelect
                        forecastSteps={forecastSteps}
                        selectedLeadHours={selectedLeadHours}
                        onChange={setSelectedLeadHours}
                    />
                ) : (
                    <ForecastSlider
                        forecastSteps={forecastSteps}
                        selectedLeadHours={selectedLeadHours ?? 0}
                        onChange={setSelectedLeadHours}
                    />
                )
            )}

            {baseTime !== null && selectedLeadHours !== null && (
                <HeatmapOverlay
                    key={`${indexName}-${baseTime}-${selectedLeadHours}`}
                    indexName={indexName}
                    base={baseTime}              // ✅ original file base
                    lead={selectedLeadHours}     // ✅ new lead selected
                    step={selectedStepIndex}
                    mode={mode}
                    onLoadingChange={onHeatmapLoadingChange}
                    onScaleChange={setScale}

                />
            )}
        </>
    );
};

export default HeatmapController;